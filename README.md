# Exclusive E-commerce Backend API

A robust and secure REST API for the Exclusive e-commerce platform, built with Node.js, Express, and MongoDB. Features include user authentication, product management, order processing, and email notifications.

## Tech Stack

- **Runtime**: Node.js (≥14)
- **Framework**: Express.js
- **Database**: MongoDB
- **Email Templates**: Pug
- **Authentication**: JWT
- **Container**: Docker
- **API Testing**: Postman (collection included)

## Prerequisites

Choose either Option A or B:

### Option A: Using npm scripts (Recommended for Development)

- Node.js and npm (for running scripts)
- Docker and Docker Compose
- Git
- A text editor
- Mailtrap account (for email testing)

### Option B: Using Docker directly

- Docker and Docker Compose
- Git
- A text editor
- Mailtrap account (for email testing)

No need to install MongoDB - it runs in a container!

## Quick Start

1. **Clone the repository**

   ```bash
   git clone https://github.com/Eloquence98/exclusive-backendd.git
   cd exclusive-backend
   ```

2. **Create environment file**

   ```bash
   # Create .env file in the root directory
   touch .env

   # Add the following variables (replace values as needed)
   NODE_ENV=development
   PORT=3000
   DB_NAME=db_name
   JWT_SECRET=your_secret_key_here
   JWT_EXPIRES_IN=7d
   JWT_COOKIE_EXPIRES_IN=7
   FRONTEND_URL=http://localhost:3000

   # Mailtrap credentials (for email testing)
   EMAIL_HOST=smtp.mailtrap.io
   EMAIL_PORT=2525
   EMAIL_USERNAME=your_mailtrap_username
   EMAIL_PASSWORD=your_mailtrap_password
   EMAIL_FROM=noreply@yourbrand.com
   ```

3. **Start the development environment**

   Using npm (Option A):

   ```bash
   npm run docker:dev
   ```

   Using Docker directly (Option B):

   ```bash
   # Development mode
   docker compose up --build -d

   # View logs
   docker compose logs -f api
   ```

4. **Import development data**

   Using npm (Option A):

   ```bash
   npm run data:import
   ```

   Using Docker directly (Option B):

   ```bash
   docker compose exec api node dev-data/data/import-dev-data.js --import
   ```

5. **Verify the setup**
   - API is running at: http://localhost:3000
   - MongoDB Express UI: http://localhost:8081
   - Check container status: `docker compose ps`

## Common Commands

### Using npm (Option A)

```bash
# Start development environment
npm run docker:dev

# Start production environment
npm run docker:prod

# Stop all containers
npm run docker:down

# Import test data
npm run data:import

# Delete all data
npm run data:delete
```

### Using Docker directly (Option B)

```bash
# Start development environment
docker compose up --build -d

# Start production environment
TARGET=prod docker compose up --build -d

# Stop all containers
docker compose down -v

# Import test data
docker compose exec api node dev-data/data/import-dev-data.js --import

# Delete all data
docker compose exec api node dev-data/data/import-dev-data.js --delete
```

## Testing the API

1. **Create a new user**

   ```bash
   curl -X POST http://localhost:3000/api/v1/users/signup \
   -H "Content-Type: application/json" \
   -d '{
     "name": "Test User",
     "email": "test@example.com",
     "password": "test1234",
     "passwordConfirm": "test1234"
   }'
   ```

2. **Login**

   ```bash
   curl -X POST http://localhost:3000/api/v1/users/login \
   -H "Content-Type: application/json" \
   -d '{
     "email": "test@example.com",
     "password": "test1234"
   }'
   ```

3. **View products** (no authentication required)
   ```bash
   curl http://localhost:3000/api/v1/products
   ```

## API Endpoints

### Authentication

- POST `/api/v1/users/signup` - Register new user
- POST `/api/v1/users/login` - Login user
- POST `/api/v1/users/forgotPassword` - Request password reset
- PATCH `/api/v1/users/resetPassword/:token` - Reset password

### Products

- GET `/api/v1/products` - Get all products
- GET `/api/v1/products/:id` - Get single product
- POST `/api/v1/products` - Create product (Admin)
- PATCH `/api/v1/products/:id` - Update product (Admin)
- DELETE `/api/v1/products/:id` - Delete product (Admin)

### Orders

- POST `/api/v1/orders` - Create order
- GET `/api/v1/orders` - Get all orders (Admin)
- GET `/api/v1/orders/:id` - Get single order
- GET `/api/v1/orders/my-orders` - Get user orders

### Reviews

- POST `/api/v1/products/:productId/reviews` - Create review
- GET `/api/v1/products/:productId/reviews` - Get product reviews
- PATCH `/api/v1/reviews/:id` - Update review
- DELETE `/api/v1/reviews/:id` - Delete review

## Development

### Available Scripts

- `npm run docker:dev` - Start development environment
- `npm run docker:prod` - Start production environment
- `npm run docker:down` - Stop and remove containers
- `npm run data:import` - Import sample data
- `npm run data:delete` - Delete all data

### Directory Structure

```
exclusive-backend/
├── controllers/     # Route controllers
├── models/         # Database models
├── routes/         # API routes
├── utils/          # Utility functions
├── views/          # Email templates
├── dev-data/       # Sample data
└── docker/         # Docker configuration
```

## Stopping the Application

```bash
npm run docker:down
```

## Troubleshooting

1. **Containers not starting**

   - Check Docker daemon is running
   - Ensure ports 3000, 27017, and 8081 are free
   - View logs: `docker compose logs`

2. **Email not working**

   - Verify Mailtrap credentials in .env
   - Check email logs in container

3. **Database issues**
   - Access Mongo Express UI at http://localhost:8081
   - Check MongoDB logs: `docker compose logs mongo`

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

This project is licensed under the ISC License.
