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

      const activeCtx = (typeof window.getActivePatientContext === 'function') ? window.getActivePatientContext() : null;
      const isSel = activeCtx && (
        (activeCtx.id && String(activeCtx.id) === String(p.id)) ||
        (activeCtx.patientId && String(activeCtx.patientId) === String(p.patientId)) ||
        (activeCtx.patientName && p.patientName && activeCtx.patientName.toLowerCase().trim() === p.patientName.toLowerCase().trim()) ||
        (activeCtx.fullName && p.patientName && activeCtx.fullName.toLowerCase().trim() === p.patientName.toLowerCase().trim())
      );

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
        <div class="card obs-patient-card ${isSel ? 'patient-pulse-selected patient-spotlight-glow' : ''}" 
             data-enc-id="${p.id}" 
             data-patient-name="${safePName}"
             style="background:var(--bg-secondary); border:${isSel ? '2.5px solid #38bdf8' : '1px solid var(--border-color)'}; border-top:4px solid ${cardBorderTop}; border-radius:14px; padding:18px; box-shadow:${isSel ? '0 0 35px rgba(56,189,248,0.6), inset 0 0 14px rgba(56,189,248,0.2)' : '0 4px 16px rgba(0,0,0,0.15)'}; display:flex; flex-direction:column; position:relative; cursor:pointer; transition:transform 0.2s ease, box-shadow 0.2s ease;"
             onmouseenter="if(!this.classList.contains('patient-pulse-selected')) this.style.transform='translateY(-3px)';"
             onmouseleave="if(!this.classList.contains('patient-pulse-selected')) this.style.transform='none';"
             title="Clique no card para abrir a Sequência de Procedimentos Clínicos">
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
            <div class="card-header-badges" style="display:flex; align-items:center; gap:6px;">
              ${isSel ? `
                <span class="badge focus-badge" style="background:linear-gradient(135deg, #0284c7, #38bdf8); color:#fff; font-size:0.68rem; font-weight:800; padding:2px 8px; border-radius:10px; display:inline-flex; align-items:center; gap:4px; box-shadow:0 0 10px rgba(56,189,248,0.5);">
                  <i class="fa-solid fa-bolt"></i> Paciente em Foco
                </span>
              ` : ''}
              <span style="background:${mc.bg}; border:1px solid ${mc.border}; color:${mc.text}; font-size:0.72rem; font-weight:800; padding:3px 10px; border-radius:12px;">
                ${mc.label}
              </span>
            </div>
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

    // Evento de clique no Card para iniciar a Sequência de Procedimentos e foco
    container.querySelectorAll('.obs-patient-card').forEach(card => {
      card.addEventListener('click', (e) => {
        if (e.target.closest('button') || e.target.closest('.btn')) return;
        const encId = card.dataset.encId;
        const patient = allObsPatients.find(item => String(item.id) === String(encId));
        if (!patient) return;

        // 1. Ativar contexto do paciente
        if (typeof window.setActivePatientContext === 'function') {
          window.setActivePatientContext({
            id: patient.id,
            patientId: patient.patientId,
            fullName: patient.patientName,
            patientName: patient.patientName,
            manchesterColor: patient.manchesterColor || 'Amarelo',
            status: 'Em_Observacao',
            room: patient.room || 'Sala de Observação',
            currentStep: 4
          });
        }

        // 2. Atualizar Guia de Governança Clínica
        if (typeof window.ensureSmartFlowGuideMounted === 'function') {
          window.ensureSmartFlowGuideMounted('observacao');
        }
        if (typeof window.createSmartFlowGuideCard === 'function') {
          window.createSmartFlowGuideCard('observacao');
        }

        // 3. Atualizar destaque visual entre os cards
        container.querySelectorAll('.obs-patient-card').forEach(c => {
          c.classList.remove('patient-pulse-selected', 'patient-spotlight-glow');
          c.style.border = '1px solid var(--border-color)';
          c.style.boxShadow = '0 4px 16px rgba(0,0,0,0.15)';
          const oldBadge = c.querySelector('.focus-badge');
          if (oldBadge) oldBadge.remove();
        });
        card.classList.add('patient-pulse-selected', 'patient-spotlight-glow');
        card.style.border = '2.5px solid #38bdf8';
        card.style.boxShadow = '0 0 35px rgba(56,189,248,0.6), inset 0 0 14px rgba(56,189,248,0.2)';
        const hBadges = card.querySelector('.card-header-badges');
        if (hBadges && !card.querySelector('.focus-badge')) {
          const fb = document.createElement('span');
          fb.className = 'badge focus-badge';
          fb.setAttribute('style', 'background:linear-gradient(135deg, #0284c7, #38bdf8); color:#fff; font-size:0.68rem; font-weight:800; padding:2px 8px; border-radius:10px; display:inline-flex; align-items:center; gap:4px; box-shadow:0 0 10px rgba(56,189,248,0.5);');
          fb.innerHTML = '<i class="fa-solid fa-bolt"></i> Paciente em Foco';
          hBadges.prepend(fb);
        }

        // 4. Abrir Modal de Sequência de Procedimentos Clínicos
        openObsProcedureModal(patient);
      });
    });
  };

  // Modal com Sequência de Procedimentos e Condutas Clínicas para o Paciente em Observação
  const openObsProcedureModal = (patient) => {
    let modal = document.getElementById('obs-procedure-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'obs-procedure-modal';
      modal.className = 'modal-overlay';
      document.body.appendChild(modal);
    }

    const mc = getMCInfo(patient.manchesterColor);
    const obsStart = new Date(patient.observation_started_at || patient.admitted_at || patient.created_at).getTime();
    const diffMs = Math.max(0, Date.now() - obsStart);
    const h = Math.floor(diffMs / 3600000);
    const m = Math.floor((diffMs % 3600000) / 60000);
    const timeFormatted = `${String(h).padStart(2,'0')}h ${String(m).padStart(2,'0')}min`;

    modal.style.display = 'flex';
    modal.innerHTML = `
      <div class="modal-content" style="max-width: 760px; width: 95vw; max-height: 90vh; overflow-y: auto; background: var(--bg-primary); border: 1px solid var(--border-color); border-radius: 16px; box-shadow: 0 20px 60px rgba(0,0,0,0.5); padding: 0;">
        <!-- Cabeçalho -->
        <div style="background: linear-gradient(135deg, rgba(2, 132, 199, 0.18) 0%, rgba(15, 23, 42, 0.98) 100%); border-bottom: 1px solid var(--border-color); padding: 20px 24px; display: flex; justify-content: space-between; align-items: flex-start; border-radius: 16px 16px 0 0;">
          <div>
            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
              <span style="background: #0284c7; color: #fff; width: 28px; height: 28px; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 0.85rem;">
                <i class="fa-solid fa-clipboard-check"></i>
              </span>
              <h3 style="font-family: 'Outfit'; font-size: 1.25rem; font-weight: 700; color: #fff; margin: 0;">
                Sequência de Procedimentos & Condutas Clínicas
              </h3>
            </div>
            <p style="margin: 0; font-size: 0.8rem; color: #94a3b8;">
              Sala de Observação do Pronto-Socorro · Linha de Cuidado Guiada
            </p>
          </div>
          <button type="button" class="modal-close" onclick="document.getElementById('obs-procedure-modal').style.display='none'" style="background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1); color: #cbd5e1; width: 32px; height: 32px; border-radius: 8px; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 0.9rem;">
            <i class="fa-solid fa-xmark"></i>
          </button>
        </div>

        <div style="padding: 22px;">
          <!-- Banner de Identificação do Paciente -->
          <div style="background: var(--bg-secondary); border: 1px solid var(--border-color); border-radius: 12px; padding: 14px 18px; margin-bottom: 18px; display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; gap: 12px;">
            <div style="display: flex; align-items: center; gap: 12px;">
              <div style="width: 44px; height: 44px; border-radius: 50%; background: rgba(56,189,248,0.15); border: 1.5px solid #38bdf8; display: flex; align-items: center; justify-content: center; color: #38bdf8; font-size: 1.1rem; font-weight: 700;">
                ${patient.patientName.charAt(0)}
              </div>
              <div>
                <div style="font-family: 'Outfit'; font-size: 1.1rem; font-weight: 700; color: var(--text-primary);">
                  ${patient.patientName}
                </div>
                <div style="font-size: 0.78rem; color: var(--text-muted); display: flex; align-items: center; gap: 10px; margin-top: 2px;">
                  <span><i class="fa-solid fa-bed" style="color: #818cf8;"></i> ${patient.room || 'Sala de Observação'}</span>
                  <span>•</span>
                  <span><i class="fa-solid fa-stopwatch" style="color: #38bdf8;"></i> Permanência: <strong style="color: ${h >= 12 ? '#f87171' : (h >= 6 ? '#fbbf24' : '#34d399')};">${timeFormatted}</strong></span>
                </div>
              </div>
            </div>
            <div style="display: flex; align-items: center; gap: 8px;">
              <span style="background:${mc.bg}; border:1px solid ${mc.border}; color:${mc.text}; font-size:0.75rem; font-weight:800; padding:4px 12px; border-radius:12px;">
                ${mc.label}
              </span>
            </div>
          </div>

          <!-- Alerta de Diretriz CFM 2.079/14 -->
          <div style="background: ${h >= 12 ? 'rgba(239,68,68,0.1)' : 'rgba(56,189,248,0.08)'}; border-left: 4px solid ${h >= 12 ? '#ef4444' : '#0284c7'}; border-radius: 0 10px 10px 0; padding: 10px 14px; margin-bottom: 20px; font-size: 0.78rem; color: var(--text-secondary); line-height: 1.4;">
            <strong style="color: ${h >= 12 ? '#f87171' : '#38bdf8'};"><i class="fa-solid fa-circle-info"></i> Diretriz Assistencial (Resolução CFM nº 2.079/14):</strong>
            ${h >= 12 
              ? 'Tempo de permanência excedeu 12 horas. Paciente deve ter parecer de internação definitiva emitido ou alta concedida imediatamente.' 
              : 'O paciente em observação no PS deve ser reavaliado periodicamente (a cada 4-6h) com monitoramento contínuo de sinais vitais e resposta à hidratação/analgesia.'}
          </div>

          <!-- Sequência de Procedimentos Guiados -->
          <div style="display: flex; flex-direction: column; gap: 12px;">
            
            <!-- Procedimento 1: Reavaliação Clínica & PEP -->
            <div style="background: var(--bg-secondary); border: 1px solid var(--border-color); border-radius: 12px; padding: 16px; display: flex; align-items: center; justify-content: space-between; gap: 16px; transition: border-color 0.2s;">
              <div style="display: flex; align-items: flex-start; gap: 14px;">
                <div style="width: 36px; height: 36px; border-radius: 10px; background: rgba(2,132,199,0.15); border: 1px solid rgba(2,132,199,0.3); display: flex; align-items: center; justify-content: center; color: #38bdf8; font-weight: 800; font-size: 0.9rem; flex-shrink: 0;">
                  1
                </div>
                <div>
                  <div style="display: flex; align-items: center; gap: 8px;">
                    <strong style="font-size: 0.95rem; color: var(--text-primary);">Reavaliação Clínica & Evolução Médica (SOAP)</strong>
                    <span style="font-size: 0.65rem; background: rgba(56,189,248,0.15); color: #38bdf8; padding: 1px 6px; border-radius: 6px; font-weight: 700;">Recomendado</span>
                  </div>
                  <p style="margin: 4px 0 0; font-size: 0.78rem; color: var(--text-muted); line-height: 1.35;">
                    Registrar exame físico seriado, resposta ao tratamento e conduta médica no Prontuário Eletrônico do Paciente.
                  </p>
                </div>
              </div>
              <button class="btn btn-primary" id="btn-proc-open-pep" style="font-size: 0.8rem; padding: 8px 16px; border-radius: 8px; white-space: nowrap; flex-shrink: 0;">
                <i class="fa-solid fa-file-medical"></i> Abrir PEP
              </button>
            </div>

            <!-- Procedimento 2: Prescrição & Terapia Medicamentosa -->
            <div style="background: var(--bg-secondary); border: 1px solid var(--border-color); border-radius: 12px; padding: 16px; display: flex; align-items: center; justify-content: space-between; gap: 16px;">
              <div style="display: flex; align-items: flex-start; gap: 14px;">
                <div style="width: 36px; height: 36px; border-radius: 10px; background: rgba(99,102,241,0.15); border: 1px solid rgba(99,102,241,0.3); display: flex; align-items: center; justify-content: center; color: #818cf8; font-weight: 800; font-size: 0.9rem; flex-shrink: 0;">
                  2
                </div>
                <div>
                  <div style="display: flex; align-items: center; gap: 8px;">
                    <strong style="font-size: 0.95rem; color: var(--text-primary);">Prescrição, Soroterapia & Medicamentos</strong>
                    <span style="font-size: 0.65rem; background: rgba(99,102,241,0.15); color: #818cf8; padding: 1px 6px; border-radius: 6px; font-weight: 700;">Farmacoterapia</span>
                  </div>
                  <p style="margin: 4px 0 0; font-size: 0.78rem; color: var(--text-muted); line-height: 1.35;">
                    Emitir ou aprazar hidratação venosa contínua, analgésicos, antieméticos ou solicitar exames urgentes.
                  </p>
                </div>
              </div>
              <button class="btn" id="btn-proc-open-rx" style="background: rgba(99,102,241,0.15); border: 1px solid rgba(99,102,241,0.4); color: #818cf8; font-size: 0.8rem; padding: 8px 16px; border-radius: 8px; font-weight: 700; white-space: nowrap; flex-shrink: 0;">
                <i class="fa-solid fa-pills"></i> Prescrição
              </button>
            </div>

            <!-- Procedimento 3: Aferição Rápida de Sinais Vitais -->
            <div style="background: var(--bg-secondary); border: 1px solid var(--border-color); border-radius: 12px; padding: 16px;">
              <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px;">
                <div style="display: flex; align-items: center; gap: 14px;">
                  <div style="width: 36px; height: 36px; border-radius: 10px; background: rgba(16,185,129,0.15); border: 1px solid rgba(16,185,129,0.3); display: flex; align-items: center; justify-content: center; color: #34d399; font-weight: 800; font-size: 0.9rem; flex-shrink: 0;">
                    3
                  </div>
                  <div>
                    <strong style="font-size: 0.95rem; color: var(--text-primary);">Aferição Contínua de Sinais Vitais</strong>
                    <p style="margin: 2px 0 0; font-size: 0.78rem; color: var(--text-muted);">
                      Acompanhamento da curva hemodinâmica durante a permanência no PS.
                    </p>
                  </div>
                </div>
                <button type="button" id="btn-toggle-vitals-form" class="btn btn-sm" style="background: var(--bg-tertiary); border: 1px solid var(--border-color); color: var(--text-secondary); font-size: 0.74rem;">
                  <i class="fa-solid fa-pen-to-square"></i> Atualizar Medição
                </button>
              </div>

              <!-- Mini-Grid de Sinais Vitais Atuais -->
              <div id="vitals-display-grid" style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px;">
                <div style="background: var(--bg-tertiary); border: 1px solid var(--border-color); border-radius: 8px; padding: 8px; text-align: center;">
                  <span style="font-size: 0.68rem; color: var(--text-muted); display: block;">PA</span>
                  <strong id="disp-bp" style="font-size: 0.9rem; color: var(--text-primary); font-family: monospace;">${patient.bloodPressure || '—'}</strong>
                </div>
                <div style="background: var(--bg-tertiary); border: 1px solid var(--border-color); border-radius: 8px; padding: 8px; text-align: center;">
                  <span style="font-size: 0.68rem; color: var(--text-muted); display: block;">Temp.</span>
                  <strong id="disp-temp" style="font-size: 0.9rem; color: var(--text-primary); font-family: monospace;">${patient.temperatureCelsius ? patient.temperatureCelsius + '°C' : '—'}</strong>
                </div>
                <div style="background: var(--bg-tertiary); border: 1px solid var(--border-color); border-radius: 8px; padding: 8px; text-align: center;">
                  <span style="font-size: 0.68rem; color: var(--text-muted); display: block;">SpO₂</span>
                  <strong id="disp-spo2" style="font-size: 0.9rem; color: var(--text-primary); font-family: monospace;">${patient.spo2 ? patient.spo2 + '%' : '—'}</strong>
                </div>
                <div style="background: var(--bg-tertiary); border: 1px solid var(--border-color); border-radius: 8px; padding: 8px; text-align: center;">
                  <span style="font-size: 0.68rem; color: var(--text-muted); display: block;">FC (BPM)</span>
                  <strong id="disp-hr" style="font-size: 0.9rem; color: var(--text-primary); font-family: monospace;">${patient.heartRate ? patient.heartRate + ' bpm' : '—'}</strong>
                </div>
              </div>

              <!-- Formulário Inline de Atualização de Sinais Vitais (oculto por padrão) -->
              <div id="vitals-edit-form" style="display: none; margin-top: 12px; padding-top: 12px; border-top: 1px dashed var(--border-color);">
                <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-bottom: 10px;">
                  <div>
                    <label style="font-size: 0.7rem; color: var(--text-muted); display: block; margin-bottom: 2px;">PA (mmHg)</label>
                    <input type="text" id="input-vital-bp" value="${patient.bloodPressure || ''}" placeholder="120/80" class="form-control" style="font-size: 0.8rem; padding: 6px; text-align: center;">
                  </div>
                  <div>
                    <label style="font-size: 0.7rem; color: var(--text-muted); display: block; margin-bottom: 2px;">Temp (°C)</label>
                    <input type="text" id="input-vital-temp" value="${patient.temperatureCelsius || ''}" placeholder="36.5" class="form-control" style="font-size: 0.8rem; padding: 6px; text-align: center;">
                  </div>
                  <div>
                    <label style="font-size: 0.7rem; color: var(--text-muted); display: block; margin-bottom: 2px;">SpO₂ (%)</label>
                    <input type="text" id="input-vital-spo2" value="${patient.spo2 || ''}" placeholder="98" class="form-control" style="font-size: 0.8rem; padding: 6px; text-align: center;">
                  </div>
                  <div>
                    <label style="font-size: 0.7rem; color: var(--text-muted); display: block; margin-bottom: 2px;">FC (BPM)</label>
                    <input type="text" id="input-vital-hr" value="${patient.heartRate || ''}" placeholder="75" class="form-control" style="font-size: 0.8rem; padding: 6px; text-align: center;">
                  </div>
                </div>
                <div style="display: flex; justify-content: flex-end; gap: 8px;">
                  <button type="button" id="btn-cancel-vitals" class="btn btn-sm" style="font-size: 0.75rem; background: var(--bg-tertiary); color: var(--text-secondary);">Cancelar</button>
                  <button type="button" id="btn-save-vitals" class="btn btn-sm btn-primary" style="font-size: 0.75rem;"><i class="fa-solid fa-check"></i> Salvar Sinais Vitais</button>
                </div>
              </div>
            </div>

            <!-- Procedimento 4: Regulação & Transferência para Leito -->
            <div style="background: var(--bg-secondary); border: 1px solid var(--border-color); border-radius: 12px; padding: 16px; display: flex; align-items: center; justify-content: space-between; gap: 16px;">
              <div style="display: flex; align-items: flex-start; gap: 14px;">
                <div style="width: 36px; height: 36px; border-radius: 10px; background: rgba(245,158,11,0.15); border: 1px solid rgba(245,158,11,0.3); display: flex; align-items: center; justify-content: center; color: #fbbf24; font-weight: 800; font-size: 0.9rem; flex-shrink: 0;">
                  4
                </div>
                <div>
                  <div style="display: flex; align-items: center; gap: 8px;">
                    <strong style="font-size: 0.95rem; color: var(--text-primary);">Encaminhar para Internação (Enfermaria / UTI)</strong>
                    <span style="font-size: 0.65rem; background: rgba(245,158,11,0.15); color: #fbbf24; padding: 1px 6px; border-radius: 6px; font-weight: 700;">Regulação</span>
                  </div>
                  <p style="margin: 4px 0 0; font-size: 0.78rem; color: var(--text-muted); line-height: 1.35;">
                    Caso o paciente necessite de internação hospitalar definitiva ou suporte continuado após a observação.
                  </p>
                </div>
              </div>
              <button class="btn" id="btn-proc-transfer" style="background: rgba(245,158,11,0.15); border: 1px solid rgba(245,158,11,0.4); color: #fbbf24; font-size: 0.8rem; padding: 8px 16px; border-radius: 8px; font-weight: 700; white-space: nowrap; flex-shrink: 0;">
                <i class="fa-solid fa-bed"></i> Internar em Leito
              </button>
            </div>

            <!-- Procedimento 5: Conceder Alta Médica -->
            <div style="background: var(--bg-secondary); border: 1px solid var(--border-color); border-radius: 12px; padding: 16px; display: flex; align-items: center; justify-content: space-between; gap: 16px;">
              <div style="display: flex; align-items: flex-start; gap: 14px;">
                <div style="width: 36px; height: 36px; border-radius: 10px; background: rgba(16,185,129,0.15); border: 1px solid rgba(16,185,129,0.3); display: flex; align-items: center; justify-content: center; color: #34d399; font-weight: 800; font-size: 0.9rem; flex-shrink: 0;">
                  5
                </div>
                <div>
                  <div style="display: flex; align-items: center; gap: 8px;">
                    <strong style="font-size: 0.95rem; color: var(--text-primary);">Desfecho Clínico & Alta Médica da Observação</strong>
                    <span style="font-size: 0.65rem; background: rgba(16,185,129,0.15); color: #34d399; padding: 1px 6px; border-radius: 6px; font-weight: 700;">Alta</span>
                  </div>
                  <p style="margin: 4px 0 0; font-size: 0.78rem; color: var(--text-muted); line-height: 1.35;">
                    Paciente compensado e estável. Homologar alta médica com orientações domiciliares e liberar vaga.
                  </p>
                </div>
              </div>
              <button class="btn" id="btn-proc-discharge" style="background: linear-gradient(135deg, #10b981, #059669); border: none; color: #fff; font-size: 0.8rem; padding: 8px 16px; border-radius: 8px; font-weight: 700; white-space: nowrap; flex-shrink: 0;">
                <i class="fa-solid fa-person-walking-arrow-right"></i> Dar Alta
              </button>
            </div>

          </div>
        </div>

        <!-- Rodapé do Modal -->
        <div style="background: var(--bg-secondary); border-top: 1px solid var(--border-color); padding: 14px 24px; display: flex; justify-content: space-between; align-items: center; border-radius: 0 0 16px 16px;">
          <span style="font-size: 0.75rem; color: var(--text-muted);">
            Health Nexus · Sistema de Governança Clínica Hospitalar
          </span>
          <button type="button" class="btn btn-secondary" onclick="document.getElementById('obs-procedure-modal').style.display='none'" style="font-size: 0.8rem; padding: 6px 14px;">
            Fechar
          </button>
        </div>
      </div>
    `;

    // Eventos dos botões do modal de procedimentos
    document.getElementById('btn-proc-open-pep')?.addEventListener('click', () => {
      modal.style.display = 'none';
      if (typeof window.openPEPModal === 'function') {
        window.openPEPModal(patient.id);
      } else if (typeof window.openDoctorConsultingRoom === 'function') {
        window.openDoctorConsultingRoom('Consultório 01', patient.patientName);
      }
    });

    document.getElementById('btn-proc-open-rx')?.addEventListener('click', () => {
      modal.style.display = 'none';
      if (typeof window.openPrescriptionModal === 'function') {
        window.openPrescriptionModal(patient.id, patient.patientName, patient.patientId);
      } else {
        showToast('Prescrição pode ser emitida diretamente dentro do PEP.');
      }
    });

    document.getElementById('btn-proc-transfer')?.addEventListener('click', () => {
      modal.style.display = 'none';
      if (typeof window.openTransferBedModal === 'function') {
        window.openTransferBedModal(patient.id, patient.patientName);
      } else {
        window.switchTab('leitos');
      }
    });

    document.getElementById('btn-proc-discharge')?.addEventListener('click', () => {
      modal.style.display = 'none';
      const dischargeBtn = container.querySelector(`.btn-obs-discharge[data-enc-id="${patient.id}"]`);
      if (dischargeBtn) {
        dischargeBtn.click();
      }
    });

    // Toggle formulário de sinais vitais
    const vitalsForm = document.getElementById('vitals-edit-form');
    document.getElementById('btn-toggle-vitals-form')?.addEventListener('click', () => {
      if (vitalsForm) {
        vitalsForm.style.display = vitalsForm.style.display === 'none' ? 'block' : 'none';
      }
    });
    document.getElementById('btn-cancel-vitals')?.addEventListener('click', () => {
      if (vitalsForm) vitalsForm.style.display = 'none';
    });

    document.getElementById('btn-save-vitals')?.addEventListener('click', async () => {
      const bp = document.getElementById('input-vital-bp')?.value.trim();
      const temp = document.getElementById('input-vital-temp')?.value.trim();
      const spo2 = document.getElementById('input-vital-spo2')?.value.trim();
      const hr = document.getElementById('input-vital-hr')?.value.trim();

      try {
        const updatePayload = {
          bloodPressure: bp || patient.bloodPressure,
          temperatureCelsius: temp || patient.temperatureCelsius,
          spo2: spo2 || patient.spo2,
          heartRate: hr || patient.heartRate
        };

        const res = await apiFetch(`/api/encounters/${patient.id}`, {
          method: 'PUT',
          body: JSON.stringify(updatePayload)
        });

        if (res.ok) {
          patient.bloodPressure = updatePayload.bloodPressure;
          patient.temperatureCelsius = updatePayload.temperatureCelsius;
          patient.spo2 = updatePayload.spo2;
          patient.heartRate = updatePayload.heartRate;

          // Atualizar display no modal
          if (document.getElementById('disp-bp')) document.getElementById('disp-bp').textContent = patient.bloodPressure || '—';
          if (document.getElementById('disp-temp')) document.getElementById('disp-temp').textContent = patient.temperatureCelsius ? patient.temperatureCelsius + '°C' : '—';
          if (document.getElementById('disp-spo2')) document.getElementById('disp-spo2').textContent = patient.spo2 ? patient.spo2 + '%' : '—';
          if (document.getElementById('disp-hr')) document.getElementById('disp-hr').textContent = patient.heartRate ? patient.heartRate + ' bpm' : '—';

          if (vitalsForm) vitalsForm.style.display = 'none';
          showToast(`✅ Sinais vitais de ${patient.patientName} atualizados com sucesso!`);
          renderCards();
        } else {
          showToast('Erro ao atualizar sinais vitais.', true);
        }
      } catch (err) {
        console.error('Erro ao salvar sinais vitais:', err);
        showToast('Erro ao registrar sinais vitais.', true);
      }
    });
  };

  const loadObservacaoData = async () => {
    try {
      const res = await apiFetch(`/api/encounters`);
      if (res.ok) {
        const rawData = await res.json();
        const encounters = Array.isArray(rawData) ? rawData : (rawData.data || rawData.encounters || []);
        // Pacientes em observação: status Em_Observacao ou que tenham observation_started_at sem finalização
        const rawObsList = encounters.filter(e => {
          if (e.status === 'Finalizado' || e.status === 'Alta' || e.status === 'Cancelado') return false;
          return e.status === 'Em_Observacao' || !!e.observation_started_at || (e.room && e.room.toLowerCase().includes('observa'));
        });

        // Deduplicação inteligente por paciente: um mesmo paciente não pode ocupar duas vagas simultâneas na Observação.
        // Se houver atendimentos duplicados (ex: múltiplos testes/admissões), mantém o mais recente e arquiva os anteriores no banco.
        const patientSeen = new Map();
        const duplicatesToClose = [];

        // Ordenar do mais recente para o mais antigo para garantir que a ficha ativa mantida seja a mais recente
        const sortedDesc = [...rawObsList].sort((a, b) => {
          const tA = new Date(a.observation_started_at || a.admitted_at || a.created_at || 0).getTime();
          const tB = new Date(b.observation_started_at || b.admitted_at || b.created_at || 0).getTime();
          return tB - tA;
        });

        sortedDesc.forEach(enc => {
          const key = (enc.patientId ? `id:${String(enc.patientId).trim().toLowerCase()}` : '') || 
                      (enc.patientName ? `name:${String(enc.patientName).trim().toLowerCase()}` : `enc:${enc.id}`);
          if (!patientSeen.has(key)) {
            patientSeen.set(key, enc);
          } else {
            duplicatesToClose.push(enc);
          }
        });

        // Limpeza automática no banco local de registros duplicados legados
        if (duplicatesToClose.length > 0 && typeof window !== 'undefined' && window.localDB && typeof window.localDB.update === 'function') {
          duplicatesToClose.forEach(dup => {
            try {
              window.localDB.update('encounters', dup.id, {
                ...dup,
                status: 'Finalizado',
                dischargeType: 'Duplicidade de Observação Corrigida Automaticamente',
                completed_at: new Date().toISOString(),
                lastStatusUpdate: new Date().toISOString()
              });
            } catch(e) {}
          });
        }

        allObsPatients = Array.from(patientSeen.values()).sort((a, b) => {
          const tA = new Date(a.observation_started_at || a.admitted_at || a.created_at || 0).getTime();
          const tB = new Date(b.observation_started_at || b.admitted_at || b.created_at || 0).getTime();
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
