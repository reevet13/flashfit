const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const db = new sqlite3.Database(path.join(__dirname, '..', 'flashfit.db'), (err) => {
  if (err) {
    console.error('Error connecting to database:', err.message);
  } else {
    console.log('Connected to FlashFit SQLite database');
  }
});

const initializeDatabase = () => {
  // Users table
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      phone TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `, (err) => {
    if (err) console.error('Error creating users table:', err.message);
    else console.log('Users table ready');
  });

  // Contact submissions table
  db.run(`
    CREATE TABLE IF NOT EXISTS contact_submissions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      phone TEXT,
      message TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `, (err) => {
    if (err) console.error('Error creating contact_submissions table:', err.message);
    else console.log('Contact submissions table ready');
  });

  // Exercises (canonical list for program builder and alternatives)
  db.run(`
    CREATE TABLE IF NOT EXISTS exercises (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      muscle_group TEXT NOT NULL,
      movement_type TEXT NOT NULL,
      equipment TEXT
    )
  `, (err) => {
    if (err) console.error('Error creating exercises table:', err.message);
    else {
      console.log('Exercises table ready');
      seedExercises();
    }
  });

  // Workout programs (templates: preloaded or user-created)
  db.run(`
    CREATE TABLE IF NOT EXISTS workout_programs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      user_id INTEGER,
      is_preloaded INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
    )
  `, (err) => {
    if (err) console.error('Error creating workout_programs table:', err.message);
    else console.log('Workout programs table ready');
  });

  // Program sessions (e.g. Push, Pull, Legs, Day 1)
  db.run(`
    CREATE TABLE IF NOT EXISTS program_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      program_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      sort_order INTEGER DEFAULT 0,
      FOREIGN KEY (program_id) REFERENCES workout_programs (id) ON DELETE CASCADE
    )
  `, (err) => {
    if (err) console.error('Error creating program_sessions table:', err.message);
    else console.log('Program sessions table ready');
  });

  // Exercises in a program session (default sets/reps)
  db.run(`
    CREATE TABLE IF NOT EXISTS program_session_exercises (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      program_session_id INTEGER NOT NULL,
      exercise_id INTEGER NOT NULL,
      default_sets INTEGER DEFAULT 3,
      default_reps INTEGER DEFAULT 10,
      sort_order INTEGER DEFAULT 0,
      FOREIGN KEY (program_session_id) REFERENCES program_sessions (id) ON DELETE CASCADE,
      FOREIGN KEY (exercise_id) REFERENCES exercises (id)
    )
  `, (err) => {
    if (err) console.error('Error creating program_session_exercises table:', err.message);
    else console.log('Program session exercises table ready');
  });

  // Logged workout (one per "I did this session on this date")
  db.run(`
    CREATE TABLE IF NOT EXISTS workout_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      program_id INTEGER,
      program_session_id INTEGER,
      session_name TEXT NOT NULL,
      workout_date DATE NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
      FOREIGN KEY (program_id) REFERENCES workout_programs (id),
      FOREIGN KEY (program_session_id) REFERENCES program_sessions (id)
    )
  `, (err) => {
    if (err) console.error('Error creating workout_logs table:', err.message);
    else console.log('Workout logs table ready');
  });

  // Sets within a logged workout (reps + load per set)
  db.run(`
    CREATE TABLE IF NOT EXISTS workout_log_sets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      workout_log_id INTEGER NOT NULL,
      exercise_id INTEGER NOT NULL,
      set_index INTEGER NOT NULL,
      reps INTEGER,
      load REAL,
      notes TEXT,
      FOREIGN KEY (workout_log_id) REFERENCES workout_logs (id) ON DELETE CASCADE,
      FOREIGN KEY (exercise_id) REFERENCES exercises (id)
    )
  `, (err) => {
    if (err) console.error('Error creating workout_log_sets table:', err.message);
    else {
      console.log('Workout log sets table ready');
      seedPreloadedPrograms();
    }
  });
};

// Seed canonical exercises (muscle_group, movement_type for alternatives)
function seedExercises() {
  const exercises = [
    { name: 'Barbell Bench Press', muscle_group: 'chest', movement_type: 'push', equipment: 'barbell' },
    { name: 'Dumbbell Bench Press', muscle_group: 'chest', movement_type: 'push', equipment: 'dumbbell' },
    { name: 'Push-ups', muscle_group: 'chest', movement_type: 'push', equipment: 'bodyweight' },
    { name: 'Incline Dumbbell Press', muscle_group: 'chest', movement_type: 'push', equipment: 'dumbbell' },
    { name: 'Cable Fly', muscle_group: 'chest', movement_type: 'push', equipment: 'cable' },
    { name: 'Barbell Back Squat', muscle_group: 'quads', movement_type: 'squat', equipment: 'barbell' },
    { name: 'Leg Press', muscle_group: 'quads', movement_type: 'squat', equipment: 'machine' },
    { name: 'Leg Extension', muscle_group: 'quads', movement_type: 'extension', equipment: 'machine' },
    { name: 'Romanian Deadlift', muscle_group: 'hamstrings', movement_type: 'hinge', equipment: 'barbell' },
    { name: 'Leg Curl', muscle_group: 'hamstrings', movement_type: 'curl', equipment: 'machine' },
    { name: 'Barbell Row', muscle_group: 'back', movement_type: 'pull', equipment: 'barbell' },
    { name: 'Pull-ups', muscle_group: 'back', movement_type: 'pull', equipment: 'bodyweight' },
    { name: 'Lat Pulldown', muscle_group: 'back', movement_type: 'pull', equipment: 'cable' },
    { name: 'Dumbbell Row', muscle_group: 'back', movement_type: 'pull', equipment: 'dumbbell' },
    { name: 'Overhead Press', muscle_group: 'shoulders', movement_type: 'push', equipment: 'barbell' },
    { name: 'Dumbbell Shoulder Press', muscle_group: 'shoulders', movement_type: 'push', equipment: 'dumbbell' },
    { name: 'Lateral Raise', muscle_group: 'shoulders', movement_type: 'isolation', equipment: 'dumbbell' },
    { name: 'Barbell Curl', muscle_group: 'biceps', movement_type: 'pull', equipment: 'barbell' },
    { name: 'Hammer Curl', muscle_group: 'biceps', movement_type: 'pull', equipment: 'dumbbell' },
    { name: 'Triceps Pushdown', muscle_group: 'triceps', movement_type: 'push', equipment: 'cable' },
    { name: 'Skull Crusher', muscle_group: 'triceps', movement_type: 'push', equipment: 'barbell' },
    { name: 'Deadlift', muscle_group: 'back', movement_type: 'hinge', equipment: 'barbell' },
    { name: 'Calf Raise', muscle_group: 'calves', movement_type: 'isolation', equipment: 'machine' },
  ];

  const stmt = db.prepare(`
    INSERT OR IGNORE INTO exercises (name, muscle_group, movement_type, equipment)
    VALUES (?, ?, ?, ?)
  `);
  exercises.forEach(e => {
    stmt.run(e.name, e.muscle_group, e.movement_type, e.equipment || null);
  });
  stmt.finalize();
}

// Seed 3 preloaded programs with placeholder sessions/exercises
function seedPreloadedPrograms() {
  db.get('SELECT COUNT(*) as c FROM workout_programs WHERE is_preloaded = 1', [], (err, row) => {
    if (err || (row && row.c > 0)) return;

    const programs = [
      { name: 'Full Body Beginner', description: 'Three days per week, full body each session.', sessions: ['Day A', 'Day B', 'Day C'] },
      { name: 'Push / Pull / Legs', description: 'Classic PPL split, 6 days per week.', sessions: ['Push', 'Pull', 'Legs'] },
      { name: 'Upper / Lower', description: 'Four days per week, upper and lower split.', sessions: ['Upper', 'Lower'] },
    ];

    db.all('SELECT id FROM exercises ORDER BY id', [], (err, exRows) => {
      if (err || !exRows.length) return;
      const eIds = exRows.map(r => r.id);

      let progIndex = 0;
      function insertNextProgram() {
        if (progIndex >= programs.length) return;
        const p = programs[progIndex];
        db.run(
          'INSERT INTO workout_programs (name, description, user_id, is_preloaded) VALUES (?, ?, NULL, 1)',
          [p.name, p.description || ''],
          function (insErr) {
            if (insErr) return;
            const programId = this.lastID;
            let sessIndex = 0;
            function insertNextSession() {
              if (sessIndex >= p.sessions.length) {
                progIndex++;
                return insertNextProgram();
              }
              db.run(
                'INSERT INTO program_sessions (program_id, name, sort_order) VALUES (?, ?, ?)',
                [programId, p.sessions[sessIndex], sessIndex],
                function (sErr) {
                  if (sErr) { sessIndex++; return insertNextSession(); }
                  const sessionId = this.lastID;
                  const n = 4;
                  for (let o = 0; o < n; o++) {
                    db.run(
                      'INSERT INTO program_session_exercises (program_session_id, exercise_id, default_sets, default_reps, sort_order) VALUES (?, ?, 3, 10, ?)',
                      [sessionId, eIds[(sessIndex * 2 + o) % eIds.length], o]
                    );
                  }
                  sessIndex++;
                  insertNextSession();
                }
              );
            }
            insertNextSession();
          }
        );
      }
      insertNextProgram();
    });
  });
}

module.exports = { db, initializeDatabase };
