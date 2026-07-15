const mongoose = require('mongoose');
const crypto = require('crypto');

const orderSchema = new mongoose.Schema(
  {
    orderNumber: {
      type: String,
      unique: true,
      required: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    products: [
      {
        product: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Product',
          required: true,
        },
        quantity: { type: Number, required: true, min: 1 },
        priceAtPurchase: { type: Number, required: true },
        name: { type: String, required: true },
        imageUrl: { type: String, required: true },
      },
    ],
    shippingAddress: {
      name: { type: String, required: true },
      phone: { type: String, required: true },
      addressLine1: { type: String, required: true },
      addressLine2: String,
      city: { type: String, required: true },
      zipCode: { type: String, required: true },
      country: { type: String, required: true },
    },
    paymentMethod: {
      type: String,
      enum: ['cash_on_delivery'],
      default: 'cash_on_delivery',
    },
    paymentStatus: {
      type: String,
      enum: ['pending', 'paid', 'failed'],
      default: 'pending',
    },
    subtotal: { type: Number, required: true },
    shippingCost: { type: Number, required: true, default: 0 },
    totalAmount: { type: Number, required: true },
    orderStatus: {
      type: String,
      enum: ['processing', 'confirmed', 'shipped', 'delivered', 'cancelled'],
      default: 'processing',
    },
    statusHistory: [
      {
        status: String,
        timestamp: { type: Date, default: Date.now },
        note: String,
      },
    ],
    trackingNumber: {
      type: String,
      sparse: true,
    },
    statusManuallyUpdated: {
      type: Boolean,
      default: false,
    },
    orderAccessTokenHash: {
      type: String,
      select: false,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true, versionKey: false },
    toObject: { virtuals: true, versionKey: false },
  },
);

orderSchema.methods.generateAccessToken = function () {
  const accessToken = crypto.randomBytes(32).toString('hex');

  this.orderAccessTokenHash = crypto
    .createHash('sha256')
    .update(accessToken)
    .digest('hex');

  return accessToken;
};

// Calculate estimated times for each status
orderSchema.methods.calculateEstimatedTimes = function () {
  const now = new Date();
  const createdAt = this.createdAt || now;

  // Define progression times
  const processingTime = 60 * 1000; // 1 minute
  const shippingTime = 6 * processingTime; // 6 minutes
  const deliveryTime = 24 * processingTime; // 24 minutes

  return {
    confirmedEstimate: new Date(createdAt.getTime() + processingTime),
    shippedEstimate: new Date(
      createdAt.getTime() + processingTime + shippingTime,
    ),
    deliveredEstimate: new Date(
      createdAt.getTime() + processingTime + shippingTime + deliveryTime,
    ),
  };
};

// Add virtual for remaining time in current status
orderSchema.virtual('statusProgress').get(function () {
  if (this.orderStatus === 'delivered' || this.orderStatus === 'cancelled') {
    return { percent: 100, remainingSeconds: 0 };
  }

  const estimates = this.calculateEstimatedTimes();
  const now = new Date();
  let targetDate;
  let startDate;

  switch (this.orderStatus) {
    case 'processing':
      targetDate = estimates.confirmedEstimate;
      startDate = this.createdAt;
      break;
    case 'confirmed':
      targetDate = estimates.shippedEstimate;
      startDate = estimates.confirmedEstimate;
      break;
    case 'shipped':
      targetDate = estimates.deliveredEstimate;
      startDate = estimates.shippedEstimate;
      break;
    default:
      return { percent: 0, remainingSeconds: 0 };
  }

  const total = targetDate - startDate;
  const elapsed = now - startDate;
  const percent = Math.min(100, Math.max(0, (elapsed / total) * 100));
  const remainingSeconds = Math.max(0, Math.ceil((targetDate - now) / 1000));

  return { percent, remainingSeconds };
});

// Static method for auto-progressing order statuses
orderSchema.statics.autoProgressStatus = async function () {
  const processingTime = 60 * 1000; // 1 minute
  const shippingTime = 6 * processingTime; // 6 minutes
  const deliveryTime = 24 * processingTime; // 24 minutes

  // Find orders eligible for status update
  const [processingOrders, confirmedOrders, shippedOrders] = await Promise.all([
    this.find({
      orderStatus: 'processing',
      createdAt: { $lte: new Date(Date.now() - processingTime) },
      statusManuallyUpdated: false,
    }),
    this.find({
      orderStatus: 'confirmed',
      updatedAt: { $lte: new Date(Date.now() - shippingTime) },
      statusManuallyUpdated: false,
    }),
    this.find({
      orderStatus: 'shipped',
      updatedAt: { $lte: new Date(Date.now() - deliveryTime) },
      statusManuallyUpdated: false,
    }),
  ]);

  // Update orders with proper status history
  const processingUpdates = await Promise.all(
    processingOrders.map((order) => {
      order.orderStatus = 'confirmed';
      return order.save();
    }),
  );

  const confirmedUpdates = await Promise.all(
    confirmedOrders.map((order) => {
      order.orderStatus = 'shipped';
      return order.save();
    }),
  );

  const shippedUpdates = await Promise.all(
    shippedOrders.map((order) => {
      order.orderStatus = 'delivered';
      if (order.paymentMethod === 'cash_on_delivery') {
        order.paymentStatus = 'paid';
      }
      return order.save();
    }),
  );

  // Return simple count structure
  return {
    processing: processingUpdates.length,
    confirmed: confirmedUpdates.length,
    shipped: shippedUpdates.length,
  };
};

// Status history tracking
orderSchema.pre('save', function (next) {
  if (this.isNew) {
    this.statusHistory.push({
      status: this.orderStatus,
      note: 'Order placed',
    });
  } else if (this.isModified('orderStatus') && !this.isNew) {
    this.statusHistory.push({
      status: this.orderStatus,
      note: this.statusManuallyUpdated
        ? 'Admin manually updated'
        : `System: Auto-updated to ${this.orderStatus}`,
    });
  }
  next();
});

// Logging
orderSchema.post('save', function () {
  if (this.isModified('orderStatus')) {
    // eslint-disable-next-line no-console
    console.log(`[Order ${this._id}] Status → ${this.orderStatus}`);
  }
});

// remove access token once order is done
orderSchema.pre('save', function (next) {
  if (
    this.isModified('orderStatus') &&
    ['delivered', 'cancelled'].includes(this.orderStatus)
  ) {
    this.orderAccessTokenHash = undefined;
  }
  next();
});

// Indexes
orderSchema.index({ orderStatus: 1, createdAt: 1 });
orderSchema.index({ orderStatus: 1, updatedAt: 1 });

const Order = mongoose.model('Order', orderSchema);

module.exports = Order;
