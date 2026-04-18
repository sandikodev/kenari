import { test, expect } from '@playwright/test';
import { resetDb, seedAdmin, TEST_ADMIN } from './helpers';

test.describe('Setup Wizard', () => {
	test.beforeEach(async () => {
		await resetDb();
	});

	test('redirects to /setup when no users exist', async ({ page }) => {
		await page.goto('/');
		await expect(page).toHaveURL('/setup');
		await expect(page.getByText('Welcome to Kenari')).toBeVisible();
	});

	test('shows first-run notice', async ({ page }) => {
		await page.goto('/setup');
		await expect(page.getByText('First-run setup')).toBeVisible();
	});

	test('creates admin account and redirects to dashboard', async ({ page }) => {
		await page.goto('/setup');
		await page.getByPlaceholder('Your name').fill('Test Admin');
		await page.getByPlaceholder('Email').fill(TEST_ADMIN.email);
		await page.getByPlaceholder(/Password/).fill(TEST_ADMIN.password);
		await page.getByRole('button', { name: /Create Admin/ }).click();
		await expect(page).toHaveURL('/');
		await expect(page.getByText('Dashboard')).toBeVisible();
	});

	test('rejects short password', async ({ page }) => {
		await page.goto('/setup');
		await page.getByPlaceholder('Your name').fill('Test');
		await page.getByPlaceholder('Email').fill('test@test.com');
		await page.getByPlaceholder(/Password/).fill('short');
		await page.getByRole('button', { name: /Create Admin/ }).click();
		await expect(page.getByText(/8 characters/)).toBeVisible();
	});

	test('/setup redirects to /login after first user created', async ({ page }) => {
		await seedAdmin();
		await page.goto('/setup');
		await expect(page).toHaveURL('/login');
	});
});
