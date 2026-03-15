const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { Pool } = require('pg');
const linkRoutes = require('./routes/link.routes');
const transactionRoutes = require('./routes/transactions.routes');
const balanceRoutes = require('./routes/balance.routes');
const processorRoutes = require('./routes/processor.routes');

dotenv.config({ path: require('path').resolve(__dirname, '../../../.env') });

const pool = new Pool({
  host: process.env.POSTGRES_HOST || 'localhost',
  port: process.env.POSTGRES_PORT || 5432,
  database: process.env.POSTGRES_DB || 'unispend',
  user: process.env.POSTGRES_USER || 'admin',
  password: process.env.POSTGRES_PASSWORD || 'password',
});

const app = express();
const PORT = process.env.PLAID_PORT || 3002;

app.use(cors());
app.use(express.json());

app.use((req, res, next) => {
  req.db = pool;
  next();
});

app.use('/api/plaid/link', linkRoutes);
app.use('/api/plaid/transactions', transactionRoutes);
app.use('/api/plaid/balance', balanceRoutes);
app.use('/api/plaid/processor', processorRoutes);

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', service: 'plaid-service' });
});

app.listen(PORT, () => {
  console.log(`Plaid Service running on port ${PORT}`);
});
