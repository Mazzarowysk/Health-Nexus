import { readFileSync, writeFileSync } from 'fs';

const filePath = 'c:/Health Nexus/src/main.js';
let content = readFileSync(filePath, 'utf8');

// 1. Definir startAppointmentEncounter e updateAppointmentStatus no topo das funções globais
const globalFixes = `
window.updateAppointmentStatus = async function(aptId, newStatus) {
  try {
    const res = await apiFetch('/api/appointments/' + aptId, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus })
    });
    if (res.ok) {
      showToast('Consulta marcada como ' + newStatus.toLowerCase() + '!');
      for (const key of dataCache.keys()) {
        if (typeof key === 'string' && key.startsWith('appointments_')) {
          dataCache.delete(key);
          dataCacheTimestamps.delete(key);
        }
      }
      if (state.activeTab === 'agenda') {
        renderAgendaTab();
      }
    } else {
      const err = await res.json().catch(() => ({}));
      alert(err.message || 'Erro ao atualizar agendamento.');
    }
  } catch (e) {
    console.error('Erro em updateAppointmentStatus:', e);
    alert('Erro de conexão ao atualizar agendamento.');
  }
};

window.startAppointmentEncounter = async function(patientId, aptId) {
  try {
    const statusRes = await apiFetch('/api/appointments/' + aptId, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'Em Atendimento' })
    });

    for (const key of dataCache.keys()) {
      if (typeof key === 'string' && key.startsWith('appointments_')) {
        dataCache.delete(key);
        dataCacheTimestamps.delete(key);
      }
    }

    if (patientId) {
      await apiFetch('/api/encounters', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ patientId: patientId, type: 'Ambulatorio' })
      }).catch(e => console.log('Encounter note:', e));
    }

    showToast('⚡ Atendimento iniciado! Paciente movido para Em Atendimento.');

    if (state.activeTab === 'agenda') {
      renderAgendaTab();
    } else {
      switchTab('atendimento');
    }
  } catch (e) {
    console.error('Erro em startAppointmentEncounter:', e);
    showToast('Erro ao iniciar atendimento.');
  }
};
`;

// Remover implementações antigas se existirem
content = content.replace(/window\.updateAppointmentStatus =[\s\S]*?\n\};/, '');
content = content.replace(/window\.startAppointmentEncounter =[\s\S]*?\n\};/, '');

content = globalFixes + content;

// 2. Arrumar a renderização dos KPI Cards do Dashboard para TEREM classe interactive-card e ID de clique
const dashboardKpiOld = `        <!-- KPI Cards Grid -->
        <div class="kpi-grid">
          <!-- Card Ocupação -->
          <div class="kpi-card">
            <div class="kpi-header">
              <span>Pacientes Ativos</span>
              <div class="kpi-icon primary"><i class="fa-solid fa-bed"></i></div>
            </div>
            <div class="kpi-value" id="kpi-active-patients">\${data.activePatients}</div>
            <div class="kpi-trend trend-up">
              <i class="fa-solid fa-arrow-trend-up"></i>
              <span>Pacientes no Turso DB</span>
            </div>
          </div>

          <!-- Card Atendimentos -->
          <div class="kpi-card">
            <div class="kpi-header">
              <span>Tempo de Espera Triagem</span>
              <div class="kpi-icon warning"><i class="fa-solid fa-clock"></i></div>
            </div>
            <div class="kpi-value">\${data.averageWaitTimeMinutes} min</div>
            <div class="kpi-trend trend-down">
              <i class="fa-solid fa-arrow-trend-down"></i>
              <span>-3 min vs ontem</span>
            </div>
          </div>

          <!-- Card Faturamento -->
          <div class="kpi-card">
            <div class="kpi-header">
              <span>Receita do Mês (Particulares)</span>
              <div class="kpi-icon accent"><i class="fa-solid fa-hand-holding-dollar"></i></div>
            </div>
            <div class="kpi-value">R$ \${data.billingSummary.totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
            <div class="kpi-trend trend-up">
              <i class="fa-solid fa-arrow-trend-up"></i>
              <span>+12% vs mês anterior</span>
            </div>
          </div>
        </div>`;

const dashboardKpiNew = `        <!-- KPI Cards Grid Interativos -->
        <div class="kpi-grid">
          <!-- Card Ocupação -->
          <div class="kpi-card interactive-card" id="dash-card-patients" title="Clique para ver a lista de Pacientes">
            <div class="kpi-header">
              <span>Pacientes Ativos</span>
              <div class="kpi-icon primary"><i class="fa-solid fa-bed"></i></div>
            </div>
            <div class="kpi-value" id="kpi-active-patients">\${data.activePatients}</div>
            <div class="kpi-trend trend-up">
              <i class="fa-solid fa-arrow-trend-up"></i>
              <span>Pacientes no Turso DB</span>
            </div>
          </div>

          <!-- Card Atendimentos -->
          <div class="kpi-card interactive-card" id="dash-card-triage" title="Clique para ir à Fila de Triagem">
            <div class="kpi-header">
              <span>Tempo de Espera Triagem</span>
              <div class="kpi-icon warning"><i class="fa-solid fa-clock"></i></div>
            </div>
            <div class="kpi-value">\${data.averageWaitTimeMinutes} min</div>
            <div class="kpi-trend trend-down">
              <i class="fa-solid fa-arrow-trend-down"></i>
              <span>-3 min vs ontem</span>
            </div>
          </div>

          <!-- Card Faturamento -->
          <div class="kpi-card interactive-card" id="dash-card-revenue" title="Clique para ver o Relatório Financeiro">
            <div class="kpi-header">
              <span>Receita do Mês (Particulares)</span>
              <div class="kpi-icon accent"><i class="fa-solid fa-hand-holding-dollar"></i></div>
            </div>
            <div class="kpi-value">R$ \${data.billingSummary.totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
            <div class="kpi-trend trend-up">
              <i class="fa-solid fa-arrow-trend-up"></i>
              <span>+12% vs mês anterior</span>
            </div>
          </div>
        </div>`;

content = content.replace(dashboardKpiOld, dashboardKpiNew);

// Injetar os eventListeners dos cards do Dashboard logo após a renderização
const initChartsCall = `setTimeout(() => {
      initDashboardCharts(data);
    }, 50);`;

const initChartsAndListeners = `setTimeout(() => {
      initDashboardCharts(data);

      document.getElementById('dash-card-patients')?.addEventListener('click', () => {
        handleCardClick('pacientes', null, 'Atalho: Abrindo lista de Pacientes Ativos');
      });
      document.getElementById('dash-card-triage')?.addEventListener('click', () => {
        handleCardClick('atendimento', null, 'Atalho: Acessando Fila de Triagem');
      });
      document.getElementById('dash-card-revenue')?.addEventListener('click', () => {
        handleCardClick('relatorios', 'tab-btn-financial', 'Atalho: Gerando Relatório Financeiro');
      });
    }, 50);`;

content = content.replace(initChartsCall, initChartsAndListeners);

writeFileSync(filePath, content, 'utf8');
console.log('✅ fix_dashboard_interactivity_and_atender.mjs concluído!');
