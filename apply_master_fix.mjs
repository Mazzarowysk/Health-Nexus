import { readFileSync, writeFileSync } from 'fs';

const mainJsPath = 'c:/Health Nexus/src/main.js';
let content = readFileSync(mainJsPath, 'utf8');

// 1. Injetar funções globais window.updateAppointmentStatus e window.startAppointmentEncounter no final do arquivo
const globalHelpers = `

// ==========================================
// FUNÇÕES GLOBAIS DE INTERATIVIDADE E AGENDA
// ==========================================
window.handleCardClick = function(tabName, reportType, message) {
  const existingToast = document.querySelector('.interactive-toast');
  if (existingToast) existingToast.remove();

  const toast = document.createElement('div');
  toast.className = 'interactive-toast';
  toast.innerHTML = \`<i class="fa-solid fa-bolt" style="color:#a855f7;font-size:1.1rem;"></i> <span>\${message || ('Acessando ' + tabName)}</span>\`;
  toast.style.cssText = 'position:fixed;bottom:28px;right:28px;background:linear-gradient(135deg, #1e1b4b, #311b92);color:#ffffff;padding:14px 22px;border-radius:14px;border:1px solid #8b5cf6;box-shadow:0 12px 35px rgba(139,92,246,0.45);font-family:Outfit,sans-serif;font-weight:600;font-size:0.9rem;z-index:999999;transition:all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);display:flex;align-items:center;gap:12px;';
  document.body.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(12px)';
    setTimeout(() => toast.remove(), 300);
  }, 2200);

  switchTab(tabName);
  if (tabName === 'relatorios' && reportType) {
    setTimeout(() => {
      const btn = document.getElementById(reportType);
      if (btn) btn.click();
    }, 150);
  }
};

window.updateAppointmentStatus = async function(aptId, newStatus) {
  try {
    const res = await apiFetch('/api/appointments/' + aptId, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus })
    });
    if (res.ok) {
      showToast('Consulta marcada como ' + newStatus.toLowerCase() + '!');
      if (typeof dataCache !== 'undefined') {
        for (const key of Array.from(dataCache.keys())) {
          if (typeof key === 'string' && key.startsWith('appointments_')) {
            dataCache.delete(key);
            dataCacheTimestamps?.delete(key);
          }
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

    if (typeof dataCache !== 'undefined') {
      for (const key of Array.from(dataCache.keys())) {
        if (typeof key === 'string' && key.startsWith('appointments_')) {
          dataCache.delete(key);
          dataCacheTimestamps?.delete(key);
        }
      }
    }

    if (patientId) {
      await apiFetch('/api/encounters', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ patientId: patientId, type: 'Ambulatorio' })
      }).catch(e => console.log('Notice:', e));
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

// Remover versões anteriores das funções se existirem no final do arquivo
content = content.replace(/\/\/ ==========================================\n\/\/ FUNÇÕES GLOBAIS DE INTERATIVIDADE E AGENDA[\s\S]*/, '');
content += globalHelpers;

// 2. Garantir que os KPI Cards do Dashboard possuam a classe interactive-card e eventos
const dashKpiOld = `<div class="kpi-card">
            <div class="kpi-header">
              <span>Pacientes Ativos</span>`;
const dashKpiNew = `<div class="kpi-card interactive-card" id="dash-card-patients" onclick="handleCardClick('pacientes', null, 'Atalho: Abrindo lista de Pacientes Ativos')" title="Clique para ver a lista de Pacientes">
            <div class="kpi-header">
              <span>Pacientes Ativos</span>`;

content = content.replace(/<div class="kpi-card">\s*<div class="kpi-header">\s*<span>Pacientes Ativos<\/span>/g, dashKpiNew);

content = content.replace(
  /<div class="kpi-card">\s*<div class="kpi-header">\s*<span>Tempo de Espera Triagem<\/span>/g,
  `<div class="kpi-card interactive-card" id="dash-card-triage" onclick="handleCardClick('atendimento', null, 'Atalho: Acessando Fila de Triagem')" title="Clique para ir à Fila de Triagem">
            <div class="kpi-header">
              <span>Tempo de Espera Triagem</span>`
);

content = content.replace(
  /<div class="kpi-card">\s*<div class="kpi-header">\s*<span>Receita do Mês \(Particulares\)<\/span>/g,
  `<div class="kpi-card interactive-card" id="dash-card-revenue" onclick="handleCardClick('relatorios', 'tab-btn-financial', 'Atalho: Gerando Relatório Financeiro')" title="Clique para ver o Relatório Financeiro">
            <div class="kpi-header">
              <span>Receita do Mês (Particulares)</span>`
);

// 3. Garantir interatividade na aba Corpo Clínico (renderTable)
if (content.includes("kpisEl.innerHTML = `")) {
  const doctorKpisOld = `        <div class="interactive-card" id="kpi-doc-total" title="Clique para exibir todos os médicos" style="background: var(--bg-secondary); border: 1px solid var(--border-color); border-radius: 12px; padding: 16px 20px; display: flex; align-items: center; gap: 16px;">`;
  if (!content.includes('id="kpi-doc-total"')) {
    content = content.replace(
      `<div style="background: var(--bg-secondary); border: 1px solid var(--border-color); border-radius: 12px; padding: 16px 20px; display: flex; align-items: center; gap: 16px;">\n          <div style="width: 44px; height: 44px; border-radius: 12px; background: rgba(139,92,246,0.12); border: 1px solid rgba(139,92,246,0.25); display: flex; align-items: center; justify-content: center; color: #a78bfa;">\n            <i class="fa-solid fa-user-doctor" style="font-size: 1.2rem;"></i>\n          </div>\n          <div>\n            <div style="font-size: 0.75rem; color: var(--text-muted); font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em;">Total de Médicos</div>`,
      doctorKpisOld
    );
  }
}

// Injetar ouvintes do Corpo Clínico logo após renderTable renderizar kpisEl
const doctorListenersTarget = `renderTable(allDoctorsCache);`;
if (content.includes(doctorListenersTarget) && !content.includes("document.getElementById('kpi-doc-total')?.addEventListener")) {
  content = content.replace(
    doctorListenersTarget,
    `renderTable(allDoctorsCache);

    setTimeout(() => {
      document.getElementById('kpi-doc-total')?.addEventListener('click', () => {
        const input = document.getElementById('filter-doctor-search');
        if (input) { input.value = ''; renderTable(allDoctorsCache); }
        handleCardClick('medicos', null, 'Filtro: Exibindo todos os médicos');
      });

      document.getElementById('kpi-doc-active')?.addEventListener('click', () => {
        const input = document.getElementById('filter-doctor-search');
        if (input) { input.value = 'Ativo'; renderTable(allDoctorsCache); }
        handleCardClick('medicos', null, 'Filtro: Exibindo apenas médicos Ativos');
      });

      document.getElementById('kpi-doc-specs')?.addEventListener('click', () => {
        const specsMap = {};
        allDoctorsCache.forEach(d => { specsMap[d.specialty] = (specsMap[d.specialty] || 0) + 1; });
        const list = Object.entries(specsMap).map(([s, c]) => '• ' + s + ': ' + c + ' médico(s)').join('\\n');
        alert('Resumo de Especialidades no Corpo Clínico:\\n\\n' + (list || 'Nenhuma especialidade cadastrada.'));
      });
    }, 100);`
  );
}

writeFileSync(mainJsPath, content, 'utf8');
console.log('✅ master_fix executado com sucesso em main.js!');
