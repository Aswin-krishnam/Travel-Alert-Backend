const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { userModel } = require("./models/userModel");
const { TransportProviderModel } = require('./models/TransportProvider');
const { RouteModel } = require('./models/Route');
const { AssignModel } = require('./models/AssignedRoute');
const axios = require('axios');

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



async function getLocationName(lat, lng) {
  const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`;
  const response = await axios.get(url);
  return response.data.display_name;
}

// app.js

// ... other code remains the same

app.get('/assignedRoutes', async (req, res) => {
  try {
    const assignedRoutes = await AssignedRoute.find()
      .populate('bus') // Populate transport provider details
      .populate({
        path: 'route',
        select: 'start_location end_location transport_type route_number', // Include specific fields from Route
      });
    res.json(assignedRoutes);
  } catch (error) {
    res.status(500).json({ error: 'Error fetching assigned routes' });
  }
});

// ... other code remains the same

app.get('/transport-providers', async (req, res) => {
  const { service_type } = req.query;
  try {
    const providers = await TransportProviderModel.find({ service_type });
    res.json(providers);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching transport providers' });
  }
});

// Assign a route to a bus
app.post('/assignRoute', async (req, res) => {
  const { route, bus, date, time } = req.body;

  if (!route || !bus || !date || !time) {
    return res.status(400).json({ message: 'All fields are required' });
  }

  try {
    const assignedRoute = new AssignModel({
      route,
      bus,
      date,
      time,
    });
    await assignedRoute.save();
    res.status(201).json({ message: 'Route assigned successfully', assignedRoute });
  } catch (error) {
    res.status(500).json({ message: 'Error assigning route' });
  }
});
app.get('/routes/:id', async (req, res) => {
  try {
    const route = await RouteModel.findById(req.params.id); // Fetch route by ID
    if (!route) {
      return res.status(404).json({ error: 'Route not found' });
    }
    res.status(200).json(route);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get Path from OpenRouteService


app.get('/routes', async (req, res) => {
  try {
    const routes = await RouteModel.find(); // Fetch all routes from the database
    res.status(200).json(routes);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
})
// Route to create a new route
app.post('/addRoute', async (req, res) => {
  try {
    const { transport_type, start_location, end_location, route_number } = req.body;

    // Reverse geocode to get names
    const startName = await getLocationName(start_location.lat, start_location.lng);
    const endName = await getLocationName(end_location.lat, end_location.lng);

    const newRoute = new RouteModel({
      transport_type,
      start_location: { name: startName, lat: start_location.lat, lng: start_location.lng },
      end_location: { name: endName, lat: end_location.lat, lng: end_location.lng },
      route_number,
    });

    await newRoute.save();
    res.status(201).json({ message: 'Route added successfully', route: newRoute });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});



app.post('/admin/add-transport-provider', async (req, res) => {
  try {
    const newProvider = new TransportProviderModel(req.body);
    await newProvider.save();
    res.json({ status: 'success' });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
});
// Get all transport providers
app.get('/admin/transport-providers', async (req, res) => {
  try {
    const providers = await TransportProviderModel.find();
    res.json(providers);
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
});

// Delete a transport provider by ID
app.delete('/admin/delete-transport-provider/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const deletedProvider = await TransportProviderModel.findByIdAndDelete(id);
    if (deletedProvider) {
      res.json({ status: 'success', message: 'Transport provider deleted successfully!' });
    } else {
      res.status(404).json({ status: 'error', message: 'Transport provider not found' });
    }
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
});
app.post('/user-data', (req, res) => {
  const { userId } = req.body;
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ status: 'error', message: 'Unauthorized' });
  }

  jwt.verify(token, jwtSecret, (err) => {
    if (err) {
      return res.status(401).json({ status: 'error', message: 'Invalid Token' });
    }

    // Fetch user data from the database
    userModel.findById(userId, { password: 0 }).then((user) => {
      if (user) {
        res.json({ status: 'success', user });
      } else {
        res.json({ status: 'User not found' });
      }
    }).catch((error) => {
      res.status(500).json({ status: 'error', message: error.message });
    });
  });
});
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
          const token = jwt.sign({ email: user.email, role: user.role }, jwtSecret, { expiresIn: '1d' });
            
          // Send the token, userId, and role back to the frontend
          res.json({ status: 'success', userId: user._id, role: user.role, token });
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
