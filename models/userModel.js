const mongoose = require('mongoose');

// Define the schema for User
const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,

  },
  phoneNumber: {
    type: String,
    required: true,
  },
  password: {
    type: String,
    required: true,
  },
  // Optional fields you can add for additional functionality
  role: {
    type: String,
    default: "user", // Can be "admin" or "user"
  },
  createdAt: {
    type: Date,
    default: Date.now,
  }
});

// Create the User model
const userModel = mongoose.model("User", userSchema);

// Export the model
module.exports = { userModel };
