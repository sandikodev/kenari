import { error, redirect } from '@sveltejs/kit';
import { getDb } from '$lib/server/db';
import { services } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { log } from '$lib/server/audit';
import type { RequestHandler } from '@sveltejs/kit';

// Generic proxy handler for services registered in the DB
// Route: /proxy/<service-id>/<...path>
const handler: RequestHandler = async ({ params, request, locals, getClientAddress }) => {
	if (!locals.user) redirect(302, '/login');

	const parts = (params.path ?? '').split('/');
	const serviceId = parts[0];
	const subPath = parts.slice(1).join('/');

	const db = getDb();
	const svc = await db.query.services.findFirst({
		where: eq(services.id, serviceId)
	});

	if (!svc || !svc.enabled) error(404, 'Service not found');

	// Role check
	if (svc.allowedRoles) {
		const allowed = JSON.parse(svc.allowedRoles) as string[];
		const userRole = (locals.user as unknown as { role: string }).role;
		if (!allowed.includes(userRole)) error(403, 'Access denied');
	}

	if (request.method === 'GET' && !subPath) {
		await log('access', svc.id, locals.user.id, getClientAddress());
	}

	const url = new URL(request.url);
	const upstreamUrl = `${svc.upstreamUrl}/${subPath}${url.search}`;

	const headers = new Headers(request.headers);
	if (svc.authHeaderKey && svc.authHeaderValue) {
		headers.set(svc.authHeaderKey, svc.authHeaderValue);
	}
	headers.delete('host');
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
		const resHeaders = new Headers(response.headers);
		resHeaders.delete('content-encoding');
		return new Response(
			response.status >= 300 && response.status < 400 ? null : response.body,
			{ status: response.status, headers: resHeaders }
		);
	} catch {
		error(502, `Cannot reach ${svc.name}`);
	}
};

export const GET = handler;
export const POST = handler;
export const PUT = handler;
export const DELETE = handler;
export const PATCH = handler;
