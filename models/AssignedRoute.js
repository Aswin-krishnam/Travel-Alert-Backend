const mongoose = require('mongoose');

const assignedRouteSchema = new mongoose.Schema({
  route: { type: mongoose.Schema.Types.ObjectId, ref: 'Route', required: true },
  bus: { type: mongoose.Schema.Types.ObjectId, ref: 'TransportProvider', required: true },
  date: { type: Date, required: true },
  time: { type: String, required: true }, // Store time as a string (HH:MM format)
  created_at: { type: Date, default: Date.now },
});

// Add a pre-save hook to set created_at
assignedRouteSchema.pre('save', function (next) {
  this.created_at = Date.now();
  next();
});

const AssignModel = mongoose.model('AssignedRoute', assignedRouteSchema);
module.exports = { AssignModel };
 
