const fs = require('fs');
const path = 'src/tabs/kanban.js';
let content = fs.readFileSync(path, 'utf8');

// 1. Enlarge filter cards and give them a strong glass button appearance
content = content.replace(
  /class="kanban-filter-card".*?style=".*?"/g,
  `class="kanban-filter-card" data-color="\${f.color}" data-rgb="\${f.rgb}" style="background: rgba(30, 41, 59, 0.4); backdrop-filter: blur(12px); border: 1.5px solid rgba(255,255,255,0.08); border-radius: 18px; padding: 22px 24px; cursor: pointer; transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); position: relative; display: flex; flex-direction: column; justify-content: space-between; height: 100%; min-height: 125px; box-shadow: 0 10px 25px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.1);"`
);

content = content.replace(
  `width: 44px; height: 44px; border-radius: 12px;`,
  `width: 50px; height: 50px; border-radius: 14px;`
);
content = content.replace(
  `font-size: 1.25rem;`,
  `font-size: 1.4rem; box-shadow: 0 4px 12px rgba(\${f.rgb}, 0.2);`
);

content = content.replace(
  `margin: 0 0 4px 0; font-size: 1rem;`,
  `margin: 0 0 6px 0; font-size: 1.15rem; letter-spacing: 0.3px;`
);

content = content.replace(
  `font-size: 0.8rem; color: rgba(255,255,255,0.6); margin: 0; font-weight: 600;`,
  `font-size: 0.85rem; color: rgba(255,255,255,0.7); margin: 0; font-weight: 600;`
);

