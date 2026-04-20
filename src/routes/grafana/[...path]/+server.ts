import { error, redirect } from '@sveltejs/kit';
import { getRoutes } from '$lib/monitor.config';
import { log } from '$lib/server/audit';
import type { RequestHandler } from '@sveltejs/kit';

async function proxyFetch(
	url: string,
	options: RequestInit & { headers: Headers },
	maxRedirects = 5
): Promise<Response> {
	let currentUrl = url;
	const visited = new Set<string>();

	for (let i = 0; i < maxRedirects; i++) {
		if (visited.has(currentUrl)) {
			// Loop detected — return last response as-is
			return fetch(currentUrl, { ...options, redirect: 'manual' });
		}
		visited.add(currentUrl);

		const res = await fetch(currentUrl, { ...options, redirect: 'manual' });
		if (res.status < 300 || res.status >= 400) return res;

		const location = res.headers.get('location');
		if (!location) return res;

		// Resolve relative redirects
		if (location.startsWith('/')) {
			const base = new URL(currentUrl);
			currentUrl = base.origin + location;
		} else if (location.startsWith('http')) {
			currentUrl = location;
		} else {
			return res;
		}
	}
	throw new Error('Too many redirects');
}

function createProxyHandler(routeId: string): RequestHandler {
	return async ({ params, request, locals, getClientAddress }) => {
		if (!locals.user) redirect(302, '/login');

		const route = getRoutes().find((r) => r.id === routeId);
		if (!route) error(404, 'Route not configured');

		const userRole = (locals.user as unknown as { role: string }).role;
		if (route.allowedRoles && !route.allowedRoles.includes(userRole)) {
			error(403, 'Access denied — insufficient role');
		}

		if (request.method === 'GET' && !params.path) {
			await log('access', route.id, locals.user.id, getClientAddress());
		}

		const path = params.path ?? '';
		const url = new URL(request.url);
		const upstreamUrl = `${route.upstreamUrl}/${path}${url.search}`;

		const headers = new Headers(request.headers);
		if (route.authHeader) {
			for (const [key, value] of Object.entries(route.authHeader)) {
				headers.set(key, value);
			}
		}
		headers.delete('host');
		headers.delete('accept-encoding');
		headers.set('accept-encoding', 'identity');

		try {
			const response = await proxyFetch(upstreamUrl, {
				method: request.method,
				headers,
				body: ['GET', 'HEAD'].includes(request.method) ? undefined : request.body,
				signal: AbortSignal.timeout(30000),
				// @ts-expect-error
				duplex: 'half'
			});

			const resHeaders = new Headers(response.headers);
			resHeaders.delete('content-encoding');
			return new Response(response.body, { status: response.status, headers: resHeaders });
		} catch {
			error(502, `Cannot reach ${route.name}`);
		}
	};
}

export const GET = createProxyHandler('grafana');
export const POST = createProxyHandler('grafana');
export const PUT = createProxyHandler('grafana');
export const DELETE = createProxyHandler('grafana');
export const PATCH = createProxyHandler('grafana');
