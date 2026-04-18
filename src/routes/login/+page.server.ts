import { fail, redirect } from '@sveltejs/kit';
import { getLucia } from '$lib/server/auth';
import { getDb } from '$lib/server/db';
import { users } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { verify } from '@node-rs/argon2';
import { log } from '$lib/server/audit';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	if (locals.user) redirect(302, '/');
	return {};
};

export const actions: Actions = {
	default: async ({ request, cookies, getClientAddress }) => {
		const data = await request.formData();
		const email = data.get('email') as string;
		const password = data.get('password') as string;

		if (!email || !password) return fail(400, { error: 'Email and password are required' });

		const db = getDb();
		const user = await db.query.users.findFirst({ where: eq(users.email, email) });

		if (!user?.passwordHash) return fail(401, { error: 'Invalid email or password' });

		const valid = await verify(user.passwordHash, password);
		if (!valid) return fail(401, { error: 'Invalid email or password' });

		const lucia = getLucia();
		const session = await lucia.createSession(user.id, {});
		const cookie = lucia.createSessionCookie(session.id);
		cookies.set(cookie.name, cookie.value, { path: '/', ...cookie.attributes });

		await log('login', `email login`, user.id, getClientAddress());
		redirect(302, '/');
	}
};
