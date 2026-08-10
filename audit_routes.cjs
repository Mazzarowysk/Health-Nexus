const fs = require('fs');
const main = fs.readFileSync('src/main.js', 'utf8');
const routes = main.match(/apiFetch\(['"`](\/api\/[^'"`]+)/g) || [];
const unique = [...new Set(routes.map(r => r.replace(/apiFetch\(['"`]/, '')))].sort();
console.log('Current API routes:\n' + unique.join('\n'));
