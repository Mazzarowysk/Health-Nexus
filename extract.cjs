const fs = require('fs');
const lines = fs.readFileSync('src/main.js', 'utf8').split(/\r?\n/);

let roomsStart = -1, roomsEnd = -1;
let reportsStart = -1, reportsEnd = -1;

for(let i = 0; i < lines.length; i++) {
  if (lines[i].includes('async function renderConsultingRoomsTab() {')) roomsStart = i;
  else if (roomsStart !== -1 && roomsEnd === -1 && lines[i] === '}') roomsEnd = i;
  
  if (lines[i].includes('function renderReportsTab(contentArea) {')) reportsStart = i;
  else if (reportsStart !== -1 && reportsEnd === -1 && lines[i] === '}') reportsEnd = i;
}

console.log('Rooms:', roomsStart, roomsEnd);
console.log('Reports:', reportsStart, reportsEnd);

if (roomsStart !== -1 && roomsEnd !== -1 && reportsStart !== -1 && reportsEnd !== -1) {
  const roomsCode = lines.slice(roomsStart, roomsEnd + 1).join('\n');
  const reportsCode = lines.slice(reportsStart, reportsEnd + 1).join('\n');
  
  const header = `import { apiFetch, showToast, abbreviateName, switchTab, formatCurrency, setupCustomSelect, showGlobalLoading, hideGlobalLoading, anonymizeCPF, exportToPDF, formatSyncDate } from '../main.js';\nimport { state, dataCache, dataCacheTimestamps } from '../state.js';\n\n`;
  
  fs.writeFileSync('src/tabs/consultingRooms.js', header + roomsCode + '\nwindow.renderConsultingRoomsTab = renderConsultingRoomsTab;\n', 'utf8');
  fs.writeFileSync('src/tabs/reports.js', header + reportsCode + '\nwindow.renderReportsTab = renderReportsTab;\n', 'utf8');
  
  const newLines = [];
  
  let addedImports = false;

  for (let i = 0; i < lines.length; i++) {
    if (!addedImports && lines[i].includes('import * as localDB')) {
        newLines.push(lines[i]);
        newLines.push(`import { state, CACHE_TTL_MS, dataCache, dataCacheTimestamps, getSyncUploadTimeout, setSyncUploadTimeout } from './state.js';`);
        newLines.push(`import './tabs/reports.js';`);
        newLines.push(`import './tabs/consultingRooms.js';`);
        addedImports = true;
        continue;
    }
    
    // strip the old state initialization
    if (lines[i] === 'let state = {') {
        // skip until };
        while (lines[i] !== '};') {
            i++;
        }
        continue;
    }
    if (lines[i] === 'const CACHE_TTL_MS = 30_000;') continue;
    if (lines[i] === 'const dataCache = new Map();') continue;
    if (lines[i] === 'const dataCacheTimestamps = new Map();') continue;
    if (lines[i] === 'let syncUploadTimeout = null;') continue;
    
    // fix references to syncUploadTimeout
    if (lines[i].includes('syncUploadTimeout = setTimeout')) {
        newLines.push(lines[i].replace('syncUploadTimeout = setTimeout', 'setSyncUploadTimeout(setTimeout'));
        continue;
    }
    if (lines[i].includes('clearTimeout(syncUploadTimeout);')) {
        newLines.push(lines[i].replace('clearTimeout(syncUploadTimeout);', 'clearTimeout(getSyncUploadTimeout());'));
        continue;
    }

    if (i >= roomsStart && i <= roomsEnd) continue;
    if (i >= reportsStart && i <= reportsEnd) continue;
    newLines.push(lines[i]);
  }
  
  let mainCode = newLines.join('\n');
  
  // fix the setSyncUploadTimeout closing parenthesis
  mainCode = mainCode.replace(/showSyncPromptModal\(state\.syncInfo \|\| \{ lastLocalBackup: new Date\(\)\.toISOString\(\) \}\);\s*\}, 1000\);/g, 
    "showSyncPromptModal(state.syncInfo || { lastLocalBackup: new Date().toISOString() });\n  }, 1000));");
    
  // Export things from main.js for the tabs
  const exports = `\nexport { apiFetch, showToast, abbreviateName, switchTab, formatCurrency, formatSyncDate, setupCustomSelect, showGlobalLoading, hideGlobalLoading, anonymizeCPF, exportToPDF };\n`;
  mainCode += exports;
  
  fs.writeFileSync('src/main.js', mainCode, 'utf8');
  console.log('Extracted successfully.');
} else {
  console.log('Failed to find boundaries');
}
