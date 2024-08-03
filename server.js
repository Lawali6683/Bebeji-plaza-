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
const webpush = require('web-push');

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const PORT = process.env.PORT || 3000;

// MongoDB setup
mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.log(err));

// Session setup
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

// Routes
const userRoutes = require('./routes/userRoutes');
const certificateRoutes = require('./routes/certificateRoutes');
app.use(userRoutes);
app.use(certificateRoutes);

// Post creation route
const upload = multer({ dest: 'uploads/' });
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

// Push notifications setup
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

// Socket.io setup
io.on('connection', (socket) => {
  console.log('New client connected');
  socket.on('disconnect', () => {
    console.log('Client disconnected');
  });
});

// Static file serving
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// File upload route
app.post('/upload', upload.single('image'), (req, res) => {
  try {
    res.status(200).json({
      message: 'Image uploaded successfully',
      imagePath: `/uploads/${req.file.filename}`
    });
  } catch (error) {
    res.status(500).json({ message: 'Image upload failed' });
  }
});

// ID validation route
let usedIds = [];
app.post('/validate-id', (req, res) => {
  const { id } = req.body;
  if (!id.startsWith('5')) {
    return res.status(400).send({ success: false, message: 'ID must start with 5' });
  }
  if (usedIds.includes(id)) {
    return res.status(400).send({ success: false, message: 'ID has already been used' });
  }
  usedIds.push(id);
  res.status(200).send({ success: true, message: 'ID is valid and unique' });
});

// Server setup
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
