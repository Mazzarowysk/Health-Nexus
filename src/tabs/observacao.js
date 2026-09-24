// ─── MÓDULO DA ABA SALA DE OBSERVAÇÃO CLÍNICA (HEALTH NEXUS v2.8.2) ──────────────
import { state } from '../state.js';
import { apiFetch, removeAccents } from '../modules/api.js';
import { showToast, showCustomAlert, showCustomConfirm } from '../modules/ui.js';
import { getRolePermissions } from '../modules/auth.js';
import { setActivePatientContext } from '../modules/journey.js';
import * as localDB from '../localDB.js';

let obsTimers = [];

export function renderObservacaoTab(contentArea) {
  contentArea.innerHTML = `
    <div class="tab-section active" id="observacao-root" style="padding: 4px;">
      <!-- Cabeçalho do Módulo -->
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px; flex-wrap:wrap; gap:14px;">
        <div>
          <h2 style="font-family:'Outfit'; font-weight:700; font-size:1.45rem; margin:0; color:var(--text-primary); display:flex; align-items:center; gap:10px;">
            <i class="fa-solid fa-bed-pulse" style="color:#f59e0b;"></i> Sala de Observação do Pronto-Socorro
          </h2>
          <p style="margin:4px 0 0; font-size:0.84rem; color:var(--text-muted);">
            Controle de permanência, hidratação, medicação rápida e reavaliação clínica contínua (Resolução CFM nº 2.079/14).
          </p>
        </div>
        <div style="display:flex; gap:10px; align-items:center; flex-wrap:wrap;">
          <button id="btn-obs-goto-attendance" class="btn" style="background:rgba(2,132,199,0.12); border:1px solid rgba(2,132,199,0.3); color:#38bdf8; font-size:0.84rem; padding:8px 14px; border-radius:8px; font-weight:600; cursor:pointer;">
            <i class="fa-solid fa-hospital-user"></i> Central de Atendimentos (Kanban)
          </button>
          <button id="btn-obs-goto-beds" class="btn" style="background:rgba(99,102,241,0.12); border:1px solid rgba(99,102,241,0.3); color:#818cf8; font-size:0.84rem; padding:8px 14px; border-radius:8px; font-weight:600; cursor:pointer;">
            <i class="fa-solid fa-bed"></i> Mapa Geral de Leitos
          </button>
          <button id="btn-refresh-obs" class="btn btn-primary" style="font-size:0.84rem; padding:8px 14px; border-radius:8px;">
            <i class="fa-solid fa-rotate"></i> Atualizar
          </button>
        </div>
      </div>

      <!-- Barra de Métricas / KPIs em Tempo Real -->
      <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(200px, 1fr)); gap:14px; margin-bottom:20px;">
        <div class="card obs-metric-filter active" data-filter="all" style="padding:16px 20px; background:var(--bg-secondary); border-radius:12px; border:1px solid var(--border-color); border-top:4px solid #38bdf8; cursor:pointer; transition:transform 0.2s;">
          <div style="color:var(--text-muted); font-size:0.8rem; font-weight:600;">Total em Observação</div>
          <div style="display:flex; justify-content:space-between; align-items:baseline; margin-top:4px;">
            <span id="obs-kpi-total" style="font-size:1.8rem; font-weight:800; color:var(--text-primary);">0</span>
            <span style="font-size:0.75rem; color:#38bdf8; font-weight:600;"><i class="fa-solid fa-users"></i> No PS</span>
          </div>
        </div>

        <div class="card obs-metric-filter" data-filter="safe" style="padding:16px 20px; background:var(--bg-secondary); border-radius:12px; border:1px solid var(--border-color); border-top:4px solid #10b981; cursor:pointer; transition:transform 0.2s;">
          <div style="color:var(--text-muted); font-size:0.8rem; font-weight:600;">Estáveis (&lt; 6h)</div>
          <div style="display:flex; justify-content:space-between; align-items:baseline; margin-top:4px;">
            <span id="obs-kpi-safe" style="font-size:1.8rem; font-weight:800; color:#10b981;">0</span>
            <span style="font-size:0.75rem; color:#10b981; font-weight:600;"><i class="fa-solid fa-circle-check"></i> Seguro</span>
          </div>
        </div>

        <div class="card obs-metric-filter" data-filter="warning" style="padding:16px 20px; background:var(--bg-secondary); border-radius:12px; border:1px solid var(--border-color); border-top:4px solid #f59e0b; cursor:pointer; transition:transform 0.2s;">
          <div style="color:var(--text-muted); font-size:0.8rem; font-weight:600;">Reavaliação (6h a 12h)</div>
          <div style="display:flex; justify-content:space-between; align-items:baseline; margin-top:4px;">
            <span id="obs-kpi-warning" style="font-size:1.8rem; font-weight:800; color:#fbbf24;">0</span>
            <span style="font-size:0.75rem; color:#fbbf24; font-weight:600;"><i class="fa-solid fa-clock"></i> Reavaliar</span>
          </div>
        </div>

        <div class="card obs-metric-filter" data-filter="critical" style="padding:16px 20px; background:var(--bg-secondary); border-radius:12px; border:1px solid var(--border-color); border-top:4px solid #ef4444; cursor:pointer; transition:transform 0.2s;">
          <div style="color:var(--text-muted); font-size:0.8rem; font-weight:600;">Crítico (&gt; 12h Excedido)</div>
          <div style="display:flex; justify-content:space-between; align-items:baseline; margin-top:4px;">
            <span id="obs-kpi-critical" style="font-size:1.8rem; font-weight:800; color:#f87171;">0</span>
            <span style="font-size:0.72rem; color:#f87171; font-weight:700;"><i class="fa-solid fa-triangle-exclamation"></i> Limite CFM</span>
          </div>
        </div>
      </div>

      <!-- Barra de Filtros e Busca Rápida -->
      <div style="background:var(--bg-secondary); border:1px solid var(--border-color); border-radius:12px; padding:14px 18px; margin-bottom:20px; display:flex; justify-content:space-between; align-items:center; gap:16px; flex-wrap:wrap;">
        <div style="position:relative; flex:1; min-width:260px;">
          <i class="fa-solid fa-magnifying-glass" style="position:absolute; left:14px; top:50%; transform:translateY(-50%); color:var(--text-muted); font-size:0.85rem;"></i>
          <input type="text" id="obs-search-input" placeholder="Buscar por paciente, queixa ou leito..." style="width:100%; background:var(--bg-tertiary); border:1px solid var(--border-color); color:var(--text-primary); padding:9px 16px 9px 38px; border-radius:8px; font-size:0.85rem; outline:none;">
        </div>
        <div style="display:flex; gap:8px; align-items:center; flex-wrap:wrap;">
          <span style="font-size:0.8rem; color:var(--text-muted); font-weight:600;">Filtrar Risco:</span>
          <button class="btn btn-sm obs-risk-filter active" data-color="all" style="font-size:0.78rem; padding:4px 10px; border-radius:6px; background:var(--bg-tertiary); border:1px solid var(--border-color); color:var(--text-primary); cursor:pointer;">Todos</button>
          <button class="btn btn-sm obs-risk-filter" data-color="Vermelho" style="font-size:0.78rem; padding:4px 10px; border-radius:6px; background:rgba(239,68,68,0.15); border:1px solid rgba(239,68,68,0.3); color:#f87171; cursor:pointer;">Vermelho</button>
          <button class="btn btn-sm obs-risk-filter" data-color="Laranja" style="font-size:0.78rem; padding:4px 10px; border-radius:6px; background:rgba(245,158,11,0.15); border:1px solid rgba(245,158,11,0.3); color:#fbbf24; cursor:pointer;">Laranja</button>
          <button class="btn btn-sm obs-risk-filter" data-color="Amarelo" style="font-size:0.78rem; padding:4px 10px; border-radius:6px; background:rgba(234,179,8,0.15); border:1px solid rgba(234,179,8,0.3); color:#fde047; cursor:pointer;">Amarelo</button>
          <button class="btn btn-sm obs-risk-filter" data-color="Verde" style="font-size:0.78rem; padding:4px 10px; border-radius:6px; background:rgba(16,185,129,0.15); border:1px solid rgba(16,185,129,0.3); color:#86efac; cursor:pointer;">Verde</button>
        </div>
      </div>

      <!-- Container dos Pacientes em Observação (Grid de Leitos / Poltronas) -->
      <div id="obs-grid-container" style="display:grid; grid-template-columns:repeat(auto-fill, minmax(360px, 1fr)); gap:16px;">
        <div style="grid-column: 1 / -1; text-align:center; padding:50px 20px; color:var(--text-muted);">
          <i class="fa-solid fa-circle-notch fa-spin" style="font-size:2rem; color:var(--color-primary); margin-bottom:12px; display:block;"></i>
          Carregando pacientes da Sala de Observação...
        </div>
      </div>
    </div>
  `;

  // Navegação rápida
  document.getElementById('btn-obs-goto-attendance')?.addEventListener('click', () => {
    if (typeof window.switchTab === 'function') window.switchTab('atendimento');
  });
  document.getElementById('btn-obs-goto-beds')?.addEventListener('click', () => {
    if (typeof window.switchTab === 'function') window.switchTab('leitos');
  });
  document.getElementById('btn-refresh-obs')?.addEventListener('click', () => {
    loadObservacaoData();
  });

  let allObsPatients = [];
  let currentFilter = 'all';
  let currentRisk = 'all';

  const getMCInfo = (color) => {
    const map = {
      'Vermelho': { bg: 'rgba(239,68,68,0.2)', border: '#ef4444', text: '#fca5a5', label: 'Emergência' },
      'Laranja':  { bg: 'rgba(249,115,22,0.2)', border: '#f97316', text: '#fdba74', label: 'Muito Urgente' },
      'Amarelo':  { bg: 'rgba(234,179,8,0.2)', border: '#eab308', text: '#fde047', label: 'Urgente' },
      'Verde':    { bg: 'rgba(16,185,129,0.2)', border: '#10b981', text: '#86efac', label: 'Pouco Urgente' },
      'Azul':     { bg: 'rgba(59,130,246,0.2)', border: '#3b82f6', text: '#93c5fd', label: 'Não Urgente' }
    };
    return map[color] || { bg: 'rgba(148,163,184,0.15)', border: '#94a3b8', text: '#cbd5e1', label: color || 'Classificado' };
  };

  const renderCards = () => {
    const container = document.getElementById('obs-grid-container');
    if (!container) return;

    obsTimers.forEach(t => clearInterval(t));
    obsTimers = [];

    const query = removeAccents(document.getElementById('obs-search-input')?.value?.trim().toLowerCase() || '');

    const filtered = allObsPatients.filter(p => {
      // Filtro de texto
      if (query) {
        const matchName = removeAccents(p.patientName || '').includes(query);
        const matchComplaints = removeAccents(p.complaints || '').includes(query);
        const matchRoom = removeAccents(p.room || '').includes(query);
        if (!matchName && !matchComplaints && !matchRoom) return false;
      }

      // Filtro de Risco
      if (currentRisk !== 'all' && (p.manchesterColor || '').toLowerCase() !== currentRisk.toLowerCase()) {
        return false;
      }

      // Filtro de Tempo
      const obsStart = new Date(p.observation_started_at || p.admitted_at || p.created_at).getTime();
      const hoursIn = (Date.now() - obsStart) / (1000 * 60 * 60);

      if (currentFilter === 'safe' && hoursIn >= 6) return false;
      if (currentFilter === 'warning' && (hoursIn < 6 || hoursIn >= 12)) return false;
      if (currentFilter === 'critical' && hoursIn < 12) return false;

      return true;
    });

    if (filtered.length === 0) {
      container.innerHTML = `
        <div style="grid-column: 1 / -1; text-align:center; padding:60px 20px; background:var(--bg-secondary); border-radius:16px; border:1px solid var(--border-color);">
          <div style="width:64px; height:64px; border-radius:50%; background:rgba(16,185,129,0.15); border:1px solid rgba(16,185,129,0.3); display:flex; align-items:center; justify-content:center; margin:0 auto 16px; color:#10b981; font-size:1.8rem;">
            <i class="fa-solid fa-circle-check"></i>
          </div>
          <h3 style="font-family:'Outfit'; font-size:1.15rem; font-weight:700; color:var(--text-primary); margin-bottom:6px;">Nenhum paciente na Sala de Observação</h3>
          <p style="font-size:0.85rem; color:var(--text-muted); max-width:480px; margin:0 auto 20px;">
            Todos os pacientes triados foram liberados, atendidos em consultório ou encaminhados para internação hospitalar.
          </p>
          <button onclick="window.switchTab('atendimento')" class="btn btn-primary" style="font-size:0.84rem; padding:8px 18px; border-radius:8px;">
            <i class="fa-solid fa-stethoscope"></i> Ir para Central de Atendimentos
          </button>
        </div>
      `;
      return;
    }

    container.innerHTML = filtered.map(p => {
      const mc = getMCInfo(p.manchesterColor);
      const safePName = (p.patientName || '').replace(/'/g, "\\'");
      const obsStartTime = new Date(p.observation_started_at || p.admitted_at || p.created_at).getTime();
      const hoursIn = Math.max(0, (Date.now() - obsStartTime) / (1000 * 60 * 60));

      let alertStatusHtml = '';
      let cardBorderTop = '#10b981';

      if (hoursIn >= 12) {
        cardBorderTop = '#ef4444';
        alertStatusHtml = `
          <div style="background:rgba(239,68,68,0.18); border:1px solid #ef4444; color:#f87171; border-radius:8px; padding:6px 12px; font-size:0.75rem; font-weight:700; margin-bottom:12px; display:flex; align-items:center; justify-content:space-between; animation:pulse 1.8s infinite;">
            <span><i class="fa-solid fa-triangle-exclamation"></i> Limite 12h PS Excedido!</span>
            <span style="background:#ef4444; color:#fff; padding:2px 8px; border-radius:4px; font-size:0.68rem;">ALERTA CFM</span>
          </div>
        `;
      } else if (hoursIn >= 6) {
        cardBorderTop = '#f59e0b';
        alertStatusHtml = `
          <div style="background:rgba(245,158,11,0.15); border:1px solid rgba(245,158,11,0.4); color:#fbbf24; border-radius:8px; padding:6px 12px; font-size:0.75rem; font-weight:600; margin-bottom:12px; display:flex; align-items:center; justify-content:space-between;">
            <span><i class="fa-solid fa-clock"></i> Reavaliação Médica Indicada</span>
            <span style="font-size:0.7rem; color:#fde68a;">6h - 12h</span>
          </div>
        `;
      } else {
        alertStatusHtml = `
          <div style="background:rgba(16,185,129,0.12); border:1px solid rgba(16,185,129,0.3); color:#6ee7b7; border-radius:8px; padding:6px 12px; font-size:0.75rem; font-weight:600; margin-bottom:12px; display:flex; align-items:center; justify-content:space-between;">
            <span><i class="fa-solid fa-shield-halved"></i> Período Seguro de Observação</span>
            <span style="font-size:0.7rem; color:#86efac;">Até 6h</span>
          </div>
        `;
      }

      return `
        <div class="card obs-patient-card" data-enc-id="${p.id}" style="background:var(--bg-secondary); border:1px solid var(--border-color); border-top:4px solid ${cardBorderTop}; border-radius:14px; padding:18px; box-shadow:0 4px 16px rgba(0,0,0,0.15); display:flex; flex-direction:column; position:relative;">
          <!-- Cabeçalho do Card -->
          <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:10px;">
            <div>
              <div style="font-family:'Outfit'; font-weight:700; font-size:1.05rem; color:var(--text-primary); margin-bottom:2px;">
                ${p.patientName}
              </div>
              <div style="font-size:0.75rem; color:var(--text-muted);">
                <i class="fa-solid fa-bed" style="color:#818cf8; margin-right:4px;"></i> ${p.room || 'Poltrona / Leito de Observação'}
              </div>
            </div>
            <span style="background:${mc.bg}; border:1px solid ${mc.border}; color:${mc.text}; font-size:0.72rem; font-weight:800; padding:3px 10px; border-radius:12px;">
              ${mc.label}
            </span>
          </div>

          ${alertStatusHtml}

          <!-- Cronômetro de Permanência -->
          <div style="background:rgba(0,0,0,0.25); border:1px solid rgba(255,255,255,0.06); border-radius:10px; padding:10px 14px; margin-bottom:14px; display:flex; align-items:center; justify-content:space-between;">
            <div>
              <span style="font-size:0.7rem; color:var(--text-muted); text-transform:uppercase; font-weight:700; display:block;">Tempo no PS</span>
              <strong id="obs-timer-${p.id}" style="font-size:1.1rem; color:#38bdf8; font-family:monospace; font-weight:800;">00:00:00</strong>
            </div>
            <div style="text-align:right;">
              <span style="font-size:0.7rem; color:var(--text-muted); text-transform:uppercase; font-weight:700; display:block;">Início Obs.</span>
              <span style="font-size:0.8rem; color:var(--text-primary); font-weight:600;">${new Date(obsStartTime).toLocaleTimeString('pt-BR').slice(0,5)}</span>
            </div>
          </div>

          <!-- Sinais Vitais Aferidos -->
          <div style="display:grid; grid-template-columns:repeat(3, 1fr); gap:8px; margin-bottom:14px;">
            <div style="background:var(--bg-tertiary); border:1px solid var(--border-color); border-radius:8px; padding:8px; text-align:center;">
              <span style="font-size:0.68rem; color:var(--text-muted); display:block;">PA (mmHg)</span>
              <strong style="font-size:0.85rem; color:var(--text-primary); font-family:monospace;">${p.bloodPressure || '—'}</strong>
            </div>
            <div style="background:var(--bg-tertiary); border:1px solid var(--border-color); border-radius:8px; padding:8px; text-align:center;">
              <span style="font-size:0.68rem; color:var(--text-muted); display:block;">Temp. (°C)</span>
              <strong style="font-size:0.85rem; color:var(--text-primary); font-family:monospace;">${p.temperatureCelsius ? p.temperatureCelsius + '°C' : '—'}</strong>
            </div>
            <div style="background:var(--bg-tertiary); border:1px solid var(--border-color); border-radius:8px; padding:8px; text-align:center;">
              <span style="font-size:0.68rem; color:var(--text-muted); display:block;">SpO₂ (%)</span>
              <strong style="font-size:0.85rem; color:var(--text-primary); font-family:monospace;">${p.spo2 ? p.spo2 + '%' : '—'}</strong>
            </div>
          </div>

          <!-- Queixa Clínica / Sintomatologia -->
          ${p.complaints ? `
            <div style="background:rgba(255,255,255,0.02); border-left:3px solid var(--color-primary); padding:8px 12px; border-radius:0 8px 8px 0; margin-bottom:16px;">
              <span style="font-size:0.7rem; color:var(--text-muted); font-weight:700; text-transform:uppercase; display:block;">Queixa Principal:</span>
              <p style="margin:2px 0 0; font-size:0.78rem; color:var(--text-secondary); line-height:1.35; font-style:italic;">"${p.complaints}"</p>
            </div>
          ` : ''}

          <!-- Botões de Ações Clínicas -->
          <div style="margin-top:auto; display:flex; flex-direction:column; gap:8px;">
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px;">
              <button class="btn btn-obs-pep" data-enc-id="${p.id}" data-patient-name="${safePName}" style="background:var(--bg-tertiary); border:1px solid var(--border-color); color:var(--text-primary); font-size:0.78rem; padding:8px; border-radius:8px; font-weight:600; cursor:pointer;" title="Abrir Prontuário Médico (PEP)">
                <i class="fa-solid fa-file-medical" style="color:#0284c7;"></i> Abrir PEP
              </button>
              <button class="btn btn-obs-rx" data-enc-id="${p.id}" data-patient-id="${p.patientId}" data-patient-name="${safePName}" style="background:rgba(99,102,241,0.12); border:1px solid rgba(99,102,241,0.3); color:#818cf8; font-size:0.78rem; padding:8px; border-radius:8px; font-weight:600; cursor:pointer;" title="Prescrição de Medicamentos / Soroterapia">
                <i class="fa-solid fa-pills"></i> Prescrição
              </button>
            </div>

            <div style="display:grid; grid-template-columns:1.2fr 1fr; gap:8px;">
              <button class="btn btn-obs-transfer" data-enc-id="${p.id}" data-patient-name="${safePName}" style="background:rgba(245,158,11,0.15); border:1px solid rgba(245,158,11,0.4); color:#fbbf24; font-size:0.78rem; padding:8px; border-radius:8px; font-weight:700; cursor:pointer;" title="Encaminhar para Leito de Internação (Enfermaria / UTI)">
                <i class="fa-solid fa-bed"></i> Internar em Leito
              </button>
              <button class="btn btn-obs-discharge" data-enc-id="${p.id}" data-patient-name="${safePName}" style="background:linear-gradient(135deg, #10b981, #059669); border:none; color:#fff; font-size:0.78rem; padding:8px; border-radius:8px; font-weight:700; cursor:pointer;" title="Conceder Alta Médica da Observação">
                <i class="fa-solid fa-person-walking-arrow-right"></i> Dar Alta
              </button>
            </div>
          </div>
        </div>
      `;
    }).join('');

    // Disparar cronômetros e vincular eventos
    filtered.forEach(p => {
      const obsStartTime = new Date(p.observation_started_at || p.admitted_at || p.created_at).getTime();
      const timerEl = document.getElementById(`obs-timer-${p.id}`);

      const updateTimer = () => {
        if (!timerEl) return;
        const diffMs = Math.max(0, Date.now() - obsStartTime);
        const h = Math.floor(diffMs / 3600000);
        const m = Math.floor((diffMs % 3600000) / 60000);
        const s = Math.floor((diffMs % 60000) / 1000);
        timerEl.textContent = `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
        if (h >= 12) {
          timerEl.style.color = '#f87171';
        } else if (h >= 6) {
          timerEl.style.color = '#fbbf24';
        } else {
          timerEl.style.color = '#34d399';
        }
      };

      updateTimer();
      const interval = setInterval(updateTimer, 1000);
      obsTimers.push(interval);
    });

    // Eventos dos botões
    container.querySelectorAll('.btn-obs-pep').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const encId = btn.dataset.encId;
        const pName = btn.dataset.patientName;
        if (typeof window.openPEPModal === 'function') {
          window.openPEPModal(encId);
        } else if (typeof window.openDoctorConsultingRoom === 'function') {
          window.openDoctorConsultingRoom('Consultório 01', pName);
        }
      });
    });

    container.querySelectorAll('.btn-obs-rx').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const encId = btn.dataset.encId;
        const pName = btn.dataset.patientName;
        const patId = btn.dataset.patientId;
        if (typeof window.openPrescriptionModal === 'function') {
          window.openPrescriptionModal(encId, pName, patId);
        } else {
          showToast('Prescrição pode ser emitida diretamente dentro do PEP.');
        }
      });
    });

    container.querySelectorAll('.btn-obs-transfer').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const encId = btn.dataset.encId;
        const pName = btn.dataset.patientName;
        if (typeof window.openTransferBedModal === 'function') {
          window.openTransferBedModal(encId, pName);
        } else {
          window.switchTab('leitos');
        }
      });
    });

    container.querySelectorAll('.btn-obs-discharge').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const encId = btn.dataset.encId;
        const pName = btn.dataset.patientName;
        const perms = getRolePermissions(state.user);
        if (!perms.canSignPEP && !perms.canManageBeds) {
          showCustomAlert({
            title: 'Acesso Restrito',
            message: `Seu perfil (${perms.label}) não possui autorização para conceder alta médica.`,
            type: 'warning'
          });
          return;
        }

        const confirmed = typeof showCustomConfirm === 'function'
          ? await showCustomConfirm({
              title: 'Confirmar Alta da Observação',
              message: `Deseja realmente conceder <strong>ALTA MÉDICA</strong> para o paciente <strong>${pName}</strong>?<br><br>Esta ação liberará a vaga na Sala de Observação e encerrará o atendimento com sucesso.`,
              confirmText: 'Sim, Conceder Alta',
              cancelText: 'Cancelar',
              type: 'warning'
            })
          : confirm(`Confirmar alta da observação para ${pName}?`);

        if (confirmed) {
          try {
            const res = await apiFetch(`/api/encounters/${encId}/finish-observation`, { method: 'PUT' });
            if (res.ok) {
              const nowTime = new Date().toLocaleTimeString('pt-BR').slice(0,5);
              showToast(`✅ Alta da observação concedida para ${pName} às ${nowTime}!`);
              if (typeof window.setActivePatientContext === 'function') {
                window.setActivePatientContext({
                  id: encId,
                  fullName: pName,
                  patientName: pName,
                  status: 'Alta',
                  room: 'Alta Concedida'
                });
              }
              await loadObservacaoData();
            } else {
              showToast('Erro ao registrar alta da observação.', true);
            }
          } catch(err) {
            console.error('Erro ao conceder alta:', err);
            showToast('Erro ao processar alta.', true);
          }
        }
      });
    });
  };

  const loadObservacaoData = async () => {
    try {
      const res = await apiFetch(`/api/encounters`);
      if (res.ok) {
        const rawData = await res.json();
        const encounters = Array.isArray(rawData) ? rawData : (rawData.data || rawData.encounters || []);
        // Pacientes em observação: status Em_Observacao ou que tenham observation_started_at sem finalização
        allObsPatients = encounters.filter(e => {
          if (e.status === 'Finalizado' || e.status === 'Alta' || e.status === 'Cancelado') return false;
          return e.status === 'Em_Observacao' || !!e.observation_started_at || (e.room && e.room.toLowerCase().includes('observa'));
        }).sort((a, b) => {
          const tA = new Date(a.observation_started_at || a.admitted_at || a.created_at).getTime();
          const tB = new Date(b.observation_started_at || b.admitted_at || b.created_at).getTime();
          return tA - tB; // Mais antigos primeiro (prioridade de tempo no PS)
        });

        // Atualizar contadores
        let safeCount = 0;
        let warningCount = 0;
        let criticalCount = 0;
        const now = Date.now();

        allObsPatients.forEach(p => {
          const t = new Date(p.observation_started_at || p.admitted_at || p.created_at).getTime();
          const h = (now - t) / 3600000;
          if (h >= 12) criticalCount++;
          else if (h >= 6) warningCount++;
          else safeCount++;
        });

        const kpiTot = document.getElementById('obs-kpi-total');
        if (kpiTot) kpiTot.textContent = allObsPatients.length;
        const kpiSafe = document.getElementById('obs-kpi-safe');
        if (kpiSafe) kpiSafe.textContent = safeCount;
        const kpiWarn = document.getElementById('obs-kpi-warning');
        if (kpiWarn) kpiWarn.textContent = warningCount;
        const kpiCrit = document.getElementById('obs-kpi-critical');
        if (kpiCrit) kpiCrit.textContent = criticalCount;

        // Atualizar badge no menu lateral se existir
        const sideBadge = document.getElementById('observacao-nav-badge');
        if (sideBadge) {
          sideBadge.textContent = allObsPatients.length;
          sideBadge.style.display = allObsPatients.length > 0 ? 'inline-block' : 'none';
        }

        renderCards();
      }
    } catch(err) {
      console.error('Erro ao carregar dados da Observação:', err);
      const container = document.getElementById('obs-grid-container');
      if (container) {
        container.innerHTML = `<div style="grid-column: 1 / -1; text-align:center; padding:40px; color:var(--color-danger);">Erro ao carregar pacientes da observação.</div>`;
      }
    }
  };

  // Eventos de Filtro
  document.querySelectorAll('.obs-metric-filter').forEach(card => {
    card.addEventListener('click', () => {
      document.querySelectorAll('.obs-metric-filter').forEach(c => c.classList.remove('active'));
      card.classList.add('active');
      currentFilter = card.dataset.filter || 'all';
      renderCards();
    });
  });

  document.querySelectorAll('.obs-risk-filter').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.obs-risk-filter').forEach(b => {
        b.classList.remove('active');
        b.style.fontWeight = 'normal';
      });
      btn.classList.add('active');
      btn.style.fontWeight = '700';
      currentRisk = btn.dataset.color || 'all';
      renderCards();
    });
  });

  document.getElementById('obs-search-input')?.addEventListener('input', () => {
    renderCards();
  });

  loadObservacaoData();
}

window.renderObservacaoTab = renderObservacaoTab;
