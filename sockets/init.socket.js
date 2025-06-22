const { Server } = require("socket.io");
const registerSocketHandlers = require("./handlers");
class Socket {
    constructor() {
        this.io = null
    }

    init(server) {
        if (this.io) {
            console.log("Socket.io has already been initialize")
            return this.io
        }

        this.io = new Server(server, {
            cors: {
                origin: "*", // Allow all origins for testing
                methods: ["GET", "POST"],
            },
            transports: ["websocket"],
        })

        this.io.on("connection", (socket) => {
            console.log(`Socket connected: ${socket.id}`);

            registerSocketHandlers(socket, this.io);

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

        })
        return this.io;
    }

    static getInstance() {
        if (!Socket.instance) {
            Socket.instance = new Socket()
        }
        return Socket.instance
    }

    getIO = () => {
        if (!this.io) {
            throw new Error(
                "Socket.IO has not been initialized. Call initializeSocket first."
            );
        }
        return this.io;
    };
}

const instanceSocket = Socket.getInstance();

module.exports = instanceSocket