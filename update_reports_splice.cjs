const fs = require('fs');
const path = 'c:/Health Nexus/src/tabs/reports.js';
let content = fs.readFileSync(path, 'utf8');

const scriptToInsert = `    // Sistema de Filtro via KPI Cards
    const filterCards = document.querySelectorAll('.fin-kpi-card');
    const tableRows = document.querySelectorAll('.fin-row-item');
    let currentFilter = 'All';

    const updateFilterDisplay = () => {
      filterCards.forEach(c => {
        const f = c.getAttribute('data-filter');
        if (currentFilter === 'All') {
          c.style.opacity = '1';
        } else {
          c.style.opacity = (f === currentFilter || f === 'All') ? '1' : '0.35';
        }
      });
      
      let visibleCount = 0;
      tableRows.forEach(row => {
        const status = row.getAttribute('data-status');
        const isSelectedAll = currentFilter === 'All';
        const isSelectedOutras = currentFilter === 'Outras' && ['Canceladas', 'Suspensas', 'Excluídas'].includes(status);
        const isSelectedExact = status === currentFilter;
        
        if (isSelectedAll || isSelectedOutras || isSelectedExact) {
          row.style.display = 'table-row';
          visibleCount++;
        } else {
          row.style.display = 'none';
        }
      });
      
      const emptyRow = document.getElementById('modal-fin-empty-row');
      if (emptyRow) {
        emptyRow.style.display = visibleCount === 0 ? 'table-row' : 'none';
      }
    };

    filterCards.forEach(card => {
      card.addEventListener('click', () => {
        const filter = card.getAttribute('data-filter');
        if (currentFilter === filter) {
          currentFilter = 'All';
        } else {
          currentFilter = filter;
        }
        updateFilterDisplay();
      });
    });`;

let lines = content.split('\\n');
// We want to insert the script exactly at the blank line before "const closeModal"
// Line 2269 in our view was "const closeModal = () => { modal.style.display = 'none'; };"
// In 0-based array, line 2269 is index 2268.

// Let's search line by line to be completely safe:
let targetIdx = -1;
for (let i = 2200; i < 2350; i++) {
    if (lines[i] && lines[i].includes("document.getElementById('close-modal-fin-window')?.addEventListener('click', closeModal);")) {
        targetIdx = i - 1; // Insert before the const closeModal
        break;
    }
}

if (targetIdx !== -1) {
    lines.splice(targetIdx, 0, scriptToInsert);
    fs.writeFileSync(path, lines.join('\\n'), 'utf8');
    console.log('Update complete using line splicing');
} else {
    console.log('Target line not found in the search range.');
}
