// const express = require('express');
// const http = require('http');
// const { Server } = require('socket.io');

// const app = express();
// const server = http.createServer(app);

// const io = new Server(server, {
//   cors: {
//     // origin: "https://collby.vercel.app",
//     origin: "http://localhost:3000",
//     methods: ["GET", "POST"]
//   }
// });

// const rooms = new Map();

// io.on('connection', (socket) => {
//   console.log('User connected:', socket.id);

//   socket.on('join-room', ({ roomId, signal }) => {
//     if (!rooms.has(roomId)) {
//       rooms.set(roomId, new Set([socket.id]));
//       socket.join(roomId);
//     } else if (rooms.get(roomId).size < 2) {
//       rooms.get(roomId).add(socket.id);
//       socket.join(roomId);
//       socket.to(roomId).emit('user-joined', { signal });
//     } else {
//       socket.emit('room-full');
//       return;
//     }
//   });

//   socket.on('returning-signal', ({ signal, roomId }) => {
//     socket.to(roomId).emit('receiving-returned-signal', { signal });
//   });

//   socket.on('disconnect', () => {
//     rooms.forEach((users, roomId) => {
//       if (users.has(socket.id)) {
//         users.delete(socket.id);
//         if (users.size === 0) {
//           rooms.delete(roomId);
//         }
//       }
//     });
//   });
// });

// app.get('/', (req, res) => {
//   res.send('Hello World!');
// });

// server.listen(5000, () => {
//   console.log('Server is running on http://localhost:5000');
// });

const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

const rooms = new Map();

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  socket.on("join-chat-room", ({ roomId, username, role }) => {
    console.log(`${username} (${role}) is attempting to join room ${roomId}`);

    if (!rooms.has(roomId)) {
      rooms.set(roomId, new Map([[socket.id, { username, role }]]));
      socket.join(roomId);
      console.log(`${username} (${role}) created and joined room ${roomId}`);
      socket.emit("room-joined");
    } else if (rooms.get(roomId).size < 2) {
      rooms.get(roomId).set(socket.id, { username, role });
      socket.join(roomId);
      console.log(`${username} (${role}) joined room ${roomId}`);

      // Notify others in the room
      socket.to(roomId).emit("user-joined", { username, role });
      socket.emit("room-joined");
    } else {
      socket.emit("room-full");
      console.log(
        `${username} (${role}) failed to join room ${roomId}: room is full`
      );
      return;
    }

    // Broadcast current room state to all users
    const roomUsers = Array.from(rooms.get(roomId).values());
    io.to(roomId).emit("room-users", roomUsers);
  });

  socket.on("send-message", ({ roomId, message }) => {
    console.log(`Message received in room ${roomId}:`, message);
    if (rooms.has(roomId)) {
      const userInfo = rooms.get(roomId).get(socket.id);
      if (userInfo) {
        const fullMessage = {
          sender: userInfo.username,
          text: message.text,
          timestamp: new Date().toLocaleTimeString(),
        };
        console.log("Broadcasting message:", fullMessage);
        // Use broadcast to send to all clients in the room including sender
        io.in(roomId).emit("receive-message", fullMessage, "at", {roomId});
      }
    }
  });

  socket.on("disconnect", () => {
    rooms.forEach((users, roomId) => {
      if (users.has(socket.id)) {
        const user = users.get(socket.id);
        users.delete(socket.id);
        if (users.size === 0) {
          rooms.delete(roomId);
        } else {
          io.in(roomId).emit("receive-message", {
            sender: "System",
            text: `${user.username} has left the chat`,
            timestamp: new Date().toLocaleTimeString(),
          });
        }
        console.log(`${user.username} disconnected from room ${roomId}`);
      }
    });
  });
});

app.get("/", (req, res) => {
  res.send("Chat server is running!");
});

server.listen(5000, () => {
  // console.log("Server is running on http://localhost:5000");
  console.log("Server is running...");
});
