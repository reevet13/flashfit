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
app.use('/api/programs', require('./routes/programs'));
app.use('/api/workouts', require('./routes/workouts'));

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
        getAll: 'GET /api/programs',
        getOne: 'GET /api/programs/:id',
        purchase: 'POST /api/programs/:id/purchase (requires auth)',
        getPurchased: 'GET /api/programs/user/purchased (requires auth)'
      },
      workouts: {
        create: 'POST /api/workouts (requires auth)',
        getAll: 'GET /api/workouts (requires auth)',
        getOne: 'GET /api/workouts/:id (requires auth)',
        update: 'PUT /api/workouts/:id (requires auth)',
        delete: 'DELETE /api/workouts/:id (requires auth)',
        getStats: 'GET /api/workouts/stats/summary (requires auth)'
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