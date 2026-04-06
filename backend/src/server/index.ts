import { createServer } from 'node:http';
import express from 'express';
import helmet from 'helmet';
import pRetry from 'p-retry';
import { WebSocket, WebSocketServer } from 'ws';
import { kafka, registry, TOPICS } from '../kafka/client.js';
import { logger } from '../utils/logger.js';

const app = express();
app.use(helmet());

const server = createServer(app);
const wss = new WebSocketServer({ server });

const consumer = kafka.consumer({ groupId: 'wiki-websocket-gateway' });
const clients = new Set<WebSocket>();

interface BroadcastMessage {
	type: string;
	data: unknown;
}

function broadcast(message: BroadcastMessage) {
	const payload = JSON.stringify(message);
	clients.forEach((client) => {
		if (client.readyState === WebSocket.OPEN) {
			client.send(payload);
		}
	});
}

async function startKafkaConsumer() {
	await pRetry(async () => {
		logger.info('Attempting to connect Gateway to Kafka...');
		await consumer.connect();
		logger.info('Gateway connected to Kafka');
	}, {
		retries: 5,
		onFailedAttempt: (error: any) => {
			logger.warn(`Gateway Kafka connection failed (Attempt ${error.attemptNumber}): ${error.message}`);
		}
	});

	await consumer.subscribe({ topic: TOPICS.METRICS, fromBeginning: false });
	await consumer.subscribe({ topic: TOPICS.ALERTS, fromBeginning: false });

	await consumer.run({
		eachMessage: async ({ topic, message }) => {
			if (!message.value) return;
			try {
				const data = await registry.decode(message.value);
				const broadcastMessage: BroadcastMessage = {
					type: topic === TOPICS.METRICS ? 'METRICS' : 'ALERT',
					data,
				};
				broadcast(broadcastMessage);
			} catch (err) {
				logger.error({ err }, 'Error decoding message in Gateway');
			}
		},
	});
}

wss.on('connection', (ws) => {
	clients.add(ws);
	logger.info('New client connected to WebSocket Gateway');

	ws.send(JSON.stringify({ type: 'CONNECTED', timestamp: Date.now() }));

	ws.on('message', (message) => {
		try {
			const data = JSON.parse(message.toString()) as { type: string };
			if (data.type === 'PING') {
				ws.send(JSON.stringify({ type: 'PONG', timestamp: Date.now() }));
			}
		} catch {
			// ignore
		}
	});

	ws.on('close', () => {
		clients.delete(ws);
		logger.info('Client disconnected from Gateway');
	});

	ws.on('error', (err) => {
		logger.error({ err }, 'WebSocket client error');
	});
});

// Periodic heartbeat to keep connections alive and verify health
setInterval(() => {
	broadcast({ type: 'HEARTBEAT', data: { timestamp: Date.now() } });
}, 5000);

app.get('/health', (_req, res) => {
	res.json({ status: 'ok', kafka: 'connected' });
});

const PORT = Number.parseInt(process.env.PORT || '3001', 10);

const start = async () => {
	logger.info('--- STARTING WIKI-PULSE GATEWAY ---');
	try {
		await startKafkaConsumer();
		server.listen(PORT, '0.0.0.0', () => {
			logger.info(`Gateway server listening on port ${PORT} (Express + WS Ready)`);
		});
	} catch (err: any) {
		const errorMessage = err instanceof Error ? err.message : String(err);
		const errorStack = err instanceof Error ? err.stack : undefined;
		logger.fatal({ 
			message: errorMessage, 
			stack: errorStack,
			raw: err 
		}, 'Failed to start Gateway server');
		process.exit(1);
	}
};

start();
