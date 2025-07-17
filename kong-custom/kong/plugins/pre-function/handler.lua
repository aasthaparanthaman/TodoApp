local pre_validation = require "kong.plugins.pre-function.pre_validation"

local plugin = {
  PRIORITY = 999,
  VERSION = "1.0",
  NAME = "pre-function"
}

function plugin:access(conf)
  ngx.req.read_body() 
  pre_validation.validate()
end

return plugin