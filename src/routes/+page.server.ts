import { redirect } from '@sveltejs/kit';
import { getRoutes } from '$lib/monitor.config';
import { alertUpstreamDown, alertUpstreamUp } from '$lib/server/telegram';
import type { PageServerLoad } from './$types';

// Track previous health state in memory (resets on restart — acceptable)
const prevHealth: Record<string, boolean> = {};

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) redirect(302, '/login');

	const routes = getRoutes();
	const health: Record<string, { online: boolean; latency: number }> = {};

	await Promise.all(
		routes.map(async (route) => {
			const start = Date.now();
			let online = false;
			try {
				const res = await fetch(route.upstreamUrl, { signal: AbortSignal.timeout(3000) });
				online = res.ok || res.status < 500;
			} catch { /* offline */ }

			health[route.id] = { online, latency: Date.now() - start };

			// Alert on state change
			const was = prevHealth[route.id];
			if (was === true && !online) await alertUpstreamDown(route.name, route.upstreamUrl);
			if (was === false && online) await alertUpstreamUp(route.name);
			prevHealth[route.id] = online;
		})
	);

	return { user: locals.user, routes, health };
};
