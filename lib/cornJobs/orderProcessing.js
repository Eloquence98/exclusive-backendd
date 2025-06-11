/* eslint-disable no-console */
const cron = require('node-cron');
const orderModel = require('../../models/orderModel');
const { logger } = require('../../utils/logger');

// Timing configuration
const CRON_INTERVAL = '* * * * *'; // Run every minute

const processOrders = async () => {
  try {
    logger.info('🔄 [CRON] Starting order status updates...');
    const updates = await orderModel.autoProgressStatus();

    const totalUpdates = Object.values(updates).reduce((a, b) => a + b, 0);

    if (totalUpdates > 0) {
      logger.info('✅ [CRON] Order updates summary:', {
        totalUpdates,
        details: {
          processing: updates.processing
            ? `${updates.processing} orders (Processing → Confirmed)`
            : null,
          confirmed: updates.confirmed
            ? `${updates.confirmed} orders (Confirmed → Shipped)`
            : null,
          shipped: updates.shipped
            ? `${updates.shipped} orders (Shipped → Delivered)`
            : null,
        },
      });
    } else {
      logger.debug('ℹ️ [CRON] No orders needed updating');
    }
  } catch (error) {
    logger.error('❌ [CRON] Failed to update orders:', {
      error: error.message,
      stack: error.stack,
    });
  }
};

// Initialize cron job and return it
const initOrderProcessing = () => {
  if (process.env.NODE_ENV === 'test') {
    return null;
  }

  const job = cron.schedule(CRON_INTERVAL, processOrders, {
    scheduled: true,
    timezone: 'UTC',
  });

  logger.info('⏰ [CRON] Order processing job scheduled (every minute)');
  return job;
};

module.exports = initOrderProcessing;
