const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const admin = require('firebase-admin');
const authRoutes = require('./routes/auth.routes');

// Load env from root .env
dotenv.config({ path: require('path').resolve(__dirname, '../../../.env') });

// Initialize Firebase Admin SDK with service account key
const serviceAccount = require('../serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: process.env.FIREBASE_PROJECT_ID,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
});

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', service: 'auth-service' });
});

app.listen(PORT, () => {
  console.log(`Auth Service is running on port ${PORT}`);
});
