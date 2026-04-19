import { error } from '@sveltejs/kit';
import { getDb } from '$lib/server/db';
import { auditLog, failedLogins, users } from '$lib/server/db/schema';
import { desc } from 'drizzle-orm';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url, locals }) => {
	const u = locals.user as unknown as { role: string } | null;
	if (u?.role !== 'admin') error(403, 'Admin only');

	const format = url.searchParams.get('format') ?? 'json';
	const db = getDb();

	const [logs, failures, allUsers] = await Promise.all([
		db.select().from(auditLog).orderBy(desc(auditLog.createdAt)).limit(10000),
		db.select().from(failedLogins).orderBy(desc(failedLogins.createdAt)).limit(10000),
		db.select({ id: users.id, email: users.email, name: users.name }).from(users),
	]);

	const userMap = Object.fromEntries(allUsers.map(u => [u.id, u]));

	const enriched = logs.map(l => ({
		...l,
		user_email: l.userId ? userMap[l.userId]?.email ?? null : null,
		timestamp: new Date(l.createdAt).toISOString(),
	}));

	const filename = `kenari-audit-${new Date().toISOString().slice(0, 10)}`;

	if (format === 'csv') {
		const headers = ['id', 'timestamp', 'user_email', 'action', 'detail', 'ip', 'user_agent'];
		const rows = enriched.map(r =>
			headers.map(h => JSON.stringify((r as any)[h] ?? '')).join(',')
		);
		return new Response([headers.join(','), ...rows].join('\n'), {
			headers: {
				'Content-Type': 'text/csv',
				'Content-Disposition': `attachment; filename="${filename}.csv"`,
			},
		});
	}

	return new Response(JSON.stringify({ exported_at: new Date().toISOString(), audit_log: enriched, failed_logins: failures }, null, 2), {
		headers: {
			'Content-Type': 'application/json',
			'Content-Disposition': `attachment; filename="${filename}.json"`,
		},
	});
};
