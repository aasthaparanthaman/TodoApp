export interface Config {
  port: number;
  host: string;
  database: {
    host: string;
    port: number;
    name: string;
    user: string;
    password: string;
    ssl: boolean;
  };
  logging: {
    level: string;
  };
}

export const config: Config = {
  port: parseInt(process.env['PORT'] || '50051', 10),
  host: process.env['HOST'] || '0.0.0.0',
  database: {
    host: process.env['DB_HOST'] || 'localhost',
    port: parseInt(process.env['DB_PORT'] || '5432', 10),
    name: process.env['DB_NAME'] || 'todoapp',
    user: process.env['DB_USER'] || 'postgres',
    password: process.env['DB_PASSWORD'] || 'password',
    ssl: process.env['DB_SSL'] === 'true',
  },
  logging: {
    level: process.env['LOG_LEVEL'] || 'info',
  },
};