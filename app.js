const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { userModel } = require("./models/userModel");
const { TransportProviderModel } = require('./models/TransportProvider');
const { RouteModel } = require('./models/Route');
const { AssignModel } = require('./models/AssignedRoute');
const { BookingModel } = require('./models/Booking');
const { CrowdsourcedReportModel } = require('./models/CrowdsourcedReport');
const { AssignedRouteCabModel } = require('./models/AssignedRouteCab');
const { NotificationModel } = require('./models/Notification');



mongoose.connect("mongodb+srv://aswinkrishnam16:aswinkrishnam@cluster0.2iu51vz.mongodb.net/TravelAlertDB?retryWrites=true&w=majority&appName=Cluster0");


const axios = require('axios');
const nodemailer = require('nodemailer');
const app = express();
app.use(cors());
app.use(express.json());
const jwtSecret = 'blog-app';


const transporter = nodemailer.createTransport({
  service: 'gmail', // or your preferred email service
  auth: {
      user: 'commutesmarthelp@gmail.com', // replace with your email
      pass: 'apyi zojl qjhg fbnq' // replace with your email password or app-specific password
  }
});

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


app.get('/available-cabs/:routeId', async (req, res) => {
  const { routeId } = req.params;

  try {
    const availableCabs = await AssignedRouteCabModel.find({ route: routeId })
      .populate('cab') // assuming `cab_id` is the reference field to TransportProviderModel
      .exec();

    res.status(200).json(availableCabs);
  } catch (error) {
    console.error("Error fetching available cabs:", error);
    res.status(500).json({ error: 'Failed to fetch available cabs' });
  }
});

app.put('/update-user/:userId', async (req, res) => {
  const { userId } = req.params;
  const { name, email, phoneNumber } = req.body;

  try {
    const updatedUser = await userModel.findByIdAndUpdate(userId, {
      name,
      email,
      phoneNumber,
    }, { new: true });

    res.status(200).json({ status: 'success', user: updatedUser });
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ error: 'Failed to update user details' });
  }
});
app.get('/latest-bookings/:userId', async (req, res) => {
  try {
    const bookings = await BookingModel.find({ userId: req.params.userId })
      .sort({ bookingDate: -1 }) // Sort by createdAt descending
      .limit(3); // Limit to 3 latest bookings
    res.status(200).json(bookings);
  } catch (error) {
    console.error('Error fetching bookings:', error);
    res.status(500).json({ error: 'Failed to fetch bookings' });
  }
});

