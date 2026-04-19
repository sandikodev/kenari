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

	webServer: {
		command: 'bun --env-file=.env.test run dev -- --port 5174',
		url: 'http://localhost:5174',
		reuseExistingServer: false,
		timeout: 30_000,
	},

	use: {
		baseURL: 'http://localhost:5174',
		trace: 'on-first-retry',
	},

	projects: [
		{ name: 'chromium', use: { ...devices['Desktop Chrome'] } },
	],
});
