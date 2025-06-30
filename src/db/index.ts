import { Pool, PoolClient } from 'pg';
import { config } from '../config';
import logger from '../config/logger';

export interface TodoRow {
  id: number;
  title: string;
  description: string | null;
  completed: boolean;
  created_at: Date;
  updated_at: Date;
}

class Database {
  private pool: Pool;

  constructor() {
    this.pool = new Pool({
      host: config.database.host,
      port: config.database.port,
      database: config.database.name,
      user: config.database.user,
      password: config.database.password,
      ssl: config.database.ssl,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });

    this.pool.on('error', (err) => {
      logger.error('Unexpected error on idle client', err);
    });
  }

  async getClient(): Promise<PoolClient> {
    return await this.pool.connect();
  }

  async query(text: string, params?: any[]): Promise<any> {
    const client = await this.getClient();
    try {
      const result = await client.query(text, params);
      return result;
    } finally {
      client.release();
    }
  }

  async close(): Promise<void> {
    await this.pool.end();
  }

  async initialize(): Promise<void> {
    try {
      logger.info('Verifying database connection...');
      await this.query('SELECT 1');
      logger.info('Database connection verified successfully');
    } catch (error) {
      logger.error('Database initialization failed:', error);
      throw error;
    }
  }
}

const database = new Database();

export async function initializeDatabase(): Promise<void> {
  await database.initialize();
}

export async function getDatabase(): Promise<Database> {
  return database;
}

export default database;