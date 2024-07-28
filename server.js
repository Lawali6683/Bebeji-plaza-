const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const session = require('express-session');
const crypto = require('crypto');
const bcrypt = require('bcrypt');
const nodemailer = require('nodemailer');
const multer = require('multer');
const path = require('path');
const schedule = require('node-schedule');
const http = require('http');
const socketIo = require('socket.io');
const fs = require('fs');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const PORT = process.env.PORT || 3000;

// MongoDB Configuration
const MONGO_URI = 'mongodb+srv://harunalawali5522:haruna66@cluster.mongodb.net/harunaMSA';
mongoose.connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.log(err));

// Session configuration
const sessionSecret = crypto.randomBytes(64).toString('hex');
app.use(session({
  secret: sessionSecret,
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false }
}));

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use(express.static(path.join(__dirname, 'public')));

// Routes
const userRoutes = require('./routes/userRoutes');
const certificateRoutes = require('./routes/certificateRoutes');
app.use(userRoutes);
app.use(certificateRoutes);

// Push notifications setup (Firebase without VAPID keys)
const webpush = require('web-push');
const subscribers = [];
app.post('/subscribe', (req, res) => {
  const subscription = req.body;
  subscribers.push(subscription);
  res.status(201).json({ success: true, message: 'Subscribed successfully' });
});
const sendNotification = (notification) => {
  subscribers.forEach(subscriber => {
    webpush.sendNotification(subscriber, JSON.stringify(notification)).catch(error => {
      console.error('Error sending notification:', error);
    });
  });
};
app.post('/send-notification', (req, res) => {
  const notification = {
    title: 'New Alert',
    body: 'This is a test notification',
    icon: 'icon.png'
  };
  sendNotification(notification);
  res.status(200).json({ success: true, message: 'Notification sent successfully' });
});
schedule.scheduleJob('0 9,21 * * *', () => {
  const notification = {
    title: 'Daily Alert',
    body: 'This is your scheduled notification',
    icon: 'icon.png'
  };
  sendNotification(notification);
});

// Socket.io real-time communication
io.on('connection', (socket) => {
  console.log('New client connected');
  socket.on('disconnect', () => {
    console.log('Client disconnected');
  });
});

// Vercel configuration
const vercelConfig = {
  version: 2,
  builds: [
    { src: 'server.js', use: '@vercel/node' },
    { src: 'public/**/*', use: '@vercel/static' }
  ],
  routes: [{ src: '/(.*)', dest: 'server.js' }]
};
fs.writeFileSync('vercel.json', JSON.stringify(vercelConfig, null, 2));

// Package.json configuration
const packageJsonConfig = {
  scripts: { start: 'node server.js', dev: 'nodemon server.js' },
  dependencies: {
    "body-parser": "^1.19.0",
    "crypto": "^1.0.1",
    "express": "^4.17.1",
    "express-session": "^1.17.1",
    "mongoose": "^5.12.3",
    "multer": "^1.4.2",
    "nodemailer": "^6.4.10",
    "bcrypt": "^5.0.0",
    "node-schedule": "^1.3.0",
    "socket.io": "^4.0.1",
    "web-push": "^3.4.3"
  },
  devDependencies: { "nodemon": "^2.0.7" }
};
fs.writeFileSync('package.json', JSON.stringify(packageJsonConfig, null, 2));

// Start server
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
