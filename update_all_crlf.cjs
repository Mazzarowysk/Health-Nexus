const fs = require('fs');

// For reports.js
let code = fs.readFileSync('src/tabs/reports.js', 'utf8');
code = code.replace(/\r\n/g, '\n'); // Normalize line endings

// 1. Finance Section (Button added next to Lançar Nova Parcela)
const targetFinance = `<div class="filter-group" style="grid-column: 1 / -1; margin-top: 8px;">
              <button id="btn-open-fin-window-top"`;
const repFinance = `<div class="filter-group" style="grid-column: 1 / -1; margin-top: 8px; display: flex; gap: 12px;">
              <button type="button" onclick="document.getElementById('filter-date-start-fin').value=''; document.getElementById('filter-date-end-fin').value=''; document.getElementById('filter-fin-type').value='Todos'; document.getElementById('filter-fin-search').value=''; document.querySelectorAll('.filter-fin-item, .filter-fin-cat-item, .filter-fin-method-item').forEach(c=>c.checked=true); typeof filterAndRender==='function' && filterAndRender();" class="btn" style="flex: 1; max-width: 160px; height: 44px; background: var(--bg-tertiary); border: 1px solid var(--border-color); color: var(--text-primary); border-radius: 12px; font-weight: 700; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px;" title="Limpar Filtros"><i class="fa-solid fa-filter-circle-xmark"></i> Limpar</button>
              <button id="btn-open-fin-window-top"`;

code = code.replace(targetFinance, repFinance);
if(code.indexOf(repFinance) !== -1) console.log('Finance replaced');

// 2. Encounters Section (Added to Médico Responsável block)
const targetEncounters = `<div class="filter-group" style="min-width: 180px;">
              <label>Médico Responsável</label>
              <select id="filter-doctor-name"`;
const repEncounters = `<div class="filter-group" style="min-width: 180px;">
              <label>Médico Responsável</label>
              <div style="display: flex; gap: 8px;">
              <select id="filter-doctor-name" style="flex: 1;"`;

if(code.indexOf(targetEncounters) !== -1) {
    code = code.replace(targetEncounters, repEncounters);
    console.log('Encounters replaced');
}
const repEncountersBtn = `</select>
            <button type="button" onclick="document.getElementById('filter-date-start').value=''; document.getElementById('filter-date-end').value=''; document.getElementById('filter-doctor-name').value=''; document.querySelectorAll('.filter-status-item, .filter-manchester-item, .filter-type-item').forEach(c=>c.checked=true); typeof filterAndRender==='function' && filterAndRender();" class="btn" style="background: var(--bg-tertiary); border: 1px solid var(--border-color); color: var(--text-primary); border-radius: 8px; padding: 0 14px; cursor: pointer; display: flex; align-items: center; justify-content: center;" title="Limpar Filtros"><i class="fa-solid fa-filter-circle-xmark"></i></button>
            </div>
          </div>
        </div>`;

code = code.replace(/<\/select>\s*<\/div>\s*<\/div>\s*(?=<div id="rep-encounters-container")/, repEncountersBtn + '\n        ');


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
    console.log('Patients replaced');
}
code = code.replace(/placeholder="0,00">\s*<\/div>\s*<\/div>\s*(?=<div id="rep-patients-container")/, 'placeholder="0,00">\n              <button type="button" onclick="document.getElementById(\'filter-date-start\').value=\'\'; document.getElementById(\'filter-date-end\').value=\'\'; document.getElementById(\'filter-billing-min\').value=\'\'; document.querySelectorAll(\'.filter-city-item\').forEach(c=>c.checked=true); typeof filterAndRender===\'function\' && filterAndRender();" class="btn" style="background: var(--bg-tertiary); border: 1px solid var(--border-color); color: var(--text-primary); border-radius: 8px; padding: 0 14px; cursor: pointer; display: flex; align-items: center; justify-content: center; height: 38px;" title="Limpar Filtros"><i class="fa-solid fa-filter-circle-xmark"></i></button>\n            </div>\n          </div>\n        </div>\n        ');

fs.writeFileSync('src/tabs/reports.js', code, 'utf8');

// For main.js
let mainJs = fs.readFileSync('src/main.js', 'utf8');
mainJs = mainJs.replace(/\r\n/g, '\n');

const searchTarget = `<div class="custom-select-search-wrapper">
        <i class="fa-solid fa-magnifying-glass"></i>
        <input type="text" class="custom-select-search-input" placeholder="🔍 Digite para filtrar por nome ou CPF..." autocomplete="off">
      </div>`;
      
const searchReplacement = `<div class="custom-select-search-wrapper" style="display: flex; gap: 8px;">
        <div style="position: relative; flex: 1;">
          <i class="fa-solid fa-magnifying-glass" style="position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: var(--text-muted);"></i>
          <input type="text" class="custom-select-search-input" placeholder="🔍 Digite para filtrar por nome ou CPF..." autocomplete="off" style="width: 100%; padding-left: 36px; padding-right: 8px;">
        </div>
        <button type="button" class="btn btn-clear-search" style="background: var(--bg-tertiary); border: 1px solid var(--border-color); color: var(--text-primary); padding: 0 14px; border-radius: 8px; cursor: pointer; display: flex; align-items: center; justify-content: center;" title="Limpar Filtro">
          <i class="fa-solid fa-filter-circle-xmark"></i>
        </button>
      </div>`;

mainJs = mainJs.replace(searchTarget, searchReplacement);
if(mainJs.indexOf(searchReplacement) !== -1) console.log('Main search replaced');

const listenerTarget = `const searchInput = container.querySelector('.custom-select-search-input');
  const listContainer = container.querySelector('.custom-select-options-list');`;
  
const listenerReplacement = `const searchInput = container.querySelector('.custom-select-search-input');
  const listContainer = container.querySelector('.custom-select-options-list');
  const clearBtn = container.querySelector('.btn-clear-search');
  if (clearBtn) {
    clearBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      searchInput.value = '';
      renderList(sortedItems);
      searchInput.focus();
    });
  }`;

mainJs = mainJs.replace(listenerTarget, listenerReplacement);
if(mainJs.indexOf(listenerReplacement) !== -1) console.log('Main listener replaced');

fs.writeFileSync('src/main.js', mainJs, 'utf8');
console.log('Update finished.');
