import { redirect } from '@sveltejs/kit';
import { getLucia } from '$lib/server/auth';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ locals, cookies }) => {
	if (!locals.session) redirect(302, '/login');
	const lucia = getLucia();
	await lucia.invalidateSession(locals.session.id);
	const blank = lucia.createBlankSessionCookie();
	cookies.set(blank.name, blank.value, { path: '/', ...blank.attributes });
	redirect(302, '/login');
};
