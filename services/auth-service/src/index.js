const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const admin = require('firebase-admin');
const authRoutes = require('./routes/auth.routes');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Initialize Firebase Admin
// Note: You must provide the FIREBASE_PROJECT_ID in the .env,
// and make sure your Google Application Default Credentials are set,
// or initialize with a service account key file.
admin.initializeApp({
  credential: admin.credential.applicationDefault(),
  projectId: process.env.FIREBASE_PROJECT_ID,
});

app.use(cors());
app.use(express.json());

// Main Routes
app.use('/api/auth', authRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', service: 'auth-service' });
});

app.listen(PORT, () => {
    console.log(`Auth Service is running on port ${PORT}`);
});
