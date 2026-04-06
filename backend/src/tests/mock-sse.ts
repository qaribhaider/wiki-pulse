import express from 'express';

const app = express();

app.get('/v2/stream/recentchange', (req, res) => {
	res.setHeader('Content-Type', 'text/event-stream');
	res.setHeader('Cache-Control', 'no-cache');
	res.setHeader('Connection', 'keep-alive');

	let id = 1;
	const sendEdit = (title: string, user: string) => {
		const data = {
			id: id++,
			type: 'edit',
			title,
			user,
			bot: false,
			wiki: 'enwiki',
			timestamp: Math.floor(Date.now() / 1000),
		};
		res.write(`data: ${JSON.stringify(data)}\n\n`);
	};

	// Simulate an activity spike on "Activity Spike Test" title
	const interval = setInterval(() => {
		const id = Math.floor(Math.random() * 5);
		sendEdit('Activity Spike Test', `User${id}`);
		if (id >= 10) {
			// Just keep pulsing after 10 edits to keep connection open
			sendEdit('Idle Page', 'SystemBot');
		}
	}, 1000); // 1 edit per second

	req.on('close', () => {
		clearInterval(interval);
		console.log('Mock SSE Client disconnected');
	});
});

const PORT = 8080;
app.listen(PORT, '0.0.0.0', () => {
	console.log(
		`Mock SSE Server running on http://localhost:${PORT}/v2/stream/recentchange (Express Mode)`,
	);
});
