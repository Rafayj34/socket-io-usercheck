const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const { PrismaClient } = require('@prisma/client');

const app = express();
const server = http.createServer(app);
const prisma = new PrismaClient();

// Initialize Socket.IO with CORS settings
const io = socketIo(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"],
    allowedHeaders: ["my-custom-header"],
    credentials: true, // Uncomment this if you want to allow credentials (like cookies)
  }
});


app.use(express.static('public'));

app.get('/', (req, res) => {
  res.send('Hello World!');
});

io.on('connection', async (socket) => {
  const userId = socket.handshake.query.userId;
  // const userExists = await prisma.user.findUnique({ where: { id: userId } });

  console.log(`Received userId: ${userId}`);

  if (!userId) {
    console.error('User ID is undefined');
    return;
  }

  try {
    // Attempt to mark the user as online
    console.log(userId);
    
    // let userExists = 1
    await prisma.user.update({
      where: { id: userId},
      data: {
        onlineStatus: true,
        lastActive: new Date(),
      },
    });
    if (userId) {
      // Mark the user as online and update lastActive
      console.log(`User ${userId} connected`);

      // Notify other users that this user is online
      io.emit('userStatus', { userId, status: 'online' });
    } else {
      console.warn(`User ${userId} not found on connection.`);
    }
  } catch (error) {
    console.error(`Error updating user ${userId} on connection:`, error);
  }

  socket.on('disconnect', async () => {
    try {
      // Check if the user still exists
      // const userExists = await prisma.user.findUnique({ where: { id: userId } });
      // console.log(userExists);
      
      if (userId) {
        // Mark the user as offline
        await prisma.user.update({
          where: { id: userId },
          data: {
            onlineStatus: false,
            lastActive: new Date(),
          },
        });
        console.log(`User ${userId} disconnected`);

        // Notify other users that this user is offline
        io.emit('userStatus', { userId, status: 'offline' });
      } else {
        console.warn(`User ${userId} not found on disconnect, might have been deleted.`);
      }
    } catch (error) {
      console.error(`Error updating user ${userId} on disconnect:`, error);
    }
  });
});


const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
