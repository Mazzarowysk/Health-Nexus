import { apiFetch, showToast, abbreviateName, switchTab, setupCustomSelect, anonymizeCPF, exportToPDF, formatSyncDate, showCustomAlert, renderTabContent, cachedApiGet, getRolePermissions } from '../main.js';
import { state, dataCache, dataCacheTimestamps } from '../state.js';
import { checkDrugInteractions } from '../modules/clinicalAI.js';
import { showCDSSCriticalOverrideModal } from './doctors.js';

const API_URL = '/api';

async function renderTVPanelTab() {
  const contentArea = document.getElementById('main-content') || document.getElementById('content-area');
  if (!contentArea) return;

  contentArea.innerHTML = `
    <div class="tab-section active">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
        <div>
          <h2 style="font-size: 1.5rem; color: var(--text-primary); margin: 0; display: flex; align-items: center; gap: 10px;">
            <i class="fa-solid fa-tv" style="color: #0284c7;"></i> Painel de Chamada para TV (Sala de Espera)
          </h2>
          <p style="color: var(--text-secondary); font-size: 0.88rem; margin-top: 4px;">
            Exibi&#231;&#227;o em tela cheia para TV com chamada sonora e classifica&#231;&#227;o por Manchester.
          </p>
        </div>
        <div style="display: flex; gap: 10px;">
          <button id="btn-tv-call-modal" class="btn btn-primary" style="background: #0284c7; border: none; box-shadow: 0 2px 8px rgba(2,132,199,0.35);">
            <i class="fa-solid fa-bullhorn"></i> Chamar Paciente no Painel
          </button>
        </div>
      </div>

      <!-- CONTAINER PRINCIPAL DO PAINEL TV -->
      <div style="background: linear-gradient(135deg, #0f172a, #1e293b); border: 2px solid #0284c7; border-radius: 16px; padding: 24px; color: #fff; box-shadow: 0 10px 30px rgba(0,0,0,0.5);">
        
        <!-- HEADER TV -->
        <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 16px; margin-bottom: 24px;">
          <div style="display: flex; align-items: center; gap: 12px;">
            <i class="fa-solid fa-hospital-user" style="font-size: 2rem; color: #38bdf8;"></i>
            <div>
              <h3 style="margin: 0; font-size: 1.3rem; font-weight: 800; letter-spacing: 0.5px;">HEALTH NEXUS | PAINEL DE ATENDIMENTO</h3>
              <span style="font-size: 0.8rem; color: #94a3b8;">SISTEMA DE CHAMADA AUD&#205;VEL &amp; TRIAGEM VISUAL</span>
            </div>
          </div>
          <div id="tv-clock" style="font-size: 1.8rem; font-weight: 800; font-family: monospace; color: #38bdf8;">--:--:--</div>
        </div>

        <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 24px;">
          
          <!-- CARD CENTRAL: ÚLTIMO PACIENTE CHAMADO -->
          <div style="background: rgba(15, 23, 42, 0.8); border: 2px solid #38bdf8; border-radius: 16px; padding: 32px; text-align: center; display: flex; flex-direction: column; justify-content: center; align-items: center; min-height: 300px; box-shadow: 0 0 25px rgba(2, 132, 199, 0.3);">
            <span style="font-size: 0.9rem; letter-spacing: 2px; text-transform: uppercase; color: #94a3b8; font-weight: 700; margin-bottom: 12px;">&#218;LTIMO PACIENTE CHAMADO</span>
            <div id="tv-last-patient" style="font-size: 2.6rem; font-weight: 900; color: #fff; margin-bottom: 16px; text-shadow: 0 2px 10px rgba(0,0,0,0.5);">Aguardando chamada...</div>
            
            <div style="display: flex; align-items: center; gap: 16px; margin-top: 10px;">
              <div id="tv-last-room" style="font-size: 1.6rem; font-weight: 800; background: #0284c7; padding: 8px 24px; border-radius: 30px; color: #fff;">--</div>
              <div id="tv-last-badge" style="font-size: 1.1rem; font-weight: 800; padding: 8px 20px; border-radius: 30px; background: rgba(255,255,255,0.1); color: #cbd5e1;">--</div>
            </div>
          </div>

          <!-- HISTÓRICO DAS ÚLTIMAS CHAMADAS -->
          <div style="background: rgba(15, 23, 42, 0.6); border: 1px solid rgba(255,255,255,0.1); border-radius: 16px; padding: 20px;">
            <h4 style="margin-top: 0; margin-bottom: 16px; font-size: 1rem; color: #94a3b8; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 8px; display: flex; align-items: center; gap: 8px;">
              <i class="fa-solid fa-history"></i> &#218;LTIMAS CHAMADAS
            </h4>
            <div id="tv-history-list" style="display: flex; flex-direction: column; gap: 10px; max-height: 260px; overflow-y: auto;">
              <div style="text-align: center; color: #64748b; padding: 20px; font-size: 0.85rem;">Nenhuma chamada registrada hoje.</div>
            </div>
          </div>

        </div>


      <!-- FILA DE ESPERA DE PACIENTES -->
      <div style="margin-top: 28px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px;">
          <h3 style="margin: 0; font-size: 1.15rem; color: var(--text-primary); display: flex; align-items: center; gap: 8px;">
            <i class="fa-solid fa-users-clock" style="color: #f59e0b;"></i>
            Fila de Pacientes Aguardando
            <span id="tv-queue-count" style="background: #f59e0b; color: #000; font-size: 0.75rem; font-weight: 800; padding: 2px 8px; border-radius: 20px; margin-left: 4px;">0</span>
          </h3>
          <button onclick="loadTVWaitingQueue()" style="background: rgba(245,158,11,0.1); border: 1px solid rgba(245,158,11,0.3); color: #f59e0b; padding: 6px 14px; border-radius: 8px; cursor: pointer; font-size: 0.82rem; display: flex; align-items: center; gap: 6px;">
            <i class="fa-solid fa-rotate-right"></i> Atualizar
          </button>
        </div>
        <div id="tv-waiting-queue" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 12px;">
          <div style="grid-column: 1/-1; text-align: center; padding: 40px; color: var(--text-muted); font-size: 0.9rem;">
            <i class="fa-solid fa-spinner fa-spin" style="font-size: 1.4rem; margin-bottom: 10px; display: block; color: #f59e0b;"></i>
            Carregando fila de espera...
          </div>
        </div>
      </div>

    </div>
  `;
  // Relogio digital da TV
  const updateClock = () => {
    const el = document.getElementById('tv-clock');
    if (el) el.textContent = new Date().toLocaleTimeString('pt-BR');
  };
  updateClock();
  if (window._tvClockTimer) clearInterval(window._tvClockTimer);
  window._tvClockTimer = setInterval(updateClock, 1000);

  // Polling de chamadas e fila
  if (window._tvPollingTimer) clearInterval(window._tvPollingTimer);
  loadTVCalls();
  loadTVWaitingQueue();
  window._tvPollingTimer = setInterval(() => {
    const tvEl = document.getElementById('tv-last-patient');
    if (tvEl) {
      loadTVCalls();
      loadTVWaitingQueue();
    } else {
      clearInterval(window._tvPollingTimer);
      window._tvPollingTimer = null;
      if (window._tvClockTimer) { clearInterval(window._tvClockTimer); window._tvClockTimer = null; }
    }
  }, 5000);

  // Listener para botao de chamar paciente
  document.getElementById('btn-tv-call-modal')?.addEventListener('click', () => openTVCallModal());
}

async function loadTVCalls() {
  try {
    const res = await apiFetch('/api/tv/calls');
    if (res.ok) {
      const data = await res.json();
      let calls = data.data || [];
      calls.sort((a, b) => new Date(b.calledAt || 0).getTime() - new Date(a.calledAt || 0).getTime());
      renderTVCallsUI(calls);
    }
  } catch (e) {}
}

