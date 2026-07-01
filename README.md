# Exclusive Backend

A production-inspired REST API powering **Exclusive**, a modern e-commerce application built with **Node.js**, **Express**, and **MongoDB**.

The project focuses on building the backend of a real online store—from secure authentication and product management to order processing, reviews, analytics, and automated background jobs. It follows a modular architecture with reusable controllers, centralized error handling, and scalable API design.

---

## Features

### User Authentication & Authorization

- Secure JWT authentication
- Protected routes and role-based access control
- Password reset via email
- Profile management
- Guest checkout support
- Guest account conversion to registered users

### Product Management

- Full CRUD operations for products
- Product image upload and automatic resizing
- Featured, trending, and category-based products
- Slug-based product URLs
- Inventory tracking and sales insights

### Orders

- Create and manage customer orders
- Track order status
- Cancel eligible orders
- View personal order history
- Admin order management
- Monthly sales and order statistics

### Reviews

- Product review system
- Customer-specific reviews
- Update and delete reviews
- Nested review routes

### API Features

- Filtering
- Sorting
- Pagination
- Field limiting
- Search
- Consistent error handling
- Reusable CRUD controller factory

### Background Tasks

- Automated order processing
- Scheduled sale cleanup jobs

---

## Tech Stack

- Node.js
- Express.js
- MongoDB & Mongoose
- JWT Authentication
- Multer
- Sharp
- Docker & Docker Compose
- Pug (Email Templates)

---

## Project Structure

```
controllers/
models/
routes/
utils/
lib/
dev-data/
```

The application follows a layered architecture where routes delegate requests to controllers, controllers interact with Mongoose models, and shared utilities provide reusable functionality such as filtering, authentication, logging, email handling, and error management.

---

## Getting Started

### Clone the repository

```bash
git clone https://github.com/Eloquence98/exclusive-backendd.git
cd exclusive-backendd
```

### Configure environment variables

Create a `.env` file in the project root and provide the required configuration such as:

- Database connection
- JWT secrets
- Email credentials
- Frontend URL
- Application port

### Start the application

```bash
docker compose up --build
```

### Seed development data (optional)

```bash
docker compose exec api node dev-data/data/import-dev-data.js --import
```

The API will then be available locally.

---

## API Overview

The backend exposes REST endpoints for:

- Authentication
- Users
- Products
- Orders
- Reviews

It also includes administrative endpoints for inventory management, analytics, reporting, and order administration.

---

## Why I Built This

This project was built to explore how a production-style e-commerce backend is structured beyond simple CRUD applications.

While building it, I focused on writing modular, maintainable code by separating responsibilities across controllers, models, middleware, and utilities. The project also introduced concepts such as reusable controller factories, image processing, scheduled background jobs, authentication flows, and analytics endpoints that are commonly found in real-world backend systems.

---

## Future Improvements

- Payment gateway integration
- API documentation with Swagger/OpenAPI
- Automated test suite
- Caching layer
- Rate limiting enhancements
- CI/CD pipeline

---

## License

This project is licensed under the ISC License.
