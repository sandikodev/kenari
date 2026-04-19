import cron from 'node-cron';
import { getDb } from './db';
import { agents, failedLogins } from './db/schema';
import { lt } from 'drizzle-orm';
import { alertAgentOffline } from './telegram';

let initialized = false;

export function initScheduler() {
	if (initialized) return;
	initialized = true;

	// Check agent status every 5 minutes
	cron.schedule('*/5 * * * *', async () => {
		try {
			const db = getDb();
			const threshold = Date.now() - 5 * 60 * 1000;
			const allAgents = await db.select().from(agents);
			for (const agent of allAgents) {
				// Only alert if agent was previously seen but now offline
				if (agent.lastSeen && agent.lastSeen < threshold) {
					await alertAgentOffline(agent.name, agent.lastSeen);
				}
			}
		} catch { /* non-critical */ }
	});

	// Clean up failed_logins older than 24 hours — daily at 3am
	cron.schedule('0 3 * * *', async () => {
		try {
			const db = getDb();
			const cutoff = Date.now() - 86_400_000;
			await db.delete(failedLogins).where(lt(failedLogins.createdAt, cutoff));
		} catch { /* non-critical */ }
	});
}
