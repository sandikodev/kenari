import { error, redirect } from '@sveltejs/kit';
import { getRoutes } from '$lib/monitor.config';
import { log } from '$lib/server/audit';
import type { RequestHandler } from '@sveltejs/kit';

function createProxyHandler(routeId: string): RequestHandler {
	return async ({ params, request, locals, getClientAddress }) => {
		if (!locals.user) redirect(302, '/login');

		const route = getRoutes().find((r) => r.id === routeId);
		if (!route) error(404, 'Route not configured');

		// Role-based access check
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
		// Prevent upstream from sending compressed responses
		// fetch() decompresses automatically but streams the decoded body
		// while keeping the original content-encoding header → browser double-decodes
		headers.delete('accept-encoding');
		headers.set('accept-encoding', 'identity');

		try {
			const response = await fetch(upstreamUrl, {
				method: request.method,
				headers,
				body: ['GET', 'HEAD'].includes(request.method) ? undefined : request.body,
				signal: AbortSignal.timeout(30000),
				redirect: 'manual',
				// @ts-expect-error
				duplex: 'half'
			});

			// For HTML responses, rewrite absolute asset paths to include proxy prefix
			const contentType = response.headers.get('content-type') ?? '';
			if (contentType.includes('text/html') && request.method === 'GET') {
				let html = await response.text();
				html = html.replace(/(src|href)="\/(?!\/)/g, `$1="${route.proxyPath}/`);
				const resHeaders = new Headers(response.headers);
				resHeaders.delete('content-length');
				resHeaders.delete('content-encoding');
				return new Response(html, { status: response.status, headers: resHeaders });
			}

			// For all other responses, strip content-encoding (fetch already decoded)
			const resHeaders = new Headers(response.headers);
			resHeaders.delete('content-encoding');
			return new Response(response.body, { status: response.status, headers: resHeaders });
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
