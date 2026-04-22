const router = require('express').Router();
const pool = require('../db');
const auth = require('../middleware/auth');
router.get('/', auth, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Samo admin' });
  try {
    const result = await pool.query('SELECT id, name, email, role, created_at FROM users ORDER BY id');
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});
router.post('/', auth, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Samo admin' });
  const { name, email, password, role } = req.body;
  try {
    const result = await pool.query('INSERT INTO users (name, email, password, role) VALUES ($1, $2, $3, $4) RETURNING id, name, email, role', [name, email, password, role || 'employee']);
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});
module.exports = router;
