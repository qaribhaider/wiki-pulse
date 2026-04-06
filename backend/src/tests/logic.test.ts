import avro from 'avsc';
import { describe, expect, it } from 'vitest';
import { calculateMetrics, type WikiRawEvent } from '../kafka/aggregator.js';
import { detectActivitySpike } from '../kafka/alerts.js';
import { slimEvent } from '../kafka/producer.js';
import {
	WIKI_ALERTS_SCHEMA,
	WIKI_METRICS_SCHEMA,
	WIKI_RAW_SCHEMA,
} from '../schema/wiki.schema.js';

describe('Wiki Pulse Logic Tests', () => {
	describe('Slimming Logic', () => {
		it('should correctly slim a Wikipedia event', () => {
			const rawEvent = {
				id: 123,
				user: 'TestUser',
				bot: true,
				title: 'Main Page',
				wiki: 'enwiki',
				timestamp: 1625097600, // seconds
				type: 'edit',
			};

			const slimmed = slimEvent(rawEvent);
			expect(slimmed).toEqual({
				id: rawEvent.id,
				user: rawEvent.user,
				bot: true,
				title: rawEvent.title,
				wiki: rawEvent.wiki,
				timestamp: 1625097600000,
				type: 'edit',
				is_anon: false,
				unpatrolled: false,
			});
		});

		it('should result in a record valid against WIKI_RAW_SCHEMA', () => {
			const type = avro.Type.forSchema(
				WIKI_RAW_SCHEMA as Parameters<typeof avro.Type.forSchema>[0],
			);
			const rawEvent = {
				id: 1,
				user: 'A',
				timestamp: 0,
				title: 'T',
				wiki: 'W',
				type: 'edit',
				is_anon: false,
			};
			const slimmed = slimEvent(rawEvent);
			expect(type.isValid(slimmed)).toBe(true);
		});
	});

	describe('Aggregation Logic', () => {
		it('should calculate correct metrics for a window of events', () => {
			const now = Date.now();
			const events: WikiRawEvent[] = [
				{
					id: 1,
					user: 'A',
					bot: false,
					is_anon: false,
					wiki: 'enwiki',
					title: 'T1',
					timestamp: now,
				},
				{
					id: 2,
					user: 'B',
					bot: true,
					is_anon: false,
					wiki: 'enwiki',
					title: 'T2',
					timestamp: now,
				},
				{
					id: 3,
					user: '1.1.1.1',
					bot: false,
					is_anon: true,
					wiki: 'dewiki',
					title: 'T3',
					timestamp: now,
				},
			];

			const metrics = calculateMetrics(events, now);
			expect(metrics.botCount).toBe(1);
			expect(metrics.humanCount).toBe(2);

			// Validate metrics against schema
			const type = avro.Type.forSchema(
				WIKI_METRICS_SCHEMA as Parameters<typeof avro.Type.forSchema>[0],
			);
			expect(type.isValid(metrics)).toBe(true);
		});
	});

	describe('Activity Spike Radar Logic', () => {
		it('should detect an activity spike and match WIKI_ALERTS_SCHEMA', () => {
			const history = new Map<string, number[]>();
			const now = 1000000;
			const threshold = 3;
			const event = { title: 'Test', wiki: 'enwiki', timestamp: now, user: 'test' };

			const alert = detectActivitySpike(event, now, history, threshold, 1000);

			const type = avro.Type.forSchema(
				WIKI_ALERTS_SCHEMA as Parameters<typeof avro.Type.forSchema>[0],
			);
			expect(type.isValid(alert)).toBe(true);
		});

		it('should detect an activity spike when threshold is crossed', () => {
			const history = new Map<string, number[]>();
			const now = 1000000;
			const threshold = 3;
			const windowMs = 15000;
			const event = { title: 'T', wiki: 'w', timestamp: now, user: 'u' };

			const alerts = [
				detectActivitySpike(event, now, history, threshold, windowMs),
				detectActivitySpike(event, now + 1000, history, threshold, windowMs),
				detectActivitySpike(event, now + 2000, history, threshold, windowMs),
			];

			const alert = detectActivitySpike(
				{ ...event, timestamp: now + 3000 },
				now + 3000,
				history,
				threshold,
				windowMs,
			);
			expect(alert).not.toBeNull();
			expect(alert?.editCount).toBe(4);
			expect(alert?.title).toBe('T');
		});

		it('should not detect an activity spike outside the window', () => {
			const history = new Map<string, number[]>();
			const now = 1000000;
			const threshold = 20;
			const windowMs = 15000;
			const event = { title: 'T', wiki: 'w', timestamp: now, user: 'u' };

			detectActivitySpike(event, now, history, threshold, windowMs);
			detectActivitySpike(event, now + 5000, history, threshold, windowMs);

			const alert = detectActivitySpike(
				{ ...event, timestamp: now + 16000 },
				now + 16000,
				history,
				threshold,
				windowMs,
			);
			expect(alert).toBeNull();
		});
	});
});
