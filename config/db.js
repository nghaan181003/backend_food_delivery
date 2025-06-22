const mongoose = require("mongoose");

const DBConnect = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);  
    console.log(
    `MongoDB connected: ${conn.connection.host}:${conn.connection.port}/${conn.connection.name}`
    );
  } catch (error) {
    console.log(error);
    process.exit(1); 
  }
};

module.exports = DBConnect;
