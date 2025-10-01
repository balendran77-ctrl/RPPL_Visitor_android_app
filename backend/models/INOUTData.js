const mongoose = require('mongoose');

const inoutDataSchema = new mongoose.Schema({
  phoneNo: { type: String, required: true, ref: 'Visitor' },
  visitorNo: { type: Number, required: true }, // Now only in INOUTData
  purpose: String,
  personToMeet: String,
  visitorPassNo: String,
  inTime: Date,
  outTime: Date,
  status: { type: String, enum: ['IN', 'OUT'], default: 'IN' }
}, { collection: 'inoutdata' });

module.exports = mongoose.model('INOUTData', inoutDataSchema);