const express = require('express');
const router = express.Router();
const { db } = require('../config/database');
const authMiddleware = require('../middleware/auth');

router.get('/', authMiddleware, (req, res) => {
  const userId = req.user.id;
  db.all(
    'SELECT * FROM workout_programs WHERE is_preloaded = 1 OR user_id = ? ORDER BY is_preloaded DESC, name',
    [userId],
    (err, rows) => {
      if (err) return res.status(500).json({ success: false, message: 'Database error', error: err.message });
      const preloaded = rows.filter(r => r.is_preloaded);
      const myPrograms = rows.filter(r => !r.is_preloaded);
      res.json({ success: true, programs: rows, preloaded, myPrograms });
    }
  );
});

router.get('/:id', authMiddleware, (req, res) => {
  const id = req.params.id;
  db.get('SELECT * FROM workout_programs WHERE id = ?', [id], (err, program) => {
    if (err) return res.status(500).json({ success: false, message: 'Database error', error: err.message });
    if (!program) return res.status(404).json({ success: false, message: 'Program not found' });
    db.all('SELECT * FROM program_sessions WHERE program_id = ? ORDER BY sort_order', [id], (err2, sessions) => {
      if (err2) return res.status(500).json({ success: false, message: 'Database error', error: err2.message });
      if (!sessions.length) return res.json({ success: true, program: { ...program, sessions: [] } });
      const sessionIds = sessions.map(s => s.id);
      const ph = sessionIds.map(() => '?').join(',');
      db.all(
        `SELECT pse.*, e.name AS exercise_name, e.muscle_group, e.movement_type
         FROM program_session_exercises pse
         JOIN exercises e ON e.id = pse.exercise_id
         WHERE pse.program_session_id IN (${ph})
         ORDER BY pse.program_session_id, pse.sort_order`,
        sessionIds,
        (err3, pses) => {
          if (err3) return res.status(500).json({ success: false, message: 'Database error', error: err3.message });
          const bySession = {};
          sessions.forEach(s => { bySession[s.id] = { ...s, exercises: [] }; });
          pses.forEach(p => {
            const s = bySession[p.program_session_id];
            if (s) s.exercises.push({ id: p.id, exercise_id: p.exercise_id, exercise_name: p.exercise_name, muscle_group: p.muscle_group, movement_type: p.movement_type, default_sets: p.default_sets, default_reps: p.default_reps, sort_order: p.sort_order });
          });
          res.json({ success: true, program: { ...program, sessions: sessions.map(s => bySession[s.id]) } });
        }
      );
    });
  });
});

router.post('/', authMiddleware, (req, res) => {
  const userId = req.user.id;
  const { name, description, copyFromId } = req.body;
  const programName = name || 'My Program';
  if (copyFromId) {
    db.get('SELECT * FROM workout_programs WHERE id = ?', [copyFromId], (err, source) => {
      if (err) return res.status(500).json({ success: false, message: 'Database error', error: err.message });
      if (!source) return res.status(404).json({ success: false, message: 'Program to copy not found' });
      db.run(
        'INSERT INTO workout_programs (name, description, user_id, is_preloaded) VALUES (?, ?, ?, 0)',
        [source.name + ' (Copy)', source.description || '', userId],
        function (insErr) {
          if (insErr) return res.status(500).json({ success: false, message: 'Database error', error: insErr.message });
          const newId = this.lastID;
          db.all('SELECT * FROM program_sessions WHERE program_id = ? ORDER BY sort_order', [copyFromId], (e, sessions) => {
            if (e || !sessions.length) return res.status(201).json({ success: true, program: { id: newId }, message: 'Program copied' });
            let sessionsDone = 0;
            sessions.forEach((sess, i) => {
              db.run('INSERT INTO program_sessions (program_id, name, sort_order) VALUES (?, ?, ?)', [newId, sess.name, sess.sort_order], function (e2) {
                if (e2) { sessionsDone++; if (sessionsDone === sessions.length) res.status(201).json({ success: true, program: { id: newId } }); return; }
                const newSessionId = this.lastID;
                db.all('SELECT * FROM program_session_exercises WHERE program_session_id = ? ORDER BY sort_order', [sess.id], (e3, exs) => {
                  if (e3 || !exs.length) { sessionsDone++; if (sessionsDone === sessions.length) res.status(201).json({ success: true, program: { id: newId } }); return; }
                  let exDone = 0;
                  exs.forEach((ex) => {
                    db.run('INSERT INTO program_session_exercises (program_session_id, exercise_id, default_sets, default_reps, sort_order) VALUES (?, ?, ?, ?, ?)', [newSessionId, ex.exercise_id, ex.default_sets, ex.default_reps, ex.sort_order], () => {
                      exDone++;
                      if (exDone === exs.length) {
                        sessionsDone++;
                        if (sessionsDone === sessions.length) res.status(201).json({ success: true, program: { id: newId }, message: 'Program copied' });
                      }
                    });
                  });
                });
              });
            });
          });
        }
      );
    });
    return;
  }
  db.run('INSERT INTO workout_programs (name, description, user_id, is_preloaded) VALUES (?, ?, ?, 0)', [programName, description || '', userId], function (err) {
    if (err) return res.status(500).json({ success: false, message: 'Database error', error: err.message });
    res.status(201).json({ success: true, program: { id: this.lastID, name: programName, description: description || '', user_id: userId, is_preloaded: 0, sessions: [] } });
  });
});

