const fs = require('fs');
const text = fs.readFileSync('src/main.js', 'utf8');
const lines = text.split('\n');

// Lines to REMOVE from main.js (1-indexed, inclusive)
// These are the sections extracted to separate tab files
const removedRanges = [
  { start: 6037, end: 10340 }, // All tab functions: agenda, leitos, doctors, stagnation, pharmacy, tv
];

// Build new lines array, skipping removed ranges
const newLines = [];
for (let i = 1; i <= lines.length; i++) {
  let skip = false;
  for (const range of removedRanges) {
    if (i >= range.start && i <= range.end) { skip = true; break; }
  }
  if (!skip) newLines.push(lines[i - 1]);
}

const result = newLines.join('\n');
fs.writeFileSync('src/main.js', result, 'utf8');
console.log('main.js reduced from ' + lines.length + ' to ' + newLines.length + ' lines');
