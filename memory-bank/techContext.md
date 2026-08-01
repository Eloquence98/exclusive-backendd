# Tech Context: Exclusive Backend

## Technologies Used

### Core Stack

- **Node.js** (>= 14, Alpine Docker images use Node 18)
- **Express.js** ^4.21.0 — web framework
- **MongoDB** — database (latest, replica set mode)
- **Mongoose** ^8.6.3 — ODM
- **JSON Web Token (jsonwebtoken)** ^9.0.2 — authentication
- **bcryptjs** ^3.0.0 — password hashing

### Security

- **helmet** ^8.0.0 — security headers
- **express-rate-limit** ^7.5.0 — rate limiting (1000 req/hr/IP on /api)
- **express-mongo-sanitize** ^2.2.0 — NoSQL injection prevention
- **sanitize-html** ^2.14.0 — XSS prevention (strips all HTML from body strings)
- **hpp** ^0.2.3 — parameter pollution prevention
- **cors** ^2.8.5 — cross-origin resource sharing
- **cookie-parser** ^1.4.7 — JWT cookie parsing

### Email

- **nodemailer** ^6.10.0 — SMTP transport (Mailtrap for dev)
- **@getbrevo/brevo** ^6.0.2 — Brevo transactional email API (production)
- **pug** ^3.0.3 — email template rendering
- **html-to-text** ^9.0.5 — HTML → text conversion for emails

### Image Processing

- **multer** ^2.0.0 — file upload (memory storage)
- **sharp** ^0.33.5 — image resizing/format conversion

### Search

- **MongoDB Atlas Search** — full-text search (via $search aggregation stage)
  - Requires replica set (docker-compose runs `mongod --replSet rs0`)
  - Requires Atlas Search index named `default` on products collection

### Background Jobs

- **node-cron** ^4.1.0 — scheduled jobs

### Auth

- **google-auth-library** ^10.9.0 — Google OAuth ID token verification

### Utilities

- **dotenv** ^16.4.5 — environment variables
- **compression** ^1.8.0
- **morgan** ^1.10.0 — HTTP request logging
- **winston** ^3.17.0 — structured logging
- **slugify** ^1.6.6 — product slug generation
- **validator** ^13.12.0 — email validation

### Build & Dev Tools

- **esbuild** ^0.25.0 — bundler for production build
- **nodemon** ^3.1.7 — dev hot reload
- **eslint** ^8.57.1 + **eslint-config-airbnb-base** + **eslint-config-prettier** + **eslint-plugin-import/node/prettier** — linting
- **prettier** ^3.3.3 — formatting
- **rimraf** ^5.0.5 — clean build dir
- **copyfiles** ^2.4.1 — copy email templates to dist
- **cross-env** ^7.0.3 — cross-platform env vars

## Development Setup

### Scripts

| Script                 | Command                                                                         | Purpose                            |
| ---------------------- | ------------------------------------------------------------------------------- | ---------------------------------- |
| `start`                | `node dist/server.js`                                                           | Run compiled production bundle     |
| `dev`                  | `nodemon server.js`                                                             | Development server with hot reload |
| `start:prod`           | `cross-env NODE_ENV=production node dist/server.js`                             | Production from bundle             |
| `build`                | `npm run clean && npm run build:server && npm run copy:email-templates`         | Full production build              |
| `build:server`         | `esbuild server.js --bundle --platform=node --outdir=dist --minify --sourcemap` | Bundle backend                     |
| `clean`                | `rimraf dist`                                                                   | Remove dist folder                 |
| `copy:email-templates` | `copyfiles -u 1 "views/email/**/*" dist/views/email`                            | Copy Pug templates                 |
| `docker:prod`          | `cross-env NODE_ENV=production TARGET=prod docker-compose up --build -d`        | Production Docker deploy           |

### Docker Setup

- **Dockerfile**: Multi-stage (base → dev → build → prod)
  - Dev: `npm install` + nodemon
  - Prod: `npm ci --omit=dev` + esbuild bundle + views copied
