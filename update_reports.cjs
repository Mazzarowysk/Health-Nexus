const fs = require('fs');
let code = fs.readFileSync('src/tabs/reports.js', 'utf8');

// 1. Finance Section (Button added next to Lançar Nova Parcela)
const targetFinance = `<div class="filter-group" style="grid-column: 1 / -1; margin-top: 8px;">
              <button id="btn-open-fin-window-top"`;
const repFinance = `<div class="filter-group" style="grid-column: 1 / -1; margin-top: 8px; display: flex; gap: 12px;">
              <button type="button" onclick="document.getElementById('filter-date-start-fin').value=''; document.getElementById('filter-date-end-fin').value=''; document.getElementById('filter-fin-type').value='Todos'; document.getElementById('filter-fin-search').value=''; document.querySelectorAll('.filter-fin-item, .filter-fin-cat-item, .filter-fin-method-item').forEach(c=>c.checked=true); typeof filterAndRender==='function' && filterAndRender();" class="btn" style="flex: 1; max-width: 160px; height: 44px; background: var(--bg-tertiary); border: 1px solid var(--border-color); color: var(--text-primary); border-radius: 12px; font-weight: 700; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px;" title="Limpar Filtros"><i class="fa-solid fa-filter-circle-xmark"></i> Limpar</button>
              <button id="btn-open-fin-window-top"`;

code = code.replace(targetFinance, repFinance);

// 2. Encounters Section (Added to Médico Responsável block)
const targetEncounters = `<div class="filter-group" style="min-width: 180px;">
              <label>Médico Responsável</label>
              <select id="filter-doctor-name"`;
const repEncounters = `<div class="filter-group" style="min-width: 180px;">
              <label>Médico Responsável</label>
              <div style="display: flex; gap: 8px;">
              <select id="filter-doctor-name" style="flex: 1;"`;

// Need to match the end of the select tag
const targetEncountersBtn = `</select>
          </div>
        </div>`;
const repEncountersBtn = `</select>
            <button type="button" onclick="document.getElementById('filter-date-start').value=''; document.getElementById('filter-date-end').value=''; document.getElementById('filter-doctor-name').value=''; document.querySelectorAll('.filter-status-item, .filter-manchester-item, .filter-type-item').forEach(c=>c.checked=true); typeof filterAndRender==='function' && filterAndRender();" class="btn" style="background: var(--bg-tertiary); border: 1px solid var(--border-color); color: var(--text-primary); border-radius: 8px; padding: 0 14px; cursor: pointer; display: flex; align-items: center; justify-content: center;" title="Limpar Filtros"><i class="fa-solid fa-filter-circle-xmark"></i></button>
            </div>
          </div>
        </div>`;

if(code.indexOf(targetEncounters) !== -1) {
    code = code.replace(targetEncounters, repEncounters);
    // Be careful with replacing end tags
    // A regex might be better for finding the specific select end
    code = code.replace(/<\/select>\s*<\/div>\s*<\/div>\s*(?=<div id="rep-encounters-container")/, repEncountersBtn + '\n        ');
}

// 3. Patients Section (Added to Faturamento Mínimo block)
const targetPatients = `<div class="filter-group">
              <label>Faturamento Mínimo (R$)</label>
              <input type="number" id="filter-billing-min"`;
const repPatients = `<div class="filter-group">
              <label>Faturamento Mínimo (R$)</label>
              <div style="display: flex; gap: 8px;">
              <input type="number" id="filter-billing-min" style="flex: 1;"`;

if(code.indexOf(targetPatients) !== -1) {
    code = code.replace(targetPatients, repPatients);
    code = code.replace(/placeholder="0,00">\s*<\/div>\s*<\/div>\s*(?=<div id="rep-patients-container")/, 'placeholder="0,00">\n              <button type="button" onclick="document.getElementById(\'filter-date-start\').value=\'\'; document.getElementById(\'filter-date-end\').value=\'\'; document.getElementById(\'filter-billing-min\').value=\'\'; document.querySelectorAll(\'.filter-city-item\').forEach(c=>c.checked=true); typeof filterAndRender===\'function\' && filterAndRender();" class="btn" style="background: var(--bg-tertiary); border: 1px solid var(--border-color); color: var(--text-primary); border-radius: 8px; padding: 0 14px; cursor: pointer; display: flex; align-items: center; justify-content: center; height: 38px;" title="Limpar Filtros"><i class="fa-solid fa-filter-circle-xmark"></i></button>\n            </div>\n          </div>\n        </div>\n        ');
}

fs.writeFileSync('src/tabs/reports.js', code, 'utf8');
console.log('reports.js updated successfully.');
