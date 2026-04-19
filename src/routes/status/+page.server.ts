import { getRoutes } from '$lib/monitor.config';
import type { PageServerLoad } from './$types';

// Reuse the same cache from dashboard
const statusCache: Record<string, { online: boolean; latency: number; checkedAt: number }> = {};
let checking = false;

async function refreshStatus() {
	if (checking) return;
	checking = true;
	const routes = getRoutes();
	await Promise.all(
		routes.map(async (route) => {
			const start = Date.now();
			let online = false;
			try {
				const res = await fetch(route.upstreamUrl, { signal: AbortSignal.timeout(5000) });
				online = res.ok || res.status < 500;
			} catch { /* offline */ }
			statusCache[route.id] = { online, latency: Date.now() - start, checkedAt: Date.now() };
		})
	);
	checking = false;
}

export const load: PageServerLoad = async () => {
	const routes = getRoutes();

	const stale = routes.some(r => {
		const c = statusCache[r.id];
		return !c || Date.now() - c.checkedAt > 30_000;
	});

	if (stale) refreshStatus(); // non-blocking

	const checks = routes.map(route => ({
		...route,
		online: statusCache[route.id]?.online ?? false,
		latency: statusCache[route.id]?.latency ?? 0,
	}));

	return {
		checks,
		allOnline: checks.every(c => c.online),
		checkedAt: statusCache[routes[0]?.id]?.checkedAt ?? Date.now()
	};
};
