require("dotenv").config(); // ✅ Must be at the very top

const express = require("express");
const app = express();

require("./config/connectDb")();
require("./config/cronsJobs");

const helmet = require("helmet");
const cors = require("cors");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");
const http = require("http");
const socketIo = require("socket.io");

// Security & middleware
app.use(helmet());
app.disable("x-powered-by");
app.use(morgan("dev"));
app.use(cors({
  origin: process.env.FRONTEND_URL, // e.g., http://localhost:5173
  credentials: true                 // ✅ Required when using cookies/tokens
}));

// const { paymentWebhook } = require('./controllers/wallet');
app.use('/api/wallet/webhook', express.raw({ type: 'application/json' }));



app.use(express.json()); 
app.use(express.urlencoded({ extended: true }));


// Rate limiter
// const limiter = rateLimit({
//   windowMs: 15 * 60 * 1000,
//   max: 100,
//   message: "Too many requests from this IP, please try again later"
// });
// app.use("/api/", limiter);

// Nodemailer (email setup)
require("./services/nodemailer/transporter");

// Routes
const authRouter = require("./routes/authRouter");
const userRouter = require("./routes/userRouter");
const orderRouter = require("./routes/orderRouter");
const adminRouter = require("./routes/adminRouter");
const paymentRouter = require("./routes/paymentRouter");
const walletRouter = require("./routes/wallet");

app.use("/api/auth", authRouter);
app.use("/api/users", userRouter);
app.use("/api/orders", orderRouter);
app.use("/api/admin", adminRouter);
app.use("/api/wallet", walletRouter);
app.use("/api/payment", paymentRouter);


// Catch-all for undefined routes
app.all("*any", (req, res) => {
  res.send(`${req.method} ${req.originalUrl} is not an endpoint on this server`);
});

// Error handling middleware
const errorHandler = require("./middleware/errorHandler");
app.use(errorHandler);

// ✅ Create server for both HTTP and Socket.IO
const server = http.createServer(app);

// ✅ Setup Socket.IO with CORS config
const io = socketIo(server, {
  cors: {
    origin: process.env.FRONTEND_URL, // e.g., http://localhost:5173
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    credentials: true
  }
});

// ✅ Socket.IO connection logic
io.on("connection", (socket) => {
  console.log("New client connected");

  socket.on("joinUserRoom", (userId) => {
    socket.join(`user_${userId}`);
  });

  socket.on("disconnect", () => {
    console.log("Client disconnected");
  });
});

// ✅ Make `io` available in routes
app.set("io", io);

// ✅ Start server (not `app.listen`)
const portNumber = process.env.PORT_NUMBER || 3550;
server.listen(portNumber, () => {
  console.log(`Server with Socket.IO is running on port ${portNumber}`);
});
