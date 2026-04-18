/**
 * E2E test helpers — shared utilities for all tests
 */
import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import * as schema from '../src/lib/server/db/schema';
import { hash } from '@node-rs/argon2';
import { generateId } from 'lucia';

const TEST_DB = 'file:./test.db';

export const TEST_ADMIN = {
	email: 'admin@test.kenari',
	password: 'testpassword123',
	name: 'Test Admin',
};

export const TEST_VIEWER = {
	email: 'viewer@test.kenari',
	password: 'viewerpassword123',
	name: 'Test Viewer',
};

export async function getDb() {
	const client = createClient({ url: TEST_DB });
	return drizzle(client, { schema });
}

export async function resetDb() {
	const client = createClient({ url: TEST_DB });
	await client.execute('DELETE FROM agent_metrics');
	await client.execute('DELETE FROM agents');
	await client.execute('DELETE FROM audit_log');
	await client.execute('DELETE FROM failed_logins');
	await client.execute('DELETE FROM sessions');
	await client.execute('DELETE FROM users');
}

export async function seedAdmin() {
	const db = await getDb();
	const passwordHash = await hash(TEST_ADMIN.password);
	await db.insert(schema.users).values({
		id: generateId(15),
		email: TEST_ADMIN.email,
		name: TEST_ADMIN.name,
		passwordHash,
		role: 'admin',
		createdAt: Date.now(),
	}).onConflictDoNothing();
}

export async function seedViewer() {
	const db = await getDb();
	const passwordHash = await hash(TEST_VIEWER.password);
	await db.insert(schema.users).values({
		id: generateId(15),
		email: TEST_VIEWER.email,
		name: TEST_VIEWER.name,
		passwordHash,
		role: 'viewer',
		createdAt: Date.now(),
	}).onConflictDoNothing();
}

export async function seedAgent(name = 'test-agent') {
	const db = await getDb();
	const token = 'test-token-' + name;
	await db.insert(schema.agents).values({
		id: name,
		name,
		token,
		createdAt: Date.now(),
	}).onConflictDoNothing();
	return token;
}

export async function seedAgentMetrics(agentId: string) {
	const db = await getDb();
	await db.insert(schema.agentMetrics).values({
		agentId,
		cpuPercent: 25.5,
		memoryUsedMb: 1024,
		memoryTotalMb: 4096,
		diskUsedGb: 50,
		diskTotalGb: 100,
		uptimeSecs: 86400,
		createdAt: Date.now(),
	});
}
