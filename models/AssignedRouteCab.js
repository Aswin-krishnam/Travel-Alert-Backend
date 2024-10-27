// models/AssignedRouteCab.js

const mongoose = require('mongoose');

const assignedRouteCabSchema = new mongoose.Schema({
  route: { type: mongoose.Schema.Types.ObjectId, ref: 'Route', required: true },
  cab: { type: mongoose.Schema.Types.ObjectId, ref: 'TransportProvider', required: true },
  date: { type: Date, required: true },
  time: { type: String, required: true }, // Store time in HH:MM format
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now },
});

assignedRouteCabSchema.pre('save', function (next) {
  this.updated_at = Date.now();
  next();
});

const AssignedRouteCabModel = mongoose.model('AssignedRouteCab', assignedRouteCabSchema);

module.exports = { AssignedRouteCabModel };
