const { db } = require('../config/database');

class User {
  // Create a new user
  static create(userData, callback) {
    const { name, email, password, phone } = userData;
    const query = `
      INSERT INTO users (name, email, password, phone)
      VALUES (?, ?, ?, ?)
    `;
    
    db.run(query, [name, email, password, phone], function(err) {
      if (err) {
        callback(err, null);
      } else {
        callback(null, { id: this.lastID, name, email, phone });
      }
    });
  }

  // Find user by email
  static findByEmail(email, callback) {
    const query = 'SELECT * FROM users WHERE email = ?';
    
    db.get(query, [email], (err, row) => {
      if (err) {
        callback(err, null);
      } else {
        callback(null, row);
      }
    });
  }

  // Find user by ID
  static findById(id, callback) {
    const query = 'SELECT id, name, email, phone, created_at FROM users WHERE id = ?';
    
    db.get(query, [id], (err, row) => {
      if (err) {
        callback(err, null);
      } else {
        callback(null, row);
      }
    });
  }

  // Update user profile
  static update(id, userData, callback) {
    const { name, phone } = userData;
    const query = `
      UPDATE users 
      SET name = ?, phone = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `;
    
    db.run(query, [name, phone, id], function(err) {
      if (err) {
        callback(err, null);
      } else {
        callback(null, { changes: this.changes });
      }
    });
  }

  // Delete user
  static delete(id, callback) {
    const query = 'DELETE FROM users WHERE id = ?';
    
    db.run(query, [id], function(err) {
      if (err) {
        callback(err, null);
      } else {
        callback(null, { changes: this.changes });
      }
    });
  }
}

module.exports = User;