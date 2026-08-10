// src/tabs/escalas.js — Escalas de Trabalho (Médicos e Enfermeiros)
import * as localDB from '../localDB.js';
import { apiFetch, showToast, showCustomAlert } from '../main.js';

let currentSubTab = 'medicos'; // 'medicos' ou 'enfermeiros'
let currentDateFilter = 'today'; // 'all', 'today', 'week', 'month'
let currentShiftFilter = 'all';
let currentSearchTerm = '';

export function renderSchedulesTab() {
  const contentArea = document.getElementById('main-content');
  if (!contentArea) return;

  const rawSchedules = localDB.list('duty_schedules') || [];
  const doctors = localDB.list('doctors') || [];
  const nurses = localDB.list('nurses') || [];

  const todayStr = new Date().toISOString().split('T')[0];

  // Cálculo de KPIs
  const todaySchedules = rawSchedules.filter(s => s.shiftDate === todayStr);
  const todayMedicos = todaySchedules.filter(s => s.category === 'medico' || s.crm_coren?.includes('CRM'));
  const todayEnfermeiros = todaySchedules.filter(s => s.category === 'enfermeiro' || s.crm_coren?.includes('COREN'));

  contentArea.innerHTML = `
    <div class="tab-section active animate-fade-in" id="tab-escalas">
      
      <!-- Cabeçalho da Aba -->
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; flex-wrap: wrap; gap: 12px;">
        <div>
          <h2 style="font-size: 1.5rem; font-weight: 700; margin: 0; color: var(--text-primary); display: flex; align-items: center; gap: 10px;">
            <i class="fa-solid fa-user-clock" style="color: #6366f1;"></i> Escalas de Trabalho &amp; Plantões
          </h2>
          <p style="color: var(--text-secondary); margin: 4px 0 0 0; font-size: 0.88rem;">
            Gestão operacional de turnos e alocação de Médicos e Enfermeiros.
          </p>
        </div>
        <div style="display: flex; gap: 10px;">
          <button id="btn-export-schedules" class="btn" style="background: var(--bg-tertiary); color: var(--text-primary); border: 1px solid var(--border-color);">
            <i class="fa-solid fa-print"></i> Imprimir Escala
          </button>
          <button id="btn-add-schedule" class="btn btn-primary" style="background: linear-gradient(135deg, #6366f1, #4f46e5); color: #fff; box-shadow: 0 4px 12px rgba(99,102,241,0.3);">
            <i class="fa-solid fa-plus"></i> Novo Plantão
          </button>
        </div>
      </div>

      <!-- KPI Grid -->
      <div class="kpi-grid" style="margin-bottom: 24px;">
        <div class="kpi-card">
          <div class="kpi-header">
            <span>Plantões Registrados</span>
            <div class="kpi-icon primary"><i class="fa-solid fa-calendar-check"></i></div>
          </div>
          <div class="kpi-value">${rawSchedules.length}</div>
          <div class="kpi-trend trend-up">
            <i class="fa-solid fa-chart-simple"></i> Total no Sistema
          </div>
        </div>

        <div class="kpi-card">
          <div class="kpi-header">
            <span>Médicos de Plantão Hoje</span>
            <div class="kpi-icon success"><i class="fa-solid fa-user-doctor"></i></div>
          </div>
          <div class="kpi-value">${todayMedicos.length}</div>
          <div class="kpi-trend trend-up">
            <i class="fa-solid fa-check"></i> ${todayStr}
          </div>
        </div>

        <div class="kpi-card">
          <div class="kpi-header">
            <span>Enfermeiros de Plantão Hoje</span>
            <div class="kpi-icon accent"><i class="fa-solid fa-user-nurse"></i></div>
          </div>
          <div class="kpi-value">${todayEnfermeiros.length}</div>
          <div class="kpi-trend trend-up">
            <i class="fa-solid fa-check"></i> ${todayStr}
          </div>
        </div>

        <div class="kpi-card">
          <div class="kpi-header">
            <span>Cobertura de Setores</span>
            <div class="kpi-icon warning"><i class="fa-solid fa-hospital"></i></div>
          </div>
          <div class="kpi-value">100%</div>
          <div class="kpi-trend trend-up">
            <i class="fa-solid fa-shield-halved"></i> Todos os setores cobertos
          </div>
        </div>
      </div>

      <!-- Navegação por Orelhas (Sub-abas) -->
      <div style="display: flex; border-bottom: 2px solid var(--border-color); margin-bottom: 20px; gap: 8px;">
        <button id="subtab-medicos" class="subtab-btn ${currentSubTab === 'medicos' ? 'active' : ''}" style="padding: 10px 20px; font-weight: 700; font-size: 0.95rem; border: none; background: none; cursor: pointer; color: ${currentSubTab === 'medicos' ? '#6366f1' : 'var(--text-secondary)'}; border-bottom: 3px solid ${currentSubTab === 'medicos' ? '#6366f1' : 'transparent'}; transition: all 0.2s;">
          <i class="fa-solid fa-user-doctor" style="margin-right: 8px;"></i> 🩺 Escala de Médicos (${rawSchedules.filter(s => s.category === 'medico' || s.crm_coren?.includes('CRM')).length})
        </button>
        <button id="subtab-enfermeiros" class="subtab-btn ${currentSubTab === 'enfermeiros' ? 'active' : ''}" style="padding: 10px 20px; font-weight: 700; font-size: 0.95rem; border: none; background: none; cursor: pointer; color: ${currentSubTab === 'enfermeiros' ? '#06b6d4' : 'var(--text-secondary)'}; border-bottom: 3px solid ${currentSubTab === 'enfermeiros' ? '#06b6d4' : 'transparent'}; transition: all 0.2s;">
          <i class="fa-solid fa-user-nurse" style="margin-right: 8px;"></i> 💉 Escala de Enfermeiros (${rawSchedules.filter(s => s.category === 'enfermeiro' || s.crm_coren?.includes('COREN')).length})
        </button>
      </div>

      <!-- Barra de Filtros e Busca Padronizada -->
      <div style="display: flex; gap: 14px; margin-bottom: 24px; flex-wrap: wrap; align-items: center; background: var(--bg-secondary); padding: 18px 20px; border-radius: 16px; border: 1px solid var(--border-color); box-shadow: 0 4px 20px rgba(0,0,0,0.15);">
        
        <!-- Busca por Nome, CRM/COREN ou Setor -->
        <div style="flex: 1; min-width: 280px; position: relative;">
          <i class="fa-solid fa-magnifying-glass" style="position: absolute; left: 14px; top: 50%; transform: translateY(-50%); color: var(--text-secondary); font-size: 0.95rem; pointer-events: none;"></i>
          <input type="text" id="schedule-search" class="input-field" placeholder="Buscar por nome, CRM/COREN ou setor..." value="${currentSearchTerm}" style="padding-left: 42px; width: 100%; height: 44px; border-radius: 12px; border: 1px solid var(--border-color); background: var(--bg-tertiary); color: var(--text-primary); font-size: 0.9rem; box-sizing: border-box;">
        </div>

        <!-- Filtro Período / Data -->
        <div style="min-width: 160px;">
          <select id="schedule-filter-date" class="input-field" style="width: 100%; height: 44px; padding: 0 14px; border-radius: 12px; border: 1px solid var(--border-color); background: var(--bg-tertiary); color: var(--text-primary); font-size: 0.9rem; cursor: pointer; box-sizing: border-box;">
            <option value="today" ${currentDateFilter === 'today' ? 'selected' : ''}>📅 Hoje</option>
            <option value="week" ${currentDateFilter === 'week' ? 'selected' : ''}>📆 Esta Semana</option>
            <option value="month" ${currentDateFilter === 'month' ? 'selected' : ''}>🗓️ Este Mês</option>
            <option value="all" ${currentDateFilter === 'all' ? 'selected' : ''}>🌐 Todos os Dias</option>
          </select>
        </div>

        <!-- Filtro Turno -->
        <div style="min-width: 170px;">
          <select id="schedule-filter-shift" class="input-field" style="width: 100%; height: 44px; padding: 0 14px; border-radius: 12px; border: 1px solid var(--border-color); background: var(--bg-tertiary); color: var(--text-primary); font-size: 0.9rem; cursor: pointer; box-sizing: border-box;">
            <option value="all" ${currentShiftFilter === 'all' ? 'selected' : ''}>⏱️ Todos os Turnos</option>
            <option value="Manhã" ${currentShiftFilter === 'Manhã' ? 'selected' : ''}>🌅 Manhã</option>
            <option value="Tarde" ${currentShiftFilter === 'Tarde' ? 'selected' : ''}>☀️ Tarde</option>
            <option value="Noite" ${currentShiftFilter === 'Noite' ? 'selected' : ''}>🌙 Noite</option>
            <option value="Plantão 24h" ${currentShiftFilter === 'Plantão 24h' ? 'selected' : ''}>⏰ Plantão 24h</option>
            <option value="12x36" ${currentShiftFilter === '12x36' ? 'selected' : ''}>🔄 Escala 12x36</option>
          </select>
        </div>
      </div>

      <!-- Tabela/Grid da Escala -->
      <div id="schedule-list-container">
        ${renderScheduleCards(rawSchedules, doctors, nurses)}
      </div>

    </div>
  `;

  attachEventListeners();
}

