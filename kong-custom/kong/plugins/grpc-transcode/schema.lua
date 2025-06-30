return {
  name = "grpc-transcode",
  fields = {
    {
      config = {
        type = "record",
        fields = {
          { proto = { type = "string", required = true }, },
          { service = { type = "string", required = true }, },
          { method = { type = "string", required = true }, },
        },
      },
    },
  },
}
