import { defineConfig } from 'vitest/config';

export default defineConfig({
	test: {
		exclude: [
			'**/node_modules/**',
			'**/dist/**',
			'**/e2e/**', // e2e tests run via Playwright only (npm run test:e2e)
		],
	},
});
