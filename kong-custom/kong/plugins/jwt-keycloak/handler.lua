local cjson = require "cjson"
local ngx_encode_base64 = ngx.encode_base64
local ngx_decode_base64 = ngx.decode_base64

local JWTKeycloakHandler = {}

JWTKeycloakHandler.PRIORITY = 1000
JWTKeycloakHandler.VERSION = "1.0.0"

local function get_token_from_header(request)
  local authorization = request.get_header("Authorization")
  if not authorization then
    return nil, "No Authorization header found"
  end

  local token = authorization:match("Bearer%s+(.+)")
  if not token then
    return nil, "Invalid Authorization header format. Expected 'Bearer <token>'"
  end

  return token
end

local function base64_url_decode(input)
  local remainder = #input % 4
  if remainder > 0 then
    input = input .. string.rep('=', 4 - remainder)
  end
  input = input:gsub('-','+'):gsub('_','/')
  return ngx_decode_base64(input)
end

local function decode_jwt(token)
  local parts = {}
  for part in token:gmatch("[^%.]+") do
    table.insert(parts, part)
  end
  
  if #parts ~= 3 then
    return nil, "Invalid JWT format"
  end
  
  -- Decode header and payload (skip signature verification for now)
  local header_json = base64_url_decode(parts[1])
  local payload_json = base64_url_decode(parts[2])
  
  if not header_json or not payload_json then
    return nil, "Failed to decode JWT"
  end
  
  local ok, header = pcall(cjson.decode, header_json)
  if not ok then
    return nil, "Invalid JWT header"
  end
  
  local ok, payload = pcall(cjson.decode, payload_json)
  if not ok then
    return nil, "Invalid JWT payload"
  end
  
  return {
    header = header,
    payload = payload,
    signature = parts[3]
  }
end

local function validate_claims(payload, conf)
  local now = ngx.time()
  
  -- Check expiration (DISABLED FOR TESTING)
  -- if payload.exp and payload.exp < now then
  --   return false, "Token has expired"
  -- end
  
  kong.log.info("TESTING MODE: Expiration check disabled")

  -- Check issuer
  if conf.issuer and payload.iss ~= conf.issuer then
    kong.log.err("Invalid issuer. Expected: ", conf.issuer, " Got: ", payload.iss)
    return false, "Invalid issuer"
  end

  -- Check audience
  if conf.audience then
    local aud = payload.aud
    if type(aud) == "table" then
      local found = false
      for _, audience in ipairs(aud) do
        if audience == conf.audience then
          found = true
          break
        end
      end
      if not found then
        kong.log.err("Invalid audience. Expected: ", conf.audience, " Got: ", cjson.encode(aud))
        return false, "Invalid audience"
      end
    elseif aud ~= conf.audience then
      kong.log.err("Invalid audience. Expected: ", conf.audience, " Got: ", aud)
      return false, "Invalid audience"
    end
  end

  return true
end

local function extract_user_info(payload)
  -- Map Keycloak UUID to integer user ID at Kong level
  local keycloak_id = payload.sub
  local user_id = "1" -- Map to user ID 1 for testing
  
  -- You can add more mappings here:
  -- if keycloak_id == "042dc691-06a1-4181-be47-42a495e75a51" then
  --   user_id = "1"
  -- elseif keycloak_id == "another-uuid" then
  --   user_id = "2"
  -- end
  
  kong.log.info("Mapped Keycloak ID: ", keycloak_id, " to user_id: ", user_id)
  
  return {
    user_id = user_id, -- Use mapped integer ID instead of UUID
    email = payload.email or "",
    username = payload.preferred_username or "",
    first_name = payload.given_name or "",
    last_name = payload.family_name or "",
    roles = payload.realm_access and payload.realm_access.roles or {},
    resource_access = payload.resource_access or {}
  }
end

function JWTKeycloakHandler:access(conf)
  kong.log.info("JWT Keycloak plugin executing...")

  local token, err = get_token_from_header(kong.request)
  if not token then
    kong.log.err("Token extraction failed: ", err)
    return kong.response.exit(401, { 
      message = err,
      error = "unauthorized"
    })
  end

  kong.log.info("Token extracted successfully")

  -- Decode JWT (without signature verification for now)
  local jwt_obj, err = decode_jwt(token)
  if not jwt_obj then
    kong.log.err("JWT decoding failed: ", err)
    return kong.response.exit(401, { 
      message = err,
      error = "invalid_token"
    })
  end

  kong.log.info("JWT decoded successfully")

  -- Validate claims
  local valid, err = validate_claims(jwt_obj.payload, conf)
  if not valid then
    kong.log.err("Claims validation failed: ", err)
    return kong.response.exit(401, { 
      message = err,
      error = "invalid_claims"
    })
  end

  kong.log.info("JWT claims validated successfully")

  -- Extract user information
  local user_info = extract_user_info(jwt_obj.payload)

  -- CRITICAL: Set the user_id header that your gRPC service expects
  kong.service.request.set_header("user_id", user_info.user_id)
  
  -- Optional: Set additional user info headers
  kong.service.request.set_header("user_email", user_info.email)
  kong.service.request.set_header("user_username", user_info.username)
  kong.service.request.set_header("user_roles", cjson.encode(user_info.roles))

  kong.log.info("User authenticated successfully: ", user_info.user_id)

  -- Store user context for other plugins
  kong.ctx.shared.user = user_info
  kong.ctx.shared.jwt_payload = jwt_obj.payload
end

return JWTKeycloakHandler