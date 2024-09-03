const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const { PrismaClient } = require('@prisma/client');

const app = express();
const server = http.createServer(app);
const prisma = new PrismaClient();

const io = socketIo(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"],
    allowedHeaders: ["my-custom-header"],
    credentials: true,
  }
});

const disconnectTimers = {}; // Store timeouts here

io.on('connection', async (socket) => {
  const userId = socket.handshake.query.userId;

  if (!userId) {
    console.error('User ID is undefined');
    return;
  }

  console.log(`User ${userId} connected`);

  // Cancel any pending disconnection timer if the user reconnects within 15 seconds
  if (disconnectTimers[userId]) {
    clearTimeout(disconnectTimers[userId]);
    delete disconnectTimers[userId];
    console.log(`Cancelled offline timer for user ${userId}`);
  }

  // Mark user as online
  try {
    await prisma.user.update({
      where: { id: userId },
      data: {
        onlineStatus: true,
        lastActive: new Date(),
      },
    });

    // Notify other users that this user is online
    io.emit('userStatus', { userId, status: 'online' });
  } catch (error) {
    console.error(`Error updating user ${userId} on connection:`, error);
  }

  socket.on('disconnect', () => {
    console.log(`User ${userId} disconnected`);

    // Set a 15-second timeout to mark the user as offline
    disconnectTimers[userId] = setTimeout(async () => {
      try {
        await prisma.user.update({
          where: { id: userId },
          data: {
            onlineStatus: false,
            lastActive: new Date(),
          },
        });

        console.log(`User ${userId} marked as offline after 15 seconds`);

        // Notify other users that this user is offline
        io.emit('userStatus', { userId, status: 'offline' });
      } catch (error) {
        console.error(`Error updating user ${userId} on disconnect:`, error);
      } finally {
        // Clean up the timer
        delete disconnectTimers[userId];
      }
    }, 15000); // 15 seconds
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