// Fetch latest notifications for a user
app.get('/latest-notifications/:userId', async (req, res) => {
  try {
    const notifications = await NotificationModel.find({ user_id: req.params.userId })
      .sort({ sent_at: -1 }) // Sort by sent_at descending
      .limit(3); // Limit to 3 latest notifications
    res.status(200).json(notifications);
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});
app.get('/available-routes-cabs', async (req, res) => {
  try {
    const routes = await RouteModel.find({});
    const cabs = await TransportProviderModel.find({ service_type: 'Cab', availability_status: 'Active' });
    res.json({ routes, cabs });
  } catch (error) {
    res.status(500).json({ error: 'Error fetching routes or cabs' });
  }
});

// Assign route to a cab
app.post('/assign-route-cab', async (req, res) => {
  const { routeId, cabId, date, time } = req.body;

  try {
    const newAssignedRouteCab = new AssignedRouteCabModel({
      route: routeId,
      cab: cabId,
      date,
      time,
    });

    await newAssignedRouteCab.save();
    res.json({ message: 'Route successfully assigned to cab' });
  } catch (error) {
    res.status(500).json({ error: 'Error assigning route to cab' });
  }
});
app.get('/reports/status/:status', async (req, res) => {
  try {
    const status = req.params.status;
    const reports = await CrowdsourcedReportModel.find({ status });
    res.json(reports);
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve reports by status' });
  }
});
// Verify or confirm a report
app.post('/verify-report/:reportId', async (req, res) => {
  const { reportId } = req.params;
  const { status } = req.body;

  try {
    // Update report status
    const report = await CrowdsourcedReportModel.findByIdAndUpdate(reportId, { status }, { new: true });
    const assignedRoutes = await AssignModel.find({ route: report.route_id });

    if (status=== 'Confirmed'){
      await BookingModel.updateMany(
        { assignedRouteId: { $in: assignedRoutes.map(route => route._id) } },
        { $set: { status: 'Delayed' } }
      );
    }
    else{
      await BookingModel.updateMany(
        { assignedRouteId: { $in: assignedRoutes.map(route => route._id) } },
        { $set: { status: 'Confirmed' } }
      );
    }

    if (status === 'Confirmed' && report.report_type === 'Delay') {
      // Find affected assigned routes


      // Collect user IDs from bookings for these assigned routes
      const userIds = [];
      for (const assignedRoute of assignedRoutes) {
        const bookings = await BookingModel.find({ assignedRouteId: assignedRoute._id });
        bookings.forEach(booking => userIds.push(booking.userId));
      }

      // Get unique user IDs
      const uniqueUserIds = [...new Set(userIds)];

      // Fetch user details
      const users = await userModel.find({ _id: { $in: uniqueUserIds } });

      // Send email notifications
      users.forEach(async (user) => {
        const mailOptions = {
          from: 'commutesmarthelp@gmail.com',
          to: user.email,
          subject: 'Route Delay Notification',
          html: `
            <div style="font-family: Arial, sans-serif; background-color: #f4f4f4; padding: 20px;">
              <h2 style="color: #2596be;">Route Delay Notification</h2>
              <p>Dear ${user.name},</p>
              <p>We regret to inform you that your booked route has been delayed.</p>
              <p>Please plan accordingly. We apologize for the inconvenience.</p>
              <p>Thank you for your understanding,<br>CommuteSmart: Real-Time Alerts & Alternative Route Suggestions</p>
            </div>
          `,
        };

        // Send the email
        transporter.sendMail(mailOptions, (error, info) => {
          if (error) {
            console.error(`Error sending email to ${user.email}:`, error);
          } else {
            console.log(`Email sent to ${user.email}:`, info.response);
          }
        });

        // Add notification to the Notifications table
        const notification = new NotificationModel({
          user_id: user._id,
          route_id: report.route_id,
          notification_type: 'Delay Alert',
          message: `Your booked route has been delayed. Please plan accordingly.`,
          sent_at: new Date(),
        });

        await notification.save();
      });

      // Update booking status to 'Delayed'
      
    }

    res.status(200).json({ message: `Report ${status} successfully`, report });
  } catch (error) {
    console.error('Error verifying report:', error);
    res.status(500).json({ error: 'Failed to update report status' });
  }
});



app.post('/submit-report', async (req, res) => {
  try {
    const { userId, routeId, reportType, description } = req.body;
    const newReport = new CrowdsourcedReportModel({
      user_id: userId,
      route_id: routeId,
      report_type: reportType,
      description,
    });
    await newReport.save();
    res.status(200).json({ message: 'Report submitted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to submit report' });
  }
});

// Fetch reports for admin verification
app.get('/reports', async (req, res) => {
  try {
    const reports = await CrowdsourcedReportModel.find({});
    res.status(200).json(reports);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch reports' });
  }
});



app.get('/user-bookings/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    // Get all bookings for the user
    const bookings = await BookingModel.find({ userId });

    const bookingDetails = await Promise.all(
      bookings.map(async (booking) => {
        const assignedRoute = await AssignModel.findById(booking.assignedRouteId);
        const route = await RouteModel.findById(assignedRoute.route);
        const bus = await TransportProviderModel.findById(assignedRoute.bus);

        return {
          bookingId: booking._id,
          bookingDate: booking.bookingDate,
          status: booking.status,
          routeId:route._id,
          routeNumber: route.route_number,
          startLocation: route.start_location.name,
          endLocation: route.end_location.name,
          busName: bus.name,
          travelDate: assignedRoute.date,
          travelTime: assignedRoute.time,
        };
      })
    );

    res.status(200).json(bookingDetails);
  } catch (error) {
    console.error("Error fetching bookings:", error);
    res.status(500).json({ error: "Error fetching booking details" });
  }
});

