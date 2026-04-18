import { redirect, fail } from '@sveltejs/kit';
import { getDb } from '$lib/server/db';
import { users, auditLog, failedLogins } from '$lib/server/db/schema';
import { eq, desc, gte } from 'drizzle-orm';
import { log } from '$lib/server/audit';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) redirect(302, '/login');
	const u = locals.user as unknown as { role: string };
	if (u.role !== 'admin') redirect(302, '/');

	const db = getDb();
	const since24h = Date.now() - 86_400_000;

	const [allUsers, recentLogs, recentFailures] = await Promise.all([
		db.select().from(users).orderBy(users.createdAt),
		db.select().from(auditLog).orderBy(desc(auditLog.createdAt)).limit(100),
		db.select().from(failedLogins).where(gte(failedLogins.createdAt, since24h)).orderBy(desc(failedLogins.createdAt))
	]);

	// Group failed logins by IP
	const failuresByIp = recentFailures.reduce<Record<string, number>>((acc, f) => {
		acc[f.ip] = (acc[f.ip] ?? 0) + 1;
		return acc;
	}, {});

	return {
		user: locals.user,
		users: allUsers,
		logs: recentLogs,
		failuresByIp,
		totalFailures: recentFailures.length
	};
};

export const actions: Actions = {
	setRole: async ({ request, locals }) => {
		const u = locals.user as unknown as { role: string };
		if (u?.role !== 'admin') return fail(403, { error: 'Forbidden' });
		const data = await request.formData();
		const userId = data.get('userId') as string;
		const role = data.get('role') as string;
		if (!['admin', 'viewer'].includes(role)) return fail(400, { error: 'Invalid role' });
		await getDb().update(users).set({ role }).where(eq(users.id, userId));
		await log('admin', `set role ${role} for ${userId}`, locals.user?.id);
		return { success: true };
	},
	deleteUser: async ({ request, locals }) => {
		const u = locals.user as unknown as { role: string };
		if (u?.role !== 'admin') return fail(403, { error: 'Forbidden' });
		const data = await request.formData();
		const userId = data.get('userId') as string;
		if (userId === locals.user?.id) return fail(400, { error: 'Cannot delete yourself' });
		await getDb().delete(users).where(eq(users.id, userId));
		await log('admin', `deleted user ${userId}`, locals.user?.id);
		return { success: true };
	}
};
