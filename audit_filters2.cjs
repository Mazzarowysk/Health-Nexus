const fs = require('fs');

// Also check main files with filters
const mainFiles = ['src/tabs/agenda.js','src/tabs/doctors.js','src/tabs/pharmacy.js'];
mainFiles.forEach(f => {
  const c = fs.readFileSync(f, 'utf8');
  console.log('=== ' + f);
  console.log('  Has Limpar btn:', c.includes('filter-circle-xmark'));
});

console.log('---');

// Get filter inputs in kanban.js more deeply
const kanban = fs.readFileSync('src/tabs/kanban.js', 'utf8');
// Find the kanban search/filter area
const kanbanFilterArea = kanban.match(/kanban-filter[^"']*/gi) || [];
console.log('Kanban filter IDs:', [...new Set(kanbanFilterArea)]);

// stagnation.js
const stag = fs.readFileSync('src/tabs/stagnation.js', 'utf8');
const stagInputs = stag.match(/input[^>]*type="text"[^>]*/gi) || [];
stagInputs.slice(0,5).forEach(m => console.log('STAG INPUT:', m.substring(0,120)));
const stagSelects = stag.match(/select[^>]*id="[^"]+"/gi) || [];
stagSelects.slice(0,5).forEach(m => console.log('STAG SELECT:', m.substring(0,100)));

// leitos.js
const leitos = fs.readFileSync('src/tabs/leitos.js', 'utf8');
const leitosInputs = leitos.match(/input[^>]*type="text"[^>]*/gi) || [];
leitosInputs.slice(0,5).forEach(m => console.log('LEITOS INPUT:', m.substring(0,120)));
const leitosSelects = leitos.match(/select[^>]*id="[^"]+"/gi) || [];
leitosSelects.slice(0,5).forEach(m => console.log('LEITOS SELECT:', m.substring(0,100)));
