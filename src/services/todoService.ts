import * as grpc from '@grpc/grpc-js';
import database from '../db';
import logger from '../config/logger';
import { jwtVerify, importX509 } from 'jose';

export interface Todo {
  id: number;
  title: string;
  description: string;
  completed: boolean;
  user_id: number;
  created_at: string;
  updated_at: string;
}

export interface User {
  id: number;
  username: string;
  email: string;
}

interface GetTodoRequest {
  id: number;
}

interface TodoResponse {
  success: boolean;
  message: string;
  todo?: Todo;
}

interface CreateTodoRequest {
  title: string;
  description?: string;
  user_id?: number;
}

interface UpdateTodoRequest {
  id: number;
  title: string;
  description?: string;
  completed: boolean;
  user_id?: number;
}

interface GetAllTodosRequest {
  page?: number;
  limit?: number;
  user_id?: number;
}

interface GetAllTodosResponse {
  success: boolean;
  message: string;
  todos: Todo[];
  total: number;
  page: number;
  limit: number;
}

interface DeleteTodoRequest {
  id: number;
  user_id?: number;
}

interface DeleteTodoResponse {
  success: boolean;
  message: string;
}

interface CompleteTodoRequest {
  id: number;
  user_id?: number;
}

const PUBLIC_CERT = process.env['JWT_CERT_PEM']!;

export async function extractUserIdFromToken(call: grpc.ServerUnaryCall<any, any>): Promise<number> {
  const metadata = call.metadata.getMap();
  const authHeader = metadata['authorization'] as string;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new Error('Missing or invalid Authorization header');
  }

  const token = authHeader.replace('Bearer ', '').trim();

  try {
    const publicKey = await importX509(PUBLIC_CERT, 'RS256');
    const { payload } = await jwtVerify(token, publicKey);

    const user_id = payload['user_id'] || payload['userId'];
    if (!user_id || typeof user_id !== 'number') {
      throw new Error('Invalid or missing user_id in JWT payload');
    }

    return user_id;
  } catch (err) {
    throw new Error('JWT verification failed');
  }
}

function todoRowToProto(row: any): Todo {
  return {
    id: row.id,
    title: row.title,
    description: row.description || '',
    completed: row.completed,
    user_id: row.user_id,
    created_at: row.created_at.toISOString(),
    updated_at: row.updated_at.toISOString(),
  };
}

