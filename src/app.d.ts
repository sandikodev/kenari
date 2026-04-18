import type { User, Session } from 'lucia';

declare global {
	namespace App {
		interface Locals {
			user: User | null;
			session: Session | null;
		}
	}
}

declare module 'lucia' {
	interface Register {
		Lucia: import('$lib/server/auth').LuciaType;
		DatabaseUserAttributes: { email: string; name: string; role: string };
	}
}

export {};
