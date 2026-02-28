const { db } = require('../config/database');

class User {
  static create(userData, callback) {
    const { name, email, password, phone } = userData;
    const query = `
      INSERT INTO users (name, email, password, phone)
      VALUES (?, ?, ?, ?)
    `;
    db.run(query, [name, email, password, phone], function (err) {
      if (err) callback(err, null);
      else callback(null, { id: this.lastID, name, email, phone });
    });
  }

  static findByEmail(email, callback) {
    db.get('SELECT * FROM users WHERE email = ?', [email], (err, row) => {
      if (err) callback(err, null);
      else callback(null, row);
    });
  }

  static findById(id, callback) {
    db.get('SELECT id, name, email, phone, created_at FROM users WHERE id = ?', [id], (err, row) => {
      if (err) callback(err, null);
      else callback(null, row);
    });
  }

  static update(id, userData, callback) {
    const { name, phone } = userData;
    db.run(
      'UPDATE users SET name = ?, phone = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [name, phone, id],
      function (err) {
        if (err) callback(err, null);
        else callback(null, { changes: this.changes });
      }
    );
  }

  static delete(id, callback) {
    db.run('DELETE FROM users WHERE id = ?', [id], function (err) {
      if (err) callback(err, null);
      else callback(null, { changes: this.changes });
    });
  }
}

module.exports = User;