function renderScheduleCards(allSchedules, doctors, nurses) {
  const targetCategory = currentSubTab === 'medicos' ? 'medico' : 'enfermeiro';

  let filtered = allSchedules.filter(s => {
    const isCat = currentSubTab === 'medicos' 
      ? (s.category === 'medico' || s.crm_coren?.includes('CRM') || !s.category)
      : (s.category === 'enfermeiro' || s.crm_coren?.includes('COREN'));
    return isCat;
  });

  // Filtro de Data
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];

  if (currentDateFilter === 'today') {
    filtered = filtered.filter(s => s.shiftDate === todayStr);
  } else if (currentDateFilter === 'week') {
    const startWeek = new Date(today);
    startWeek.setDate(today.getDate() - today.getDay());
    const endWeek = new Date(today);
    endWeek.setDate(today.getDate() + (6 - today.getDay()));

    const sStr = startWeek.toISOString().split('T')[0];
    const eStr = endWeek.toISOString().split('T')[0];
    filtered = filtered.filter(s => s.shiftDate >= sStr && s.shiftDate <= eStr);
  } else if (currentDateFilter === 'month') {
    const monthPrefix = todayStr.substring(0, 7);
    filtered = filtered.filter(s => (s.shiftDate || '').startsWith(monthPrefix));
  }

  // Filtro de Turno
  if (currentShiftFilter !== 'all') {
    filtered = filtered.filter(s => (s.shiftType || '').includes(currentShiftFilter));
  }

  // Busca por Texto
  if (currentSearchTerm.trim()) {
    const term = currentSearchTerm.toLowerCase().trim();
    filtered = filtered.filter(s => 
      (s.professionalName || '').toLowerCase().includes(term) ||
      (s.crm_coren || '').toLowerCase().includes(term) ||
      (s.roomName || s.sector || '').toLowerCase().includes(term) ||
      (s.specialty_role || '').toLowerCase().includes(term)
    );
  }

  if (filtered.length === 0) {
    return `
      <div style="text-align: center; padding: 40px 20px; background: var(--bg-secondary); border-radius: 12px; border: 1px dashed var(--border-color);">
        <i class="fa-solid fa-calendar-xmark" style="font-size: 3rem; color: var(--text-secondary); opacity: 0.5; margin-bottom: 12px;"></i>
        <h4 style="margin: 0; color: var(--text-primary);">Nenhum plantão encontrado</h4>
        <p style="color: var(--text-secondary); margin: 6px 0 16px 0; font-size: 0.9rem;">
          Não há escalas cadastradas para os filtros selecionados (${currentSubTab === 'medicos' ? 'Médicos' : 'Enfermeiros'}).
        </p>
        <button id="btn-add-schedule-empty" class="btn btn-primary" style="background: #6366f1; color: #fff;">
          <i class="fa-solid fa-plus"></i> Cadastrar Plantão
        </button>
      </div>
    `;
  }

  // Agrupar por data
  const groupedByDate = {};
  filtered.forEach(item => {
    const d = item.shiftDate || 'Sem Data';
    if (!groupedByDate[d]) groupedByDate[d] = [];
    groupedByDate[d].push(item);
  });

  const sortedDates = Object.keys(groupedByDate).sort();

  return sortedDates.map(dateStr => {
    const formattedDate = dateStr !== 'Sem Data' 
      ? new Date(dateStr + 'T00:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' })
      : 'Data Não Definida';

    const items = groupedByDate[dateStr];

    return `
      <div style="margin-bottom: 24px;">
        <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 12px; border-bottom: 1px solid var(--border-color); padding-bottom: 6px;">
          <i class="fa-solid fa-calendar-day" style="color: #6366f1;"></i>
          <h3 style="margin: 0; font-size: 1.05rem; font-weight: 700; color: var(--text-primary); text-transform: capitalize;">
            ${formattedDate} ${dateStr === todayStr ? '<span style="background: #10b981; color: #fff; font-size: 0.72rem; padding: 2px 8px; border-radius: 12px; margin-left: 6px;">HOJE</span>' : ''}
          </h3>
          <span style="margin-left: auto; font-size: 0.82rem; color: var(--text-secondary);">
            ${items.length} plantão(ões)
          </span>
        </div>

        <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 16px;">
          ${items.map(s => {
            const isMedico = currentSubTab === 'medicos';
            const badgeBg = s.status === 'Em Andamento' ? 'linear-gradient(135deg, #10b981, #059669)' :
                            s.status === 'Troca Solicitada' ? 'linear-gradient(135deg, #f59e0b, #d97706)' :
                            s.status === 'Ausente' ? 'linear-gradient(135deg, #ef4444, #dc2626)' :
                            'linear-gradient(135deg, #6366f1, #4f46e5)';

            return `
              <div class="interactive-card" style="background: var(--bg-secondary); border: 1px solid var(--border-color); border-radius: 12px; padding: 16px; position: relative; transition: all 0.2s;">
                
                <div style="display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 12px;">
                  <div style="display: flex; align-items: center; gap: 12px;">
                    <div style="width: 44px; height: 44px; border-radius: 50%; background: ${isMedico ? 'rgba(99, 102, 241, 0.15)' : 'rgba(6, 182, 212, 0.15)'}; display: flex; align-items: center; justify-content: center; color: ${isMedico ? '#6366f1' : '#06b6d4'}; font-size: 1.2rem; font-weight: 700;">
                      <i class="fa-solid ${isMedico ? 'fa-user-doctor' : 'fa-user-nurse'}"></i>
                    </div>
                    <div>
                      <h4 style="margin: 0; font-size: 0.98rem; font-weight: 700; color: var(--text-primary);">
                        ${s.professionalName}
                      </h4>
                      <span style="font-size: 0.78rem; color: var(--text-secondary); display: block;">
                        ${s.crm_coren || 'Reg: N/D'} • <strong>${s.specialty_role || (isMedico ? 'Médico' : 'Enfermeiro')}</strong>
                      </span>
                    </div>
                  </div>
                  <span style="padding: 3px 9px; border-radius: 20px; font-size: 0.7rem; font-weight: 700; color: #fff; background: ${badgeBg};">
                    ${s.status || 'Confirmado'}
                  </span>
                </div>

                <div style="background: var(--bg-tertiary); padding: 10px 12px; border-radius: 8px; margin-bottom: 12px; font-size: 0.84rem; display: flex; flex-direction: column; gap: 4px;">
                  <div style="display: flex; justify-content: space-between;">
                    <span style="color: var(--text-secondary);"><i class="fa-solid fa-clock" style="margin-right: 6px; color: #6366f1;"></i> Turno:</span>
                    <strong style="color: var(--text-primary);">${s.shiftType || 'Manhã'} (${s.workloadHours || 6}h)</strong>
                  </div>
                  <div style="display: flex; justify-content: space-between;">
                    <span style="color: var(--text-secondary);"><i class="fa-solid fa-location-dot" style="margin-right: 6px; color: #ef4444;"></i> Local / Setor:</span>
                    <strong style="color: var(--text-primary);">${s.roomName || s.sector || 'Consultório 01'}</strong>
                  </div>
                  ${s.notes ? `
                    <div style="margin-top: 4px; font-style: italic; color: var(--text-secondary); font-size: 0.78rem;">
                      <i class="fa-solid fa-note-sticky" style="margin-right: 4px;"></i> ${s.notes}
                    </div>
                  ` : ''}
                </div>

                <div style="display: flex; justify-content: flex-end; gap: 8px;">
                  <button class="btn btn-sm btn-edit-schedule" data-id="${s.id}" style="padding: 4px 10px; font-size: 0.78rem; background: var(--bg-tertiary); color: var(--text-primary); border: 1px solid var(--border-color);">
                    <i class="fa-solid fa-pen-to-square"></i> Editar
                  </button>
                  <button class="btn btn-sm btn-delete-schedule" data-id="${s.id}" style="padding: 4px 10px; font-size: 0.78rem; background: rgba(239,68,68,0.1); color: #ef4444; border: 1px solid rgba(239,68,68,0.3);">
                    <i class="fa-solid fa-trash"></i> Excluir
                  </button>
                </div>

              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;
  }).join('');
}

