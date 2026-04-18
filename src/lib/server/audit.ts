import { getDb } from './db';
import { auditLog, failedLogins } from './db/schema';
import { gte } from 'drizzle-orm';

export async function log(
	action: string,
	detail?: string,
	userId?: string | null,
	ip?: string,
	userAgent?: string
) {
	try {
		await getDb().insert(auditLog).values({
			userId: userId ?? null,
			action,
			detail: detail ?? null,
			ip: ip ?? null,
			userAgent: userAgent ?? null,
			createdAt: Date.now()
		});
	} catch { /* non-critical */ }
}

export async function trackFailedLogin(ip: string, email?: string) {
	try {
		await getDb().insert(failedLogins).values({ ip, email: email ?? null, createdAt: Date.now() });
	} catch { /* non-critical */ }
}

export async function getFailedLoginCount(ip: string, windowMs = 60_000): Promise<number> {
	try {
		const since = Date.now() - windowMs;
		const rows = await getDb()
			.select({ id: failedLogins.id })
			.from(failedLogins)
			.where(gte(failedLogins.createdAt, since));
		return rows.filter(r => r).length;
	} catch { return 0; }
}
