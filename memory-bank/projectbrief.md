# Project Brief: Exclusive Backend

## Project Overview

A production-inspired REST API powering **Exclusive**, a premium clothing brand e-commerce platform. The backend handles secure authentication, product management, order processing, reviews, analytics, search, and automated background jobs.

## Core Goals

1. Build a production-style e-commerce backend beyond simple CRUD
2. Implement secure authentication (JWT + Google OAuth + Guest checkout)
3. Provide scalable API design with reusable components
4. Support full product lifecycle: catalog, inventory, sales, pricing
5. Enable order management with status tracking and email notifications
6. Deliver search functionality using Atlas Search
7. Provide admin analytics/reporting capabilities

## Key Scope

- **Users**: Registration, login (password & Google), guest checkout, profile management, role-based access (user/admin)
- **Products**: Full CRUD, image upload/resizing, categories, featured/trending/top-rated listings, sales/pricing logic, inventory
- **Orders**: Creation with stock transactions, order numbers, tracking, cancellation with stock restoration, status progression, monthly sales stats
- **Reviews**: Product reviews with rating aggregation, nested routes, duplicate prevention
- **API Features**: Filtering, sorting, pagination, field limiting, search
- **Background Tasks**: Sale cleanup (daily), order status auto-progression (every minute)

## Ownership

- Author: Eloquence98
- Repository: git@github.com:Eloquence98/exclusive-backendd.git
- License: ISC

## Constraints

- Node.js >= 14
- MongoDB (compatible with Atlas Search)
- Environment config via `.env` (DB URI, JWT secrets, email creds, frontend URL, port)
