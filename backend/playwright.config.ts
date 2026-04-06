/// <reference types="node" />
import { defineConfig } from '@playwright/test';

export default defineConfig({
	testDir: './src/tests/e2e',
	timeout: 60 * 1000,
	use: {
		baseURL: 'http://localhost:3001',
	},
	webServer: {
		command: 'npm run dev',
		url: 'http://localhost:3001/health',
		reuseExistingServer: !process.env.CI,
		timeout: 120 * 1000,
	},
});
