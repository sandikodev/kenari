import { env } from '$env/dynamic/private';

export interface MonitorRoute {
	id: string;
	name: string;
	icon: string;
	description: string;
	proxyPath: string;
	upstreamUrl: string;
	authHeader?: Record<string, string>;
	allowedRoles?: string[]; // undefined = all authenticated users
}

export function getRoutes(): MonitorRoute[] {
	return [
		{
			id: 'uptime-kuma',
			name: 'Uptime Kuma',
			icon: '🟢',
			description: 'Service uptime & incident monitoring',
			proxyPath: '/dashboard',
			upstreamUrl: env.KUMA_URL ?? 'http://localhost:3001',
			authHeader: env.KUMA_API_TOKEN
				? { 'X-Kuma-Token': env.KUMA_API_TOKEN }
				: undefined
		},
		{
			id: 'grafana',
			name: 'Grafana',
			icon: '📊',
			description: 'Metrics, logs & analytics dashboards',
			proxyPath: '/grafana',
			upstreamUrl: env.GRAFANA_URL ?? 'http://localhost:3000',
			authHeader: { 'X-WEBAUTH-USER': 'admin' }
		}
	];
}