function attachEventListeners() {
  // Troca de Orelhas
  document.getElementById('subtab-medicos')?.addEventListener('click', () => {
    currentSubTab = 'medicos';
    renderSchedulesTab();
  });

  document.getElementById('subtab-enfermeiros')?.addEventListener('click', () => {
    currentSubTab = 'enfermeiros';
    renderSchedulesTab();
  });

  // Filtros e Busca
  document.getElementById('schedule-search')?.addEventListener('input', (e) => {
    currentSearchTerm = e.target.value;
    updateListOnly();
  });

  document.getElementById('schedule-filter-date')?.addEventListener('change', (e) => {
    currentDateFilter = e.target.value;
    updateListOnly();
  });

  document.getElementById('schedule-filter-shift')?.addEventListener('change', (e) => {
    currentShiftFilter = e.target.value;
    updateListOnly();
  });

  // Novo Plantão
  document.getElementById('btn-add-schedule')?.addEventListener('click', () => openScheduleModal());
  document.getElementById('btn-add-schedule-empty')?.addEventListener('click', () => openScheduleModal());

  // Exportar / Imprimir
  document.getElementById('btn-export-schedules')?.addEventListener('click', () => {
    window.print();
  });

  // Delegar Editar e Excluir
  const listContainer = document.getElementById('schedule-list-container');
  if (listContainer) {
    listContainer.addEventListener('click', (e) => {
      const editBtn = e.target.closest('.btn-edit-schedule');
      if (editBtn) {
        const id = editBtn.getAttribute('data-id');
        openScheduleModal(id);
        return;
      }

      const delBtn = e.target.closest('.btn-delete-schedule');
      if (delBtn) {
        const id = delBtn.getAttribute('data-id');
        confirmDeleteSchedule(id);
        return;
      }
    });
  }
}

