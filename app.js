const express = require('express');
const path = require('path');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const sanitizeHtml = require('sanitize-html');
const cors = require('cors');
const hpp = require('hpp');
const { stream } = require('./utils/logger');
const globalErrorHandler = require('./controllers/errorController');
const productRouter = require('./routes/productRoutes');
const searchRoutes = require('./routes/searchRoutes');
const userRouter = require('./routes/userRoutes');
const reviewRouter = require('./routes/reviewRoutes');
const orderRouter = require('./routes/orderRoutes');

const app = express();

// 1) GLOBAL MIDDLEWARES
// Enable CORS - Add this before other middleware
app.use(cors());

// Serve static files from the public directory
app.use(express.static(path.join(__dirname, 'public')));

// Set security HTTP headers
app.use(
  helmet({
    contentSecurityPolicy: {
      useDefaults: true,
      directives: {
        'connect-src': [
          "'self'",
          'http://127.0.0.1:3000',
          'http://localhost:3000',
        ],
        'font-src': ["'self'", 'https://fonts.gstatic.com'],
        'style-src': [
          "'self'",
          "'unsafe-inline'",
          'https://fonts.googleapis.com',
        ],
        'script-src': ["'self'"],
        'frame-src': ["'self'"],
      },
    },
  }),
);

// Logging configuration
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev', { stream }));
} else {
  // Production logging
  app.use(morgan('combined', { stream }));
}

// Limit requests from same API
const limiter = rateLimit({
  max: 1000,
  windowMs: 60 * 60 * 1000, // 1 hour window
  message: 'Too many requests from this IP, please try again in an hour!',
});
app.use('/api', limiter);

// Body parser, reading data from body into req.body
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
app.use(cookieParser());

// Data sanitization against NoSQL query injection
app.use(mongoSanitize());

// Data sanitization against XSS
app.use((req, res, next) => {
  if (req.body) {
    Object.keys(req.body).forEach((key) => {
      if (typeof req.body[key] === 'string') {
        req.body[key] = sanitizeHtml(req.body[key], {
          allowedTags: [],
          allowedAttributes: {},
        });
      }
    });
  }
  next();
});

// Prevent parameter pollution
app.use(
  hpp({
    whitelist: [
      'price',
      'ratingsQuantity',
      'ratingsAverage',
      'stock',
      'discount',
      'category',
      'size',
      'brand',
      'tags',
    ],
  }),
);

// Request timestamp middleware
app.use((req, res, next) => {
  req.requestTime = new Date().toISOString();
  next();
});

// API Routes
app.use('/api/v1/products', productRouter);
app.use('/api/v1/search', searchRoutes);
app.use('/api/v1/orders', orderRouter);
app.use('/api/v1/users', userRouter);
app.use('/api/v1/reviews', reviewRouter);
app.post('/test-sanitize', (req, res) => {
  res.json({ sanitizedInput: req.body });
});

// Handle undefined routes with JSON response
app.all('*', (req, res, next) => {
  res.status(404).json({
    status: 'error',
    message: `Can't find ${req.originalUrl} on this server!`,
    documentation: 'https://api.exclusive.com/docs', // Update with your actual docs URL
  });
});

app.use(globalErrorHandler);

module.exports = app;
