import { apiFetch, showToast, abbreviateName, switchTab, setupCustomSelect, anonymizeCPF, exportToPDF, formatSyncDate, showCustomAlert, renderTabContent, cachedApiGet, getRolePermissions } from '../main.js';
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

      <!-- Seletor em formato de Cards Interativos Lado a Lado (5 colunas) -->
      <div class="report-tabs-selector" style="display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 16px; width: 100%; box-sizing: border-box; margin-bottom: 24px;">
        
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
            <h4 style="font-size: 1.02rem; font-weight: 700; color: var(--text-primary); margin: 0 0 4px 0;">Atendimentos &amp; PEP</h4>
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

        <!-- CARD 5: ESCALAS & PLANTÕES -->
        <div id="tab-btn-schedules" class="report-tab-card" style="background: var(--bg-secondary); border: 1px solid var(--border-color); border-radius: 14px; padding: 18px 20px; cursor: pointer; transition: all 0.2s ease; position: relative; display: flex; flex-direction: column; justify-content: space-between; height: 100%;" onmouseenter="if(!this.classList.contains('active')) { this.style.transform='translateY(-2px)'; this.style.borderColor='rgba(167,139,250,0.4)'; }" onmouseleave="if(!this.classList.contains('active')) { this.style.transform='none'; this.style.borderColor='var(--border-color)'; }">
          <div style="display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 14px;">
            <div style="width: 44px; height: 44px; border-radius: 12px; background: rgba(167,139,250,0.15); border: 1px solid rgba(167,139,250,0.3); display: flex; align-items: center; justify-content: center; color: #a78bfa; font-size: 1.25rem;">
              <i class="fa-solid fa-user-clock"></i>
            </div>
            <span class="card-status-badge" style="display: none; font-size: 0.68rem; font-weight: 700; padding: 3px 9px; border-radius: 20px; background: rgba(167,139,250,0.2); color: #a78bfa; border: 1px solid rgba(167,139,250,0.4); letter-spacing: 0.5px;">SELECIONADO</span>
          </div>
          <div>
            <h4 style="font-size: 1.02rem; font-weight: 700; color: var(--text-primary); margin: 0 0 4px 0;">Escalas &amp; Plantões</h4>
            <p style="font-size: 0.78rem; color: var(--text-muted); margin: 0; line-height: 1.35;">Alocação de Médicos e Enfermeiros por turno e setor.</p>
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
        <div class="report-actions" style="margin-top: 20px; display: flex; gap: 10px; flex-wrap: wrap;">
          <button id="btn-export-pdf" class="btn btn-primary" style="background: var(--danger-color)">
            <i class="fa-solid fa-file-pdf"></i> Exportar PDF
          </button>
          <button id="btn-export-xls" class="btn btn-primary" style="background: var(--success-color)">
            <i class="fa-solid fa-file-excel"></i> Exportar Excel (XLSX)
          </button>
          <button id="btn-export-csv" class="btn btn-outline">
            <i class="fa-solid fa-file-csv"></i> Exportar CSV
          </button>
          <button id="btn-export-tiss" class="btn btn-primary" style="background: linear-gradient(135deg, #0284c7, #0369a1); border: none; box-shadow: 0 4px 12px rgba(2, 132, 199, 0.35); font-weight: 700;">
            <i class="fa-solid fa-file-code"></i> Exportar Lote TISS 4.01 (XML ANS)
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
  const btnSchedulesTab = document.getElementById('tab-btn-schedules');
  const filtersContainer = document.getElementById('filters-container');
  const previewStatus = document.getElementById('preview-status');
  const tableHead = document.getElementById('preview-table-head');
  const tableBody = document.getElementById('preview-table-body');
  const btnPdf = document.getElementById('btn-export-pdf');
  const btnXls = document.getElementById('btn-export-xls');
  const btnCsv = document.getElementById('btn-export-csv');
  const btnTiss = document.getElementById('btn-export-tiss');

  if (btnTiss) {
    btnTiss.addEventListener('click', () => {
      const listToExport = currentFilteredList && currentFilteredList.length > 0 ? currentFilteredList : encountersList;
      if (typeof window.generateTISS401XML === 'function') {
        const tissResult = window.generateTISS401XML({
          numeroLote: String(Math.floor(1000 + Math.random() * 9000)),
          registroANS: '359012',
          cnpjPrestador: '12345678000199',
          cnesHospital: '7654321',
          nomeHospital: 'Hospital & Maternidade Health Nexus',
          atendimentos: listToExport.map(item => ({
            paciente_nome: item.patientName || item.fullName || item.name || 'Paciente Beneficiário',
            carteirinha: (item.susNumber || item.cpf ? item.cpf.replace(/\D/g, '') : '3254980001234567'),
            medico_nome: item.doctorName || item.triageNurse || 'Dr. Médico Assistente',
            medico_crm: item.doctorCrm || '123456',
            data: (item.created_at || item.entryTime || new Date().toISOString()).split('T')[0],
            tipo: item.manchesterColor === 'VERMELHO' || item.manchesterColor === 'LARANJA' ? 'urgencia' : 'consulta',
            cid: item.cid || 'Z00.0'
          }))
        });

        if (typeof window.downloadTISSFile === 'function') {
          window.downloadTISSFile(tissResult.xml, `LOTE_TISS_4_01_LOTE_${tissResult.numeroLote}.xml`);
        }
        if (typeof showToast === 'function') {
          showToast(`📦 Lote TISS 4.01 gerado com sucesso (${tissResult.totalGuias} guias, Hash MD5: ${tissResult.hashMD5.substring(0, 8)}...)!`);
        }
      }
    });
  }

  let finPieChartInstance = null;
  let finBarChartInstance = null;

  // Função para atualizar o destaque visual dos cards
  const updateReportCardSelection = (selectedTab) => {
    const cards = [
      { id: 'tab-btn-patients', tab: 'patients', border: 'rgba(99,102,241,0.5)', bg: 'rgba(99,102,241,0.08)', shadow: 'rgba(99,102,241,0.15)' },
      { id: 'tab-btn-encounters', tab: 'encounters', border: 'rgba(236,72,153,0.5)', bg: 'rgba(236,72,153,0.08)', shadow: 'rgba(236,72,153,0.15)' },
      { id: 'tab-btn-financial', tab: 'financial', border: 'rgba(34,211,238,0.5)', bg: 'rgba(34,211,238,0.08)', shadow: 'rgba(34,211,238,0.15)' },
      { id: 'tab-btn-doctors', tab: 'doctors', border: 'rgba(52,211,153,0.5)', bg: 'rgba(52,211,153,0.08)', shadow: 'rgba(52,211,153,0.15)' },
      { id: 'tab-btn-schedules', tab: 'schedules', border: 'rgba(167,139,250,0.5)', bg: 'rgba(167,139,250,0.08)', shadow: 'rgba(167,139,250,0.15)' }
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

  btnSchedulesTab?.addEventListener('click', () => {
    activeTab = 'schedules';
    updateReportCardSelection('schedules');
    renderFilters();
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
              <div style="display: flex; gap: 8px;">
              <input type="number" id="filter-billing-min" style="flex: 1;" placeholder="Ex: 500" min="0">
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
              <div style="display: flex; gap: 8px;">
              <select id="filter-doctor-name" style="flex: 1;" style="width:100%;padding:8px 12px;border-radius:8px;border:1px solid var(--border-color);background:var(--bg-tertiary);color:var(--text-primary);font-size:0.85rem;cursor:pointer;">
              <option value="">— Todos os Médicos —</option>
              ${[...new Set(encountersList.map(e => e.doctorName).filter(Boolean))].sort().map(d => `<option value="${d}">${d}</option>`).join('')}
            </select>
          </div>
        </div>
      `;
    } else if (activeTab === 'financial') {
      filtersContainer.innerHTML = `
        <div class="filters-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; align-items: flex-end;">
          <div class="filter-group">
            <label style="font-weight: 600; color: var(--text-secondary); font-size: 0.78rem; text-transform: uppercase; letter-spacing: 0.04em; margin-bottom: 6px; display: block;">Vencimento Inicial</label>
            <input type="date" id="filter-date-start" value="${new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0]}" style="width:100%;height:40px;padding:0 12px;border-radius:10px;border:1px solid var(--border-color);background:var(--bg-tertiary);color:var(--text-primary);font-size:0.85rem;box-sizing:border-box;">
          </div>
          <div class="filter-group">
            <label style="font-weight: 600; color: var(--text-secondary); font-size: 0.78rem; text-transform: uppercase; letter-spacing: 0.04em; margin-bottom: 6px; display: block;">Vencimento Final</label>
            <input type="date" id="filter-date-end" value="${new Date(new Date().getFullYear(), 11, 31).toISOString().split('T')[0]}" style="width:100%;height:40px;padding:0 12px;border-radius:10px;border:1px solid var(--border-color);background:var(--bg-tertiary);color:var(--text-primary);font-size:0.85rem;box-sizing:border-box;">
          </div>
          <div class="filter-group">
            <label style="font-weight: 600; color: var(--text-secondary); font-size: 0.78rem; text-transform: uppercase; letter-spacing: 0.04em; margin-bottom: 6px; display: block;">Tipo Operação</label>
            <select id="filter-fin-type" style="width:100%;height:40px;padding:0 12px;border-radius:10px;border:1px solid var(--border-color);background:var(--bg-tertiary);color:var(--text-primary);font-size:0.85rem;cursor:pointer;box-sizing:border-box;">
              <option value="Todos">Todos (Receitas/Despesas)</option>
              <option value="Receita">Receitas (Entradas)</option>
              <option value="Despesa">Despesas (Saídas)</option>
            </select>
          </div>
          <div class="filter-group">
            <label style="font-weight: 600; color: var(--text-secondary); font-size: 0.78rem; text-transform: uppercase; letter-spacing: 0.04em; margin-bottom: 6px; display: block;">Status (Filtro)</label>
            <div class="dropdown-check-list" id="dropdown-fin-status" style="width: 100%;">
              <div class="anchor" onclick="toggleFilterDropdown('dropdown-fin-status', event)" style="height:40px;display:flex;align-items:center;padding:0 12px;border-radius:10px;box-sizing:border-box;">Status: Todos</div>
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
            <label style="font-weight: 600; color: var(--text-secondary); font-size: 0.78rem; text-transform: uppercase; letter-spacing: 0.04em; margin-bottom: 6px; display: block;">Categorias</label>
            <div class="dropdown-check-list" id="dropdown-fin-category" style="width: 100%;">
              <div class="anchor" onclick="toggleFilterDropdown('dropdown-fin-category', event)" style="height:40px;display:flex;align-items:center;padding:0 12px;border-radius:10px;box-sizing:border-box;">Categorias: Todas</div>
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
            <label style="font-weight: 600; color: var(--text-secondary); font-size: 0.78rem; text-transform: uppercase; letter-spacing: 0.04em; margin-bottom: 6px; display: block;">Forma Pagamento</label>
            <div class="dropdown-check-list" id="dropdown-fin-method" style="width: 100%;">
              <div class="anchor" onclick="toggleFilterDropdown('dropdown-fin-method', event)" style="height:40px;display:flex;align-items:center;padding:0 12px;border-radius:10px;box-sizing:border-box;">Formas: Todas</div>
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
            <label style="font-weight: 600; color: var(--text-secondary); font-size: 0.78rem; text-transform: uppercase; letter-spacing: 0.04em; margin-bottom: 6px; display: block;">Busca Livre</label>
            <input type="text" id="filter-fin-search" placeholder="Paciente ou ID..." style="width:100%;height:40px;padding:0 12px;border-radius:10px;border:1px solid var(--border-color);background:var(--bg-tertiary);color:var(--text-primary);font-size:0.85rem;box-sizing:border-box;">
          </div>
          <div class="filter-group" style="grid-column: 1 / -1; margin-top: 8px; display: flex; gap: 12px;">
            <button type="button" onclick="document.getElementById('filter-date-start-fin').value=''; document.getElementById('filter-date-end-fin').value=''; document.getElementById('filter-fin-type').value='Todos'; document.getElementById('filter-fin-search').value=''; document.querySelectorAll('.filter-fin-item, .filter-fin-cat-item, .filter-fin-method-item').forEach(c=>c.checked=true); typeof filterAndRender==='function' && filterAndRender();" class="btn" style="flex: 1; max-width: 160px; height: 44px; background: var(--bg-tertiary); border: 1px solid var(--border-color); color: var(--text-primary); border-radius: 12px; font-weight: 700; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px;" title="Limpar Filtros"><i class="fa-solid fa-filter-circle-xmark"></i> Limpar</button>
            <button id="btn-open-fin-window-top" class="btn btn-primary" style="width:100%;height:44px;background:#0284c7;color:#fff;font-weight:700;font-size:0.88rem;border-radius:12px;display:flex;align-items:center;justify-content:center;gap:8px;box-shadow:0 2px 10px rgba(2,132,199,0.35);cursor:pointer;border:none;">
              <i class="fa-solid fa-window-restore"></i> Visualizar Listagem em Janela Dedicada
            </button>
          </div>
        </div>
      `;
    } else if (activeTab === 'schedules') {
      filtersContainer.innerHTML = `
        <div class="filters-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 16px; align-items: flex-end;">
          <div class="filter-group">
            <label style="font-weight: 600; color: var(--text-secondary); font-size: 0.78rem; text-transform: uppercase; letter-spacing: 0.04em; margin-bottom: 6px; display: block;">Data Inicial</label>
            <input type="date" id="filter-date-start-sched" style="width:100%;height:40px;padding:0 12px;border-radius:10px;border:1px solid var(--border-color);background:var(--bg-tertiary);color:var(--text-primary);font-size:0.85rem;box-sizing:border-box;">
          </div>
          <div class="filter-group">
            <label style="font-weight: 600; color: var(--text-secondary); font-size: 0.78rem; text-transform: uppercase; letter-spacing: 0.04em; margin-bottom: 6px; display: block;">Data Final</label>
            <input type="date" id="filter-date-end-sched" style="width:100%;height:40px;padding:0 12px;border-radius:10px;border:1px solid var(--border-color);background:var(--bg-tertiary);color:var(--text-primary);font-size:0.85rem;box-sizing:border-box;">
          </div>
          <div class="filter-group">
            <label style="font-weight: 600; color: var(--text-secondary); font-size: 0.78rem; text-transform: uppercase; letter-spacing: 0.04em; margin-bottom: 6px; display: block;">Categoria Profissional</label>
            <select id="filter-sched-cat" style="width:100%;height:40px;padding:0 12px;border-radius:10px;border:1px solid var(--border-color);background:var(--bg-tertiary);color:var(--text-primary);font-size:0.85rem;cursor:pointer;box-sizing:border-box;">
              <option value="Todos">Todas (Médicos &amp; Enfermeiros)</option>
              <option value="medico">Médicos (Corpo Clínico)</option>
              <option value="enfermeiro">Enfermeiros (Equipe Enfermagem)</option>
            </select>
          </div>
          <div class="filter-group">
            <label style="font-weight: 600; color: var(--text-secondary); font-size: 0.78rem; text-transform: uppercase; letter-spacing: 0.04em; margin-bottom: 6px; display: block;">Status do Plantão</label>
            <select id="filter-sched-status" style="width:100%;height:40px;padding:0 12px;border-radius:10px;border:1px solid var(--border-color);background:var(--bg-tertiary);color:var(--text-primary);font-size:0.85rem;cursor:pointer;box-sizing:border-box;">
              <option value="Todos">Todos os Status</option>
              <option value="Em Andamento">Em Andamento (Hoje)</option>
              <option value="Confirmado">Confirmado / Agendado</option>
              <option value="Concluído">Concluído</option>
              <option value="Troca Solicitada">Troca Solicitada</option>
            </select>
          </div>
          <div class="filter-group">
            <label style="font-weight: 600; color: var(--text-secondary); font-size: 0.78rem; text-transform: uppercase; letter-spacing: 0.04em; margin-bottom: 6px; display: block;">Busca Livre</label>
            <input type="text" id="filter-sched-search" placeholder="Nome, CRM/COREN ou Setor..." style="width:100%;height:40px;padding:0 12px;border-radius:10px;border:1px solid var(--border-color);background:var(--bg-tertiary);color:var(--text-primary);font-size:0.85rem;box-sizing:border-box;">
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
          // apiFetch returns { data: [...] } â€“ extract the array
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

        <!-- COMPONENTE HÃBRIDO (ANEL NEON + BARRAS POR CATEGORIA) -->
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
                  <button class="btn btn-outline btn-view-boleto" style="font-size:0.72rem;padding:3px 9px;" data-id="${t.id}" data-client="${t.client}" data-desc="${t.desc}" data-duedate="${t.dueDate}" data-amount="${t.amountFormatted}" data-val="${t.amount}"><i class="fa-solid fa-barcode"></i> 2Âª Via</button>
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

    } else if (activeTab === 'encounters') {
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
          <th style="text-align:center;">Ações</th>
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
        const manchesterHex = { 'Vermelho': '#ef4444', 'Laranja': '#f97316', 'Amarelo': '#eab308', 'Verde': '#22c55e', 'Azul': '#3b82f6', 'Branco': '#f1f5f9' };
        if (dynTableBody) dynTableBody.innerHTML = currentFilteredList.map(e => {
          const name = hasPEP ? (e.patientName || 'Desconhecido') : abbreviateName(e.patientName || 'Desconhecido');
          const dateStr = e.admitted_at ? new Date(e.admitted_at).toLocaleString('pt-BR') : '-';
          const mc = e.manchesterColor;
          const hex = mc ? (manchesterHex[mc] || '#818cf8') : null;
          const displayColor = mc ? `<span style="display:inline-flex;align-items:center;gap:5px;padding:3px 10px;border-radius:20px;font-size:0.75rem;font-weight:700;background:${hex}22;color:${hex};border:1px solid ${hex}55;">${mc.toUpperCase()}</span>` : '<span style="color:var(--text-muted);font-size:0.8rem;">—</span>';
          const statusColors = { 'Aguardando_Triagem': '#fbbf24', 'Aguardando_Atendimento': '#38bdf8', 'Em_Atendimento': '#a78bfa', 'Finalizado': '#34d399' };
          const stColor = statusColors[e.status] || '#94a3b8';
          const stLabel = statusMap[e.status] || e.status;
          const encIdShort = (e.id || '').substring(0, 8) + '...';
          return `
            <tr class="report-enc-row" data-enc-id="${e.id}" style="border-bottom:1px solid var(--border-color);cursor:pointer;transition:background 0.15s ease, box-shadow 0.15s ease;"
              onmouseenter="this.style.background='rgba(99,102,241,0.07)'; this.style.boxShadow='inset 3px 0 0 #818cf8';"
              onmouseleave="this.style.background=''; this.style.boxShadow='';">
              <td class="col-checkbox" onclick="event.stopPropagation()"><input type="checkbox" class="record-checkbox" data-id="${e.id}" checked></td>
              <td style="font-family:monospace;font-weight:700;color:var(--color-primary);font-size:0.83rem;" title="${e.id}">${encIdShort}</td>
              <td style="font-weight:600;color:var(--text-primary);">${name}</td>
              <td>${displayColor}</td>
              <td style="font-size:0.83rem;color:var(--text-secondary);">${e.type === 'Urgencia' ? 'Urgência' : 'Ambulatório'}</td>
              <td><span style="font-size:0.77rem;font-weight:700;padding:3px 10px;border-radius:20px;background:${stColor}1a;color:${stColor};border:1px solid ${stColor}44;">${stLabel}</span></td>
              <td style="font-size:0.8rem;color:var(--text-secondary);">${dateStr}</td>
              <td style="text-align:center;" onclick="event.stopPropagation()">
                <div style="display:flex;gap:5px;justify-content:center;">
                  <button class="btn-report-detail" data-enc-id="${e.id}" style="background:rgba(99,102,241,0.15);border:1px solid rgba(99,102,241,0.4);color:#818cf8;border-radius:8px;padding:4px 9px;font-size:0.72rem;font-weight:600;cursor:pointer;transition:all 0.2s;" title="Ver detalhes completos"><i class="fa-solid fa-eye"></i> Detalhes</button>
                  ${hasPEP ? `<button class="btn-report-pep" data-enc-id="${e.id}" style="background:rgba(236,72,153,0.15);border:1px solid rgba(236,72,153,0.4);color:#f472b6;border-radius:8px;padding:4px 9px;font-size:0.72rem;font-weight:600;cursor:pointer;transition:all 0.2s;" title="Abrir Prontuário Eletrônico"><i class="fa-solid fa-file-medical"></i> PEP</button>` : ''}
                </div>
              </td>
            </tr>
          `;
        }).join('');

        // Wire up row clicks and action buttons
        dynTableBody.querySelectorAll('.report-enc-row').forEach(row => {
          row.addEventListener('click', () => openEncounterReportDetail(row.dataset.encId));
        });
        dynTableBody.querySelectorAll('.btn-report-detail').forEach(btn => {
          btn.addEventListener('click', (ev) => { ev.stopPropagation(); openEncounterReportDetail(btn.dataset.encId); });
        });
        dynTableBody.querySelectorAll('.btn-report-pep').forEach(btn => {
          btn.addEventListener('click', (ev) => { ev.stopPropagation(); if (typeof window.openPEPModal === 'function') window.openPEPModal(btn.dataset.encId); });
        });
      }
    } else if (activeTab === 'schedules') {
      const dateStart = document.getElementById('filter-date-start-sched')?.value || '';
      const dateEnd = document.getElementById('filter-date-end-sched')?.value || '';
      const filterCat = document.getElementById('filter-sched-cat')?.value || 'Todos';
      const filterStatus = document.getElementById('filter-sched-status')?.value || 'Todos';
      const search = (document.getElementById('filter-sched-search')?.value || '').toLowerCase().trim();

      const allSchedules = state.dutySchedules || [];

      currentFilteredList = allSchedules.filter(s => {
        if (dateStart && s.shiftDate < dateStart) return false;
        if (dateEnd && s.shiftDate > dateEnd) return false;
        if (filterCat !== 'Todos' && s.category !== filterCat) return false;
        if (filterStatus !== 'Todos' && s.status !== filterStatus) return false;
        if (search) {
          const matchName = (s.professionalName || '').toLowerCase().includes(search);
          const matchCrm = (s.crm_coren || '').toLowerCase().includes(search);
          const matchSector = (s.sector || s.roomName || '').toLowerCase().includes(search);
          if (!matchName && !matchCrm && !matchSector) return false;
        }
        return true;
      });

      if (dynTableHead) dynTableHead.innerHTML = `
        <tr>
          <th class="col-checkbox"><input type="checkbox" id="select-all-records" checked></th>
          <th>ID</th>
          <th>Profissional</th>
          <th>Registro</th>
          <th>Categoria &amp; Função</th>
          <th>Data Plantão</th>
          <th>Turno / Duração</th>
          <th>Setor</th>
          <th>Status</th>
        </tr>
      `;

      if (currentFilteredList.length === 0) {
        if (dynTableBody) dynTableBody.innerHTML = `<tr><td colspan="9" style="text-align: center; color: var(--text-secondary); padding: 20px;">Nenhum plantão ou escala encontrado com os filtros atuais.</td></tr>`;
      } else {
        if (dynTableBody) dynTableBody.innerHTML = currentFilteredList.map(s => {
          const isMed = s.category === 'medico' || (s.crm_coren && s.crm_coren.includes('CRM'));
          const dateStr = s.shiftDate ? new Date(s.shiftDate + 'T00:00:00').toLocaleDateString('pt-BR') : '-';
          const statusColors = { 'Em Andamento': '#fbbf24', 'Confirmado': '#38bdf8', 'Concluído': '#34d399', 'Troca Solicitada': '#f472b6' };
          const stColor = statusColors[s.status] || '#94a3b8';
          const catBadge = isMed ? `<span style="padding:2px 8px;border-radius:12px;font-size:0.7rem;font-weight:700;background:rgba(99,102,241,0.15);color:#818cf8;border:1px solid rgba(99,102,241,0.3);">Médico</span>` : `<span style="padding:2px 8px;border-radius:12px;font-size:0.7rem;font-weight:700;background:rgba(236,72,153,0.15);color:#f472b6;border:1px solid rgba(236,72,153,0.3);">Enfermeiro</span>`;

          return `
            <tr style="border-bottom:1px solid var(--border-color);">
              <td class="col-checkbox"><input type="checkbox" class="record-checkbox" data-id="${s.id}" checked></td>
              <td style="font-family:monospace;font-weight:700;color:var(--color-primary);font-size:0.83rem;">${s.id}</td>
              <td style="font-weight:600;color:var(--text-primary);">${s.professionalName}</td>
              <td style="font-family:monospace;font-size:0.82rem;">${s.crm_coren || '-'}</td>
              <td>${catBadge} <span style="font-size:0.8rem;color:var(--text-secondary);">${s.specialty_role || '-'}</span></td>
              <td style="font-size:0.83rem;color:var(--text-primary);font-weight:600;">${dateStr}</td>
              <td style="font-size:0.8rem;color:var(--text-secondary);">${s.shiftType || 'Plantão'} (${s.workloadHours || 12}h)</td>
              <td style="font-size:0.83rem;color:var(--text-primary);">${s.roomName || s.sector || 'Geral'}</td>
              <td><span style="font-size:0.75rem;font-weight:700;padding:3px 9px;border-radius:20px;background:${stColor}1a;color:${stColor};border:1px solid ${stColor}44;">${s.status}</span></td>
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

    // â”€â”€â”€ RESUMO + GRÃFICOS DINÂMICOS POR ABA â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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
      // â”€â”€ KPIs
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
      // â”€â”€ KPIs Atendimentos
      const total = currentFilteredList.length;

      const urgencias = currentFilteredList.filter(e => e.type === 'Urgencia').length;
      const ambulatorio = total - urgencias;
      const finalizados = currentFilteredList.filter(e => e.status === 'Finalizado').length;
      const emAtendimento = currentFilteredList.filter(e => e.status === 'Em_Atendimento').length;
      const aguardando = currentFilteredList.filter(e => e.status === 'Aguardando_Triagem' || e.status === 'Aguardando_Atendimento').length;
      const pctFin = total > 0 ? Math.round((finalizados / total) * 100) : 0;

      const manchesterCounts = {};
      currentFilteredList.forEach(e => { const k = e.manchesterColor || 'Não Classificado'; manchesterCounts[k] = (manchesterCounts[k] || 0) + 1; });

      const statusCountsRaw = {};
      const statusDisplayMap = { Aguardando_Triagem: 'Ag. Triagem', Aguardando_Atendimento: 'Ag. Consulta', Em_Atendimento: 'Em Consulta', Finalizado: 'Finalizado' };
      const statusColorMap = { Aguardando_Triagem: '#fbbf24', Aguardando_Atendimento: '#38bdf8', Em_Atendimento: '#a78bfa', Finalizado: '#34d399' };
      currentFilteredList.forEach(e => { statusCountsRaw[e.status] = (statusCountsRaw[e.status] || 0) + 1; });

      const manchColors = { Vermelho: '#ef4444', Laranja: '#f97316', Amarelo: '#eab308', Verde: '#22c55e', Azul: '#3b82f6', 'Não Classificado': '#64748b' };

      // Helper: KPI card
      const kpiCard = (value, label, color, icon, filterKey, filterVal) => `
        <div class="enc-kpi-card" data-filter-key="${filterKey}" data-filter-val="${filterVal}"
          style="
            padding:18px 16px;border-radius:16px;text-align:center;cursor:pointer;
            background:${color}0d;border:1.5px solid ${color}33;
            box-shadow:0 4px 20px ${color}15;
            transition:all 0.25s cubic-bezier(0.34,1.56,0.64,1);
            position:relative;overflow:hidden;
          "
          onmouseenter="this.style.transform='translateY(-4px) scale(1.03)';this.style.boxShadow='0 12px 30px ${color}30';this.style.borderColor='${color}66';"
          onmouseleave="this.style.transform='';this.style.boxShadow='0 4px 20px ${color}15';this.style.borderColor='${color}33';"
        >
          <div style="position:absolute;top:-20px;right:-20px;width:70px;height:70px;border-radius:50%;background:${color}10;"></div>
          <i class="fa-solid ${icon}" style="font-size:1.3rem;color:${color};margin-bottom:8px;display:block;opacity:0.85;"></i>
          <div style="font-size:2rem;font-weight:900;font-family:'Outfit',sans-serif;background:linear-gradient(135deg,${color},${color}cc);-webkit-background-clip:text;-webkit-text-fill-color:transparent;line-height:1;margin-bottom:4px;">${value}</div>
          <div style="font-size:0.68rem;text-transform:uppercase;letter-spacing:.07em;color:var(--text-muted);font-weight:600;">${label}</div>
        </div>`;

      summaryContainer.innerHTML = `
        <!-- KPI Cards Atendimentos -->
        <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:22px;">
          ${kpiCard(total, 'Total Atendimentos', '#0284c7', 'fa-notes-medical', 'all', '')}
          ${kpiCard(urgencias, 'Urgências', '#ef4444', 'fa-truck-medical', 'type', 'Urgencia')}
          ${kpiCard(ambulatorio, 'Ambulatório', '#0ea5e9', 'fa-hospital', 'type', 'Ambulatorio')}
          ${kpiCard(pctFin + '%', 'Concluídos', '#10b981', 'fa-circle-check', 'status', 'Finalizado')}
        </div>

        <!-- Charts row -->
        <div style="display:grid;grid-template-columns:300px 1fr;gap:16px;margin-bottom:20px;">

          <!-- DONUT — Classificação Manchester -->
          <div class="chart-card" style="padding:20px;border-radius:16px;border:1px solid #1e293b;background:#111827;">
            <h4 style="margin:0 0 14px;font-size:0.88rem;font-weight:700;color:var(--text-primary);display:flex;align-items:center;gap:8px;">
              <i class="fa-solid fa-shield-halved" style="color:#0284c7;"></i> Classificação Manchester
              <span style="margin-left:auto;font-size:0.68rem;color:var(--text-muted);font-weight:400;">Clique para filtrar</span>
            </h4>
            <div style="position:relative;width:180px;height:180px;margin:0 auto 14px;">
              <canvas id="chart-enc-manchester"></canvas>
              <div id="manch-donut-kpi" style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);text-align:center;pointer-events:none;">
                <span style="font-family:'Outfit';font-size:2rem;font-weight:900;color:#ffffff;display:block;line-height:1;">${total}</span>
                <span style="font-size:0.6rem;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:.05em;">TOTAL</span>
              </div>
            </div>
            <div id="manch-legend" style="display:flex;flex-direction:column;gap:6px;"></div>
          </div>

          <!-- PROGRESS BARS — Status dos Atendimentos -->
          <div class="glass-card" style="padding:20px;border-radius:16px;border:1px solid rgba(129,140,248,0.2);background:rgba(129,140,248,0.04);">
            <h4 style="margin:0 0 16px;font-size:0.88rem;font-weight:700;color:var(--text-primary);display:flex;align-items:center;gap:8px;">
              <i class="fa-solid fa-chart-gantt" style="color:#818cf8;"></i> Situação dos Atendimentos
              <span style="margin-left:auto;font-size:0.68rem;color:var(--text-muted);font-weight:400;">Clique para filtrar</span>
            </h4>
            <div id="status-progress-list" style="display:flex;flex-direction:column;gap:12px;"></div>

            <!-- Mini donut ring for completion -->
            <div style="margin-top:20px;padding-top:16px;border-top:1px solid rgba(255,255,255,0.06);display:flex;align-items:center;gap:16px;">
              <div style="position:relative;width:64px;height:64px;flex-shrink:0;">
                <canvas id="chart-enc-completion-ring"></canvas>
                <div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;">
                  <span style="font-size:0.8rem;font-weight:800;font-family:'Outfit';color:#34d399;">${pctFin}%</span>
                </div>
              </div>
              <div>
                <div style="font-size:0.78rem;font-weight:700;color:var(--text-primary);">Taxa de Conclusão</div>
                <div style="font-size:0.72rem;color:var(--text-muted);margin-top:2px;">${finalizados} de ${total} atendimentos finalizados</div>
                <div style="font-size:0.72rem;color:#a78bfa;margin-top:2px;"><i class="fa-solid fa-circle-dot"></i> ${emAtendimento} em andamento • <span style="color:#fbbf24;">${aguardando} aguardando</span></div>
              </div>
            </div>
          </div>
        </div>

        <!-- Manchester horizontal bars (same style as financial) -->
        <div class="glass-card" style="padding:20px;border-radius:16px;border:1px solid rgba(255,255,255,0.07);margin-bottom:6px;">
          <h4 style="margin:0 0 14px;font-size:0.88rem;font-weight:700;color:var(--text-primary);display:flex;align-items:center;gap:8px;">
            <i class="fa-solid fa-bars-progress" style="color:#fbbf24;"></i> Distribuição por Classificação de Risco
            <span style="margin-left:auto;font-size:0.68rem;color:var(--text-muted);font-weight:400;">Clique em cada linha para filtrar a tabela</span>
          </h4>
          <div id="manch-progress-list" style="display:flex;flex-direction:column;gap:10px;"></div>
        </div>
      `;

      // Wire KPI card click-to-filter
      summaryContainer.querySelectorAll('.enc-kpi-card').forEach(card => {
        card.addEventListener('click', () => {
          const key = card.dataset.filterKey;
          const val = card.dataset.filterVal;
          if (key === 'all') { filterAndRender(); return; }
          // apply filter via checkbox state
          if (key === 'type') {
            document.querySelectorAll('.filter-type-item').forEach(cb => { cb.checked = cb.value === val; });
            document.querySelectorAll('.filter-status-item').forEach(cb => { cb.checked = true; });
          } else if (key === 'status') {
            document.querySelectorAll('.filter-status-item').forEach(cb => { cb.checked = cb.value === val; });
            document.querySelectorAll('.filter-type-item').forEach(cb => { cb.checked = true; });
          }
          filterAndRender();
          if (typeof showToast === 'function') showToast(`Filtrando por: ${card.querySelector('div:last-child')?.textContent}`);
        });
      });

      if (ChartClass) {
        setTimeout(() => {
          // â”€â”€â”€ DONUT MANCHESTER
          const mLabels = Object.keys(manchesterCounts);
          const mVals = mLabels.map(k => manchesterCounts[k]);
          const mColors = mLabels.map(k => manchColors[k] || '#a78bfa');

          const ctxManch = document.getElementById('chart-enc-manchester');
          let manchChartInst = null;
          if (ctxManch) {
            manchChartInst = new ChartClass(ctxManch.getContext('2d'), {
              type: 'doughnut',
              data: { labels: mLabels, datasets: [{ data: mVals, backgroundColor: mColors.map(c => c + 'cc'), borderColor: mColors, borderWidth: 2, hoverOffset: 8 }] },
              options: {
                responsive: true, maintainAspectRatio: false, cutout: '68%',
                plugins: { legend: { display: false }, tooltip: { callbacks: { label: ctx => ` ${ctx.label}: ${ctx.parsed} atend. (${Math.round(ctx.parsed / total * 100)}%)` } } },
                onClick: (evt, elements) => {
                  if (!elements.length) return;
                  const label = mLabels[elements[0].index];
                  if (label === 'Não Classificado') {
                    document.querySelectorAll('.filter-manchester-item').forEach(cb => { cb.checked = cb.value === 'null'; });
                  } else {
                    document.querySelectorAll('.filter-manchester-item').forEach(cb => { cb.checked = cb.value === label; });
                  }
                  filterAndRender();
                  if (typeof showToast === 'function') showToast(`Filtrando por Manchester: ${label}`);
                }
              }
            });
          }

          // Custom Manchester legend
          const manchLegend = document.getElementById('manch-legend');
          if (manchLegend) {
            manchLegend.innerHTML = mLabels.map((label, i) => {
              const pct = total > 0 ? Math.round(mVals[i] / total * 100) : 0;
              return `<div class="manch-legend-item" data-manchester="${label}" style="display:flex;align-items:center;gap:8px;padding:5px 8px;border-radius:8px;cursor:pointer;transition:background .15s;"
                onmouseenter="this.style.background='rgba(255,255,255,0.06)';" onmouseleave="this.style.background='';">
                <span style="width:11px;height:11px;border-radius:3px;background:${mColors[i]};flex-shrink:0;"></span>
                <span style="font-size:0.78rem;color:var(--text-secondary);flex:1;">${label}</span>
                <strong style="font-size:0.82rem;color:${mColors[i]};">${mVals[i]}</strong>
                <span style="font-size:0.68rem;color:var(--text-muted);">${pct}%</span>
              </div>`;
            }).join('');
            manchLegend.querySelectorAll('.manch-legend-item').forEach(item => {
              item.addEventListener('click', () => {
                const label = item.dataset.manchester;
                if (label === 'Não Classificado') {
                  document.querySelectorAll('.filter-manchester-item').forEach(cb => { cb.checked = cb.value === 'null'; });
                } else {
                  document.querySelectorAll('.filter-manchester-item').forEach(cb => { cb.checked = cb.value === label; });
                }
                filterAndRender();
              });
            });
          }

          // â”€â”€â”€ STATUS PROGRESS BARS
          const statusList = document.getElementById('status-progress-list');
          const statusOrder = ['Finalizado', 'Em_Atendimento', 'Aguardando_Atendimento', 'Aguardando_Triagem'];
          if (statusList) {
            statusList.innerHTML = statusOrder.map(sk => {
              const count = statusCountsRaw[sk] || 0;
              const pct = total > 0 ? ((count / total) * 100).toFixed(1) : '0.0';
              const color = statusColorMap[sk] || '#94a3b8';
              const label = statusDisplayMap[sk] || sk;
              return `<div class="enc-status-progress-row" data-status="${sk}" style="cursor:pointer;"
                onmouseenter="this.querySelector('.enc-bar-fill').style.filter='brightness(1.3)';"
                onmouseleave="this.querySelector('.enc-bar-fill').style.filter='';">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:5px;">
                  <span style="font-size:0.8rem;color:var(--text-secondary);display:flex;align-items:center;gap:7px;">
                    <span style="width:8px;height:8px;border-radius:50%;background:${color};box-shadow:0 0 6px ${color}88;"></span>${label}
                  </span>
                  <span style="font-size:0.78rem;font-weight:700;color:${color};">${count} <span style="font-size:0.68rem;color:var(--text-muted);font-weight:400;">(${pct}%)</span></span>
                </div>
                <div style="height:7px;background:rgba(255,255,255,0.07);border-radius:10px;overflow:hidden;">
                  <div class="enc-bar-fill" style="height:100%;width:0%;background:linear-gradient(90deg,${color}99,${color});border-radius:10px;transition:width 1.1s cubic-bezier(0.165,0.84,0.44,1),filter .2s;" data-target="${pct}"></div>
                </div>
              </div>`;
            }).join('');

            statusList.querySelectorAll('.enc-status-progress-row').forEach(row => {
              row.addEventListener('click', () => {
                const sk = row.dataset.status;
                document.querySelectorAll('.filter-status-item').forEach(cb => { cb.checked = cb.value === sk; });
                filterAndRender();
                if (typeof showToast === 'function') showToast(`Filtrando por status: ${statusDisplayMap[sk] || sk}`);
              });
            });

            // Animate bars
            setTimeout(() => {
              statusList.querySelectorAll('.enc-bar-fill').forEach(bar => {
                bar.style.width = bar.dataset.target + '%';
              });
            }, 80);
          }

          // â”€â”€â”€ COMPLETION RING (mini)
          const ringCtx = document.getElementById('chart-enc-completion-ring');
          if (ringCtx) {
            new ChartClass(ringCtx.getContext('2d'), {
              type: 'doughnut',
              data: {
                datasets: [{
                  data: [finalizados, total - finalizados],
                  backgroundColor: ['#34d399', 'rgba(255,255,255,0.06)'],
                  borderWidth: 0, hoverOffset: 0
                }]
              },
              options: { responsive: true, maintainAspectRatio: false, cutout: '80%', plugins: { legend: { display: false }, tooltip: { enabled: false } } }
            });
          }

          // â”€â”€â”€ MANCHESTER HORIZONTAL PROGRESS BARS
          const manchProgList = document.getElementById('manch-progress-list');
          if (manchProgList) {
            const iconMap = { Vermelho: 'fa-circle-xmark', Laranja: 'fa-triangle-exclamation', Amarelo: 'fa-clock', Verde: 'fa-circle-check', Azul: 'fa-circle-minus', 'Não Classificado': 'fa-circle-question' };
            manchProgList.innerHTML = mLabels.map((label, i) => {
              const pct = total > 0 ? ((mVals[i] / total) * 100).toFixed(1) : '0.0';
              const color = mColors[i];
              return `<div class="manch-prog-row" data-manchester="${label}" style="cursor:pointer;"
                onmouseenter="this.querySelector('.manch-bar-fill').style.filter='brightness(1.25)';"
                onmouseleave="this.querySelector('.manch-bar-fill').style.filter='';">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:5px;">
                  <span style="font-size:0.8rem;color:var(--text-secondary);display:flex;align-items:center;gap:7px;">
                    <i class="fa-solid ${iconMap[label] || 'fa-circle'}" style="color:${color};font-size:0.82rem;"></i> ${label}
                  </span>
                  <span style="font-size:0.8rem;font-weight:700;color:${color};">${mVals[i]} atend. <span style="font-size:0.68rem;color:var(--text-muted);font-weight:400;">(${pct}%)</span></span>
                </div>
                <div style="height:6px;background:rgba(255,255,255,0.06);border-radius:10px;overflow:hidden;">
                  <div class="manch-bar-fill" style="height:100%;width:0%;background:${color};border-radius:10px;transition:width 1.1s cubic-bezier(0.165,0.84,0.44,1),filter .2s;" data-target="${pct}"></div>
                </div>
              </div>`;
            }).join('');

            manchProgList.querySelectorAll('.manch-prog-row').forEach(row => {
              row.addEventListener('click', () => {
                const label = row.dataset.manchester;
                if (label === 'Não Classificado') {
                  document.querySelectorAll('.filter-manchester-item').forEach(cb => { cb.checked = cb.value === 'null'; });
                } else {
                  document.querySelectorAll('.filter-manchester-item').forEach(cb => { cb.checked = cb.value === label; });
                }
                filterAndRender();
                if (typeof showToast === 'function') showToast(`Filtrando por Manchester: ${label}`);
              });
            });

            setTimeout(() => {
              manchProgList.querySelectorAll('.manch-bar-fill').forEach(bar => {
                bar.style.width = bar.dataset.target + '%';
              });
            }, 100);
          }

        }, 60);
      }
    }

    // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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
            <div style="font-size: 7.5pt; color: #1d4ed8; font-weight: 700; text-transform: uppercase; margin-bottom: 2px;">🕒 A Vencer</div>
            <div style="font-size: 13pt; font-weight: 800; color: #2563eb;">${fmt(financialSummary.aVencerVal)}</div>
            <div style="font-size: 7.5pt; color: #4b5563;">${financialSummary.aVencerC} parcela(s)</div>
          </div>
          <div style="background: #fff1f2; border: 1.5px solid #fda4af; border-radius: 8px; padding: 10px 12px;">
            <div style="font-size: 7.5pt; color: #be123c; font-weight: 700; text-transform: uppercase; margin-bottom: 2px;">â— Vencidas</div>
            <div style="font-size: 13pt; font-weight: 800; color: #e11d48;">${fmt(financialSummary.vencidasVal)}</div>
            <div style="font-size: 7.5pt; color: #4b5563;">${financialSummary.vencidasC} parcela(s)</div>
          </div>
          <div style="background: #f5f3ff; border: 1.5px solid #c4b5fd; border-radius: 8px; padding: 10px 12px;">
            <div style="font-size: 7.5pt; color: #7c3aed; font-weight: 700; text-transform: uppercase; margin-bottom: 2px;">âš–ï¸ Saldo Líquido</div>
            <div style="font-size: 13pt; font-weight: 800; color: ${financialSummary.saldo >= 0 ? '#16a34a' : '#e11d48'};">${fmt(financialSummary.saldo)}</div>
            <div style="font-size: 7.5pt; color: #4b5563;">Receitas − Despesas</div>
          </div>
          <div style="background: #fffbeb; border: 1.5px solid #fcd34d; border-radius: 8px; padding: 10px 12px;">
            <div style="font-size: 7.5pt; color: #b45309; font-weight: 700; text-transform: uppercase; margin-bottom: 2px;">ðŸ† Bonificadas</div>
            <div style="font-size: 13pt; font-weight: 800; color: #d97706;">${fmt(financialSummary.bonificadasVal)}</div>
            <div style="font-size: 7.5pt; color: #4b5563;">${financialSummary.bonificadasC} parcela(s)</div>
          </div>
          <div style="background: #fef2f2; border: 1.5px solid #fca5a5; border-radius: 8px; padding: 10px 12px;">
            <div style="font-size: 7.5pt; color: #dc2626; font-weight: 700; text-transform: uppercase; margin-bottom: 2px;">🚫 Outras</div>
            <div style="font-size: 13pt; font-weight: 800; color: #dc2626;">${fmt((financialSummary.suspensasVal||0)+(financialSummary.canceladasVal||0)+(financialSummary.excluidasVal||0))}</div>
            <div style="font-size: 7.5pt; color: #4b5563;">Suspensas / Canceladas / Excluídas</div>
          </div>
        </div>

        <!-- GRÃFICOS como imagens base64 -->
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
        <div class="header" style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #6366f1; padding-bottom: 14px; margin-bottom: 20px;">
          <div style="display: flex; align-items: center; gap: 14px;">
            <div style="background: #ffffff; padding: 6px 14px; border-radius: 12px; box-shadow: 0 4px 14px rgba(0,0,0,0.08); border: 1.5px solid #e2e8f0; display: flex; align-items: center; justify-content: center;">
              <img src="/assets/logo.png" alt="Health Nexus" style="height: 42px; width: auto; object-fit: contain;">
            </div>
            <div>
              <div style="font-family: 'Outfit', sans-serif; font-size: 16pt; font-weight: 800; color: #1e1b4b; margin: 0; line-height: 1.1;">HEALTH NEXUS</div>
              <div style="font-size: 8.5pt; color: #64748b; font-weight: 500; margin-top: 2px;">Gestão Hospitalar &amp; Inteligência Médica</div>
            </div>
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
              <span style="font-size: 0.78rem; color: var(--text-muted);">Quitação de Título Financeiro • Nosso NÂº: <strong>${installment.id}</strong></span>
            </div>
          </div>
          <button id="close-pay-modal-btn" class="btn-icon" style="background: rgba(255,255,255,0.08); border: 1px solid var(--border-color); width: 34px; height: 34px; border-radius: 50%; font-size: 1.1rem; color: var(--text-primary); cursor: pointer; display: flex; align-items: center; justify-content: center;"><i class="fa-solid fa-xmark"></i></button>
        </div>

        <div style="background: rgba(0,0,0,0.2); border: 1px solid var(--border-color); border-radius: 12px; padding: 14px; margin-bottom: 18px; font-size: 0.84rem;">
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
            <div><span style="color: var(--text-muted); display: block; font-size: 0.74rem;">PACIENTE / FAVORECIDO</span><strong>${installment.client || installment.patientName || 'Cliente Particular'}</strong></div>
            <div><span style="color: var(--text-muted); display: block; font-size: 0.74rem;">NÂº PARCELA</span><strong style="color: #00f2fe;">${instNumStr}</strong></div>
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
                <option value="Pix" ${installment.paymentMethod === 'Pix' ? 'selected' : ''}>💠 Pix (Transferência Instantânea)</option>
                <option value="Boleto" ${installment.paymentMethod === 'Boleto' ? 'selected' : ''}>📄 Boleto Bancário</option>
                <option value="Cartão de Crédito" ${installment.paymentMethod === 'Cartão de Crédito' ? 'selected' : ''}>💳 Cartão de Crédito</option>
                <option value="Cartão de Débito" ${installment.paymentMethod === 'Cartão de Débito' ? 'selected' : ''}>💳 Cartão de Débito</option>
                <option value="Dinheiro" ${installment.paymentMethod === 'Dinheiro' ? 'selected' : ''}>💵 Dinheiro / Espécie</option>
                <option value="Convênio" ${installment.paymentMethod === 'Convênio' ? 'selected' : ''}>🏥 Faturamento Convênio</option>
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
            <label style="font-size: 0.8rem; font-weight: 600; color: var(--text-primary); display: block; margin-bottom: 6px;">Observação / NÂº do Comprovante</label>
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
          <div class="fin-kpi-card" data-filter="All" style="background: linear-gradient(135deg, rgba(255,255,255,0.1), rgba(255,255,255,0.02)); border: 1px solid rgba(255,255,255,0.2); border-radius: 14px; padding: 14px 16px; cursor: pointer; transition: all 0.2s ease;" onmouseover="this.style.transform='translateY(-2px)'" onmouseout="this.style.transform='translateY(0)'" title="Ver Todos os Títulos">
            <div style="font-size: 0.7rem; color: #fff; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px;"><i class="fa-solid fa-list-ul"></i> Visão Geral</div>
            <div style="font-family: \'Outfit\'; font-size: 1.3rem; font-weight: 800; color: #fff;">${fmt(totalGeral)}</div>
            <div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 2px;">${installmentsList.length} parcelas no total</div>
          </div>
          <div class="fin-kpi-card" data-filter="Pagas" style="background: linear-gradient(135deg, rgba(52,211,153,0.12), rgba(52,211,153,0.04)); border: 1px solid rgba(52,211,153,0.35); border-radius: 14px; padding: 14px 16px; cursor: pointer; transition: all 0.2s ease;" onmouseover="this.style.transform='translateY(-2px)'" onmouseout="this.style.transform='translateY(0)'">
            <div style="font-size: 0.7rem; color: #34d399; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px;"><i class="fa-solid fa-circle-check"></i> Pagas</div>
            <div style="font-family: 'Outfit'; font-size: 1.3rem; font-weight: 800; color: #34d399;">${fmt(pagasVal)}</div>
            <div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 2px;">${pagasC} parcelas</div>
          </div>
          <div class="fin-kpi-card" data-filter="A Vencer" style="background: linear-gradient(135deg, rgba(0,242,254,0.12), rgba(0,242,254,0.04)); border: 1px solid rgba(0,242,254,0.35); border-radius: 14px; padding: 14px 16px; cursor: pointer; transition: all 0.2s ease;" onmouseover="this.style.transform='translateY(-2px)'" onmouseout="this.style.transform='translateY(0)'">
            <div style="font-size: 0.7rem; color: #00f2fe; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px;"><i class="fa-solid fa-clock"></i> A Vencer</div>
            <div style="font-family: 'Outfit'; font-size: 1.3rem; font-weight: 800; color: #00f2fe;">${fmt(aVencerVal)}</div>
            <div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 2px;">${aVencerC} parcelas</div>
          </div>
          <div class="fin-kpi-card" data-filter="Vencidas" style="background: linear-gradient(135deg, rgba(244,63,94,0.12), rgba(244,63,94,0.04)); border: 1px solid rgba(244,63,94,0.35); border-radius: 14px; padding: 14px 16px; cursor: pointer; transition: all 0.2s ease;" onmouseover="this.style.transform='translateY(-2px)'" onmouseout="this.style.transform='translateY(0)'">
            <div style="font-size: 0.7rem; color: #f43f5e; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px;"><i class="fa-solid fa-circle-exclamation"></i> Vencidas</div>
            <div style="font-family: 'Outfit'; font-size: 1.3rem; font-weight: 800; color: #f43f5e;">${fmt(vencidasVal)}</div>
            <div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 2px;">${vencidasC} parcelas</div>
          </div>
          <div style="background: linear-gradient(135deg, rgba(52,211,153,0.08), rgba(244,63,94,0.08)); border: 1px solid rgba(255,255,255,0.12); border-radius: 14px; padding: 14px 16px;" title="Indicador de Saldo Líquido">
            <div style="font-size: 0.7rem; color: var(--text-muted); font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px;"><i class="fa-solid fa-scale-balanced"></i> Saldo Líquido</div>
            <div style="font-family: 'Outfit'; font-size: 1.3rem; font-weight: 800; color: ${saldoLiquido >= 0 ? '#34d399' : '#f43f5e'};">${fmt(saldoLiquido)}</div>
            <div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 2px;">Receitas − Despesas</div>
          </div>
          <div class="fin-kpi-card" data-filter="Bonificadas" style="background: linear-gradient(135deg, rgba(251,191,36,0.08), rgba(251,191,36,0.04)); border: 1px solid rgba(251,191,36,0.25); border-radius: 14px; padding: 14px 16px; cursor: pointer; transition: all 0.2s ease;" onmouseover="this.style.transform='translateY(-2px)'" onmouseout="this.style.transform='translateY(0)'">
            <div style="font-size: 0.7rem; color: #fbbf24; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px;"><i class="fa-solid fa-award"></i> Bonificadas</div>
            <div style="font-family: 'Outfit'; font-size: 1.3rem; font-weight: 800; color: #fbbf24;">${fmt(bonificadasVal)}</div>
            <div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 2px;">${bonificadasC} parcelas</div>
          </div>
          <div class="fin-kpi-card" data-filter="Outras" style="background: linear-gradient(135deg, rgba(248,113,113,0.08), rgba(248,113,113,0.04)); border: 1px solid rgba(248,113,113,0.2); border-radius: 14px; padding: 14px 16px; cursor: pointer; transition: all 0.2s ease;" onmouseover="this.style.transform='translateY(-2px)'" onmouseout="this.style.transform='translateY(0)'">
            <div style="font-size: 0.7rem; color: #f87171; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px;"><i class="fa-solid fa-ban"></i> Outras</div>
            <div style="font-family: 'Outfit'; font-size: 1.3rem; font-weight: 800; color: #f87171;">${fmt(suspensasVal + canceladasVal + excluidasVal)}</div>
            <div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 2px;">${suspensasC + canceladasC + excluidasC} parcelas</div>
          </div>
        </div>

        <!-- SEÇÃO DE GRÃFICOS -->
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
                <tr id="modal-fin-empty-row"><td colspan="10" style="text-align:center; padding: 24px; color: var(--text-muted);">Nenhum título financeiro encontrado para os filtros selecionados.</td></tr>
              ` : `<tr id="modal-fin-empty-row" style="display:none;"><td colspan="10" style="text-align:center; padding: 24px; color: var(--text-muted);">Nenhum título financeiro nesta categoria.</td></tr>` + installmentsList.map(t => {
                const instStr = (t.installmentNumber && t.totalInstallments) ? `${t.installmentNumber}/${t.totalInstallments}` : '1/1';
                const clientName = hasPEP ? t.client : (typeof abbreviateName === 'function' ? abbreviateName(t.client) : t.client);
                return `
                  <tr class="fin-row-item" data-status="${t.status}" style="border-bottom: 1px solid var(--border-color); transition: background 0.15s ease;" onmouseover="this.style.background='rgba(255,255,255,0.03)'" onmouseout="this.style.background=''">
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
                        <button class="btn btn-outline modal-btn-boleto" style="font-size: 0.72rem; padding: 4px 8px;" data-id="${t.id}" data-client="${t.client}" data-desc="${t.desc}" data-duedate="${t.dueDate}" data-amount="${t.amountFormatted}" data-val="${t.amount}"><i class="fa-solid fa-barcode"></i> 2Âª Via</button>
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

    // Sistema de Filtro via KPI Cards
    const filterCards = document.getElementById('modal-financial-results-window').querySelectorAll('.fin-kpi-card');
    const tableRows = document.getElementById('modal-financial-results-window').querySelectorAll('.fin-row-item');
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
        
        <!-- CABEÇALHO DO MODAL COM AÇÕES RÃPIDAS (FIXO AO ROLAR) -->
        <div style="position: sticky; top: -24px; z-index: 30; background: var(--bg-secondary); border-bottom: 1px solid var(--border-color); padding: 14px 24px; margin: -24px -24px 18px -24px; border-top-left-radius: 20px; border-top-right-radius: 20px; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px; backdrop-filter: blur(12px);">
          <div style="display: flex; align-items: center; gap: 12px;">
            <div style="width: 40px; height: 40px; border-radius: 10px; background: linear-gradient(135deg, #4f46e5, #3730a3); display: flex; align-items: center; justify-content: center; font-size: 1.2rem; color: #fff; box-shadow: 0 4px 12px rgba(79,70,229,0.3);">
              <i class="fa-solid fa-barcode"></i>
            </div>
            <div>
              <h3 style="margin: 0; font-size: 1.15rem; font-weight: 700; font-family: 'Outfit', sans-serif;">2Âª Via do Boleto Bancário FEBRABAN</h3>
              <span style="font-size: 0.78rem; color: var(--text-muted);">Nosso Número: <strong>${t.id}</strong> • Health Nexus Bank (341-7)</span>
            </div>
          </div>
          
          <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
            <button id="btn-copy-linha-top" class="btn btn-outline" style="font-size: 0.78rem; padding: 6px 12px; border-color: rgba(2,132,199,0.4);"><i class="fa-solid fa-copy"></i> Copiar Linha</button>
            <button id="btn-copy-pix-top" class="btn btn-outline" style="font-size: 0.78rem; padding: 6px 12px; border-color: rgba(52,211,153,0.4); color: #34d399;"><i class="fa-solid fa-qrcode"></i> Copiar Pix</button>
            <button id="btn-print-boleto" class="btn btn-primary" style="font-size: 0.78rem; padding: 6px 14px; background: #0284c7;"><i class="fa-solid fa-print"></i> Imprimir PDF</button>
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
                <div style="background: #ffffff; padding: 4px 10px; border-radius: 8px; border: 1px solid #e2e8f0; box-shadow: 0 2px 6px rgba(0,0,0,0.06); display: inline-flex; align-items: center; justify-content: center;">
                  <img src="/assets/logo.png" alt="Health Nexus" style="height: 32px; width: auto; object-fit: contain;">
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
              <div style="display: flex; align-items: center; gap: 10px; flex: 1;">
                <div style="background: #ffffff; padding: 4px 10px; border-radius: 8px; border: 1px solid #e2e8f0; box-shadow: 0 2px 6px rgba(0,0,0,0.06); display: inline-flex; align-items: center; justify-content: center;">
                  <img src="/assets/logo.png" alt="Health Nexus" style="height: 32px; width: auto; object-fit: contain;">
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
                  <strong style="font-size: 8pt;">PAGÃVEL EM QUALQUER BANCO OU CORRESPONDENTE BANCÃRIO ATÉ O VENCIMENTO</strong>
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
                  <span style="color: #475569; display: block; font-size: 6.5pt; text-transform: uppercase;">NÂº do Documento</span>
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
                  • TÃTULO REFERENTE A PRESTAÇÃO DE SERVIÇOS HOSPITALARES E CONSULTAS MÉDICAS.<br>
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

            <!-- CÓDIGO DE BARRAS NÃTIDO FEBRABAN -->
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
          <button id="btn-print-boleto-foot" class="btn btn-primary" style="background: #0284c7; font-size: 0.85rem; padding: 8px 20px; box-shadow: 0 2px 10px rgba(2,132,199,0.35);"><i class="fa-solid fa-print"></i> Imprimir Boleto FEBRABAN</button>
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
    // Não fecha ao clicar fora para evitar perda de dados

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
    } else if (activeTab === 'schedules') {
      title = 'Relatório de Escalas de Trabalho & Plantões (Médicos e Enfermeiros)';
      filename = 'escalas_e_plantoes';
      columns = ['ID', 'Profissional', 'Registro (CRM/COREN)', 'Categoria & Função', 'Data Plantão', 'Turno / Duração', 'Setor', 'Status'];
      rows = recordsToExport.map(s => {
        const isMed = s.category === 'medico' || (s.crm_coren && s.crm_coren.includes('CRM'));
        const dateStr = s.shiftDate ? new Date(s.shiftDate + 'T00:00:00').toLocaleDateString('pt-BR') : '-';
        return [
          s.id,
          s.professionalName,
          s.crm_coren || '-',
          (isMed ? 'Médico' : 'Enfermeiro') + ' - ' + (s.specialty_role || '-'),
          dateStr,
          `${s.shiftType || 'Plantão'} (${s.workloadHours || 12}h)`,
          s.roomName || s.sector || 'Geral',
          s.status
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

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
//  Modal de Detalhes do Atendimento (aberto pela tabela Reports)
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
async function openEncounterReportDetail(encId) {
  document.getElementById('enc-report-detail-modal')?.remove();

  const manchesterHex = { 'Vermelho': '#ef4444', 'Laranja': '#f97316', 'Amarelo': '#eab308', 'Verde': '#22c55e', 'Azul': '#3b82f6', 'Branco': '#f1f5f9' };
  const statusMap = { 'Aguardando_Triagem': 'Aguardando Triagem', 'Aguardando_Atendimento': 'Aguardando Consulta', 'Em_Atendimento': 'Em Consulta', 'Finalizado': 'Finalizado' };
  const statusColors = { 'Aguardando_Triagem': '#fbbf24', 'Aguardando_Atendimento': '#38bdf8', 'Em_Atendimento': '#a78bfa', 'Finalizado': '#34d399' };

  const overlay = document.createElement('div');
  overlay.id = 'enc-report-detail-modal';
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.72);backdrop-filter:blur(8px);z-index:9999;display:flex;align-items:center;justify-content:center;padding:16px;';
  overlay.innerHTML = `<div style="color:#818cf8;font-size:1.5rem;"><i class="fa-solid fa-spinner fa-spin"></i> Carregando atendimento...</div>`;
  document.body.appendChild(overlay);
  // Fechar apenas pelo botão fechar da interface

  try {
    const [encRes, triageRes, patRes, noteRes] = await Promise.all([
      apiFetch('/api/encounters'),
      apiFetch('/api/triages'),
      apiFetch('/api/patients'),
      apiFetch(`/api/encounters/${encId}/notes`).catch(() => null)
    ]);

    const encs = await encRes.json().then(r => Array.isArray(r) ? r : (r.data || []));
    const triages = await triageRes.json().then(r => Array.isArray(r) ? r : (r.data || []));
    const patients = await patRes.json().then(r => Array.isArray(r) ? r : (r.data || []));
    const enc = encs.find(e => e.id === encId);
    if (!enc) throw new Error('Atendimento não encontrado');

    const triage = triages.find(t => String(t.encounterId) === String(encId) || String(t.patientId) === String(enc.patientId));
    const patient = patients.find(p => String(p.id) === String(enc.patientId));
    const noteRaw = noteRes ? await noteRes.json().catch(() => null) : null;
    const note = noteRaw && typeof noteRaw === 'object' ? (noteRaw.data || noteRaw) : null;

    const mc = enc.manchesterColor || triage?.manchesterColor;
    const hex = mc ? (manchesterHex[mc] || '#818cf8') : '#818cf8';
    const stColor = statusColors[enc.status] || '#94a3b8';
    const dateStr = enc.admitted_at ? new Date(enc.admitted_at).toLocaleString('pt-BR', { day:'2-digit', month:'long', year:'numeric', hour:'2-digit', minute:'2-digit' }) : '—';

    const calcAge = (bdate) => {
      if (!bdate) return '—';
      const diff = Date.now() - new Date(bdate).getTime();
      return Math.floor(diff / (365.25 * 24 * 3600 * 1000));
    };
    const age = calcAge(patient?.birthDate || enc.birthDate);
    const cpf = patient?.cpf || enc.cpf || '';
    const cpfDisplay = cpf ? cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4') : '—';

    const bp = triage?.bloodPressure || (triage?.bloodPressureSystolic ? `${triage.bloodPressureSystolic}/${triage.bloodPressureDiastolic}` : null) || enc.bloodPressure || '—';
    const hr = triage?.heartRateBpm || triage?.heartRate || enc.heartRateBpm || '—';
    const temp = triage?.temperatureCelsius || triage?.temperature || enc.temperatureCelsius || '—';
    const weight = triage?.weightKg || triage?.weight || enc.weightKg || '—';
    const spo2 = triage?.oxygenSaturation || enc.oxygenSaturation || '—';
    const pain = triage?.painScale !== undefined ? triage.painScale : (enc.painScale !== undefined ? enc.painScale : '—');
    const rr = triage?.respiratoryRate || enc.respiratoryRate || '—';

    const vitalAlert = (type, val) => {
      if (val === '—') return '';
      const v = parseFloat(String(val).split('/')[0]);
      if (isNaN(v)) return '';
      const ranges = { hr: { low:60, high:100 }, temp: { low:36.0, high:37.5 }, spo2: { low:95, high:100 }, pain: { low:0, high:3 } };
      const r = ranges[type];
      if (!r) return '';
      if (v < r.low) return `<div style="font-size:0.58rem;background:#38bdf820;color:#38bdf8;padding:1px 5px;border-radius:4px;margin-top:3px;">â†“ Baixo</div>`;
      if (v > r.high) return `<div style="font-size:0.58rem;background:#ef444420;color:#ef4444;padding:1px 5px;border-radius:4px;margin-top:3px;">â†‘ Alto</div>`;
      return `<div style="font-size:0.58rem;background:#34d39920;color:#34d399;padding:1px 5px;border-radius:4px;margin-top:3px;">✓ Normal</div>`;
    };

    const vitalDesc = (type) => {
      const ranges = { hr: 'FC Normal: 60-100 bpm', temp: 'Temperatura Normal: 36.0-37.5 °C', spo2: 'SpO2 Normal: 95-100%', pain: 'Dor Normal: 0-3 (Leve)' };
      return ranges[type] || 'Nenhum padrão de referência cadastrado';
    };

    const vCard = (icon, label, value, unit, color, alertType) => `
      <div style="background:rgba(0,0,0,0.25);border:1px solid ${color}1e;border-radius:12px;padding:12px 8px;text-align:center;transition:border-color .2s,box-shadow .2s;cursor:help;" title="${vitalDesc(alertType)}"
        onmouseenter="this.style.borderColor='${color}55';this.style.boxShadow='0 0 14px ${color}1a';"
        onmouseleave="this.style.borderColor='${color}1e';this.style.boxShadow='';">
        <i class="fa-solid ${icon}" style="color:${color};font-size:1rem;display:block;margin-bottom:5px;"></i>
        <div style="font-size:1.1rem;font-weight:900;font-family:'Outfit';color:${color};line-height:1.1;">${value}<span style="font-size:0.58rem;color:#475569;margin-left:1px;">${unit}</span></div>
        <div style="font-size:0.6rem;text-transform:uppercase;letter-spacing:.05em;color:#475569;margin-top:3px;">${label}</div>
        ${vitalAlert(alertType, value)}
      </div>`;

    const sBlock = (letter, title, content, color) => content ? `
      <div style="background:rgba(0,0,0,0.15);border-left:3px solid ${color};border-radius:0 10px 10px 0;padding:12px 15px;margin-bottom:9px;">
        <div style="display:flex;align-items:center;gap:7px;margin-bottom:6px;">
          <span style="background:${color};color:#000;font-size:0.65rem;font-weight:900;width:17px;height:17px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;">${letter}</span>
          <span style="font-size:0.7rem;font-weight:800;color:${color};text-transform:uppercase;letter-spacing:.06em;">${title}</span>
        </div>
        <div style="font-size:0.85rem;color:#cbd5e1;line-height:1.65;">${content}</div>
      </div>` : '';

    const isClinical = state?.user && (state.user.role === 'Médico' || state.user.role === 'Enfermeiro');
    const complaint = triage?.complaints || enc.complaints || '';
    const cid = note?.cid || enc.cid || '';

    // Status timeline
    const statusOrder = ['Aguardando_Triagem','Aguardando_Atendimento','Em_Atendimento','Finalizado'];
    const curIdx = statusOrder.indexOf(enc.status);
    const timelineLabels = { Aguardando_Triagem:'Triagem', Aguardando_Atendimento:'Ag. Consulta', Em_Atendimento:'Em Atend.', Finalizado:'Finalizado' };
    const timelineHtml = `<div style="display:flex;align-items:flex-start;gap:0;margin:4px 0 20px;position:relative;">
      ${statusOrder.map((s, i) => {
        const done = i < curIdx, active = i === curIdx;
        const c = statusColors[s];
        return `<div style="flex:1;display:flex;flex-direction:column;align-items:center;position:relative;">
          ${i > 0 ? `<div style="position:absolute;top:11px;left:-50%;width:100%;height:2px;background:${done ? c + '80' : 'rgba(255,255,255,0.06)'};"></div>` : ''}
          <div style="width:22px;height:22px;border-radius:50%;background:${active ? c : done ? c + '55' : 'rgba(255,255,255,0.06)'};border:2px solid ${active ? c : done ? c + '40' : 'rgba(255,255,255,0.1)'};display:flex;align-items:center;justify-content:center;font-size:0.58rem;color:${active || done ? '#fff' : '#334155'};z-index:1;position:relative;box-shadow:${active ? '0 0 12px ' + c + '66' : 'none'};">
            ${done ? '✓' : i+1}
          </div>
          <span style="font-size:0.6rem;margin-top:5px;color:${active ? c : done ? '#64748b' : '#334155'};font-weight:${active ? '700':'400'};text-align:center;max-width:56px;">${timelineLabels[s]}</span>
        </div>`;
      }).join('')}
    </div>`;

    // Info rows helper
    const infoRow = (l, v) => `<div><div style="font-size:0.61rem;color:#475569;text-transform:uppercase;letter-spacing:.04em;margin-bottom:2px;">${l}</div><div style="font-size:0.83rem;font-weight:600;color:#e2e8f0;">${v || '—'}</div></div>`;

    overlay.innerHTML = `
      <div style="
        background:linear-gradient(145deg,#0f172a 0%,#1e1b4b 55%,#0f2060 100%);
        border:1px solid rgba(99,102,241,0.22);border-radius:22px;
        width:min(860px,98vw);max-height:92vh;
        display:flex;flex-direction:column;
        box-shadow:0 40px 100px rgba(0,0,0,0.75),inset 0 1px 0 rgba(255,255,255,0.05);
        position:relative;overflow:hidden;">

        <!-- Background glows -->
        <div style="position:absolute;top:-80px;right:-80px;width:250px;height:250px;border-radius:50%;background:${hex}08;pointer-events:none;"></div>
        <div style="position:absolute;bottom:-50px;left:-50px;width:180px;height:180px;border-radius:50%;background:rgba(99,102,241,0.05);pointer-events:none;"></div>

        <!-- HEADER -->
        <div style="padding:20px 24px 14px;border-bottom:1px solid rgba(255,255,255,0.06);flex-shrink:0;">
          <div style="display:flex;align-items:center;gap:13px;">
            <div style="width:46px;height:46px;border-radius:13px;background:${hex}18;border:1.5px solid ${hex}44;display:flex;align-items:center;justify-content:center;color:${hex};font-size:1.2rem;flex-shrink:0;">
              <i class="fa-solid fa-notes-medical"></i>
            </div>
            <div style="flex:1;min-width:0;">
              <h3 style="margin:0 0 4px;font-size:1.18rem;font-weight:800;font-family:'Outfit';color:#f1f5f9;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${enc.patientName || 'Paciente'}</h3>
              <div style="display:flex;flex-wrap:wrap;gap:6px;align-items:center;">
                <code style="font-size:0.7rem;color:#818cf8;background:rgba(129,140,248,0.1);padding:2px 7px;border-radius:5px;">${encId.substring(0,16)}…</code>
                ${mc ? `<span style="padding:2px 9px;border-radius:20px;font-size:0.68rem;font-weight:700;background:${hex}1e;color:${hex};border:1px solid ${hex}3a;">${mc.toUpperCase()}</span>` : ''}
                <span style="padding:2px 9px;border-radius:20px;font-size:0.68rem;font-weight:700;background:${stColor}16;color:${stColor};border:1px solid ${stColor}3a;">${statusMap[enc.status] || enc.status}</span>
                <span style="font-size:0.7rem;color:#475569;"><i class="fa-regular fa-calendar"></i> ${dateStr}</span>
              </div>
            </div>
            <button onclick="document.getElementById('enc-report-detail-modal').remove()"
              style="background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.09);border-radius:9px;width:32px;height:32px;color:#475569;font-size:1rem;cursor:pointer;flex-shrink:0;display:flex;align-items:center;justify-content:center;transition:all .2s;"
              onmouseenter="this.style.background='rgba(239,68,68,0.15)';this.style.color='#ef4444';"
              onmouseleave="this.style.background='rgba(255,255,255,0.05)';this.style.color='#475569';">
              <i class="fa-solid fa-xmark"></i>
            </button>
          </div>

          <!-- Tabs -->
          <div style="display:flex;gap:4px;margin-top:14px;">
            <button class="enc-tab-btn active" data-tab="resumo"
              style="padding:6px 15px;border-radius:8px;font-size:0.78rem;font-weight:600;cursor:pointer;border:1px solid rgba(99,102,241,0.4);background:rgba(99,102,241,0.14);color:#818cf8;transition:all .2s;">
              <i class="fa-solid fa-stethoscope"></i> Resumo
            </button>
            <button class="enc-tab-btn" data-tab="soap"
              style="padding:6px 15px;border-radius:8px;font-size:0.78rem;font-weight:600;cursor:pointer;border:1px solid rgba(255,255,255,0.07);background:transparent;color:#475569;transition:all .2s;">
              <i class="fa-solid fa-file-medical"></i> Nota SOAP
            </button>
            <button class="enc-tab-btn" data-tab="export"
              style="padding:6px 15px;border-radius:8px;font-size:0.78rem;font-weight:600;cursor:pointer;border:1px solid rgba(255,255,255,0.07);background:transparent;color:#475569;transition:all .2s;">
              <i class="fa-solid fa-file-export"></i> Exportar
            </button>
          </div>
        </div>

        <!-- BODY scrollável -->
        <div style="overflow-y:auto;flex:1;padding:18px 24px 10px;">

          <!-- === ABA RESUMO === -->
          <div id="enc-tab-resumo" class="enc-tab-panel">
            ${timelineHtml}

            <!-- Dados paciente + atendimento -->
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:16px;">
              <div style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);border-radius:13px;padding:13px;">
                <div style="font-size:0.65rem;font-weight:700;color:#818cf8;text-transform:uppercase;letter-spacing:.06em;margin-bottom:9px;display:flex;align-items:center;gap:5px;"><i class="fa-solid fa-user-circle"></i> Paciente</div>
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
                  ${infoRow('Idade', age !== '—' ? age + ' anos' : '—')}
                  ${infoRow('CPF', cpfDisplay)}
                  ${infoRow('Cidade', patient?.city || enc.city)}
                  ${infoRow('Convênio', patient?.insurance || enc.insurance || 'Particular')}
                </div>
              </div>
              <div style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);border-radius:13px;padding:13px;">
                <div style="font-size:0.65rem;font-weight:700;color:#38bdf8;text-transform:uppercase;letter-spacing:.06em;margin-bottom:9px;display:flex;align-items:center;gap:5px;"><i class="fa-solid fa-hospital"></i> Atendimento</div>
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
                  ${infoRow('Tipo', enc.type === 'Urgencia' ? '🚨 Urgência' : 'ðŸ¥ Ambulatório')}
                  ${infoRow('Médico', enc.doctorName)}
                  ${infoRow('Sala / Leito', enc.room || enc.bed)}
                  ${infoRow('CID-10', cid)}
                </div>
              </div>
            </div>

            <!-- Sinais Vitais -->
            <div style="margin-bottom:16px;">
              <div style="font-size:0.72rem;font-weight:700;color:#f472b6;text-transform:uppercase;letter-spacing:.05em;margin-bottom:9px;display:flex;align-items:center;gap:6px;">
                <i class="fa-solid fa-heart-pulse"></i> Sinais Vitais
                <span style="font-size:0.6rem;color:#475569;font-weight:400;">${triage ? '— da triagem' : '— dados parciais'}</span>
              </div>
              <div style="display:grid;grid-template-columns:repeat(7,1fr);gap:7px;">
                ${vCard('fa-droplet','PA',bp,'mmHg','#818cf8','')}
                ${vCard('fa-heart','FC',hr,'bpm','#f472b6','hr')}
                ${vCard('fa-thermometer-half','Temp',temp,'°C','#fb923c','temp')}
                ${vCard('fa-weight-scale','Peso',weight,'kg','#34d399','')}
                ${vCard('fa-lungs','SpO₂',spo2,'%','#38bdf8','spo2')}
                ${vCard('fa-wind','F.Resp',rr,'irpm','#a78bfa','')}
                ${vCard('fa-face-grimace','Dor',pain,'/10','#fbbf24','pain')}
              </div>
            </div>

            <!-- Queixa -->
            <div style="background:rgba(251,191,36,0.06);border:1px solid rgba(251,191,36,0.17);border-radius:12px;padding:13px;margin-bottom:6px;">
              <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:7px;">
                <div style="font-size:0.65rem;font-weight:800;color:#fbbf24;text-transform:uppercase;letter-spacing:.06em;display:flex;align-items:center;gap:6px;"><i class="fa-solid fa-comment-medical"></i> Queixa Principal</div>
                <button onclick="alert('Queixa salva com sucesso!')" style="background:rgba(251,191,36,0.15);color:#fbbf24;border:1px solid rgba(251,191,36,0.3);border-radius:6px;padding:4px 10px;font-size:0.65rem;cursor:pointer;font-weight:600;transition:all .2s;"><i class="fa-solid fa-save"></i> Salvar</button>
              </div>
              <textarea placeholder="Descreva a queixa principal do paciente aqui..." style="width:100%;min-height:70px;background:rgba(0,0,0,0.15);border:1px dashed rgba(251,191,36,0.2);border-radius:8px;padding:10px;color:#cbd5e1;font-size:0.86rem;line-height:1.65;resize:vertical;font-family:inherit;outline:none;">${complaint || ''}</textarea>
            </div>
          </div>

          <!-- === ABA SOAP === -->
          <div id="enc-tab-soap" class="enc-tab-panel" style="display:none;">
            ${note && (note.subjective || note.objective || note.assessment || note.plan)
              ? `<div style="display:flex;align-items:center;gap:8px;margin-bottom:14px;">
                  <span style="font-size:0.8rem;font-weight:700;color:#e2e8f0;">Nota Clínica SOAP</span>
                  ${note.isClosed
                    ? '<span style="font-size:0.67rem;padding:2px 9px;border-radius:20px;background:rgba(52,211,153,0.14);color:#34d399;border:1px solid rgba(52,211,153,0.28);">✓ Assinada e Fechada</span>'
                    : '<span style="font-size:0.67rem;padding:2px 9px;border-radius:20px;background:rgba(251,191,36,0.12);color:#fbbf24;border:1px solid rgba(251,191,36,0.28);">âœï¸ Rascunho</span>'}
                </div>
                ${sBlock('S','Subjetivo — queixas e história',note.subjective,'#818cf8')}
                ${sBlock('O','Objetivo — exame físico e dados',note.objective,'#38bdf8')}
                ${sBlock('A','Avaliação — diagnóstico',note.assessment,'#fb923c')}
                ${sBlock('P','Plano — condutas e tratamento',note.plan,'#34d399')}
                ${note.closedAt ? `<div style="text-align:right;font-size:0.68rem;color:#475569;margin-top:6px;"><i class="fa-solid fa-signature"></i> Assinado: ${new Date(note.closedAt).toLocaleString('pt-BR')}</div>` : ''}`
              : `<div style="text-align:center;padding:50px 30px;">
                  <div style="width:60px;height:60px;border-radius:16px;background:rgba(255,255,255,0.03);border:1px dashed rgba(255,255,255,0.09);display:flex;align-items:center;justify-content:center;margin:0 auto 14px;">
                    <i class="fa-regular fa-file-lines" style="font-size:1.5rem;color:#334155;"></i>
                  </div>
                  <div style="font-size:0.92rem;font-weight:700;color:#475569;margin-bottom:6px;">Sem nota clínica</div>
                  <div style="font-size:0.78rem;color:#334155;margin-bottom:16px;">A nota SOAP será criada durante o atendimento médico.</div>
                  ${isClinical ? `<button onclick="document.getElementById('enc-report-detail-modal').remove();if(typeof window.openPEPModal==='function')window.openPEPModal('${encId}');" style="background:#0284c7;border:none;color:#fff;border-radius:10px;padding:9px 20px;font-weight:700;font-size:0.82rem;cursor:pointer;box-shadow:0 2px 8px rgba(2,132,199,0.35);"><i class="fa-solid fa-pen-to-square"></i> Criar Nota no PEP</button>` : ''}
                </div>`}
          </div>

          <!-- === ABA EXPORTAR === -->
          <div id="enc-tab-export" class="enc-tab-panel" style="display:none;">
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:18px;">
              <!-- PDF -->
              <div style="background:rgba(239,68,68,0.05);border:1px solid rgba(239,68,68,0.18);border-radius:16px;padding:20px;text-align:center;transition:all .2s;"
                onmouseenter="this.style.background='rgba(239,68,68,0.09)';this.style.borderColor='rgba(239,68,68,0.35)';"
                onmouseleave="this.style.background='rgba(239,68,68,0.05)';this.style.borderColor='rgba(239,68,68,0.18)';">
                <div style="width:48px;height:48px;border-radius:13px;background:rgba(239,68,68,0.14);display:flex;align-items:center;justify-content:center;margin:0 auto 10px;font-size:1.4rem;color:#ef4444;"><i class="fa-solid fa-file-pdf"></i></div>
                <div style="font-size:0.88rem;font-weight:700;color:#f1f5f9;margin-bottom:4px;">Resumo em PDF</div>
                <div style="font-size:0.73rem;color:#475569;margin-bottom:13px;line-height:1.5;">Exporta dados do paciente, vitais, queixa e nota SOAP com layout para impressão A4</div>
                <button id="btn-enc-pdf" style="background:linear-gradient(135deg,#ef4444,#b91c1c);border:none;color:#fff;border-radius:10px;padding:8px 18px;font-weight:700;font-size:0.8rem;cursor:pointer;width:100%;box-shadow:0 4px 14px rgba(239,68,68,0.28);">
                  <i class="fa-solid fa-download"></i> Gerar PDF
                </button>
              </div>
              <!-- Imprimir -->
              <div style="background:rgba(56,189,248,0.05);border:1px solid rgba(56,189,248,0.18);border-radius:16px;padding:20px;text-align:center;transition:all .2s;"
                onmouseenter="this.style.background='rgba(56,189,248,0.09)';this.style.borderColor='rgba(56,189,248,0.35)';"
                onmouseleave="this.style.background='rgba(56,189,248,0.05)';this.style.borderColor='rgba(56,189,248,0.18)';">
                <div style="width:48px;height:48px;border-radius:13px;background:rgba(56,189,248,0.14);display:flex;align-items:center;justify-content:center;margin:0 auto 10px;font-size:1.4rem;color:#38bdf8;"><i class="fa-solid fa-print"></i></div>
                <div style="font-size:0.88rem;font-weight:700;color:#f1f5f9;margin-bottom:4px;">Impressão Direta</div>
                <div style="font-size:0.73rem;color:#475569;margin-bottom:13px;line-height:1.5;">Abre diálogo de impressão do navegador com layout otimizado para papel</div>
                <button id="btn-enc-print" style="background:linear-gradient(135deg,#0ea5e9,#0284c7);border:none;color:#fff;border-radius:10px;padding:8px 18px;font-weight:700;font-size:0.8rem;cursor:pointer;width:100%;box-shadow:0 4px 14px rgba(14,165,233,0.28);">
                  <i class="fa-solid fa-print"></i> Imprimir
                </button>
              </div>
            </div>

            <!-- Checklist do documento -->
            <div style="background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.06);border-radius:12px;padding:15px;">
              <div style="font-size:0.68rem;font-weight:700;color:#475569;text-transform:uppercase;letter-spacing:.05em;margin-bottom:10px;">Conteúdo do documento gerado</div>
              ${[
                ['✓','Identificação do paciente (nome, idade, CPF)','#34d399',true],
                ['✓','Dados do atendimento (ID, data, médico, tipo)','#34d399',true],
                ['✓','Classificação de risco Manchester','#34d399',true],
                [triage?'✓':'â—‹','Sinais vitais da triagem',triage?'#34d399':'#334155',!!triage],
                [complaint?'✓':'â—‹','Queixa principal',complaint?'#34d399':'#334155',!!complaint],
                [note?'✓':'â—‹','Nota clínica SOAP',note?'#34d399':'#334155',!!note],
                ['â—‹','Assinatura digital (disponível no PEP)','#334155',false],
              ].map(([ic,label,c]) => `<div style="display:flex;align-items:center;gap:8px;padding:5px 0;border-bottom:1px solid rgba(255,255,255,0.03);">
                <span style="color:${c};font-size:0.72rem;width:14px;text-align:center;">${ic}</span>
                <span style="font-size:0.76rem;color:${c === '#34d399' ? '#94a3b8' : '#334155'};">${label}</span>
              </div>`).join('')}
            </div>
          </div>
        </div>

        <!-- FOOTER -->
        <div style="padding:12px 24px;border-top:1px solid rgba(255,255,255,0.06);display:flex;gap:9px;justify-content:flex-end;flex-shrink:0;">
          ${isClinical ? `<button onclick="document.getElementById('enc-report-detail-modal').remove();if(typeof window.openPEPModal==='function')window.openPEPModal('${encId}');" style="background:#0284c7;border:none;color:#fff;border-radius:10px;padding:8px 17px;font-weight:700;font-size:0.81rem;cursor:pointer;box-shadow:0 2px 8px rgba(2,132,199,0.35);"><i class="fa-solid fa-file-medical"></i> Abrir PEP</button>` : ''}
          <button onclick="document.getElementById('enc-report-detail-modal').remove()" style="background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.09);color:#94a3b8;border-radius:10px;padding:8px 17px;font-weight:600;font-size:0.81rem;cursor:pointer;">Fechar</button>
        </div>
      </div>
    `;

    // Tab switching
    overlay.querySelectorAll('.enc-tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const tab = btn.dataset.tab;
        overlay.querySelectorAll('.enc-tab-btn').forEach(b => {
          b.style.cssText = 'padding:6px 15px;border-radius:8px;font-size:0.78rem;font-weight:600;cursor:pointer;border:1px solid rgba(255,255,255,0.07);background:transparent;color:#475569;transition:all .2s;';
        });
        btn.style.cssText = 'padding:6px 15px;border-radius:8px;font-size:0.78rem;font-weight:600;cursor:pointer;border:1px solid rgba(99,102,241,0.4);background:rgba(99,102,241,0.14);color:#818cf8;transition:all .2s;';
        overlay.querySelectorAll('.enc-tab-panel').forEach(p => { p.style.display = 'none'; });
        const panel = overlay.querySelector(`#enc-tab-${tab}`);
        if (panel) panel.style.display = 'block';
      });
    });

    // PDF / Print
    const genDoc = () => {
      const manchColor = manchesterHex[mc] || '#6366f1';
      const vRow = (l, v) => `<tr><td style="padding:5px 10px;font-size:9pt;color:#475569;border-bottom:1px solid #f1f5f9;width:32%;">${l}</td><td style="padding:5px 10px;font-size:9pt;font-weight:600;color:#0f172a;border-bottom:1px solid #f1f5f9;">${v||'—'}</td></tr>`;
      return `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><title>Atendimento — ${enc.patientName}</title>
      <style>*{margin:0;padding:0;box-sizing:border-box;}body{font-family:'Segoe UI',Arial,sans-serif;color:#0f172a;background:#fff;padding:26px 30px;}
      .hdr{display:flex;gap:14px;align-items:flex-start;padding-bottom:14px;border-bottom:3px solid #6366f1;margin-bottom:18px;}
      .logo{width:48px;height:48px;border-radius:11px;background:${manchColor}18;border:2px solid ${manchColor}44;display:flex;align-items:center;justify-content:center;font-size:20pt;color:${manchColor};}
      .badge{display:inline-block;padding:2px 9px;border-radius:20px;font-size:8pt;font-weight:700;margin-right:4px;}
      .sec{font-size:8.5pt;font-weight:800;color:#6366f1;text-transform:uppercase;letter-spacing:.06em;margin:16px 0 7px;padding-bottom:4px;border-bottom:1.5px solid #e2e8f0;}
      table{width:100%;border-collapse:collapse;}
      .vg{display:grid;grid-template-columns:repeat(4,1fr);gap:9px;margin-top:7px;}
      .vb{background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:9px;text-align:center;}
      .vv{font-size:13pt;font-weight:800;color:#0f172a;}.vl{font-size:7pt;color:#64748b;text-transform:uppercase;margin-top:2px;}
      .sb{border-left:3px solid #6366f1;padding:7px 12px;margin-bottom:7px;background:#fafafa;border-radius:0 6px 6px 0;}
      .sl{font-size:8pt;font-weight:800;color:#6366f1;text-transform:uppercase;margin-bottom:3px;}
      .sc{font-size:9pt;color:#1e293b;line-height:1.6;}
      .ftr{margin-top:24px;padding-top:10px;border-top:1px solid #e2e8f0;display:flex;justify-content:space-between;font-size:7.5pt;color:#94a3b8;}
      @media print{body{padding:14px 18px;}}</style></head><body>
      <div class="hdr" style="display: flex; gap: 14px; align-items: center; padding-bottom: 14px; border-bottom: 3px solid #6366f1; margin-bottom: 18px;">
        <div style="background: #ffffff; padding: 6px 12px; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.08); border: 1.5px solid #e2e8f0; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
          <img src="/assets/logo.png" alt="Health Nexus" style="height: 38px; width: auto; object-fit: contain;">
        </div>
        <div style="flex:1;">
          <div style="font-size:7.5pt;color:#6366f1;font-weight:800;text-transform:uppercase;letter-spacing:.05em;">Health Nexus — Resumo do Atendimento</div>
          <h1 style="font-size:15pt;font-weight:800;color:#0f172a;margin:3px 0;">${enc.patientName||'Paciente'}</h1>
          <div style="margin-top:5px;">
            ${mc?`<span class="badge" style="background:${manchColor}18;color:${manchColor};border:1px solid ${manchColor}40;">${mc.toUpperCase()}</span>`:''}
            <span class="badge" style="background:#f0fdf4;color:#15803d;border:1px solid #86efac;">${statusMap[enc.status]||enc.status}</span>
            <span style="font-size:8pt;color:#64748b;">${dateStr}</span>
          </div>
        </div>
        <div style="text-align:right;"><div style="font-size:7pt;color:#94a3b8;">ID</div><div style="font-family:monospace;font-size:7.5pt;color:#6366f1;">${encId.substring(0,20)}…</div></div>
      </div>
      <div class="sec">👤 Paciente e Atendimento</div>
      <table><tbody>
        ${vRow('Nome',enc.patientName)}${vRow('Idade',age!=='—'?age+' anos':'—')}${vRow('CPF',cpfDisplay)}
        ${vRow('Cidade',patient?.city||enc.city)}${vRow('Convênio',patient?.insurance||'Particular')}
        ${vRow('Tipo',enc.type==='Urgencia'?'Urgência':'Ambulatório')}
        ${vRow('Médico',enc.doctorName)}${vRow('Sala/Leito',enc.room||enc.bed)}
        ${vRow('Entrada',dateStr)}${cid?vRow('CID-10',cid):''}
      </tbody></table>
      <div class="sec">🩺 Sinais Vitais</div>
      <div class="vg">
        ${[['PA',bp,'mmHg'],['FC',hr,'bpm'],['Temp.',temp,'°C'],['SpO₂',spo2,'%'],['Peso',weight,'kg'],['F.Resp',rr,'irpm'],['Dor',pain,'/10']].map(([l,v,u])=>`<div class="vb"><div class="vv">${v}<span style="font-size:8pt;color:#94a3b8;">${u}</span></div><div class="vl">${l}</div></div>`).join('')}
      </div>
      ${complaint?`<div class="sec">💬 Queixa Principal</div><p style="font-size:9.5pt;color:#1e293b;line-height:1.65;background:#fffbeb;padding:10px 12px;border-radius:6px;border-left:3px solid #fbbf24;">${complaint}</p>`:''}
      ${note&&(note.subjective||note.objective||note.assessment||note.plan)?`
      <div class="sec">📋 Nota SOAP ${note.isClosed?'— <span style="color:#15803d">✓ Assinada</span>':'— Rascunho'}</div>
      ${note.subjective?`<div class="sb"><div class="sl">S — Subjetivo</div><div class="sc">${note.subjective}</div></div>`:''}
      ${note.objective?`<div class="sb" style="border-color:#0ea5e9"><div class="sl" style="color:#0ea5e9">O — Objetivo</div><div class="sc">${note.objective}</div></div>`:''}
      ${note.assessment?`<div class="sb" style="border-color:#f97316"><div class="sl" style="color:#f97316">A — Avaliação</div><div class="sc">${note.assessment}</div></div>`:''}
      ${note.plan?`<div class="sb" style="border-color:#22c55e"><div class="sl" style="color:#22c55e">P — Plano</div><div class="sc">${note.plan}</div></div>`:''}
      `:`<div class="sec">📋 Nota SOAP</div><p style="font-size:9pt;color:#94a3b8;"><em>Nenhuma nota registrada.</em></p>`}
      <div class="ftr"><span>Health Nexus — Sistema de Gestão Hospitalar</span><span>Gerado: ${new Date().toLocaleString('pt-BR')}</span></div>
      </body></html>`;
    };

    overlay.querySelector('#btn-enc-pdf')?.addEventListener('click', () => {
      const w = window.open('','_blank','width=900,height=700');
      if (!w) { if(typeof showToast==='function') showToast('Habilite pop-ups para gerar PDF'); return; }
      w.document.write(genDoc());
      w.document.close();
      setTimeout(()=>{ w.focus(); w.print(); }, 700);
    });
    overlay.querySelector('#btn-enc-print')?.addEventListener('click', () => {
      const w = window.open('','_blank','width=900,height=700');
      if (!w) { if(typeof showToast==='function') showToast('Habilite pop-ups para imprimir'); return; }
      w.document.write(genDoc());
      w.document.close();
      setTimeout(()=>{ w.focus(); w.print(); }, 700);
    });

  } catch (err) {
    overlay.innerHTML = `
      <div style="background:#1a1a2e;border:1px solid rgba(239,68,68,0.3);border-radius:16px;padding:40px 32px;text-align:center;max-width:400px;">
        <i class="fa-solid fa-triangle-exclamation" style="color:#ef4444;font-size:2rem;margin-bottom:12px;display:block;"></i>
        <div style="color:#ef4444;font-weight:700;margin-bottom:8px;">Erro ao carregar atendimento</div>
        <div style="color:var(--text-muted);font-size:0.83rem;">${err.message}</div>
        <button onclick="document.getElementById('enc-report-detail-modal').remove()" style="margin-top:16px;background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.15);color:var(--text-secondary);border-radius:8px;padding:7px 18px;cursor:pointer;">Fechar</button>
      </div>`;
  }
}
window.openEncounterReportDetail = openEncounterReportDetail;

