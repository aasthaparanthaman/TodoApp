local deco = require "kong.plugins.grpc-gateway.deco"

local ngx = ngx
local kong = kong


local ngx_arg = ngx.arg

local kong_request_get_path = kong.request.get_path
local kong_request_get_method = kong.request.get_method
local kong_request_get_raw_body = kong.request.get_raw_body
local kong_response_exit = kong.response.exit
local kong_response_set_header = kong.response.set_header
local kong_service_request_set_header = kong.service.request.set_header
local kong_service_request_set_method = kong.service.request.set_method
local kong_service_request_set_raw_body = kong.service.request.set_raw_body


local grpc_gateway = {
  PRIORITY = 999,
  VERSION = '0.1.3',
}


local CORS_HEADERS = {
  ["Content-Type"] = "application/json",
  ["Access-Control-Allow-Origin"] = "*",
  ["Access-Control-Allow-Methods"] = "GET,POST,PATCH,DELETE",
  ["Access-Control-Allow-Headers"] = "content-type",
}

function grpc_gateway:access(conf)
  kong_response_set_header("Access-Control-Allow-Origin", "*")

  if kong_request_get_method() == "OPTIONS" then
    return kong_response_exit(200, "OK", CORS_HEADERS)
  end


  local dec, err = deco.new(kong_request_get_method():lower(),
                            kong_request_get_path(), conf.proto)

  if not dec then
    kong.log.err(err)
    return kong_response_exit(400, err)
  end

  kong.ctx.plugin.dec = dec

  kong_service_request_set_header("Content-Type", "application/grpc")
  kong_service_request_set_header("TE", "trailers")
  local body, err = dec:upstream(kong_request_get_raw_body())
  if err then
    kong.log.err(err)
    return kong_response_exit(400, err)
  end
  kong_service_request_set_raw_body(body)

  ngx.req.set_uri(dec.rewrite_path)
  -- clear any query args
  ngx.req.set_uri_args("")
  kong_service_request_set_method("POST")
end

local grpc_status_map = {
   [0] = 200,
   [1] = 499,
   [2] = 500,
   [3] = 400,
   [4] = 504,
   [5] = 404,
   [6] = 409,
   [7] = 403,
  [16] = 401,
   [8] = 429,
   [9] = 400,
  [10] = 409,
  [11] = 400,
  [12] = 500,
  [13] = 500,
  [14] = 503,
  [15] = 500,
}


function grpc_gateway:header_filter(conf)
  if kong_request_get_method() == "OPTIONS" then
    return
  end

  local dec = kong.ctx.plugin.dec
  if dec then
    kong_response_set_header("Content-Type", "application/json")
  end

  local grpc_status = tonumber(ngx.header['grpc-status'])
  if grpc_status then
    local http_status = grpc_status_map[grpc_status]
    if not http_status then
      kong.log.warn("Unable to map grpc-status ", ngx.header['grpc-status'], " to HTTP status code")
      http_status = 500
    end
    ngx.status = http_status
  end
end


function grpc_gateway:body_filter(conf)
  local dec = kong.ctx.plugin.dec
  if not dec then
    return
  end

  local ret = dec:downstream(ngx_arg[1])
  if not ret or #ret == 0 then
    if ngx_arg[2] then
      ret = deco:get_raw_downstream_body()
    else
      ret = nil
    end
  end
  ngx_arg[1] = ret
end


return grpc_gateway
