// ─── MÓDULO DA ABA ATENDIMENTOS & TRIAGEM MANCHESTER (HEALTH NEXUS v2.7.2) ──────
import { state } from '../state.js';
import { apiFetch, removeAccents } from '../modules/api.js';
import { showToast, showCustomAlert } from '../modules/ui.js';
import { realtimeHub } from '../modules/realtime.js';
import { setActivePatientContext, renderPatientJourneyStepper } from '../modules/journey.js';
import { getRolePermissions } from '../modules/auth.js';
import { calculateMEWS, generateWhatsAppClinicalMessage, sendToWhatsApp } from '../modules/clinicalAI.js';

export function renderAttendanceTab(contentArea) {
  contentArea.innerHTML = `
    <div class="tab-section active" id="atendimento-root">
      <!-- Header do Módulo -->
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px; flex-wrap:wrap; gap:12px;">
        <div>
          <h2 style="font-family:'Outfit'; font-weight:700; font-size:1.4rem; margin:0; color:var(--text-primary);">
            <i class="fa-solid fa-hospital-user" style="color:var(--color-primary);"></i> Central de Atendimentos
          </h2>
          <p style="margin:4px 0 0; font-size:0.82rem; color:var(--text-muted);">Gestão do fluxo clínico em tempo real</p>
        </div>
        <div style="display:flex; gap:10px; align-items:center; flex-wrap:wrap;">
          <div id="atd-kpi-bar" style="display:flex; gap:8px; align-items:center;">
            <div id="card-kpi-triage" class="atd-metric-card" onclick="window.filterKanbanColumn('triage')" title="Filtrar por Fila de Triagem" style="background:rgba(139,92,246,0.12); color:#a78bfa; border:1px solid rgba(139,92,246,0.3); border-radius:20px; height:38px; padding:0 14px; display:flex; align-items:center; gap:8px; font-size:0.82rem; font-weight:600; cursor:pointer;">
              <i class="fa-solid fa-stethoscope" style="font-size:0.9rem; color:#8b5cf6;"></i>
              <strong id="kpi-triagem-num" style="font-size:0.95rem; font-weight:800; color:#a78bfa;">0</strong>
              <span>Triagem</span>
            </div>

            <div id="card-kpi-waiting" class="atd-metric-card" onclick="window.filterKanbanColumn('waiting')" title="Filtrar por Pacientes Aguardando Médico" style="background:rgba(245,158,11,0.12); color:#fbbf24; border:1px solid rgba(245,158,11,0.3); border-radius:20px; height:38px; padding:0 14px; display:flex; align-items:center; gap:8px; font-size:0.82rem; font-weight:600; cursor:pointer;">
              <i class="fa-solid fa-hourglass-half" style="font-size:0.9rem; color:#f59e0b;"></i>
              <strong id="kpi-aguardando-num" style="font-size:0.95rem; font-weight:800; color:#fbbf24;">0</strong>
              <span>Ag. Médico</span>
            </div>

            <div id="card-kpi-active" class="atd-metric-card" onclick="window.filterKanbanColumn('active')" title="Filtrar por Atendimentos em Consulta" style="background:rgba(16,185,129,0.12); color:#34d399; border:1px solid rgba(16,185,129,0.3); border-radius:20px; height:38px; padding:0 14px; display:flex; align-items:center; gap:8px; font-size:0.82rem; font-weight:600; cursor:pointer;">
              <i class="fa-solid fa-user-doctor" style="font-size:0.9rem; color:#10b981;"></i>
              <strong id="kpi-consulta-num" style="font-size:0.95rem; font-weight:800; color:#34d399;">0</strong>
              <span>Em Consulta</span>
            </div>

            <div id="card-kpi-all" class="atd-metric-card active-filter" onclick="window.filterKanbanColumn('all')" title="Exibir Todas as Colunas" style="background:rgba(255,255,255,0.05); color:var(--text-primary); border:1px solid rgba(255,255,255,0.15); border-radius:20px; height:38px; padding:0 14px; display:flex; align-items:center; gap:8px; font-size:0.82rem; font-weight:600; cursor:pointer;">
              <i class="fa-solid fa-layer-group" style="font-size:0.85rem; color:var(--text-muted);"></i>
              <span>Ver Todos</span>
            </div>
          </div>
          <button id="btn-open-admission-panel" class="btn btn-primary" style="font-size:0.85rem; padding:8px 14px;">
            <i class="fa-solid fa-plus"></i> Nova Admissão
          </button>
          <button id="btn-show-history" class="btn" style="font-size:0.85rem; padding:8px 14px; background:var(--bg-tertiary); border-color:var(--border-color); color:var(--text-secondary);">
            <i class="fa-solid fa-clock-rotate-left"></i> Histórico
          </button>
        </div>
      </div>

      <!-- Container Dinâmico da Linha de Cuidado Guiada (Patient Journey Stepper) -->
      <div id="atd-journey-stepper-container"></div>

      <!-- Painel Kanban -->
      <div style="display:grid; grid-template-columns:repeat(3,1fr); gap:16px; align-items:start;">
        <!-- Coluna Triagem -->
        <div style="background:var(--bg-secondary); border-radius:var(--radius-lg); border:1px solid var(--border-color); overflow:hidden;">
          <div style="display:flex; justify-content:space-between; align-items:center; padding:12px 16px; background:var(--bg-tertiary); border-bottom:1px solid var(--border-color); border-top:3px solid #8b5cf6;">
            <span style="font-size:0.85rem; font-weight:700; color:var(--text-primary);"><i class="fa-solid fa-user-nurse" style="color:#8b5cf6;"></i> Aguardando Triagem</span>
            <span id="count-triage" style="background:rgba(139,92,246,0.2); color:#8b5cf6; font-size:0.72rem; font-weight:700; padding:2px 8px; border-radius:12px;">0</span>
          </div>
          <div id="col-triage" style="padding:12px; min-height:200px; display:flex; flex-direction:column; gap:10px;">
            <div style="text-align:center; color:var(--text-muted); padding:30px 16px; font-size:0.82rem;"><i class="fa-solid fa-check-circle" style="color:#8b5cf6; font-size:1.5rem; display:block; margin-bottom:8px;"></i>Fila vazia</div>
          </div>
        </div>

        <!-- Coluna Aguardando Médico -->
        <div style="background:var(--bg-secondary); border-radius:var(--radius-lg); border:1px solid var(--border-color); overflow:hidden;">
          <div style="display:flex; justify-content:space-between; align-items:center; padding:12px 16px; background:var(--bg-tertiary); border-bottom:1px solid var(--border-color); border-top:3px solid #f59e0b;">
            <span style="font-size:0.85rem; font-weight:700; color:var(--text-primary);"><i class="fa-solid fa-stethoscope" style="color:#f59e0b;"></i> Aguardando Médico</span>
            <span id="count-waiting" style="background:rgba(245,158,11,0.2); color:#f59e0b; font-size:0.72rem; font-weight:700; padding:2px 8px; border-radius:12px;">0</span>
          </div>
          <div id="col-waiting" style="padding:12px; min-height:200px; display:flex; flex-direction:column; gap:10px;">
            <div style="text-align:center; color:var(--text-muted); padding:30px 16px; font-size:0.82rem;"><i class="fa-solid fa-check-circle" style="color:#f59e0b; font-size:1.5rem; display:block; margin-bottom:8px;"></i>Nenhum aguardando</div>
          </div>
        </div>

        <!-- Coluna Em Atendimento -->
        <div style="background:var(--bg-secondary); border-radius:var(--radius-lg); border:1px solid var(--border-color); overflow:hidden;">
          <div style="display:flex; justify-content:space-between; align-items:center; padding:12px 16px; background:var(--bg-tertiary); border-bottom:1px solid var(--border-color); border-top:3px solid #10b981;">
            <span style="font-size:0.85rem; font-weight:700; color:var(--text-primary);"><i class="fa-solid fa-user-doctor" style="color:#10b981;"></i> Em Atendimento</span>
            <span id="count-active" style="background:rgba(16,185,129,0.2); color:#10b981; font-size:0.72rem; font-weight:700; padding:2px 8px; border-radius:12px;">0</span>
          </div>
          <div id="col-active" style="padding:12px; min-height:200px; display:flex; flex-direction:column; gap:10px;">
            <div style="text-align:center; color:var(--text-muted); padding:30px 16px; font-size:0.82rem;"><i class="fa-solid fa-check-circle" style="color:#10b981; font-size:1.5rem; display:block; margin-bottom:8px;"></i>Nenhum em atendimento</div>
          </div>
        </div>
      </div>

      <!-- Painel de Admissão (slide-in drawer) -->
      <div id="admission-panel" style="display:none; position:fixed; top:0; right:0; width:420px; max-width:100vw; height:100vh; background:var(--bg-secondary); border-left:1px solid var(--border-color); z-index:1050; box-shadow:-6px 0 24px rgba(0,0,0,0.3); flex-direction:column; transform:translateX(100%); transition:transform 0.35s cubic-bezier(0.4,0,0.2,1);">
        <div style="display:flex; justify-content:space-between; align-items:center; padding:18px 20px; border-bottom:1px solid var(--border-color); background:var(--bg-tertiary);">
          <h3 style="margin:0; font-family:'Outfit'; font-weight:700; font-size:1.05rem;"><i class="fa-solid fa-hospital-user" style="color:var(--color-primary);"></i> Nova Admissão</h3>
          <button id="btn-close-admission-panel" style="background:none; border:none; color:var(--text-secondary); cursor:pointer; font-size:1.2rem; padding:4px;"><i class="fa-solid fa-xmark"></i></button>
        </div>
        <div style="padding:18px 20px; flex:1; overflow-y:auto;">
          <div class="search-wrapper" style="margin-bottom:12px;">
            <i class="fa-solid fa-magnifying-glass search-icon"></i>
            <input type="text" id="adm-search-input" class="search-input" placeholder="Buscar por nome ou CPF...">
          </div>
          <div id="adm-patient-list" style="max-height:260px; overflow-y:auto; border:1px solid var(--border-color); border-radius:var(--radius-md); margin-bottom:16px;">
            <div style="text-align:center; color:var(--text-muted); padding:20px; font-size:0.85rem;">Carregando...</div>
          </div>
          <div id="adm-selected-info" style="display:none; background:rgba(0,100,255,0.07); border:1px solid rgba(0,100,255,0.2); border-radius:var(--radius-md); padding:14px; margin-bottom:16px;">
            <div style="font-size:0.75rem; color:var(--text-secondary); margin-bottom:4px;">Paciente selecionado:</div>
            <div id="adm-selected-name" style="font-weight:700; color:var(--color-primary); font-size:1rem;"></div>
            <div id="adm-selected-cpf" style="font-size:0.75rem; color:var(--text-secondary); margin-top:4px;"></div>
          </div>
          <input type="hidden" id="selected-patient-id">
          <div style="display:flex; gap:10px; margin-bottom:12px;">
            <button id="btn-admit-urgencia" class="btn btn-primary" style="flex:1; font-size:0.85rem;" disabled>
              <i class="fa-solid fa-truck-medical"></i> Urgência (PS)
            </button>
            <button id="btn-admit-ambulatorio" class="btn" style="flex:1; font-size:0.85rem; background:var(--bg-tertiary); border-color:var(--border-color); color:var(--text-primary);" disabled>
              <i class="fa-solid fa-user-doctor"></i> Ambulatório
            </button>
          </div>
          <p style="font-size:0.75rem; color:var(--text-muted); line-height:1.5; border-top:1px solid var(--border-color); padding-top:12px; margin-top:4px;">
            <i class="fa-solid fa-circle-info"></i> Urgência vai para triagem Manchester. Ambulatório vai direto para fila médica.
          </p>
        </div>
      </div>
      <div id="admission-overlay" style="display:none; position:fixed; inset:0; background:rgba(0,0,0,0.45); z-index:1049;"></div>

      <!-- Modal de Triagem -->
      <div id="triage-modal" class="modal-overlay" style="display:none;">
        <div class="modal-content" style="max-width:580px; width:95vw; max-height:92vh; overflow-y:auto;">
          <div class="modal-header">
            <h3><i class="fa-solid fa-user-nurse" style="color:#8b5cf6;"></i> Triagem Manchester</h3>
            <button type="button" class="modal-close" id="close-triage-modal"><i class="fa-solid fa-xmark"></i></button>
          </div>
          <div class="modal-body">
            <form id="triage-form">
              <input type="hidden" id="triage-encounter-id">
              <div style="background:rgba(139,92,246,0.08); padding:12px; border-radius:var(--radius-md); border:1px solid rgba(139,92,246,0.2); margin-bottom:20px;">
                <span style="font-size:0.75rem; color:var(--text-secondary); display:block; margin-bottom:2px;">Paciente:</span>
                <strong id="triage-patient-name" style="font-size:1.05rem; color:var(--text-primary);"></strong>
              </div>
              <h4 style="font-family:'Outfit'; font-weight:600; font-size:0.9rem; margin-bottom:12px; color:var(--text-primary); border-left:3px solid #8b5cf6; padding-left:8px;">Sinais Vitais</h4>
              <div class="form-row">
                <div class="form-group"><label class="form-label">* Pressão Arterial (mmHg):</label><input type="text" id="triage-pa" class="form-input" required placeholder="120/80"></div>
                <div class="form-group"><label class="form-label">* Temperatura (°C):</label><input type="text" id="triage-temp" class="form-input" required placeholder="36.8" inputmode="decimal"></div>
              </div>
              <div class="form-row">
                <div class="form-group"><label class="form-label">Freq. Cardíaca (bpm):</label><input type="number" id="triage-fc" class="form-input" min="30" max="220" placeholder="80"></div>
                <div class="form-group"><label class="form-label">Saturação O₂ (%):</label><input type="number" id="triage-spo2" class="form-input" min="50" max="100" placeholder="98"></div>
              </div>
              <div class="form-row">
                <div class="form-group"><label class="form-label">Peso (kg):</label><input type="text" id="triage-peso" class="form-input" placeholder="70.0" inputmode="decimal"></div>
                <div class="form-group"><label class="form-label">Glicemia (mg/dL):</label><input type="number" id="triage-glicemia" class="form-input" min="30" max="700" placeholder="100"></div>
              </div>

              <!-- Card Dinâmico de MEWS e Sinais Vitais -->
              <div id="triage-mews-preview" style="background: rgba(99, 102, 241, 0.08); border: 1px solid rgba(99, 102, 241, 0.25); border-radius: 10px; padding: 10px 14px; margin: 12px 0; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px;">
                <div style="display: flex; align-items: center; gap: 8px;">
                  <i class="fa-solid fa-heart-pulse" style="color: #818cf8;"></i>
                  <span style="font-size: 0.8rem; color: var(--text-primary);">Escore MEWS Preditivo:</span>
                  <strong id="triage-mews-score-val" style="font-size: 0.85rem; color: #34d399;">0 (Baixo Risco)</strong>
                </div>
                <span id="triage-mews-suggest" style="font-size: 0.74rem; color: #a5b4fc; background: rgba(99, 102, 241, 0.15); padding: 2px 8px; border-radius: 8px;">Sinais Estáveis</span>
              </div>

              <h4 style="font-family:'Outfit'; font-weight:600; font-size:0.9rem; margin:16px 0 12px; color:var(--text-primary); border-left:3px solid #8b5cf6; padding-left:8px;">* Classificação de Risco</h4>
              <div class="manchester-selector">
                <div class="manchester-option vermelho"><input type="radio" id="color-vermelho" name="manchesterColor" value="Vermelho" required><label for="color-vermelho" class="manchester-label"><i class="fa-solid fa-triangle-exclamation"></i><span>Emergência</span></label></div>
                <div class="manchester-option laranja"><input type="radio" id="color-laranja" name="manchesterColor" value="Laranja"><label for="color-laranja" class="manchester-label"><i class="fa-solid fa-circle-exclamation"></i><span>Muito Urgente</span></label></div>
                <div class="manchester-option amarelo"><input type="radio" id="color-amarelo" name="manchesterColor" value="Amarelo"><label for="color-amarelo" class="manchester-label"><i class="fa-solid fa-circle-info"></i><span>Urgente</span></label></div>
                <div class="manchester-option verde"><input type="radio" id="color-verde" name="manchesterColor" value="Verde"><label for="color-verde" class="manchester-label"><i class="fa-solid fa-circle-check"></i><span>Pouco Urgente</span></label></div>
                <div class="manchester-option azul"><input type="radio" id="color-azul" name="manchesterColor" value="Azul"><label for="color-azul" class="manchester-label"><i class="fa-solid fa-circle"></i><span>Não Urgente</span></label></div>
              </div>
              <div class="form-group" style="margin-top:18px;">
                <label class="form-label">* Queixa Principal / Sintomatologia:</label>
                <textarea id="triage-complaints" class="form-input" required rows="3" placeholder="Descreva a queixa principal do paciente..."></textarea>
              </div>
              <div style="display:flex; gap:10px; margin-top:20px; justify-content:flex-end;">
                <button type="button" id="btn-cancel-triage" class="btn" style="background:var(--bg-tertiary); color:var(--text-primary); border-color:var(--border-color);">Cancelar</button>
                <button type="submit" class="btn btn-primary"><i class="fa-solid fa-floppy-disk"></i> Salvar Triagem</button>
              </div>
            </form>
          </div>
        </div>
      </div>

      <!-- Modal Histórico -->
      <div id="history-panel" class="modal-overlay" style="display:none;">
        <div class="modal-content" style="max-width:760px; width:95vw; max-height:88vh; display:flex; flex-direction:column;">
          <div class="modal-header">
            <h3><i class="fa-solid fa-clock-rotate-left" style="color:var(--color-primary);"></i> Histórico de Atendimentos</h3>
            <button type="button" class="modal-close" id="close-history-panel"><i class="fa-solid fa-xmark"></i></button>
          </div>
          <div style="padding:16px 20px; border-bottom:1px solid var(--border-color);">
            <div class="search-wrapper">
              <i class="fa-solid fa-magnifying-glass search-icon"></i>
              <input type="text" id="history-search" class="search-input" placeholder="Buscar por nome do paciente...">
            </div>
          </div>
          <div id="history-list" style="overflow-y:auto; flex:1; padding:16px 20px;">
            <div style="text-align:center; color:var(--text-muted); padding:40px; font-size:0.9rem;">Carregando histórico...</div>
          </div>
        </div>
      </div>
    </div>
  `;

  let admissionPatients = [];
  let selectedPatient = null;
  let allEncounters = [];
  let allHistory = [];
  let activeKanbanTimers = [];

  const getWaitTimeText = (since) => {
    const s = Math.max(0, Math.floor((Date.now() - new Date(since).getTime()) / 1000));
    if (s < 60) return `${s}s`;
    const m = Math.floor(s / 60);
    if (m < 60) return `${m}min`;
    return `${Math.floor(m/60)}h ${m%60}m`;
  };

  const getMC = (color) => ({
    'Vermelho': { bg:'#7f1d1d', border:'#dc2626', text:'#fca5a5', label:'Emergência' },
    'Laranja':  { bg:'#431407', border:'#ea580c', text:'#fb923c', label:'Muito Urgente' },
    'Amarelo':  { bg:'#422006', border:'#ca8a04', text:'#fde047', label:'Urgente' },
    'Verde':    { bg:'#052e16', border:'#16a34a', text:'#86efac', label:'Pouco Urgente' },
    'Azul':     { bg:'#0c1a4e', border:'#2563eb', text:'#93c5fd', label:'Não Urgente' },
  }[color] || { bg:'var(--bg-tertiary)', border:'var(--border-color)', text:'var(--text-secondary)', label: color || '—' });

  const openAdmissionPanel = () => {
    const p = document.getElementById('admission-panel');
    const o = document.getElementById('admission-overlay');
    if (!p || !o) return;
    p.style.display = 'flex';
    o.style.display = 'block';
    setTimeout(() => { p.style.transform = 'translateX(0)'; }, 10);
    
    const searchWrapper = document.querySelector('#admission-panel .search-wrapper');
    if (searchWrapper) searchWrapper.style.display = 'block';
    const searchInput = document.getElementById('adm-search-input');
    if (searchInput) searchInput.value = '';
    
    loadAdmissionPatients();
  };

  const closeAdmissionPanel = () => {
    const p = document.getElementById('admission-panel');
    const o = document.getElementById('admission-overlay');
    if (!p || !o) return;
    p.style.transform = 'translateX(100%)';
    setTimeout(() => { p.style.display = 'none'; o.style.display = 'none'; }, 350);
    selectedPatient = null;
    const pid = document.getElementById('selected-patient-id');
    if (pid) pid.value = '';
    const selInfo = document.getElementById('adm-selected-info');
    if (selInfo) selInfo.style.display = 'none';
    const btnUrg = document.getElementById('btn-admit-urgencia');
    if (btnUrg) btnUrg.disabled = true;
    const btnAmb = document.getElementById('btn-admit-ambulatorio');
    if (btnAmb) btnAmb.disabled = true;
  };

  const loadAdmissionPatients = async () => {
    try {
      const res = await apiFetch(`/api/patients`);
      admissionPatients = await res.json();
      renderAdmList(admissionPatients);
    } catch {
      const c = document.getElementById('adm-patient-list');
      if (c) c.innerHTML = '<div style="padding:20px;text-align:center;color:var(--text-muted);font-size:0.83rem;">Erro ao carregar.</div>';
    }
  };

  const renderAdmList = (list) => {
    const c = document.getElementById('adm-patient-list');
    if (!c) return;
    if (!list.length) { c.innerHTML = '<div style="padding:16px;text-align:center;color:var(--text-muted);font-size:0.83rem;">Nenhum paciente encontrado.</div>'; return; }
    c.innerHTML = list.slice(0,50).map(p => `<div class="patient-select-item adm-list-item" data-id="${p.id}" data-name="${p.fullName}" data-cpf="${p.cpf}" style="padding:10px 12px;border-bottom:1px solid var(--border-color);cursor:pointer;transition:background 0.15s;"><div style="font-weight:600;font-size:0.875rem;color:var(--text-primary);">${p.fullName}</div><div style="font-size:0.73rem;color:var(--text-muted);">CPF: ${p.cpf}</div></div>`).join('');
    c.querySelectorAll('.adm-list-item').forEach(el => {
      el.addEventListener('click', () => {
        c.querySelectorAll('.adm-list-item').forEach(i => { i.classList.remove('selected'); i.style.background = ''; });
        el.classList.add('selected'); el.style.background = 'rgba(0,100,255,0.08)';
        selectedPatient = { id: el.dataset.id, fullName: el.dataset.name, cpf: el.dataset.cpf };
        document.getElementById('selected-patient-id').value = el.dataset.id;
        document.getElementById('adm-selected-name').textContent = el.dataset.name;
        document.getElementById('adm-selected-cpf').textContent = 'CPF: ' + el.dataset.cpf;
        document.getElementById('adm-selected-info').style.display = 'block';
        document.getElementById('btn-admit-urgencia').disabled = false;
        document.getElementById('btn-admit-ambulatorio').disabled = false;
      });
    });
  };

  window.openAdmissionForPatient = (patientId, fullName, cpf) => {
    openAdmissionPanel();
    setTimeout(() => {
      selectedPatient = { id: patientId, fullName, cpf };
      const selectedIdInput = document.getElementById('selected-patient-id');
      const infoBox = document.getElementById('adm-selected-info');
      const nameEl = document.getElementById('adm-selected-name');
      const cpfEl = document.getElementById('adm-selected-cpf');
      const btnUrg = document.getElementById('btn-admit-urgencia');
      const btnAmb = document.getElementById('btn-admit-ambulatorio');
      const patientList = document.getElementById('adm-patient-list');

      if (selectedIdInput && infoBox && nameEl) {
        selectedIdInput.value = patientId;
        nameEl.textContent = fullName;
        if (cpfEl) cpfEl.textContent = cpf ? 'CPF: ' + cpf : 'CPF Não Informado';
        infoBox.style.display = 'block';
        if (btnUrg) btnUrg.disabled = false;
        if (btnAmb) btnAmb.disabled = false;

        if (patientList) {
          patientList.innerHTML = `<div style="padding:16px 20px;text-align:center;color:#38bdf8;font-weight:700;"><i class="fa-solid fa-circle-check" style="font-size:1.6rem;display:block;margin-bottom:8px;color:#10b981;"></i> Paciente <strong>${fullName}</strong> pré-selecionado!<br><span style="font-size:0.8rem;color:#cbd5e1;font-weight:normal;display:block;margin-top:4px;">Selecione o tipo de admissão desejado abaixo:<br><strong>Urgência (PS)</strong> para Triagem Manchester ou <strong>Ambulatório</strong> para consulta direta.</span></div>`;
        }
      }
    }, 150);
  };

  document.getElementById('adm-search-input')?.addEventListener('input', e => {
    const q = removeAccents(e.target.value.toLowerCase());
    renderAdmList(admissionPatients.filter(p => removeAccents(p.fullName).toLowerCase().includes(q) || p.cpf.includes(q)));
  });
  document.getElementById('btn-open-admission-panel')?.addEventListener('click', openAdmissionPanel);
  document.getElementById('btn-close-admission-panel')?.addEventListener('click', closeAdmissionPanel);
  document.getElementById('admission-overlay')?.addEventListener('click', closeAdmissionPanel);

  const createEncounter = async (type) => {
    const patientId = document.getElementById('selected-patient-id').value;
    if (!patientId) return;
    const btn = document.getElementById(type === 'Urgencia' ? 'btn-admit-urgencia' : 'btn-admit-ambulatorio');
    btn.disabled = true; btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Admitindo...';
    try {
      const patientName = document.getElementById('adm-selected-name')?.textContent || (typeof selectedPatient !== 'undefined' ? selectedPatient?.fullName : null) || 'Paciente';
      const bodyData = { 
        patientId, 
        patientName,
        type, 
        status: 'Aguardando_Triagem',
        admitted_at: new Date().toISOString()
      };
      const res = await apiFetch(`/api/encounters`, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(bodyData) });
      const d = await res.json();
      if (res.ok) {
        showToast(`✅ ${patientName} admitido(a)!`);
        closeAdmissionPanel();
        if (typeof window.showFlowCompletionNotification === 'function') {
          window.showFlowCompletionNotification({
            actionTitle: '🏥 Admissão Hospitalar Realizada',
            message: `O paciente <strong>${patientName}</strong> foi admitido no fluxo de <strong>${type === 'Urgencia' ? 'Urgência (PS)' : 'Ambulatório'}</strong>.<br><br><strong>Próximo Passo:</strong> O paciente está na coluna <strong>Aguardando Triagem</strong>. Clique em 'Realizar Triagem' para aferir sinais vitais e definir a cor Manchester.`,
            targetTab: 'atendimento',
            targetTabLabel: 'Fila de Triagem Manchester',
            targetPatientName: patientName,
            persistent: true
          });
        }
        await loadAndRenderKanban();
      } else {
        showToast(`❌ ${d.message || 'Erro ao admitir.'}`, true);
        btn.disabled = false;
        btn.innerHTML = type === 'Urgencia' ? '<i class="fa-solid fa-truck-medical"></i> Urgência (PS)' : '<i class="fa-solid fa-user-doctor"></i> Ambulatório';
      }
    } catch { showToast('❌ Erro de conexão.', true); btn.disabled = false; }
  };
  document.getElementById('btn-admit-urgencia')?.addEventListener('click', () => createEncounter('Urgencia'));
  document.getElementById('btn-admit-ambulatorio')?.addEventListener('click', () => createEncounter('Ambulatorial'));

  const colorPri = { Vermelho:5, Laranja:4, Amarelo:3, Verde:2, Azul:1 };

  const loadAndRenderKanban = async () => {
    try {
      const res = await apiFetch(`/api/encounters`);
      if (!res.ok) throw new Error();
      const json = await res.json();
      allEncounters = Array.isArray(json) ? json : (json.data || []);
      renderKanban(allEncounters);
    } catch {
      ['col-triage','col-waiting','col-active'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.innerHTML = '<div style="text-align:center;color:var(--color-danger);padding:20px;font-size:0.82rem;"><i class="fa-solid fa-circle-xmark"></i><br>Erro ao carregar.</div>';
      });
    }
  };

  const renderKanban = (encounters) => {
    activeKanbanTimers.forEach(t => clearInterval(t));
    activeKanbanTimers = [];

    const triage  = encounters.filter(e => e.status === 'Aguardando_Triagem');
    const waiting = [...encounters.filter(e => e.status === 'Aguardando_Atendimento')].sort((a,b) => (colorPri[b.manchesterColor]||0)-(colorPri[a.manchesterColor]||0) || new Date(a.admitted_at)-new Date(b.admitted_at));
    const active  = encounters.filter(e => e.status === 'Em_Atendimento');

    window.filterKanbanColumn = function(type) {
      const colTriage = document.getElementById('col-triage')?.parentElement;
      const colWaiting = document.getElementById('col-waiting')?.parentElement;
      const colActive = document.getElementById('col-active')?.parentElement;
      if (!colTriage || !colWaiting || !colActive) return;
      const grid = colTriage.parentElement;

      ['triage', 'waiting', 'active', 'all'].forEach(t => {
        const card = document.getElementById(`card-kpi-${t}`);
        if (card) {
          if (t === type) {
            card.classList.add('active-filter');
            card.style.opacity = '1';
          } else {
            card.classList.remove('active-filter');
            card.style.opacity = type === 'all' ? '1' : '0.55';
          }
        }
      });

      if (type === 'all') {
        grid.style.gridTemplateColumns = 'repeat(3, 1fr)';
        colTriage.style.display = 'block';
        colWaiting.style.display = 'block';
        colActive.style.display = 'block';
      } else if (type === 'triage') {
        grid.style.gridTemplateColumns = '1fr';
        colTriage.style.display = 'block';
        colWaiting.style.display = 'none';
        colActive.style.display = 'none';
      } else if (type === 'waiting') {
        grid.style.gridTemplateColumns = '1fr';
        colTriage.style.display = 'none';
        colWaiting.style.display = 'block';
        colActive.style.display = 'none';
      } else if (type === 'active') {
        grid.style.gridTemplateColumns = '1fr';
        colTriage.style.display = 'none';
        colWaiting.style.display = 'none';
        colActive.style.display = 'block';
      }
    };

    const countTr = document.getElementById('count-triage');
    if (countTr) countTr.textContent = triage.length;
    const countWt = document.getElementById('count-waiting');
    if (countWt) countWt.textContent = waiting.length;
    const countAc = document.getElementById('count-active');
    if (countAc) countAc.textContent = active.length;

    const kpiTr = document.getElementById('kpi-triagem-num');
    if (kpiTr) kpiTr.textContent = triage.length;
    const kpiWt = document.getElementById('kpi-aguardando-num');
    if (kpiWt) kpiWt.textContent = waiting.length;
    const kpiAc = document.getElementById('kpi-consulta-num');
    if (kpiAc) kpiAc.textContent = active.length;

    const setCol = (id, items, emptyColor, emptyMsg, buildFn, bindFn) => {
      const col = document.getElementById(id);
      if (!col) return;
      if (!items.length) { col.innerHTML = `<div style="text-align:center;color:var(--text-muted);padding:30px 16px;font-size:0.82rem;"><i class="fa-solid fa-check-circle" style="color:${emptyColor};font-size:1.5rem;display:block;margin-bottom:8px;"></i>${emptyMsg}</div>`; return; }
      col.innerHTML = items.map(buildFn).join('');
      items.forEach(e => { bindFn(e); startLiveTimer(e.id, e.admitted_at); });
    };

    setCol('col-triage', triage, '#8b5cf6', 'Fila vazia', buildTriageCard, (e) => {
      const b = document.querySelector(`#col-triage [data-enc-id="${e.id}"].btn-triar`);
      const pepBtn = document.querySelector(`#col-triage [data-enc-id="${e.id}"].btn-open-pep-direct`);
      if (b) b.addEventListener('click', () => openTriageModal(e.id, e.patientName));
      if (pepBtn) pepBtn.addEventListener('click', () => window.openPEPModal(e.id));
    });
    setCol('col-waiting', waiting, '#f59e0b', 'Nenhum aguardando', buildWaitCard, (e) => {
      const b = document.querySelector(`#col-waiting [data-enc-id="${e.id}"].btn-call-consult`);
      const pepBtn = document.querySelector(`#col-waiting [data-enc-id="${e.id}"].btn-open-pep-direct`);
      if (b) b.addEventListener('click', () => updateStatus(e.id, 'Em_Atendimento', e.patientName, e.manchesterColor));
      if (pepBtn) pepBtn.addEventListener('click', () => window.openPEPModal(e.id));
    });
    setCol('col-active', active, '#10b981', 'Nenhum em atendimento', buildActiveCard, (e) => {
      const pep = document.querySelector(`#col-active [data-enc-id="${e.id}"].btn-open-pep`);
      const rx = document.querySelector(`#col-active [data-enc-id="${e.id}"].btn-open-rx`);
      const obs = document.querySelector(`#col-active [data-enc-id="${e.id}"].btn-start-obs`);
      const bed = document.querySelector(`#col-active [data-enc-id="${e.id}"].btn-transfer-bed`);
      const fin = document.querySelector(`#col-active [data-enc-id="${e.id}"].btn-finish-consult`);
      if (pep) pep.addEventListener('click', () => window.openPEPModal(e.id));
      if (rx) rx.addEventListener('click', () => window.openPrescriptionModal(e.id, e.patientName, e.patientId));
      if (obs) obs.addEventListener('click', async () => {
        try {
          const res = await apiFetch(`/api/encounters/${e.id}/start-observation`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ notes: 'Paciente colocado em observação médica no PS' })
          });
          if (res.ok) {
            showToast('⏱️ Paciente colocado em Observação Médica (Cronômetro 12h iniciado)');
            if (typeof window.showFlowCompletionNotification === 'function') {
              window.showFlowCompletionNotification({
                actionTitle: '⏱️ Observação Médica PS Iniciada',
                message: `O paciente <strong>${e.patientName}</strong> foi colocado em observação médica. O tempo de permanência de 12 horas está ativo na coluna 'Em Atendimento'.`,
                targetTab: 'atendimento',
                targetTabLabel: 'Atendimentos (Observação 12h PS)',
                persistent: true
              });
            }
            await loadAndRenderKanban();
          }
        } catch(err) { showToast('Erro ao iniciar observação.', true); }
      });
      if (bed) bed.addEventListener('click', () => window.openTransferBedModal(e.id, e.patientName));
      if (fin) fin.addEventListener('click', () => updateStatus(e.id, 'Finalizado', e.patientName));
    });
  };

  const startLiveTimer = (id, since) => {
    const tick = () => { const el = document.getElementById(`timer-${id}`); if (el) el.textContent = getWaitTimeText(since); else clearInterval(t); };
    tick();
    const t = setInterval(tick, 10000);
    activeKanbanTimers.push(t);
  };

  const buildTriageCard = (e) => `
    <div class="patient-card-item" data-patient-card-name="${(e.patientName||'').replace(/"/g, '&quot;')}" data-enc-id="${e.id}" style="background:var(--bg-tertiary);border:1px solid var(--border-color);border-left:4px solid #8b5cf6;border-radius:var(--radius-md);padding:14px;margin-bottom:4px;">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px;">
        <div style="font-weight:700;font-size:0.88rem;color:var(--text-primary);">${e.patientName}</div>
        <span id="timer-${e.id}" style="font-size:0.7rem;color:#8b5cf6;font-family:monospace;background:rgba(139,92,246,0.1);padding:2px 6px;border-radius:4px;white-space:nowrap;"></span>
      </div>
      <div style="font-size:0.75rem;color:var(--text-muted);margin-bottom:10px;"><i class="fa-solid fa-tag" style="color:#8b5cf6;"></i> ${e.type==='Urgencia'?'Urgência / PS':'Ambulatório'}</div>
      <div style="display:flex;gap:6px;margin-top:6px;">
        <button class="btn btn-primary btn-triar" data-enc-id="${e.id}" style="flex:1;font-size:0.78rem;padding:7px;background:linear-gradient(135deg,#8b5cf6,#6d28d9);border:none;cursor:pointer;">
          <i class="fa-solid fa-user-nurse"></i> Realizar Triagem
        </button>
        <button class="btn btn-secondary btn-open-pep-direct" data-enc-id="${e.id}" data-patient-id="${e.patientId}" data-patient-name="${(e.patientName||'').replace(/"/g, '&quot;')}" style="font-size:0.75rem;padding:7px 10px;background:rgba(236,72,153,0.12);border:1px solid rgba(236,72,153,0.3);color:#f472b6;border-radius:6px;cursor:pointer;font-weight:600;" title="Abrir PEP / Prontuário Médico">
          <i class="fa-solid fa-file-medical"></i> PEP
        </button>
      </div>
    </div>`;

  const buildWaitCard = (e) => {
    const mc = getMC(e.manchesterColor);
    return `
      <div class="patient-card-item" data-patient-card-name="${(e.patientName||'').replace(/"/g, '&quot;')}" data-enc-id="${e.id}" style="background:var(--bg-tertiary);border:1px solid var(--border-color);border-left:4px solid ${mc.border};border-radius:var(--radius-md);padding:14px;margin-bottom:4px;">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px;">
          <div style="font-weight:700;font-size:0.88rem;color:var(--text-primary);">${e.patientName}</div>
          <span id="timer-${e.id}" style="font-size:0.7rem;color:${mc.text};font-family:monospace;background:${mc.bg};padding:2px 6px;border-radius:4px;white-space:nowrap;"></span>
        </div>
        <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:${e.bloodPressure||e.temperatureCelsius?'10px':'12px'};">
          <span style="font-size:0.7rem;background:${mc.bg};color:${mc.text};border:1px solid ${mc.border};border-radius:10px;padding:2px 8px;font-weight:600;">● ${mc.label}</span>
          <span style="font-size:0.7rem;color:var(--text-muted);background:var(--bg-secondary);border-radius:10px;padding:2px 8px;">${e.type==='Urgencia'?'Urgência':'Ambulatório'}</span>
        </div>
        ${e.bloodPressure||e.temperatureCelsius?`<div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:12px;">${e.bloodPressure?`<div style="background:var(--bg-secondary);border-radius:6px;padding:5px 8px;font-size:0.72rem;"><span style="color:var(--text-muted);">PA</span><br><strong style="color:var(--text-primary);">${e.bloodPressure}</strong></div>`:''} ${e.temperatureCelsius?`<div style="background:var(--bg-secondary);border-radius:6px;padding:5px 8px;font-size:0.72rem;"><span style="color:var(--text-muted);">Temp.</span><br><strong style="color:var(--text-primary);">${e.temperatureCelsius}°C</strong></div>`:''}</div>`:''}
        ${e.complaints?`<p style="font-size:0.75rem;color:var(--text-secondary);font-style:italic;margin:0 0 12px;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;">"${e.complaints}"</p>`:''}
        <div style="display:flex;gap:6px;margin-top:6px;">
          <button class="btn btn-primary btn-call-consult" data-enc-id="${e.id}" style="flex:1;font-size:0.78rem;padding:7px;cursor:pointer;">
            <i class="fa-solid fa-bullhorn"></i> Chamar
          </button>
          <button class="btn btn-secondary btn-open-pep-direct" data-enc-id="${e.id}" data-patient-id="${e.patientId}" data-patient-name="${(e.patientName||'').replace(/"/g, '&quot;')}" style="font-size:0.75rem;padding:7px 10px;background:rgba(236,72,153,0.12);border:1px solid rgba(236,72,153,0.3);color:#f472b6;border-radius:6px;cursor:pointer;font-weight:600;" title="Abrir PEP / Prontuário Médico">
            <i class="fa-solid fa-file-medical"></i> PEP
          </button>
        </div>
      </div>`;
  };

  const buildActiveCard = (e) => {
    const mc = getMC(e.manchesterColor);
    const isObs = e.status === 'Em_Observacao' || !!e.observation_started_at;
    let obsBadgeHtml = '';

    if (isObs) {
      const obsStart = new Date(e.observation_started_at || e.admitted_at).getTime();
      const diffMs = Math.max(0, Date.now() - obsStart);
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

      if (diffHours >= 12) {
        obsBadgeHtml = `<div style="background:rgba(239,68,68,0.2); border:1px solid #ef4444; color:#f87171; border-radius:8px; padding:6px 10px; font-size:0.75rem; font-weight:700; margin-bottom:10px; display:flex; align-items:center; justify-content:space-between; animation:pulse 1.5s infinite;">
          <span><i class="fa-solid fa-triangle-exclamation"></i> EXCEDEU 12H PS: ${diffHours}h ${diffMins}m</span>
          <span style="font-size:0.68rem; background:#ef4444; color:#fff; padding:2px 6px; border-radius:4px;">TRANSFERIR</span>
        </div>`;
      } else if (diffHours >= 10) {
        obsBadgeHtml = `<div style="background:rgba(245,158,11,0.2); border:1px solid #f59e0b; color:#fbbf24; border-radius:8px; padding:6px 10px; font-size:0.75rem; font-weight:700; margin-bottom:10px; display:flex; align-items:center; justify-content:space-between;">
          <span><i class="fa-solid fa-clock"></i> Atenção (Limite 12h): ${diffHours}h ${diffMins}m</span>
        </div>`;
      } else {
        obsBadgeHtml = `<div style="background:rgba(59,130,246,0.15); border:1px solid rgba(59,130,246,0.3); color:#60a5fa; border-radius:8px; padding:5px 10px; font-size:0.73rem; font-weight:600; margin-bottom:10px; display:flex; align-items:center; justify-content:space-between;">
          <span><i class="fa-solid fa-bed-pulse"></i> Obs PS: ${diffHours}h ${diffMins}m / 12h max</span>
        </div>`;
      }
    }

    return `
      <div class="patient-card-item" data-patient-card-name="${(e.patientName||'').replace(/"/g, '&quot;')}" data-enc-id="${e.id}" style="background:var(--bg-tertiary);border:1px solid rgba(16,185,129,0.3);border-left:4px solid ${isObs ? '#f59e0b' : '#10b981'};border-radius:var(--radius-md);padding:14px;margin-bottom:4px;">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px;">
          <div style="font-weight:700;font-size:0.88rem;color:var(--text-primary);">${e.patientName}</div>
          <span id="timer-${e.id}" style="font-size:0.7rem;color:#10b981;font-family:monospace;background:rgba(16,185,129,0.1);padding:2px 6px;border-radius:4px;white-space:nowrap;"></span>
        </div>
        <div style="display:flex;align-items:center;gap:6px;margin-bottom:${e.complaints || isObs ? '8px':'12px'};">
          <span style="width:7px;height:7px;background:${isObs ? '#f59e0b' : '#10b981'};border-radius:50%;display:inline-block;animation:pulse 1.5s infinite;"></span>
          <span style="font-size:0.75rem;color:${isObs ? '#f59e0b' : '#10b981'};font-weight:600;">${isObs ? 'Em Observação' : 'Em Consulta'}</span>
          ${e.manchesterColor?`<span style="font-size:0.7rem;background:${mc.bg};color:${mc.text};border:1px solid ${mc.border};border-radius:10px;padding:1px 8px;margin-left:auto;">${mc.label}</span>`:''}
        </div>
        ${obsBadgeHtml}
        ${e.complaints?`<p style="font-size:0.75rem;color:var(--text-secondary);font-style:italic;margin:0 0 12px;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;">"${e.complaints}"</p>`:''}
        
        <div style="display:grid; grid-template-columns: 1fr 1fr; gap:6px; margin-bottom:8px;">
          <button class="btn btn-open-pep" data-enc-id="${e.id}" style="font-size:0.75rem;padding:6px;background:var(--bg-secondary);border:1px solid var(--border-color);color:var(--text-primary);border-radius:var(--radius-md);cursor:pointer;" title="Prontuário Eletrônico">
            <i class="fa-solid fa-file-medical"></i> PEP
          </button>
          <button class="btn btn-open-rx" data-enc-id="${e.id}" style="font-size:0.75rem;padding:6px;background:rgba(99,102,241,0.15);border:1px solid rgba(99,102,241,0.3);color:#a78bfa;border-radius:var(--radius-md);cursor:pointer;" title="Prescrição de Medicações">
            <i class="fa-solid fa-scroll"></i> Prescrição
          </button>
        </div>
        <div style="display:grid; grid-template-columns: 1fr 1fr; gap:6px;">
          ${!isObs ? `
            <button class="btn btn-start-obs" data-enc-id="${e.id}" style="font-size:0.72rem;padding:6px;background:rgba(245,158,11,0.15);border:1px solid rgba(245,158,11,0.3);color:#fbbf24;border-radius:var(--radius-md);cursor:pointer;" title="Iniciar tempo de observação médica">
              <i class="fa-solid fa-clock"></i> Observação
            </button>
          ` : `
            <button class="btn btn-transfer-bed" data-enc-id="${e.id}" style="font-size:0.72rem;padding:6px;background:rgba(239,68,68,0.2);border:1px solid rgba(239,68,68,0.4);color:#f87171;border-radius:var(--radius-md);cursor:pointer;font-weight:700;" title="Subir paciente para leito de internação">
              <i class="fa-solid fa-bed"></i> Internar
            </button>
          `}
          <button class="btn btn-primary btn-finish-consult" data-enc-id="${e.id}" style="font-size:0.75rem;padding:6px;background:linear-gradient(135deg,#10b981,#059669);border:none;cursor:pointer;">
            <i class="fa-solid fa-circle-check"></i> Finalizar
          </button>
        </div>
      </div>`;
  };

  const updateStatus = async (id, status, patientName, manchesterColor) => {
    try {
      const res = await apiFetch(`/api/encounters/${id}/status`, { method:'PUT', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ status }) });
      if (res.ok) {
        if (status === 'Em_Atendimento') {
          setActivePatientContext({ id, fullName: patientName, patientName, manchesterColor });
          const stepperContainer = document.getElementById('atd-journey-stepper-container');
          if (stepperContainer) renderPatientJourneyStepper(stepperContainer, 'consulta');

          const activeRoom = (state.currentRoom && state.currentRoom.name) || 
                             (state.user && (state.user.room || state.user.roomName)) || 
                             (enc && (enc.room || enc.roomName)) || 
                             'Consultório 01';

          try {
            const todayIso = new Date().toISOString().split('T')[0];
            const db = window.localDB.getFullDB();
            const apts = db.appointments || [];
            let existingApt = apts.find(a => (a.patientName && a.patientName.toLowerCase() === (patientName || '').toLowerCase()) && (a.date === todayIso || !a.date));
            if (existingApt) {
              window.localDB.update('appointments', existingApt.id, {
                ...existingApt,
                status: 'Em Atendimento',
                roomName: activeRoom,
                room: activeRoom
              });
            } else {
              window.localDB.insert('appointments', {
                id: 'apt-' + Date.now(),
                patientName: patientName,
                patientId: enc.patientId,
                doctorName: (state.user && (state.user.name || state.user.fullName)) || 'Dr. Médico Plantonista',
                date: todayIso,
                time: new Date().toLocaleTimeString().slice(0, 5),
                status: 'Em Atendimento',
                roomName: activeRoom,
                room: activeRoom,
                specialty: 'Clínica Geral'
              });
            }
          } catch (err) { console.error('Erro ao sync agendamento consultorio:', err); }

          const callPayload = {
            patientName: patientName,
            roomName: activeRoom,
            manchesterColor: manchesterColor || 'Verde',
            doctorName: (state.user && (state.user.name || state.user.fullName)) || 'Dr. Médico Assistente'
          };

          apiFetch('/api/tv/call', {
            method: 'POST',
            body: JSON.stringify(callPayload)
          }).catch(() => {});

          realtimeHub.broadcastTVCall(callPayload);

          if ('speechSynthesis' in window) {
            const text = `Atenção: Paciente ${patientName}, favor dirigir-se ao ${activeRoom}.`;
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.lang = 'pt-BR';
            utterance.rate = 0.9;
            window.speechSynthesis.speak(utterance);
          }

          if (typeof window.showFlowCompletionNotification === 'function') {
            window.showFlowCompletionNotification({
              actionTitle: `📢 Paciente Chamado para ${activeRoom}`,
              message: `O paciente <strong>${patientName}</strong> foi chamado para o <strong>${activeRoom}</strong>.`,
              targetTab: 'consultorios',
              targetTabLabel: `${activeRoom} (Salas & Consultórios)`,
              targetColumn: activeRoom,
              targetPatientName: patientName,
              persistent: true
            });
          }
        } else if (status === 'Finalizado') {
          if (typeof window.showFlowCompletionNotification === 'function') {
            window.showFlowCompletionNotification({
              actionTitle: `✅ Atendimento Finalizado`,
              message: `O atendimento de <strong>${patientName}</strong> foi concluído com sucesso. O histórico foi salvo no prontuário.`,
              targetTab: 'atendimento',
              targetTabLabel: 'Atendimentos & Relatórios',
              persistent: true
            });
          }
        }
        const msgs = { 'Em_Atendimento': `📣 ${patientName} chamado(a) para consulta!`, 'Finalizado': `✅ Atendimento de ${patientName} finalizado.` };
        showToast(msgs[status] || 'Status atualizado.');
        await loadAndRenderKanban();
      } else { showToast('❌ Erro ao atualizar status.', true); }
    } catch { showToast('❌ Erro de conexão.', true); }
  };

  const openTriageModal = (id, name) => {
    const perms = (typeof getRolePermissions === 'function') ? getRolePermissions(state.user) : { canDoTriage: true, label: 'Usuário' };
    if (!perms.canDoTriage) {
      showCustomAlert({
        title: 'Acesso Restrito',
        message: `Seu perfil (<strong>${perms.label}</strong>) não possui permissão clínica para realizar Triagem Manchester. Esta operação é restrita a Enfermeiros e Médicos.`,
        type: 'warning'
      });
      return;
    }

    setActivePatientContext({ id, fullName: name, patientName: name, manchesterColor: 'Amarelo' });
    const stepperContainer = document.getElementById('atd-journey-stepper-container');
    if (stepperContainer) renderPatientJourneyStepper(stepperContainer, 'triagem');

    document.getElementById('triage-encounter-id').value = id;
    document.getElementById('triage-patient-name').textContent = name;
    
    // Resetar estados das opções de Manchester ao abrir
    document.querySelectorAll('.manchester-option').forEach(opt => {
      opt.classList.remove('ai-suggested-glow');
      const inp = opt.querySelector('input[type="radio"]');
      if (inp) { inp.disabled = false; inp.checked = false; }
      opt.style.opacity = '1';
      opt.style.cursor = 'pointer';
    });

    document.getElementById('triage-modal').style.display = 'flex';
  };
  const closeTriageModal = () => { 
    document.getElementById('triage-modal').style.display = 'none'; 
    document.getElementById('triage-form').reset(); 
    document.querySelectorAll('.manchester-option').forEach(opt => {
      opt.classList.remove('ai-suggested-glow');
      const inp = opt.querySelector('input[type="radio"]');
      if (inp) inp.disabled = false;
      opt.style.opacity = '1';
    });
  };
  document.getElementById('close-triage-modal')?.addEventListener('click', closeTriageModal);
  document.getElementById('btn-cancel-triage')?.addEventListener('click', closeTriageModal);
  // Não fecha ao clicar fora para evitar perda de dados digitados

  const updateTriageMEWS = () => {
    const pa = document.getElementById('triage-pa')?.value || '';
    const temp = document.getElementById('triage-temp')?.value || '';
    const fc = document.getElementById('triage-fc')?.value || '';
    const spo2 = document.getElementById('triage-spo2')?.value || '';

    // Se nenhum sinal vital foi digitado ainda, não força classificação
    if (!pa && !temp && !fc && !spo2) return;

    const mews = calculateMEWS({
      bloodPressure: pa,
      temperatureCelsius: temp,
      heartRateBpm: fc,
      oxygenSaturation: spo2
    });

    const scoreEl = document.getElementById('triage-mews-score-val');
    const suggestEl = document.getElementById('triage-mews-suggest');
    const previewEl = document.getElementById('triage-mews-preview');

    if (scoreEl && suggestEl && previewEl) {
      scoreEl.textContent = `${mews.score} (${mews.riskLevel})`;
      scoreEl.style.color = mews.badgeColor;
      previewEl.style.background = mews.badgeBg;
      previewEl.style.border = `1px solid ${mews.badgeColor}`;

      let targetColor = 'Verde';
      let maxAllowedTier = 5; // 1: Vermelho, 2: Laranja, 3: Amarelo, 4: Verde, 5: Azul

      if (mews.isSepsisAlert || mews.score >= 5) {
        targetColor = 'Vermelho';
        maxAllowedTier = 2; // Permite no máximo Laranja como alternativa de urgência
        suggestEl.innerHTML = '<strong style="color: #ef4444;"><i class="fa-solid fa-triangle-exclamation"></i> ALERTA SEPSE / EMERGÊNCIA (⚡ Setado: Vermelho)</strong>';
      } else if (mews.score >= 4) {
        targetColor = 'Laranja';
        maxAllowedTier = 3;
        suggestEl.innerHTML = '<span style="color: #f87171; font-weight:700;">Recomendado pela IA: Laranja / Muito Urgente</span>';
      } else if (mews.score >= 2) {
        targetColor = 'Amarelo';
        maxAllowedTier = 4;
        suggestEl.innerHTML = '<span style="color: #fbbf24; font-weight:600;">Recomendado pela IA: Amarelo / Urgente</span>';
      } else if (mews.score === 1) {
        targetColor = 'Verde';
        maxAllowedTier = 5;
        suggestEl.innerHTML = '<span style="color: #34d399;">Sinais Estáveis · Recomendado: Verde</span>';
      } else {
        targetColor = 'Azul';
        maxAllowedTier = 5;
        suggestEl.innerHTML = '<span style="color: #38bdf8;">Sinais Normais · Recomendado: Azul/Verde</span>';
      }

      // Auto-selecionar e destacar no Manchester Selector
      const colorTiers = [
        { id: 'color-vermelho', tier: 1, name: 'Vermelho' },
        { id: 'color-laranja', tier: 2, name: 'Laranja' },
        { id: 'color-amarelo', tier: 3, name: 'Amarelo' },
        { id: 'color-verde', tier: 4, name: 'Verde' },
        { id: 'color-azul', tier: 5, name: 'Azul' }
      ];

      colorTiers.forEach(item => {
        const input = document.getElementById(item.id);
        const container = input?.closest('.manchester-option');
        if (!input || !container) return;

        // Trava de segurança: inabilita opções mais brandas caso o paciente esteja instável/crítico
        if (item.tier > maxAllowedTier) {
          input.disabled = true;
          if (input.checked) input.checked = false;
          container.style.opacity = '0.3';
          container.style.cursor = 'not-allowed';
          container.title = 'Inabilitado por segurança: sinais vitais indicam gravidade clínica superior.';
        } else {
          input.disabled = false;
          container.style.opacity = '1';
          container.style.cursor = 'pointer';
          container.title = item.name === targetColor ? '⚡ Classificação Preditiva Selecionada pela IA' : 'Elevação permitida por queixa clínica';
        }

        if (item.name === targetColor) {
          input.checked = true;
          container.classList.add('ai-suggested-glow');
        } else {
          container.classList.remove('ai-suggested-glow');
        }
      });
    }
  };

  document.getElementById('triage-pa')?.addEventListener('input', e => {
    let v = e.target.value.replace(/\D/g,'').substring(0,6);
    e.target.value = v.length <= 3 ? v : v.slice(0,3)+'/'+v.slice(3);
    updateTriageMEWS();
  });
  document.getElementById('triage-temp')?.addEventListener('input', updateTriageMEWS);
  document.getElementById('triage-fc')?.addEventListener('input', updateTriageMEWS);
  document.getElementById('triage-spo2')?.addEventListener('input', updateTriageMEWS);
  document.getElementById('triage-peso')?.addEventListener('input', updateTriageMEWS);
  document.getElementById('triage-glicemia')?.addEventListener('input', updateTriageMEWS);

  document.getElementById('triage-form')?.addEventListener('submit', async e => {
    e.preventDefault();
    const radio = document.querySelector('input[name="manchesterColor"]:checked');
    if (!radio) { showToast('❌ Selecione a classificação de risco.', true); return; }
    const btn = e.target.querySelector('button[type="submit"]');
    btn.disabled = true; btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Salvando...';
    try {
      const res = await apiFetch(`/api/encounters/${document.getElementById('triage-encounter-id').value}/triage`, {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({
          manchesterColor: radio.value,
          bloodPressure: document.getElementById('triage-pa').value,
          temperatureCelsius: document.getElementById('triage-temp').value,
          heartRateBpm: document.getElementById('triage-fc').value,
          weightKg: document.getElementById('triage-peso').value,
          complaints: document.getElementById('triage-complaints').value
        })
      });
      if (res.ok) {
        const pName = document.getElementById('triage-patient-name').textContent || 'Paciente';
        closeTriageModal();
        if (typeof window.showFlowCompletionNotification === 'function') {
          window.showFlowCompletionNotification({
            actionTitle: '🩺 Triagem Manchester Registrada',
            message: `O paciente <strong>${pName}</strong> foi classificado como <strong>${radio.value}</strong> e está pronto para o atendimento médico.<br><br><strong>Próxima Etapa:</strong> Chame o paciente no <strong>Painel TV</strong> ou abra o <strong>PEP / Prontuário</strong> para iniciar a consulta.`,
            targetTab: 'atendimento',
            targetTabLabel: 'Fila de Consultório / PEP',
            targetPatientName: pName,
            persistent: true
          });
        }
        await loadAndRenderKanban();
      }
      else { const d=await res.json(); showToast(`❌ ${d.message||'Erro ao salvar triagem.'}`,true); }
    } catch { showToast('❌ Erro de conexão.',true); }
    finally { btn.disabled=false; btn.innerHTML='<i class="fa-solid fa-floppy-disk"></i> Salvar Triagem'; }
  });

  const renderHistory = (list) => {
    const el = document.getElementById('history-list');
    if (!el) return;
    if (!list.length) { el.innerHTML = '<div style="text-align:center;color:var(--text-muted);padding:40px;font-size:0.9rem;"><i class="fa-solid fa-inbox"></i><br>Nenhum atendimento finalizado.</div>'; return; }
    el.innerHTML = list.map(e => {
      const mc = getMC(e.manchesterColor);
      return `<div style="border:1px solid var(--border-color);border-left:4px solid ${mc.border};border-radius:var(--radius-md);padding:14px 16px;margin-bottom:10px;background:var(--bg-tertiary);">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
          <span style="font-weight:700;color:var(--text-primary);font-size:0.9rem;">${e.patientName}</span>
          ${e.manchesterColor?`<span style="font-size:0.7rem;background:${mc.bg};color:${mc.text};border:1px solid ${mc.border};border-radius:10px;padding:1px 8px;">${mc.label}</span>`:''}
        </div>
        <div style="font-size:0.74rem;color:var(--text-muted);display:grid;grid-template-columns:1fr 1fr;gap:4px;">
          <span><i class="fa-solid fa-tag"></i> ${e.type==='Urgencia'?'Urgência':'Ambulatório'}</span>
          <span><i class="fa-solid fa-calendar-plus"></i> ${e.admitted_at?new Date(e.admitted_at).toLocaleString('pt-BR'):'—'}</span>
          ${e.bloodPressure?`<span><i class="fa-solid fa-heart-pulse"></i> PA: ${e.bloodPressure}</span>`:'<span></span>'}
          <span><i class="fa-solid fa-flag-checkered"></i> ${e.completed_at?new Date(e.completed_at).toLocaleString('pt-BR'):'—'}</span>
        </div>
        ${e.complaints?`<p style="font-size:0.77rem;color:var(--text-secondary);font-style:italic;margin:8px 0 0;">"${e.complaints}"</p>`:''}
      </div>`;
    }).join('');
  };

  document.getElementById('btn-show-history')?.addEventListener('click', async () => {
    document.getElementById('history-panel').style.display = 'flex';
    try {
      const res = await apiFetch(`/api/encounters`);
      const encJson = await res.json();
      const encountersList = Array.isArray(encJson) ? encJson : (encJson?.data || []);
      allHistory = encountersList.filter(e => e.status === 'Finalizado').reverse();
      renderHistory(allHistory);
    } catch { document.getElementById('history-list').innerHTML = '<div style="text-align:center;color:var(--text-muted);padding:40px;">Erro ao carregar histórico.</div>'; }
  });
  document.getElementById('close-history-panel')?.addEventListener('click', () => document.getElementById('history-panel').style.display = 'none');
  // Não fecha ao clicar fora para evitar perda de contexto
  document.getElementById('history-search')?.addEventListener('input', e => {
    const q = removeAccents(e.target.value.toLowerCase());
    renderHistory(allHistory.filter(enc => removeAccents(enc.patientName||'').toLowerCase().includes(q)));
  });

  loadAndRenderKanban();
  const _atdAutoRefresh = setInterval(() => {
    if (state.activeTab === 'atendimento') loadAndRenderKanban();
    else clearInterval(_atdAutoRefresh);
  }, 30000);
}
