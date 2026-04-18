import { redirect, fail } from '@sveltejs/kit';
import { getDb } from '$lib/server/db';
import { users } from '$lib/server/db/schema';
import { hash } from '@node-rs/argon2';
import { generateId } from 'lucia';
import { getLucia } from '$lib/server/auth';
import type { Actions, PageServerLoad } from './$types';

async function hasUsers() {
	const db = getDb();
	const first = await db.select({ id: users.id }).from(users).limit(1);
	return first.length > 0;
}

export const load: PageServerLoad = async ({ locals }) => {
	if (locals.user) redirect(302, '/');
	if (await hasUsers()) redirect(302, '/login');
	return {};
};

export const actions: Actions = {
	default: async ({ request, cookies }) => {
		if (await hasUsers()) redirect(302, '/login');

		const data = await request.formData();
		const name = (data.get('name') as string)?.trim();
		const email = (data.get('email') as string)?.trim();
		const password = data.get('password') as string;

		if (!name || !email || !password) return fail(400, { error: 'All fields are required' });
		if (password.length < 8) return fail(400, { error: 'Password must be at least 8 characters' });

		const passwordHash = await hash(password);
		const db = getDb();
		const [user] = await db.insert(users).values({
			id: generateId(15),
			email,
			name,
			passwordHash,
			role: 'admin',
			createdAt: Date.now()
		}).returning();

		const lucia = getLucia();
		const session = await lucia.createSession(user.id, {});
		const cookie = lucia.createSessionCookie(session.id);
		cookies.set(cookie.name, cookie.value, { path: '/', ...cookie.attributes });

		redirect(302, '/');
	}
};
