# Stage 1: Build Validation & Core Business Logic Testing
FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json ./
COPY src/ ./src
COPY tests/ ./tests

# Execute the test suite inside the compiler build step. 
# This prevents code with regression failures or vulnerability leaks from building.
RUN node tests/run-tests.js

# Stage 2: Production Container Runtime
FROM node:20-alpine AS runner
WORKDIR /app
COPY package.json index.html style.css server.js ./
COPY src/ ./src

# Cloud Run defaults to exposing port 8080.
ENV PORT=8080
EXPOSE 8080

CMD ["node", "server.js"]
