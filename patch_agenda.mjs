import { readFileSync, writeFileSync } from 'fs';

const filePath = 'c:/Health Nexus/src/main.js';
const content = readFileSync(filePath, 'utf8');

const startMarker = 'async function renderAgendaTab() {';
const endMarker = 'window.updateAppointmentStatus';

const startIdx = content.indexOf(startMarker);
const endIdx = content.indexOf(endMarker, startIdx);

if (startIdx === -1 || endIdx === -1) {
  console.error('Marcadores não encontrados!', { startIdx, endIdx });
  process.exit(1);
}

const before = content.substring(0, startIdx);
const after = content.substring(endIdx);

const newFunc = `async function renderAgendaTab() {
  const contentArea = document.getElementById('main-content');
  const todayIso = new Date().toISOString().split('T')[0];
  const todayLabel = new Date(todayIso + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });

  const DEFAULT_DOCTOR_COLORS = [
    { bg: 'rgba(139,92,246,0.12)', border: '#8b5cf6', text: '#c4b5fd' },
    { bg: 'rgba(236,72,153,0.12)', border: '#ec4899', text: '#f472b6' },
    { bg: 'rgba(34,211,238,0.12)', border: '#22d3ee', text: '#67e8f9' },
    { bg: 'rgba(251,146,60,0.12)', border: '#fb923c', text: '#fdba74' },
    { bg: 'rgba(16,185,129,0.12)', border: '#10b981', text: '#6ee7b7' }
  ];

  const getDoctorStyle = (docName) => {
    let hash = 0;
    for (let i = 0; i < (docName || '').length; i++) hash = docName.charCodeAt(i) + ((hash << 5) - hash);
    const colorIdx = Math.abs(hash) % DEFAULT_DOCTOR_COLORS.length;
    const base = DEFAULT_DOCTOR_COLORS[colorIdx];
    const initials = (docName || '?').replace(/^(Dr\.|Dra\.)\s*/i, '').split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() || 'MD';
    return { ...base, initials };
  };

  const STATUS_CFG = {
    'Agendado':       { color: '#818cf8', bg: 'rgba(99,102,241,0.12)', border: 'rgba(99,102,241,0.25)', icon: 'fa-clock' },
    'Confirmado':     { color: '#34d399', bg: 'rgba(16,185,129,0.12)', border: 'rgba(16,185,129,0.25)', icon: 'fa-circle-check' },
    'Em Atendimento': { color: '#fbbf24', bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.25)', icon: 'fa-stethoscope' },
    'Concluído':      { color: '#94a3b8', bg: 'rgba(148,163,184,0.12)', border: 'rgba(148,163,184,0.2)', icon: 'fa-check-double' },
    'Cancelado':      { color: '#f87171', bg: 'rgba(239,68,68,0.12)', border: 'rgba(239,68,68,0.2)', icon: 'fa-ban' },
  };

  contentArea.innerHTML = \`
    <div class="tab-pane active" style="padding: 28px 36px; width: 100%; max-width: 100%; box-sizing: border-box;">
      
      <!-- CABEÇALHO PRINCIPAL DA AGENDA -->
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; flex-wrap: wrap; gap: 16px;">
        <div>
          <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 4px;">
            <div style="width: 42px; height: 42px; border-radius: 12px; background: rgba(99,102,241,0.15); border: 1px solid rgba(99,102,241,0.3); display: flex; align-items: center; justify-content: center; color: var(--color-primary);">
              <i class="fa-solid fa-calendar-days" style="font-size: 1.2rem;"></i>
            </div>
            <div>
              <h2 style="font-size: 1.5rem; font-weight: 700; color: var(--text-primary); margin: 0; line-height: 1.2;">Agenda Médica</h2>
              <span style="color: var(--text-muted); font-size: 0.85rem; text-transform: capitalize;">\${todayLabel}</span>
            </div>
          </div>
        </div>

        <div style="display: flex; align-items: center; gap: 12px;">
          <button id="btn-open-new-appointment" class="btn btn-primary" style="display: inline-flex; align-items: center; gap: 8px; padding: 10px 22px; font-size: 0.88rem; font-weight: 600; border-radius: 10px; box-shadow: 0 4px 14px rgba(99,102,241,0.3); cursor: pointer; transition: transform 0.15s, box-shadow 0.15s;">
            <i class="fa-solid fa-plus"></i> Nova Consulta
          </button>
        </div>
      </div>

      <!-- CARDS DE KPIS -->
      <div id="agenda-stats" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; margin-bottom: 24px;"></div>

      <!-- BARRA DE CONTROLE -->
      <div style="display: flex; gap: 12px; flex-wrap: wrap; align-items: center; justify-content: space-between; background: var(--bg-secondary); border: 1px solid var(--border-color); border-radius: 14px; padding: 14px 20px; margin-bottom: 24px; backdrop-filter: var(--glass-blur);">
        <div style="display: flex; gap: 12px; flex-wrap: wrap; align-items: center; flex: 1; min-width: 280px;">
          <!-- Busca -->
          <div style="position: relative; flex: 1; min-width: 220px;">
            <i class="fa-solid fa-magnifying-glass" style="position: absolute; left: 14px; top: 50%; transform: translateY(-50%); color: var(--text-muted); font-size: 0.85rem;"></i>
            <input type="text" id="filter-agenda-search" placeholder="Buscar paciente ou notas..." style="width: 100%; background: var(--bg-tertiary); border: 1px solid var(--border-color); border-radius: 8px; padding: 9px 14px 9px 38px; color: var(--text-primary); font-size: 0.85rem; outline: none;">
          </div>
          <!-- Data -->
          <div style="display: flex; align-items: center; gap: 8px; background: var(--bg-tertiary); border: 1px solid var(--border-color); border-radius: 8px; padding: 8px 14px;">
            <i class="fa-solid fa-calendar" style="color: var(--text-muted); font-size: 0.82rem;"></i>
            <input type="date" id="filter-agenda-date" style="background: transparent; border: none; color: var(--text-primary); font-size: 0.85rem; outline: none; cursor: pointer;" value="\${todayIso}">
          </div>
          <!-- Médico (Dinâmico) -->
          <div style="display: flex; align-items: center; gap: 8px; background: var(--bg-tertiary); border: 1px solid var(--border-color); border-radius: 8px; padding: 8px 14px; min-width: 200px;">
            <i class="fa-solid fa-user-doctor" style="color: var(--text-muted); font-size: 0.82rem;"></i>
            <select id="filter-agenda-doctor" style="background: transparent; border: none; color: var(--text-primary); font-size: 0.85rem; outline: none; cursor: pointer; flex: 1; -webkit-appearance: none;">
              <option value="">Todos os Médicos</option>
            </select>
          </div>
        </div>

        <!-- Status Filter Tabs -->
        <div style="display: flex; gap: 4px; background: var(--bg-tertiary); border: 1px solid var(--border-color); border-radius: 8px; padding: 4px;">
          <button class="agenda-status-tab active" data-status="all" style="padding: 6px 14px; font-size: 0.78rem; font-weight: 600; border-radius: 6px; border: none; background: var(--bg-secondary); color: var(--text-primary); cursor: pointer; transition: all 0.15s;">Todos</button>
          <button class="agenda-status-tab" data-status="Confirmado" style="padding: 6px 14px; font-size: 0.78rem; font-weight: 600; border-radius: 6px; border: none; background: transparent; color: var(--text-muted); cursor: pointer; transition: all 0.15s;">Confirmados</button>
          <button class="agenda-status-tab" data-status="Em Atendimento" style="padding: 6px 14px; font-size: 0.78rem; font-weight: 600; border-radius: 6px; border: none; background: transparent; color: var(--text-muted); cursor: pointer; transition: all 0.15s;">Em Atendimento</button>
        </div>
      </div>

      <!-- LISTA DE CONSULTAS -->
      <div id="agenda-list-container">
        <div style="text-align: center; padding: 60px 20px; color: var(--text-muted);">
          <i class="fa-solid fa-spinner fa-spin" style="font-size: 1.6rem; color: var(--color-primary); margin-bottom: 12px; display: block;"></i>
          <span style="font-size: 0.9rem;">Carregando consultas...</span>
        </div>
      </div>
    </div>

    <!-- MODAL NOVA CONSULTA -->
    <div id="modal-appointment" class="modal-overlay" style="display: none;">
      <div class="modal-content" style="max-width: 480px; width: 100%;">
        <div class="modal-header">
          <h3><i class="fa-solid fa-calendar-plus" style="color: var(--color-primary);"></i> Nova Consulta</h3>
          <button class="btn-close" id="btn-close-appointment-modal"><i class="fa-solid fa-xmark"></i></button>
        </div>
        <form id="form-new-appointment" class="modal-body">
          <div class="form-group">
            <label for="apt-patient-id">Paciente *</label>
            <select id="apt-patient-id" class="form-input" required>
              <option value="">Selecione o paciente...</option>
            </select>
          </div>
          <div class="form-group">
            <label for="apt-doctor">Médico Responsável *</label>
            <select id="apt-doctor" class="form-input" required>
              <option value="">Selecione o médico...</option>
            </select>
          </div>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
            <div class="form-group">
              <label for="apt-date">Data *</label>
              <input type="date" id="apt-date" class="form-input" value="\${todayIso}" required>
            </div>
            <div class="form-group">
              <label for="apt-time">Horário *</label>
              <input type="time" id="apt-time" class="form-input" value="09:00" required>
            </div>
          </div>
          <div class="form-group">
            <label for="apt-notes">Observações</label>
            <textarea id="apt-notes" class="form-input" placeholder="Motivo da consulta, sintomas..." rows="2"></textarea>
          </div>
          <div class="modal-footer" style="padding-top: 16px;">
            <button type="button" class="btn btn-secondary" id="btn-cancel-appointment-modal">Cancelar</button>
            <button type="submit" class="btn btn-primary">Agendar</button>
          </div>
        </form>
      </div>
    </div>
  \`;

  let currentStatusFilter = 'all';
  let currentSearchQuery = '';
  let allAppointmentsCache = [];
  let doctorsMap = {};

  const loadPatients = async () => {
    try {
      const pList = await cachedApiGet('/api/patients', 'patients');
      const patients = Array.isArray(pList) ? pList : (pList.data || []);
      const pSelect = document.getElementById('apt-patient-id');
      if (pSelect) {
        pSelect.innerHTML = '<option value="">Selecione o paciente...</option>';
        patients.forEach(p => {
          const opt = document.createElement('option');
          opt.value = p.id;
          opt.textContent = p.fullName + ' (CPF: ' + (p.cpf || 'N/A') + ')';
          opt.dataset.name = p.fullName;
          pSelect.appendChild(opt);
        });
      }
    } catch (e) {}
  };

  const loadDoctorsList = async () => {
    try {
      const docList = await cachedApiGet('/api/doctors', 'doctors');
      const doctors = Array.isArray(docList) ? docList.filter(d => (d.status || 'Ativo') === 'Ativo') : [];
      
      const filterSelect = document.getElementById('filter-agenda-doctor');
      const modalSelect = document.getElementById('apt-doctor');
      
      doctorsMap = {};
      doctors.forEach(d => { doctorsMap[d.name] = d; });

      if (filterSelect) {
        const curVal = filterSelect.value;
        filterSelect.innerHTML = '<option value="">Todos os Médicos</option>';
        doctors.forEach(d => {
          const opt = document.createElement('option');
          opt.value = d.name;
          opt.textContent = d.name + ' (' + d.specialty + ')';
          filterSelect.appendChild(opt);
        });
        filterSelect.value = curVal;
      }
      
      if (modalSelect) {
        modalSelect.innerHTML = '<option value="">Selecione o médico...</option>';
        doctors.forEach(d => {
          const opt = document.createElement('option');
          opt.value = d.name;
          opt.textContent = d.name + ' — ' + d.specialty;
          opt.dataset.specialty = d.specialty;
          modalSelect.appendChild(opt);
        });
      }
    } catch (e) {}
  };

  const renderAgendaCards = (appointments) => {
    const container = document.getElementById('agenda-list-container');
    const statsEl = document.getElementById('agenda-stats');

    let filtered = appointments || [];
    if (currentStatusFilter !== 'all') {
      filtered = filtered.filter(a => a.status === currentStatusFilter);
    }
    if (currentSearchQuery.trim()) {
      const q = currentSearchQuery.toLowerCase();
      filtered = filtered.filter(a => 
        (a.patientName || '').toLowerCase().includes(q) ||
        (a.doctorName || '').toLowerCase().includes(q) ||
        (a.notes || '').toLowerCase().includes(q)
      );
    }

    const total = appointments.length;
    const confirmados = appointments.filter(a => a.status === 'Confirmado').length;
    const emAtendimento = appointments.filter(a => a.status === 'Em Atendimento').length;
    const concluidos = appointments.filter(a => a.status === 'Concluído').length;

    if (statsEl) {
      statsEl.innerHTML = \`
        <div class="interactive-card" id="kpi-agenda-all" title="Clique para exibir todas as consultas" style="background: var(--bg-secondary); border: 1px solid var(--border-color); border-radius: 12px; padding: 16px 20px; display: flex; align-items: center; gap: 16px;">
          <div style="width: 44px; height: 44px; border-radius: 12px; background: rgba(99,102,241,0.12); border: 1px solid rgba(99,102,241,0.25); display: flex; align-items: center; justify-content: center; color: #818cf8;">
            <i class="fa-solid fa-list-check" style="font-size: 1.2rem;"></i>
          </div>
          <div>
            <div style="font-size: 0.75rem; color: var(--text-muted); font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em;">Total de Consultas</div>
            <div style="font-size: 1.4rem; font-weight: 800; color: var(--text-primary);">\${total}</div>
          </div>
        </div>

        <div class="interactive-card" id="kpi-agenda-confirmed" title="Clique para filtrar apenas Confirmados" style="background: var(--bg-secondary); border: 1px solid var(--border-color); border-radius: 12px; padding: 16px 20px; display: flex; align-items: center; gap: 16px;">
          <div style="width: 44px; height: 44px; border-radius: 12px; background: rgba(16,185,129,0.12); border: 1px solid rgba(16,185,129,0.25); display: flex; align-items: center; justify-content: center; color: #34d399;">
            <i class="fa-solid fa-circle-check" style="font-size: 1.2rem;"></i>
          </div>
          <div>
            <div style="font-size: 0.75rem; color: var(--text-muted); font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em;">Confirmados</div>
            <div style="font-size: 1.4rem; font-weight: 800; color: #34d399;">\${confirmados}</div>
          </div>
        </div>

        <div class="interactive-card" id="kpi-agenda-progress" title="Clique para filtrar apenas Em Atendimento" style="background: var(--bg-secondary); border: 1px solid var(--border-color); border-radius: 12px; padding: 16px 20px; display: flex; align-items: center; gap: 16px;">
          <div style="width: 44px; height: 44px; border-radius: 12px; background: rgba(245,158,11,0.12); border: 1px solid rgba(245,158,11,0.25); display: flex; align-items: center; justify-content: center; color: #fbbf24;">
            <i class="fa-solid fa-stethoscope" style="font-size: 1.2rem;"></i>
          </div>
          <div>
            <div style="font-size: 0.75rem; color: var(--text-muted); font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em;">Em Atendimento</div>
            <div style="font-size: 1.4rem; font-weight: 800; color: #fbbf24;">\${emAtendimento}</div>
          </div>
        </div>

        <div class="interactive-card" id="kpi-agenda-completed" title="Clique para filtrar apenas Concluídos" style="background: var(--bg-secondary); border: 1px solid var(--border-color); border-radius: 12px; padding: 16px 20px; display: flex; align-items: center; gap: 16px;">
          <div style="width: 44px; height: 44px; border-radius: 12px; background: rgba(148,163,184,0.12); border: 1px solid rgba(148,163,184,0.2); display: flex; align-items: center; justify-content: center; color: #94a3b8;">
            <i class="fa-solid fa-check-double" style="font-size: 1.2rem;"></i>
          </div>
          <div>
            <div style="font-size: 0.75rem; color: var(--text-muted); font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em;">Concluídos</div>
            <div style="font-size: 1.4rem; font-weight: 800; color: #94a3b8;">\${concluidos}</div>
          </div>
        </div>
      \`;
    }

    if (filtered.length === 0) {
      const selDate = document.getElementById('filter-agenda-date')?.value || '';
      const dlabel = selDate ? new Date(selDate + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' }) : 'esta data';
      container.innerHTML = \`
        <div style="text-align: center; padding: 72px 20px; background: var(--bg-secondary); border: 1px solid var(--border-color); border-radius: 14px;">
          <i class="fa-regular fa-calendar-xmark" style="font-size: 3rem; color: var(--text-muted); opacity: 0.4; margin-bottom: 16px; display: block;"></i>
          <p style="font-size: 1.05rem; font-weight: 600; color: var(--text-secondary); margin-bottom: 6px;">Nenhuma consulta encontrada</p>
          <p style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 24px;">Não há agendamentos para \${dlabel} com os filtros selecionados.</p>
          <button class="btn btn-primary" onclick="document.getElementById('btn-open-new-appointment').click()" style="font-size: 0.85rem; padding: 9px 18px;">
            <i class="fa-solid fa-plus"></i> Agendar Nova Consulta
          </button>
        </div>
      \`;
      return;
    }

    const manha = filtered.filter(a => parseInt(a.appointmentTime) < 12);
    const tarde  = filtered.filter(a => parseInt(a.appointmentTime) >= 12);

    const renderCard = (apt) => {
      const docData = doctorsMap[apt.doctorName] || {};
      const dc = getDoctorStyle(apt.doctorName);
      const specialty = apt.specialty || docData.specialty || 'Clínica Geral';
      const sc = STATUS_CFG[apt.status] || STATUS_CFG['Agendado'];
      const isDone = apt.status === 'Concluído' || apt.status === 'Cancelado';
      const canAct = apt.status === 'Agendado' || apt.status === 'Confirmado';
      
      const notesHtml = apt.notes ? \`
        <div style="display: flex; align-items: center; gap: 6px; font-size: 0.8rem; color: var(--text-muted); margin-top: 4px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
          <i class="fa-regular fa-note-sticky" style="font-size: 0.75rem; opacity: 0.7;"></i>
          <span title="\${apt.notes.replace(/"/g, '&quot;')}">\${apt.notes}</span>
        </div>
      \` : '';

      const confirmBtn = apt.status === 'Agendado' ? \`
        <button onclick="updateAppointmentStatus('\${apt.id}', 'Confirmado')" title="Confirmar Agendamento" style="display: inline-flex; align-items: center; justify-content: center; width: 36px; height: 36px; border-radius: 8px; border: 1px solid rgba(16,185,129,0.3); background: rgba(16,185,129,0.08); color: #34d399; cursor: pointer; transition: all 0.15s;" onmouseenter="this.style.background='rgba(16,185,129,0.2)'" onmouseleave="this.style.background='rgba(16,185,129,0.08)'">
          <i class="fa-solid fa-check" style="font-size: 0.85rem;"></i>
        </button>
      \` : '';

      const atenderBtn = \`
        <button onclick="startAppointmentEncounter('\${apt.patientId}', '\${apt.id}')" style="display: inline-flex; align-items: center; gap: 6px; padding: 8px 18px; border-radius: 8px; border: none; background: var(--color-primary); color: #fff; font-size: 0.84rem; font-weight: 600; cursor: pointer; transition: all 0.15s; box-shadow: 0 2px 8px rgba(99,102,241,0.25);" onmouseenter="this.style.transform='translateY(-1px)'" onmouseleave="this.style.transform='none'">
          <i class="fa-solid fa-stethoscope"></i> Atender
        </button>
      \`;

      const cancelBtn = \`
        <button onclick="updateAppointmentStatus('\${apt.id}', 'Cancelado')" title="Cancelar Consulta" style="display: inline-flex; align-items: center; justify-content: center; width: 36px; height: 36px; border-radius: 8px; border: 1px solid rgba(239,68,68,0.3); background: rgba(239,68,68,0.08); color: #f87171; cursor: pointer; transition: all 0.15s;" onmouseenter="this.style.background='rgba(239,68,68,0.2)'" onmouseleave="this.style.background='rgba(239,68,68,0.08)'">
          <i class="fa-solid fa-xmark" style="font-size: 0.85rem;"></i>
        </button>
      \`;

      return \`
        <div style="display: grid; grid-template-columns: 90px 1fr auto; align-items: center; gap: 20px; background: var(--bg-secondary); border: 1px solid var(--border-color); border-left: 4px solid \${sc.color}; border-radius: 12px; padding: 16px 22px; transition: all 0.2s ease; opacity: \${isDone ? '0.6' : '1'};" onmouseenter="this.style.background='var(--bg-tertiary)';this.style.borderColor='rgba(255,255,255,0.15)'" onmouseleave="this.style.background='var(--bg-secondary)';this.style.borderColor='var(--border-color)'">
          
          <!-- HORA DA CONSULTA -->
          <div style="text-align: center; border-right: 1px solid var(--border-color); padding-right: 16px;">
            <div style="font-size: 1.2rem; font-weight: 800; color: var(--text-primary); letter-spacing: -0.5px;">\${apt.appointmentTime}</div>
            <div style="font-size: 0.7rem; color: var(--text-muted); font-weight: 600; text-transform: uppercase;">Horário</div>
          </div>

          <!-- DETALHES DO PACIENTE E MÉDICO -->
          <div style="min-width: 0;">
            <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 6px; flex-wrap: wrap;">
              <span style="font-weight: 700; font-size: 1rem; color: var(--text-primary);">\${apt.patientName}</span>
              <span style="display: inline-flex; align-items: center; gap: 5px; font-size: 0.75rem; font-weight: 600; padding: 3px 10px; border-radius: 20px; background: \${sc.bg}; color: \${sc.color}; border: 1px solid \${sc.border};">
                <i class="fa-solid \${sc.icon}" style="font-size: 0.7rem;"></i>\${apt.status}
              </span>
            </div>
            
            <div style="display: flex; align-items: center; gap: 12px; flex-wrap: wrap;">
              <!-- Médico Chip -->
              <div style="display: inline-flex; align-items: center; gap: 7px; background: \${dc.bg}; border: 1px solid \${dc.border}; border-radius: 20px; padding: 3px 12px 3px 6px;">
                <div style="width: 20px; height: 20px; border-radius: 50%; background: \${dc.border}; display: flex; align-items: center; justify-content: center; font-size: 0.6rem; font-weight: 800; color: #fff;">\${dc.initials}</div>
                <span style="font-size: 0.82rem; color: \${dc.text}; font-weight: 600;">\${apt.doctorName}</span>
                <span style="font-size: 0.74rem; color: \${dc.text}; opacity: 0.8;">· \${specialty}</span>
              </div>
            </div>
            \${notesHtml}
          </div>

          <!-- AÇÕES DA CONSULTA -->
          <div style="display: flex; align-items: center; gap: 8px; flex-shrink: 0;">
            \${canAct ? confirmBtn + atenderBtn + cancelBtn : ''}
          </div>
        </div>
      \`;
    };

    const renderGroup = (list, label, icon) => {
      if (list.length === 0) return '';
      return \`
        <div style="margin-bottom: 32px;">
          <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 14px;">
            <i class="fa-solid \${icon}" style="color: var(--color-primary); font-size: 0.85rem;"></i>
            <span style="font-size: 0.82rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: var(--text-secondary);">\${label}</span>
            <div style="flex: 1; height: 1px; background: var(--border-color); opacity: 0.6;"></div>
            <span style="font-size: 0.78rem; color: var(--text-muted); font-weight: 600;">\${list.length} consulta\${list.length > 1 ? 's' : ''}</span>
          </div>
          <div style="display: flex; flex-direction: column; gap: 12px;">
            \${list.map(renderCard).join('')}
          </div>
        </div>
      \`;
    };

    container.innerHTML = renderGroup(manha, 'Manhã', 'fa-sun') + renderGroup(tarde, 'Tarde', 'fa-cloud-sun');
  };

  const loadAgenda = async () => {
    const selectedDate = document.getElementById('filter-agenda-date').value;
    const selectedDoctor = document.getElementById('filter-agenda-doctor').value;
    const container = document.getElementById('agenda-list-container');
    container.innerHTML = '<div style="text-align: center; padding: 48px; color: var(--text-muted);"><i class="fa-solid fa-spinner fa-spin" style="font-size: 1.6rem; color: var(--color-primary);"></i></div>';
    try {
      let url = '/api/appointments?date=' + selectedDate;
      if (selectedDoctor) url += '&doctor=' + encodeURIComponent(selectedDoctor);
      const cacheKey = 'appointments_' + selectedDate + '_' + selectedDoctor;
      const appointments = await cachedApiGet(url, cacheKey);
      allAppointmentsCache = Array.isArray(appointments) ? appointments : [];
      renderAgendaCards(allAppointmentsCache);
    } catch (e) {
      console.error('[Agenda] Erro:', e);
      container.innerHTML = '<div style="text-align: center; padding: 40px; color: var(--color-danger);"><i class="fa-solid fa-triangle-exclamation"></i> ' + (e.message || 'Erro ao carregar agenda.') + '</div>';
    }
  };

  document.getElementById('filter-agenda-date').addEventListener('change', () => {
    for (const key of dataCache.keys()) {
      if (typeof key === 'string' && key.startsWith('appointments_')) { dataCache.delete(key); dataCacheTimestamps.delete(key); }
    }
    loadAgenda();
  });

  document.getElementById('filter-agenda-doctor').addEventListener('change', loadAgenda);

  document.getElementById('filter-agenda-search').addEventListener('input', (e) => {
    currentSearchQuery = e.target.value;
    renderAgendaCards(allAppointmentsCache);
  });

  document.querySelectorAll('.agenda-status-tab').forEach(tab => {
    tab.addEventListener('click', (e) => {
      document.querySelectorAll('.agenda-status-tab').forEach(t => {
        t.classList.remove('active');
        t.style.background = 'transparent';
        t.style.color = 'var(--text-muted)';
      });
      const target = e.currentTarget;
      target.classList.add('active');
      target.style.background = 'var(--bg-secondary)';
      target.style.color = 'var(--text-primary)';
      currentStatusFilter = target.dataset.status;
      renderAgendaCards(allAppointmentsCache);
    });
  });

  const modal = document.getElementById('modal-appointment');
  document.getElementById('btn-open-new-appointment').addEventListener('click', () => { modal.style.display = 'flex'; });
  document.getElementById('btn-close-appointment-modal').addEventListener('click', () => { modal.style.display = 'none'; });
  document.getElementById('btn-cancel-appointment-modal').addEventListener('click', () => { modal.style.display = 'none'; });

  document.getElementById('form-new-appointment').addEventListener('submit', async (e) => {
    e.preventDefault();
    const pSelect = document.getElementById('apt-patient-id');
    const selectedOption = pSelect.options[pSelect.selectedIndex];
    const patientId = pSelect.value;
    const patientName = selectedOption ? selectedOption.dataset.name : '';

    const dSelect = document.getElementById('apt-doctor');
    const selectedDocOption = dSelect.options[dSelect.selectedIndex];
    const doctorName = dSelect.value;
    const specialty = selectedDocOption ? (selectedDocOption.dataset.specialty || 'Clínica Geral') : 'Clínica Geral';

    const appointmentDate = document.getElementById('apt-date').value;
    const appointmentTime = document.getElementById('apt-time').value;
    const notes = document.getElementById('apt-notes').value;
    try {
      const res = await apiFetch('/api/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ patientId, patientName, doctorName, specialty, appointmentDate, appointmentTime, notes })
      });
      if (res.ok) {
        showToast('Consulta agendada com sucesso!');
        modal.style.display = 'none';
        requestSyncPromptIfConfigured();
        for (const key of dataCache.keys()) {
          if (typeof key === 'string' && key.startsWith('appointments_')) { dataCache.delete(key); dataCacheTimestamps.delete(key); }
        }
        loadAgenda();
      } else {
        const d = await res.json();
        alert(d.message || 'Erro ao agendar consulta.');
      }
    } catch (err) { alert('Erro de conexão ao agendar consulta.'); }
  });

  window.reloadAgenda = loadAgenda;
  loadAgenda();
  loadPatients();
  loadDoctorsList();
}
`;

const newContent = before + newFunc + after;
writeFileSync(filePath, newContent, 'utf8');
console.log('✅ renderAgendaTab atualizada para buscar médicos dinamicamente!');
