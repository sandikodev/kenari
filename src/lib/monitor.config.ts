import { env } from '$env/dynamic/private';

export interface MonitorRoute {
	id: string;
	name: string;
	icon: string;
	description: string;
	proxyPath: string;
	upstreamUrl: string;
	authHeader?: Record<string, string>;
	allowedRoles?: string[];
}

// Built-in routes — only included if their URL env var is set
function getBuiltinRoutes(): MonitorRoute[] {
	const routes: MonitorRoute[] = [];

	if (env.KUMA_URL) {
		routes.push({
			id: 'uptime-kuma',
			name: env.KUMA_NAME ?? 'Uptime Kuma',
			icon: '🟢',
			description: 'Service uptime & incident monitoring',
			proxyPath: '/uptime',
			upstreamUrl: env.KUMA_URL,
			authHeader: env.KUMA_API_TOKEN ? { 'X-Kuma-Token': env.KUMA_API_TOKEN } : undefined
		});
	}

	if (env.GRAFANA_URL) {
		routes.push({
			id: 'grafana',
			name: env.GRAFANA_NAME ?? 'Grafana',
			icon: '📊',
			description: 'Metrics, logs & analytics dashboards',
			proxyPath: '/grafana',
			upstreamUrl: env.GRAFANA_URL,
			authHeader: { 'X-WEBAUTH-USER': env.GRAFANA_PROXY_USER ?? 'admin' }
		});
	}

	return routes;
}

// Custom routes from KENARI_ROUTES env var (JSON array)
// Example:
// KENARI_ROUTES='[{"id":"myapp","name":"My App","icon":"🚀","description":"My service","proxyPath":"/myapp","upstreamUrl":"http://myapp:8080"}]'
function getCustomRoutes(): MonitorRoute[] {
	if (!env.KENARI_ROUTES) return [];
	try {
		return JSON.parse(env.KENARI_ROUTES) as MonitorRoute[];
	} catch {
		console.error('[kenari] Invalid KENARI_ROUTES JSON — skipping custom routes');
		return [];
	}
}

export function getRoutes(): MonitorRoute[] {
	return [...getBuiltinRoutes(), ...getCustomRoutes()];
}
