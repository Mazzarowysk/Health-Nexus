const fs = require('fs');

// =========================================================
// pharmacy.js — Add clear button next to pharm-search-input
// =========================================================
{
  let code = fs.readFileSync('src/tabs/pharmacy.js', 'utf8');

  const target = `<input type="text" id="pharm-search-input" class="form-input" placeholder="Buscar medicamento ou lote..." style="max-width: 280px;">`;
  const replacement = `<div style="display: flex; gap: 8px; align-items: center;">
            <input type="text" id="pharm-search-input" class="form-input" placeholder="Buscar medicamento ou lote..." style="max-width: 240px;">
            <button type="button" id="btn-clear-pharm-filter" style="background: var(--bg-tertiary, var(--bg-secondary)); border: 1px solid var(--border-color); color: var(--text-primary); padding: 0 14px; border-radius: 8px; cursor: pointer; display: flex; align-items: center; justify-content: center; height: 40px; gap: 6px; font-size: 0.82rem; font-weight: 600; transition: all 0.2s ease; white-space: nowrap;" title="Limpar Filtro" onmouseover="this.style.background='rgba(99,102,241,0.15)'" onmouseout="this.style.background='var(--bg-tertiary, var(--bg-secondary))'">
              <i class="fa-solid fa-filter-circle-xmark"></i> Limpar
            </button>
          </div>`;

  if (code.includes(target)) {
    code = code.replace(target, replacement);
    console.log('✅ pharmacy.js: pharm-search-input clear button added');
  } else {
    console.log('⚠️ pharmacy.js: target NOT found');
  }

  // Also add JS event listener after the existing pharm-search-input listener
  const jsTarget = `document.getElementById('pharm-search-input')?.addEventListener('input', () => renderPharmacyTable());`;
  const jsReplacement = `document.getElementById('pharm-search-input')?.addEventListener('input', () => renderPharmacyTable());
  document.getElementById('btn-clear-pharm-filter')?.addEventListener('click', () => {
    const inp = document.getElementById('pharm-search-input');
    if(inp) { inp.value = ''; inp.dispatchEvent(new Event('input')); }
    // Reset KPI filter
    window.activePharmFilter = null;
    document.querySelectorAll('.kpi-card[id^="kpi-card-pharm"]').forEach(c => {
      c.style.borderColor = '';
      c.style.boxShadow = '';
    });
    renderPharmacyTable();
  });`;

  if (code.includes(jsTarget)) {
    code = code.replace(jsTarget, jsReplacement);
    console.log('✅ pharmacy.js: event listener added');
  } else {
    console.log('⚠️ pharmacy.js: JS target NOT found, will add inline');
  }

  fs.writeFileSync('src/tabs/pharmacy.js', code, 'utf8');
}

// =========================================================
// leitos.js — Add clear button to sector filter bar
// =========================================================
{
  let code = fs.readFileSync('src/tabs/leitos.js', 'utf8');

  const target = `<button class="btn btn-sm btn-outline bed-sector-filter" data-sector="Maternidade">Maternidade</button>
        </div>
      </div>`;
  const replacement = `<button class="btn btn-sm btn-outline bed-sector-filter" data-sector="Maternidade">Maternidade</button>
          <button type="button" id="btn-clear-leitos-filter" style="background: transparent; border: 1px solid var(--border-color); color: var(--text-muted); padding: 4px 14px; border-radius: 8px; cursor: pointer; display: flex; align-items: center; gap: 6px; font-size: 0.82rem; font-weight: 600; transition: all 0.2s ease; margin-left: auto;" title="Limpar Filtros" onmouseover="this.style.color='var(--text-primary)'; this.style.borderColor='var(--color-primary)'" onmouseout="this.style.color='var(--text-muted)'; this.style.borderColor='var(--border-color)'">
            <i class="fa-solid fa-filter-circle-xmark"></i> Limpar
          </button>
        </div>
      </div>`;

  if (code.includes(target)) {
    code = code.replace(target, replacement);
    console.log('✅ leitos.js: sector filter clear button added');
  } else {
    console.log('⚠️ leitos.js: target NOT found');
  }

  // Add JS listener for the clear button — find where bed-sector-filter listeners are set
  const jsTarget = `document.querySelectorAll('.bed-sector-filter').forEach(btn => {`;
  const jsReplacement = `document.getElementById('btn-clear-leitos-filter')?.addEventListener('click', () => {
    // Reset status filter
    document.querySelectorAll('.kpi-leitos-filter').forEach(c => c.classList.remove('active'));
    const allCard = document.querySelector('.kpi-leitos-filter[data-status="Todos"]');
    if (allCard) allCard.classList.add('active');
    window.currentLeitosStatusFilter = 'Todos';
    // Reset sector filter
    document.querySelectorAll('.bed-sector-filter').forEach(b => b.classList.remove('active', 'btn-primary'));
    const allBtn = document.querySelector('.bed-sector-filter[data-sector="Todos"]');
    if(allBtn) { allBtn.classList.add('active', 'btn-primary'); }
    window.currentLeitorSectorFilter = 'Todos';
    if (window.renderBedsGrid) window.renderBedsGrid();
  });
  document.querySelectorAll('.bed-sector-filter').forEach(btn => {`;

  if (code.includes(jsTarget)) {
    code = code.replace(jsTarget, jsReplacement);
    console.log('✅ leitos.js: event listener added');
  } else {
    console.log('⚠️ leitos.js: JS target NOT found');
  }

  fs.writeFileSync('src/tabs/leitos.js', code, 'utf8');
}

