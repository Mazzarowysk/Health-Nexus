const fs = require('fs');
const path = 'c:/Health Nexus/src/tabs/reports.js';
let content = fs.readFileSync(path, 'utf8');

// 1. KPI Cards
content = content.replace(
  '<div style="background: linear-gradient(135deg, rgba(52,211,153,0.12), rgba(52,211,153,0.04)); border: 1px solid rgba(52,211,153,0.35); border-radius: 14px; padding: 14px 16px;">',
  '<div class="fin-kpi-card" data-filter="Pagas" style="background: linear-gradient(135deg, rgba(52,211,153,0.12), rgba(52,211,153,0.04)); border: 1px solid rgba(52,211,153,0.35); border-radius: 14px; padding: 14px 16px; cursor: pointer; transition: all 0.2s ease;" onmouseover="this.style.transform=\'translateY(-2px)\'" onmouseout="this.style.transform=\'translateY(0)\'">'
);

content = content.replace(
  '<div style="background: linear-gradient(135deg, rgba(0,242,254,0.12), rgba(0,242,254,0.04)); border: 1px solid rgba(0,242,254,0.35); border-radius: 14px; padding: 14px 16px;">',
  '<div class="fin-kpi-card" data-filter="A Vencer" style="background: linear-gradient(135deg, rgba(0,242,254,0.12), rgba(0,242,254,0.04)); border: 1px solid rgba(0,242,254,0.35); border-radius: 14px; padding: 14px 16px; cursor: pointer; transition: all 0.2s ease;" onmouseover="this.style.transform=\'translateY(-2px)\'" onmouseout="this.style.transform=\'translateY(0)\'">'
);

content = content.replace(
  '<div style="background: linear-gradient(135deg, rgba(244,63,94,0.12), rgba(244,63,94,0.04)); border: 1px solid rgba(244,63,94,0.35); border-radius: 14px; padding: 14px 16px;">',
  '<div class="fin-kpi-card" data-filter="Vencidas" style="background: linear-gradient(135deg, rgba(244,63,94,0.12), rgba(244,63,94,0.04)); border: 1px solid rgba(244,63,94,0.35); border-radius: 14px; padding: 14px 16px; cursor: pointer; transition: all 0.2s ease;" onmouseover="this.style.transform=\'translateY(-2px)\'" onmouseout="this.style.transform=\'translateY(0)\'">'
);

content = content.replace(
  '<div style="background: linear-gradient(135deg, rgba(52,211,153,0.08), rgba(244,63,94,0.08)); border: 1px solid rgba(255,255,255,0.12); border-radius: 14px; padding: 14px 16px;">',
  '<div class="fin-kpi-card" data-filter="All" style="background: linear-gradient(135deg, rgba(52,211,153,0.08), rgba(244,63,94,0.08)); border: 1px solid rgba(255,255,255,0.12); border-radius: 14px; padding: 14px 16px; cursor: pointer; transition: all 0.2s ease;" onmouseover="this.style.transform=\'translateY(-2px)\'" onmouseout="this.style.transform=\'translateY(0)\'" title="Ver Todos (Saldo Líquido)">'
);

content = content.replace(
  '<div style="background: linear-gradient(135deg, rgba(251,191,36,0.08), rgba(251,191,36,0.04)); border: 1px solid rgba(251,191,36,0.25); border-radius: 14px; padding: 14px 16px;">',
  '<div class="fin-kpi-card" data-filter="Bonificadas" style="background: linear-gradient(135deg, rgba(251,191,36,0.08), rgba(251,191,36,0.04)); border: 1px solid rgba(251,191,36,0.25); border-radius: 14px; padding: 14px 16px; cursor: pointer; transition: all 0.2s ease;" onmouseover="this.style.transform=\'translateY(-2px)\'" onmouseout="this.style.transform=\'translateY(0)\'">'
);

content = content.replace(
  '<div style="background: linear-gradient(135deg, rgba(248,113,113,0.08), rgba(248,113,113,0.04)); border: 1px solid rgba(248,113,113,0.2); border-radius: 14px; padding: 14px 16px;">',
  '<div class="fin-kpi-card" data-filter="Outras" style="background: linear-gradient(135deg, rgba(248,113,113,0.08), rgba(248,113,113,0.04)); border: 1px solid rgba(248,113,113,0.2); border-radius: 14px; padding: 14px 16px; cursor: pointer; transition: all 0.2s ease;" onmouseover="this.style.transform=\'translateY(-2px)\'" onmouseout="this.style.transform=\'translateY(0)\'">'
);

// 2. Table Rows (Empty row)
content = content.replace(
  '<tr><td colspan="10" style="text-align:center; padding: 24px; color: var(--text-muted);">Nenhum título financeiro encontrado para os filtros selecionados.</td></tr>',
  '<tr id="modal-fin-empty-row"><td colspan="10" style="text-align:center; padding: 24px; color: var(--text-muted);">Nenhum título financeiro encontrado para os filtros selecionados.</td></tr>'
);
// Modify map replacement correctly to include the empty row if needed for filter logic
content = content.replace(
  ' : installmentsList.map(t => {',
  ' ` : `<tr id="modal-fin-empty-row" style="display:none;"><td colspan="10" style="text-align:center; padding: 24px; color: var(--text-muted);">Nenhum título financeiro nesta categoria.</td></tr>` + installmentsList.map(t => {'
);

// 3. Table Rows (Actual data rows)
content = content.replace(
  '<tr style="border-bottom: 1px solid var(--border-color); transition: background 0.15s ease;" onmouseover="this.style.background=\'rgba(255,255,255,0.03)\'" onmouseout="this.style.background=\'\'">',
  '<tr class="fin-row-item" data-status="${t.status}" style="border-bottom: 1px solid var(--border-color); transition: background 0.15s ease;" onmouseover="this.style.background=\'rgba(255,255,255,0.03)\'" onmouseout="this.style.background=\'\'">'
);

// 4. JS Logic at the end of openDedicatedFinanceModal
const scriptToInsert = `    const closeModal = () => { modal.style.display = 'none'; };
    document.getElementById('close-modal-fin-window')?.addEventListener('click', closeModal);

    // Sistema de Filtro via KPI Cards
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

content = content.replace(
  '    const closeModal = () => { modal.style.display = \'none\'; };\r\n    document.getElementById(\'close-modal-fin-window\')?.addEventListener(\'click\', closeModal);',
  scriptToInsert
);
content = content.replace(
  '    const closeModal = () => { modal.style.display = \'none\'; };\n    document.getElementById(\'close-modal-fin-window\')?.addEventListener(\'click\', closeModal);',
  scriptToInsert
);

fs.writeFileSync(path, content, 'utf8');
console.log('Update complete');
