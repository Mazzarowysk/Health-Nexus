/**
 * patch_reports_and_pdf.mjs
 * Aplica melhorias no módulo de relatórios e adiciona geração de PDF de prontuário.
 */
import { readFileSync, writeFileSync } from 'fs';

const mainJsPath = 'c:/Health Nexus/src/main.js';
let content = readFileSync(mainJsPath, 'utf8');

// ============================================================
// PATCH 1: Adicionar aba "Por Médico" no seletor de relatórios
// ============================================================
const oldReportTabs = `        <button id="tab-btn-financial" class="report-tab-btn">
          <i class="fa-solid fa-chart-pie"></i> Relatório Financeiro
        </button>
      </div>`;

const newReportTabs = `        <button id="tab-btn-financial" class="report-tab-btn">
          <i class="fa-solid fa-chart-pie"></i> Relatório Financeiro
        </button>
        <button id="tab-btn-doctors" class="report-tab-btn">
          <i class="fa-solid fa-user-doctor"></i> Por Médico
        </button>
      </div>`;

if (!content.includes(newReportTabs)) {
  content = content.replace(oldReportTabs, newReportTabs);
  console.log('[PATCH 1] ✅ Aba "Por Médico" adicionada ao seletor de relatórios');
} else {
  console.log('[PATCH 1] ⏭ Aba "Por Médico" já existe');
}

// ============================================================
// PATCH 2: Adicionar variável e listener para a aba "Por Médico"
// ============================================================
const oldTabVars = `  const btnPatientsTab = document.getElementById('tab-btn-patients');
  const btnEncountersTab = document.getElementById('tab-btn-encounters');
  const btnFinancialTab = document.getElementById('tab-btn-financial');`;

const newTabVars = `  const btnPatientsTab = document.getElementById('tab-btn-patients');
  const btnEncountersTab = document.getElementById('tab-btn-encounters');
  const btnFinancialTab = document.getElementById('tab-btn-financial');
  const btnDoctorsTab = document.getElementById('tab-btn-doctors');`;

if (!content.includes(newTabVars)) {
  content = content.replace(oldTabVars, newTabVars);
  console.log('[PATCH 2] ✅ Variável btnDoctorsTab declarada');
}

// ============================================================
// PATCH 3: Adicionar listener do botão "Por Médico"
// ============================================================
const oldFinancialListener = `  btnFinancialTab.addEventListener('click', () => {
    activeTab = 'financial';
    btnFinancialTab.classList.add('active');
    btnPatientsTab.classList.remove('active');
    btnEncountersTab.classList.remove('active');
    renderFilters();
  });`;

const newFinancialListener = `  btnFinancialTab.addEventListener('click', () => {
    activeTab = 'financial';
    btnFinancialTab.classList.add('active');
    btnPatientsTab.classList.remove('active');
    btnEncountersTab.classList.remove('active');
    if (btnDoctorsTab) btnDoctorsTab.classList.remove('active');
    renderFilters();
  });

  if (btnDoctorsTab) {
    btnDoctorsTab.addEventListener('click', () => {
      activeTab = 'doctors';
      btnDoctorsTab.classList.add('active');
      btnPatientsTab.classList.remove('active');
      btnEncountersTab.classList.remove('active');
      btnFinancialTab.classList.remove('active');
      renderFilters();
    });
  }`;

if (!content.includes("activeTab = 'doctors'")) {
  content = content.replace(oldFinancialListener, newFinancialListener);
  console.log('[PATCH 3] ✅ Listener da aba "Por Médico" adicionado');
}

// ============================================================
// PATCH 4: Adicionar renderFilters para aba 'doctors'
// ============================================================
const oldRenderFiltersEnd = `    } else if (activeTab === 'financial') {
      filtersContainer.innerHTML = \``;

const newRenderFiltersEnd = `    } else if (activeTab === 'doctors') {
      filtersContainer.innerHTML = \`
        <div class="filters-grid">
          <div class="filter-group">
            <label>Período Inicial</label>
            <input type="date" id="filter-date-start">
          </div>
          <div class="filter-group">
            <label>Período Final</label>
            <input type="date" id="filter-date-end">
          </div>
        </div>
      \`;
    } else if (activeTab === 'financial') {
      filtersContainer.innerHTML = \``;

if (!content.includes("activeTab === 'doctors'")) {
  content = content.replace(oldRenderFiltersEnd, newRenderFiltersEnd);
  console.log('[PATCH 4] ✅ renderFilters da aba doctors adicionado');
}

