const Product = require('../models/productModel');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const { logger } = require('../utils/logger');

/**
 * AUTOCOMPLETE / SUGGESTIONS
 * GET /api/v1/search/suggest?q=tsh
 *
 * Purpose: Fast, lightweight product suggestions for search autocomplete.
 * Returns: Up to 8 matching products with basic display fields.
 * Searches: title, brand, category, and tags using Atlas Search autocomplete.
 * Filters: Only active and non-deleted products are returned.
 */
exports.getProductSuggestions = catchAsync(async (req, res, next) => {
  logger.info(
    `getProductSuggestions hit | url=${req.originalUrl} | query=${JSON.stringify(req.query)}`,
  );

  const q = (req.query.q || '').trim();

  if (!q) {
    return next(new AppError('Search query is required', 400));
  }

  const suggestions = await Product.aggregate([
    {
      $search: {
        index: 'default',
        compound: {
          should: [
            {
              autocomplete: {
                query: q,
                path: 'title',
                fuzzy: {
                  maxEdits: 1,
                  prefixLength: 2,
                },
              },
            },
            {
              autocomplete: {
                query: q,
                path: 'brand',
                fuzzy: {
                  maxEdits: 1,
                  prefixLength: 2,
                },
              },
            },
            {
              autocomplete: {
                query: q,
                path: 'category',
                fuzzy: {
                  maxEdits: 1,
                  prefixLength: 2,
                },
              },
            },
            {
              autocomplete: {
                query: q,
                path: 'tags',
                fuzzy: {
                  maxEdits: 1,
                  prefixLength: 2,
                },
              },
            },
          ],
          filter: [
            {
              equals: {
                path: 'isActive',
                value: true,
              },
            },
            {
              equals: {
                path: 'isDeleted',
                value: false,
              },
            },
          ],
          minimumShouldMatch: 1,
        },
      },
    },
    {
      $limit: 8,
    },
    {
      $project: {
        _id: 0,
        id: '$_id',
        title: 1,
        slug: 1,
        imageCover: 1,
        brand: 1,
        category: 1,
        price: 1,
        salePrice: 1,
        onSale: 1,
      },
    },
  ]);

  res.status(200).json({
    status: 'success',
    results: suggestions.length,
    data: suggestions,
  });
});

/**
 * FULL PRODUCT SEARCH
 * GET /api/v1/search?q=Casual
 *
 * Purpose: Full product search results.
 * Returns: Search-ranked products with filtering, pagination, and sorting support.
 * Uses: Atlas Search text search with relevance scoring.
 */
exports.searchProducts = catchAsync(async (req, res, next) => {
  logger.info(
    `searchProducts hit | url=${req.originalUrl} | query=${JSON.stringify(req.query)}`,
  );

  const q = (req.query.q || '').trim();

  if (!q || q.length < 2) {
    return next(
      new AppError('Search query must be at least 2 characters', 400),
    );
  }

  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 100);

  const skip = (page - 1) * limit;

  const pipeline = [
    {
      $search: {
        index: 'default',
        compound: {
          must: [
            {
              text: {
                query: q,
                path: ['title', 'description', 'brand', 'category', 'tags'],
                fuzzy: {
                  maxEdits: 1,
                  prefixLength: 2,
                },
              },
            },
          ],
          should: [
            {
              text: {
                query: q,
                path: 'title',
                score: {
                  boost: {
                    value: 5,
                  },
                },
              },
            },
            {
              text: {
                query: q,
                path: 'brand',
                score: {
                  boost: {
                    value: 3,
                  },
                },
              },
            },
            {
              text: {
                query: q,
                path: 'category',
                score: {
                  boost: {
                    value: 2,
                  },
                },
              },
            },
            {
              text: {
                query: q,
                path: 'tags',
                score: {
                  boost: {
                    value: 2,
                  },
                },
              },
            },
          ],
          filter: [
            {
              equals: {
                path: 'isActive',
                value: true,
              },
            },
            {
              equals: {
                path: 'isDeleted',
                value: false,
              },
            },
          ],
        },
      },
    },
  ];

  // Optional filters
  const filterStage = {};

  if (req.query.category) {
    filterStage.category = req.query.category;
  }

  if (req.query.brand) {
    filterStage.brand = req.query.brand;
  }

  if (req.query.onSale === 'true') {
    filterStage.onSale = true;
  }

  if (req.query.minPrice || req.query.maxPrice) {
    filterStage.price = {};

    if (req.query.minPrice) {
      filterStage.price.$gte = Number(req.query.minPrice);
    }

    if (req.query.maxPrice) {
      filterStage.price.$lte = Number(req.query.maxPrice);
    }
  }

  if (Object.keys(filterStage).length > 0) {
    pipeline.push({
      $match: filterStage,
    });
  }

  pipeline.push(
    {
      $addFields: {
        score: {
          $meta: 'searchScore',
        },
      },
    },
    {
      $sort: {
        score: -1,
        isFeatured: -1,
        ratingsAverage: -1,
        createdAt: -1,
      },
    },
    {
      $skip: skip,
    },
    {
      $limit: limit,
    },
    {
      $project: {
        _id: 0,
        id: '$_id',
        title: 1,
        slug: 1,
        description: 1,
        price: 1,
        salePrice: 1,
        onSale: 1,
        discount: 1,
        stock: 1,
        imageCover: 1,
        brand: 1,
        category: 1,
        tags: 1,
        isFeatured: 1,
        ratingsAverage: 1,
        ratingsQuantity: 1,
      },
    },
  );

  const products = await Product.aggregate(pipeline);

  res.status(200).json({
    status: 'success',
    results: products.length,
    meta: {
      pagination: {
        page,
        limit,
      },
    },
    data: products,
  });
});
