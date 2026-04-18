import { redirect } from '@sveltejs/kit';
import { getRoutes } from '$lib/monitor.config';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) redirect(302, '/login');

	const routes = getRoutes();

	// Health check — ping each upstream
	const health: Record<string, boolean> = {};
	await Promise.all(
		routes.map(async (route) => {
			try {
				const res = await fetch(route.upstreamUrl, { signal: AbortSignal.timeout(3000) });
				health[route.id] = res.ok || res.status < 500;
			} catch {
				health[route.id] = false;
			}
		})
	);

	return { user: locals.user, routes, health };
};
