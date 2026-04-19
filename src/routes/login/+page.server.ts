import { fail, redirect } from '@sveltejs/kit';
import { getLucia } from '$lib/server/auth';
import { getDb } from '$lib/server/db';
import { users } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { verify } from '@node-rs/argon2';
import { log, trackFailedLogin, getFailedLoginCount } from '$lib/server/audit';
import { alertFailedLoginSpike, alertNewLogin } from '$lib/server/telegram';
import { getCountry } from '$lib/server/geo';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	if (locals.user) redirect(302, '/');
	return {};
};

export const actions: Actions = {
	default: async ({ request, cookies, getClientAddress }) => {
		const ip = getClientAddress();

		// Rate limit: max 10 failed attempts per IP per minute
		const failures = await getFailedLoginCount(ip, 60_000);
		if (failures >= 10) return fail(429, { error: 'Too many attempts. Try again later.' });

		const data = await request.formData();
		const email = data.get('email') as string;
		const password = data.get('password') as string;

		if (!email || !password) return fail(400, { error: 'Email and password are required' });

		const db = getDb();
		const user = await db.query.users.findFirst({ where: eq(users.email, email) });

		if (!user?.passwordHash) {
			await trackFailedLogin(ip, email);
			const count = await getFailedLoginCount(ip, 60_000);
			if (count >= 5) await alertFailedLoginSpike(ip, count);
			return fail(401, { error: 'Invalid email or password' });
		}

		const valid = await verify(user.passwordHash, password);
		if (!valid) {
			await trackFailedLogin(ip, email);
			const count = await getFailedLoginCount(ip, 60_000);
			if (count >= 5) await alertFailedLoginSpike(ip, count);
			return fail(401, { error: 'Invalid email or password' });
		}

		const lucia = getLucia();
		const session = await lucia.createSession(user.id, {});
		const cookie = lucia.createSessionCookie(session.id);
		cookies.set(cookie.name, cookie.value, { path: '/', ...cookie.attributes });

		await log('login', 'email', user.id, ip, request.headers.get('user-agent') ?? undefined);
		const country = await getCountry(ip);
		await alertNewLogin(user.name, ip, `email${country ? ` (${country})` : ''}`);
		redirect(302, '/');
	}
};
