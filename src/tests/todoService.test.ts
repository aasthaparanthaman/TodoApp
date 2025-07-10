import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import path from 'path';
import { getServer } from '../api/server';
import database from '../db';

describe('TodoService gRPC', () => {
  let server: grpc.Server;
  let client: any;
  const PORT = 50052;
  const PROTO_PATH = path.join(__dirname, '..', 'api', 'todo.proto');

  beforeAll(async () => {
    await database.initialize();
    server = getServer();

    return new Promise<void>((resolve, reject) => {
      server.bindAsync(
        `0.0.0.0:${PORT}`,
        grpc.ServerCredentials.createInsecure(),
        (err: Error | null) => {
          if (err) {
            reject(err);
            return;
          }
          server.start();
          resolve();
        }
      );
    });
  });

  beforeEach(async () => {
    const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
      keepCase: true,
      longs: String,
      enums: String,
      defaults: true,
      oneofs: true,
    });

    const todoProto = grpc.loadPackageDefinition(packageDefinition) as any;
    client = new todoProto.todo.TodoService(
      `localhost:${PORT}`,
      grpc.credentials.createInsecure()
    );
    await database.query('DELETE FROM todos WHERE title LIKE $1', ['Test%']);
  });

  afterAll(async () => {
    if (client) {
      client.close();
    }

    if (server) {
      return new Promise<void>((resolve) => {
        server.tryShutdown(() => {
          resolve();
        });
      });
    }
  });

  describe('CreateTodo', () => {
    it('should create a new todo successfully', (done) => {
      const request = {
        title: 'Test Todo',
        description: 'Test Description',
      };

      client.CreateTodo(request, (err: any, response: any) => {
        expect(err).toBeNull();
        expect(response.success).toBe(true);
        expect(response.message).toBe('Todo created successfully');
        expect(response.todo).toBeDefined();
        expect(response.todo.title).toBe(request.title);
        expect(response.todo.description).toBe(request.description);
        expect(response.todo.completed).toBe(false);
        expect(response.todo.id).toBeGreaterThan(0);
        done();
      });
    });

    it('should return error for empty title', (done) => {
      const request = {
        title: '',
        description: 'Test Description',
      };

      client.CreateTodo(request, (err: any, _response: any) => {
        expect(err).toBeDefined();
        expect(err.code).toBe(grpc.status.INVALID_ARGUMENT);
        expect(err.message).toBe('Title is required');
        done();
      });
    });
  });

  describe('GetTodo', () => {
    let createdTodoId: number;

    beforeEach((done) => {
      const request = {
        title: 'Test Get Todo',
        description: 'Test Description for Get',
      };

      client.CreateTodo(request, (err: any, response: any) => {
        expect(err).toBeNull();
        createdTodoId = response.todo.id;
        done();
      });
    });

    it('should retrieve a todo by ID', (done) => {
      const request = { id: createdTodoId };

      client.GetTodo(request, (err: any, response: any) => {
        expect(err).toBeNull();
        expect(response.success).toBe(true);
        expect(response.todo.id).toBe(createdTodoId);
        expect(response.todo.title).toBe('Test Get Todo');
        done();
      });
    });

    it('should return error for non-existent todo', (done) => {
      const request = { id: 999999 };

      client.GetTodo(request, (err: any, _response: any) => {
        expect(err).toBeDefined();
        expect(err.code).toBe(grpc.status.NOT_FOUND);
        expect(err.message).toBe('Todo not found');
        done();
      });
    });

    it('should return error for invalid ID', (done) => {
      const request = { id: 0 };

      client.GetTodo(request, (err: any, _response: any) => {
        expect(err).toBeDefined();
        expect(err.code).toBe(grpc.status.INVALID_ARGUMENT);
        expect(err.message).toBe('Valid ID is required');
        done();
      });
    });
  });

  describe('GetAllTodos', () => {
    beforeEach(async () => {
      const todos = [
        { title: 'Test Todo 1', description: 'Description 1' },
        { title: 'Test Todo 2', description: 'Description 2' },
        { title: 'Test Todo 3', description: 'Description 3' },
      ];

      for (const todo of todos) {
        await new Promise<void>((resolve) => {
          client.CreateTodo(todo, () => resolve());
        });
      }
    });

    it('should retrieve all todos with pagination', (done) => {
      const request = { page: 1, limit: 10 };

      client.GetAllTodos(request, (err: any, response: any) => {
        expect(err).toBeNull();
        expect(response.success).toBe(true);
        expect(response.todos).toBeDefined();
        expect(Array.isArray(response.todos)).toBe(true);
        expect(response.todos.length).toBeGreaterThanOrEqual(3);
        expect(response.total).toBeGreaterThanOrEqual(3);
        expect(response.page).toBe(1);
        expect(response.limit).toBe(10);
        done();
      });
    });
  });

  describe('UpdateTodo', () => {
    let createdTodoId: number;

    beforeEach((done) => {
      const request = {
        title: 'Test Update Todo',
        description: 'Original Description',
      };

      client.CreateTodo(request, (err: any, response: any) => {
        expect(err).toBeNull();
        createdTodoId = response.todo.id;
        done();
      });
    });

    it('should update a todo successfully', (done) => {
      const request = {
        id: createdTodoId,
        title: 'Updated Title',
        description: 'Updated Description',
        completed: true,
      };

      client.UpdateTodo(request, (err: any, response: any) => {
        expect(err).toBeNull();
        expect(response.success).toBe(true);
        expect(response.todo.title).toBe('Updated Title');
        expect(response.todo.description).toBe('Updated Description');
        expect(response.todo.completed).toBe(true);
        done();
      });
    });
  });

  describe('CompleteTodo', () => {
    let createdTodoId: number;

    beforeEach((done) => {
      const request = {
        title: 'Test Complete Todo',
        description: 'To be completed',
      };

      client.CreateTodo(request, (err: any, response: any) => {
        expect(err).toBeNull();
        createdTodoId = response.todo.id;
        done();
      });
    });

    it('should mark todo as completed', (done) => {
      const request = { id: createdTodoId };

      client.CompleteTodo(request, (err: any, response: any) => {
        expect(err).toBeNull();
        expect(response.success).toBe(true);
        expect(response.todo.completed).toBe(true);
        done();
      });
    });
  });

  describe('DeleteTodo', () => {
    let createdTodoId: number;

    beforeEach((done) => {
      const request = {
        title: 'Test Delete Todo',
        description: 'To be deleted',
      };

      client.CreateTodo(request, (err: any, response: any) => {
        expect(err).toBeNull();
        createdTodoId = response.todo.id;
        done();
      });
    });

    it('should delete a todo successfully', (done) => {
      const request = { id: createdTodoId };

      client.DeleteTodo(request, (err: any, response: any) => {
        expect(err).toBeNull();
        expect(response.success).toBe(true);
        expect(response.message).toBe('Todo deleted successfully');

        client.GetTodo({ id: createdTodoId }, (err: any, _response: any) => {
          expect(err).toBeDefined();
          expect(err.code).toBe(grpc.status.NOT_FOUND);
          done();
        });
      });
    });
  });
});