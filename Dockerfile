# Use the official Node.js 18 runtime as the base image
FROM node:18-alpine

# Set the working directory inside the container
WORKDIR /usr/src/app

# Copy package.json and package-lock.json (if available)
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy the rest of the application source code
COPY . .

# Build the TypeScript application
RUN npm run build

# Fix: copy .proto files to match dist path used by server.js
COPY src/api/todo.proto dist/api/todo.proto
COPY src/api/google/api dist/api/google/api

# Create a non-root user to run the application
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001

# Create logs directory and set permissions
RUN mkdir -p logs
RUN chown -R nodejs:nodejs /usr/src/app

# Switch to the non-root user
USER nodejs

# Expose the port the app runs on
EXPOSE 50051

# Add healthcheck
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "const grpc = require('@grpc/grpc-js'); \
               const client = new grpc.Client('localhost:50051', grpc.credentials.createInsecure()); \
               client.waitForReady(Date.now() + 5000, (err) => process.exit(err ? 1 : 0));"

# Define the command to run the application
CMD ["npm", "start"]