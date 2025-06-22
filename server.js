/*==============================
core packages
==============================*/
const express = require("express");
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./config/swagger');
const dotenv = require("dotenv");
const path = require("path");
const cors = require("cors");
const { initializeSocket } = require("./sockets");
dotenv.config();

/*==============================
include Routes and database connection
==============================*/
const DBConnect = require("./config/db");
const Routes = require("./routes");

/*==============================
include environment variables
==============================*/
const port = process.env.PORT || 8888;
const hostName = process.env.HOSTNAME;

/*==============================
server application configurations
==============================*/
DBConnect();
const app = express();
app.use(express.json());
app.use(cors());

/*==============================
routes
==============================*/
app.use("/api/v1", Routes); // routes and prefix
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

/*==============================
public endpoint for file/media access
==============================*/
app.use("/public", express.static(path.join(__dirname, "public")));

/*==============================
start server listen
==============================*/
const expressServer = app.listen(port, () => {
  console.log(`app listening on port ${port}`);
});

/*==============================
Socket.IO Integration
==============================*/
initializeSocket(expressServer);
