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
    }
  });
};

// Seed canonical exercises (muscle_group, movement_type for alternatives)
function seedExercises() {
  const exercises = [
    // Chest
    { name: 'Barbell Bench Press', muscle_group: 'chest', movement_type: 'push', equipment: 'barbell' },
    { name: 'Dumbbell Bench Press', muscle_group: 'chest', movement_type: 'push', equipment: 'dumbbell' },
    { name: 'Push-ups', muscle_group: 'chest', movement_type: 'push', equipment: 'bodyweight' },
    { name: 'Incline Dumbbell Press', muscle_group: 'chest', movement_type: 'push', equipment: 'dumbbell' },
    { name: 'Cable Fly', muscle_group: 'chest', movement_type: 'push', equipment: 'cable' },
    { name: 'Incline Barbell Bench Press', muscle_group: 'chest', movement_type: 'push', equipment: 'barbell' },
    { name: 'Decline Barbell Bench Press', muscle_group: 'chest', movement_type: 'push', equipment: 'barbell' },
    { name: 'Chest Dip', muscle_group: 'chest', movement_type: 'push', equipment: 'bodyweight' },
    { name: 'Pec Deck Machine', muscle_group: 'chest', movement_type: 'isolation', equipment: 'machine' },
    { name: 'Dumbbell Pullover', muscle_group: 'chest', movement_type: 'isolation', equipment: 'dumbbell' },
    { name: 'Machine Chest Press', muscle_group: 'chest', movement_type: 'push', equipment: 'machine' },
    { name: 'Low Cable Crossover', muscle_group: 'chest', movement_type: 'push', equipment: 'cable' },
    { name: 'Floor Press', muscle_group: 'chest', movement_type: 'push', equipment: 'barbell' },
    { name: 'Spiderman Push-up', muscle_group: 'chest', movement_type: 'push', equipment: 'bodyweight' },

    // Back
    { name: 'Deadlift', muscle_group: 'back', movement_type: 'hinge', equipment: 'barbell' },
    { name: 'Barbell Row', muscle_group: 'back', movement_type: 'pull', equipment: 'barbell' },
    { name: 'Pull-ups', muscle_group: 'back', movement_type: 'pull', equipment: 'bodyweight' },
    { name: 'Lat Pulldown', muscle_group: 'back', movement_type: 'pull', equipment: 'cable' },
    { name: 'Dumbbell Row', muscle_group: 'back', movement_type: 'pull', equipment: 'dumbbell' },
    { name: 'Chin-ups', muscle_group: 'back', movement_type: 'pull', equipment: 'bodyweight' },
    { name: 'T-Bar Row', muscle_group: 'back', movement_type: 'pull', equipment: 'barbell' },
    { name: 'Seated Cable Row', muscle_group: 'back', movement_type: 'pull', equipment: 'cable' },
    { name: 'Single-Arm Dumbbell Row', muscle_group: 'back', movement_type: 'pull', equipment: 'dumbbell' },
    { name: 'Pendlay Row', muscle_group: 'back', movement_type: 'pull', equipment: 'barbell' },
    { name: 'Straight-Arm Pulldown', muscle_group: 'back', movement_type: 'pull', equipment: 'cable' },
    { name: 'Machine Row', muscle_group: 'back', movement_type: 'pull', equipment: 'machine' },
    { name: 'Inverted Row', muscle_group: 'back', movement_type: 'pull', equipment: 'bodyweight' },
    { name: 'Back Extension', muscle_group: 'back', movement_type: 'hinge', equipment: 'bodyweight' },
    { name: 'Good Morning', muscle_group: 'back', movement_type: 'hinge', equipment: 'barbell' },
    { name: 'Meadows Row', muscle_group: 'back', movement_type: 'pull', equipment: 'barbell' },
    { name: 'Rack Pull', muscle_group: 'back', movement_type: 'hinge', equipment: 'barbell' },

    // Quads / Legs
    { name: 'Barbell Back Squat', muscle_group: 'quads', movement_type: 'squat', equipment: 'barbell' },
    { name: 'Leg Press', muscle_group: 'quads', movement_type: 'squat', equipment: 'machine' },
    { name: 'Leg Extension', muscle_group: 'quads', movement_type: 'extension', equipment: 'machine' },
    { name: 'Front Squat', muscle_group: 'quads', movement_type: 'squat', equipment: 'barbell' },
    { name: 'Bulgarian Split Squat', muscle_group: 'quads', movement_type: 'squat', equipment: 'dumbbell' },
    { name: 'Goblet Squat', muscle_group: 'quads', movement_type: 'squat', equipment: 'dumbbell' },
    { name: 'Walking Lunge', muscle_group: 'quads', movement_type: 'squat', equipment: 'bodyweight' },
    { name: 'Reverse Lunge', muscle_group: 'quads', movement_type: 'squat', equipment: 'dumbbell' },
    { name: 'Hack Squat', muscle_group: 'quads', movement_type: 'squat', equipment: 'machine' },
    { name: 'Sissy Squat', muscle_group: 'quads', movement_type: 'squat', equipment: 'bodyweight' },
    { name: 'Step-ups', muscle_group: 'quads', movement_type: 'squat', equipment: 'dumbbell' },
    { name: 'Trap Bar Deadlift', muscle_group: 'legs', movement_type: 'hinge', equipment: 'special' },

    // Hamstrings & Glutes
    { name: 'Romanian Deadlift', muscle_group: 'hamstrings', movement_type: 'hinge', equipment: 'barbell' },
    { name: 'Leg Curl', muscle_group: 'hamstrings', movement_type: 'curl', equipment: 'machine' },
    { name: 'Sumo Deadlift', muscle_group: 'hamstrings', movement_type: 'hinge', equipment: 'barbell' },
    { name: 'Stiff-Legged Deadlift', muscle_group: 'hamstrings', movement_type: 'hinge', equipment: 'barbell' },
    { name: 'Glute Bridge', muscle_group: 'glutes', movement_type: 'hinge', equipment: 'bodyweight' },
    { name: 'Barbell Hip Thrust', muscle_group: 'glutes', movement_type: 'hinge', equipment: 'barbell' },
    { name: 'Cable Pull-Through', muscle_group: 'glutes', movement_type: 'hinge', equipment: 'cable' },

    // Calves
    { name: 'Calf Raise', muscle_group: 'calves', movement_type: 'isolation', equipment: 'machine' },
    { name: 'Seated Calf Raise', muscle_group: 'calves', movement_type: 'isolation', equipment: 'machine' },
    { name: 'Standing Dumbbell Calf Raise', muscle_group: 'calves', movement_type: 'isolation', equipment: 'dumbbell' },

    // Shoulders
    { name: 'Overhead Press', muscle_group: 'shoulders', movement_type: 'push', equipment: 'barbell' },
    { name: 'Dumbbell Shoulder Press', muscle_group: 'shoulders', movement_type: 'push', equipment: 'dumbbell' },
    { name: 'Lateral Raise', muscle_group: 'shoulders', movement_type: 'isolation', equipment: 'dumbbell' },
    { name: 'Arnold Press', muscle_group: 'shoulders', movement_type: 'push', equipment: 'dumbbell' },
    { name: 'Machine Shoulder Press', muscle_group: 'shoulders', movement_type: 'push', equipment: 'machine' },
    { name: 'Cable Lateral Raise', muscle_group: 'shoulders', movement_type: 'isolation', equipment: 'cable' },
    { name: 'Front Raise', muscle_group: 'shoulders', movement_type: 'isolation', equipment: 'dumbbell' },
    { name: 'Face Pull', muscle_group: 'shoulders', movement_type: 'pull', equipment: 'cable' },
    { name: 'Reverse Pec Deck', muscle_group: 'shoulders', movement_type: 'isolation', equipment: 'machine' },
    { name: 'Bent-Over Rear Delt Fly', muscle_group: 'shoulders', movement_type: 'isolation', equipment: 'dumbbell' },
    { name: 'Upright Row', muscle_group: 'shoulders', movement_type: 'pull', equipment: 'barbell' },
    { name: 'Shrugs', muscle_group: 'shoulders', movement_type: 'pull', equipment: 'barbell' },
    { name: 'Dumbbell Shrugs', muscle_group: 'shoulders', movement_type: 'pull', equipment: 'dumbbell' },
    { name: 'Pike Push-up', muscle_group: 'shoulders', movement_type: 'push', equipment: 'bodyweight' },

    // Biceps
    { name: 'Barbell Curl', muscle_group: 'biceps', movement_type: 'pull', equipment: 'barbell' },
    { name: 'Hammer Curl', muscle_group: 'biceps', movement_type: 'pull', equipment: 'dumbbell' },
    { name: 'Preacher Curl', muscle_group: 'biceps', movement_type: 'pull', equipment: 'machine' },
    { name: 'Incline Dumbbell Curl', muscle_group: 'biceps', movement_type: 'pull', equipment: 'dumbbell' },
    { name: 'Concentration Curl', muscle_group: 'biceps', movement_type: 'pull', equipment: 'dumbbell' },
    { name: 'Cable Curl', muscle_group: 'biceps', movement_type: 'pull', equipment: 'cable' },
    { name: 'Spider Curl', muscle_group: 'biceps', movement_type: 'pull', equipment: 'dumbbell' },
    { name: 'EZ-Bar Curl', muscle_group: 'biceps', movement_type: 'pull', equipment: 'barbell' },
    { name: 'Reverse Curl', muscle_group: 'biceps', movement_type: 'pull', equipment: 'barbell' },

    // Triceps
    { name: 'Triceps Pushdown', muscle_group: 'triceps', movement_type: 'push', equipment: 'cable' },
    { name: 'Skull Crusher', muscle_group: 'triceps', movement_type: 'push', equipment: 'barbell' },
    { name: 'Triceps Dip', muscle_group: 'triceps', movement_type: 'push', equipment: 'bodyweight' },
    { name: 'Overhead Triceps Extension', muscle_group: 'triceps', movement_type: 'push', equipment: 'dumbbell' },
    { name: 'Close-Grip Bench Press', muscle_group: 'triceps', movement_type: 'push', equipment: 'barbell' },
    { name: 'Rope Triceps Pushdown', muscle_group: 'triceps', movement_type: 'push', equipment: 'cable' },
    { name: 'Dumbbell Kickback', muscle_group: 'triceps', movement_type: 'isolation', equipment: 'dumbbell' },
    { name: 'Machine Triceps Extension', muscle_group: 'triceps', movement_type: 'isolation', equipment: 'machine' },

    // Core & Abs
    { name: 'Crunch', muscle_group: 'core', movement_type: 'isolation', equipment: 'bodyweight' },
    { name: 'Plank', muscle_group: 'core', movement_type: 'hold', equipment: 'bodyweight' },
    { name: 'Russian Twist', muscle_group: 'core', movement_type: 'isolation', equipment: 'bodyweight' },
    { name: 'Hanging Leg Raise', muscle_group: 'core', movement_type: 'isolation', equipment: 'bodyweight' },
    { name: 'Cable Crunch', muscle_group: 'core', movement_type: 'isolation', equipment: 'cable' },
    { name: 'Ab Wheel Rollout', muscle_group: 'core', movement_type: 'isolation', equipment: 'equipment' },
    { name: 'Bicycle Crunches', muscle_group: 'core', movement_type: 'isolation', equipment: 'bodyweight' },
    { name: 'V-ups', muscle_group: 'core', movement_type: 'isolation', equipment: 'bodyweight' },
    { name: 'Decline Crunch', muscle_group: 'core', movement_type: 'isolation', equipment: 'bodyweight' },
    { name: 'Dragon Flag', muscle_group: 'core', movement_type: 'isolation', equipment: 'bodyweight' },
    { name: 'Side Plank', muscle_group: 'core', movement_type: 'hold', equipment: 'bodyweight' },
    { name: 'Dead Bug', muscle_group: 'core', movement_type: 'isolation', equipment: 'bodyweight' },
    { name: 'Bird Dog', muscle_group: 'core', movement_type: 'isolation', equipment: 'bodyweight' },
    { name: 'Hollow Body Hold', muscle_group: 'core', movement_type: 'hold', equipment: 'bodyweight' },
    { name: 'L-Sit', muscle_group: 'core', movement_type: 'hold', equipment: 'bodyweight' },
    { name: 'Cable Woodchopper', muscle_group: 'core', movement_type: 'isolation', equipment: 'cable' }
  ];

  db.serialize(() => {
    let insertedCount = 0;
    const checkComplete = () => {
      insertedCount++;
      // console.log(`Exercise check: ${insertedCount}/${exercises.length}`);
      if (insertedCount === exercises.length) {
        console.log("All canonical exercises exist. Triggering program seeder...");
        seedPreloadedPrograms();
      }
    };

    exercises.forEach(e => {
      db.get('SELECT id FROM exercises WHERE name = ?', [e.name], (err, row) => {
        if (!row) {
          db.run(
            'INSERT INTO exercises (name, muscle_group, movement_type, equipment) VALUES (?, ?, ?, ?)',
            [e.name, e.muscle_group, e.movement_type, e.equipment || null],
            checkComplete
          );
        } else {
          checkComplete();
        }
      });
    });
  });
}

