import { SchemaRegistry } from '@kafkajs/confluent-schema-registry';
import dotenv from 'dotenv';
import { Kafka } from 'kafkajs';

dotenv.config();

const {
	KAFKA_BROKER,
	KAFKA_CA_PEM,
	KAFKA_CERT_PEM,
	KAFKA_KEY_PEM,
	SCHEMA_REGISTRY_URL,
	SCHEMA_REGISTRY_USERNAME,
	SCHEMA_REGISTRY_PASSWORD,
} = process.env;

interface SslOptions {
	ca: string[];
	key: string;
	cert: string;
}

const formatPem = (pem?: string) => {
	if (!pem) return '';
	// Remove surrounding quotes if they exist (common in some .env parsers)
	let cleaned = pem.trim();
	if (cleaned.startsWith('"') && cleaned.endsWith('"')) {
		cleaned = cleaned.substring(1, cleaned.length - 1);
	}
	return cleaned.replace(/\\n/g, '\n');
};

const sslOptions: SslOptions | boolean = KAFKA_CA_PEM && KAFKA_KEY_PEM && KAFKA_CERT_PEM
	? {
			ca: [formatPem(KAFKA_CA_PEM)],
			key: formatPem(KAFKA_KEY_PEM),
			cert: formatPem(KAFKA_CERT_PEM),
		}
	: true;

export const kafka = new Kafka({
	clientId: 'wiki-pulse-app',
	brokers: [KAFKA_BROKER || 'localhost:9092'],
	ssl: sslOptions,
});

export const registry = new SchemaRegistry({
	host: SCHEMA_REGISTRY_URL || 'http://localhost:8081',
	auth:
		SCHEMA_REGISTRY_USERNAME && SCHEMA_REGISTRY_PASSWORD
			? {
					username: SCHEMA_REGISTRY_USERNAME,
					password: SCHEMA_REGISTRY_PASSWORD,
				}
			: undefined,
});

export const TOPICS = {
	RAW_STREAM: 'wiki-raw-stream',
	METRICS: 'wiki-metrics-aggregated',
	ALERTS: 'wiki-alerts',
};
