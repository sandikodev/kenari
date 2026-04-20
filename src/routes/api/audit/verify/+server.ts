import { json, error } from '@sveltejs/kit';
import { getDb } from '$lib/server/db';
import { auditLog } from '$lib/server/db/schema';
import { asc } from 'drizzle-orm';
import { createHash } from 'node:crypto';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ locals }) => {
	const u = locals.user as unknown as { role: string } | null;
	if (u?.role !== 'admin') error(403, 'Admin only');

	const db = getDb();
	const entries = await db.select().from(auditLog).orderBy(asc(auditLog.id));

	let prevHash: string | null = null;
	let valid = true;
	let firstInvalidId: number | null = null;

	for (const entry of entries) {
		const content = JSON.stringify({
			id: entry.id, userId: entry.userId, action: entry.action,
			detail: entry.detail, ip: entry.ip, createdAt: entry.createdAt,
			prevHash
		});
		const expected = createHash('sha256').update(content).digest('hex');

		if (entry.hash && entry.hash !== expected) {
			valid = false;
			firstInvalidId = entry.id;
			break;
		}
		prevHash = entry.hash ?? null;
	}

	return json({
		valid,
		total: entries.length,
		firstInvalidId,
		message: valid
			? `Chain intact — ${entries.length} entries verified`
			: `Chain broken at entry #${firstInvalidId}`
	});
};
