# Active Context: Exclusive Backend

## Current Work Focus

Initializing the memory bank for the Exclusive Backend project. This documents the current state of the project for future sessions.

## Recent Changes

- Memory bank initialization (current task)
- Project is at commit 11e4a9f (latest)

## Project Structure

```
exclusive-backendd/
├── app.js                    # Express app setup, global middleware, route mounting
├── server.js                 # Entry point: DB connection, cron jobs, graceful shutdown
├── config/
│   └── brevo.js              # Brevo email client (transactional emails)
├── controllers/
│   ├── authController.js     # JWT auth, Google OAuth, password reset, protect/restrictTo
│   ├── errorController.js    # Centralized error handling (dev/prod)
│   ├── handlerFactory.js     # Reusable CRUD factory (createOne, getOne, getAll, updateOne, deleteOne)
│   ├── orderController.js    # Order creation, stats, tracking, cancellation, status updates
│   ├── productController.js  # Product CRUD, image upload/resize, stats, aliases
│   ├── reviewController.js   # Review CRUD with product/user ID middleware
│   ├── searchController.js   # Atlas Search autocomplete + full-text search
│   └── userController.js     # User profile, photo upload, guest creation, guest→user conversion
├── lib/
│   └── cornJobs/
│       ├── orderProcessing.js  # Auto-progress order statuses (every minute)
│       └── saleCleanup.js      # Expire sales at midnight UTC daily
├── models/
│   ├── counterModel.js       # Auto-increment counter for order numbers
│   ├── orderModel.js         # Orders with status history, access tokens, autoProgressStatus
│   ├── productModel.js       # Products with sale logic, text indexes, virtuals
│   ├── reviewModel.js        # Reviews with rating aggregation
│   └── userModel.js          # Users with roles, auth identities, guest support
├── routes/
│   ├── orderRoutes.js        # Order endpoints (public/protected/admin)
│   ├── productRoutes.js      # Product endpoints + nested review routes
│   ├── reviewRoutes.js       # Review endpoints
│   ├── searchRoutes.js       # Search + suggestions endpoints
│   └── userRoutes.js         # Auth + user endpoints
├── utils/
│   ├── apiFeatures.js        # Filtering, sorting, field limiting, pagination
│   ├── appError.js           # Operational error class
│   ├── catchAsync.js         # Async error wrapper
│   ├── email.js              # Email service (Brevo prod, Mailtrap dev)
│   └── logger.js             # Winston logger with file/console transports
├── dev-data/
│   └── data/                 # Seed data and import scripts
├── views/
│   └── email/                # Pug email templates
├── public/
│   └── img/                  # Uploaded images (products, users)
├── Dockerfile                # Multi-stage: dev → build → prod
├── docker-compose.yml        # API + MongoDB (replica set for Atlas Search)
└── package.json              # Scripts: dev, build, start:prod, docker:prod
```

## Key Decisions & Patterns

1. **Factory pattern for controllers** - `handlerFactory.js` exports reusable CRUD handlers parameterized by Mongoose Model, reducing boilerplate across controllers.

2. **APIFeatures class** - Encapsulates query string parsing for filtering (`gt/gte/lt/lte/ne`), sorting, field selection, and pagination.

3. **Guest checkout flow**:

   - `createGuestUser` middleware creates a guest User if no auth token
   - Guest users have `isGuest: true` and no password
   - `convertGuestToUser` (static method) converts guest to registered on signup
   - Signup flow first tries conversion, falls back to new user creation

4. **Google OAuth via authIdentities** - Users store `[{ provider, providerAccountId }]` array. Google login either creates a new user, attaches Google identity to existing email, or logs in existing Google user.

5. **Order tracking security**:

   - `orderAccessTokenHash` (SHA-256 hash) stored on order
   - Tracking token sent via email link
   - Token removed once order is delivered/cancelled
   - Alternative: email verification on order number

6. **Order number generation**: Counter collection with daily prefix `orders-YYYYMMDD` → `EXC-YYYYMMDD-NNNN`

7. **Transactional order creation**: MongoDB session/transaction for stock decrement + order creation. Email sent after commit (email failures don't roll back the order).

8. **Automatic order status progression**: Cron job every minute uses `autoProgressStatus` static:

   - processing (1 min) → confirmed
   - confirmed (6 min) → shipped
   - shipped (24 min) → delivered
   - Manual admin updates set `statusManuallyUpdated: true` to disable auto-progression

9. **Product soft delete**: `isDeleted` flag filters queries; hard delete for admins via factory.

10. **Atlas Search**: Requires MongoDB replica set (docker-compose uses `mongod --replSet rs0`). Search index named `default` needed on products collection.

11. **Environment-aware error responses**: Dev returns full error objects + stack; prod returns sanitized messages.

12. **XSS sanitization**: Incoming string body fields sanitized with `sanitize-html` (all tags stripped).

## Current Status

- All core features implemented (auth, products, orders, reviews, search, stats)
- Docker setup for dev (nodemon) and prod (esbuild bundle)
- API routes mounted under `/api/v1`
- Test route available: `POST /test-sanitize` for XSS sanitization testing
- No automated test suite yet
- No payment gateway integration yet

## Next Steps / Known Gaps

- Payment gateway integration (Cash on Delivery is only payment method)
- Automated test suite
- Rate limiting enhancements
- Caching layer
- CI/CD pipeline
- Swagger/OpenAPI documentation (README mentions api.example.http exists)
- `.env` must be configured: MONGODB_URI, JWT_SECRET, JWT_EXPIRES_IN, JWT_COOKIE_EXPIRES_IN, BREVO_API_KEY, EMAIL_HOST/PORT/USERNAME/PASSWORD, EMAIL_FROM, EMAIL_FROM_NAME, FRONTEND_URL, GOOGLE_CLIENT_ID, PORT

## Important Patterns & Preferences

- Code style: Airbnb base ESLint + Prettier (single quotes, semicolons, 2-space indent)
- Response format: `{ status: 'success', results?, meta?, data }`
- Error format: `{ status: 'fail'|'error', message }`
- Routes use versioned prefix `/api/v1`
- Mongoose virtuals: products expose `id` instead of `_id`
- Order route regex: `EXC-\\d{8}-\\d{4}` for order number params
- Product route regex: `[0-9a-fA-F]{24}` validates ObjectId before hitting DB
- Logging via Winston (console + files at logs/combined.log, logs/error.log)

## Learnings & Project Insights

- The `mongo` service in docker-compose runs in replica set mode for Atlas Search support
- `sanitize-html` strips all HTML tags from string body inputs (allowedTags: [], allowedAttributes: {})
- Cron jobs are tracked in `activeJobs` and stopped on graceful shutdown
- `ensureDirectories` creates public/img/products and public/img/users at startup
- SearchController uses both `autocomplete` and `text` operators with boost scoring
- Product summary alias limits fields across all list routes for performance
