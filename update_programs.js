const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const dbPath = path.resolve(__dirname, 'flashfit.db');
const db = new sqlite3.Database(dbPath);

console.log("Connected to DB to wipe preloaded programs: ", dbPath);

db.serialize(() => {
    db.run("PRAGMA foreign_keys = ON;");

    // First, nullify references in workout_logs to prevent FK constraint errors
    db.run(`UPDATE workout_logs SET program_id = NULL, program_session_id = NULL WHERE program_id IN (SELECT id FROM workout_programs WHERE is_preloaded = 1)`, function (err) {
        if (err) console.error("Error unlinking logs:", err);
        else console.log(`Unlinked ${this.changes} workout logs from preloaded programs to save history.`);

        // Now delete the programs
        db.run('DELETE FROM workout_programs WHERE is_preloaded = 1', function (err) {
            if (err) {
                console.error("Error wiping programs:", err);
            } else {
                console.log(`Deleted ${this.changes} preloaded programs (Cascade will wipe sessions).`);
                console.log("The development server will now re-seed the updated programs on restart.");
            }
            db.close();
        });
    });
});
