import { SchemaType } from '@kafkajs/confluent-schema-registry';
import pRetry from 'p-retry';
import { WIKI_METRICS_SCHEMA } from '../schema/wiki.schema.js';
import { logger } from '../utils/logger.js';
import { kafka, registry, TOPICS } from './client.js';

export interface WikiRawEvent {
	id: number;
	user: string;
	bot: boolean;
	title: string;
	wiki: string;
	timestamp: number;
	is_anon: boolean;
}

const consumer = kafka.consumer({ groupId: 'wiki-aggregator-group' });
const producer = kafka.producer();

const WINDOW_DURATION_MS = 60000;
const EMIT_INTERVAL_MS = 5000;

let eventBuffer: WikiRawEvent[] = [];

export function calculateMetrics(events: WikiRawEvent[], now: number) {
	let botCount = 0;
	let humanCount = 0;
	let anonCount = 0;
	let communityCount = 0;
	const languageMap = new Map<string, number>();
	const uniqueUsersSet = new Set<string>();

	for (const e of events) {
		if (e.bot) {
			botCount++;
		} else {
			humanCount++;
			if (e.is_anon) {
				anonCount++;
			} else {
				communityCount++;
			}
		}

		if (e.user) uniqueUsersSet.add(e.user);
		
		languageMap.set(e.wiki, (languageMap.get(e.wiki) || 0) + 1);
	}

	const topLanguages = Array.from(languageMap.entries())
		.map(([wiki, count]) => ({ wiki, count }))
		.sort((a, b) => b.count - a.count)
		.slice(0, 10);

	return {
		botCount,
		humanCount,
		anonCount,
		communityCount,
		topLanguages,
		uniqueUsers: uniqueUsersSet.size,
		timestamp: now,
		window_seconds: 60,
	};
}

async function start() {
	// Reconnection wrapper
	await pRetry(async () => {
		logger.info('Attempting to connect Aggregator to Kafka...');
		await consumer.connect();
		await producer.connect();
		logger.info('Aggregator connected to Kafka (Consumer + Producer)');
	}, {
		retries: 5,
		onFailedAttempt: (error: any) => {
			logger.warn(`Aggregator Kafka connection failed (Attempt ${error.attemptNumber}): ${error.message}`);
		}
	});

	await consumer.subscribe({ topic: TOPICS.RAW_STREAM, fromBeginning: false });

	const { id: schemaId } = await registry.register({
		type: SchemaType.AVRO,
		schema: JSON.stringify(WIKI_METRICS_SCHEMA),
	});

	consumer.run({
		eachMessage: async ({ message }) => {
			if (!message.value) return;
			try {
				const data: WikiRawEvent = await registry.decode(message.value);
				eventBuffer.push(data);
			} catch (err) {
				logger.error({ err }, 'Error decoding raw event in Aggregator');
			}
		},
	});

	setInterval(async () => {
		const now = Date.now();
		const cutoff = now - WINDOW_DURATION_MS;
		eventBuffer = eventBuffer.filter((e) => e.timestamp > cutoff);

		if (eventBuffer.length === 0) return;

		const metrics = calculateMetrics(eventBuffer, now);

		try {
			const encodedValue = await registry.encode(schemaId, metrics);
			await producer.send({
				topic: TOPICS.METRICS,
				messages: [{ value: encodedValue }],
			});
		} catch (err) {
			logger.error({ err }, 'Error sending metrics');
		}
	}, EMIT_INTERVAL_MS);
}

if (process.env.NODE_ENV !== 'test') {
	start().catch((err) => logger.fatal({ err }, 'Fatal error in Aggregator process'));
}
