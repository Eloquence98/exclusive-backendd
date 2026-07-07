const express = require('express');
const productController = require('../controllers/productController');
const authController = require('../controllers/authController');
const reviewRouter = require('./reviewRoutes');

const router = express.Router();

// POST /products/:productId/reviews
// GET /products/:productId/reviews
router.use('/:productId/reviews', reviewRouter);

// Top Products Routes
router
  .route('/top-rated')
  .get(
    productController.aliasProductSummary,
    productController.aliasTopRated,
    productController.getAllProducts,
  );

router
  .route('/trending')
  .get(
    productController.aliasProductSummary,
    productController.aliasTrending,
    productController.getAllProducts,
  );

router
  .route('/featured')
  .get(
    productController.aliasProductSummary,
    productController.aliasFeatured,
    productController.getAllProducts,
  );

// Statistics Routes
router
  .route('/product-stats')
  .get(
    authController.protect,
    authController.restrictTo('admin'),
    productController.getProductStats,
  );

router
  .route('/sales-stats')
  .get(
    authController.protect,
    authController.restrictTo('admin'),
    productController.getSalesStats,
  );

router
  .route('/inventory-stats')
  .get(
    authController.protect,
    authController.restrictTo('admin'),
    productController.getInventoryStats,
  );

// Category Routes
// Category Routes
router
  .route('/category/:category')
  .get(
    productController.aliasProductSummary,
    productController.aliasCategory,
    productController.getAllProducts,
  );

router
  .route('/category-stats')
  .get(
    authController.protect,
    authController.restrictTo('admin'),
    productController.getCategoryStats,
  );

// Regular Routes
router
  .route('/')
  .get(productController.aliasProductSummary, productController.getAllProducts)
  .post(
    authController.protect,
    authController.restrictTo('admin'),
    productController.createProduct,
  );

router
  .route('/:id([0-9a-fA-F]{24})') // Matches only valid MongoDB ObjectIds
  .get(productController.getProduct)
  .patch(
    authController.protect,
    authController.restrictTo('admin'),
    productController.uploadProductImages,
    productController.resizeProductImages,
    productController.updateProduct,
  )
  .delete(
    authController.protect,
    authController.restrictTo('admin'),
    productController.deleteProduct,
  );

router.route('/:slug').get(productController.getProductBySlug);

module.exports = router;
