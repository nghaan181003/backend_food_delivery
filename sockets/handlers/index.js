const orderHandler = require('./orderHandler')

console.log('orderHandler:', typeof orderHandler);

module.exports = (socket, io) => {
    orderHandler(socket, io)
}