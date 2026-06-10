// routes/orderRoutes.js
const express = require('express');
const orderController = require('../controllers/orderController');
const authController = require('../controllers/authController');
const userController = require('../controllers/userController');

const router = express.Router();

// Public routes (no auth required)
router.get(
  '/track/:orderNumber',
  orderController.aliasTrackOrder,
  orderController.trackOrder,
);

// Routes that work for both guests and authenticated users
router.post(
  '/',
  authController.protectOptional,
  userController.createGuestUser,
  orderController.createOrder,
);

// Protected routes (auth required)
router.use(authController.protect);

router.get('/my-orders', orderController.getMyOrders);
router.get(
  '/recent',
  orderController.aliasRecentOrders,
  orderController.getMyOrders,
);
router.patch('/:id/cancel', orderController.cancelOrder);

// Admin routes
router.use(authController.restrictTo('admin'));

router
  .route('/')
  .get(orderController.aliasDefaultFields, orderController.getAllOrders);

router
  .route('/:id([0-9a-fA-F]{24})')
  .get(orderController.getOrder)
  .patch(orderController.updateOrder)
  .delete(orderController.deleteOrder);

router.get('/stats', orderController.getOrderStats);
router.get('/monthly-stats/:year', orderController.getMonthlyStats);

module.exports = router;
