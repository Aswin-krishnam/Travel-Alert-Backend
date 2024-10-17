const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { userModel } = require("./models/userModel");

mongoose.connect("mongodb+srv://aswinkrishnam16:aswinkrishnam@cluster0.2iu51vz.mongodb.net/TravelAlertDB?retryWrites=true&w=majority&appName=Cluster0");

const app = express();
app.use(cors());
app.use(express.json());

// JWT secret key
const jwtSecret = 'blog-app';

// Encryption
const generateHashedPassword = async (password) => {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
};



app.post("/view-users", async (req, res) => {
    try {
      const users = await userModel.find(); // Fetch all users
      res.json(users);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  
app.post("/delete-user", async (req, res) => {
    try {
      await userModel.findByIdAndDelete(req.body._id);
      res.json({ status: "success" });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  
app.post("/update-user", async (req, res) => {
    const { _id, name, email, phone, role } = req.body;
    try {
      await userModel.findByIdAndUpdate(_id, { name, email, phone, role }, { new: true });
      res.json({ status: "success" });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  
app.post('/admin/create-user', async (req, res) => {
    try {
      const { name, emailId, phone, password, role } = req.body;
  
      // Check if user already exists
      const existingUser = await userModel.findOne({ emailId });
      if (existingUser) {
        return res.status(400).json({ status: 'User already exists' });
      }
  
      // Hash the password
      const hashedPassword = await generateHashedPassword(password);
  
      // Create new user
      const newUser = new userModel({
        name,
        email,
        phoneNumber,
        password: hashedPassword,
        role
      });
  
      // Save user to the database
      await newUser.save();
      res.json({ status: 'success' });
    } catch (error) {
      res.status(500).json({ status: 'error', error });
    }
  });

// SignIn route to handle user login
app.post('/signin', async (req, res) => {
  const { email, password } = req.body;

  // Find the user by email
  userModel.findOne({ email }).then((user) => {
    if (user) {
      // Compare the password with the hashed password stored in the DB
      bcrypt.compare(password, user.password, (err, isMatch) => {
        if (isMatch) {
          // If password matches, generate a JWT token
          const token = jwt.sign({ email: user.email }, jwtSecret, { expiresIn: '1d' });
            
          // Send the token and userId back to the frontend
          res.json({ status: 'success', userId: user._id, token });
        } else {
          res.json({ status: 'Password incorrect' });
        }
      });
    } else {
      res.json({ status: 'User not found' });
    }
  }).catch(err => {
    res.json({ status: 'error', message: err.message });
  });
});

app.post("/signup", async (req, res) => {
  let input = req.body;

  try {
    let existingUser = await userModel.findOne({ email: input.email });
    if (existingUser) {
      return res.json({ status: "error", message: "User already exists" });
    }

    // Hashing the password before saving it to the DB
    let hashedPassword = await generateHashedPassword(input.password);
    input.password = hashedPassword;

    // Creating a new user model instance and saving it to the database
    let newUser = new userModel(input);
    await newUser.save();

    res.json({ status: "success", message: "User registered successfully" });
  } catch (error) {
    console.error("Error during user registration:", error);
    res.json({ status: "error", message: "Registration failed" });
  }
  
});

app.listen(8080, () => {
  console.log("Server running on port 8080");
});
