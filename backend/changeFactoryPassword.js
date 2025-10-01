require('dotenv').config();
const mongoose = require('mongoose');
const FactoryUser = require('./models/FactoryUser');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/factorydb';

async function changePassword(username, newPassword) {
  await mongoose.connect(MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true });
  try {
    const user = await FactoryUser.findOne({ username });
    if (!user) {
      console.log('User not found');
      return;
    }
    user.password = newPassword;
    user.markModified('password');
    await user.save();
    console.log('Password changed successfully');
  } catch (err) {
    console.error('Error changing password:', err.message);
  } finally {
    mongoose.disconnect();
  }
}

// Usage: node changeFactoryPassword.js username newPassword
const [,, username, newPassword] = process.argv;
if (!username || !newPassword) {
  console.log('Usage: node changeFactoryPassword.js <username> <newPassword>');
  process.exit(1);
}
changePassword(username, newPassword);
