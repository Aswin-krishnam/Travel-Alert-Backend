// models/CabBooking.js
const mongoose = require('mongoose');

const cabBookingSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  cabId: { type: mongoose.Schema.Types.ObjectId, ref: 'TransportProvider', required: true },
  routeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Route', required: true },
  date: { type: Date, required: true },
  time: { type: String, required: true }, // Store time in HH:MM format
  created_at: { type: Date, default: Date.now },
});

const CabBookingModel = mongoose.model('CabBooking', cabBookingSchema);

module.exports = { CabBookingModel };
