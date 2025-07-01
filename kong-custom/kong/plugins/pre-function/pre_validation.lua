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
  local is_update = method == "PUT" and path:match("^/todos/[%w%-]+$")
  local is_get_one = method == "GET" and path:match("^/todos/[%w%-]+$")

  if is_get_one then
    local id = path:match("^/todos/(.+)$")
    if is_invalid_id(id) then
      return kong.response.exit(400, {
        message = "Invalid ID in URL. ID must be a number."
      })
    end
  end


  if is_get_one then
    local body, err = kong.request.get_body()

    if not body then
      return kong.response.exit(400, { message = "Invalid ID number" })
    end
  end

  if is_create or is_update then
    local body, err = kong.request.get_body()

    if not body then
      return kong.response.exit(400, { message = "Missing request body" })
    end

    if is_invalid_string(body.title) then
      errors.title = "Title is required and must be a non-empty string"
    end

    if is_invalid_string(body.description) then
      errors.description = "Description is required and must be a non-empty string"
    end

    if next(errors) ~= nil then
      return kong.response.exit(400, {
        message = "Invalid request",
        errors = errors
      })
    end
  end
end

return _M
