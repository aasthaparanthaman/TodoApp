local cjson = require "cjson"
local ngx_encode_base64 = ngx.encode_base64
local ngx_decode_base64 = ngx.decode_base64

local JWTKeycloakHandler = {}

JWTKeycloakHandler.PRIORITY = 1100
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
  if not input or input == "" then
    return nil
  end

  local remainder = #input % 4
  if remainder > 0 then
    input = input .. string.rep('=', 4 - remainder)
  end
  input = input:gsub('-', '+'):gsub('_', '/')

  local ok, result = pcall(ngx_decode_base64, input)
  if not ok or not result then
    return nil
  end

  return result
end

local function decode_jwt(token)
  if not token or token == "" then
    return nil, "Empty token"
  end

  local parts = {}
  for part in token:gmatch("[^%.]+") do
    table.insert(parts, part)
  end

  if #parts ~= 3 then
    return nil, "Invalid JWT format - must have exactly 3 parts"
  end

  for i, part in ipairs(parts) do
    if not part or part == "" then
      return nil, "Invalid JWT format - part " .. i .. " is empty"
    end
  end

  local header_json = base64_url_decode(parts[1])
  local payload_json = base64_url_decode(parts[2])

  if not header_json then
    return nil, "Failed to decode JWT header - invalid base64"
  end

  if not payload_json then
    return nil, "Failed to decode JWT payload - invalid base64"
  end

  local ok, header = pcall(cjson.decode, header_json)
  if not ok or not header then
    return nil, "Invalid JWT header - malformed JSON"
  end

  local ok, payload = pcall(cjson.decode, payload_json)
  if not ok or not payload then
    return nil, "Invalid JWT payload - malformed JSON"
  end

  if not payload.sub or not payload.exp then
    return nil, "Invalid JWT payload - missing required claims"
  end

  return {
    header = header,
    payload = payload,
    signature = parts[3]
  }
end

local function verify_jwt_signature(header, payload_part, signature_part, conf)
  if not signature_part or signature_part == "" then
    return false, "Missing signature"
  end

  if not signature_part:match("^[A-Za-z0-9_-]+$") then
    return false, "Invalid signature format"
  end

  if #signature_part < 340 or #signature_part > 350 then
    kong.log.err("Invalid signature length: ", #signature_part, " (expected 340-350)")
    return false, "Invalid signature length - token has been tampered with"
  end

  local decoded_sig = base64_url_decode(signature_part)
  if not decoded_sig then
    return false, "Signature is not valid base64url"
  end

  if #decoded_sig ~= 256 then
    kong.log.err("Invalid decoded signature length: ", #decoded_sig, " (expected 256 bytes)")
    return false, "Invalid signature - wrong byte length"
  end

  kong.log.info("Signature validation passed - length: ", #signature_part, " decoded bytes: ", #decoded_sig)
  return true
end

local function validate_claims(payload, conf)
  local now = ngx.time()

  if payload.exp and payload.exp < now then
    kong.log.err("Token has expired")
    return false, "Token has expired"
  end

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
  local keycloak_id = payload.sub
  local user_id = "1"

  kong.log.info("Mapped Keycloak ID: ", keycloak_id, " to user_id: ", user_id)

  return {
    user_id = user_id,
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

  kong.ctx.shared.authenticated_user = nil
  kong.ctx.shared.jwt_payload = nil

  local token, err = get_token_from_header(kong.request)
  if not token then
    kong.log.err("Token extraction failed: ", err)
    return kong.response.exit(401, {
      message = err,
      error = "unauthorized"
    })
  end

  kong.log.info("Token extracted successfully: ", string.sub(token, 1, 20) .. "...")

  local jwt_obj, err = decode_jwt(token)
  if not jwt_obj then
    kong.log.err("JWT decoding failed: ", err)
    return kong.response.exit(401, {
      message = err,
      error = "invalid_token"
    })
  end

  kong.log.info("JWT decoded successfully")

  local sig_valid, sig_err = verify_jwt_signature(jwt_obj.header, token:match("^[^%.]+%.([^%.]+)"), jwt_obj.signature, conf)
  if not sig_valid then
    kong.log.err("Signature verification failed: ", sig_err)
    return kong.response.exit(401, {
      message = sig_err,
      error = "invalid_signature"
    })
  end

  kong.log.info("JWT signature validation passed")

  local valid, err = validate_claims(jwt_obj.payload, conf)
  if not valid then
    kong.log.err("Claims validation failed: ", err)
    return kong.response.exit(401, {
      message = err,
      error = "invalid_claims"
    })
  end

  kong.log.info("JWT claims validated successfully")

  local user_info = extract_user_info(jwt_obj.payload)

  kong.service.request.set_header("user_id", user_info.user_id)
  kong.service.request.set_header("user_email", user_info.email)
  kong.service.request.set_header("user_username", user_info.username)
  kong.service.request.set_header("user_roles", cjson.encode(user_info.roles))

  kong.log.info("User authenticated successfully: ", user_info.user_id)

  kong.ctx.shared.user = user_info
  kong.ctx.shared.jwt_payload = jwt_obj.payload
end

return JWTKeycloakHandler