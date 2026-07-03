const swaggerJsdoc = require("swagger-jsdoc");

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Naveenam Naturals Admin API",
      version: "1.0.0",
      description:
        "API documentation for Naveenam Naturals e-commerce platform",
    },
    servers: [
      {
        url: "http://localhost:5005",
        description: "Local server",
      },
      {
        url: "https://api.naveenamnaturals.com",
        description: "Production server",
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
  },
  apis: ["./src/routes/*.js", "./src/controllers/*.js"], // Path to the API docs
};

const specs = swaggerJsdoc(options);

module.exports = specs;
