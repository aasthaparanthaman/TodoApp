// Test setup file for Jest
import dotenv from 'dotenv';

// Load test environment variables
dotenv.config({ path: '.env.test' });

// Set default test environment variables
process.env['NODE_ENV'] = 'test';
process.env['DB_HOST'] = process.env['TEST_DB_HOST'] || 'localhost';
process.env['DB_PORT'] = process.env['TEST_DB_PORT'] || '5433';
process.env['DB_NAME'] = process.env['TEST_DB_NAME'] || 'todoapp_test';
process.env['DB_USER'] = process.env['TEST_DB_USER'] || 'postgres';
process.env['DB_PASSWORD'] = process.env['TEST_DB_PASSWORD'] || 'password';
process.env['LOG_LEVEL'] = 'error'; // Reduce log noise in tests

// Increase timeout for database operations
jest.setTimeout(10000);

// Mock the database module to use our mock database
jest.mock('../db', () => {
  const { mockDatabase } = require('./mocks/database');
  return {
    ...mockDatabase,
    default: mockDatabase,
    TodoRow: {} // Export the TodoRow interface
  };
});

// Global test cleanup
afterAll(async () => {
  // Close database connections if needed
  // This will be implemented when we add database cleanup utilities
});