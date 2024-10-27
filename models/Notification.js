const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  route_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Route',
    required: true,
  },
  notification_type: {
    type: String,
    enum: ['Delay Alert', 'Alternative Route Suggestion'],
    required: true,
  },
  message: {
    type: String,
    required: true,
  },
  sent_at: {
    type: Date,
    default: Date.now,
  },
});

const NotificationModel = mongoose.model('Notification', notificationSchema);

module.exports = { NotificationModel };
