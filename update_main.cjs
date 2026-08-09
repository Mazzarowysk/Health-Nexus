const fs = require('fs');

let mainJs = fs.readFileSync('src/main.js', 'utf8');

// Replace the HTML
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

// Add the event listener
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

fs.writeFileSync('src/main.js', mainJs, 'utf8');
console.log('main.js updated.');