// ============================================================
// PATCH 5: Adicionar filterAndRender para aba 'doctors'
// ============================================================
const oldFilterAndRenderStart = `  const filterAndRender = () => {
    if (activeTab === 'financial') {`;

const newFilterAndRenderStart = `  const filterAndRender = () => {
    if (activeTab === 'doctors') {
      renderDoctorReport();
      return;
    }
    if (activeTab === 'financial') {`;

if (!content.includes('renderDoctorReport')) {
  content = content.replace(oldFilterAndRenderStart, newFilterAndRenderStart);
  console.log('[PATCH 5] ✅ Delegação para renderDoctorReport adicionada');
}

// ============================================================
// PATCH 6: Adicionar renderDoctorReport antes do loadData()
// ============================================================
const oldLoadData = `  const loadData = async () => {
    try {
      previewStatus.textContent = 'Buscando dados...';
      const [resPatients, resEncounters] = await Promise.all([
        apiFetch(\`\${API_URL}/patients\`),
        apiFetch(\`\${API_URL}/encounters\`)
      ]);

      if (resPatients.ok) patientsList = await resPatients.json();
      if (resEncounters.ok) encountersList = await resEncounters.json();

      renderFilters();
    } catch (err) {
      console.error(err);
      previewStatus.textContent = 'Erro ao carregar dados.';
    }
  };`;

