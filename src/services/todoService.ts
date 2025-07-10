import * as grpc from '@grpc/grpc-js';
import * as jwt from 'jsonwebtoken';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import database from '../db';
import logger from '../config/logger';
import { JwtPayload } from 'jsonwebtoken';

const JWT_SECRET = process.env['JWT_SECRET'] || 'your-secret-key-here';
const JWT_ISSUER = process.env['JWT_ISSUER'] || 'todo-app-issuer';

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

interface LoginRequest {
  username: string;
  password: string;
}

interface LoginResponse {
  success: boolean;
  message: string;
  token?: string;
  user_id?: number;
  user?: User;
}

interface RegisterRequest {
  username: string;
  password: string;
  email: string;
}

interface RegisterResponse {
  success: boolean;
  message: string;
  user_id?: number;
}

export function extractUserIdFromToken(call: grpc.ServerUnaryCall<any, any>): number {
  const metadata = call.metadata.getMap();
  const authHeader = metadata['authorization'] as string;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new Error('No Bearer token found in metadata');
  }

  const token = authHeader.replace('Bearer ', '').trim();

  let payload: JwtPayload;
  try {
    payload = jwt.verify(token, JWT_SECRET) as JwtPayload;
  } catch (err) {
    throw new Error('Invalid or expired JWT token');
  }

  const user_id = payload['user_id'] || payload['userId'];

  if (!user_id || typeof user_id !== 'number') {
    throw new Error('user_id not found or invalid in token payload');
  }

  return user_id;
}

function generateSessionToken(): string {
  return uuidv4();
}

function generateJWT(userId: number, username: string, sessionToken: string): string {
  return jwt.sign(
    {
      userId,
      username,
      sessionToken,
      iss: JWT_ISSUER,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60)
    },
    JWT_SECRET,
    { algorithm: 'HS256' }
  );
}

function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

function validatePassword(password: string): { valid: boolean; message?: string } {
  if (password.length < 6) {
    return { valid: false, message: 'Password must be at least 6 characters long' };
  }
  return { valid: true };
}

