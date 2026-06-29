const dotenv = require('dotenv');
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const { logger } = require('./utils/logger');
const scheduleSaleCleanup = require('./lib/cornJobs/saleCleanup');
const processOrders = require('./lib/cornJobs/orderProcessing');

dotenv.config();

// Store cron jobs references
const activeJobs = {
  saleCleanup: null,
  orderProcessing: null,
};

//
const ensureDirectories = () => {
  const dirs = [
    path.join(__dirname, 'public', 'img', 'products'),
    path.join(__dirname, 'public', 'img', 'users'),
  ];

  dirs.forEach((dir) => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      logger.info(`Created directory: ${dir}`);
    }
  });
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

// Initialize application
const app = require('./app');

// Database configuration
const getDbConfig = () => {
  const options = {
    dbName: process.env.DB_NAME,
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 30000,
    retryWrites: true,
    w: 'majority',
  };

  /**
   * MongoDB URI Priority:
   *
   * DEVELOPMENT:
   * - Running API on host + MongoDB in Docker: Use MONGODB_URI (mongodb://localhost:27017)
   * - Running full stack in Docker: Use ME_CONFIG_MONGODB_URL (mongodb://mongo:27017)
   *
   * PRODUCTION:
   * - Use MONGODB_URI with cloud provider (MongoDB Atlas, Railway, etc.)
   */
  return {
    uri: process.env.MONGODB_URI || process.env.ME_CONFIG_MONGODB_URL,
    options,
  };
};

// Start server
const port = process.env.PORT || 3000;
const server = app.listen(port, () => {
  logger.info(`App running on port ${port} in ${process.env.NODE_ENV} mode...`);
});

// Graceful shutdown handler
const shutdown = async (exitCode = 0, signal = '') => {
  const signalMessage = signal ? ` (${signal})` : '';
  logger.info(`Shutting down${signalMessage}...`);

  // Stop all active jobs
  Object.values(activeJobs).forEach((job) => job && job.stop());

  server.close(async () => {
    try {
      if (mongoose.connection.readyState === 1) {
        await mongoose.disconnect();
        logger.info('MongoDB connection closed');
      }
    } catch (err) {
      logger.error('Error closing MongoDB connection:', err);
    } finally {
      logger.info('Server shut down complete');
      process.exit(exitCode);
    }
  });
};

ensureDirectories();

// Database connection
const { uri, options } = getDbConfig();

if (!uri) {
  logger.error('No MongoDB connection URI found in environment variables');
  process.exit(1);
}

mongoose
  .connect(uri, options)
  .then(() => {
    logger.info('DB connection successful!');
    initializeJobs();
  })
  .catch((err) => {
    logger.error('DB connection failed:', {
      error: err.message,
      stack: err.stack,
      uri: uri.replace(/\/\/[^@]+@/, '//***:***@'), // Mask credentials in logs
    });
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
process.on('SIGINT', () => shutdown(0, 'SIGINT'));
