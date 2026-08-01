# System Patterns: Exclusive Backend

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Client (Frontend)                        │
└──────────────────────────────┬──────────────────────────────┘
                               │ HTTP / JSON
┌──────────────────────────────▼──────────────────────────────┐
│                       Express App (app.js)                   │
│  Global Middleware:                                          │
│  • CORS → Static → Helmet → Morgan → RateLimit → BodyParser  │
│  • CookieParser → MongoSanitize → XSS-Sanitize → HPP          │
│  • Request Timestamp                                          │
├──────────────────────────────────────────────────────────────┤
│  Routes (/api/v1)                                            │
│  products / search / orders / users / reviews                │
├──────────────────────────────────────────────────────────────┤
│  Controllers                                                 │
│  authController / userController / productController         │
│  orderController / reviewController / searchController       │
│  handlerFactory (reusable CRUD)                              │
├──────────────────────────────────────────────────────────────┤
│  Models (Mongoose)                                           │
│  User / Product / Order / Review / Counter                   │
├──────────────────────────────────────────────────────────────┤
│  Utilities                                                   │
│  apiFeatures / appError / catchAsync / email / logger        │
├──────────────────────────────────────────────────────────────┤
│  Background Jobs (node-cron)                                 │
│  orderProcessing (every min) / saleCleanup (daily midnight)  │
└──────────────────────────────┬──────────────────────────────┘
                               │
