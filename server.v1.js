const app = require("./app");
const socketIO = require("./sockets/init.socket");

const orderQueueManager = require('./queue/order.queue');


const PORT = process.env.PORT || 8888;



const server = app.listen(PORT, () => {
    console.log(`Food delivery start with port ${PORT}`)

    const io = socketIO.init(server);
    orderQueueManager.setSocket(io);
})


process.on('SIGINT', () => {
    server.close(() => console.log(`Exit Server Express`))
})