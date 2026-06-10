const mongoose = require('mongoose');
const Order = require('../models/orderModel');
const Product = require('../models/productModel');
const catchAsync = require('../utils/catchAsync');
const factory = require('./handlerFactory');
const AppError = require('../utils/appError');
const APIFeatures = require('../utils/apiFeatures');
const Email = require('../utils/email');
const { logger } = require('../utils/logger');

// Alias Routes Middleware
exports.aliasDefaultFields = (req, res, next) => {
  req.query.fields =
    'orderNumber,orderStatus,totalAmount,products.name,products.quantity,createdAt';
  next();
};

exports.aliasRecentOrders = (req, res, next) => {
  req.query.limit = '5';
  req.query.sort = '-createdAt';
  req.query.fields = 'orderNumber,totalAmount,orderStatus,createdAt';
  next();
};

exports.aliasPendingOrders = (req, res, next) => {
  req.query.orderStatus = 'processing';
  req.query.sort = '-createdAt';
  next();
};

exports.aliasTrackOrder = (req, res, next) => {
  req.query.fields =
    'orderNumber,orderStatus,statusHistory.status,statusHistory.timestamp,statusHistory.note,shippingAddress.name';
  next();
};

// Utility Functions
const calculateOrderAmounts = (products) => {
  const subtotal = products.reduce(
    (sum, item) => sum + item.priceAtPurchase * item.quantity,
    0,
  );
  const shippingCost = 0; // Default shipping cost, can be modified based on business logic
  return {
    subtotal,
    shippingCost,
    totalAmount: subtotal + shippingCost,
  };
};

const validateAndGetProducts = async (products) => {
  const validatedProducts = await Promise.all(
    products.map(async (item) => {
      const product = await Product.findById(item.product);
      if (!product) {
        throw new AppError(`Product not found with ID: ${item.product}`, 404);
      }
      if (product.stock < item.quantity) {
        throw new AppError(
          `Insufficient stock for product ${product.title}`,
          400,
        );
      }
      return {
        product: product._id,
        quantity: item.quantity,
        priceAtPurchase: product.currentPrice || product.price,
        name: product.title,
        imageUrl: product.imageCover,
      };
    }),
  );
  return validatedProducts;
};

// Create order
exports.createOrder = catchAsync(async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // 1) Ensure we have a user
    if (!req.user) {
      await session.abortTransaction();
      return next(new AppError('User information is required', 400));
    }

    // 2) Validate and get product details
    const products = await validateAndGetProducts(req.body.products);

    // 3) Calculate amounts
    const { subtotal, shippingCost, totalAmount } =
      calculateOrderAmounts(products);

    // 4) Reduce stock atomically
    await Promise.all(
      products.map(async (item) => {
        const product = await Product.findById(item.product).session(session);

        if (product.stock < item.quantity) {
          throw new AppError(
            `Insufficient stock for ${product.title}. Only ${product.stock} available.`,
            400,
          );
        }

        return Product.findByIdAndUpdate(
          item.product,
          { $inc: { stock: -item.quantity } },
          { new: true, session },
        );
      }),
    );

    // 5) Create order
    const [order] = await Order.create(
      [
        {
          user: req.user._id,
          products,
          subtotal,
          shippingCost,
          totalAmount,
          shippingAddress: req.body.shippingAddress,
          paymentMethod: 'cash_on_delivery',
          paymentStatus: 'pending',
        },
      ],
      { session },
    );

    // 6) Commit transaction
    await session.commitTransaction();

    // 7) Send email (outside transaction to avoid rollback on email failure)
    try {
      const url = `${process.env.FRONTEND_URL}/orders/${order.orderNumber}`;
      await new Email(req.user, url).sendOrderConfirmation(order);
      logger.info('Order confirmation email sent', {
        orderId: order._id,
        email: req.user.email,
      });
    } catch (emailErr) {
      logger.error('Email failed but order succeeded:', emailErr);
      // Don't fail the order if email fails
    }

    // 8) Send response
    res.status(201).json({
      status: 'success',
      data: {
        orderNumber: order.orderNumber,
        totalAmount: order.totalAmount,
        orderStatus: order.orderStatus,
        createdAt: order.createdAt,
      },
    });
  } catch (error) {
    await session.abortTransaction();
    return next(error);
  } finally {
    session.endSession();
  }
});

// Statistics Controllers
exports.getOrderStats = catchAsync(async (req, res, next) => {
  const stats = await Order.aggregate([
    {
      $group: {
        _id: '$orderStatus',
        numOrders: { $sum: 1 },
        totalRevenue: { $sum: '$totalAmount' },
        avgOrderValue: { $avg: '$totalAmount' },
        minOrder: { $min: '$totalAmount' },
        maxOrder: { $max: '$totalAmount' },
      },
    },
    {
      $sort: { numOrders: -1 },
    },
  ]);

  res.status(200).json({
    status: 'success',
    data: { stats },
  });
});

exports.getMonthlyStats = catchAsync(async (req, res, next) => {
  const year = req.params.year * 1;
  const stats = await Order.aggregate([
    {
      $match: {
        createdAt: {
          $gte: new Date(`${year}-01-01`),
          $lte: new Date(`${year}-12-31`),
        },
      },
    },
    {
      $group: {
        _id: { $month: '$createdAt' },
        numOrders: { $sum: 1 },
        totalRevenue: { $sum: '$totalAmount' },
        orders: { $push: '$orderNumber' },
      },
    },
    {
      $addFields: { month: '$_id' },
    },
    {
      $project: { _id: 0 },
    },
    {
      $sort: { month: 1 },
    },
  ]);

  res.status(200).json({
    status: 'success',
    data: { stats },
  });
});

// Get orders for current user
exports.getMyOrders = catchAsync(async (req, res, next) => {
  const features = new APIFeatures(Order.find({ user: req.user.id }), req.query)
    .filter()
    .sort()
    .limitFields()
    .paginate();

  const orders = await features.query;

  res.status(200).json({
    status: 'success',
    results: orders.length,
    data: {
      orders,
    },
  });
});

// Track order status
exports.trackOrder = catchAsync(async (req, res, next) => {
  const { orderNumber } = req.params;

  const features = new APIFeatures(
    Order.findOne({ orderNumber }),
    req.query,
  ).limitFields();

  const order = await features.query.lean();

  if (!order) {
    return next(new AppError('No order found with that tracking number', 404));
  }

  // Clean up any _id or id if they appear in nested objects (just in case)
  delete order._id;
  delete order.id;

  if (order.statusHistory) {
    order.statusHistory = order.statusHistory.map(
      ({ status, timestamp, note }) => ({
        status,
        timestamp,
        note,
      }),
    );
  }

  res.status(200).json({
    status: 'success',
    data: order,
  });
});

// Use factory functions for standard CRUD operations
exports.getAllOrders = factory.getAll(Order);
exports.getOrder = factory.getOne(Order);
exports.updateOrder = factory.updateOne(Order);
exports.deleteOrder = factory.deleteOne(Order);
