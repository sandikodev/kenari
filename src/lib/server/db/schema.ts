import { integer, real, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const users = sqliteTable('users', {
	id: text('id').primaryKey(),
	email: text('email').notNull().unique(),
	name: text('name').notNull(),
	passwordHash: text('password_hash'),
	githubId: text('github_id').unique(),
	role: text('role').notNull().default('viewer'),
	createdAt: integer('created_at').notNull()
});

export const sessions = sqliteTable('sessions', {
	id: text('id').primaryKey(),
	userId: text('user_id').notNull().references(() => users.id),
	expiresAt: integer('expires_at').notNull()
});

export const auditLog = sqliteTable('audit_log', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	userId: text('user_id').references(() => users.id),
	action: text('action').notNull(),
	detail: text('detail'),
	ip: text('ip'),
	createdAt: integer('created_at').notNull()
});

export const agents = sqliteTable('agents', {
	id: text('id').primaryKey(),
	name: text('name').notNull(),
	token: text('token').notNull().unique(),
	lastSeen: integer('last_seen'),
	createdAt: integer('created_at').notNull()
});

export const agentMetrics = sqliteTable('agent_metrics', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	agentId: text('agent_id').notNull().references(() => agents.id),
	cpuPercent: real('cpu_percent').notNull(),
	memoryUsedMb: real('memory_used_mb').notNull(),
	memoryTotalMb: real('memory_total_mb').notNull(),
	diskUsedGb: real('disk_used_gb').notNull(),
	diskTotalGb: real('disk_total_gb').notNull(),
	uptimeSecs: integer('uptime_secs').notNull(),
	createdAt: integer('created_at').notNull()
});
