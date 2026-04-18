// Monitor route configuration
// Upstream URLs are read from environment variables so the same config
// works for both self-hosted (internal Docker network) and edge deployment (public URLs).

import { env } from '$env/dynamic/private';

export interface MonitorRoute {
	id: string;
	name: string;
	icon: string;
	description: string;
	proxyPath: string;
	upstreamUrl: string;
	authHeader?: Record<string, string>;
}

export function getRoutes(): MonitorRoute[] {
	return [
		{
			id: 'uptime-kuma',
			name: 'Uptime Kuma',
			icon: '🟢',
			description: 'Service uptime & incident monitoring',
			proxyPath: '/uptime',
			// Edge:        https://uptime.yourdomain.com
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
			// Edge:        https://grafana.yourdomain.com
			upstreamUrl: env.GRAFANA_URL ?? 'http://localhost:3000',
			// Grafana auth proxy — user already authenticated via gateway
			authHeader: { 'X-WEBAUTH-USER': 'admin' }
		}
	];
}
