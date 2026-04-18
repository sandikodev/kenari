import { json, error } from '@sveltejs/kit';
import { z } from 'zod';
import { getDb } from '$lib/server/db';
import { agents, agentMetrics } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import type { RequestHandler } from './$types';

const PushSchema = z.object({
	host_id: z.string().min(1).max(100),
	timestamp: z.number().int().nonnegative(),
	metrics: z.object({
		cpu_percent:     z.number().min(0).max(100),
		memory_used_mb:  z.number().nonnegative(),
		memory_total_mb: z.number().positive(),
		disk_used_gb:    z.number().nonnegative(),
		disk_total_gb:   z.number().positive(),
		uptime_secs:     z.number().int().nonnegative()
	}).passthrough() // allow extra fields for forward compatibility
});

export const POST: RequestHandler = async ({ request }) => {
	const auth = request.headers.get('authorization') ?? '';
	const token = auth.replace('Bearer ', '').trim();
	if (!token) error(401, 'Missing token');

	const db = getDb();
	const agent = await db.query.agents.findFirst({ where: eq(agents.token, token) });
	if (!agent) error(403, 'Invalid token');

	const parsed = PushSchema.safeParse(await request.json());
	if (!parsed.success) error(400, parsed.error.issues[0].message);

	const { metrics: m } = parsed.data;

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
