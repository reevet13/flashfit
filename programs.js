const express = require('express');
const router = express.Router();
const { db } = require('../config/database');
const authMiddleware = require('../middleware/auth');

// Get all programs
router.get('/', (req, res) => {
  const { category, difficulty, minPrice, maxPrice } = req.query;
  
  let query = 'SELECT * FROM programs WHERE 1=1';
  const params = [];

  if (category) {
    query += ' AND category = ?';
    params.push(category);
  }

  if (difficulty) {
    query += ' AND difficulty = ?';
    params.push(difficulty);
  }

  if (minPrice) {
    query += ' AND price >= ?';
    params.push(parseFloat(minPrice));
  }

  if (maxPrice) {
    query += ' AND price <= ?';
    params.push(parseFloat(maxPrice));
  }

  query += ' ORDER BY created_at DESC';

  db.all(query, params, (err, rows) => {
    if (err) {
      return res.status(500).json({
        success: false,
        message: 'Database error',
        error: err.message
      });
    }

    res.json({
      success: true,
      count: rows.length,
      programs: rows
    });
  });
});

// Get single program by ID
router.get('/:id', (req, res) => {
  const { id } = req.params;

  db.get('SELECT * FROM programs WHERE id = ?', [id], (err, row) => {
    if (err) {
      return res.status(500).json({
        success: false,
        message: 'Database error',
        error: err.message
      });
    }

    if (!row) {
      return res.status(404).json({
        success: false,
        message: 'Program not found'
      });
    }

    res.json({
      success: true,
      program: row
    });
  });
});

// Purchase a program (protected route)
router.post('/:id/purchase', authMiddleware, (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  // First check if program exists
  db.get('SELECT * FROM programs WHERE id = ?', [id], (err, program) => {
    if (err) {
      return res.status(500).json({
        success: false,
        message: 'Database error',
        error: err.message
      });
    }

    if (!program) {
      return res.status(404).json({
        success: false,
        message: 'Program not found'
      });
    }

    // Check if user already purchased this program
    db.get(
      'SELECT * FROM user_programs WHERE user_id = ? AND program_id = ?',
      [userId, id],
      (err, existing) => {
        if (err) {
          return res.status(500).json({
            success: false,
            message: 'Database error',
            error: err.message
          });
        }

        if (existing) {
          return res.status(400).json({
            success: false,
            message: 'You have already purchased this program'
          });
        }

        // Add program to user's purchases
        const query = `
          INSERT INTO user_programs (user_id, program_id, status)
          VALUES (?, ?, 'active')
        `;

        db.run(query, [userId, id], function(err) {
          if (err) {
            return res.status(500).json({
              success: false,
              message: 'Error processing purchase',
              error: err.message
            });
          }

          res.status(201).json({
            success: true,
            message: 'Program purchased successfully!',
            purchase: {
              id: this.lastID,
              programId: id,
              programTitle: program.title,
              price: program.price
            }
          });
        });
      }
    );
  });
});

// Get user's purchased programs (protected route)
router.get('/user/purchased', authMiddleware, (req, res) => {
  const userId = req.user.id;

  const query = `
    SELECT 
      up.id as purchase_id,
      up.purchase_date,
      up.status,
      p.*
    FROM user_programs up
    JOIN programs p ON up.program_id = p.id
    WHERE up.user_id = ?
    ORDER BY up.purchase_date DESC
  `;

  db.all(query, [userId], (err, rows) => {
    if (err) {
      return res.status(500).json({
        success: false,
        message: 'Database error',
        error: err.message
      });
    }

    res.json({
      success: true,
      count: rows.length,
      programs: rows
    });
  });
});

module.exports = router;