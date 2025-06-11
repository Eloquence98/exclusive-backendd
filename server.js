const dotenv = require('dotenv');
const path = require('path');
const mongoose = require('mongoose');
const { logger } = require('./utils/logger');
const scheduleSaleCleanup = require('./lib/cornJobs/saleCleanup');
const processOrders = require('./lib/cornJobs/orderProcessing');

// Store cron jobs references
const activeJobs = {
  saleCleanup: null,
  orderProcessing: null,
};

// Initialize cron jobs
const initializeJobs = () => {
  try {
    activeJobs.saleCleanup = scheduleSaleCleanup();
    if (process.env.NODE_ENV !== 'test') {
      activeJobs.orderProcessing = processOrders();
    }
  } catch (error) {
    logger.error('Failed to initialize cron jobs:', {
      error: error.message,
      stack: error.stack,
    });
  }
};

// Load environment config
dotenv.config({
  path: path.join(__dirname, `.env.${process.env.NODE_ENV || 'development'}`),
});

// Initialize application
const app = require('./app');

const { ME_CONFIG_MONGODB_URL } = process.env;

// Start server
const port = process.env.PORT || 3000;
const server = app.listen(port, () => {
  logger.info(`App running on port ${port}...`);
});

// Graceful shutdown handler
const shutdown = (exitCode = 0, signal = '') => {
  const signalMessage = signal ? ` (${signal})` : '';
  logger.info(`Shutting down${signalMessage}...`);

  // Stop all active jobs
  Object.values(activeJobs).forEach((job) => job && job.stop());

  server.close(() => {
    logger.info('Server shut down complete');
    process.exit(exitCode);
  });
};

// Database connection
mongoose
  .connect(ME_CONFIG_MONGODB_URL, { dbName: process.env.DB_NAME })
  .then(() => {
    logger.info('DB connection successful!');
    initializeJobs();
  })
  .catch((err) => {
    logger.error('DB connection failed:', err);
    shutdown(1);
  });

// Error handling
process.on('uncaughtException', (err) => {
  logger.error('Uncaught Exception 💥', {
    name: err.name,
    message: err.message,
    stack: err.stack,
  });
  shutdown(1);
});

process.on('unhandledRejection', (err) => {
  logger.error('Unhandled Rejection 💥', {
    name: err.name,
    message: err.message,
    stack: err.stack,
  });
  shutdown(1);
});

process.on('SIGTERM', () => shutdown(0, 'SIGTERM'));
