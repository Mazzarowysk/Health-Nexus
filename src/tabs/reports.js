import { apiFetch, showToast, abbreviateName, switchTab, setupCustomSelect, anonymizeCPF, exportToPDF, formatSyncDate } from '../main.js';
import { state, dataCache, dataCacheTimestamps } from '../state.js';

// API_URL is not exported from main.js, define it locally
const API_URL = '/api';

function renderReportsTab(contentArea) {
  contentArea.innerHTML = `
    <div class="tab-section active" style="padding: 28px 36px; width: 100%; max-width: 100%; box-sizing: border-box;">
      <div class="section-header" style="margin-bottom: 24px;">
        <h2><i class="fa-solid fa-file-contract"></i> Relatórios e Exportação</h2>
        <p>Gere e exporte relatórios filtrados por período, status, departamento ou classificação.</p>
      </div>

      <!-- Seletor em formato de Cards Interativos Lado a Lado (4 colunas) -->
      <div class="report-tabs-selector" style="display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 16px; width: 100%; box-sizing: border-box; margin-bottom: 24px;">
        
        <!-- CARD 1: PACIENTES -->
        <div id="tab-btn-patients" class="report-tab-card active" style="background: rgba(99,102,241,0.08); border: 1.5px solid rgba(99,102,241,0.5); border-radius: 14px; padding: 18px 20px; cursor: pointer; transition: all 0.2s ease; position: relative; box-shadow: 0 4px 20px rgba(99,102,241,0.15); display: flex; flex-direction: column; justify-content: space-between; height: 100%;" onmouseenter="if(!this.classList.contains('active')) { this.style.transform='translateY(-2px)'; this.style.borderColor='rgba(99,102,241,0.4)'; }" onmouseleave="if(!this.classList.contains('active')) { this.style.transform='none'; this.style.borderColor='var(--border-color)'; }">
          <div style="display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 14px;">
            <div style="width: 44px; height: 44px; border-radius: 12px; background: rgba(99,102,241,0.15); border: 1px solid rgba(99,102,241,0.3); display: flex; align-items: center; justify-content: center; color: #818cf8; font-size: 1.25rem;">
              <i class="fa-solid fa-users"></i>
            </div>
            <span class="card-status-badge" style="font-size: 0.68rem; font-weight: 700; padding: 3px 9px; border-radius: 20px; background: rgba(99,102,241,0.2); color: #c4b5fd; border: 1px solid rgba(99,102,241,0.4); letter-spacing: 0.5px;">SELECIONADO</span>
          </div>
          <div>
            <h4 style="font-size: 1.02rem; font-weight: 700; color: var(--text-primary); margin: 0 0 4px 0;">Pacientes</h4>
            <p style="font-size: 0.78rem; color: var(--text-muted); margin: 0; line-height: 1.35;">Cadastro completo, demografia e faturamento acumulado.</p>
          </div>
        </div>

        <!-- CARD 2: ATENDIMENTOS -->
        <div id="tab-btn-encounters" class="report-tab-card" style="background: var(--bg-secondary); border: 1px solid var(--border-color); border-radius: 14px; padding: 18px 20px; cursor: pointer; transition: all 0.2s ease; position: relative; display: flex; flex-direction: column; justify-content: space-between; height: 100%;" onmouseenter="if(!this.classList.contains('active')) { this.style.transform='translateY(-2px)'; this.style.borderColor='rgba(236,72,153,0.4)'; }" onmouseleave="if(!this.classList.contains('active')) { this.style.transform='none'; this.style.borderColor='var(--border-color)'; }">
          <div style="display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 14px;">
            <div style="width: 44px; height: 44px; border-radius: 12px; background: rgba(236,72,153,0.15); border: 1px solid rgba(236,72,153,0.3); display: flex; align-items: center; justify-content: center; color: #f472b6; font-size: 1.25rem;">
              <i class="fa-solid fa-notes-medical"></i>
            </div>
            <span class="card-status-badge" style="display: none; font-size: 0.68rem; font-weight: 700; padding: 3px 9px; border-radius: 20px; background: rgba(236,72,153,0.2); color: #f472b6; border: 1px solid rgba(236,72,153,0.4); letter-spacing: 0.5px;">SELECIONADO</span>
          </div>
          <div>
            <h4 style="font-size: 1.02rem; font-weight: 700; color: var(--text-primary); margin: 0 0 4px 0;">Atendimentos & PEP</h4>
            <p style="font-size: 0.78rem; color: var(--text-muted); margin: 0; line-height: 1.35;">Triagem Manchester, situação clínica e médico responsável.</p>
          </div>
        </div>

        <!-- CARD 3: FINANCEIRO -->
        <div id="tab-btn-financial" class="report-tab-card" style="background: var(--bg-secondary); border: 1px solid var(--border-color); border-radius: 14px; padding: 18px 20px; cursor: pointer; transition: all 0.2s ease; position: relative; display: flex; flex-direction: column; justify-content: space-between; height: 100%;" onmouseenter="if(!this.classList.contains('active')) { this.style.transform='translateY(-2px)'; this.style.borderColor='rgba(34,211,238,0.4)'; }" onmouseleave="if(!this.classList.contains('active')) { this.style.transform='none'; this.style.borderColor='var(--border-color)'; }">
          <div style="display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 14px;">
            <div style="width: 44px; height: 44px; border-radius: 12px; background: rgba(34,211,238,0.15); border: 1px solid rgba(34,211,238,0.3); display: flex; align-items: center; justify-content: center; color: #38bdf8; font-size: 1.25rem;">
              <i class="fa-solid fa-chart-pie"></i>
            </div>
            <span class="card-status-badge" style="display: none; font-size: 0.68rem; font-weight: 700; padding: 3px 9px; border-radius: 20px; background: rgba(34,211,238,0.2); color: #38bdf8; border: 1px solid rgba(34,211,238,0.4); letter-spacing: 0.5px;">SELECIONADO</span>
          </div>
          <div>
            <h4 style="font-size: 1.02rem; font-weight: 700; color: var(--text-primary); margin: 0 0 4px 0;">Financeiro</h4>
            <p style="font-size: 0.78rem; color: var(--text-muted); margin: 0; line-height: 1.35;">Títulos a vencer, parcelas pagas e balanço de faturamento.</p>
          </div>
        </div>

        <!-- CARD 4: POR MÉDICO -->
        <div id="tab-btn-doctors" class="report-tab-card" style="background: var(--bg-secondary); border: 1px solid var(--border-color); border-radius: 14px; padding: 18px 20px; cursor: pointer; transition: all 0.2s ease; position: relative; display: flex; flex-direction: column; justify-content: space-between; height: 100%;" onmouseenter="if(!this.classList.contains('active')) { this.style.transform='translateY(-2px)'; this.style.borderColor='rgba(52,211,153,0.4)'; }" onmouseleave="if(!this.classList.contains('active')) { this.style.transform='none'; this.style.borderColor='var(--border-color)'; }">
          <div style="display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 14px;">
            <div style="width: 44px; height: 44px; border-radius: 12px; background: rgba(52,211,153,0.15); border: 1px solid rgba(52,211,153,0.3); display: flex; align-items: center; justify-content: center; color: #34d399; font-size: 1.25rem;">
              <i class="fa-solid fa-user-doctor"></i>
            </div>
            <span class="card-status-badge" style="display: none; font-size: 0.68rem; font-weight: 700; padding: 3px 9px; border-radius: 20px; background: rgba(52,211,153,0.2); color: #34d399; border: 1px solid rgba(52,211,153,0.4); letter-spacing: 0.5px;">SELECIONADO</span>
          </div>
          <div>
            <h4 style="font-size: 1.02rem; font-weight: 700; color: var(--text-primary); margin: 0 0 4px 0;">Por Médico</h4>
            <p style="font-size: 0.78rem; color: var(--text-muted); margin: 0; line-height: 1.35;">Produtividade do corpo clínico e gráficos analíticos.</p>
          </div>
        </div>

      </div>

      <!-- Card de Filtros Dinâmicos -->
      <div class="filter-panel-card glass-card">
        <h3 style="margin-bottom: 16px; font-family: 'Outfit'; font-size: 1.1rem; color: var(--text-primary);">
          <i class="fa-solid fa-filter"></i> Filtros de Pesquisa
        </h3>
        <div id="filters-container">
          <!-- Os filtros serão inseridos aqui dinamicamente -->
        </div>
      </div>

      <!-- Card de Pré-visualização e Exportação -->
      <div class="preview-card glass-card">
        <div class="preview-header">
          <h3><i class="fa-solid fa-list-check"></i> Registros Correspondentes</h3>
          <span id="preview-status" class="preview-status">Carregando dados...</span>
        </div>

        <div class="preview-table-wrapper">
          <table class="preview-table">
            <thead id="preview-table-head">
              <!-- Cabeçalhos dinâmicos -->
            </thead>
            <tbody id="preview-table-body">
              <!-- Registros da pré-visualização -->
            </tbody>
          </table>
        </div>

        <!-- Botões de Exportação -->
        <div class="report-actions" style="margin-top: 20px;">
          <button id="btn-export-pdf" class="btn btn-primary" style="background: var(--danger-color)">
            <i class="fa-solid fa-file-pdf"></i> Exportar PDF
          </button>
          <button id="btn-export-xls" class="btn btn-primary" style="background: var(--success-color)">
            <i class="fa-solid fa-file-excel"></i> Exportar Excel (XLSX)
          </button>
          <button id="btn-export-csv" class="btn btn-outline">
            <i class="fa-solid fa-file-csv"></i> Exportar CSV
          </button>
        </div>
      </div>
    </div>
  `;

  // Inicialização de variáveis locais
  let activeTab = 'patients';
  let patientsList = [];
  let encountersList = [];
  let currentFilteredList = [];

  // Elementos da interface
  const btnPatientsTab = document.getElementById('tab-btn-patients');
  const btnEncountersTab = document.getElementById('tab-btn-encounters');
  const btnFinancialTab = document.getElementById('tab-btn-financial');
  const btnDoctorsTab = document.getElementById('tab-btn-doctors');
  const filtersContainer = document.getElementById('filters-container');
  const previewStatus = document.getElementById('preview-status');
  const tableHead = document.getElementById('preview-table-head');
  const tableBody = document.getElementById('preview-table-body');
  const btnPdf = document.getElementById('btn-export-pdf');
  const btnXls = document.getElementById('btn-export-xls');
  const btnCsv = document.getElementById('btn-export-csv');

  let finPieChartInstance = null;
  let finBarChartInstance = null;

  // Função para atualizar o destaque visual dos cards
  const updateReportCardSelection = (selectedTab) => {
    const cards = [
      { id: 'tab-btn-patients', tab: 'patients', border: 'rgba(99,102,241,0.5)', bg: 'rgba(99,102,241,0.08)', shadow: 'rgba(99,102,241,0.15)' },
      { id: 'tab-btn-encounters', tab: 'encounters', border: 'rgba(236,72,153,0.5)', bg: 'rgba(236,72,153,0.08)', shadow: 'rgba(236,72,153,0.15)' },
      { id: 'tab-btn-financial', tab: 'financial', border: 'rgba(34,211,238,0.5)', bg: 'rgba(34,211,238,0.08)', shadow: 'rgba(34,211,238,0.15)' },
      { id: 'tab-btn-doctors', tab: 'doctors', border: 'rgba(52,211,153,0.5)', bg: 'rgba(52,211,153,0.08)', shadow: 'rgba(52,211,153,0.15)' }
    ];

    cards.forEach(item => {
      const el = document.getElementById(item.id);
      if (!el) return;
      const badge = el.querySelector('.card-status-badge');
      if (item.tab === selectedTab) {
        el.classList.add('active');
        el.style.background = item.bg;
        el.style.borderColor = item.border;
        el.style.borderWidth = '1.5px';
        el.style.boxShadow = `0 6px 20px ${item.shadow}`;
        if (badge) badge.style.display = 'inline-block';
      } else {
        el.classList.remove('active');
        el.style.background = 'var(--bg-secondary)';
        el.style.borderColor = 'var(--border-color)';
        el.style.borderWidth = '1px';
        el.style.boxShadow = 'none';
        if (badge) badge.style.display = 'none';
      }
    });
  };

  // Alternar abas com Cards
  btnPatientsTab?.addEventListener('click', () => {
    activeTab = 'patients';
    updateReportCardSelection('patients');
    renderFilters();
  });

  btnEncountersTab?.addEventListener('click', () => {
    activeTab = 'encounters';
    updateReportCardSelection('encounters');
    renderFilters();
  });

  btnFinancialTab?.addEventListener('click', () => {
    activeTab = 'financial';
    updateReportCardSelection('financial');
    renderFilters();
  });

  btnDoctorsTab?.addEventListener('click', () => {
    activeTab = 'doctors';
    updateReportCardSelection('doctors');
    renderDoctorReport();
  });

  window.toggleFilterDropdown = function(id, event) {
    if (event) event.stopPropagation();
    const target = document.getElementById(id);
    if (!target) return;
    const isVisible = target.classList.contains('visible');
    document.querySelectorAll('.dropdown-check-list').forEach(d => d.classList.remove('visible'));
    if (!isVisible) {
      target.classList.add('visible');
    }
  };

  window.updateDropdownAnchorText = function(dropdownId, countChecked, totalCount, defaultLabel) {
    const dropdown = document.getElementById(dropdownId);
    if (!dropdown) return;
    const anchor = dropdown.querySelector('.anchor');
    if (!anchor) return;
    if (countChecked === totalCount) {
      anchor.textContent = `${defaultLabel}: Todos`;
    } else if (countChecked === 0) {
      anchor.textContent = `${defaultLabel}: Nenhum`;
    } else {
      anchor.textContent = `${defaultLabel}: ${countChecked} de ${totalCount}`;
    }
  };

  // Fechar dropdowns de filtro ao clicar fora
  document.addEventListener('click', (e) => {
    const dropdowns = document.querySelectorAll('.dropdown-check-list');
    dropdowns.forEach(dropdown => {
      if (!dropdown.contains(e.target)) {
        dropdown.classList.remove('visible');
      }
    });
  });

  const getUniqueCitiesCheckboxes = () => {
    const cities = [...new Set(patientsList.map(p => p.city).filter(Boolean))].sort();
    return `
      <li>
        <input type="checkbox" id="filter-city-all" checked>
        <label for="filter-city-all"><strong>Selecionar Todas</strong></label>
      </li>
      ${cities.map((c, i) => `
        <li>
          <input type="checkbox" class="filter-city-item" value="${c}" id="filter-city-${i}" checked>
          <label for="filter-city-${i}">${c}</label>
        </li>
      `).join('')}
    `;
  };

  const setupFilterGroupSelectAll = (allId, itemClass, dropdownId, defaultLabel) => {
    const allCb = document.getElementById(allId);
    if (!allCb) return;

    const updateText = () => {
      const itemCbs = document.querySelectorAll(`.${itemClass}`);
      const checkedCount = Array.from(itemCbs).filter(cb => cb.checked).length;
      updateDropdownAnchorText(dropdownId, checkedCount, itemCbs.length, defaultLabel);
    };

    // Configurar listener para o checkbox de marcar/desmarcar todos
    allCb.addEventListener('change', (e) => {
      const checked = e.target.checked;
      const itemCbs = document.querySelectorAll(`.${itemClass}`);
      itemCbs.forEach(cb => {
        cb.checked = checked;
      });
      updateText();
      filterAndRender();
    });

    // Configurar listener para cada item individual
    const itemCbs = document.querySelectorAll(`.${itemClass}`);
    itemCbs.forEach(cb => {
      cb.addEventListener('change', () => {
        const currentItemCbs = document.querySelectorAll(`.${itemClass}`);
        if (!cb.checked) {
          allCb.checked = false;
        } else if (Array.from(currentItemCbs).every(c => c.checked)) {
          allCb.checked = true;
        }
        updateText();
        filterAndRender();
      });
    });

    // Inicializar o texto
    updateText();
  };

  const renderFilters = () => {
    if (activeTab === 'patients') {
      filtersContainer.innerHTML = `
        <div class="filters-grid">
          <div class="filter-group">
            <label>Data de Cadastro Inicial</label>
            <input type="date" id="filter-date-start">
          </div>
          <div class="filter-group">
            <label>Data de Cadastro Final</label>
            <input type="date" id="filter-date-end">
          </div>
          <div class="filter-group">
            <label>Cidades</label>
            <div class="dropdown-check-list" id="dropdown-city">
              <div class="anchor" onclick="toggleFilterDropdown('dropdown-city', event)">Cidades: Todas</div>
              <ul class="items">
                ${getUniqueCitiesCheckboxes()}
              </ul>
            </div>
          </div>
          <div class="filter-group">
            <label>Faturamento Mínimo (R$)</label>
            <input type="number" id="filter-billing-min" placeholder="Ex: 500" min="0">
          </div>
        </div>
      `;
    } else if (activeTab === 'encounters') {
      filtersContainer.innerHTML = `
        <div class="filters-grid">
          <div class="filter-group">
            <label>Período Inicial (Admissão)</label>
            <input type="date" id="filter-date-start">
          </div>
          <div class="filter-group">
            <label>Período Final (Admissão)</label>
            <input type="date" id="filter-date-end">
          </div>
          <div class="filter-group">
            <label>Situação / Status</label>
            <div class="dropdown-check-list" id="dropdown-status">
              <div class="anchor" onclick="toggleFilterDropdown('dropdown-status', event)">Status: Todos</div>
              <ul class="items">
                <li>
                  <input type="checkbox" id="filter-status-all" checked>
                  <label for="filter-status-all"><strong>Selecionar Todos</strong></label>
                </li>
                <li>
                  <input type="checkbox" class="filter-status-item" value="Aguardando_Triagem" id="filter-status-1" checked>
                  <label for="filter-status-1">Aguardando Triagem</label>
                </li>
                <li>
                  <input type="checkbox" class="filter-status-item" value="Aguardando_Atendimento" id="filter-status-2" checked>
                  <label for="filter-status-2">Aguardando Consulta</label>
                </li>
                <li>
                  <input type="checkbox" class="filter-status-item" value="Em_Atendimento" id="filter-status-3" checked>
                  <label for="filter-status-3">Em Consulta</label>
                </li>
                <li>
                  <input type="checkbox" class="filter-status-item" value="Finalizado" id="filter-status-4" checked>
                  <label for="filter-status-4">Finalizado</label>
                </li>
              </ul>
            </div>
          </div>
          <div class="filter-group">
            <label>Classificação de Risco</label>
            <div class="dropdown-check-list" id="dropdown-manchester">
              <div class="anchor" onclick="toggleFilterDropdown('dropdown-manchester', event)">Classificação: Todas</div>
              <ul class="items">
                <li>
                  <input type="checkbox" id="filter-manchester-all" checked>
                  <label for="filter-manchester-all"><strong>Selecionar Todas</strong></label>
                </li>
                <li>
                  <input type="checkbox" class="filter-manchester-item" value="Vermelho" id="filter-risk-1" checked>
                  <label for="filter-risk-1">Vermelho (Emergência)</label>
                </li>
                <li>
                  <input type="checkbox" class="filter-manchester-item" value="Laranja" id="filter-risk-2" checked>
                  <label for="filter-risk-2">Laranja (Muito Urgente)</label>
                </li>
                <li>
                  <input type="checkbox" class="filter-manchester-item" value="Amarelo" id="filter-risk-3" checked>
                  <label for="filter-risk-3">Amarelo (Urgente)</label>
                </li>
                <li>
                  <input type="checkbox" class="filter-manchester-item" value="Verde" id="filter-risk-4" checked>
                  <label for="filter-risk-4">Verde (Pouco Urgente)</label>
                </li>
                <li>
                  <input type="checkbox" class="filter-manchester-item" value="Azul" id="filter-risk-5" checked>
                  <label for="filter-risk-5">Azul (Não Urgente)</label>
                </li>
                <li>
                  <input type="checkbox" class="filter-manchester-item" value="null" id="filter-risk-6" checked>
                  <label for="filter-risk-6">Sem Classificação</label>
                </li>
              </ul>
            </div>
          </div>
          <div class="filter-group">
            <label>Tipo de Atendimento</label>
            <div class="dropdown-check-list" id="dropdown-type">
              <div class="anchor" onclick="toggleFilterDropdown('dropdown-type', event)">Tipos: Todos</div>
              <ul class="items">
                <li>
                  <input type="checkbox" id="filter-type-all" checked>
                  <label for="filter-type-all"><strong>Selecionar Todos</strong></label>
                </li>
                <li>
                  <input type="checkbox" class="filter-type-item" value="Urgencia" id="filter-type-1" checked>
                  <label for="filter-type-1">Urgência</label>
                </li>
                <li>
                  <input type="checkbox" class="filter-type-item" value="Ambulatorio" id="filter-type-2" checked>
                  <label for="filter-type-2">Ambulatório</label>
                </li>
              </ul>
            </div>
          </div>
          <div class="filter-group" style="min-width: 180px;">
            <label>Médico Responsável</label>
            <select id="filter-doctor-name" style="width:100%;padding:8px 12px;border-radius:8px;border:1px solid var(--border-color);background:var(--bg-tertiary);color:var(--text-primary);font-size:0.85rem;cursor:pointer;">
              <option value="">— Todos os Médicos —</option>
              ${[...new Set(encountersList.map(e => e.doctorName).filter(Boolean))].sort().map(d => `<option value="${d}">${d}</option>`).join('')}
            </select>
          </div>
        </div>
      `;
    } else if (activeTab === 'financial') {
      filtersContainer.innerHTML = `
        <div class="filters-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(170px, 1fr)); gap: 10px; align-items: flex-end;">
          <div class="filter-group">
            <label>Vencimento Inicial</label>
            <input type="date" id="filter-date-start" value="${new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0]}">
          </div>
          <div class="filter-group">
            <label>Vencimento Final</label>
            <input type="date" id="filter-date-end" value="${new Date(new Date().getFullYear(), 11, 31).toISOString().split('T')[0]}">
          </div>
          <div class="filter-group">
            <label>Tipo Operação</label>
            <select id="filter-fin-type" style="width:100%;padding:7px 10px;border-radius:8px;border:1px solid var(--border-color);background:var(--bg-tertiary);color:var(--text-primary);font-size:0.82rem;cursor:pointer;">
              <option value="Todos">Todos (Receitas/Despesas)</option>
              <option value="Receita">Receitas (Entradas)</option>
              <option value="Despesa">Despesas (Saídas)</option>
            </select>
          </div>
          <div class="filter-group">
            <label>Status (Checkboxes)</label>
            <div class="dropdown-check-list" id="dropdown-fin-status">
              <div class="anchor" onclick="toggleFilterDropdown('dropdown-fin-status', event)">Status: Todos</div>
              <ul class="items">
                <li><input type="checkbox" id="filter-fin-all" checked><label for="filter-fin-all"><strong>Selecionar Todos</strong></label></li>
                <li><input type="checkbox" class="filter-fin-item" value="Pagas" id="fin-st-1" checked><label for="fin-st-1">Pagas</label></li>
                <li><input type="checkbox" class="filter-fin-item" value="A Vencer" id="fin-st-2" checked><label for="fin-st-2">A Vencer</label></li>
                <li><input type="checkbox" class="filter-fin-item" value="Vencidas" id="fin-st-3" checked><label for="fin-st-3">Vencidas</label></li>
                <li><input type="checkbox" class="filter-fin-item" value="Bonificadas" id="fin-st-4" checked><label for="fin-st-4">Bonificadas</label></li>
                <li><input type="checkbox" class="filter-fin-item" value="Suspensas" id="fin-st-5" checked><label for="fin-st-5">Suspensas</label></li>
                <li><input type="checkbox" class="filter-fin-item" value="Canceladas" id="fin-st-6" checked><label for="fin-st-6">Canceladas</label></li>
                <li><input type="checkbox" class="filter-fin-item" value="Excluídas" id="fin-st-7" checked><label for="fin-st-7">Excluídas</label></li>
              </ul>
            </div>
          </div>
          <div class="filter-group">
            <label>Categorias</label>
            <div class="dropdown-check-list" id="dropdown-fin-category">
              <div class="anchor" onclick="toggleFilterDropdown('dropdown-fin-category', event)">Categorias: Todas</div>
              <ul class="items">
                <li><input type="checkbox" id="filter-fin-cat-all" checked><label for="filter-fin-cat-all"><strong>Selecionar Todas</strong></label></li>
                <li><input type="checkbox" class="filter-fin-cat-item" value="Consultas" id="fin-cat-1" checked><label for="fin-cat-1">Consultas</label></li>
                <li><input type="checkbox" class="filter-fin-cat-item" value="Procedimentos" id="fin-cat-2" checked><label for="fin-cat-2">Procedimentos</label></li>
                <li><input type="checkbox" class="filter-fin-cat-item" value="Exames" id="fin-cat-3" checked><label for="fin-cat-3">Exames</label></li>
                <li><input type="checkbox" class="filter-fin-cat-item" value="Operacionais" id="fin-cat-4" checked><label for="fin-cat-4">Operacionais</label></li>
                <li><input type="checkbox" class="filter-fin-cat-item" value="Farmácia" id="fin-cat-5" checked><label for="fin-cat-5">Farmácia</label></li>
                <li><input type="checkbox" class="filter-fin-cat-item" value="Insumos" id="fin-cat-6" checked><label for="fin-cat-6">Insumos</label></li>
              </ul>
            </div>
          </div>
          <div class="filter-group">
            <label>Forma Pagamento</label>
            <div class="dropdown-check-list" id="dropdown-fin-method">
              <div class="anchor" onclick="toggleFilterDropdown('dropdown-fin-method', event)">Formas: Todas</div>
              <ul class="items">
                <li><input type="checkbox" id="filter-fin-method-all" checked><label for="filter-fin-method-all"><strong>Selecionar Todas</strong></label></li>
                <li><input type="checkbox" class="filter-fin-method-item" value="Pix" id="fin-m-1" checked><label for="fin-m-1">Pix</label></li>
                <li><input type="checkbox" class="filter-fin-method-item" value="Boleto" id="fin-m-2" checked><label for="fin-m-2">Boleto</label></li>
                <li><input type="checkbox" class="filter-fin-method-item" value="Cartão de Crédito" id="fin-m-3" checked><label for="fin-m-3">Cartão Crédito</label></li>
                <li><input type="checkbox" class="filter-fin-method-item" value="Cartão de Débito" id="fin-m-4" checked><label for="fin-m-4">Cartão Débito</label></li>
                <li><input type="checkbox" class="filter-fin-method-item" value="Dinheiro" id="fin-m-5" checked><label for="fin-m-5">Dinheiro</label></li>
                <li><input type="checkbox" class="filter-fin-method-item" value="Convênio" id="fin-m-6" checked><label for="fin-m-6">Convênio</label></li>
              </ul>
            </div>
          </div>
          <div class="filter-group">
            <label>Busca Livre</label>
            <input type="text" id="filter-fin-search" placeholder="Paciente ou ID..." style="width:100%;padding:7px 10px;border-radius:8px;border:1px solid var(--border-color);background:var(--bg-tertiary);color:var(--text-primary);font-size:0.82rem;">
          </div>
          <div class="filter-group" style="grid-column: span 2; min-width: 240px;">
            <button id="btn-open-fin-window-top" class="btn btn-primary" style="width:100%;background:linear-gradient(135deg, #00f2fe, #4f46e5);color:#fff;font-weight:700;font-size:0.82rem;padding:8px 12px;border-radius:8px;display:flex;align-items:center;justify-content:center;gap:6px;box-shadow:0 4px 12px rgba(0,242,254,0.25);cursor:pointer;">
              <i class="fa-solid fa-window-restore"></i> Visualizar Listagem em Janela Dedicada
            </button>
          </div>
        </div>
      `;
    }

    // Registrar event listeners nos campos de texto/data/select
    const textInputs = filtersContainer.querySelectorAll('input[type="date"], input[type="text"], input[type="number"], select');
    textInputs.forEach(input => {
      input.addEventListener('change', filterAndRender);
      input.addEventListener('input', filterAndRender);
    });

    // Inicializar os seletores Select All para os grupos de checkboxes
    if (activeTab === 'patients') {
      setupFilterGroupSelectAll('filter-city-all', 'filter-city-item', 'dropdown-city', 'Cidades');
    } else if (activeTab === 'encounters') {
      setupFilterGroupSelectAll('filter-status-all', 'filter-status-item', 'dropdown-status', 'Status');
      setupFilterGroupSelectAll('filter-manchester-all', 'filter-manchester-item', 'dropdown-manchester', 'Classificação');
      setupFilterGroupSelectAll('filter-type-all', 'filter-type-item', 'dropdown-type', 'Tipos');
      document.getElementById('filter-doctor-name')?.addEventListener('change', filterAndRender);
    } else if (activeTab === 'financial') {
      setupFilterGroupSelectAll('filter-fin-all', 'filter-fin-item', 'dropdown-fin-status', 'Status');
      setupFilterGroupSelectAll('filter-fin-cat-all', 'filter-fin-cat-item', 'dropdown-fin-category', 'Categorias');
      setupFilterGroupSelectAll('filter-fin-method-all', 'filter-fin-method-item', 'dropdown-fin-method', 'Formas');
    }

    filterAndRender();
  };

  const updatePreviewStatusText = () => {
    const total = currentFilteredList.length;
    const selected = document.querySelectorAll('.record-checkbox:checked').length;
    const ps = document.getElementById('preview-status');
    if (ps) ps.textContent = `${selected} de ${total} selecionados para exportação`;
  };

  const renderFinancialCharts = (data) => {
    const pieCtx = document.getElementById('finPieChart');
    const barCtx = document.getElementById('finBarChart');
    if (!pieCtx || !barCtx) return;

    if (finPieChartInstance) finPieChartInstance.destroy();
    if (finBarChartInstance) finBarChartInstance.destroy();

    const labels = data.map(item => item.label);
    const quantities = data.map(item => item.count);
    const valuesR$ = data.map(item => item.totalValue);
    const colors = data.map(item => item.color);

    const ChartClass = window.Chart || (typeof Chart !== 'undefined' ? Chart : null);
    if (!ChartClass) return;

    const pagasItem = data.find(d => d.label === 'Pagas');
    const totalCount = quantities.reduce((a, b) => a + b, 0);
    const totalVal = valuesR$.reduce((a, b) => a + b, 0);
    const pctPagas = totalCount > 0 ? Math.round((pagasItem ? pagasItem.count : 0) / totalCount * 100) : 0;

    const pctEl = document.getElementById('fin-completion-pct');
    if (pctEl) {
      const startTime = performance.now();
      const duration = 1200;
      const updatePct = (now) => {
        const progress = Math.min(1, (now - startTime) / duration);
        const ease = 1 - Math.pow(1 - progress, 3);
        pctEl.textContent = `${Math.floor(ease * pctPagas)}%`;
        if (progress < 1) requestAnimationFrame(updatePct);
        else pctEl.textContent = `${pctPagas}%`;
      };
      requestAnimationFrame(updatePct);
    }

    // Animar barras de progresso da lista lateral
    setTimeout(() => {
      document.querySelectorAll('#fin-status-progress-list .ward-bar-fill').forEach(fill => {
        const target = fill.dataset.target || '0';
        fill.style.width = `${target}%`;
      });
    }, 80);

    // 1. Gráfico de Rosca Neon Glass (Sem legenda interna pois a lista lateral atua como legenda ativa)
    finPieChartInstance = new ChartClass(pieCtx.getContext('2d'), {
      type: 'doughnut',
      data: {
        labels: labels,
        datasets: [{
          data: quantities,
          backgroundColor: colors,
          borderWidth: 3,
          borderColor: 'rgba(11, 8, 22, 0.95)',
          borderRadius: 6,
          spacing: 3,
          hoverOffset: 14
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '76%',
        animation: { animateScale: true, animateRotate: true, duration: 1100 },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: 'rgba(18, 14, 34, 0.94)',
            titleColor: '#00f2fe',
            bodyColor: '#f8fafc',
            borderColor: 'rgba(0, 242, 254, 0.35)',
            borderWidth: 1,
            padding: 12,
            callbacks: {
              label: function(context) {
                const idx = context.dataIndex;
                const count = context.parsed;
                const valor = valuesR$[idx] || 0;
                const totalQtd = quantities.reduce((a, b) => a + b, 0);
                const pct = totalQtd > 0 ? ((count / totalQtd) * 100).toFixed(1) : '0.0';
                const valorFormatado = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor);
                return [
                  ` Quantidade: ${count} parcelas (${pct}%)`,
                  ` Valor Total: ${valorFormatado}`
                ];
              }
            }
          }
        }
      }
    });

    // Interatividade Hover Lista -> Anel
    document.querySelectorAll('.fin-progress-row').forEach(row => {
      row.addEventListener('mouseenter', () => {
        const idx = parseInt(row.dataset.idx, 10);
        if (finPieChartInstance && finPieChartInstance.setActiveElements) {
          finPieChartInstance.setActiveElements([{ datasetIndex: 0, index: idx }]);
          finPieChartInstance.update();
        }
      });
      row.addEventListener('mouseleave', () => {
        if (finPieChartInstance && finPieChartInstance.setActiveElements) {
          finPieChartInstance.setActiveElements([]);
          finPieChartInstance.update();
        }
      });
    });

    // 2. Gráfico de Barras Neon Glass ("Comparativo Financeiro (R$)")
    const c2dBar = barCtx.getContext('2d');
    const barGradients = colors.map(c => {
      const grad = c2dBar.createLinearGradient(0, 0, 0, 180);
      grad.addColorStop(0, c);
      grad.addColorStop(1, 'rgba(11, 8, 22, 0.4)');
      return grad;
    });

    finBarChartInstance = new ChartClass(c2dBar, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [{
          label: 'Valor (R$)',
          data: valuesR$,
          backgroundColor: barGradients,
          borderColor: colors,
          borderWidth: 1.5,
          borderRadius: 8,
          borderSkipped: false
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 1100, easing: 'easeOutQuart' },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: 'rgba(18, 14, 34, 0.94)',
            titleColor: '#00f2fe',
            bodyColor: '#f8fafc',
            borderColor: 'rgba(0, 242, 254, 0.35)',
            borderWidth: 1,
            padding: 12,
            callbacks: {
              label: function(context) {
                const valor = context.parsed.y;
                return ' Total: ' + new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor);
              }
            }
          }
        },
        scales: {
          x: {
            grid: { color: 'rgba(255,255,255,0.04)', drawBorder: false },
            ticks: { color: '#94a3b8', font: { family: 'Plus Jakarta Sans', size: 10.5, weight: '600' } }
          },
          y: {
            grid: { color: 'rgba(255,255,255,0.04)', drawBorder: false },
            ticks: {
              color: '#94a3b8',
              font: { family: 'Plus Jakarta Sans', size: 10 },
              callback: function(val) {
                return 'R$ ' + val.toLocaleString('pt-BR');
              }
            }
          }
        }
      }
    });
  };

  const filterAndRender = async () => {
    if (activeTab === 'financial') {
      const previewCard = document.querySelector('.preview-card');
      if (!previewCard) return;

      // Capturar filtros ativos dos controles da UI
      const dStart = document.getElementById('filter-date-start')?.value;
      const dEnd = document.getElementById('filter-date-end')?.value;
      const opType = document.getElementById('filter-fin-type')?.value || 'Todos';
      const selStatus = [...document.querySelectorAll('.filter-fin-item:checked')].map(c => c.value);
      const selCat = [...document.querySelectorAll('.filter-fin-cat-item:checked')].map(c => c.value);
      const selMethod = [...document.querySelectorAll('.filter-fin-method-item:checked')].map(c => c.value);
      const sTerm = document.getElementById('filter-fin-search')?.value?.toLowerCase()?.trim() || '';

      let pagasCount = 0, pagasVal = 0;
      let aVencerCount = 0, aVencerVal = 0;
      let vencidasCount = 0, vencidasVal = 0;
      let bonificadasCount = 0, bonificadasVal = 0;
      let suspensasCount = 0, suspensasVal = 0;
      let canceladasCount = 0, canceladasVal = 0;
      let excluidasCount = 0, excluidasVal = 0;

      let finTitlesList = [];
      try {
        const response = await apiFetch('/api/financial/installments');
        if (response.ok) {
          const raw = await response.json();
          // apiFetch returns { data: [...] } – extract the array
          const installments = Array.isArray(raw) ? raw : (raw.data || []);
          finTitlesList = installments.filter(inst => {
            const val = parseFloat(inst.amount) || 0;
            const due = inst.dueDate || '';
            const instType = inst.type || 'Receita';
            const instCat = inst.category || 'Consultas';
            const instMethod = inst.paymentMethod || 'Pix';
            const clientName = (inst.patientName || '').toLowerCase();
            const descName = (inst.description || '').toLowerCase();
            const idName = (inst.id || '').toLowerCase();

            // Filtro por Data
            if (dStart && due < dStart) return false;
            if (dEnd && due > dEnd) return false;

            // Filtro por Tipo de Operação
            if (opType !== 'Todos' && instType !== opType) return false;

            // Filtro por Status
            if (selStatus.length > 0 && !selStatus.includes(inst.status)) return false;

            // Filtro por Categoria
            if (selCat.length > 0 && !selCat.includes(instCat)) return false;

            // Filtro por Forma de Pagamento
            if (selMethod.length > 0 && !selMethod.includes(instMethod)) return false;

            // Busca Livre por Texto
            if (sTerm && !clientName.includes(sTerm) && !descName.includes(sTerm) && !idName.includes(sTerm)) return false;

            return true;
          }).map(inst => {
            const val = parseFloat(inst.amount) || 0;
            switch(inst.status) {
              case 'Pagas': pagasCount++; pagasVal += val; break;
              case 'A Vencer': aVencerCount++; aVencerVal += val; break;
              case 'Vencidas': vencidasCount++; vencidasVal += val; break;
              case 'Bonificadas': bonificadasCount++; bonificadasVal += val; break;
              case 'Suspensas': suspensasCount++; suspensasVal += val; break;
              case 'Canceladas': canceladasCount++; canceladasVal += val; break;
              case 'Excluídas': excluidasCount++; excluidasVal += val; break;
            }

            let color = '#00f2fe';
            if (inst.status === 'Pagas') color = '#34d399';
            if (inst.status === 'Vencidas') color = '#f43f5e';
            if (inst.status === 'Bonificadas') color = '#fbbf24';
            if (inst.status === 'Suspensas') color = '#a855f7';
            if (inst.status === 'Canceladas') color = '#f97316';
            if (inst.status === 'Excluídas') color = '#dc2626';

            return {
              id: inst.id,
              client: inst.patientName,
              desc: inst.description,
              dueDate: new Date(inst.dueDate).toLocaleDateString('pt-BR'),
              amount: val,
              amountFormatted: new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val),
              status: inst.status,
              type: inst.type || 'Receita',
              category: inst.category || 'Consultas',
              paymentMethod: inst.paymentMethod || 'Pix',
              installmentNumber: inst.installmentNumber || 1,
              totalInstallments: inst.totalInstallments || 1,
              color: color
            };
          });
        }
      } catch (e) {
        console.error("Erro ao carregar dados financeiros", e);
      }

      const totalVal = pagasVal + aVencerVal + vencidasVal + bonificadasVal + suspensasVal + canceladasVal + excluidasVal;
      const totalParcelas = pagasCount + aVencerCount + vencidasCount + bonificadasCount + suspensasCount + canceladasCount + excluidasCount;
      const pctPagasCount = totalParcelas > 0 ? Math.round((pagasCount / totalParcelas) * 100) : 0;

      const totalFormatted = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalVal);

      const finData = [
        { label: 'Pagas', count: pagasCount, totalValue: pagasVal, color: '#34d399' },
        { label: 'A Vencer', count: aVencerCount, totalValue: aVencerVal, color: '#00f2fe' },
        { label: 'Vencidas', count: vencidasCount, totalValue: vencidasVal, color: '#f43f5e' },
        { label: 'Bonificadas', count: bonificadasCount, totalValue: bonificadasVal, color: '#fbbf24' },
        { label: 'Suspensas', count: suspensasCount, totalValue: suspensasVal, color: '#a855f7' },
        { label: 'Canceladas', count: canceladasCount, totalValue: canceladasVal, color: '#f97316' },
        { label: 'Excluídas', count: excluidasCount, totalValue: excluidasVal, color: '#dc2626' }
      ];

      window._activeFinStatusFilter = 'Todos';

      previewCard.innerHTML = `
        <div class="preview-header" style="flex-wrap: wrap; gap: 15px;">
          <h3><i class="fa-solid fa-file-invoice-dollar" style="color: var(--color-primary);"></i> Relatório Financeiro de Títulos & Baixa Manual</h3>
          <div style="margin-left: auto; display: flex; gap: 8px; flex-wrap: wrap;">
            <button id="btn-open-fin-window-card" class="btn btn-primary" style="background: linear-gradient(135deg, #00f2fe, #4f46e5); font-size: 0.8rem;"><i class="fa-solid fa-window-restore"></i> Abrir Janela Dedicada</button>
            <button id="btn-export-pdf" class="btn btn-primary" style="background: var(--danger-color); font-size: 0.8rem;"><i class="fa-solid fa-file-pdf"></i> Exportar PDF</button>
            <button id="btn-export-xls" class="btn btn-primary" style="background: var(--success-color); font-size: 0.8rem;"><i class="fa-solid fa-file-excel"></i> Exportar Excel</button>
            <button id="btn-export-csv" class="btn btn-outline" style="font-size: 0.8rem;"><i class="fa-solid fa-file-csv"></i> Exportar CSV</button>
          </div>
        </div>

        <div class="financial-kpi-bar" style="margin-top: 15px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px; background: rgba(0,0,0,0.15); padding: 14px; border-radius: var(--radius-md); border: 1px solid var(--border-color);">
          <div class="financial-badges-group" style="display: flex; gap: 8px; flex-wrap: wrap; font-size: 0.85rem;">
            <span class="fin-kpi-badge" data-status="Pagas" style="border-left: 3px solid #34d399; padding: 4px 10px; background: rgba(52,211,153,0.1); border-radius: 4px; color: var(--text-primary); cursor:pointer;" title="Clique para filtrar apenas títulos Pagos">• Pagas: <strong>${pagasCount}</strong></span>
            <span class="fin-kpi-badge" data-status="A Vencer" style="border-left: 3px solid #00f2fe; padding: 4px 10px; background: rgba(0,242,254,0.1); border-radius: 4px; color: var(--text-primary); cursor:pointer;" title="Clique para filtrar apenas títulos A Vencer">• A Vencer: <strong>${aVencerCount}</strong></span>
            <span class="fin-kpi-badge" data-status="Vencidas" style="border-left: 3px solid #f43f5e; padding: 4px 10px; background: rgba(244,63,94,0.1); border-radius: 4px; color: var(--text-primary); cursor:pointer;" title="Clique para filtrar apenas títulos Vencidos">• Vencidas: <strong>${vencidasCount}</strong></span>
            <span class="fin-kpi-badge" data-status="Bonificadas" style="border-left: 3px solid #fbbf24; padding: 4px 10px; background: rgba(251,191,36,0.1); border-radius: 4px; color: var(--text-primary); cursor:pointer;" title="Clique para filtrar apenas títulos Bonificados">• Bonificadas: <strong>${bonificadasCount}</strong></span>
          </div>
          <div style="font-family: 'Outfit'; text-align: right;">
            <span style="font-size: 0.75rem; color: var(--text-muted); display: block;">SUBTOTAL FILTRADO</span>
            <strong style="font-size: 1.2rem; color: var(--color-primary);">${totalFormatted}</strong>
          </div>
        </div>

        <!-- COMPONENTE HÍBRIDO (ANEL NEON + BARRAS POR CATEGORIA) -->
        <div class="chart-card tilt-card-3d" style="margin-top: 20px; padding: 22px;">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 18px; flex-wrap: wrap; gap: 10px;">
            <h4 style="margin:0; font-size:1.05rem; font-weight:700; color:var(--text-primary); display:flex; align-items:center; gap:8px;">
              <i class="fa-solid fa-chart-pie" style="color: #00f2fe;"></i> Distribuição Financeira por Status
            </h4>
            <span class="badge-occupancy-status" style="border: 1px solid #34d399; background: rgba(52,211,153,0.12); color: #34d399; padding: 5px 14px; border-radius: 20px; font-size: 0.8rem; font-weight: 700;">
              <i class="fa-solid fa-circle-check"></i> ${pctPagasCount}% Pagas (${pagasCount} parcelas)
            </span>
          </div>

          <div style="display: grid; grid-template-columns: 240px 1fr; gap: 24px; align-items: center;">
            <div style="position: relative; width: 210px; height: 210px; margin: 0 auto; display: flex; align-items: center; justify-content: center;">
              <canvas id="finPieChart"></canvas>
              <div class="fin-donut-kpi" style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); text-align: center; pointer-events: none;">
                <span id="fin-completion-pct" style="font-family: 'Outfit', sans-serif; font-size: 2.2rem; font-weight: 800; background: linear-gradient(135deg, #ffffff 0%, #34d399 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; display: block; line-height: 1; filter: drop-shadow(0 0 10px rgba(52, 211, 153, 0.45));">0%</span>
                <span style="font-size: 0.65rem; font-weight: 700; color: var(--text-secondary, #94a3b8); text-transform: uppercase; letter-spacing: 0.05em; display: block; margin-top: 4px;">PAGAS DA CARTEIRA</span>
              </div>
            </div>

            <div class="ward-progress-list" id="fin-status-progress-list">
              ${finData.map((item, idx) => {
                const pct = totalVal > 0 ? ((item.totalValue / totalVal) * 100).toFixed(1) : '0.0';
                const pctCount = totalParcelas > 0 ? ((item.count / totalParcelas) * 100).toFixed(1) : '0.0';
                const formattedVal = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.totalValue);
                const iconMap = {
                  'Pagas': 'fa-circle-check', 'A Vencer': 'fa-clock', 'Vencidas': 'fa-circle-exclamation',
                  'Bonificadas': 'fa-award', 'Suspensas': 'fa-ban', 'Canceladas': 'fa-xmark', 'Excluídas': 'fa-trash'
                };
                return `
                  <div class="ward-progress-item fin-progress-row" data-idx="${idx}" data-status="${item.label}" style="cursor:pointer;" title="Clique para filtrar a tabela para o status ${item.label}">
                    <div class="ward-progress-header">
                      <span class="ward-name"><i class="fa-solid ${iconMap[item.label]||'fa-circle'}" style="color:${item.color};"></i> ${item.label}</span>
                      <span class="ward-stats">
                        <strong style="color:${item.color};font-weight:700;">${item.count} parcelas</strong> 
                        <span style="color:var(--text-muted);font-size:0.76rem;">(${pctCount}%) • ${formattedVal}</span>
                      </span>
                    </div>
                    <div class="ward-bar-track" style="height:6px;background:rgba(255,255,255,0.08);border-radius:10px;overflow:hidden;margin-top:4px;">
                      <div class="ward-bar-fill" style="height:100%;width:0%;background:${item.color};border-radius:10px;transition:width 1.2s cubic-bezier(0.165,0.84,0.44,1);" data-target="${pctCount}"></div>
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
          </div>
        </div>

        <div class="chart-card tilt-card-3d" style="margin-top: 18px; padding: 18px; height: 250px; position: relative;">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px;">
            <h4 style="margin:0; font-size:0.9rem; font-weight:700; color:var(--text-primary); display:flex; align-items:center; gap:8px;">
              <i class="fa-solid fa-chart-column" style="color: #00f2fe;"></i> Comparativo Financeiro por Status (R$)
            </h4>
          </div>
          <div style="position: relative; height: 185px; width: 100%;">
            <canvas id="finBarChart"></canvas>
          </div>
        </div>

        <div id="fin-titles-table-card" class="glass-card" style="margin-top: 22px; padding: 20px; border-radius: 14px; border: 1px solid var(--border-color);">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; flex-wrap: wrap; gap: 12px;">
            <div>
              <h4 id="fin-table-title" style="margin: 0; font-size: 1.05rem; font-weight: 700; color: var(--text-primary); display: flex; align-items: center; gap: 8px;">
                <i class="fa-solid fa-list-check" style="color: #00f2fe;"></i> Títulos Financeiros
                <span id="fin-status-filter-tag" style="font-size:0.76rem; font-weight:600; padding:3px 10px; border-radius:12px; background:rgba(0,242,254,0.12); color:#00f2fe; border:1px solid rgba(0,242,254,0.3);">Todos os Status</span>
              </h4>
              <p style="margin: 4px 0 0 0; font-size: 0.78rem; color: var(--text-muted);">Clique no botão <strong style="color:#00f2fe;">Dar Baixa Manual</strong> para quitar qualquer parcela de forma simples e detalhada.</p>
            </div>
            <div style="display: flex; gap: 8px; flex-wrap: wrap;">
              <button id="btn-fin-show-all" class="btn btn-outline" style="font-size: 0.78rem; padding: 5px 12px;"><i class="fa-solid fa-rotate-left"></i> Mostrar Todos</button>
              <button id="btn-fin-card-pdf" class="btn btn-primary" style="background: linear-gradient(135deg, #ef4444, #dc2626); font-size: 0.78rem; padding: 5px 12px;"><i class="fa-solid fa-file-pdf"></i> Imprimir / PDF</button>
              <button id="btn-fin-card-xls" class="btn btn-primary" style="background: linear-gradient(135deg, #10b981, #059669); font-size: 0.78rem; padding: 5px 12px;"><i class="fa-solid fa-file-excel"></i> Exportar Excel</button>
              <button id="btn-fin-card-csv" class="btn btn-outline" style="font-size: 0.78rem; padding: 5px 12px;"><i class="fa-solid fa-file-csv"></i> Exportar CSV</button>
            </div>
          </div>

          <div style="border-radius: 10px; overflow: hidden; border: 1px solid var(--border-color);">
            <table style="width: 100%; border-collapse: collapse;">
              <thead>
                <tr style="background: var(--bg-tertiary); border-bottom: 1px solid var(--border-color);">
                  <th style="padding: 10px 14px; font-size: 0.72rem; color: var(--text-muted); text-transform: uppercase;">Nosso Número</th>
                  <th style="padding: 10px 14px; font-size: 0.72rem; color: var(--text-muted); text-transform: uppercase;">Paciente / Cliente</th>
                  <th style="padding: 10px 14px; font-size: 0.72rem; color: var(--text-muted); text-transform: uppercase;">Descrição / Serviço</th>
                  <th style="padding: 10px 14px; font-size: 0.72rem; color: var(--text-muted); text-transform: uppercase; text-align: center;">Parcela</th>
                  <th style="padding: 10px 14px; font-size: 0.72rem; color: var(--text-muted); text-transform: uppercase; text-align: center;">Vencimento</th>
                  <th style="padding: 10px 14px; font-size: 0.72rem; color: var(--text-muted); text-transform: uppercase; text-align: right;">Valor (R$)</th>
                  <th style="padding: 10px 14px; font-size: 0.72rem; color: var(--text-muted); text-transform: uppercase; text-align: center;">Status</th>
                  <th style="padding: 10px 14px; font-size: 0.72rem; color: var(--text-muted); text-transform: uppercase; text-align: center;">Ações</th>
                </tr>
              </thead>
              <tbody id="fin-titles-table-body">
                <!-- Títulos renderizados dinamicamente -->
              </tbody>
            </table>
          </div>
        </div>
      `;

      const renderFinTable = (statusFilter = 'Todos') => {
        window._activeFinStatusFilter = statusFilter;
        const tbody = document.getElementById('fin-titles-table-body');
        const filterTag = document.getElementById('fin-status-filter-tag');
        if (!tbody) return;

        let filtered = finTitlesList;
        if (statusFilter && statusFilter !== 'Todos') {
          filtered = finTitlesList.filter(t => t.status === statusFilter);
        }

        if (filterTag) {
          filterTag.textContent = statusFilter === 'Todos' ? 'Todos os Status' : `Filtrado por: ${statusFilter} (${filtered.length})`;
          filterTag.style.borderColor = statusFilter === 'Vencidas' ? '#f43f5e' : (statusFilter === 'Pagas' ? '#34d399' : '#00f2fe');
          filterTag.style.color = statusFilter === 'Vencidas' ? '#f43f5e' : (statusFilter === 'Pagas' ? '#34d399' : '#00f2fe');
        }

        if (filtered.length === 0) {
          tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:24px;color:var(--text-muted);">Nenhum título encontrado com o status "${statusFilter}".</td></tr>`;
          return;
        }

        const hasPEP = state.user && (state.user.role === 'Médico' || state.user.role === 'Enfermeiro');

        tbody.innerHTML = filtered.map(t => {
          const instStr = (t.installmentNumber && t.totalInstallments) ? `${t.installmentNumber}/${t.totalInstallments}` : '1/1';
          return `
            <tr style="border-bottom:1px solid var(--border-color);transition:background 0.2s ease;">
              <td style="padding:10px 14px;font-family:monospace;font-weight:700;color:var(--color-primary);font-size:0.84rem;">${t.id}</td>
              <td style="padding:10px 14px;font-weight:600;color:var(--text-primary);font-size:0.86rem;">${hasPEP ? t.client : (typeof abbreviateName === 'function' ? abbreviateName(t.client) : t.client)}</td>
              <td style="padding:10px 14px;font-size:0.82rem;color:var(--text-secondary);">${t.desc}</td>
              <td style="padding:10px 14px;text-align:center;font-size:0.8rem;font-weight:700;color:#00f2fe;">${instStr}</td>
              <td style="padding:10px 14px;text-align:center;font-size:0.82rem;color:var(--text-secondary);">${t.dueDate}</td>
              <td style="padding:10px 14px;text-align:right;font-family:monospace;font-weight:700;color:${t.color};font-size:0.88rem;">${t.amountFormatted}</td>
              <td style="padding:10px 14px;text-align:center;">
                <span style="padding:3px 10px;border-radius:20px;font-size:0.72rem;font-weight:700;background:${t.color}1e;color:${t.color};border:1px solid ${t.color}40;">${t.status}</span>
              </td>
              <td style="padding:10px 14px;text-align:center;">
                <div style="display:flex;gap:5px;justify-content:center;">
                  <button class="btn btn-outline btn-view-boleto" style="font-size:0.72rem;padding:3px 9px;" data-id="${t.id}" data-client="${t.client}" data-desc="${t.desc}" data-duedate="${t.dueDate}" data-amount="${t.amountFormatted}" data-val="${t.amount}"><i class="fa-solid fa-barcode"></i> 2ª Via</button>
                  ${t.status !== 'Pagas' ? `<button class="btn btn-primary btn-pay-installment-modal" style="background:linear-gradient(135deg, #10b981, #059669);font-size:0.72rem;padding:3px 9px;cursor:pointer;" data-id="${t.id}"><i class="fa-solid fa-hand-holding-dollar"></i> Quitar</button>` : ''}
                </div>
              </td>
            </tr>
          `;
        }).join('');

        tbody.querySelectorAll('.btn-view-boleto').forEach(btn => {
          btn.addEventListener('click', () => {
            openBoletoModal({
              id: btn.dataset.id,
              client: btn.dataset.client,
              desc: btn.dataset.desc,
              dueDate: btn.dataset.duedate,
              amountFormatted: btn.dataset.amount,
              amount: parseFloat(btn.dataset.val) || 0
            });
          });
        });

        tbody.querySelectorAll('.btn-pay-installment-modal').forEach(btn => {
          btn.addEventListener('click', () => {
            const item = finTitlesList.find(t => t.id === btn.dataset.id);
            if (item) {
              openPayInstallmentModal(item, () => {
                filterAndRender();
                if (typeof fetchDashboardData === 'function') fetchDashboardData();
              });
            }
          });
        });
      };

      renderFinTable('Todos');

      setTimeout(() => {
        renderFinancialCharts(finData);

        document.querySelectorAll('.fin-progress-row, .fin-kpi-badge').forEach(el => {
          el.addEventListener('click', (e) => {
            const statusTarget = el.dataset.status;
            if (statusTarget) {
              renderFinTable(statusTarget);
              document.getElementById('fin-titles-table-card')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
          });
        });

        document.getElementById('btn-fin-show-all')?.addEventListener('click', () => {
          renderFinTable('Todos');
        });

        // Event listener para a janela dedicada (Modal de Resultados)
        const openWindowHandler = () => {
          openFinancialListWindowModal(finTitlesList, () => {
            filterAndRender();
            if (typeof fetchDashboardData === 'function') fetchDashboardData();
          });
        };

        document.getElementById('btn-open-fin-window-top')?.addEventListener('click', openWindowHandler);
        document.getElementById('btn-open-fin-window-card')?.addEventListener('click', openWindowHandler);

        document.getElementById('btn-fin-card-pdf')?.addEventListener('click', () => processExport('pdf'));
        document.getElementById('btn-fin-card-xls')?.addEventListener('click', () => processExport('xls'));
        document.getElementById('btn-fin-card-csv')?.addEventListener('click', () => processExport('csv'));

        document.getElementById('btn-export-pdf')?.addEventListener('click', () => processExport('pdf'));
        document.getElementById('btn-export-xls')?.addEventListener('click', () => processExport('xls'));
        document.getElementById('btn-export-csv')?.addEventListener('click', () => processExport('csv'));
      }, 50);

      // Re-associar botões de exportação do relatório financeiro
      const finBtnPdf = document.getElementById('btn-export-pdf');
      const finBtnXls = document.getElementById('btn-export-xls');
      const finBtnCsv = document.getElementById('btn-export-csv');

      if (finBtnPdf) finBtnPdf.addEventListener('click', () => processExport('pdf'));
      if (finBtnXls) finBtnXls.addEventListener('click', () => processExport('xls'));
      if (finBtnCsv) finBtnCsv.addEventListener('click', () => processExport('csv'));

      return;
    }

    // Restaurar estrutura original para as abas 'patients' e 'encounters' se necessário
    const previewCard = document.querySelector('.preview-card');
    if (previewCard && !document.getElementById('preview-table-head')) {
      previewCard.innerHTML = `
        <div class="preview-header">
          <h3><i class="fa-solid fa-list-check"></i> Registros Correspondentes</h3>
          <span id="preview-status" class="preview-status">Carregando dados...</span>
        </div>

        <div class="preview-table-wrapper">
          <table class="preview-table">
            <thead id="preview-table-head"></thead>
            <tbody id="preview-table-body"></tbody>
          </table>
        </div>

        <div class="report-actions" style="margin-top: 20px;">
          <button id="btn-export-pdf" class="btn btn-primary" style="background: var(--danger-color)"><i class="fa-solid fa-file-pdf"></i> Exportar PDF</button>
          <button id="btn-export-xls" class="btn btn-primary" style="background: var(--success-color)"><i class="fa-solid fa-file-excel"></i> Exportar Excel (XLSX)</button>
          <button id="btn-export-csv" class="btn btn-outline"><i class="fa-solid fa-file-csv"></i> Exportar CSV</button>
        </div>
      `;
      // Re-vincular ouvintes de exportação
      document.getElementById('btn-export-pdf')?.addEventListener('click', () => processExport('pdf'));
      document.getElementById('btn-export-xls')?.addEventListener('click', () => processExport('xls'));
      document.getElementById('btn-export-csv')?.addEventListener('click', () => processExport('csv'));
    }

    const dynTableHead = document.getElementById('preview-table-head');
    const dynTableBody = document.getElementById('preview-table-body');

    if (activeTab === 'patients') {
      const dateStart = document.getElementById('filter-date-start')?.value || '';
      const dateEnd = document.getElementById('filter-date-end')?.value || '';
      const billingMin = document.getElementById('filter-billing-min')?.value || '';
      
      const checkedCities = Array.from(document.querySelectorAll('.filter-city-item:checked')).map(cb => cb.value);

      currentFilteredList = patientsList.filter(p => {
        if (dateStart) {
          const start = new Date(dateStart + 'T00:00:00');
          const regDate = new Date(p.created_at || p.birthDate);
          if (regDate < start) return false;
        }
        if (dateEnd) {
          const end = new Date(dateEnd + 'T23:59:59');
          const regDate = new Date(p.created_at || p.birthDate);
          if (regDate > end) return false;
        }
        
        // Filtrar pelas cidades marcadas nos checkboxes
        if (!checkedCities.includes(p.city)) return false;

        if (billingMin) {
          const min = parseFloat(billingMin);
          const val = parseFloat((p.billingValue || '').replace(/[^\d,]/g, '').replace(',', '.')) || 0;
          if (val < min) return false;
        }
        return true;
      });

      if (dynTableHead) dynTableHead.innerHTML = `
        <tr>
          <th class="col-checkbox"><input type="checkbox" id="select-all-records" checked></th>
          <th>ID</th>
          <th>Nome Completo</th>
          <th>CPF</th>
          <th>Data Nasc.</th>
          <th>Cidade</th>
          <th>Faturamento</th>
        </tr>
      `;

      if (currentFilteredList.length === 0) {
        if (dynTableBody) dynTableBody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--text-secondary); padding: 20px;">Nenhum paciente encontrado com os filtros atuais.</td></tr>`;
      } else {
        const hasPEP = state.user && (state.user.role === 'Médico' || state.user.role === 'Enfermeiro');
        if (dynTableBody) dynTableBody.innerHTML = currentFilteredList.map(p => {
          let formattedDate = p.birthDate || '-';
          if (p.birthDate && p.birthDate.includes('-')) {
            const [y, m, d] = p.birthDate.split('-');
            formattedDate = `${d}/${m}/${y}`;
          }
          const name = hasPEP ? p.fullName : abbreviateName(p.fullName);
          const cpf = hasPEP ? p.cpf : anonymizeCPF(p.cpf);
          return `
            <tr>
              <td class="col-checkbox"><input type="checkbox" class="record-checkbox" data-id="${p.id}" checked></td>
              <td style="font-family: monospace; font-weight: 600; color: var(--color-primary);">${p.id}</td>
              <td style="font-weight: 500;">${name}</td>
              <td style="font-family: monospace;">${cpf}</td>
              <td>${formattedDate}</td>
              <td>${p.city || '-'}</td>
              <td style="font-family: monospace;">${p.billingValue || 'R$ 0,00'}</td>
            </tr>
          `;
        }).join('');
      }

    } else {
      const dateStart = document.getElementById('filter-date-start')?.value || '';
      const dateEnd = document.getElementById('filter-date-end')?.value || '';

      const checkedStatuses = Array.from(document.querySelectorAll('.filter-status-item:checked')).map(cb => cb.value);
      const checkedManchester = Array.from(document.querySelectorAll('.filter-manchester-item:checked')).map(cb => cb.value);
      const checkedTypes = Array.from(document.querySelectorAll('.filter-type-item:checked')).map(cb => cb.value);
      const filterDoctor = (document.getElementById('filter-doctor-name') || {}).value || '';

      currentFilteredList = encountersList.filter(e => {
        if (dateStart) {
          const start = new Date(dateStart + 'T00:00:00');
          const admDate = new Date(e.admitted_at);
          if (admDate < start) return false;
        }
        if (dateEnd) {
          const end = new Date(dateEnd + 'T23:59:59');
          const admDate = new Date(e.admitted_at);
          if (admDate > end) return false;
        }
        
        // Filtrar pelos status marcados nos checkboxes
        if (!checkedStatuses.includes(e.status)) return false;

        // Filtrar pelas classificações Manchester (tratando null/vazio como "null")
        const mColor = e.manchesterColor || 'null';
        if (!checkedManchester.includes(mColor)) return false;

        // Filtrar pelos tipos de atendimento
        if (!checkedTypes.includes(e.type)) return false;

        // Filtrar por médico responsável
        if (filterDoctor && (e.doctorName || '') !== filterDoctor) return false;

        return true;
      });

      if (dynTableHead) dynTableHead.innerHTML = `
        <tr>
          <th class="col-checkbox"><input type="checkbox" id="select-all-records" checked></th>
          <th>ID</th>
          <th>Paciente</th>
          <th>Classificação</th>
          <th>Tipo</th>
          <th>Situação</th>
          <th>Data/Hora</th>
        </tr>
      `;

      if (currentFilteredList.length === 0) {
        if (dynTableBody) dynTableBody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--text-secondary); padding: 20px;">Nenhum atendimento encontrado com os filtros atuais.</td></tr>`;
      } else {
        const hasPEP = state.user && (state.user.role === 'Médico' || state.user.role === 'Enfermeiro');
        const statusMap = {
          'Aguardando_Triagem': 'Aguardando Triagem',
          'Aguardando_Atendimento': 'Aguardando Consulta',
          'Em_Atendimento': 'Em Consulta',
          'Finalizado': 'Finalizado'
        };
        if (dynTableBody) dynTableBody.innerHTML = currentFilteredList.map(e => {
          const name = hasPEP ? (e.patientName || 'Desconhecido') : abbreviateName(e.patientName || 'Desconhecido');
          const dateStr = e.admitted_at ? new Date(e.admitted_at).toLocaleString() : '-';
          const badgeClass = e.manchesterColor ? `badge-${e.manchesterColor.toLowerCase()}` : '';
          const displayColor = e.manchesterColor ? `<span class="badge-manchester ${badgeClass}">${e.manchesterColor}</span>` : '-';
          return `
            <tr>
              <td class="col-checkbox"><input type="checkbox" class="record-checkbox" data-id="${e.id}" checked></td>
              <td style="font-family: monospace; font-weight: 600; color: var(--color-primary);">${e.id.substring(0, 8)}...</td>
              <td style="font-weight: 500;">${name}</td>
              <td>${displayColor}</td>
              <td>${e.type === 'Urgencia' ? 'Urgência' : 'Ambulatório'}</td>
              <td>${statusMap[e.status] || e.status}</td>
              <td style="font-size: 0.8rem; color: var(--text-secondary);">${dateStr}</td>
            </tr>
          `;
        }).join('');
      }
    }

    setupCheckboxEvents();
    updatePreviewStatusText();

    // Setup checkbox events for preview table
    function setupCheckboxEvents() {
      const selectAll = document.getElementById('select-all-records');
      if (selectAll) {
        selectAll.addEventListener('change', (e) => {
          document.querySelectorAll('.record-checkbox').forEach(cb => cb.checked = e.target.checked);
        });
      }
      document.querySelectorAll('.record-checkbox').forEach(cb => {
        cb.addEventListener('change', () => {
          const allChecked = document.querySelectorAll('.record-checkbox:checked').length === document.querySelectorAll('.record-checkbox').length;
          if (selectAll) selectAll.checked = allChecked;
        });
      });
    }

    // ─── RESUMO + GRÁFICOS DINÂMICOS POR ABA ────────────────────────────────
    const summaryContainerId = 'report-summary-charts';
    let summaryContainer = document.getElementById(summaryContainerId);
    if (!summaryContainer) {
      summaryContainer = document.createElement('div');
      summaryContainer.id = summaryContainerId;
      summaryContainer.style.marginTop = '20px';
      const previewCard = document.querySelector('.preview-card');
      if (previewCard) previewCard.appendChild(summaryContainer);
    }
    summaryContainer.innerHTML = '';

    const ChartClass = window.Chart || (typeof Chart !== 'undefined' ? Chart : null);

    if (activeTab === 'patients' && currentFilteredList.length > 0) {
      // ── KPIs
      const totalBilling = currentFilteredList.reduce((acc, p) => {
        const v = parseFloat((p.billingValue || '').replace(/[^\d,]/g, '').replace(',', '.')) || 0;
        return acc + v;
      }, 0);
      const avgBilling = totalBilling / currentFilteredList.length;
      const cityCounts = {};
      currentFilteredList.forEach(p => { cityCounts[p.city || 'N/D'] = (cityCounts[p.city || 'N/D'] || 0) + 1; });
      const topCity = Object.entries(cityCounts).sort((a,b) => b[1]-a[1])[0];
      const fmt = v => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

      summaryContainer.innerHTML = `
        <!-- KPI Cards -->
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:14px;margin-bottom:18px;">
          <div class="glass-card" style="padding:16px;border-radius:14px;border:1px solid rgba(99,102,241,0.3);background:rgba(99,102,241,0.07);text-align:center;">
            <div style="font-size:1.9rem;font-weight:800;font-family:'Outfit',sans-serif;color:#818cf8;">${currentFilteredList.length}</div>
            <div style="font-size:0.72rem;text-transform:uppercase;color:var(--text-muted);margin-top:4px;letter-spacing:.05em;">Pacientes</div>
          </div>
          <div class="glass-card" style="padding:16px;border-radius:14px;border:1px solid rgba(52,211,153,0.3);background:rgba(52,211,153,0.07);text-align:center;">
            <div style="font-size:1.4rem;font-weight:800;font-family:'Outfit',sans-serif;color:#34d399;">${fmt(totalBilling)}</div>
            <div style="font-size:0.72rem;text-transform:uppercase;color:var(--text-muted);margin-top:4px;letter-spacing:.05em;">Faturamento Total</div>
          </div>
          <div class="glass-card" style="padding:16px;border-radius:14px;border:1px solid rgba(251,191,36,0.3);background:rgba(251,191,36,0.07);text-align:center;">
            <div style="font-size:1.4rem;font-weight:800;font-family:'Outfit',sans-serif;color:#fbbf24;">${fmt(avgBilling)}</div>
            <div style="font-size:0.72rem;text-transform:uppercase;color:var(--text-muted);margin-top:4px;letter-spacing:.05em;">Ticket Médio</div>
          </div>
          <div class="glass-card" style="padding:16px;border-radius:14px;border:1px solid rgba(0,242,254,0.3);background:rgba(0,242,254,0.07);text-align:center;">
            <div style="font-size:1.2rem;font-weight:800;font-family:'Outfit',sans-serif;color:#00f2fe;">${topCity ? topCity[0] : '-'}</div>
            <div style="font-size:0.72rem;text-transform:uppercase;color:var(--text-muted);margin-top:4px;letter-spacing:.05em;">Cidade Predominante</div>
          </div>
        </div>

        <!-- Gráficos -->
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">
          <div class="glass-card" style="padding:18px;border-radius:14px;border:1px solid var(--border-color);">
            <h4 style="margin:0 0 14px;font-size:0.9rem;font-weight:700;color:var(--text-primary);display:flex;align-items:center;gap:8px;">
              <i class="fa-solid fa-city" style="color:#818cf8;"></i> Pacientes por Cidade
            </h4>
            <div style="position:relative;height:210px;"><canvas id="chart-patients-city"></canvas></div>
          </div>
          <div class="glass-card" style="padding:18px;border-radius:14px;border:1px solid var(--border-color);">
            <h4 style="margin:0 0 14px;font-size:0.9rem;font-weight:700;color:var(--text-primary);display:flex;align-items:center;gap:8px;">
              <i class="fa-solid fa-sack-dollar" style="color:#34d399;"></i> Faturamento por Cidade (R$)
            </h4>
            <div style="position:relative;height:210px;"><canvas id="chart-patients-billing"></canvas></div>
          </div>
        </div>
      `;

      if (ChartClass) {
        setTimeout(() => {
          const cityLabels = Object.keys(cityCounts).slice(0, 8);
          const cityVals = cityLabels.map(c => cityCounts[c]);
          const palette = ['#818cf8','#34d399','#fbbf24','#00f2fe','#f472b6','#a78bfa','#6ee7b7','#fcd34d'];

          const ctxCity = document.getElementById('chart-patients-city');
          if (ctxCity) new ChartClass(ctxCity.getContext('2d'), {
            type: 'doughnut',
            data: { labels: cityLabels, datasets: [{ data: cityVals, backgroundColor: palette, borderWidth: 2, borderColor: 'rgba(0,0,0,0.2)' }] },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { color: '#94a3b8', font: { size: 10 }, boxWidth: 12, padding: 10 } } } }
          });

          const billingByCity = {};
          currentFilteredList.forEach(p => {
            const city = p.city || 'N/D';
            const v = parseFloat((p.billingValue || '').replace(/[^\d,]/g, '').replace(',', '.')) || 0;
            billingByCity[city] = (billingByCity[city] || 0) + v;
          });
          const billingLabels = Object.keys(billingByCity).slice(0, 8);
          const billingVals = billingLabels.map(c => billingByCity[c]);

          const ctxBilling = document.getElementById('chart-patients-billing');
          if (ctxBilling) new ChartClass(ctxBilling.getContext('2d'), {
            type: 'bar',
            data: { labels: billingLabels, datasets: [{ label: 'R$', data: billingVals, backgroundColor: palette.map(c => c + '99'), borderColor: palette, borderWidth: 1.5, borderRadius: 6 }] },
            options: {
              responsive: true, maintainAspectRatio: false,
              plugins: { legend: { display: false } },
              scales: {
                x: { ticks: { color: '#94a3b8', font: { size: 10 } }, grid: { color: 'rgba(255,255,255,0.04)' } },
                y: { ticks: { color: '#94a3b8', font: { size: 10 }, callback: v => 'R$ ' + v.toLocaleString('pt-BR') }, grid: { color: 'rgba(255,255,255,0.04)' } }
              }
            }
          });
        }, 60);
      }

    } else if (activeTab === 'encounters' && currentFilteredList.length > 0) {
      // ── KPIs Atendimentos
      const total = currentFilteredList.length;
      const urgencias = currentFilteredList.filter(e => e.type === 'Urgencia').length;
      const ambulatorio = total - urgencias;
      const finalizados = currentFilteredList.filter(e => e.status === 'Finalizado').length;
      const pctFin = total > 0 ? Math.round((finalizados / total) * 100) : 0;

      const manchesterCounts = {};
      currentFilteredList.forEach(e => { const k = e.manchesterColor || 'Não Classificado'; manchesterCounts[k] = (manchesterCounts[k] || 0) + 1; });

      const statusCounts = {};
      const statusLabels = { Aguardando_Triagem: 'Ag. Triagem', Aguardando_Atendimento: 'Ag. Consulta', Em_Atendimento: 'Em Consulta', Finalizado: 'Finalizado' };
      currentFilteredList.forEach(e => { const k = statusLabels[e.status] || e.status; statusCounts[k] = (statusCounts[k] || 0) + 1; });

      summaryContainer.innerHTML = `
        <!-- KPI Cards Atendimentos -->
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:14px;margin-bottom:18px;">
          <div class="glass-card" style="padding:16px;border-radius:14px;border:1px solid rgba(236,72,153,0.3);background:rgba(236,72,153,0.07);text-align:center;">
            <div style="font-size:1.9rem;font-weight:800;font-family:'Outfit',sans-serif;color:#ec4899;">${total}</div>
            <div style="font-size:0.72rem;text-transform:uppercase;color:var(--text-muted);margin-top:4px;">Total Atendimentos</div>
          </div>
          <div class="glass-card" style="padding:16px;border-radius:14px;border:1px solid rgba(244,63,94,0.3);background:rgba(244,63,94,0.07);text-align:center;">
            <div style="font-size:1.9rem;font-weight:800;font-family:'Outfit',sans-serif;color:#f43f5e;">${urgencias}</div>
            <div style="font-size:0.72rem;text-transform:uppercase;color:var(--text-muted);margin-top:4px;">Urgências</div>
          </div>
          <div class="glass-card" style="padding:16px;border-radius:14px;border:1px solid rgba(99,102,241,0.3);background:rgba(99,102,241,0.07);text-align:center;">
            <div style="font-size:1.9rem;font-weight:800;font-family:'Outfit',sans-serif;color:#818cf8;">${ambulatorio}</div>
            <div style="font-size:0.72rem;text-transform:uppercase;color:var(--text-muted);margin-top:4px;">Ambulatório</div>
          </div>
          <div class="glass-card" style="padding:16px;border-radius:14px;border:1px solid rgba(52,211,153,0.3);background:rgba(52,211,153,0.07);text-align:center;">
            <div style="font-size:1.9rem;font-weight:800;font-family:'Outfit',sans-serif;color:#34d399;">${pctFin}%</div>
            <div style="font-size:0.72rem;text-transform:uppercase;color:var(--text-muted);margin-top:4px;">Taxa Conclusão</div>
          </div>
        </div>

        <!-- Gráficos Atendimentos -->
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">
          <div class="glass-card" style="padding:18px;border-radius:14px;border:1px solid var(--border-color);">
            <h4 style="margin:0 0 14px;font-size:0.9rem;font-weight:700;color:var(--text-primary);display:flex;align-items:center;gap:8px;">
              <i class="fa-solid fa-shield-halved" style="color:#ec4899;"></i> Classificação Manchester
            </h4>
            <div style="position:relative;height:210px;"><canvas id="chart-enc-manchester"></canvas></div>
          </div>
          <div class="glass-card" style="padding:18px;border-radius:14px;border:1px solid var(--border-color);">
            <h4 style="margin:0 0 14px;font-size:0.9rem;font-weight:700;color:var(--text-primary);display:flex;align-items:center;gap:8px;">
              <i class="fa-solid fa-chart-bar" style="color:#818cf8;"></i> Situação dos Atendimentos
            </h4>
            <div style="position:relative;height:210px;"><canvas id="chart-enc-status"></canvas></div>
          </div>
        </div>
      `;

      if (ChartClass) {
        setTimeout(() => {
          const manchColors = { Vermelho: '#ef4444', Laranja: '#f97316', Amarelo: '#eab308', Verde: '#22c55e', Azul: '#3b82f6', 'Não Classificado': '#64748b' };
          const mLabels = Object.keys(manchesterCounts);
          const mVals = mLabels.map(k => manchesterCounts[k]);
          const mColors = mLabels.map(k => manchColors[k] || '#a78bfa');

          const ctxManch = document.getElementById('chart-enc-manchester');
          if (ctxManch) new ChartClass(ctxManch.getContext('2d'), {
            type: 'pie',
            data: { labels: mLabels, datasets: [{ data: mVals, backgroundColor: mColors, borderWidth: 2, borderColor: 'rgba(0,0,0,0.15)' }] },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { color: '#94a3b8', font: { size: 10 }, boxWidth: 12, padding: 10 } } } }
          });

          const sLabels = Object.keys(statusCounts);
          const sVals = sLabels.map(k => statusCounts[k]);
          const sPalette = ['#fbbf24','#00f2fe','#ec4899','#34d399'];

          const ctxStatus = document.getElementById('chart-enc-status');
          if (ctxStatus) new ChartClass(ctxStatus.getContext('2d'), {
            type: 'bar',
            data: { labels: sLabels, datasets: [{ label: 'Qtd', data: sVals, backgroundColor: sPalette.map(c => c + '99'), borderColor: sPalette, borderWidth: 1.5, borderRadius: 6 }] },
            options: {
              responsive: true, maintainAspectRatio: false, indexAxis: 'y',
              plugins: { legend: { display: false } },
              scales: {
                x: { ticks: { color: '#94a3b8', font: { size: 10 } }, grid: { color: 'rgba(255,255,255,0.04)' } },
                y: { ticks: { color: '#94a3b8', font: { size: 10 } }, grid: { color: 'rgba(255,255,255,0.04)' } }
              }
            }
          });
        }, 60);
      }
    }
    // ─────────────────────────────────────────────────────────────────────────
  };

  // FUNÇÕES DE EXPORTAÇÃO GLOBAL (CSV, EXCEL, PDF) E EMISSÃO DE BOLETO
  function exportHtmlCSV(columns, rows, filename) {
    const csvContent = "\uFEFF" + [
      columns.join(";"),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(";"))
    ].join("\r\n");

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `${filename}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    if (typeof showToast === 'function') showToast(`Relatório CSV '${filename}.csv' exportado com sucesso!`);
  }

  function exportHtmlXLS(columns, rows, filename) {
    const tableHTML = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head><meta charset="UTF-8"><!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet><x:Name>Relatório Health Nexus</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions></x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]--></head>
      <body style="font-family: Arial; padding: 20px;">
        <h2 style="color: #4f46e5;">Health Nexus — Relatório Oficial</h2>
        <p style="color: #64748b; font-size: 0.9rem;">Emissão: ${new Date().toLocaleString('pt-BR')}</p>
        <table border="1" style="border-collapse: collapse; width: 100%; font-family: Arial;">
          <thead>
            <tr style="background-color: #4f46e5; color: #ffffff; font-weight: bold;">
              ${columns.map(col => `<th style="padding: 10px; text-align: left;">${col}</th>`).join('')}
            </tr>
          </thead>
          <tbody>
            ${rows.map(row => `
              <tr>
                ${row.map(cell => `<td style="padding: 8px;">${cell}</td>`).join('')}
              </tr>
            `).join('')}
          </tbody>
        </table>
      </body>
      </html>
    `;
    const blob = new Blob([tableHTML], { type: 'application/vnd.ms-excel;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `${filename}.xls`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    if (typeof showToast === 'function') showToast(`Relatório Excel '${filename}.xls' gerado e baixado!`);
  }

  async function exportHtmlPDF(columns, rows, title, filename, financialSummary) {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      if (typeof showCustomAlert === 'function') {
        showCustomAlert({ title: 'Pop-up Bloqueado', message: 'Por favor, habilite pop-ups para este site nas configurações do navegador e tente novamente.', type: 'warning' });
      } else {
        alert('Por favor, habilite pop-ups para gerar a impressão/visualização em PDF.');
      }
      return;
    }

    const dateNow = new Date().toLocaleString('pt-BR');
    const fmt = v => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);

    // ---- Bloco de Resumo Financeiro (opcional) ----
    const summaryBlock = financialSummary ? `
      <div style="margin-bottom: 22px;">
        <div style="font-size: 11pt; font-weight: 700; color: #1e1b4b; border-bottom: 2px solid #6366f1; padding-bottom: 6px; margin-bottom: 12px; display: flex; align-items: center; gap: 6px;">
          📊 Resumo Executivo do Filtro
        </div>

        <!-- KPI CARDS em 3 colunas -->
        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-bottom: 14px; -webkit-print-color-adjust: exact; print-color-adjust: exact;">
          <div style="background: #f0fdf4; border: 1.5px solid #86efac; border-radius: 8px; padding: 10px 12px;">
            <div style="font-size: 7.5pt; color: #15803d; font-weight: 700; text-transform: uppercase; margin-bottom: 2px;">✅ Pagas</div>
            <div style="font-size: 13pt; font-weight: 800; color: #16a34a;">${fmt(financialSummary.pagasVal)}</div>
            <div style="font-size: 7.5pt; color: #4b5563;">${financialSummary.pagasC} parcela(s)</div>
          </div>
          <div style="background: #eff6ff; border: 1.5px solid #93c5fd; border-radius: 8px; padding: 10px 12px;">
            <div style="font-size: 7.5pt; color: #1d4ed8; font-weight: 700; text-transform: uppercase; margin-bottom: 2px;">🕐 A Vencer</div>
            <div style="font-size: 13pt; font-weight: 800; color: #2563eb;">${fmt(financialSummary.aVencerVal)}</div>
            <div style="font-size: 7.5pt; color: #4b5563;">${financialSummary.aVencerC} parcela(s)</div>
          </div>
          <div style="background: #fff1f2; border: 1.5px solid #fda4af; border-radius: 8px; padding: 10px 12px;">
            <div style="font-size: 7.5pt; color: #be123c; font-weight: 700; text-transform: uppercase; margin-bottom: 2px;">❗ Vencidas</div>
            <div style="font-size: 13pt; font-weight: 800; color: #e11d48;">${fmt(financialSummary.vencidasVal)}</div>
            <div style="font-size: 7.5pt; color: #4b5563;">${financialSummary.vencidasC} parcela(s)</div>
          </div>
          <div style="background: #f5f3ff; border: 1.5px solid #c4b5fd; border-radius: 8px; padding: 10px 12px;">
            <div style="font-size: 7.5pt; color: #7c3aed; font-weight: 700; text-transform: uppercase; margin-bottom: 2px;">⚖️ Saldo Líquido</div>
            <div style="font-size: 13pt; font-weight: 800; color: ${financialSummary.saldo >= 0 ? '#16a34a' : '#e11d48'};">${fmt(financialSummary.saldo)}</div>
            <div style="font-size: 7.5pt; color: #4b5563;">Receitas − Despesas</div>
          </div>
          <div style="background: #fffbeb; border: 1.5px solid #fcd34d; border-radius: 8px; padding: 10px 12px;">
            <div style="font-size: 7.5pt; color: #b45309; font-weight: 700; text-transform: uppercase; margin-bottom: 2px;">🏆 Bonificadas</div>
            <div style="font-size: 13pt; font-weight: 800; color: #d97706;">${fmt(financialSummary.bonificadasVal)}</div>
            <div style="font-size: 7.5pt; color: #4b5563;">${financialSummary.bonificadasC} parcela(s)</div>
          </div>
          <div style="background: #fef2f2; border: 1.5px solid #fca5a5; border-radius: 8px; padding: 10px 12px;">
            <div style="font-size: 7.5pt; color: #dc2626; font-weight: 700; text-transform: uppercase; margin-bottom: 2px;">🚫 Outras</div>
            <div style="font-size: 13pt; font-weight: 800; color: #dc2626;">${fmt((financialSummary.suspensasVal||0)+(financialSummary.canceladasVal||0)+(financialSummary.excluidasVal||0))}</div>
            <div style="font-size: 7.5pt; color: #4b5563;">Suspensas / Canceladas / Excluídas</div>
          </div>
        </div>

        <!-- GRÁFICOS como imagens base64 -->
        ${(financialSummary.donutImg || financialSummary.barImg) ? `
        <div style="display: grid; grid-template-columns: 1fr 1.6fr; gap: 12px; margin-bottom: 8px;">
          ${financialSummary.donutImg ? `
          <div style="border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px; text-align: center;">
            <div style="font-size: 8pt; font-weight: 700; color: #475569; margin-bottom: 6px;">📈 Distribuição por Status</div>
            <img src="${financialSummary.donutImg}" style="max-width: 100%; max-height: 160px; object-fit: contain;" />
          </div>` : ''}
          ${financialSummary.barImg ? `
          <div style="border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px; text-align: center;">
            <div style="font-size: 8pt; font-weight: 700; color: #475569; margin-bottom: 6px;">📊 Volume por Forma de Pagamento (R$)</div>
            <img src="${financialSummary.barImg}" style="max-width: 100%; max-height: 160px; object-fit: contain;" />
          </div>` : ''}
        </div>` : ''}
      </div>
    ` : '';

    const htmlContent = `
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="UTF-8">
        <title>${title} — Health Nexus</title>
        <style>
          @page { size: A4 portrait; margin: 15mm; }
          body { font-family: 'Segoe UI', Arial, sans-serif; color: #0f172a; margin: 0; padding: 15px; font-size: 10pt; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #6366f1; padding-bottom: 12px; margin-bottom: 18px; }
          .logo { font-size: 18pt; font-weight: bold; color: #4f46e5; }
          .sublogo { font-size: 8.5pt; color: #64748b; }
          .meta { text-align: right; font-size: 8.5pt; color: #64748b; }
          h1 { font-size: 15pt; color: #0f172a; margin-top: 0; margin-bottom: 12px; }
          table { width: 100%; border-collapse: collapse; margin-top: 12px; }
          th { background-color: #4f46e5; color: #ffffff; text-align: left; padding: 7px 9px; font-size: 8.5pt; text-transform: uppercase; letter-spacing: 0.5px; }
          td { padding: 7px 9px; border-bottom: 1px solid #e2e8f0; font-size: 9pt; }
          tr:nth-child(even) td { background-color: #f8fafc; }
          .footer { margin-top: 25px; border-top: 1px solid #cbd5e1; padding-top: 8px; font-size: 8pt; color: #94a3b8; text-align: center; }
          .badge { display: inline-block; padding: 2px 7px; border-radius: 4px; font-weight: bold; font-size: 8pt; }
          .badge-vencidas { background: #ffe4e6; color: #e11d48; }
          .badge-pagas { background: #d1fae5; color: #059669; }
          .badge-avencer { background: #e0f2fe; color: #0284c7; }
          .badge-bonificadas { background: #fef3c7; color: #d97706; }
          .badge-suspensas { background: #f3f4f6; color: #374151; }
          .badge-canceladas { background: #fee2e2; color: #dc2626; }
          .badge-excluídas { background: #fee2e2; color: #7f1d1d; }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <div class="logo">🏥 HEALTH NEXUS</div>
            <div class="sublogo">Gestão Hospitalar & Inteligência Médica</div>
          </div>
          <div class="meta">
            <div>Data de Emissão: <strong>${dateNow}</strong></div>
            <div>Documento Autenticado do Sistema</div>
          </div>
        </div>

        <h1>${title}</h1>
        <p style="font-size: 8.5pt; color: #64748b; margin-top: -6px;">Total de registros impressos: <strong>${rows.length}</strong></p>

        ${summaryBlock}

        <table>
          <thead>
            <tr>
              ${columns.map(col => `<th>${col}</th>`).join('')}
            </tr>
          </thead>
          <tbody>
            ${rows.map(row => `
              <tr>
                ${row.map((cell, idx) => {
                  if (columns[idx] === 'Status') {
                    const s = String(cell).toLowerCase().replace(/\s+/g, '');
                    return `<td><span class="badge badge-${s}">${cell}</span></td>`;
                  }
                  return `<td>${cell}</td>`;
                }).join('')}
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div class="footer">
          Health Nexus © 2026 — Sistema Integrado de Saúde Hospitalar • Documento impresso digitalmente.
        </div>
        <script>
          window.onload = function() { window.print(); };
        </script>
      </body>
      </html>
    `;

    // Escreve o conteúdo na nova janela para acionar a impressão
    printWindow.document.open();
    printWindow.document.write(htmlContent);
    printWindow.document.close();
    printWindow.focus();

    if (typeof showToast === 'function') showToast(`Visualização para impressão PDF aberta com sucesso!`);
  }

  function openPayInstallmentModal(installment, onComplete) {
    let modal = document.getElementById('modal-manual-settlement');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'modal-manual-settlement';
      modal.className = 'modal-overlay';
      document.body.appendChild(modal);
    }

    const todayStr = new Date().toISOString().split('T')[0];
    const origAmount = parseFloat(installment.amount) || 0;
    const instNumStr = (installment.installmentNumber && installment.totalInstallments) 
      ? `${installment.installmentNumber}/${installment.totalInstallments}` 
      : '1/1 (À Vista)';

    modal.innerHTML = `
      <div class="modal-card glass-card" style="max-width: 580px; width: 92%; padding: 24px; border-radius: 20px; border: 1px solid var(--border-color); background: var(--bg-secondary); color: var(--text-primary); box-shadow: 0 25px 50px -12px rgba(0,0,0,0.7); position: relative; z-index: 99999;">
        <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid var(--border-color); padding-bottom: 14px; margin-bottom: 18px;">
          <div style="display: flex; align-items: center; gap: 12px;">
            <div style="width: 42px; height: 42px; border-radius: 12px; background: linear-gradient(135deg, #10b981, #059669); display: flex; align-items: center; justify-content: center; color: #fff; font-size: 1.25rem; box-shadow: 0 4px 14px rgba(16,185,129,0.35);">
              <i class="fa-solid fa-hand-holding-dollar"></i>
            </div>
            <div>
              <h3 style="margin: 0; font-size: 1.15rem; font-weight: 700; font-family: 'Outfit', sans-serif;">Baixa Manual de Parcela</h3>
              <span style="font-size: 0.78rem; color: var(--text-muted);">Quitação de Título Financeiro • Nosso Nº: <strong>${installment.id}</strong></span>
            </div>
          </div>
          <button id="close-pay-modal-btn" class="btn-icon" style="background: rgba(255,255,255,0.08); border: 1px solid var(--border-color); width: 34px; height: 34px; border-radius: 50%; font-size: 1.1rem; color: var(--text-primary); cursor: pointer; display: flex; align-items: center; justify-content: center;"><i class="fa-solid fa-xmark"></i></button>
        </div>

        <div style="background: rgba(0,0,0,0.2); border: 1px solid var(--border-color); border-radius: 12px; padding: 14px; margin-bottom: 18px; font-size: 0.84rem;">
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
            <div><span style="color: var(--text-muted); display: block; font-size: 0.74rem;">PACIENTE / FAVORECIDO</span><strong>${installment.client || installment.patientName || 'Cliente Particular'}</strong></div>
            <div><span style="color: var(--text-muted); display: block; font-size: 0.74rem;">Nº PARCELA</span><strong style="color: #00f2fe;">${instNumStr}</strong></div>
            <div><span style="color: var(--text-muted); display: block; font-size: 0.74rem;">DESCRIÇÃO / SERVIÇO</span><span>${installment.desc || installment.description || 'Consulta Médica'}</span></div>
            <div><span style="color: var(--text-muted); display: block; font-size: 0.74rem;">VALOR ORIGINAL</span><strong style="color: #34d399; font-size: 1rem;">${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(origAmount)}</strong></div>
          </div>
        </div>

        <form id="pay-installment-form">
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 14px;">
            <div>
              <label style="font-size: 0.8rem; font-weight: 600; color: var(--text-primary); display: block; margin-bottom: 6px;">Data do Pagamento *</label>
              <input type="date" id="pay-date-input" value="${todayStr}" required style="width: 100%; padding: 8px 12px; border-radius: 8px; border: 1px solid var(--border-color); background: var(--bg-tertiary); color: var(--text-primary); font-size: 0.86rem;">
            </div>
            <div>
              <label style="font-size: 0.8rem; font-weight: 600; color: var(--text-primary); display: block; margin-bottom: 6px;">Forma de Pagamento Efetiva *</label>
              <select id="pay-method-input" required style="width: 100%; padding: 8px 12px; border-radius: 8px; border: 1px solid var(--border-color); background: var(--bg-tertiary); color: var(--text-primary); font-size: 0.86rem;">
                <option value="Pix" ${installment.paymentMethod === 'Pix' ? 'selected' : ''}>Pix (Transferência Instantânea)</option>
                <option value="Boleto" ${installment.paymentMethod === 'Boleto' ? 'selected' : ''}>Boleto Bancário</option>
                <option value="Cartão de Crédito" ${installment.paymentMethod === 'Cartão de Crédito' ? 'selected' : ''}>Cartão de Crédito</option>
                <option value="Cartão de Débito" ${installment.paymentMethod === 'Cartão de Débito' ? 'selected' : ''}>Cartão de Débito</option>
                <option value="Dinheiro" ${installment.paymentMethod === 'Dinheiro' ? 'selected' : ''}>Dinheiro / Espécie</option>
                <option value="Convênio" ${installment.paymentMethod === 'Convênio' ? 'selected' : ''}>Faturamento Convênio</option>
              </select>
            </div>
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; margin-bottom: 14px;">
            <div>
              <label style="font-size: 0.78rem; font-weight: 600; color: var(--text-primary); display: block; margin-bottom: 6px;">Valor Pago (R$) *</label>
              <input type="number" step="0.01" id="pay-amount-input" value="${origAmount.toFixed(2)}" required style="width: 100%; padding: 8px 12px; border-radius: 8px; border: 1px solid var(--border-color); background: var(--bg-tertiary); color: #34d399; font-weight: 700; font-size: 0.9rem;">
            </div>
            <div>
              <label style="font-size: 0.78rem; font-weight: 600; color: var(--text-primary); display: block; margin-bottom: 6px;">Desconto (R$)</label>
              <input type="number" step="0.01" id="pay-discount-input" value="0.00" style="width: 100%; padding: 8px 12px; border-radius: 8px; border: 1px solid var(--border-color); background: var(--bg-tertiary); color: var(--text-primary); font-size: 0.86rem;">
            </div>
            <div>
              <label style="font-size: 0.78rem; font-weight: 600; color: var(--text-primary); display: block; margin-bottom: 6px;">Juros / Multa (R$)</label>
              <input type="number" step="0.01" id="pay-interest-input" value="0.00" style="width: 100%; padding: 8px 12px; border-radius: 8px; border: 1px solid var(--border-color); background: var(--bg-tertiary); color: var(--text-primary); font-size: 0.86rem;">
            </div>
          </div>

          <div style="margin-bottom: 20px;">
            <label style="font-size: 0.8rem; font-weight: 600; color: var(--text-primary); display: block; margin-bottom: 6px;">Observação / Nº do Comprovante</label>
            <input type="text" id="pay-notes-input" placeholder="Ex: Aut. Pix 987654321 - Quitado no caixa hospitalar" style="width: 100%; padding: 8px 12px; border-radius: 8px; border: 1px solid var(--border-color); background: var(--bg-tertiary); color: var(--text-primary); font-size: 0.86rem;">
          </div>

          <div style="display: flex; gap: 10px; justify-content: flex-end;">
            <button type="button" id="cancel-pay-modal-btn" class="btn btn-outline" style="font-size: 0.85rem; padding: 8px 16px;">Cancelar</button>
            <button type="submit" class="btn btn-primary" style="background: linear-gradient(135deg, #10b981, #059669); color: #fff; font-weight: 700; font-size: 0.88rem; padding: 8px 20px; border-radius: 8px; box-shadow: 0 4px 12px rgba(16,185,129,0.3); cursor: pointer;">
              <i class="fa-solid fa-check"></i> Confirmar Baixa Manual
            </button>
          </div>
        </form>
      </div>
    `;

    modal.style.display = 'flex';

    const closeModal = () => { modal.style.display = 'none'; };
    document.getElementById('close-pay-modal-btn')?.addEventListener('click', closeModal);
    document.getElementById('cancel-pay-modal-btn')?.addEventListener('click', closeModal);

    document.getElementById('pay-installment-form')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const payDate = document.getElementById('pay-date-input').value;
      const payMethod = document.getElementById('pay-method-input').value;
      const amountPaid = parseFloat(document.getElementById('pay-amount-input').value) || origAmount;
      const discount = parseFloat(document.getElementById('pay-discount-input').value) || 0;
      const interest = parseFloat(document.getElementById('pay-interest-input').value) || 0;
      const notes = document.getElementById('pay-notes-input').value;

      try {
        const response = await apiFetch('/api/financial/installments/' + installment.id + '/pay', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            paymentDate: payDate,
            amountPaid: amountPaid,
            paymentMethod: payMethod,
            discount: discount,
            interest: interest,
            notes: notes
          })
        });

        if (response.ok) {
          closeModal();
          if (typeof showToast === 'function') showToast(`✅ Baixa manual da parcela ${installment.id} efetuada com sucesso!`);
          if (typeof onComplete === 'function') onComplete();
        } else {
          alert('Erro ao efetuar baixa manual.');
        }
      } catch (err) {
        console.error(err);
        alert('Erro na comunicação com o servidor.');
      }
    });
  }

  function openFinancialListWindowModal(installmentsList, onRefresh) {
    // Expor dados do modal para exportação global
    window._modalFinTitlesList = installmentsList;
    let modal = document.getElementById('modal-financial-results-window');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'modal-financial-results-window';
      modal.className = 'modal-overlay';
      document.body.appendChild(modal);
    }

    // ---- Computar KPIs completos (todos os 7 status) ----
    let totalReceitas = 0, totalDespesas = 0;
    let pagasCount = 0, aVencerCount = 0, vencidasCount = 0;
    const saldoLiquido_ref = { val: 0 };
    const hasPEP = state.user && (state.user.role === 'Médico' || state.user.role === 'Enfermeiro');
    let pagasVal = 0, aVencerVal = 0, vencidasVal = 0, bonificadasVal = 0, suspensasVal = 0, canceladasVal = 0, excluidasVal = 0;
    let pagasC = 0, aVencerC = 0, vencidasC = 0, bonificadasC = 0, suspensasC = 0, canceladasC = 0, excluidasC = 0;
    installmentsList.forEach(t => {
      const v = parseFloat(t.amount) || 0;
      if (t.type === 'Despesa') totalDespesas += v; else totalReceitas += v;
      switch(t.status) {
        case 'Pagas':       pagasC++;       pagasVal += v;       break;
        case 'A Vencer':    aVencerC++;     aVencerVal += v;     break;
        case 'Vencidas':    vencidasC++;    vencidasVal += v;    break;
        case 'Bonificadas': bonificadasC++; bonificadasVal += v; break;
        case 'Suspensas':   suspensasC++;   suspensasVal += v;   break;
        case 'Canceladas':  canceladasC++;  canceladasVal += v;  break;
        case 'Excluídas':   excluidasC++;   excluidasVal += v;   break;
      }
    });

    // Recalcular com os totais corretos
    pagasCount = pagasC; aVencerCount = aVencerC; vencidasCount = vencidasC;
    const saldoLiquido = totalReceitas - totalDespesas;
    const totalGeral = pagasVal + aVencerVal + vencidasVal + bonificadasVal + suspensasVal + canceladasVal + excluidasVal;
    const fmt = v => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

    // Formas de pagamento para gráfico de barras
    const methodMap = {};
    installmentsList.forEach(t => {
      const m = t.paymentMethod || 'Pix';
      if (!methodMap[m]) methodMap[m] = 0;
      methodMap[m] += parseFloat(t.amount) || 0;
    });

    modal.innerHTML = `
      <div class="modal-card glass-card" style="max-width: 1280px; width: 97%; padding: 24px; border-radius: 20px; border: 1px solid var(--border-color); background: var(--bg-secondary); color: var(--text-primary); max-height: 94vh; overflow-y: auto; box-shadow: 0 25px 60px -12px rgba(0,0,0,0.85); position: relative;">
        
        <!-- CABEÇALHO STICKY -->
        <div style="position: sticky; top: -24px; z-index: 40; background: var(--bg-secondary); border-bottom: 1px solid var(--border-color); padding: 14px 20px; margin: -24px -24px 0 -24px; border-top-left-radius: 20px; border-top-right-radius: 20px; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px; backdrop-filter: blur(12px);">
          <div style="display: flex; align-items: center; gap: 12px;">
            <div style="width: 42px; height: 42px; border-radius: 12px; background: linear-gradient(135deg, #00f2fe, #4f46e5); display: flex; align-items: center; justify-content: center; font-size: 1.25rem; color: #fff; box-shadow: 0 4px 14px rgba(0,242,254,0.3);">
              <i class="fa-solid fa-chart-line"></i>
            </div>
            <div>
              <h3 style="margin: 0; font-size: 1.2rem; font-weight: 700; font-family: 'Outfit', sans-serif;">Janela Dedicada: Títulos Financeiros & Parcelas</h3>
              <span style="font-size: 0.78rem; color: var(--text-muted);">${installmentsList.length} títulos no filtro ativo • Total geral: ${fmt(totalGeral)}</span>
            </div>
          </div>
          <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
            <button id="modal-fin-btn-pdf" class="btn btn-primary" style="background: linear-gradient(135deg, #ef4444, #dc2626); font-size: 0.78rem; padding: 6px 12px;"><i class="fa-solid fa-file-pdf"></i> PDF</button>
            <button id="modal-fin-btn-xls" class="btn btn-primary" style="background: linear-gradient(135deg, #10b981, #059669); font-size: 0.78rem; padding: 6px 12px;"><i class="fa-solid fa-file-excel"></i> Excel</button>
            <button id="modal-fin-btn-csv" class="btn btn-outline" style="font-size: 0.78rem; padding: 6px 12px;"><i class="fa-solid fa-file-csv"></i> CSV</button>
            <button id="modal-fin-btn-batch-pay" class="btn btn-primary" style="background: linear-gradient(135deg, #3b82f6, #1d4ed8); font-size: 0.78rem; padding: 6px 14px; display: none;"><i class="fa-solid fa-check-double"></i> Baixar Lote (<span id="modal-fin-batch-count">0</span>)</button>
            <button id="close-modal-fin-window" class="btn-icon" style="background: rgba(255,255,255,0.08); border: 1px solid var(--border-color); width: 34px; height: 34px; border-radius: 50%; font-size: 1.1rem; color: var(--text-primary); cursor: pointer; display: flex; align-items: center; justify-content: center;"><i class="fa-solid fa-xmark"></i></button>
          </div>
        </div>

        <!-- KPI CARDS RESUMO -->
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 12px; margin: 18px 0;">
          <div style="background: linear-gradient(135deg, rgba(52,211,153,0.12), rgba(52,211,153,0.04)); border: 1px solid rgba(52,211,153,0.35); border-radius: 14px; padding: 14px 16px;">
            <div style="font-size: 0.7rem; color: #34d399; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px;"><i class="fa-solid fa-circle-check"></i> Pagas</div>
            <div style="font-family: 'Outfit'; font-size: 1.3rem; font-weight: 800; color: #34d399;">${fmt(pagasVal)}</div>
            <div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 2px;">${pagasC} parcelas</div>
          </div>
          <div style="background: linear-gradient(135deg, rgba(0,242,254,0.12), rgba(0,242,254,0.04)); border: 1px solid rgba(0,242,254,0.35); border-radius: 14px; padding: 14px 16px;">
            <div style="font-size: 0.7rem; color: #00f2fe; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px;"><i class="fa-solid fa-clock"></i> A Vencer</div>
            <div style="font-family: 'Outfit'; font-size: 1.3rem; font-weight: 800; color: #00f2fe;">${fmt(aVencerVal)}</div>
            <div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 2px;">${aVencerC} parcelas</div>
          </div>
          <div style="background: linear-gradient(135deg, rgba(244,63,94,0.12), rgba(244,63,94,0.04)); border: 1px solid rgba(244,63,94,0.35); border-radius: 14px; padding: 14px 16px;">
            <div style="font-size: 0.7rem; color: #f43f5e; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px;"><i class="fa-solid fa-circle-exclamation"></i> Vencidas</div>
            <div style="font-family: 'Outfit'; font-size: 1.3rem; font-weight: 800; color: #f43f5e;">${fmt(vencidasVal)}</div>
            <div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 2px;">${vencidasC} parcelas</div>
          </div>
          <div style="background: linear-gradient(135deg, rgba(52,211,153,0.08), rgba(244,63,94,0.08)); border: 1px solid rgba(255,255,255,0.12); border-radius: 14px; padding: 14px 16px;">
            <div style="font-size: 0.7rem; color: var(--text-muted); font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px;"><i class="fa-solid fa-scale-balanced"></i> Saldo Líquido</div>
            <div style="font-family: 'Outfit'; font-size: 1.3rem; font-weight: 800; color: ${saldoLiquido >= 0 ? '#34d399' : '#f43f5e'};">${fmt(saldoLiquido)}</div>
            <div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 2px;">Receitas − Despesas</div>
          </div>
          <div style="background: linear-gradient(135deg, rgba(251,191,36,0.08), rgba(251,191,36,0.04)); border: 1px solid rgba(251,191,36,0.25); border-radius: 14px; padding: 14px 16px;">
            <div style="font-size: 0.7rem; color: #fbbf24; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px;"><i class="fa-solid fa-award"></i> Bonificadas</div>
            <div style="font-family: 'Outfit'; font-size: 1.3rem; font-weight: 800; color: #fbbf24;">${fmt(bonificadasVal)}</div>
            <div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 2px;">${bonificadasC} parcelas</div>
          </div>
          <div style="background: linear-gradient(135deg, rgba(248,113,113,0.08), rgba(248,113,113,0.04)); border: 1px solid rgba(248,113,113,0.2); border-radius: 14px; padding: 14px 16px;">
            <div style="font-size: 0.7rem; color: #f87171; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px;"><i class="fa-solid fa-ban"></i> Outras</div>
            <div style="font-family: 'Outfit'; font-size: 1.3rem; font-weight: 800; color: #f87171;">${fmt(suspensasVal + canceladasVal + excluidasVal)}</div>
            <div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 2px;">${suspensasC + canceladasC + excluidasC} parcelas</div>
          </div>
        </div>

        <!-- SEÇÃO DE GRÁFICOS -->
        <div style="display: grid; grid-template-columns: 280px 1fr; gap: 16px; margin-bottom: 20px; align-items: stretch;">
          <!-- Gráfico de Rosca: Distribuição por Status -->
          <div style="background: rgba(0,0,0,0.2); border: 1px solid var(--border-color); border-radius: 14px; padding: 16px;">
            <div style="font-size: 0.8rem; font-weight: 700; color: var(--text-primary); margin-bottom: 12px; display: flex; align-items: center; gap: 6px;">
              <i class="fa-solid fa-chart-pie" style="color:#00f2fe;"></i> Distribuição por Status
            </div>
            <div style="position: relative; height: 190px; display: flex; align-items: center; justify-content: center;">
              <canvas id="modal-fin-donut-chart"></canvas>
            </div>
          </div>
          <!-- Gráfico de Barras: Volume por Forma de Pagamento -->
          <div style="background: rgba(0,0,0,0.2); border: 1px solid var(--border-color); border-radius: 14px; padding: 16px;">
            <div style="font-size: 0.8rem; font-weight: 700; color: var(--text-primary); margin-bottom: 12px; display: flex; align-items: center; gap: 6px;">
              <i class="fa-solid fa-chart-bar" style="color:#a855f7;"></i> Volume por Forma de Pagamento (R$)
            </div>
            <div style="position: relative; height: 190px;">
              <canvas id="modal-fin-bar-chart"></canvas>
            </div>
          </div>
        </div>

        <!-- TABELA DE PARCELAS -->
        <div style="border-radius: 12px; overflow: hidden; border: 1px solid var(--border-color); margin-bottom: 20px;">
          <table style="width: 100%; border-collapse: collapse; font-size: 0.84rem;">
            <thead>
              <tr style="background: var(--bg-tertiary); border-bottom: 1px solid var(--border-color);">
                <th style="padding: 10px 12px; width: 36px; text-align: center;"><input type="checkbox" id="modal-fin-select-all" style="cursor:pointer;"></th>
                <th style="padding: 10px 12px; font-size: 0.72rem; color: var(--text-muted); text-transform: uppercase;">Nosso Número</th>
                <th style="padding: 10px 12px; font-size: 0.72rem; color: var(--text-muted); text-transform: uppercase;">Paciente / Favorecido</th>
                <th style="padding: 10px 12px; font-size: 0.72rem; color: var(--text-muted); text-transform: uppercase;">Descrição / Categoria</th>
                <th style="padding: 10px 12px; font-size: 0.72rem; color: var(--text-muted); text-transform: uppercase; text-align: center;">Parcela</th>
                <th style="padding: 10px 12px; font-size: 0.72rem; color: var(--text-muted); text-transform: uppercase; text-align: center;">Vencimento</th>
                <th style="padding: 10px 12px; font-size: 0.72rem; color: var(--text-muted); text-transform: uppercase; text-align: center;">Forma Pagto</th>
                <th style="padding: 10px 12px; font-size: 0.72rem; color: var(--text-muted); text-transform: uppercase; text-align: right;">Valor (R$)</th>
                <th style="padding: 10px 12px; font-size: 0.72rem; color: var(--text-muted); text-transform: uppercase; text-align: center;">Status</th>
                <th style="padding: 10px 12px; font-size: 0.72rem; color: var(--text-muted); text-transform: uppercase; text-align: center;">Ações</th>
              </tr>
            </thead>
            <tbody>
              ${installmentsList.length === 0 ? `
                <tr><td colspan="10" style="text-align:center; padding: 24px; color: var(--text-muted);">Nenhum título financeiro encontrado para os filtros selecionados.</td></tr>
              ` : installmentsList.map(t => {
                const instStr = (t.installmentNumber && t.totalInstallments) ? `${t.installmentNumber}/${t.totalInstallments}` : '1/1';
                const clientName = hasPEP ? t.client : (typeof abbreviateName === 'function' ? abbreviateName(t.client) : t.client);
                return `
                  <tr style="border-bottom: 1px solid var(--border-color); transition: background 0.15s ease;" onmouseover="this.style.background='rgba(255,255,255,0.03)'" onmouseout="this.style.background=''">
                    <td style="padding: 10px 12px; text-align: center;"><input type="checkbox" class="modal-fin-row-check" data-id="${t.id}" style="cursor:pointer;"></td>
                    <td style="padding: 10px 12px; font-family: monospace; font-weight: 700; color: var(--color-primary); font-size: 0.84rem;">${t.id}</td>
                    <td style="padding: 10px 12px; font-weight: 600; color: var(--text-primary); font-size: 0.86rem;">${clientName}</td>
                    <td style="padding: 10px 12px; font-size: 0.82rem; color: var(--text-secondary);">${t.desc} <span style="font-size:0.7rem; padding:1px 6px; border-radius:8px; background:rgba(255,255,255,0.06); margin-left:4px;">${t.category || 'Geral'}</span></td>
                    <td style="padding: 10px 12px; text-align: center; font-size: 0.8rem; font-weight: 700; color: #00f2fe;">${instStr}</td>
                    <td style="padding: 10px 12px; text-align: center; font-size: 0.82rem; color: var(--text-secondary);">${t.dueDate}</td>
                    <td style="padding: 10px 12px; text-align: center; font-size: 0.78rem;"><span style="padding: 2px 8px; border-radius: 10px; background: rgba(255,255,255,0.06); font-weight: 600;">${t.paymentMethod || 'Pix'}</span></td>
                    <td style="padding: 10px 12px; text-align: right; font-family: monospace; font-weight: 700; color: ${t.color}; font-size: 0.88rem;">${t.amountFormatted}</td>
                    <td style="padding: 10px 12px; text-align: center;">
                      <span style="padding: 3px 10px; border-radius: 20px; font-size: 0.72rem; font-weight: 700; background: ${t.color}1e; color: ${t.color}; border: 1px solid ${t.color}40;">${t.status}</span>
                    </td>
                    <td style="padding: 10px 12px; text-align: center;">
                      <div style="display: flex; gap: 6px; justify-content: center;">
                        <button class="btn btn-outline modal-btn-boleto" style="font-size: 0.72rem; padding: 4px 8px;" data-id="${t.id}" data-client="${t.client}" data-desc="${t.desc}" data-duedate="${t.dueDate}" data-amount="${t.amountFormatted}" data-val="${t.amount}"><i class="fa-solid fa-barcode"></i> 2ª Via</button>
                        ${t.status !== 'Pagas' ? `<button class="btn btn-primary modal-btn-pay" style="background: linear-gradient(135deg, #10b981, #059669); font-size: 0.72rem; padding: 4px 10px; border-radius: 6px; cursor: pointer;" data-id="${t.id}"><i class="fa-solid fa-hand-holding-dollar"></i> Quitar</button>` : ''}
                      </div>
                    </td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;

    modal.style.display = 'flex';

    // ---- Renderizar gráficos após o DOM estar pronto ----
    setTimeout(() => {
      // Gráfico de Rosca - Status
      const donutCtx = document.getElementById('modal-fin-donut-chart');
      if (donutCtx && window.Chart) {
        const donutData = [
          { label: 'Pagas', value: pagasVal, color: '#34d399' },
          { label: 'A Vencer', value: aVencerVal, color: '#00f2fe' },
          { label: 'Vencidas', value: vencidasVal, color: '#f43f5e' },
          { label: 'Bonificadas', value: bonificadasVal, color: '#fbbf24' },
          { label: 'Suspensas', value: suspensasVal, color: '#a855f7' },
          { label: 'Canceladas', value: canceladasVal, color: '#f97316' },
          { label: 'Excluídas', value: excluidasVal, color: '#dc2626' },
        ].filter(d => d.value > 0);

        new window.Chart(donutCtx, {
          type: 'doughnut',
          data: {
            labels: donutData.map(d => d.label),
            datasets: [{
              data: donutData.map(d => d.value),
              backgroundColor: donutData.map(d => d.color + '99'),
              borderColor: donutData.map(d => d.color),
              borderWidth: 2,
              hoverOffset: 6
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '65%',
            plugins: {
              legend: { position: 'right', labels: { color: '#94a3b8', font: { size: 10 }, boxWidth: 10, padding: 8 } },
              tooltip: { callbacks: { label: ctx => ` ${ctx.label}: ${fmt(ctx.parsed)}` } }
            }
          }
        });
      }

      // Gráfico de Barras - Forma de Pagamento
      const barCtx = document.getElementById('modal-fin-bar-chart');
      if (barCtx && window.Chart) {
        const methods = Object.keys(methodMap);
        const methodColors = ['#6366f1','#34d399','#00f2fe','#f43f5e','#fbbf24','#a855f7'];
        new window.Chart(barCtx, {
          type: 'bar',
          data: {
            labels: methods,
            datasets: [{
              label: 'Valor Total (R$)',
              data: methods.map(m => methodMap[m]),
              backgroundColor: methods.map((_, i) => methodColors[i % methodColors.length] + 'bb'),
              borderColor: methods.map((_, i) => methodColors[i % methodColors.length]),
              borderWidth: 1.5,
              borderRadius: 6,
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: { display: false },
              tooltip: { callbacks: { label: ctx => ` ${fmt(ctx.parsed.y)}` } }
            },
            scales: {
              x: { ticks: { color: '#94a3b8', font: { size: 10 } }, grid: { color: 'rgba(255,255,255,0.04)' } },
              y: { ticks: { color: '#94a3b8', font: { size: 10 }, callback: v => 'R$' + (v/1000).toFixed(1) + 'k' }, grid: { color: 'rgba(255,255,255,0.06)' } }
            }
          }
        });
      }
    }, 80);

    const closeModal = () => { modal.style.display = 'none'; };
    document.getElementById('close-modal-fin-window')?.addEventListener('click', closeModal);

    const selectAll = document.getElementById('modal-fin-select-all');
    const batchBtn = document.getElementById('modal-fin-btn-batch-pay');
    const batchCount = document.getElementById('modal-fin-batch-count');

    const updateBatchState = () => {
      const checked = document.querySelectorAll('.modal-fin-row-check:checked');
      if (checked.length > 0) {
        batchBtn.style.display = 'inline-flex';
        batchCount.textContent = checked.length;
      } else {
        batchBtn.style.display = 'none';
      }
    };

    selectAll?.addEventListener('change', (e) => {
      document.querySelectorAll('.modal-fin-row-check').forEach(cb => {
        cb.checked = e.target.checked;
      });
      updateBatchState();
    });

    document.querySelectorAll('.modal-fin-row-check').forEach(cb => {
      cb.addEventListener('change', updateBatchState);
    });

    batchBtn?.addEventListener('click', async () => {
      const checked = [...document.querySelectorAll('.modal-fin-row-check:checked')].map(c => c.dataset.id);
      if (checked.length === 0) return;
      if (confirm(`Confirmar baixa manual em lote de ${checked.length} parcelas selecionadas?`)) {
        try {
          const response = await apiFetch('/api/financial/installments/pay-batch', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ids: checked, notes: 'Baixa em lote realizada pela janela dedicada' })
          });
          if (response.ok) {
            if (typeof showToast === 'function') showToast(`✅ ${checked.length} parcelas baixadas com sucesso!`);
            closeModal();
            if (typeof onRefresh === 'function') onRefresh();
          } else {
            alert('Erro ao efetuar baixa em lote.');
          }
        } catch (err) {
          console.error(err);
        }
      }
    });

    document.querySelectorAll('.modal-btn-boleto').forEach(btn => {
      btn.addEventListener('click', () => {
        openBoletoModal({
          id: btn.dataset.id,
          client: btn.dataset.client,
          desc: btn.dataset.desc,
          dueDate: btn.dataset.duedate,
          amountFormatted: btn.dataset.amount,
          amount: parseFloat(btn.dataset.val) || 0
        });
      });
    });

    document.querySelectorAll('.modal-btn-pay').forEach(btn => {
      btn.addEventListener('click', () => {
        const item = installmentsList.find(t => t.id === btn.dataset.id);
        if (item) {
          openPayInstallmentModal(item, () => {
            closeModal();
            if (typeof onRefresh === 'function') onRefresh();
          });
        }
      });
    });

    document.getElementById('modal-fin-btn-pdf')?.addEventListener('click', () => processExport('pdf'));
    document.getElementById('modal-fin-btn-xls')?.addEventListener('click', () => processExport('xls'));
    document.getElementById('modal-fin-btn-csv')?.addEventListener('click', () => processExport('csv'));
  }

  function openBoletoModal(t) {
    let modal = document.getElementById('modal-boleto-2via');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'modal-boleto-2via';
      modal.className = 'modal-overlay';
      document.body.appendChild(modal);
    }

    const linhaDigitavel = `34191.79001 01043.510047 91020.150008 5 94100000035000`;
    const pixCopyPaste = `00020126580014br.gov.bcb.pix0136123e4567-e89b-12d3-a456-426614174000520400005303986540${t.amount ? t.amount.toFixed(2) : '350.00'}5802BR5912HEALTH NEXUS6009SAO PAULO62070503***6304A1B2`;

    modal.innerHTML = `
      <div class="modal-card glass-card" style="max-width: 840px; width: 94%; padding: 24px; border-radius: 20px; border: 1px solid var(--border-color); background: var(--bg-secondary); color: var(--text-primary); max-height: 90vh; overflow-y: auto; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.6); position: relative;">
        
        <!-- CABEÇALHO DO MODAL COM AÇÕES RÁPIDAS (FIXO AO ROLAR) -->
        <div style="position: sticky; top: -24px; z-index: 30; background: var(--bg-secondary); border-bottom: 1px solid var(--border-color); padding: 14px 24px; margin: -24px -24px 18px -24px; border-top-left-radius: 20px; border-top-right-radius: 20px; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px; backdrop-filter: blur(12px);">
          <div style="display: flex; align-items: center; gap: 12px;">
            <div style="width: 40px; height: 40px; border-radius: 10px; background: linear-gradient(135deg, #4f46e5, #3730a3); display: flex; align-items: center; justify-content: center; font-size: 1.2rem; color: #fff; box-shadow: 0 4px 12px rgba(79,70,229,0.3);">
              <i class="fa-solid fa-barcode"></i>
            </div>
            <div>
              <h3 style="margin: 0; font-size: 1.15rem; font-weight: 700; font-family: 'Outfit', sans-serif;">2ª Via do Boleto Bancário FEBRABAN</h3>
              <span style="font-size: 0.78rem; color: var(--text-muted);">Nosso Número: <strong>${t.id}</strong> • Health Nexus Bank (341-7)</span>
            </div>
          </div>
          
          <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
            <button id="btn-copy-linha-top" class="btn btn-outline" style="font-size: 0.78rem; padding: 6px 12px; border-color: rgba(99,102,241,0.4);"><i class="fa-solid fa-copy"></i> Copiar Linha</button>
            <button id="btn-copy-pix-top" class="btn btn-outline" style="font-size: 0.78rem; padding: 6px 12px; border-color: rgba(52,211,153,0.4); color: #34d399;"><i class="fa-solid fa-qrcode"></i> Copiar Pix</button>
            <button id="btn-print-boleto" class="btn btn-primary" style="font-size: 0.78rem; padding: 6px 14px; background: linear-gradient(135deg, #6366f1, #4f46e5);"><i class="fa-solid fa-print"></i> Imprimir PDF</button>
            <button id="close-boleto-modal" class="btn-icon" style="background: rgba(255,255,255,0.08); border: 1px solid var(--border-color); width: 34px; height: 34px; border-radius: 50%; font-size: 1.1rem; color: var(--text-primary); cursor: pointer; display: flex; align-items: center; justify-content: center;" title="Fechar Janela (ESC)"><i class="fa-solid fa-xmark"></i></button>
          </div>
        </div>

        <!-- PAINEL PIX (QR CODE COMPACTO) -->
        <div style="background: rgba(52, 211, 153, 0.06); border: 1px dashed rgba(52, 211, 153, 0.3); border-radius: 12px; padding: 12px 18px; margin-bottom: 20px; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px;">
          <div style="display: flex; align-items: center; gap: 14px;">
            <div style="width: 48px; height: 48px; background: #fff; border-radius: 8px; padding: 4px; display: flex; align-items: center; justify-content: center; border: 1px solid rgba(52, 211, 153, 0.4);">
              <i class="fa-solid fa-qrcode" style="font-size: 2.2rem; color: #0d9488;"></i>
            </div>
            <div>
              <div style="font-size: 0.85rem; font-weight: 700; color: #34d399;">Pagamento Instantâneo via Pix</div>
              <div style="font-size: 0.76rem; color: var(--text-muted);">Escaneie com o app do seu banco para quitação em tempo real.</div>
            </div>
          </div>
          <button id="btn-copy-pix-banner" class="btn" style="background: #0d9488; color: #fff; font-size: 0.78rem; padding: 6px 14px; border-radius: 8px; border: none; font-weight: 600; cursor: pointer;">
            <i class="fa-solid fa-copy"></i> Copiar Pix Copia e Cola
          </button>
        </div>

        <!-- ESTRUTURA OFICIAL DO BOLETO FEBRABAN COM LOGO -->
        <div id="printable-boleto-area" style="background: #ffffff; color: #000000; padding: 24px; border-radius: 10px; border: 1px solid #cbd5e1; font-family: 'Arial', sans-serif; box-shadow: 0 4px 15px rgba(0,0,0,0.15);">
          
          <!-- 1. RECIBO DO PAGADOR (CANHOTO SUPERIOR COM LOGOTIPO) -->
          <div style="margin-bottom: 12px;">
            <div style="display: flex; align-items: center; border-bottom: 2px solid #000; padding-bottom: 6px; margin-bottom: 6px;">
              <!-- LOGO BRANDED HEALTH NEXUS -->
              <div style="display: flex; align-items: center; gap: 8px; flex: 1;">
                <div style="width: 32px; height: 32px; border-radius: 8px; background: linear-gradient(135deg, #4f46e5, #3730a3); display: flex; align-items: center; justify-content: center; color: #ffffff; font-size: 1.05rem; box-shadow: 0 2px 6px rgba(79,70,229,0.3);">
                  <i class="fa-solid fa-heart-pulse"></i>
                </div>
                <div>
                  <div style="font-size: 1.15rem; font-weight: 900; color: #1e1b4b; font-family: 'Outfit', sans-serif; line-height: 1; letter-spacing: -0.4px;">HEALTH <span style="color: #4f46e5;">NEXUS</span></div>
                  <div style="font-size: 0.58rem; font-weight: 800; color: #64748b; letter-spacing: 1.2px; text-transform: uppercase; margin-top: 2px;">BANK • GESTÃO HOSPITALAR</div>
                </div>
              </div>

              <span style="font-size: 1.1rem; font-weight: 900; border-left: 2px solid #000; border-right: 2px solid #000; padding: 0 12px; margin-right: 12px;">341-7</span>
              <span style="font-size: 0.85rem; font-weight: 700; font-family: monospace; letter-spacing: 0.5px;">RECIBO DO PAGADOR</span>
            </div>

            <!-- TABELA CANHOTO -->
            <table style="width: 100%; border-collapse: collapse; border: 1px solid #000; font-size: 7.5pt; margin-bottom: 8px;">
              <tr>
                <td style="border: 1px solid #000; padding: 4px 6px; width: 50%;">
                  <span style="color: #475569; display: block; font-size: 6.5pt; text-transform: uppercase;">Beneficiário</span>
                  <strong style="font-size: 8.5pt;">Health Nexus Serviços Médicos Hospitalares Ltda - CNPJ: 42.109.843/0001-90</strong>
                </td>
                <td style="border: 1px solid #000; padding: 4px 6px; width: 25%;">
                  <span style="color: #475569; display: block; font-size: 6.5pt; text-transform: uppercase;">Agência / Código Beneficiário</span>
                  <strong style="font-size: 8.5pt;">0412 / 00948-2</strong>
                </td>
                <td style="border: 1px solid #000; padding: 4px 6px; width: 25%;">
                  <span style="color: #475569; display: block; font-size: 6.5pt; text-transform: uppercase;">Vencimento</span>
                  <strong style="font-size: 9pt; color: #e11d48;">${t.dueDate}</strong>
                </td>
              </tr>
              <tr>
                <td style="border: 1px solid #000; padding: 4px 6px;">
                  <span style="color: #475569; display: block; font-size: 6.5pt; text-transform: uppercase;">Pagador / Paciente</span>
                  <strong style="font-size: 8.5pt;">${t.client}</strong>
                </td>
                <td style="border: 1px solid #000; padding: 4px 6px;">
                  <span style="color: #475569; display: block; font-size: 6.5pt; text-transform: uppercase;">Nosso Número</span>
                  <strong style="font-size: 8.5pt;">175/00948201-9 (${t.id})</strong>
                </td>
                <td style="border: 1px solid #000; padding: 4px 6px;">
                  <span style="color: #475569; display: block; font-size: 6.5pt; text-transform: uppercase;">Valor do Documento</span>
                  <strong style="font-size: 9.5pt; color: #059669;">${t.amountFormatted}</strong>
                </td>
              </tr>
              <tr>
                <td colspan="3" style="border: 1px solid #000; padding: 4px 6px; background: #f8fafc;">
                  <span style="color: #64748b; font-size: 7pt;">Demonstrativo / Descrição: <strong>${t.desc}</strong></span>
                  <span style="float: right; color: #94a3b8; font-size: 6.5pt;">Autenticação Mecânica - Recibo do Sacado</span>
                </td>
              </tr>
            </table>
          </div>

          <!-- LINHA PONTILHADA DE CORTE -->
          <div style="border-bottom: 1.5px dashed #64748b; margin: 16px 0; position: relative; text-align: right;">
            <span style="position: absolute; right: 0; top: -10px; background: #fff; padding-left: 8px; font-size: 7pt; color: #64748b;">
              <i class="fa-solid fa-scissors" style="transform: rotate(180deg);"></i> Corte na linha pontilhada abaixo
            </span>
          </div>

          <!-- 2. FICHA DE COMPENSAÇÃO FEBRABAN COM LOGOTIPO -->
          <div style="margin-top: 14px;">
            <!-- CABEÇALHO DO BANCO COM LOGO -->
            <div style="display: flex; align-items: center; border-bottom: 2px solid #000; padding-bottom: 6px; margin-bottom: 4px;">
              <!-- LOGO BRANDED HEALTH NEXUS -->
              <div style="display: flex; align-items: center; gap: 8px; flex: 1;">
                <div style="width: 32px; height: 32px; border-radius: 8px; background: linear-gradient(135deg, #4f46e5, #3730a3); display: flex; align-items: center; justify-content: center; color: #ffffff; font-size: 1.05rem; box-shadow: 0 2px 6px rgba(79,70,229,0.3);">
                  <i class="fa-solid fa-heart-pulse"></i>
                </div>
                <div>
                  <div style="font-size: 1.15rem; font-weight: 900; color: #1e1b4b; font-family: 'Outfit', sans-serif; line-height: 1; letter-spacing: -0.4px;">HEALTH <span style="color: #4f46e5;">NEXUS</span></div>
                  <div style="font-size: 0.58rem; font-weight: 800; color: #64748b; letter-spacing: 1.2px; text-transform: uppercase; margin-top: 2px;">BANK • GESTÃO HOSPITALAR</div>
                </div>
              </div>

              <span style="font-size: 1.1rem; font-weight: 900; border-left: 2px solid #000; border-right: 2px solid #000; padding: 0 12px; margin-right: 10px;">341-7</span>
              <span style="font-size: 0.92rem; font-weight: 800; font-family: monospace; letter-spacing: 0.8px;">${linhaDigitavel}</span>
            </div>

            <!-- TABELA FEBRABAN COMPLETA -->
            <table style="width: 100%; border-collapse: collapse; border: 1px solid #000; font-size: 7.5pt;">
              <tr>
                <td colspan="5" style="border: 1px solid #000; padding: 3px 6px; width: 75%;">
                  <span style="color: #475569; display: block; font-size: 6.5pt; text-transform: uppercase;">Local de Pagamento</span>
                  <strong style="font-size: 8pt;">PAGÁVEL EM QUALQUER BANCO OU CORRESPONDENTE BANCÁRIO ATÉ O VENCIMENTO</strong>
                </td>
                <td style="border: 1px solid #000; padding: 3px 6px; width: 25%; background: #fef2f2;">
                  <span style="color: #991b1b; display: block; font-size: 6.5pt; text-transform: uppercase; font-weight: bold;">Vencimento</span>
                  <strong style="font-size: 9.5pt; color: #dc2626;">${t.dueDate}</strong>
                </td>
              </tr>
              <tr>
                <td colspan="5" style="border: 1px solid #000; padding: 3px 6px;">
                  <span style="color: #475569; display: block; font-size: 6.5pt; text-transform: uppercase;">Beneficiário</span>
                  <strong style="font-size: 8.5pt;">Health Nexus Serviços Médicos Hospitalares Ltda - CNPJ: 42.109.843/0001-90</strong>
                </td>
                <td style="border: 1px solid #000; padding: 3px 6px;">
                  <span style="color: #475569; display: block; font-size: 6.5pt; text-transform: uppercase;">Agência / Código Beneficiário</span>
                  <strong style="font-size: 8.5pt;">0412 / 00948-2</strong>
                </td>
              </tr>

              <tr>
                <td style="border: 1px solid #000; padding: 3px 6px; width: 18%;">
                  <span style="color: #475569; display: block; font-size: 6.5pt; text-transform: uppercase;">Data do Documento</span>
                  <span>10/05/2026</span>
                </td>
                <td style="border: 1px solid #000; padding: 3px 6px; width: 20%;">
                  <span style="color: #475569; display: block; font-size: 6.5pt; text-transform: uppercase;">Nº do Documento</span>
                  <strong>${t.id}</strong>
                </td>
                <td style="border: 1px solid #000; padding: 3px 6px; width: 12%;">
                  <span style="color: #475569; display: block; font-size: 6.5pt; text-transform: uppercase;">Espécie Doc.</span>
                  <span>DM</span>
                </td>
                <td style="border: 1px solid #000; padding: 3px 6px; width: 10%;">
                  <span style="color: #475569; display: block; font-size: 6.5pt; text-transform: uppercase;">Aceite</span>
                  <span>N</span>
                </td>
                <td style="border: 1px solid #000; padding: 3px 6px; width: 15%;">
                  <span style="color: #475569; display: block; font-size: 6.5pt; text-transform: uppercase;">Data Processamento</span>
                  <span>10/05/2026</span>
                </td>
                <td style="border: 1px solid #000; padding: 3px 6px;">
                  <span style="color: #475569; display: block; font-size: 6.5pt; text-transform: uppercase;">Nosso Número</span>
                  <strong>175/00948201-9</strong>
                </td>
              </tr>

              <tr>
                <td style="border: 1px solid #000; padding: 3px 6px;">
                  <span style="color: #475569; display: block; font-size: 6.5pt; text-transform: uppercase;">Uso do Banco</span>
                </td>
                <td style="border: 1px solid #000; padding: 3px 6px;">
                  <span style="color: #475569; display: block; font-size: 6.5pt; text-transform: uppercase;">Carteira</span>
                  <span>109</span>
                </td>
                <td style="border: 1px solid #000; padding: 3px 6px;">
                  <span style="color: #475569; display: block; font-size: 6.5pt; text-transform: uppercase;">Moeda</span>
                  <span>R$</span>
                </td>
                <td style="border: 1px solid #000; padding: 3px 6px;">
                  <span style="color: #475569; display: block; font-size: 6.5pt; text-transform: uppercase;">Quantidade</span>
                  <span>1</span>
                </td>
                <td style="border: 1px solid #000; padding: 3px 6px;">
                  <span style="color: #475569; display: block; font-size: 6.5pt; text-transform: uppercase;">Valor do Documento</span>
                </td>
                <td style="border: 1px solid #000; padding: 3px 6px; background: #f0fdf4;">
                  <span style="color: #166534; display: block; font-size: 6.5pt; text-transform: uppercase; font-weight: bold;">(=) Valor do Documento</span>
                  <strong style="font-size: 10pt; color: #15803d;">${t.amountFormatted}</strong>
                </td>
              </tr>

              <tr>
                <td colspan="5" rowspan="5" style="border: 1px solid #000; padding: 8px; vertical-align: top; font-size: 7.5pt; line-height: 1.4;">
                  <span style="color: #475569; display: block; font-size: 6.5pt; text-transform: uppercase; font-weight: bold; margin-bottom: 4px;">Instruções (Texto de Responsabilidade do Beneficiário)</span>
                  • NÃO RECEBER APÓS 30 DIAS DO VENCIMENTO.<br>
                  • APÓS O VENCIMENTO COBRAR MULTA DE 2,00% E JUROS DE 1,00% AO MÊS.<br>
                  • TÍTULO REFERENTE A PRESTAÇÃO DE SERVIÇOS HOSPITALARES E CONSULTAS MÉDICAS.<br>
                  • SERVIÇO PRESTADO: <strong>${t.desc}</strong><br>
                  • DÚVIDAS OU SEGUNDA VIA LIGUE: (11) 4003-8900 OU WHATSAPP (11) 98888-7700.
                </td>
                <td style="border: 1px solid #000; padding: 3px 6px;">
                  <span style="color: #475569; display: block; font-size: 6.5pt; text-transform: uppercase;">(-) Desconto / Abatimento</span>
                </td>
              </tr>
              <tr>
                <td style="border: 1px solid #000; padding: 3px 6px;">
                  <span style="color: #475569; display: block; font-size: 6.5pt; text-transform: uppercase;">(-) Outras Deduções</span>
                </td>
              </tr>
              <tr>
                <td style="border: 1px solid #000; padding: 3px 6px;">
                  <span style="color: #475569; display: block; font-size: 6.5pt; text-transform: uppercase;">(+) Mora / Multa</span>
                </td>
              </tr>
              <tr>
                <td style="border: 1px solid #000; padding: 3px 6px;">
                  <span style="color: #475569; display: block; font-size: 6.5pt; text-transform: uppercase;">(+) Outros Acréscimos</span>
                </td>
              </tr>
              <tr>
                <td style="border: 1px solid #000; padding: 3px 6px; background: #f8fafc;">
                  <span style="color: #475569; display: block; font-size: 6.5pt; text-transform: uppercase; font-weight: bold;">(=) Valor Cobrado</span>
                  <strong style="font-size: 9pt;">${t.amountFormatted}</strong>
                </td>
              </tr>

              <tr>
                <td colspan="6" style="border: 1px solid #000; padding: 6px; background: #fafafa;">
                  <span style="color: #475569; display: block; font-size: 6.5pt; text-transform: uppercase;">Pagador / Sacado</span>
                  <strong style="font-size: 8.5pt;">${t.client} — CPF: 384.910.284-00</strong><br>
                  <span style="font-size: 7.5pt; color: #475569;">Av. Paulista, 1000 - Bela Vista - São Paulo / SP - CEP: 01310-100</span>
                  <span style="float: right; font-size: 7pt; color: #64748b;">Sacador / Avalista: Health Nexus S.A.</span>
                </td>
              </tr>
            </table>

            <!-- CÓDIGO DE BARRAS NÍTIDO FEBRABAN -->
            <div style="margin-top: 14px; display: flex; justify-content: space-between; align-items: flex-end;">
              <div style="flex: 1;">
                <svg width="100%" height="54" viewBox="0 0 450 54" preserveAspectRatio="none" style="display: block;">
                  <rect x="0" y="0" width="4" height="54" fill="#000"/>
                  <rect x="6" y="0" width="2" height="54" fill="#000"/>
                  <rect x="10" y="0" width="6" height="54" fill="#000"/>
                  <rect x="18" y="0" width="2" height="54" fill="#000"/>
                  <rect x="22" y="0" width="8" height="54" fill="#000"/>
                  <rect x="32" y="0" width="3" height="54" fill="#000"/>
                  <rect x="37" y="0" width="5" height="54" fill="#000"/>
                  <rect x="44" y="0" width="2" height="54" fill="#000"/>
                  <rect x="48" y="0" width="7" height="54" fill="#000"/>
                  <rect x="57" y="0" width="3" height="54" fill="#000"/>
                  <rect x="62" y="0" width="4" height="54" fill="#000"/>
                  <rect x="68" y="0" width="8" height="54" fill="#000"/>
                  <rect x="78" y="0" width="2" height="54" fill="#000"/>
                  <rect x="82" y="0" width="5" height="54" fill="#000"/>
                  <rect x="89" y="0" width="3" height="54" fill="#000"/>
                  <rect x="94" y="0" width="7" height="54" fill="#000"/>
                  <rect x="103" y="0" width="2" height="54" fill="#000"/>
                  <rect x="107" y="0" width="6" height="54" fill="#000"/>
                  <rect x="115" y="0" width="4" height="54" fill="#000"/>
                  <rect x="121" y="0" width="2" height="54" fill="#000"/>
                  <rect x="125" y="0" width="8" height="54" fill="#000"/>
                  <rect x="135" y="0" width="3" height="54" fill="#000"/>
                  <rect x="140" y="0" width="6" height="54" fill="#000"/>
                  <rect x="148" y="0" width="2" height="54" fill="#000"/>
                  <rect x="152" y="0" width="5" height="54" fill="#000"/>
                  <rect x="159" y="0" width="4" height="54" fill="#000"/>
                  <rect x="165" y="0" width="7" height="54" fill="#000"/>
                  <rect x="174" y="0" width="2" height="54" fill="#000"/>
                  <rect x="178" y="0" width="6" height="54" fill="#000"/>
                  <rect x="186" y="0" width="3" height="54" fill="#000"/>
                  <rect x="191" y="0" width="5" height="54" fill="#000"/>
                  <rect x="198" y="0" width="8" height="54" fill="#000"/>
                  <rect x="208" y="0" width="2" height="54" fill="#000"/>
                  <rect x="212" y="0" width="4" height="54" fill="#000"/>
                  <rect x="218" y="0" width="6" height="54" fill="#000"/>
                  <rect x="226" y="0" width="3" height="54" fill="#000"/>
                  <rect x="231" y="0" width="7" height="54" fill="#000"/>
                  <rect x="240" y="0" width="2" height="54" fill="#000"/>
                  <rect x="244" y="0" width="5" height="54" fill="#000"/>
                  <rect x="251" y="0" width="4" height="54" fill="#000"/>
                  <rect x="257" y="0" width="8" height="54" fill="#000"/>
                  <rect x="267" y="0" width="2" height="54" fill="#000"/>
                  <rect x="271" y="0" width="6" height="54" fill="#000"/>
                  <rect x="279" y="0" width="3" height="54" fill="#000"/>
                  <rect x="284" y="0" width="5" height="54" fill="#000"/>
                  <rect x="291" y="0" width="7" height="54" fill="#000"/>
                  <rect x="300" y="0" width="2" height="54" fill="#000"/>
                  <rect x="304" y="0" width="4" height="54" fill="#000"/>
                  <rect x="310" y="0" width="6" height="54" fill="#000"/>
                  <rect x="318" y="0" width="3" height="54" fill="#000"/>
                  <rect x="323" y="0" width="8" height="54" fill="#000"/>
                  <rect x="333" y="0" width="2" height="54" fill="#000"/>
                  <rect x="337" y="0" width="5" height="54" fill="#000"/>
                  <rect x="344" y="0" width="4" height="54" fill="#000"/>
                  <rect x="350" y="0" width="7" height="54" fill="#000"/>
                  <rect x="359" y="0" width="2" height="54" fill="#000"/>
                  <rect x="363" y="0" width="6" height="54" fill="#000"/>
                  <rect x="371" y="0" width="3" height="54" fill="#000"/>
                  <rect x="376" y="0" width="5" height="54" fill="#000"/>
                  <rect x="383" y="0" width="8" height="54" fill="#000"/>
                  <rect x="393" y="0" width="2" height="54" fill="#000"/>
                  <rect x="397" y="0" width="4" height="54" fill="#000"/>
                  <rect x="403" y="0" width="6" height="54" fill="#000"/>
                  <rect x="411" y="0" width="3" height="54" fill="#000"/>
                  <rect x="416" y="0" width="7" height="54" fill="#000"/>
                  <rect x="425" y="0" width="2" height="54" fill="#000"/>
                  <rect x="429" y="0" width="5" height="54" fill="#000"/>
                  <rect x="436" y="0" width="4" height="54" fill="#000"/>
                  <rect x="442" y="0" width="8" height="54" fill="#000"/>
                </svg>
                <div style="font-family: monospace; font-size: 7.5pt; color: #475569; letter-spacing: 2px; margin-top: 4px;">
                  34191.79001 01043.510047 91020.150008 5 94100000035000
                </div>
              </div>
              <div style="text-align: right; padding-left: 15px; font-size: 6.5pt; color: #64748b;">
                Ficha de Compensação<br>
                Autenticação Mecânica FEBRABAN
              </div>
            </div>
          </div>
        </div>

        <!-- BOTÕES DE FECHAMENTO DO MODAL -->
        <div style="display: flex; justify-content: flex-end; gap: 12px; margin-top: 22px;">
          <button id="btn-close-boleto-foot" class="btn btn-outline" style="font-size: 0.85rem; padding: 8px 18px;">Fechar Visualização</button>
          <button id="btn-print-boleto-foot" class="btn btn-primary" style="background: linear-gradient(135deg, #6366f1, #4f46e5); font-size: 0.85rem; padding: 8px 20px;"><i class="fa-solid fa-print"></i> Imprimir Boleto FEBRABAN</button>
        </div>
      </div>
    `;

    modal.classList.add('active');

    const close = () => {
      modal.classList.remove('active');
      setTimeout(() => { modal.remove(); }, 150);
    };

    document.getElementById('close-boleto-modal')?.addEventListener('click', close);
    document.getElementById('btn-close-boleto-foot')?.addEventListener('click', close);

    // Fechar ao clicar fora do cartão (no fundo escuro)
    modal.addEventListener('click', (e) => {
      if (e.target === modal) close();
    });

    // Fechar com a tecla ESC (Escape)
    const escHandler = (e) => {
      if (e.key === 'Escape') {
        close();
        document.removeEventListener('keydown', escHandler);
      }
    };
    document.addEventListener('keydown', escHandler);

    const copyToClipboard = (text) => {
      if (navigator.clipboard?.writeText) {
        return navigator.clipboard.writeText(text);
      }
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    };

    const handleCopyLinha = () => {
      copyToClipboard(linhaDigitavel);
      if (typeof showToast === 'function') showToast('Linha digitável FEBRABAN copiada para a área de transferência!');
    };

    const handleCopyPix = () => {
      copyToClipboard(pixCopyPaste);
      if (typeof showToast === 'function') showToast('Chave Pix Copia e Cola copiada com sucesso!');
    };

    document.getElementById('btn-copy-linha-top')?.addEventListener('click', handleCopyLinha);
    document.getElementById('btn-copy-pix-top')?.addEventListener('click', handleCopyPix);
    document.getElementById('btn-copy-pix-banner')?.addEventListener('click', handleCopyPix);

    const handlePrint = () => {
      const printWin = window.open('', '_blank');
      if (!printWin) {
        alert('Por favor, habilite janelas pop-up no seu navegador para imprimir o boleto.');
        return;
      }
      const boletoHTML = document.getElementById('printable-boleto-area').innerHTML;
      printWin.document.write(`
        <!DOCTYPE html>
        <html lang="pt-BR">
        <head>
          <meta charset="UTF-8">
          <title>Boleto Bancário FEBRABAN — Título ${t.id}</title>
          <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
          <style>
            @page { size: A4 portrait; margin: 10mm; }
            body { font-family: Arial, sans-serif; padding: 15px; color: #000; background: #fff; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          </style>
        </head>
        <body>
          <div style="max-width: 800px; margin: 0 auto;">
            ${boletoHTML}
          </div>
          <script>
            window.onload = function() { window.print(); };
          </script>
        </body>
        </html>
      `);
      printWin.document.close();
    };

    document.getElementById('btn-print-boleto')?.addEventListener('click', handlePrint);
    document.getElementById('btn-print-boleto-foot')?.addEventListener('click', handlePrint);
  }

  const processExport = async (format) => {
    try {
      if (typeof showToast === 'function') showToast(`Gerando ${format.toUpperCase()}...`);
    let recordsToExport = [];
    if (activeTab !== 'financial') {
      const checkedIds = Array.from(document.querySelectorAll('.record-checkbox:checked')).map(cb => cb.getAttribute('data-id'));
      if (checkedIds.length === 0) {
        alert('Por favor, selecione ao menos um registro para exportar.');
        return;
      }
      recordsToExport = currentFilteredList.filter(item => checkedIds.includes(item.id));
    }
    
    const hasPEP = state.user && (state.user.role === 'Médico' || state.user.role === 'Enfermeiro');
    let columns = [];
    let rows = [];
    let title = '';
    let filename = '';
    let financialSummary;

    if (activeTab === 'patients') {
      title = 'Relatório de Pacientes';
      filename = 'pacientes';
      columns = ['ID', 'Nome Completo', 'CPF', 'Data de Nascimento', 'Cidade', 'Telefones', 'Faturamento'];
      rows = recordsToExport.map(p => {
        let formattedDate = p.birthDate || '-';
        if (p.birthDate && p.birthDate.includes('-')) {
          const [y, m, d] = p.birthDate.split('-');
          formattedDate = `${d}/${m}/${y}`;
        }
        const phones = [p.phone, p.cellphone].filter(Boolean).join(' / ') || '-';
        const name = hasPEP ? p.fullName : abbreviateName(p.fullName);
        const cpf = hasPEP ? p.cpf : anonymizeCPF(p.cpf);
        return [
          p.id, 
          name, 
          cpf, 
          formattedDate, 
          p.city || '-',
          phones,
          p.billingValue || 'R$ 0,00'
        ];
      });
    } else if (activeTab === 'encounters') {
      title = 'Relatório de Atendimentos';
      filename = 'atendimentos';
      columns = ['ID', 'Paciente', 'CPF Paciente', 'Motivo', 'Classificação', 'Status', 'Data'];
      rows = recordsToExport.map(e => {
        const name = hasPEP ? (e.patientName || 'Desconhecido') : abbreviateName(e.patientName || 'Desconhecido');
        const cpf = hasPEP ? (e.patientCpf || '-') : anonymizeCPF(e.patientCpf || '-');
        const dateStr = e.admitted_at ? new Date(e.admitted_at).toLocaleString() : '-';
        const statusMap = {
          'Aguardando_Triagem': 'Aguardando Triagem',
          'Aguardando_Atendimento': 'Aguardando Atendimento',
          'Em_Atendimento': 'Em Consulta',
          'Finalizado': 'Finalizado'
        };
        const formattedStatus = statusMap[e.status] || e.status;
        return [
          e.id, 
          name, 
          cpf, 
          (e.type === 'Urgencia' ? 'Urgência' : 'Ambulatório') + (e.complaints ? ` - ${e.complaints}` : ''), 
          e.manchesterColor || '-', 
          formattedStatus, 
          dateStr
        ];
      });
    } else {
      // ---- ABA FINANCEIRO: usa dados reais da janela dedicada ----
      const activeFinStatus = window._activeFinStatusFilter || 'Todos';
      title = activeFinStatus === 'Todos'
        ? 'Relatório Financeiro de Títulos (Todos os Status)'
        : `Relatório Financeiro — Títulos ${activeFinStatus.toUpperCase()}`;
      filename = `relatorio_financeiro_${activeFinStatus.toLowerCase().replace(/\s+/g, '_')}`;
      columns = ['Nosso Número', 'Paciente / Cliente', 'Descrição do Serviço', 'Vencimento', 'Valor (R$)', 'Status'];

      // Preferir dados do modal se estiver aberto, senão da aba financeiro
      const modalList = window._modalFinTitlesList || [];
      const tabList = window._finTitlesList || [];
      const sourceList = modalList.length > 0 ? modalList : tabList;
      const listToExport = sourceList.filter(t =>
        activeFinStatus === 'Todos' || t.status === activeFinStatus
      );

      rows = listToExport.map(t => [
        t.id,
        hasPEP ? t.client : (typeof abbreviateName === 'function' ? abbreviateName(t.client) : t.client),
        t.desc,
        t.dueDate,
        t.amountFormatted,
        t.status
      ]);

      // ---- Computar KPI summary para o PDF ----
      let pagasVal=0, aVencerVal=0, vencidasVal=0, bonificadasVal=0, suspensasVal=0, canceladasVal=0, excluidasVal=0;
      let pagasC=0, aVencerC=0, vencidasC=0, bonificadasC=0, suspensasC=0, canceladasC=0, excluidasC=0;
      let totalRec=0, totalDesp=0;
      listToExport.forEach(t => {
        const v = parseFloat(t.amount) || 0;
        if (t.type === 'Despesa') totalDesp += v; else totalRec += v;
        switch(t.status) {
          case 'Pagas':       pagasC++;       pagasVal += v;       break;
          case 'A Vencer':    aVencerC++;     aVencerVal += v;     break;
          case 'Vencidas':    vencidasC++;    vencidasVal += v;    break;
          case 'Bonificadas': bonificadasC++; bonificadasVal += v; break;
          case 'Suspensas':   suspensasC++;   suspensasVal += v;   break;
          case 'Canceladas':  canceladasC++;  canceladasVal += v;  break;
          case 'Excluídas':   excluidasC++;   excluidasVal += v;   break;
        }
      });

      // Capturar imagens dos gráficos Chart.js (canvas -> base64)
      // Priorizar canvas do modal, depois da aba financeiro
      const donutCanvas = document.getElementById('modal-fin-donut-chart') || document.getElementById('finPieChart');
      const barCanvas = document.getElementById('modal-fin-bar-chart') || document.getElementById('finBarChart');
      const donutImg = donutCanvas ? donutCanvas.toDataURL('image/png') : null;
      const barImg   = barCanvas   ? barCanvas.toDataURL('image/png')   : null;

      financialSummary = {
        pagasVal, aVencerVal, vencidasVal, bonificadasVal, suspensasVal, canceladasVal, excluidasVal,
        pagasC, aVencerC, vencidasC, bonificadasC, suspensasC, canceladasC, excluidasC,
        totalRec, totalDesp, saldo: totalRec - totalDesp,
        donutImg, barImg
      };
    }

    const timestamp = new Date().toISOString().slice(0,10);
    filename = `${filename}_${timestamp}`;

    if (format === 'pdf') {
      await exportHtmlPDF(columns, rows, title, filename, activeTab === 'financial' ? financialSummary : undefined);
    } else if (format === 'xls') {
      exportHtmlXLS(columns, rows, filename);
    } else if (format === 'csv') {
      exportHtmlCSV(columns, rows, filename);
    }
  } catch (err) {
    console.error('Erro ao exportar:', err);
    if (typeof showToast === 'function') showToast('Erro ao exportar: ' + err.message);
  }
};

  btnPdf.addEventListener('click', () => processExport('pdf'));
  btnXls.addEventListener('click', () => processExport('xls'));
  btnCsv.addEventListener('click', () => processExport('csv'));

  // -------------------------------------------------------
  // RELATÓRIO POR MÉDICO
  // -------------------------------------------------------
  const renderDoctorReport = async () => {
    const previewCard = document.querySelector('.preview-card');
    if (!previewCard) return;
    previewCard.innerHTML = `
      <div class="preview-header" style="margin-bottom:0;">
        <h3><i class="fa-solid fa-user-doctor" style="color:var(--color-primary);"></i> Relatório de Atividades por Médico</h3>
      </div>
      <div style="text-align:center;padding:30px;color:var(--text-muted);">
        <i class="fa-solid fa-spinner fa-spin" style="font-size:1.5rem;color:#818cf8;"></i>
        <div style="margin-top:8px;">Carregando dados dos médicos...</div>
      </div>
    `;
    try {
      const [resDoc, resAppts] = await Promise.all([
        apiFetch(`${API_URL}/doctors`),
        apiFetch(`${API_URL}/appointments`)
      ]);
      const rawDocs = resDoc.ok ? (await resDoc.json()) : [];
      const apptRaw = resAppts.ok ? (await resAppts.json()) : [];
      const apptList = Array.isArray(apptRaw) ? apptRaw : (apptRaw.data || []);
      const docList = Array.isArray(rawDocs) ? rawDocs : (rawDocs.data || []);
      const todayStr = new Date().toISOString().split('T')[0];

      const docStats = docList.map(doc => {
        const name = doc.name || '';
        const cleanName = name.replace(/^(Dr\.|Dra\.)\s*/i, '');
        const myAppts = apptList.filter(a => (a.doctorName||'').includes(name)||(a.doctorName||'').includes(cleanName));
        const today = myAppts.filter(a => a.appointmentDate === todayStr).length;
        const done = myAppts.filter(a => a.status === 'Concluído').length;
        const inProgress = myAppts.filter(a => a.status === 'Em Atendimento').length;
        return { name: doc.name, crm: doc.crm, specialty: doc.specialty, status: doc.status, total: myAppts.length, today, done, inProgress };
      });

      const totalAppts = docStats.reduce((s,d)=>s+d.total,0);
      const totalDone = docStats.reduce((s,d)=>s+d.done,0);
      const totalInProgress = docStats.reduce((s,d)=>s+d.inProgress,0);
      const ativos = docStats.filter(d=>d.status==='Ativo').length;
      const rows = docStats.map(d=>[d.name, d.specialty||'—', d.crm||'—', d.status||'—', d.total, d.today, d.inProgress, d.done]);

      previewCard.innerHTML = `
        <div class="preview-header" style="flex-wrap:wrap;gap:10px;">
          <h3><i class="fa-solid fa-user-doctor" style="color:var(--color-primary);"></i> Relatório de Atividades por Médico</h3>
          <div style="display:flex;gap:8px;margin-left:auto;">
            <button id="btn-doc-export-pdf" class="btn btn-primary" style="background:#dc2626;font-size:0.82rem;"><i class="fa-solid fa-file-pdf"></i> Exportar PDF</button>
            <button id="btn-doc-export-csv" class="btn btn-outline" style="font-size:0.82rem;"><i class="fa-solid fa-file-csv"></i> Exportar CSV</button>
          </div>
        </div>

        <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin:16px 0;">
          <div class="tilt-card-3d" style="background:var(--bg-tertiary);border-radius:10px;padding:14px;text-align:center;border:1px solid var(--border-color);"><div id="kpi-doc-active" style="font-size:1.6rem;font-weight:800;color:#818cf8;">0</div><div style="font-size:0.72rem;color:var(--text-muted);margin-top:2px;">Médicos Ativos</div></div>
          <div class="tilt-card-3d" style="background:var(--bg-tertiary);border-radius:10px;padding:14px;text-align:center;border:1px solid var(--border-color);"><div id="kpi-doc-total" style="font-size:1.6rem;font-weight:800;color:#38bdf8;">0</div><div style="font-size:0.72rem;color:var(--text-muted);margin-top:2px;">Total Agendamentos</div></div>
          <div class="tilt-card-3d" style="background:var(--bg-tertiary);border-radius:10px;padding:14px;text-align:center;border:1px solid var(--border-color);"><div id="kpi-doc-progress" style="font-size:1.6rem;font-weight:800;color:#fbbf24;">0</div><div style="font-size:0.72rem;color:var(--text-muted);margin-top:2px;">Em Atendimento</div></div>
          <div class="tilt-card-3d" style="background:var(--bg-tertiary);border-radius:10px;padding:14px;text-align:center;border:1px solid var(--border-color);"><div id="kpi-doc-done" style="font-size:1.6rem;font-weight:800;color:#34d399;">0</div><div style="font-size:0.72rem;color:var(--text-muted);margin-top:2px;">Concluídos</div></div>
        </div>

        <div style="display:grid;grid-template-columns:2fr 1.1fr;gap:18px;margin-bottom:18px;">
          <div class="chart-card tilt-card-3d" id="card-doc-productivity" style="padding:18px;height:250px;position:relative;">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;">
              <h4 style="margin:0;font-size:0.9rem;font-weight:700;color:var(--text-primary);display:flex;align-items:center;gap:8px;">
                <i class="fa-solid fa-chart-column" style="color:#00f2fe;"></i> Agendamentos por Médico
              </h4>
              <div style="display:flex;gap:4px;" id="doc-chart-mode-toggle">
                <button class="chart-mode-pill active" data-mode="bar" title="Visão em Colunas"><i class="fa-solid fa-chart-column"></i></button>
                <button class="chart-mode-pill" data-mode="line" title="Visão em Onda Smooth Wave"><i class="fa-solid fa-chart-line"></i></button>
              </div>
            </div>
            <div style="position:relative;height:185px;width:100%;">
              <canvas id="chart-doc-productivity"></canvas>
            </div>
          </div>

          <div class="chart-card tilt-card-3d" id="card-doc-completion" style="padding:18px;height:250px;position:relative;">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;">
              <h4 style="margin:0;font-size:0.9rem;font-weight:700;color:var(--text-primary);display:flex;align-items:center;gap:8px;">
                <i class="fa-solid fa-chart-pie" style="color:#a855f7;"></i> Distribuição Geral
              </h4>
            </div>
            <div style="position:relative;height:185px;width:100%;display:flex;align-items:center;justify-content:center;">
              <canvas id="chart-doc-completion"></canvas>
              <div class="doc-donut-kpi" style="position:absolute;top:44%;left:50%;transform:translate(-50%,-50%);text-align:center;pointer-events:none;">
                <span id="doc-completion-pct" style="font-family:'Outfit',sans-serif;font-size:1.75rem;font-weight:800;background:linear-gradient(135deg,#ffffff 0%,#34d399 100%);-webkit-background-clip:text;-webkit-text-fill-color:transparent;display:block;line-height:1;filter:drop-shadow(0 0 10px rgba(52,211,153,0.4));">0%</span>
                <span style="font-size:0.65rem;font-weight:700;color:var(--text-secondary,#94a3b8);text-transform:uppercase;letter-spacing:0.04em;display:block;margin-top:2px;">Conclusão</span>
              </div>
            </div>
          </div>
        </div>

        <div style="border-radius:12px;overflow:hidden;border:1px solid var(--border-color);">
          <table style="width:100%;border-collapse:collapse;">
            <thead>
              <tr style="background:var(--bg-tertiary);border-bottom:1px solid var(--border-color);">
                ${['Médico','Especialidade','Status','Total','Hoje','Em Atend.','Concluídos'].map(h=>`<th style="padding:11px 14px;font-size:0.73rem;color:var(--text-muted);text-transform:uppercase;">${h}</th>`).join('')}
              </tr>
            </thead>
            <tbody>
              ${docStats.map((d, idx)=>`
                <tr id="doc-table-row-${idx}" class="doc-table-row" data-idx="${idx}" style="border-bottom:1px solid var(--border-color);transition:background 0.2s ease;cursor:pointer;">
                  <td style="padding:12px 14px;"><div style="font-weight:600;color:var(--text-primary);font-size:0.88rem;">${d.name}</div><div style="font-size:0.74rem;color:var(--text-muted);">CRM: ${d.crm||'—'}</div></td>
                  <td style="padding:12px 14px;font-size:0.84rem;color:var(--text-secondary);">${d.specialty||'—'}</td>
                  <td style="padding:12px 14px;text-align:center;"><span style="display:inline-block;padding:3px 10px;border-radius:20px;font-size:0.74rem;font-weight:600;background:${d.status==='Ativo'?'rgba(52,211,153,0.15)':'rgba(248,113,113,0.15)'};color:${d.status==='Ativo'?'#34d399':'#f87171'};">${d.status||'—'}</span></td>
                  <td style="padding:12px 14px;text-align:center;font-weight:700;color:#818cf8;">${d.total}</td>
                  <td style="padding:12px 14px;text-align:center;color:#38bdf8;font-weight:600;">${d.today}</td>
                  <td style="padding:12px 14px;text-align:center;color:#fbbf24;font-weight:600;">${d.inProgress}</td>
                  <td style="padding:12px 14px;text-align:center;color:#34d399;font-weight:600;">${d.done}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
        <div style="margin-top:8px;font-size:0.75rem;color:var(--text-muted);text-align:right;">${docList.length} médico(s) • Gerado em ${new Date().toLocaleString('pt-BR')}</div>
      `;

      // Animação Numérica 0 -> Final (CountUp)
      const countUp = (el, target, duration = 1200, suffix = '') => {
        if (!el) return;
        const startTime = performance.now();
        const update = (now) => {
          const progress = Math.min(1, (now - startTime) / duration);
          const ease = 1 - Math.pow(1 - progress, 3);
          el.textContent = `${Math.floor(ease * target)}${suffix}`;
          if (progress < 1) requestAnimationFrame(update);
          else el.textContent = `${target}${suffix}`;
        };
        requestAnimationFrame(update);
      };

      countUp(document.getElementById('kpi-doc-active'), ativos);
      countUp(document.getElementById('kpi-doc-total'), totalAppts);
      countUp(document.getElementById('kpi-doc-progress'), totalInProgress);
      countUp(document.getElementById('kpi-doc-done'), totalDone);

      let currentChartMode = 'bar';

      setTimeout(() => {
        const ctxBar = document.getElementById('chart-doc-productivity');
        let instBar = null;

        const renderBarChart = (mode = 'bar') => {
          if (!ctxBar || !window.Chart) return;
          if (instBar) instBar.destroy();
          const c2d = ctxBar.getContext('2d');

          const gradDone = c2d.createLinearGradient(0, 0, 0, 180);
          gradDone.addColorStop(0, '#34d399'); gradDone.addColorStop(1, '#059669');

          const gradProgress = c2d.createLinearGradient(0, 0, 0, 180);
          gradProgress.addColorStop(0, '#fbbf24'); gradProgress.addColorStop(1, '#d97706');

          const gradPending = c2d.createLinearGradient(0, 0, 0, 180);
          gradPending.addColorStop(0, '#6366f1'); gradPending.addColorStop(1, '#00f2fe');

          const labels = docStats.map(d => d.name.replace(/^(Dr\.|Dra\.)\s*/i, '').split(' ')[0]);

          instBar = new window.Chart(c2d, {
            type: mode === 'line' ? 'line' : 'bar',
            data: {
              labels,
              datasets: [
                { label: 'Concluídos', data: docStats.map(d => d.done), backgroundColor: mode === 'line' ? 'rgba(52, 211, 153, 0.15)' : gradDone, borderColor: '#10b981', borderWidth: 2, borderRadius: 6, tension: 0.4, fill: mode === 'line' },
                { label: 'Em Atend.', data: docStats.map(d => d.inProgress), backgroundColor: mode === 'line' ? 'rgba(251, 191, 36, 0.15)' : gradProgress, borderColor: '#f59e0b', borderWidth: 2, borderRadius: 6, tension: 0.4, fill: mode === 'line' },
                { label: 'Pendentes', data: docStats.map(d => Math.max(0, d.total - d.done - d.inProgress)), backgroundColor: mode === 'line' ? 'rgba(99, 102, 241, 0.15)' : gradPending, borderColor: '#6366f1', borderWidth: 2, borderRadius: 6, tension: 0.4, fill: mode === 'line' }
              ]
            },
            options: {
              responsive: true,
              maintainAspectRatio: false,
              animation: { duration: 900, easing: 'easeOutQuart' },
              onClick: (evt, elements) => {
                if (elements && elements.length > 0) {
                  const idx = elements[0].index;
                  const rowEl = document.getElementById(`doc-table-row-${idx}`);
                  if (rowEl) {
                    document.querySelectorAll('.row-highlight-pulse').forEach(r => r.classList.remove('row-highlight-pulse'));
                    rowEl.classList.add('row-highlight-pulse');
                    rowEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
                  }
                }
              },
              plugins: {
                legend: {
                  position: 'top', align: 'end',
                  labels: { color: '#cbd5e1', font: { family: 'Plus Jakarta Sans', size: 10.5, weight: '600' }, usePointStyle: true, boxWidth: 7, padding: 10 }
                },
                tooltip: {
                  backgroundColor: 'rgba(18, 14, 34, 0.94)', titleColor: '#00f2fe', bodyColor: '#f8fafc', borderColor: 'rgba(0, 242, 254, 0.35)', borderWidth: 1, padding: 10, usePointStyle: true
                }
              },
              scales: {
                x: { stacked: mode !== 'line', grid: { color: 'rgba(255, 255, 255, 0.05)', drawBorder: false }, ticks: { color: '#94a3b8', font: { family: 'Plus Jakarta Sans', size: 11, weight: '600' } } },
                y: { stacked: mode !== 'line', grid: { color: 'rgba(255, 255, 255, 0.05)', drawBorder: false }, ticks: { color: '#94a3b8', font: { family: 'Plus Jakarta Sans', size: 10 } } }
              }
            }
          });
          ctxBar._chartInstance = instBar;
        };

        renderBarChart('bar');

        // Ouvintes do Seletor de Modo de Gráfico
        document.querySelectorAll('#doc-chart-mode-toggle .chart-mode-pill').forEach(btn => {
          btn.addEventListener('click', () => {
            document.querySelectorAll('#doc-chart-mode-toggle .chart-mode-pill').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const mode = btn.dataset.mode;
            currentChartMode = mode;
            renderBarChart(mode);
          });
        });

        // Interatividade Hover Tabela -> Gráfico
        document.querySelectorAll('.doc-table-row').forEach(row => {
          row.addEventListener('mouseenter', () => {
            const idx = parseInt(row.dataset.idx, 10);
            if (instBar && instBar.setActiveElements) {
              instBar.setActiveElements([{ datasetIndex: 0, index: idx }, { datasetIndex: 1, index: idx }, { datasetIndex: 2, index: idx }]);
              instBar.update();
            }
          });
          row.addEventListener('mouseleave', () => {
            if (instBar && instBar.setActiveElements) {
              instBar.setActiveElements([]);
              instBar.update();
            }
          });
        });

        const ctxDoughnut = document.getElementById('chart-doc-completion');
        if (ctxDoughnut && window.Chart) {
          if (ctxDoughnut._chartInstance) ctxDoughnut._chartInstance.destroy();

          const pendingCount = Math.max(0, totalAppts - totalDone - totalInProgress);
          const completionRate = totalAppts > 0 ? Math.round((totalDone / totalAppts) * 100) : 0;

          countUp(document.getElementById('doc-completion-pct'), completionRate, 1400, '%');

          const inst2 = new window.Chart(ctxDoughnut.getContext('2d'), {
            type: 'doughnut',
            data: {
              labels: ['Concluídos', 'Em Atendimento', 'Pendentes'],
              datasets: [{
                data: [totalDone, totalInProgress, pendingCount],
                backgroundColor: ['#34d399', '#fbbf24', '#6366f1'],
                borderWidth: 3,
                borderColor: 'rgba(11, 8, 22, 0.95)',
                borderRadius: 6,
                spacing: 3,
                hoverOffset: 12
              }]
            },
            options: {
              responsive: true,
              maintainAspectRatio: false,
              cutout: '76%',
              animation: { animateScale: true, animateRotate: true, duration: 1200 },
              plugins: {
                legend: {
                  position: 'bottom',
                  labels: { color: '#cbd5e1', font: { family: 'Plus Jakarta Sans', size: 10.5, weight: '600' }, usePointStyle: true, padding: 10 }
                },
                tooltip: {
                  backgroundColor: 'rgba(18, 14, 34, 0.94)', titleColor: '#00f2fe', bodyColor: '#f8fafc', borderColor: 'rgba(0, 242, 254, 0.35)', borderWidth: 1, padding: 10,
                  callbacks: {
                    label: (context) => {
                      const val = context.raw || 0;
                      const pct = totalAppts > 0 ? Math.round((val / totalAppts) * 100) : 0;
                      return ` ${context.label}: ${val} (${pct}%)`;
                    }
                  }
                }
              }
            }
          });
          ctxDoughnut._chartInstance = inst2;
        }
      }, 50);

      document.getElementById('btn-doc-export-pdf')?.addEventListener('click', async () => {
        const ts = new Date().toISOString().slice(0,10);
        await exportToPDF(['Médico','Especialidade','CRM','Status','Total','Hoje','Em Atend.','Concluídos'], rows, 'Relatório de Atividades por Médico', `relatorio_medicos_${ts}`);
      });
      document.getElementById('btn-doc-export-csv')?.addEventListener('click', () => {
        const ts = new Date().toISOString().slice(0,10);
        exportToCSV(['Médico','Especialidade','CRM','Status','Total','Hoje','Em Atend.','Concluídos'], rows, `relatorio_medicos_${ts}`);
      });

    } catch(err) {
      console.error('[DoctorReport]', err);
      const pc = document.querySelector('.preview-card');
      if (pc) pc.innerHTML = '<div style="padding:40px;text-align:center;color:var(--color-danger);"><i class="fa-solid fa-triangle-exclamation"></i> Erro ao carregar relatório de médicos.</div>';
    }
  };

  const loadData = async () => {
    try {
      previewStatus.textContent = 'Buscando dados...';
      const [resPatients, resEncounters] = await Promise.all([
        apiFetch(`${API_URL}/patients`),
        apiFetch(`${API_URL}/encounters`)
      ]);

      if (resPatients.ok) { const rp = await resPatients.json(); patientsList = Array.isArray(rp) ? rp : (rp.data || []); }
      if (resEncounters.ok) { const re = await resEncounters.json(); encountersList = Array.isArray(re) ? re : (re.data || []); }

      renderFilters();
    } catch (err) {
      console.error(err);
      previewStatus.textContent = 'Erro ao carregar dados.';
    }
  };

  loadData();
}
window.renderReportsTab = renderReportsTab;
