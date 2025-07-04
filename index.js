// ASSIGNMENT-TEXI1
const express = require('express'); // Import necessary modules
const { MongoClient, ObjectId } = require('mongodb'); // MongoDB client and ObjectId for handling MongoDB IDs
const cors = require('cors'); // CORS middleware for handling cross-origin requests
const bcrypt = require('bcrypt'); // Bcrypt for hashing passwords
const jwt = require('jsonwebtoken'); // JWT for handling JSON Web Tokens
const path = require('path'); // Path module for handling file paths
require('dotenv').config(); // Load environment variables from .env file
const port = process.env.PORT || 3000; // Set the port from environment variables or default to 3000
const app = express(); // Create an Express application
app.use(express.json()); // Middleware to parse JSON request bodies
app.use(cors()); // Enable CORS for all routes
const uri = 'mongodb+srv://Farhan:Anaskulim123@mytexi-c.t2bkcu2.mongodb.net/'; // MongoDB connection URI
const client = new MongoClient(uri);   // Create a new MongoDB client instance
let db; // Variable to hold the database connection
// JWT configuration
const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '1d';
const saltRounds = 10; // Number of salt rounds for bcrypt hashing

// Middleware for authentication and authorization
// This middleware checks for a valid JWT authentication token in the request headers
function authenticate(req, res, next) {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Unauthorized' });
      // Verify the token using the JWT secret
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    } catch (err) {
        res.status(401).json({ error: 'Invalid token' });
    }
}
// This middleware checks if the user has one of the specified roles
function authorize(roles) {
    return (req, res, next) => {
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({ error: 'Forbidden' });
        }
        next();
    };
}
// Connect to MongoDB and start the server
// This function connects to the MongoDB database and starts the Express server
async function start() {
    try {
        await client.connect();
        db = client.db('MyTaxi');
        console.log("Connected to MongoDB");
        app.listen(port, () => console.log(`Listening on PORT:${port}`)); // Start the server after connecting to the database
    } catch (err) {
        console.error(err);
        process.exit(1); // Exit if DB connection fails
    }
}

start();  // Start the server after connecting to the database

// ---------------- AUTH ----------------//
// This route handles user registration
app.post('/auth/register', async (req, res) => {
    const { name, email, password, role, adminKey } = req.body;
    if (!['passenger', 'driver', 'admin'].includes(role)) {
        return res.status(400).json({ error: 'Invalid role' });
    }
    if (role === 'admin') {
        const expectedKey = process.env.ADMIN_KEY;
        if (!adminKey || adminKey !== expectedKey) {
            return res.status(403).json({ error: 'Invalid admin access key' });
        }
    }
    try {
        const existing = await db.collection('users').findOne({ email });
        if (existing) return res.status(409).json({ error: 'Email already registered' });
        const hashedPassword = await bcrypt.hash(password, saltRounds);
        const result = await db.collection('users').insertOne({ name, email, password: hashedPassword, role });
        res.status(201).json({ message: 'User registered successfully', id: result.insertedId });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Registration failed' });
    }
});
// This route handles user login
app.post('/auth/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const user = await db.collection('users').findOne({ email });
        if (!user || !(await bcrypt.compare(password, user.password))) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        const token = jwt.sign(
            { id: user._id.toString(), role: user.role },
            JWT_SECRET,
            { expiresIn: JWT_EXPIRES_IN }
        );
        res.status(200).json({ token });
    } catch {
        res.status(500).json({ error: 'Login failed' });
    }
});

