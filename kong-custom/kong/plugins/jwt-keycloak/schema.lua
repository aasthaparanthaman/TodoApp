return {
  name = "jwt-auth",
  fields = {
    {
      config = {
        type = "record",
        fields = {
          {
            public_key = {
              type = "string",
              required = true,
              description = "RSA public key in PEM format for JWT verification"
            }
          },
          {
            issuer = {
              type = "string",
              required = false,
              default = "http://localhost:8080/realms/example",
              description = "Expected JWT issuer (Keycloak realm)"
            }
          },
          {
            audience = {
              type = "string",
              required = false,
              default = "account",
              description = "Expected JWT audience"
            }
          }
        }
      }
    }
  }
}