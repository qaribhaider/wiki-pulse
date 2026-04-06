import { expect, test } from '@playwright/test';
import { WebSocket } from 'ws';

interface MetricsData {
	botCount: number;
	humanCount: number;
	topLanguages: { wiki: string; count: number }[];
}

interface GatewayMessage {
	type: string;
	data: MetricsData;
}

test.describe('Wiki-Pulse E2E Data Pipeline', () => {
	test('should receive real-time metrics over WebSockets', async () => {
		// 1. Connect to the local Gateway
		const socket = new WebSocket('ws://localhost:3001');

		const messages: GatewayMessage[] = [];

		await new Promise<void>((resolve, reject) => {
			const timeout = setTimeout(() => {
				socket.close();
				reject(new Error('E2E Timeout: No metrics received after 45 seconds'));
			}, 45000);

			socket.on('open', () => {
				console.log('E2E: Connected to Gateway WebSocket');
			});

			socket.on('message', (data) => {
				const msg = JSON.parse(data.toString()) as GatewayMessage;
				console.log('E2E Message Received:', msg.type);
				messages.push(msg);

				// We want to see at least one METRICS packet
				// (Aggregation happens every 5s, so we wait for the first one)
				if (msg.type === 'METRICS') {
					clearTimeout(timeout);
					socket.close();
					resolve();
				}
			});

			socket.on('error', (err) => {
				reject(err);
			});
		});

		// 2. Validate the collected metrics
		const metricsMsg = messages.find((m) => m.type === 'METRICS');
		expect(metricsMsg).toBeDefined();

		const { data } = metricsMsg as GatewayMessage;
		expect(data.botCount + data.humanCount).toBeGreaterThan(0);
		expect(Array.isArray(data.topLanguages)).toBe(true);
		expect(data.topLanguages.length).toBeGreaterThan(0);

		console.log(
			`E2E Verification Success: ${data.botCount} bots / ${data.humanCount} humans processed.`,
		);
	});

	test('should provide a valid health check', async ({ request }) => {
		const response = await request.get('/health');
		expect(response.ok()).toBeTruthy();
		const data = (await response.json()) as { status: string };
		expect(data.status).toBe('ok');
	});
});
