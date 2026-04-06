import { kafka, TOPICS } from './client.js';

async function setup() {
	const admin = kafka.admin();
	console.log('Connecting to Kafka admin...');
	await admin.connect();
	console.log('Admin connected');

	const existingTopics = await admin.listTopics();
	console.log('Existing topics:', existingTopics);

	const topicsToCreate = [
		{
			topic: TOPICS.RAW_STREAM,
			numPartitions: 2,
			replicationFactor: 1,
			configEntries: [{ name: 'retention.ms', value: '60000' }],
		},
		{
			topic: TOPICS.METRICS,
			numPartitions: 2,
			configEntries: [{ name: 'retention.ms', value: '60000' }],
		},
		{
			topic: TOPICS.ALERTS,
			numPartitions: 2,
			configEntries: [{ name: 'retention.ms', value: '60000' }],
		},
	];

	const topicsToCreateFiltered = topicsToCreate.filter(
		(t) => !existingTopics.includes(t.topic),
	);

	if (topicsToCreateFiltered.length > 0) {
		console.log(
			'Creating topics:',
			topicsToCreateFiltered.map((t) => t.topic),
		);
		await admin.createTopics({
			topics: topicsToCreateFiltered,
			waitForLeaders: true,
		});
		console.log('Topics created successfully');
	} else {
		console.log('All required topics already exist');
	}

	await admin.disconnect();
}

setup().catch(console.error);
