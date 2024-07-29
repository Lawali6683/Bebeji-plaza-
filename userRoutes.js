const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Otp = require('../models/Otp');
const nodemailer = require('nodemailer');
const bcrypt = require('bcrypt');
const crypto = require('crypto');

// Email Configuration
const EMAIL_ADDRESS = 'harunalawali5522@gmail.com';
const EMAIL_PASSWORD = 'Haruna@66';

// Register route
router.post('/register', async (req, res) => {
  const { username, shopNumber, businessName, fullName, email, password, phoneNumber, shopImage, faceImage, profileImage } = req.body;
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({ username, shopNumber, businessName, fullName, email, password: hashedPassword, phoneNumber, shopImage, faceImage, profileImage });
    await newUser.save();
    const otp = crypto.randomInt(100000, 999999).toString();
    await new Otp({ email, otp }).save();
    const transporter = nodemailer.createTransport({ service: 'gmail', auth: { user: EMAIL_ADDRESS, pass: EMAIL_PASSWORD } });
    const mailOptions = {
      from: EMAIL_ADDRESS,
      to: email,
      subject: 'Your OTP Code',
      text: `Hello ${fullName}, welcome to Bebeji Plaza. Your OTP code is ${otp}. This code is invalid after 2 days. Thanks, Haruna Lawali, Lead Developer`
    };
    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        return res.status(500).send('Error sending email');
      }
      res.status(201).send({ success: true, message: 'User registered successfully. Check your email for OTP' });
    });
  } catch (error) {
    res.status(400).send({ success: false, message: error.message });
  }
});

// Verify OTP route
router.post('/verify-otp', async (req, res) => {
  const { email, otp } = req.body;
  try {
    const otpRecord = await Otp.findOne({ email, otp });
    if (otpRecord) {
      await User.updateOne({ email }, { $set: { otpVerified: true } });
      res.send({ success: true, message: 'OTP verified successfully' });
    } else {
      res.send({ success: false, message: 'Invalid OTP' });
    }
  } catch (error) {
    res.status(500).send({ success: false, message: error.message });
  }
});

// Login route
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });
    if (user && await bcrypt.compare(password, user.password)) {
      if (!user.otpVerified) {
        return res.status(403).send({ success: false, message: 'OTP not verified' });
      }
      req.session.userId = user._id;
      res.status(200).send({ success: true, message: 'Logged in successfully' });
    } else {
      res.status(400).send({ success: false, message: 'Invalid email or password' });
    }
  } catch (error) {
    res.status(500).send({ success: false, message: error.message });
  }
});

// Forget password route
router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;
  try {
    const user = await User.findOne({ email });
    if (user) {
      let transporter = nodemailer.createTransport({ service: 'gmail', auth: { user: EMAIL_ADDRESS, pass: EMAIL_PASSWORD } });
      let mailOptions = { from: EMAIL_ADDRESS, to: user.email, subject: 'Password Recovery', text: `Your password is ${user.password}` };
      transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
          return res.status(500).send({ success: false, message: error.message });
        }
        res.status(200).send({ success: true, message: 'Password sent to your email' });
      });
    } else {
      res.status(404).send({ success: false, message: 'Email not found' });
    }
  } catch (error) {
    res.status(500).send({ success: false, message: error.message });
  }
});

// Serve user profile
router.get('/profile/:userId', async (req, res) => {
  try {
    const user = await User.findById(req.params.userId).select('-__v');
    res.send(`
      <h1>Profile</h1>
<p>Username: ${user.fullName}</p>
<p>Email: ${user.email}</p>
<p><img src="${user.profileImage}" alt="Profile Image" /></p>
`);
} catch (error) {
res.status(400).send('Error fetching user profile: ' + error.message);
}
});

// Collect user data route
app.post('/storeData', async (req, res) => {
const { email, ip } = req.body;

try {
const user = await User.findOne({ email });
if (user) {
user.ip = ip;
await user.save();
res.status(200).send({ success: true, message: 'Data stored successfully' });
} else {
res.status(404).send({ success: false, message: 'User not found' });
}
} catch (error) {
res.status(500).send({ success: false, message: error.message });
}
});

