local plugin = {
  PRIORITY = 1000,
  VERSION = "1.0",
}

function plugin.access(conf)
  local validator = require "kong.plugins.pre-function.pre_validation"
  return validator.validate()
end

return plugin
