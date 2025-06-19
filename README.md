# gRPC To-Do Application

A high-performance gRPC-based to-do application built with TypeScript, PostgreSQL, and Docker. This application provides a robust API for managing todo items with full CRUD operations, type safety, and containerized deployment.

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
│   │   ├── server.ts        # gRPC server setup
│   │   └── todo.proto       # Protocol Buffer definitions
│   ├── config/
│   │   ├── index.ts         # Application configuration
│   │   └── logger.ts        # Winston logger setup
│   ├── db/
│   │   ├── index.ts         # Database connection and utilities
│   │   └── init.sql         # Database schema initialization
│   ├── services/
│   │   └── todoService.ts   # Business logic implementation
│   ├── tests/
│   │   ├── setup.ts         # Test configuration
│   │   └── todoService.test.ts  # Integration tests
│   └── index.ts             # Application entry point
├── logs/                    # Application logs
├── docker-compose.yml       # Multi-service Docker setup
├── Dockerfile              # Application container definition
├── package.json            # Dependencies and scripts
├── tsconfig.json           # TypeScript configuration
├── jest.config.js          # Test configuration
├── .eslintrc.js           # ESLint configuration
└── .prettierrc            # Prettier configuration
```

## ⚡ Quick Start

### Prerequisites

- Node.js 18+ 
- Docker and Docker Compose
- PostgreSQL (if running locally)

### Using Docker (Recommended)

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd grpc-todo-app
   ```

2. **Start the application**
   ```bash
   docker-compose up -d
   ```

   This will start:
   - PostgreSQL database on port 5432
   - gRPC Todo service on port 50051

3. **Verify the deployment**
   ```bash
   docker-compose ps
   docker-compose logs todo-app
   ```

### Local Development

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Start PostgreSQL**
   ```bash
   docker run --name todo-postgres -e POSTGRES_PASSWORD=password -e POSTGRES_DB=todoapp -p 5432:5432 -d postgres:15-alpine
   ```

4. **Build and start the application**
   ```bash
   npm run build
   npm start
   
   # Or for development with auto-reload:
   npm run dev
   ```

## 🧪 Testing

### Run all tests
```bash
npm test
```

### Run tests with coverage
```bash
npm run test -- --coverage
```

### Run tests in watch mode
```bash
npm run test:watch
```

## 📝 Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `50051` | gRPC server port |
| `HOST` | `0.0.0.0` | Server host |
| `DB_HOST` | `localhost` | PostgreSQL host |
| `DB_PORT` | `5432` | PostgreSQL port |
| `DB_NAME` | `todoapp` | Database name |
| `DB_USER` | `postgres` | Database user |
| `DB_PASSWORD` | `password` | Database password |
| `DB_SSL` | `false` | Enable SSL for database |
| `LOG_LEVEL` | `info` | Logging level |
| `NODE_ENV` | `development` | Environment mode |

## 🔧 Development

### Code Formatting
```bash
npm run format        # Format code with Prettier
npm run lint          # Check code with ESLint
npm run lint:fix      # Fix ESLint issues
```

### Building
```bash
npm run build         # Compile TypeScript to JavaScript
```

### Database Operations
```bash
# Connect to database container
docker-compose exec postgres psql -U postgres -d todoapp

# View database logs
docker-compose logs postgres
```

## 📚 API Documentation

### Protocol Buffers Schema

The API is defined in `src/api/todo.proto`. Key message types:

- `Todo`: Represents a todo item with id, title, description, completed status, and timestamps
- `CreateTodoRequest`: Request to create a new todo
- `TodoResponse`: Standard response with success status, message, and todo data
- `GetAllTodosResponse`: Response for listing todos with pagination

### Example gRPC Client Usage

```typescript
import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';

const packageDefinition = protoLoader.loadSync('src/api/todo.proto');
const todoProto = grpc.loadPackageDefinition(packageDefinition) as any;

const client = new todoProto.todo.TodoService(
  'localhost:50051',
  grpc.credentials.createInsecure()
);

// Create a todo
client.CreateTodo({
  title: 'Learn gRPC',
  description: 'Build a todo app with gRPC and TypeScript'
}, (err, response) => {
  if (err) {
    console.error('Error:', err);
  } else {
    console.log('Created todo:', response.todo);
  }
});
```

## 🐛 Troubleshooting

### Common Issues

1. **Port already in use**
   ```bash
   # Change ports in docker-compose.yml or stop conflicting services
   docker-compose down
   ```

2. **Database connection issues**
   ```bash
   # Check database health
   docker-compose exec postgres pg_isready -U postgres
   
   # View database logs
   docker-compose logs postgres
   ```

3. **Application not starting**
   ```bash
   # Check application logs
   docker-compose logs todo-app
   
   # Rebuild containers
   docker-compose build --no-cache
   ```

## 📈 Performance Considerations

- Database indexes on `completed` and `created_at` fields for optimized queries
- Connection pooling for database connections
- Structured logging for debugging and monitoring
- Health checks for service monitoring
- Non-root user in Docker for security

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Make your changes and add tests
4. Run tests and linting: `npm test && npm run lint`
5. Commit your changes: `git commit -am 'Add some feature'`
6. Push to the branch: `git push origin feature/your-feature`
7. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🔗 Additional Resources

- [gRPC Documentation](https://grpc.io/docs/)
- [Protocol Buffers Guide](https://developers.google.com/protocol-buffers)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Docker Compose Reference](https://docs.docker.com/compose/)