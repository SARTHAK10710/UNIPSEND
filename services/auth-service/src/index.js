const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const admin = require('firebase-admin');
const { Pool } = require('pg');
const authRoutes = require('./routes/auth.routes');

dotenv.config({ path: require('path').resolve(__dirname, '../../../.env') });

const serviceAccount = require('../serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: process.env.FIREBASE_PROJECT_ID,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
});

const pool = new Pool({
  host: process.env.POSTGRES_HOST || 'localhost',
  port: process.env.POSTGRES_PORT || 5432,
  database: process.env.POSTGRES_DB || 'unispend',
  user: process.env.POSTGRES_USER || 'admin',
  password: process.env.POSTGRES_PASSWORD || 'password',
});

const app = express();
const PORT = process.env.AUTH_PORT || 3001;

app.use(cors());
app.use(express.json());

app.use((req, res, next) => {
  req.db = pool;
  next();
});

app.use('/api/auth', authRoutes);

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', service: 'auth-service' });
});

app.listen(PORT, () => {
  console.log(`Auth Service running on port ${PORT}`);
});
