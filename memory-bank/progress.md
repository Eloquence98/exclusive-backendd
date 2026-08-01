# Progress: Exclusive Backend

## What Works

### Authentication & User Management

- ✅ Email/password signup with bcrypt password hashing
- ✅ Login with JWT (Bearer token + httpOnly cookie)
- ✅ Google OAuth login (ID token verification via google-auth-library)
- ✅ Guest checkout (guest user creation, `isGuest` flag, no password required)
- ✅ Guest → registered user conversion (on signup with same email; static method with transaction)
- ✅ Password reset flow (token via email, 10-min expiry, SHA-256 hashed)
- ✅ Password change (requires current password)
- ✅ Profile updates (name, email, photo upload with Sharp resizing)
- ✅ Account deletion (soft delete via `active: false`)
- ✅ Role-based access control (`user` / `admin`)
- ✅ JWT protection middleware (`protect`, `protectOptional`, `restrictTo`, `isLoggedIn`)
- ✅ Google-only account guards (blocks password login/reset/update for OAuth-only users)

### Product Management

- ✅ Full CRUD via factory handlers (admin-gated create/update/delete)
- ✅ 10 categories: t-shirts, shirts, polos, jeans, shorts, trousers, activewear, fragrances, shoes, underwear
- ✅ Size enum: S–6XL (required for apparel categories)
- ✅ Product image upload (cover + up to 3 images) with Sharp resizing (2000×1333, JPEG, quality 90)
- ✅ Slug-based product URLs (`getProductBySlug`)
- ✅ Sale mechanics: `onSale`, `salePrice`, `saleStartDate`, `saleEndDate`, `discount`
- ✅ Price virtuals: `currentPrice`, `discountPercentage`, `saleStatus`
- ✅ Featured / trending / top-rated / category listing aliases
- ✅ Soft delete (`isDeleted`) + hard delete for admins
- ✅ Text index on title, description, brand, category, tags
- ✅ Stats: public (price range, categories, brands, sizes, total count) + admin (product stats, sales stats, inventory stats, category stats)
- ✅ Stock tracking with atomic decrement on order creation

### Orders

- ✅ Order creation (transactional: validates products, checks stock, decrements stock, creates order)
- ✅ Unique order numbers `EXC-YYYYMMDD-NNNN` via Counter collection
- ✅ Order tracking: SHA-256 access token (email link) or order number + email verification
- ✅ Order confirmation route (`/confirmation` with token)
- ✅ Status auto-progression cron: processing → confirmed → shipped → delivered
- ✅ Manual status updates by admin with email notification
- ✅ Cancellation (only for processing/confirmed, restores stock, transactional)
- ✅ Order history for logged-in users (`/my-orders`, `/recent`)
- ✅ Admin order management (list with field defaults, get, update, delete)
- ✅ Status history tracking (timestamps + notes)
- ✅ Order stats (grouped by status: revenue, avg/min/max order value)
- ✅ Monthly stats per year (orders, revenue, order numbers)
- ✅ Cash on Delivery payment method only (paymentStatus: pending → paid on delivery)
- ✅ Email: order confirmation + status updates (via Brevo/Mailtrap)

### Reviews

- ✅ Full CRUD (factory-based)
- ✅ Nested route `/products/:productId/reviews`
- ✅ Prevents duplicate review per user per product (compound unique index)
- ✅ Auto-populates user name/photo
- ✅ Calculates and updates Product ratings (`ratingsQuantity`, `ratingsAverage`) on save and findOneAnd

### Search

- ✅ Autocomplete suggestions (`/api/v1/search/suggest?q=`): Atlas Search autocomplete, top 8, lightweight fields
- ✅ Full-text search (`/api/v1/search?q=`): compound autocomplete + text with boost scoring (title 10, brand 6, category 4, tags 3)
- ✅ Filters: category, brand, onSale, price range (min/max)
- ✅ Relevance sorting (searchScore, isFeatured, ratingsAverage, createdAt)
- ✅ Pagination (page/limit)

### API Infrastructure

- ✅ Versioned routes `/api/v1`
- ✅ APIFeatures: filtering (`gte/lte/gt/lt/ne`), sorting, field limiting, pagination
- ✅ Reusable CRUD factory
- ✅ Centralized error handling (dev vs prod responses)
- ✅ 404 JSON handler for unknown routes
- ✅ Global middlewares: CORS, Helmet, rate limiting (1000/hr/IP), JSON/urlencoded parsing, cookie parsing, mongo-sanitize, XSS sanitize-html, HPP
- ✅ Morgan request logging → Winston
- ✅ Test route `POST /test-sanitize` for XSS verification

