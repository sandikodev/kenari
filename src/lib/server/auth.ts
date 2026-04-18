import { Lucia } from 'lucia';
import { DrizzleSQLiteAdapter } from '@lucia-auth/adapter-drizzle';
import { getDb } from '$lib/server/db';
import { sessions, users } from '$lib/server/db/schema';

let _lucia: Lucia | null = null;

export function getLucia(): Lucia {
	if (_lucia) return _lucia;
	const db = getDb();
	const adapter = new DrizzleSQLiteAdapter(db, sessions, users);
	_lucia = new Lucia(adapter, {
		sessionCookie: { attributes: { secure: process.env.NODE_ENV === 'production' } },
		getUserAttributes: (attrs) => ({
			email: attrs.email,
			name: attrs.name,
			role: attrs.role
		})
	});
	return _lucia;
}

export type LuciaType = ReturnType<typeof getLucia>;

declare module 'lucia' {
	interface Register {
		Lucia: LuciaType;
		DatabaseUserAttributes: { email: string; name: string; role: string };
	}
}
