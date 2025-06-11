/* eslint-disable no-console */
const cron = require('node-cron');
const Product = require('../../models/productModel');
const { logger } = require('../../utils/logger');

const scheduleSaleCleanup = () => {
  // Schedule to run at midnight (00:00) every day
  const job = cron.schedule(
    '0 0 * * *',
    async () => {
      try {
        const result = await Product.expireSales();
        logger.info('🧹 Sales cleanup completed', {
          timestamp: new Date().toISOString(),
          updatedProducts:
            result && result.modifiedCount ? result.modifiedCount : 0,
        });
      } catch (error) {
        logger.error('❌ Sales cleanup failed:', {
          error: error.message,
          stack: error.stack,
          timestamp: new Date().toISOString(),
        });
      }
    },
    {
      scheduled: true,
      timezone: 'UTC',
    },
  );

  logger.info('⏰ [CRON] Sales cleanup job scheduled (daily at midnight UTC)');
  return job;
};

module.exports = scheduleSaleCleanup;
