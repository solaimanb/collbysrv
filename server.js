const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "https://collby.vercel.app",
    methods: ["GET", "POST"]
  }
});

const rooms = new Map();

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('join-room', ({ roomId, signal }) => {
    if (!rooms.has(roomId)) {
      rooms.set(roomId, new Set([socket.id]));
      socket.join(roomId);
    } else if (rooms.get(roomId).size < 2) {
      rooms.get(roomId).add(socket.id);
      socket.join(roomId);
      socket.to(roomId).emit('user-joined', { signal });
    } else {
      socket.emit('room-full');
      return;
    }
  });

  socket.on('returning-signal', ({ signal, roomId }) => {
    socket.to(roomId).emit('receiving-returned-signal', { signal });
  });

  socket.on('disconnect', () => {
    rooms.forEach((users, roomId) => {
      if (users.has(socket.id)) {
        users.delete(socket.id);
        if (users.size === 0) {
          rooms.delete(roomId);
        }
      }
    });
  });
});

app.get('/', (req, res) => {
  res.send('Hello World!');
});

server.listen(5000, () => {
  console.log('Server is running on http://localhost:5000');
});