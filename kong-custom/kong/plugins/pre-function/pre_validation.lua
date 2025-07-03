local _M = {}

local function is_invalid_string(value)
  return type(value) ~= "string" or value:match("^%s*$")
end

local function is_invalid_id(id)
  return not id or not id:match("^%d+$")
end

function _M.validate()
  local method = kong.request.get_method()
  local path = kong.request.get_path()
  local errors = {}

  local is_create = method == "POST" and path == "/todos"
  local is_update = method == "PUT" and path:match("^/todos/%d+$")
  local is_get_one = method == "GET" and path:match("^/todos/%d+$")
  local is_get_all = method == "GET" and path == "/todos"
  local is_delete = method == "DELETE" and path:match("^/todos/%d+$")
  local is_complete = method == "POST" and path:match("^/todos/%d+/complete$")

  if is_get_one or is_update or is_delete or is_complete then
    local id_pattern = is_complete and "^/todos/(%d+)/complete$" or "^/todos/(%d+)$"
    local id = path:match(id_pattern)
    
    if not id or not id:match("^%d+$") then
      return kong.response.exit(400, {
        message = "Invalid ID in URL. ID must be a valid number."
      })
    end
  end

  if is_create or is_update then
    local body, err = kong.request.get_body()

    if not body then
      return kong.response.exit(400, { 
        message = "Request body is required for this endpoint" 
      })
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
    local body, err = kong.request.get_body()
    
    if body and next(body) ~= nil then
      return kong.response.exit(400, {
      })
    end
    
    local raw_body = kong.request.get_raw_body()
    if raw_body and string.len(raw_body) > 0 then
      if not raw_body:match("^%s*$") then
        return kong.response.exit(400, {
          message = "Request body is not allowed for this endpoint"
        })
      end
    end
  end
end

return _M