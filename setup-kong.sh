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

#JWT (JSON Web Token) Plugin
#-------------------------------------------------------------------------------------------------------------------------------

for route in get-all-todos get-todo create-todo update-todo delete-todo complete-todo
do
  curl -i -X POST http://localhost:8001/routes/$route/plugins \
    --data name=jwt \
    --data config.claims_to_verify=exp \
    --data config.secret_is_base64=false \
    --data config.key_claim_name=iss \
    --data config.header_names[]=authorization \
    --data config.cookie_names[]=jwt \
    --data config.uri_param_names[]=jwt \
    --data config.run_on_preflight=true
done

# Kong’s JWT plugin only validates tokens issued by a known consumer

# Create the consumer
curl -i -X POST http://localhost:8001/consumers \
  --data username=todo-app-user

# Add a JWT credential for that consumer
curl -i -X POST http://localhost:8001/consumers/todo-app-user/jwt \
  --data key=todo-app-issuer \
  --data secret=your-secret-key-here \
  --data algorithm=HS256