import { getDb } from './db';
import { auditLog } from './db/schema';

export async function log(
	action: string,
	detail?: string,
	userId?: string | null,
	ip?: string
) {
	try {
		await getDb().insert(auditLog).values({
			userId: userId ?? null,
			action,
			detail: detail ?? null,
			ip: ip ?? null,
			createdAt: Date.now()
		});
	} catch {
		// non-critical — never throw
	}
}
