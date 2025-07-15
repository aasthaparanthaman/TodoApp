#!/bin/bash
# Delete all plugins
for id in $(curl -s http://localhost:8001/plugins | jq -r '.data[].id'); do
  curl -s -X DELETE http://localhost:8001/plugins/$id
done

# Delete all routes
for id in $(curl -s http://localhost:8001/routes | jq -r '.data[].id'); do
  curl -s -X DELETE http://localhost:8001/routes/$id
done

# Delete all services
for id in $(curl -s http://localhost:8001/services | jq -r '.data[].id'); do
  curl -s -X DELETE http://localhost:8001/services/$id
done

# Delete all consumers
for id in $(curl -s http://localhost:8001/consumers | jq -r '.data[].id'); do
  curl -s -X DELETE http://localhost:8001/consumers/$id
done