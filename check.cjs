const db = require('better-sqlite3')('local.db');
console.log("Local Tables:");
const localTables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
console.log(localTables.map(t => t.name));

const tables = localTables.map(t => t.name).filter(n => !n.startsWith('sqlite_'));
for (const table of tables) {
    const info = db.prepare(`PRAGMA table_info(${table})`).all();
    console.log(`\nTable ${table}:`);
    console.log(info.map(c => `${c.name} (${c.type})`).join(', '));
}
