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

const sslOptions: SslOptions | boolean = KAFKA_CA_PEM && KAFKA_KEY_PEM && KAFKA_CERT_PEM
	? {
			ca: [KAFKA_CA_PEM.replace(/\\n/g, '\n')],
			key: KAFKA_KEY_PEM.replace(/\\n/g, '\n'),
			cert: KAFKA_CERT_PEM.replace(/\\n/g, '\n'),
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
