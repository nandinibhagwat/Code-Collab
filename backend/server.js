const express=require('express');
const http=require("http");
const dotenv=require("dotenv");
const cookieParser=require("cookie-parser");

const {Server}=require("socket.io");
const cors=require("cors");
const path=require("path");
const connectDB = require("./config/db.connection");

const userRoutes=require('./routes/user.route');
const roomRoutes=require('./routes/room.route');
const aiRoutes = require("./routes/ai.route");

dotenv.config();

const app=express();
const PORT=process.env.PORT

app.use(cors({
    origin: "https://codecollab-eight.vercel.app" || "http://localhost:5173",
    credentials: true,
}));
app.use(express.json());
app.use(cookieParser());

app.use("/api/user",userRoutes);
app.use("/api/room",roomRoutes);
app.use("/api/ai", aiRoutes);

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "https://codecollab-eight.vercel.app" || "http://localhost:5173", // Replace with your frontend URL
    methods: ["GET", "POST"],
    credentials: true,
  },
});

const onlineUsersInRoom = {};

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  socket.on("join-room", ({ roomId, user }) => {
    socket.join(roomId);

    if (!onlineUsersInRoom[roomId]) {
        onlineUsersInRoom[roomId] = [];
    }

    // Add socketId to user object
    const userWithSocket = { ...user, socketId: socket.id };

    const alreadyJoined = onlineUsersInRoom[roomId].some(
        (u) => u._id === user._id
    );

    if (!alreadyJoined) {
        onlineUsersInRoom[roomId].push(userWithSocket);
    }

    io.to(roomId).emit("room-users", onlineUsersInRoom[roomId]);
    });


    socket.on("leave-room", ({ roomId, userId }) => {
    if (onlineUsersInRoom[roomId]) {
      onlineUsersInRoom[roomId] = onlineUsersInRoom[roomId].filter(
        (u) => u._id !== userId
      );
    }

    socket.leave(roomId);
    io.to(roomId).emit("room-users", onlineUsersInRoom[roomId]);
  });

  socket.on("disconnecting", () => {
    for (const roomId of socket.rooms) {
      if (onlineUsersInRoom[roomId]) {
        onlineUsersInRoom[roomId] = onlineUsersInRoom[roomId].filter(
          (u) => u.socketId !== socket.id
        );
        io.to(roomId).emit("room-users", onlineUsersInRoom[roomId]);
      }
    }
  });

  socket.on("code-change", ({ roomId, code }) => {
    socket.to(roomId).emit("code-update", code); // send to everyone else
  });

  socket.on("disconnect", () => {
    console.log("Socket disconnected:", socket.id);
  });
});

// if(process.env.NODE_ENV === "production") {
//     app.use(express.static(path.join(__dirname, "../frontend/dist")));
//     app.get("/*", (req, res, next) => {
//       if (req.originalUrl.startsWith("/api")) return next(); // Skip API
//       res.sendFile(path.join(frontendDistPath, "index.html"));
//     });
//   }

//   app._router.stack
//   .filter(r => r.route)
//   .forEach(r => console.log(Object.keys(r.route.methods)[0].toUpperCase(), r.route.path));


server.listen(PORT,()=>{
    console.log(`Server is running on PORT:${PORT}`);
    connectDB();
})