router.put('/:id', authMiddleware, (req, res) => {
  const id = req.params.id;
  const userId = req.user.id;
  const { name, description } = req.body;
  db.get('SELECT * FROM workout_programs WHERE id = ?', [id], (err, program) => {
    if (err) return res.status(500).json({ success: false, message: 'Database error', error: err.message });
    if (!program) return res.status(404).json({ success: false, message: 'Program not found' });
    if (program.is_preloaded || program.user_id !== userId) return res.status(403).json({ success: false, message: 'Not allowed to edit this program' });
    db.run('UPDATE workout_programs SET name = ?, description = ? WHERE id = ?', [name ?? program.name, description ?? program.description, id], function (e) {
      if (e) return res.status(500).json({ success: false, message: 'Database error', error: e.message });
      res.json({ success: true, message: 'Program updated' });
    });
  });
});

router.delete('/:id', authMiddleware, (req, res) => {
  const id = req.params.id;
  const userId = req.user.id;
  db.get('SELECT * FROM workout_programs WHERE id = ?', [id], (err, program) => {
    if (err) return res.status(500).json({ success: false, message: 'Database error', error: err.message });
    if (!program) return res.status(404).json({ success: false, message: 'Program not found' });
    if (program.is_preloaded || program.user_id !== userId) return res.status(403).json({ success: false, message: 'Not allowed to delete this program' });
    db.run('DELETE FROM workout_programs WHERE id = ?', [id], function (e) {
      if (e) return res.status(500).json({ success: false, message: 'Database error', error: e.message });
      res.json({ success: true, message: 'Program deleted' });
    });
  });
});

router.post('/:programId/sessions', authMiddleware, (req, res) => {
  const programId = req.params.programId;
  const userId = req.user.id;
  const { name } = req.body;
  db.get('SELECT * FROM workout_programs WHERE id = ?', [programId], (err, program) => {
    if (err) return res.status(500).json({ success: false, message: 'Database error', error: err.message });
    if (!program) return res.status(404).json({ success: false, message: 'Program not found' });
    if (program.is_preloaded || program.user_id !== userId) return res.status(403).json({ success: false, message: 'Not allowed to edit this program' });
    db.get('SELECT COALESCE(MAX(sort_order), -1) + 1 AS next_order FROM program_sessions WHERE program_id = ?', [programId], (e, r) => {
      const order = r ? r.next_order : 0;
      db.run('INSERT INTO program_sessions (program_id, name, sort_order) VALUES (?, ?, ?)', [programId, name || 'New Session', order], function (e2) {
        if (e2) return res.status(500).json({ success: false, message: 'Database error', error: e2.message });
        res.status(201).json({ success: true, session: { id: this.lastID, program_id: programId, name: name || 'New Session', sort_order: order } });
      });
    });
  });
});

router.put('/:programId/sessions/:sessionId', authMiddleware, (req, res) => {
  const { programId, sessionId } = req.params;
  const userId = req.user.id;
  const { name, sort_order } = req.body;
  db.get('SELECT * FROM workout_programs WHERE id = ?', [programId], (err, program) => {
    if (err) return res.status(500).json({ success: false, message: 'Database error', error: err.message });
    if (!program) return res.status(404).json({ success: false, message: 'Program not found' });
    if (program.is_preloaded || program.user_id !== userId) return res.status(403).json({ success: false, message: 'Not allowed to edit this program' });
    const updates = [];
    const params = [];
    if (name !== undefined) { updates.push('name = ?'); params.push(name); }
    if (sort_order !== undefined) { updates.push('sort_order = ?'); params.push(sort_order); }
    if (!updates.length) return res.json({ success: true });
    params.push(sessionId, programId);
    db.run(`UPDATE program_sessions SET ${updates.join(', ')} WHERE id = ? AND program_id = ?`, params, function (e) {
      if (e) return res.status(500).json({ success: false, message: 'Database error', error: e.message });
      res.json({ success: true, message: 'Session updated' });
    });
  });
});

