const swaggerJSDoc = require("swagger-jsdoc");
const path = require("path");

const swaggerDefinition = {
  openapi: "3.1.0",
  info: {
    title: "H2D Food Delivery API Documentation",
    version: "1.0.0",
    description: "This is the API documentation for our food delivery application.",
  },
  servers: [
    {
      url: "{protocol}://localhost:{port}/api/v1",
      description: "Local development server",
      variables: {
        protocol: {
          enum: ["http", "https"],
          default: "http"
        },
        port: {
          default: "8081"
        }
      }
    }
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT'
      }
    }
  }
};

const options = {
  swaggerDefinition,
  
  apis: [path.join(__dirname, '../routes/*.js')]
};

const swaggerSpec = swaggerJSDoc(options);

module.exports = swaggerSpec;  


