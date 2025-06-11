# Exclusive E-commerce Backend API

A robust and secure REST API for the Exclusive e-commerce platform, built with Node.js, Express, and MongoDB.

## Features

- **User Management**

  - Regular and Guest User Support
  - JWT Authentication
  - Password Reset
  - User Profile Management

- **Product Management**

  - Product CRUD Operations
  - Category Management
  - Search and Filtering
  - Ratings and Reviews

- **Order System**

  - Guest & Registered User Orders
  - Order Status Tracking
  - Status History with Timestamps
  - Automatic Status Progression

- **Security Features**
  - JWT Authentication
  - Rate Limiting
  - Data Sanitization
  - XSS Protection
  - Parameter Pollution Prevention
  - CORS Support

## Prerequisites

- Node.js (v14 or higher)
- MongoDB (v4.4 or higher)
- npm or yarn

## Installation

1. Clone the repository:

   ```bash
   git clone [repository-url]
   cd exclusive-backend
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Create a config.env file in the root directory with the following variables:

   ```env
   NODE_ENV=development
   PORT=3000
   MONGODB_URI=your_mongodb_uri
   DB_NAME=exclusive

   JWT_SECRET=your_jwt_secret_at_least_32_chars_long
   JWT_EXPIRES_IN=90d
   JWT_COOKIE_EXPIRES_IN=90

   EMAIL_HOST=your_email_host
   EMAIL_PORT=2525
   EMAIL_USERNAME=your_email_username
   EMAIL_PASSWORD=your_email_password

   FRONTEND_URL=http://localhost:3000
   ```

4. Start the server:

   ```bash
   # Development mode
   npm run dev

   # Production mode
   npm start
   ```

## API Documentation

### Authentication Endpoints

\`\`\`
POST /api/v1/users/signup
POST /api/v1/users/login
POST /api/v1/users/forgotPassword
PATCH /api/v1/users/resetPassword/:token
\`\`\`

### User Endpoints

\`\`\`
GET /api/v1/users/me
PATCH /api/v1/users/updateMe
DELETE /api/v1/users/deleteMe
\`\`\`

### Product Endpoints

\`\`\`
GET /api/v1/products
GET /api/v1/products/:id
POST /api/v1/products
PATCH /api/v1/products/:id
DELETE /api/v1/products/:id
\`\`\`

### Order Endpoints

\`\`\`
POST /api/v1/orders
GET /api/v1/orders
GET /api/v1/orders/:id
GET /api/v1/orders/my-orders
\`\`\`

### Review Endpoints

\`\`\`
POST /api/v1/products/:productId/reviews
GET /api/v1/products/:productId/reviews
PATCH /api/v1/reviews/:id
DELETE /api/v1/reviews/:id
\`\`\`

## Error Handling

The API uses a centralized error handling system. All errors follow this format:

```json
{
  "status": "error",
  "error": {
    "statusCode": 404,
    "status": "error",
    "isOperational": true
  },
  "message": "Error message here",
  "stack": "Error stack trace (only in development)"
}
```

## Development

### Available Scripts

- `npm start`: Start the server in production mode
- `npm run dev`: Start the server in development mode
- `npm run debug`: Start the server in debug mode
- `npm test`: Run tests
- `npm run import`: Import sample data
- `npm run delete-data`: Delete all data from database

### Folder Structure

```
exclusive-backend/
├── controllers/     # Route controllers
├── models/         # Database models
├── routes/         # API routes
├── utils/          # Utility functions
├── middleware/     # Custom middleware
├── public/         # Static files
└── dev-data/       # Development data
```

## Production Deployment

1. Set NODE_ENV to 'production'
2. Configure proper security headers
3. Set up proper MongoDB indexes
4. Enable rate limiting
5. Set up proper CORS configuration

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a new Pull Request

## License

This project is available for personal use. Commercial use or tutorial/course creation based on this project is not permitted.
