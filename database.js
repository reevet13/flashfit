const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Create database connection
const db = new sqlite3.Database(path.join(__dirname, '..', 'flashfit.db'), (err) => {
  if (err) {
    console.error('Error connecting to database:', err.message);
  } else {
    console.log('Connected to FlashFit SQLite database');
  }
});

// Initialize database tables
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
    if (err) {
      console.error('Error creating users table:', err.message);
    } else {
      console.log('Users table ready');
    }
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
    if (err) {
      console.error('Error creating contact_submissions table:', err.message);
    } else {
      console.log('Contact submissions table ready');
    }
  });

  // Workouts table
  db.run(`
    CREATE TABLE IF NOT EXISTS workouts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      duration INTEGER,
      calories_burned INTEGER,
      workout_date DATE NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
    )
  `, (err) => {
    if (err) {
      console.error('Error creating workouts table:', err.message);
    } else {
      console.log('Workouts table ready');
    }
  });

  // Programs table
  db.run(`
    CREATE TABLE IF NOT EXISTS programs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT,
      price REAL NOT NULL,
      duration_weeks INTEGER,
      difficulty TEXT,
      category TEXT,
      image_url TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `, (err) => {
    if (err) {
      console.error('Error creating programs table:', err.message);
    } else {
      console.log('Programs table ready');
      // Insert sample programs
      insertSamplePrograms();
    }
  });

  // User programs (purchases) table
  db.run(`
    CREATE TABLE IF NOT EXISTS user_programs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      program_id INTEGER NOT NULL,
      purchase_date DATETIME DEFAULT CURRENT_TIMESTAMP,
      status TEXT DEFAULT 'active',
      FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
      FOREIGN KEY (program_id) REFERENCES programs (id) ON DELETE CASCADE
    )
  `, (err) => {
    if (err) {
      console.error('Error creating user_programs table:', err.message);
    } else {
      console.log('User programs table ready');
    }
  });
};

// Insert sample fitness programs
const insertSamplePrograms = () => {
  const samplePrograms = [
    {
      title: 'Beginner Full Body Transformation',
      description: 'Perfect for beginners starting their fitness journey. Build strength and endurance with guided workouts.',
      price: 29.99,
      duration_weeks: 8,
      difficulty: 'beginner',
      category: 'strength'
    },
    {
      title: 'Advanced HIIT Masterclass',
      description: 'High-intensity interval training to burn fat and boost metabolism. For experienced athletes.',
      price: 49.99,
      duration_weeks: 12,
      difficulty: 'advanced',
      category: 'cardio'
    },
    {
      title: 'Yoga Flow & Flexibility',
      description: 'Improve flexibility, reduce stress, and find balance with daily yoga practices.',
      price: 24.99,
      duration_weeks: 6,
      difficulty: 'intermediate',
      category: 'yoga'
    },
    {
      title: 'Muscle Building Blueprint',
      description: 'Comprehensive bodybuilding program with progressive overload and nutrition guidance.',
      price: 59.99,
      duration_weeks: 16,
      difficulty: 'intermediate',
      category: 'bodybuilding'
    }
  ];

  const insertStmt = db.prepare(`
    INSERT OR IGNORE INTO programs (title, description, price, duration_weeks, difficulty, category)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  samplePrograms.forEach(program => {
    insertStmt.run(
      program.title,
      program.description,
      program.price,
      program.duration_weeks,
      program.difficulty,
      program.category
    );
  });

  insertStmt.finalize();
};

module.exports = { db, initializeDatabase };