const multer = require('multer');
const sharp = require('sharp');
const Product = require('../models/productModel');
const catchAsync = require('../utils/catchAsync');
const factory = require('./handlerFactory');
const AppError = require('../utils/appError');

// 1) Image upload setup
const multerStorage = multer.memoryStorage();

const multerFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image')) cb(null, true);
  else cb(new AppError('Not an image! Please upload only images.', 400), false);
};

const upload = multer({ storage: multerStorage, fileFilter: multerFilter });

const PRODUCT_SUMMARY_FIELDS =
  'title,slug,price,salePrice,currentPrice,discount,discountPercentage,onSale,saleStatus,imageCover,category,stock,isFeatured,ratingsAverage,ratingsQuantity';

// CENTRALIZED: ProductSummary fields for ALL list routes
exports.aliasProductSummary = (req, res, next) => {
  req.query.fields = PRODUCT_SUMMARY_FIELDS;
  next();
};

// Alias Routes Middleware
exports.aliasTopRated = (req, res, next) => {
  req.query.limit = '5';
  req.query.sort = '-ratingsAverage,price';
  next();
};

exports.aliasTrending = (req, res, next) => {
  req.query.limit = '5';
  req.query.sort = '-ratingsQuantity,-ratingsAverage';
  next();
};

exports.aliasFeatured = (req, res, next) => {
  req.query.isFeatured = 'true';
  req.query.limit = '8';
  req.query.sort = '-createdAt';
  next();
};

exports.aliasCategory = (req, res, next) => {
  req.query.category = req.params.category;
  next();
};

// Public stats for building frontend filters (price sliders, category lists, etc.)
exports.getPublicProductStats = catchAsync(async (req, res, next) => {
  const stats = await Product.aggregate([
    // Only active, non-deleted products
    {
      $match: { isDeleted: { $ne: true }, isActive: true },
    },
    {
      $facet: {
        // Overall price range for price slider
        priceRange: [
          {
            $group: {
              _id: null,
              minPrice: { $min: '$price' },
              maxPrice: { $max: '$price' },
            },
          },
          { $project: { _id: 0, minPrice: 1, maxPrice: 1 } },
        ],

        // Categories with product counts
        categories: [
          {
            $group: {
              _id: '$category',
              count: { $sum: 1 },
            },
          },
          { $sort: { count: -1 } },
          { $project: { _id: 0, name: '$_id', count: 1 } },
        ],

        // Available brands
        brands: [
          { $match: { brand: { $ne: null } } },
          {
            $group: {
              _id: '$brand',
              count: { $sum: 1 },
            },
          },
          { $sort: { count: -1 } },
          { $project: { _id: 0, name: '$_id', count: 1 } },
        ],

        // Available sizes
        sizes: [
          { $match: { size: { $ne: null } } },
          {
            $group: {
              _id: '$size',
              count: { $sum: 1 },
            },
          },
          { $project: { _id: 0, name: '$_id', count: 1 } },
        ],

        // Total product count
        totalProducts: [{ $count: 'count' }],
      },
    },
  ]);

  const result = stats[0];

  res.status(200).json({
    status: 'success',
    data: {
      priceRange: result.priceRange[0] || { minPrice: 0, maxPrice: 0 },
      totalProducts:
        result.totalProducts[0] && result.totalProducts[0].count
          ? result.totalProducts[0].count
          : 0,
      categories: result.categories,
      brands: result.brands,
      sizes: result.sizes,
    },
  });
});

// Statistics Controllers
exports.getProductStats = catchAsync(async (req, res, next) => {
  const stats = await Product.aggregate([
    {
      $group: {
        _id: '$category',
        numProducts: { $sum: 1 },
        avgRating: { $avg: '$ratingsAverage' },
        avgPrice: { $avg: '$price' },
        minPrice: { $min: '$price' },
        maxPrice: { $max: '$price' },
      },
    },
    {
      $sort: { numProducts: -1 },
    },
  ]);

  res.status(200).json({
    status: 'success',
    data: { stats },
  });
});

exports.getSalesStats = catchAsync(async (req, res, next) => {
  const stats = await Product.aggregate([
    {
      $match: { onSale: true },
    },
    {
      $group: {
        _id: '$category',
        numOnSale: { $sum: 1 },
        avgDiscount: { $avg: '$discount' },
        totalStock: { $sum: '$stock' },
      },
    },
    {
      $sort: { numOnSale: -1 },
    },
  ]);

  res.status(200).json({
    status: 'success',
    data: { stats },
  });
});

