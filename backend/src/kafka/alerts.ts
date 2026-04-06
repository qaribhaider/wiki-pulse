import { SchemaType } from '@kafkajs/confluent-schema-registry';
import pRetry from 'p-retry';
import { WIKI_ALERTS_SCHEMA } from '../schema/wiki.schema.js';
import { logger } from '../utils/logger.js';
import { kafka, registry, TOPICS } from './client.js';

const consumer = kafka.consumer({ groupId: 'wiki-alerts-group' });
const producer = kafka.producer();

const ALERT_THRESHOLD = 3;
const WINDOW_DURATION_MS = 10000;
const COOLDOWN_MS = 30000; // Don't alert for the same title more than once every 30s

const editHistory = new Map<string, number[]>();
const lastAlerted = new Map<string, number>();

interface WikiRawData {
	title: string;
	wiki: string;
	timestamp: number;
}

export function detectActivitySpike(
	data: WikiRawData,
	now: number,
	editHistory: Map<string, number[]>,
	threshold: number,
	windowMs: number,
) {
	const { title, wiki, timestamp } = data;

	let timestamps = editHistory.get(title) || [];
	timestamps = timestamps.filter((t) => now - t < windowMs);
	timestamps.push(timestamp);
	editHistory.set(title, timestamps);

	if (timestamps.length >= threshold) {
		return {
			title,
			wiki,
			editCount: timestamps.length,
			window_seconds: Math.round(windowMs / 1000),
			timestamp: now,
		};
	}
	return null;
}

async function start() {
	// Reconnection wrapper
	await pRetry(async () => {
		logger.info('Attempting to connect Alerts service to Kafka...');
		await consumer.connect();
		await producer.connect();
		logger.info('Alerts connected to Kafka (Consumer + Producer)');
	}, {
		retries: 5,
		onFailedAttempt: (error: any) => {
			logger.warn(`Alerts Kafka connection failed (Attempt ${error.attemptNumber}): ${error.message}`);
		}
	});

	await consumer.subscribe({ topic: TOPICS.RAW_STREAM, fromBeginning: false });

	const { id: schemaId } = await registry.register({
		type: SchemaType.AVRO,
		schema: JSON.stringify(WIKI_ALERTS_SCHEMA),
	});

	consumer.run({
		eachMessage: async ({ message }) => {
			if (!message.value) return;
			try {
				const data = (await registry.decode(message.value)) as WikiRawData;
				const now = Date.now();

				const alert = detectActivitySpike(
					data,
					now,
					editHistory,
					ALERT_THRESHOLD,
					WINDOW_DURATION_MS,
				);

				if (alert) {
					const lastAlertTime = lastAlerted.get(data.title) || 0;

					if (now - lastAlertTime > COOLDOWN_MS) {
						const encodedValue = await registry.encode(schemaId, alert);
						await producer.send({
							topic: TOPICS.ALERTS,
							messages: [{ value: encodedValue }],
						});
						lastAlerted.set(data.title, now);
						logger.info({ title: data.title }, 'Activity Spike Alert triggered and sent to Kafka');
					}
				}

				if (Math.random() < 0.01) {
					for (const [key, val] of editHistory.entries()) {
						if (val.every((t) => now - t >= WINDOW_DURATION_MS)) {
							editHistory.delete(key);
						}
					}
				}
			} catch (err) {
				logger.error({ err }, 'Error processing alert detection');
			}
		},
	});
}

if (process.env.NODE_ENV !== 'test') {
	start().catch((err) => logger.fatal({ err }, 'Fatal error in Alerts process'));
}
