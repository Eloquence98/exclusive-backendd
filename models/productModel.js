const mongoose = require('mongoose');
const slugify = require('slugify');

const productSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'A product must have a title'],
      unique: true,
      trim: true,
    },
    description: {
      type: String,
      required: [true, 'A product must have a description'],
    },
    price: {
      type: Number,
      required: [true, 'A product must have a price'],
      min: [0, 'Price must be >= 0'],
    },
    salePrice: {
      type: Number,
      validate: {
        validator: function (val) {
          return !this.onSale || val < this.price;
        },
        message: 'Sale price must be less than original price',
      },
    },
    onSale: {
      type: Boolean,
      default: false,
    },
    saleStartDate: {
      type: Date,
      validate: {
        validator: function (val) {
          if (!this.onSale || !this.saleEndDate) return true;
          return val < this.saleEndDate;
        },
        message: 'Sale start date must be before end date',
      },
    },
    saleEndDate: {
      type: Date,
      validate: {
        validator: function (val) {
          if (!this.onSale || !this.saleStartDate) return true;
          return val > this.saleStartDate;
        },
        message: 'Sale end date must be after start date',
      },
    },
    discount: {
      type: Number,
      default: 0,
      min: [0, 'Min discount is 0'],
      max: [100, 'Max discount is 100'],
    },
    stock: {
      type: Number,
      required: [true, 'Stock must be defined'],
      min: [0, 'Stock cannot be negative'],
    },
    imageCover: {
      type: String,
      required: [true, 'A product must have a cover image'],
    },
    images: [String],
    createdAt: {
      type: Date,
      default: Date.now,
    },
    category: {
      type: String,
      required: true,
      enum: {
        values: [
          't-shirts',
          'shirts',
          'polos',
          'jeans',
          'shorts',
          'trousers',
          'activewear',
          'fragrances',
          'shoes',
          'underwear',
        ],
        message: 'Invalid category',
      },
    },
    size: {
      type: String,
      enum: {
        values: ['S', 'M', 'L', 'XL', 'XXL', 'XXXL', '4XL', '5XL', '6XL'],
        message: 'Invalid size',
      },
      required: [
        function () {
          return [
            't-shirts',
            'shirts',
            'polos',
            'jeans',
            'shorts',
            'trousers',
            'activewear',
            'underwear',
          ].includes(this.category);
        },
        'Size required for this category',
      ],
    },
    brand: String,
    tags: [String],
    isFeatured: {
      type: Boolean,
      default: false,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
    slug: {
      type: String,
    },
    ratingsAverage: {
      type: Number,
      default: 4.5,
      min: 1,
      max: 5,
      set: (val) => Math.round(val * 10) / 10,
    },
    ratingsQuantity: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true, versionKey: false },
    toObject: { virtuals: true, versionKey: false },
  },
);

// Indexes
productSchema.index({ price: 1, discount: -1 });
productSchema.index({ slug: 1 });

// Virtuals
productSchema.virtual('currentPrice').get(function () {
  const now = new Date();
  if (!this.onSale || now < this.saleStartDate || now > this.saleEndDate)
    return this.price;
  return this.salePrice;
});

productSchema.virtual('discountPercentage').get(function () {
  if (!this.onSale || !this.salePrice) return 0;
  return Math.round(((this.price - this.salePrice) / this.price) * 1000) / 10;
});

productSchema.virtual('saleStatus').get(function () {
  const now = new Date();
  if (!this.onSale) return 'NOT_ON_SALE';
  if (!this.saleStartDate || !this.saleEndDate) return 'NO_DATES';
  if (now < this.saleStartDate) return 'SCHEDULED';
  if (now > this.saleEndDate) return 'ENDED';
  return 'ACTIVE';
});

// Virtual populate for reviews
productSchema.virtual('reviews', {
  ref: 'Review',
  foreignField: 'product',
  localField: '_id',
});

// Middleware
productSchema.pre('save', function (next) {
  this.slug = slugify(this.title, { lower: true });
  next();
});

productSchema.pre('save', function (next) {
  if (!this.onSale) {
    this.salePrice = undefined;
    this.saleStartDate = undefined;
    this.saleEndDate = undefined;
  }
  next();
});

productSchema.pre(/^find/, function (next) {
  this.find({ isDeleted: { $ne: true } });
  next();
});

// Static method: Expire outdated sales
productSchema.statics.expireSales = async function () {
  const now = new Date();
  await this.updateMany(
    { onSale: true, saleEndDate: { $lt: now } },
    {
      $set: {
        onSale: false,
        salePrice: undefined,
        saleStartDate: undefined,
        saleEndDate: undefined,
      },
    },
  );
};

const Product = mongoose.model('Product', productSchema);
module.exports = Product;