### Background Jobs

- ✅ Sale cleanup (daily midnight UTC) — expires sales past `saleEndDate`
- ✅ Order auto-progression (every minute) — advances eligible orders, disabled in test env

### Email

- ✅ Pug templates: welcome, passwordReset, orderConfirmation, orderStatusUpdate
- ✅ Brevo transactional API (production) + Mailtrap SMTP (development)
- ✅ `html-to-text` for plain text versions

### DevOps

- ✅ Multi-stage Dockerfile (dev / build / prod)
- ✅ docker-compose with MongoDB replica set (for Atlas Search + transactions)
- ✅ Production esbuild bundling with email template copying
- ✅ Graceful shutdown (stops cron jobs, closes server + DB, handles SIGTERM/SIGINT, uncaughtException, unhandledRejection)
- ✅ Auto-create upload directories at startup

## What's Left to Build

### Planned / Documented (from README "Future Improvements")

- ❌ Payment gateway integration (currently only Cash on Delivery)
- ❌ API documentation with Swagger/OpenAPI (only `API-DOCUMENTATION.md` + `api.example.http` exist)
- ❌ Automated test suite (no jest/mocha/supertest configured)
- ❌ Caching layer
- ❌ Rate limiting enhancements
- ❌ CI/CD pipeline

### Other Known Gaps

- ❌ `.env` configuration not present in repo (blocked from access via .clineignore)
- ❌ Atlas Search index (`default`) must be created on products collection
- ❌ No email verification on signup (only welcome email)
- ❌ No refresh token rotation
- ❌ No pagination meta on search results (only page/limit returned)
- ❌ `handleFactory.deleteOne` performs hard delete — products use `isDeleted` flag but factory DELETE also removes document
- ❌ No thumbnail variant for product card images (only full-size cover)
- ❌ No order delivery address validation beyond schema requirements

## Current Status

The backend is feature-complete for its documented scope. All major modules (auth, users, products, orders, reviews, search, stats) are implemented and wired. The project is at a stable state ready for:

- Frontend integration
- Production deployment (requires environment config + Atlas Search index setup)
- Test suite implementation
- Payment gateway integration

## Known Issues

1. **Atlas Search required for search endpoints**: Local Mongo without replica set/Atlas Search index will fail on `/search` routes
2. **Transactions require replica set**: Order creation/cancellation and guest conversion use transactions
3. **Duplicate code paths for guest conversion**: Both `userController.convertGuestToUser` and `userModel.convertGuestToUser` exist — model static uses transactions, controller method has duplicate logic (lower-level divergence risk)
4. **`createGuestUser` checks regular user existence**: Blocks checkout if email matches existing registered user (may need frontend to prompt login)
5. **Order status auto-progression timing is simulated**: Uses minutes (1/6/24 min) rather than real-world hours/days — intentional for demo purposes
6. **No logging rotation**: Winston writes to logs/ without rotation
7. **`/test-sanitize` route is exposed in production**: Should be removed or gated

## Evolution of Project Decisions

1. **Controller factory pattern adopted** (vs. per-model controllers) — reduces boilerplate, ensures consistent API shape
2. **Guest checkout via dedicated middleware + isGuest flag** — avoids forced registration at checkout, enables later conversion on signup
3. **authIdentities array for OAuth** — decouples login providers from password auth (supports future providers beyond Google)
4. **Order access token hashed** — stores SHA-256 hash instead of raw token to prevent DB leak abuse
5. **Counter collection for order numbers** — more robust than Date.now() collision-prone generation; daily prefix resets
6. **Email failures non-fatal for orders** — order succeeds even if email sending fails (logged), ensuring no revenue loss
7. **Sanitize-html strips all HTML from body strings** — trade-off: no rich text support anywhere, but strong XSS protection
8. **docker-compose uses replica set mode** — enabling Atlas Search + transactions in local dev; requires replica set init
9. **Product summary field alias on all list routes** — performance optimization to avoid returning heavy description/embeddings in lists
10. **Manual status updates disable auto-progression** (`statusManuallyUpdated`) — prevents cron from conflicting with admin decisions