window.loadTVWaitingQueue = async function() {
  const queueEl = document.getElementById('tv-waiting-queue');
  const countEl = document.getElementById('tv-queue-count');
  if (!queueEl) return;

  let patients = [];

  // /api/encounters retorna array direto (sem envelope {data:[]})
  try {
    const res = await apiFetch('/api/encounters');
    if (res.ok) {
      const data = await res.json();
      const arr = Array.isArray(data) ? data : (data.data || []);
      arr.filter(e => e.status && e.status !== 'Finalizado' && e.status !== 'Cancelado')
         .forEach(e => patients.push({
           patientName: e.patientName,
           manchesterColor: e.manchesterColor || 'Verde',
           status: e.status,
           source: 'encounter'
         }));
    }
  } catch(e) {}

  // Complementar com appointments de hoje que ainda nao tem encounter
  try {
    const today = new Date().toISOString().slice(0, 10);
    const res2 = await apiFetch('/api/appointments?date=' + today);
    if (res2.ok) {
      const d2 = await res2.json();
      const apts = Array.isArray(d2) ? d2 : (d2.data || []);
      const activeStatuses = ['Agendado', 'Confirmado', 'Em Atendimento', 'Aguardando'];
      apts.filter(a => activeStatuses.includes(a.status) && a.patientName)
          .filter(a => !patients.find(p => p.patientName === a.patientName))
          .forEach(a => patients.push({
            patientName: a.patientName,
            manchesterColor: 'Verde',
            status: a.status,
            source: 'appointment',
            doctorName: a.doctorName,
            appointmentTime: a.appointmentTime
          }));
    }
  } catch(e) {}

  if (countEl) countEl.textContent = patients.length;

  if (patients.length === 0) {
    queueEl.innerHTML = `
      <div style="grid-column: 1/-1; text-align: center; padding: 50px 20px; color: var(--text-muted);">
        <i class="fa-solid fa-chair" style="font-size: 2.5rem; display: block; margin-bottom: 12px; color: #334155;"></i>
        <div style="font-size: 1rem; font-weight: 600; margin-bottom: 4px;">Nenhum paciente na fila de espera</div>
        <div style="font-size: 0.82rem;">Registre pacientes na aba <strong>Atendimento</strong> ou <strong>Agenda</strong> para que aparecam aqui.</div>
      </div>`;
    return;
  }

  const colorMap = {
    vermelho: { bg: '#dc2626', label: 'Vermelho', icon: 'fa-circle-exclamation' },
    laranja:  { bg: '#ea580c', label: 'Laranja',  icon: 'fa-triangle-exclamation' },
    amarelo:  { bg: '#d97706', label: 'Amarelo',  icon: 'fa-circle-info' },
    verde:    { bg: '#16a34a', label: 'Verde',     icon: 'fa-circle-check' },
    azul:     { bg: '#0284c7', label: 'Azul',      icon: 'fa-circle' },
  };
  const statusMap = {
    Aguardando_Triagem:     { text: 'Ag. Triagem',     color: '#8b5cf6' },
    Aguardando_Atendimento: { text: 'Ag. Atendimento', color: '#f59e0b' },
    Em_Atendimento:         { text: 'Em Atendimento',  color: '#10b981' },
    Agendado:               { text: 'Agendado',        color: '#0284c7' },
    Confirmado:             { text: 'Confirmado',      color: '#0284c7' },
    'Em Atendimento':     { text: 'Em Atendimento',  color: '#10b981' },
  };

  queueEl.innerHTML = patients.map((p, idx) => {
    const key = (p.manchesterColor || 'verde').toLowerCase().replace(/[^a-z]/g, '');
    const col = colorMap[key] || colorMap.verde;
    const st  = statusMap[p.status] || { text: p.status || 'Aguardando', color: '#64748b' };
    const ini = (p.patientName || '?').split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase();
    const sub = p.doctorName ? ('Dr. ' + p.doctorName + (p.appointmentTime ? ' · ' + p.appointmentTime : '')) : col.label;
    const safeName  = (p.patientName || '').replace(/\\/g, '\\\\').replace(/'/g, "\\'");
    const safeColor = (p.manchesterColor || 'Verde').replace(/'/g, "\\'");
    return `<div onclick="window._tvQuickCall('${safeName}','${safeColor}')"
      title="Clique para chamar ${p.patientName || ''}"
      style="background:var(--bg-secondary,#1e293b);border:1px solid rgba(255,255,255,0.08);border-left:4px solid ${col.bg};border-radius:12px;padding:14px 16px;display:flex;align-items:center;gap:14px;cursor:pointer;transition:all 0.2s;"
      onmouseenter="this.style.background='rgba(139,92,246,0.1)';this.style.transform='translateY(-1px)';this.style.boxShadow='0 4px 12px rgba(139,92,246,0.2)';"
      onmouseleave="this.style.background='var(--bg-secondary,#1e293b)';this.style.transform='';this.style.boxShadow='';">
      <div style="width:44px;height:44px;border-radius:50%;background:${col.bg};display:flex;align-items:center;justify-content:center;font-size:1rem;font-weight:800;color:#fff;flex-shrink:0;">${ini}</div>
      <div style="flex:1;min-width:0;">
        <div style="font-weight:700;font-size:0.95rem;color:var(--text-primary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${p.patientName || 'Paciente'}</div>
        <div style="display:flex;align-items:center;gap:6px;margin-top:4px;flex-wrap:wrap;">
          <span style="font-size:0.72rem;font-weight:700;background:${st.color}22;color:${st.color};border:1px solid ${st.color}44;padding:1px 7px;border-radius:20px;">${st.text}</span>
          <span style="font-size:0.72rem;color:var(--text-muted);"><i class="fa-solid ${col.icon}"></i> ${sub}</span>
        </div>
      </div>
      <div style="flex-shrink:0;text-align:right;">
        <span style="font-size:0.7rem;color:var(--text-muted);font-family:monospace;">#${String(idx+1).padStart(2,'0')}</span>
        <div style="margin-top:4px;font-size:0.72rem;color:#8b5cf6;font-weight:600;"><i class="fa-solid fa-bullhorn"></i> Chamar</div>
      </div>
    </div>`;
  }).join('');
};

window._tvQuickCall = async function(patientName, manchesterColor) {
  // Abre o modal já com o paciente pré-selecionado
  await openTVCallModal(patientName.trim(), (manchesterColor || 'Verde').trim());
};

function renderTVCallsUI(calls) {
  const lastEl = document.getElementById('tv-last-patient');
  const roomEl = document.getElementById('tv-last-room');
  const badgeEl = document.getElementById('tv-last-badge');
  const historyEl = document.getElementById('tv-history-list');

  if (!lastEl) return;

  if (calls.length === 0) {
    lastEl.textContent = 'Aguardando próxima chamada...';
    roomEl.textContent = '--';
    badgeEl.textContent = '--';
    return;
  }

  const latest = calls[0];
  lastEl.textContent = latest.patientName;
  roomEl.textContent = latest.roomName;
  badgeEl.textContent = `Triagem ${latest.manchesterColor || 'Verde'}`;

  // Cores da Triagem Manchester no badge
  const mColor = (latest.manchesterColor || '').toLowerCase();
  if (mColor.includes('vermelho')) {
    badgeEl.style.background = '#dc2626'; badgeEl.style.color = '#fff';
  } else if (mColor.includes('laranja')) {
    badgeEl.style.background = '#ea580c'; badgeEl.style.color = '#fff';
  } else if (mColor.includes('amarelo')) {
    badgeEl.style.background = '#d97706'; badgeEl.style.color = '#fff';
  } else if (mColor.includes('verde')) {
    badgeEl.style.background = '#16a34a'; badgeEl.style.color = '#fff';
  } else {
    badgeEl.style.background = '#0284c7'; badgeEl.style.color = '#fff';
  }

  // Render histórico
  if (historyEl) {
    historyEl.innerHTML = calls.slice(1, 6).map(c => `
      <div style="background: rgba(255,255,255,0.05); border-left: 4px solid #38bdf8; padding: 10px 14px; border-radius: 6px; display: flex; justify-content: space-between; align-items: center;">
        <div>
          <strong style="display: block; font-size: 0.95rem; color: #fff;">${c.patientName}</strong>
          <span style="font-size: 0.78rem; color: #94a3b8;">${c.roomName}</span>
        </div>
        <span style="font-size: 0.75rem; font-family: monospace; color: #38bdf8;">${new Date(c.calledAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
      </div>
    `).join('');
  }
}

async function openTVCallModal(preselectedName = '', preselectedColor = '') {
  let waitingPatients = [];
  try {
    const res = await apiFetch('/api/encounters');
    if (res.ok) {
      const data = await res.json();
      const rawArr = Array.isArray(data) ? data : (data.data || []);
      waitingPatients = rawArr.filter(e =>
        e.status && e.status !== 'Finalizado' && e.status !== 'Cancelado'
      );
    }
  } catch(e) {}

  const existingModal = document.getElementById('hn-tv-call-modal');
  if (existingModal) existingModal.remove();

  const overlay = document.createElement('div');
  overlay.id = 'hn-tv-call-modal';
  overlay.className = 'modal-overlay';
  overlay.style.cssText = 'z-index: 999999; display: flex; align-items: center; justify-content: center; background: rgba(0, 0, 0, 0.75); backdrop-filter: blur(8px);';

  const manchesterOpts = [
    { v: 'Verde',    l: 'Pouco Urgente (Verde)',    c: '#16a34a' },
    { v: 'Amarelo',  l: 'Urgente (Amarelo)',         c: '#d97706' },
    { v: 'Laranja',  l: 'Muito Urgente (Laranja)',   c: '#ea580c' },
    { v: 'Vermelho', l: 'Emerg\u00eancia (Vermelho)', c: '#dc2626' },
    { v: 'Azul',     l: 'N\u00e3o Urgente (Azul)',   c: '#0284c7' },
  ];

  const statusLabel = (s) => {
    if (s === 'Aguardando_Triagem')     return 'Ag. Triagem';
    if (s === 'Aguardando_Atendimento') return 'Ag. Atendimento';
    if (s === 'Em_Atendimento')         return 'Em Consulta';
    return s || 'Aguardando';
  };

  const queueCardsHTML = waitingPatients.length === 0
    ? `<div style="text-align:center; padding: 20px; color: #64748b; font-size: 0.85rem; grid-column: 1/-1;">
         <i class="fa-solid fa-chair" style="font-size:1.8rem; display:block; margin-bottom:8px;"></i>
         Nenhum paciente na fila no momento.<br>
         <span style="font-size:0.78rem;">Voc&#234; ainda pode digitar o nome manualmente abaixo.</span>
       </div>`
    : waitingPatients.map(p => {
        const mKey = (p.manchesterColor || 'verde').toLowerCase().replace(/[^a-z]/g, '');
        const mColorMap = { vermelho: '#dc2626', laranja: '#ea580c', amarelo: '#d97706', verde: '#16a34a', azul: '#0284c7' };
        const bg = mColorMap[mKey] || '#16a34a';
        const initials = (p.patientName || '?').split(' ').slice(0,2).map(n => n[0]).join('').toUpperCase();
        const sLabel = statusLabel(p.status);
        return `<div class="tv-queue-patient-card" data-name="${(p.patientName||'').replace(/"/g,'&quot;')}" data-manchester="${p.manchesterColor||'Verde'}"
             style="background:#1e293b; border:1px solid #334155; border-left:4px solid ${bg}; border-radius:10px; padding:10px 14px; cursor:pointer; display:flex; align-items:center; gap:12px; transition:all 0.18s;"
             onmouseenter="this.style.background='rgba(139,92,246,0.12)'; this.style.borderColor='#8b5cf6';"
             onmouseleave="this.style.background='#1e293b'; this.style.borderColor='#334155'; this.style.borderLeftColor='${bg}';">
          <div style="width:38px;height:38px;border-radius:50%;background:${bg};display:flex;align-items:center;justify-content:center;font-weight:800;color:#fff;font-size:0.9rem;flex-shrink:0;">${initials}</div>
          <div style="flex:1;min-width:0;">
            <div style="font-weight:700;font-size:0.9rem;color:#f1f5f9;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${p.patientName||'Paciente'}</div>
            <div style="font-size:0.72rem;color:#94a3b8;margin-top:2px;">${sLabel} &bull; ${p.manchesterColor||'Verde'}</div>
          </div>
          <i class="fa-solid fa-hand-pointer" style="color:#8b5cf6;font-size:0.85rem;flex-shrink:0;"></i>
        </div>`;
      }).join('');

  overlay.innerHTML = `
    <div class="sync-modal-card" style="max-width: 540px; width: 95%; background: #0f172a; border: 1px solid #8b5cf6; border-radius: 16px; overflow: hidden; box-shadow: 0 20px 60px rgba(0,0,0,0.7); max-height: 90vh; display: flex; flex-direction: column;">
      <div style="background: linear-gradient(135deg, #7c3aed, #4f46e5); padding: 16px 20px; flex-shrink: 0;">
        <h3 style="font-size: 1.1rem; display: flex; align-items: center; gap: 10px; color: #fff; margin: 0;">
          <i class="fa-solid fa-bullhorn"></i> Chamar Paciente no Painel TV
        </h3>
      </div>

      <div style="padding: 20px 24px; display: flex; flex-direction: column; gap: 16px; overflow-y: auto; flex: 1;">

        <!-- FILA DE PACIENTES (cards clicáveis) -->
        <div>
          <label style="display: flex; align-items: center; gap: 6px; font-size: 0.85rem; font-weight: 700; color: #94a3b8; margin-bottom: 10px;">
            <i class="fa-solid fa-users-clock" style="color: #f59e0b;"></i>
            Pacientes na fila &mdash; clique para selecionar:
            <span id="tv-modal-queue-count" style="background: #f59e0b; color: #000; font-size: 0.7rem; font-weight: 800; padding: 1px 7px; border-radius: 20px;">${waitingPatients.length}</span>
          </label>
          <div id="tv-modal-queue-list" style="display: flex; flex-direction: column; gap: 8px; max-height: 220px; overflow-y: auto; padding-right: 2px;">
            ${queueCardsHTML}
          </div>
        </div>

        <!-- INPUT NOME (texto livre) -->
        <div>
          <label style="display: block; font-size: 0.85rem; font-weight: 600; color: #94a3b8; margin-bottom: 6px;">
            <i class="fa-solid fa-user"></i> Nome do Paciente:
          </label>
          <input type="text" id="tv-modal-patient-name" placeholder="Digite ou selecione acima..." value="${preselectedName}" style="width: 100%; padding: 10px 12px; border-radius: 8px; background: #1e293b; color: #fff; border: 1px solid #334155; font-size: 0.9rem; box-sizing: border-box;" />
        </div>

        <!-- CONSULTÓRIO -->
        <div>
          <label style="display: block; font-size: 0.85rem; font-weight: 600; color: #94a3b8; margin-bottom: 6px;">
            <i class="fa-solid fa-door-open"></i> Consultório / Sala de Destino:
          </label>
          <select id="tv-modal-room" style="width: 100%; padding: 10px 12px; border-radius: 8px; background: #1e293b; color: #fff; border: 1px solid #334155;">
            <option value="Consultório 01">Consultório 01</option>
            <option value="Consultório 02">Consultório 02</option>
            <option value="Consultório 03">Consultório 03</option>
            <option value="Sala de Triagem">Sala de Triagem</option>
            <option value="Exames / Raio-X">Exames / Raio-X</option>
            <option value="Recepção">Recepção</option>
          </select>
        </div>

        <!-- MANCHESTER -->
        <div>
          <label style="display: block; font-size: 0.85rem; font-weight: 600; color: #94a3b8; margin-bottom: 6px;">
            <i class="fa-solid fa-notes-medical"></i> Classificação Manchester:
          </label>
          <select id="tv-modal-color" style="width: 100%; padding: 10px 12px; border-radius: 8px; background: #1e293b; color: #fff; border: 1px solid #334155;">
            ${manchesterOpts.map(o => `<option value="${o.v}" ${o.v === (preselectedColor || 'Verde') ? 'selected' : ''}>${o.l}</option>`).join('')}
          </select>
        </div>

        <!-- BOTÕES -->
        <div style="display: flex; gap: 10px; margin-top: 4px;">
          <button id="btn-tv-modal-confirm" class="btn btn-primary" style="flex: 1; padding: 12px; background: linear-gradient(135deg, #7c3aed, #4f46e5); border: none; font-weight: 700; cursor: pointer; border-radius: 8px;">
            <i class="fa-solid fa-volume-high"></i> Emitir Chamada
          </button>
          <button id="btn-tv-modal-cancel" class="btn" style="flex: 1; padding: 12px; background: #1e293b; border: 1px solid #334155; color: #cbd5e1; cursor: pointer; border-radius: 8px;">
            Cancelar
          </button>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  const inputEl = document.getElementById('tv-modal-patient-name');
  const colorEl = document.getElementById('tv-modal-color');

  // Clique nos cards da fila seleciona o paciente
  document.querySelectorAll('.tv-queue-patient-card').forEach(card => {
    card.addEventListener('click', () => {
      document.querySelectorAll('.tv-queue-patient-card').forEach(c => {
        c.style.background = '#1e293b'; c.style.borderColor = '#334155';
      });
      card.style.background = 'rgba(139,92,246,0.18)';
      card.style.borderColor = '#8b5cf6';
      inputEl.value = card.dataset.name;
      const m = card.dataset.manchester;
      if (m) colorEl.value = m;
    });
  });

  // Fechar apenas pelo botão cancelar ou confirmar
  document.getElementById('btn-tv-modal-cancel').addEventListener('click', () => overlay.remove());

  document.getElementById('btn-tv-modal-confirm').addEventListener('click', async () => {
    const patientName = inputEl.value.trim();
    const roomName = document.getElementById('tv-modal-room').value;
    const manchesterColor = colorEl.value;

    if (!patientName) {
      showCustomAlert({ title: 'Aten&#231;&#227;o', message: 'Por favor, informe o nome do paciente.', type: 'warning' });
      return;
    }

    try {
      const r = await apiFetch('/api/tv/call', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ patientName, roomName, manchesterColor })
      });

      if ('speechSynthesis' in window) {
        const text = `Aten\u00e7\u00e3o: Paciente ${patientName}, favor dirigir-se ao ${roomName}.`;
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'pt-BR';
        utterance.rate = 0.9;
        window.speechSynthesis.speak(utterance);
      }

      overlay.remove();
      showCustomAlert({ title: 'Chamada Emitida!', message: `&#128266; ${patientName} &rarr; ${roomName}`, type: 'success' });
      if (typeof window.showFlowCompletionNotification === 'function') {
        window.showFlowCompletionNotification({
          actionTitle: `📢 Chamada Emitida no Painel TV`,
          message: `Paciente <strong>${patientName}</strong> chamado(a) para <strong>${roomName}</strong>.`,
          targetTab: 'consultorios',
          targetTabLabel: `${roomName} (Salas & Consultórios)`,
          targetColumn: roomName,
          targetPatientName: patientName,
          persistent: true
        });
      }
      loadTVCalls();
      if (typeof loadTVWaitingQueue === 'function') loadTVWaitingQueue();
    } catch (e) {
      showCustomAlert({ title: 'Erro', message: 'Falha ao emitir chamada na TV.', type: 'danger' });
    }
  });
}

