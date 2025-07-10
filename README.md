# Kong API Gateway

A high-performance, gRPC-based to-do application built with TypeScript, PostgreSQL, and Docker, now extended with a Kong API Gateway. This setup provides a robust, secure, and scalable API layer for managing todo items with full CRUD operations, type safety, plugin-based request validation, and seamless HTTP-to-gRPC transcoding, all containerized for easy deployment.

## 🚀 Features

- **gRPC API**: High-performance, strongly-typed API using Protocol Buffers
- **TypeScript**: Full type safety and modern language features
- **PostgreSQL**: Reliable relational database with optimized queries
- **Docker**: Containerized deployment with docker-compose
- **Comprehensive Testing**: Unit and integration tests with Jest
- **Code Quality**: ESLint and Prettier for consistent code style
- **Structured Logging**: Winston logger with configurable levels
- **Health Checks**: Built-in health monitoring for containers

## 📋 API Operations

The gRPC service supports the following operations:

- `CreateTodo` - Create a new todo item
- `GetTodo` - Retrieve a todo by ID
- `GetAllTodos` - Get all todos with pagination
- `UpdateTodo` - Update an existing todo
- `DeleteTodo` - Delete a todo
- `CompleteTodo` - Mark a todo as completed

## 🏗 Project Structure

```
grpc-todo-app/
├── src/
│   ├── api/
│   │   ├── server.ts                  # gRPC server setup
│   │   ├── todo.proto                 # Protocol Buffer definitions for the Todo service
│   │   └── google/
│   │       └── api/
│   │           ├── annotations.proto # Google API annotations for HTTP mapping
│   │           └── http.proto        # HTTP rules for gRPC transcoding
│   ├── config/
│   │   ├── index.ts                  # Centralized app configuration
│   │   └── logger.ts                 # Winston-based logging setup
│   ├── db/
│   │   ├── index.ts                  # Database connection setup (PostgreSQL)
│   │   └── init.sql                  # SQL schema for the todos table
│   ├── services/
│   │   └── todoService.ts            # Business logic for CRUD operations
│   └── tests/
│       ├── setup.ts                 # Test setup and environment
│       └── todoService.test.ts      # Integration tests for todo service
├── kong-custom/
│   ├── kong/
│   │   └── plugins/
│   │       ├── grpc-transcode/
│   │       │   ├── handler.lua       # Handles HTTP-to-gRPC request transcoding
│   │       │   └── schema.lua        # Plugin configuration schema
│   │       └── pre-function/
│   │           ├── handler.lua       # Executes validation logic before upstream
│   │           ├── pre_validation.lua# Custom input validation logic for endpoints
│   │           └── schema.lua        # Plugin configuration schema
│   └── kong-plugin/
│       └── grpc-gateway/
│           ├── deco.lua              # gRPC message decoder/encoder helpers
│           ├── handler.lua           # Custom gRPC gateway plugin logic
│           └── schema.lua            # Plugin configuration schema
├── kong.yml                          # Declarative configuration for Kong services/routes/plugins
├── docker-compose.yml               # Multi-container Docker setup (App, DB, Kong)
├── Dockerfile                       # Dockerfile for the gRPC Node.js app
├── Dockerfile.kong                  # Dockerfile for custom Kong Gateway with plugins
├── package.json                     # App dependencies and scripts
├── package-lock.json                # Locked dependency versions
├── tsconfig.json                    # TypeScript compiler configuration
├── jest.config.js                   # Test runner configuration
├── .eslintrc.js                     # ESLint linting rules
├── .prettierrc                      # Prettier formatting rules
├── .env.example                     # Sample environment variables
├── .dockerignore                    # Ignore rules for Docker build context
├── .gitignore                       # Ignore rules for Git
├── README.md                        # Project overview and documentation
├── logs/                            # Runtime logs (if any)
└── node_modules/                    # Installed npm packages
```

## 🐛 Running the Kong API Gateway

1. **Shutting down the docker container**
   ```bash
   docker-compose down -v
   ```

2. **Building the kong container**
   ```bash
   docker compose build kong
   ```

3. **Starting up the Docker container**
   ```bash
   docker-compose up -d
   ```

3. **All execute permissions to the setup file**
   ```bash
   chmod +x setup-kong.sh
   ```

4. **Run the setup file**
   ```bash
   ./setup-kong.sh
   ```

5. **Open the Kong Manager UI**
   ```bash
   #Open this link in the browser
   http://localhost:8002
   ```

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.