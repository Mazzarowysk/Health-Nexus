
const fs = require('fs');
const mainJs = fs.readFileSync('src/main.js', 'utf8');
const dischargeBedCode = mainJs.substring(mainJs.indexOf('window.dischargeBed ='), mainJs.indexOf('window.updateBedStatus ='));
console.log(dischargeBedCode);

