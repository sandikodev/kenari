import { getRoutes } from '$lib/monitor.config';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	const routes = getRoutes();
	const checks = await Promise.all(
		routes.map(async (route) => {
			const start = Date.now();
			let online = false;
			let latency = 0;
			try {
				const res = await fetch(route.upstreamUrl, { signal: AbortSignal.timeout(5000) });
				online = res.ok || res.status < 500;
				latency = Date.now() - start;
			} catch {
				latency = Date.now() - start;
			}
			return { ...route, online, latency };
		})
	);

	const allOnline = checks.every((c) => c.online);
	return { checks, allOnline, checkedAt: Date.now() };
};
