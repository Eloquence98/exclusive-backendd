# Product Context: Exclusive Backend

## Why This Project Exists

Exclusive is a premium clothing brand e-commerce platform. This backend was built to explore how a production-style e-commerce backend is structured beyond simple CRUD applications. The focus is on writing modular, maintainable code with separation of responsibilities across controllers, models, middleware, and utilities.

## Problems It Solves

1. **Secure User Management**: Supports multiple authentication flows:

   - Standard email/password registration and login
   - Google OAuth (via ID token verification with google-auth-library)
   - Guest checkout with ability to convert guest accounts to registered users
   - Password reset via email with temporary tokens

2. **Product Catalog Management**:

   - Complete CRUD for clothing products
   - Categories: t-shirts, shirts, polos, jeans, shorts, trousers, activewear, fragrances, shoes, underwear
   - Sizes from S to 6XL (applied to apparel categories)
   - Image upload with automatic resizing via Sharp
   - Sale/pricing mechanics with scheduled cleanup

3. **Order Processing**:

   - Transactional order creation (stock decrement + order creation atomicity)
   - Unique order numbers (EXC-YYYYMMDD-NNNN format using counters)
   - Order tracking with signed access tokens or email verification
   - Status auto-progression: processing → confirmed → shipped → delivered
   - Cancellation with stock restoration
   - Order status change email notifications

4. **Search & Discovery**:

   - Full-text search using MongoDB Atlas Search
   - Autocomplete suggestions for search-as-you-type
   - Scoring: text relevance weighted over title/brand/category/tags
   - Filters: category, brand, onSale, price range

5. **Analytics for Admin**:
   - Order stats (revenue, avg order value, min/max)
   - Monthly sales statistics
   - Product inventory stats (low stock, out of stock)
   - Category performance stats
   - Public product stats for frontend filters (price ranges, brands, sizes)

## How It Should Work

- **Layered Architecture**: Routes → Controllers → Models → MongoDB
- **Reusable Patterns**: Factory-based CRUD controllers eliminate repetitive code
- **Centralized Error Handling**: All errors funnel through global error handler with env-aware responses (dev shows stack traces, prod hides internals)
- **Security-First**: Helmet headers, rate limiting, mongo-sanitize, XSS sanitization, HPP protection, JWT httpOnly cookies
- **Automated Jobs**: Node-cron jobs for sale expiration and order status progression
- **Email Notifications**: Pug templates rendered and sent via Brevo (production) or Mailtrap (development)

## User Experience Goals

- Seamless guest checkout without requiring registration upfront
- Order confirmation emails with tracking links (signed tokens)
- Easy order tracking via order number + email or signed link
- Product discovery via search suggestions and filterable facets
- Role-based admin dashboard endpoints (protected routes)
- Consistent JSON response format: `{ status, results?, meta?, data }`
