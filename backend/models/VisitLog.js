const mongoose = require('mongoose');

const inoutDataSchema = new mongoose.Schema({
  phoneNo: { type: String, required: true, ref: 'Visitor' },
  purpose: String,
  personToMeet: String,
  visitorPassNo: String,
  inTime: Date,
  outTime: Date,
  status: { type: String, enum: ['IN', 'OUT'], default: 'IN' }
});

module.exports = mongoose.model('INOUTData', inoutDataSchema);