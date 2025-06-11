const winston = require('winston');
const path = require('path');

// Define log format
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json(),
);

// Console format for better readability
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.printf(
    (info) =>
      `${info.timestamp} ${info.level}: ${info.message}${info.stack ? `\n${info.stack}` : ''}`,
  ),
);

// Define different log levels
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

// Define level based on environment
const level = () => {
  const env = process.env.NODE_ENV || 'development';
  return env === 'development' ? 'debug' : 'info'; // Changed to 'info' for production
};

// Create the logger
const logger = winston.createLogger({
  level: level(),
  levels,
  format: logFormat,
  transports: [
    // Write all logs to console with custom format
    new winston.transports.Console({
      format: consoleFormat,
    }),
    // Write all logs with level 'info' and below to combined.log
    new winston.transports.File({
      filename: path.join(__dirname, '../logs/combined.log'),
    }),
    // Write all errors to error.log
    new winston.transports.File({
      filename: path.join(__dirname, '../logs/error.log'),
      level: 'error',
    }),
  ],
});

// Create a stream object for Morgan middleware
const stream = {
  write: (message) => logger.http(message.trim()),
};

module.exports = { logger, stream };
