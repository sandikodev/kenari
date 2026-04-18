import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
	testDir: './e2e',
	testMatch: '**/*.test.ts',
	fullyParallel: false, // sequential — tests share DB state
	retries: 0,
	workers: 1,
	reporter: 'list',

	use: {
		baseURL: 'http://localhost:5173',
		trace: 'on-first-retry',
	},

	// Run dev server before tests
	webServer: {
		command: 'bun --env-file=.env.test run dev',
		url: 'http://localhost:5173',
		reuseExistingServer: true,
		timeout: 30_000,
	},

	projects: [
		{ name: 'chromium', use: { ...devices['Desktop Chrome'] } },
	],
});
