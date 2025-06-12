# Base image
FROM node:18-alpine AS base
WORKDIR /app
COPY package*.json ./

# Dev image
FROM base AS dev
RUN npm install
COPY . .
CMD ["npm", "run", "dev"]

# Builder image for production
FROM base AS build
RUN npm ci
COPY . .
RUN npm run build

# Production image
FROM node:18-alpine AS prod
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY --from=build /app/dist ./dist
COPY --from=build /app/views ./views
CMD ["node", "dist/server.js"]
