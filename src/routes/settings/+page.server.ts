import { redirect, fail } from '@sveltejs/kit';
import { getDb } from '$lib/server/db';
import { users, sessions } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { hash, verify } from '@node-rs/argon2';
import { getLucia } from '$lib/server/auth';
import { log } from '$lib/server/audit';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) redirect(302, '/login');
	const db = getDb();
	const [user, userSessions] = await Promise.all([
		db.query.users.findFirst({ where: eq(users.id, locals.user.id) }),
		db.select().from(sessions).where(eq(sessions.userId, locals.user.id))
	]);
	return {
		user: locals.user,
		hasPassword: !!user?.passwordHash,
		sessions: userSessions.map(s => ({
			id: s.id,
			expiresAt: s.expiresAt,
			isCurrent: s.id === locals.session?.id
		}))
	};
};

export const actions: Actions = {
	changePassword: async ({ request, locals }) => {
		if (!locals.user) redirect(302, '/login');
		const data = await request.formData();
		const current = data.get('current') as string;
		const next = data.get('new') as string;
		const confirm = data.get('confirm') as string;

		if (next !== confirm) return fail(400, { error: 'Passwords do not match', action: 'password' });
		if (next.length < 8) return fail(400, { error: 'Minimum 8 characters', action: 'password' });

		const db = getDb();
		const user = await db.query.users.findFirst({ where: eq(users.id, locals.user.id) });

		if (user?.passwordHash) {
			const valid = await verify(user.passwordHash, current);
			if (!valid) return fail(401, { error: 'Current password is incorrect', action: 'password' });
		}

		await db.update(users).set({ passwordHash: await hash(next) }).where(eq(users.id, locals.user.id));
		await log('admin', 'changed password', locals.user.id);
		return { success: true, action: 'password' };
	},

	deleteAccount: async ({ request, locals, cookies }) => {
		if (!locals.user) redirect(302, '/login');
		const data = await request.formData();
		const confirm = data.get('confirm') as string;
		if (confirm !== 'DELETE') return fail(400, { error: 'Type DELETE to confirm', action: 'delete' });

		const db = getDb();
		const lucia = getLucia();
		await log('admin', 'deleted own account', locals.user.id);
		await db.delete(sessions).where(eq(sessions.userId, locals.user.id));
		await db.delete(users).where(eq(users.id, locals.user.id));
		const blank = lucia.createBlankSessionCookie();
		cookies.set(blank.name, blank.value, { path: '/', ...blank.attributes });
		redirect(302, '/login');
	},

	revokeSession: async ({ request, locals }) => {
		if (!locals.user) redirect(302, '/login');
		const data = await request.formData();
		const sessionId = data.get('sessionId') as string;
		const lucia = getLucia();
		await lucia.invalidateSession(sessionId);
		await log('admin', `revoked session ${sessionId.slice(0, 8)}...`, locals.user.id);
		return { success: true, action: 'revoke' };
	}
};
