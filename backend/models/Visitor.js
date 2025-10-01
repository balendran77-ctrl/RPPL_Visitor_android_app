const mongoose = require('mongoose');

const visitorSchema = new mongoose.Schema({
  phoneNo: { type: String, unique: true, required: true },
  visitorName: { type: String, required: true },
  idProof: String,
  company: String,
  address: String
});

module.exports = mongoose.model('Visitor', visitorSchema);