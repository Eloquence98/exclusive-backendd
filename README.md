# Exclusive Backend API

REST API service for the Exclusive e-commerce platform. Provides authentication, product catalog, order management, reviews, and search capabilities for a separate frontend client.

## Features

- **User Authentication**: JWT-based signup/login, Google OAuth, guest checkout, password reset
- **User Management**: Profile updates, photo upload, role-based access (user/admin)
- **Product Management**: Full CRUD, image upload/resizing, categories, sales/pricing, inventory
- **Order Management**: Transactional order creation, tracking, cancellation, status progression, monthly stats
- **Reviews**: Product reviews with rating aggregation
- **Search**: Full-text search and autocomplete via MongoDB Atlas Search
- **Analytics**: Order, product, inventory, and category statistics
- **Background Jobs**: Automated order status progression, sale expiration cleanup

## Tech Stack

| Dependency          | Version                       |
| ------------------- | ----------------------------- |
| Node.js             | >= 14                         |
| Express             | ^4.21.0                       |
| Mongoose            | ^8.6.3                        |
| MongoDB             | latest (replica set required) |
| jsonwebtoken        | ^9.0.2                        |
| bcryptjs            | ^3.0.0                        |
| multer              | ^2.0.0                        |
| sharp               | ^0.33.5                       |
| node-cron           | ^4.1.0                        |
| nodemailer          | ^6.10.0                       |
| @getbrevo/brevo     | ^6.0.2                        |
| pug                 | ^3.0.3                        |
| winston             | ^3.17.0                       |
| google-auth-library | ^10.9.0                       |

## Prerequisites

- Node.js >= 14
- MongoDB instance running in **replica set mode** (required for Atlas Search and transactions)

## Install

```bash
npm install
```

## Environment Variables

Create a `.env` file in the project root:

| Variable                | Purpose                                        |
| ----------------------- | ---------------------------------------------- |
| `NODE_ENV`              | `development`, `production`, or `test`         |
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

## Running

### Development

```bash
npm run dev
```

### Production

```bash
npm run build
npm run start:prod
```

### Docker

```bash
docker compose up --build
```

### Seed Data

```bash
npm run seed:import   # Import products from dev-data/data/products.json
npm run seed:delete   # Delete all products
npm run seed:reset    # Delete then re-import products
```

## API Documentation

All routes are mounted under `/api/v1`. See `api.http` / `api.example.http` for example requests, and the `routes/` directory for endpoint definitions:

- `/api/v1/users` — authentication and user management
- `/api/v1/products` — product catalog
- `/api/v1/orders` — order management
- `/api/v1/reviews` — product reviews
- `/api/v1/search` — full-text search and suggestions

## Project Structure

```
controllers/    # Request handlers (auth, products, orders, reviews, search, users)
models/         # Mongoose schemas (User, Product, Order, Review, Counter)
routes/         # Express route definitions
utils/          # Shared utilities (API features, error handling, email, logging)
lib/cornJobs/   # Scheduled background jobs (order processing, sale cleanup)
config/         # Service configuration (Brevo email client)
views/email/    # Pug email templates
dev-data/data/   # Static seed data and import scripts
public/img/     # Uploaded product and user images
```

## License

ISC