function validateUserId(userId: number): boolean {
  return userId !== undefined && userId !== null && userId > 0;
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
  Login: async (
    call: grpc.ServerUnaryCall<LoginRequest, LoginResponse>,
    callback: grpc.sendUnaryData<LoginResponse>
  ) => {
    try {
      const { username, password } = call.request;

      if (!username || !password) {
        return callback({
          code: grpc.status.INVALID_ARGUMENT,
          message: 'Username and password are required',
        });
      }

      logger.info(`Login attempt for username: ${username}`);

      const result = await database.query(
        'SELECT id, username, email, password_hash FROM users WHERE username = $1',
        [username]
      );

      if (result.rows.length === 0) {
        logger.warn(`Login failed - user not found: ${username}`);
        return callback({
          code: grpc.status.UNAUTHENTICATED,
          message: 'Invalid username or password. Please check your credentials and try again.',
        });
      }

      const user = result.rows[0];
      const isValidPassword = await bcrypt.compare(password, user.password_hash);

      if (!isValidPassword) {
        logger.warn(`Login failed - invalid password for user: ${username}`);
        return callback({
          code: grpc.status.UNAUTHENTICATED,
          message: 'Invalid username or password. Please check your credentials and try again.',
        });
      }

      const sessionToken = generateSessionToken();
      const jwtToken = generateJWT(user.id, user.username, sessionToken);

      try {
        await database.query(
          'INSERT INTO user_sessions (user_id, session_token, jwt_token, expires_at) VALUES ($1, $2, $3, $4) ON CONFLICT (user_id) DO UPDATE SET session_token = $2, jwt_token = $3, expires_at = $4',
          [user.id, sessionToken, jwtToken, new Date(Date.now() + 24 * 60 * 60 * 1000)]
        );
      } catch (sessionError) {
        logger.warn('Could not store session (sessions table may not exist):', sessionError);
      }

      logger.info(`User ${username} (ID: ${user.id}) logged in successfully`);
      callback(null, {
        success: true,
        message: `Welcome back, ${user.username}! Login successful.`,
        token: jwtToken,
        user_id: user.id,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
        },
      });

    } catch (error) {
      logger.error('Error during login:', error);
      callback({
        code: grpc.status.INTERNAL,
        message: 'Login failed due to a server error. Please try again later.',
      });
    }
  },

  Register: async (
    call: grpc.ServerUnaryCall<RegisterRequest, RegisterResponse>,
    callback: grpc.sendUnaryData<RegisterResponse>
  ) => {
    try {
      const { username, password, email } = call.request;

      console.log('Register request received:', { username, email });

      if (!username || !password || !email) {
        return callback({
          code: grpc.status.INVALID_ARGUMENT,
          message: 'Username, password, and email are required to create an account.',
        });
      }

      if (!validateEmail(email)) {
        return callback({
          code: grpc.status.INVALID_ARGUMENT,
          message: 'Please enter a valid email address (e.g., user@example.com).',
        });
      }

      const passwordValidation = validatePassword(password);
      if (!passwordValidation.valid) {
        return callback({
          code: grpc.status.INVALID_ARGUMENT,
          message: passwordValidation.message,
        });
      }

      if (!/^[a-zA-Z0-9_]+$/.test(username)) {
        return callback({
          code: grpc.status.INVALID_ARGUMENT,
          message: 'Username can only contain letters, numbers, and underscores.',
        });
      }

      if (username.length < 3 || username.length > 50) {
        return callback({
          code: grpc.status.INVALID_ARGUMENT,
          message: 'Username must be between 3 and 50 characters long.',
        });
      }

      console.log('Checking for existing username and email');

      const existingUsername = await database.query(
        'SELECT id FROM users WHERE username = $1',
        [username]
      );

      if (existingUsername.rows.length > 0) {
        console.warn(`Username already exists: ${username}`);
        return callback({
          code: grpc.status.ALREADY_EXISTS,
          message: `The username '${username}' is already taken.`,
        });
      }

      const existingEmail = await database.query(
        'SELECT id FROM users WHERE email = $1',
        [email]
      );

      if (existingEmail.rows.length > 0) {
        console.warn(`Email already exists: ${email}`);
        return callback({
          code: grpc.status.ALREADY_EXISTS,
          message: `The email '${email}' is already registered.`,
        });
      }

      const passwordHash = await bcrypt.hash(password, 12);

      const newUser = await database.query(
        'INSERT INTO users (username, email, password_hash, created_at, updated_at) VALUES ($1, $2, $3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP) RETURNING id',
        [username, email, passwordHash]
      );

      const userId = newUser.rows[0].id;

      console.log(`User created: ID ${userId}, username: ${username}`);

      callback(null, {
        success: true,
        message: `Welcome ${username}, your account has been created!`,
        user_id: userId,
      });
    } catch (error) {
      console.error('Error during registration:', error);
      callback({
        code: grpc.status.INTERNAL,
        message: 'Registration failed due to a server error.',
      });
    }
  },

  GetTodo: async (

    call: grpc.ServerUnaryCall<GetTodoRequest, TodoResponse>,
    callback: grpc.sendUnaryData<TodoResponse>
  ) => {
    try {
      const { id } = call.request;

      let user_id: number;
      try {
        user_id = extractUserIdFromToken(call);
        console.log("Extracted user_id from token:", user_id);
      } catch (error) {
        console.error("Failed to extract user_id:", error);
        return callback({
          code: grpc.status.UNAUTHENTICATED,
          message: 'Authentication required...',
        });
      }

      if (!validateUserId(user_id)) {
        return callback({
          code: grpc.status.INVALID_ARGUMENT,
          message: 'Valid user authentication is required.',
        });
      }

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
      let user_id: number;
      try {
        user_id = extractUserIdFromToken(call);
      } catch (error) {
        console.error("Failed to extract user_id:", error);
        return callback({
          code: grpc.status.UNAUTHENTICATED,
          message: 'Authentication required. Please provide a valid token, user-id header, or user_id in request body.',
        });
      }
      const { title, description } = call.request;

      if (!validateUserId(user_id)) {
        return callback({
          code: grpc.status.INVALID_ARGUMENT,
          message: 'Valid user authentication is required to create todos.',
        });
      }

      if (!title || title.trim() === '') {
        return callback({
          code: grpc.status.INVALID_ARGUMENT,
          message: 'Todo title is required and cannot be empty.',
        });
      }

      if (title.length > 255) {
        return callback({
          code: grpc.status.INVALID_ARGUMENT,
          message: 'Todo title must be less than 255 characters long.',
        });
      }

      if (description && description.length > 1000) {
        return callback({
          code: grpc.status.INVALID_ARGUMENT,
          message: 'Todo description must be less than 1000 characters long.',
        });
      }

      logger.info(`Creating todo with title: ${title} for user ID: ${user_id}`);
      let result;
      console.log("Inserting todo into DB with:", {
        title,
        description,
        user_id,
      });

      try {
        logger.info("Running INSERT query with values:", title, description, user_id);
        result = await database.query(
          'INSERT INTO todos (title, description, user_id, created_at, updated_at) VALUES ($1, $2, $3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP) RETURNING *',
          [title.trim(), description || '', user_id]
        );

        logger.info("Insert successful, result:", result);
      } catch (dbError) {
        if (dbError instanceof Error) {
          console.error("DB insert failed:", dbError.message, dbError.stack);
        } else {
          console.error("DB insert failed with non-Error object:", dbError);
        }
        return callback({
          code: grpc.status.INTERNAL,
          message: "Database error while creating todo. Please try again later.",
        });
      }
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
      let user_id: number;
      try {
        user_id = extractUserIdFromToken(call);
      } catch (error) {
        return callback({
          code: grpc.status.UNAUTHENTICATED,
          message: 'Authentication required. Please provide a valid token, user-id header, or user_id in request body.',
        });
      }

      const { page = 1, limit = 10 } = call.request;

      if (!validateUserId(user_id)) {
        return callback({
          code: grpc.status.INVALID_ARGUMENT,
          message: 'Valid user authentication is required to retrieve todos.',
        });
      }

      if (page <= 0 || limit <= 0) {
        return callback({
          code: grpc.status.INVALID_ARGUMENT,
          message: 'Page and limit must be positive integers.',
        });
      }

      if (limit > 100) {
        return callback({
          code: grpc.status.INVALID_ARGUMENT,
          message: 'Limit cannot exceed 100 todos per page.',
        });
      }

      const offset = (page - 1) * limit;

      logger.info(`Getting all todos for user ID: ${user_id} - page: ${page}, limit: ${limit}`);

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

      logger.info(`Retrieved ${todos.length} todos for user ID: ${user_id}`);
      callback(null, {
        success: true,
        message: message,
        todos: todos,
        total: total,
        page: page,
        limit: limit,
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
      let user_id: number;
      try {
        user_id = extractUserIdFromToken(call);
      } catch (error) {
        return callback({
          code: grpc.status.UNAUTHENTICATED,
          message: 'Authentication required. Please provide a valid token, user-id header, or user_id in request body.',
        });
      }

      const { title, description, completed } = call.request;
      const id = parseInt(call.request.id?.toString() || '0', 10);

      if (!validateUserId(user_id)) {
        return callback({
          code: grpc.status.INVALID_ARGUMENT,
          message: 'Valid user authentication is required to update todos.',
        });
      }

      if (!id || id <= 0 || isNaN(id)) {
        return callback({
          code: grpc.status.INVALID_ARGUMENT,
          message: 'Valid todo ID is required.',
        });
      }

      if (!title || title.trim() === '') {
        return callback({
          code: grpc.status.INVALID_ARGUMENT,
          message: 'Todo title is required and cannot be empty.',
        });
      }

      if (title.length > 255) {
        return callback({
          code: grpc.status.INVALID_ARGUMENT,
          message: 'Todo title must be less than 255 characters long.',
        });
      }

      if (description && description.length > 1000) {
        return callback({
          code: grpc.status.INVALID_ARGUMENT,
          message: 'Todo description must be less than 1000 characters long.',
        });
      }

      logger.info(`Updating todo with ID: ${id} for user ID: ${user_id}`);

      const result = await database.query(
        'UPDATE todos SET title = $1, description = $2, completed = $3, updated_at = CURRENT_TIMESTAMP WHERE id = $4 AND user_id = $5 RETURNING *',
        [title.trim(), description || '', completed, id, user_id]
      );

      if (result.rows.length === 0) {
        return callback({
          code: grpc.status.NOT_FOUND,
          message: `Todo with ID ${id} not found. It may have been deleted or you don't have permission to update it.`,
        });
      }

      const todo = todoRowToProto(result.rows[0]);

      logger.info(`Todo updated successfully: ${JSON.stringify(todo)}`);
      callback(null, {
        success: true,
        message: `Todo "${title}" updated successfully!`,
        todo: todo,
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
      let user_id: number;
      try {
        user_id = extractUserIdFromToken(call);
      } catch (error) {
        return callback({
          code: grpc.status.UNAUTHENTICATED,
          message: 'Authentication required. Please provide a valid token, user-id header, or user_id in request body.',
        });
      }

      const id = parseInt(call.request.id?.toString() || '0', 10);

      if (!validateUserId(user_id)) {
        return callback({
          code: grpc.status.INVALID_ARGUMENT,
          message: 'Valid user authentication is required to delete todos.',
        });
      }

      if (!id || id <= 0 || isNaN(id)) {
        return callback({
          code: grpc.status.INVALID_ARGUMENT,
          message: 'Valid todo ID is required.',
        });
      }

      logger.info(`Deleting todo with ID: ${id} for user ID: ${user_id}`);

      const result = await database.query(
        'DELETE FROM todos WHERE id = $1 AND user_id = $2 RETURNING title',
        [id, user_id]
      );

      if (result.rows.length === 0) {
        return callback({
          code: grpc.status.NOT_FOUND,
          message: `Todo with ID ${id} not found. It may have already been deleted or you don't have permission to delete it.`,
        });
      }

      const deletedTitle = result.rows[0].title;

      logger.info(`Todo deleted successfully with ID: ${id} for user ID: ${user_id}`);
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
      let user_id: number;
      try {
        user_id = extractUserIdFromToken(call);
      } catch (error) {
        return callback({
          code: grpc.status.UNAUTHENTICATED,
          message: 'Authentication required. Please provide a valid token, user-id header, or user_id in request body.',
        });
      }

      const id = parseInt(call.request.id?.toString() || '0', 10);

      if (!validateUserId(user_id)) {
        return callback({
          code: grpc.status.INVALID_ARGUMENT,
          message: 'Valid user authentication is required to complete todos.',
        });
      }

      if (!id || id <= 0 || isNaN(id)) {
        return callback({
          code: grpc.status.INVALID_ARGUMENT,
          message: 'Valid todo ID is required.',
        });
      }

      logger.info(`Marking todo as completed with ID: ${id} for user ID: ${user_id}`);

      const result = await database.query(
        'UPDATE todos SET completed = true, updated_at = CURRENT_TIMESTAMP WHERE id = $1 AND user_id = $2 RETURNING *',
        [id, user_id]
      );

      if (result.rows.length === 0) {
        return callback({
          code: grpc.status.NOT_FOUND,
          message: `Todo with ID ${id} not found. It may have been deleted or you don't have permission to complete it.`,
        });
      }

      const todo = todoRowToProto(result.rows[0]);

      logger.info(`Todo marked as completed: ${JSON.stringify(todo)}`);
      callback(null, {
        success: true,
        message: `Great job! Todo "${todo.title}" marked as completed!`,
        todo: todo,
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