const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const FactoryUserSchema = new mongoose.Schema({
  username: { type: String, unique: true, required: true },
  password: { type: String, required: true },
  factoryName: { type: String, required: true },
  role: { type: String, enum: ['admin', 'user'], default: 'user', required: true }
});

FactoryUserSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

FactoryUserSchema.methods.comparePassword = function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('FactoryUser', FactoryUserSchema);