app.post('/book-route', async (req, res) => {
  const { userId, assignedRouteId } = req.body;

  try {
    // Fetch the user's email from the User model
    const assignedRoutes = await AssignModel.findById(assignedRouteId);
    const route = await RouteModel.findById(assignedRoutes.route);

    const user = await userModel.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Create a new booking
    const newBooking = new BookingModel({
      userId,
      assignedRouteId,
    });

    // Save the booking
    await newBooking.save();
    // console.log("Success")
    // Send confirmation email

    const currentDate = new Date();
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    const formattedDate = currentDate.toLocaleDateString(undefined, options);
    const formattedTime = currentDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const mailOptions = {
      from: 'commutesmarthelp@gmail.com',
      to: user.email,
      subject: 'CommuteSmart: Your Booking Confirmation',
      html: `
        <html>
          <head>
            <style>
              body {
                font-family: 'Arial', sans-serif;
                background-color: #f4f7fa;
                color: #333;
                margin: 0;
                padding: 20px;
              }
              .container {
                background-color: #ffffff;
                border-radius: 12px;
                box-shadow: 0 6px 18px rgba(0, 0, 0, 0.1);
                padding: 40px;
                max-width: 650px;
                margin: auto;
                border-top: 8px solid #2596be;
              }
              h2 {
                color: #2596be;
                font-size: 28px;
                border-bottom: 3px solid #2596be;
                padding-bottom: 10px;
              }
              p {
                font-size: 16px;
                color: #555;
                line-height: 1.6;
              }
              .journey-details {
                margin: 25px 0;
                padding: 20px;
                border-left: 6px solid #2596be;
                background-color: #e7f5fb;
                border-radius: 8px;
              }
              .journey-details p {
                font-size: 15px;
                color: #333;
              }
              .footer {
                margin-top: 25px;
                font-size: 14px;
                color: #777;
                text-align: center;
              }
              .location {
                font-weight: bold;
                color: #ff6f61;
              }
              .thank-you {
                margin-top: 25px;
                font-size: 18px;
                color: #2596be;
                font-weight: 600;
              }
            </style>
          </head>
          <body>
            <div class="container">
              <h2>Your Booking is Confirmed!</h2>
              <p>Hi ${user.name},</p>
              <p>Your journey with CommuteSmart is all set! Here’s a summary of your booking details:</p>
              
              <div class="journey-details">
                <p><strong>Booking ID:</strong> ${assignedRouteId}</p>
                <p><strong>Starting Location:</strong> <span class="location">${route.start_location.name}</span></p>
                <p><strong>Destination:</strong> <span class="location">${route.end_location.name}</span></p>
                <p><strong>Date & Time:</strong> ${formattedDate} at ${formattedTime}</p>
              </div>
    
              <p class="thank-you">We appreciate your choice to travel with us!</p>
              <p class="footer">Safe travels,<br>CommuteSmart: Real-Time Alerts & Alternative Routes</p>
            </div>
          </body>
        </html>
      `,
    };    
    
    
    
    // Send the email
    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        return console.log(error);
      }
      console.log('Email sent: ' + info.response);
    });

    return res.status(201).json({ message: 'Booking created successfully' });
  } catch (error) {
    console.error('Error creating booking:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

app.get('/assignedRoutes', async (req, res) => {
  try {
    // Step 1: Get all assigned routes
    const assignedRoutes = await AssignModel.find();

    // Step 2: Fetch route and bus details for each assigned route
    const assignedRoutesWithDetails = await Promise.all(assignedRoutes.map(async (assigned) => {
      const route = await RouteModel.findById(assigned.route); // Fetch the route details manually
      const bus = await TransportProviderModel.findById(assigned.bus); // Fetch the bus details manually
      
      return {
        _id: assigned._id,
        date: assigned.date,
        time: assigned.time,
        route: {
          route_number: route.route_number,
          start_location: route.start_location.name,
          end_location: route.end_location.name,
        },
        bus: {
          name: bus.name,
          contact_info: bus.contact_info,
        }
      };
    }));

    res.json(assignedRoutesWithDetails);
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
