import { SchemaType } from '@kafkajs/confluent-schema-registry';
import { EventSource } from 'eventsource';
import pRetry from 'p-retry';
import { WIKI_RAW_SCHEMA } from '../schema/wiki.schema.js';
import { logger } from '../utils/logger.js';
import { kafka, registry, TOPICS } from './client.js';

const WIKIMEDIA_STREAM_URL =
	process.env.WIKIMEDIA_STREAM_URL ||
	'https://stream.wikimedia.org/v2/stream/recentchange';

const producer = kafka.producer();

interface RawWikiEvent {
	id?: number;
	user?: string;
	bot?: boolean;
	title?: string;
	wiki?: string;
	timestamp?: number;
	type?: string;
	unpatrolled?: boolean;
	meta?: {
		domain: string;
	};
}

export function slimEvent(data: RawWikiEvent) {
	if (data.meta?.domain === 'canary') return null;
	if (!data.user) return null;

	const ipv4 = /^\d{1,3}(\.\d{1,3}){3}$/;
	const ipv6 = /^[0-9a-fA-F:]+:[0-9a-fA-F:]*$/;
	const isAnonymousUser = 
		data.user.startsWith('~') || 
		ipv4.test(data.user) || 
		ipv6.test(data.user);

	return {
		id: data.id ?? 0,
		user: data.user,
		bot: data.bot || false,
		title: data.title || 'Untitled',
		wiki: data.wiki || 'unknown',
		timestamp: (data.timestamp ?? 0) * 1000,
		type: data.type || 'unknown',
		is_anon: isAnonymousUser,
		unpatrolled: data.unpatrolled || false,
	};
}

let lastMessageTimestamp = Date.now();
let eventSource: EventSource | null = null;

async function start() {
	// Reconnection wrapper
	await pRetry(async () => {
		logger.info('Attempting to connect Producer to Kafka...');
		await producer.connect();
		logger.info(`Producer connected (Source: ${WIKIMEDIA_STREAM_URL})`);
	}, {
		retries: 5,
		onFailedAttempt: (error: any) => {
			logger.warn(`Kafka connection failed (Attempt ${error.attemptNumber}): ${error.message}`);
		}
	});

	const { id: schemaId } = await registry.register({
		type: SchemaType.AVRO,
		schema: JSON.stringify(WIKI_RAW_SCHEMA),
	});

	const connectSSE = () => {
		if (eventSource) {
			logger.info('Closing stale Wikipedia stream...');
			eventSource.close();
		}

		logger.info('Connecting to Wikipedia stream...');
		eventSource = new EventSource(WIKIMEDIA_STREAM_URL);

		eventSource.onopen = () => {
			logger.info('Connected to Wikipedia stream source signal');
			lastMessageTimestamp = Date.now();
		};

		eventSource.onerror = (error) => {
			logger.error(`Wikipedia stream error: ${JSON.stringify(error)}`);
		};

		eventSource.onmessage = async (event: MessageEvent) => {
			try {
				lastMessageTimestamp = Date.now();
				const data = JSON.parse(event.data) as RawWikiEvent;
				const slimmedEvent = slimEvent(data);
				if (!slimmedEvent) return;

				const encodedValue = await registry.encode(schemaId, slimmedEvent);
				await producer.send({
					topic: TOPICS.RAW_STREAM,
					messages: [{ key: data.wiki, value: encodedValue }],
				});
			} catch (err) {
				logger.error({ err }, 'Error processing Wikipedia event');
			}
		};
	};

	// Start stream
	connectSSE();

	// Watchdog for silent failures
	setInterval(() => {
		const idleTime = Date.now() - lastMessageTimestamp;
		if (idleTime > 60000) { // 60 seconds of silence
			logger.warn(`Wikipedia stream has been silent for ${Math.floor(idleTime/1000)}s. Re-triggering...`);
			connectSSE();
		}
	}, 15000);
}

if (process.env.NODE_ENV !== 'test') {
	start().catch((err) => logger.fatal({ err }, 'Fatal error in Producer process'));
}
