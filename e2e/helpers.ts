/**
 * E2E test helpers — all DB operations go through the test API endpoint
 * so they use the same database as the running dev server.
 */

const BASE = 'http://localhost:5174';

async function testApi(action: string, data?: object) {
	const res = await fetch(`${BASE}/api/test`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ action, data }),
	});
	if (!res.ok) throw new Error(`Test API error: ${res.status} ${await res.text()}`);
	return res.json();
}

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

export async function resetDb() {
	await testApi('reset');
}

export async function seedAdmin() {
	await testApi('seed_user', { ...TEST_ADMIN, role: 'admin' });
}

export async function seedViewer() {
	await testApi('seed_user', { ...TEST_VIEWER, role: 'viewer' });
}

export async function seedAgent(name = 'test-agent') {
	const token = 'test-token-' + name;
	await testApi('seed_agent', { id: name, name, token });
	return token;
}

export async function seedAgentMetrics(agentId: string) {
	await testApi('seed_metrics', { agentId });
}
