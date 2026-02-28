require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { initializeDatabase } = require('./config/database');

// Initialize Express app
const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Initialize database
initializeDatabase();

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/contact', require('./routes/contact'));
app.use('/api/exercises', require('./routes/exercises'));
app.use('/api/programs', require('./routes/programs'));
app.use('/api/workout-logs', require('./routes/workout-logs'));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'FlashFit API is running',
    timestamp: new Date().toISOString()
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Welcome to FlashFit API',
    version: '1.0.0',
    endpoints: {
      health: '/api/health',
      auth: {
        register: 'POST /api/auth/register',
        login: 'POST /api/auth/login',
        profile: 'GET /api/auth/profile (requires auth)',
        updateProfile: 'PUT /api/auth/profile (requires auth)'
      },
      contact: {
        submit: 'POST /api/contact/submit',
        getAllSubmissions: 'GET /api/contact/submissions'
      },
      programs: {
        getAll: 'GET /api/programs (requires auth)',
        getOne: 'GET /api/programs/:id (requires auth)',
        create: 'POST /api/programs (requires auth)',
        copy: 'POST /api/programs with body copyFromId (requires auth)',
        update: 'PUT /api/programs/:id (requires auth)',
        delete: 'DELETE /api/programs/:id (requires auth)',
        sessions: 'POST/PUT/DELETE /api/programs/:programId/sessions (requires auth)',
        sessionExercises: 'POST/PUT/DELETE /api/programs/:programId/sessions/:sessionId/exercises (requires auth)'
      },
      exercises: {
        list: 'GET /api/exercises',
        history: 'GET /api/exercises/:id/history (requires auth)',
        alternatives: 'GET /api/exercises/:id/alternatives (requires auth)'
      },
      workoutLogs: {
        list: 'GET /api/workout-logs (requires auth)',
        getOne: 'GET /api/workout-logs/:id (requires auth)',
        create: 'POST /api/workout-logs (requires auth)',
        update: 'PUT /api/workout-logs/:id (requires auth)',
        delete: 'DELETE /api/workout-logs/:id (requires auth)'
      }
    }
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════╗
║                                           ║
║         ⚡ FLASHFIT API SERVER ⚡         ║
║                                           ║
║   Server running on port ${PORT}           ║
║   Environment: ${process.env.NODE_ENV || 'development'}              ║
║                                           ║
║   API Documentation: http://localhost:${PORT}  ║
║                                           ║
╚═══════════════════════════════════════════╝
  `);
});

module.exports = app;