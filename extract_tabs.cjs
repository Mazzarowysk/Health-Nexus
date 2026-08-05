const fs = require('fs');
const text = fs.readFileSync('src/main.js', 'utf8');
const lines = text.split('\n');

const IMPORT_HEADER = [
  "import { apiFetch, showToast, abbreviateName, switchTab, setupCustomSelect, anonymizeCPF, exportToPDF, formatSyncDate } from '../main.js';",
  "import { state, dataCache, dataCacheTimestamps } from '../state.js';",
  "",
  "const API_URL = '/api';",
  ""
].join('\n');

const sections = [
  { file: 'agenda',     start: 6037, end: 6607, fns: ['renderAgendaTab'] },
  { file: 'leitos',     start: 6608, end: 7032, fns: ['renderLeitosTab'] },
  { file: 'doctors',    start: 7033, end: 8090, fns: ['renderDoctorsTab'] },
  { file: 'stagnation', start: 8091, end: 8572, fns: ['renderStagnationTab'] },
  { file: 'pharmacy',   start: 8573, end: 9032, fns: ['renderPharmacyTab', 'renderPharmacyTable'] },
  { file: 'tv',         start: 9033, end: 10340, fns: ['renderTVPanelTab', 'renderTVCallsUI'] },
];

sections.forEach(s => {
  const body = lines.slice(s.start - 1, s.end).join('\n');
  const windowExports = s.fns.map(fn => 'window.' + fn + ' = ' + fn + ';').join('\n');
  const content = IMPORT_HEADER + '\n' + body + '\n\n' + windowExports + '\n';
  fs.writeFileSync('src/tabs/' + s.file + '.js', content, 'utf8');
  console.log('Created src/tabs/' + s.file + '.js (' + content.split('\n').length + ' lines)');
});

console.log('Done extracting tab files!');
