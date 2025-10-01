require('dotenv').config();
const mongoose = require('mongoose');
const FactoryUser = require('./models/FactoryUser');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/factorydb';

async function createUser(username, password, factoryName) {
  await mongoose.connect(MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true });
  try {
    const user = new FactoryUser({ username, password, factoryName });
    await user.save();
    console.log('Factory user created successfully');
  } catch (err) {
    console.error('Error creating user:', err.message);
  } finally {
    mongoose.disconnect();
  }
}

// Usage: node createAdminUser.js username password factoryName
const [,, username, password, factoryName] = process.argv;
if (!username || !password || !factoryName) {
  console.log('Usage: node createAdminUser.js <username> <password> <factoryName>');
  process.exit(1);
}
createUser(username, password, factoryName);