// Helper to get exercises by name
function getExerciseIds(names, callback) {
  const placeholders = names.map(() => '?').join(',');
  db.all(`SELECT id, name FROM exercises WHERE name IN (${placeholders})`, names, (err, rows) => {
    if (err) return callback(err, null);
    const map = {};
    rows.forEach(r => map[r.name] = r.id);
    console.log("Found exercise IDs for preloaded programs:", Object.keys(map).length, "out of", names.length);
    if (Object.keys(map).length !== names.length) {
      const foundNames = Object.keys(map);
      const missing = names.filter(n => !foundNames.includes(n));
      console.error("CRITICAL: Missing exercises required for preloaded programs:", missing);
    }
    callback(null, map);
  });
}

// Seed 3 preloaded programs
function seedPreloadedPrograms() {
  db.get('SELECT COUNT(*) as c FROM workout_programs WHERE is_preloaded = 1', [], (err, row) => {
    if (err) {
      console.error("Error checking preloaded programs:", err);
      return;
    }
    if (row && row.c > 0) {
      console.log(`Bypassing program seed: ${row.c} preloaded programs already exist.`);
      return;
    }

    console.log("No preloaded programs found. Proceeding to seed...");

    // The required exercises for all programs combined
    const requiredExercises = [
      // Powerlifting 5-Day
      'Barbell Back Squat', 'Barbell Bench Press', 'Deadlift', 'Overhead Press',
      'Leg Press', 'Leg Extension', 'Romanian Deadlift', 'Barbell Row', 'Pull-ups',
      'Front Squat', 'Incline Barbell Bench Press', 'Triceps Pushdown',
      'Dumbbell Shoulder Press', 'Lateral Raise', 'Face Pull',
      'Close-Grip Bench Press', 'Cable Fly', 'Barbell Curl', 'Hammer Curl',

      // Hypertrophy
      'Push-ups', 'Incline Dumbbell Press', 'Lat Pulldown', 'Calf Raise',

      // Gen Fit 5-Day
      'Dumbbell Bench Press', 'Dumbbell Row', 'Goblet Squat', 'Walking Lunge', 'Leg Curl'
    ];

    getExerciseIds(requiredExercises, (err, exMap) => {
      if (err || !exMap) return;

      const programs = [
        {
          name: 'Powerlifting',
          description: 'Focus on heavy compound movements. 5-day split with high-frequency squatting and benching.',
          sessions: [
            {
              name: 'Day 1: Heavy Squat & Light Bench',
              exercises: [
                { id: exMap['Barbell Back Squat'], sets: 5, reps: 3 },
                { id: exMap['Barbell Bench Press'], sets: 4, reps: 5 },
                { id: exMap['Leg Press'], sets: 3, reps: 6 },
                { id: exMap['Leg Extension'], sets: 3, reps: 8 }
              ]
            },
            {
              name: 'Day 2: Heavy Deadlift & Accessories',
              exercises: [
                { id: exMap['Deadlift'], sets: 5, reps: 2 },
                { id: exMap['Romanian Deadlift'], sets: 3, reps: 5 },
                { id: exMap['Barbell Row'], sets: 4, reps: 6 },
                { id: exMap['Pull-ups'], sets: 3, reps: 6 }
              ]
            },
            {
              name: 'Day 3: Heavy Bench & Light Squat',
              exercises: [
                { id: exMap['Barbell Bench Press'], sets: 5, reps: 3 },
                { id: exMap['Front Squat'], sets: 4, reps: 4 },
                { id: exMap['Incline Barbell Bench Press'], sets: 3, reps: 5 },
                { id: exMap['Triceps Pushdown'], sets: 3, reps: 8 }
              ]
            },
            {
              name: 'Day 4: Overhead Press Focus',
              exercises: [
                { id: exMap['Overhead Press'], sets: 5, reps: 3 },
                { id: exMap['Dumbbell Shoulder Press'], sets: 3, reps: 6 },
                { id: exMap['Lateral Raise'], sets: 4, reps: 8 },
                { id: exMap['Face Pull'], sets: 3, reps: 8 }
              ]
            },
            {
              name: 'Day 5: Secondary Bench & Hypertrophy',
              exercises: [
                { id: exMap['Close-Grip Bench Press'], sets: 3, reps: 5 },
                { id: exMap['Cable Fly'], sets: 3, reps: 8 },
                { id: exMap['Barbell Curl'], sets: 3, reps: 6 },
                { id: exMap['Hammer Curl'], sets: 3, reps: 8 }
              ]
            }
          ]
        },
        {
          name: 'Hypertrophy',
          description: 'Muscle growth focus with higher volume. Classic PPL split.',
          sessions: [
            {
              name: 'Push Day',
              exercises: [
                { id: exMap['Incline Dumbbell Press'], sets: 4, reps: 10 },
                { id: exMap['Push-ups'], sets: 3, reps: 15 },
                { id: exMap['Lateral Raise'], sets: 4, reps: 12 },
                { id: exMap['Triceps Pushdown'], sets: 3, reps: 12 }
              ]
            },
            {
              name: 'Pull Day',
              exercises: [
                { id: exMap['Pull-ups'], sets: 3, reps: 8 },
                { id: exMap['Barbell Row'], sets: 4, reps: 10 },
                { id: exMap['Lat Pulldown'], sets: 3, reps: 12 },
                { id: exMap['Barbell Curl'], sets: 4, reps: 12 }
              ]
            },
            {
              name: 'Leg Day',
              exercises: [
                { id: exMap['Leg Press'], sets: 4, reps: 10 },
                { id: exMap['Romanian Deadlift'], sets: 3, reps: 10 },
                { id: exMap['Leg Extension'], sets: 3, reps: 15 },
                { id: exMap['Calf Raise'], sets: 4, reps: 15 }
              ]
            }
          ]
        },
        {
          name: 'General Fitness',
          description: 'A 5-day split balancing strength and hypertrophy.',
          sessions: [
            {
              name: 'Day 1: Upper Body Power',
              exercises: [
                { id: exMap['Barbell Bench Press'], sets: 4, reps: 5 },
                { id: exMap['Barbell Row'], sets: 4, reps: 5 },
                { id: exMap['Overhead Press'], sets: 3, reps: 8 },
                { id: exMap['Lat Pulldown'], sets: 3, reps: 8 }
              ]
            },
            {
              name: 'Day 2: Lower Body Power',
              exercises: [
                { id: exMap['Barbell Back Squat'], sets: 4, reps: 5 },
                { id: exMap['Romanian Deadlift'], sets: 3, reps: 8 },
                { id: exMap['Leg Press'], sets: 3, reps: 10 },
                { id: exMap['Calf Raise'], sets: 4, reps: 15 }
              ]
            },
            {
              name: 'Day 3: Core & Auxiliary',
              exercises: [
                { id: exMap['Pull-ups'], sets: 3, reps: 10 },
                { id: exMap['Push-ups'], sets: 3, reps: 15 },
                { id: exMap['Lateral Raise'], sets: 3, reps: 15 },
                { id: exMap['Barbell Curl'], sets: 3, reps: 12 }
              ]
            },
            {
              name: 'Day 4: Upper Body Hypertrophy',
              exercises: [
                { id: exMap['Incline Dumbbell Press'], sets: 3, reps: 10 },
                { id: exMap['Dumbbell Row'], sets: 3, reps: 10 },
                { id: exMap['Dumbbell Shoulder Press'], sets: 3, reps: 12 },
                { id: exMap['Triceps Pushdown'], sets: 3, reps: 12 }
              ]
            },
            {
              name: 'Day 5: Lower Body Hypertrophy',
              exercises: [
                { id: exMap['Goblet Squat'], sets: 3, reps: 12 },
                { id: exMap['Walking Lunge'], sets: 3, reps: 10 },
                { id: exMap['Leg Extension'], sets: 3, reps: 15 },
                { id: exMap['Leg Curl'], sets: 3, reps: 15 }
              ]
            }
          ]
        }
      ];

      let progIndex = 0;
      function insertNextProgram() {
        if (progIndex >= programs.length) return;
        const p = programs[progIndex];
        db.run(
          'INSERT INTO workout_programs (name, description, user_id, is_preloaded) VALUES (?, ?, NULL, 1)',
          [p.name, p.description],
          function (insErr) {
            if (insErr) return;
            const programId = this.lastID;
            let sessIndex = 0;
            function insertNextSession() {
              if (sessIndex >= p.sessions.length) {
                progIndex++;
                return insertNextProgram();
              }
              const session = p.sessions[sessIndex];
              db.run(
                'INSERT INTO program_sessions (program_id, name, sort_order) VALUES (?, ?, ?)',
                [programId, session.name, sessIndex],
                function (sErr) {
                  if (sErr) { sessIndex++; return insertNextSession(); }
                  const sessionId = this.lastID;

                  let exIndex = 0;
                  function insertNextExercise() {
                    if (exIndex >= session.exercises.length) {
                      sessIndex++;
                      return insertNextSession();
                    }
                    const ex = session.exercises[exIndex];
                    if (!ex.id) {
                      exIndex++;
                      return insertNextExercise(); // Skip if not found
                    }
                    db.run(
                      'INSERT INTO program_session_exercises (program_session_id, exercise_id, default_sets, default_reps, sort_order) VALUES (?, ?, ?, ?, ?)',
                      [sessionId, ex.id, ex.sets, ex.reps, exIndex],
                      function () {
                        exIndex++;
                        insertNextExercise();
                      }
                    );
                  }
                  insertNextExercise();
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
