import type { Handle } from '@sveltejs/kit';
import { getLucia } from '$lib/server/auth';
import { getDb } from '$lib/server/db';
import { users } from '$lib/server/db/schema';
import { redirect, error } from '@sveltejs/kit';
import { initScheduler } from '$lib/server/scheduler';
import { isBlocked } from '$lib/server/audit';
import { getRoutes } from '$lib/monitor.config';
import type { IncomingMessage } from 'node:http';
import type { Duplex } from 'node:stream';

// WebSocket proxy for upstream tools (Uptime Kuma real-time)
export function handleWebsocket(
	request: IncomingMessage,
	socket: Duplex,
	head: Buffer
) {
	const url = request.url ?? '';

	// Find matching route by proxy path prefix
	const route = getRoutes().find(r => url.startsWith(r.proxyPath));
	if (!route) { socket.destroy(); return; }

	// Validate session from cookie
	const cookieHeader = request.headers.cookie ?? '';
	const lucia = getLucia();
	const sessionCookieName = lucia.sessionCookieName;
	const match = cookieHeader.match(new RegExp(`${sessionCookieName}=([^;]+)`));
	if (!match) { socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n'); socket.destroy(); return; }

	// Strip proxy path prefix and forward to upstream
	const upstreamPath = url.slice(route.proxyPath.length) || '/';
	const upstreamUrl = new URL(upstreamPath, route.upstreamUrl);

	import('node:http').then(({ request: httpRequest }) => {
		const proxyReq = httpRequest({
			hostname: upstreamUrl.hostname,
			port: upstreamUrl.port || 80,
			path: upstreamUrl.pathname + upstreamUrl.search,
			method: 'GET',
			headers: {
				...request.headers,
				host: upstreamUrl.host,
				upgrade: 'websocket',
				connection: 'upgrade',
			},
		});

		proxyReq.on('upgrade', (proxyRes, proxySocket) => {
			socket.write(
				`HTTP/1.1 101 Switching Protocols\r\n` +
				`Upgrade: websocket\r\nConnection: Upgrade\r\n` +
				Object.entries(proxyRes.headers)
					.map(([k, v]) => `${k}: ${v}`)
					.join('\r\n') +
				'\r\n\r\n'
			);
			proxySocket.pipe(socket);
			socket.pipe(proxySocket);
			socket.on('error', () => proxySocket.destroy());
			proxySocket.on('error', () => socket.destroy());
		});

		proxyReq.on('error', () => { socket.write('HTTP/1.1 502 Bad Gateway\r\n\r\n'); socket.destroy(); });
		proxyReq.end();
	});
}

export const handle: Handle = async ({ event, resolve }) => {
	// Init background scheduler (idempotent)
	try { initScheduler(); } catch { /* non-critical */ }

	// Block banned IPs on all routes except static assets
	if (!event.url.pathname.startsWith('/_app')) {
		const ip = event.getClientAddress();
		if (await isBlocked(ip)) error(403, 'Access denied');
	}
	// First-run redirect
	if (!event.url.pathname.startsWith('/setup') && !event.url.pathname.startsWith('/auth')) {
		try {
			const db = getDb();
			const first = await db.select({ id: users.id }).from(users).limit(1);
			if (first.length === 0) redirect(302, '/setup');
		} catch {
			// DB not ready yet — let it through
		}
	}

	const lucia = getLucia();
	const sessionId = event.cookies.get(lucia.sessionCookieName);

	if (!sessionId) {
		event.locals.user = null;
		event.locals.session = null;
		return resolve(event);
	}

	const { session, user } = await lucia.validateSession(sessionId);

	if (session?.fresh) {
		const cookie = lucia.createSessionCookie(session.id);
		event.cookies.set(cookie.name, cookie.value, { path: '/', ...cookie.attributes });
	}
	if (!session) {
		const blank = lucia.createBlankSessionCookie();
		event.cookies.set(blank.name, blank.value, { path: '/', ...blank.attributes });
	}

	event.locals.session = session;
	event.locals.user = user;
	return resolve(event);
};
