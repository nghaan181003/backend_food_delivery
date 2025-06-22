const { Server } = require("socket.io");
const orderHandler = require("./handlers/orderHandler");

let io;

const initializeSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: "*", // Allow all origins for testing
      methods: ["GET", "POST"],
    },
    transports: ["websocket"], // Ensure WebSocket is supported
  });

  io.on("connection", (socket) => {
    console.log(`Socket connected: ${socket.id}`);

    orderHandler(socket, io);

    socket.on("disconnect", () => {
      console.log(`Socket disconnected: ${socket.id}`);
    });

    socket.on("joinRoom", (roomId) => {
      if (roomId) {
        socket.join(roomId); // Join the specified room
        console.log(`Socket ${socket.id} joined room: ${roomId}`);

        // Optionally send acknowledgment
        socket.emit("joinedRoom", {
          roomId,
          message: "Successfully joined room.",
        });
      } else {
        console.warn(`Socket ${socket.id} tried to join room without roomId.`);
        socket.emit("error", {
          message: "Room ID is required to join a room.",
        });
      }
    });
  });

  return io;
};

const getIO = () => {
  if (!io) {
    throw new Error(
      "Socket.IO has not been initialized. Call initializeSocket first."
    );
  }
  return io;
};

module.exports = { initializeSocket, getIO };
