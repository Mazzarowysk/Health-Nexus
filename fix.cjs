const fs = require('fs');
let t = fs.readFileSync('backend/app.js', 'utf8');
t = t.replace(/\\\\'/g, "\\'"); // Replace \\' with \'
fs.writeFileSync('backend/app.js', t, 'utf8');
console.log("Fixed syntax errors in app.js");
