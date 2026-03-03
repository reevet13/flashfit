const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const db = new sqlite3.Database(path.join(__dirname, 'flashfit.db'), (err) => {
    if (err) {
        console.error(err);
        process.exit(1);
    }
});

db.serialize(() => {
    // 1. Find the minimum ID for each exercise name
    db.all('SELECT name, MIN(id) as min_id FROM exercises GROUP BY name', [], (err, rows) => {
        if (err) throw err;

        db.run('BEGIN TRANSACTION');

        const updatePse = db.prepare('UPDATE program_session_exercises SET exercise_id = ? WHERE exercise_id IN (SELECT id FROM exercises WHERE name = ? AND id != ?)');
        const updateLogs = db.prepare('UPDATE workout_log_sets SET exercise_id = ? WHERE exercise_id IN (SELECT id FROM exercises WHERE name = ? AND id != ?)');

        rows.forEach(row => {
            updatePse.run([row.min_id, row.name, row.min_id]);
            updateLogs.run([row.min_id, row.name, row.min_id]);
        });

        updatePse.finalize();
        updateLogs.finalize();

        // 2. Delete the duplicates
        db.run('DELETE FROM exercises WHERE id NOT IN (SELECT MIN(id) FROM exercises GROUP BY name)', function (err) {
            if (err) {
                db.run('ROLLBACK');
                console.error("Error deleting duplicates:", err);
            } else {
                db.run('COMMIT');
                console.log(`Deleted duplicate exercises. Unique exercises remaining: ${rows.length}`);
            }
        });
    });
});