// ---------------- PASSENGER ----------------
// This route allows passengers to create a new order
app.post('/passengers/order', authenticate, authorize(['passenger']), async (req, res) => {
  const fareTable = {
  "utem-lestari|melaka sentral": 15,
  "melaka sentral|utem-lestari": 15,
  "utem-lestari|utem-satria": 4,
  "utem-satria|utem-lestari": 4,
  "utem-lestari|mitc": 7.5,
  "mitc|utem-lestari": 7.5,
  "utem-lestari|mydin": 7.5,
  "mydin|utem-lestari": 7.5,
  "utem-lestari|melaka mall": 11,
  "melaka mall|utem-lestari": 11,
  "utem-lestari|aeon ayer keroh": 12,
  "aeon ayer keroh|utem-lestari": 12,
  "utem-lestari|lotus cheng": 14,
  "lotus cheng|utem-lestari": 14,
  "utem-satria|melaka sentral": 15,
  "melaka sentral|utem-satria": 15,
  "utem-satria|mitc": 7.5,
  "mitc|utem-satria": 7.5,
  "utem-satria|mydin": 7.5,
  "mydin|utem-satria": 7.5,
  "utem-satria|melaka mall": 11,
  "melaka mall|utem-satria": 11,
  "utem-satria|aeon ayer keroh": 12,
  "aeon ayer keroh|utem-satria": 12,
  "utem-satria|lotus cheng": 14,
  "lotus cheng|utem-satria": 14,
  "melaka sentral|mitc": 9,
  "mitc|melaka sentral": 9,
  "melaka sentral|melaka mall": 4.5,
  "melaka mall|melaka sentral": 4.5,
  "melaka sentral|mydin": 9,
  "mydin|melaka sentral": 9,
  "melaka sentral|aeon ayer keroh": 4.5,
  "aeon ayer keroh|melaka sentral": 4.5,
   "melaka sentral|lotus cheng": 11,
   "lotus cheng|melaka sentral": 11,
   "mitc|melaka mall": 5,
   "melaka mall|mitc": 5,
    "mitc|mydin": 4,
    "mydin|mitc": 4,
    "mitc|aeon ayer keroh": 5.5,
    "aeon ayer keroh|mitc": 5.5,
    "mitc|lotus cheng": 9.5,
    "lotus cheng|mitc": 9.5,
    "melaka mall|mydin": 5,
    "mydin|melaka mall": 5,
    "melaka mall|aeon ayer keroh": 4,
    "aeon ayer keroh|melaka mall": 4,
    "melaka mall|lotus cheng": 11,
    "lotus cheng|melaka mall": 11,
    "mydin|aeon ayer keroh": 6,
    "aeon ayer keroh|mydin": 6,
    "mydin|lotus cheng": 10,
    "lotus cheng|mydin": 10,
    "aeon ayer keroh|lotus cheng": 14,
    "lotus cheng|aeon ayer keroh": 14
};
// This route allows passengers to create a new order
  try {
    const { pickupLocation, destination, timeOrder, phoneNumber, payment, date } = req.body;
    const key = `${pickupLocation}|${destination}`;
    const expected = fareTable[key];
    if (!expected || Number(payment) !== expected) {
      return res.status(400).json({ error: 'Invalid route or incorrect payment' });
    }
    const order = {
      pickupLocation,
      destination,
      timeOrder,
      phoneNumber,
      payment: expected,
      date,
      userId: req.user.id,
      status: 'pending'
    };
// Insert the order into the database
    const result = await db.collection('orders').insertOne(order);
    res.status(201).json({ id: result.insertedId });
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: 'Failed to create order', details: err.message });
  }
});
// This route allows passengers to view their orders
app.get('/passengers/orders', authenticate, authorize(['passenger']), async (req, res) => {
    try {
        const userId = typeof req.user.id === 'string' ? new ObjectId(req.user.id) : req.user.id;
        const orders = await db.collection('orders').find({ userId: req.user.id }).toArray();
        res.status(200).json(orders);
    } catch (err) {
        console.error(err);
        res.status(400).json({ error: 'Failed to retrieve orders', details: err.message });
    }
});
// This route allows passengers to cancel an order
app.delete('/passengers/order/:id', authenticate, authorize(['passenger']), async (req, res) => {
    const { id } = req.params;
    try {
        const result = await db.collection('orders').deleteOne({ _id: new ObjectId(id), userId: req.user.id, status: 'pending' });
        if (result.deletedCount === 0) return res.status(404).json({ error: 'Order not found or not cancelable' });
        res.status(200).json({ message: 'Order cancelled successfully' });
    } catch (err) {
        console.error(err); // Log to console
        res.status(400).json({ error: 'Failed to cancel order', details: err.message });
    }
});
// This route allows passengers to update their profile
app.delete('/passengers/account', authenticate, authorize(['passenger']), async (req, res) => {
    try {
        await db.collection('users').deleteOne({ _id: new ObjectId(req.user.id) });
        res.status(200).json({ message: 'Account successfully deleted' });
    } catch (err) {
        console.error(err); // Log to console
        res.status(400).json({ error: 'Failed to delete account', details: err.message });
    }
});
// This route allows passengers to view the driver assigned to their order
app.get('/passengers/order/:id/driver', authenticate, authorize(['passenger']), async (req, res) => {
  try {
    const order = await db.collection('orders').findOne({
      _id: new ObjectId(req.params.id),
      userId: req.user.id
    });

    if (!order || !['accepted', 'completed'].includes(order.status) || !order.driverId) {
      return res.status(404).json({ error: 'No driver assigned' });
    }
    const driver = await db.collection('users').findOne(
      { _id: new ObjectId(order.driverId) },  
      {
        projection: {
          name: 1,
          phone: 1,
          carname: 1,
          locationFrom: 1
        }
      }
    );

    if (!driver) {
      return res.status(404).json({ error: 'Driver not found' });
      }
    res.status(200).json(driver);
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: 'Failed to retrieve driver info', details: err.message });
  }
});

