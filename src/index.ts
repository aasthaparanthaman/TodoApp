import dotenv from 'dotenv';
import { startServer } from './api/server';
import { initializeDatabase } from './db';
import logger from './config/logger';
dotenv.config();

async function main(): Promise<void> {
  try {
    logger.info('Starting gRPC Todo Application...');
    await initializeDatabase();

    logger.info('Database initialized successfully');
    await startServer();
    
    logger.info('gRPC server started successfully');
    process.on('SIGINT', () => {
      logger.info('Received SIGINT, shutting down gracefully...');
      process.exit(0);
    });

    process.on('SIGTERM', () => {
      logger.info('Received SIGTERM, shutting down gracefully...');
      process.exit(0);
    });

  } catch (error) {
    logger.error('Failed to start application:', error);
    process.exit(1);
  }
}
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

main().catch((error) => {
  logger.error('Application startup failed:', error);
  process.exit(1);
});