// =========================================================
// MODAL DE LIXEIRA (Soft Delete)
// =========================================================
window.showTrashModal = async function(type) {
  const old = document.getElementById('modal-trash');
  if (old) old.remove();

  const overlay = document.createElement('div');
  overlay.id = 'modal-trash';
  overlay.className = 'modal-overlay';
  overlay.style.display = 'flex';
  overlay.style.zIndex = '9999';

  const titleStr = type === 'patients' ? 'Pacientes Removidos' : 'Médicos Removidos';

  overlay.innerHTML = `
    <div class="modal-content" style="max-width: 700px; width: 100%;">
      <div class="modal-header">
        <h3 style="margin: 0; font-family: 'Outfit'; font-weight: 700; color: var(--text-primary);"><i class="fa-solid fa-trash-can" style="color: var(--danger-color);"></i> Lixeira - ${titleStr}</h3>
        <button class="btn-close" id="btn-close-trash-modal" style="background: none; border: none; font-size: 1.2rem; cursor: pointer; color: var(--text-muted);"><i class="fa-solid fa-xmark"></i></button>
      </div>
      <div class="modal-body" style="min-height: 200px; max-height: 60vh; overflow-y: auto; padding: 20px;">
        <div id="trash-list-container" style="text-align: center; color: var(--text-muted); padding: 40px;">
          <i class="fa-solid fa-spinner fa-spin" style="font-size: 2rem; margin-bottom: 12px; display: block; color: var(--color-primary);"></i>
          Buscando itens na lixeira...
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  document.getElementById('btn-close-trash-modal').addEventListener('click', () => {
    overlay.remove();
  });

  try {
    const res = await apiFetch(`/api/trash/${type}`);
    if (res.ok) {
      const data = await res.json();
      const items = Array.isArray(data) ? data : (data.data || []);
      const container = document.getElementById('trash-list-container');
      
      if (items.length === 0) {
        container.innerHTML = `<div style="text-align: center; color: var(--text-muted); padding: 40px;"><i class="fa-solid fa-box-open" style="font-size: 2.5rem; margin-bottom: 12px; display: block; opacity: 0.5;"></i><div style="font-size: 1.1rem; font-weight: 600;">Lixeira vazia</div><div style="font-size: 0.85rem; margin-top: 4px;">Nenhum item foi removido recentemente.</div></div>`;
      } else {
        let html = '<table style="width: 100%; border-collapse: collapse; text-align: left;"><thead><tr><th style="padding: 12px 10px; border-bottom: 2px solid var(--border-color); color: var(--text-muted); font-size: 0.8rem; text-transform: uppercase;">ID / Nome</th><th style="padding: 12px 10px; border-bottom: 2px solid var(--border-color); color: var(--text-muted); font-size: 0.8rem; text-transform: uppercase;">Removido em</th><th style="padding: 12px 10px; border-bottom: 2px solid var(--border-color); color: var(--text-muted); font-size: 0.8rem; text-transform: uppercase; text-align: right;">Ação</th></tr></thead><tbody>';
        
        items.forEach(item => {
          const name = item.name || item.fullName || 'Desconhecido';
          const delDate = item.deleted_at ? new Date(item.deleted_at).toLocaleString('pt-BR') : 'Data desconhecida';
          
          html += `
            <tr style="border-bottom: 1px solid var(--border-color); transition: background 0.2s;" onmouseover="this.style.background='var(--bg-tertiary)'" onmouseout="this.style.background='transparent'">
              <td style="padding: 12px 10px;">
                <div style="font-weight: 600; color: var(--text-primary); font-size: 0.95rem;">${name}</div>
                <div style="font-size: 0.75rem; color: var(--text-muted);">ID: ${item.id}</div>
              </td>
              <td style="padding: 12px 10px; font-size: 0.85rem; color: var(--text-secondary);">${delDate}</td>
              <td style="padding: 12px 10px; text-align: right;">
                <button class="btn btn-primary btn-restore-item" data-id="${item.id}" style="padding: 6px 14px; font-size: 0.8rem; border-radius: 8px; cursor: pointer; display: inline-flex; align-items: center; gap: 6px;">
                  <i class="fa-solid fa-rotate-left"></i> Restaurar
                </button>
              </td>
            </tr>
          `;
        });
        
        html += '</tbody></table>';
        container.innerHTML = html;
        
        document.querySelectorAll('.btn-restore-item').forEach(btn => {
          btn.addEventListener('click', async (e) => {
            const id = e.currentTarget.dataset.id;
            if(confirm('Tem certeza de que deseja restaurar este item? Ele voltará para a listagem ativa.')) {
              try {
                const rRes = await apiFetch(`/api/${type}/${id}/restore`, { method: 'POST' });
                if (rRes.ok) {
                  showCustomAlert({ title: 'Sucesso', message: 'Item restaurado com sucesso!', type: 'success' });
                  dataCache.delete(type);
                  overlay.remove();
                  
                  // Atualizar aba correspondente
                  if (type === 'patients') {
                    // Força recarregamento aba de pacientes
                    document.querySelector('.nav-item[data-tab="pacientes"]')?.click();
                  } else {
                    // Força recarregamento aba médicos
                    document.querySelector('.nav-item[data-tab="medicos"]')?.click();
                  }
                } else {
                  showCustomAlert({ title: 'Erro', message: 'Falha ao restaurar item. Verifique os logs.', type: 'danger' });
                }
              } catch(err) {
                showCustomAlert({ title: 'Erro', message: 'Erro de conexão.', type: 'danger' });
              }
            }
          });
        });
      }
    } else {
      document.getElementById('trash-list-container').innerHTML = '<div style="text-align: center; color: var(--danger-color); padding: 40px;">Erro ao carregar itens da lixeira.</div>';
    }
  } catch(e) {
    document.getElementById('trash-list-container').innerHTML = '<div style="text-align: center; color: var(--danger-color); padding: 40px;">Erro de conexão. Verifique o console.</div>';
    console.error(e);
  }
};

// Expose functions used in inline onclick events
window.switchTab = switchTab;


// --- FASE 2: PRESCRIÇÃO MÉDICA, TIMER DE OBSERVAÇÃO 12H E TRANSFERÊNCIA DE LEITO ---

// 1. PDF DA PRESCRIÇÃO MÉDICA
window.generatePrescriptionPDF = async function(prescription, administrations = []) {
  if (!window.jspdf) { alert('⚠️ Biblioteca PDF não carregada.'); return; }
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  const loadLogo = () => new Promise(resolve => {
    const img = new Image(); img.src = '/assets/logo.png';
    img.onload = () => resolve(img); img.onerror = () => resolve(null);
  });

  const logoImg = await loadLogo();

  // Cabeçalho
  doc.setFillColor(99, 102, 241);
  doc.rect(0, 0, 210, 28, 'F');
  if (logoImg) doc.addImage(logoImg, 'PNG', 8, 5, 18, 18);
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(15); doc.setFont('helvetica', 'bold');
  doc.text('HEALTH NEXUS', 30, 13);
  doc.setFontSize(8.5); doc.setFont('helvetica', 'normal');
  doc.text('Sistema de Gestão Hospitalar & Prontuário', 30, 19);
  doc.text('RECEITUÁRIO & PRESCRIÇÃO MÉDICA', 125, 13);
  doc.text(`Data: ${new Date(prescription.created_at || Date.now()).toLocaleString('pt-BR')}`, 125, 19);

  // Informações do Paciente e Médico
  doc.setTextColor(30, 30, 50);
  doc.setFontSize(11); doc.setFont('helvetica', 'bold');
  doc.text(`PACIENTE: ${prescription.patientName}`, 14, 38);
  doc.setFontSize(9.5); doc.setFont('helvetica', 'normal');
  doc.text(`MÉDICO PRESCRITOR: ${prescription.doctorName}`, 14, 45);
  doc.text(`Nº PRESCRIÇÃO: #${prescription.id}`, 145, 45);

  doc.setDrawColor(99, 102, 241); doc.setLineWidth(0.5);
  doc.line(14, 49, 196, 49);

  // Tabela de Medicamentos
  let medications = [];
  try {
    medications = typeof prescription.medicationsJson === 'string' ? JSON.parse(prescription.medicationsJson) : prescription.medicationsJson;
  } catch(e) { medications = []; }

  const tableData = medications.map((m, idx) => [
    `${idx + 1}. ${m.name}`,
    m.dosage || '—',
    m.route || 'VO',
    m.frequency || '8/8h',
    m.instructions || 'Conforme orientação'
  ]);

  doc.autoTable({
    startY: 54,
    head: [['Medicamento', 'Dose', 'Via', 'Frequência', 'Instruções']],
    body: tableData,
    theme: 'grid',
    headStyles: { fillColor: [99, 102, 241], textColor: 255, fontStyle: 'bold', fontSize: 9 },
    styles: { fontSize: 8.5, cellPadding: 3 },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    margin: { left: 14, right: 14 }
  });

  let finalY = doc.lastAutoTable.finalY + 10;

  // Tabela de Administrações da Enfermagem se houver
  if (administrations && administrations.length > 0) {
    if (finalY > 220) { doc.addPage(); finalY = 20; }
    doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.setTextColor(16, 185, 129);
    doc.text('REGISTRO DE ADMINISTRAÇÃO (ENFERMAGEM)', 14, finalY);
    finalY += 5;

    const admData = administrations.map(a => [
      a.medicationName,
      a.nurseName,
      new Date(a.administeredAt).toLocaleString('pt-BR'),
      a.notes || 'Administrado'
    ]);

    doc.autoTable({
      startY: finalY,
      head: [['Medicamento', 'Enfermeiro(a)', 'Data / Hora', 'Observações']],
      body: admData,
      theme: 'grid',
      headStyles: { fillColor: [16, 185, 129], textColor: 255, fontStyle: 'bold', fontSize: 8.5 },
      styles: { fontSize: 8, cellPadding: 2.5 },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      margin: { left: 14, right: 14 }
    });
    finalY = doc.lastAutoTable.finalY + 10;
  }

  // Assinatura Médica
  if (finalY > 235) { doc.addPage(); finalY = 30; }
  doc.setDrawColor(150, 150, 150); doc.setLineWidth(0.4);
  doc.line(65, finalY + 15, 145, finalY + 15);
  doc.setFontSize(9); doc.setFont('helvetica', 'bold'); doc.setTextColor(50, 50, 70);
  doc.text(prescription.doctorName, 105, finalY + 20, { align: 'center' });
  doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(100, 100, 120);
  doc.text('Assinatura e Carimbo do Profissional Responsável', 105, finalY + 24, { align: 'center' });

  // Rodapé
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8); doc.setTextColor(160, 160, 160);
    doc.line(14, 283, 196, 283);
    doc.text(`Health Nexus — Prescrição Hospitalar Oficial | Página ${i} de ${pageCount}`, 105, 288, { align: 'center' });
  }

  const safeName = (prescription.patientName || 'paciente').replace(/[^a-zA-Z0-9]/g, '_').substring(0, 25);
  doc.save(`prescricao_${safeName}_#${prescription.id}.pdf`);
};