// This route allows passengers to view available orders
app.get('/drivers/orders', authenticate, authorize(['driver']), async (req, res) => {
    try {
        const orders = await db.collection('orders').find({ status: 'pending' }).toArray();
        res.status(200).json(orders);
    } catch (err) {
        console.error(err); // Log to console
        res.status(400).json({ error: 'Failed to retrieve orders', details: err.message });
    }
});
// This route allows passengers to mark an order as completed
app.post('/passengers/order/:id/complete', authenticate, authorize(['passenger']), async (req, res) => {
  try {
    const result = await db.collection('orders').updateOne(
  {
    _id: new ObjectId(req.params.id),
    userId: req.user.id,
    status: 'accepted',
    driverId: { $exists: true }
  },
      { $set: { status: 'completed' } }
);
    if (result.modifiedCount === 0) {
      return res.status(404).json({ error: 'Order not found or not eligible to complete' });
    }

    res.status(200).json({ message: 'Order marked as completed' });
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: 'Failed to complete order', details: err.message });
  }
});
// This route allows passengers to update their profile
app.delete('/passengers/account', authenticate, authorize(['passenger']), async (req, res) => {
  try {
    await db.collection('users').deleteOne({ _id: new ObjectId(req.user.id) });
    res.status(200).json({ message: 'Account successfully deleted' });
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: 'Failed to delete account', details: err.message });
  }
});

//  Add this route exactly as shown below
app.post('/passengers/order/:id/feedback', authenticate, authorize(['passenger']), async (req, res) => {
  const { feedback } = req.body;
  if (!feedback || feedback.length < 3) {
    return res.status(400).json({ error: 'Feedback is required and should be meaningful.' });
  }
  try {
    const result = await db.collection('orders').updateOne(
      {
        _id: new ObjectId(req.params.id),
        userId: req.user.id,
        status: 'completed'
      },
      {
        $set: { feedback }
      }
    );
    if (result.modifiedCount === 0) {
      return res.status(404).json({ error: 'Order not found or not eligible for feedback' });
    }
    res.status(200).json({ message: 'Feedback submitted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to submit feedback', details: err.message });
  }
});

// ---------------- DRIVER ----------------//
// This route allows drivers to view available orders
app.get('/drivers/orders', authenticate, authorize(['driver']), async (req, res) => {
    try {
        const orders = await db.collection('orders').find({ status: 'pending' }).toArray();
        res.status(200).json(orders);
    } catch {
        res.status(400).json({ error: 'Failed to retrieve orders' });
    }
});

// This route allows drivers to accept an order
app.post('/drivers/accept', authenticate, authorize(['driver']), async (req, res) => {
  const { orderId } = req.body;
  try {
    const result = await db.collection('orders').updateOne(
      {
        _id: new ObjectId(orderId),
        status: 'pending',
        driverId: { $exists: false } 
      },
      {
        $set: { status: 'accepted', driverId: new ObjectId(req.user.id) }
      }
    );
    if (result.modifiedCount === 0) {
      return res.status(404).json({ error: 'Order not available or already accepted/canceled' });
    }
    res.json({ message: 'Order accepted' });
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: 'Failed to accept order', details: err.message });
  }
});

