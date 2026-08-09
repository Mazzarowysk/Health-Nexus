const fs = require('fs');

// 1. agenda.js
let agenda = fs.readFileSync('src/tabs/agenda.js', 'utf8');
agenda = agenda.replace(
  '<div style="position: relative; flex: 1; min-width: 220px;">\n            <i class="fa-solid fa-magnifying-glass"',
  '<div style="position: relative; flex: 1; min-width: 220px; display: flex; align-items: center; gap: 8px;">\n            <div style="position: relative; flex: 1;">\n              <i class="fa-solid fa-magnifying-glass"'
);
agenda = agenda.replace(
  'color: var(--text-primary); font-size: 0.85rem; outline: none;">\n          </div>\n          <!-- Data -->',
  'color: var(--text-primary); font-size: 0.85rem; outline: none;">\n            </div>\n            <button onclick="document.getElementById(\'filter-agenda-search\').value=\'\'; document.getElementById(\'filter-agenda-doctor\').value=\'\'; document.getElementById(\'filter-agenda-search\').dispatchEvent(new Event(\'input\'));" class="btn" style="background: var(--bg-tertiary); border: 1px solid var(--border-color); color: var(--text-primary); padding: 9px 14px; font-size: 0.85rem; border-radius: 8px; cursor: pointer; display: flex; align-items: center; justify-content: center; height: 100%;" title="Limpar Filtros"><i class="fa-solid fa-filter-circle-xmark"></i></button>\n          </div>\n          <!-- Data -->'
);
fs.writeFileSync('src/tabs/agenda.js', agenda, 'utf8');

// 2. pharmacy.js
let pharmacy = fs.readFileSync('src/tabs/pharmacy.js', 'utf8');
pharmacy = pharmacy.replace(
  '<div style="display: flex; gap: 12px; align-items: center; flex: 1; max-width: 500px;">\n          <input type="text" id="pharm-search-input" class="form-input" placeholder="Buscar medicamento ou lote..." style="max-width: 280px;">',
  '<div style="display: flex; gap: 12px; align-items: center; flex: 1; max-width: 500px;">\n          <div style="display: flex; gap: 8px; flex: 1; max-width: 320px;">\n            <input type="text" id="pharm-search-input" class="form-input" placeholder="Buscar medicamento ou lote..." style="flex: 1;">\n            <button onclick="document.getElementById(\'pharm-search-input\').value=\'\'; document.getElementById(\'filter-pharmacy-status\').value=\'\'; document.getElementById(\'pharm-search-input\').dispatchEvent(new Event(\'input\'));" class="btn" style="background: var(--bg-tertiary); border: 1px solid var(--border-color); color: var(--text-primary); padding: 9px 14px; border-radius: 8px; cursor: pointer; display: flex; align-items: center; justify-content: center;" title="Limpar Filtros"><i class="fa-solid fa-filter-circle-xmark"></i></button>\n          </div>'
);
fs.writeFileSync('src/tabs/pharmacy.js', pharmacy, 'utf8');

console.log('agenda.js and pharmacy.js updated.');
