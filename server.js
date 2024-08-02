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
const dotenv = require('dotenv');

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const PORT = process.env.PORT || 3000;

// Tsararrakin MongoDB
mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('MongoDB ya haɗu'))
  .catch(err => console.log(err));

// Tsararrakin zaman
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false }
}));

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use(express.static(path.join(__dirname, 'public')));

// Hanyoyi
const userRoutes = require('./routes/userRoutes');
const certificateRoutes = require('./routes/certificateRoutes');
app.use(userRoutes);
app.use(certificateRoutes);

//index.html 
app.post('/posts', upload.array('images', 5), async (req, res) => {
  const { title, content } = req.body;
  const images = req.files.map(file => file.path);
  const post = new Post({ title, content, user: req.session.userId, images });
  await post.save();
  res.status(201).json({ success: true, message: 'Post created successfully' });
});

app.get('/posts', async (req, res) => {
  const posts = await Post.find().populate('user');
  res.status(200).json(posts);
});

app.post('/search', async (req, res) => {
  const query = req.body.query;
  try {
    const results = await Post.find({
      $or: [
        { title: new RegExp(query, 'i') },
        { content: new RegExp(query, 'i') }
      ]
    }).populate('user');
    res.json({ results });
  } catch (error) {
    res.status(500).json({ error: 'An error occurred while searching.' });
  }
});

app.post('/storeData', async (req, res) => {
  const { email, ip } = req.body;
  const user = new User({ email, ip });
  await user.save();
  res.status(200).send('Data stored successfully');
});

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
// Tsararrakin Vercel
const vercelConfig = {
  version: 2,
  builds: [
    { src: 'server.js', use: '@vercel/node' },
    { src: 'public/**/*', use: '@vercel/static' }
  ],
  routes: [{ src: '/(.*)', dest: 'server.js' }]
};
fs.writeFileSync('vercel.json', JSON.stringify(vercelConfig, null, 2));

// Tsararrakin Package.json
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

// Fara uwar garken
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
