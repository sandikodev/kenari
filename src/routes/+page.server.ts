import { redirect } from '@sveltejs/kit';
import { getRoutes } from '$lib/monitor.config';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) redirect(302, '/login');

	const routes = getRoutes();
	const health: Record<string, { online: boolean; latency: number }> = {};

	await Promise.all(
		routes.map(async (route) => {
			const start = Date.now();
			try {
				const res = await fetch(route.upstreamUrl, { signal: AbortSignal.timeout(3000) });
				health[route.id] = { online: res.ok || res.status < 500, latency: Date.now() - start };
			} catch {
				health[route.id] = { online: false, latency: Date.now() - start };
			}
		})
	);

	return { user: locals.user, routes, health };
};
