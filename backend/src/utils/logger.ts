import pino from 'pino';

const isProduction = process.env.NODE_ENV === 'production';
const logLevel = process.env.LOG_LEVEL || (isProduction ? 'info' : 'debug');

export const logger = pino({
	level: logLevel,
	formatters: {
		level: (label) => {
			return { level: label.toUpperCase() };
		},
	},
});

export default logger;
