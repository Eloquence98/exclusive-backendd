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

// Default fields middleware
exports.aliasDefaultFields =
  (additionalFields = '') =>
  (req, res, next) => {
    const defaultFields =
      'title,price,salePrice,currentPrice,imageCover,category,ratingsAverage,ratingsQuantity,slug,onSale,saleStatus,stock,isFeatured';
    req.query.fields = additionalFields
      ? `${defaultFields},${additionalFields}`
      : defaultFields;
    next();
  };

// Alias Routes Middleware
exports.aliasTopRated = (req, res, next) => {
  req.query.limit = '5';
  req.query.sort = '-ratingsAverage,price';
  req.query.fields =
    'title,price,currentPrice,ratingsAverage,category,imageCover,slug';
  next();
};

exports.aliasTrending = (req, res, next) => {
  req.query.limit = '5';
  req.query.sort = '-ratingsQuantity,-ratingsAverage';
  req.query.fields =
    'title,price,currentPrice,ratingsAverage,ratingsQuantity,category,imageCover,slug';
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
  if (!req.files.imageCover || !req.files.images) return next();

  // Cover image
  req.body.imageCover = `product-${req.params.id}-${Date.now()}-cover.jpeg`;
  await sharp(req.files.imageCover[0].buffer)
    .resize(2000, 1333)
    .toFormat('jpeg')
    .jpeg({ quality: 90 })
    .toFile(`public/img/products/${req.body.imageCover}`);

  // Other images
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

  next();
});

// CRUD operations using factory
exports.getAllProducts = factory.getAll(Product);
exports.getProduct = factory.getOne(Product, { path: 'reviews' });
exports.createProduct = factory.createOne(Product);
exports.updateProduct = factory.updateOne(Product);
exports.deleteProduct = factory.deleteOne(Product);

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
    data: { product },
  });
});
