import { json, error } from '@sveltejs/kit';
import { getDb } from '$lib/server/db';
import { users, sessions, auditLog, failedLogins, agents, agentMetrics } from '$lib/server/db/schema';
import type { RequestHandler } from './$types';

// Only available in test/dev mode
export const POST: RequestHandler = async ({ request }) => {
	if (process.env.NODE_ENV === 'production') error(404, 'Not found');

	const { action, data } = await request.json();
	const db = getDb();

	if (action === 'reset') {
		await db.delete(agentMetrics);
		await db.delete(agents);
		await db.delete(auditLog);
		await db.delete(failedLogins);
		await db.delete(sessions);
		await db.delete(users);
		return json({ ok: true });
	}

	if (action === 'seed_user') {
		const { hash } = await import('@node-rs/argon2');
		const { generateId } = await import('lucia');
		await db.insert(users).values({
			id: generateId(15),
			email: data.email,
			name: data.name,
			passwordHash: await hash(data.password),
			role: data.role ?? 'viewer',
			createdAt: Date.now(),
		}).onConflictDoNothing();
		return json({ ok: true });
	}

	if (action === 'seed_agent') {
		await db.insert(agents).values({
			id: data.id,
			name: data.name,
			token: data.token,
			createdAt: Date.now(),
		}).onConflictDoNothing();
		return json({ ok: true });
	}

	if (action === 'seed_metrics') {
		await db.insert(agentMetrics).values({
			agentId: data.agentId,
			cpuPercent: 25.5,
			memoryUsedMb: 1024,
			memoryTotalMb: 4096,
			diskUsedGb: 50,
			diskTotalGb: 100,
			uptimeSecs: 86400,
			createdAt: Date.now(),
		});
		return json({ ok: true });
	}

	error(400, 'Unknown action');
};
