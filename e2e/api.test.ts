import { test, expect, request } from '@playwright/test';
import { resetDb, seedAdmin, seedAgent } from './helpers';

test.describe('Agent API', () => {
	let agentToken: string;

	test.beforeAll(async () => {
		await resetDb();
		await seedAdmin();
		agentToken = await seedAgent('api-test-agent');
	});

	test('POST /api/agent/push — valid payload returns 200', async () => {
		const ctx = await request.newContext({ baseURL: 'http://localhost:5173' });
		const res = await ctx.post('/api/agent/push', {
			headers: { Authorization: `Bearer ${agentToken}` },
			data: {
				host_id: 'api-test-agent',
				timestamp: Date.now(),
				metrics: {
					cpu_percent: 25.5,
					memory_used_mb: 1024,
					memory_total_mb: 4096,
					disk_used_gb: 50,
					disk_total_gb: 100,
					uptime_secs: 3600,
				},
			},
		});
		expect(res.status()).toBe(200);
		const body = await res.json();
		expect(body.ok).toBe(true);
	});

	test('POST /api/agent/push — invalid token returns 403', async () => {
		const ctx = await request.newContext({ baseURL: 'http://localhost:5173' });
		const res = await ctx.post('/api/agent/push', {
			headers: { Authorization: 'Bearer invalid-token' },
			data: {
				host_id: 'test',
				timestamp: Date.now(),
				metrics: {
					cpu_percent: 0, memory_used_mb: 0, memory_total_mb: 1,
					disk_used_gb: 0, disk_total_gb: 1, uptime_secs: 0,
				},
			},
		});
		expect(res.status()).toBe(403);
	});

	test('POST /api/agent/push — missing token returns 401', async () => {
		const ctx = await request.newContext({ baseURL: 'http://localhost:5173' });
		const res = await ctx.post('/api/agent/push', {
			data: { host_id: 'test', timestamp: 0, metrics: {} },
		});
		expect(res.status()).toBe(401);
	});

	test('POST /api/agent/push — cpu_percent > 100 returns 400 (zod)', async () => {
		const ctx = await request.newContext({ baseURL: 'http://localhost:5173' });
		const res = await ctx.post('/api/agent/push', {
			headers: { Authorization: `Bearer ${agentToken}` },
			data: {
				host_id: 'test',
				timestamp: Date.now(),
				metrics: {
					cpu_percent: 999, // invalid
					memory_used_mb: 1024,
					memory_total_mb: 4096,
					disk_used_gb: 50,
					disk_total_gb: 100,
					uptime_secs: 3600,
				},
			},
		});
		expect(res.status()).toBe(400);
	});

	test('POST /api/agent/push — missing metrics fields returns 400 (zod)', async () => {
		const ctx = await request.newContext({ baseURL: 'http://localhost:5173' });
		const res = await ctx.post('/api/agent/push', {
			headers: { Authorization: `Bearer ${agentToken}` },
			data: {
				host_id: 'test',
				timestamp: Date.now(),
				metrics: { cpu_percent: 50 }, // missing required fields
			},
		});
		expect(res.status()).toBe(400);
	});

	test('POST /api/agent/push — extra fields are allowed (passthrough)', async () => {
		const ctx = await request.newContext({ baseURL: 'http://localhost:5173' });
		const res = await ctx.post('/api/agent/push', {
			headers: { Authorization: `Bearer ${agentToken}` },
			data: {
				host_id: 'api-test-agent',
				timestamp: Date.now(),
				metrics: {
					cpu_percent: 10,
					memory_used_mb: 512,
					memory_total_mb: 4096,
					disk_used_gb: 20,
					disk_total_gb: 100,
					uptime_secs: 1000,
					future_metric: 'this should be ignored gracefully', // extra field
				},
			},
		});
		expect(res.status()).toBe(200);
	});

	test('POST /api/agent/register — requires admin session', async () => {
		const ctx = await request.newContext({ baseURL: 'http://localhost:5173' });
		const res = await ctx.post('/api/agent/register', {
			data: { name: 'unauthorized-agent' },
		});
		expect(res.status()).toBe(403);
	});
});
