import { redirect } from '@sveltejs/kit';
import { getLucia } from '$lib/server/auth';
import { log } from '$lib/server/audit';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ cookies, locals }) => {
	const lucia = getLucia();
	const sessionId = cookies.get(lucia.sessionCookieName);
	if (sessionId) {
		await log('logout', undefined, locals.user?.id);
		await lucia.invalidateSession(sessionId);
	}
	const blank = lucia.createBlankSessionCookie();
	cookies.set(blank.name, blank.value, { path: '/', ...blank.attributes });
	redirect(302, '/login');
};
