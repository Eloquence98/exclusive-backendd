# Exclusive API Documentation

## Overview

The Exclusive API provides access to product management, user management, reviews, and order processing for a premium clothing brand platform. This RESTful API follows industry best practices and provides a comprehensive set of endpoints for managing all aspects of the clothing e-commerce system.

## Base URL

```
https://your-domain.com/api/v1
```

## Authentication

The Exclusive API uses JSON Web Tokens (JWT) for authentication. Most endpoints require authentication.

### Authentication Endpoints

#### Sign Up

```
POST /users/signup
```

Create a new user account.

**Request Body:**

```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "test1234",
  "passwordConfirm": "test1234"
}
```

**Response:**

```json
{
  "status": "success",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "data": {
    "user": {
      "_id": "5c8a1d5b0190b214360dc057",
      "name": "John Doe",
      "email": "john@example.com",
      "role": "user"
    }
  }
}
```

#### Login

```
POST /users/login
```

Authenticate a user and receive a JWT token.

**Request Body:**

```json
{
  "email": "john@example.com",
  "password": "test1234"
}
```

**Response:**

```json
{
  "status": "success",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

#### Logout

```
GET /users/logout
```

Logout the current user.

#### Forgot Password

```
POST /users/forgotPassword
```

Request a password reset token.

**Request Body:**

```json
{
  "email": "john@example.com"
}
```

**Response:**

```json
{
  "status": "success",
  "message": "Token sent to email!"
}
```

#### Reset Password

```
PATCH /users/resetPassword/:token
```

Reset password using the token received via email.

**Request Body:**

```json
{
  "password": "newtest1234",
  "passwordConfirm": "newtest1234"
}
```

**Response:**

```json
{
  "status": "success",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

## Products

### Product Endpoints

#### Get All Products

```
GET /products
```

Retrieve a list of all products.

**Query Parameters:**

- `page`: Page number (default: 1)
- `limit`: Number of results per page (default: 100)
- `sort`: Sort by field(s) (e.g., `price,-ratingsAverage`)
- `fields`: Select specific fields (e.g., `name,price,category`)
- Filter by any product field (e.g., `price[gte]=50&category=shirts`)

**Response:**

```json
{
  "status": "success",
  "results": 9,
  "data": {
    "data": [
      {
        "_id": "5c88fa8cf4afda39709c2955",
        "title": "Premium Cotton T-Shirt",
        "category": "t-shirts",
        "size": "L",
        "stock": 100,
        "ratingsAverage": 4.7,
        "ratingsQuantity": 12,
        "price": 39.99,
        "salePrice": 29.99,
        "onSale": true,
        "saleStartDate": "2024-03-01T00:00:00.000Z",
        "saleEndDate": "2024-03-31T23:59:59.999Z",
        "discount": 25,
        "description": "Luxurious cotton t-shirt with perfect fit",
        "imageCover": "tshirt-1-cover.jpg",
        "images": ["tshirt-1-1.jpg", "tshirt-1-2.jpg"],
        "brand": "Exclusive",
        "tags": ["cotton", "premium", "casual"],
        "isFeatured": true,
        "isActive": true,
        "slug": "premium-cotton-t-shirt"
      }
      // More products...
    ]
  }
}
```

#### Get Featured Products

```
GET /products/featured
```

Get a list of featured products.

#### Get Top Rated Products

```
GET /products/top-rated
```

Get a list of top-rated products.

#### Get Trending Products

```
GET /products/trending
```

Get a list of trending products.

#### Get Products by Category

```
GET /products/category/:category
```

Get products in a specific category.

#### Get Product Statistics

```
GET /products/product-stats
```

Get product statistics (Admin only).

#### Get Sales Statistics

```
GET /products/sales-stats
```

Get sales statistics (Admin only).

#### Get Inventory Statistics

```
GET /products/inventory-stats
```

Get inventory statistics (Admin only).

#### Get Category Statistics

```
GET /products/category-stats
```

Get category statistics (Admin only).

#### Get Product by ID

```
GET /products/:id
```

Get a specific product by ID.

#### Get Product by Slug

```
GET /products/:slug
```

Get a specific product by slug.

#### Create Product

```
POST /products
```

Create a new product (Admin only).

**Request Body:**

```json
{
  "title": "Premium Cotton T-Shirt",
  "category": "t-shirts",
  "size": "L",
  "stock": 100,
  "price": 39.99,
  "salePrice": 29.99,
  "onSale": true,
  "saleStartDate": "2024-03-01T00:00:00.000Z",
  "saleEndDate": "2024-03-31T23:59:59.999Z",
  "discount": 25,
  "description": "Luxurious cotton t-shirt with perfect fit",
  "brand": "Exclusive",
  "tags": ["cotton", "premium", "casual"],
  "isFeatured": true
}
```

#### Update Product

```
PATCH /products/:id
```

Update a product (Admin only).

#### Delete Product

```
DELETE /products/:id
```

Delete a product (Admin only).

## Orders

### Order Endpoints

#### Track Order

```
GET /orders/track/:orderNumber
```

Track an order status (Public).

#### Create Order

```
POST /orders
```

Create a new order (Works for both guests and authenticated users).

**Request Body:**

```json
{
  "products": [
    {
      "product": "5c88fa8cf4afda39709c2955",
      "quantity": 2
    }
  ],
  "shippingAddress": {
    "name": "John Doe",
    "phone": "+1234567890",
    "addressLine1": "123 Main St",
    "addressLine2": "Apt 4B",
    "city": "New York",
    "zipCode": "10001",
    "country": "USA"
  },
  "paymentMethod": "cash_on_delivery"
}
```

#### Get My Orders

```
GET /orders/my-orders
```

Get orders for the authenticated user.

#### Get Recent Orders

```
GET /orders/recent
```

Get recent orders for the authenticated user.

#### Get All Orders

```
GET /orders
```

Get all orders (Admin only).

#### Get Order

```
GET /orders/:id
```

Get a specific order (Admin only).

**Response for Get Order:**

```json
{
  "status": "success",
  "data": {
    "orderNumber": "EXC-20240315-0001",
    "products": [
      {
        "product": "5c88fa8cf4afda39709c2955",
        "quantity": 2,
        "priceAtPurchase": 29.99,
        "name": "Premium Cotton T-Shirt",
        "imageUrl": "tshirt-1-cover.jpg"
      }
    ],
    "shippingAddress": {
      "name": "John Doe",
      "phone": "+1234567890",
      "addressLine1": "123 Main St",
      "addressLine2": "Apt 4B",
      "city": "New York",
      "zipCode": "10001",
      "country": "USA"
    },
    "paymentMethod": "cash_on_delivery",
    "paymentStatus": "pending",
    "subtotal": 59.98,
    "shippingCost": 0,
    "totalAmount": 59.98,
    "orderStatus": "processing",
    "statusHistory": [
      {
        "status": "processing",
        "timestamp": "2024-03-15T10:00:00.000Z",
        "note": "Order received"
      }
    ],
    "createdAt": "2024-03-15T10:00:00.000Z",
    "updatedAt": "2024-03-15T10:00:00.000Z"
  }
}
```

#### Update Order

```
PATCH /orders/:id
```

Update an order (Admin only).

#### Delete Order

```
DELETE /orders/:id
```

Delete an order (Admin only).

#### Get Order Statistics

```
GET /orders/stats
```

Get order statistics (Admin only).

#### Get Monthly Statistics

```
GET /orders/monthly-stats/:year
```

Get monthly order statistics for a specific year (Admin only).

## Reviews

### Review Endpoints

#### Get All Reviews

```
GET /reviews
```

OR

```
GET /products/:productId/reviews
```

Get all reviews or reviews for a specific product.

#### Create Review

```
POST /products/:productId/reviews
```

Create a new review for a product (Authenticated users only).

**Request Body:**

```json
{
  "review": "Great product, excellent quality!",
  "rating": 5
}
```

#### Get Review

```
GET /reviews/:id
```

Get a specific review.

#### Update Review

```
PATCH /reviews/:id
```

Update a review (Review author or admin only).

#### Delete Review

```
DELETE /reviews/:id
```

Delete a review (Review author or admin only).

## Users

### User Endpoints

#### Get Current User

```
GET /users/me
```

Get the currently authenticated user's profile.

#### Update Current User

```
PATCH /users/updateMe
```

Update the currently authenticated user's profile.

**Request Body:**

```json
{
  "name": "John Doe Updated",
  "email": "john.updated@example.com"
}
```

#### Delete Current User

```
DELETE /users/deleteMe
```

Deactivate the currently authenticated user's account.

#### Get All Users

```
GET /users
```

Get all users (Admin only).

#### Create User

```
POST /users
```

Create a new user (Admin only).

#### Get User

```
GET /users/:id
```

Get a specific user (Admin only).

#### Update User

```
PATCH /users/:id
```

Update a user (Admin only).

#### Delete User

```
DELETE /users/:id
```

Delete a user (Admin only).

## Error Handling

The API uses standard HTTP status codes to indicate the success or failure of requests:

- `200 OK`: The request was successful
- `201 Created`: A new resource was successfully created
- `204 No Content`: The request was successful but no content is returned (used for DELETE operations)
- `400 Bad Request`: The request was invalid or cannot be served
- `401 Unauthorized`: Authentication is required or failed
- `403 Forbidden`: The authenticated user doesn't have permission to access the requested resource
- `404 Not Found`: The requested resource doesn't exist
- `500 Internal Server Error`: An error occurred on the server

Error responses follow this format:

```json
{
  "status": "error",
  "message": "Error message describing what went wrong"
}
```

## Rate Limiting

The API implements rate limiting to prevent abuse. The current limit is 100 requests per hour per IP address.

When the rate limit is exceeded, the API will respond with a `429 Too Many Requests` status code.

## API Features

### Filtering

Filter results by adding query parameters that match field names:

```
GET /api/v1/products?price[lte]=50&category=shirts
```

### Advanced Filtering

Use operators for more advanced filtering:

- `[gt]`: Greater than
- `[gte]`: Greater than or equal to
- `[lt]`: Less than
- `[lte]`: Less than or equal to
- `[ne]`: Not equal to

Example:

```
GET /api/v1/products?price[gte]=20&stock[gt]=0
```

### Sorting

Sort results by adding a `sort` parameter with a comma-separated list of fields:

```
GET /api/v1/products?sort=price,-ratingsAverage
```

Prefix a field with `-` to sort in descending order.

### Field Limiting

Limit the fields returned by adding a `fields` parameter with a comma-separated list of fields:

```
GET /api/v1/products?fields=name,price,category,stock
```

### Pagination

Paginate results by adding `page` and `limit` parameters:

```
GET /api/v1/products?page=2&limit=10
```

## Product Categories and Sizes

### Available Categories

- t-shirts
- shirts
- polos
- jeans
- shorts
- trousers
- activewear
- fragrances
- shoes
- underwear

### Available Sizes

The following sizes are available for clothing categories (t-shirts, shirts, polos, jeans, shorts, trousers, activewear, underwear):

- S
- M
- L
- XL
- XXL
- XXXL
- 4XL
- 5XL
- 6XL

Note: Size is required for clothing categories but not for fragrances and shoes.

## Conclusion

This documentation covers the main endpoints and features of the Exclusive API. For any questions or issues, please contact:

- **General Inquiries**: help@exclusive.com
- **Technical Support**: tech-support@exclusive.com
- **API Access Requests**: api-access@exclusive.com
- **Reporting Bugs**: bugs@exclusive.com
- **Security Concerns**: security@exclusive.com
- **Billing/Payment Issues**: payments@exclusive.com
- **Feature Requests**: features@exclusive.com
- **Partnership Opportunities**: partnerships@exclusive.com

Our support team is available from Monday to Friday, 9 AM to 5 PM UTC.
