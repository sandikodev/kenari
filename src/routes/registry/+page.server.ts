import { redirect, fail } from '@sveltejs/kit';
import { getDb } from '$lib/server/db';
import { agents, agentMetrics, services } from '$lib/server/db/schema';
import { eq, desc } from 'drizzle-orm';
import { log } from '$lib/server/audit';
import { generateId } from 'lucia';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) redirect(302, '/login');

	const db = getDb();
	const allAgents = await db.select().from(agents).orderBy(agents.createdAt);

	const withMetrics = await Promise.all(
		allAgents.map(async (agent) => {
			const latest = await db.select().from(agentMetrics)
				.where(eq(agentMetrics.agentId, agent.id))
				.orderBy(desc(agentMetrics.createdAt)).limit(1);
			return { ...agent, latest: latest[0] ?? null };
		})
	);

	const allServices = await db.select().from(services).orderBy(services.createdAt);

	return { user: locals.user, agents: withMetrics, services: allServices };
};

export const actions: Actions = {
	registerAgent: async ({ request, locals }) => {
		const u = locals.user as unknown as { role: string };
		if (u?.role !== 'admin') return fail(403, { error: 'Admin only' });
		const data = await request.formData();
		const name = data.get('name') as string;
		if (!name) return fail(400, { error: 'Name required' });
		const db = getDb();
		const existing = await db.query.agents.findFirst({ where: eq(agents.name, name) });
		if (existing) return fail(409, { error: 'Agent name already exists' });
		const token = crypto.randomUUID().replace(/-/g, '') + crypto.randomUUID().replace(/-/g, '');
		const id = name.toLowerCase().replace(/\s+/g, '-');
		await db.insert(agents).values({ id, name, token, createdAt: Date.now() });
		await log('admin', `registered agent ${name}`, locals.user?.id);
		return { success: true, token, action: 'registerAgent' };
	},

	addService: async ({ request, locals }) => {
		const u = locals.user as unknown as { role: string };
		if (u?.role !== 'admin') return fail(403, { error: 'Admin only' });
		const data = await request.formData();
		const name = data.get('name') as string;
		const icon = (data.get('icon') as string) || '🔗';
		const description = data.get('description') as string;
		const proxyPath = data.get('proxyPath') as string;
		const upstreamUrl = data.get('upstreamUrl') as string;
		const authHeaderKey = data.get('authHeaderKey') as string;
		const authHeaderValue = data.get('authHeaderValue') as string;
		if (!name || !proxyPath || !upstreamUrl) return fail(400, { error: 'Name, proxy path, and upstream URL are required' });
		const db = getDb();
		const id = proxyPath.replace(/\//g, '').toLowerCase() || generateId(8);
		await db.insert(services).values({
			id, name, icon, description: description || null,
			proxyPath: proxyPath.startsWith('/') ? proxyPath : '/' + proxyPath,
			upstreamUrl, authHeaderKey: authHeaderKey || null,
			authHeaderValue: authHeaderValue || null,
			enabled: 1, createdAt: Date.now()
		});
		await log('admin', `added service ${name}`, locals.user?.id);
		return { success: true, action: 'addService' };
	},

	deleteService: async ({ request, locals }) => {
		const u = locals.user as unknown as { role: string };
		if (u?.role !== 'admin') return fail(403, { error: 'Admin only' });
		const data = await request.formData();
		const id = data.get('id') as string;
		await getDb().delete(services).where(eq(services.id, id));
		await log('admin', `deleted service ${id}`, locals.user?.id);
		return { success: true, action: 'deleteService' };
	},

	toggleService: async ({ request, locals }) => {
		const u = locals.user as unknown as { role: string };
		if (u?.role !== 'admin') return fail(403, { error: 'Admin only' });
		const data = await request.formData();
		const id = data.get('id') as string;
		const enabled = data.get('enabled') === '1' ? 0 : 1;
		await getDb().update(services).set({ enabled }).where(eq(services.id, id));
		return { success: true, action: 'toggleService' };
	}
};
