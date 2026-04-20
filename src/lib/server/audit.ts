import { getDb } from './db';
import { auditLog, failedLogins, blockedIps } from './db/schema';
import { gte, eq, desc } from 'drizzle-orm';
import { alertFailedLoginSpike } from './telegram';
import { createHash } from 'node:crypto';

function computeHash(entry: {
	id?: number; userId: string | null; action: string;
	detail: string | null; ip: string | null; createdAt: number;
}, prevHash: string | null): string {
	const content = JSON.stringify({
		id: entry.id, userId: entry.userId, action: entry.action,
		detail: entry.detail, ip: entry.ip, createdAt: entry.createdAt,
		prevHash
	});
	return createHash('sha256').update(content).digest('hex');
}

export async function log(
	action: string,
	detail?: string,
	userId?: string | null,
	ip?: string,
	userAgent?: string
) {
	try {
		const db = getDb();
		// Get previous hash for chaining
		const prev = await db.select({ hash: auditLog.hash })
			.from(auditLog).orderBy(desc(auditLog.id)).limit(1);
		const prevHash = prev[0]?.hash ?? null;

		const entry = {
			userId: userId ?? null, action,
			detail: detail ?? null, ip: ip ?? null,
			userAgent: userAgent ?? null, createdAt: Date.now()
		};
		const hash = computeHash(entry, prevHash);
		await db.insert(auditLog).values({ ...entry, hash });
	} catch { /* non-critical */ }
}

export async function trackFailedLogin(ip: string, email?: string) {
	try {
		const db = getDb();
		await db.insert(failedLogins).values({ ip, email: email ?? null, createdAt: Date.now() });

		// Auto-block after 20 failures in 5 minutes
		const since = Date.now() - 5 * 60_000;
		const rows = await db.select({ id: failedLogins.id }).from(failedLogins)
			.where(gte(failedLogins.createdAt, since));
		const count = rows.filter(r => r).length;

		if (count >= 20) {
			await db.insert(blockedIps).values({
				ip,
				reason: `Auto-blocked: ${count} failed logins in 5 minutes`,
				blockedAt: Date.now(),
				expiresAt: Date.now() + 60 * 60_000 // 1 hour
			}).onConflictDoNothing();
			await alertFailedLoginSpike(ip, count);
		} else if (count === 10) {
			await alertFailedLoginSpike(ip, count);
		}
	} catch { /* non-critical */ }
}

export async function getFailedLoginCount(ip: string, windowMs = 60_000): Promise<number> {
	try {
		const since = Date.now() - windowMs;
		const rows = await getDb().select({ id: failedLogins.id }).from(failedLogins)
			.where(gte(failedLogins.createdAt, since));
		return rows.length;
	} catch { return 0; }
}

export async function isBlocked(ip: string): Promise<boolean> {
	try {
		const db = getDb();
		const block = await db.query.blockedIps.findFirst({ where: eq(blockedIps.ip, ip) });
		if (!block) return false;
		// Check expiry
		if (block.expiresAt && block.expiresAt < Date.now()) {
			await db.delete(blockedIps).where(eq(blockedIps.ip, ip));
			return false;
		}
		return true;
	} catch { return false; }
}