router.delete('/:programId/sessions/:sessionId', authMiddleware, (req, res) => {
  const { programId, sessionId } = req.params;
  const userId = req.user.id;
  db.get('SELECT * FROM workout_programs WHERE id = ?', [programId], (err, program) => {
    if (err) return res.status(500).json({ success: false, message: 'Database error', error: err.message });
    if (!program) return res.status(404).json({ success: false, message: 'Program not found' });
    if (program.is_preloaded || program.user_id !== userId) return res.status(403).json({ success: false, message: 'Not allowed to edit this program' });
    db.run('DELETE FROM program_sessions WHERE id = ? AND program_id = ?', [sessionId, programId], function (e) {
      if (e) return res.status(500).json({ success: false, message: 'Database error', error: e.message });
      res.json({ success: true, message: 'Session deleted' });
    });
  });
});

router.post('/:programId/sessions/:sessionId/exercises', authMiddleware, (req, res) => {
  const { programId, sessionId } = req.params;
  const userId = req.user.id;
  const { exercise_id, default_sets, default_reps } = req.body;
  db.get('SELECT * FROM workout_programs WHERE id = ?', [programId], (err, program) => {
    if (err) return res.status(500).json({ success: false, message: 'Database error', error: err.message });
    if (!program) return res.status(404).json({ success: false, message: 'Program not found' });
    if (program.is_preloaded || program.user_id !== userId) return res.status(403).json({ success: false, message: 'Not allowed to edit this program' });
    db.get('SELECT id FROM program_sessions WHERE id = ? AND program_id = ?', [sessionId, programId], (e, sess) => {
      if (e || !sess) return res.status(404).json({ success: false, message: 'Session not found' });
      db.get('SELECT COALESCE(MAX(sort_order), -1) + 1 AS next_order FROM program_session_exercises WHERE program_session_id = ?', [sessionId], (e2, r) => {
        const order = r ? r.next_order : 0;
        db.run('INSERT INTO program_session_exercises (program_session_id, exercise_id, default_sets, default_reps, sort_order) VALUES (?, ?, ?, ?, ?)', [sessionId, exercise_id, default_sets ?? 3, default_reps ?? 10, order], function (e3) {
          if (e3) return res.status(500).json({ success: false, message: 'Database error', error: e3.message });
          res.status(201).json({ success: true, program_session_exercise: { id: this.lastID, program_session_id: sessionId, exercise_id, default_sets: default_sets ?? 3, default_reps: default_reps ?? 10, sort_order: order } });
        });
      });
    });
  });
});

router.put('/:programId/sessions/:sessionId/exercises/:pseId', authMiddleware, (req, res) => {
  const { programId, sessionId, pseId } = req.params;
  const userId = req.user.id;
  const { default_sets, default_reps, sort_order, exercise_id } = req.body;
  db.get('SELECT * FROM workout_programs WHERE id = ?', [programId], (err, program) => {
    if (err) return res.status(500).json({ success: false, message: 'Database error', error: err.message });
    if (!program) return res.status(404).json({ success: false, message: 'Program not found' });
    if (program.is_preloaded || program.user_id !== userId) return res.status(403).json({ success: false, message: 'Not allowed to edit this program' });
    const updates = [];
    const params = [];
    if (default_sets !== undefined) { updates.push('default_sets = ?'); params.push(default_sets); }
    if (default_reps !== undefined) { updates.push('default_reps = ?'); params.push(default_reps); }
    if (sort_order !== undefined) { updates.push('sort_order = ?'); params.push(sort_order); }
    if (exercise_id !== undefined) { updates.push('exercise_id = ?'); params.push(exercise_id); }
    if (!updates.length) return res.json({ success: true });
    params.push(pseId, sessionId);
    db.run(`UPDATE program_session_exercises SET ${updates.join(', ')} WHERE id = ? AND program_session_id = ?`, params, function (e) {
      if (e) return res.status(500).json({ success: false, message: 'Database error', error: e.message });
      res.json({ success: true, message: 'Exercise updated' });
    });
  });
});

router.delete('/:programId/sessions/:sessionId/exercises/:pseId', authMiddleware, (req, res) => {
  const { programId, sessionId, pseId } = req.params;
  const userId = req.user.id;
  db.get('SELECT * FROM workout_programs WHERE id = ?', [programId], (err, program) => {
    if (err) return res.status(500).json({ success: false, message: 'Database error', error: err.message });
    if (!program) return res.status(404).json({ success: false, message: 'Program not found' });
    if (program.is_preloaded || program.user_id !== userId) return res.status(403).json({ success: false, message: 'Not allowed to edit this program' });
    db.run('DELETE FROM program_session_exercises WHERE id = ? AND program_session_id = ?', [pseId, sessionId], function (e) {
      if (e) return res.status(500).json({ success: false, message: 'Database error', error: e.message });
      res.json({ success: true, message: 'Exercise removed from session' });
    });
  });
});

module.exports = router;
