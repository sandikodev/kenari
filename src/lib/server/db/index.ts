import { drizzle } from 'drizzle-orm/libsql';
import { createClient } from '@libsql/client';
import * as schema from './schema';
import { env } from '$env/dynamic/private';

let _db: ReturnType<typeof drizzle<typeof schema>> | null = null;

export function getDb() {
	if (_db) return _db;
	const url = env.DATABASE_URL;
	if (!url) throw new Error('DATABASE_URL is not set');
	const client = createClient({
		url,
		authToken: env.DATABASE_AUTH_TOKEN ?? undefined
	});
	_db = drizzle(client, { schema });
	return _db;
}

export { getDb as db };