// Report submission routes
let phoneReports = [];
let civilReports = [];

app.post('/submit-phone-report', (req, res) => {
const reportData = req.body;
phoneReports.push(reportData);
res.send({ message: 'Phone report submitted successfully', reportData });
});

app.post('/submit-civil-report', (req, res) => {
const reportData = req.body;
civilReports.push(reportData);
res.send({ message: 'Civil report submitted successfully', reportData });
});

app.get('/get-phone-reports', (req, res) => {
res.send(phoneReports);
});

app.get('/get-civil-reports', (req, res) => {
res.send(civilReports);
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

// Serve static files
app.get('/', (req, res) => {
res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Handle ID validation
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

// Example notification sending route
app.post('/send-notification', (req, res) => {
const notification = {
title: 'New Alert',
body: 'This is a test notification',
icon: 'icon.png'
};

sendNotification(notification);
res.status(200).json({ success: true, message: 'Notification sent successfully' });
});

// Schedule notifications twice daily
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

// Handle custom events here
socket.on('disconnect', () => {
console.log('Client disconnected');
});
});

// Vercel configuration
const vercelConfig = {
version: 2,
builds: [
{
src: 'server.js',
use: '@vercel/node'
},
{
src: 'public/**/*',
use: '@vercel/static'
}
],
routes: [
{
src: '/(.*)',
dest: 'server.js'
}
]
};

// Save the vercel.json configuration
fs.writeFileSync('vercel.json', JSON.stringify(vercelConfig, null, 2));

// Package.json configuration
const packageJsonConfig = {
scripts: {
start: 'node server.js',
dev: 'nodemon server.js'
},
dependencies: {
"body-parser": "^1.19.0",
"crypto": "^1.0.1",
"express": "^4.17.1",
const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Otp = require('../models/Otp');
const nodemailer = require('nodemailer');
const bcrypt = require('bcrypt');
const crypto = require('crypto');

// Email Configuration
const EMAIL_ADDRESS = 'harunalawali5522@gmail.com';
const EMAIL_PASSWORD = 'Haruna@66';

// Register route
router.post('/register', async (req, res) => {
  const { username, shopNumber, businessName, fullName, email, password, phoneNumber, shopImage, faceImage, profileImage } = req.body;
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({ username, shopNumber, businessName, fullName, email, password: hashedPassword, phoneNumber, shopImage, faceImage, profileImage });
    await newUser.save();
    const otp = crypto.randomInt(100000, 999999).toString();
    await new Otp({ email, otp }).save();
    const transporter = nodemailer.createTransport({ service: 'gmail', auth: { user: EMAIL_ADDRESS, pass: EMAIL_PASSWORD } });
    const mailOptions = {
      from: EMAIL_ADDRESS,
      to: email,
      subject: 'Your OTP Code',
      text: `Hello ${fullName}, welcome to Bebeji Plaza. Your OTP code is ${otp}. This code is invalid after 2 days. Thanks, this message from owner Haruna Lawali, Lead Developer`
    };
    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        return res.status(500).send('Error sending email');
      }
      res.status(201).send({ success: true, message: 'User registered successfully. Check your email for get your verification code' });
    });
  } catch (error) {
    res.status(400).send({ success: false, message: error.message });
  }
});

// Verify OTP route
router.post('/verify-otp', async (req, res) => {
  const { email, otp } = req.body;
  try {
    const otpRecord = await Otp.findOne({ email, otp });
    if (otpRecord) {
      await User.updateOne({ email }, { $set: { otpVerified: true } });
      res.send({ success: true, message: 'Code verified successfully' });
    } else {
      res.send({ success: false, message: 'Invalid Code' });
    }
  } catch (error) {
    res.status(500).send({ success: false, message: error.message });
  }
});

