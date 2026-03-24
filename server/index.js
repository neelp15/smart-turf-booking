const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
require('dotenv').config();

const uploadRoutes = require('./routes/uploadRoutes');
const turfRoutes = require('./routes/turfRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' })); 

// Routes
app.use('/api', uploadRoutes);
app.use('/api/turfs', turfRoutes);

// Basic Route
app.get('/', (req, res) => {
  res.send('Turf Connect API is running...');
});

// Database Connection (Placeholder)
// mongoose.connect(process.env.MONGODB_URI)
//   .then(() => console.log('MongoDB Connected'))
//   .catch(err => console.log(err));

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
