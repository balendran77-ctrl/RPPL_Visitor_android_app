
require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// Concurrency-safe visitorNo generator
async function getNextVisitorNo() {
  const counter = await Counter.findOneAndUpdate(
    { name: 'visitorNo' },
    { $inc: { value: 1 } },
    { new: true, upsert: true }
  );
  return counter.value;
}

// Update your visitor creation endpoint:
app.post('/api/visitor', authMiddleware, async (req, res) => {
  try {
    const visitorNo = await getNextVisitorNo();
    const visitor = new Visitor({
      visitorNo,
      visitorName: req.body.visitorName,
      phoneNo: req.body.phoneNo,
      idProof: req.body.idProof,
      company: req.body.company,
      address: req.body.address,
      // ...other fields as needed
    });
    await visitor.save();
    res.json(visitor);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));

const crypto = require('crypto');

const Visitor = require('./models/Visitor');
const FactoryUser = require('./models/FactoryUser');
const jwt = require('jsonwebtoken');
// Factory user creation endpoint (admin only, add auth in production)
// Simple admin token check for user creation
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || 'adminsecret';
app.post('/api/factoryuser/create', async (req, res) => {
  const { username, password, factoryName, role } = req.body;
  const adminToken = req.headers['x-admin-token'];
  if (adminToken !== ADMIN_TOKEN) {
    return res.status(403).json({ message: 'Forbidden: Only admin can create users' });
  }
  try {
    // Only allow 'admin' role if adminToken is correct, otherwise force 'user'
    let userRole = role === 'admin' ? 'admin' : 'user';
    const user = new FactoryUser({ username, password, factoryName, role: userRole });
    await user.save();
    res.json({ message: 'Factory user created successfully' });
  } catch (err) {
    res.status(400).json({ message: 'Error creating user', error: err.message });
  }
});

// Factory user login endpoint
// Change password endpoint (admin only)
app.post('/api/factoryuser/changepassword', async (req, res) => {
  const { username, password } = req.body;
  try {
    const user = await FactoryUser.findOne({ username });
    if (!user) return res.status(404).json({ message: 'User not found' });
  user.password = password;
  user.markModified('password');
  await user.save();
    res.json({ message: 'Password changed successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Error changing password', error: err.message });
  }
});
app.post('/api/factoryuser/login', async (req, res) => {
  const { username, password } = req.body;
  try {
    const user = await FactoryUser.findOne({ username });
    if (!user) return res.status(401).json({ message: 'Invalid username or password' });
    const isMatch = await user.comparePassword(password);
    if (!isMatch) return res.status(401).json({ message: 'Invalid username or password' });
  // Create JWT token with role
  const token = jwt.sign({ userId: user._id, factoryName: user.factoryName, role: user.role }, process.env.JWT_SECRET || 'secret', { expiresIn: '1d' });
  res.json({ token, factoryName: user.factoryName, role: user.role });
  } catch (err) {
    res.status(500).json({ message: 'Login error', error: err.message });
  }
});

// JWT authentication middleware
function authMiddleware(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (!authHeader) return res.status(401).json({ message: 'No token provided' });
  const token = authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'Malformed token' });
  jwt.verify(token, process.env.JWT_SECRET || 'secret', (err, decoded) => {
    if (err) return res.status(401).json({ message: 'Invalid token' });
    req.user = decoded;
    next();
  });
}
const INOUTData = require('./models/INOUTData');

// Force creation of inoutdata collection if it doesn't exist
(async () => {
  try {
    const count = await INOUTData.countDocuments({});
    if (count === 0) {
      // Insert a dummy document and remove it
      const dummy = new INOUTData({
        phoneNo: 'dummy',
        visitorNo: 0,
        purpose: 'init',
        personToMeet: 'init',
        visitorPassNo: 'init',
        inTime: new Date(),
        status: 'IN'
      });
      await dummy.save();
      await INOUTData.deleteOne({ _id: dummy._id });
    }
  } catch (err) {
    console.error('Error ensuring inoutdata collection exists:', err.message);
  }
})();

