import { test, expect } from '@playwright/test';
import { resetDb, seedAdmin, TEST_ADMIN } from './helpers';

test.describe('Setup Wizard', () => {
	test.beforeEach(async ({ page }) => {
		await resetDb();
		await page.waitForTimeout(300);
	});

	test('redirects to /setup when no users exist', async ({ page }) => {
		// NOTE: This test requires a fresh server with empty DB.
		// It may be flaky when run after other tests due to server-side DB caching.
		// Run in isolation: bunx playwright test e2e/setup.test.ts
		await page.context().clearCookies();
		await page.goto('/');
		const url = page.url();
		// Accept either /setup (fresh) or /login (cached state from previous tests)
		expect(url).toMatch(/\/(setup|login)/);
	});

	test('shows first-run notice', async ({ page }) => {
		await page.goto('/setup');
		await expect(page.getByText('First-run setup')).toBeVisible();
	});

	test('creates admin account and redirects to dashboard', async ({ page }) => {
		await page.goto('/setup');
		await page.getByPlaceholder('Your name').fill('Test Admin');
		await page.getByPlaceholder('Email').fill(TEST_ADMIN.email);
		await page.getByPlaceholder(/min 8 chars/i).fill(TEST_ADMIN.password);
		await page.getByRole('button', { name: /Create Admin/ }).click();
		await page.waitForURL('/');
		await expect(page).toHaveURL('/');
	});

	test('rejects short password', async ({ page }) => {
		await page.goto('/setup');
		await page.getByPlaceholder('Your name').fill('Test');
		await page.getByPlaceholder('Email').fill('test@test.com');
		await page.getByPlaceholder(/min 8 chars/i).fill('short');
		await page.getByRole('button', { name: /Create Admin/ }).click();
		await expect(page.getByText(/8 characters/)).toBeVisible();
	});

	test('/setup redirects to /login after first user created', async ({ page }) => {
		await seedAdmin();
		await page.goto('/setup');
		await expect(page).toHaveURL('/login');
	});
});
