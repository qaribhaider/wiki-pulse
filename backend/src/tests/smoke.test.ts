import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';
import { describe, expect, it } from 'vitest';

describe('Backend Smoke Tests', () => {
	it('should have a .env file', () => {
		const envPath = path.resolve(process.cwd(), '.env');
		expect(fs.existsSync(envPath), '.env file is missing').toBe(true);
	});

	it('should have all required cert files in certs/', () => {
		const certsDir = path.resolve(process.cwd(), 'certs');
		const required = ['ca.pem', 'service.cert', 'service.key'];

		for (const cert of required) {
			const certPath = path.join(certsDir, cert);
			expect(
				fs.existsSync(certPath),
				`Certificate ${cert} is missing in certs/`,
			).toBe(true);
		}
	});

	it('should define critical Kafka environment variables', () => {
		dotenv.config();
		const required = [
			'KAFKA_BROKER',
			'SCHEMA_REGISTRY_URL',
			'SCHEMA_REGISTRY_USERNAME',
			'SCHEMA_REGISTRY_PASSWORD',
		];

		for (const env of required) {
			expect(
				process.env[env],
				`Environment variable ${env} is not defined`,
			).toBeDefined();
		}
	});
});