function updateListOnly() {
  const container = document.getElementById('schedule-list-container');
  if (container) {
    const rawSchedules = localDB.list('duty_schedules') || [];
    const doctors = localDB.list('doctors') || [];
    const nurses = localDB.list('nurses') || [];
    container.innerHTML = renderScheduleCards(rawSchedules, doctors, nurses);
  }
}

// Modal de Criação / Edição de Plantão
function openScheduleModal(scheduleId = null) {
  const existing = document.getElementById('hn-schedule-modal');
  if (existing) existing.remove();

  const isEdit = !!scheduleId;
  const item = isEdit ? localDB.get('duty_schedules', scheduleId) : null;

  const doctors = localDB.list('doctors') || [];
  const nurses = localDB.list('nurses') || [];
  const activeCategory = item ? (item.category || (item.crm_coren?.includes('CRM') ? 'medico' : 'enfermeiro')) : currentSubTab;

  const professionals = activeCategory === 'medico' ? doctors : nurses;

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay active';
  overlay.id = 'hn-schedule-modal';

  const todayStr = new Date().toISOString().split('T')[0];

  overlay.innerHTML = `
    <div class="modal-card animate-scale-up" style="max-width: 540px; width: 90%;">
      <div class="modal-header">
        <h3 style="margin: 0; font-size: 1.2rem; display: flex; align-items: center; gap: 8px;">
          <i class="fa-solid fa-calendar-plus" style="color: #6366f1;"></i>
          ${isEdit ? 'Editar Plantão de Escala' : 'Cadastrar Novo Plantão de Escala'}
        </h3>
        <button id="btn-close-schedule-modal" class="modal-close"><i class="fa-solid fa-xmark"></i></button>
      </div>

      <form id="form-schedule" style="padding: 20px;">
        <div style="margin-bottom: 16px;">
          <label style="display: block; font-weight: 700; margin-bottom: 6px; font-size: 0.88rem;">Categoria do Profissional:</label>
          <div style="display: flex; gap: 12px;">
            <label style="display: flex; align-items: center; gap: 6px; cursor: pointer;">
              <input type="radio" name="modal-category" value="medico" ${activeCategory === 'medico' ? 'checked' : ''}> 🩺 Médico
            </label>
            <label style="display: flex; align-items: center; gap: 6px; cursor: pointer;">
              <input type="radio" name="modal-category" value="enfermeiro" ${activeCategory === 'enfermeiro' ? 'checked' : ''}> 💉 Enfermeiro
            </label>
          </div>
        </div>

        <div style="margin-bottom: 16px;">
          <label style="display: block; font-weight: 700; margin-bottom: 6px; font-size: 0.88rem;">Profissional:</label>
          <select id="modal-prof-id" class="input-field" required style="width: 100%;">
            <option value="">-- Selecione o Profissional --</option>
            ${professionals.map(p => `
              <option value="${p.id}" ${item && (item.professionalId === p.id || item.doctorId === p.id) ? 'selected' : ''}>
                ${p.name} (${p.crm || p.coren || 'N/D'}) - ${p.specialty || p.roleFunction || ''}
              </option>
            `).join('')}
          </select>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 16px;">
          <div>
            <label style="display: block; font-weight: 700; margin-bottom: 6px; font-size: 0.88rem;">Data do Plantão:</label>
            <input type="date" id="modal-shift-date" class="input-field" required value="${item?.shiftDate || todayStr}" style="width: 100%;">
          </div>

          <div>
            <label style="display: block; font-weight: 700; margin-bottom: 6px; font-size: 0.88rem;">Tipo de Turno:</label>
            <select id="modal-shift-type" class="input-field" required style="width: 100%;">
              <option value="Manhã (07:00 - 13:00)" ${item?.shiftType?.includes('Manhã') ? 'selected' : ''}>🌅 Manhã (07:00 - 13:00)</option>
              <option value="Tarde (13:00 - 19:00)" ${item?.shiftType?.includes('Tarde') ? 'selected' : ''}>☀️ Tarde (13:00 - 19:00)</option>
              <option value="Noite (19:00 - 07:00)" ${item?.shiftType?.includes('Noite') ? 'selected' : ''}>🌙 Noite (19:00 - 07:00)</option>
              <option value="Plantão 24h (07:00 - 07:00)" ${item?.shiftType?.includes('24h') ? 'selected' : ''}>⏰ Plantão 24h</option>
              <option value="Escala 12x36 (07:00 - 19:00)" ${item?.shiftType?.includes('12x36') ? 'selected' : ''}>🔄 Escala 12x36</option>
            </select>
          </div>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 16px;">
          <div>
            <label style="display: block; font-weight: 700; margin-bottom: 6px; font-size: 0.88rem;">Setor / Consultório:</label>
            <input type="text" id="modal-room-name" class="input-field" placeholder="Ex: Consultório 01, UTI, PS..." required value="${item?.roomName || item?.sector || ''}" style="width: 100%;">
          </div>

          <div>
            <label style="display: block; font-weight: 700; margin-bottom: 6px; font-size: 0.88rem;">Status do Plantão:</label>
            <select id="modal-status" class="input-field" style="width: 100%;">
              <option value="Confirmado" ${item?.status === 'Confirmado' ? 'selected' : ''}>Confirmado</option>
              <option value="Em Andamento" ${item?.status === 'Em Andamento' ? 'selected' : ''}>Em Andamento</option>
              <option value="Troca Solicitada" ${item?.status === 'Troca Solicitada' ? 'selected' : ''}>Troca Solicitada</option>
              <option value="Concluído" ${item?.status === 'Concluído' ? 'selected' : ''}>Concluído</option>
              <option value="Ausente" ${item?.status === 'Ausente' ? 'selected' : ''}>Ausente / Falta</option>
            </select>
          </div>
        </div>

        <div style="margin-bottom: 20px;">
          <label style="display: block; font-weight: 700; margin-bottom: 6px; font-size: 0.88rem;">Observações / Instruções:</label>
          <textarea id="modal-notes" class="input-field" rows="2" placeholder="Notas adicionais sobre o plantão..." style="width: 100%; resize: vertical;">${item?.notes || ''}</textarea>
        </div>

        <div style="display: flex; justify-content: flex-end; gap: 10px;">
          <button type="button" id="btn-cancel-modal" class="btn" style="background: var(--bg-tertiary); color: var(--text-primary); border: 1px solid var(--border-color);">
            Cancelar
          </button>
          <button type="submit" class="btn btn-primary" style="background: #6366f1; color: #fff;">
            ${isEdit ? 'Salvar Alterações' : 'Cadastrar Plantão'}
          </button>
        </div>
      </form>
    </div>
  `;

  document.body.appendChild(overlay);

  // Eventos do modal
  const close = () => overlay.remove();
  document.getElementById('btn-close-schedule-modal')?.addEventListener('click', close);
  document.getElementById('btn-cancel-modal')?.addEventListener('click', close);

  // Mudança de categoria no modal atualiza a lista de profissionais
  const categoryRadios = overlay.querySelectorAll('input[name="modal-category"]');
  categoryRadios.forEach(radio => {
    radio.addEventListener('change', (e) => {
      const selectedCat = e.target.value;
      const selectProf = document.getElementById('modal-prof-id');
      const list = selectedCat === 'medico' ? doctors : nurses;
      selectProf.innerHTML = `
        <option value="">-- Selecione o Profissional --</option>
        ${list.map(p => `
          <option value="${p.id}">${p.name} (${p.crm || p.coren || 'N/D'}) - ${p.specialty || p.roleFunction || ''}</option>
        `).join('')}
      `;
    });
  });

  // Submit do formulário
  document.getElementById('form-schedule')?.addEventListener('submit', (e) => {
    e.preventDefault();

    const category = overlay.querySelector('input[name="modal-category"]:checked')?.value || 'medico';
    const profId = document.getElementById('modal-prof-id')?.value;
    const shiftDate = document.getElementById('modal-shift-date')?.value;
    const shiftType = document.getElementById('modal-shift-type')?.value;
    const roomName = document.getElementById('modal-room-name')?.value;
    const status = document.getElementById('modal-status')?.value;
    const notes = document.getElementById('modal-notes')?.value;

    if (!profId) {
      showToast('Por favor, selecione um profissional.', 'error');
      return;
    }

    const listProf = category === 'medico' ? doctors : nurses;
    const profObj = listProf.find(p => p.id === profId);

    const workloadHours = shiftType.includes('24h') ? 24 : shiftType.includes('Noite') || shiftType.includes('12x36') ? 12 : 6;

    const payload = {
      category,
      professionalId: profId,
      professionalName: profObj ? profObj.name : 'Profissional',
      crm_coren: profObj ? (profObj.crm || profObj.coren) : '',
      specialty_role: profObj ? (profObj.specialty || profObj.roleFunction) : '',
      shiftDate,
      shiftType,
      workloadHours,
      roomName,
      sector: roomName,
      status,
      notes
    };

    if (isEdit) {
      localDB.update('duty_schedules', scheduleId, payload);
      showToast('Plantão de escala atualizado com sucesso!', 'success');
    } else {
      localDB.insert('duty_schedules', payload);
      showToast('Novo plantão cadastrado com sucesso!', 'success');
    }

    close();
    renderSchedulesTab();
  });
}

function confirmDeleteSchedule(id) {
  showCustomAlert({
    title: 'Excluir Plantão de Escala',
    message: 'Tem certeza que deseja remover este plantão da escala de trabalho?',
    confirmText: 'Sim, Excluir',
    cancelText: 'Cancelar',
    onConfirm: () => {
      localDB.remove('duty_schedules', id);
      showToast('Plantão removido com sucesso!', 'success');
      renderSchedulesTab();
    }
  });
}
