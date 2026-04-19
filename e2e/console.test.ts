import { test, expect } from '@playwright/test';
import { resetDb, seedAdmin, seedViewer, TEST_ADMIN, TEST_VIEWER } from './helpers';

async function loginAs(page: any, user: { email: string; password: string }) {
	await page.goto('/login');
	await page.getByPlaceholder('Email').fill(user.email);
	await page.getByPlaceholder('Password').fill(user.password);
	await page.getByRole('button', { name: 'Sign in' }).click();
	await page.waitForURL('/');
}

test.describe('Console (admin only)', () => {
	test.beforeAll(async () => {
		await resetDb();
		await seedAdmin();
		await seedViewer();
	});

	test('admin can access /console', async ({ page }) => {
		await loginAs(page, TEST_ADMIN);
		await page.goto('/console');
		await expect(page).toHaveURL('/console');
		await expect(page.getByRole('heading', { name: 'Console' })).toBeVisible();
	});

	test('viewer is redirected away from /console', async ({ page }) => {
		await loginAs(page, TEST_VIEWER);
		await page.goto('/console');
		await expect(page).not.toHaveURL('/console');
	});

	test('shows Users tab with user list', async ({ page }) => {
		await loginAs(page, TEST_ADMIN);
		await page.goto('/console');
		await expect(page.getByText(TEST_ADMIN.email)).toBeVisible();
		await expect(page.getByText(TEST_VIEWER.email)).toBeVisible();
	});

	test('shows Timeline tab', async ({ page }) => {
		await loginAs(page, TEST_ADMIN);
		await page.goto('/console');
		await page.getByRole('button', { name: 'Timeline' }).click();
		await expect(page.locator('span.font-mono').first()).toBeVisible();
	});

	test('shows Threats tab', async ({ page }) => {
		await loginAs(page, TEST_ADMIN);
		await page.goto('/console');
		await page.getByRole('button', { name: 'Threats' }).click();
		// Either shows threat data or empty state
		await expect(page.locator('[class*="Threats"], .space-y-4, .text-center').first()).toBeVisible();
	});

	test('admin can change user role', async ({ page }) => {
		await loginAs(page, TEST_ADMIN);
		await page.goto('/console');
		// Find row containing viewer email, click role change button within it
		const viewerRow = page.locator('div.px-5.py-3\\.5').filter({ hasText: TEST_VIEWER.email });
		await viewerRow.getByRole('button', { name: '→ admin' }).click();
		await page.waitForTimeout(500);
		await viewerRow.getByRole('button', { name: '→ viewer' }).click();
	});

	test('admin nav link visible for admin', async ({ page }) => {
		await loginAs(page, TEST_ADMIN);
		await expect(page.getByRole('navigation').getByRole('link', { name: 'Console' })).toBeVisible();
	});

	test('console nav link not visible for viewer', async ({ page }) => {
		await loginAs(page, TEST_VIEWER);
		await expect(page.getByRole('navigation').getByRole('link', { name: 'Console' })).not.toBeVisible();
	});
});

test.describe('Settings', () => {
	test.beforeEach(async () => {
		await resetDb();
		await seedAdmin();
	});

	test('can access settings page', async ({ page }) => {
		await loginAs(page, TEST_ADMIN);
		await page.goto('/settings');
		await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible();
		await expect(page.getByText('Change Password')).toBeVisible();
		await expect(page.getByText('Delete Account')).toBeVisible();
	});

	test('can change password', async ({ page }) => {
		await loginAs(page, TEST_ADMIN);
		await page.goto('/settings');
		await page.getByPlaceholder('Current password').fill(TEST_ADMIN.password);
		await page.locator('input[name="new"]').fill('newpassword456');
		await page.getByPlaceholder('Confirm new password').fill('newpassword456');
		await page.getByRole('button', { name: 'Update Password' }).click();
		await expect(page.getByText('Password updated successfully')).toBeVisible();
	});

	test('rejects wrong current password', async ({ page }) => {
		await loginAs(page, TEST_ADMIN);
		await page.goto('/settings');
		await page.getByPlaceholder('Current password').fill('wrongpassword');
		await page.locator('input[name="new"]').fill('newpassword456');
		await page.getByPlaceholder('Confirm new password').fill('newpassword456');
		await page.getByRole('button', { name: 'Update Password' }).click();
		await expect(page.getByText(/incorrect/i)).toBeVisible();
	});

	test('rejects mismatched passwords', async ({ page }) => {
		await loginAs(page, TEST_ADMIN);
		await page.goto('/settings');
		await page.getByPlaceholder('Current password').fill(TEST_ADMIN.password);
		await page.locator('input[name="new"]').fill('newpassword456');
		await page.getByPlaceholder('Confirm new password').fill('differentpassword');
		await page.getByRole('button', { name: 'Update Password' }).click();
		await expect(page.getByText(/do not match/i)).toBeVisible();
	});

	test('delete account requires typing DELETE', async ({ page }) => {
		await loginAs(page, TEST_ADMIN);
		await page.goto('/settings');
		const deleteBtn = page.getByRole('button', { name: 'Delete My Account' });
		await expect(deleteBtn).toBeDisabled();
		await page.getByPlaceholder('Type DELETE to confirm').fill('delete');
		await expect(deleteBtn).toBeDisabled();
		await page.getByPlaceholder('Type DELETE to confirm').fill('DELETE');
		await expect(deleteBtn).toBeEnabled();
	});
});