// 2. MODAL DE PRESCRIÇÃO MÉDICA E PLANILHA DE ADMINISTRAÇÃO DA ENFERMAGEM
window.openPrescriptionModal = async function(encounterId, patientName, patientId = '') {
  let modal = document.getElementById('modal-prescription-rx');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'modal-prescription-rx';
    modal.className = 'modal-overlay';
    modal.style.zIndex = '3500';
    document.body.appendChild(modal);
  }

  modal.innerHTML = `
    <div class="modal-content" style="max-width: 900px; width: 95vw; max-height: 90vh; display: flex; flex-direction: column; padding: 24px; border-radius: 16px;">
      <div class="modal-header" style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border-color); padding-bottom: 16px; margin-bottom: 16px;">
        <div style="display: flex; align-items: center; gap: 10px;">
          <div style="width: 38px; height: 38px; border-radius: 10px; background: rgba(99,102,241,0.15); border: 1px solid rgba(99,102,241,0.3); display: flex; align-items: center; justify-content: center; color: #a78bfa;">
            <i class="fa-solid fa-scroll" style="font-size: 1.1rem;"></i>
          </div>
          <div>
            <h3 style="margin: 0; font-size: 1.2rem; font-weight: 700; color: var(--text-primary);">Receituário & Prescrição Médica</h3>
            <span style="font-size: 0.82rem; color: var(--text-muted);">Paciente: <strong style="color: var(--text-primary);">${patientName}</strong></span>
          </div>
        </div>
        <button class="btn-close" onclick="document.getElementById('modal-prescription-rx').style.display='none'"><i class="fa-solid fa-xmark"></i></button>
      </div>

      <div class="modal-body" style="overflow-y: auto; flex: 1; padding-right: 6px;">
        
        <!-- SEÇÃO 1: CRIAR NOVA PRESCRIÇÃO -->
        <div style="background: var(--bg-secondary); border: 1px solid var(--border-color); border-radius: 14px; padding: 18px; margin-bottom: 20px;">
          <h4 style="margin: 0 0 14px 0; font-size: 0.95rem; font-weight: 700; color: #a78bfa; display: flex; align-items: center; gap: 8px;">
            <i class="fa-solid fa-file-signature"></i> Nova Prescrição Médica (Planilha)
          </h4>

          <div style="display: grid; grid-template-columns: 2fr 1fr 1fr 1fr 2fr; gap: 10px; margin-bottom: 8px;" id="rx-item-inputs">
            <div>
              <label style="font-size: 0.75rem; color: var(--text-muted); font-weight: 600; display: block; margin-bottom: 4px;">Medicamento</label>
              <input type="text" id="rx-med-name" class="form-input" placeholder="Ex: Dipirona, Tramadol, Amox..." style="width: 100%; font-size: 0.83rem;">
            </div>
            <div>
              <label style="font-size: 0.75rem; color: var(--text-muted); font-weight: 600; display: block; margin-bottom: 4px;">Dose</label>
              <input type="text" id="rx-med-dose" class="form-input" placeholder="Ex: 500mg (1 amp)" style="width: 100%; font-size: 0.83rem;">
            </div>
            <div>
              <label style="font-size: 0.75rem; color: var(--text-muted); font-weight: 600; display: block; margin-bottom: 4px;">Via</label>
              <select id="rx-med-route" class="form-input" style="width: 100%; font-size: 0.83rem;">
                <option value="VO">VO (Oral)</option>
                <option value="EV">EV (Endovenoso)</option>
                <option value="IM">IM (Intramuscular)</option>
                <option value="SC">SC (Subcutâneo)</option>
                <option value="Sublingual">Sublingual</option>
                <option value="Tópica">Tópica</option>
                <option value="Inalatória">Inalatória</option>
              </select>
            </div>
            <div>
              <label style="font-size: 0.75rem; color: var(--text-muted); font-weight: 600; display: block; margin-bottom: 4px;">Frequência</label>
              <select id="rx-med-freq" class="form-input" style="width: 100%; font-size: 0.83rem;">
                <option value="De 8 em 8h">De 8/8h</option>
                <option value="De 6 em 6h">De 6/6h</option>
                <option value="De 12 em 12h">De 12/12h</option>
                <option value="1x ao dia">1x ao dia</option>
                <option value="1x ao dia (manhã)">1x ao dia (manhã)</option>
                <option value="1x ao dia (noite)">1x ao dia (noite)</option>
                <option value="Se dor/febre">Se dor/febre</option>
                <option value="Dose Única">Dose Única</option>
                <option value="Contínua">Contínua</option>
              </select>
            </div>
            <div>
              <label style="font-size: 0.75rem; color: var(--text-muted); font-weight: 600; display: block; margin-bottom: 4px;">Instruções</label>
              <div style="display: flex; gap: 6px;">
                <input type="text" id="rx-med-notes" class="form-input" placeholder="Diluir em 100ml SF" style="flex: 1; min-width: 130px; font-size: 0.83rem;">
                <button type="button" id="btn-add-rx-item" class="btn" style="padding: 0 12px; font-size: 0.8rem; height: 38px; border-radius: 8px; font-weight: 700; background: rgba(99,102,241,0.2); border: 1px solid #6366f1; color: #c7d2fe; display: inline-flex; align-items: center; gap: 5px; white-space: nowrap; cursor: pointer;" title="Adicionar este medicamento à lista da planilha">
                  <i class="fa-solid fa-plus"></i> Adicionar
                </button>
                <button type="button" id="btn-prescribe-direct" class="btn btn-primary" style="padding: 0 14px; font-size: 0.8rem; height: 38px; border-radius: 8px; font-weight: 700; display: inline-flex; align-items: center; gap: 6px; white-space: nowrap; cursor: pointer; background: linear-gradient(135deg, #059669, #10b981); border: none; color: #fff;" title="Adicionar e Prescrever Imediatamente">
                  <i class="fa-solid fa-paper-plane"></i> Prescrever
                </button>
              </div>
            </div>
          </div>

          <!-- DICA DE POSOLOGIA INTELIGENTE -->
          <div id="rx-posology-smart-tip" style="display: none; font-size: 0.78rem; color: #a5b4fc; background: rgba(99,102,241,0.12); border: 1px solid rgba(99,102,241,0.3); padding: 6px 12px; border-radius: 8px; margin-bottom: 12px;"></div>

          <!-- RASCUNHO DA TABELA DE MEDICAÇÕES -->
          <div style="background: var(--bg-tertiary); border: 1px solid var(--border-color); border-radius: 10px; padding: 12px; margin-top: 4px;">
            <div style="font-size: 0.82rem; font-weight: 700; color: var(--text-primary); margin-bottom: 8px; display: flex; align-items: center; justify-content: space-between;">
              <span><i class="fa-solid fa-table-list" style="color: #6366f1; margin-right: 6px;"></i> Planilha da Prescrição Atual:</span>
              <span style="font-size: 0.72rem; font-weight: 400; color: var(--text-muted);">Itens serão encaminhados para a Farmácia</span>
            </div>
            <div id="rx-draft-table" style="max-height: 180px; overflow-y: auto;">
              <div style="text-align: center; color: var(--text-muted); font-size: 0.8rem; padding: 14px;">Nenhum medicamento adicionado ainda. Preencha os campos acima e clique em (+ Adicionar).</div>
            </div>

            <!-- BANNER DINÂMICO DE INTERAÇÕES MEDICAMENTOSAS -->
            <div id="rx-drug-interactions-alert" style="display: none; margin-top: 12px; padding: 12px 16px; border-radius: 10px; background: rgba(239, 68, 68, 0.15); border: 1.5px solid #ef4444; color: #fca5a5; font-size: 0.83rem;">
              <div style="display: flex; align-items: center; gap: 8px; font-weight: 700; color: #fff; margin-bottom: 4px;">
                <i class="fa-solid fa-triangle-exclamation" style="color: #ef4444; font-size: 1.1rem;"></i> <span id="rx-inter-title">Alerta de Interação Medicamentosa Cruzada</span>
              </div>
              <div id="rx-inter-desc" style="font-size: 0.8rem; line-height: 1.4; margin-bottom: 4px;"></div>
              <div id="rx-inter-action" style="font-size: 0.8rem; font-weight: 600; color: #fde047;"></div>
            </div>

            <div style="display: flex; justify-content: flex-end; margin-top: 10px;">
              <button type="button" id="btn-save-rx" class="btn btn-primary" style="padding: 8px 20px; font-size: 0.85rem; font-weight: 600; border-radius: 8px; display: inline-flex; align-items: center; gap: 6px;" disabled>
                <i class="fa-solid fa-floppy-disk"></i> Salvar Prescrição Médica
              </button>
            </div>
          </div>
        </div>

        <!-- SEÇÃO 2: PRESCRIÇÕES ATIVAS & PLANILHA DE ADMINISTRAÇÃO DA ENFERMAGEM -->
        <div style="background: var(--bg-secondary); border: 1px solid var(--border-color); border-radius: 14px; padding: 18px;">
          <h4 style="margin: 0 0 14px 0; font-size: 0.95rem; font-weight: 700; color: #34d399; display: flex; align-items: center; justify-content: space-between;">
            <span><i class="fa-solid fa-notes-medical"></i> Prescrições Ativas & Checagem da Enfermagem</span>
            <span style="font-size: 0.78rem; font-weight: 400; color: var(--text-muted);">Administração Contínua</span>
          </h4>
          <div id="rx-active-container">
            <div style="text-align: center; color: var(--text-muted); font-size: 0.85rem; padding: 24px;">Carregando prescrições...</div>
          </div>
        </div>

      </div>
    </div>
  `;

  modal.style.display = 'flex';

  // Carregar catálogo de medicamentos se necessário
  if (!window.medicationsCatalog) {
    fetch('/assets/medicamentos.json')
      .then(res => res.json())
      .then(data => window.medicationsCatalog = data)
      .catch(err => console.error('Erro ao carregar medicamentos', err));
  }

  // Buscar dados cadastrais e histórico clínico atualizado do paciente
  let pat = {};
  let enc = {};
  let patientNotes = [];
  try {
    const allPatients = (state.patients || (window.localDB ? window.localDB.list('patients') : [])) || [];
    pat = allPatients.find(p => 
      (patientId && String(p.id) === String(patientId)) || 
      (patientName && p.fullName && p.fullName.toLowerCase().trim() === patientName.toLowerCase().trim())
    ) || {};

    const allEncs = (state.encounters || (window.localDB ? window.localDB.list('encounters') : [])) || [];
    enc = allEncs.find(e => 
      String(e.id) === String(encounterId) || 
      (patientName && e.patientName && e.patientName.toLowerCase().trim() === patientName.toLowerCase().trim())
    ) || {};

    const allNotes = (window.localDB ? window.localDB.list('clinical_notes') : []) || [];
    patientNotes = allNotes.filter(n => 
      (patientId && String(n.patientId) === String(patientId)) || 
      (enc.id && String(n.encounterId) === String(enc.id))
    );
  } catch(e) {}

  const patientHistoryContext = [
    pat.allergies ? `Alergias Cadastradas: ${pat.allergies}` : '',
    pat.alergias ? `Alergias: ${pat.alergias}` : '',
    pat.chronicDiseases ? `Doenças Crônicas: ${pat.chronicDiseases}` : '',
    pat.continuousMedications ? `Medicamentos em Uso Contínuo: ${pat.continuousMedications}` : '',
    enc.complaints ? `Queixa / Triagem: ${enc.complaints}` : '',
    enc.subjectiveContent ? `Subjetivo: ${enc.subjectiveContent}` : '',
    enc.objectiveContent ? `Objetivo: ${enc.objectiveContent}` : '',
    enc.diagnosis ? `Diagnóstico: ${enc.diagnosis}` : '',
    enc.assessmentContent ? `Avaliação: ${enc.assessmentContent}` : '',
    enc.bloodPressure ? `Pressão Arterial: ${enc.bloodPressure}` : '',
    enc.heartRateBpm ? `Frequência Cardíaca: ${enc.heartRateBpm} bpm` : '',
    ...patientNotes.map(n => `${n.subjectiveContent || ''} ${n.assessmentContent || ''}`)
  ].filter(Boolean).join(' | ');

  // Aplicar Posologia Inteligente (Smart Dosing)
  const applySmartPosology = (medName) => {
    const fnSmart = (typeof getSmartPosologyForMedication === 'function') ? getSmartPosologyForMedication : window.getSmartPosologyForMedication;
    const posology = (typeof fnSmart === 'function') ? fnSmart(medName) : null;
    
    const doseInput = document.getElementById('rx-med-dose');
    const routeSelect = document.getElementById('rx-med-route');
    const freqSelect = document.getElementById('rx-med-freq');
    const notesInput = document.getElementById('rx-med-notes');
    const tipEl = document.getElementById('rx-posology-smart-tip');

    if (posology) {
      if (doseInput) doseInput.value = posology.dose;
      if (routeSelect) {
        const matchOpt = Array.from(routeSelect.options).find(o => o.value.toLowerCase() === posology.route.toLowerCase() || o.text.toLowerCase().includes(posology.route.toLowerCase()));
        if (matchOpt) routeSelect.value = matchOpt.value;
      }
      if (freqSelect) {
        const matchFreq = Array.from(freqSelect.options).find(o => o.value.toLowerCase().includes(posology.frequency.toLowerCase().slice(0, 4)));
        if (matchFreq) freqSelect.value = matchFreq.value;
      }
      if (notesInput) notesInput.value = posology.instructions;
      
      if (tipEl) {
        tipEl.style.display = 'block';
        tipEl.innerHTML = `<i class="fa-solid fa-wand-magic-sparkles" style="color:#60a5fa;"></i> Posologia Padrão Sugerida: <strong>${posology.dose}</strong> &bull; Via: <strong>${posology.route}</strong> &bull; <strong>${posology.frequency}</strong>`;
      }
    } else if (tipEl) {
      tipEl.style.display = 'none';
    }
  };

  setTimeout(() => {
    const medNameInput = document.getElementById('rx-med-name');
    let acDropdown = document.getElementById('rx-med-autocomplete');
    if (!acDropdown) {
      acDropdown = document.createElement('div');
      acDropdown.id = 'rx-med-autocomplete';
      acDropdown.style.position = 'absolute';
      acDropdown.style.background = '#0f172a';
      acDropdown.style.border = '1.5px solid rgba(99,102,241,0.5)';
      acDropdown.style.borderRadius = '10px';
      acDropdown.style.maxHeight = '220px';
      acDropdown.style.overflowY = 'auto';
      acDropdown.style.zIndex = '3600';
      acDropdown.style.width = '100%';
      acDropdown.style.boxShadow = '0 10px 25px rgba(0,0,0,0.5)';
      acDropdown.style.display = 'none';
      
      if (medNameInput && medNameInput.parentElement) {
        medNameInput.parentElement.style.position = 'relative';
        medNameInput.parentElement.appendChild(acDropdown);
      }
    }

    if (medNameInput) {
      const removeAccents = (str) => str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');

      medNameInput.addEventListener('input', (e) => {
        const val = e.target.value.toLowerCase();
        const cleanVal = removeAccents(val);

        // Auto-sugestão de posologia instantânea enquanto digita
        applySmartPosology(val);

        if (val.length < 2) {
          acDropdown.style.display = 'none';
          return;
        }

        // Itens da base SMART_POSOLOGY_DATABASE + Catálogo Anvisa
        const smartMatches = (window.SMART_POSOLOGY_DATABASE || []).filter(item => 
          item.keys.some(k => removeAccents(k).includes(cleanVal)) || removeAccents(item.name.toLowerCase()).includes(cleanVal)
        );

        const catalogMatches = (window.medicationsCatalog || []).filter(m => {
          return removeAccents(m.nome.toLowerCase()).includes(cleanVal);
        }).slice(0, 20);

        const allSuggestions = [
          ...smartMatches.map(s => ({ nome: s.name, dose: s.dose, via: s.route, isProtocol: true })),
          ...catalogMatches.map(c => ({ nome: c.nome, dose: c.dose, via: c.via, isProtocol: false }))
        ];

        if (allSuggestions.length === 0) {
          acDropdown.style.display = 'none';
          return;
        }
        
        acDropdown.innerHTML = '';
        allSuggestions.slice(0, 25).forEach(m => {
          const item = document.createElement('div');
          item.style.padding = '8px 12px';
          item.style.cursor = 'pointer';
          item.style.borderBottom = '1px solid rgba(255,255,255,0.06)';
          item.style.fontSize = '0.8rem';
          item.style.color = '#fff';
          item.style.display = 'flex';
          item.style.justifyContent = 'space-between';
          item.style.alignItems = 'center';
          item.innerHTML = `
            <div>
              <strong>${m.nome}</strong> 
              <span style="color:#94a3b8; font-size:0.75rem;">— ${m.dose} (${m.via})</span>
            </div>
            ${m.isProtocol ? `<span style="font-size:0.65rem; background:rgba(99,102,241,0.25); color:#a5b4fc; padding:2px 6px; border-radius:4px; font-weight:700;">PROTOCOLO</span>` : ''}
          `;
          
          item.addEventListener('mouseover', () => item.style.background = 'rgba(99,102,241,0.25)');
          item.addEventListener('mouseout', () => item.style.background = 'transparent');
          
          item.addEventListener('click', () => {
            medNameInput.value = m.nome;
            applySmartPosology(m.nome);
            acDropdown.style.display = 'none';
          });
          acDropdown.appendChild(item);
        });
        acDropdown.style.display = 'block';
      });
      
      document.addEventListener('click', (e) => {
        if (e.target !== medNameInput && e.target !== acDropdown && !acDropdown.contains(e.target)) {
          acDropdown.style.display = 'none';
        }
      });
    }
  }, 100);

  let draftItems = [];

  const checkRxInteractions = () => {
    const fnCheck = (typeof checkDrugInteractions === 'function') ? checkDrugInteractions : window.checkDrugInteractions;
    const planText = draftItems.map(i => `${i.name} ${i.dosage || ''} ${i.route || ''} ${i.frequency || ''}`).join('\n');
    const interactions = (typeof fnCheck === 'function' && planText) ? fnCheck(planText, patientHistoryContext) : [];
    
    const alertBox = document.getElementById('rx-drug-interactions-alert');
    if (!alertBox) return interactions;

    if (interactions && interactions.length > 0) {
      alertBox.style.display = 'block';
      
      const hasCritical = interactions.some(i => i.severity === 'Critica' || i.isBlocker);
      const hasSevere = interactions.some(i => i.severity === 'Grave');
      
      alertBox.style.background = hasCritical ? 'rgba(239, 68, 68, 0.15)' : (hasSevere ? 'rgba(245, 158, 11, 0.15)' : 'rgba(99, 102, 241, 0.15)');
      alertBox.style.border = hasCritical ? '1.5px solid #ef4444' : (hasSevere ? '1.5px solid #f59e0b' : '1.5px solid #6366f1');

      let alertHtml = `
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
          <div style="font-weight: 800; color: #fff; font-size: 0.88rem; display: flex; align-items: center; gap: 8px;">
            <i class="fa-solid fa-shield-virus" style="color: ${hasCritical ? '#ef4444' : '#f59e0b'}; font-size: 1.1rem;"></i>
            Avaliação de Segurança CDSS 4D (${interactions.length} alerta${interactions.length > 1 ? 's' : ''})
          </div>
          <span style="font-size: 0.68rem; background: ${hasCritical ? '#ef4444' : '#f59e0b'}; color: #fff; padding: 2px 7px; border-radius: 6px; font-weight: 800;">
            ${hasCritical ? 'CONTRAINDICAÇÃO CRÍTICA' : 'INTERAÇÃO IDENTIFICADA'}
          </span>
        </div>
        <div style="display: flex; flex-direction: column; gap: 8px;">
      `;

      interactions.forEach(item => {
        const badgeBg = item.severity === 'Critica' ? '#ef4444' : (item.severity === 'Grave' ? '#f59e0b' : '#3b82f6');
        alertHtml += `
          <div style="background: rgba(15,23,42,0.85); border-left: 3px solid ${badgeBg}; padding: 8px 12px; border-radius: 6px;">
            <div style="font-weight: 700; color: #fff; font-size: 0.82rem; margin-bottom: 2px;">
              <span style="background: ${badgeBg}; color: #fff; font-size: 0.62rem; padding: 1px 5px; border-radius: 3px; font-weight: 800; margin-right: 5px;">${item.severity.toUpperCase()}</span>
              ${item.title}
            </div>
            <div style="font-size: 0.78rem; color: #cbd5e1; line-height: 1.35; margin-bottom: 4px;">${item.desc}</div>
            <div style="font-size: 0.76rem; color: #fde047; font-weight: 600;">💡 <strong>Conduta Recomendada:</strong> ${item.action}</div>
          </div>
        `;
      });

      alertHtml += `</div>`;
      alertBox.innerHTML = alertHtml;
    } else {
      alertBox.style.display = 'block';
      alertBox.style.background = 'rgba(16, 185, 129, 0.12)';
      alertBox.style.border = '1px solid rgba(16, 185, 129, 0.35)';
      alertBox.innerHTML = `
        <div style="display: flex; align-items: center; gap: 8px; color: #34d399; font-size: 0.82rem; font-weight: 600;">
          <i class="fa-solid fa-circle-check"></i>
          <span>Segurança Farmacológica Verificada: Nenhum conflito ou alergia detectada nas medicações prescritas.</span>
        </div>
      `;
    }
    return interactions;
  };

  const updateDraftTable = () => {
    const tableEl = document.getElementById('rx-draft-table');
    const saveBtn = document.getElementById('btn-save-rx');
    if (draftItems.length === 0) {
      tableEl.innerHTML = '<div style="text-align: center; color: var(--text-muted); font-size: 0.8rem; padding: 14px;">Nenhum medicamento adicionado ainda. Preencha os campos acima e clique em (+ Adicionar).</div>';
      saveBtn.disabled = true;
      const alertBox = document.getElementById('rx-drug-interactions-alert');
      if (alertBox) alertBox.style.display = 'none';
      return;
    }
    saveBtn.disabled = false;

    let html = `
      <table style="width: 100%; border-collapse: collapse; font-size: 0.82rem; table-layout: fixed;">
        <thead>
          <tr style="border-bottom: 1px solid var(--border-color); text-align: left; color: var(--text-muted);">
            <th style="padding: 8px 6px; width: 26%;">Medicamento</th>
            <th style="padding: 8px 6px; width: 18%;">Dose</th>
            <th style="padding: 8px 6px; width: 10%;">Via</th>
            <th style="padding: 8px 6px; width: 15%;">Frequência</th>
            <th style="padding: 8px 6px; width: 26%;">Instruções</th>
            <th style="padding: 8px 6px; width: 5%; text-align: right;">Ação</th>
          </tr>
        </thead>
        <tbody>
    `;

    draftItems.forEach((item, idx) => {
      html += `
        <tr style="border-bottom: 1px solid var(--border-color);">
          <td style="padding: 8px 6px; font-weight: 600; color: var(--text-primary); word-break: break-word;">${item.name}</td>
          <td style="padding: 8px 6px; color: var(--text-secondary); word-break: break-word;">${item.dosage || '—'}</td>
          <td style="padding: 8px 6px;"><span style="background: rgba(99,102,241,0.15); color: #a78bfa; padding: 2px 6px; border-radius: 4px; font-weight: 600;">${item.route}</span></td>
          <td style="padding: 8px 6px; color: var(--text-secondary); word-break: break-word;">${item.frequency}</td>
          <td style="padding: 8px 6px; color: var(--text-muted); word-break: break-word;">${item.instructions || '—'}</td>
          <td style="padding: 8px 6px; text-align: right;">
            <button type="button" class="btn-remove-rx-draft" data-idx="${idx}" style="background: transparent; border: none; color: var(--danger-color); cursor: pointer; padding: 4px;" title="Remover"><i class="fa-solid fa-trash"></i></button>
          </td>
        </tr>
      `;
    });

    html += '</tbody></table>';
    tableEl.innerHTML = html;

    tableEl.querySelectorAll('.btn-remove-rx-draft').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const idx = Number(e.currentTarget.dataset.idx);
        draftItems.splice(idx, 1);
        updateDraftTable();
      });
    });

    checkRxInteractions();
  };

  const addItemFromInputs = () => {
    const name = document.getElementById('rx-med-name').value.trim();
    const dosage = document.getElementById('rx-med-dose').value.trim();
    const route = document.getElementById('rx-med-route').value;
    const frequency = document.getElementById('rx-med-freq').value;
    const instructions = document.getElementById('rx-med-notes').value.trim();

    if (!name) return false;

    draftItems.push({ name, dosage, route, frequency, instructions });
    document.getElementById('rx-med-name').value = '';
    document.getElementById('rx-med-dose').value = '';
    document.getElementById('rx-med-notes').value = '';
    const tipEl = document.getElementById('rx-posology-smart-tip');
    if (tipEl) tipEl.style.display = 'none';
    updateDraftTable();
    return true;
  };

  document.getElementById('btn-add-rx-item').onclick = () => {
    const name = document.getElementById('rx-med-name').value.trim();
    if (!name) { 
      if (typeof showToast === 'function') showToast('Digite ou selecione o nome do medicamento para adicionar.', 'warning');
      else alert('Digite o nome do medicamento.'); 
      return; 
    }
    addItemFromInputs();
  };

  const btnPrescribeDirect = document.getElementById('btn-prescribe-direct');
  if (btnPrescribeDirect) {
    btnPrescribeDirect.onclick = async () => {
      const name = document.getElementById('rx-med-name').value.trim();
      if (name) {
        addItemFromInputs();
      }

      if (draftItems.length === 0) {
        if (typeof showToast === 'function') showToast('Preencha os dados do medicamento antes de prescrever.', 'warning');
        else alert('Preencha os dados do medicamento antes de prescrever.');
        return;
      }

      document.getElementById('btn-save-rx').click();
    };
  }

  document.getElementById('btn-save-rx').onclick = async () => {
    if (draftItems.length === 0) return;
    
    // Verificação de segurança contra contraindicações e interações
    const currentInteractions = checkRxInteractions();
    const severeInteractions = currentInteractions.filter(i => i.severity === 'Grave' || i.severity === 'Critica' || i.isBlocker);
    if (severeInteractions.length > 0) {
      const confirmSave = await showCDSSCriticalOverrideModal(severeInteractions);
      if (!confirmSave) return;
    }

    const doctorName = state.user ? state.user.name : 'Dr. Médico Plantonista';
    try {
      const res = await apiFetch(`/api/encounters/${encounterId}/prescriptions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ patientId: patientId || 'P-' + Date.now(), patientName, doctorName, medications: draftItems })
      });
      if (res.ok) {
        if (typeof window.showFlowCompletionNotification === 'function') {
          window.showFlowCompletionNotification({
            actionTitle: 'Prescrição Eletrônica Emitida',
            message: `A prescrição de ${patientName || 'paciente'} foi emitida. Os medicamentos foram encaminhados para a Fila de Dispensação da Farmácia.`,
            targetTab: 'farmacia',
            targetTabLabel: 'Farmácia & Estoque'
          });
        } else {
          showToast('💊 Prescrição médica salva! Encaminhada para a Farmácia.');
        }
        draftItems = [];
        updateDraftTable();
        loadActivePrescriptions();
      }
    } catch(err) {
      alert('Erro de conexão ao salvar prescrição.');
    }
  };

  const loadActivePrescriptions = async () => {
    const container = document.getElementById('rx-active-container');
    try {
      const res = await apiFetch(`/api/encounters/${encounterId}/prescriptions`);
      const json = await res.json();
      const prescriptions = json.data?.prescriptions || [];
      const administrations = json.data?.administrations || [];

      if (prescriptions.length === 0) {
        container.innerHTML = '<div style="text-align: center; color: var(--text-muted); font-size: 0.85rem; padding: 24px;">Nenhuma prescrição gerada para este atendimento ainda.</div>';
        return;
      }

      let html = '';
      prescriptions.forEach(p => {
        let meds = [];
        try { meds = typeof p.medicationsJson === 'string' ? JSON.parse(p.medicationsJson) : p.medicationsJson; } catch(e) { meds = []; }

        html += `
          <div style="background: var(--bg-tertiary); border: 1px solid var(--border-color); border-radius: 12px; padding: 14px; margin-bottom: 14px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; flex-wrap: wrap; gap: 8px;">
              <div>
                <span style="font-weight: 700; font-size: 0.9rem; color: var(--text-primary);">Prescrição #${p.id}</span>
                <span style="font-size: 0.78rem; color: var(--text-muted); margin-left: 10px;">Prescrito por: <strong style="color:var(--text-primary);">${p.doctorName}</strong> em ${new Date(p.created_at).toLocaleString('pt-BR')}</span>
              </div>
              <button class="btn btn-primary btn-pdf-rx" data-id="${p.id}" style="padding: 5px 12px; font-size: 0.78rem; border-radius: 6px; display: inline-flex; align-items: center; gap: 6px;">
                <i class="fa-solid fa-file-pdf"></i> Imprimir PDF
              </button>
            </div>

            <!-- TABELA ESTILO PLANILHA DE ENFERMAGEM -->
            <div class="table-responsive">
              <table style="width: 100%; border-collapse: collapse; font-size: 0.8rem;">
                <thead>
                  <tr style="border-bottom: 1px solid var(--border-color); text-align: left; color: var(--text-muted);">
                    <th style="padding: 8px;">Medicamento / Dose</th>
                    <th style="padding: 8px;">Via & Freq.</th>
                    <th style="padding: 8px;">Instruções</th>
                    <th style="padding: 8px;">Última Checagem Enfermagem</th>
                    <th style="padding: 8px; text-align: right;">Ação Enfermagem</th>
                  </tr>
                </thead>
                <tbody>
        `;

        meds.forEach(m => {
          const medAdms = administrations.filter(a => a.prescriptionId === p.id && a.medicationName === m.name);
          const lastAdm = medAdms.length > 0 ? medAdms[0] : null;

          html += `
            <tr style="border-bottom: 1px solid var(--border-color);">
              <td style="padding: 8px;">
                <strong style="color: var(--text-primary);">${m.name}</strong><br>
                <span style="font-size: 0.73rem; color: var(--text-muted);">${m.dosage || 'Dose padrão'}</span>
              </td>
              <td style="padding: 8px;">
                <span style="background: rgba(99,102,241,0.15); color: #a78bfa; padding: 2px 6px; border-radius: 4px; font-weight: 600;">${m.route}</span>
                <span style="font-size: 0.75rem; color: var(--text-secondary); margin-left: 4px;">${m.frequency}</span>
              </td>
              <td style="padding: 8px; color: var(--text-secondary); font-style: italic;">${m.instructions || '—'}</td>
              <td style="padding: 8px;">
                ${lastAdm ? `
                  <span style="color: #34d399; font-weight: 600;"><i class="fa-solid fa-circle-check"></i> ${new Date(lastAdm.administeredAt).toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'})}</span><br>
                  <span style="font-size: 0.7rem; color: var(--text-muted);">Por: ${lastAdm.nurseName}</span>
                ` : `
                  <span style="color: var(--text-muted); font-style: italic;">Pendente</span>
                `}
              </td>
              <td style="padding: 8px; text-align: right;">
                <button class="btn btn-administer-med" data-pres-id="${p.id}" data-med-name="${m.name}" style="background: rgba(16,185,129,0.15); border: 1px solid rgba(16,185,129,0.3); color: #34d399; padding: 5px 10px; border-radius: 6px; font-size: 0.75rem; font-weight: 600; cursor: pointer;">
                  <i class="fa-solid fa-syringe"></i> Checar / Administrar
                </button>
              </td>
            </tr>
          `;
        });

        html += `
                </tbody>
              </table>
            </div>
          </div>
        `;
      });

      container.innerHTML = html;

      // Event listeners para PDF e Checagem da Enfermagem
      container.querySelectorAll('.btn-pdf-rx').forEach(b => {
        b.onclick = () => {
          const presObj = prescriptions.find(p => p.id === b.dataset.id);
          if (presObj) window.generatePrescriptionPDF(presObj, administrations);
        };
      });

      container.querySelectorAll('.btn-administer-med').forEach(b => {
        b.onclick = async () => {
          const presId = b.dataset.presId;
          const medName = b.dataset.medName;
          const nurseName = prompt('Nome do(a) Enfermeiro(a) responsável pela checagem:', state.user ? state.user.name : 'Enf. Plantonista');
          if (!nurseName) return;

          try {
            const res = await apiFetch(`/api/prescriptions/${presId}/administer`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ medicationName: medName, nurseName, notes: 'Medicação administrada em planilha' })
            });
            if (res.ok) {
              if (typeof window.showFlowCompletionNotification === 'function') {
                window.showFlowCompletionNotification({
                  actionTitle: 'Medicação Administrada',
                  message: `A medicação <strong>${medName}</strong> foi checada e administrada por ${nurseName}.`,
                  targetTab: 'atendimento',
                  targetTabLabel: 'Atendimentos / Prontuário'
                });
              } else {
                showToast(`💉 Medicação ${medName} checada e administrada por ${nurseName}!`);
              }
              loadActivePrescriptions();
            }
          } catch(err) {
            alert('Erro de conexão ao registrar administração.');
          }
        };
      });

    } catch(err) {
      container.innerHTML = '<div style="text-align: center; color: var(--danger-color); font-size: 0.85rem; padding: 24px;">Erro ao carregar prescrições.</div>';
    }
  };

  loadActivePrescriptions();
};

// 3. MODAL DE TRANSFERÊNCIA DE LEITO (SUBIR PARA INTERNAÇÃO)
window.openTransferBedModal = async function(encounterId, patientName) {
  let modal = document.getElementById('modal-transfer-bed-drawer');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'modal-transfer-bed-drawer';
    modal.className = 'modal-overlay';
    modal.style.zIndex = '3600';
    document.body.appendChild(modal);
  }

  modal.innerHTML = `
    <div class="modal-content" style="max-width: 550px; width: 95vw; padding: 24px; border-radius: 16px;">
      <div class="modal-header" style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border-color); padding-bottom: 14px; margin-bottom: 18px;">
        <div style="display: flex; align-items: center; gap: 10px;">
          <div style="width: 40px; height: 40px; border-radius: 10px; background: rgba(239,68,68,0.15); border: 1px solid rgba(239,68,68,0.3); display: flex; align-items: center; justify-content: center; color: #f87171;">
            <i class="fa-solid fa-bed-pulse" style="font-size: 1.15rem;"></i>
          </div>
          <div>
            <h3 style="margin: 0; font-size: 1.15rem; font-weight: 700; color: var(--text-primary);">Subir para Internação</h3>
            <span style="font-size: 0.8rem; color: var(--text-muted);">Transferir paciente do PS para Leito Hospitalar</span>
          </div>
        </div>
        <button class="btn-close" onclick="document.getElementById('modal-transfer-bed-drawer').style.display='none'"><i class="fa-solid fa-xmark"></i></button>
      </div>

      <div class="modal-body">
        <div style="background: var(--bg-tertiary); border: 1px solid var(--border-color); border-radius: 10px; padding: 14px; margin-bottom: 16px;">
          <div style="font-size: 0.82rem; color: var(--text-muted);">Paciente em Transferência:</div>
          <div style="font-size: 1.05rem; font-weight: 700; color: var(--text-primary);">${patientName}</div>
        </div>

        <div class="form-group" style="margin-bottom: 20px;">
          <label style="font-size: 0.85rem; font-weight: 600; color: var(--text-primary); display: block; margin-bottom: 8px;">Selecione o Leito Vago *</label>
          <select id="transfer-bed-select" class="form-input" style="width: 100%; font-size: 0.9rem; padding: 10px;">
            <option value="">Carregando leitos vagos...</option>
          </select>
        </div>

        <div style="display: flex; gap: 10px; justify-content: flex-end;">
          <button class="btn btn-secondary" onclick="document.getElementById('modal-transfer-bed-drawer').style.display='none'">Cancelar</button>
          <button class="btn btn-primary" id="btn-confirm-transfer-bed" style="background: linear-gradient(135deg, #ef4444, #dc2626); border: none;">
            <i class="fa-solid fa-bed"></i> Confirmar Internação
          </button>
        </div>
      </div>
    </div>
  `;

  modal.style.display = 'flex';

  // Carregar leitos vagos
  try {
    const beds = await cachedApiGet('/api/beds', 'beds');
    const vagoBeds = (beds || []).filter(b => b.status === 'Vago');
    const select = document.getElementById('transfer-bed-select');

    if (vagoBeds.length === 0) {
      select.innerHTML = '<option value="">Nenhum leito vago disponível no momento</option>';
      document.getElementById('btn-confirm-transfer-bed').disabled = true;
    } else {
      select.innerHTML = '<option value="">Escolha o leito...</option>' + 
        vagoBeds.map(b => `<option value="${b.id}">Leito ${b.bedNumber} — Setor: ${b.sector}</option>`).join('');
    }
  } catch(e) {
    document.getElementById('transfer-bed-select').innerHTML = '<option value="">Erro ao carregar leitos.</option>';
  }

  document.getElementById('btn-confirm-transfer-bed').onclick = async () => {
    const bedId = document.getElementById('transfer-bed-select').value;
    if (!bedId) { alert('Selecione um leito vago para a internação.'); return; }

    try {
      const res = await apiFetch(`/api/encounters/${encounterId}/transfer-to-bed`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bedId, patientName })
      });
      if (res.ok) {
        if (typeof window.showFlowCompletionNotification === 'function') {
          window.showFlowCompletionNotification({
            actionTitle: 'Internação Iniciada',
            message: `O paciente <strong>${patientName}</strong> foi transferido. O leito agora consta como Ocupado.`,
            targetTab: 'leitos',
            targetTabLabel: 'Gestão de Leitos',
            targetPatientName: patientName
          });
        } else {
          showToast(`🛌 Paciente ${patientName} transferido(a) para internação hospitalar!`);
        }
        modal.style.display = 'none';
        if (state.activeTab === 'atendimento') {
          renderTabContent();
        }
      }
    } catch(e) {
      alert('Erro ao transferir leito.');
    }
  };
};

// 4. ESCALA DE MÉDICOS DE PLANTÃO NO CORPO CLÍNICO
window.loadDutyScheduleBanner = async function() {
  const container = document.getElementById('duty-schedule-grid');
  const dateEl = document.getElementById('duty-schedule-date');
  if (!container) return;

  const todayStr = new Date().toISOString().split('T')[0];
  if (dateEl) dateEl.textContent = new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });

  try {
    const res = await apiFetch(`/api/duty-schedules?date=${todayStr}`);
    const json = await res.json();
    const duties = json.data || [];

    if (duties.length === 0) {
      container.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; color: var(--text-muted); padding: 18px; font-size: 0.85rem;">
          Nenhum médico escalado para o plantão de hoje. Clique em <strong>"Escala de Plantão"</strong> acima para montar a equipe.
        </div>
      `;
      return;
    }

    const shiftsOrder = ['Manhã', 'Tarde', 'Noite', 'Plantão 24h'];
    let html = '';

    shiftsOrder.forEach(shift => {
      const shiftDuties = duties.filter(d => d.shiftType === shift);
      if (shiftDuties.length > 0) {
        html += `
          <div style="background: var(--bg-tertiary); border: 1px solid var(--border-color); border-radius: 10px; padding: 12px;">
            <div style="font-size: 0.78rem; font-weight: 700; color: #a78bfa; text-transform: uppercase; margin-bottom: 8px;">
              <i class="fa-solid fa-clock"></i> Turno: ${shift}
            </div>
        `;
        shiftDuties.forEach(d => {
          html += `
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 6px 0; border-bottom: 1px dashed var(--border-color);">
              <div>
                <strong style="font-size: 0.85rem; color: var(--text-primary); display: block;">${d.doctorName}</strong>
                <span style="font-size: 0.73rem; color: var(--text-muted);">${d.specialty} — ${d.roomName}</span>
              </div>
              <button onclick="window.deleteDutySchedule('${d.id}')" style="background: transparent; border: none; color: var(--danger-color); cursor: pointer; font-size: 0.8rem;" title="Remover da escala"><i class="fa-solid fa-trash-can"></i></button>
            </div>
          `;
        });
        html += '</div>';
      }
    });

    container.innerHTML = html;
  } catch(e) {
    container.innerHTML = '<div style="grid-column: 1 / -1; text-align: center; color: var(--danger-color); padding: 18px;">Erro ao carregar escala de plantão.</div>';
  }
};

