const router = require('express').Router();
const pool = require('../db');
const authMiddleware = require('../middleware/auth');

// GET /api/records - admin dobi vse, zaposleni samo svoje
router.get('/', authMiddleware, async (req, res) => {
  try {
    let result;
    if (req.user.role === 'admin') {
      result = await pool.query(`
        SELECT tr.*, u.name, u.email 
        FROM time_records tr
        JOIN users u ON tr.user_id = u.id
        ORDER BY tr.start_time DESC
      `);
    } else {
      result = await pool.query(`
        SELECT tr.*, u.name, u.email 
        FROM time_records tr
        JOIN users u ON tr.user_id = u.id
        WHERE tr.user_id = $1
        ORDER BY tr.start_time DESC
      `, [req.user.id]);
    }
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/records/start - začni delo
router.post('/start', authMiddleware, async (req, res) => {
  try {
    // Preveri če že ima aktiven zapis
    const active = await pool.query(
      'SELECT * FROM time_records WHERE user_id = $1 AND end_time IS NULL',
      [req.user.id]
    );
    if (active.rows.length > 0)
      return res.status(400).json({ error: 'Že imaš aktiven začetek dela' });

    const result = await pool.query(
      'INSERT INTO time_records (user_id, start_time) VALUES ($1, NOW()) RETURNING *',
      [req.user.id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/records/stop - zaključi delo
router.post('/stop', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      'UPDATE time_records SET end_time = NOW() WHERE user_id = $1 AND end_time IS NULL RETURNING *',
      [req.user.id]
    );
    if (result.rows.length === 0)
      return res.status(400).json({ error: 'Ni aktivnega začetka dela' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/records/active - preveri aktivno sejo
router.get('/active', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM time_records WHERE user_id = $1 AND end_time IS NULL',
      [req.user.id]
    );
    res.json(result.rows[0] || null);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/records/:id - admin briše zapis
router.delete('/:id', authMiddleware, async (req, res) => {
  if (req.user.role !== 'admin')
    return res.status(403).json({ error: 'Samo admin lahko briše zapise' });
  try {
    await pool.query('DELETE FROM time_records WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
