import { redirect } from '@sveltejs/kit';
import { getDb } from '$lib/server/db';
import { agents, agentMetrics } from '$lib/server/db/schema';
import { eq, desc } from 'drizzle-orm';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) redirect(302, '/login');

	const db = getDb();
	const allAgents = await db.select().from(agents).orderBy(agents.createdAt);

	const withMetrics = await Promise.all(
		allAgents.map(async (agent) => {
			const latest = await db
				.select()
				.from(agentMetrics)
				.where(eq(agentMetrics.agentId, agent.id))
				.orderBy(desc(agentMetrics.createdAt))
				.limit(1);
			return { ...agent, latest: latest[0] ?? null };
		})
	);

	return { user: locals.user, agents: withMetrics };
};
