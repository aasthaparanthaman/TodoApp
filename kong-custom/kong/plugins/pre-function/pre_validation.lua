local http = require "resty.http"
local _M = {}

local function is_invalid_string(value)
  return type(value) ~= "string" or value:match("^%s*$")
end

local function is_invalid_id(id)
  return not id or not id:match("^%d+$")
end

local function todo_exists(id)
  local httpc = http.new()
  local res, err = httpc:request_uri("http://localhost:8000/todos/" .. id, {
    method = "GET",
    headers = {
      ["x-skip-validation"] = "true"
    }
  })

  if not res then
    kong.log.err("Error checking todo ID: ", err)
    return false
  end

  return res.status == 200
end

function _M.validate()
  if kong.request.get_header("x-skip-validation") == "true" then
    return
  end

local path = kong.request.get_path()

if path and path:match("^/auth") then
  return
end

  local method = kong.request.get_method()
  local path = kong.request.get_path()
  local errors = {}

  local is_create = method == "POST" and path == "/todos"
  local is_update = method == "PUT" and path:match("^/todos/%d+$")
  local is_get_one = method == "GET" and path:match("^/todos/%d+$")
  local is_delete = method == "DELETE" and path:match("^/todos/%d+$")
  local is_complete = method == "POST" and path:match("^/todos/%d+/complete$")
  local is_get_all = method == "GET" and path == "/todos"

  local id
  if is_get_one or is_update or is_delete or is_complete then
    local pattern = is_complete and "^/todos/(%d+)/complete$" or "^/todos/(%d+)$"
    id = path:match(pattern)

    if is_invalid_id(id) then
      return kong.response.exit(400, {
        message = "Invalid ID in URL. ID must be a number."
      })
    end
  end
  
  if is_create or is_update then
    local ok, body = pcall(kong.request.get_body) 
    if not ok or not body or type(body) ~= "table" then
      return kong.response.exit(400, { message = "Invalid or missing JSON body" })
    end

    if is_invalid_string(body.title) then
      errors.title = "Title is required and must be a non-empty string"
    end
    if is_invalid_string(body.description) then
      errors.description = "Description is required and must be a non-empty string"
    end

    if next(errors) ~= nil then
      return kong.response.exit(400, {
        message = "Invalid request body",
        errors = errors
      })
    end
  end
  
  if is_get_all or is_get_one or is_delete or is_complete then
    local ok, body = pcall(kong.request.get_body)
    local raw_body = kong.request.get_raw_body()
    
    if (ok and body and next(body) ~= nil) or (raw_body and raw_body:match("%S")) then
      return kong.response.exit(400, {
        message = "Request body is not allowed for this endpoint"
      })
    end
  end
end

return _M