import * as grpc from '@grpc/grpc-js';
import database, { TodoRow } from '../db';
import logger from '../config/logger';

export interface Todo {
  id: number;
  title: string;
  description: string;
  completed: boolean;
  created_at: string;
  updated_at: string;
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
}

interface UpdateTodoRequest {
  id: number;
  title: string;
  description?: string;
  completed: boolean;
}

interface GetAllTodosRequest {
  page?: number;
  limit?: number;
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
}

interface DeleteTodoResponse {
  success: boolean;
  message: string;
}

interface CompleteTodoRequest {
  id: number;
}

function todoRowToProto(row: TodoRow): Todo {
  return {
    id: row.id,
    title: row.title,
    description: row.description || '',
    completed: row.completed,
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
      if (!id || id <= 0) {
        logger.warn(`Invalid todo ID received: ${id}`);
        return callback({
          code: grpc.status.INVALID_ARGUMENT,
          message: 'Valid ID is required',
        });
      }

      logger.info(`Getting todo with ID: ${id}`);
      const result = await database.query('SELECT * FROM todos WHERE id = $1', [
        id,
      ]);
      if (result.rows.length === 0) {
        logger.info(`Todo with ID ${id} not found`);
        return callback({
          code: grpc.status.NOT_FOUND,
          message: `Todo with ID ${id} not found`,
        });
      }
      const todo = todoRowToProto(result.rows[0]);

      logger.info(`Successfully retrieved todo: ${JSON.stringify(todo)}`);
      callback(null, {
        success: true,
        message: 'Todo retrieved successfully',
        todo: todo,
      });

    } catch (error) {
      logger.error('Error getting todo:', error);
      callback({
        code: grpc.status.INTERNAL,
        message: 'Internal server error',
      });
    }
  },

  CreateTodo: async (
    call: grpc.ServerUnaryCall<CreateTodoRequest, TodoResponse>,
    callback: grpc.sendUnaryData<TodoResponse>
  ) => {
    try {
      const { title, description } = call.request;

      if (!title || title.trim() === '') {
        return callback({
          code: grpc.status.INVALID_ARGUMENT,
          message: 'Title is required',
        });
      }

      logger.info(`Creating todo with title: ${title}`);

      const result = await database.query(
        'INSERT INTO todos (title, description) VALUES ($1, $2) RETURNING *',
        [title.trim(), description || '']
      );

      const todo = todoRowToProto(result.rows[0]);

      callback(null, {
        success: true,
        message: 'Todo created successfully',
        todo: todo,
      });
    } catch (error) {
      logger.error('Error creating todo:', error);
      callback({
        code: grpc.status.INTERNAL,
        message: 'Internal server error',
      });
    }
  },

  GetAllTodos: async (
    call: grpc.ServerUnaryCall<GetAllTodosRequest, GetAllTodosResponse>,
    callback: grpc.sendUnaryData<GetAllTodosResponse>
  ) => {
    try {
      const { page = 1, limit = 10 } = call.request;
      const offset = (page - 1) * limit;

      logger.info(`Getting all todos - page: ${page}, limit: ${limit}`);
      const todosResult = await database.query(
        'SELECT * FROM todos ORDER BY created_at DESC LIMIT $1 OFFSET $2',
        [limit, offset]
      );

      const countResult = await database.query('SELECT COUNT(*) FROM todos');
      const total = parseInt(countResult.rows[0].count, 10);

      const todos = todosResult.rows.map(todoRowToProto);

      callback(null, {
        success: true,
        message: 'Todos retrieved successfully',
        todos: todos,
        total: total,
        page: page,
        limit: limit,
      });
    } catch (error) {
      logger.error('Error getting all todos:', error);
      callback({
        code: grpc.status.INTERNAL,
        message: 'Internal server error',
      });
    }
  },

  UpdateTodo: async (
    call: grpc.ServerUnaryCall<UpdateTodoRequest, TodoResponse>,
    callback: grpc.sendUnaryData<TodoResponse>
  ) => {
    try {
      const { id, title, description, completed } = call.request;

      if (!id || id <= 0) {
        return callback({
          code: grpc.status.INVALID_ARGUMENT,
          message: 'Valid ID is required',
        });
      }

      if (!title || title.trim() === '') {
        return callback({
          code: grpc.status.INVALID_ARGUMENT,
          message: 'Title is required',
        });
      }

      logger.info(`Updating todo with ID: ${id}`);

      const result = await database.query(
        'UPDATE todos SET title = $1, description = $2, completed = $3, updated_at = CURRENT_TIMESTAMP WHERE id = $4 RETURNING *',
        [title.trim(), description || '', completed, id]
      );

      if (result.rows.length === 0) {
        return callback({
          code: grpc.status.NOT_FOUND,
          message: 'Todo not found',
        });
      }

      const todo = todoRowToProto(result.rows[0]);

      callback(null, {
        success: true,
        message: 'Todo updated successfully',
        todo: todo,
      });
    } catch (error) {
      logger.error('Error updating todo:', error);
      callback({
        code: grpc.status.INTERNAL,
        message: 'Internal server error',
      });
    }
  },

  DeleteTodo: async (
    call: grpc.ServerUnaryCall<DeleteTodoRequest, DeleteTodoResponse>,
    callback: grpc.sendUnaryData<DeleteTodoResponse>
  ) => {
    try {
      const { id } = call.request;

      if (!id || id <= 0) {
        return callback({
          code: grpc.status.INVALID_ARGUMENT,
          message: 'Valid ID is required',
        });
      }

      logger.info(`Deleting todo with ID: ${id}`);

      const result = await database.query(
        'DELETE FROM todos WHERE id = $1 RETURNING *',
        [id]
      );

      if (result.rows.length === 0) {
        return callback({
          code: grpc.status.NOT_FOUND,
          message: 'Todo not found',
        });
      }

      callback(null, {
        success: true,
        message: 'Todo deleted successfully',
      });
    } catch (error) {
      logger.error('Error deleting todo:', error);
      callback({
        code: grpc.status.INTERNAL,
        message: 'Internal server error',
      });
    }
  },

  CompleteTodo: async (
    call: grpc.ServerUnaryCall<CompleteTodoRequest, TodoResponse>,
    callback: grpc.sendUnaryData<TodoResponse>
  ) => {
    try {
      const { id } = call.request;

      if (!id || id <= 0) {
        return callback({
          code: grpc.status.INVALID_ARGUMENT,
          message: 'Valid ID is required',
        });
      }

      logger.info(`Marking todo as completed with ID: ${id}`);

      const result = await database.query(
        'UPDATE todos SET completed = true, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *',
        [id]
      );

      if (result.rows.length === 0) {
        return callback({
          code: grpc.status.NOT_FOUND,
          message: 'Todo not found',
        });
      }

      const todo = todoRowToProto(result.rows[0]);

      callback(null, {
        success: true,
        message: 'Todo marked as completed',
        todo: todo,
      });
    } catch (error) {
      logger.error('Error completing todo:', error);
      callback({
        code: grpc.status.INTERNAL,
        message: 'Internal server error',
      });
    }
  },
};