import { test, expect } from '@playwright/test';
import { resetDb, seedAdmin, seedViewer, TEST_ADMIN, TEST_VIEWER } from './helpers';

async function loginAs(page: any, user: { email: string; password: string }) {
	await page.goto('/login');
	await page.getByPlaceholder('Email').fill(user.email);
	await page.getByPlaceholder('Password').fill(user.password);
	await page.getByRole('button', { name: 'Sign in' }).click();
	await expect(page).toHaveURL('/');
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
		await expect(page.getByText('Console')).toBeVisible();
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
		// At least one login event should exist from our test logins
		await expect(page.getByText('login')).toBeVisible();
	});

	test('shows Threats tab', async ({ page }) => {
		await loginAs(page, TEST_ADMIN);
		await page.goto('/console');
		await page.getByRole('button', { name: 'Threats' }).click();
		// Either shows threats or "No failed login attempts"
		const content = page.locator('text=/failed login|No failed/i');
		await expect(content).toBeVisible();
	});

	test('admin can change user role', async ({ page }) => {
		await loginAs(page, TEST_ADMIN);
		await page.goto('/console');
		// Find viewer row and click role change button
		const viewerRow = page.locator(`tr:has-text("${TEST_VIEWER.email}"), div:has-text("${TEST_VIEWER.email}")`).first();
		await viewerRow.getByRole('button', { name: '→ admin' }).click();
		await expect(viewerRow.getByText('admin')).toBeVisible();
		// Change back
		await viewerRow.getByRole('button', { name: '→ viewer' }).click();
	});

	test('admin nav link visible for admin', async ({ page }) => {
		await loginAs(page, TEST_ADMIN);
		await expect(page.getByRole('link', { name: 'Console' })).toBeVisible();
	});

	test('console nav link not visible for viewer', async ({ page }) => {
		await loginAs(page, TEST_VIEWER);
		await expect(page.getByRole('link', { name: 'Console' })).not.toBeVisible();
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
		await expect(page.getByText('Settings')).toBeVisible();
		await expect(page.getByText('Change Password')).toBeVisible();
		await expect(page.getByText('Delete Account')).toBeVisible();
	});

	test('can change password', async ({ page }) => {
		await loginAs(page, TEST_ADMIN);
		await page.goto('/settings');
		await page.getByPlaceholder('Current password').fill(TEST_ADMIN.password);
		await page.getByPlaceholder('New password').fill('newpassword456');
		await page.getByPlaceholder('Confirm new password').fill('newpassword456');
		await page.getByRole('button', { name: 'Update Password' }).click();
		await expect(page.getByText('Password updated successfully')).toBeVisible();
	});

	test('rejects wrong current password', async ({ page }) => {
		await loginAs(page, TEST_ADMIN);
		await page.goto('/settings');
		await page.getByPlaceholder('Current password').fill('wrongpassword');
		await page.getByPlaceholder('New password').fill('newpassword456');
		await page.getByPlaceholder('Confirm new password').fill('newpassword456');
		await page.getByRole('button', { name: 'Update Password' }).click();
		await expect(page.getByText(/incorrect/i)).toBeVisible();
	});

	test('rejects mismatched passwords', async ({ page }) => {
		await loginAs(page, TEST_ADMIN);
		await page.goto('/settings');
		await page.getByPlaceholder('Current password').fill(TEST_ADMIN.password);
		await page.getByPlaceholder('New password').fill('newpassword456');
		await page.getByPlaceholder('Confirm new password').fill('differentpassword');
		await page.getByRole('button', { name: 'Update Password' }).click();
		await expect(page.getByText(/do not match/i)).toBeVisible();
	});

	test('delete account requires typing DELETE', async ({ page }) => {
		await loginAs(page, TEST_ADMIN);
		await page.goto('/settings');
		const deleteBtn = page.getByRole('button', { name: 'Delete My Account' });
		// Button should be disabled initially
		await expect(deleteBtn).toBeDisabled();
		// Type wrong confirmation
		await page.getByPlaceholder(/Type DELETE/).fill('delete');
		await expect(deleteBtn).toBeDisabled();
		// Type correct confirmation
		await page.getByPlaceholder(/Type DELETE/).fill('DELETE');
		await expect(deleteBtn).toBeEnabled();
	});
});
