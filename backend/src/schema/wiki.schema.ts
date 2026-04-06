/**
 * Slimmed Wikipedia Event Schema
 */
export const WIKI_RAW_SCHEMA = {
	type: 'record',
	name: 'WikiRawEvent',
	namespace: 'com.wikipulse',
	fields: [
		{ name: 'id', type: 'long' },
		{ name: 'user', type: 'string' },
		{ name: 'bot', type: 'boolean' },
		{ name: 'title', type: 'string' },
		{ name: 'wiki', type: 'string' },
		{ name: 'timestamp', type: 'long' },
		{ name: 'unpatrolled', type: 'boolean', default: false },
		{ name: 'type', type: 'string' }, // edit, new, log, etc.
		{ name: 'is_anon', type: 'boolean' },
	],
};

/**
 * Aggregated Metrics Schema (sent every 5 seconds)
 */
export const WIKI_METRICS_SCHEMA = {
	type: 'record',
	name: 'WikiMetrics',
	namespace: 'com.wikipulse',
	fields: [
		{ name: 'botCount', type: 'int' },
		{ name: 'humanCount', type: 'int' },
		{ name: 'anonCount', type: 'int' },
		{ name: 'communityCount', type: 'int' },
		{
			name: 'topLanguages',
			type: {
				type: 'array',
				items: {
					type: 'record',
					name: 'LanguageMetric',
					fields: [
						{ name: 'wiki', type: 'string' },
						{ name: 'count', type: 'int' },
					],
				},
			},
		},
		{ name: 'uniqueUsers', type: 'int', default: 0 },
		{ name: 'timestamp', type: 'long' },
		{ name: 'window_seconds', type: 'int', default: 60 },
	],
};

/**
 * Activity Spike Alert Schema
 */
export const WIKI_ALERTS_SCHEMA = {
	type: 'record',
	name: 'WikiAlert',
	namespace: 'com.wikipulse',
	fields: [
		{ name: 'title', type: 'string' },
		{ name: 'wiki', type: 'string' },
		{ name: 'editCount', type: 'int' },
		{ name: 'window_seconds', type: 'int' },
		{ name: 'timestamp', type: 'long' },
	],
};
