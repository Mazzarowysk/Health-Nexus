const fs = require('fs');
const path = 'src/tabs/kanban.js';
let content = fs.readFileSync(path, 'utf8');

// 1. Add ID to the wrapper div
content = content.replace(
  '<div style="min-width: 1400px; display:flex; flex-direction:column; gap:14px; flex-grow:1;">',
  '<div id="kanban-scroll-wrapper" style="min-width: 1400px; display:flex; flex-direction:column; gap:14px; flex-grow:1;">'
);

// 2. Modify the kanban columns generation in loadAndRenderKanban
const oldMap = `board.innerHTML = KANBAN_COLUMNS.map(col => {
    let cards = active.filter(h => h.current_sector === col.id).sort((a,b) => new Date(a.sector_entry_date)-new Date(b.sector_entry_date));`;
    
const newMap = `// Update layouts for isolation
  const scrollWrapper = document.getElementById('kanban-scroll-wrapper');
  if (scrollWrapper) scrollWrapper.style.minWidth = currentFilter === 'all' ? '1400px' : '100%';
  
  const filtersRow = document.getElementById('kanban-filters-row');
  if (filtersRow) {
    // Keep filters in a scrollable horizontal row if isolated
    filtersRow.style.minWidth = currentFilter === 'all' ? 'auto' : '1400px'; 
  }

  board.style.gridTemplateColumns = currentFilter === 'all' ? 'repeat(5, 1fr)' : 'repeat(auto-fit, minmax(400px, 1fr))';
  if (currentFilter !== 'all') {
    board.style.display = 'flex';
    board.style.justifyContent = 'center';
  } else {
    board.style.display = 'grid';
  }

  board.innerHTML = KANBAN_COLUMNS.map(col => {
    const isSelected = currentFilter === col.id;
    const isFilteredOut = currentFilter !== 'all' && !isSelected;
    if (isFilteredOut) return ''; // Completely hide unselected columns

    let cards = active.filter(h => h.current_sector === col.id).sort((a,b) => new Date(a.sector_entry_date)-new Date(b.sector_entry_date));`;

content = content.replace(oldMap, newMap);

// 3. Add ID to filters row
content = content.replace(
  '<div style="display:grid; grid-template-columns: repeat(5, 1fr); gap: 14px; flex-shrink:0;">\n            ${filtersHtml}',
  '<div id="kanban-filters-row" style="display:grid; grid-template-columns: repeat(5, 1fr); gap: 14px; flex-shrink:0;">\n            ${filtersHtml}'
);

// 4. Update the column div wrapper to have a max-width if isolated
const oldColDiv = `<div class="kanban-col" data-col="\${col.id}" style="background: rgba(\${rgb}, \${isSelected ? '0.1' : '0.04'}); border-radius:14px; display:flex; flex-direction:column; border:1.5px solid rgba(\${rgb}, \${isSelected ? '0.7' : isFilteredOut ? '0.15' : '0.3'}); box-shadow:\${isSelected ? \`0 8px 24px rgba(\${rgb}, 0.25)\` : \`0 4px 12px rgba(\${rgb}, 0.05)\`}; overflow:hidden; transition: all 0.3s ease; opacity: \${isFilteredOut ? '0.35' : '1'}; filter: \${isFilteredOut ? 'grayscale(40%)' : 'none'};">`;

const newColDiv = `<div class="kanban-col" data-col="\${col.id}" style="background: rgba(\${rgb}, \${isSelected ? '0.1' : '0.04'}); border-radius:14px; display:flex; flex-direction:column; border:1.5px solid rgba(\${rgb}, \${isSelected ? '0.7' : '0.3'}); box-shadow:\${isSelected ? \`0 8px 24px rgba(\${rgb}, 0.25)\` : \`0 4px 12px rgba(\${rgb}, 0.05)\`}; overflow:hidden; transition: all 0.3s ease; width: \${isSelected ? '100%' : 'auto'}; max-width: \${isSelected ? '800px' : 'none'};">`;

content = content.replace(oldColDiv, newColDiv);

// Since we removed isFilteredOut from being used inside the template string but we need to remove it from being defined inside the oldColDiv replacement if it is still there. 
// Wait, isFilteredOut is still defined earlier. We just use it to return '' above.

fs.writeFileSync(path, content, 'utf8');
console.log('Script aplicado com sucesso.');
