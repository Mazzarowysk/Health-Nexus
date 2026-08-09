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
    });

    const closeModal = () => { modal.style.display = 'none'; };
    document.getElementById('close-modal-fin-window')?.addEventListener('click', closeModal);`;

const regex = /[ \t]*const closeModal = \(\) => \{ modal\.style\.display = 'none'; \};\r?\n[ \t]*document\.getElementById\('close-modal-fin-window'\)\?\.addEventListener\('click', closeModal\);/;
if (regex.test(content)) {
    content = content.replace(regex, scriptToInsert);
    fs.writeFileSync(path, content, 'utf8');
    console.log('Update complete target regex');
} else {
    console.log('Target string still not found.');
}
