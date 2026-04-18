import { json, error } from '@sveltejs/kit';
import { getDb } from '$lib/server/db';
import { agents, agentMetrics } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request }) => {
	const auth = request.headers.get('authorization') ?? '';
	const token = auth.replace('Bearer ', '').trim();
	if (!token) error(401, 'Missing token');

	const db = getDb();
	const agent = await db.query.agents.findFirst({ where: eq(agents.token, token) });
	if (!agent) error(403, 'Invalid token');

	const body = await request.json();
	const m = body.metrics;

	await Promise.all([
		db.insert(agentMetrics).values({
			agentId: agent.id,
			cpuPercent: m.cpu_percent,
			memoryUsedMb: m.memory_used_mb,
			memoryTotalMb: m.memory_total_mb,
			diskUsedGb: m.disk_used_gb,
			diskTotalGb: m.disk_total_gb,
			uptimeSecs: m.uptime_secs,
			createdAt: Date.now()
		}),
		db.update(agents).set({ lastSeen: Date.now() }).where(eq(agents.id, agent.id))
	]);

	return json({ ok: true });
};
