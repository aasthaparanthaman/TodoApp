import * as grpc from '@grpc/grpc-js';
import database, { TodoRow } from '../db';
import logger from '../config/logger';

// Define the Todo interface based on protobuf
export interface Todo {
  id: number;
  title: string;
  description: string;
  completed: boolean;
  created_at: string;
  updated_at: string;
}

// Convert database row to protobuf Todo
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

// gRPC service implementation
export const todoServiceImplementation = {
  CreateTodo: async (call: any, callback: any) => {
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

  GetTodo: async (call: any, callback: any) => {
    try {
      const { id } = call.request;

      if (!id || id <= 0) {
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
        return callback({
          code: grpc.status.NOT_FOUND,
          message: 'Todo not found',
        });
      }

      const todo = todoRowToProto(result.rows[0]);

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

  GetAllTodos: async (call: any, callback: any) => {
    try {
      const { page = 1, limit = 10 } = call.request;
      // const offset = (page - 1) * limit;

      // Get todos with pagination
      const todosResult = await database.query('SELECT * FROM todos');

      // Get total count
      const countResult = await database.query('SELECT COUNT(*) FROM todos');
      const total = parseInt(countResult.rows[0].count, 10);

      const todos = todosResult.rows.map(todoRowToProto);
      logger.info(JSON.stringify(todos));

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

  UpdateTodo: async (call: any, callback: any) => {
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
      logger.info(id, title, description, completed);

      const result = await database.query(
        'UPDATE todos SET title = $1, description = $2, completed = $3 WHERE id = $4 RETURNING *',
        [title.trim(), description || '', completed, id]
      );

      logger.info(JSON.stringify(result));

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

  DeleteTodo: async (call: any, callback: any) => {
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

  CompleteTodo: async (call: any, callback: any) => {
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
        'UPDATE todos SET completed = true WHERE id = $1 RETURNING *',
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
