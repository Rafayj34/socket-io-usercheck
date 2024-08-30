const express = require('express');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);

// Initialize Socket.IO with CORS settings
const io = socketIo(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"],
    allowedHeaders: ["my-custom-header"],
    credentials: true, // Uncomment this if you want to allow credentials (like cookies)
  }
});
const onlineUsers = new Map();

app.use(express.static('public'));

app.get('/', (req, res) => {
  res.send('Hello World!');
});

io.on('connection', (socket) => {
  const userId = socket.handshake.query.userId; // Assume user ID is sent in query
  onlineUsers.set(userId, true); // Mark the user as online

  console.log(`User ${userId} connected`);

  // Notify other users that this user is online
  io.emit('userStatus', { userId, status: 'online' });

  socket.on('disconnect', () => {
    onlineUsers.set(userId, false); // Mark the user as offline
    console.log(`User ${userId} disconnected`);

    // Notify other users that this user is offline
    io.emit('userStatus', { userId, status: 'offline' });
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
