import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: process.env['PORT'] || 50051,
  host: process.env['HOST'] || '0.0.0.0',
  logging: {
    level: process.env['LOG_LEVEL'] || 'debug',
  },
  database: {
    host: process.env['DB_HOST'] || 'localhost',
    port: parseInt(process.env['DB_PORT'] || '5432', 10),
    name: process.env['DB_NAME'] || 'todoapp',
    user: process.env['DB_USER'] || 'postgres',
    password: process.env['DB_PASSWORD'] || 'password',
    ssl: process.env['DB_SSL'] === 'true',
  },
};
