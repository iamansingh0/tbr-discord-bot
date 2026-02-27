const sqlite3 = require('sqlite3').verbose();

const db = new sqlite3.Database('./tbr.db', (err) => {
  if (err) {
    console.error('Database opening error:', err);
  } else {
    console.log('✅ Connected to SQLite database');
  }
});

// Create table if not exists
db.run(`
  CREATE TABLE IF NOT EXISTS books (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    title TEXT NOT NULL,
    status TEXT DEFAULT 'not_started',
    tags TEXT DEFAULT '',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

// db.run(`ALTER TABLE books ADD COLUMN tags TEXT DEFAULT ''`, (err) => {
//   if (err && !err.message.includes('duplicate column')) {
//     console.error(err);
//   }
// });

module.exports = db;