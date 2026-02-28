const express = require('express');
const router = express.Router();
const { db } = require('../config/database');
const authMiddleware = require('../middleware/auth');

router.use(authMiddleware);

router.get('/', (req, res) => {
  const userId = req.user.id;
  const { from, to, program_id } = req.query;
  let query = 'SELECT * FROM workout_logs WHERE user_id = ?';
  const params = [userId];
  if (from) { query += ' AND workout_date >= ?'; params.push(from); }
  if (to) { query += ' AND workout_date <= ?'; params.push(to); }
  if (program_id) { query += ' AND program_id = ?'; params.push(program_id); }
  query += ' ORDER BY workout_date DESC, created_at DESC';
  db.all(query, params, (err, rows) => {
    if (err) return res.status(500).json({ success: false, message: 'Database error', error: err.message });
    res.json({ success: true, count: rows.length, workout_logs: rows });
  });
});

router.get('/:id', (req, res) => {
  const id = req.params.id;
  const userId = req.user.id;
  db.get('SELECT * FROM workout_logs WHERE id = ? AND user_id = ?', [id, userId], (err, log) => {
    if (err) return res.status(500).json({ success: false, message: 'Database error', error: err.message });
    if (!log) return res.status(404).json({ success: false, message: 'Workout log not found' });
    db.all(
      `SELECT wls.*, e.name AS exercise_name
       FROM workout_log_sets wls
       JOIN exercises e ON e.id = wls.exercise_id
       WHERE wls.workout_log_id = ?
       ORDER BY wls.exercise_id, wls.set_index`,
      [id],
      (err2, sets) => {
        if (err2) return res.status(500).json({ success: false, message: 'Database error', error: err2.message });
        const byExercise = {};
        sets.forEach(s => {
          if (!byExercise[s.exercise_id]) byExercise[s.exercise_id] = { exercise_id: s.exercise_id, exercise_name: s.exercise_name, sets: [] };
          byExercise[s.exercise_id].sets.push({ id: s.id, set_index: s.set_index, reps: s.reps, load: s.load, notes: s.notes });
        });
        res.json({ success: true, workout_log: { ...log, exercises: Object.values(byExercise) } });
      }
    );
  });
});

router.post('/', (req, res) => {
  const userId = req.user.id;
  const { program_id, program_session_id, session_name, workout_date, sets: setsPayload } = req.body;
  const date = workout_date || new Date().toISOString().slice(0, 10);
  const name = session_name || 'Workout';
  db.run(
    'INSERT INTO workout_logs (user_id, program_id, program_session_id, session_name, workout_date) VALUES (?, ?, ?, ?, ?)',
    [userId, program_id || null, program_session_id || null, name, date],
    function (err) {
      if (err) return res.status(500).json({ success: false, message: 'Database error', error: err.message });
      const logId = this.lastID;
      if (setsPayload && setsPayload.length) {
        let inserted = 0;
        const total = setsPayload.length;
        const done = () => {
          inserted++;
          if (inserted === total) {
            res.status(201).json({ success: true, workout_log: { id: logId, user_id: userId, session_name: name, workout_date: date } });
          }
        };
        setsPayload.forEach((s, idx) => {
          db.run(
            'INSERT INTO workout_log_sets (workout_log_id, exercise_id, set_index, reps, load, notes) VALUES (?, ?, ?, ?, ?, ?)',
            [logId, s.exercise_id, s.set_index ?? idx, s.reps ?? null, s.load ?? null, s.notes ?? null],
            () => done()
          );
        });
      } else {
        res.status(201).json({ success: true, workout_log: { id: logId, user_id: userId, session_name: name, workout_date: date } });
      }
    }
  );
});

router.put('/:id', (req, res) => {
  const id = req.params.id;
  const userId = req.user.id;
  const { session_name, workout_date, sets: setsPayload } = req.body;
  db.get('SELECT * FROM workout_logs WHERE id = ? AND user_id = ?', [id, userId], (err, log) => {
    if (err) return res.status(500).json({ success: false, message: 'Database error', error: err.message });
    if (!log) return res.status(404).json({ success: false, message: 'Workout log not found' });
    if (session_name !== undefined || workout_date !== undefined) {
      db.run(
        'UPDATE workout_logs SET session_name = ?, workout_date = ? WHERE id = ?',
        [session_name ?? log.session_name, workout_date ?? log.workout_date, id],
        (e) => {
          if (e) return res.status(500).json({ success: false, message: 'Database error', error: e.message });
        }
      );
    }
    if (setsPayload && setsPayload.length) {
      db.run('DELETE FROM workout_log_sets WHERE workout_log_id = ?', [id], (e) => {
        if (e) return res.status(500).json({ success: false, message: 'Database error', error: e.message });
        let inserted = 0;
        const total = setsPayload.length;
        const finish = () => {
          inserted++;
          if (inserted === total) res.json({ success: true, message: 'Workout log updated' });
        };
        setsPayload.forEach((s, idx) => {
          db.run(
            'INSERT INTO workout_log_sets (workout_log_id, exercise_id, set_index, reps, load, notes) VALUES (?, ?, ?, ?, ?, ?)',
            [id, s.exercise_id, s.set_index ?? idx, s.reps ?? null, s.load ?? null, s.notes ?? null],
            () => finish()
          );
        });
      });
    } else {
      res.json({ success: true, message: 'Workout log updated' });
    }
  });
});

router.delete('/:id', (req, res) => {
  const id = req.params.id;
  const userId = req.user.id;
  db.run('DELETE FROM workout_logs WHERE id = ? AND user_id = ?', [id, userId], function (err) {
    if (err) return res.status(500).json({ success: false, message: 'Database error', error: err.message });
    if (this.changes === 0) return res.status(404).json({ success: false, message: 'Workout log not found' });
    res.json({ success: true, message: 'Workout log deleted' });
  });
});

module.exports = router;
