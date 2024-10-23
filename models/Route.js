const mongoose = require('mongoose');

const routeSchema = new mongoose.Schema({
    transport_type: { type: String, enum: ['Bus', 'Train', 'Cab', 'Metro'], required: true },
    start_location: {
      name: String,
      lat: Number,
      lng: Number,
    },
    end_location: {
      name: String,
      lat: Number,
      lng: Number,
    },
    route_number: { type: String, required: true },
    route_details: { type: Array, required: false },
    created_at: { type: Date, default: Date.now },
    updated_at: { type: Date, default: Date.now },
  });

const RouteModel = mongoose.model('Route', routeSchema);
module.exports = { RouteModel };