exports.getInventoryStats = catchAsync(async (req, res, next) => {
  const stats = await Product.aggregate([
    {
      $group: {
        _id: '$category',
        totalStock: { $sum: '$stock' },
        lowStock: {
          $sum: {
            $cond: [{ $lte: ['$stock', 10] }, 1, 0],
          },
        },
        outOfStock: {
          $sum: {
            $cond: [{ $eq: ['$stock', 0] }, 1, 0],
          },
        },
      },
    },
    {
      $sort: { lowStock: -1 },
    },
  ]);

  res.status(200).json({
    status: 'success',
    data: { stats },
  });
});

exports.getCategoryStats = catchAsync(async (req, res, next) => {
  const stats = await Product.aggregate([
    {
      $group: {
        _id: '$category',
        numProducts: { $sum: 1 },
        numFeatured: {
          $sum: {
            $cond: [{ $eq: ['$isFeatured', true] }, 1, 0],
          },
        },
        numOnSale: {
          $sum: {
            $cond: [{ $eq: ['$onSale', true] }, 1, 0],
          },
        },
        avgRating: { $avg: '$ratingsAverage' },
        totalStock: { $sum: '$stock' },
      },
    },
    {
      $sort: { numProducts: -1 },
    },
  ]);

  res.status(200).json({
    status: 'success',
    data: { stats },
  });
});

// Image Upload Middleware
exports.uploadProductImages = upload.fields([
  { name: 'imageCover', maxCount: 1 },
  { name: 'images', maxCount: 3 },
]);

exports.resizeProductImages = catchAsync(async (req, res, next) => {
  // Skip if no files uploaded at all
  if (!req.files) return next();

  // Process cover image if provided
  if (req.files.imageCover) {
    req.body.imageCover = `product-${req.params.id}-${Date.now()}-cover.jpeg`;
    await sharp(req.files.imageCover[0].buffer)
      .resize(2000, 1333)
      .toFormat('jpeg')
      .jpeg({ quality: 90 })
      .toFile(`public/img/products/${req.body.imageCover}`);
  }

  // Process other images if provided
  if (req.files.images && req.files.images.length > 0) {
    req.body.images = [];
    await Promise.all(
      req.files.images.map(async (file, i) => {
        const filename = `product-${req.params.id}-${Date.now()}-${i + 1}.jpeg`;
        await sharp(file.buffer)
          .resize(2000, 1333)
          .toFormat('jpeg')
          .jpeg({ quality: 90 })
          .toFile(`public/img/products/${filename}`);
        req.body.images.push(filename);
      }),
    );
  }

  next();
});

// Get product by slug
exports.getProductBySlug = catchAsync(async (req, res, next) => {
  const product = await Product.findOne({ slug: req.params.slug }).populate({
    path: 'reviews',
    fields: 'review rating user',
  });

  if (!product) {
    return next(new AppError('No product found with that name.', 404));
  }

  res.status(200).json({
    status: 'success',
    data: { data: product },
  });
});

// Search products - public route
exports.searchProducts = catchAsync(async (req, res, next) => {
  const { q, category, minPrice, maxPrice, onSale } = req.query;

  // Validate search query
  if (!q || q.trim().length < 2) {
    return next(
      new AppError('Search query must be at least 2 characters', 400),
    );
  }

  // Build match conditions
  const matchConditions = {
    $text: { $search: q },
  };

  // Optional filters
  if (category) matchConditions.category = category;
  if (onSale === 'true') matchConditions.onSale = true;
  if (minPrice || maxPrice) {
    matchConditions.price = {};
    if (minPrice) matchConditions.price.$gte = parseFloat(minPrice);
    if (maxPrice) matchConditions.price.$lte = parseFloat(maxPrice);
  }

  // Execute search with relevance score
  const products = await Product.find(matchConditions, {
    score: { $meta: 'textScore' }, // Relevance score
  })
    .select(
      'title slug price salePrice currentPrice onSale saleStatus imageCover category stock isFeatured ratingsAverage ratingsQuantity discount discountPercentage',
    )
    .sort({ score: { $meta: 'textScore' } }) // Sort by relevance
    .limit(50); // Limit search results

  res.status(200).json({
    status: 'success',
    results: products.length,
    data: {
      data: products,
    },
  });
});

// CRUD operations using factory
exports.getAllProducts = factory.getAll(Product);
exports.getProduct = factory.getOne(Product, { path: 'reviews' });
exports.createProduct = factory.createOne(Product);
exports.updateProduct = factory.updateOne(Product);
exports.deleteProduct = factory.deleteOne(Product);
