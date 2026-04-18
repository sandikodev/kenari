import { error, redirect } from '@sveltejs/kit';
import { getRoutes } from '$lib/monitor.config';
import type { RequestHandler } from '@sveltejs/kit';

function createProxyHandler(routeId: string): RequestHandler {
	return async ({ params, request, locals }) => {
		if (!locals.user) redirect(302, '/login');

		const route = getRoutes().find((r) => r.id === routeId);
		if (!route) error(404, 'Route not configured');

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

		try {
			const response = await fetch(upstreamUrl, {
				method: request.method,
				headers,
				body: ['GET', 'HEAD'].includes(request.method) ? undefined : request.body,
				signal: AbortSignal.timeout(30000),
				// @ts-expect-error
				duplex: 'half'
			});
			return new Response(response.body, { status: response.status, headers: response.headers });
		} catch {
			error(502, `Cannot reach ${route.name}`);
		}
	};
}

export const GET = createProxyHandler('uptime-kuma');
export const POST = createProxyHandler('uptime-kuma');
export const PUT = createProxyHandler('uptime-kuma');
export const DELETE = createProxyHandler('uptime-kuma');
export const PATCH = createProxyHandler('uptime-kuma');
