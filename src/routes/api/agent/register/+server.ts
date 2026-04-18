import { json, error } from '@sveltejs/kit';
import { getDb } from '$lib/server/db';
import { agents } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import type { RequestHandler } from './$types';

// Admin-only: register a new agent and get back a token
export const POST: RequestHandler = async ({ request, locals }) => {
	const user = locals.user as unknown as { role: string } | null;
	if (user?.role !== 'admin') error(403, 'Admin only');

	const { name } = await request.json();
	if (!name) error(400, 'name required');

	const db = getDb();
	const existing = await db.query.agents.findFirst({ where: eq(agents.name, name) });
	if (existing) error(409, 'Agent name already exists');

	const token = crypto.randomUUID().replace(/-/g, '') + crypto.randomUUID().replace(/-/g, '');
	const id = name.toLowerCase().replace(/\s+/g, '-');

	await db.insert(agents).values({ id, name, token, createdAt: Date.now() });
	return json({ id, token });
};
