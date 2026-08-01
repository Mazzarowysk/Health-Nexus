const { createClient } = require('@libsql/client');
require('dotenv').config();

// Note: Turso URL might be in .env or app_settings table
const db = require('better-sqlite3')('local.db');
let tursoUrl = process.env.TURSO_DATABASE_URL;
let tursoToken = process.env.TURSO_AUTH_TOKEN;

if (!tursoUrl) {
    const rs = db.prepare("SELECT value FROM app_settings WHERE key = 'turso_url'").get();
    if (rs) tursoUrl = rs.value;
}
if (!tursoToken) {
    const rs = db.prepare("SELECT value FROM app_settings WHERE key = 'turso_token'").get();
    if (rs) tursoToken = rs.value;
}

if (!tursoUrl || !tursoToken) {
    console.log("Could not find Turso credentials.");
    process.exit(1);
}

const client = createClient({
    url: tursoUrl,
    authToken: tursoToken
});

async function run() {
    try {
        const rs = await client.execute("SELECT name FROM sqlite_master WHERE type='table'");
        const tables = rs.rows.map(r => r.name).filter(n => !n.startsWith('sqlite_'));
        
        console.log("Turso Tables:");
        console.log(tables);
        
        for (const table of tables) {
            const info = await client.execute(`PRAGMA table_info(${table})`);
            console.log(`\nTable ${table}:`);
            console.log(info.rows.map(c => `${c.name} (${c.type})`).join(', '));
        }
    } catch (e) {
        console.error("Error:", e);
    }
}
run();