window.openDutyScheduleModal = async function() {
  let modal = document.getElementById('modal-duty-schedule-dialog');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'modal-duty-schedule-dialog';
    modal.className = 'modal-overlay';
    modal.style.zIndex = '3700';
    document.body.appendChild(modal);
  }

  const todayStr = new Date().toISOString().split('T')[0];

  modal.innerHTML = `
    <div class="modal-content" style="max-width: 500px; width: 95vw; padding: 24px; border-radius: 16px;">
      <div class="modal-header" style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border-color); padding-bottom: 14px; margin-bottom: 18px;">
        <div style="display: flex; align-items: center; gap: 10px;">
          <div style="width: 40px; height: 40px; border-radius: 10px; background: rgba(59,130,246,0.15); border: 1px solid rgba(59,130,246,0.3); display: flex; align-items: center; justify-content: center; color: #60a5fa;">
            <i class="fa-solid fa-calendar-days" style="font-size: 1.15rem;"></i>
          </div>
          <div>
            <h3 style="margin: 0; font-size: 1.15rem; font-weight: 700; color: var(--text-primary);">Escala de Plantão Médico</h3>
            <span style="font-size: 0.8rem; color: var(--text-muted);">Adicionar médico à escala diária</span>
          </div>
        </div>
        <button class="btn-close" onclick="document.getElementById('modal-duty-schedule-dialog').style.display='none'"><i class="fa-solid fa-xmark"></i></button>
      </div>

      <form id="form-duty-schedule" class="modal-body">
        <div class="form-group" style="margin-bottom: 14px;">
          <label style="font-size: 0.82rem; font-weight: 600; color: var(--text-primary); display: block; margin-bottom: 6px;">Selecione o Médico *</label>
          <select id="duty-doctor-select" class="form-input" style="width: 100%; font-size: 0.88rem;" required>
            <option value="">Carregando corpo clínico...</option>
          </select>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 14px;">
          <div class="form-group">
            <label style="font-size: 0.82rem; font-weight: 600; color: var(--text-primary); display: block; margin-bottom: 6px;">Data *</label>
            <input type="date" id="duty-date" class="form-input" value="${todayStr}" style="width: 100%; font-size: 0.88rem;" required>
          </div>
          <div class="form-group">
            <label style="font-size: 0.82rem; font-weight: 600; color: var(--text-primary); display: block; margin-bottom: 6px;">Turno *</label>
            <select id="duty-shift" class="form-input" style="width: 100%; font-size: 0.88rem;" required>
              <option value="Manhã">Manhã (07h-13h)</option>
              <option value="Tarde">Tarde (13h-19h)</option>
              <option value="Noite">Noite (19h-07h)</option>
              <option value="Plantão 24h">Plantão 24h</option>
            </select>
          </div>
        </div>

        <div class="form-group" style="margin-bottom: 20px;">
          <label style="font-size: 0.82rem; font-weight: 600; color: var(--text-primary); display: block; margin-bottom: 6px;">Consultório / Local</label>
          <input type="text" id="duty-room" class="form-input" placeholder="Ex: Consultório 01" value="Consultório 01" style="width: 100%; font-size: 0.88rem;">
        </div>

        <div style="display: flex; gap: 10px; justify-content: flex-end;">
          <button type="button" class="btn btn-secondary" onclick="document.getElementById('modal-duty-schedule-dialog').style.display='none'">Cancelar</button>
          <button type="submit" class="btn btn-primary"><i class="fa-solid fa-plus"></i> Adicionar à Escala</button>
        </div>
      </form>
    </div>
  `;

  modal.style.display = 'flex';

  // Carregar médicos
  try {
    const res = await apiFetch('/api/doctors');
    const doctors = await res.json();
    const docSelect = document.getElementById('duty-doctor-select');
    docSelect.innerHTML = '<option value="">Selecione o médico...</option>' +
      (doctors || []).map(d => `<option value="${d.id}" data-name="${d.name}" data-spec="${d.specialty}">${d.name} (${d.specialty})</option>`).join('');
  } catch(e) {}

  document.getElementById('form-duty-schedule').onsubmit = async (e) => {
    e.preventDefault();
    const select = document.getElementById('duty-doctor-select');
    const doctorId = select.value;
    const opt = select.options[select.selectedIndex];
    const doctorName = opt.dataset.name || 'Dr. Médico';
    const specialty = opt.dataset.spec || 'Clínica Geral';
    const shiftDate = document.getElementById('duty-date').value;
    const shiftType = document.getElementById('duty-shift').value;
    const roomName = document.getElementById('duty-room').value.trim();

    try {
      const res = await apiFetch('/api/duty-schedules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ doctorId, doctorName, specialty, shiftDate, shiftType, roomName })
      });
      if (res.ok) {
        showToast('📅 Médico adicionado à escala de plantão!');
        modal.style.display = 'none';
        window.loadDutyScheduleBanner();
      }
    } catch(e) {
      alert('Erro ao salvar escala.');
    }
  };
};

window.deleteDutySchedule = async function(id) {
  if (!confirm('Deseja remover este plantonista da escala?')) return;
  try {
    const res = await apiFetch(`/api/duty-schedules/${id}`, { method: 'DELETE' });
    if (res.ok) {
      showToast('Plantonista removido.');
      window.loadDutyScheduleBanner();
    }
  } catch(e) {}
};

// --- INICIALIZAÇÃO AUTOMÁTICA DA APLICAÇÃO ---
// Start app immediately (module execution is already deferred until DOM is parsed)
// initializeApp(); - REMOVIDO: Já é inicializado em main.js


window.renderTVPanelTab = renderTVPanelTab;
window.renderTVCallsUI = renderTVCallsUI;