const newLoadData = `  const renderDoctorReport = async () => {
    const previewCard = document.querySelector('.preview-card');
    if (!previewCard) return;

    previewCard.innerHTML = \`
      <div class="preview-header">
        <h3><i class="fa-solid fa-user-doctor" style="color: var(--color-primary);"></i> Relatório de Atividades por Médico</h3>
        <div style="display: flex; gap: 8px;">
          <button id="btn-doc-export-pdf" class="btn btn-primary" style="background: #dc2626; font-size: 0.82rem;">
            <i class="fa-solid fa-file-pdf"></i> Exportar PDF
          </button>
          <button id="btn-doc-export-csv" class="btn btn-outline" style="font-size: 0.82rem;">
            <i class="fa-solid fa-file-csv"></i> Exportar CSV
          </button>
        </div>
      </div>
      <div style="text-align: center; padding: 30px; color: var(--text-muted);">
        <i class="fa-solid fa-spinner fa-spin" style="font-size: 1.5rem; color: #818cf8;"></i>
        <div style="margin-top: 8px;">Carregando dados dos médicos...</div>
      </div>
    \`;

    try {
      const [resDoc, resAppts, resEnc] = await Promise.all([
        apiFetch(\`\${API_URL}/doctors\`),
        apiFetch(\`\${API_URL}/appointments\`),
        apiFetch(\`\${API_URL}/encounters\`)
      ]);

      const doctors = resDoc.ok ? await resDoc.json() : [];
      const appointments = resAppts.ok ? await resAppts.json() : [];
      const encounters = resEnc.ok ? await resEnc.json() : [];

      const apptList = Array.isArray(appointments) ? appointments : (appointments.data || []);
      const encList = Array.isArray(encounters) ? encounters : (encounters.data || []);
      const docList = Array.isArray(doctors) ? doctors : (doctors.data || []);

      const todayStr = new Date().toISOString().split('T')[0];

      const docStats = docList.map(doc => {
        const name = doc.name || '';
        const cleanName = name.replace(/^(Dr\\.|Dra\\.)\\s*/i, '');
        const myAppts = apptList.filter(a =>
          (a.doctorName || '').includes(name) || (a.doctorName || '').includes(cleanName)
        );
        const today = myAppts.filter(a => a.appointmentDate === todayStr).length;
        const done = myAppts.filter(a => a.status === 'Concluído').length;
        const inProgress = myAppts.filter(a => a.status === 'Em Atendimento').length;
        return {
          name: doc.name,
          crm: doc.crm,
          specialty: doc.specialty,
          status: doc.status,
          total: myAppts.length,
          today,
          done,
          inProgress,
          pending: myAppts.length - done - inProgress
        };
      });

      // KPIs gerais
      const totalAppts = docStats.reduce((s, d) => s + d.total, 0);
      const totalDone = docStats.reduce((s, d) => s + d.done, 0);
      const totalInProgress = docStats.reduce((s, d) => s + d.inProgress, 0);
      const ativos = docStats.filter(d => d.status === 'Ativo').length;

      const rows = docStats.map(d => [
        d.name,
        d.specialty || '—',
        d.crm || '—',
        d.status || '—',
        d.total,
        d.today,
        d.inProgress,
        d.done,
        d.pending
      ]);

      previewCard.innerHTML = \`
        <div class="preview-header" style="flex-wrap: wrap; gap: 10px;">
          <h3><i class="fa-solid fa-user-doctor" style="color: var(--color-primary);"></i> Relatório de Atividades por Médico</h3>
          <div style="display: flex; gap: 8px; margin-left: auto;">
            <button id="btn-doc-export-pdf" class="btn btn-primary" style="background: #dc2626; font-size: 0.82rem;">
              <i class="fa-solid fa-file-pdf"></i> Exportar PDF
            </button>
            <button id="btn-doc-export-csv" class="btn btn-outline" style="font-size: 0.82rem;">
              <i class="fa-solid fa-file-csv"></i> Exportar CSV
            </button>
          </div>
        </div>

        <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin: 16px 0;">
          <div style="background: var(--bg-tertiary); border-radius: 10px; padding: 14px; text-align: center; border: 1px solid var(--border-color);">
            <div style="font-size: 1.6rem; font-weight: 800; color: #818cf8;">\${ativos}</div>
            <div style="font-size: 0.72rem; color: var(--text-muted); margin-top: 2px;">Médicos Ativos</div>
          </div>
          <div style="background: var(--bg-tertiary); border-radius: 10px; padding: 14px; text-align: center; border: 1px solid var(--border-color);">
            <div style="font-size: 1.6rem; font-weight: 800; color: #38bdf8;">\${totalAppts}</div>
            <div style="font-size: 0.72rem; color: var(--text-muted); margin-top: 2px;">Total Agendamentos</div>
          </div>
          <div style="background: var(--bg-tertiary); border-radius: 10px; padding: 14px; text-align: center; border: 1px solid var(--border-color);">
            <div style="font-size: 1.6rem; font-weight: 800; color: #fbbf24;">\${totalInProgress}</div>
            <div style="font-size: 0.72rem; color: var(--text-muted); margin-top: 2px;">Em Atendimento</div>
          </div>
          <div style="background: var(--bg-tertiary); border-radius: 10px; padding: 14px; text-align: center; border: 1px solid var(--border-color);">
            <div style="font-size: 1.6rem; font-weight: 800; color: #34d399;">\${totalDone}</div>
            <div style="font-size: 0.72rem; color: var(--text-muted); margin-top: 2px;">Concluídos</div>
          </div>
        </div>

        <div style="border-radius: 12px; overflow: hidden; border: 1px solid var(--border-color);">
          <table style="width: 100%; border-collapse: collapse;">
            <thead>
              <tr style="background: var(--bg-tertiary); border-bottom: 1px solid var(--border-color);">
                <th style="padding: 11px 14px; text-align: left; font-size: 0.73rem; color: var(--text-muted); text-transform: uppercase;">Médico</th>
                <th style="padding: 11px 14px; text-align: left; font-size: 0.73rem; color: var(--text-muted); text-transform: uppercase;">Especialidade</th>
                <th style="padding: 11px 14px; text-align: center; font-size: 0.73rem; color: var(--text-muted); text-transform: uppercase;">Status</th>
                <th style="padding: 11px 14px; text-align: center; font-size: 0.73rem; color: var(--text-muted); text-transform: uppercase;">Total</th>
                <th style="padding: 11px 14px; text-align: center; font-size: 0.73rem; color: var(--text-muted); text-transform: uppercase;">Hoje</th>
                <th style="padding: 11px 14px; text-align: center; font-size: 0.73rem; color: var(--text-muted); text-transform: uppercase;">Em Atend.</th>
                <th style="padding: 11px 14px; text-align: center; font-size: 0.73rem; color: var(--text-muted); text-transform: uppercase;">Concluídos</th>
              </tr>
            </thead>
            <tbody>
              \${docStats.map(d => \`
                <tr style="border-bottom: 1px solid var(--border-color);">
                  <td style="padding: 12px 14px;">
                    <div style="font-weight: 600; color: var(--text-primary); font-size: 0.88rem;">\${d.name}</div>
                    <div style="font-size: 0.74rem; color: var(--text-muted);">CRM: \${d.crm || '—'}</div>
                  </td>
                  <td style="padding: 12px 14px; font-size: 0.84rem; color: var(--text-secondary);">\${d.specialty || '—'}</td>
                  <td style="padding: 12px 14px; text-align: center;">
                    <span style="display:inline-block;padding:3px 10px;border-radius:20px;font-size:0.74rem;font-weight:600;
                      background:\${d.status==='Ativo'?'rgba(52,211,153,0.15)':'rgba(248,113,113,0.15)'};
                      color:\${d.status==='Ativo'?'#34d399':'#f87171'};">\${d.status || '—'}</span>
                  </td>
                  <td style="padding: 12px 14px; text-align: center; font-weight: 700; color: #818cf8;">\${d.total}</td>
                  <td style="padding: 12px 14px; text-align: center; color: #38bdf8; font-weight: 600;">\${d.today}</td>
                  <td style="padding: 12px 14px; text-align: center; color: #fbbf24; font-weight: 600;">\${d.inProgress}</td>
                  <td style="padding: 12px 14px; text-align: center; color: #34d399; font-weight: 600;">\${d.done}</td>
                </tr>
              \`).join('')}
            </tbody>
          </table>
        </div>
        <div style="margin-top: 8px; font-size: 0.75rem; color: var(--text-muted); text-align: right;">
          \${docList.length} médico(s) listado(s) • Gerado em \${new Date().toLocaleString('pt-BR')}
        </div>
      \`;

      document.getElementById('btn-doc-export-pdf')?.addEventListener('click', async () => {
        const cols = ['Médico', 'Especialidade', 'CRM', 'Status', 'Total', 'Hoje', 'Em Atend.', 'Concluídos', 'Pendentes'];
        const ts = new Date().toISOString().slice(0,10);
        await exportToPDF(cols, rows, 'Relatório de Atividades por Médico', \`relatorio_medicos_\${ts}\`);
      });

      document.getElementById('btn-doc-export-csv')?.addEventListener('click', () => {
        const cols = ['Médico', 'Especialidade', 'CRM', 'Status', 'Total', 'Hoje', 'Em Atend.', 'Concluídos', 'Pendentes'];
        const ts = new Date().toISOString().slice(0,10);
        exportToCSV(cols, rows, \`relatorio_medicos_\${ts}\`);
      });

    } catch (err) {
      console.error('[DoctorReport]', err);
      const previewCard2 = document.querySelector('.preview-card');
      if (previewCard2) previewCard2.innerHTML = '<div style="padding:40px;text-align:center;color:var(--color-danger);"><i class="fa-solid fa-triangle-exclamation"></i> Erro ao carregar relatório de médicos.</div>';
    }
  };

  const loadData = async () => {
    try {
      previewStatus.textContent = 'Buscando dados...';
      const [resPatients, resEncounters] = await Promise.all([
        apiFetch(\`\${API_URL}/patients\`),
        apiFetch(\`\${API_URL}/encounters\`)
      ]);

      if (resPatients.ok) patientsList = await resPatients.json();
      if (resEncounters.ok) encountersList = await resEncounters.json();

      renderFilters();
    } catch (err) {
      console.error(err);
      previewStatus.textContent = 'Erro ao carregar dados.';
    }
  };`;