// =========================================================
// stagnation.js — Add search input + clear button to table header
// =========================================================
{
  let code = fs.readFileSync('src/tabs/stagnation.js', 'utf8');

  // Add search input + clear button before the stagnation-list-wrapper
  const target = `<div class="table-container" style="background: var(--bg-secondary); border: 1px solid var(--border-color); border-radius: 16px; padding: 20px;">
        <div id="stagnation-list-wrapper">`;
  const replacement = `<div class="table-container" style="background: var(--bg-secondary); border: 1px solid var(--border-color); border-radius: 16px; padding: 20px;">
        <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 16px; flex-wrap: wrap;">
          <div style="position: relative; flex: 1; min-width: 200px; max-width: 340px;">
            <i class="fa-solid fa-magnifying-glass" style="position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: var(--text-muted); font-size: 0.85rem;"></i>
            <input type="text" id="stag-search-input" class="form-input" placeholder="Buscar paciente ou alerta..." style="width: 100%; padding-left: 36px; height: 40px;">
          </div>
          <button type="button" id="btn-clear-stag-filter" style="background: var(--bg-tertiary, var(--bg-secondary)); border: 1px solid var(--border-color); color: var(--text-primary); padding: 0 16px; border-radius: 8px; cursor: pointer; display: flex; align-items: center; gap: 6px; font-size: 0.82rem; font-weight: 600; height: 40px; transition: all 0.2s ease; white-space: nowrap;" title="Limpar Filtros" onmouseover="this.style.background='rgba(99,102,241,0.15)'" onmouseout="this.style.background='var(--bg-tertiary, var(--bg-secondary))'">
            <i class="fa-solid fa-filter-circle-xmark"></i> Limpar Filtros
          </button>
          <span id="stag-result-count" style="font-size: 0.8rem; color: var(--text-muted); margin-left: auto;"></span>
        </div>
        <div id="stagnation-list-wrapper">`;

  if (code.includes(target)) {
    code = code.replace(target, replacement);
    console.log('✅ stagnation.js: search input + clear button added');
  } else {
    console.log('⚠️ stagnation.js: target NOT found');
  }

  // Add JS logic after "window.renderStagnationTable();" at end of loadAndRenderStagnationData
  const jsTarget = `window.renderStagnationTable();

  } catch (e) {
    console.error('Erro ao carregar dados de estagnação:', e);`;

  const jsReplacement = `window.renderStagnationTable();

  // Search input live filter
  const stagSearch = document.getElementById('stag-search-input');
  const clearStagBtn = document.getElementById('btn-clear-stag-filter');

  if (stagSearch) {
    stagSearch.addEventListener('input', () => {
      const term = stagSearch.value.toLowerCase().trim();
      const wrap = document.getElementById('stagnation-list-wrapper');
      if (!wrap) return;
      const rows = wrap.querySelectorAll('.stag-alert-row, tr[data-patient-name]');
      let visible = 0;
      rows.forEach(row => {
        const text = row.textContent.toLowerCase();
        const show = !term || text.includes(term);
        row.style.display = show ? '' : 'none';
        if (show) visible++;
      });
      const countEl = document.getElementById('stag-result-count');
      if (countEl) countEl.textContent = term ? visible + ' resultado(s) encontrado(s)' : '';
    });
  }

  if (clearStagBtn) {
    clearStagBtn.addEventListener('click', () => {
      // Reset text filter
      const inp = document.getElementById('stag-search-input');
      if (inp) { inp.value = ''; inp.dispatchEvent(new Event('input')); }
      // Reset KPI filter
      window.currentStagnationFilter = 'ALL';
      document.querySelectorAll('.kpi-card').forEach(c => {
        c.style.transform = 'scale(1)';
        c.style.boxShadow = 'none';
      });
      window.renderStagnationTable();
      const countEl = document.getElementById('stag-result-count');
      if (countEl) countEl.textContent = '';
    });
  }

  } catch (e) {
    console.error('Erro ao carregar dados de estagnação:', e);`;

  if (code.includes(jsTarget)) {
    code = code.replace(jsTarget, jsReplacement);
    console.log('✅ stagnation.js: event listeners added');
  } else {
    console.log('⚠️ stagnation.js: JS target NOT found');
  }

  fs.writeFileSync('src/tabs/stagnation.js', code, 'utf8');
}

// =========================================================
// doctors.js — Verify already has filter (should have it)
// =========================================================
{
  const code = fs.readFileSync('src/tabs/doctors.js', 'utf8');
  console.log('ℹ️ doctors.js has Limpar:', code.includes('filter-circle-xmark'));
}

// =========================================================
// agenda.js — Verify already has filter (should have it)
// =========================================================
{
  const code = fs.readFileSync('src/tabs/agenda.js', 'utf8');
  console.log('ℹ️ agenda.js has Limpar:', code.includes('filter-circle-xmark'));
}

console.log('\n🎉 All updates complete!');
