import { test, expect } from '@playwright/test';
import { resetDb, seedAdmin, seedViewer, TEST_ADMIN, TEST_VIEWER } from './helpers';

test.describe('Authentication', () => {
	test.beforeAll(async () => {
		await resetDb();
		await seedAdmin();
		await seedViewer();
	});

	test('login page renders correctly', async ({ page }) => {
		await page.goto('/login');
		await expect(page.getByRole('heading', { name: 'Kenari' })).toBeVisible();
		await expect(page.getByPlaceholder('Email')).toBeVisible();
		await expect(page.getByPlaceholder('Password')).toBeVisible();
		await expect(page.getByRole('button', { name: 'Sign in' })).toBeVisible();
		await expect(page.getByText('Continue with GitHub')).toBeVisible();
	});

	test('redirects unauthenticated user to /login', async ({ page }) => {
		await page.goto('/');
		await expect(page).toHaveURL('/login');
	});

	test('shows error on wrong password', async ({ page }) => {
		await page.goto('/login');
		await page.getByPlaceholder('Email').fill(TEST_ADMIN.email);
		await page.getByPlaceholder('Password').fill('wrongpassword');
		await page.getByRole('button', { name: 'Sign in' }).click();
		await expect(page.getByText(/Invalid email or password/)).toBeVisible();
	});

	test('shows error on unknown email', async ({ page }) => {
		await page.goto('/login');
		await page.getByPlaceholder('Email').fill('nobody@nowhere.com');
		await page.getByPlaceholder('Password').fill('somepassword');
		await page.getByRole('button', { name: 'Sign in' }).click();
		await expect(page.getByText(/Invalid email or password/)).toBeVisible();
	});

	test('admin can login and sees dashboard', async ({ page }) => {
		await page.goto('/login');
		await page.getByPlaceholder('Email').fill(TEST_ADMIN.email);
		await page.getByPlaceholder('Password').fill(TEST_ADMIN.password);
		await page.getByRole('button', { name: 'Sign in' }).click();
		await page.waitForURL('/');
		await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
	});

	test('admin sees admin badge in nav', async ({ page }) => {
		await page.goto('/login');
		await page.getByPlaceholder('Email').fill(TEST_ADMIN.email);
		await page.getByPlaceholder('Password').fill(TEST_ADMIN.password);
		await page.getByRole('button', { name: 'Sign in' }).click();
		await page.waitForURL('/');
		await expect(page.locator('span.text-amber-400').first()).toBeVisible();
	});

	test('logout clears session and redirects to /login', async ({ page }) => {
		await page.goto('/login');
		await page.getByPlaceholder('Email').fill(TEST_ADMIN.email);
		await page.getByPlaceholder('Password').fill(TEST_ADMIN.password);
		await page.getByRole('button', { name: 'Sign in' }).click();
		await page.waitForURL('/');
		// Click profile button in nav then sign out
		await page.locator('nav').getByRole('button').last().click();
		await page.waitForTimeout(300);
		await page.getByRole('button', { name: 'Sign out' }).click();
		await expect(page).toHaveURL('/login');
		await page.goto('/');
		await expect(page).toHaveURL('/login');
	});

	test('rate limiting blocks after 10 failed attempts', async ({ page }) => {
		await page.goto('/login');
		// Make 10 failed attempts
		for (let i = 0; i < 10; i++) {
			await page.getByPlaceholder('Email').fill(`attempt${i}@test.com`);
			await page.getByPlaceholder('Password').fill('wrongpassword');
			await page.getByRole('button', { name: 'Sign in' }).click();
			await page.waitForTimeout(100);
		}
		// 11th attempt should be rate limited
		await page.getByPlaceholder('Email').fill('another@test.com');
		await page.getByPlaceholder('Password').fill('wrongpassword');
		await page.getByRole('button', { name: 'Sign in' }).click();
		await expect(page.getByText(/Too many attempts/)).toBeVisible();
	});
});
