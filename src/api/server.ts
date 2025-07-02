import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import path from 'path';
import { config } from '../config';
import { todoServiceImplementation } from '../services/todoService';
import logger from '../config/logger';
const grpcReflection = require('@grpc/reflection');

const PROTO_PATH = path.join(__dirname, '../api/todo.proto');

const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
  includeDirs: [
    path.join(__dirname, '../api'),
    path.join(__dirname, '../api/google/api'),
  ],
});

const todoProto = grpc.loadPackageDefinition(packageDefinition) as any;
logger.info(`Loaded proto keys: ${Object.keys(todoProto)}`);
logger.info(`todoProto.todo: ${JSON.stringify(todoProto.todo)}`);
if (!todoProto.todo || !todoProto.todo.TodoService) {
  logger.error("TodoService not found in loaded proto definition.");
  process.exit(1);
}

function getServer(): grpc.Server {
  const server = new grpc.Server();

  server.addService(
    todoProto.todo.TodoService.service,
    todoServiceImplementation
  );

  try {
    const reflection = new grpcReflection.ReflectionService(packageDefinition);
    server.addService(reflection.getServiceDefinition(), reflection.getImplementation());
    logger.info('gRPC reflection enabled');
  } catch (error) {
    logger.warn('Failed to enable gRPC reflection:', error);
  }

  return server;
}

async function startServer(): Promise<void> {
  const server = getServer();
  const port = Number(config.port) || 50051;
  const address = `0.0.0.0:${port}`;

  logger.info('trying to bind to ')
  logger.info(`Trying to bind to ${address}`);

  return new Promise((resolve, reject) => {
    server.bindAsync(
      address,
      grpc.ServerCredentials.createInsecure(),
      (err: Error | null, _boundPort: number) => {
        if (err) {
          logger.error('Failed to bind server:', err);
          reject(err);
        } else {
          logger.info(`gRPC server running at ${address} with reflection`);
          server.start();
          resolve();
        }
      }
    );
  });
}

export { getServer, startServer };