export const todoServiceImplementation = {
  GetTodo: async (
    call: grpc.ServerUnaryCall<GetTodoRequest, TodoResponse>,
    callback: grpc.sendUnaryData<TodoResponse>
  ) => {
    try {
      const { id } = call.request;
      const user_id = await extractUserIdFromToken(call);

      const result = await database.query(
        'SELECT * FROM todos WHERE id = $1 AND user_id = $2',
        [id, user_id]
      );

      if (result.rows.length === 0) {
        return callback({
          code: grpc.status.NOT_FOUND,
          message: `Todo with ID ${id} not found.`,
        });
      }

      const todo = todoRowToProto(result.rows[0]);
      callback(null, {
        success: true,
        message: `Todo "${todo.title}" retrieved successfully!`,
        todo,
      });
    } catch (error) {
      logger.error('Error retrieving todo:', error);
      callback({
        code: grpc.status.INTERNAL,
        message: 'Failed to retrieve todo due to a server error. Please try again later.',
      });
    }
  },

  CreateTodo: async (
    call: grpc.ServerUnaryCall<CreateTodoRequest, TodoResponse>,
    callback: grpc.sendUnaryData<TodoResponse>
  ) => {
    try {
      const user_id = await extractUserIdFromToken(call);
      const { title, description } = call.request;

      const result = await database.query(
        'INSERT INTO todos (title, description, user_id, created_at, updated_at) VALUES ($1, $2, $3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP) RETURNING *',
        [title.trim(), description || '', user_id]
      );

      const todo = todoRowToProto(result.rows[0]);
      callback(null, {
        success: true,
        message: `Todo "${title}" created successfully!`,
        todo,
      });
    } catch (error) {
      logger.error('Error creating todo:', error);
      callback({
        code: grpc.status.INTERNAL,
        message: 'Failed to create todo due to a server error. Please try again later.',
      });
    }
  },

  GetAllTodos: async (
    call: grpc.ServerUnaryCall<GetAllTodosRequest, GetAllTodosResponse>,
    callback: grpc.sendUnaryData<GetAllTodosResponse>
  ) => {
    try {
      const user_id = await extractUserIdFromToken(call);
      const { page = 1, limit = 10 } = call.request;

      const offset = (page - 1) * limit;

      const todosResult = await database.query(
        'SELECT * FROM todos WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3',
        [user_id, limit, offset]
      );

      const countResult = await database.query(
        'SELECT COUNT(*) FROM todos WHERE user_id = $1',
        [user_id]
      );

      const total = parseInt(countResult.rows[0].count, 10);
      const todos = todosResult.rows.map(todoRowToProto);

      const message = total === 0
        ? 'No todos found. Create your first todo to get started!'
        : `Found ${total} todo${total === 1 ? '' : 's'}. Showing page ${page} of ${Math.ceil(total / limit)}.`;

      callback(null, {
        success: true,
        message,
        todos,
        total,
        page,
        limit,
      });
    } catch (error) {
      logger.error('Error getting all todos:', error);
      callback({
        code: grpc.status.INTERNAL,
        message: 'Failed to retrieve todos due to a server error. Please try again later.',
      });
    }
  },

  UpdateTodo: async (
    call: grpc.ServerUnaryCall<UpdateTodoRequest, TodoResponse>,
    callback: grpc.sendUnaryData<TodoResponse>
  ) => {
    try {
      const user_id = await extractUserIdFromToken(call);
      const { title, description, completed } = call.request;
      const id = parseInt(call.request.id?.toString() || '0', 10);

      const result = await database.query(
        'UPDATE todos SET title = $1, description = $2, completed = $3, updated_at = CURRENT_TIMESTAMP WHERE id = $4 AND user_id = $5 RETURNING *',
        [title.trim(), description || '', completed, id, user_id]
      );

      if (result.rows.length === 0) {
        return callback({
          code: grpc.status.NOT_FOUND,
          message: `Todo with ID ${id} not found.`,
        });
      }

      const todo = todoRowToProto(result.rows[0]);
      callback(null, {
        success: true,
        message: `Todo "${title}" updated successfully!`,
        todo,
      });
    } catch (error) {
      logger.error('Error updating todo:', error);
      callback({
        code: grpc.status.INTERNAL,
        message: 'Failed to update todo due to a server error. Please try again later.',
      });
    }
  },

  DeleteTodo: async (
    call: grpc.ServerUnaryCall<DeleteTodoRequest, DeleteTodoResponse>,
    callback: grpc.sendUnaryData<DeleteTodoResponse>
  ) => {
    try {
      const user_id = await extractUserIdFromToken(call);
      const id = parseInt(call.request.id?.toString() || '0', 10);

      const result = await database.query(
        'DELETE FROM todos WHERE id = $1 AND user_id = $2 RETURNING title',
        [id, user_id]
      );

      if (result.rows.length === 0) {
        return callback({
          code: grpc.status.NOT_FOUND,
          message: `Todo with ID ${id} not found.`,
        });
      }

      const deletedTitle = result.rows[0].title;
      callback(null, {
        success: true,
        message: `Todo "${deletedTitle}" deleted successfully!`,
      });
    } catch (error) {
      logger.error('Error deleting todo:', error);
      callback({
        code: grpc.status.INTERNAL,
        message: 'Failed to delete todo due to a server error. Please try again later.',
      });
    }
  },

  CompleteTodo: async (
    call: grpc.ServerUnaryCall<CompleteTodoRequest, TodoResponse>,
    callback: grpc.sendUnaryData<TodoResponse>
  ) => {
    try {
      const user_id = await extractUserIdFromToken(call);
      const id = parseInt(call.request.id?.toString() || '0', 10);

      const result = await database.query(
        'UPDATE todos SET completed = true, updated_at = CURRENT_TIMESTAMP WHERE id = $1 AND user_id = $2 RETURNING *',
        [id, user_id]
      );

      if (result.rows.length === 0) {
        return callback({
          code: grpc.status.NOT_FOUND,
          message: `Todo with ID ${id} not found.`,
        });
      }

      const todo = todoRowToProto(result.rows[0]);
      callback(null, {
        success: true,
        message: `Todo "${todo.title}" marked as completed!`,
        todo,
      });
    } catch (error) {
      logger.error('Error completing todo:', error);
      callback({
        code: grpc.status.INTERNAL,
        message: 'Failed to complete todo due to a server error. Please try again later.',
      });
    }
  },
};