// This route allows drivers to cancel an accepted order
app.post('/drivers/order/:id/cancel', authenticate, authorize(['driver']), async (req, res) => {
    try {
        const result = await db.collection('orders').updateOne(
            {
                _id: new ObjectId(req.params.id),
                driverId: new ObjectId(req.user.id),
                status: 'accepted'
            },
            { $set: { status: 'pending' }, $unset: { driverId: "" } }
        );

        if (result.modifiedCount === 0) {
            return res.status(404).json({ error: 'Order not found or not cancelable by this driver' });
        }
        res.status(200).json({ message: 'Order canceled, now available for others' });
    } catch (err) {
        console.error(err);
        res.status(400).json({ error: 'Failed to cancel order', details: err.message });
    }
});
// This route allows drivers to update their profile
app.put('/drivers/profile', authenticate, authorize(['driver']), async (req, res) => {
  const { name, email, password, phone, carname, locationFrom } = req.body;
  try {
    const updates = {
      name,
      email,
      phone,
      carname,
      locationFrom
    };
    //  Hash the password before saving
    if (password) {
      const hashedPassword = await bcrypt.hash(password, 10); // same salt rounds
      updates.password = hashedPassword;
    }
    const result = await db.collection('users').updateOne(
      { _id: new ObjectId(req.user.id) },
      { $set: updates }
    );
    if (result.modifiedCount === 0)
      return res.status(404).json({ error: 'Driver not found' });

    res.json({ message: 'Profile updated' });
  } catch (err) {
    res.status(400).json({ error: 'Failed to update profile', details: err.message });
  }
});

// This route allows drivers to delete their account
app.delete('/drivers/account', authenticate, authorize(['driver']), async (req, res) => {
    try {
        const userId = typeof req.user.id === 'string' ? new ObjectId(req.user.id) : req.user.id;
        const result = await db.collection('users').deleteOne({ _id: userId });
        if (result.deletedCount === 0) {
            return res.status(404).json({ error: 'Account not found' });
        }
        res.status(200).json({ message: 'Account successfully deleted' });
    } catch (err) {
        console.error(err);
        res.status(400).json({ error: 'Failed to delete account', details: err.message });
    }
});
// This route allows drivers to view their accepted orders
app.get('/drivers/my-orders', authenticate, authorize(['driver']), async (req, res) => {
    try {
        const driverId = new ObjectId(req.user.id);
        const orders = await db.collection('orders').find({
            driverId: driverId,
            status: 'accepted'
        }).toArray();
        res.status(200).json(orders);
    } catch (err) {
        console.error(err);
        res.status(400).json({ error: 'Failed to retrieve driver orders', details: err.message });
    }
});
// This route allows drivers to view their completed orders
app.get('/drivers/completed-orders', authenticate, authorize(['driver']), async (req, res) => {
  try {
    const driverId = new ObjectId(req.user.id);
    const completedOrders = await db.collection('orders').find({
      driverId: driverId,
      status: 'completed'
    }).toArray();
    res.status(200).json(completedOrders);
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: 'Failed to retrieve completed orders', details: err.message });
  }
});


// ---------------- ADMIN ----------------//
// This route allows admins to view all user accounts except for admin accounts
app.get('/admin/users', authenticate, authorize(['admin']), async (req, res) => {
    try {
        const users = await db.collection('users').find(
  { role: { $ne: 'admin' } },  //Exclude admins
  { projection: { password: 0 } }
).toArray();

        res.status(200).json(users);
    } catch {
        res.status(500).json({ error: 'Failed to fetch user accounts' });
    }
});
// This route allows admins to delete a user account
app.delete('/admin/users/:id', authenticate, authorize(['admin']), async (req, res) => {
  try {
    const result = await db.collection('users').deleteOne({ _id: new ObjectId(req.params.id) });

    if (result.deletedCount === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.status(204).send();
  } catch {
    res.status(400).json({ error: 'Failed to delete user' });
  }
});

// This route allows admins to view all orders
app.get('/admin/orders', authenticate, authorize(['admin']), async (req, res) => {
    try {
        const orders = await db.collection('orders').find().toArray();
        res.json(orders);
    } catch {
        res.status(400).json({ error: 'Failed to retrieve orders' });
    }
});
// This route allows admins to view a specific order by ID
app.get('/auth/profile', authenticate, async (req, res) => {
  try {
    const user = await db.collection('users').findOne(
      { _id: new ObjectId(req.user.id) },
      { projection: { name: 1, role: 1 } }  //  include role
    );
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

// This route allows admins to delete an order by ID
app.use(express.static(path.join(__dirname)));

// This serves static files from the current directory, allowing access to index.html and other static assets
app.listen(port, () => console.log(`Listening on PORT:${port}`));

