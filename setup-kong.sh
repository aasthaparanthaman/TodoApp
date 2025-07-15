#!/bin/bash

#Service
#-------------------------------------------------------------------------------------------------------------------------------
curl -i -X POST http://localhost:8001/services \
  --data name=todo-grpc-service \
  --data url=grpc://todo-grpc-app:50051

#Routes
#-------------------------------------------------------------------------------------------------------------------------------

curl -i -X POST http://localhost:8001/services/todo-grpc-service/routes \
  --data name=get-all-todos \
  --data 'paths[]=/todos' \
  --data 'methods[]=GET' \
  --data 'protocols[]=http'

curl -i -X POST http://localhost:8001/services/todo-grpc-service/routes \
  --data name=get-todo \
  --data 'paths[]=~/todos/(?<id>\d+)$' \
  --data 'methods[]=GET' \
  --data 'protocols[]=http' \
  --data strip_path=false

curl -i -X POST http://localhost:8001/services/todo-grpc-service/routes \
  --data name=create-todo \
  --data 'paths[]=/todos' \
  --data 'methods[]=POST' \
  --data 'protocols[]=http'

curl -i -X POST http://localhost:8001/services/todo-grpc-service/routes \
  --data name=update-todo \
  --data 'paths[]=~/todos/(?<id>\d+)$' \
  --data 'methods[]=PUT' \
  --data 'protocols[]=http' \
  --data strip_path=false

curl -i -X POST http://localhost:8001/services/todo-grpc-service/routes \
  --data name=delete-todo \
  --data 'paths[]=~/todos/(?<id>\d+)$' \
  --data 'methods[]=DELETE' \
  --data 'protocols[]=http' \
  --data strip_path=false

curl -i -X POST http://localhost:8001/services/todo-grpc-service/routes \
  --data name=complete-todo \
  --data 'paths[]=~/todos/(?<id>\d+)/complete$' \
  --data 'methods[]=POST' \
  --data 'protocols[]=http' \
  --data strip_path=false

#Rate-Limiting Plugin
#-------------------------------------------------------------------------------------------------------------------------------

curl -i -X POST http://localhost:8001/routes/get-all-todos/plugins \
  --data name=rate-limiting \
  --data config.second=3 \
  --data config.limit_by=ip \
  --data config.policy=local

curl -i -X POST http://localhost:8001/routes/get-todo/plugins \
  --data name=rate-limiting \
  --data config.second=5 \
  --data config.limit_by=ip \
  --data config.policy=local

curl -i -X POST http://localhost:8001/routes/create-todo/plugins \
  --data name=rate-limiting \
  --data config.second=2 \
  --data config.limit_by=ip \
  --data config.policy=local

curl -i -X POST http://localhost:8001/routes/update-todo/plugins \
  --data name=rate-limiting \
  --data config.second=3 \
  --data config.limit_by=ip \
  --data config.policy=local

curl -i -X POST http://localhost:8001/routes/delete-todo/plugins \
  --data name=rate-limiting \
  --data config.second=1 \
  --data config.limit_by=ip \
  --data config.policy=local

curl -i -X POST http://localhost:8001/routes/complete-todo/plugins \
  --data name=rate-limiting \
  --data config.second=5 \
  --data config.limit_by=ip \
  --data config.policy=local

#Pre-function plugin
#-------------------------------------------------------------------------------------------------------------------------------

curl -i -X POST http://localhost:8001/routes/get-all-todos/plugins \
  --data name=pre-function 

curl -i -X POST http://localhost:8001/routes/get-todo/plugins \
  --data name=pre-function 

curl -i -X POST http://localhost:8001/routes/create-todo/plugins \
  --data name=pre-function 

curl -i -X POST http://localhost:8001/routes/update-todo/plugins \
  --data name=pre-function 

curl -i -X POST http://localhost:8001/routes/delete-todo/plugins \
  --data name=pre-function 

curl -i -X POST http://localhost:8001/routes/complete-todo/plugins \
  --data name=pre-function 

#gRPC-transcode Plugin
#-------------------------------------------------------------------------------------------------------------------------------

curl -i -X POST http://localhost:8001/routes/get-all-todos/plugins \
  --data name=grpc-transcode \
  --data config.proto=/usr/local/kong/include/src/api/todo.proto \
  --data config.service=TodoService \
  --data config.method=GetAllTodos

curl -i -X POST http://localhost:8001/routes/get-todo/plugins \
  --data name=grpc-transcode \
  --data config.proto=/usr/local/kong/include/src/api/todo.proto \
  --data config.service=TodoService \
  --data config.method=GetTodo

curl -i -X POST http://localhost:8001/routes/create-todo/plugins \
  --data name=grpc-transcode \
  --data config.proto=/usr/local/kong/include/src/api/todo.proto \
  --data config.service=TodoService \
  --data config.method=CreateTodo

curl -i -X POST http://localhost:8001/routes/update-todo/plugins \
  --data name=grpc-transcode \
  --data config.proto=/usr/local/kong/include/src/api/todo.proto \
  --data config.service=TodoService \
  --data config.method=UpdateTodo

curl -i -X POST http://localhost:8001/routes/delete-todo/plugins \
  --data name=grpc-transcode \
  --data config.proto=/usr/local/kong/include/src/api/todo.proto \
  --data config.service=TodoService \
  --data config.method=DeleteTodo

curl -i -X POST http://localhost:8001/routes/complete-todo/plugins \
  --data name=grpc-transcode \
  --data config.proto=/usr/local/kong/include/src/api/todo.proto \
  --data config.service=TodoService \
  --data config.method=CompleteTodo

curl -i -X POST http://localhost:8001/routes/auth-login/plugins \
  --data name=grpc-transcode \
  --data config.proto=/usr/local/kong/include/src/api/todo.proto \
  --data config.service=TodoService \
  --data config.method=Login

curl -i -X POST http://localhost:8001/routes/auth-register/plugins \
  --data name=grpc-transcode \
  --data config.proto=/usr/local/kong/include/src/api/todo.proto \
  --data config.service=TodoService \
  --data config.method=Register