// Login route
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });
    if (user && await bcrypt.compare(password, user.password)) {
      if (!user.otpVerified) {
        return res.status(403).send({ success: false, message: 'Code not verified' });
      }
      req.session.userId = user._id;
      res.status(200).send({ success: true, message: 'Logged in successfully' });
    } else {
      res.status(400).send({ success: false, message: 'Invalid email or password' });
    }
  } catch (error) {
    res.status(500).send({ success: false, message: error.message });
  }
});

// Forget password route
router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;
  try {
    const user = await User.findOne({ email });
    if (user) {
      let transporter = nodemailer.createTransport({ service: 'gmail', auth: { user: EMAIL_ADDRESS, pass: EMAIL_PASSWORD } });
      let mailOptions = { from: EMAIL_ADDRESS, to: user.email, subject: 'Password Recovery', text: `Your password is ${user.password}` };
      transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
          return res.status(500).send({ success: false, message: error.message });
        }
        res.status(200).send({ success: true, message: 'Password sent to your email' });
      });
    } else {
      res.status(404).send({ success: false, message: 'Email not found' });
    }
  } catch (error) {
    res.status(500).send({ success: false, message: error.message });
  }
});

// Serve user profile
router.get('/profile/:userId', async (req, res) => {
  try {
    const user = await User.findById(req.params.userId).select('-__v');
    res.send(`
      <h1>Profile</h1>
<p>Username: ${user.fullName}</p>
<p>Email: ${user.email}</p>
<p><img src="${user.profileImage}" alt="Profile Image" /></p>
`);
} catch (error) {
res.status(400).send('Error fetching user profile: ' + error.message);
}
});

// Collect user data route
app.post('/storeData', async (req, res) => {
const { email, ip } = req.body;

try {
const user = await User.findOne({ email });
if (user) {
user.ip = ip;
await user.save();
res.status(200).send({ success: true, message: 'Data stored successfully' });
} else {
res.status(404).send({ success: false, message: 'User not found' });
}
} catch (error) {
res.status(500).send({ success: false, message: error.message });
}
});

// Report submission routes
let phoneReports = [];
let civilReports = [];

app.post('/submit-phone-report', (req, res) => {
const reportData = req.body;
phoneReports.push(reportData);
res.send({ message: 'Phone report submitted successfully', reportData });
});

app.post('/submit-civil-report', (req, res) => {
const reportData = req.body;
civilReports.push(reportData);
res.send({ message: 'Civil report submitted successfully', reportData });
});

app.get('/get-phone-reports', (req, res) => {
res.send(phoneReports);
});

app.get('/get-civil-reports', (req, res) => {
res.send(civilReports);
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

// Serve static files
app.get('/', (req, res) => {
res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Handle ID validation
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

// Example notification sending route
app.post('/send-notification', (req, res) => {
const notification = {
title: 'New Alert',
body: 'This is a test notification',
icon: 'icon.png'
};

sendNotification(notification);
res.status(200).json({ success: true, message: 'Notification sent successfully' });
});

// Schedule notifications twice daily
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

// Handle custom events here
socket.on('disconnect', () => {
console.log('Client disconnected');
});
});

// Vercel configuration
const vercelConfig = {
version: 2,
builds: [
{
src: 'server.js',
use: '@vercel/node'
},
{
src: 'public/**/*',
use: '@vercel/static'
}
],
routes: [
{
src: '/(.*)',
dest: 'server.js'
}
]
};

// Save the vercel.json configuration
fs.writeFileSync('vercel.json', JSON.stringify(vercelConfig, null, 2));

// Package.json configuration
const packageJsonConfig = {
scripts: {
start: 'node server.js',
dev: 'nodemon server.js'
},
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
devDependencies: {
"nodemon": "^2.0.7"
}
};

// Save the package.json configuration
fs.writeFileSync('package.json', JSON.stringify(packageJsonConfig, null, 2));

// Start server
server.listen(PORT, () => {
console.log(`Server is running on port ${PORT}`);
});



