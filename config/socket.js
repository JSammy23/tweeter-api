// socket.js
const { Server } = require("socket.io");

let io;

module.exports = {
  init: (httpServer) => {
    io = new Server(httpServer, {
      cors: {
        origin: "http://localhost:5173", // Replace with your client URL
        methods: ["GET", "POST"]
      }
    });

    io.on('connection', (socket) => {
        console.log('A user connected');
    
        socket.on('joinConversation', (conversationId) => {
          console.log(`Joining conversation: ${conversationId}`);
          socket.join(conversationId);
        });
    
        socket.on('leaveConversation', (conversationId) => {
            console.log(`Leaving conversation: ${conversationId}`);
            socket.leave(conversationId);
        });
    
        socket.on('disconnect', () => {
            console.log('User disconnected');
        });
    });

    return io;
  },
  getIO: () => {
    if (!io) {
      throw new Error("Socket.io not initialized!");
    }
    return io;
  },
};
