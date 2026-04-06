import { useEffect, useRef, useState } from 'react';

export interface WikiMetrics {
	botCount: number;
	humanCount: number;
	totalEdits: number;
	topLanguages: Array<{ wiki: string; count: number }>;
	anonCount: number;
	communityCount: number;
	uniqueUsers: number;
}

export interface WikiAlert {
	wiki: string;
	title: string;
	editCount: number;
	timestamp: number;
}

export const useWikiPulse = () => {
	const [metrics, setMetrics] = useState<WikiMetrics | null>(null);
	const [alerts, setAlerts] = useState<WikiAlert[]>([]);
	const [status, setStatus] = useState<
		'INITIATING' | 'CONNECTED' | 'STREAMING' | 'DISCONNECTED'
	>('INITIATING');
	const ws = useRef<WebSocket | null>(null);

	useEffect(() => {
		let isMounted = true;
		let timeoutId: ReturnType<typeof setTimeout>;
		let watchdogId: ReturnType<typeof setTimeout>;
		let lastMessageTime = Date.now();

		const startWatchdog = () => {
			watchdogId = setInterval(() => {
				const timeSinceLastMessage = Date.now() - lastMessageTime;
				if (timeSinceLastMessage > 12000) { // 12s buffer for 5s heartbeat
					setStatus('DISCONNECTED');
				}
			}, 5000);
		};

		const connect = () => {
			if (!isMounted) return;
			setStatus('INITIATING');
			const wsUrl = import.meta.env.VITE_WS_URL || 'ws://localhost:8080';
			ws.current = new WebSocket(wsUrl);

			ws.current.onopen = () => {
				if (!isMounted) {
					ws.current?.close();
					return;
				}
				setStatus('CONNECTED');
				console.log('Dashboard connected to Wiki-Pulse Gateway');
				lastMessageTime = Date.now();
			};

			ws.current.onmessage = (event) => {
				if (!isMounted) return;
				const payload = JSON.parse(event.data);
				lastMessageTime = Date.now();

				if (payload.type === 'METRICS') {
					setStatus('STREAMING');
					const data = payload.data;
					const totalEdits =
						(data.botCount || 0) +
						(data.communityCount || 0) +
						(data.anonCount || 0);
					setMetrics({ ...data, totalEdits });
				} else if (payload.type === 'ALERT') {
					setStatus('STREAMING');
					setAlerts((prev) => [payload.data, ...prev].slice(0, 5));
				} else if (payload.type === 'HEARTBEAT') {
					// Keep-alive signal, status stays at last valid state (at least CONNECTED)
					setStatus(prev => prev === 'INITIATING' ? 'CONNECTED' : prev);
				}
			};

			ws.current.onclose = () => {
				if (!isMounted) return;
				setStatus('DISCONNECTED');
				timeoutId = setTimeout(connect, 3000); // Reconnect after 3s
			};
		};

		connect();
		startWatchdog();

		return () => {
			isMounted = false;
			clearTimeout(timeoutId);
			clearInterval(watchdogId);
			if (ws.current) {
				ws.current.onclose = null;
				ws.current.close();
			}
		};
	}, []);

	return { metrics, alerts, status };
};
