import type { Handle } from '@sveltejs/kit';
import { getLucia } from '$lib/server/auth';
import { getDb } from '$lib/server/db';
import { users } from '$lib/server/db/schema';
import { redirect } from '@sveltejs/kit';
import { initScheduler } from '$lib/server/scheduler';

export const handle: Handle = async ({ event, resolve }) => {
	// Init background scheduler (idempotent)
	try { initScheduler(); } catch { /* non-critical */ }
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
