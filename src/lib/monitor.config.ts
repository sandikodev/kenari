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

// Custom routes from KENARI_ROUTES env var (JSON array) — static config
function getEnvRoutes(): MonitorRoute[] {
	if (!env.KENARI_ROUTES) return [];
	try {
		return JSON.parse(env.KENARI_ROUTES) as MonitorRoute[];
	} catch {
		console.error('[kenari] Invalid KENARI_ROUTES JSON — skipping');
		return [];
	}
}

// Routes from DB (dynamic — managed via /registry UI)
export async function getDbRoutes(): Promise<MonitorRoute[]> {
	try {
		const { getDb } = await import('$lib/server/db');
		const { services } = await import('$lib/server/db/schema');
		const { eq } = await import('drizzle-orm');
		const db = getDb();
		const rows = await db.select().from(services).where(eq(services.enabled, 1));
		return rows.map((s) => ({
			id: s.id,
			name: s.name,
			icon: s.icon,
			description: s.description ?? '',
			// DB services are proxied via /proxy/<id>
			proxyPath: `/proxy/${s.id}`,
			upstreamUrl: s.upstreamUrl,
			authHeader: s.authHeaderKey && s.authHeaderValue
				? { [s.authHeaderKey]: s.authHeaderValue }
				: undefined,
			allowedRoles: s.allowedRoles ? JSON.parse(s.allowedRoles) : undefined
		}));
	} catch {
		return [];
	}
}

// Sync version — env routes only (for use in non-async contexts)
export function getRoutes(): MonitorRoute[] {
	return [...getBuiltinRoutes(), ...getEnvRoutes()];
}

// Async version — env routes + DB routes
export async function getAllRoutes(): Promise<MonitorRoute[]> {
	const [envRoutes, dbRoutes] = await Promise.all([
		Promise.resolve(getRoutes()),
		getDbRoutes()
	]);
	// DB routes override env routes with same proxyPath
	const envMap = new Map(envRoutes.map((r) => [r.proxyPath, r]));
	for (const r of dbRoutes) envMap.set(r.proxyPath, r);
	return Array.from(envMap.values());
}
