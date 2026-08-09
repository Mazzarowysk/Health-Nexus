const fs = require('fs');
const path = 'src/tabs/kanban.js';
let content = fs.readFileSync(path, 'utf8');

// 1. Add 'Visão Geral' to FILTER_CARDS
content = content.replace(
  `  const FILTER_CARDS = [
    { id: 'pronto_socorro', label: 'Pronto Socorro', icon: 'fa-truck-medical', color: '#3b82f6', rgb: '59,130,246' },`,
  `  const FILTER_CARDS = [
    { id: 'all', label: 'Visão Geral', icon: 'fa-layer-group', color: '#818cf8', rgb: '129,140,248' },
    { id: 'pronto_socorro', label: 'Pronto Socorro', icon: 'fa-truck-medical', color: '#3b82f6', rgb: '59,130,246' },`
);

// 2. Make cards bigger in the template
content = content.replace(
  `style="background: var(--bg-secondary); border: 1px solid var(--border-color); border-radius: 14px; padding: 12px 14px; cursor: pointer; transition: all 0.2s ease; position: relative; display: flex; flex-direction: column; justify-content: space-between; height: 100%;"`,
  `style="background: rgba(30,41,59,0.5); backdrop-filter: blur(8px); border: 1px solid rgba(255,255,255,0.06); border-radius: 16px; padding: 18px 22px; cursor: pointer; transition: all 0.25s ease; position: relative; display: flex; flex-direction: column; justify-content: space-between; height: 100%; min-height: 110px;"`
);

content = content.replace(
  `width: 36px; height: 36px; border-radius: 10px; background: rgba(\${f.rgb}, 0.15); border: 1px solid rgba(\${f.rgb}, 0.3); display: flex; align-items: center; justify-content: center; color: \${f.color}; font-size: 1.05rem;"`,
  `width: 44px; height: 44px; border-radius: 12px; background: rgba(\${f.rgb}, 0.15); border: 1px solid rgba(\${f.rgb}, 0.3); display: flex; align-items: center; justify-content: center; color: \${f.color}; font-size: 1.25rem;"`
);

content = content.replace(
  `margin: 0 0 2px 0;">\${f.label}</h4>`,
  `margin: 0 0 4px 0; font-size: 1rem;">\${f.label}</h4>`
);

content = content.replace(
  `font-size: 0.75rem; color: var(--text-muted);`,
  `font-size: 0.8rem; color: rgba(255,255,255,0.6);`
);

// 3. Remove old 'Todos os Setores' button
content = content.replace(
  `          <button onclick="resetKanbanAllFilters()" id="kf-all" style="padding:9px 16px; border-radius:10px; font-size:0.85rem; font-weight:700; display:flex; align-items:center; gap:8px; cursor:pointer; transition:all 0.2s; background:rgba(99,102,241,0.12); border:1.5px solid rgba(99,102,241,0.4); color:#ffffff; box-shadow:0 4px 12px rgba(99,102,241,0.15);">
            <i class="fa-solid fa-layer-group" style="color:#818cf8;"></i> Todos os Setores (<span id="count-all">0</span>)
          </button>`,
  ``
);

// 4. Update Analytics Dashboard Cards styles
content = content.replace(
  `min-width: 200px; background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 14px; padding: 12px; box-shadow: 0 4px 14px rgba(0,0,0,0.1);`,
  `min-width: 200px; background: rgba(30, 41, 59, 0.65); backdrop-filter: blur(12px); border: 1px solid rgba(255,255,255,0.08); border-radius: 16px; padding: 16px; box-shadow: 0 8px 32px rgba(0,0,0,0.25);`
);
content = content.replace(
  `min-width: 200px; background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 14px; padding: 12px; box-shadow: 0 4px 14px rgba(0,0,0,0.1);`, // second card
  `min-width: 200px; background: rgba(30, 41, 59, 0.65); backdrop-filter: blur(12px); border: 1px solid rgba(255,255,255,0.08); border-radius: 16px; padding: 16px; box-shadow: 0 8px 32px rgba(0,0,0,0.25);`
);
content = content.replace(
  `min-width: 260px; background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 14px; padding: 12px; box-shadow: 0 4px 14px rgba(0,0,0,0.1);`,
  `min-width: 260px; background: rgba(30, 41, 59, 0.65); backdrop-filter: blur(12px); border: 1px solid rgba(255,255,255,0.08); border-radius: 16px; padding: 16px; box-shadow: 0 8px 32px rgba(0,0,0,0.25);`
);

// 5. Update kanban-filters-row to 6 columns
content = content.replace(
  `id="kanban-filters-row" style="display:grid; grid-template-columns: repeat(5, 1fr); gap: 14px; flex-shrink:0;"`,
  `id="kanban-filters-row" style="display:grid; grid-template-columns: repeat(6, 1fr); gap: 16px; flex-shrink:0;"`
);

// 6. Update setKanbanFilter to remove manual kf-all button styling (and update inactive state of new cards)
const setKanbanFilterRegex = /window\.setKanbanFilter = function\(filterId\) \{[\s\S]*?\/\/ Style the 5 sector cards/;
const newSetKanbanFilter = `window.setKanbanFilter = function(filterId) {
  currentFilter = filterId;
  
  // Style all 6 sector cards`;
content = content.replace(setKanbanFilterRegex, newSetKanbanFilter);

// 7. Update inactive state of cards in setKanbanFilter
content = content.replace(
  `card.style.background = 'var(--bg-secondary)';`,
  `card.style.background = 'rgba(30,41,59,0.5)';`
);
content = content.replace(
  `card.style.borderColor = 'var(--border-color)';`,
  `card.style.borderColor = 'rgba(255,255,255,0.06)';`
);
// replace multiple times since it appears in mouseleave handler too
content = content.replace(
  `this.style.borderColor='var(--border-color)'`,
  `this.style.borderColor='rgba(255,255,255,0.06)'`
);

fs.writeFileSync(path, content, 'utf8');
console.log('Update script run successfully.');
