const fs = require('fs');

let code = fs.readFileSync('src/tabs/reports.js', 'utf8');

// Replace 1: Finance
let financeRegex = /<div class="filter-group" style="grid-column: 1 \/ -1; margin-top: 8px;">\s*<button id="btn-open-fin-window-top"/g;
let repFinance = `<div class="filter-group" style="grid-column: 1 / -1; margin-top: 8px; display: flex; gap: 12px;">
            <button type="button" onclick="document.getElementById('filter-date-start-fin').value=''; document.getElementById('filter-date-end-fin').value=''; document.getElementById('filter-fin-type').value='Todos'; document.getElementById('filter-fin-search').value=''; document.querySelectorAll('.filter-fin-item, .filter-fin-cat-item, .filter-fin-method-item').forEach(c=>c.checked=true); typeof filterAndRender==='function' && filterAndRender();" class="btn" style="flex: 1; max-width: 160px; height: 44px; background: var(--bg-tertiary); border: 1px solid var(--border-color); color: var(--text-primary); border-radius: 12px; font-weight: 700; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px;" title="Limpar Filtros"><i class="fa-solid fa-filter-circle-xmark"></i> Limpar</button>
            <button id="btn-open-fin-window-top"`;
if(financeRegex.test(code)) {
    code = code.replace(financeRegex, repFinance);
    console.log("Finance replaced");
}

// Replace 2: Encounters (filter-doctor-name)
let encountersRegex = /<div class="filter-group" style="min-width: 180px;">\s*<label>Médico Responsável<\/label>\s*<select id="filter-doctor-name"/;
let repEncounters = `<div class="filter-group" style="min-width: 180px;">
              <label>Médico Responsável</label>
              <div style="display: flex; gap: 8px;">
              <select id="filter-doctor-name" style="flex: 1;"`;
if(encountersRegex.test(code)) {
    code = code.replace(encountersRegex, repEncounters);
    code = code.replace(/<\/select>\s*<\/div>\s*<\/div>\s*<div id="rep-encounters-container"/, 
    `</select>\n            <button type="button" onclick="document.getElementById('filter-date-start').value=''; document.getElementById('filter-date-end').value=''; document.getElementById('filter-doctor-name').value=''; document.querySelectorAll('.filter-status-item, .filter-manchester-item, .filter-type-item').forEach(c=>c.checked=true); typeof filterAndRender==='function' && filterAndRender();" class="btn" style="background: var(--bg-tertiary); border: 1px solid var(--border-color); color: var(--text-primary); border-radius: 8px; padding: 0 14px; cursor: pointer; display: flex; align-items: center; justify-content: center;" title="Limpar Filtros"><i class="fa-solid fa-filter-circle-xmark"></i></button>\n            </div>\n          </div>\n        </div>\n        <div id="rep-encounters-container"`);
    console.log("Encounters replaced");
}

// Replace 3: Patients (filter-billing-min)
let patientsRegex = /<div class="filter-group">\s*<label>Faturamento Mínimo \(R\$\)<\/label>\s*<input type="number" id="filter-billing-min"/;
let repPatients = `<div class="filter-group">
              <label>Faturamento Mínimo (R$)</label>
              <div style="display: flex; gap: 8px;">
              <input type="number" id="filter-billing-min" style="flex: 1;"`;
if(patientsRegex.test(code)) {
    code = code.replace(patientsRegex, repPatients);
    code = code.replace(/placeholder="0,00">\s*<\/div>\s*<\/div>\s*<div id="rep-patients-container"/, 
    `placeholder="0,00">\n            <button type="button" onclick="document.getElementById('filter-date-start').value=''; document.getElementById('filter-date-end').value=''; document.getElementById('filter-billing-min').value=''; document.querySelectorAll('.filter-city-item').forEach(c=>c.checked=true); typeof filterAndRender==='function' && filterAndRender();" class="btn" style="background: var(--bg-tertiary); border: 1px solid var(--border-color); color: var(--text-primary); border-radius: 8px; padding: 0 14px; cursor: pointer; display: flex; align-items: center; justify-content: center; height: 38px;" title="Limpar Filtros"><i class="fa-solid fa-filter-circle-xmark"></i></button>\n            </div>\n          </div>\n        </div>\n        <div id="rep-patients-container"`);
    console.log("Patients replaced");
}

fs.writeFileSync('src/tabs/reports.js', code, 'utf8');
console.log('Finished updating reports.js');
