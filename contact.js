const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const { db } = require('../config/database');

// Submit contact form
router.post('/submit',
  [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('email').isEmail().withMessage('Valid email is required'),
    body('phone').optional().trim(),
    body('message').optional().trim()
  ],
  (req, res) => {
    // Validate input
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { name, email, phone, message } = req.body;

    const query = `
      INSERT INTO contact_submissions (name, email, phone, message)
      VALUES (?, ?, ?, ?)
    `;

    db.run(query, [name, email, phone, message], function(err) {
      if (err) {
        return res.status(500).json({
          success: false,
          message: 'Error submitting contact form',
          error: err.message
        });
      }

      res.status(201).json({
        success: true,
        message: 'Thank you for contacting us! We\'ll be in touch soon.',
        submissionId: this.lastID
      });
    });
  }
);

// Get all contact submissions (admin endpoint - could add admin auth later)
router.get('/submissions', (req, res) => {
  const query = 'SELECT * FROM contact_submissions ORDER BY created_at DESC';

  db.all(query, [], (err, rows) => {
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
      submissions: rows
    });
  });
});

module.exports = router;