- **docker-compose.yml**:
  - `api` service (port 3000), NODE_ENV from env, `.env` file, volume mount for live reload
  - `mongo` service (port 27017) in **replica set mode** (`mongod --replSet rs0`) — required for Atlas Search
  - Profile `full-stack` on api service
- Start: `docker compose up --build` (dev) or `npm run docker:prod`

### Environment Variables (Required in .env)

| Variable                | Purpose                                        |
| ----------------------- | ---------------------------------------------- |
| `NODE_ENV`              | development / production / test                |
| `PORT`                  | Server port (default 3000)                     |
| `MONGODB_URI`           | MongoDB connection string                      |
| `JWT_SECRET`            | JWT signing secret                             |
| `JWT_EXPIRES_IN`        | Token expiration (e.g., `90d`)                 |
| `JWT_COOKIE_EXPIRES_IN` | Cookie expiration in days                      |
| `BREVO_API_KEY`         | Brevo transactional email API key (production) |
| `EMAIL_HOST`            | SMTP host (Mailtrap in dev)                    |
| `EMAIL_PORT`            | SMTP port                                      |
| `EMAIL_USERNAME`        | SMTP username                                  |
| `EMAIL_PASSWORD`        | SMTP password                                  |
| `EMAIL_FROM`            | Sender email address                           |
| `EMAIL_FROM_NAME`       | Sender display name                            |
| `FRONTEND_URL`          | Frontend application URL                       |
| `GOOGLE_CLIENT_ID`      | Google OAuth client ID                         |

## Technical Constraints

1. **Atlas Search requirement**: Search endpoints (`/api/v1/search`, `/api/v1/search/suggest`) use `$search` aggregation stage, which requires:
   - MongoDB replica set deployment
   - An Atlas Search index named `default` on the products collection covering title, description, brand, category, tags
2. **MongoDB transactions**: Order creation/cancellation and guest→user conversion use transactions — require replica set
3. **Node >= 14**: Though Docker images use Node 18 Alpine
4. **Production build**: esbuild bundles all server code into single file; email templates must be copied separately to `dist/views/email`
5. **JWT cookie security**: `secure: true` only in production (HTTPS required)
6. **No test framework**: No jest/mocha/supertest configured; `NODE_ENV=test` only disables order processing cron

## Dependencies Graph

```
server.js
├── dotenv
├── mongoose
├── utils/logger (winston)
├── lib/cornJobs/saleCleanup (node-cron, Product)
├── lib/cornJobs/orderProcessing (node-cron, Order)
└── app.js
    ├── express
    ├── morgan
    ├── cookie-parser
    ├── express-rate-limit
    ├── helmet
    ├── express-mongo-sanitize
    ├── sanitize-html
    ├── cors
    ├── hpp
    ├── utils/logger
    ├── controllers/errorController
    └── routes/*
        ├── authController (jsonwebtoken, google-auth-library, bcryptjs, crypto)
        ├── userController (multer, sharp)
        ├── productController (multer, sharp, slugify)
        ├── orderController (mongoose, crypto)
        ├── reviewController
        └── searchController
```

## Tool Usage Patterns

### Logging

- Winston logger with 3 transports: console (colorized, human-readable), `logs/combined.log`, `logs/error.log`
- Log levels: error (0) < warn (1) < info (2) < http (3) < debug (4)
- Dev level: `debug`; Production level: `info`
- Morgan streams HTTP logs to Winston via `stream` object

### Error Handling

- Controllers throw `AppError(message, statusCode)` for operational errors
- `catchAsync(fn)` wraps all async controllers
- Global error handler in `controllers/errorController.js` is last middleware

### Data Seeding

- `dev-data/data/` contains static JSON product data + import script
- Run via: `docker compose exec api node dev-data/data/import-data.js --import`

### API Standards

- Versioned routes: `/api/v1/...`
- Response envelope: `{ status, results?, meta?, data }`
- Pagination meta: `{ page, limit, totalDocuments, totalPages, hasNextPage, hasPrevPage }`
- Products expose `id` (not `_id`) via Mongoose toJSON transform