┌──────────────────────────────▼──────────────────────────────┐
│                    MongoDB (Replica Set)                     │
│          Required for Atlas Search capabilities              │
└─────────────────────────────────────────────────────────────┘
```

## Request Flow

1. Request enters Express app
2. Global middleware stack processes request (security, parsing, sanitization)
3. Route matching under `/api/v1/*`
4. Controller handlers (often via factory or auth middleware chains) execute
5. Mongoose model queries MongoDB
6. Response formatted as JSON `{ status, data, meta? }`
7. Errors propagate to central error handler → env-aware response

## Key Design Patterns

### 1. Factory Pattern (handlerFactory.js)

Reusable CRUD handlers parameterized by Model:

- `createOne(Model)` → POST
- `getOne(Model, popOptions)` → GET with optional populate
- `getAll(Model)` → GET with APIFeatures + pagination meta
- `updateOne(Model)` → PATCH with validators
- `deleteOne(Model)` → DELETE → 204

Nested route support: `getAll` checks `req.params.productId` for review filtering.

### 2. Alias Route Middleware Pattern

Controllers export middleware that mutate `req.query` before hitting factory handlers:

- `aliasTopRated` → `limit=5, sort=-ratingsAverage,price`
- `aliasTrending` → `limit=5, sort=-ratingsQuantity,-ratingsAverage`
- `aliasFeatured` → `isFeatured=true, limit=8`
- `aliasRecentOrders` → `limit=5, sort=-createdAt`
- `aliasDefaultFields` → restricts response fields

Bundled with a centralized `PRODUCT_SUMMARY_FIELDS` for performance.

### 3. APIFeatures Pattern

Query builder class chain:

```js
new APIFeatures(Model.find(filter), req.query)
  .filter() // gte/lte/gt/lt/ne operators, field equality
  .sort() // comma-separated fields
  .limitFields() // field projection
  .paginate(); // page/limit with skip
```

Returns `(docs, totalDocuments, paginationMeta)` via Promise.all with `countDocuments`.

### 4. Auth Middleware Chain

- `protect` — extracts Bearer token or JWT cookie, verifies, loads user, checks password-changed
- `protectOptional` — runs protect only if token present; otherwise continues as guest
- `restrictTo(...roles)` — role-based gate after protect
- `isLoggedIn` — non-blocking check for rendered pages (sets `res.locals.user`)
- Route-level composition: `protect → restrictTo('admin')` guards admin endpoints

### 5. Error Handling Strategy

- `AppError` class marks operational errors (`isOperational = true`)
- `catchAsync` wraps async controllers, forwards rejections to `next`
- Global error handler:
  - Dev: full error + stack returned to API clients
  - Prod: converts Mongoose errors (CastError, duplicate key 11000, ValidationError) and JWT errors (invalid/expired) to friendly messages; hides internal details for non-operational errors
- 404 handler returns JSON for unknown routes

### 6. Transactional Operations

Order creation uses MongoDB sessions:

```
startSession → startTransaction → validate products
→ decrement stock → create order → generate access token
→ commitTransaction → send email (outside transaction)
abortTransaction on any failure → finally endSession
```

Cancellation also transactional: restore stock + update status atomically.

### 7. Model Pre/Post Hooks

- **User**: hash password on save (bcrypt 12 rounds), set passwordChangedAt, filter inactive users on find, guest→registered conversion via static with transaction
- **Product**: slugify title on save, clear sale fields when onSale=false, soft-delete filter on queries, `expireSales` static for cron
- **Order**: auto status history on create/status-change, remove access token when delivered/cancelled, `autoProgressStatus` static for cron
- **Review**: auto-populate user info on find, aggregate + update Product ratings on save/findOneAnd
- **Counter**: `getNextSequence(prefix, date)` static for order numbers

### 8. Background Jobs (node-cron)

- `saleCleanup` — daily at 00:00 UTC, calls `Product.expireSales()` to disable expired sales
- `orderProcessing` — every minute, calls `Order.autoProgressStatus()`:
  - processing → confirmed (after 1 min)
  - confirmed → shipped (after 6 min)
  - shipped → delivered (after 24 min) + sets COD payment to paid
- Jobs reference `activeJobs` object for graceful shutdown in server.js

### 9. Email Service Pattern

`Email` class (utils/email.js):

- Constructor takes user + URL
- Renders pug templates from `views/email/`
- Production: Brevo transactional API (`@getbrevo/brevo`)
- Development: Mailtrap SMTP via nodemailer
- `html-to-text` converts HTML for text content
- Template methods: `sendWelcome`, `sendPasswordReset`, `sendOrderConfirmation`, `sendOrderStatusUpdate`

### 10. Search Architecture (Atlas Search)

Two endpoints in searchController:

- `/search/suggest?q=` — autocomplete operator, top 8 results, lightweight fields (lightning-fast suggestions)
- `/search?q=` — compound: autocomplete + text operators with boost scoring (title 10, brand 6, category 4, tags 3), filters (category, brand, onSale, price range), pagination, relevance sorting

Requires: MongoDB replica set + Atlas Search index named `default` on products.

## Component Relationships

### Route → Controller → Model Dependencies

| Route File    | Controller                      | Model(s)                 | Auth Level                                                                                      |
| ------------- | ------------------------------- | ------------------------ | ----------------------------------------------------------------------------------------------- |
| userRoutes    | authController + userController | User                     | Public (signup/login/google/forgot/reset), Protected (me/updateMe/deleteMe), Admin (user CRUD)  |
| productRoutes | productController               | Product, Review (nested) | Public (list/get/search/stats/category), Admin (create/update/delete/admin stats)               |
| orderRoutes   | orderController                 | Order, Product, Counter  | Public (track/confirm), Guest+Auth (create), Protected (my-orders/cancel), Admin (manage/stats) |
| reviewRoutes  | reviewController                | Review                   | Protected (all), User (create), User+Admin (update/delete)                                      |
| searchRoutes  | searchController                | Product                  | Public                                                                                          |

### Model Cross-References

- **Review** → Product (product ref, calculates ratings quantity/avg on Product)
- **Order** → User (owner), Product (snapshot products w/ priceAtPurchase), Counter (order number sequence)
- **User** ← Order (user ref), Review (user ref)
- **Product** → Review (virtual populate for detail views)

## Critical Implementation Paths

1. **Order creation**: `POST /api/v1/orders` → `protectOptional` (auth or guest) → `createGuestUser` (create guest if no auth) → `createOrder` (transaction: validate products, check stock, gen order number, decrement stock, create order, generate tracking token, commit) → email outside transaction → respond with orderNumber + accessToken

2. **Signup with guest conversion**: `POST /api/v1/users/signup` → check existing OAuth user → try `convertGuestToUser` (transaction in model static) → fallback to new User.create → send welcome email → JWT response

3. **Google login**: `POST /api/v1/users/google` → verify idToken → find by authIdentities → if not found, find by email (attach identity) or create new → JWT response

4. **Order tracking**: `GET /:orderNumber/tracking?token=...` (hash token, match) or `?email=...` (populate user with email match) → strip internal fields → clean response

5. **Product listing**: `GET /api/v1/products` → `aliasProductSummary` → `factory.getAll(Product)` with APIFeatures → paginated JSON with meta

6. **Search**: `GET /api/v1/search?q=...` → validate q ≥ 2 chars → Atlas Search compound pipeline → sort by relevance → paginate → project fields
