const express = require('express');
const router = express.Router();
const { db } = require('../config/database');
const authMiddleware = require('../middleware/auth');

router.get('/', (req, res) => {
  const { muscle_group, movement_type } = req.query;
  let query = 'SELECT * FROM exercises WHERE 1=1';
  const params = [];
  if (muscle_group) { query += ' AND muscle_group = ?'; params.push(muscle_group); }
  if (movement_type) { query += ' AND movement_type = ?'; params.push(movement_type); }
  query += ' ORDER BY name';
  db.all(query, params, (err, rows) => {
    if (err) return res.status(500).json({ success: false, message: 'Database error', error: err.message });
    res.json({ success: true, count: rows.length, exercises: rows });
  });
});

router.get('/:id/history', authMiddleware, (req, res) => {
  const exerciseId = req.params.id;
  const userId = req.user.id;
  const query = `
    SELECT wl.id AS workout_log_id, wl.session_name, wl.workout_date, wl.created_at,
           wls.id AS set_id, wls.set_index, wls.reps, wls.load, wls.notes
    FROM workout_log_sets wls
    JOIN workout_logs wl ON wl.id = wls.workout_log_id
    WHERE wls.exercise_id = ? AND wl.user_id = ?
    ORDER BY wl.workout_date DESC, wl.created_at DESC, wls.set_index
  `;
  db.all(query, [exerciseId, userId], (err, rows) => {
    if (err) return res.status(500).json({ success: false, message: 'Database error', error: err.message });
    const byWorkout = {};
    rows.forEach(r => {
      if (!byWorkout[r.workout_log_id]) {
        byWorkout[r.workout_log_id] = {
          workout_log_id: r.workout_log_id,
          session_name: r.session_name,
          workout_date: r.workout_date,
          created_at: r.created_at,
          sets: []
        };
      }
      byWorkout[r.workout_log_id].sets.push({ set_id: r.set_id, set_index: r.set_index, reps: r.reps, load: r.load, notes: r.notes });
    });
    res.json({ success: true, history: Object.values(byWorkout) });
  });
});

router.get('/:id/alternatives', authMiddleware, (req, res) => {
  const exerciseId = req.params.id;
  const userId = req.user.id;
  db.get('SELECT muscle_group, movement_type FROM exercises WHERE id = ?', [exerciseId], (err, ex) => {
    if (err) return res.status(500).json({ success: false, message: 'Database error', error: err.message });
    if (!ex) return res.status(404).json({ success: false, message: 'Exercise not found' });
    db.all(
      'SELECT id, name, muscle_group, movement_type, equipment FROM exercises WHERE (muscle_group = ? OR movement_type = ?) AND id != ? ORDER BY name',
      [ex.muscle_group, ex.movement_type, exerciseId],
      (err2, alts) => {
        if (err2) return res.status(500).json({ success: false, message: 'Database error', error: err2.message });
        if (!alts.length) return res.json({ success: true, alternatives: [] });
        const ids = alts.map(a => a.id);
        const ph = ids.map(() => '?').join(',');
        db.all(
          `SELECT wls.exercise_id, wl.workout_date AS last_date, wls.load AS last_load, wls.reps AS last_reps
           FROM workout_log_sets wls
           JOIN workout_logs wl ON wl.id = wls.workout_log_id
           WHERE wl.user_id = ? AND wls.exercise_id IN (${ph})
           ORDER BY wl.workout_date DESC, wl.created_at DESC`,
          [userId, ...ids],
          (err3, rows) => {
            if (err3) return res.status(500).json({ success: false, message: 'Database error', error: err3.message });
            const seen = {};
            rows.forEach(r => {
              if (seen[r.exercise_id] == null) seen[r.exercise_id] = { last_load: r.last_load, last_reps: r.last_reps, last_date: r.last_date };
            });
            const alternatives = alts.map(a => ({
              ...a,
              last_load: seen[a.id] ? seen[a.id].last_load : null,
              last_reps: seen[a.id] ? seen[a.id].last_reps : null,
              last_date: seen[a.id] ? seen[a.id].last_date : null
            }));
            res.json({ success: true, alternatives });
          }
        );
      }
    );
  });
});

module.exports = router;
