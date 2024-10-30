const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  assignedRouteId: { type: mongoose.Schema.Types.ObjectId, ref: 'AssignedRoute', required: true },
  bookingDate: { type: Date, default: Date.now },
  status: { type: String, default: 'Confirmed' } // Status could also be 'Pending', 'Cancelled', etc.
});

// Pre-save hook to set the booking date if needed
bookingSchema.pre('save', function (next) {
  this.bookingDate = Date.now();
  next();
});

const BookingModel = mongoose.model('Booking', bookingSchema);

module.exports = { BookingModel };