// 2. Fix FILTER_CARDS to include "Visão Geral"
if (!content.includes("{ id: 'all', label: 'Visão Geral'")) {
  content = content.replace(
    /const FILTER_CARDS = \[/,
    `const FILTER_CARDS = [\n    { id: 'all', label: 'Visão Geral', icon: 'fa-layer-group', color: '#818cf8', rgb: '129,140,248' },`
  );
}

// Ensure columns is 6
content = content.replace(
  /grid-template-columns: repeat\(5, 1fr\)/,
  `grid-template-columns: repeat(6, 1fr)`
);

// Ensure old "Todos os Setores" button is removed
const kfAllRegex = /<button onclick="resetKanbanAllFilters\(\)" id="kf-all"[\s\S]*?<\/button>/;
content = content.replace(kfAllRegex, '');

// Ensure setKanbanFilter handles all 6 cards properly
if (content.includes(`const kfAll = document.getElementById('kf-all');`)) {
  const setKanbanFilterRegex = /window\.setKanbanFilter = function\(filterId\) \{[\s\S]*?\/\/ Style the 5 sector cards/;
  const newSetKanbanFilter = `window.setKanbanFilter = function(filterId) {\n  currentFilter = filterId;\n  \n  // Style all 6 sector cards`;
  content = content.replace(setKanbanFilterRegex, newSetKanbanFilter);
}

// Fix background transition in setKanbanFilter for the inactive cards (glassmorphism)
content = content.replace(
  `card.style.background = 'var(--bg-secondary)';`,
  `card.style.background = 'rgba(30, 41, 59, 0.4)';\n      card.style.backdropFilter = 'blur(12px)';\n      card.style.borderWidth = '1.5px';`
);
content = content.replace(
  `card.style.background = 'rgba(30,41,59,0.5)';`,
  `card.style.background = 'rgba(30, 41, 59, 0.4)';\n      card.style.backdropFilter = 'blur(12px)';\n      card.style.borderWidth = '1.5px';`
);

// Active card glassmorphism
content = content.replace(
  `card.style.background = \`rgba(\${rgb}, 0.12)\`;`,
  `card.style.background = \`rgba(\${rgb}, 0.15)\`;\n      card.style.backdropFilter = 'blur(16px)';`
);
content = content.replace(
  /card\.style\.boxShadow = `0 6px 20px rgba\(\$\{rgb\}, 0\.25\)`\;/g,
  `card.style.boxShadow = \`0 12px 30px rgba(\${rgb}, 0.35), inset 0 1px 0 rgba(255,255,255,0.2)\`;`
);


// 3. Make Modals look like dedicated windows
// Sector Breakdown Modal
content = content.replace(
  `<div id="kanban-sector-modal" style="display:flex; justify-content:center; align-items:center; position:fixed; top:0; left:0; width:100vw; height:100vh; background:rgba(0,0,0,0.8); z-index:99999; backdrop-filter:blur(6px);">`,
  `<div id="kanban-sector-modal" style="display:flex; justify-content:center; align-items:center; position:fixed; top:0; left:0; width:100vw; height:100vh; background:rgba(0,0,0,0.6); z-index:99999; backdrop-filter:blur(12px);">`
);
content = content.replace(
  `width:90%; max-width:650px; max-height:85vh; border-radius:16px; display:flex; flex-direction:column; box-shadow:0 20px 40px rgba(0,0,0,0.5); overflow:hidden;"`,
  `width:90%; max-width:650px; max-height:85vh; border-radius:24px; display:flex; flex-direction:column; box-shadow:0 30px 60px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.1); overflow:hidden; background:rgba(15, 23, 42, 0.85); backdrop-filter:blur(24px); border:1px solid rgba(255,255,255,0.1);"`
);
// Sector Breakdown Header
content = content.replace(
  `padding:16px 20px; border-bottom:1px solid var(--border-color); display:flex; justify-content:space-between; align-items:center; background:var(--bg-card);`,
  `padding:20px 24px; border-bottom:1px solid rgba(255,255,255,0.08); display:flex; justify-content:space-between; align-items:center; background:rgba(30, 41, 59, 0.5);`
);
// Sector Breakdown Content Backgrounds
content = content.replace(
  /background:var\(--bg-card\); border:1px solid var\(--border-color\);/g,
  `background:rgba(30, 41, 59, 0.5); border:1px solid rgba(255,255,255,0.08);`
);
content = content.replace(
  /background:var\(--bg-secondary\); border:1px solid var\(--border-color\);/g,
  `background:rgba(15, 23, 42, 0.5); border:1px solid rgba(255,255,255,0.05);`
);
// Sector Breakdown Footer
content = content.replace(
  `padding:14px 20px; border-top:1px solid var(--border-color); background:var(--bg-card); display:flex; justify-content:flex-end;`,
  `padding:16px 24px; border-top:1px solid rgba(255,255,255,0.08); background:rgba(30, 41, 59, 0.5); display:flex; justify-content:flex-end;`
);

// SLA Audit Modal
content = content.replace(
  `<div id="kanban-sla-modal" style="display:flex; justify-content:center; align-items:center; position:fixed; top:0; left:0; width:100vw; height:100vh; background:rgba(0,0,0,0.8); z-index:99999; backdrop-filter:blur(6px);">`,
  `<div id="kanban-sla-modal" style="display:flex; justify-content:center; align-items:center; position:fixed; top:0; left:0; width:100vw; height:100vh; background:rgba(0,0,0,0.6); z-index:99999; backdrop-filter:blur(12px);">`
);
content = content.replace(
  `width:90%; max-width:680px; max-height:85vh; border-radius:16px; display:flex; flex-direction:column; box-shadow:0 20px 40px rgba(0,0,0,0.5); overflow:hidden;"`,
  `width:90%; max-width:680px; max-height:85vh; border-radius:24px; display:flex; flex-direction:column; box-shadow:0 30px 60px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.1); overflow:hidden; background:rgba(15, 23, 42, 0.85); backdrop-filter:blur(24px); border:1px solid rgba(255,255,255,0.1);"`
);
// SLA Header
content = content.replace(
  `padding:16px 20px; border-bottom:1px solid var(--border-color); display:flex; justify-content:space-between; align-items:center; background:var(--bg-card);`,
  `padding:20px 24px; border-bottom:1px solid rgba(255,255,255,0.08); display:flex; justify-content:space-between; align-items:center; background:rgba(30, 41, 59, 0.5);`
);
// SLA Footer
content = content.replace(
  `padding:14px 20px; border-top:1px solid var(--border-color); background:var(--bg-card); display:flex; justify-content:space-between; align-items:center;`,
  `padding:16px 24px; border-top:1px solid rgba(255,255,255,0.08); background:rgba(30, 41, 59, 0.5); display:flex; justify-content:space-between; align-items:center;`
);
// SLA Sub-blocks
content = content.replace(
  /background:var\(--bg-card\); border:1px solid var\(--border-color\);/g,
  `background:rgba(30, 41, 59, 0.5); border:1px solid rgba(255,255,255,0.08);`
);
content = content.replace(
  /background:var\(--bg-secondary\); border-radius:8px;/g,
  `background:rgba(15, 23, 42, 0.5); border-radius:8px; border:1px solid rgba(255,255,255,0.05);`
);

fs.writeFileSync(path, content, 'utf8');
console.log('Final UI enhancement script applied successfully.');
