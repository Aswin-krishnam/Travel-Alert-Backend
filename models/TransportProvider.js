const mongoose = require('mongoose');


const transportProviderSchema = new mongoose.Schema({

  name: {
    type: String,
    required: true,
  },
  contact_info: {
    phone: { type: String, required: true },
    email: { type: String, required: true },
  },
  service_type: {
    type: String,
    enum: ['Cab', 'Bus', 'Train'],
    required: true,
  },
  availability_status: {
    type: String,
    enum: ['Active', 'Inactive'],
    required: true,
    default: 'Active',
  },
  created_at: {
    type: Date,
    default: Date.now,
  },
  updated_at: {
    type: Date,
    default: Date.now,
  },
});

const TransportProviderModel = mongoose.model('TransportProvider', transportProviderSchema);

// Export the model
module.exports = { TransportProviderModel };


