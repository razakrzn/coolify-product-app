const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// PostgreSQL connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('sslmode=require')
    ? { rejectUnauthorized: false }
    : false,
});

const PRODUCT_SELECT_FIELDS = `
  id,
  name,
  price::float8 AS price,
  category,
  stock,
  created_at
`;

// Create table + seed data on startup
async function initDB() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS products (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        price NUMERIC(10,2) NOT NULL,
        category VARCHAR(100) NOT NULL,
        stock INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // Seed only if empty
    const { rows } = await client.query('SELECT COUNT(*) FROM products');
    if (parseInt(rows[0].count) === 0) {
      await client.query(`
        INSERT INTO products (name, price, category, stock) VALUES
          ('Mechanical Keyboard', 89.99, 'Electronics', 42),
          ('Ergonomic Mouse',     49.99, 'Electronics', 78),
          ('Monitor Stand',       34.99, 'Accessories', 15),
          ('USB-C Hub',           29.99, 'Electronics', 60),
          ('Desk Lamp',           24.99, 'Accessories', 33),
          ('Webcam HD',           74.99, 'Electronics', 20);
      `);
      console.log('Database seeded with sample products');
    }

    console.log('Database ready');
  } finally {
    client.release();
  }
}

// Health check (also verifies DB connection)
app.get('/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok', db: 'connected', timestamp: new Date().toISOString() });
  } catch (e) {
    res.status(503).json({ status: 'error', db: 'disconnected', error: e.message });
  }
});

// GET all products
app.get('/api/products', async (req, res) => {
  try {
    const { rows } = await pool.query(`SELECT ${PRODUCT_SELECT_FIELDS} FROM products ORDER BY id`);
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET single product
app.get('/api/products/:id', async (req, res) => {
  try {
    const { rows } = await pool.query(`SELECT ${PRODUCT_SELECT_FIELDS} FROM products WHERE id = $1`, [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Product not found' });
    res.json(rows[0]);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST create product
app.post('/api/products', async (req, res) => {
  const { name, price, category, stock } = req.body;
  if (!name || !price || !category) {
    return res.status(400).json({ error: 'name, price, category are required' });
  }
  try {
    const { rows } = await pool.query(
      `INSERT INTO products (name, price, category, stock)
       VALUES ($1, $2, $3, $4)
       RETURNING ${PRODUCT_SELECT_FIELDS}`,
      [name, parseFloat(price), category, parseInt(stock) || 0]
    );
    res.status(201).json(rows[0]);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// DELETE product
app.delete('/api/products/:id', async (req, res) => {
  try {
    const { rowCount } = await pool.query('DELETE FROM products WHERE id = $1', [req.params.id]);
    if (!rowCount) return res.status(404).json({ error: 'Product not found' });
    res.json({ message: 'Deleted successfully' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Start server after DB is ready
initDB()
  .then(() => {
    app.listen(PORT, () => console.log(`API running on port ${PORT}`));
  })
  .catch(err => {
    console.error('Failed to initialize DB:', err.message);
    process.exit(1);
  });
