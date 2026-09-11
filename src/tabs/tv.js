import { apiFetch, showToast, abbreviateName, switchTab, setupCustomSelect, anonymizeCPF, exportToPDF, formatSyncDate, showCustomAlert, renderTabContent, cachedApiGet, getRolePermissions } from '../main.js';
import { state, dataCache, dataCacheTimestamps } from '../state.js';
import { evaluatePrescriptionCDSS } from '../modules/clinicalAI.js';

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
          <button id="btn-tv-call-modal" class="btn btn-primary" style="background: linear-gradient(135deg, #0284c7, #0369a1); border: none;">
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
    Aguardando_Triagem:     { text: 'Ag. Triagem',     color: '#0284c7' },
    Aguardando_Atendimento: { text: 'Ag. Atendimento', color: '#f59e0b' },
    Em_Atendimento:         { text: 'Em Atendimento',  color: '#10b981' },
    Agendado:               { text: 'Agendado',        color: '#0284c7' },
    Confirmado:             { text: 'Confirmado',      color: '#0284c7' },
    'Em Atendimento':     { text: 'Em Atendimento',  color: '#10b981' },
  };

  const activeCtx = (typeof window.getActivePatientContext === 'function') ? window.getActivePatientContext() : null;
  const activeCtxName = activeCtx ? (activeCtx.fullName || activeCtx.patientName || '').toLowerCase().trim() : '';
  const highlightName = (window._highlightPatientName || '').toLowerCase().trim();

  queueEl.innerHTML = patients.map((p, idx) => {
    const key = (p.manchesterColor || 'verde').toLowerCase().replace(/[^a-z]/g, '');
    const col = colorMap[key] || colorMap.verde;
    const st  = statusMap[p.status] || { text: p.status || 'Aguardando', color: '#64748b' };
    const ini = (p.patientName || '?').split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase();
    const sub = p.doctorName ? ('Dr. ' + p.doctorName + (p.appointmentTime ? ' · ' + p.appointmentTime : '')) : col.label;
    const safeName  = (p.patientName || '').replace(/\\/g, '\\\\').replace(/'/g, "\\'");
    const safeColor = (p.manchesterColor || 'Verde').replace(/'/g, "\\'");
    const pNameClean = (p.patientName || '').toLowerCase().trim();
    const isSelected = !!((activeCtxName && pNameClean === activeCtxName) || (highlightName && pNameClean.includes(highlightName)));

    return `<div onclick="window._tvQuickCall('${safeName}','${safeColor}')"
      class="patient-card-item ${isSelected ? 'patient-pulse-selected' : ''}"
      data-patient-card-name="${safeName.toLowerCase()}"
      title="Clique para chamar ${p.patientName || ''} na TV"
      style="position:relative;background:var(--bg-secondary,#1e293b);border:${isSelected ? '2px solid #0284c7' : '1px solid rgba(255,255,255,0.08)'};border-left:4px solid ${col.bg};border-radius:12px;padding:14px 16px;display:flex;align-items:center;gap:14px;cursor:pointer;transition:all 0.2s;box-shadow:${isSelected ? '0 0 24px rgba(2,132,199,0.45)' : 'none'};"
      onmouseenter="this.style.background='rgba(2,132,199,0.12)';this.style.transform='translateY(-2px)';"
      onmouseleave="this.style.background='var(--bg-secondary,#1e293b)';this.style.transform='';">
      
      <div style="width:44px;height:44px;border-radius:50%;background:${col.bg};display:flex;align-items:center;justify-content:center;font-size:1rem;font-weight:800;color:#fff;flex-shrink:0;">${ini}</div>
      
      <div style="flex:1;min-width:0;">
        ${isSelected ? `<div style="font-size:0.65rem;font-weight:800;color:#38bdf8;background:rgba(2,132,199,0.25);border:1px solid #0284c7;padding:1px 7px;border-radius:8px;margin-bottom:4px;display:inline-flex;align-items:center;gap:4px;letter-spacing:0.4px;"><i class="fa-solid fa-bullhorn fa-bounce"></i> PACIENTE SELECIONADO &bull; CHAMAR NA TV</div>` : ''}
        <div style="font-weight:700;font-size:0.95rem;color:var(--text-primary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${p.patientName || 'Paciente'}</div>
        <div style="display:flex;align-items:center;gap:6px;margin-top:4px;flex-wrap:wrap;">
          <span style="font-size:0.72rem;font-weight:700;background:${st.color}22;color:${st.color};border:1px solid ${st.color}44;padding:1px 7px;border-radius:20px;">${st.text}</span>
          <span style="font-size:0.72rem;color:var(--text-muted);"><i class="fa-solid ${col.icon}"></i> ${sub}</span>
        </div>
      </div>

      <div style="flex-shrink:0;text-align:right;">
        <span style="font-size:0.7rem;color:var(--text-muted);font-family:monospace;display:block;margin-bottom:4px;">#${String(idx+1).padStart(2,'0')}</span>
        <button type="button"
                onclick="event.stopPropagation(); window._tvQuickCall('${safeName}','${safeColor}')"
                class="${isSelected ? 'btn-tv-call-pulsing' : 'btn-tv-call-standard'}"
                style="${isSelected ? '' : 'background:rgba(139,92,246,0.18);border:1px solid rgba(139,92,246,0.45);color:#d8b4fe;padding:6px 12px;border-radius:16px;font-weight:700;font-size:0.78rem;cursor:pointer;display:flex;align-items:center;gap:5px;'}">
          <i class="fa-solid fa-bullhorn ${isSelected ? 'fa-bounce' : ''}"></i> ${isSelected ? 'CHAMAR NA TV' : 'Chamar'}
        </button>
      </div>
    </div>`;
  }).join('');
};

window._tvQuickCall = async function(patientName, manchesterColor, roomName = '') {
  await executeTVCall(patientName, roomName, manchesterColor);
};

window._tvDirectCall = async function(patientName, manchesterColor, roomName = '') {
  await executeTVCall(patientName, roomName, manchesterColor);
};

async function executeTVCall(patientName, roomName = '', manchesterColor = '') {
  const cleanName = (patientName || '').trim();
  if (!cleanName) {
    showCustomAlert({ title: 'Atenção', message: 'Por favor, informe o nome do paciente.', type: 'warning' });
    return false;
  }

  // Inferir sala se não fornecida
  if (!roomName) {
    let matched = null;
    try {
      const res = await apiFetch('/api/encounters');
      if (res.ok) {
        const data = await res.json();
        const arr = Array.isArray(data) ? data : (data.data || []);
        const cleanLower = cleanName.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        matched = arr.find(e => (e.patientName || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').includes(cleanLower));
      }
    } catch(e) {}
    const isTriaged = matched && (matched.status === 'Aguardando_Atendimento' || matched.status === 'Em_Atendimento' || !!matched.manchesterColor);
    roomName = isTriaged ? 'Consultório 01' : 'Sala de Triagem';
  }

  if (!manchesterColor) manchesterColor = 'Verde';

  try {
    const r = await apiFetch('/api/tv/call', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ patientName: cleanName, roomName, manchesterColor })
    });

    if (r && r.ok) {
      // 1) Beep de atenção via Web Audio API (DÓ-MI-SOL)
      try {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (AudioCtx) {
          const ctx = new AudioCtx();
          const playBeep = (freq, start, dur) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.type = 'sine';
            osc.frequency.value = freq;
            gain.gain.setValueAtTime(0, ctx.currentTime + start);
            gain.gain.linearRampToValueAtTime(0.4, ctx.currentTime + start + 0.04);
            gain.gain.linearRampToValueAtTime(0, ctx.currentTime + start + dur);
            osc.start(ctx.currentTime + start);
            osc.stop(ctx.currentTime + start + dur + 0.05);
          };
          playBeep(523.25, 0,    0.22);
          playBeep(659.25, 0.28, 0.22);
          playBeep(783.99, 0.56, 0.40);
        }
      } catch (_) {}

      // 2) Síntese de voz pt-BR após 1.2s
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const text = `Atenção. Paciente ${cleanName}, favor dirigir-se ao ${roomName}.`;
        const speak = () => {
          const utterance = new SpeechSynthesisUtterance(text);
          utterance.lang = 'pt-BR';
          utterance.rate = 0.88;
          utterance.pitch = 1.05;
          utterance.volume = 1;
          window.speechSynthesis.speak(utterance);
        };
        setTimeout(() => {
          if (window.speechSynthesis.getVoices().length === 0) {
            window.speechSynthesis.addEventListener('voiceschanged', speak, { once: true });
          } else {
            speak();
          }
        }, 1200);
      }
    }

    showCustomAlert({ title: 'Chamada Emitida!', message: `📢 ${cleanName} → ${roomName}`, type: 'success' });
    if (typeof window.showFlowCompletionNotification === 'function') {
      const isTriageRoom = (roomName || '').toLowerCase().includes('triag');
      const firstName = cleanName.split(' ')[0];
      window.showFlowCompletionNotification({
        actionTitle: isTriageRoom ? `🩺 Chamada Emitida para Triagem!` : `📢 Chamada Emitida no Painel TV!`,
        message: isTriageRoom
          ? `Paciente <strong>${cleanName}</strong> chamado(a) no Painel TV para a <strong>${roomName}</strong>.<br><br>👉 <strong>Clique no botão pulsante abaixo para abrir a Triagem Manchester e aferir os sinais vitais!</strong>`
          : `Paciente <strong>${cleanName}</strong> chamado(a) no Painel TV para o <strong>${roomName}</strong>.<br><br>👉 <strong>Clique no botão pulsante abaixo para abrir o ${roomName} e dar início ao Prontuário (PEP)!</strong>`,
        targetTab: isTriageRoom ? 'atendimento' : 'consultorios',
        targetTabLabel: isTriageRoom ? `🩺 Iniciar Triagem Manchester de ${firstName} ➔` : `👨‍⚕️ Abrir ${roomName} (${firstName}) ➔`,
        targetColumn: isTriageRoom ? 'col-triage' : roomName,
        targetPatientName: cleanName,
        targetStatus: isTriageRoom ? 'Aguardando_Triagem' : 'Aguardando_Atendimento',
        targetRoom: roomName,
        actionType: isTriageRoom ? 'start_triage' : 'open_consultorio',
        persistent: true
      });
    }

    loadTVCalls();
    if (typeof loadTVWaitingQueue === 'function') loadTVWaitingQueue();
    return true;
  } catch (e) {
    showCustomAlert({ title: 'Erro', message: 'Falha ao emitir chamada na TV.', type: 'danger' });
    return false;
  }
}
window.executeTVCall = executeTVCall;

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

