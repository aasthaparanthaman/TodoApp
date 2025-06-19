import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import path from 'path';
import { config } from '../config';
import { todoServiceImplementation } from '../services/todoService';
import logger from '../config/logger';

const PROTO_PATH = path.join(__dirname, 'todo.proto');

const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
  includeDirs: [
    path.join(__dirname),
    path.join(__dirname, './google/api'),
  ],
});

const todoProto = grpc.loadPackageDefinition(packageDefinition) as any;

function getServer(): grpc.Server {
  const server = new grpc.Server();

  server.addService(
    todoProto.todo.TodoService.service,
    todoServiceImplementation
  );

  return server;
}

async function startServer(): Promise<void> {
  const server = getServer();
  const PORT = config.port || 50051;
  const host = config.host || '0.0.0.0';
  const address = `${host}:${PORT}`;

  return new Promise((resolve, reject) => {
    server.bindAsync(
      address,
      grpc.ServerCredentials.createInsecure(),
      (err) => {
        if (err) {
          logger.error('Failed to bind server:', err);
          reject(err);
        } else {
          logger.info(`gRPC server running at ${address}`);
          server.start();
          resolve();
        }
      }
    );
  });
}

export { getServer, startServer };
