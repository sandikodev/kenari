import { test, expect } from '@playwright/test';
import { resetDb, seedAdmin, seedAgent, seedAgentMetrics, TEST_ADMIN } from './helpers';

async function login(page: any) {
	await page.goto('/login');
	await page.getByPlaceholder('Email').fill(TEST_ADMIN.email);
	await page.getByPlaceholder('Password').fill(TEST_ADMIN.password);
	await page.getByRole('button', { name: 'Sign in' }).click();
	await expect(page).toHaveURL('/');
}

test.describe('Dashboard', () => {
	test.beforeAll(async () => {
		await resetDb();
		await seedAdmin();
	});

	test('shows monitoring routes', async ({ page }) => {
		await login(page);
		await expect(page.getByText('Uptime Kuma')).toBeVisible();
		await expect(page.getByText('Grafana')).toBeVisible();
	});

	test('shows service status indicators', async ({ page }) => {
		await login(page);
		// Status dots should be present (online or offline)
		const dots = page.locator('.rounded-full.bg-green-400, .rounded-full.bg-red-400');
		await expect(dots.first()).toBeVisible();
	});

	test('shows link to public status page', async ({ page }) => {
		await login(page);
		await expect(page.getByText('Public status page')).toBeVisible();
	});
});

test.describe('Agents', () => {
	test.beforeAll(async () => {
		await resetDb();
		await seedAdmin();
		const token = await seedAgent('test-server');
		await seedAgentMetrics('test-server');
	});

	test('shows agent list', async ({ page }) => {
		await login(page);
		await page.goto('/agents');
		await expect(page.getByText('test-server')).toBeVisible();
	});

	test('shows agent metrics', async ({ page }) => {
		await login(page);
		await page.goto('/agents');
		await expect(page.getByText('CPU')).toBeVisible();
		await expect(page.getByText('Memory')).toBeVisible();
		await expect(page.getByText('Disk')).toBeVisible();
		await expect(page.getByText('Uptime')).toBeVisible();
	});

	test('admin can register new agent', async ({ page }) => {
		await login(page);
		await page.goto('/agents');
		await page.getByRole('button', { name: '+ Add agent' }).click();
		await page.getByPlaceholder(/Host name/).fill('new-test-agent');
		await page.getByRole('button', { name: 'Register' }).click();
		// Token should appear
		await expect(page.getByText(/Copy this token/)).toBeVisible();
	});

	test('shows empty state when no agents', async ({ page }) => {
		await resetDb();
		await seedAdmin();
		await login(page);
		await page.goto('/agents');
		await expect(page.getByText('No agents registered yet')).toBeVisible();
	});
});

test.describe('Status Page (public)', () => {
	test.beforeAll(async () => {
		await resetDb();
		await seedAdmin();
	});

	test('accessible without login', async ({ page }) => {
		await page.goto('/status');
		// Should NOT redirect to login
		await expect(page).toHaveURL('/status');
		await expect(page.getByText('Kenari')).toBeVisible();
	});

	test('shows service status', async ({ page }) => {
		await page.goto('/status');
		await expect(page.getByText('Uptime Kuma')).toBeVisible();
		await expect(page.getByText('Grafana')).toBeVisible();
	});

	test('shows last checked timestamp', async ({ page }) => {
		await page.goto('/status');
		await expect(page.getByText(/Last checked at/)).toBeVisible();
	});

	test('shows Powered by Kenari footer', async ({ page }) => {
		await page.goto('/status');
		await expect(page.getByText('Powered by')).toBeVisible();
		await expect(page.getByText('Kenari')).toBeVisible();
	});
});