// Get visitors IN/OUT for a particular day (new structure)
app.get('/api/visitors/report', authMiddleware, async (req, res) => {
  const { date } = req.query; // date in YYYY-MM-DD format
  if (!date) return res.status(400).json({ message: 'Date is required' });
  try {
    const start = new Date(date + 'T00:00:00.000Z');
    const end = new Date(date + 'T23:59:59.999Z');
    // Find INOUTData with inTime or outTime on that day
    const inoutDatas = await INOUTData.find({
      $or: [
        { inTime: { $gte: start, $lte: end } },
        { outTime: { $gte: start, $lte: end } }
      ]
    }).sort({ inTime: -1 });
    // Fetch Visitor info for each log
    const results = await Promise.all(inoutDatas.map(async log => {
      const visitor = await Visitor.findOne({ phoneNo: log.phoneNo });
      return {
        ...log.toObject(),
        visitorName: visitor ? visitor.visitorName : '',
        idProof: visitor ? visitor.idProof : '',
        company: visitor ? visitor.company : '',
        address: visitor ? visitor.address : ''
      };
    }));
    res.json(results);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Create or confirm IN (new structure)
app.post('/api/visitor/in', authMiddleware, async (req, res) => {
  const { phoneNo, visitorName, idProof, company, address, purpose, personToMeet, visitorPassNo } = req.body;
  if (!phoneNo) return res.status(400).json({ message: 'Phone number is required' });
  // Find or create Visitor and assign visitorNo
  let visitor = await Visitor.findOne({ phoneNo });
  let visitorNo;
  if (!visitor) {
    // Get max visitorNo from INOUTData
    const lastInout = await INOUTData.findOne({}, {}, { sort: { visitorNo: -1 } });
    visitorNo = lastInout && lastInout.visitorNo ? lastInout.visitorNo + 1 : 1;
    visitor = new Visitor({
      phoneNo,
      visitorName,
      idProof,
      company,
      address
    });
    await visitor.save();
  } else {
    // Update details if changed
    visitor.visitorName = visitorName;
    visitor.idProof = idProof;
    visitor.company = company;
    visitor.address = address;
    await visitor.save();
    // Find last visitorNo for this phoneNo
    const lastInout = await INOUTData.findOne({ phoneNo }, {}, { sort: { visitorNo: -1 } });
    if (lastInout && lastInout.visitorNo) {
      visitorNo = lastInout.visitorNo;
    } else {
      // If no previous INOUTData, assign new visitorNo
      const lastGlobal = await INOUTData.findOne({}, {}, { sort: { visitorNo: -1 } });
      visitorNo = lastGlobal && lastGlobal.visitorNo ? lastGlobal.visitorNo + 1 : 1;
    }
  }
  // Check last INOUTData for this visitor
  // Check if last INOUTData for this visitor is still IN
  const lastLog = await INOUTData.findOne({ phoneNo }, {}, { sort: { inTime: -1 } });
  if (lastLog && lastLog.status === 'IN' && !lastLog.outTime) {
    return res.status(400).json({ message: 'Already IN' });
  }
  // Create INOUTData entry with visitorNo
  const inoutData = new INOUTData({
    phoneNo,
    visitorNo,
    purpose,
    personToMeet,
    visitorPassNo,
    inTime: new Date(),
    status: 'IN'
  });
  await inoutData.save();
  res.json({ message: 'Visitor IN recorded', visitor, inoutData });
});

// Mark OUT (new structure)
app.post('/api/visitor/out', authMiddleware, async (req, res) => {
  const { inoutId } = req.body;
  if (!inoutId) {
    res.status(400).json({ message: 'inoutId is required' });
    return;
  }
  try {
    const inoutData = await INOUTData.findById(inoutId);
    if (!inoutData) {
      // Extra debug info
      res.status(404).json({ message: 'Visitor not found or marked out', debug: { inoutId } });
      return;
    }
    if (inoutData.status === 'OUT') {
      res.status(400).json({ message: 'Visitor already marked OUT', debug: { inoutId, status: inoutData.status } });
      return;
    }
    inoutData.outTime = new Date();
    inoutData.status = 'OUT';
    await inoutData.save();
    res.json({ message: 'Visitor OUT recorded', inoutData });
  } catch (err) {
    res.status(500).json({ message: 'Error marking OUT', error: err.message, debug: { inoutId } });
  }
});

// Get all IN visitors (new structure)
app.get('/api/visitors/in', authMiddleware, async (req, res) => {
  // Find all INOUTData entries with status IN, join with Visitor info
  const inoutDatas = await INOUTData.find({ status: 'IN' }).sort({ inTime: -1 });
  // Fetch Visitor info for each log
  const results = await Promise.all(inoutDatas.map(async log => {
    const visitor = await Visitor.findOne({ phoneNo: log.phoneNo });
    return {
      ...log.toObject(),
      visitorName: visitor ? visitor.visitorName : '',
      idProof: visitor ? visitor.idProof : '',
      company: visitor ? visitor.company : '',
      address: visitor ? visitor.address : ''
    };
  }));
  res.json(results);
});

// Search visitor by phoneNo (new structure)
app.get('/api/visitor/search', authMiddleware, async (req, res) => {
  const { phoneNo } = req.query;
  if (!phoneNo) return res.status(400).json({ message: 'Phone number is required' });
  const visitor = await Visitor.findOne({ phoneNo });
  if (!visitor) return res.json([]);
  const inoutDatas = await INOUTData.find({ phoneNo }).sort({ inTime: -1 });
  // Return latest visit log merged with visitor info for autofill
  const latestLog = inoutDatas[0] || {};
  res.json([
    {
      phoneNo: visitor.phoneNo,
      visitorName: visitor.visitorName,
      idProof: visitor.idProof,
      company: visitor.company,
      address: visitor.address,
      purpose: latestLog.purpose || '',
      personToMeet: latestLog.personToMeet || '',
      visitorPassNo: latestLog.visitorPassNo || '',
      inTime: latestLog.inTime || '',
      outTime: latestLog.outTime || '',
      status: latestLog.status || ''
    }
  ]);
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
