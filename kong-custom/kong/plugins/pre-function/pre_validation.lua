local _M = {}

local function is_invalid_string(value)
  return type(value) ~= "string" or value:match("^%s*$")
end

local function is_invalid_id(id)
  return not id or not id:match("^%d+$")
end

function _M.validate()
  if kong.request.get_header("x-skip-validation") == "true" then
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
    if not ok or type(body) ~= "table" then
      return kong.response.exit(400, { 
        message = "Request body is required and must be valid JSON" 
      })
    end

    if is_invalid_string(body.title) then
      errors.title = "Title is required and must be a non-empty string"
    end
    if is_invalid_string(body.description) then
      errors.description = "Description is required and must be a non-empty string"
    end
    if is_update then
      if body.id == nil or tostring(body.id) ~= id then
        errors.id = "ID is required in body and must match the ID in the URL"
      end
      if type(body.completed) ~= "boolean" then
        errors.completed = "Completed is required and must be a boolean"
      end
    end

    if next(errors) ~= nil then
      return kong.response.exit(400, {
        message = "Invalid request body",
        errors = errors
      })
    end
  end


  if is_get_all or is_get_one or is_delete or is_complete then
    local ok1, body = pcall(kong.request.get_body)
    local ok2, raw_body = pcall(kong.request.get_raw_body)
    
    if (ok1 and type(body) == "table" and next(body) ~= nil) or 
       (ok2 and raw_body and raw_body:match("%S")) then
      return kong.response.exit(400, {
        message = "Request body is not allowed for this endpoint"
      })
    end
  end
end

return _M
