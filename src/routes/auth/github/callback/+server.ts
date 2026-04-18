import { redirect, error } from '@sveltejs/kit';
import { GitHub } from 'arctic';
import { env } from '$env/dynamic/private';
import { getLucia } from '$lib/server/auth';
import { getDb } from '$lib/server/db';
import { users } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { generateId } from 'lucia';
import { log } from '$lib/server/audit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url, cookies }) => {
	const code = url.searchParams.get('code');
	const state = url.searchParams.get('state');
	const storedState = cookies.get('github_oauth_state');

	if (!code || !state || state !== storedState) error(400, 'Invalid OAuth state');

	const github = new GitHub(
		env.GITHUB_CLIENT_ID ?? '',
		env.GITHUB_CLIENT_SECRET ?? '',
		`${env.ORIGIN}/auth/github/callback`
	);

	const tokens = await github.validateAuthorizationCode(code);
	const accessToken = tokens.accessToken();

	// Fetch GitHub user
	const ghUser = await fetch('https://api.github.com/user', {
		headers: { Authorization: `Bearer ${accessToken}`, 'User-Agent': 'kenari' }
	}).then((r) => r.json());

	const ghEmail = await fetch('https://api.github.com/user/emails', {
		headers: { Authorization: `Bearer ${accessToken}`, 'User-Agent': 'kenari' }
	})
		.then((r) => r.json())
		.then((emails: { email: string; primary: boolean }[]) => emails.find((e) => e.primary)?.email ?? '');

	const db = getDb();
	const lucia = getLucia();

	// Whitelist check — GITHUB_ALLOWED_USERS (username or email) and/or GITHUB_ALLOWED_ORGS
	const allowedUsers = (env.GITHUB_ALLOWED_USERS ?? '').split(',').map((s) => s.trim()).filter(Boolean);
	const allowedOrgs = (env.GITHUB_ALLOWED_ORGS ?? '').split(',').map((s) => s.trim()).filter(Boolean);

	if (allowedUsers.length > 0 || allowedOrgs.length > 0) {
		const loginAllowed = allowedUsers.includes(ghUser.login) || allowedUsers.includes(ghEmail);
		let orgAllowed = false;

		if (!loginAllowed && allowedOrgs.length > 0) {
			const orgs: { login: string }[] = await fetch('https://api.github.com/user/orgs', {
				headers: { Authorization: `Bearer ${accessToken}`, 'User-Agent': 'kenari' }
			}).then((r) => r.json());
			orgAllowed = orgs.some((o) => allowedOrgs.includes(o.login));
		}

		if (!loginAllowed && !orgAllowed) {
			await log('login', `blocked: ${ghUser.login}`, null);
			error(403, 'Access denied. Your GitHub account is not allowed.');
		}
	}

	// Find or create user
	let user = await db.query.users.findFirst({ where: eq(users.githubId, String(ghUser.id)) });

	if (!user) {
		// Check if email already exists
		user = await db.query.users.findFirst({ where: eq(users.email, ghEmail) });
		if (user) {
			// Link GitHub to existing account
			await db.update(users).set({ githubId: String(ghUser.id) }).where(eq(users.id, user.id));
		} else {
			// Create new user — first user becomes admin
			const count = await db.select().from(users);
			const role = count.length === 0 ? 'admin' : 'viewer';
			const [newUser] = await db
				.insert(users)
				.values({
					id: generateId(15),
					email: ghEmail,
					name: ghUser.name ?? ghUser.login,
					githubId: String(ghUser.id),
					role,
					createdAt: Date.now()
				})
				.returning();
			user = newUser;
		}
	}

	const session = await lucia.createSession(user.id, {});
	const cookie = lucia.createSessionCookie(session.id);
	cookies.set(cookie.name, cookie.value, { path: '/', ...cookie.attributes });
	cookies.delete('github_oauth_state', { path: '/' });

	await log('login', 'github oauth', user.id);
	redirect(302, '/');
};
