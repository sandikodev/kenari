import { redirect } from '@sveltejs/kit';
import { getAllRoutes } from '$lib/monitor.config';
import { alertUpstreamDown, alertUpstreamUp } from '$lib/server/telegram';
import type { PageServerLoad } from './$types';

// Cache health results — return immediately, refresh in background
const healthCache: Record<string, { online: boolean; latency: number; checkedAt: number }> = {};
const prevHealth: Record<string, boolean> = {};
let checking = false;

async function refreshHealth() {
	if (checking) return;
	checking = true;
	const routes = await getAllRoutes();
	await Promise.all(
		routes.map(async (route) => {
			const start = Date.now();
			let online = false;
			try {
				const res = await fetch(route.upstreamUrl, { signal: AbortSignal.timeout(5000) });
				online = res.ok || res.status < 500;
			} catch { /* offline */ }

			healthCache[route.id] = { online, latency: Date.now() - start, checkedAt: Date.now() };

			const was = prevHealth[route.id];
			if (was === true && !online) alertUpstreamDown(route.name, route.upstreamUrl);
			if (was === false && online) alertUpstreamUp(route.name);
			prevHealth[route.id] = online;
		})
	);
	checking = false;
}

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) redirect(302, '/login');

	const routes = await getAllRoutes();
	const userRole = (locals.user as unknown as { role: string }).role;
	const accessibleRoutes = routes.filter(
		(r) => !r.allowedRoles || r.allowedRoles.includes(userRole)
	);

	// Return cached result immediately — refresh in background if stale (>15s)
	const stale = routes.some(r => {
		const c = healthCache[r.id];
		return !c || Date.now() - c.checkedAt > 15_000;
	});

	if (stale) refreshHealth();

	const health: Record<string, { online: boolean; latency: number }> = {};
	for (const route of routes) {
		health[route.id] = healthCache[route.id] ?? { online: false, latency: 0 };
	}

	return { user: locals.user, routes: accessibleRoutes, health };
};