async function openTVCallModal(preselectedName = '', preselectedColor = '', preselectedRoom = '') {
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

  // Resolução inteligente dos dados do paciente (cor e sala recomendada)
  let matchedPatient = null;
  const targetName = preselectedName || (typeof activePatientContext !== 'undefined' && activePatientContext ? activePatientContext.patientName || activePatientContext.fullName : '');

  if (targetName) {
    const cleanTarget = (targetName || '').trim().toLowerCase();
    matchedPatient = waitingPatients.find(p =>
      removeAccents((p.patientName || '').toLowerCase()).includes(removeAccents(cleanTarget))
    );
    if (!matchedPatient && typeof localDB !== 'undefined' && localDB.getFullDB) {
      try {
        const db = localDB.getFullDB();
        const encs = db.encounters || [];
        matchedPatient = encs.find(e =>
          removeAccents((e.patientName || '').toLowerCase()).includes(removeAccents(cleanTarget))
        );
      } catch(e) {}
    }
  }

  let effectiveColor = preselectedColor;
  let effectiveRoom = preselectedRoom;

  if (matchedPatient) {
    if (!effectiveColor && matchedPatient.manchesterColor) {
      effectiveColor = matchedPatient.manchesterColor;
    }
    const isTriaged = matchedPatient.status === 'Aguardando_Atendimento' || matchedPatient.status === 'Em_Atendimento' || !!matchedPatient.manchesterColor;
    if (!effectiveRoom) {
      effectiveRoom = isTriaged ? 'Consultório 01' : 'Sala de Triagem';
    }
  }

  if (!effectiveColor) effectiveColor = 'Verde';
  if (!effectiveRoom) effectiveRoom = 'Sala de Triagem';

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
    { v: 'Vermelho', l: 'Emergência (Vermelho)', c: '#dc2626' },
    { v: 'Azul',     l: 'Não Urgente (Azul)',   c: '#0284c7' },
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
         <span style="font-size:0.78rem;">Você ainda pode digitar o nome manualmente abaixo.</span>
       </div>`
    : waitingPatients.map(p => {
        const mKey = (p.manchesterColor || 'verde').toLowerCase().replace(/[^a-z]/g, '');
        const mColorMap = { vermelho: '#dc2626', laranja: '#ea580c', amarelo: '#d97706', verde: '#16a34a', azul: '#0284c7' };
        const bg = mColorMap[mKey] || '#16a34a';
        const initials = (p.patientName || '?').split(' ').slice(0,2).map(n => n[0]).join('').toUpperCase();
        const sLabel = statusLabel(p.status);
        return `<div class="tv-queue-patient-card" data-name="${(p.patientName||'').replace(/"/g,'&quot;')}" data-manchester="${p.manchesterColor||'Verde'}" data-status="${p.status||''}"
             style="background:#1e293b; border:1px solid #334155; border-left:4px solid ${bg}; border-radius:10px; padding:10px 14px; cursor:pointer; display:flex; align-items:center; gap:12px; transition:all 0.18s;"
             onmouseenter="this.style.background='rgba(2,132,199,0.12)'; this.style.borderColor='#0284c7';"
             onmouseleave="this.style.background='#1e293b'; this.style.borderColor='#334155'; this.style.borderLeftColor='${bg}';">
          <div style="width:38px;height:38px;border-radius:50%;background:${bg};display:flex;align-items:center;justify-content:center;font-weight:800;color:#fff;font-size:0.9rem;flex-shrink:0;">${initials}</div>
          <div style="flex:1;min-width:0;">
            <div style="font-weight:700;font-size:0.9rem;color:#f1f5f9;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${p.patientName||'Paciente'}</div>
            <div style="font-size:0.72rem;color:#94a3b8;margin-top:2px;">${sLabel} &bull; ${p.manchesterColor||'Sem Triagem'}</div>
          </div>
          <i class="fa-solid fa-hand-pointer" style="color:#0284c7;font-size:0.85rem;flex-shrink:0;"></i>
        </div>`;
      }).join('');

  overlay.innerHTML = `
    <div class="sync-modal-card" style="max-width: 540px; width: 95%; background: #0f172a; border: 1px solid #0284c7; border-radius: 16px; overflow: hidden; box-shadow: 0 20px 60px rgba(0,0,0,0.7); max-height: 90vh; display: flex; flex-direction: column;">
      <div style="background: linear-gradient(135deg, #0284c7, #0369a1); padding: 16px 20px; flex-shrink: 0;">
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
          <input type="text" id="tv-modal-patient-name" placeholder="Digite ou selecione acima..." value="${preselectedName || (matchedPatient ? matchedPatient.patientName : '')}" style="width: 100%; padding: 10px 12px; border-radius: 8px; background: #1e293b; color: #fff; border: 1px solid #334155; font-size: 0.9rem; box-sizing: border-box;" />
        </div>

        <!-- CONSULTÓRIO / SALA -->
        <div>
          <label style="display: block; font-size: 0.85rem; font-weight: 600; color: #94a3b8; margin-bottom: 6px;">
            <i class="fa-solid fa-door-open"></i> Sala de Destino / Consultório:
          </label>
          <select id="tv-modal-room" style="width: 100%; padding: 10px 12px; border-radius: 8px; background: #1e293b; color: #fff; border: 1px solid #334155;">
            <option value="Consultório 01" ${effectiveRoom === 'Consultório 01' ? 'selected' : ''}>Consultório 01 (Atendimento Médico)</option>
            <option value="Consultório 02" ${effectiveRoom === 'Consultório 02' ? 'selected' : ''}>Consultório 02 (Pediatria)</option>
            <option value="Consultório 03" ${effectiveRoom === 'Consultório 03' ? 'selected' : ''}>Consultório 03 (Ortopedia)</option>
            <option value="Sala de Triagem" ${effectiveRoom === 'Sala de Triagem' ? 'selected' : ''}>Sala de Triagem (Enfermagem)</option>
            <option value="Exames / Raio-X" ${effectiveRoom === 'Exames / Raio-X' ? 'selected' : ''}>Exames / Raio-X</option>
            <option value="Recepção" ${effectiveRoom === 'Recepção' ? 'selected' : ''}>Recepção</option>
          </select>
        </div>

        <!-- MANCHESTER -->
        <div>
          <label style="display: block; font-size: 0.85rem; font-weight: 600; color: #94a3b8; margin-bottom: 6px;">
            <i class="fa-solid fa-notes-medical"></i> Classificação Manchester:
          </label>
          <select id="tv-modal-color" style="width: 100%; padding: 10px 12px; border-radius: 8px; background: #1e293b; color: #fff; border: 1px solid #334155;">
            ${manchesterOpts.map(o => `<option value="${o.v}" ${o.v === effectiveColor ? 'selected' : ''}>${o.l}</option>`).join('')}
          </select>
        </div>

        <!-- BOTÕES -->
        <div style="display: flex; gap: 10px; margin-top: 4px;">
          <button id="btn-tv-modal-confirm" class="btn btn-primary" style="flex: 1; padding: 12px; background: linear-gradient(135deg, #0284c7, #0369a1); border: none; font-weight: 700; cursor: pointer; border-radius: 8px;">
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
  const roomEl = document.getElementById('tv-modal-room');

  // Destacar card pré-selecionado se informado
  const cleanTargetName = preselectedName || (matchedPatient ? matchedPatient.patientName : '');
  if (cleanTargetName) {
    const cleanPre = (cleanTargetName || '').trim().toLowerCase();
    document.querySelectorAll('.tv-queue-patient-card').forEach(card => {
      const cardName = (card.dataset.name || '').trim().toLowerCase();
      if (cardName && (cardName.includes(cleanPre) || cleanPre.includes(cardName))) {
        card.style.background = 'rgba(139,92,246,0.18)';
        card.style.borderColor = '#0284c7';
      }
    });
  }

  // Clique nos cards da fila seleciona o paciente e resolve sala e cor automaticamente
  document.querySelectorAll('.tv-queue-patient-card').forEach(card => {
    card.addEventListener('click', () => {
      document.querySelectorAll('.tv-queue-patient-card').forEach(c => {
        c.style.background = '#1e293b'; c.style.borderColor = '#334155';
      });
      card.style.background = 'rgba(139,92,246,0.18)';
      card.style.borderColor = '#0284c7';
      inputEl.value = card.dataset.name;
      const m = card.dataset.manchester;
      if (m && m !== 'Sem Triagem') colorEl.value = m;

      const pStatus = card.dataset.status;
      const isTriaged = pStatus === 'Aguardando_Atendimento' || pStatus === 'Em_Atendimento' || (m && m !== 'Sem Triagem');
      if (roomEl) {
        roomEl.value = isTriaged ? 'Consultório 01' : 'Sala de Triagem';
      }
    });
  });

  // Fechar clicando fora
  overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
  document.getElementById('btn-tv-modal-cancel').addEventListener('click', () => overlay.remove());

  document.getElementById('btn-tv-modal-confirm').addEventListener('click', async () => {
    const patientName = inputEl.value.trim();
    const roomName = document.getElementById('tv-modal-room').value;
    const manchesterColor = colorEl.value;

    const ok = await executeTVCall(patientName, roomName, manchesterColor);
    if (ok) overlay.remove();
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

window.openPrescriptionModal = async function(encounterId, patientName, patientId = '') {
  // Resolução inteligente do encontro clínico caso seja chamado por paciente ou leito
  if (typeof localDB !== 'undefined' && localDB.list) {
    const allEncounters = localDB.list('encounters') || [];
    const encMatch = allEncounters.find(e => 
      (encounterId && e.id === encounterId) ||
      (patientName && (e.patientName || '').trim().toLowerCase() === (patientName || '').trim().toLowerCase()) ||
      (patientId && e.patientId === patientId)
    );
    if (encMatch) {
      encounterId = encMatch.id;
      patientName = patientName || encMatch.patientName;
      patientId = patientId || encMatch.patientId;
    } else if (!encounterId || !encounterId.startsWith('enc-')) {
      const newEnc = {
        id: 'enc-' + Date.now(),
        patientId: patientId || 'P-' + Date.now(),
        patientName: patientName || 'Paciente em Observação',
        status: 'Em_Observacao',
        room: 'Observação (OBS-01)',
        created_at: new Date().toISOString()
      };
      localDB.save('encounters', newEnc);
      encounterId = newEnc.id;
    }
  }

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

          <div style="display: grid; grid-template-columns: 2fr 1fr 1fr 1fr 2fr; gap: 10px; margin-bottom: 10px;" id="rx-item-inputs">
            <div>
              <label style="font-size: 0.75rem; color: var(--text-muted); font-weight: 600; display: block; margin-bottom: 4px;">Medicamento</label>
              <input type="text" id="rx-med-name" class="form-input" placeholder="Ex: Dipirona Sódica" style="width: 100%; font-size: 0.83rem;">
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
                <option value="Se dor/febre">Se dor/febre</option>
                <option value="Dose Única">Dose Única</option>
              </select>
            </div>
            <div>
              <label style="font-size: 0.75rem; color: var(--text-muted); font-weight: 600; display: block; margin-bottom: 4px;">Instruções</label>
              <div style="display: flex; gap: 6px;">
                <input type="text" id="rx-med-notes" class="form-input" placeholder="Diluir em 100ml SF" style="flex: 1; font-size: 0.83rem;">
                <button type="button" id="btn-add-rx-item" class="btn btn-primary" style="padding: 0 12px; font-size: 0.8rem; height: 38px; border-radius: 8px;" title="Adicionar item à lista">
                  <i class="fa-solid fa-plus"></i>
                </button>
              </div>
            </div>
          </div>

          <!-- RASCUNHO DA TABELA DE MEDICAÇÕES -->
          <div style="background: var(--bg-tertiary); border: 1px solid var(--border-color); border-radius: 10px; padding: 10px; margin-top: 12px;">
            <div style="font-size: 0.8rem; font-weight: 700; color: var(--text-primary); margin-bottom: 8px;">Planilha da Prescrição Atual:</div>
            <div id="rx-draft-table" style="max-height: 140px; overflow-y: auto;">
              <div style="text-align: center; color: var(--text-muted); font-size: 0.8rem; padding: 14px;">Nenhum medicamento adicionado ainda. Preencha os campos acima e clique em (+).</div>
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

  // Autocomplete de Medicamentos (ANVISA/RENAME)
  if (!window.medicationsCatalog) {
    fetch('/assets/medicamentos.json')
      .then(res => res.json())
      .then(data => window.medicationsCatalog = data)
      .catch(err => console.error('Erro ao carregar medicamentos', err));
  }
  
  setTimeout(() => {
    const medNameInput = document.getElementById('rx-med-name');
    let acDropdown = document.getElementById('rx-med-autocomplete');
    if (!acDropdown) {
      acDropdown = document.createElement('div');
      acDropdown.id = 'rx-med-autocomplete';
      acDropdown.style.position = 'absolute';
      acDropdown.style.background = 'var(--bg-secondary)';
      acDropdown.style.border = '1px solid var(--border-color)';
      acDropdown.style.borderRadius = '8px';
      acDropdown.style.maxHeight = '200px';
      acDropdown.style.overflowY = 'auto';
      acDropdown.style.zIndex = '3600';
      acDropdown.style.width = '100%';
      acDropdown.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
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
        if (val.length < 2 || !window.medicationsCatalog) {
          acDropdown.style.display = 'none';
          return;
        }
        
        const matches = window.medicationsCatalog.filter(m => {
          return removeAccents(m.nome.toLowerCase()).includes(cleanVal);
        }).slice(0, 30);
        
        if (matches.length === 0) {
          acDropdown.style.display = 'none';
          return;
        }
        
        acDropdown.innerHTML = '';
        matches.forEach(m => {
          const item = document.createElement('div');
          item.style.padding = '8px 12px';
          item.style.cursor = 'pointer';
          item.style.borderBottom = '1px solid var(--border-color)';
          item.style.fontSize = '0.8rem';
          item.style.color = 'var(--text-primary)';
          item.innerHTML = `<strong>${m.nome}</strong> <span style="color:var(--text-muted); font-size:0.75rem;">- ${m.dose} (${m.via})</span>`;
          
          item.addEventListener('mouseover', () => item.style.background = 'var(--bg-tertiary)');
          item.addEventListener('mouseout', () => item.style.background = 'transparent');
          
          item.addEventListener('click', () => {
            medNameInput.value = m.nome;
            const doseInput = document.getElementById('rx-med-dose');
            const routeSelect = document.getElementById('rx-med-route');
            if (doseInput && !doseInput.value) doseInput.value = m.dose;
            if (routeSelect) {
              const opt = Array.from(routeSelect.options).find(o => o.value === m.via);
              if (opt) routeSelect.value = m.via;
            }
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

  const updateDraftTable = () => {
    const tableEl = document.getElementById('rx-draft-table');
    const saveBtn = document.getElementById('btn-save-rx');
    if (draftItems.length === 0) {
      tableEl.innerHTML = '<div style="text-align: center; color: var(--text-muted); font-size: 0.8rem; padding: 14px;">Nenhum medicamento adicionado ainda. Preencha os campos acima e clique em (+).</div>';
      saveBtn.disabled = true;
      return;
    }
    saveBtn.disabled = false;

    let html = `
      <table style="width: 100%; border-collapse: collapse; font-size: 0.8rem;">
        <thead>
          <tr style="border-bottom: 1px solid var(--border-color); text-align: left; color: var(--text-muted);">
            <th style="padding: 6px;">Medicamento</th>
            <th style="padding: 6px;">Dose</th>
            <th style="padding: 6px;">Via</th>
            <th style="padding: 6px;">Frequência</th>
            <th style="padding: 6px;">Instruções</th>
            <th style="padding: 6px; text-align: right;">Ação</th>
          </tr>
        </thead>
        <tbody>
    `;

    draftItems.forEach((item, idx) => {
      html += `
        <tr style="border-bottom: 1px solid var(--border-color);">
          <td style="padding: 6px; font-weight: 600; color: var(--text-primary);">${item.name}</td>
          <td style="padding: 6px; color: var(--text-secondary);">${item.dosage || '—'}</td>
          <td style="padding: 6px;"><span style="background: rgba(99,102,241,0.15); color: #a78bfa; padding: 2px 6px; border-radius: 4px; font-weight: 600;">${item.route}</span></td>
          <td style="padding: 6px; color: var(--text-secondary);">${item.frequency}</td>
          <td style="padding: 6px; color: var(--text-muted);">${item.instructions || '—'}</td>
          <td style="padding: 6px; text-align: right;">
            <button type="button" class="btn-remove-rx-draft" data-idx="${idx}" style="background: transparent; border: none; color: var(--danger-color); cursor: pointer;"><i class="fa-solid fa-trash"></i></button>
          </td>
        </tr>
      `;
    });

    let cdssHtml = '';
    if (typeof evaluatePrescriptionCDSS === 'function') {
      const medNames = draftItems.map(i => i.name).join(' ');
      const alerts = evaluatePrescriptionCDSS(medNames);
      if (alerts && alerts.length > 0) {
        const top = alerts[0];
        cdssHtml = `
          <div style="margin-top: 10px; padding: 10px 14px; border-radius: 10px; background: ${top.color || '#ef4444'}22; border: 1.5px solid ${top.color || '#ef4444'}; color: #ffffff;">
            <div style="font-size: 0.82rem; font-weight: 800; color: ${top.color || '#fca5a5'}; display: flex; align-items: center; gap: 6px;">
              <i class="fa-solid fa-triangle-exclamation"></i> ALERTA DE INTERAÇÃO MEDICAMENTOSA (${top.severity || 'Alerta'}): ${top.title}
            </div>
            <div style="font-size: 0.76rem; color: #cbd5e1; margin-top: 4px; line-height: 1.4;">${top.desc}</div>
            <div style="font-size: 0.75rem; color: #6ee7b7; font-weight: 700; margin-top: 4px;">💡 Conduta Recomendada: ${top.action}</div>
          </div>
        `;
      } else {
        cdssHtml = `
          <div style="margin-top: 10px; padding: 8px 12px; border-radius: 8px; background: rgba(16, 185, 129, 0.1); border: 1px solid rgba(16, 185, 129, 0.3); color: #6ee7b7; font-size: 0.78rem; display: flex; align-items: center; gap: 8px;">
            <i class="fa-solid fa-shield-check" style="font-size: 0.95rem; color: #34d399;"></i>
            <span><strong>Análise CDSS Concluída:</strong> Nenhuma contraindicação grave ou interação medicamentosa crítica detectada nesta prescrição.</span>
          </div>
        `;
      }
    }

    html += '</tbody></table>' + cdssHtml;
    tableEl.innerHTML = html;

    tableEl.querySelectorAll('.btn-remove-rx-draft').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const idx = Number(e.currentTarget.dataset.idx);
        draftItems.splice(idx, 1);
        updateDraftTable();
      });
    });
  };

  document.getElementById('btn-add-rx-item').onclick = () => {
    const name = document.getElementById('rx-med-name').value.trim();
    const dosage = document.getElementById('rx-med-dose').value.trim();
    const route = document.getElementById('rx-med-route').value;
    const frequency = document.getElementById('rx-med-freq').value;
    const instructions = document.getElementById('rx-med-notes').value.trim();

    if (!name) { alert('Digite o nome do medicamento.'); return; }

    draftItems.push({ name, dosage, route, frequency, instructions });
    document.getElementById('rx-med-name').value = '';
    document.getElementById('rx-med-dose').value = '';
    document.getElementById('rx-med-notes').value = '';
    updateDraftTable();
  };

  document.getElementById('btn-save-rx').onclick = async () => {
    if (draftItems.length === 0) return;
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
window.openTransferBedModal = async function(encounterId, patientName, clinicalContext = {}) {
  const activeCtx = (typeof window.getActivePatientContext === 'function') ? window.getActivePatientContext() : null;
  const realPatientName = (patientName && patientName !== 'Paciente') 
    ? patientName 
    : (activeCtx ? (activeCtx.fullName || activeCtx.patientName) : null) || (typeof encounterId === 'string' && isNaN(encounterId) && !encounterId.startsWith('ENC-') ? encounterId : 'Paciente');

  if (realPatientName && typeof window.setActivePatientContext === 'function') {
    const curCtx = activeCtx || {};
    window.setActivePatientContext({
      ...curCtx,
      fullName: realPatientName,
      patientName: realPatientName,
      status: 'Aguardando_Leito'
    });
  }

  const encounters = (typeof localDB !== 'undefined' && localDB.list) ? (localDB.list('encounters') || []) : [];
  const enc = encounters.find(e => 
    String(e.id) === String(encounterId) || 
    (realPatientName && e.patientName && e.patientName.toLowerCase().trim() === realPatientName.toLowerCase().trim())
  ) || {};

  const manchesterColor = clinicalContext.manchesterColor || enc.manchesterColor || (activeCtx ? activeCtx.manchesterColor : 'Amarelo') || 'Amarelo';
  const cidOrDiagnosis = clinicalContext.cid || clinicalContext.assessmentContent || enc.assessmentContent || enc.cid || (activeCtx ? activeCtx.cid : '') || 'Internação indicada por conduta médica';
  const planNotes = clinicalContext.planContent || enc.planContent || (activeCtx ? activeCtx.planContent : '') || 'Acomodação em leito hospitalar para monitoramento e suporte clínico.';

  const manchesterMap = {
    Vermelho: { bg: '#ef4444', text: '#fff', label: 'Emergência (Imediato)', icon: 'fa-triangle-exclamation' },
    Laranja: { bg: '#f97316', text: '#fff', label: 'Muito Urgente (10 min)', icon: 'fa-circle-exclamation' },
    Amarelo: { bg: '#eab308', text: '#000', label: 'Urgente (60 min)', icon: 'fa-circle-info' },
    Verde: { bg: '#22c55e', text: '#fff', label: 'Pouco Urgente (120 min)', icon: 'fa-circle-check' },
    Azul: { bg: '#3b82f6', text: '#fff', label: 'Não Urgente (240 min)', icon: 'fa-circle' }
  };
  const mInfo = manchesterMap[manchesterColor] || manchesterMap.Amarelo;

  // Detecção inteligente de setor sugerido baseado no quadro clínico
  const textCheck = (cidOrDiagnosis + ' ' + planNotes + ' ' + (enc.notes || '')).toLowerCase();
  let suggestedSector = 'Enfermaria';
  let sectorBadgeBg = 'rgba(56, 189, 248, 0.15)';
  let sectorBadgeColor = '#38bdf8';
  let sectorIcon = 'fa-bed';
  
  if (textCheck.includes('uti') || textCheck.includes('choque') || textCheck.includes('sepse') || textCheck.includes('infarto') || textCheck.includes('intub') || textCheck.includes('grave') || manchesterColor === 'Vermelho') {
    suggestedSector = 'UTI Adulto';
    sectorBadgeBg = 'rgba(239, 68, 68, 0.18)';
    sectorBadgeColor = '#f87171';
    sectorIcon = 'fa-heart-pulse';
  } else if (textCheck.includes('pediat') || textCheck.includes('criança') || textCheck.includes('utip')) {
    suggestedSector = 'Pediatria';
    sectorBadgeBg = 'rgba(244, 114, 182, 0.18)';
    sectorBadgeColor = '#f472b6';
    sectorIcon = 'fa-child-reaching';
  } else if (textCheck.includes('isolar') || textCheck.includes('isolamento') || textCheck.includes('covid') || textCheck.includes('tuberculose')) {
    suggestedSector = 'Isolamento';
    sectorBadgeBg = 'rgba(251, 191, 36, 0.18)';
    sectorBadgeColor = '#fbbf24';
    sectorIcon = 'fa-shield-virus';
  } else if (textCheck.includes('gestan') || textCheck.includes('parto') || textCheck.includes('materni')) {
    suggestedSector = 'Maternidade';
    sectorBadgeBg = 'rgba(232, 121, 249, 0.18)';
    sectorBadgeColor = '#e879f9';
    sectorIcon = 'fa-baby';
  } else if (textCheck.includes('observa') || textCheck.includes('12h')) {
    suggestedSector = 'Observação';
    sectorBadgeBg = 'rgba(167, 139, 250, 0.18)';
    sectorBadgeColor = '#a78bfa';
    sectorIcon = 'fa-clock';
  }

  let modal = document.getElementById('modal-transfer-bed-drawer');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'modal-transfer-bed-drawer';
    modal.className = 'modal-overlay';
    modal.style.zIndex = '3600';
    document.body.appendChild(modal);
  }

  modal.innerHTML = `
    <div class="modal-content" style="max-width: 600px; width: 95vw; padding: 26px; border-radius: 20px; background: var(--bg-secondary, #121026); border: 1.5px solid rgba(99,102,241,0.4); box-shadow: 0 25px 70px rgba(0,0,0,0.75);">
      
      <!-- Modal Header -->
      <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid rgba(255,255,255,0.08); padding-bottom: 16px; margin-bottom: 20px;">
        <div style="display: flex; align-items: center; gap: 12px;">
          <div style="width: 44px; height: 44px; border-radius: 12px; background: linear-gradient(135deg, rgba(2,132,199,0.2), rgba(99,102,241,0.2)); border: 1px solid rgba(56,189,248,0.4); display: flex; align-items: center; justify-content: center; color: #38bdf8; font-size: 1.3rem;">
            <i class="fa-solid fa-bed-pulse"></i>
          </div>
          <div>
            <h3 style="margin: 0; font-size: 1.22rem; font-weight: 800; color: #ffffff;">Alocação &amp; Internação em Leito</h3>
            <span style="font-size: 0.82rem; color: #94a3b8;">Transferência clínica do paciente para acomodação hospitalar</span>
          </div>
        </div>
        <button class="btn-close" onclick="document.getElementById('modal-transfer-bed-drawer').style.display='none'" style="background: rgba(255,255,255,0.08); border: none; color: #94a3b8; width: 32px; height: 32px; border-radius: 50%; cursor: pointer; display: flex; align-items: center; justify-content: center;"><i class="fa-solid fa-xmark"></i></button>
      </div>

      <div class="modal-body">
        <!-- Card Paciente em Foco com Contexto Clínico -->
        <div style="background: linear-gradient(135deg, rgba(30, 27, 75, 0.7), rgba(15, 23, 42, 0.8)); border: 1.5px solid rgba(56, 189, 248, 0.4); border-left: 5px solid ${mInfo.bg}; border-radius: 14px; padding: 18px; margin-bottom: 20px; box-shadow: 0 8px 24px rgba(0,0,0,0.4); position: relative;">
          
          <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 10px; margin-bottom: 12px; flex-wrap: wrap;">
            <div>
              <div style="font-size: 0.72rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.6px; color: #38bdf8; margin-bottom: 4px; display: flex; align-items: center; gap: 6px;">
                <span style="display: inline-block; width: 8px; height: 8px; border-radius: 50%; background: #38bdf8; box-shadow: 0 0 8px #38bdf8; animation: pulse 1.5s infinite;"></span>
                ⚡ Paciente em Foco para Internação
              </div>
              <div style="font-size: 1.3rem; font-weight: 800; color: #ffffff; display: flex; align-items: center; gap: 8px;">
                <i class="fa-solid fa-hospital-user" style="color: #38bdf8; font-size: 1.15rem;"></i> ${realPatientName}
              </div>
            </div>

            <!-- Badge Manchester -->
            <span style="background: ${mInfo.bg}; color: ${mInfo.text}; font-size: 0.72rem; font-weight: 800; padding: 4px 10px; border-radius: 12px; display: inline-flex; align-items: center; gap: 5px; box-shadow: 0 2px 8px rgba(0,0,0,0.3);">
              <i class="fa-solid ${mInfo.icon}"></i> Triagem ${manchesterColor}
            </span>
          </div>

          <!-- Quadro Clínico Resumido -->
          <div style="background: rgba(0,0,0,0.25); border: 1px solid rgba(255,255,255,0.06); border-radius: 10px; padding: 12px; margin-bottom: 12px; display: flex; flex-direction: column; gap: 6px;">
            <div style="font-size: 0.84rem; color: #e2e8f0; display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
              <strong style="color: #a5b4fc;"><i class="fa-solid fa-stethoscope"></i> Diagnóstico / Hipótese:</strong> 
              <span style="color: #ffffff; font-weight: 600;">${cidOrDiagnosis}</span>
            </div>
            ${planNotes ? `
              <div style="font-size: 0.78rem; color: #94a3b8; display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
                <strong style="color: #cbd5e1;"><i class="fa-solid fa-notes-medical"></i> Conduta PEP:</strong> 
                <span>${planNotes}</span>
              </div>
            ` : ''}
          </div>

          <!-- Indicação Clínica Recomendada -->
          <div style="display: flex; align-items: center; gap: 8px; background: ${sectorBadgeBg}; border: 1px solid ${sectorBadgeColor}; border-radius: 10px; padding: 8px 12px; font-size: 0.82rem; font-weight: 700; color: #ffffff;">
            <i class="fa-solid ${sectorIcon}" style="color: ${sectorBadgeColor}; font-size: 1rem;"></i>
            <span>Setor Clínico Recomendado: <strong style="color: ${sectorBadgeColor};">${suggestedSector}</strong></span>
          </div>
        </div>

        <!-- Seletor de Leitos Inteligente -->
        <div class="form-group" style="margin-bottom: 22px;">
          <label style="font-size: 0.88rem; font-weight: 700; color: #ffffff; display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
            <span><i class="fa-solid fa-bed" style="color: #38bdf8;"></i> Selecione o Leito Hospitalar Disponível *</span>
            <span id="transfer-beds-count-badge" style="font-size: 0.74rem; color: #4ade80; font-weight: 600;"></span>
          </label>
          <select id="transfer-bed-select" class="form-input" style="width: 100%; font-size: 0.92rem; padding: 12px; border-radius: 10px; background: #19142c; color: #ffffff; border: 1.5px solid rgba(99,102,241,0.4);">
            <option value="">Carregando leitos disponíveis...</option>
          </select>
          <div style="font-size: 0.75rem; color: #94a3b8; margin-top: 6px;">
            <i class="fa-solid fa-circle-info" style="color: #38bdf8;"></i> Os leitos indicados para o quadro clínico do paciente aparecem priorizados no topo.
          </div>
        </div>

        <!-- Botões de Ação -->
        <div style="display: flex; gap: 12px; justify-content: flex-end;">
          <button class="btn btn-secondary" onclick="document.getElementById('modal-transfer-bed-drawer').style.display='none'" style="padding: 10px 20px; border-radius: 10px; font-weight: 600;">
            Cancelar
          </button>
          <button class="btn btn-primary" id="btn-confirm-transfer-bed" style="background: linear-gradient(135deg, #10b981, #059669); border: none; padding: 10px 24px; border-radius: 10px; font-weight: 800; font-size: 0.9rem; box-shadow: 0 4px 16px rgba(16,185,129,0.35); display: flex; align-items: center; gap: 8px;">
            <i class="fa-solid fa-bed"></i> Confirmar Internação &amp; Alocar Leito ➔
          </button>
        </div>
      </div>
    </div>
  `;

  modal.style.display = 'flex';

  const loadVagoBeds = async () => {
    const select = document.getElementById('transfer-bed-select');
    const confirmBtn = document.getElementById('btn-confirm-transfer-bed');
    if (!select || !confirmBtn) return;

    try {
      let beds = await cachedApiGet('/api/beds', 'beds');
      if (!Array.isArray(beds)) beds = [];

      // Se a base de dados não tiver leitos (ex: banco limpo), inicializa os 22 leitos padrão automaticamente
      if (beds.length === 0 && typeof localDB !== 'undefined' && localDB.getDefaultBeds) {
        const defaultBeds = localDB.getDefaultBeds();
        const currentDb = localDB.getFullDB();
        currentDb.beds = defaultBeds;
        localDB.saveFullDB(currentDb);
        beds = defaultBeds;
        if (typeof invalidateCacheForUrl === 'function') {
          invalidateCacheForUrl('/api/beds');
        }
      }

      let vagoBeds = beds.filter(b => b.status === 'Vago');

      // Ordenar leitos colocando os do setor recomendado no topo
      vagoBeds.sort((a, b) => {
        const aIsMatch = (a.sector === suggestedSector || (a.type && a.type.includes(suggestedSector))) ? 1 : 0;
        const bIsMatch = (b.sector === suggestedSector || (b.type && b.type.includes(suggestedSector))) ? 1 : 0;
        if (bIsMatch !== aIsMatch) return bIsMatch - aIsMatch;
        return (a.bedNumber || a.number || '').localeCompare(b.bedNumber || b.number || '');
      });

      if (vagoBeds.length === 0) {
        select.innerHTML = '<option value="">Nenhum leito vago disponível no momento</option>';
        confirmBtn.disabled = true;

        let actionBox = document.getElementById('bed-modal-auto-seed-box');
        if (!actionBox) {
          actionBox = document.createElement('div');
          actionBox.id = 'bed-modal-auto-seed-box';
          actionBox.style.cssText = 'margin-top: 12px; padding: 12px; background: rgba(2,132,199,0.12); border: 1px dashed rgba(2,132,199,0.3); border-radius: 10px; text-align: center;';
          actionBox.innerHTML = `
            <div style="font-size: 0.8rem; color: #bae6fd; margin-bottom: 8px;">Deseja carregar a estrutura de 22 leitos padrão do hospital?</div>
            <button type="button" id="btn-modal-load-default-beds" class="btn" style="background: linear-gradient(135deg, #0284c7, #0369a1); color: #fff; border: none; padding: 8px 16px; font-size: 0.8rem; font-weight: 700; border-radius: 8px; cursor: pointer;">
              <i class="fa-solid fa-arrows-rotate"></i> Carregar 22 Leitos Hospitalares
            </button>
          `;
          select.parentElement.appendChild(actionBox);
          document.getElementById('btn-modal-load-default-beds')?.addEventListener('click', async () => {
            if (typeof localDB !== 'undefined' && localDB.getDefaultBeds) {
              const defaultBeds = localDB.getDefaultBeds();
              const currentDb = localDB.getFullDB();
              currentDb.beds = defaultBeds;
              localDB.saveFullDB(currentDb);
              if (typeof invalidateCacheForUrl === 'function') invalidateCacheForUrl('/api/beds');
              actionBox.remove();
              await loadVagoBeds();
            }
          });
        }
      } else {
        confirmBtn.disabled = false;
        const autoBox = document.getElementById('bed-modal-auto-seed-box');
        if (autoBox) autoBox.remove();

        select.innerHTML = '<option value="">Selecione o leito...</option>' + 
          vagoBeds.map(b => {
            const isMatch = (b.sector === suggestedSector || (b.type && b.type.includes(suggestedSector)));
            const tag = isMatch ? '⭐ [INDICADO] ' : '';
            return `<option value="${b.id}">${tag}Leito ${b.bedNumber || b.number} — Setor: ${b.sector} (${b.ward || b.type || 'Geral'})</option>`;
          }).join('');

        // Pré-selecionar o primeiro leito recomendado se existir
        const firstMatch = vagoBeds.find(b => b.sector === suggestedSector || (b.type && b.type.includes(suggestedSector)));
        if (firstMatch) {
          select.value = firstMatch.id;
        } else if (vagoBeds.length > 0) {
          select.value = vagoBeds[0].id;
        }

        const countBadge = document.getElementById('transfer-beds-count-badge');
        if (countBadge) countBadge.textContent = `${vagoBeds.length} leito(s) vago(s)`;
      }
    } catch(e) {
      console.error('Erro ao carregar leitos vagos:', e);
      select.innerHTML = '<option value="">Erro ao carregar leitos.</option>';
    }
  };

  await loadVagoBeds();

  document.getElementById('btn-confirm-transfer-bed').onclick = async () => {
    const bedId = document.getElementById('transfer-bed-select').value;
    if (!bedId) { alert('Selecione um leito vago para a internação.'); return; }

    try {
      const res = await apiFetch(`/api/encounters/${encounterId}/transfer-to-bed`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bedId, patientName: realPatientName })
      });
      if (res.ok) {
        modal.style.display = 'none';

        const allBeds = (typeof localDB !== 'undefined' && localDB.list) ? (localDB.list('beds') || []) : [];
        const bedObj = allBeds.find(b => String(b.id) === String(bedId) || b.bedNumber === bedId || b.number === bedId);
        const bedNum = bedObj ? (bedObj.bedNumber || bedObj.number) : bedId;
        const bedSec = bedObj ? (bedObj.sector || bedObj.type || 'Internação') : 'Internação';

        if (typeof invalidateCacheForUrl === 'function') {
          invalidateCacheForUrl('/api/beds');
          invalidateCacheForUrl('/api/encounters');
        }

        window._highlightPatientName = realPatientName;

        if (typeof window.setActivePatientContext === 'function') {
          const curCtx = (typeof window.getActivePatientContext === 'function') ? window.getActivePatientContext() : {};
          window.setActivePatientContext({
            ...curCtx,
            fullName: realPatientName,
            patientName: realPatientName,
            status: 'Internado',
            bed: bedNum,
            bedNumber: bedNum,
            bedId: bedObj ? bedObj.id : bedId,
            sector: bedSec,
            ward: bedSec
          });
        }

        // Navega diretamente e suavemente para o Mapa de Leitos
        if (typeof window.switchTab === 'function') {
          window.switchTab('leitos');
        }

        // Atualiza a notificação do Guia Flutuante diretamente para a fase de Leitos
        if (typeof window.showFlowCompletionNotification === 'function') {
          window.showFlowCompletionNotification({
            actionTitle: `Acomodado no Leito ${bedNum}`,
            message: `O paciente <strong>${realPatientName}</strong> foi acomodado com sucesso no Leito ${bedNum} (${bedSec}). Prossiga com a evolução diária no PEP.`,
            targetTab: 'leitos',
            targetTabLabel: 'Evolução no PEP',
            targetPatientName: realPatientName,
            targetStatus: 'Internado',
            bedId: bedObj ? bedObj.id : bedId,
            bedNumber: bedNum
          });
        } else {
          showToast(`🛌 Paciente ${realPatientName} acomodado(a) no Leito ${bedNum}!`);
        }

        setTimeout(() => {
          if (typeof window.executePatientHighlight === 'function') {
            window.executePatientHighlight(realPatientName);
          }
        }, 300);
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
window.openTVCallModal = openTVCallModal;