if (!content.includes('renderDoctorReport')) {
  // fallback
  console.log('[PATCH 6] ⚠ renderDoctorReport não encontrado ainda no conteúdo');
} else if (content.includes(newLoadData.substring(0, 50))) {
  console.log('[PATCH 6] ⏭ renderDoctorReport já existe');
} else {
  content = content.replace(oldLoadData, newLoadData);
  console.log('[PATCH 6] ✅ renderDoctorReport inserido antes de loadData');
}

// ============================================================
// PATCH 7: Adicionar setupFilterGroupSelectAll para doctors
// ============================================================
const oldSetupFiltersEnd = `    } else if (activeTab === 'financial') {
      setupFilterGroupSelectAll('filter-fin-all', 'filter-fin-item', 'dropdown-fin-status', 'Status');
    }`;

const newSetupFiltersEnd = `    } else if (activeTab === 'financial') {
      setupFilterGroupSelectAll('filter-fin-all', 'filter-fin-item', 'dropdown-fin-status', 'Status');
    }
    // aba doctors não precisa de filtros de checkbox`;

if (!content.includes('aba doctors não precisa')) {
  content = content.replace(oldSetupFiltersEnd, newSetupFiltersEnd);
  console.log('[PATCH 7] ✅ Comentário adicionado para aba doctors');
}

writeFileSync(mainJsPath, content, 'utf8');
console.log('\n[DONE] main.js atualizado com sucesso!');
