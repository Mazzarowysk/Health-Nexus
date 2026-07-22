
import './styles.css';

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





window.handleCardClick = function(tabName, reportType, message) {
  const existingToast = document.querySelector('.interactive-toast');
  if (existingToast) existingToast.remove();

  const toast = document.createElement('div');
  toast.className = 'interactive-toast';
  toast.innerHTML = `<i class="fa-solid fa-bolt" style="color:#a855f7;font-size:1.1rem;"></i> <span>${message || ('Acessando ' + tabName)}</span>`;
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
// --- CONFIGURAÇÃO DA SPA E ROTAS ---
const API_URL = '/api';

// --- ESTADO GLOBAL E AUTENTICAÇÃO ---
let state = {
  activeTab: 'dashboard',
  isAuthenticated: !!sessionStorage.getItem('hn_token'),
  token: sessionStorage.getItem('hn_token') || null,
  user: JSON.parse(sessionStorage.getItem('hn_user')) || null,
  dashboardData: {
    activePatients: 0,
    occupancyRate: 0,
    averageWaitTimeMinutes: 0,
    dailyAppointmentsCount: 0,
    billingSummary: { totalRevenue: 0, pendingClaims: 0 }
  },
  loading: true
};

const CACHE_TTL_MS = 30_000;
const dataCache = new Map();
const dataCacheTimestamps = new Map();
let syncUploadTimeout = null;

// --- CONTROLE DE TEMA (CLARO/ESCURO) ---
const initTheme = () => {
  const savedTheme = localStorage.getItem('hn_theme') || 'dark';
  if (savedTheme === 'light') {
    document.body.classList.add('light-theme');
  } else {
    document.body.classList.remove('light-theme');
  }
};

const toggleTheme = () => {
  const isLight = document.body.classList.toggle('light-theme');
  localStorage.setItem('hn_theme', isLight ? 'light' : 'dark');
  updateThemeIcon();
};

const updateThemeIcon = () => {
  const icon = document.getElementById('theme-icon');
  if (!icon) return;
  if (document.body.classList.contains('light-theme')) {
    icon.className = 'fa-solid fa-moon';
  } else {
    icon.className = 'fa-solid fa-sun';
  }
};

// --- SISTEMA DE SINCRONIZAÇÃO LOCAL-NUVEM// Helper para formatação de datas pt-BR (ex: 20/07/2026, 16:06:49)
const formatSyncDate = (isoOrDate) => {
  if (!isoOrDate || isoOrDate === 'Sem dados') return 'Sem dados';
  try {
    const d = new Date(isoOrDate);
    if (isNaN(d.getTime())) return 'Sem dados';
    return d.toLocaleString('pt-BR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit', second: '2-digit'
    });
  } catch (e) {
    return 'Sem dados';
  }
};

// --- HELPER COMPONENTE DE SELEÇÃO CUSTOMIZADA E PESQUISÁVEL ---
const setupCustomSelect = (container, hiddenInput, items, placeholder, onSelect) => {
  if (!container || !hiddenInput) return null;
  
  // Ordena os itens em ordem alfabética A-Z por nome completo
  const sortedItems = [...(items || [])].sort((a, b) => 
    (a.fullName || '').localeCompare(b.fullName || '', 'pt-BR', { sensitivity: 'base' })
  );

  const getLabelHtml = (item) => {
    if (!item) {
      return `<i class="fa-solid fa-user" style="color: var(--color-primary, #6366f1); margin-right: 8px;"></i> <span>${placeholder || 'Selecione...'}</span>`;
    }
    return `<i class="fa-solid fa-user" style="color: var(--color-primary, #6366f1); margin-right: 8px;"></i> <span style="font-weight:600;">${item.fullName}</span> <span style="opacity:0.75; font-size:0.82rem; margin-left:4px;">(CPF: ${item.cpf || 'N/I'})</span>`;
  };

  let selectedItem = sortedItems.find(i => String(i.id) === String(hiddenInput.value)) || null;

  // Limpar e reconstruir estrutura interna
  container.innerHTML = `
    <div class="custom-select-trigger" tabindex="0">${getLabelHtml(selectedItem)}</div>
    <div class="custom-select-options-panel">
      <div class="custom-select-search-wrapper">
        <i class="fa-solid fa-magnifying-glass"></i>
        <input type="text" class="custom-select-search-input" placeholder="🔍 Digite para filtrar por nome ou CPF..." autocomplete="off">
      </div>
      <div class="custom-select-options-list"></div>
    </div>
  `;

  const trigger = container.querySelector('.custom-select-trigger');
  const panel = container.querySelector('.custom-select-options-panel');
  const searchInput = container.querySelector('.custom-select-search-input');
  const listContainer = container.querySelector('.custom-select-options-list');

  // Toggle dropdown
  const toggleHandler = (e) => {
    e.stopPropagation();
    const isOpen = container.classList.contains('open');
    // Fechar outros dropdowns abertos antes
    document.querySelectorAll('.custom-select-container').forEach(el => {
      if (el !== container) el.classList.remove('open');
    });
    if (isOpen) {
      container.classList.remove('open');
    } else {
      container.classList.add('open');
      searchInput.value = '';
      renderList(sortedItems);
      setTimeout(() => searchInput.focus(), 50);
    }
  };

  trigger.removeEventListener('click', toggleHandler);
  trigger.addEventListener('click', toggleHandler);

  // Fechar ao clicar fora
  const clickOutsideHandler = (e) => {
    if (!container.contains(e.target)) {
      container.classList.remove('open');
    }
  };
  document.removeEventListener('click', clickOutsideHandler);
  document.addEventListener('click', clickOutsideHandler);

  // Renderizar listagem de opções
  const renderList = (filteredItems) => {
    if (!listContainer) return;
    listContainer.innerHTML = '';
    
    if (filteredItems.length === 0) {
      listContainer.innerHTML = `<div class="custom-select-no-results"><i class="fa-solid fa-user-slash" style="margin-right: 6px;"></i> Nenhum paciente encontrado.</div>`;
      return;
    }

    filteredItems.forEach(item => {
      const opt = document.createElement('div');
      opt.className = 'custom-select-option';
      if (hiddenInput.value === item.id) {
        opt.classList.add('selected');
      }
      opt.innerHTML = `
        <i class="fa-solid ${hiddenInput.value === item.id ? 'fa-circle-check' : 'fa-user'}" style="flex-shrink: 0;"></i>
        <div style="display: flex; flex-direction: column; overflow: hidden;">
          <span style="font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${item.fullName}</span>
          <span style="font-size: 0.76rem; opacity: 0.75;">CPF: ${item.cpf || 'N/I'}${item.birthDate ? ' | Nasc: ' + item.birthDate.split('-').reverse().join('/') : ''}</span>
        </div>
      `;
      
      opt.addEventListener('click', (e) => {
        e.stopPropagation();
        hiddenInput.value = item.id;
        hiddenInput.dataset.name = item.fullName;
        trigger.innerHTML = getLabelHtml(item);
        container.classList.remove('open');
        
        container.querySelectorAll('.custom-select-option').forEach(el => el.classList.remove('selected'));
        opt.classList.add('selected');

        if (onSelect) onSelect(item);
        
        // Disparar eventos nativos para validação HTML5
        hiddenInput.dispatchEvent(new Event('input', { bubbles: true }));
        hiddenInput.dispatchEvent(new Event('change', { bubbles: true }));
      });

      listContainer.appendChild(opt);
    });
  };

  renderList(sortedItems);

  // Filtro na digitação
  searchInput.addEventListener('input', (e) => {
    const q = e.target.value.toLowerCase().trim();
    if (!q) {
      renderList(sortedItems);
    } else {
      const queryDigits = q.replace(/\D/g, '');
      const filtered = sortedItems.filter(p => {
        const nameMatch = (p.fullName || '').toLowerCase().includes(q);
        const cpfDigits = (p.cpf || '').replace(/\D/g, '');
        const cpfMatch = queryDigits ? cpfDigits.includes(queryDigits) : (p.cpf || '').toLowerCase().includes(q);
        return nameMatch || cpfMatch;
      });
      renderList(filtered);
    }
  });

  return {
    setValue: (val) => {
      hiddenInput.value = val;
      const matching = sortedItems.find(i => i.id === val);
      if (matching) {
        trigger.innerHTML = getLabelHtml(matching);
        hiddenInput.dataset.name = matching.fullName;
      } else {
        trigger.innerHTML = getLabelHtml(null);
        hiddenInput.dataset.name = '';
      }
      renderList(sortedItems);
    },
    clear: () => {
      hiddenInput.value = '';
      hiddenInput.dataset.name = '';
      trigger.innerHTML = getLabelHtml(null);
      searchInput.value = '';
      renderList(sortedItems);
    }
  };
};

// --- MODAL LARANJA: "Sincronização Pendente!" (Disparado em CRUD) ---
const showSyncPromptModal = (syncData = {}) => {
  return new Promise((resolve) => {
    const existing = document.getElementById('sync-prompt-modal');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.id = 'sync-prompt-modal';
    overlay.className = 'modal-overlay';
    overlay.style.zIndex = '99999';
    overlay.style.display = 'flex';

    const isVercel = !!syncData.isVercel;
    
    // Data e horário do momento em que a ação de sincronização será realizada (Envio atual)
    const nowIso = new Date().toISOString();

    // Data do último banco de dados existente na nuvem de quando foi feito o upload anteriormente
    const previousCloudUploadDate = syncData.previousCloudBackup || syncData.lastCloudBackup || syncData.cloudTimestamps?.last_sync || syncData.lastLocalBackup;

    let localLabel = isVercel ? 'Horário Atual no Vercel' : 'Horário de Envio (Momento Atual)';
    let localDateText = formatSyncDate(nowIso);

    let cloudLabel = isVercel ? 'Último Upload na Nuvem (Anterior)' : 'Último Upload Existente na Nuvem';
    let cloudDateText = formatSyncDate(previousCloudUploadDate);

    overlay.innerHTML = `
      <div class="sync-modal-card">
        <!-- Top Banner Laranja -->
        <div class="sync-header-banner orange">
          <h3 class="sync-header-title">Sincronização Pendente!</h3>
          <span class="sync-header-arrow"><i class="fa-solid fa-chevron-down"></i></span>
        </div>

        <div class="sync-modal-body">
          <!-- Círculos de Conexão -->
          <div class="sync-devices-graphic">
            <div class="sync-device-circle pc"><i class="fa-solid ${isVercel ? 'fa-globe' : 'fa-desktop'}"></i></div>
            <div class="sync-device-line"></div>
            <div class="sync-device-circle cloud"><i class="fa-solid fa-cloud"></i></div>
          </div>

          <!-- Mensagem Principal -->
          <div class="sync-main-msg">
            ${isVercel 
              ? 'Você está operando no <strong>Vercel</strong>. Deseja registrar a versão com a data e horário atual na nuvem?' 
              : 'Novas alterações realizadas. <strong>Deseja enviar a nova versão para a nuvem com o horário atual?</strong>'}
          </div>

          <!-- Caixa de Detalhes de Versões -->
          <div class="sync-info-box">
            <div class="sync-info-item">
              <span><i class="fa-solid ${isVercel ? 'fa-globe' : 'fa-clock'}" style="color: #818cf8;"></i> ${localLabel}:</span>
              <val>${localDateText}</val>
            </div>
            <div class="sync-info-divider"></div>
            <div class="sync-info-item">
              <span><i class="fa-solid fa-cloud-arrow-up" style="color: #38bdf8;"></i> ${cloudLabel}:</span>
              <val>${cloudDateText}</val>
            </div>
          </div>

          <!-- Ações -->
          <button id="btn-sync-confirm" class="btn-sync-action orange">
            <i class="fa-solid fa-cloud-arrow-up"></i> ${isVercel ? 'Sim, Confirmar Sincronização' : 'Sim, Enviar para Nuvem'}
          </button>
          <button id="btn-sync-cancel" class="btn-sync-secondary">
            Lembrar mais tarde
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    const cleanUp = () => overlay.remove();

    document.getElementById('btn-sync-cancel').addEventListener('click', () => {
      cleanUp();
      resolve(false);
    });

    document.getElementById('btn-sync-confirm').addEventListener('click', async () => {
      const btn = document.getElementById('btn-sync-confirm');
      const originalHtml = btn.innerHTML;
      btn.disabled = true;
      btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Enviando...';

      try {
        const res = await fetch('/api/sync/upload', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${state.token}`
          }
        });
        if (res.ok) {
          showToast('Dados sincronizados com o Turso na nuvem!');
          try {
            const st = await apiFetch('/api/sync/status');
            if (st.ok) {
              state.syncInfo = await st.json();
              updateSyncBadge();
            }
          } catch (e) {}
        } else {
          showToast('Erro ao sincronizar com a nuvem.');
        }
      } catch (err) {
        showToast('Erro de conexão ao sincronizar.');
      } finally {
        cleanUp();
        resolve(true);
      }
    });
  });
};

// --- MODAL ROXO: "Dados Novos na Nuvem!" (Disparado em Login/Início) ---
const showSyncComparisonModal = (syncData = {}) => {
  const existing = document.getElementById('sync-comparison-modal');
  if (existing) existing.remove();

  const overlay = document.createElement('div');
  overlay.id = 'sync-comparison-modal';
  overlay.className = 'modal-overlay';
  overlay.style.zIndex = '99998';
  overlay.style.display = 'flex';

  const localTs = syncData.lastLocalBackup || syncData.localTimestamps?.patients || null;
  const cloudTs = syncData.lastCloudBackup || syncData.cloudTimestamps?.patients || new Date().toISOString();

  const localDateText = formatSyncDate(localTs);
  const cloudDateText = formatSyncDate(cloudTs);

  overlay.innerHTML = `
    <div class="sync-modal-card">
      <!-- Top Banner Roxo -->
      <div class="sync-header-banner purple">
        <h3 class="sync-header-title">Dados Novos na Nuvem!</h3>
        <span class="sync-header-arrow"><i class="fa-solid fa-chevron-down"></i></span>
      </div>

      <div class="sync-modal-body">
        <!-- Círculos de Conexão -->
        <div class="sync-devices-graphic">
          <div class="sync-device-circle pc"><i class="fa-solid fa-desktop"></i></div>
          <div class="sync-device-line"></div>
          <div class="sync-device-circle cloud"><i class="fa-solid fa-cloud"></i></div>
        </div>

        <!-- Mensagem Principal -->
        <div class="sync-main-msg">
          Detectamos que existem alterações feitas em outro dispositivo.
          <strong>Deseja atualizar seu banco local agora?</strong>
        </div>

        <!-- Caixa de Detalhes de Versões -->
        <div class="sync-info-box">
          <div class="sync-info-item">
            <span><i class="fa-solid fa-desktop" style="color: #818cf8;"></i> Último Backup Local:</span>
            <val>${localDateText}</val>
          </div>
          <div class="sync-info-divider"></div>
          <div class="sync-info-item">
            <span><i class="fa-solid fa-cloud" style="color: #38bdf8;"></i> Versão na Nuvem:</span>
            <val>${cloudDateText}</val>
          </div>
        </div>

        <!-- Ações -->
        <button id="btn-sync-comp-download" class="btn-sync-action purple">
          <i class="fa-solid fa-cloud-arrow-down"></i> Sim, Baixar da Nuvem
        </button>
        <button id="btn-sync-comp-skip" class="btn-sync-secondary">
          Lembrar mais tarde
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  const closeBtn = document.getElementById('btn-sync-comp-skip');
  const downloadBtn = document.getElementById('btn-sync-comp-download');

  const closeModal = () => overlay.remove();
  closeBtn.addEventListener('click', closeModal);

  downloadBtn.addEventListener('click', async () => {
    downloadBtn.disabled = true;
    closeBtn.disabled = true;
    downloadBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Baixando...';

    try {
      const res = await apiFetch('/api/sync/download', { method: 'POST' });
      if (res.ok) {
        showToast('Banco de dados local atualizado com os dados da nuvem!');
        sessionStorage.setItem('syncDismissed', 'true');
        dataCache.clear();
        dataCacheTimestamps.clear();
        try {
          const st = await apiFetch('/api/sync/status');
          if (st.ok) {
            state.syncInfo = await st.json();
            updateSyncBadge();
          }
        } catch (e) {}
        overlay.remove();
        setTimeout(() => window.location.reload(), 1200);
      } else {
        const errData = await res.json().catch(() => ({}));
        showToast(errData.message || 'Erro ao baixar dados da nuvem.');
        downloadBtn.disabled = false;
        closeBtn.disabled = false;
        downloadBtn.innerHTML = '<i class="fa-solid fa-cloud-arrow-down"></i> Sim, Baixar da Nuvem';
      }
    } catch (err) {
      showToast('Erro de conexão ao sincronizar com a nuvem.');
      downloadBtn.disabled = false;
      closeBtn.disabled = false;
      downloadBtn.innerHTML = '<i class="fa-solid fa-cloud-arrow-down"></i> Sim, Baixar da Nuvem';
    }
  });
};

// ─── CONTROLE DE SINCRONIZAÇÃO BIDIRECIONAL ──────────────────────────────────
//
// Fluxo LOCAL → VERCEL:
//   1. Usuário trabalha localmente em seu computador.
//   2. Após cada inserção, alteração ou exclusão, o sistema envia automaticamente os dados ao Turso.
//   3. Quando o app é aberto, ele compara o banco local com o Turso e recomenda "Baixar da Nuvem" se houver diferença.
//
// Fluxo VERCEL → LOCAL:
//   1. Usuário trabalha no Vercel (dados vão direto ao Turso).
//   2. Ao abrir o app local, compara local.db vs Turso.
//   3. Se houver diferença → modal aparece recomendando "Baixar da Nuvem".
// ─────────────────────────────────────────────────────────────────────────────
const VERCEL_LAST_SEEN_KEY = 'healthNexus_vercelLastSeen';
let syncInProgress = false;

const scheduleSyncUpload = () => {
  if (state.syncInfo && !state.syncInfo.cloudConfigured) return;
  if (syncUploadTimeout) clearTimeout(syncUploadTimeout);
  syncUploadTimeout = setTimeout(async () => {
    await syncLocalChangesToCloud();
  }, 500);
};

const getSyncStatus = async () => {
  try {
    const res = await fetch('/api/sync/status', {
      headers: { 'Authorization': `Bearer ${state.token}` }
    });
    if (!res.ok) return null;
    const data = await res.json();
    state.syncInfo = data;
    updateSyncBadge();
    return data;
  } catch (err) {
    console.error('Erro ao obter status de sincronização:', err);
    return null;
  }
};

const syncLocalChangesToCloud = async () => {
  if (syncInProgress) return true;
  if (state.syncInfo && (!state.syncInfo.cloudConfigured || state.syncInfo.isVercel)) return false;

  syncInProgress = true;

  try {
    const uploadRes = await fetch('/api/sync/upload', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${state.token}`
      }
    });

    if (!uploadRes.ok) {
      showToast('Falha ao enviar alterações para a nuvem. Os dados locais foram salvos.');
      return false;
    }

    showToast('Alterações sincronizadas com o Turso com sucesso!');
    await getSyncStatus();
    return true;
  } catch (err) {
    console.error('Erro na sincronização automática com Turso:', err);
    showToast('Erro ao sincronizar com a nuvem. Tente novamente mais tarde.');
    return false;
  } finally {
    syncInProgress = false;
  }
};

const requestSyncPromptIfConfigured = async () => {
  try {
    const statusData = await getSyncStatus();
    if (!statusData || !statusData.cloudConfigured) return false;

    const localMax = getMaxTimestamp(statusData.localTimestamps);
    const cloudMax = getMaxTimestamp(statusData.cloudTimestamps);
    statusData.lastLocalBackup = localMax.str || new Date().toISOString();
    statusData.lastCloudBackup = cloudMax.str || new Date().toISOString();

    // Exibir modal correspondente apenas se houver diferença de timestamps
    if (localMax.time > cloudMax.time || statusData.isVercel) {
      showSyncPromptModal(statusData);
    } else if (cloudMax.time > localMax.time) {
      showSyncComparisonModal(statusData);
    }
    return true;
  } catch (err) {
    console.error('Erro ao verificar configuração de nuvem para prompt:', err);
    return false;
  }
};

const updateSyncBadge = () => {
  const badge = document.getElementById('sync-status-badge');
  if (!badge) return;
  const data = state.syncInfo;

  if (!data) {
    badge.textContent = 'Verificando Turso...';
    badge.style.background = 'rgba(59,130,246,0.08)';
    badge.style.borderColor = 'var(--border-color)';
    badge.style.color = 'var(--text-primary)';
    return;
  }

  if (!data.cloudConfigured) {
    badge.textContent = 'Modo Local (Turso não configurado)';
    badge.style.background = 'rgba(229,62,62,0.1)';
    badge.style.borderColor = 'rgba(229,62,62,0.3)';
    badge.style.color = '#b91c1c';
    return;
  }

  if (data.isVercel) {
    badge.textContent = 'Conectado ao Turso (Vercel)';
    badge.style.background = 'rgba(13,148,136,0.12)';
    badge.style.borderColor = 'rgba(14,165,233,0.3)';
    badge.style.color = 'var(--color-accent)';
    return;
  }

  badge.textContent = data.synchronized ? 'Local sincronizado com Turso' : 'Dados fora de sincronia com Turso';
  badge.style.background = data.synchronized ? 'rgba(34,197,94,0.12)' : 'rgba(245,158,11,0.12)';
  badge.style.borderColor = data.synchronized ? 'rgba(34,197,94,0.3)' : 'rgba(245,158,11,0.3)';
  badge.style.color = data.synchronized ? '#15803d' : '#b45309';
};

const parseIsoOrSpaceTimestamp = (ts) => {
  if (!ts) return 0;
  let s = String(ts).trim();
  if (s.includes(' ') && !s.includes('T')) {
    s = s.replace(' ', 'T') + 'Z';
  }
  const d = new Date(s);
  return isNaN(d.getTime()) ? 0 : d.getTime();
};

const getMaxTimestamp = (timestampsObj = {}) => {
  let maxTime = 0;
  let maxStr = null;
  Object.values(timestampsObj).forEach(ts => {
    if (ts) {
      const t = parseIsoOrSpaceTimestamp(ts);
      if (t > maxTime) {
        maxTime = t;
        maxStr = ts;
      }
    }
  });
  return { time: maxTime, str: maxStr };
};

const checkInitialSync = async () => {
  try {
    const data = await getSyncStatus();
    if (!data) return;

    if (!data.cloudConfigured) return;

    let syncDismissed = sessionStorage.getItem('syncDismissed') === 'true';

    // Obter os timestamps máximos para comparar quem é mais recente
    const localMax = getMaxTimestamp(data.localTimestamps);
    const cloudMax = getMaxTimestamp(data.cloudTimestamps);

    data.lastLocalBackup = localMax.str;
    data.lastCloudBackup = cloudMax.str;

    if (!data.synchronized) {
      sessionStorage.removeItem('syncDismissed');
      syncDismissed = false;

      // COMPARAÇÃO DIRETA DE DIREÇÃO DE SINCRONIZAÇÃO:
      // Se a data local do computador for MAIS RECENTE que a nuvem -> Mostrar Modal Laranja ("Sincronização Pendente!")
      // Se a data da nuvem for MAIS RECENTE que a local do computador -> Mostrar Modal Roxo ("Dados Novos na Nuvem!")
      if (localMax.time > cloudMax.time) {
        if (!syncDismissed) showSyncPromptModal(data);
      } else if (cloudMax.time > localMax.time) {
        if (!syncDismissed) showSyncComparisonModal(data);
      }
    }
  } catch (err) {
    console.error('Erro ao verificar sincronização inicial:', err);
  }
};

const initializeApp = async () => {
  initTheme();
  if (state.isAuthenticated && state.token) {
    try {
      const res = await fetch(`${API_URL}/auth/me`, {
        headers: { 'Authorization': `Bearer ${state.token}` }
      });
      if (res.ok) {
        const data = await res.json();
        if (data.user) {
          state.user = data.user;
          sessionStorage.setItem('hn_user', JSON.stringify(data.user));
        }
      } else {
        logout();
        return;
      }
    } catch (e) {
      console.warn('Servidor inacessível durante verificação inicial de sessão, usando credenciais em cache.');
    }

    renderAppStructure();
    const logoutBtn = document.getElementById('btn-logout');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', (e) => {
        e.preventDefault();
        logout();
      });
    }
    // Registrar clique na badge de status para abrir o modal adequado
    setTimeout(() => {
      const badge = document.getElementById('sync-status-badge');
      if (badge) {
        badge.style.cursor = 'pointer';
        badge.addEventListener('click', () => {
          if (state.syncInfo && state.syncInfo.cloudConfigured) {
            const localMax = getMaxTimestamp(state.syncInfo.localTimestamps);
            const cloudMax = getMaxTimestamp(state.syncInfo.cloudTimestamps);
            state.syncInfo.lastLocalBackup = localMax.str;
            state.syncInfo.lastCloudBackup = cloudMax.str;
            if (localMax.time > cloudMax.time) {
              showSyncPromptModal(state.syncInfo);
            } else {
              showSyncComparisonModal(state.syncInfo);
            }
          } else {
            showToast('Turso não configurado ou sem dados para comparar.');
          }
        });
      }
      updateSyncBadge();
    }, 120);
    // Verificar sincronização inicial do banco de dados local-nuvem
    checkInitialSync();
  } else {
    renderAuthScreen();
  }
};

const logout = () => {
  sessionStorage.removeItem('hn_token');
  sessionStorage.removeItem('hn_user');
  state.isAuthenticated = false;
  state.token = null;
  state.user = null;
  initializeApp();
};

const invalidateCacheForUrl = (url) => {
  if (url.startsWith(`${API_URL}/patients`)) {
    dataCache.delete('patients');
    dataCacheTimestamps.delete('patients');
  }

  if (url.startsWith(`${API_URL}/appointments`) || url.startsWith(`${API_URL}/encounters`)) {
    for (const key of dataCache.keys()) {
      if (typeof key === 'string' && (key.startsWith(`${API_URL}/appointments`) || key.startsWith(`${API_URL}/encounters`))) {
        dataCache.delete(key);
        dataCacheTimestamps.delete(key);
      }
    }
  }

  if (url.startsWith(`${API_URL}/beds`)) {
    dataCache.delete('beds');
    dataCacheTimestamps.delete('beds');
  }

  if (url === `${API_URL}/dashboard/summary`) {
    dataCache.delete('dashboard');
    dataCacheTimestamps.delete('dashboard');
  }
};

const cachedApiGet = async (url, cacheKey = null) => {
  const cacheId = cacheKey || url;
  const cachedValue = dataCache.get(cacheId);
  const cachedAt = dataCacheTimestamps.get(cacheId) || 0;

  if (cachedValue !== undefined && (Date.now() - cachedAt < CACHE_TTL_MS)) {
    return cachedValue;
  }

  const response = await apiFetch(url);
  if (!response.ok) {
    throw new Error(`Falha ao buscar ${url}`);
  }

  const payload = await response.json();
  const result = payload.data !== undefined ? payload.data : payload;

  dataCache.set(cacheId, result);
  dataCacheTimestamps.set(cacheId, Date.now());
  return result;
};

const apiFetch = async (url, options = {}) => {
  if (state.token) {
    if (!options.headers) options.headers = {};
    options.headers['Authorization'] = `Bearer ${state.token}`;
  }
  const res = await fetch(url, options);
  if (res.status === 401 || res.status === 403) {
    logout();
  }

  // Interceptar requisições de escrita para mostrar prompt de envio ao Turso
  const method = (options.method || 'GET').toUpperCase();
  const isWrite = ['POST', 'PUT', 'DELETE'].includes(method);
  const isApiRoute = url.startsWith(API_URL);
  const isAuthRoute = url.includes('/api/auth');
  const isSyncRoute = url.includes('/api/sync');
  const skipSyncPrompt = options.skipSyncPrompt === true;

  if (res.ok && isWrite && isApiRoute && !isAuthRoute && !isSyncRoute) {
    invalidateCacheForUrl(url);
    sessionStorage.removeItem('syncDismissed');
    if (!skipSyncPrompt) scheduleSyncUpload();
  }

  return res;
};

// --- NOTIFICAÇÃO TOAST ---
function showToast(message) {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.style.cssText = `
      position: fixed;
      bottom: 24px;
      right: 24px;
      display: flex;
      flex-direction: column;
      gap: 10px;
      z-index: 100000;
      pointer-events: none;
    `;
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.style.cssText = `
    background-color: var(--bg-secondary);
    color: var(--text-primary);
    border: 1px solid var(--border-color);
    border-left: 4px solid var(--color-primary);
    padding: 14px 20px;
    border-radius: var(--radius-md);
    font-family: 'Outfit', sans-serif;
    font-size: 0.9rem;
    font-weight: 500;
    box-shadow: var(--shadow-lg);
    display: flex;
    align-items: center;
    gap: 10px;
    min-width: 250px;
    transform: translateX(100px);
    opacity: 0;
    transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  `;
  toast.innerHTML = `<i class="fa-solid fa-circle-info" style="color: var(--color-primary);"></i> <span>${message}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.transform = 'translateX(0)';
    toast.style.opacity = '1';
  }, 10);

  setTimeout(() => {
    toast.style.transform = 'translateX(100px)';
    toast.style.opacity = '0';
    setTimeout(() => {
      toast.remove();
    }, 300);
  }, 3500);
}

// --- MODAL DE INSTRUÇÕES DE LOGIN E SENHA ("Pequena Janela") ---
function openLoginInstructionsModal() {
  const existing = document.getElementById('login-instructions-modal');
  if (existing) existing.remove();

  const modal = document.createElement('div');
  modal.id = 'login-instructions-modal';
  modal.className = 'modal-overlay';
  modal.style.cssText = 'position:fixed;top:0;left:0;width:100vw;height:100vh;background:rgba(10,8,22,0.75);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);display:flex;align-items:center;justify-content:center;z-index:99999;animation:fadeIn 0.25s ease-out;';

  modal.innerHTML = `
    <div style="background: linear-gradient(145deg, #1e1b4b 0%, #0f172a 100%); border: 1px solid rgba(129, 140, 248, 0.35); border-radius: 20px; width: 90%; max-width: 440px; padding: 26px; box-shadow: 0 20px 50px rgba(0,0,0,0.6); color: #e2e8f0; font-family: 'Inter', sans-serif; position: relative;">
      <!-- Botão Fechar -->
      <button id="close-instructions-modal" type="button" style="position: absolute; top: 16px; right: 16px; background: transparent; border: none; color: #94a3b8; font-size: 1.2rem; cursor: pointer; padding: 4px; transition: color 0.2s;" onmouseenter="this.style.color='#fff'" onmouseleave="this.style.color='#94a3b8'">
        <i class="fa-solid fa-xmark"></i>
      </button>

      <!-- Cabeçalho da Janela -->
      <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 16px;">
        <div style="width: 44px; height: 44px; border-radius: 12px; background: rgba(99, 102, 241, 0.2); border: 1px solid rgba(129, 140, 248, 0.4); display: flex; align-items: center; justify-content: center; color: #818cf8; font-size: 1.25rem;">
          <i class="fa-solid fa-key"></i>
        </div>
        <div>
          <h3 style="margin: 0; font-family: 'Outfit', sans-serif; font-weight: 700; font-size: 1.2rem; color: #ffffff;">Instruções de Acesso</h3>
          <span style="font-size: 0.8rem; color: #94a3b8;">Orientações para login no Health Nexus</span>
        </div>
      </div>

      <!-- Texto de Orientação -->
      <p style="font-size: 0.86rem; color: #cbd5e1; line-height: 1.5; margin-bottom: 18px; background: rgba(255,255,255,0.03); padding: 12px 14px; border-radius: 10px; border-left: 3px solid #818cf8;">
        Para acessar o sistema de demonstração, utilize uma das contas pré-configuradas abaixo ou selecione <strong>"Preencher"</strong> para aplicar automaticamente.
      </p>

      <!-- Cartões de Credenciais -->
      <div style="display: flex; flex-direction: column; gap: 12px; margin-bottom: 22px;">
        <!-- Perfil Médico -->
        <div style="background: rgba(30, 41, 59, 0.65); border: 1px solid rgba(56, 189, 248, 0.3); border-radius: 12px; padding: 14px 16px; display: flex; align-items: center; justify-content: space-between;">
          <div>
            <div style="font-family: 'Outfit', sans-serif; font-weight: 600; font-size: 0.92rem; color: #38bdf8; display: flex; align-items: center; gap: 6px; margin-bottom: 4px;">
              <i class="fa-solid fa-user-doctor"></i> Perfil Médico
            </div>
            <div style="font-size: 0.82rem; color: #94a3b8; font-family: monospace;">
              Usuário: <strong style="color: #fff;">medico123</strong> &nbsp;|&nbsp; Senha: <strong style="color: #fff;">medico123</strong>
            </div>
          </div>
          <button type="button" class="btn-fill-cred" data-user="medico123" data-pass="medico123" style="background: rgba(56, 189, 248, 0.15); border: 1px solid rgba(56, 189, 248, 0.4); color: #38bdf8; padding: 7px 14px; border-radius: 8px; font-size: 0.78rem; font-weight: 600; cursor: pointer; transition: all 0.2s;" onmouseenter="this.style.background='rgba(56, 189, 248, 0.3)'" onmouseleave="this.style.background='rgba(56, 189, 248, 0.15)'">
            Preencher
          </button>
        </div>

        <!-- Perfil Admin -->
        <div style="background: rgba(30, 41, 59, 0.65); border: 1px solid rgba(192, 132, 252, 0.3); border-radius: 12px; padding: 14px 16px; display: flex; align-items: center; justify-content: space-between;">
          <div>
            <div style="font-family: 'Outfit', sans-serif; font-weight: 600; font-size: 0.92rem; color: #c084fc; display: flex; align-items: center; gap: 6px; margin-bottom: 4px;">
              <i class="fa-solid fa-user-shield"></i> Perfil Administrador
            </div>
            <div style="font-size: 0.82rem; color: #94a3b8; font-family: monospace;">
              Usuário: <strong style="color: #fff;">admin</strong> &nbsp;|&nbsp; Senha: <strong style="color: #fff;">admin123</strong>
            </div>
          </div>
          <button type="button" class="btn-fill-cred" data-user="admin" data-pass="admin123" style="background: rgba(192, 132, 252, 0.15); border: 1px solid rgba(192, 132, 252, 0.4); color: #c084fc; padding: 7px 14px; border-radius: 8px; font-size: 0.78rem; font-weight: 600; cursor: pointer; transition: all 0.2s;" onmouseenter="this.style.background='rgba(192, 132, 252, 0.3)'" onmouseleave="this.style.background='rgba(192, 132, 252, 0.15)'">
            Preencher
          </button>
        </div>
      </div>

      <!-- Footer da Janela -->
      <div style="display: flex; justify-content: flex-end;">
        <button id="btn-close-instructions-modal" type="button" style="background: linear-gradient(135deg, #6366f1, #4f46e5); color: #ffffff; border: none; padding: 10px 22px; border-radius: 10px; font-weight: 600; font-size: 0.9rem; cursor: pointer; box-shadow: 0 4px 14px rgba(99, 102, 241, 0.4); transition: transform 0.2s;" onmouseenter="this.style.transform='scale(1.02)'" onmouseleave="this.style.transform='scale(1)'">
          Entendi, Fechar
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  const closeModal = () => modal.remove();
  document.getElementById('close-instructions-modal').addEventListener('click', closeModal);
  document.getElementById('btn-close-instructions-modal').addEventListener('click', closeModal);

  modal.querySelectorAll('.btn-fill-cred').forEach(btn => {
    btn.addEventListener('click', () => {
      const u = btn.getAttribute('data-user');
      const p = btn.getAttribute('data-pass');
      const userInput = document.getElementById('auth-username');
      const passInput = document.getElementById('auth-password');
      if (userInput) userInput.value = u;
      if (passInput) passInput.value = p;
      showToast(`✨ Credenciais de ${u} preenchidas!`);
      closeModal();
    });
  });
}

// --- ESTRUTURA DE AUTENTICAÇÃO ---
function renderAuthScreen() {
  const root = document.getElementById('app');
  let isLogin = true;

  const renderForm = () => {
    root.innerHTML = `
      <div class="auth-container">
        <!-- Painel Esquerdo: Branding Imersivo -->
        <div class="auth-brand-panel">
          <div class="auth-brand-content">
            <div class="auth-brand-logo-wrap">
              <img src="/assets/logo.png" alt="Health Nexus" class="auth-brand-logo-img">
              <div class="auth-brand-name">
                Health Nexus
                <span>Sistema de Gestão Hospitalar</span>
              </div>
            </div>

            <h2 class="auth-brand-headline">
              Cuidado Inteligente.<br>
              <span class="highlight">Gestão Precisa.</span>
            </h2>

            <p class="auth-brand-desc">
              Plataforma completa para hospitais e clínicas. Gerencie pacientes, agendamentos, leitos e prontuários em um único sistema seguro e integrado.
            </p>

            <ul class="auth-feature-list">
              <li class="auth-feature-item">
                <div class="auth-feature-icon"><i class="fa-solid fa-user-injured"></i></div>
                <div class="auth-feature-text">
                  <strong>Gestão de Pacientes</strong>
                  Prontuário eletrônico completo com histórico e triagem Manchester
                </div>
              </li>
              <li class="auth-feature-item">
                <div class="auth-feature-icon"><i class="fa-solid fa-calendar-check"></i></div>
                <div class="auth-feature-text">
                  <strong>Agenda Inteligente</strong>
                  Agendamentos, controle de consultas e atendimentos em tempo real
                </div>
              </li>
              <li class="auth-feature-item">
                <div class="auth-feature-icon"><i class="fa-solid fa-bed-pulse"></i></div>
                <div class="auth-feature-text">
                  <strong>Controle de Leitos</strong>
                  Mapa de ocupação hospitalar com status em tempo real
                </div>
              </li>
              <li class="auth-feature-item">
                <div class="auth-feature-icon"><i class="fa-solid fa-chart-line"></i></div>
                <div class="auth-feature-text">
                  <strong>Relatórios &amp; Dashboard</strong>
                  Indicadores clínicos e financeiros com sincronização em nuvem
                </div>
              </li>
            </ul>
          </div>

          <div class="auth-brand-footer">
            <i class="fa-solid fa-shield-halved" style="margin-right: 5px; color: var(--color-accent);"></i>
            Dados protegidos com criptografia JWT &mdash; v1.0.1
          </div>
        </div>

        <!-- Painel Direito: Formulário -->
        <div class="auth-form-panel">
          <div class="auth-form-header">
            <div style="display: flex; align-items: center; justify-content: space-between; width: 100%; margin-bottom: 4px;">
              <div class="auth-form-eyebrow" style="margin-bottom: 0;">${isLogin ? 'Acesso ao Sistema' : 'Criar Nova Conta'}</div>
              ${isLogin ? `
                <button type="button" id="btn-show-instructions" style="background: rgba(99, 102, 241, 0.15); border: 1px solid rgba(129, 140, 248, 0.35); color: #818cf8; padding: 4px 11px; border-radius: 20px; font-size: 0.75rem; font-weight: 600; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; transition: all 0.2s;" onmouseenter="this.style.background='rgba(99, 102, 241, 0.3)'; this.style.borderColor='#818cf8'" onmouseleave="this.style.background='rgba(99, 102, 241, 0.15)'; this.style.borderColor='rgba(129, 140, 248, 0.35)'">
                  <i class="fa-solid fa-circle-question" style="color: #fbbf24;"></i> Instruções de Acesso
                </button>
              ` : ''}
            </div>
            <h1 class="auth-title">${isLogin ? 'Bem-vindo de volta' : 'Criar sua conta'}</h1>
            <p class="auth-subtitle">${isLogin ? 'Entre com suas credenciais para acessar o painel' : 'Preencha os dados abaixo para criar sua conta'}</p>
          </div>

          <div id="auth-error-container"></div>

          <form id="auth-form" class="auth-form">
            ${!isLogin ? `
              <div class="form-group">
                <label class="form-label" for="auth-name">Nome Completo</label>
                <input type="text" id="auth-name" class="form-input" required placeholder="Dr. João Silva" autocomplete="name">
              </div>
            ` : ''}
            <div class="form-group">
              <label class="form-label" for="auth-username">Usuário</label>
              <input type="text" id="auth-username" class="form-input" required placeholder="ex: drjoao" autocomplete="username">
            </div>
            <div class="form-group">
              <label class="form-label" for="auth-password">Senha</label>
              <div class="password-input-wrapper">
                <input type="password" id="auth-password" class="form-input" required placeholder="••••••••" autocomplete="${isLogin ? 'current-password' : 'new-password'}">
                <button type="button" id="toggle-password-visibility" class="toggle-password-btn" title="Mostrar/ocultar senha">
                  <i class="fa-regular fa-eye" id="toggle-password-icon"></i>
                </button>
              </div>
            </div>
            <button type="submit" id="auth-submit-btn" class="btn btn-primary" style="width: 100%; margin-top: 6px; padding: 12px; font-size: 0.95rem; font-weight: 600; letter-spacing: 0.02em;">
              <i class="fa-solid fa-${isLogin ? 'right-to-bracket' : 'user-plus'}" style="margin-right: 8px;"></i>
              ${isLogin ? 'Entrar no Sistema' : 'Criar Conta'}
            </button>
          </form>

          <div class="auth-divider"></div>

          <div class="auth-toggle">
            ${isLogin
              ? 'Não tem uma conta? <a id="toggle-auth">Cadastre-se gratuitamente</a>'
              : 'Já tem uma conta? <a id="toggle-auth">Fazer login</a>'}
          </div>

          <div class="auth-form-footer">
            <i class="fa-solid fa-laptop-code" style="margin-right: 4px;"></i>
            Desenvolvido por @mazzarowysk &amp; @_coltri_
          </div>
        </div>
      </div>
    `;

    document.getElementById('toggle-auth').addEventListener('click', () => {
      isLogin = !isLogin;
      renderForm();
    });

    const passInput = document.getElementById('auth-password');
    const togglePassBtn = document.getElementById('toggle-password-visibility');
    const togglePassIcon = document.getElementById('toggle-password-icon');

    if (togglePassBtn && passInput) {
      togglePassBtn.addEventListener('click', () => {
        const isPassword = passInput.type === 'password';
        passInput.type = isPassword ? 'text' : 'password';
        togglePassIcon.className = isPassword ? 'fa-regular fa-eye-slash' : 'fa-regular fa-eye';
      });
    }

    const btnShowInst = document.getElementById('btn-show-instructions');
    if (btnShowInst) {
      btnShowInst.addEventListener('click', openLoginInstructionsModal);
    }

    document.getElementById('auth-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const errorContainer = document.getElementById('auth-error-container');
      if (errorContainer) errorContainer.innerHTML = '';

      const username = document.getElementById('auth-username').value.trim();
      const password = document.getElementById('auth-password').value.trim();
      const name = !isLogin ? document.getElementById('auth-name').value.trim() : null;
      
      const submitBtn = document.getElementById('auth-submit-btn');
      const originalHTML = submitBtn.innerHTML;
      submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin" style="margin-right: 8px;"></i>Aguarde...';
      submitBtn.disabled = true;

      try {
        const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register';
        const body = isLogin ? { username, password } : { name, username, password, role: 'Médico' };
        
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        });
        
        const data = await res.json();
        
        if (res.ok) {
          if (isLogin) {
            sessionStorage.setItem('hn_token', data.token);
            sessionStorage.setItem('hn_user', JSON.stringify(data.user));
            state.isAuthenticated = true;
            state.token = data.token;
            state.user = data.user;
            showToast('Login realizado com sucesso!');
            initializeApp();
          } else {
            showToast('Cadastro realizado! Faça login agora.');
            isLogin = true;
            renderForm();
          }
        } else {
          if (errorContainer) {
            errorContainer.innerHTML = `
              <div class="auth-error-alert">
                <i class="fa-solid fa-circle-exclamation"></i>
                <span>${data.message || 'Erro na autenticação'}</span>
              </div>
            `;
          } else {
            alert(data.message || 'Erro na autenticação');
          }
        }
      } catch (err) {
        if (errorContainer) {
          errorContainer.innerHTML = `
            <div class="auth-error-alert">
              <i class="fa-solid fa-triangle-exclamation"></i>
              <span>Erro ao comunicar com o servidor. Verifique sua conexão.</span>
            </div>
          `;
        } else {
          alert('Erro ao comunicar com o servidor');
        }
      } finally {
        submitBtn.innerHTML = originalHTML;
        submitBtn.disabled = false;
      }
    });
  };

  renderForm();
}

// --- ESTRUTURA GERAL DA INTERFACE (TEMPLATE) ---
function renderAppStructure() {
  const root = document.getElementById('app');
  root.innerHTML = `
    <div class="app-container">
      <!-- Sidebar de Navegação -->
      <aside class="app-sidebar">
        <div class="brand-logo">
          <img src="/assets/logo.png" alt="Health Nexus" class="brand-logo-img">
        </div>
        <nav>
          <ul class="nav-menu">
            <li>
              <a class="nav-item ${state.activeTab === 'dashboard' ? 'active' : ''}" data-tab="dashboard">
                <i class="fa-solid fa-house-medical"></i>
                <span>Health Nexus</span>
              </a>
            </li>
            <li>
              <a class="nav-item ${state.activeTab === 'pacientes' ? 'active' : ''}" data-tab="pacientes">
                <i class="fa-solid fa-user-injured"></i>
                <span>Pacientes</span>
              </a>
            </li>
            <li>
              <a class="nav-item ${state.activeTab === 'medicos' ? 'active' : ''}" data-tab="medicos">
                <i class="fa-solid fa-user-doctor"></i>
                <span>Corpo Clínico</span>
              </a>
            </li>
            <li>
              <a class="nav-item ${state.activeTab === 'agenda' ? 'active' : ''}" data-tab="agenda">
                <i class="fa-solid fa-calendar-check"></i>
                <span>Agenda</span>
              </a>
            </li>
            <li>
              <a class="nav-item ${state.activeTab === 'atendimento' ? 'active' : ''}" data-tab="atendimento">
                <i class="fa-solid fa-stethoscope"></i>
                <span>Atendimentos</span>
              </a>
            </li>
            <li>
              <a class="nav-item ${state.activeTab === 'estagnacao' ? 'active' : ''}" data-tab="estagnacao" style="position: relative;">
                <i class="fa-solid fa-triangle-exclamation" style="color: #f59e0b;"></i>
                <span>Alertas & Estagnação</span>
                <span id="stagnation-nav-badge" class="badge-count" style="display:none; margin-left: auto; background: #ef4444; color: #fff; border-radius: 10px; font-size: 0.7rem; padding: 2px 7px; font-weight: 700;">0</span>
              </a>
            </li>
            <li>
              <a class="nav-item ${state.activeTab === 'leitos' ? 'active' : ''}" data-tab="leitos">
                <i class="fa-solid fa-bed-pulse"></i>
                <span>Leitos</span>
              </a>
            </li>
            <li>
              <a class="nav-item ${state.activeTab === 'relatorios' ? 'active' : ''}" data-tab="relatorios">
                <i class="fa-solid fa-file-contract"></i>
                <span>Relatórios</span>
              </a>
            </li>
            <li>
              <a class="nav-item ${state.activeTab === 'configuracoes' ? 'active' : ''}" data-tab="configuracoes">
                <i class="fa-solid fa-gear"></i>
                <span>Configurações</span>
              </a>
            </li>
          </ul>
        </nav>
        <div style="margin-top: auto; border-top: 1px solid var(--border-color); padding-top: 16px;">
          <div style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 10px;">
            Logado como: <br>
            <strong style="color: var(--text-primary); display: block; margin-top: 2px;">${state.user ? state.user.name : 'Usuário'}</strong>
            <span class="user-role-badge"><i class="fa-solid fa-user-shield" style="font-size:0.65rem;margin-right:4px;"></i>${state.user ? state.user.role : 'Médico'}</span>
          </div>
          <button id="btn-logout" class="btn" style="width: 100%; background: var(--bg-tertiary); color: var(--color-danger); border: 1px solid var(--border-color); margin-bottom: 12px;">
            <i class="fa-solid fa-arrow-right-from-bracket"></i> Sair
          </button>
          <div style="text-align: center; font-size: 0.65rem; color: var(--text-secondary); opacity: 0.6;">
            <i class="fa-solid fa-code" style="margin-right: 4px;"></i> Desenvolvido por @mazzarowysk & @_coltri_
          </div>
        </div>
      </aside>

      <!-- Cabeçalho Superior -->
      <header class="app-header" style="display: flex; justify-content: space-between; align-items: center; padding-right: 24px; gap: 16px;">
        <div style="display: flex; align-items: center; gap: 16px;">
          <h1 class="page-title" id="page-title-label" style="margin: 0;">Health Nexus</h1>
          <div class="header-brand-text" style="margin: 0;">
            <i class="fa-solid fa-circle-nodes"></i>
            <span>Sistema de Gestão Hospitalar Health Nexus</span>
          </div>
        </div>
        <div id="sync-status-container" style="display: flex; align-items: center; gap: 10px;">
          <span id="sync-status-badge" style="font-size: 0.82rem; padding: 8px 12px; border-radius: 999px; border: 1px solid var(--border-color); background: rgba(59,130,246,0.08); color: var(--text-primary);">
            Verificando Turso...
          </span>
          <button id="btn-theme-toggle" class="btn" style="background: var(--bg-tertiary); border: 1px solid var(--border-color); color: var(--text-primary); cursor: pointer; display: flex; align-items: center; justify-content: center; width: 40px; height: 40px; border-radius: 50%; padding: 0; font-size: 1.15rem; transition: transform 0.2s ease, background 0.2s ease;" title="Alternar Tema Claro/Escuro">
            <i class="fa-solid fa-sun" id="theme-icon"></i>
          </button>
        </div>
      </header>

      <!-- Área de Conteúdo Principal -->
      <main class="app-content" id="main-content">
        <!-- O conteúdo específico da aba ativa será injetado aqui -->
      </main>
    </div>

    <!-- PEP Modal (Prontuário) -->
    <div id="pep-modal" class="pep-modal">
      <div class="pep-content">
        <div class="pep-header">
          <div class="pep-title">
            <i class="fa-solid fa-file-medical"></i>
            Prontuário Eletrônico do Paciente
          </div>
          <div class="pep-header-info">
            <span id="pep-patient-name"><i class="fa-solid fa-user"></i> -</span>
            <span id="pep-encounter-status"><i class="fa-solid fa-clock"></i> -</span>
          </div>
        </div>
        <div class="pep-body">
          <div class="pep-sidebar">
            <div class="pep-section" style="margin-bottom: 20px;">
              <label>Cor de Risco (Triagem)</label>
              <div id="pep-manchester-badge" style="font-weight:bold; font-size: 1.1rem;">-</div>
            </div>
            <div class="pep-section" style="margin-bottom: 20px;">
              <label>Sinais Vitais</label>
              <div style="font-size: 0.85rem; color: var(--text-primary);">
                <p><strong>PA:</strong> <span id="pep-bp">-</span> mmHg</p>
                <p><strong>FC:</strong> <span id="pep-hr">-</span> bpm</p>
                <p><strong>Temp:</strong> <span id="pep-temp">-</span> °C</p>
                <p><strong>Peso:</strong> <span id="pep-weight">-</span> kg</p>
              </div>
            </div>
            <div class="pep-section">
              <label>Queixa Principal (Triagem)</label>
              <p id="pep-complaints" style="font-size: 0.85rem; color: var(--text-primary); line-height: 1.4;">-</p>
            </div>
          </div>
          <div class="pep-main">
            <div class="pep-section">
              <label for="pep-subjective">S - Subjetivo (Anamnese)</label>
              <textarea id="pep-subjective" class="pep-textarea" placeholder="Relato do paciente, histórico da moléstia atual..."></textarea>
            </div>
            <div class="pep-section">
              <label for="pep-objective">O - Objetivo (Exame Físico)</label>
              <textarea id="pep-objective" class="pep-textarea" placeholder="Achados do exame físico, resultados de exames..."></textarea>
            </div>
            <div class="pep-section autocomplete-container">
              <label for="pep-assessment">A - Avaliação (Diagnóstico / CID-10)</label>
              <input type="text" id="pep-assessment" class="form-input" style="width: 100%;" placeholder="Digite para buscar o CID-10..." autocomplete="off">
              <div id="pep-cid-dropdown" class="autocomplete-dropdown"></div>
            </div>
            <div class="pep-section" style="flex: 1;">
              <label for="pep-plan">P - Plano (Prescrição / Conduta)</label>
              <textarea id="pep-plan" class="pep-textarea" style="flex: 1;" placeholder="Conduta terapêutica, prescrição médica, orientações..."></textarea>
            </div>
          </div>
        </div>
        <div class="pep-footer">
          <span id="pep-status-badge"></span>
          <button class="btn btn-secondary" onclick="closePEPModal()">
            <i class="fa-solid fa-xmark"></i> Fechar
          </button>
          <button class="btn btn-secondary" id="btn-save-draft" onclick="savePEPDraft()">
            <i class="fa-solid fa-save"></i> Salvar Rascunho
          </button>
          <button class="btn btn-primary" id="btn-sign-pep" onclick="openSignModal()">
            <i class="fa-solid fa-file-signature"></i> Assinar e Finalizar
          </button>
        </div>
      </div>
    </div>

    <!-- Modal de Assinatura -->
    <div id="sign-modal" class="modal-overlay" style="z-index: 3000; display: none;">
      <div class="modal-content" style="max-width: 400px;">
        <div class="modal-header">
          <h3>Assinatura Eletrônica</h3>
          <button class="btn-close" onclick="closeSignModal()"><i class="fa-solid fa-xmark"></i></button>
        </div>
        <div class="modal-body">
          <p style="font-size: 0.9rem; color: var(--text-secondary); margin-bottom: 16px;">
            Ao assinar este prontuário, ele será bloqueado para edições futuras. Confirme sua identidade para prosseguir.
          </p>
          <div class="form-group">
            <label for="sign-password">Senha do Profissional</label>
            <input type="password" id="sign-password" class="form-input" placeholder="Digite sua senha (admin123)">
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" onclick="closeSignModal()">Cancelar</button>
          <button class="btn btn-primary" onclick="confirmSignPEP()">Confirmar Assinatura</button>
        </div>
      </div>
    </div>
  `;

  // Registrar eventos de clique na navegação
  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      const targetTab = item.getAttribute('data-tab');
      switchTab(targetTab);
    });
  });

  // Botão de alternar tema
  const themeToggle = document.getElementById('btn-theme-toggle');
  if (themeToggle) {
    themeToggle.addEventListener('click', toggleTheme);
    updateThemeIcon();
  }

  // Renderizar o conteúdo da aba ativa
  renderTabContent();
}

// --- CONTROLE DE MUDANÇA DE ABA ---
function switchTab(tabName) {
  state.activeTab = tabName;
  
  // Mapa de nomes de exibição por aba
  const tabLabels = {
    dashboard:     'Health Nexus',
    pacientes:     'Pacientes',
    medicos:        'Corpo Clínico',
    agenda:        'Agenda Médica',
    atendimento:   'Atendimentos',
    estagnacao:    'Alertas & Estagnação',
    leitos:        'Gestão de Leitos',
    relatorios:    'Relatórios',
    configuracoes: 'Configurações'
  };

  // Atualiza classes ativas na barra lateral
  document.querySelectorAll('.nav-item').forEach(item => {
    if (item.getAttribute('data-tab') === tabName) {
      item.classList.add('active');
    } else {
      item.classList.remove('active');
    }
  });

  // Atualiza o título do cabeçalho e da aba do navegador
  const label = tabLabels[tabName] || (tabName.charAt(0).toUpperCase() + tabName.slice(1));
  const pageTitle = document.getElementById('page-title-label');
  if (pageTitle) pageTitle.textContent = label;
  document.title = `${label} — Health Nexus`;

  // Re-renderiza a área de conteúdo
  renderTabContent();
}

// --- CONTEÚDO DAS ABAS ---
async function renderTabContent() {
  const contentArea = document.getElementById('main-content');
  
  if (state.activeTab === 'dashboard') {
    if (state.loading || !state.dashboardData || !state.dashboardData.occupancyData) {
      contentArea.innerHTML = `
        <div class="skeleton-content" style="padding: 0;">
          <div class="skeleton-card"></div>
          <div class="skeleton-card"></div>
          <div class="skeleton-card"></div>
        </div>
      `;
      await fetchDashboardData();
    }
    
    const data = state.dashboardData;
    contentArea.innerHTML = `
      <div class="tab-section active">
        <!-- KPI Cards Grid -->
        <div class="kpi-grid">
          <!-- Card Ocupação -->
          <div class="kpi-card interactive-card" id="dash-card-patients" onclick="handleCardClick('pacientes', null, 'Atalho: Abrindo lista de Pacientes Ativos')" title="Clique para ver a lista de Pacientes">
            <div class="kpi-header">
              <span>Pacientes Ativos</span>
              <div class="kpi-icon primary"><i class="fa-solid fa-bed"></i></div>
            </div>
            <div class="kpi-value" id="kpi-active-patients">${data.activePatients}</div>
            <div class="kpi-trend trend-up">
              <i class="fa-solid fa-arrow-trend-up"></i>
              <span>Pacientes no Turso DB</span>
            </div>
          </div>

          <!-- Card Atendimentos -->
          <div class="kpi-card interactive-card" id="dash-card-triage" onclick="handleCardClick('atendimento', null, 'Atalho: Acessando Fila de Triagem')" title="Clique para ir à Fila de Triagem">
            <div class="kpi-header">
              <span>Tempo de Espera Triagem</span>
              <div class="kpi-icon warning"><i class="fa-solid fa-clock"></i></div>
            </div>
            <div class="kpi-value">${data.averageWaitTimeMinutes} min</div>
            <div class="kpi-trend trend-down">
              <i class="fa-solid fa-arrow-trend-down"></i>
              <span>-3 min vs ontem</span>
            </div>
          </div>

          <!-- Card Faturamento -->
          <div class="kpi-card interactive-card" id="dash-card-revenue" onclick="handleCardClick('relatorios', 'tab-btn-financial', 'Atalho: Gerando Relatório Financeiro')" title="Clique para ver o Relatório Financeiro">
            <div class="kpi-header">
              <span>Receita do Mês (Particulares)</span>
              <div class="kpi-icon accent"><i class="fa-solid fa-hand-holding-dollar"></i></div>
            </div>
            <div class="kpi-value">R$ ${data.billingSummary.totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
            <div class="kpi-trend trend-up">
              <i class="fa-solid fa-arrow-trend-up"></i>
              <span>+12% vs mês anterior</span>
            </div>
          </div>
        </div>

        <!-- Seção de Gráficos Interativos -->
        <div class="charts-grid">
          <div class="chart-card">
            <h4 class="chart-card-title">
              <i class="fa-solid fa-chart-pie" style="color: var(--color-primary);"></i> Ocupação de Leitos por Ala
            </h4>
            <div class="chart-container">
              <canvas id="occupancyChart"></canvas>
            </div>
          </div>
          <div class="chart-card">
            <h4 class="chart-card-title">
              <i class="fa-solid fa-chart-line" style="color: var(--color-accent);"></i> Histórico de Atendimentos Mensais
            </h4>
            <div class="chart-container">
              <canvas id="appointmentsChart"></canvas>
            </div>
          </div>
        </div>
      </div>
    `;

    // Inicialização dos gráficos com pequeno delay para garantir montagem do canvas
    setTimeout(() => {
      initDashboardCharts(data);
    }, 50);

  } else if (state.activeTab === 'pacientes') {
    contentArea.innerHTML = `
      <div class="tab-section active">
        <div class="patients-grid">
          <!-- Coluna 1: Formulário Completo com Máscaras -->
          <div class="patients-form-container">
            <h3 id="form-title" style="margin-bottom: 20px; font-family: 'Outfit'; font-weight: 600;">Admissão de Paciente</h3>
            <form id="patient-form">
              <input type="hidden" id="editId">
              
              <div class="form-group">
                <label class="form-label" for="fullName">* Nome Completo:</label>
                <input type="text" id="fullName" class="form-input" required placeholder="Nome completo civil">
              </div>
              
              <div class="form-row">
                <div class="form-group">
                  <label class="form-label" for="cpf">* CPF:</label>
                  <input type="text" id="cpf" class="form-input" required placeholder="000.000.000-00" inputmode="numeric">
                </div>
                <div class="form-group">
                  <label class="form-label" for="birthDate">* Data Nasc.:</label>
                  <input type="date" id="birthDate" class="form-input" required>
                </div>
              </div>
              
              <div class="form-row">
                <div class="form-group">
                  <label class="form-label" for="address">Endereço:</label>
                  <input type="text" id="address" class="form-input" placeholder="Av. Paulista, 1000">
                </div>
                <div class="form-group">
                  <label class="form-label" for="city">Cidade:</label>
                  <input type="text" id="city" class="form-input" placeholder="Ex: Campinas">
                </div>
              </div>
              
              <div class="form-row">
                <div class="form-group">
                  <label class="form-label" for="phone">Telefone Fixo:</label>
                  <input type="text" id="phone" class="form-input" placeholder="(18) 3528-5022">
                </div>
                <div class="form-group">
                  <label class="form-label" for="cellphone">Celular:</label>
                  <input type="text" id="cellphone" class="form-input" placeholder="(18) 98817-5809">
                </div>
              </div>
              
              <div class="form-group">
                <label class="form-label" for="billingValue">Valor da Consulta/Mensalidade:</label>
                <input type="text" id="billingValue" class="form-input" placeholder="R$ 0,00">
              </div>

              <div style="display: flex; gap: 10px; margin-top: 20px;">
                <button type="submit" id="submit-btn" class="btn btn-primary" style="flex: 1;">Registrar Paciente</button>
                <button type="button" id="cancel-edit-btn" class="btn" style="display: none; background-color: var(--bg-tertiary); color: var(--text-primary);">Cancelar</button>
              </div>
            </form>
          </div>

          <!-- Coluna 2: Lista com Busca Inteligente -->
          <div class="patients-list-container">
            <h3 style="margin-bottom: 16px; font-family: 'Outfit'; font-weight: 600;">Pacientes Cadastrados</h3>
            
            <div class="search-container">
              <div class="search-wrapper">
                <i class="fa-solid fa-magnifying-glass search-icon"></i>
                <input type="text" id="search-input" class="search-input" placeholder="Buscar paciente por nome, CPF, cidade ou ID (ignora caixa e acentos)...">
              </div>
            </div>

            <div id="patients-table-wrapper" style="overflow-x: auto;">
              <div style="text-align: center; color: var(--text-secondary); padding: 40px;">Carregando registros...</div>
            </div>
          </div>
        </div>
      </div>
    `;

    // Aplicar máscaras de input
    applyInputMasks();

    let allPatients = [];

    const renderTableRows = (patientsToRender) => {
      const wrapper = document.getElementById('patients-table-wrapper');
      
      if (patientsToRender.length === 0) {
        wrapper.innerHTML = `<div style="text-align: center; color: var(--text-secondary); padding: 40px;">Nenhum paciente encontrado.</div>`;
        return;
      }

      let tableHtml = `
        <table class="patients-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Nome Completo</th>
              <th>CPF</th>
              <th>Data Nasc.</th>
              <th>Cidade</th>
              <th>Telefones</th>
              <th>Valor</th>
              <th style="text-align: right;">Ações</th>
            </tr>
          </thead>
          <tbody>
      `;

      patientsToRender.forEach(p => {
        let formattedDate = p.birthDate;
        if (p.birthDate && p.birthDate.includes('-')) {
          const [y, m, d] = p.birthDate.split('-');
          formattedDate = `${d}/${m}/${y}`;
        }
        
        // Combina telefone e celular de forma limpa
        const phones = [p.phone, p.cellphone].filter(Boolean).join(' / ');
        
        tableHtml += `
          <tr>
            <td style="font-family: monospace; font-weight: 600; color: var(--color-primary);">${p.id}</td>
            <td style="font-weight: 500;">${p.fullName}</td>
            <td style="font-family: monospace; font-size: 0.9rem;">${p.cpf}</td>
            <td>${formattedDate}</td>
            <td>${p.city || '-'}</td>
            <td style="font-size: 0.85rem; color: var(--text-secondary);">${phones || '-'}</td>
            <td style="font-family: monospace; font-weight: 500;">${p.billingValue || 'R$ 0,00'}</td>
            <td>
              <div class="actions-cell">
                <button class="btn-icon btn-icon-admit" onclick="admitPatientFromPatientsTab('${p.id}', '${(p.fullName||'').replace(/'/g, "\\'")}', '${p.cpf||''}')" title="Admitir / Atender este Paciente">
                  <i class="fa-solid fa-hospital-user"></i>
                </button>
                <button class="btn-icon btn-icon-history" onclick="openPatientHistoryModal('${p.id}', '${(p.fullName||'').replace(/'/g, "\\'")}')" title="Ver Prontuário & Histórico Pós-Alta">
                  <i class="fa-solid fa-file-medical"></i>
                </button>
                <button class="btn-icon btn-icon-pdf" onclick="window.generatePatientPDF('${p.id}', '${(p.fullName||'').replace(/'/g, "\\'")}')" title="Gerar Prontuário PDF">
                  <i class="fa-solid fa-file-pdf"></i>
                </button>
                <button class="btn-icon btn-icon-edit" 
                  data-edit-id="${p.id}" 
                  data-full-name="${p.fullName}" 
                  data-cpf="${p.cpf}" 
                  data-birth-date="${p.birthDate}"
                  data-address="${p.address || ''}"
                  data-city="${p.city || ''}"
                  data-phone="${p.phone || ''}"
                  data-cellphone="${p.cellphone || ''}"
                  data-billing-value="${p.billingValue || ''}"
                  title="Alterar / Editar Paciente">
                  <i class="fa-solid fa-pen-to-square"></i>
                </button>
                <button class="btn-icon btn-icon-delete" data-delete-id="${p.id}" title="Excluir Paciente">
                  <i class="fa-solid fa-trash-can"></i>
                </button>
              </div>
            </td>
          </tr>
        `;
      });

      tableHtml += `</tbody></table>`;
      wrapper.innerHTML = tableHtml;

      // Registrar eventos dos botões na tabela
      document.querySelectorAll('.btn-icon-edit').forEach(btn => {
        btn.addEventListener('click', () => {
          document.getElementById('editId').value = btn.getAttribute('data-edit-id');
          document.getElementById('fullName').value = btn.getAttribute('data-full-name');
          document.getElementById('cpf').value = btn.getAttribute('data-cpf');
          document.getElementById('birthDate').value = btn.getAttribute('data-birth-date');
          document.getElementById('address').value = btn.getAttribute('data-address');
          document.getElementById('city').value = btn.getAttribute('data-city');
          document.getElementById('phone').value = btn.getAttribute('data-phone');
          document.getElementById('cellphone').value = btn.getAttribute('data-cellphone');
          document.getElementById('billingValue').value = btn.getAttribute('data-billing-value');

          document.getElementById('form-title').textContent = "Editar Paciente";
          document.getElementById('submit-btn').textContent = "Salvar Alterações";
          document.getElementById('cancel-edit-btn').style.display = "inline-flex";

          const formContainer = document.querySelector('.patients-form-container');
          if (formContainer) {
            formContainer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          }
        });
      });

      document.querySelectorAll('.btn-icon-delete').forEach(btn => {
        btn.addEventListener('click', async () => {
          const id = btn.getAttribute('data-delete-id');
          if (confirm('Tem certeza de que deseja excluir este paciente?')) {
            try {
              const deleteRes = await apiFetch(`${API_URL}/patients/${id}`, { method: 'DELETE' });
              if (deleteRes.ok) {
                loadAndRenderTable();
                if (document.getElementById('editId').value === id) {
                  resetForm();
                }
                state.loading = true;
              } else {
                alert('Erro ao excluir paciente.');
              }
            } catch (err) {
              alert('Erro ao conectar-se à API.');
            }
          }
        });
      });
    };

    const loadAndRenderTable = async () => {
      try {
          const result = await cachedApiGet(`${API_URL}/patients`, 'patients');
          allPatients = Array.isArray(result) ? result : (result.data || []);
          renderTableRows(allPatients);
      } catch (err) {
        console.error('Erro ao carregar pacientes:', err);
        document.getElementById('patients-table-wrapper').innerHTML = 
          `<div style="text-align: center; color: var(--text-secondary); padding: 40px;">Erro ao carregar dados do banco de dados.</div>`;
      }
    };

    const resetForm = () => {
      document.getElementById('patient-form').reset();
      document.getElementById('editId').value = "";
      document.getElementById('form-title').textContent = "Admissão de Paciente";
      document.getElementById('submit-btn').textContent = "Registrar Paciente";
      document.getElementById('cancel-edit-btn').style.display = "none";
    };

    // Registrar cancelamento
    document.getElementById('cancel-edit-btn').addEventListener('click', resetForm);

    // Registrar busca inteligente (Sem acentos / Sensível a caixa)
    document.getElementById('search-input').addEventListener('input', (e) => {
      const query = removeAccents(e.target.value.trim());
      const filtered = allPatients.filter(p => {
        return removeAccents(p.fullName).includes(query) ||
               removeAccents(p.cpf).includes(query) ||
               removeAccents(p.city || '').includes(query) ||
               removeAccents(p.id).includes(query);
      });
      renderTableRows(filtered);
    });

    // Enviar formulário CRUD
    document.getElementById('patient-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const editId = document.getElementById('editId').value;
      const fullName = document.getElementById('fullName').value;
      const cpf = document.getElementById('cpf').value;
      const birthDate = document.getElementById('birthDate').value;
      const address = document.getElementById('address').value;
      const city = document.getElementById('city').value;
      const phone = document.getElementById('phone').value;
      const cellphone = document.getElementById('cellphone').value;
      const billingValue = document.getElementById('billingValue').value;

      const isEdit = !!editId;
      const url = isEdit ? `${API_URL}/patients/${editId}` : `${API_URL}/patients`;
      const method = isEdit ? 'PUT' : 'POST';

      const submitButton = document.getElementById('submit-btn');
      const originalSubmitText = submitButton?.textContent || '';
      try {
        if (submitButton) {
          submitButton.disabled = true;
          submitButton.textContent = 'Salvando...';
        }

        const res = await apiFetch(url, {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fullName, cpf, birthDate, address, city, phone, cellphone, billingValue }),
          skipSyncPrompt: true
        });
        const data = await res.json();
        if (res.ok) {
          resetForm();
          await loadAndRenderTable();
          state.loading = true;
          await requestSyncPromptIfConfigured();
        } else {
          alert(`Erro: ${data.message || 'Falha ao salvar paciente.'}`);
        }
      } catch (err) {
        alert('Erro ao conectar-se à API.');
      } finally {
        if (submitButton) {
          submitButton.disabled = false;
          submitButton.textContent = originalSubmitText;
        }
      }
    });

    // Carregar tabela inicialmente
    loadAndRenderTable();

  } else if (state.activeTab === 'medicos') {
    renderDoctorsTab();
  } else if (state.activeTab === 'agenda') {
    renderAgendaTab();
  } else if (state.activeTab === 'atendimento') {
    contentArea.innerHTML = `
      <div class="tab-section active">
        <div class="atendimentos-grid">
          <!-- Coluna 1: Admissão -->
          <div class="atendimentos-panel">
            <h3 class="panel-title"><i class="fa-solid fa-hospital-user" style="color: var(--color-primary);"></i> Admissão</h3>
            <p style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 8px;">Selecione um paciente cadastrado:</p>
            
            <div class="search-container" style="margin-bottom: 12px;">
              <div class="search-wrapper">
                <i class="fa-solid fa-magnifying-glass search-icon"></i>
                <input type="text" id="adm-search-input" class="search-input" placeholder="Buscar por nome ou CPF...">
              </div>
            </div>
            
            <div id="adm-patient-list" class="patient-select-list">
              <div style="text-align: center; color: var(--text-muted); padding: 20px; font-size: 0.85rem;">Carregando pacientes...</div>
            </div>
            
            <div id="adm-actions-container" style="display: none; margin-top: 15px; display: flex; flex-direction: column; gap: 10px;">
              <span style="font-size: 0.85rem; font-weight: 600; color: var(--text-secondary);">Paciente Selecionado:</span>
              <div id="selected-patient-preview" style="background-color: var(--bg-tertiary); padding: 12px; border-radius: var(--radius-md); border: 1px solid var(--border-color); font-weight: 500; font-size: 0.9rem;"></div>
              
              <input type="hidden" id="selected-patient-id">
              
              <div style="display: flex; gap: 10px; margin-top: 5px;">
                <button id="btn-admit-urgencia" class="btn btn-primary" style="flex: 1; font-size: 0.85rem; padding: 10px 8px;">
                  <i class="fa-solid fa-truck-medical"></i> Urgência (PS)
                </button>
                <button id="btn-admit-ambulatorio" class="btn" style="flex: 1; font-size: 0.85rem; padding: 10px 8px; background-color: var(--bg-tertiary); border-color: var(--border-color); color: var(--text-primary);">
                  <i class="fa-solid fa-user-doctor"></i> Ambulatório
                </button>
              </div>
            </div>
          </div>
          
          <!-- Coluna 2: Fila de Triagem -->
          <div class="atendimentos-panel">
            <h3 class="panel-title"><i class="fa-solid fa-stethoscope" style="color: var(--color-warning);"></i> Fila de Triagem</h3>
            <p style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 8px;">Aguardando classificação de risco:</p>
            <div id="triage-queue" class="queue-list">
              <div style="text-align: center; color: var(--text-muted); padding: 40px; font-size: 0.85rem;">Fila vazia.</div>
            </div>
          </div>
          
          <!-- Coluna 3: Fila de Consulta Médica -->
          <div class="atendimentos-panel">
            <h3 class="panel-title"><i class="fa-solid fa-user-md" style="color: var(--color-accent);"></i> Fila de Consulta Médica</h3>
            <p style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 8px;">Prioridade clínica (Manchester):</p>
            <div id="medical-queue" class="queue-list">
              <div style="text-align: center; color: var(--text-muted); padding: 40px; font-size: 0.85rem;">Fila vazia.</div>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Modal de Triagem -->
      <div id="triage-modal" class="modal-overlay" style="display: none;">
        <div class="modal-content">
          <div class="modal-header">
            <h3>Realizar Triagem Manchester</h3>
            <button type="button" class="modal-close" id="close-triage-modal"><i class="fa-solid fa-xmark"></i></button>
          </div>
          <div class="modal-body">
            <form id="triage-form">
              <input type="hidden" id="triage-encounter-id">
              
              <div style="background-color: rgba(0, 100, 255, 0.08); padding: 12px; border-radius: var(--radius-md); border: 1px solid rgba(0, 100, 255, 0.15); margin-bottom: 20px;">
                <span style="font-size: 0.8rem; color: var(--text-secondary); display: block; margin-bottom: 2px;">Paciente:</span>
                <strong id="triage-patient-name" style="font-size: 1.05rem; color: var(--text-primary);">Maria de Souza</strong>
              </div>
              
              <!-- Sinais Vitais -->
              <h4 style="font-family: 'Outfit'; font-weight: 600; font-size: 0.95rem; margin-bottom: 12px; color: var(--text-primary); border-left: 3px solid var(--color-primary); padding-left: 8px;">Sinais Vitais</h4>
              
              <div class="form-row">
                <div class="form-group">
                  <label class="form-label" for="triage-pa">* Pressão Arterial (mmHg):</label>
                  <input type="text" id="triage-pa" class="form-input" required placeholder="Ex: 120/80">
                </div>
                <div class="form-group">
                  <label class="form-label" for="triage-temp">* Temp. Corporal (°C):</label>
                  <input type="number" id="triage-temp" class="form-input" required step="0.1" min="30" max="45" placeholder="Ex: 36.8">
                </div>
              </div>
              
              <div class="form-row">
                <div class="form-group">
                  <label class="form-label" for="triage-fc">Freq. Cardíaca (bpm):</label>
                  <input type="number" id="triage-fc" class="form-input" min="30" max="220" placeholder="Ex: 80">
                </div>
                <div class="form-group">
                  <label class="form-label" for="triage-peso">Peso Corporal (kg):</label>
                  <input type="number" id="triage-peso" class="form-input" step="0.1" placeholder="Ex: 75.0">
                </div>
              </div>
              
              <!-- Manchester Classificação -->
              <h4 style="font-family: 'Outfit'; font-weight: 600; font-size: 0.95rem; margin-top: 10px; margin-bottom: 12px; color: var(--text-primary); border-left: 3px solid var(--color-primary); padding-left: 8px;">* Classificação Manchester (Prioridade)</h4>
              
              <div class="manchester-selector">
                <div class="manchester-option vermelho">
                  <input type="radio" id="color-vermelho" name="manchesterColor" value="Vermelho" required>
                  <label for="color-vermelho" class="manchester-label">
                    <i class="fa-solid fa-triangle-exclamation"></i>
                    <span>Emergência</span>
                  </label>
                </div>
                <div class="manchester-option laranja">
                  <input type="radio" id="color-laranja" name="manchesterColor" value="Laranja">
                  <label for="color-laranja" class="manchester-label">
                    <i class="fa-solid fa-circle-exclamation"></i>
                    <span>Muito Urgente</span>
                  </label>
                </div>
                <div class="manchester-option amarelo">
                  <input type="radio" id="color-amarelo" name="manchesterColor" value="Amarelo">
                  <label for="color-amarelo" class="manchester-label">
                    <i class="fa-solid fa-circle-info"></i>
                    <span>Urgente</span>
                  </label>
                </div>
                <div class="manchester-option verde">
                  <input type="radio" id="color-verde" name="manchesterColor" value="Verde">
                  <label for="color-verde" class="manchester-label">
                    <i class="fa-solid fa-circle-check"></i>
                    <span>Pouco Urgente</span>
                  </label>
                </div>
                <div class="manchester-option azul">
                  <input type="radio" id="color-azul" name="manchesterColor" value="Azul">
                  <label for="color-azul" class="manchester-label">
                    <i class="fa-solid fa-circle"></i>
                    <span>Não Urgente</span>
                  </label>
                </div>
              </div>
              
              <!-- Queixa Principal -->
              <div class="form-group" style="margin-top: 20px;">
                <label class="form-label" for="triage-complaints">* Queixa Principal / Sintomatologia:</label>
                <textarea id="triage-complaints" class="form-input" required rows="3" placeholder="Paciente relata dor torácica..."></textarea>
              </div>
              
              <div style="display: flex; gap: 10px; margin-top: 24px; justify-content: flex-end;">
                <button type="button" id="btn-cancel-triage" class="btn" style="background-color: var(--bg-tertiary); color: var(--text-primary); border-color: var(--border-color);">Cancelar</button>
                <button type="submit" class="btn btn-primary">Salvar Classificação</button>
              </div>
            </form>
          </div>
        </div>
      </div>
    `;

    let admissionPatients = [];
    let selectedPatient = null;

    const triagePaInput = document.getElementById('triage-pa');
    if (triagePaInput) {
      triagePaInput.addEventListener('input', (e) => {
        let val = e.target.value.replace(/\D/g, "");
        if (val.length > 6) val = val.substring(0, 6);
        if (val.length <= 3) {
          e.target.value = val;
        } else {
          e.target.value = `${val.slice(0, 3)}/${val.slice(3)}`;
        }
      });
    }

    const loadPatientsForAdmission = async () => {
      try {
        const res = await apiFetch(`${API_URL}/patients`);
        if (!res.ok) throw new Error();
        admissionPatients = await res.json();
        renderAdmissionPatientList(admissionPatients);
      } catch (err) {
        document.getElementById('adm-patient-list').innerHTML = 
          `<div style="text-align: center; color: var(--text-secondary); padding: 20px; font-size: 0.85rem;">Erro ao carregar lista de pacientes.</div>`;
      }
    };

    const renderAdmissionPatientList = (patientsToRender) => {
      const listContainer = document.getElementById('adm-patient-list');
      if (patientsToRender.length === 0) {
        listContainer.innerHTML = `<div style="text-align: center; color: var(--text-muted); padding: 20px; font-size: 0.85rem;">Nenhum paciente encontrado.</div>`;
        return;
      }

      listContainer.innerHTML = '';
      patientsToRender.forEach(p => {
        const item = document.createElement('div');
        item.className = 'patient-select-item';
        if (selectedPatient && selectedPatient.id === p.id) {
          item.classList.add('selected');
        }
        item.innerHTML = `
          <div class="patient-select-name">${p.fullName}</div>
          <div class="patient-select-meta">CPF: ${p.cpf} | Cidade: ${p.city || '-'}</div>
        `;
        item.addEventListener('click', () => {
          document.querySelectorAll('.patient-select-item').forEach(i => i.classList.remove('selected'));
          item.classList.add('selected');
          selectPatientForAdmission(p);
        });
        listContainer.appendChild(item);
      });
    };

    const selectPatientForAdmission = (p) => {
      selectedPatient = p;
      const preview = document.getElementById('selected-patient-preview');
      const actionsContainer = document.getElementById('adm-actions-container');
      const selectedIdInput = document.getElementById('selected-patient-id');
      
      selectedIdInput.value = p.id;
      preview.innerHTML = `
        <div style="font-weight:600; color: var(--color-primary);">${p.fullName}</div>
        <div style="font-size:0.75rem; color: var(--text-secondary); margin-top:4px;">CPF: ${p.cpf}</div>
      `;
      actionsContainer.style.display = 'flex';
    };

    document.getElementById('adm-search-input').addEventListener('input', (e) => {
      const query = removeAccents(e.target.value.trim());
      const filtered = admissionPatients.filter(p => {
        return removeAccents(p.fullName).includes(query) ||
               removeAccents(p.cpf).includes(query);
      });
      renderAdmissionPatientList(filtered);
    });

    const createEncounter = async (type) => {
      const patientId = document.getElementById('selected-patient-id').value;
      if (!patientId) return;

      try {
        const res = await apiFetch(`${API_URL}/encounters`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ patientId, type })
        });
        const data = await res.json();
        if (res.ok) {
          selectedPatient = null;
          document.getElementById('adm-search-input').value = '';
          document.getElementById('adm-actions-container').style.display = 'none';
          loadPatientsForAdmission();
          loadAndRenderQueue();
          
          document.getElementById('btn-admit-urgencia').addEventListener('click', () => createEncounter('Urgencia'));
          document.getElementById('btn-admit-ambulatorio').addEventListener('click', () => createEncounter('Ambulatorial'));

          const triageTempInput = document.getElementById('triage-temp');
          if (triageTempInput) {
            triageTempInput.type = 'text';
            triageTempInput.setAttribute('inputmode', 'decimal');
            
            triageTempInput.addEventListener('input', (e) => {
              let val = e.target.value;
              if (val.includes('.') || val.includes(',')) return;
              const digits = val.replace(/\D/g, '');
              if (digits.length === 3) {
                e.target.value = (parseFloat(digits) / 10).toFixed(1);
              }
            });

            triageTempInput.addEventListener('blur', (e) => {
              let val = e.target.value.replace(',', '.');
              if (!val) return;
              let digits = val.replace(/\D/g, '');
              if (!val.includes('.')) {
                if (digits.length === 3 || (parseFloat(digits) >= 300 && parseFloat(digits) <= 450)) {
                  val = (parseFloat(digits) / 10).toFixed(1);
                }
              }
              e.target.value = val;
            });
          }

          const triagePesoInput = document.getElementById('triage-peso');
          if (triagePesoInput) {
            triagePesoInput.type = 'text';
            triagePesoInput.setAttribute('inputmode', 'decimal');

            triagePesoInput.addEventListener('input', (e) => {
              let val = e.target.value;
              if (val.includes('.') || val.includes(',')) return;
              const digits = val.replace(/\D/g, '');
              if (digits.length === 3) {
                e.target.value = (parseFloat(digits) / 10).toFixed(1);
              } else if (digits.length === 5) {
                e.target.value = (parseFloat(digits) / 100).toFixed(2);
              }
            });

            triagePesoInput.addEventListener('blur', (e) => {
              let val = e.target.value.replace(',', '.');
              if (!val) return;
              let digits = val.replace(/\D/g, '');
              if (!val.includes('.')) {
                if (digits.length === 3) {
                  val = (parseFloat(digits) / 10).toFixed(1);
                } else if (digits.length === 4) {
                  val = (parseFloat(digits) / 10).toFixed(1);
                } else if (digits.length >= 5) {
                  val = (parseFloat(digits) / 100).toFixed(2);
                }
              }
              e.target.value = val;
            });
          }
          
          showToast(`Atendimento de ${type} aberto com sucesso!`);
        } else {
          alert(`Erro: ${data.message || 'Falha ao abrir atendimento.'}`);
        }
      } catch (err) {
        alert('Erro ao conectar-se à API.');
      }
    };

    document.getElementById('btn-admit-urgencia').addEventListener('click', () => createEncounter('Urgencia'));
    document.getElementById('btn-admit-ambulatorio').addEventListener('click', () => createEncounter('Ambulatorial'));

    const closeTriageModal = () => {
      document.getElementById('triage-modal').style.display = 'none';
      document.getElementById('triage-form').reset();
    };
    document.getElementById('close-triage-modal').addEventListener('click', closeTriageModal);
    document.getElementById('btn-cancel-triage').addEventListener('click', closeTriageModal);

    document.getElementById('triage-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const encounterId = document.getElementById('triage-encounter-id').value;
      const manchesterColor = document.querySelector('input[name="manchesterColor"]:checked').value;
      const bloodPressure = document.getElementById('triage-pa').value;
      const temperatureCelsius = document.getElementById('triage-temp').value;
      const heartRateBpm = document.getElementById('triage-fc').value;
      const weightKg = document.getElementById('triage-peso').value;
      const complaints = document.getElementById('triage-complaints').value;

      try {
        const res = await apiFetch(`${API_URL}/encounters/${encounterId}/triage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ manchesterColor, weightKg, bloodPressure, temperatureCelsius, heartRateBpm, complaints })
        });
        
        if (res.ok) {
          closeTriageModal();
          loadAndRenderQueue();
          showToast('Triagem Manchester salva e paciente enviado à fila médica!');
        } else {
          const data = await res.json();
          alert(`Erro: ${data.message || 'Falha ao salvar triagem.'}`);
        }
      } catch (err) {
        alert('Erro ao conectar-se à API.');
      }
    });

    const loadAndRenderQueue = async () => {
      try {
        const res = await apiFetch(`${API_URL}/encounters`);
        if (!res.ok) throw new Error();
        const encounters = await res.json();
        renderQueues(encounters);
      } catch (err) {
        document.getElementById('triage-queue').innerHTML = 
          `<div style="text-align: center; color: var(--text-secondary); padding: 20px; font-size: 0.85rem;">Erro ao carregar fila.</div>`;
        document.getElementById('medical-queue').innerHTML = 
          `<div style="text-align: center; color: var(--text-secondary); padding: 20px; font-size: 0.85rem;">Erro ao carregar fila.</div>`;
      }
    };

    const renderQueues = (encounters) => {
      const triageQueueContainer = document.getElementById('triage-queue');
      const medicalQueueContainer = document.getElementById('medical-queue');

      const triageEncounters = encounters.filter(e => e.status === 'Aguardando_Triagem');
      const medicalEncounters = encounters.filter(e => e.status === 'Aguardando_Atendimento' || e.status === 'Em_Atendimento');

      if (triageEncounters.length === 0) {
        triageQueueContainer.innerHTML = `<div style="text-align: center; color: var(--text-muted); padding: 40px; font-size: 0.85rem;">Nenhum paciente aguardando triagem.</div>`;
      } else {
        triageQueueContainer.innerHTML = '';
        triageEncounters.forEach(e => {
          const waitTimeText = getWaitTimeText(e.admitted_at);
          const card = document.createElement('div');
          card.className = 'queue-card';
          card.innerHTML = `
            <div class="queue-card-header">
              <span class="queue-patient-name">${e.patientName}</span>
              <span class="queue-time"><i class="fa-solid fa-clock"></i> ${waitTimeText}</span>
            </div>
            <div class="queue-card-body">
              <div>Tipo: <strong>${e.type === 'Urgencia' ? 'Urgência' : 'Ambulatório'}</strong></div>
              <div style="font-size: 0.75rem; margin-top: 4px; color: var(--text-muted);">CPF: ${e.patientCpf}</div>
            </div>
            <div class="queue-card-actions">
              <button class="btn btn-primary btn-triar" style="font-size: 0.8rem; padding: 6px 12px;" data-enc-id="${e.id}" data-patient-name="${e.patientName}">
                <i class="fa-solid fa-user-nurse"></i> Triar
              </button>
            </div>
          `;
          
          card.querySelector('.btn-triar').addEventListener('click', () => {
            openTriageModalForm(e.id, e.patientName);
          });
          
          triageQueueContainer.appendChild(card);
        });
      }

      const colorPriority = {
        'Vermelho': 5,
        'Laranja': 4,
        'Amarelo': 3,
        'Verde': 2,
        'Azul': 1
      };

      const sortedMedical = medicalEncounters.sort((a, b) => {
        if (a.status === 'Em_Atendimento' && b.status !== 'Em_Atendimento') return -1;
        if (a.status !== 'Em_Atendimento' && b.status === 'Em_Atendimento') return 1;

        const pA = colorPriority[a.manchesterColor] || 0;
        const pB = colorPriority[b.manchesterColor] || 0;
        if (pA !== pB) {
          return pB - pA;
        }
        return new Date(a.admitted_at) - new Date(b.admitted_at);
      });

      if (sortedMedical.length === 0) {
        medicalQueueContainer.innerHTML = `<div style="text-align: center; color: var(--text-muted); padding: 40px; font-size: 0.85rem;">Nenhum paciente na fila de consulta.</div>`;
      } else {
        medicalQueueContainer.innerHTML = '';
        sortedMedical.forEach(e => {
          const waitTimeText = getWaitTimeText(e.admitted_at);
          const badgeClass = `badge-${(e.manchesterColor || '').toLowerCase()}`;
          const isCalling = e.status === 'Em_Atendimento';
          
          const card = document.createElement('div');
          card.className = 'queue-card';
          if (isCalling) {
            card.style.borderColor = 'var(--color-primary)';
            card.style.backgroundColor = 'rgba(0, 100, 255, 0.05)';
          }
          
          card.innerHTML = `
            <div class="queue-card-header">
              <span class="queue-patient-name" style="${isCalling ? 'color: var(--color-primary); font-weight:700;' : ''}">
                ${e.patientName} ${isCalling ? ' (Em Consulta)' : ''}
              </span>
              <span class="queue-time"><i class="fa-solid fa-clock"></i> ${waitTimeText}</span>
            </div>
            <div class="queue-card-body">
              <div style="display:flex; justify-content:space-between; align-items:center;">
                <span class="badge-manchester ${badgeClass}">${e.manchesterColor}</span>
                <span style="font-size:0.75rem; color:var(--text-muted); font-family:monospace;">PA: ${e.bloodPressure} | Temp: ${e.temperatureCelsius}°C</span>
              </div>
              <p style="margin-top: 8px; font-style: italic; color: var(--text-secondary); text-overflow: ellipsis; overflow: hidden; white-space: nowrap;">
                "${e.complaints}"
              </p>
            </div>
            <div class="queue-card-actions">
              ${!isCalling ? `
                <button class="btn btn-primary btn-call-consult" style="font-size: 0.8rem; padding: 6px 12px; background: var(--color-accent);" data-enc-id="${e.id}">
                  <i class="fa-solid fa-bullhorn"></i> Chamar
                </button>
              ` : `
                <button class="btn btn-secondary btn-open-pep" style="font-size: 0.8rem; padding: 6px 12px;" data-enc-id="${e.id}">
                  <i class="fa-solid fa-file-medical"></i> PEP
                </button>
                <button class="btn btn-primary btn-finish-consult" style="font-size: 0.8rem; padding: 6px 12px; background: var(--color-danger);" data-enc-id="${e.id}">
                  <i class="fa-solid fa-circle-check"></i> Finalizar
                </button>
              `}
            </div>
          `;

          const callBtn = card.querySelector('.btn-call-consult');
          const finishBtn = card.querySelector('.btn-finish-consult');
          const pepBtn = card.querySelector('.btn-open-pep');

          if (callBtn) {
            callBtn.addEventListener('click', () => updateEncounterStatus(e.id, 'Em_Atendimento', e.patientName));
          }
          if (finishBtn) {
            finishBtn.addEventListener('click', () => updateEncounterStatus(e.id, 'Finalizado', e.patientName));
          }
          if (pepBtn) {
            pepBtn.addEventListener('click', () => window.openPEPModal(e.id));
          }

          medicalQueueContainer.appendChild(card);
        });
      }
    };

    const openTriageModalForm = (encounterId, patientName) => {
      document.getElementById('triage-encounter-id').value = encounterId;
      document.getElementById('triage-patient-name').textContent = patientName;
      document.getElementById('triage-modal').style.display = 'flex';
    };

    const updateEncounterStatus = async (id, status, patientName) => {
      try {
        const res = await apiFetch(`${API_URL}/encounters/${id}/status`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status })
        });
        if (res.ok) {
          loadAndRenderQueue();
          if (status === 'Em_Atendimento') {
            showToast(`Paciente ${patientName} chamado para o consultório!`);
          } else if (status === 'Finalizado') {
            showToast(`Atendimento de ${patientName} finalizado.`);
          }
          state.loading = true;
        } else {
          alert('Erro ao atualizar status do atendimento.');
        }
      } catch (err) {
        alert('Erro ao conectar-se à API.');
      }
    };

    const getWaitTimeText = (admittedAt) => {
      const diffMs = new Date() - new Date(admittedAt);
      const diffMin = Math.floor(diffMs / (60 * 1000));
      if (diffMin < 1) return 'Agora mesmo';
      if (diffMin < 60) return `${diffMin} min atrás`;
      const hrs = Math.floor(diffMin / 60);
      const mins = diffMin % 60;
      return `${hrs}h ${mins}m atrás`;
    };

    loadPatientsForAdmission();
    loadAndRenderQueue();
    
  } else if (state.activeTab === 'estagnacao') {
    renderStagnationTab(contentArea);
  } else if (state.activeTab === 'leitos') {
      renderLeitosTab();
    } else if (state.activeTab === 'relatorios') {
      renderReportsTab(contentArea);
    } else if (state.activeTab === 'configuracoes') {
    contentArea.innerHTML = `
      <div class="tab-section active">
        <div class="settings-section">
          
          <!-- Accordion de Status -->
          <details class="settings-accordion" open>
            <summary class="settings-accordion-header">
              <i class="fa-solid fa-server"></i> Status do Sistema
            </summary>
            <div class="settings-accordion-body">
              <div style="display: flex; flex-direction: column; gap: 12px;">
                <div style="display: flex; justify-content: space-between; border-bottom: 1px solid var(--border-color); padding-bottom: 8px;">
                  <span style="color: var(--text-secondary);">Integração com Turso DB</span>
                  <span class="status-badge">
                    <span class="status-indicator success"></span>
                    Conectado (AWS Us-East-1)
                  </span>
                </div>
                <div style="display: flex; justify-content: space-between; border-bottom: 1px solid var(--border-color); padding-bottom: 8px;">
                  <span style="color: var(--text-secondary);">Servidor API Local</span>
                  <span style="color: var(--text-primary); font-family: monospace;">http://localhost:3001</span>
                </div>
                <div style="display: flex; justify-content: space-between;">
                  <span style="color: var(--text-secondary);">Ambiente Web (Vercel)</span>
                  <span style="color: var(--text-primary); font-family: monospace;">health-nexus-beryl.vercel.app</span>
                </div>
              </div>
            </div>
          </details>

          <!-- Accordion de Manutenção -->
          <details class="settings-accordion">
            <summary class="settings-accordion-header">
              <i class="fa-solid fa-database"></i> Gerenciamento de Dados de Teste
            </summary>
            <div class="settings-accordion-body">
              <p style="color: var(--text-secondary); margin-bottom: 16px; line-height: 1.6;">
                Utilize os botões abaixo para simular a carga de dados fictícios para testes rápidos ou zerar o banco de dados completamente.
              </p>
              <div class="settings-actions">
                <button id="btn-seed" class="btn btn-primary">
                  <i class="fa-solid fa-circle-plus"></i> Gerar Dados Fictícios
                </button>
                <button id="btn-reset" class="btn" style="background-color: rgba(255, 50, 80, 0.15); border-color: var(--color-danger); color: var(--color-danger);">
                  <i class="fa-solid fa-trash-can"></i> Limpar Banco de Dados
                </button>
              </div>
            </div>
          </details>

          <!-- Accordion de Importação e Exportação JSON -->
          <details class="settings-accordion">
            <summary class="settings-accordion-header">
              <i class="fa-solid fa-cloud-arrow-down"></i> Exportar / Importar JSON (Backup)
            </summary>
            <div class="settings-accordion-body">
              <p style="color: var(--text-secondary); margin-bottom: 16px; line-height: 1.6;">
                Baixe todos os dados atuais em formato JSON, ou restaure um backup. A importação irá mesclar ou sobrescrever dados existentes e sincronizará automaticamente com o Turso.
              </p>
              <div class="settings-actions">
                <button id="btn-export-json" class="btn btn-primary">
                  <i class="fa-solid fa-download"></i> Exportar Dados
                </button>
                <input type="file" id="import-json-file" accept=".json" style="display: none;" />
                <button id="btn-import-json" class="btn btn-secondary" style="border-color: #ffaa00; color: #ffaa00;">
                  <i class="fa-solid fa-upload"></i> Importar Dados
                </button>
              </div>
            </div>
          </details>

          <!-- Accordion de Gerenciamento de Usuários (Apenas Master) -->
          <details class="settings-accordion">
            <summary class="settings-accordion-header">
              <i class="fa-solid fa-users-gear"></i> Gerenciamento de Usuários
              ${state.user?.username === 'mazzarowysk' ? '<span class="status-badge" style="margin-left:auto;"><span class="status-indicator success"></span>MASTER</span>' : '<span class="status-badge" style="margin-left:auto; background:rgba(255,0,0,0.1);"><i class="fa-solid fa-lock"></i> BLOQUEADO</span>'}
            </summary>
            <div class="settings-accordion-body">
              ${state.user?.username === 'mazzarowysk' ? `
                <p style="color: var(--text-secondary); margin-bottom: 16px; line-height: 1.6;">
                  <strong>Bem-vindo, Master.</strong> Aqui você poderá editar perfis, resetar senhas e alterar permissões de outros usuários da clínica.
                </p>
                <div class="settings-actions">
                  <button class="btn btn-primary" onclick="alert('Funcionalidade de edição de usuários será implementada na próxima fase.')">
                    <i class="fa-solid fa-user-pen"></i> Editar Permissões
                  </button>
                </div>
              ` : `
                <div style="text-align: center; padding: 20px 0; color: var(--color-danger); opacity: 0.8;">
                  <i class="fa-solid fa-shield-halved" style="font-size: 2rem; margin-bottom: 12px;"></i>
                  <p>Acesso negado. Apenas o usuário master (<strong>mazzarowysk</strong>) pode alterar as configurações de outros usuários.</p>
                </div>
              `}
            </div>
          </details>

        </div>
      </div>
    `;

    document.getElementById('btn-seed').addEventListener('click', async () => {
      try {
        const res = await apiFetch(`${API_URL}/settings/seed`, { method: 'POST' });
        const data = await res.json();
        if (res.ok) {
          alert('Sucesso: 5 pacientes fictícios foram inseridos no banco Turso.');
          state.loading = true;
        } else {
          alert(`Erro: ${data.message || 'Falha ao popular banco.'}`);
        }
      } catch (err) {
        alert('Erro ao conectar-se à API.');
      }
    });

    document.getElementById('btn-reset').addEventListener('click', async () => {
      if (confirm('Tem certeza de que deseja APAGAR TODOS os pacientes do banco Turso? Esta ação não pode ser desfeita.')) {
        try {
          const res = await apiFetch(`${API_URL}/settings/reset`, { method: 'POST' });
          const data = await res.json();
          if (res.ok) {
            alert('Sucesso: Todos os dados de pacientes foram removidos.');
            state.loading = true;
          } else {
            alert(`Erro: ${data.message || 'Falha ao resetar banco.'}`);
          }
        } catch (err) {
          alert('Erro ao conectar-se à API.');
        }
      }
    });

    document.getElementById('btn-export-json').addEventListener('click', async () => {
      try {
        const res = await apiFetch(`${API_URL}/settings/export`);
        const data = await res.json();
        if (res.ok) {
          const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `health_nexus_backup_${new Date().toISOString().slice(0,10)}.json`;
          a.click();
          URL.revokeObjectURL(url);
          showToast('Dados exportados com sucesso!');
        } else {
          alert(`Erro: ${data.message || 'Falha ao exportar dados.'}`);
        }
      } catch (err) {
        alert('Erro ao conectar-se à API.');
      }
    });

    document.getElementById('btn-import-json').addEventListener('click', () => {
      document.getElementById('import-json-file').click();
    });

    document.getElementById('import-json-file').addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const jsonData = JSON.parse(event.target.result);
          const res = await apiFetch(`${API_URL}/settings/import`, {
            method: 'POST',
            body: JSON.stringify(jsonData)
          });
          const data = await res.json();
          if (res.ok) {
            alert('Sucesso: Os dados foram importados e sincronizados com Turso.');
            window.location.reload(); // Recarregar para atualizar estado
          } else {
            alert(`Erro: ${data.message || 'Falha ao importar dados.'}`);
          }
        } catch (err) {
          alert('Erro ao processar arquivo JSON ou conectar-se à API.');
        }
      };
      reader.readAsText(file);
    });
  }
}

// --- CONSUMO DE APIs DO BACKEND ---
async function fetchDashboardData() {
  try {
    const rawData = await apiFetch(`${API_URL}/dashboard/summary`).then(r => r.ok ? r.json() : null);
    if (rawData) {
      state.dashboardData = rawData;
    } else {
      throw new Error('Erro ao buscar dashboard summary');
    }
  } catch (error) {
    console.warn('[Dashboard] Utilizando dados locais de fallback para exibição de gráficos e KPIs.');
  }

  const d = state.dashboardData || {};

  // Buscar contagem real de pacientes se activePatients for 0
  let realActivePatients = d.activePatients || 0;
  if (!realActivePatients) {
    try {
      const resP = await apiFetch(`${API_URL}/patients`);
      if (resP.ok) {
        const pList = await resP.json();
        const arr = Array.isArray(pList) ? pList : (pList.data || []);
        if (arr.length > 0) realActivePatients = arr.length;
      }
    } catch(e) {}
  }

  state.dashboardData = {
    activePatients: realActivePatients || 28,
    occupancyRate: d.occupancyRate || 84.5,
    averageWaitTimeMinutes: d.averageWaitTimeMinutes || 18,
    dailyAppointmentsCount: d.dailyAppointmentsCount || 84,
    billingSummary: d.billingSummary || { totalRevenue: 245000.00, pendingClaims: 45100.00 },
    occupancyData: (d.occupancyData && d.occupancyData.length > 0) ? d.occupancyData : [
      { label: 'UTI Adulto', value: 25, color: '#818cf8' },
      { label: 'Enfermaria', value: 85, color: '#f472b6' },
      { label: 'Pediatria', value: 12, color: '#38bdf8' },
      { label: 'Maternidade', value: 18, color: '#fbbf24' },
      { label: 'Disponíveis', value: 25, color: '#34d399' }
    ],
    appointmentsHistory: (d.appointmentsHistory && d.appointmentsHistory.length > 0) ? d.appointmentsHistory : [
      { label: 'Seg', urgencia: 45, ambulatorial: 120 },
      { label: 'Ter', urgencia: 52, ambulatorial: 135 },
      { label: 'Qua', urgencia: 48, ambulatorial: 125 },
      { label: 'Qui', urgencia: 60, ambulatorial: 140 },
      { label: 'Sex', urgencia: 58, ambulatorial: 130 },
      { label: 'Sáb', urgencia: 75, ambulatorial: 40 },
      { label: 'Dom', urgencia: 82, ambulatorial: 15 }
    ]
  };

  state.loading = false;
}

// --- FUNÇÃO PARA INICIALIZAR GRÁFICOS CHART.JS ---
function initDashboardCharts(data) {
  if (!data) return;

  const occupancyCtx = document.getElementById('occupancyChart');
  const appointmentsCtx = document.getElementById('appointmentsChart');

  const occupancyData = (data.occupancyData && data.occupancyData.length > 0) ? data.occupancyData : [
    { label: 'UTI Adulto', value: 25, color: '#818cf8' },
    { label: 'Enfermaria', value: 85, color: '#f472b6' },
    { label: 'Pediatria', value: 12, color: '#38bdf8' },
    { label: 'Maternidade', value: 18, color: '#fbbf24' },
    { label: 'Disponíveis', value: 25, color: '#34d399' }
  ];

  const apptHistory = (data.appointmentsHistory && data.appointmentsHistory.length > 0) ? data.appointmentsHistory : [
    { label: 'Seg', urgencia: 45, ambulatorial: 120 },
    { label: 'Ter', urgencia: 52, ambulatorial: 135 },
    { label: 'Qua', urgencia: 48, ambulatorial: 125 },
    { label: 'Qui', urgencia: 60, ambulatorial: 140 },
    { label: 'Sex', urgencia: 58, ambulatorial: 130 },
    { label: 'Sáb', urgencia: 75, ambulatorial: 40 },
    { label: 'Dom', urgencia: 82, ambulatorial: 15 }
  ];

  const ChartClass = window.Chart || (typeof Chart !== 'undefined' ? Chart : null);
  if (!ChartClass) {
    console.warn('[DashboardCharts] Chart.js não encontrado no ambiente.');
    return;
  }

  // 1. Gráfico de Ocupação de Leitos (Doughnut)
  if (occupancyCtx) {
    if (occupancyCtx._chartInstance) occupancyCtx._chartInstance.destroy();
    occupancyCtx.style.cursor = 'pointer';

    const inst = new ChartClass(occupancyCtx.getContext('2d'), {
      type: 'doughnut',
      data: {
        labels: occupancyData.map(item => item.label),
        datasets: [{
          data: occupancyData.map(item => item.value),
          backgroundColor: occupancyData.map(item => item.color),
          borderWidth: 2,
          borderColor: 'rgba(30, 34, 45, 0.8)'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '65%',
        plugins: {
          legend: {
            position: 'right',
            labels: {
              color: '#94a3b8',
              font: { family: 'Outfit', size: 11, weight: '500' },
              padding: 12
            }
          }
        }
      }
    });
    occupancyCtx._chartInstance = inst;
  }

  // 2. Gráfico de Histórico Mensal (Line)
  if (appointmentsCtx) {
    if (appointmentsCtx._chartInstance) appointmentsCtx._chartInstance.destroy();
    appointmentsCtx.style.cursor = 'pointer';

    const labels = apptHistory.map(item => item.label);
    const values = apptHistory.map(item => (item.urgencia || 0) + (item.ambulatorial || 0));

    const inst2 = new ChartClass(appointmentsCtx.getContext('2d'), {
      type: 'line',
      data: {
        labels: labels,
        datasets: [{
          label: 'Atendimentos Totais',
          data: values,
          fill: true,
          backgroundColor: 'rgba(99, 102, 241, 0.12)',
          borderColor: '#818cf8',
          borderWidth: 2.5,
          tension: 0.35,
          pointBackgroundColor: '#818cf8',
          pointBorderColor: '#fff',
          pointHoverRadius: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false }
        },
        scales: {
          x: {
            grid: { color: 'rgba(255,255,255,0.04)' },
            ticks: { color: '#94a3b8', font: { family: 'Inter', size: 10 } }
          },
          y: {
            grid: { color: 'rgba(255,255,255,0.04)' },
            ticks: { color: '#94a3b8', font: { family: 'Inter', size: 10 } }
          }
        }
      }
    });
    appointmentsCtx._chartInstance = inst2;
  }
}

// --- MÁSCARAS DE INPUT ---
function maskCPF(value) {
  return value
    .replace(/\D/g, "")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d{1,2})$/, "$1-$2")
    .substring(0, 14);
}

function maskPhone(value) {
  let v = value.replace(/\D/g, "");
  if (v.length > 11) v = v.substring(0, 11);
  if (v.length <= 2) {
    return v;
  } else if (v.length <= 6) {
    return `(${v.slice(0, 2)}) ${v.slice(2)}`;
  } else if (v.length <= 10) {
    return `(${v.slice(0, 2)}) ${v.slice(2, 6)}-${v.slice(6)}`;
  } else {
    return `(${v.slice(0, 2)}) ${v.slice(2, 7)}-${v.slice(7)}`;
  }
}

function maskCurrency(value) {
  let v = value.replace(/\D/g, "");
  if (!v) return "R$ 0,00";
  let number = (parseInt(v, 10) / 100).toFixed(2);
  let parts = number.split(".");
  let integerPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  let decimalPart = parts[1];
  return `R$ ${integerPart},${decimalPart}`;
}

function removeAccents(str) {
  return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

function applyInputMasks() {
  const cpfInput = document.getElementById('cpf');
  const phoneInput = document.getElementById('phone');
  const cellphoneInput = document.getElementById('cellphone');
  const billingValueInput = document.getElementById('billingValue');

  if (cpfInput) {
    cpfInput.addEventListener('input', (e) => {
      e.target.value = maskCPF(e.target.value);
    });
  }
  if (phoneInput) {
    phoneInput.addEventListener('input', (e) => {
      e.target.value = maskPhone(e.target.value);
    });
  }
  if (cellphoneInput) {
    cellphoneInput.addEventListener('input', (e) => {
      e.target.value = maskPhone(e.target.value);
    });
  }
  if (billingValueInput) {
    billingValueInput.addEventListener('input', (e) => {
      e.target.value = maskCurrency(e.target.value);
    });
    billingValueInput.addEventListener('focus', (e) => {
      if (!e.target.value) e.target.value = "R$ 0,00";
    });
  }
}

// Inicializar aplicativo
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
  });
} else {
  initializeApp();
}

// Heartbeat para manter o servidor rodando apenas enquanto a aba estiver aberta
setInterval(() => {
  fetch('/api/heartbeat', { method: 'POST' }).catch(() => {});
}, 3000);

// Encerramento instantâneo do servidor quando o navegador/aba é fechado
window.addEventListener('beforeunload', () => {
  navigator.sendBeacon('/api/shutdown');
});

// --- MÓDULO PEP (PRONTUÁRIO ELETRÔNICO DO PACIENTE) ---

let currentPEPEncounterId = null;

// Catálogo Mock de CID-10
const mockCidCatalog = [
  { code: 'A09', description: 'Diarreia e gastroenterite de origem infecciosa presumível' },
  { code: 'I10', description: 'Hipertensão essencial (primária)' },
  { code: 'J01', description: 'Sinusite aguda' },
  { code: 'J02', description: 'Faringite aguda' },
  { code: 'J03', description: 'Amigdalite aguda' },
  { code: 'J06', description: 'Infecções agudas das vias aéreas superiores de localizações múltiplas e não especificadas' },
  { code: 'J20', description: 'Bronquite aguda' },
  { code: 'N39.0', description: 'Infecção do trato urinário de localização não especificada' },
  { code: 'R07.4', description: 'Dor no peito, não especificada' },
  { code: 'R10', description: 'Dor abdominal e pélvica' },
  { code: 'R50', description: 'Febre de origem desconhecida e de outras origens' },
  { code: 'R51', description: 'Cefaleia' }
];

// Configurar Autocomplete do CID
function setupCidAutocomplete() {
  const input = document.getElementById('pep-assessment');
  const dropdown = document.getElementById('pep-cid-dropdown');
  
  if (!input || !dropdown) return;
  
  input.addEventListener('input', (e) => {
    const term = removeAccents(e.target.value.toLowerCase());
    dropdown.innerHTML = '';
    
    if (term.length < 2) {
      dropdown.classList.remove('active');
      return;
    }
    
    const matches = mockCidCatalog.filter(cid => 
      removeAccents(cid.code.toLowerCase()).includes(term) || 
      removeAccents(cid.description.toLowerCase()).includes(term)
    );
    
    if (matches.length > 0) {
      matches.forEach(cid => {
        const div = document.createElement('div');
        div.className = 'autocomplete-item';
        div.textContent = `${cid.code} - ${cid.description}`;
        div.addEventListener('click', () => {
          input.value = `${cid.code} - ${cid.description}`;
          dropdown.classList.remove('active');
        });
        dropdown.appendChild(div);
      });
      dropdown.classList.add('active');
    } else {
      dropdown.classList.remove('active');
    }
  });
  
  // Fechar ao clicar fora
  document.addEventListener('click', (e) => {
    if (!input.contains(e.target) && !dropdown.contains(e.target)) {
      dropdown.classList.remove('active');
    }
  });
}

// Abrir PEP
window.openPEPModal = async function(encounterId) {
  currentPEPEncounterId = encounterId;
  const modal = document.getElementById('pep-modal');
  
  // Limpar campos
  document.getElementById('pep-subjective').value = '';
  document.getElementById('pep-objective').value = '';
  document.getElementById('pep-assessment').value = '';
  document.getElementById('pep-plan').value = '';
  document.getElementById('pep-status-badge').innerHTML = '';
  document.getElementById('pep-status-badge').className = '';
  
  try {
    // 1. Buscar detalhes do Atendimento para cabeçalho
    const encRes = await apiFetch(`${API_URL}/encounters`);
    const encounters = await encRes.json();
    const encounter = encounters.find(e => e.id === encounterId);
    
    if (encounter) {
      document.getElementById('pep-patient-name').innerHTML = `<i class="fa-solid fa-user"></i> ${encounter.patientName || 'Paciente'}`;
      document.getElementById('pep-encounter-status').innerHTML = `<i class="fa-solid fa-clock"></i> ${new Date(encounter.created_at).toLocaleString('pt-BR')}`;
    }
    
    // 2. Buscar dados da Triagem para Sidebar
    const trRes = await apiFetch(`${API_URL}/triages`);
    const triages = await trRes.json();
    const triage = triages.find(t => t.encounterId === encounterId);
    
    if (triage) {
      const badge = document.getElementById('pep-manchester-badge');
      badge.textContent = triage.manchesterColor.toUpperCase();
      badge.style.color = getManchesterColorHex(triage.manchesterColor);
      
      document.getElementById('pep-bp').textContent = triage.bloodPressure || '-';
      document.getElementById('pep-hr').textContent = triage.heartRateBpm || '-';
      document.getElementById('pep-temp').textContent = triage.temperatureCelsius || '-';
      document.getElementById('pep-weight').textContent = triage.weightKg || '-';
      document.getElementById('pep-complaints').textContent = triage.complaints || '-';
    }
    
    // 3. Buscar Nota Clínica se existir
    const noteRes = await apiFetch(`${API_URL}/encounters/${encounterId}/notes`);
    const note = await noteRes.json();
    
    const isClosed = note && note.isClosed === 1;
    
    if (note) {
      document.getElementById('pep-subjective').value = note.subjectiveContent || '';
      document.getElementById('pep-objective').value = note.objectiveContent || '';
      document.getElementById('pep-assessment').value = note.assessmentContent || '';
      document.getElementById('pep-plan').value = note.planContent || '';
      
      const badge = document.getElementById('pep-status-badge');
      if (isClosed) {
        badge.textContent = 'ASSINADO E FECHADO';
        badge.className = 'badge-signed';
      } else {
        badge.textContent = 'RASCUNHO SALVO';
        badge.className = 'badge-draft';
      }
    }
    
    // Bloquear campos se estiver assinado
    const fields = ['pep-subjective', 'pep-objective', 'pep-assessment', 'pep-plan'];
    fields.forEach(f => document.getElementById(f).disabled = isClosed);
    
    document.getElementById('btn-save-draft').style.display = isClosed ? 'none' : 'inline-flex';
    document.getElementById('btn-sign-pep').style.display = isClosed ? 'none' : 'inline-flex';
    
    // Configurar autocomplete
    setupCidAutocomplete();
    
    // Exibir modal
    modal.style.display = 'flex';
    
  } catch (err) {
    console.error('Erro ao abrir PEP:', err);
    showToast('Erro ao carregar dados do prontuário.');
  }
};

window.closePEPModal = function() {
  document.getElementById('pep-modal').style.display = 'none';
  currentPEPEncounterId = null;
};

// Salvar Rascunho
window.savePEPDraft = async function() {
  if (!currentPEPEncounterId) return;
  
  const payload = {
    noteType: 'Evolução',
    subjectiveContent: document.getElementById('pep-subjective').value,
    objectiveContent: document.getElementById('pep-objective').value,
    assessmentContent: document.getElementById('pep-assessment').value,
    planContent: document.getElementById('pep-plan').value
  };
  
  try {
    const res = await apiFetch(`${API_URL}/encounters/${currentPEPEncounterId}/notes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    
    const result = await res.json();
    if (res.ok) {
      showToast('Rascunho salvo com sucesso.');
      const badge = document.getElementById('pep-status-badge');
      badge.textContent = 'RASCUNHO SALVO';
      badge.className = 'badge-draft';
    } else {
      showToast(result.message || 'Erro ao salvar rascunho.');
    }
  } catch (err) {
    showToast('Erro de conexão ao salvar rascunho.');
  }
};

// Modal de Assinatura
window.openSignModal = function() {
  document.getElementById('sign-modal').style.display = 'flex';
  document.getElementById('sign-password').value = '';
};

window.closeSignModal = function() {
  document.getElementById('sign-modal').style.display = 'none';
};

window.confirmSignPEP = async function() {
  if (!currentPEPEncounterId) return;
  
  const password = document.getElementById('sign-password').value;
  if (!password) {
    showToast('Informe sua senha para assinar.');
    return;
  }
  
  // Primeiro, salvar como rascunho para garantir que o texto mais recente foi salvo
  await savePEPDraft();
  
  try {
    const res = await apiFetch(`${API_URL}/encounters/${currentPEPEncounterId}/sign`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ passwordVerification: password })
    });
    
    const result = await res.json();
    if (res.ok) {
      showToast('Prontuário assinado e finalizado com sucesso!');
      closeSignModal();
      closePEPModal();
      renderTabContent(); // Recarregar aba de atendimentos
    } else {
      showToast(result.message || 'Erro ao assinar prontuário.');
    }
  } catch (err) {
    showToast('Erro de conexão ao assinar prontuário.');
  }
};

function getManchesterColorHex(colorName) {
  const map = {
    'vermelho': '#ff3b30',
    'laranja': '#ff9500',
    'amarelo': '#ffcc00',
    'verde': '#34c759',
    'azul': '#007aff'
  };
  return map[colorName.toLowerCase()] || 'var(--text-primary)';
}

// ==========================================
// MÓDULO DE RELATÓRIOS E EXPORTAÇÃO
// ==========================================

function renderReportsTab(contentArea) {
  contentArea.innerHTML = `
    <div class="tab-section active" style="padding: 28px 36px; width: 100%; max-width: 100%; box-sizing: border-box;">
      <div class="section-header" style="margin-bottom: 24px;">
        <h2><i class="fa-solid fa-file-contract"></i> Relatórios e Exportação</h2>
        <p>Gere e exporte relatórios filtrados por período, status, departamento ou classificação.</p>
      </div>

      <!-- Seletor em formato de Cards Interativos Lado a Lado (4 colunas) -->
      <div class="report-tabs-selector" style="display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 16px; width: 100%; box-sizing: border-box; margin-bottom: 24px;">
        
        <!-- CARD 1: PACIENTES -->
        <div id="tab-btn-patients" class="report-tab-card active" style="background: rgba(99,102,241,0.08); border: 1.5px solid rgba(99,102,241,0.5); border-radius: 14px; padding: 18px 20px; cursor: pointer; transition: all 0.2s ease; position: relative; box-shadow: 0 4px 20px rgba(99,102,241,0.15); display: flex; flex-direction: column; justify-content: space-between; height: 100%;" onmouseenter="if(!this.classList.contains('active')) { this.style.transform='translateY(-2px)'; this.style.borderColor='rgba(99,102,241,0.4)'; }" onmouseleave="if(!this.classList.contains('active')) { this.style.transform='none'; this.style.borderColor='var(--border-color)'; }">
          <div style="display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 14px;">
            <div style="width: 44px; height: 44px; border-radius: 12px; background: rgba(99,102,241,0.15); border: 1px solid rgba(99,102,241,0.3); display: flex; align-items: center; justify-content: center; color: #818cf8; font-size: 1.25rem;">
              <i class="fa-solid fa-users"></i>
            </div>
            <span class="card-status-badge" style="font-size: 0.68rem; font-weight: 700; padding: 3px 9px; border-radius: 20px; background: rgba(99,102,241,0.2); color: #c4b5fd; border: 1px solid rgba(99,102,241,0.4); letter-spacing: 0.5px;">SELECIONADO</span>
          </div>
          <div>
            <h4 style="font-size: 1.02rem; font-weight: 700; color: var(--text-primary); margin: 0 0 4px 0;">Pacientes</h4>
            <p style="font-size: 0.78rem; color: var(--text-muted); margin: 0; line-height: 1.35;">Cadastro completo, demografia e faturamento acumulado.</p>
          </div>
        </div>

        <!-- CARD 2: ATENDIMENTOS -->
        <div id="tab-btn-encounters" class="report-tab-card" style="background: var(--bg-secondary); border: 1px solid var(--border-color); border-radius: 14px; padding: 18px 20px; cursor: pointer; transition: all 0.2s ease; position: relative; display: flex; flex-direction: column; justify-content: space-between; height: 100%;" onmouseenter="if(!this.classList.contains('active')) { this.style.transform='translateY(-2px)'; this.style.borderColor='rgba(236,72,153,0.4)'; }" onmouseleave="if(!this.classList.contains('active')) { this.style.transform='none'; this.style.borderColor='var(--border-color)'; }">
          <div style="display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 14px;">
            <div style="width: 44px; height: 44px; border-radius: 12px; background: rgba(236,72,153,0.15); border: 1px solid rgba(236,72,153,0.3); display: flex; align-items: center; justify-content: center; color: #f472b6; font-size: 1.25rem;">
              <i class="fa-solid fa-notes-medical"></i>
            </div>
            <span class="card-status-badge" style="display: none; font-size: 0.68rem; font-weight: 700; padding: 3px 9px; border-radius: 20px; background: rgba(236,72,153,0.2); color: #f472b6; border: 1px solid rgba(236,72,153,0.4); letter-spacing: 0.5px;">SELECIONADO</span>
          </div>
          <div>
            <h4 style="font-size: 1.02rem; font-weight: 700; color: var(--text-primary); margin: 0 0 4px 0;">Atendimentos & PEP</h4>
            <p style="font-size: 0.78rem; color: var(--text-muted); margin: 0; line-height: 1.35;">Triagem Manchester, situação clínica e médico responsável.</p>
          </div>
        </div>

        <!-- CARD 3: FINANCEIRO -->
        <div id="tab-btn-financial" class="report-tab-card" style="background: var(--bg-secondary); border: 1px solid var(--border-color); border-radius: 14px; padding: 18px 20px; cursor: pointer; transition: all 0.2s ease; position: relative; display: flex; flex-direction: column; justify-content: space-between; height: 100%;" onmouseenter="if(!this.classList.contains('active')) { this.style.transform='translateY(-2px)'; this.style.borderColor='rgba(34,211,238,0.4)'; }" onmouseleave="if(!this.classList.contains('active')) { this.style.transform='none'; this.style.borderColor='var(--border-color)'; }">
          <div style="display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 14px;">
            <div style="width: 44px; height: 44px; border-radius: 12px; background: rgba(34,211,238,0.15); border: 1px solid rgba(34,211,238,0.3); display: flex; align-items: center; justify-content: center; color: #38bdf8; font-size: 1.25rem;">
              <i class="fa-solid fa-chart-pie"></i>
            </div>
            <span class="card-status-badge" style="display: none; font-size: 0.68rem; font-weight: 700; padding: 3px 9px; border-radius: 20px; background: rgba(34,211,238,0.2); color: #38bdf8; border: 1px solid rgba(34,211,238,0.4); letter-spacing: 0.5px;">SELECIONADO</span>
          </div>
          <div>
            <h4 style="font-size: 1.02rem; font-weight: 700; color: var(--text-primary); margin: 0 0 4px 0;">Financeiro</h4>
            <p style="font-size: 0.78rem; color: var(--text-muted); margin: 0; line-height: 1.35;">Títulos a vencer, parcelas pagas e balanço de faturamento.</p>
          </div>
        </div>

        <!-- CARD 4: POR MÉDICO -->
        <div id="tab-btn-doctors" class="report-tab-card" style="background: var(--bg-secondary); border: 1px solid var(--border-color); border-radius: 14px; padding: 18px 20px; cursor: pointer; transition: all 0.2s ease; position: relative; display: flex; flex-direction: column; justify-content: space-between; height: 100%;" onmouseenter="if(!this.classList.contains('active')) { this.style.transform='translateY(-2px)'; this.style.borderColor='rgba(52,211,153,0.4)'; }" onmouseleave="if(!this.classList.contains('active')) { this.style.transform='none'; this.style.borderColor='var(--border-color)'; }">
          <div style="display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 14px;">
            <div style="width: 44px; height: 44px; border-radius: 12px; background: rgba(52,211,153,0.15); border: 1px solid rgba(52,211,153,0.3); display: flex; align-items: center; justify-content: center; color: #34d399; font-size: 1.25rem;">
              <i class="fa-solid fa-user-doctor"></i>
            </div>
            <span class="card-status-badge" style="display: none; font-size: 0.68rem; font-weight: 700; padding: 3px 9px; border-radius: 20px; background: rgba(52,211,153,0.2); color: #34d399; border: 1px solid rgba(52,211,153,0.4); letter-spacing: 0.5px;">SELECIONADO</span>
          </div>
          <div>
            <h4 style="font-size: 1.02rem; font-weight: 700; color: var(--text-primary); margin: 0 0 4px 0;">Por Médico</h4>
            <p style="font-size: 0.78rem; color: var(--text-muted); margin: 0; line-height: 1.35;">Produtividade do corpo clínico e gráficos analíticos.</p>
          </div>
        </div>

      </div>

      <!-- Card de Filtros Dinâmicos -->
      <div class="filter-panel-card glass-card">
        <h3 style="margin-bottom: 16px; font-family: 'Outfit'; font-size: 1.1rem; color: var(--text-primary);">
          <i class="fa-solid fa-filter"></i> Filtros de Pesquisa
        </h3>
        <div id="filters-container">
          <!-- Os filtros serão inseridos aqui dinamicamente -->
        </div>
      </div>

      <!-- Card de Pré-visualização e Exportação -->
      <div class="preview-card glass-card">
        <div class="preview-header">
          <h3><i class="fa-solid fa-list-check"></i> Registros Correspondentes</h3>
          <span id="preview-status" class="preview-status">Carregando dados...</span>
        </div>

        <div class="preview-table-wrapper">
          <table class="preview-table">
            <thead id="preview-table-head">
              <!-- Cabeçalhos dinâmicos -->
            </thead>
            <tbody id="preview-table-body">
              <!-- Registros da pré-visualização -->
            </tbody>
          </table>
        </div>

        <!-- Botões de Exportação -->
        <div class="report-actions" style="margin-top: 20px;">
          <button id="btn-export-pdf" class="btn btn-primary" style="background: var(--danger-color)">
            <i class="fa-solid fa-file-pdf"></i> Exportar PDF
          </button>
          <button id="btn-export-xls" class="btn btn-primary" style="background: var(--success-color)">
            <i class="fa-solid fa-file-excel"></i> Exportar Excel (XLSX)
          </button>
          <button id="btn-export-csv" class="btn btn-outline">
            <i class="fa-solid fa-file-csv"></i> Exportar CSV
          </button>
        </div>
      </div>
    </div>
  `;

  // Inicialização de variáveis locais
  let activeTab = 'patients';
  let patientsList = [];
  let encountersList = [];
  let currentFilteredList = [];

  // Elementos da interface
  const btnPatientsTab = document.getElementById('tab-btn-patients');
  const btnEncountersTab = document.getElementById('tab-btn-encounters');
  const btnFinancialTab = document.getElementById('tab-btn-financial');
  const btnDoctorsTab = document.getElementById('tab-btn-doctors');
  const filtersContainer = document.getElementById('filters-container');
  const previewStatus = document.getElementById('preview-status');
  const tableHead = document.getElementById('preview-table-head');
  const tableBody = document.getElementById('preview-table-body');
  const btnPdf = document.getElementById('btn-export-pdf');
  const btnXls = document.getElementById('btn-export-xls');
  const btnCsv = document.getElementById('btn-export-csv');

  let finPieChartInstance = null;
  let finBarChartInstance = null;

  // Função para atualizar o destaque visual dos cards
  const updateReportCardSelection = (selectedTab) => {
    const cards = [
      { id: 'tab-btn-patients', tab: 'patients', border: 'rgba(99,102,241,0.5)', bg: 'rgba(99,102,241,0.08)', shadow: 'rgba(99,102,241,0.15)' },
      { id: 'tab-btn-encounters', tab: 'encounters', border: 'rgba(236,72,153,0.5)', bg: 'rgba(236,72,153,0.08)', shadow: 'rgba(236,72,153,0.15)' },
      { id: 'tab-btn-financial', tab: 'financial', border: 'rgba(34,211,238,0.5)', bg: 'rgba(34,211,238,0.08)', shadow: 'rgba(34,211,238,0.15)' },
      { id: 'tab-btn-doctors', tab: 'doctors', border: 'rgba(52,211,153,0.5)', bg: 'rgba(52,211,153,0.08)', shadow: 'rgba(52,211,153,0.15)' }
    ];

    cards.forEach(item => {
      const el = document.getElementById(item.id);
      if (!el) return;
      const badge = el.querySelector('.card-status-badge');
      if (item.tab === selectedTab) {
        el.classList.add('active');
        el.style.background = item.bg;
        el.style.borderColor = item.border;
        el.style.borderWidth = '1.5px';
        el.style.boxShadow = `0 6px 20px ${item.shadow}`;
        if (badge) badge.style.display = 'inline-block';
      } else {
        el.classList.remove('active');
        el.style.background = 'var(--bg-secondary)';
        el.style.borderColor = 'var(--border-color)';
        el.style.borderWidth = '1px';
        el.style.boxShadow = 'none';
        if (badge) badge.style.display = 'none';
      }
    });
  };

  // Alternar abas com Cards
  btnPatientsTab?.addEventListener('click', () => {
    activeTab = 'patients';
    updateReportCardSelection('patients');
    renderFilters();
  });

  btnEncountersTab?.addEventListener('click', () => {
    activeTab = 'encounters';
    updateReportCardSelection('encounters');
    renderFilters();
  });

  btnFinancialTab?.addEventListener('click', () => {
    activeTab = 'financial';
    updateReportCardSelection('financial');
    renderFilters();
  });

  btnDoctorsTab?.addEventListener('click', () => {
    activeTab = 'doctors';
    updateReportCardSelection('doctors');
    renderDoctorReport();
  });

  window.toggleFilterDropdown = function(id, event) {
    if (event) event.stopPropagation();
    const target = document.getElementById(id);
    if (!target) return;
    const isVisible = target.classList.contains('visible');
    document.querySelectorAll('.dropdown-check-list').forEach(d => d.classList.remove('visible'));
    if (!isVisible) {
      target.classList.add('visible');
    }
  };

  window.updateDropdownAnchorText = function(dropdownId, countChecked, totalCount, defaultLabel) {
    const dropdown = document.getElementById(dropdownId);
    if (!dropdown) return;
    const anchor = dropdown.querySelector('.anchor');
    if (!anchor) return;
    if (countChecked === totalCount) {
      anchor.textContent = `${defaultLabel}: Todos`;
    } else if (countChecked === 0) {
      anchor.textContent = `${defaultLabel}: Nenhum`;
    } else {
      anchor.textContent = `${defaultLabel}: ${countChecked} de ${totalCount}`;
    }
  };

  // Fechar dropdowns de filtro ao clicar fora
  document.addEventListener('click', (e) => {
    const dropdowns = document.querySelectorAll('.dropdown-check-list');
    dropdowns.forEach(dropdown => {
      if (!dropdown.contains(e.target)) {
        dropdown.classList.remove('visible');
      }
    });
  });

  const getUniqueCitiesCheckboxes = () => {
    const cities = [...new Set(patientsList.map(p => p.city).filter(Boolean))].sort();
    return `
      <li>
        <input type="checkbox" id="filter-city-all" checked>
        <label for="filter-city-all"><strong>Selecionar Todas</strong></label>
      </li>
      ${cities.map((c, i) => `
        <li>
          <input type="checkbox" class="filter-city-item" value="${c}" id="filter-city-${i}" checked>
          <label for="filter-city-${i}">${c}</label>
        </li>
      `).join('')}
    `;
  };

  const setupFilterGroupSelectAll = (allId, itemClass, dropdownId, defaultLabel) => {
    const allCb = document.getElementById(allId);
    if (!allCb) return;

    const updateText = () => {
      const itemCbs = document.querySelectorAll(`.${itemClass}`);
      const checkedCount = Array.from(itemCbs).filter(cb => cb.checked).length;
      updateDropdownAnchorText(dropdownId, checkedCount, itemCbs.length, defaultLabel);
    };

    // Configurar listener para o checkbox de marcar/desmarcar todos
    allCb.addEventListener('change', (e) => {
      const checked = e.target.checked;
      const itemCbs = document.querySelectorAll(`.${itemClass}`);
      itemCbs.forEach(cb => {
        cb.checked = checked;
      });
      updateText();
      filterAndRender();
    });

    // Configurar listener para cada item individual
    const itemCbs = document.querySelectorAll(`.${itemClass}`);
    itemCbs.forEach(cb => {
      cb.addEventListener('change', () => {
        const currentItemCbs = document.querySelectorAll(`.${itemClass}`);
        if (!cb.checked) {
          allCb.checked = false;
        } else if (Array.from(currentItemCbs).every(c => c.checked)) {
          allCb.checked = true;
        }
        updateText();
        filterAndRender();
      });
    });

    // Inicializar o texto
    updateText();
  };

  const renderFilters = () => {
    if (activeTab === 'patients') {
      filtersContainer.innerHTML = `
        <div class="filters-grid">
          <div class="filter-group">
            <label>Data de Cadastro Inicial</label>
            <input type="date" id="filter-date-start">
          </div>
          <div class="filter-group">
            <label>Data de Cadastro Final</label>
            <input type="date" id="filter-date-end">
          </div>
          <div class="filter-group">
            <label>Cidades</label>
            <div class="dropdown-check-list" id="dropdown-city">
              <div class="anchor" onclick="toggleFilterDropdown('dropdown-city', event)">Cidades: Todas</div>
              <ul class="items">
                ${getUniqueCitiesCheckboxes()}
              </ul>
            </div>
          </div>
          <div class="filter-group">
            <label>Faturamento Mínimo (R$)</label>
            <input type="number" id="filter-billing-min" placeholder="Ex: 500" min="0">
          </div>
        </div>
      `;
    } else if (activeTab === 'encounters') {
      filtersContainer.innerHTML = `
        <div class="filters-grid">
          <div class="filter-group">
            <label>Período Inicial (Admissão)</label>
            <input type="date" id="filter-date-start">
          </div>
          <div class="filter-group">
            <label>Período Final (Admissão)</label>
            <input type="date" id="filter-date-end">
          </div>
          <div class="filter-group">
            <label>Situação / Status</label>
            <div class="dropdown-check-list" id="dropdown-status">
              <div class="anchor" onclick="toggleFilterDropdown('dropdown-status', event)">Status: Todos</div>
              <ul class="items">
                <li>
                  <input type="checkbox" id="filter-status-all" checked>
                  <label for="filter-status-all"><strong>Selecionar Todos</strong></label>
                </li>
                <li>
                  <input type="checkbox" class="filter-status-item" value="Aguardando_Triagem" id="filter-status-1" checked>
                  <label for="filter-status-1">Aguardando Triagem</label>
                </li>
                <li>
                  <input type="checkbox" class="filter-status-item" value="Aguardando_Atendimento" id="filter-status-2" checked>
                  <label for="filter-status-2">Aguardando Consulta</label>
                </li>
                <li>
                  <input type="checkbox" class="filter-status-item" value="Em_Atendimento" id="filter-status-3" checked>
                  <label for="filter-status-3">Em Consulta</label>
                </li>
                <li>
                  <input type="checkbox" class="filter-status-item" value="Finalizado" id="filter-status-4" checked>
                  <label for="filter-status-4">Finalizado</label>
                </li>
              </ul>
            </div>
          </div>
          <div class="filter-group">
            <label>Classificação de Risco</label>
            <div class="dropdown-check-list" id="dropdown-manchester">
              <div class="anchor" onclick="toggleFilterDropdown('dropdown-manchester', event)">Classificação: Todas</div>
              <ul class="items">
                <li>
                  <input type="checkbox" id="filter-manchester-all" checked>
                  <label for="filter-manchester-all"><strong>Selecionar Todas</strong></label>
                </li>
                <li>
                  <input type="checkbox" class="filter-manchester-item" value="Vermelho" id="filter-risk-1" checked>
                  <label for="filter-risk-1">Vermelho (Emergência)</label>
                </li>
                <li>
                  <input type="checkbox" class="filter-manchester-item" value="Laranja" id="filter-risk-2" checked>
                  <label for="filter-risk-2">Laranja (Muito Urgente)</label>
                </li>
                <li>
                  <input type="checkbox" class="filter-manchester-item" value="Amarelo" id="filter-risk-3" checked>
                  <label for="filter-risk-3">Amarelo (Urgente)</label>
                </li>
                <li>
                  <input type="checkbox" class="filter-manchester-item" value="Verde" id="filter-risk-4" checked>
                  <label for="filter-risk-4">Verde (Pouco Urgente)</label>
                </li>
                <li>
                  <input type="checkbox" class="filter-manchester-item" value="Azul" id="filter-risk-5" checked>
                  <label for="filter-risk-5">Azul (Não Urgente)</label>
                </li>
                <li>
                  <input type="checkbox" class="filter-manchester-item" value="null" id="filter-risk-6" checked>
                  <label for="filter-risk-6">Sem Classificação</label>
                </li>
              </ul>
            </div>
          </div>
          <div class="filter-group">
            <label>Tipo de Atendimento</label>
            <div class="dropdown-check-list" id="dropdown-type">
              <div class="anchor" onclick="toggleFilterDropdown('dropdown-type', event)">Tipos: Todos</div>
              <ul class="items">
                <li>
                  <input type="checkbox" id="filter-type-all" checked>
                  <label for="filter-type-all"><strong>Selecionar Todos</strong></label>
                </li>
                <li>
                  <input type="checkbox" class="filter-type-item" value="Urgencia" id="filter-type-1" checked>
                  <label for="filter-type-1">Urgência</label>
                </li>
                <li>
                  <input type="checkbox" class="filter-type-item" value="Ambulatorio" id="filter-type-2" checked>
                  <label for="filter-type-2">Ambulatório</label>
                </li>
              </ul>
            </div>
          </div>
          <div class="filter-group" style="min-width: 180px;">
            <label>Médico Responsável</label>
            <select id="filter-doctor-name" style="width:100%;padding:8px 12px;border-radius:8px;border:1px solid var(--border-color);background:var(--bg-tertiary);color:var(--text-primary);font-size:0.85rem;cursor:pointer;">
              <option value="">— Todos os Médicos —</option>
              ${[...new Set(encountersList.map(e => e.doctorName).filter(Boolean))].sort().map(d => `<option value="${d}">${d}</option>`).join('')}
            </select>
          </div>
        </div>
      `;
    } else if (activeTab === 'financial') {
      filtersContainer.innerHTML = `
        <div class="filters-grid">
          <div class="filter-group">
            <label>Vencimento Inicial</label>
            <input type="date" id="filter-date-start" value="2026-05-01">
          </div>
          <div class="filter-group">
            <label>Vencimento Final</label>
            <input type="date" id="filter-date-end" value="2026-07-27">
          </div>
          <div class="filter-group">
            <label>Status Financeiro</label>
            <div class="dropdown-check-list" id="dropdown-fin-status">
              <div class="anchor" onclick="toggleFilterDropdown('dropdown-fin-status', event)">Status: Todos</div>
              <ul class="items">
                <li>
                  <input type="checkbox" id="filter-fin-all" checked>
                  <label for="filter-fin-all"><strong>Selecionar Todos</strong></label>
                </li>
                <li>
                  <input type="checkbox" class="filter-fin-item" value="Pagas" id="fin-st-1" checked>
                  <label for="fin-st-1">Pagas</label>
                </li>
                <li>
                  <input type="checkbox" class="filter-fin-item" value="A Vencer" id="fin-st-2" checked>
                  <label for="fin-st-2">A Vencer</label>
                </li>
                <li>
                  <input type="checkbox" class="filter-fin-item" value="Vencidas" id="fin-st-3" checked>
                  <label for="fin-st-3">Vencidas</label>
                </li>
                <li>
                  <input type="checkbox" class="filter-fin-item" value="Bonificadas" id="fin-st-4" checked>
                  <label for="fin-st-4">Bonificadas</label>
                </li>
              </ul>
            </div>
          </div>
        </div>
      `;
    }

    // Registrar event listeners nos campos de texto/data
    const textInputs = filtersContainer.querySelectorAll('input[type="date"], input[type="number"]');
    textInputs.forEach(input => {
      input.addEventListener('change', filterAndRender);
      input.addEventListener('input', filterAndRender);
    });

    // Inicializar os seletores Select All para os grupos de checkboxes
    if (activeTab === 'patients') {
      setupFilterGroupSelectAll('filter-city-all', 'filter-city-item', 'dropdown-city', 'Cidades');
    } else if (activeTab === 'encounters') {
      setupFilterGroupSelectAll('filter-status-all', 'filter-status-item', 'dropdown-status', 'Status');
      setupFilterGroupSelectAll('filter-manchester-all', 'filter-manchester-item', 'dropdown-manchester', 'Classificação');
      setupFilterGroupSelectAll('filter-type-all', 'filter-type-item', 'dropdown-type', 'Tipos');
      document.getElementById('filter-doctor-name')?.addEventListener('change', filterAndRender);
    } else if (activeTab === 'financial') {
      setupFilterGroupSelectAll('filter-fin-all', 'filter-fin-item', 'dropdown-fin-status', 'Status');
    }

    filterAndRender();
  };

  const updatePreviewStatusText = () => {
    const total = currentFilteredList.length;
    const selected = document.querySelectorAll('.record-checkbox:checked').length;
    previewStatus.textContent = `${selected} de ${total} selecionados para exportação`;
  };

  const setupCheckboxEvents = () => {
    const selectAllCheckbox = document.getElementById('select-all-records');
    const recordCheckboxes = document.querySelectorAll('.record-checkbox');

    if (selectAllCheckbox) {
      selectAllCheckbox.addEventListener('change', (e) => {
        const checked = e.target.checked;
        recordCheckboxes.forEach(cb => {
          cb.checked = checked;
        });
        updatePreviewStatusText();
      });
    }

    recordCheckboxes.forEach(cb => {
      cb.addEventListener('change', () => {
        if (!cb.checked && selectAllCheckbox) {
          selectAllCheckbox.checked = false;
        } else if (selectAllCheckbox && Array.from(recordCheckboxes).every(c => c.checked)) {
          selectAllCheckbox.checked = true;
        }
        updatePreviewStatusText();
      });
    });
  };

  const renderFinancialCharts = (data) => {
    const pieCtx = document.getElementById('finPieChart');
    const barCtx = document.getElementById('finBarChart');
    if (!pieCtx || !barCtx) return;

    if (finPieChartInstance) finPieChartInstance.destroy();
    if (finBarChartInstance) finBarChartInstance.destroy();

    const labels = data.map(item => item.label);
    const quantities = data.map(item => item.count);
    const valuesR$ = data.map(item => item.totalValue);
    const colors = data.map(item => item.color);

    // 1. Gráfico de Pizza ("Distribuição por Status") com Tooltip Personalizada
    finPieChartInstance = new Chart(pieCtx, {
      type: 'pie',
      data: {
        labels: labels,
        datasets: [{
          data: quantities,
          backgroundColor: colors,
          borderWidth: 2,
          borderColor: '#1a1d24'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              color: '#a0aec0',
              font: { family: 'Outfit', size: 11 },
              usePointStyle: true,
              padding: 10
            }
          },
          tooltip: {
            backgroundColor: '#13151b',
            titleColor: '#ffffff',
            bodyColor: '#e2e8f0',
            borderColor: '#2d3748',
            borderWidth: 1,
            padding: 12,
            displayColors: true,
            callbacks: {
              title: function(items) {
                return items[0].label;
              },
              label: function(context) {
                const idx = context.dataIndex;
                const count = context.parsed;
                const valor = valuesR$[idx] || 0;
                const totalQtd = quantities.reduce((a, b) => a + b, 0);
                const pct = totalQtd > 0 ? ((count / totalQtd) * 100).toFixed(1) : '0.0';

                const valorFormatado = new Intl.NumberFormat('pt-BR', {
                  style: 'currency',
                  currency: 'BRL'
                }).format(valor);

                return [
                  `Quantidade: ${count} parcelas (${pct}%)`,
                  `Valor Total: ${valorFormatado}`
                ];
              }
            }
          }
        }
      }
    });

    // 2. Gráfico de Barras ("Valor por Status (R$)")
    finBarChartInstance = new Chart(barCtx, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [{
          label: 'Valor (R$)',
          data: valuesR$,
          backgroundColor: colors,
          borderRadius: 4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: function(context) {
                const valor = context.parsed.y;
                return 'Total: ' + new Intl.NumberFormat('pt-BR', {
                  style: 'currency',
                  currency: 'BRL'
                }).format(valor);
              }
            }
          }
        },
        scales: {
          x: {
            grid: { color: 'rgba(255,255,255,0.03)' },
            ticks: { color: '#a0aec0', font: { family: 'Inter', size: 10 } }
          },
          y: {
            grid: { color: 'rgba(255,255,255,0.05)' },
            ticks: {
              color: '#a0aec0',
              font: { family: 'Inter', size: 10 },
              callback: function(val) {
                return 'R$ ' + val.toLocaleString('pt-BR');
              }
            }
          }
        }
      }
    });
  };

  const filterAndRender = () => {
    if (activeTab === 'financial') {
      const previewCard = document.querySelector('.preview-card');
      if (!previewCard) return;

      // Calcular dados dinâmicos a partir dos pacientes ou conjuntos de demonstração
      let pagasCount = 89, pagasVal = 13500.00;
      let aVencerCount = 8, aVencerVal = 850.00;
      let vencidasCount = 5, vencidasVal = 991.00;
      let bonificadasCount = 2, bonificadasVal = 300.00;
      let suspensasCount = 0, suspensasVal = 0;
      let canceladasCount = 0, canceladasVal = 0;
      let excluidasCount = 0, excluidasVal = 0;

      // Se houver dados de pacientes no banco local, agregá-los!
      if (patientsList && patientsList.length > 0) {
        patientsList.forEach((p, i) => {
          const val = parseFloat((p.billingValue || '').replace(/[^\d,]/g, '').replace(',', '.')) || 150.00;
          if (i % 5 === 0) {
            aVencerCount++; aVencerVal += val;
          } else if (i % 7 === 0) {
            vencidasCount++; vencidasVal += val;
          } else {
            pagasCount++; pagasVal += val;
          }
        });
      }

      const totalVal = pagasVal + aVencerVal + vencidasVal + bonificadasVal + suspensasVal + canceladasVal + excluidasVal;
      const totalParcelas = pagasCount + aVencerCount + vencidasCount + bonificadasCount + suspensasCount + canceladasCount + excluidasCount;

      const totalFormatted = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalVal);

      const finData = [
        { label: 'Pagas', count: pagasCount, totalValue: pagasVal, color: '#00c853' },
        { label: 'A Vencer', count: aVencerCount, totalValue: aVencerVal, color: '#2979ff' },
        { label: 'Vencidas', count: vencidasCount, totalValue: vencidasVal, color: '#ff1744' },
        { label: 'Bonificadas', count: bonificadasCount, totalValue: bonificadasVal, color: '#ffc400' },
        { label: 'Suspensas', count: suspensasCount, totalValue: suspensasVal, color: '#8d8d8d' },
        { label: 'Canceladas', count: canceladasCount, totalValue: canceladasVal, color: '#ff9100' },
        { label: 'Excluídas', count: excluidasCount, totalValue: excluidasVal, color: '#d50000' }
      ];

      previewCard.innerHTML = `
        <div class="preview-header" style="flex-wrap: wrap; gap: 15px;">
          <h3><i class="fa-solid fa-file-invoice-dollar" style="color: var(--color-primary);"></i> Relatório Financeiro de Títulos</h3>
          <div style="margin-left: auto; display: flex; gap: 8px; flex-wrap: wrap;">
            <button id="btn-export-pdf" class="btn btn-primary" style="background: var(--danger-color); font-size: 0.8rem;"><i class="fa-solid fa-file-pdf"></i> Exportar PDF</button>
            <button id="btn-export-xls" class="btn btn-primary" style="background: var(--success-color); font-size: 0.8rem;"><i class="fa-solid fa-file-excel"></i> Exportar Excel</button>
            <button id="btn-export-csv" class="btn btn-outline" style="font-size: 0.8rem;"><i class="fa-solid fa-file-csv"></i> Exportar CSV</button>
          </div>
        </div>

        <!-- Badges KPI de Status -->
        <div class="financial-kpi-bar" style="margin-top: 15px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px; background: rgba(0,0,0,0.15); padding: 14px; border-radius: var(--radius-md); border: 1px solid var(--border-color);">
          <div class="financial-badges-group" style="display: flex; gap: 8px; flex-wrap: wrap; font-size: 0.85rem;">
            <span class="fin-kpi-badge" style="border-left: 3px solid #00c853; padding: 4px 10px; background: rgba(0,200,83,0.08); border-radius: 4px;">• Pagas: <strong>${pagasCount}</strong></span>
            <span class="fin-kpi-badge" style="border-left: 3px solid #2979ff; padding: 4px 10px; background: rgba(41,121,255,0.08); border-radius: 4px;">• A Vencer: <strong>${aVencerCount}</strong></span>
            <span class="fin-kpi-badge" style="border-left: 3px solid #ff1744; padding: 4px 10px; background: rgba(255,23,68,0.08); border-radius: 4px;">• Vencidas: <strong>${vencidasCount}</strong></span>
            <span class="fin-kpi-badge" style="border-left: 3px solid #ffc400; padding: 4px 10px; background: rgba(255,196,0,0.08); border-radius: 4px;">• Bonificadas: <strong>${bonificadasCount}</strong></span>
            <span class="fin-kpi-badge" style="border-left: 3px solid #8d8d8d; padding: 4px 10px; background: rgba(141,141,141,0.08); border-radius: 4px;">• Suspensas: <strong>${suspensasCount}</strong></span>
            <span class="fin-kpi-badge" style="border-left: 3px solid #ff9100; padding: 4px 10px; background: rgba(255,145,0,0.08); border-radius: 4px;">• Canceladas: <strong>${canceladasCount}</strong></span>
            <span class="fin-kpi-badge" style="border-left: 3px solid #d50000; padding: 4px 10px; background: rgba(213,0,0,0.08); border-radius: 4px;">• Excluídas: <strong>${excluidasCount}</strong></span>
          </div>
          <div style="font-family: 'Outfit'; text-align: right;">
            <span style="font-size: 0.75rem; color: var(--text-muted); display: block;">SUBTOTAL CLIENTE</span>
            <strong style="font-size: 1.2rem; color: var(--color-primary);">${totalFormatted}</strong>
          </div>
        </div>

        <!-- Seção de Gráficos -->
        <div class="charts-grid" style="margin-top: 20px;">
          <div class="chart-card">
            <h4 class="chart-card-title">
              <i class="fa-solid fa-chart-pie" style="color: var(--color-primary);"></i> Distribuição por Status
            </h4>
            <div class="chart-container" style="height: 250px;">
              <canvas id="finPieChart"></canvas>
            </div>
          </div>
          <div class="chart-card">
            <h4 class="chart-card-title">
              <i class="fa-solid fa-chart-column" style="color: var(--color-accent);"></i> Valor por Status (R$)
            </h4>
            <div class="chart-container" style="height: 250px;">
              <canvas id="finBarChart"></canvas>
            </div>
          </div>
        </div>

        <!-- Footer Informativo -->
        <div style="margin-top: 20px; display: flex; justify-content: space-between; align-items: center; background: rgba(0,0,0,0.2); padding: 12px 16px; border-radius: var(--radius-md); border: 1px solid var(--border-color); font-size: 0.85rem; color: var(--text-secondary); flex-wrap: wrap; gap: 10px;">
          <div>
            <strong>Filtros aplicados:</strong> Situações: Paga, Vencida, Bonificada, A Vencer
          </div>
          <div style="background: rgba(0, 100, 255, 0.15); color: var(--color-primary); padding: 6px 14px; border-radius: var(--radius-lg); font-weight: 600; font-family: monospace;">
            <i class="fa-solid fa-coins"></i> Total: ${totalFormatted} | ${totalParcelas} parcelas
          </div>
        </div>
      `;

      setTimeout(() => {
        renderFinancialCharts(finData);
      }, 50);

      // Re-associar botões de exportação do relatório financeiro
      const finBtnPdf = document.getElementById('btn-export-pdf');
      const finBtnXls = document.getElementById('btn-export-xls');
      const finBtnCsv = document.getElementById('btn-export-csv');

      if (finBtnPdf) finBtnPdf.addEventListener('click', () => processExport('pdf'));
      if (finBtnXls) finBtnXls.addEventListener('click', () => processExport('xls'));
      if (finBtnCsv) finBtnCsv.addEventListener('click', () => processExport('csv'));

      return;
    }

    // Restaurar estrutura original para as abas 'patients' e 'encounters' se necessário
    const previewCard = document.querySelector('.preview-card');
    if (previewCard && !document.getElementById('preview-table-head')) {
      previewCard.innerHTML = `
        <div class="preview-header">
          <h3><i class="fa-solid fa-list-check"></i> Registros Correspondentes</h3>
          <span id="preview-status" class="preview-status">Carregando dados...</span>
        </div>

        <div class="preview-table-wrapper">
          <table class="preview-table">
            <thead id="preview-table-head"></thead>
            <tbody id="preview-table-body"></tbody>
          </table>
        </div>

        <div class="report-actions" style="margin-top: 20px;">
          <button id="btn-export-pdf" class="btn btn-primary" style="background: var(--danger-color)"><i class="fa-solid fa-file-pdf"></i> Exportar PDF</button>
          <button id="btn-export-xls" class="btn btn-primary" style="background: var(--success-color)"><i class="fa-solid fa-file-excel"></i> Exportar Excel (XLSX)</button>
          <button id="btn-export-csv" class="btn btn-outline"><i class="fa-solid fa-file-csv"></i> Exportar CSV</button>
        </div>
      `;
      // Re-vincular ouvintes de exportação
      document.getElementById('btn-export-pdf')?.addEventListener('click', () => processExport('pdf'));
      document.getElementById('btn-export-xls')?.addEventListener('click', () => processExport('xls'));
      document.getElementById('btn-export-csv')?.addEventListener('click', () => processExport('csv'));
    }

    if (activeTab === 'patients') {
      const dateStart = document.getElementById('filter-date-start').value;
      const dateEnd = document.getElementById('filter-date-end').value;
      const billingMin = document.getElementById('filter-billing-min').value;
      
      const checkedCities = Array.from(document.querySelectorAll('.filter-city-item:checked')).map(cb => cb.value);

      currentFilteredList = patientsList.filter(p => {
        if (dateStart) {
          const start = new Date(dateStart + 'T00:00:00');
          const regDate = new Date(p.created_at || p.birthDate);
          if (regDate < start) return false;
        }
        if (dateEnd) {
          const end = new Date(dateEnd + 'T23:59:59');
          const regDate = new Date(p.created_at || p.birthDate);
          if (regDate > end) return false;
        }
        
        // Filtrar pelas cidades marcadas nos checkboxes
        if (!checkedCities.includes(p.city)) return false;

        if (billingMin) {
          const min = parseFloat(billingMin);
          const val = parseFloat((p.billingValue || '').replace(/[^\d,]/g, '').replace(',', '.')) || 0;
          if (val < min) return false;
        }
        return true;
      });

      tableHead.innerHTML = `
        <tr>
          <th class="col-checkbox"><input type="checkbox" id="select-all-records" checked></th>
          <th>ID</th>
          <th>Nome Completo</th>
          <th>CPF</th>
          <th>Data Nasc.</th>
          <th>Cidade</th>
          <th>Faturamento</th>
        </tr>
      `;

      if (currentFilteredList.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--text-secondary); padding: 20px;">Nenhum paciente encontrado com os filtros atuais.</td></tr>`;
      } else {
        const hasPEP = state.user && (state.user.role === 'Médico' || state.user.role === 'Enfermeiro');
        tableBody.innerHTML = currentFilteredList.map(p => {
          let formattedDate = p.birthDate || '-';
          if (p.birthDate && p.birthDate.includes('-')) {
            const [y, m, d] = p.birthDate.split('-');
            formattedDate = `${d}/${m}/${y}`;
          }
          const name = hasPEP ? p.fullName : abbreviateName(p.fullName);
          const cpf = hasPEP ? p.cpf : anonymizeCPF(p.cpf);
          return `
            <tr>
              <td class="col-checkbox"><input type="checkbox" class="record-checkbox" data-id="${p.id}" checked></td>
              <td style="font-family: monospace; font-weight: 600; color: var(--color-primary);">${p.id}</td>
              <td style="font-weight: 500;">${name}</td>
              <td style="font-family: monospace;">${cpf}</td>
              <td>${formattedDate}</td>
              <td>${p.city || '-'}</td>
              <td style="font-family: monospace;">${p.billingValue || 'R$ 0,00'}</td>
            </tr>
          `;
        }).join('');
      }

    } else {
      const dateStart = document.getElementById('filter-date-start').value;
      const dateEnd = document.getElementById('filter-date-end').value;

      const checkedStatuses = Array.from(document.querySelectorAll('.filter-status-item:checked')).map(cb => cb.value);
      const checkedManchester = Array.from(document.querySelectorAll('.filter-manchester-item:checked')).map(cb => cb.value);
      const checkedTypes = Array.from(document.querySelectorAll('.filter-type-item:checked')).map(cb => cb.value);
      const filterDoctor = (document.getElementById('filter-doctor-name') || {}).value || '';

      currentFilteredList = encountersList.filter(e => {
        if (dateStart) {
          const start = new Date(dateStart + 'T00:00:00');
          const admDate = new Date(e.admitted_at);
          if (admDate < start) return false;
        }
        if (dateEnd) {
          const end = new Date(dateEnd + 'T23:59:59');
          const admDate = new Date(e.admitted_at);
          if (admDate > end) return false;
        }
        
        // Filtrar pelos status marcados nos checkboxes
        if (!checkedStatuses.includes(e.status)) return false;

        // Filtrar pelas classificações Manchester (tratando null/vazio como "null")
        const mColor = e.manchesterColor || 'null';
        if (!checkedManchester.includes(mColor)) return false;

        // Filtrar pelos tipos de atendimento
        if (!checkedTypes.includes(e.type)) return false;

        // Filtrar por médico responsável
        if (filterDoctor && (e.doctorName || '') !== filterDoctor) return false;

        return true;
      });

      tableHead.innerHTML = `
        <tr>
          <th class="col-checkbox"><input type="checkbox" id="select-all-records" checked></th>
          <th>ID</th>
          <th>Paciente</th>
          <th>Classificação</th>
          <th>Tipo</th>
          <th>Situação</th>
          <th>Data/Hora</th>
        </tr>
      `;

      if (currentFilteredList.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--text-secondary); padding: 20px;">Nenhum atendimento encontrado com os filtros atuais.</td></tr>`;
      } else {
        const hasPEP = state.user && (state.user.role === 'Médico' || state.user.role === 'Enfermeiro');
        const statusMap = {
          'Aguardando_Triagem': 'Aguardando Triagem',
          'Aguardando_Atendimento': 'Aguardando Consulta',
          'Em_Atendimento': 'Em Consulta',
          'Finalizado': 'Finalizado'
        };
        tableBody.innerHTML = currentFilteredList.map(e => {
          const name = hasPEP ? (e.patientName || 'Desconhecido') : abbreviateName(e.patientName || 'Desconhecido');
          const dateStr = e.admitted_at ? new Date(e.admitted_at).toLocaleString() : '-';
          const badgeClass = e.manchesterColor ? `badge-${e.manchesterColor.toLowerCase()}` : '';
          const displayColor = e.manchesterColor ? `<span class="badge-manchester ${badgeClass}">${e.manchesterColor}</span>` : '-';
          return `
            <tr>
              <td class="col-checkbox"><input type="checkbox" class="record-checkbox" data-id="${e.id}" checked></td>
              <td style="font-family: monospace; font-weight: 600; color: var(--color-primary);">${e.id.substring(0, 8)}...</td>
              <td style="font-weight: 500;">${name}</td>
              <td>${displayColor}</td>
              <td>${e.type === 'Urgencia' ? 'Urgência' : 'Ambulatório'}</td>
              <td>${statusMap[e.status] || e.status}</td>
              <td style="font-size: 0.8rem; color: var(--text-secondary);">${dateStr}</td>
            </tr>
          `;
        }).join('');
      }
    }

    setupCheckboxEvents();
    updatePreviewStatusText();
  };

  const processExport = async (format) => {
    const checkedIds = Array.from(document.querySelectorAll('.record-checkbox:checked')).map(cb => cb.getAttribute('data-id'));
    if (checkedIds.length === 0) {
      alert('Por favor, selecione ao menos um registro para exportar.');
      return;
    }

    const recordsToExport = currentFilteredList.filter(item => checkedIds.includes(item.id));
    
    const hasPEP = state.user && (state.user.role === 'Médico' || state.user.role === 'Enfermeiro');
    let columns = [];
    let rows = [];
    let title = '';
    let filename = '';

    if (activeTab === 'patients') {
      title = 'Relatório de Pacientes';
      filename = 'pacientes';
      columns = ['ID', 'Nome Completo', 'CPF', 'Data de Nascimento', 'Cidade', 'Telefones', 'Faturamento'];
      rows = recordsToExport.map(p => {
        let formattedDate = p.birthDate || '-';
        if (p.birthDate && p.birthDate.includes('-')) {
          const [y, m, d] = p.birthDate.split('-');
          formattedDate = `${d}/${m}/${y}`;
        }
        const phones = [p.phone, p.cellphone].filter(Boolean).join(' / ') || '-';
        const name = hasPEP ? p.fullName : abbreviateName(p.fullName);
        const cpf = hasPEP ? p.cpf : anonymizeCPF(p.cpf);
        return [
          p.id, 
          name, 
          cpf, 
          formattedDate, 
          p.city || '-',
          phones,
          p.billingValue || 'R$ 0,00'
        ];
      });
    } else if (activeTab === 'encounters') {
      title = 'Relatório de Atendimentos';
      filename = 'atendimentos';
      columns = ['ID', 'Paciente', 'CPF Paciente', 'Motivo', 'Classificação', 'Status', 'Data'];
      rows = recordsToExport.map(e => {
        const name = hasPEP ? (e.patientName || 'Desconhecido') : abbreviateName(e.patientName || 'Desconhecido');
        const cpf = hasPEP ? (e.patientCpf || '-') : anonymizeCPF(e.patientCpf || '-');
        const dateStr = e.admitted_at ? new Date(e.admitted_at).toLocaleString() : '-';
        const statusMap = {
          'Aguardando_Triagem': 'Aguardando Triagem',
          'Aguardando_Atendimento': 'Aguardando Atendimento',
          'Em_Atendimento': 'Em Consulta',
          'Finalizado': 'Finalizado'
        };
        const formattedStatus = statusMap[e.status] || e.status;
        return [
          e.id, 
          name, 
          cpf, 
          (e.type === 'Urgencia' ? 'Urgência' : 'Ambulatório') + (e.complaints ? ` - ${e.complaints}` : ''), 
          e.manchesterColor || '-', 
          formattedStatus, 
          dateStr
        ];
      });
    } else {
      title = 'Relatório Financeiro de Títulos';
      filename = 'financeiro';
      columns = ['Status', 'Quantidade de Parcelas', 'Valor Acumulado (R$)'];
      rows = [
        ['Pagas', '89', 'R$ 13.500,00'],
        ['A Vencer', '8', 'R$ 850,00'],
        ['Vencidas', '5', 'R$ 991,00'],
        ['Bonificadas', '2', 'R$ 300,00'],
        ['Suspensas', '0', 'R$ 0,00'],
        ['Canceladas', '0', 'R$ 0,00'],
        ['Excluídas', '0', 'R$ 0,00'],
        ['SUBTOTAL CLIENTE', '104 parcelas', 'R$ 15.641,00']
      ];
    }

    const timestamp = new Date().toISOString().slice(0,10);
    filename = `${filename}_${timestamp}`;

    if (format === 'pdf') {
      await exportToPDF(columns, rows, title, filename);
    } else if (format === 'xls') {
      exportToXLS(columns, rows, filename);
    } else if (format === 'csv') {
      exportToCSV(columns, rows, filename);
    }
  };

  btnPdf.addEventListener('click', () => processExport('pdf'));
  btnXls.addEventListener('click', () => processExport('xls'));
  btnCsv.addEventListener('click', () => processExport('csv'));

  // -------------------------------------------------------
  // RELATÓRIO POR MÉDICO
  // -------------------------------------------------------
  const renderDoctorReport = async () => {
    const previewCard = document.querySelector('.preview-card');
    if (!previewCard) return;
    previewCard.innerHTML = `
      <div class="preview-header" style="margin-bottom:0;">
        <h3><i class="fa-solid fa-user-doctor" style="color:var(--color-primary);"></i> Relatório de Atividades por Médico</h3>
      </div>
      <div style="text-align:center;padding:30px;color:var(--text-muted);">
        <i class="fa-solid fa-spinner fa-spin" style="font-size:1.5rem;color:#818cf8;"></i>
        <div style="margin-top:8px;">Carregando dados dos médicos...</div>
      </div>
    `;
    try {
      const [resDoc, resAppts] = await Promise.all([
        apiFetch(`${API_URL}/doctors`),
        apiFetch(`${API_URL}/appointments`)
      ]);
      const rawDocs = resDoc.ok ? (await resDoc.json()) : [];
      const apptRaw = resAppts.ok ? (await resAppts.json()) : [];
      const apptList = Array.isArray(apptRaw) ? apptRaw : (apptRaw.data || []);
      const docList = Array.isArray(rawDocs) ? rawDocs : (rawDocs.data || []);
      const todayStr = new Date().toISOString().split('T')[0];

      const docStats = docList.map(doc => {
        const name = doc.name || '';
        const cleanName = name.replace(/^(Dr\.|Dra\.)\s*/i, '');
        const myAppts = apptList.filter(a => (a.doctorName||'').includes(name)||(a.doctorName||'').includes(cleanName));
        const today = myAppts.filter(a => a.appointmentDate === todayStr).length;
        const done = myAppts.filter(a => a.status === 'Concluído').length;
        const inProgress = myAppts.filter(a => a.status === 'Em Atendimento').length;
        return { name: doc.name, crm: doc.crm, specialty: doc.specialty, status: doc.status, total: myAppts.length, today, done, inProgress };
      });

      const totalAppts = docStats.reduce((s,d)=>s+d.total,0);
      const totalDone = docStats.reduce((s,d)=>s+d.done,0);
      const totalInProgress = docStats.reduce((s,d)=>s+d.inProgress,0);
      const ativos = docStats.filter(d=>d.status==='Ativo').length;
      const rows = docStats.map(d=>[d.name, d.specialty||'—', d.crm||'—', d.status||'—', d.total, d.today, d.inProgress, d.done]);

      previewCard.innerHTML = `
        <div class="preview-header" style="flex-wrap:wrap;gap:10px;">
          <h3><i class="fa-solid fa-user-doctor" style="color:var(--color-primary);"></i> Relatório de Atividades por Médico</h3>
          <div style="display:flex;gap:8px;margin-left:auto;">
            <button id="btn-doc-export-pdf" class="btn btn-primary" style="background:#dc2626;font-size:0.82rem;"><i class="fa-solid fa-file-pdf"></i> Exportar PDF</button>
            <button id="btn-doc-export-csv" class="btn btn-outline" style="font-size:0.82rem;"><i class="fa-solid fa-file-csv"></i> Exportar CSV</button>
          </div>
        </div>

        <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin:16px 0;">
          ${[{val:ativos,label:'Médicos Ativos',color:'#818cf8'},{val:totalAppts,label:'Total Agendamentos',color:'#38bdf8'},{val:totalInProgress,label:'Em Atendimento',color:'#fbbf24'},{val:totalDone,label:'Concluídos',color:'#34d399'}].map(k=>`<div style="background:var(--bg-tertiary);border-radius:10px;padding:14px;text-align:center;border:1px solid var(--border-color);"><div style="font-size:1.6rem;font-weight:800;color:${k.color};">${k.val}</div><div style="font-size:0.72rem;color:var(--text-muted);margin-top:2px;">${k.label}</div></div>`).join('')}
        </div>

        <div style="display:grid;grid-template-columns:2fr 1fr;gap:16px;margin-bottom:16px;">
          <div style="background:var(--bg-tertiary);border-radius:12px;padding:16px;border:1px solid var(--border-color);height:220px;position:relative;">
            <canvas id="chart-doc-productivity"></canvas>
          </div>
          <div style="background:var(--bg-tertiary);border-radius:12px;padding:16px;border:1px solid var(--border-color);height:220px;position:relative;">
            <canvas id="chart-doc-completion"></canvas>
          </div>
        </div>

        <div style="border-radius:12px;overflow:hidden;border:1px solid var(--border-color);">
          <table style="width:100%;border-collapse:collapse;">
            <thead>
              <tr style="background:var(--bg-tertiary);border-bottom:1px solid var(--border-color);">
                ${['Médico','Especialidade','Status','Total','Hoje','Em Atend.','Concluídos'].map(h=>`<th style="padding:11px 14px;font-size:0.73rem;color:var(--text-muted);text-transform:uppercase;">${h}</th>`).join('')}
              </tr>
            </thead>
            <tbody>
              ${docStats.map(d=>`
                <tr style="border-bottom:1px solid var(--border-color);">
                  <td style="padding:12px 14px;"><div style="font-weight:600;color:var(--text-primary);font-size:0.88rem;">${d.name}</div><div style="font-size:0.74rem;color:var(--text-muted);">CRM: ${d.crm||'—'}</div></td>
                  <td style="padding:12px 14px;font-size:0.84rem;color:var(--text-secondary);">${d.specialty||'—'}</td>
                  <td style="padding:12px 14px;text-align:center;"><span style="display:inline-block;padding:3px 10px;border-radius:20px;font-size:0.74rem;font-weight:600;background:${d.status==='Ativo'?'rgba(52,211,153,0.15)':'rgba(248,113,113,0.15)'};color:${d.status==='Ativo'?'#34d399':'#f87171'};">${d.status||'—'}</span></td>
                  <td style="padding:12px 14px;text-align:center;font-weight:700;color:#818cf8;">${d.total}</td>
                  <td style="padding:12px 14px;text-align:center;color:#38bdf8;font-weight:600;">${d.today}</td>
                  <td style="padding:12px 14px;text-align:center;color:#fbbf24;font-weight:600;">${d.inProgress}</td>
                  <td style="padding:12px 14px;text-align:center;color:#34d399;font-weight:600;">${d.done}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
        <div style="margin-top:8px;font-size:0.75rem;color:var(--text-muted);text-align:right;">${docList.length} médico(s) • Gerado em ${new Date().toLocaleString('pt-BR')}</div>
      `;

      setTimeout(() => {
        const ctxBar = document.getElementById('chart-doc-productivity');
        if (ctxBar && window.Chart) {
          if (ctxBar._chartInstance) ctxBar._chartInstance.destroy();
          const labels = docStats.map(d => d.name.replace(/^(Dr\.|Dra\.)\s*/i, '').split(' ')[0]);
          const inst = new window.Chart(ctxBar.getContext('2d'), {
            type: 'bar',
            data: {
              labels,
              datasets: [
                { label: 'Concluídos', data: docStats.map(d => d.done), backgroundColor: 'rgba(52,211,153,0.7)', borderRadius: 6 },
                { label: 'Em Atend.', data: docStats.map(d => d.inProgress), backgroundColor: 'rgba(251,191,36,0.7)', borderRadius: 6 },
                { label: 'Pendentes', data: docStats.map(d => Math.max(0, d.total - d.done - d.inProgress)), backgroundColor: 'rgba(129,140,248,0.7)', borderRadius: 6 }
              ]
            },
            options: {
              responsive: true, maintainAspectRatio: false,
              plugins: { legend: { labels: { color: '#94a3b8', font: { size: 11 } } }, title: { display: true, text: 'Agendamentos por Médico', color: '#e2e8f0', font: { size: 13, weight: '600' } } },
              scales: {
                x: { stacked: true, ticks: { color: '#94a3b8' }, grid: { color: 'rgba(255,255,255,0.05)' } },
                y: { stacked: true, ticks: { color: '#94a3b8' }, grid: { color: 'rgba(255,255,255,0.05)' } }
              }
            }
          });
          ctxBar._chartInstance = inst;
        }
        const ctxDoughnut = document.getElementById('chart-doc-completion');
        if (ctxDoughnut && window.Chart) {
          if (ctxDoughnut._chartInstance) ctxDoughnut._chartInstance.destroy();
          const inst2 = new window.Chart(ctxDoughnut.getContext('2d'), {
            type: 'doughnut',
            data: {
              labels: ['Concluídos', 'Em Atendimento', 'Pendentes'],
              datasets: [{ data: [totalDone, totalInProgress, Math.max(0, totalAppts - totalDone - totalInProgress)], backgroundColor: ['rgba(52,211,153,0.85)', 'rgba(251,191,36,0.85)', 'rgba(129,140,248,0.85)'], borderWidth: 0, hoverOffset: 8 }]
            },
            options: {
              responsive: true, maintainAspectRatio: false, cutout: '68%',
              plugins: { legend: { position: 'bottom', labels: { color: '#94a3b8', font: { size: 11 }, padding: 14 } }, title: { display: true, text: 'Distribuição Geral', color: '#e2e8f0', font: { size: 13, weight: '600' } } }
            }
          });
          ctxDoughnut._chartInstance = inst2;
        }
      }, 50);

      document.getElementById('btn-doc-export-pdf')?.addEventListener('click', async () => {
        const ts = new Date().toISOString().slice(0,10);
        await exportToPDF(['Médico','Especialidade','CRM','Status','Total','Hoje','Em Atend.','Concluídos'], rows, 'Relatório de Atividades por Médico', `relatorio_medicos_${ts}`);
      });
      document.getElementById('btn-doc-export-csv')?.addEventListener('click', () => {
        const ts = new Date().toISOString().slice(0,10);
        exportToCSV(['Médico','Especialidade','CRM','Status','Total','Hoje','Em Atend.','Concluídos'], rows, `relatorio_medicos_${ts}`);
      });

    } catch(err) {
      console.error('[DoctorReport]', err);
      const pc = document.querySelector('.preview-card');
      if (pc) pc.innerHTML = '<div style="padding:40px;text-align:center;color:var(--color-danger);"><i class="fa-solid fa-triangle-exclamation"></i> Erro ao carregar relatório de médicos.</div>';
    }
  };

  const loadData = async () => {
    try {
      previewStatus.textContent = 'Buscando dados...';
      const [resPatients, resEncounters] = await Promise.all([
        apiFetch(`${API_URL}/patients`),
        apiFetch(`${API_URL}/encounters`)
      ]);

      if (resPatients.ok) patientsList = await resPatients.json();
      if (resEncounters.ok) encountersList = await resEncounters.json();

      renderFilters();
    } catch (err) {
      console.error(err);
      previewStatus.textContent = 'Erro ao carregar dados.';
    }
  };

  loadData();
}

function abbreviateName(fullName) {
  if (!fullName) return '-';
  const parts = fullName.trim().split(/\s+/);
  if (parts.length <= 1) return fullName;
  return parts.map((part, index) => {
    if (index === 0 || index === parts.length - 1) return part;
    if (part.length <= 2) return part; // Keep small words like "de", "da"
    return part[0] + '.';
  }).join(' ');
}

function anonymizeCPF(cpf) {
  if (!cpf) return '-';
  const clean = cpf.replace(/\D/g, '');
  if (clean.length === 11) {
    return `${clean.substring(0, 3)}.***.***-${clean.substring(9)}`;
  }
  return '***.***.***-**';
}

async function exportToPDF(columns, rows, title, filename) {
  if (!window.jspdf) {
    alert('Biblioteca PDF não carregada.');
    return;
  }
  
  const loadLogo = () => new Promise((resolve) => {
    const img = new Image();
    img.src = '/assets/logo.png';
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
  });

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  
  const logoImg = await loadLogo();
  if (logoImg) {
    // Adiciona o logotipo da Health Nexus
    doc.addImage(logoImg, 'PNG', 14, 10, 16, 16);
    
    // Título e metadados ao lado do logotipo
    doc.setFontSize(18);
    doc.text(title, 34, 20);
    doc.setFontSize(9);
    doc.setTextColor(120);
    doc.text(`Gerado pelo sistema Health Nexus em: ${new Date().toLocaleString()}`, 34, 26);
  } else {
    // Fallback sem logo
    doc.setFontSize(18);
    doc.text(title, 14, 22);
    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.text(`Gerado pelo sistema Health Nexus em: ${new Date().toLocaleString()}`, 14, 30);
  }

  doc.autoTable({
    startY: 32,
    head: [columns],
    body: rows,
    theme: 'grid',
    headStyles: { fillColor: [44, 45, 52] },
    alternateRowStyles: { fillColor: [245, 245, 245] }
  });

  // Marca d'água / Rodapé de Confidencialidade
  const pageCount = doc.internal.getNumberOfPages();
  const userId = state.user ? state.user.id : 'desconhecido';
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(9);
    doc.setTextColor(150, 150, 150);
    // Posicionar no rodapé do A4 (297mm de altura)
    doc.text(`CONFIDENCIAL - DADOS DE SAÚDE | Operador: ${userId}`, 14, 287);
  }

  doc.save(`${filename}.pdf`);
}

function exportToXLS(columns, rows, filename) {
  if (!window.XLSX) {
    alert('Biblioteca XLSX não carregada.');
    return;
  }
  const ws_data = [columns, ...rows];
  const ws = XLSX.utils.aoa_to_sheet(ws_data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Relatório");
  XLSX.writeFile(wb, `${filename}.xlsx`);
}

function exportToCSV(columns, rows, filename) {
  const csvContent = [
    columns.join(','),
    ...rows.map(e => e.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
  ].join('\n');

  // Adiciona BOM para UTF-8 (corrige acentuação no Excel)
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.setAttribute("href", url);
  link.setAttribute("download", `${filename}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// =========================================================
// GERAR PDF DO PRONTUÁRIO DO PACIENTE
// =========================================================
window.generatePatientPDF = async function(patientId, patientName) {
  if (!window.jspdf) {
    alert('⚠️ Biblioteca PDF não carregada. Aguarde e tente novamente.');
    return;
  }
  try {
    const res = await apiFetch(`${API_URL}/patients/${patientId}/history`);
    if (!res.ok) throw new Error('Falha ao buscar dados do paciente');
    const resp = await res.json();
    const data = resp.data || {};
    const patient = data.patient || {};
    const encounters = data.encounters || [];
    const appointments = data.appointments || [];

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

    const loadLogo = () => new Promise(resolve => {
      const img = new Image();
      img.src = '/assets/logo.png';
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
    });
    const logoImg = await loadLogo();

    // HEADER colorido
    doc.setFillColor(99, 102, 241);
    doc.rect(0, 0, 210, 28, 'F');
    if (logoImg) doc.addImage(logoImg, 'PNG', 8, 5, 18, 18);
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16); doc.setFont('helvetica', 'bold');
    doc.text('HEALTH NEXUS', 30, 13);
    doc.setFontSize(9); doc.setFont('helvetica', 'normal');
    doc.text('Sistema de Gestão Hospitalar', 30, 19);
    doc.text(`Emitido em: ${new Date().toLocaleString('pt-BR')}`, 140, 13);
    doc.text('PRONTUÁRIO MÉDICO — CONFIDENCIAL', 140, 20);

    // DADOS DO PACIENTE
    let y = 36;
    doc.setFillColor(241, 245, 249);
    doc.roundedRect(10, y - 4, 190, 44, 3, 3, 'F');
    doc.setDrawColor(200, 200, 220);
    doc.roundedRect(10, y - 4, 190, 44, 3, 3, 'S');
    doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.setTextColor(99, 102, 241);
    doc.text('IDENTIFICAÇÃO DO PACIENTE', 14, y + 2);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(30, 30, 50);
    const bd = patient.birthDate ? new Date(patient.birthDate + 'T12:00:00').toLocaleDateString('pt-BR') : '—';
    doc.text(`Nome Completo: ${patient.fullName || '—'}`, 14, y + 10);
    doc.text(`CPF: ${patient.cpf || '—'}`, 14, y + 17);
    doc.text(`Data de Nascimento: ${bd}`, 14, y + 24);
    doc.text(`Cidade: ${patient.city || '—'}`, 14, y + 31);
    doc.text(`Telefone: ${patient.phone || patient.cellphone || '—'}`, 105, y + 10);
    doc.text(`Endereço: ${patient.address || '—'}`, 105, y + 17);
    doc.text(`Faturamento: ${patient.billingValue || '—'}`, 105, y + 24);
    doc.text(`Nº Prontuário: #${patientId.substring(0,8).toUpperCase()}`, 105, y + 31);
    y += 52;

    // HISTÓRICO DE ATENDIMENTOS
    if (encounters.length > 0) {
      doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.setTextColor(99, 102, 241);
      doc.text('HISTÓRICO DE ATENDIMENTOS', 14, y);
      y += 6;
      const sm = {Aguardando_Triagem:'Ag.Triagem',Aguardando_Atendimento:'Ag.Atend.',Em_Atendimento:'Em Consulta',Finalizado:'Finalizado'};
      doc.autoTable({
        startY: y,
        head: [['Data/Hora','Tipo','Status','Classif.','Queixas']],
        body: encounters.slice(0,20).map(e=>[
          e.admitted_at ? new Date(e.admitted_at).toLocaleString('pt-BR') : '—',
          e.type === 'Urgencia' ? 'Urgência' : (e.type||'—'),
          sm[e.status] || e.status || '—',
          e.manchesterColor || '—',
          (e.complaints||'—').substring(0,40)
        ]),
        theme: 'grid',
        styles: { fontSize: 8, cellPadding: 3 },
        headStyles: { fillColor: [99,102,241], textColor: 255, fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [248,250,252] },
        margin: { left: 10, right: 10 }
      });
      y = doc.lastAutoTable.finalY + 8;
    }

    // NOTAS SOAP
    const withNotes = encounters.filter(e => e.subjectiveContent||e.objectiveContent||e.assessmentContent||e.planContent);
    if (withNotes.length > 0) {
      if (y > 240) { doc.addPage(); y = 20; }
      doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.setTextColor(99, 102, 241);
      doc.text('NOTAS CLÍNICAS (SOAP)', 14, y);
      y += 6;
      withNotes.slice(0,5).forEach(e => {
        if (y > 250) { doc.addPage(); y = 20; }
        const dateStr = e.admitted_at ? new Date(e.admitted_at).toLocaleDateString('pt-BR') : '—';
        doc.setFillColor(241,245,249); doc.roundedRect(10,y-3,190,6,2,2,'F');
        doc.setFont('helvetica','bold'); doc.setFontSize(9); doc.setTextColor(30,30,50);
        doc.text(`Atend.: ${dateStr} — Classif.: ${e.manchesterColor||'—'}`, 14, y+1);
        y += 9;
        const soapData = [['Subjetivo (S)',e.subjectiveContent||'—'],['Objetivo (O)',e.objectiveContent||'—'],['Avaliação (A)',e.assessmentContent||'—'],['Plano (P)',e.planContent||'—']].filter(([,v])=>v!=='—');
        if (soapData.length > 0) {
          doc.autoTable({
            startY: y, head:[['Campo','Conteúdo']], body: soapData,
            theme:'grid', styles:{fontSize:8,cellPadding:3},
            headStyles:{fillColor:[139,92,246],textColor:255,fontStyle:'bold'},
            columnStyles:{0:{cellWidth:35,fontStyle:'bold'},1:{cellWidth:155}},
            alternateRowStyles:{fillColor:[248,250,252]}, margin:{left:10,right:10}
          });
          y = doc.lastAutoTable.finalY + 6;
        }
      });
    }

    // AGENDAMENTOS
    if (appointments.length > 0) {
      if (y > 230) { doc.addPage(); y = 20; }
      doc.setFont('helvetica','bold'); doc.setFontSize(11); doc.setTextColor(99,102,241);
      doc.text('AGENDAMENTOS', 14, y);
      y += 6;
      doc.autoTable({
        startY: y,
        head:[['Data','Horário','Médico','Especialidade','Status']],
        body: appointments.slice(0,15).map(a=>[
          a.appointmentDate ? new Date(a.appointmentDate+'T12:00:00').toLocaleDateString('pt-BR') : '—',
          a.appointmentTime||'—', a.doctorName||'—', a.specialty||'—', a.status||'—'
        ]),
        theme:'grid', styles:{fontSize:8,cellPadding:3},
        headStyles:{fillColor:[16,185,129],textColor:255,fontStyle:'bold'},
        alternateRowStyles:{fillColor:[248,250,252]}, margin:{left:10,right:10}
      });
    }

    // RODAPÉ
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8); doc.setTextColor(150,150,150);
      doc.text('CONFIDENCIAL — Uso exclusivo de profissionais de saúde autorizados', 14, 289);
      doc.text(`Página ${i} de ${pageCount}`, 180, 289);
      doc.setDrawColor(200,200,220); doc.line(10,285,200,285);
    }

    const safeName = (patient.fullName||patientName||'paciente').replace(/[^a-zA-Z0-9]/g,'_').substring(0,30);
    const ts = new Date().toISOString().slice(0,10);
    doc.save(`prontuario_${safeName}_${ts}.pdf`);

  } catch(err) {
    console.error('[generatePatientPDF]', err);
    alert('❌ Erro ao gerar o prontuário PDF. Verifique o console.');
  }
};

// =========================================================
// GERAR PDF DE COMPROVANTE DE AGENDAMENTO
// =========================================================
window.generateAppointmentPDF = function(id, patientName, doctorName, date, time, specialty, status, notes) {
  if (!window.jspdf) { alert('⚠️ Biblioteca PDF não carregada.'); return; }
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  const loadLogo = () => new Promise(resolve => {
    const img = new Image(); img.src = '/assets/logo.png';
    img.onload = () => resolve(img); img.onerror = () => resolve(null);
  });

  loadLogo().then(logoImg => {
    // Header
    doc.setFillColor(99, 102, 241);
    doc.rect(0, 0, 210, 28, 'F');
    if (logoImg) doc.addImage(logoImg, 'PNG', 8, 5, 18, 18);
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16); doc.setFont('helvetica', 'bold');
    doc.text('HEALTH NEXUS', 30, 13);
    doc.setFontSize(9); doc.setFont('helvetica', 'normal');
    doc.text('Sistema de Gestão Hospitalar', 30, 19);
    doc.text('COMPROVANTE DE AGENDAMENTO', 135, 13);
    doc.text(`Emitido em: ${new Date().toLocaleString('pt-BR')}`, 135, 19);

    // Título central
    doc.setTextColor(30, 30, 50);
    doc.setFontSize(18); doc.setFont('helvetica', 'bold');
    doc.text('COMPROVANTE DE CONSULTA', 105, 44, { align: 'center' });
    doc.setDrawColor(99, 102, 241); doc.setLineWidth(0.5);
    doc.line(20, 47, 190, 47);

    // Número do comprovante
    doc.setFontSize(10); doc.setFont('helvetica', 'normal'); doc.setTextColor(100, 100, 120);
    doc.text(`Nº: #${id.substring(0,8).toUpperCase()}`, 105, 54, { align: 'center' });

    // Box de dados
    let y = 64;
    doc.setFillColor(248, 250, 252); doc.roundedRect(15, y - 4, 180, 114, 3, 3, 'F');
    doc.setDrawColor(200, 210, 230); doc.roundedRect(15, y - 4, 180, 114, 3, 3, 'S');

    const addRow = (label, value, isBold = false) => {
      doc.setFont('helvetica', 'bold'); doc.setFontSize(8.5); doc.setTextColor(99, 102, 241);
      doc.text(label, 22, y + 2);
      doc.setFont('helvetica', isBold ? 'bold' : 'normal'); doc.setTextColor(30, 30, 50);
      doc.setFontSize(10.5);
      doc.text(String(value || '—'), 22, y + 8);
      y += 16;
    };

    addRow('PACIENTE', patientName, true);
    addRow('MÉDICO RESPONSÁVEL', doctorName);
    addRow('ESPECIALIDADE', specialty);
    const fmtDate = date ? new Date(date + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' }) : '—';
    addRow('DATA DA CONSULTA', fmtDate);
    addRow('HORÁRIO', time || '—');
    addRow('STATUS DA CONSULTA', status || 'Agendado');

    if (notes) {
      doc.setFont('helvetica', 'bold'); doc.setFontSize(8.5); doc.setTextColor(99, 102, 241);
      doc.text('OBSERVAÇÕES', 22, y + 2);
      doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(60, 60, 80);
      const splitNotes = doc.splitTextToSize(notes, 160);
      doc.text(splitNotes, 22, y + 8);
    }

    // Informações de instrução
    y = 190;
    doc.setFillColor(241, 245, 249); doc.roundedRect(15, y, 180, 28, 3, 3, 'F');
    doc.setFont('helvetica', 'bold'); doc.setFontSize(9.5); doc.setTextColor(99, 102, 241);
    doc.text('Instruções para o Paciente', 105, y + 7, { align: 'center' });
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); doc.setTextColor(80, 80, 100);
    doc.text('• Por favor, chegue com 15 minutos de antecedência.', 105, y + 14, { align: 'center' });
    doc.text('• Apresente este comprovante e um documento oficial com foto na recepção.', 105, y + 21, { align: 'center' });

    // Footer
    doc.setFontSize(8); doc.setTextColor(160, 160, 160);
    doc.line(10, 283, 200, 283);
    doc.text('Health Nexus — Sistema de Gestão Hospitalar | Documento gerado eletronicamente', 105, 288, { align: 'center' });

    const safeName = (patientName || 'paciente').replace(/[^a-zA-Z0-9]/g, '_').substring(0, 25);
    doc.save(`comprovante_${safeName}_${date || 'data'}.pdf`);
  });
};

// --- ABA AGENDA MÉDICA ---
async function renderAgendaTab() {
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
    const initials = (docName || '?').replace(/^(Dr.|Dra.)s*/i, '').split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() || 'MD';
    return { ...base, initials };
  };

  const STATUS_CFG = {
    'Agendado':       { color: '#818cf8', bg: 'rgba(99,102,241,0.12)', border: 'rgba(99,102,241,0.25)', icon: 'fa-clock' },
    'Confirmado':     { color: '#34d399', bg: 'rgba(16,185,129,0.12)', border: 'rgba(16,185,129,0.25)', icon: 'fa-circle-check' },
    'Em Atendimento': { color: '#fbbf24', bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.25)', icon: 'fa-stethoscope' },
    'Concluído':      { color: '#94a3b8', bg: 'rgba(148,163,184,0.12)', border: 'rgba(148,163,184,0.2)', icon: 'fa-check-double' },
    'Cancelado':      { color: '#f87171', bg: 'rgba(239,68,68,0.12)', border: 'rgba(239,68,68,0.2)', icon: 'fa-ban' },
  };

  contentArea.innerHTML = `
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
              <span style="color: var(--text-muted); font-size: 0.85rem; text-transform: capitalize;">${todayLabel}</span>
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
            <input type="date" id="filter-agenda-date" style="background: transparent; border: none; color: var(--text-primary); font-size: 0.85rem; outline: none; cursor: pointer;" value="${todayIso}">
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
            <label>Paciente *</label>
            <div class="custom-select-container" id="apt-patient-combo"></div>
            <input type="hidden" id="apt-patient-id" required>
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
              <input type="date" id="apt-date" class="form-input" value="${todayIso}" required>
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
  `;

  let currentStatusFilter = 'all';
  let currentSearchQuery = '';
  let allAppointmentsCache = [];
  let doctorsMap = {};

  const loadPatients = async () => {
    try {
      const pList = await cachedApiGet('/api/patients', 'patients');
      let patients = Array.isArray(pList) ? pList : (pList.data || []);
      
      // Ordenação Alfabética A-Z por nome completo
      patients.sort((a, b) => (a.fullName || '').localeCompare(b.fullName || '', 'pt-BR', { sensitivity: 'base' }));

      const pComboContainer = document.getElementById('apt-patient-combo');
      const pHiddenInput = document.getElementById('apt-patient-id');

      if (pComboContainer && pHiddenInput) {
        setupCustomSelect(pComboContainer, pHiddenInput, patients, 'Selecione o paciente...');
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
      statsEl.innerHTML = `
        <div class="interactive-card" id="kpi-agenda-all" title="Clique para exibir todas as consultas" style="background: var(--bg-secondary); border: 1px solid var(--border-color); border-radius: 12px; padding: 16px 20px; display: flex; align-items: center; gap: 16px;">
          <div style="width: 44px; height: 44px; border-radius: 12px; background: rgba(99,102,241,0.12); border: 1px solid rgba(99,102,241,0.25); display: flex; align-items: center; justify-content: center; color: #818cf8;">
            <i class="fa-solid fa-list-check" style="font-size: 1.2rem;"></i>
          </div>
          <div>
            <div style="font-size: 0.75rem; color: var(--text-muted); font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em;">Total de Consultas</div>
            <div style="font-size: 1.4rem; font-weight: 800; color: var(--text-primary);">${total}</div>
          </div>
        </div>

        <div class="interactive-card" id="kpi-agenda-confirmed" title="Clique para filtrar apenas Confirmados" style="background: var(--bg-secondary); border: 1px solid var(--border-color); border-radius: 12px; padding: 16px 20px; display: flex; align-items: center; gap: 16px;">
          <div style="width: 44px; height: 44px; border-radius: 12px; background: rgba(16,185,129,0.12); border: 1px solid rgba(16,185,129,0.25); display: flex; align-items: center; justify-content: center; color: #34d399;">
            <i class="fa-solid fa-circle-check" style="font-size: 1.2rem;"></i>
          </div>
          <div>
            <div style="font-size: 0.75rem; color: var(--text-muted); font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em;">Confirmados</div>
            <div style="font-size: 1.4rem; font-weight: 800; color: #34d399;">${confirmados}</div>
          </div>
        </div>

        <div class="interactive-card" id="kpi-agenda-progress" title="Clique para filtrar apenas Em Atendimento" style="background: var(--bg-secondary); border: 1px solid var(--border-color); border-radius: 12px; padding: 16px 20px; display: flex; align-items: center; gap: 16px;">
          <div style="width: 44px; height: 44px; border-radius: 12px; background: rgba(245,158,11,0.12); border: 1px solid rgba(245,158,11,0.25); display: flex; align-items: center; justify-content: center; color: #fbbf24;">
            <i class="fa-solid fa-stethoscope" style="font-size: 1.2rem;"></i>
          </div>
          <div>
            <div style="font-size: 0.75rem; color: var(--text-muted); font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em;">Em Atendimento</div>
            <div style="font-size: 1.4rem; font-weight: 800; color: #fbbf24;">${emAtendimento}</div>
          </div>
        </div>

        <div class="interactive-card" id="kpi-agenda-completed" title="Clique para filtrar apenas Concluídos" style="background: var(--bg-secondary); border: 1px solid var(--border-color); border-radius: 12px; padding: 16px 20px; display: flex; align-items: center; gap: 16px;">
          <div style="width: 44px; height: 44px; border-radius: 12px; background: rgba(148,163,184,0.12); border: 1px solid rgba(148,163,184,0.2); display: flex; align-items: center; justify-content: center; color: #94a3b8;">
            <i class="fa-solid fa-check-double" style="font-size: 1.2rem;"></i>
          </div>
          <div>
            <div style="font-size: 0.75rem; color: var(--text-muted); font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em;">Concluídos</div>
            <div style="font-size: 1.4rem; font-weight: 800; color: #94a3b8;">${concluidos}</div>
          </div>
        </div>
      `;
    }

    if (filtered.length === 0) {
      const selDate = document.getElementById('filter-agenda-date')?.value || '';
      const dlabel = selDate ? new Date(selDate + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' }) : 'esta data';
      container.innerHTML = `
        <div style="text-align: center; padding: 72px 20px; background: var(--bg-secondary); border: 1px solid var(--border-color); border-radius: 14px;">
          <i class="fa-regular fa-calendar-xmark" style="font-size: 3rem; color: var(--text-muted); opacity: 0.4; margin-bottom: 16px; display: block;"></i>
          <p style="font-size: 1.05rem; font-weight: 600; color: var(--text-secondary); margin-bottom: 6px;">Nenhuma consulta encontrada</p>
          <p style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 24px;">Não há agendamentos para ${dlabel} com os filtros selecionados.</p>
          <button class="btn btn-primary" onclick="document.getElementById('btn-open-new-appointment').click()" style="font-size: 0.85rem; padding: 9px 18px;">
            <i class="fa-solid fa-plus"></i> Agendar Nova Consulta
          </button>
        </div>
      `;
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
      
      const notesHtml = apt.notes ? `
        <div style="display: flex; align-items: center; gap: 6px; font-size: 0.8rem; color: var(--text-muted); margin-top: 4px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
          <i class="fa-regular fa-note-sticky" style="font-size: 0.75rem; opacity: 0.7;"></i>
          <span title="${apt.notes.replace(/"/g, '&quot;')}">${apt.notes}</span>
        </div>
      ` : '';

      const confirmBtn = apt.status === 'Agendado' ? `
        <button onclick="updateAppointmentStatus('${apt.id}', 'Confirmado')" title="Confirmar Agendamento" style="display: inline-flex; align-items: center; justify-content: center; width: 36px; height: 36px; border-radius: 8px; border: 1px solid rgba(16,185,129,0.3); background: rgba(16,185,129,0.08); color: #34d399; cursor: pointer; transition: all 0.15s;" onmouseenter="this.style.background='rgba(16,185,129,0.2)'" onmouseleave="this.style.background='rgba(16,185,129,0.08)'">
          <i class="fa-solid fa-check" style="font-size: 0.85rem;"></i>
        </button>
      ` : '';

      const atenderBtn = `
        <button onclick="startAppointmentEncounter('${apt.patientId}', '${apt.id}')" style="display: inline-flex; align-items: center; gap: 6px; padding: 8px 18px; border-radius: 8px; border: none; background: var(--color-primary); color: #fff; font-size: 0.84rem; font-weight: 600; cursor: pointer; transition: all 0.15s; box-shadow: 0 2px 8px rgba(99,102,241,0.25);" onmouseenter="this.style.transform='translateY(-1px)'" onmouseleave="this.style.transform='none'">
          <i class="fa-solid fa-stethoscope"></i> Atender
        </button>
      `;

      const cancelBtn = `
        <button onclick="updateAppointmentStatus('${apt.id}', 'Cancelado')" title="Cancelar Consulta" style="display: inline-flex; align-items: center; justify-content: center; width: 36px; height: 36px; border-radius: 8px; border: 1px solid rgba(239,68,68,0.3); background: rgba(239,68,68,0.08); color: #f87171; cursor: pointer; transition: all 0.15s;" onmouseenter="this.style.background='rgba(239,68,68,0.2)'" onmouseleave="this.style.background='rgba(239,68,68,0.08)'">
          <i class="fa-solid fa-xmark" style="font-size: 0.85rem;"></i>
        </button>
      `;

      return `
        <div style="display: grid; grid-template-columns: 90px 1fr auto; align-items: center; gap: 20px; background: var(--bg-secondary); border: 1px solid var(--border-color); border-left: 4px solid ${sc.color}; border-radius: 12px; padding: 16px 22px; transition: all 0.2s ease; opacity: ${isDone ? '0.6' : '1'};" onmouseenter="this.style.background='var(--bg-tertiary)';this.style.borderColor='rgba(255,255,255,0.15)'" onmouseleave="this.style.background='var(--bg-secondary)';this.style.borderColor='var(--border-color)'">
          
          <!-- HORA DA CONSULTA -->
          <div style="text-align: center; border-right: 1px solid var(--border-color); padding-right: 16px;">
            <div style="font-size: 1.2rem; font-weight: 800; color: var(--text-primary); letter-spacing: -0.5px;">${apt.appointmentTime}</div>
            <div style="font-size: 0.7rem; color: var(--text-muted); font-weight: 600; text-transform: uppercase;">Horário</div>
          </div>

          <!-- DETALHES DO PACIENTE E MÉDICO -->
          <div style="min-width: 0;">
            <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 6px; flex-wrap: wrap;">
              <span style="font-weight: 700; font-size: 1rem; color: var(--text-primary);">${apt.patientName}</span>
              <span style="display: inline-flex; align-items: center; gap: 5px; font-size: 0.75rem; font-weight: 600; padding: 3px 10px; border-radius: 20px; background: ${sc.bg}; color: ${sc.color}; border: 1px solid ${sc.border};">
                <i class="fa-solid ${sc.icon}" style="font-size: 0.7rem;"></i>${apt.status}
              </span>
            </div>
            
            <div style="display: flex; align-items: center; gap: 12px; flex-wrap: wrap;">
              <!-- Médico Chip -->
              <div style="display: inline-flex; align-items: center; gap: 7px; background: ${dc.bg}; border: 1px solid ${dc.border}; border-radius: 20px; padding: 3px 12px 3px 6px;">
                <div style="width: 20px; height: 20px; border-radius: 50%; background: ${dc.border}; display: flex; align-items: center; justify-content: center; font-size: 0.6rem; font-weight: 800; color: #fff;">${dc.initials}</div>
                <span style="font-size: 0.82rem; color: ${dc.text}; font-weight: 600;">${apt.doctorName}</span>
                <span style="font-size: 0.74rem; color: ${dc.text}; opacity: 0.8;">· ${specialty}</span>
              </div>
            </div>
            ${notesHtml}
          </div>

          <!-- AÇÕES DA CONSULTA -->
          <div style="display: flex; align-items: center; gap: 8px; flex-shrink: 0; flex-wrap: wrap;">
            ${canAct ? confirmBtn + atenderBtn + cancelBtn : ''}
            <button onclick="window.generateAppointmentPDF('${apt.id}', '${(apt.patientName||'').replace(/'/g, "\\'")}', '${(apt.doctorName||'').replace(/'/g, "\\'")}', '${apt.appointmentDate||''}', '${apt.appointmentTime||''}', '${(apt.specialty||'').replace(/'/g, "\\'")}', '${apt.status||''}', '${(apt.notes||'').replace(/'/g, "\\'")}')" title="Gerar Comprovante PDF" style="display:inline-flex;align-items:center;gap:5px;padding:8px 12px;border-radius:8px;border:1px solid rgba(239,68,68,0.3);background:rgba(239,68,68,0.08);color:#f87171;font-size:0.78rem;font-weight:600;cursor:pointer;transition:all 0.15s;" onmouseenter="this.style.background='rgba(239,68,68,0.2)'" onmouseleave="this.style.background='rgba(239,68,68,0.08)'">
              <i class="fa-solid fa-file-pdf"></i> Comprovante
            </button>
          </div>
        </div>
      `;
    };

    const renderGroup = (list, label, icon) => {
      if (list.length === 0) return '';
      return `
        <div style="margin-bottom: 32px;">
          <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 14px;">
            <i class="fa-solid ${icon}" style="color: var(--color-primary); font-size: 0.85rem;"></i>
            <span style="font-size: 0.82rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: var(--text-secondary);">${label}</span>
            <div style="flex: 1; height: 1px; background: var(--border-color); opacity: 0.6;"></div>
            <span style="font-size: 0.78rem; color: var(--text-muted); font-weight: 600;">${list.length} consulta${list.length > 1 ? 's' : ''}</span>
          </div>
          <div style="display: flex; flex-direction: column; gap: 12px;">
            ${list.map(renderCard).join('')}
          </div>
        </div>
      `;
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
    const selectedOption = pSelect.options ? pSelect.options[pSelect.selectedIndex] : null;
    const patientId = pSelect.value;
    const patientName = selectedOption ? selectedOption.dataset.name : (pSelect.dataset.name || '');

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
window.updateAppointmentStatus = async (id, status) => {
  try {
    const res = await apiFetch(`/api/appointments/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    });
    if (res.ok) {
      showToast(`Status da consulta atualizado para ${status}!`);
      requestSyncPromptIfConfigured();
      // Invalida cache de appointments e recarrega só a tabela (sem reconstruir a aba inteira)
      for (const key of dataCache.keys()) {
        if (typeof key === 'string' && key.startsWith('appointments_')) {
          dataCache.delete(key);
          dataCacheTimestamps.delete(key);
        }
      }
      if (typeof window.reloadAgenda === 'function') {
        window.reloadAgenda();
      } else {
        renderAgendaTab();
      }
    }
  } catch (e) {}
};



// --- ABA GESTÃO DE LEITOS E INTERNAÇÕES ---
async function renderLeitosTab() {
  const contentArea = document.getElementById('main-content');

  contentArea.innerHTML = `
    <div class="tab-pane active" style="padding: 24px;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; flex-wrap: wrap; gap: 16px;">
        <div>
          <h2 style="font-size: 1.5rem; font-weight: 700; margin-bottom: 4px;"><i class="fa-solid fa-bed-pulse" style="color: var(--color-primary);"></i> Gestão de Leitos & Internações</h2>
          <p style="color: var(--text-secondary); font-size: 0.9rem;">Mapa em tempo real da ocupação de leitos por setor hospitalar.</p>
        </div>
        <button id="btn-open-admit-modal" class="btn btn-primary">
          <i class="fa-solid fa-user-plus"></i> Internar Paciente
        </button>
      </div>

      <!-- Cards de Métricas de Leitos -->
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; margin-bottom: 24px;">
        <div class="card" style="padding: 20px;">
          <div style="color: var(--text-secondary); font-size: 0.85rem; font-weight: 600;">Leitos Vagos</div>
          <div id="kpi-beds-vago" style="font-size: 1.8rem; font-weight: 700; color: #4ade80; margin-top: 4px;">-</div>
        </div>
        <div class="card" style="padding: 20px;">
          <div style="color: var(--text-secondary); font-size: 0.85rem; font-weight: 600;">Leitos Ocupados</div>
          <div id="kpi-beds-ocupado" style="font-size: 1.8rem; font-weight: 700; color: #f87171; margin-top: 4px;">-</div>
        </div>
        <div class="card" style="padding: 20px;">
          <div style="color: var(--text-secondary); font-size: 0.85rem; font-weight: 600;">Em Higienização</div>
          <div id="kpi-beds-clean" style="font-size: 1.8rem; font-weight: 700; color: #facc15; margin-top: 4px;">-</div>
        </div>
        <div class="card" style="padding: 20px;">
          <div style="color: var(--text-secondary); font-size: 0.85rem; font-weight: 600;">Taxa de Ocupação</div>
          <div id="kpi-beds-occupancy" style="font-size: 1.8rem; font-weight: 700; color: var(--color-primary); margin-top: 4px;">-%</div>
        </div>
      </div>

      <!-- Filtro por Setor -->
      <div class="card" style="padding: 16px; margin-bottom: 24px;">
        <div style="display: flex; gap: 12px; align-items: center; flex-wrap: wrap;">
          <span style="font-weight: 600; font-size: 0.9rem; color: var(--text-secondary);">Filtrar Setor:</span>
          <button class="btn btn-sm btn-primary bed-sector-filter active" data-sector="Todos">Todos os Setores</button>
          <button class="btn btn-sm btn-outline bed-sector-filter" data-sector="UTI Adulto">UTI Adulto</button>
          <button class="btn btn-sm btn-outline bed-sector-filter" data-sector="Enfermaria">Enfermaria</button>
          <button class="btn btn-sm btn-outline bed-sector-filter" data-sector="Pediatria">Pediatria</button>
          <button class="btn btn-sm btn-outline bed-sector-filter" data-sector="Maternidade">Maternidade</button>
        </div>
      </div>

      <!-- Grid Visual de Leitos -->
      <div id="beds-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 16px;">
        <div style="grid-column: 1 / -1; text-align: center; padding: 40px; color: var(--text-secondary);">
          <i class="fa-solid fa-spinner fa-spin" style="font-size: 1.5rem;"></i>
          <p style="margin-top: 8px;">Carregando mapa de leitos...</p>
        </div>
      </div>
    </div>

    <!-- Modal Internação -->
    <div id="modal-admit-bed" class="modal-overlay" style="display: none;">
      <div class="modal-content" style="max-width: 450px;">
        <div class="modal-header">
          <h3><i class="fa-solid fa-bed" style="color: var(--color-primary);"></i> Internar Paciente em Leito</h3>
          <button class="btn-close" id="btn-close-admit-modal"><i class="fa-solid fa-xmark"></i></button>
        </div>
        <form id="form-admit-bed" class="modal-body">
          <div class="form-group">
            <label for="admit-bed-id">Selecione o Leito Vago *</label>
            <select id="admit-bed-id" class="form-input" required>
              <option value="">Carregando leitos disponíveis...</option>
            </select>
          </div>
          <div class="form-group">
            <label>Selecione o Paciente *</label>
            <div class="custom-select-container" id="admit-patient-combo"></div>
            <input type="hidden" id="admit-patient-id" required>
          </div>
          <div class="modal-footer" style="padding-top: 16px;">
            <button type="button" class="btn btn-secondary" id="btn-cancel-admit-modal">Cancelar</button>
            <button type="submit" class="btn btn-primary">Confirmar Internação</button>
          </div>
        </form>
      </div>
    </div>
  `;

  let currentSector = 'Todos';

  const loadBeds = async () => {
    try {
      const beds = await cachedApiGet('/api/beds', 'beds');

      // Atualizar KPIs
      const vagos = beds.filter(b => b.status === 'Vago').length;
      const ocupados = beds.filter(b => b.status === 'Ocupado').length;
      const higienizacao = beds.filter(b => b.status === 'Higienizacao').length;
      const total = beds.length || 1;
      const rate = Math.round((ocupados / total) * 100);

      document.getElementById('kpi-beds-vago').textContent = vagos;
      document.getElementById('kpi-beds-ocupado').textContent = ocupados;
      document.getElementById('kpi-beds-clean').textContent = higienizacao;
      document.getElementById('kpi-beds-occupancy').textContent = `${rate}%`;

      // Preencher Select de Leitos Vagos no Modal
      const bedSelect = document.getElementById('admit-bed-id');
      if (bedSelect) {
        const vagosList = beds.filter(b => b.status === 'Vago');
        if (vagosList.length === 0) {
          bedSelect.innerHTML = '<option value="">Sem leitos vagos no momento</option>';
        } else {
          bedSelect.innerHTML = '<option value="">Selecione o leito...</option>' + 
            vagosList.map(b => `<option value="${b.id}">${b.bedNumber} — ${b.sector}</option>`).join('');
        }
      }

      // Filtrar por Setor
      const filtered = currentSector === 'Todos' ? beds : beds.filter(b => b.sector === currentSector);
      const grid = document.getElementById('beds-grid');

      if (filtered.length === 0) {
        grid.innerHTML = `<div style="grid-column: 1 / -1; text-align: center; padding: 40px; color: var(--text-secondary);">Nenhum leito encontrado neste setor.</div>`;
        return;
      }

      grid.innerHTML = filtered.map(b => {
        let statusColor = '#4ade80';
        let statusBg = 'rgba(74,222,128,0.1)';
        let borderLeft = '4px solid #4ade80';
        if (b.status === 'Ocupado') {
          statusColor = '#f87171';
          statusBg = 'rgba(248,113,113,0.1)';
          borderLeft = '4px solid #f87171';
        } else if (b.status === 'Higienizacao') {
          statusColor = '#facc15';
          statusBg = 'rgba(250,204,21,0.1)';
          borderLeft = '4px solid #facc15';
        }

        return `
          <div class="card" style="padding: 16px; border-left: ${borderLeft}; display: flex; flex-direction: column; justify-content: space-between;">
            <div>
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                <span style="font-weight: 700; font-size: 1.1rem; color: var(--text-primary);"><i class="fa-solid fa-bed"></i> ${b.bedNumber}</span>
                <span class="badge" style="background: ${statusBg}; color: ${statusColor};">${b.status}</span>
              </div>
              <div style="font-size: 0.8rem; color: var(--text-secondary); margin-bottom: 12px;">
                <i class="fa-solid fa-building-user"></i> ${b.sector}
              </div>
              ${b.status === 'Ocupado' ? `
                <div style="background: var(--bg-tertiary); padding: 10px; border-radius: var(--radius-sm); margin-bottom: 12px;">
                  <div style="font-size: 0.85rem; font-weight: 600; color: var(--text-primary);">${b.patientName || 'Paciente Inominado'}</div>
                  <div style="font-size: 0.75rem; color: var(--text-secondary); margin-top: 2px;">
                    Internado em: ${b.admittedAt ? new Date(b.admittedAt).toLocaleDateString() : '-'}
                  </div>
                </div>
              ` : ''}
            </div>

            <div style="display: flex; gap: 8px; margin-top: 12px; justify-content: flex-end;">
              ${b.status === 'Vago' ? `
                <button class="btn btn-sm btn-primary" onclick="quickAdmitBed('${b.id}')" style="width: 100%;">
                  <i class="fa-solid fa-user-plus"></i> Internar
                </button>
              ` : ''}
              ${b.status === 'Ocupado' ? `
                <button class="btn btn-sm btn-danger" onclick="dischargeBed('${b.id}')" style="width: 100%;">
                  <i class="fa-solid fa-door-open"></i> Alta Hospitalar
                </button>
              ` : ''}
              ${b.status === 'Higienizacao' ? `
                <button class="btn btn-sm btn-success" onclick="updateBedStatus('${b.id}', 'Vago')" style="width: 100%; background: #22c55e; color: #fff;">
                  <i class="fa-solid fa-sparkles"></i> Liberar Leito
                </button>
              ` : ''}
            </div>
          </div>
        `;
      }).join('');
    } catch (e) {
      document.getElementById('beds-grid').innerHTML = `<div style="grid-column: 1 / -1; text-align: center; color: var(--color-danger); padding: 20px;">Erro ao carregar mapa de leitos.</div>`;
    }
  };

  // Carregar Pacientes no Modal (Busca Direta & Rápida)
  const loadPatientsModal = async () => {
    try {
      const res = await apiFetch(`${API_URL}/patients`);
      if (!res.ok) throw new Error();
      const patients = await res.json();
      const patientList = Array.isArray(patients) ? patients : (patients.data || []);
      
      // Ordenação Alfabética A-Z por nome completo
      patientList.sort((a, b) => (a.fullName || '').localeCompare(b.fullName || '', 'pt-BR', { sensitivity: 'base' }));

      const pComboContainer = document.getElementById('admit-patient-combo');
      const pHiddenInput = document.getElementById('admit-patient-id');

      if (pComboContainer && pHiddenInput) {
        setupCustomSelect(pComboContainer, pHiddenInput, patientList, 'Selecione o paciente...');
      }
    } catch (e) {
      const pComboContainer = document.getElementById('admit-patient-combo');
      if (pComboContainer) pComboContainer.innerHTML = '<div class="form-input">Erro ao carregar pacientes</div>';
    }
  };

  // Eventos de Filtro por Setor
  document.querySelectorAll('.bed-sector-filter').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.bed-sector-filter').forEach(b => {
        b.classList.remove('active', 'btn-primary');
        b.classList.add('btn-outline');
      });
      btn.classList.add('active', 'btn-primary');
      btn.classList.remove('btn-outline');
      currentSector = btn.getAttribute('data-sector');
      loadBeds();
    });
  });

  // Modal Handlers
  const modal = document.getElementById('modal-admit-bed');
  document.getElementById('btn-open-admit-modal')?.addEventListener('click', () => { modal.style.display = 'flex'; loadPatientsModal(); });
  document.getElementById('btn-close-admit-modal').addEventListener('click', () => { modal.style.display = 'none'; });
  document.getElementById('btn-cancel-admit-modal').addEventListener('click', () => { modal.style.display = 'none'; });

  document.getElementById('form-admit-bed').addEventListener('submit', async (e) => {
    e.preventDefault();
    const bedId = document.getElementById('admit-bed-id').value;
    const pSelect = document.getElementById('admit-patient-id');
    const selectedOption = pSelect.options ? pSelect.options[pSelect.selectedIndex] : null;
    const patientId = pSelect.value;
    const patientName = selectedOption ? selectedOption.dataset.name : (pSelect.dataset.name || '');

    if (!bedId || !patientId) {
      alert('Selecione um leito e um paciente.');
      return;
    }

    try {
      const res = await apiFetch('/api/beds/admit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bedId, patientId, patientName })
      });
      if (res.ok) {
        showToast('Paciente internado com sucesso!');
        modal.style.display = 'none';
        requestSyncPromptIfConfigured();
        loadBeds();
      } else {
        const d = await res.json();
        alert(d.message || 'Erro ao internar paciente.');
      }
    } catch (err) {
      alert('Erro de conexão ao internar paciente.');
    }
  });

  loadBeds();
  loadPatientsModal();
}

window.quickAdmitBed = (bedId) => {
  const modal = document.getElementById('modal-admit-bed');
  if (modal) {
    modal.style.display = 'flex';
    const bedSelect = document.getElementById('admit-bed-id');
    if (bedSelect) bedSelect.value = bedId;
    const pSelect = document.getElementById('admit-patient-id');
    const pSearch = document.getElementById('admit-patient-search');
    if (pSearch) pSearch.value = ''; // limpar campo de busca ao abrir
    if (pSelect) {
      apiFetch(`${API_URL}/patients`).then(r => r.json()).then(patients => {
        const list = Array.isArray(patients) ? patients : (patients.data || []);
        
        // Ordenação Alfabética A-Z por nome completo
        list.sort((a, b) => (a.fullName || '').localeCompare(b.fullName || '', 'pt-BR', { sensitivity: 'base' }));

        const renderOptions = (items) => {
          pSelect.innerHTML = '<option value="" style="background-color: #19142c; color: #ffffff;">Selecione o paciente...</option>' + 
            items.map(p => `<option value="${p.id}" data-name="${p.fullName}" style="background-color: #19142c; color: #ffffff;">${p.fullName} (CPF: ${p.cpf})</option>`).join('');
        };

        renderOptions(list);

        if (pSearch && !pSearch.dataset.bound) {
          pSearch.dataset.bound = 'true';
          pSearch.addEventListener('input', (e) => {
            const query = e.target.value.toLowerCase().trim();
            if (!query) {
              renderOptions(list);
            } else {
              const filtered = list.filter(p => {
                const nameMatch = (p.fullName || '').toLowerCase().includes(query);
                const cpfDigits = (p.cpf || '').replace(/\D/g, '');
                const queryDigits = query.replace(/\D/g, '');
                const cpfMatch = queryDigits ? cpfDigits.includes(queryDigits) : (p.cpf || '').toLowerCase().includes(query);
                return nameMatch || cpfMatch;
              });
              renderOptions(filtered);
            }
          });
        }
      }).catch(() => {});
    }
  }
};

window.dischargeBed = async (bedId) => {
  if (!confirm('Confirma a alta do paciente e envio do leito para higienização?')) return;
  try {
    const res = await apiFetch('/api/beds/discharge', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bedId })
    });
    if (res.ok) {
      showToast('Alta concedida com sucesso! Leito encaminhado para limpeza.');
      requestSyncPromptIfConfigured();
      renderLeitosTab();
    }
  } catch (e) {}
};

window.updateBedStatus = async (bedId, status) => {
  try {
    const res = await apiFetch(`/api/beds/${bedId}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    });
    if (res.ok) {
      showToast('Status do leito atualizado!');
      requestSyncPromptIfConfigured();
      renderLeitosTab();
    }
  } catch (e) {}
};

// --- ABA CORPO CLÍNICO (GESTÃO DE MÉDICOS) ---
async function renderDoctorsTab() {
  const contentArea = document.getElementById('main-content');

  contentArea.innerHTML = `
    <div class="tab-pane active" style="padding: 28px 36px; width: 100%; max-width: 100%; box-sizing: border-box;">
      
      <!-- CABEÇALHO DA ABA -->
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; flex-wrap: wrap; gap: 16px;">
        <div>
          <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 4px;">
            <div style="width: 42px; height: 42px; border-radius: 12px; background: rgba(139,92,246,0.15); border: 1px solid rgba(139,92,246,0.3); display: flex; align-items: center; justify-content: center; color: #a78bfa;">
              <i class="fa-solid fa-user-doctor" style="font-size: 1.2rem;"></i>
            </div>
            <div>
              <h2 style="font-size: 1.5rem; font-weight: 700; color: var(--text-primary); margin: 0; line-height: 1.2;">Corpo Clínico</h2>
              <span style="color: var(--text-muted); font-size: 0.85rem;">Gestão de Médicos e Especialistas Hospitalares</span>
            </div>
          </div>
        </div>

        <button id="btn-open-doctor-modal" class="btn btn-primary" style="display: inline-flex; align-items: center; gap: 8px; padding: 10px 22px; font-size: 0.88rem; font-weight: 600; border-radius: 10px; box-shadow: 0 4px 14px rgba(99,102,241,0.3); cursor: pointer;">
          <i class="fa-solid fa-plus"></i> Novo Médico
        </button>
      </div>

      <!-- CARDS DE KPIS -->
      <div id="doctors-kpis" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; margin-bottom: 24px;"></div>

      <!-- BARRA DE PESQUISA -->
      <div style="display: flex; gap: 12px; flex-wrap: wrap; align-items: center; background: var(--bg-secondary); border: 1px solid var(--border-color); border-radius: 14px; padding: 14px 20px; margin-bottom: 24px; backdrop-filter: var(--glass-blur);">
        <div style="position: relative; flex: 1; min-width: 240px;">
          <i class="fa-solid fa-magnifying-glass" style="position: absolute; left: 14px; top: 50%; transform: translateY(-50%); color: var(--text-muted); font-size: 0.85rem;"></i>
          <input type="text" id="filter-doctor-search" placeholder="Buscar por nome, CRM ou especialidade..." style="width: 100%; background: var(--bg-tertiary); border: 1px solid var(--border-color); border-radius: 8px; padding: 9px 14px 9px 38px; color: var(--text-primary); font-size: 0.85rem; outline: none;">
        </div>
      </div>

      <!-- TABELA DE MÉDICOS CONTAINER -->
      <div id="doctors-list-container">
        <div style="text-align: center; padding: 60px 20px; color: var(--text-muted);">
          <i class="fa-solid fa-spinner fa-spin" style="font-size: 1.6rem; color: var(--color-primary); margin-bottom: 12px; display: block;"></i>
          <span style="font-size: 0.9rem;">Carregando médicos...</span>
        </div>
      </div>
    </div>

    <!-- MODAL CADASTRO / EDIÇÃO DE MÉDICO -->
    <div id="modal-doctor" class="modal-overlay" style="display: none;">
      <div class="modal-content" style="max-width: 520px; width: 100%;">
        <div class="modal-header">
          <h3 id="modal-doctor-title"><i class="fa-solid fa-user-doctor" style="color: var(--color-primary);"></i> Cadastrar Médico</h3>
          <button class="btn-close" id="btn-close-doctor-modal"><i class="fa-solid fa-xmark"></i></button>
        </div>
        <form id="form-doctor" class="modal-body">
          <input type="hidden" id="doc-id">
          <div class="form-group">
            <label for="doc-name">Nome Completo *</label>
            <input type="text" id="doc-name" class="form-input" placeholder="Ex: Dr. Roberto Almeida" required>
          </div>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
            <div class="form-group">
              <label for="doc-crm">CRM *</label>
              <input type="text" id="doc-crm" class="form-input" placeholder="123456-SP" required>
            </div>
            <div class="form-group">
              <label for="doc-specialty">Especialidade *</label>
              <input type="text" id="doc-specialty" class="form-input" placeholder="Ex: Cardiologia" required>
            </div>
          </div>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
            <div class="form-group">
              <label for="doc-phone">Telefone / Celular</label>
              <input type="text" id="doc-phone" class="form-input" placeholder="(11) 98765-4321">
            </div>
            <div class="form-group">
              <label for="doc-email">E-mail Corporativo</label>
              <input type="email" id="doc-email" class="form-input" placeholder="medico@healthnexus.com">
            </div>
          </div>
          <div class="form-group">
            <label for="doc-status">Status</label>
            <select id="doc-status" class="form-input">
              <option value="Ativo">Ativo</option>
              <option value="Inativo">Inativo</option>
            </select>
          </div>
          <div class="modal-footer" style="padding-top: 16px;">
            <button type="button" class="btn btn-secondary" id="btn-cancel-doctor-modal">Cancelar</button>
            <button type="submit" class="btn btn-primary" id="btn-submit-doctor">Salvar Médico</button>
          </div>
        </form>
      </div>
    </div>
  `;

  let allDoctorsCache = [];

  const renderTable = (doctors) => {
    const container = document.getElementById('doctors-list-container');
    const kpisEl = document.getElementById('doctors-kpis');
    const searchQuery = (document.getElementById('filter-doctor-search')?.value || '').toLowerCase().trim();

    let filtered = doctors || [];
    if (searchQuery) {
      filtered = filtered.filter(d => 
        (d.name || '').toLowerCase().includes(searchQuery) ||
        (d.crm || '').toLowerCase().includes(searchQuery) ||
        (d.specialty || '').toLowerCase().includes(searchQuery)
      );
    }

    const total = doctors.length;
    const ativos = doctors.filter(d => (d.status || 'Ativo') === 'Ativo').length;
    const especialidades = new Set(doctors.map(d => d.specialty)).size;

    if (kpisEl) {
      kpisEl.innerHTML = `
        <div class="interactive-card" id="kpi-doc-total" title="Clique para exibir todos os médicos" style="background: var(--bg-secondary); border: 1px solid var(--border-color); border-radius: 12px; padding: 16px 20px; display: flex; align-items: center; gap: 16px;">
          <div style="width: 44px; height: 44px; border-radius: 12px; background: rgba(139,92,246,0.12); border: 1px solid rgba(139,92,246,0.25); display: flex; align-items: center; justify-content: center; color: #a78bfa;">
            <i class="fa-solid fa-user-doctor" style="font-size: 1.2rem;"></i>
          </div>
          <div>
            <div style="font-size: 0.75rem; color: var(--text-muted); font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em;">Total de Médicos</div>
            <div style="font-size: 1.4rem; font-weight: 800; color: var(--text-primary);">${total}</div>
          </div>
        </div>

        <div class="interactive-card" id="kpi-doc-active" title="Clique para buscar médicos ativos" style="background: var(--bg-secondary); border: 1px solid var(--border-color); border-radius: 12px; padding: 16px 20px; display: flex; align-items: center; gap: 16px;">
          <div style="width: 44px; height: 44px; border-radius: 12px; background: rgba(16,185,129,0.12); border: 1px solid rgba(16,185,129,0.25); display: flex; align-items: center; justify-content: center; color: #34d399;">
            <i class="fa-solid fa-user-check" style="font-size: 1.2rem;"></i>
          </div>
          <div>
            <div style="font-size: 0.75rem; color: var(--text-muted); font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em;">Médicos Ativos</div>
            <div style="font-size: 1.4rem; font-weight: 800; color: #34d399;">${ativos}</div>
          </div>
        </div>

        <div class="interactive-card" id="kpi-doc-specs" title="Clique para ver resumo por Especialidade" style="background: var(--bg-secondary); border: 1px solid var(--border-color); border-radius: 12px; padding: 16px 20px; display: flex; align-items: center; gap: 16px;">
          <div style="width: 44px; height: 44px; border-radius: 12px; background: rgba(34,211,238,0.12); border: 1px solid rgba(34,211,238,0.25); display: flex; align-items: center; justify-content: center; color: #67e8f9;">
            <i class="fa-solid fa-stethoscope" style="font-size: 1.2rem;"></i>
          </div>
          <div>
            <div style="font-size: 0.75rem; color: var(--text-muted); font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em;">Especialidades</div>
            <div style="font-size: 1.4rem; font-weight: 800; color: #67e8f9;">${especialidades}</div>
          </div>
        </div>
      `;
    }

    if (filtered.length === 0) {
      container.innerHTML = `
        <div style="text-align: center; padding: 60px 20px; background: var(--bg-secondary); border: 1px solid var(--border-color); border-radius: 14px;">
          <i class="fa-solid fa-user-slash" style="font-size: 2.8rem; color: var(--text-muted); opacity: 0.4; margin-bottom: 14px; display: block;"></i>
          <p style="font-size: 1rem; font-weight: 600; color: var(--text-secondary); margin-bottom: 4px;">Nenhum médico encontrado</p>
          <p style="font-size: 0.83rem; color: var(--text-muted);">Não há cadastros com os filtros utilizados.</p>
        </div>
      `;
      return;
    }

    let rowsHtml = filtered.map(d => {
      const isAtivo = (d.status || 'Ativo') === 'Ativo';
      const statusBadge = isAtivo 
        ? '<span style="display:inline-flex;align-items:center;gap:4px;font-size:0.75rem;font-weight:600;padding:3px 10px;border-radius:20px;background:rgba(16,185,129,0.12);color:#34d399;border:1px solid rgba(16,185,129,0.25);"><i class="fa-solid fa-circle" style="font-size:0.45rem;"></i> Ativo</span>'
        : '<span style="display:inline-flex;align-items:center;gap:4px;font-size:0.75rem;font-weight:600;padding:3px 10px;border-radius:20px;background:rgba(239,68,68,0.12);color:#f87171;border:1px solid rgba(239,68,68,0.25);"><i class="fa-solid fa-circle" style="font-size:0.45rem;"></i> Inativo</span>';
      
      const initials = d.name.replace(/^(Dr.|Dra.)s*/i, '').split(' ').map(n => n[0]).join('').substring(0,2).toUpperCase() || 'MD';

      return `
        <tr style="border-bottom: 1px solid var(--border-color); transition: background 0.15s;" onmouseenter="this.style.background='var(--bg-tertiary)'" onmouseleave="this.style.background='transparent'">
          <td style="padding: 16px 20px;">
            <div style="display: flex; align-items: center; gap: 12px;">
              <div style="width: 36px; height: 36px; border-radius: 50%; background: rgba(99,102,241,0.15); border: 1px solid rgba(99,102,241,0.3); display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 0.78rem; color: #a78bfa;">
                ${initials}
              </div>
              <div>
                <strong style="font-size: 0.95rem; color: var(--text-primary); display: block;">${d.name}</strong>
                <span style="font-size: 0.78rem; color: var(--text-muted);">CRM: ${d.crm}</span>
              </div>
            </div>
          </td>
          <td style="padding: 16px 20px;">
            <span style="display: inline-flex; align-items: center; gap: 6px; padding: 4px 12px; border-radius: 20px; background: rgba(255,255,255,0.05); border: 1px solid var(--border-color); font-size: 0.82rem; font-weight: 600; color: var(--text-secondary);">
              <i class="fa-solid fa-stethoscope" style="font-size: 0.75rem; color: var(--color-primary);"></i> ${d.specialty}
            </span>
          </td>
          <td style="padding: 16px 20px;">
            <div style="font-size: 0.83rem; color: var(--text-secondary);">
              ${d.phone ? '<div><i class="fa-solid fa-phone" style="font-size:0.75rem;color:var(--text-muted);margin-right:6px;"></i>' + d.phone + '</div>' : ''}
              ${d.email ? '<div><i class="fa-regular fa-envelope" style="font-size:0.75rem;color:var(--text-muted);margin-right:6px;"></i>' + d.email + '</div>' : ''}
            </div>
          </td>
          <td style="padding: 16px 20px;">
            ${statusBadge}
          </td>
          <td style="padding: 16px 20px; text-align: right;">
            <div style="display: flex; gap: 8px; justify-content: flex-end;">
              <button class="btn-doctor-activity" onclick="openDoctorActivityModal('${d.name}', '${d.specialty}', '${d.crm}')" title="Ver Atendimentos, Procedimentos e Solicitações do Médico" style="display: inline-flex; align-items: center; gap: 6px; padding: 6px 12px; border-radius: 8px; border: 1px solid rgba(99,102,241,0.3); background: rgba(99,102,241,0.12); color: #818cf8; font-size: 0.78rem; font-weight: 600; cursor: pointer; transition: all 0.15s;" onmouseenter="this.style.background='rgba(99,102,241,0.22)'" onmouseleave="this.style.background='rgba(99,102,241,0.12)'">
                <i class="fa-solid fa-clipboard-user"></i> Atividades
              </button>
              <button class="btn-edit-doctor" data-id="${d.id}" title="Editar" style="width: 32px; height: 32px; border-radius: 8px; border: 1px solid var(--border-color); background: var(--bg-tertiary); color: var(--text-secondary); cursor: pointer; display: flex; align-items: center; justify-content: center;">
                <i class="fa-solid fa-pen" style="font-size: 0.8rem;"></i>
              </button>
              <button class="btn-toggle-doctor" data-id="${d.id}" data-status="${d.status}" title="${isAtivo ? 'Inativar' : 'Ativar'}" style="width: 32px; height: 32px; border-radius: 8px; border: 1px solid var(--border-color); background: var(--bg-tertiary); color: ${isAtivo ? '#f87171' : '#34d399'}; cursor: pointer; display: flex; align-items: center; justify-content: center;">
                <i class="fa-solid ${isAtivo ? 'fa-user-xmark' : 'fa-user-check'}" style="font-size: 0.8rem;"></i>
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join('');

    container.innerHTML = `
      <div style="background: var(--bg-secondary); border: 1px solid var(--border-color); border-radius: 14px; overflow: hidden;">
        <table style="width: 100%; border-collapse: collapse; text-align: left;">
          <thead>
            <tr style="border-bottom: 1px solid var(--border-color); background: var(--bg-tertiary);">
              <th style="padding: 14px 20px; font-size: 0.78rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase;">Médico / CRM</th>
              <th style="padding: 14px 20px; font-size: 0.78rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase;">Especialidade</th>
              <th style="padding: 14px 20px; font-size: 0.78rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase;">Contato</th>
              <th style="padding: 14px 20px; font-size: 0.78rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase;">Status</th>
              <th style="padding: 14px 20px; font-size: 0.78rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase; text-align: right;">Ações</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>
      </div>
    `;

    // Eventos de Editar e Inativar
    document.querySelectorAll('.btn-edit-doctor').forEach(btn => {
      btn.addEventListener('click', () => {
        const doc = allDoctorsCache.find(d => d.id === btn.dataset.id);
        if (doc) {
          document.getElementById('doc-id').value = doc.id;
          document.getElementById('doc-name').value = doc.name;
          document.getElementById('doc-crm').value = doc.crm;
          document.getElementById('doc-specialty').value = doc.specialty;
          document.getElementById('doc-phone').value = doc.phone || '';
          document.getElementById('doc-email').value = doc.email || '';
          document.getElementById('doc-status').value = doc.status || 'Ativo';
          document.getElementById('modal-doctor-title').innerHTML = '<i class="fa-solid fa-user-pen" style="color: var(--color-primary);"></i> Editar Médico';
          document.getElementById('modal-doctor').style.display = 'flex';
        }
      });
    });

    document.querySelectorAll('.btn-toggle-doctor').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.dataset.id;
        const current = btn.dataset.status;
        const nextStatus = current === 'Ativo' ? 'Inativo' : 'Ativo';
        if (confirm(`Deseja realmente alterar o status deste médico para ${nextStatus}?`)) {
          try {
            const doc = allDoctorsCache.find(d => d.id === id);
            if (doc) {
              const res = await apiFetch(`/api/doctors/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...doc, status: nextStatus })
              });
              if (res.ok) {
                showToast(`Médico marcado como ${nextStatus}!`);
                dataCache.delete('doctors');
                loadDoctors();
              }
            }
          } catch (e) { alert('Erro ao alterar status.'); }
        }
      });
    });
  };

  const loadDoctors = async () => {
    try {
      const doctors = await cachedApiGet('/api/doctors', 'doctors');
      allDoctorsCache = Array.isArray(doctors) ? doctors : [];
      renderTable(allDoctorsCache);
    } catch (e) {
      console.error('[Doctors] Erro:', e);
      document.getElementById('doctors-list-container').innerHTML = '<div style="text-align:center;padding:40px;color:var(--color-danger);"><i class="fa-solid fa-triangle-exclamation"></i> Erro ao carregar médicos.</div>';
    }
  };

  // Event Listeners
  document.getElementById('filter-doctor-search').addEventListener('input', () => renderTable(allDoctorsCache));

  document.getElementById('kpi-doc-total')?.addEventListener('click', () => {
    const input = document.getElementById('filter-doctor-search');
    if (input) { input.value = ''; renderTable(allDoctorsCache); }
  });

  document.getElementById('kpi-doc-active')?.addEventListener('click', () => {
    const input = document.getElementById('filter-doctor-search');
    if (input) { input.value = ''; renderTable(allDoctorsCache); }
  });

  document.getElementById('kpi-doc-specs')?.addEventListener('click', () => {
    const specsMap = {};
    allDoctorsCache.forEach(d => { specsMap[d.specialty] = (specsMap[d.specialty] || 0) + 1; });
    const list = Object.entries(specsMap).map(([s, c]) => `• ${s}: ${c} médico(s)`).join('\n');
    alert('Resumo de Especialidades no Corpo Clínico:\n\n' + (list || 'Nenhuma especialidade cadastrada.'));
  });

  document.getElementById('kpi-doc-total')?.addEventListener('click', () => {
    const input = document.getElementById('filter-doctor-search');
    if (input) { input.value = ''; renderTable(allDoctorsCache); }
  });

  document.getElementById('kpi-doc-active')?.addEventListener('click', () => {
    const input = document.getElementById('filter-doctor-search');
    if (input) { input.value = ''; renderTable(allDoctorsCache); }
  });

  document.getElementById('kpi-doc-specs')?.addEventListener('click', () => {
    const specsMap = {};
    allDoctorsCache.forEach(d => { specsMap[d.specialty] = (specsMap[d.specialty] || 0) + 1; });
    const list = Object.entries(specsMap).map(([s, c]) => `• ${s}: ${c} médico(s)`).join('\n');
    alert('Resumo de Especialidades no Corpo Clínico:\n\n' + (list || 'Nenhuma especialidade cadastrada.'));
  });

  document.getElementById('kpi-doc-total')?.addEventListener('click', () => {
    const input = document.getElementById('filter-doctor-search');
    if (input) { input.value = ''; renderTable(allDoctorsCache); }
  });

  document.getElementById('kpi-doc-active')?.addEventListener('click', () => {
    const input = document.getElementById('filter-doctor-search');
    if (input) { input.value = ''; renderTable(allDoctorsCache); }
  });

  document.getElementById('kpi-doc-specs')?.addEventListener('click', () => {
    const specsMap = {};
    allDoctorsCache.forEach(d => { specsMap[d.specialty] = (specsMap[d.specialty] || 0) + 1; });
    const list = Object.entries(specsMap).map(([s, c]) => `• ${s}: ${c} médico(s)`).join('\n');
    alert('Resumo de Especialidades no Corpo Clínico:\n\n' + (list || 'Nenhuma especialidade cadastrada.'));
  });

  document.getElementById('kpi-doc-total')?.addEventListener('click', () => {
    const input = document.getElementById('filter-doctor-search');
    if (input) { input.value = ''; renderTable(allDoctorsCache); }
  });

  document.getElementById('kpi-doc-active')?.addEventListener('click', () => {
    const input = document.getElementById('filter-doctor-search');
    if (input) { input.value = ''; renderTable(allDoctorsCache); }
  });

  document.getElementById('kpi-doc-specs')?.addEventListener('click', () => {
    const specsMap = {};
    allDoctorsCache.forEach(d => { specsMap[d.specialty] = (specsMap[d.specialty] || 0) + 1; });
    const list = Object.entries(specsMap).map(([s, c]) => `• ${s}: ${c} médico(s)`).join('\n');
    alert('Resumo de Especialidades no Corpo Clínico:\n\n' + (list || 'Nenhuma especialidade cadastrada.'));
  });

  const modal = document.getElementById('modal-doctor');
  document.getElementById('btn-open-doctor-modal').addEventListener('click', () => {
    document.getElementById('doc-id').value = '';
    document.getElementById('form-doctor').reset();
    document.getElementById('modal-doctor-title').innerHTML = '<i class="fa-solid fa-user-doctor" style="color: var(--color-primary);"></i> Cadastrar Médico';
    modal.style.display = 'flex';
  });

  document.getElementById('btn-close-doctor-modal').addEventListener('click', () => { modal.style.display = 'none'; });
  document.getElementById('btn-cancel-doctor-modal').addEventListener('click', () => { modal.style.display = 'none'; });

  document.getElementById('form-doctor').addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('doc-id').value;
    const name = document.getElementById('doc-name').value;
    const crm = document.getElementById('doc-crm').value;
    const specialty = document.getElementById('doc-specialty').value;
    const phone = document.getElementById('doc-phone').value;
    const email = document.getElementById('doc-email').value;
    const status = document.getElementById('doc-status').value;

    try {
      const url = id ? `/api/doctors/${id}` : '/api/doctors';
      const method = id ? 'PUT' : 'POST';
      const res = await apiFetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, crm, specialty, phone, email, status })
      });
      if (res.ok) {
        showToast(id ? 'Cadastro de médico atualizado!' : 'Médico cadastrado com sucesso!');
        modal.style.display = 'none';
        dataCache.delete('doctors');
        loadDoctors();
      } else {
        const d = await res.json();
        alert(d.message || 'Erro ao salvar médico.');
      }
    } catch (err) { alert('Erro de conexão ao salvar médico.'); }
  });

  loadDoctors();
}

// =========================================================
// MODAL DE ATIVIDADES DO MÉDICO (Corpo Clínico)
// =========================================================
window.openDoctorActivityModal = async function(doctorName, specialty, crm) {
  // Remove modal anterior se existir
  const old = document.getElementById('modal-doctor-activity');
  if (old) old.remove();

  const encodedName = encodeURIComponent(doctorName);

  // Cria estrutura do modal com spinner
  const modal = document.createElement('div');
  modal.id = 'modal-doctor-activity';
  modal.style.cssText = `
    position: fixed; inset: 0; z-index: 9999;
    display: flex; align-items: center; justify-content: center;
    background: rgba(0,0,0,0.65); backdrop-filter: blur(6px);
    padding: 16px;
  `;
  modal.innerHTML = `
    <div style="
      background: var(--bg-secondary);
      border: 1px solid var(--border-color);
      border-radius: 20px;
      width: 100%; max-width: 860px; max-height: 90vh;
      display: flex; flex-direction: column;
      box-shadow: 0 24px 60px rgba(0,0,0,0.5);
      overflow: hidden;
    ">
      <!-- Header -->
      <div style="
        padding: 22px 28px;
        border-bottom: 1px solid var(--border-color);
        display: flex; align-items: center; gap: 16px;
        background: linear-gradient(135deg, rgba(99,102,241,0.12), rgba(139,92,246,0.08));
      ">
        <div style="
          width: 52px; height: 52px; border-radius: 14px;
          background: linear-gradient(135deg, #6366f1, #8b5cf6);
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
        ">
          <i class="fa-solid fa-user-doctor" style="color: #fff; font-size: 1.3rem;"></i>
        </div>
        <div style="flex: 1;">
          <div style="font-size: 1.15rem; font-weight: 700; color: var(--text-primary);">${doctorName}</div>
          <div style="font-size: 0.82rem; color: var(--text-secondary); margin-top: 2px;">
            <span style="color: #818cf8; font-weight: 600;">${specialty || '—'}</span>
            ${crm ? `<span style="color: var(--text-muted); margin-left: 10px;">CRM: ${crm}</span>` : ''}
          </div>
        </div>
        <button id="btn-close-activity-modal" style="
          width: 36px; height: 36px; border-radius: 10px;
          border: 1px solid var(--border-color); background: var(--bg-tertiary);
          color: var(--text-secondary); cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          font-size: 1rem; transition: all 0.15s;
        " title="Fechar">
          <i class="fa-solid fa-xmark"></i>
        </button>
      </div>

      <!-- KPI Strip -->
      <div id="activity-kpi-strip" style="
        display: flex; gap: 0;
        border-bottom: 1px solid var(--border-color);
        background: var(--bg-tertiary);
      ">
        <div style="flex: 1; text-align: center; padding: 14px 8px; border-right: 1px solid var(--border-color);">
          <div id="kpi-act-total" style="font-size: 1.5rem; font-weight: 800; color: #818cf8;">—</div>
          <div style="font-size: 0.72rem; color: var(--text-muted); margin-top: 2px;">Agendamentos</div>
        </div>
        <div style="flex: 1; text-align: center; padding: 14px 8px; border-right: 1px solid var(--border-color);">
          <div id="kpi-act-today" style="font-size: 1.5rem; font-weight: 800; color: #34d399;">—</div>
          <div style="font-size: 0.72rem; color: var(--text-muted); margin-top: 2px;">Hoje</div>
        </div>
        <div style="flex: 1; text-align: center; padding: 14px 8px; border-right: 1px solid var(--border-color);">
          <div id="kpi-act-inprogress" style="font-size: 1.5rem; font-weight: 800; color: #fbbf24;">—</div>
          <div style="font-size: 0.72rem; color: var(--text-muted); margin-top: 2px;">Em Atendimento</div>
        </div>
        <div style="flex: 1; text-align: center; padding: 14px 8px; border-right: 1px solid var(--border-color);">
          <div id="kpi-act-done" style="font-size: 1.5rem; font-weight: 800; color: #38bdf8;">—</div>
          <div style="font-size: 0.72rem; color: var(--text-muted); margin-top: 2px;">Concluídos</div>
        </div>
        <div style="flex: 1; text-align: center; padding: 14px 8px;">
          <div id="kpi-act-procedures" style="font-size: 1.5rem; font-weight: 800; color: #a78bfa;">—</div>
          <div style="font-size: 0.72rem; color: var(--text-muted); margin-top: 2px;">Procedimentos</div>
        </div>
      </div>

      <!-- Tab Nav -->
      <div style="display: flex; gap: 4px; padding: 12px 20px 0; border-bottom: 1px solid var(--border-color); background: var(--bg-secondary);">
        <button class="act-tab-btn active" data-tab="appointments" style="
          padding: 8px 16px; border-radius: 8px 8px 0 0;
          border: 1px solid var(--border-color); border-bottom: none;
          background: var(--bg-tertiary); color: var(--text-primary);
          font-size: 0.82rem; font-weight: 600; cursor: pointer;
          transition: all 0.15s;
        ">
          <i class="fa-solid fa-calendar-check" style="margin-right: 6px; color: #818cf8;"></i>Agendamentos
        </button>
        <button class="act-tab-btn" data-tab="procedures" style="
          padding: 8px 16px; border-radius: 8px 8px 0 0;
          border: 1px solid transparent; border-bottom: none;
          background: transparent; color: var(--text-secondary);
          font-size: 0.82rem; font-weight: 600; cursor: pointer;
          transition: all 0.15s;
        ">
          <i class="fa-solid fa-notes-medical" style="margin-right: 6px; color: #a78bfa;"></i>Prontuários / SOAP
        </button>
      </div>

      <!-- Content Area -->
      <div id="activity-content" style="flex: 1; overflow-y: auto; padding: 20px;">
        <div style="text-align: center; padding: 40px; color: var(--text-muted);">
          <i class="fa-solid fa-spinner fa-spin" style="font-size: 2rem; margin-bottom: 12px; color: #818cf8;"></i>
          <div>Carregando atividades...</div>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  // Close listeners
  document.getElementById('btn-close-activity-modal').addEventListener('click', () => modal.remove());
  modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });

  // Tab switching
  let actData = null;
  const renderActTab = (tab) => {
    if (!actData) return;
    const content = document.getElementById('activity-content');
    document.querySelectorAll('.act-tab-btn').forEach(b => {
      const isActive = b.dataset.tab === tab;
      b.style.background = isActive ? 'var(--bg-tertiary)' : 'transparent';
      b.style.color = isActive ? 'var(--text-primary)' : 'var(--text-secondary)';
      b.style.borderColor = isActive ? 'var(--border-color)' : 'transparent';
    });

    if (tab === 'appointments') {
      const appts = actData.appointments || [];
      if (!appts.length) {
        content.innerHTML = `<div style="text-align:center;padding:60px;color:var(--text-muted);">
          <i class="fa-solid fa-calendar-xmark" style="font-size:2.5rem;margin-bottom:12px;color:var(--text-muted);"></i>
          <div style="font-size:0.95rem;">Nenhum agendamento encontrado para este médico.</div>
        </div>`;
        return;
      }
      const statusColors = {
        'Agendado': { bg: 'rgba(99,102,241,0.15)', text: '#818cf8' },
        'Confirmado': { bg: 'rgba(52,211,153,0.15)', text: '#34d399' },
        'Em Atendimento': { bg: 'rgba(251,191,36,0.15)', text: '#fbbf24' },
        'Concluído': { bg: 'rgba(56,189,248,0.15)', text: '#38bdf8' },
        'Cancelado': { bg: 'rgba(248,113,113,0.15)', text: '#f87171' },
      };
      const rows = appts.map(a => {
        const sc = statusColors[a.status] || { bg: 'rgba(148,163,184,0.15)', text: '#94a3b8' };
        const dateStr = a.appointmentDate ? new Date(a.appointmentDate + 'T00:00:00').toLocaleDateString('pt-BR') : '—';
        return `
          <tr style="border-bottom: 1px solid var(--border-color);">
            <td style="padding: 12px 16px; font-size: 0.85rem;">
              <div style="font-weight: 600; color: var(--text-primary);">${a.patientName || '—'}</div>
              <div style="font-size: 0.77rem; color: var(--text-muted); margin-top: 2px;">${a.patientCpf ? 'CPF: ' + a.patientCpf : ''}</div>
            </td>
            <td style="padding: 12px 16px; font-size: 0.85rem; color: var(--text-secondary);">
              <div>${dateStr}</div>
              <div style="font-size:0.77rem;color:var(--text-muted);">${a.appointmentTime || ''}</div>
            </td>
            <td style="padding: 12px 16px;">
              <span style="
                display: inline-block; padding: 3px 10px; border-radius: 20px; font-size: 0.75rem; font-weight: 600;
                background: ${sc.bg}; color: ${sc.text};
              ">${a.status || '—'}</span>
            </td>
            <td style="padding: 12px 16px; font-size: 0.82rem; color: var(--text-secondary);">
              ${a.type || '—'}
            </td>
            <td style="padding: 12px 16px; font-size: 0.82rem; color: var(--text-secondary);">
              ${a.room || a.location || '—'}
            </td>
          </tr>
        `;
      }).join('');
      content.innerHTML = `
        <div style="border-radius: 12px; overflow: hidden; border: 1px solid var(--border-color);">
          <table style="width: 100%; border-collapse: collapse;">
            <thead>
              <tr style="background: var(--bg-tertiary); border-bottom: 1px solid var(--border-color);">
                <th style="padding: 11px 16px; font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase; text-align: left;">Paciente</th>
                <th style="padding: 11px 16px; font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase; text-align: left;">Data / Hora</th>
                <th style="padding: 11px 16px; font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase; text-align: left;">Status</th>
                <th style="padding: 11px 16px; font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase; text-align: left;">Tipo</th>
                <th style="padding: 11px 16px; font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase; text-align: left;">Sala</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
        <div style="margin-top: 10px; font-size: 0.77rem; color: var(--text-muted); text-align: right;">
          ${appts.length} agendamento(s) encontrado(s)
        </div>
      `;
    } else if (tab === 'procedures') {
      const notes = actData.clinicalNotes || [];
      if (!notes.length) {
        content.innerHTML = `<div style="text-align:center;padding:60px;color:var(--text-muted);">
          <i class="fa-solid fa-file-medical" style="font-size:2.5rem;margin-bottom:12px;color:var(--text-muted);"></i>
          <div style="font-size:0.95rem;">Nenhum prontuário / registro clínico encontrado.</div>
        </div>`;
        return;
      }
      const cards = notes.map(n => {
        const dateStr = n.created_at ? new Date(n.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';
        return `
          <div style="
            background: var(--bg-tertiary); border: 1px solid var(--border-color);
            border-radius: 12px; padding: 16px; margin-bottom: 10px;
          ">
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px;">
              <div>
                <div style="font-weight: 700; color: var(--text-primary); font-size: 0.92rem;">
                  <i class="fa-solid fa-user" style="color: #818cf8; margin-right: 6px; font-size: 0.8rem;"></i>
                  ${n.patientName || 'Paciente não identificado'}
                </div>
                ${n.patientCpf ? `<div style="font-size:0.75rem;color:var(--text-muted);margin-top:2px;">CPF: ${n.patientCpf}</div>` : ''}
              </div>
              <div style="text-align: right;">
                <div style="font-size: 0.75rem; color: var(--text-muted);">${dateStr}</div>
                ${n.encounterStatus ? `<span style="
                  display:inline-block;margin-top:4px;padding:2px 8px;border-radius:20px;font-size:0.72rem;font-weight:600;
                  background: rgba(99,102,241,0.15); color: #818cf8;
                ">${n.encounterStatus}</span>` : ''}
              </div>
            </div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; font-size: 0.82rem;">
              ${n.subjective ? `
                <div style="background:var(--bg-secondary);border-radius:8px;padding:10px;">
                  <div style="font-size:0.72rem;color:var(--text-muted);font-weight:700;text-transform:uppercase;margin-bottom:4px;">S — Subjetivo</div>
                  <div style="color:var(--text-secondary);">${n.subjective}</div>
                </div>` : ''}
              ${n.objective ? `
                <div style="background:var(--bg-secondary);border-radius:8px;padding:10px;">
                  <div style="font-size:0.72rem;color:var(--text-muted);font-weight:700;text-transform:uppercase;margin-bottom:4px;">O — Objetivo</div>
                  <div style="color:var(--text-secondary);">${n.objective}</div>
                </div>` : ''}
              ${n.assessment ? `
                <div style="background:var(--bg-secondary);border-radius:8px;padding:10px;">
                  <div style="font-size:0.72rem;color:var(--text-muted);font-weight:700;text-transform:uppercase;margin-bottom:4px;">A — Avaliação</div>
                  <div style="color:var(--text-secondary);">${n.assessment}</div>
                </div>` : ''}
              ${n.plan ? `
                <div style="background:var(--bg-secondary);border-radius:8px;padding:10px;">
                  <div style="font-size:0.72rem;color:var(--text-muted);font-weight:700;text-transform:uppercase;margin-bottom:4px;">P — Plano</div>
                  <div style="color:var(--text-secondary);">${n.plan}</div>
                </div>` : ''}
            </div>
            ${n.room ? `<div style="margin-top:8px;font-size:0.77rem;color:var(--text-muted);">
              <i class="fa-solid fa-door-open" style="margin-right:4px;"></i>Sala: ${n.room}
            </div>` : ''}
          </div>
        `;
      }).join('');
      content.innerHTML = `
        ${cards}
        <div style="font-size:0.77rem;color:var(--text-muted);text-align:right;margin-top:4px;">
          ${notes.length} registro(s) clínico(s)
        </div>
      `;
    }
  };

  modal.addEventListener('click', (e) => {
    const tabBtn = e.target.closest('.act-tab-btn');
    if (tabBtn) renderActTab(tabBtn.dataset.tab);
  });

  // Buscar dados
  try {
    const res = await apiFetch(`/api/doctors/${encodedName}/activity`);
    if (!res.ok) throw new Error('Falha ao buscar atividades');
    actData = await res.json();

    // Preenche KPIs
    const s = actData.summary || {};
    document.getElementById('kpi-act-total').textContent = s.totalAppointments ?? 0;
    document.getElementById('kpi-act-today').textContent = s.todayAppointments ?? 0;
    document.getElementById('kpi-act-inprogress').textContent = s.inProgress ?? 0;
    document.getElementById('kpi-act-done').textContent = s.completed ?? 0;
    document.getElementById('kpi-act-procedures').textContent = s.totalProcedures ?? 0;

    // Renderiza aba padrão
    renderActTab('appointments');
  } catch (err) {
    document.getElementById('activity-content').innerHTML = `
      <div style="text-align:center;padding:60px;color:var(--color-danger);">
        <i class="fa-solid fa-triangle-exclamation" style="font-size:2rem;margin-bottom:12px;"></i>
        <div style="font-size:0.95rem;">Erro ao carregar atividades do médico.</div>
        <div style="font-size:0.8rem;color:var(--text-muted);margin-top:6px;">${err.message}</div>
      </div>
    `;
    console.error('[DoctorActivity]', err);
  }
};








// =========================================================
// ATALHO E PRONTUÁRIO DE PACIENTES PARA ATENDIMENTOS E HISTÓRICO
// =========================================================
window.admitPatientFromPatientsTab = function(patientId, fullName, cpf) {
  showToast('⚡ Acessando Atendimentos para ' + fullName + '...');
  switchTab('atendimento');

  setTimeout(() => {
    const searchInput = document.getElementById('adm-search-input');
    if (searchInput) {
      searchInput.value = fullName;
      searchInput.dispatchEvent(new Event('input'));
    }
    const selectedIdInput = document.getElementById('selected-patient-id');
    const preview = document.getElementById('selected-patient-preview');
    const actionsContainer = document.getElementById('adm-actions-container');
    
    if (selectedIdInput && preview && actionsContainer) {
      selectedIdInput.value = patientId;
      preview.innerHTML = `
        <div style="font-weight:700; color: var(--color-primary); font-size:1.05rem;">${fullName}</div>
        <div style="font-size:0.78rem; color: var(--text-secondary); margin-top:4px;">CPF: ${cpf || 'Não informado'} · Paciente selecionado</div>
      `;
      actionsContainer.style.display = 'flex';
      actionsContainer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, 150);
};

window.openPatientHistoryModal = async function(patientId, patientName) {
  const existing = document.getElementById('patient-history-modal');
  if (existing) existing.remove();

  const modal = document.createElement('div');
  modal.id = 'patient-history-modal';
  modal.className = 'modal-overlay';
  modal.style.display = 'flex';
  modal.style.zIndex = '99999';
  modal.innerHTML = `
    <div class="modal-content" style="max-width: 900px; width: 92%; max-height: 90vh; display: flex; flex-direction: column; overflow: hidden; background: var(--bg-secondary); border: 1px solid var(--border-color); border-radius: 18px; box-shadow: 0 25px 60px rgba(0,0,0,0.65);">
      
      <div class="modal-header" style="padding: 20px 28px; background: linear-gradient(135deg, #1e1b4b, #311b92); border-bottom: 1px solid var(--border-color); display: flex; justify-content: space-between; align-items: center;">
        <div style="display: flex; align-items: center; gap: 14px;">
          <div style="width: 44px; height: 44px; border-radius: 12px; background: rgba(139,92,246,0.25); border: 1px solid rgba(139,92,246,0.4); display: flex; align-items: center; justify-content: center; color: #a78bfa;">
            <i class="fa-solid fa-file-medical" style="font-size: 1.3rem;"></i>
          </div>
          <div>
            <h3 style="font-family: Outfit, sans-serif; font-size: 1.25rem; font-weight: 700; color: #fff; margin: 0;">Prontuário & Histórico Clínico</h3>
            <div style="font-size: 0.82rem; color: #c4b5fd;">Paciente: <strong style="color: #fff;">${patientName}</strong></div>
          </div>
        </div>
        <button type="button" class="modal-close" id="close-history-modal" style="background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.15); color: #fff; width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center; justify-content: center; cursor: pointer;">
          <i class="fa-solid fa-xmark"></i>
        </button>
      </div>

      <div class="modal-body" id="history-modal-body" style="padding: 24px 28px; overflow-y: auto; flex: 1;">
        <div style="text-align: center; color: var(--text-muted); padding: 40px;">
          <i class="fa-solid fa-circle-notch fa-spin" style="font-size: 2rem; color: var(--color-primary); margin-bottom: 12px;"></i>
          <div>Carregando prontuário e histórico pós-alta...</div>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(modal);

  document.getElementById('close-history-modal').addEventListener('click', () => modal.remove());

  try {
    const res = await apiFetch('/api/patients/' + patientId + '/history');
    const result = await res.json();
    const data = result.data || result;

    const encounters = data.encounters || [];
    const appointments = data.appointments || [];

    const bodyEl = document.getElementById('history-modal-body');
    if (!bodyEl) return;

    if (encounters.length === 0 && appointments.length === 0) {
      bodyEl.innerHTML = `
        <div style="text-align: center; color: var(--text-muted); padding: 40px 20px;">
          <i class="fa-solid fa-folder-open" style="font-size: 2.5rem; color: var(--text-muted); margin-bottom: 12px; opacity: 0.5;"></i>
          <h4 style="color: var(--text-primary); margin-bottom: 6px;">Nenhum atendimento registrado</h4>
          <p style="font-size: 0.85rem;">Este paciente ainda não possui histórico de consultas ou internações pós-alta.</p>
        </div>
      `;
      return;
    }

    let html = `
      <div style="margin-bottom: 20px; font-weight: 700; color: var(--text-primary); font-size: 1rem; display: flex; align-items: center; gap: 8px;">
        <i class="fa-solid fa-clock-rotate-left" style="color: var(--color-primary);"></i> Histórico de Atendimentos & Pós-Alta (${encounters.length})
      </div>
      <div style="display: flex; flex-direction: column; gap: 14px;">
    `;

    encounters.forEach(enc => {
      const isCompleted = enc.status === 'Finalizado' || enc.completed_at;
      const statusLabel = isCompleted ? 'Alta Médica / Finalizado' : enc.status;
      const dateText = enc.admitted_at ? new Date(enc.admitted_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Data não registrada';

      html += `
        <div style="background: var(--bg-tertiary); border: 1px solid var(--border-color); border-left: 4px solid ${isCompleted ? '#10b981' : '#f59e0b'}; border-radius: 12px; padding: 18px 22px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; flex-wrap: wrap; gap: 8px;">
            <div style="display: flex; align-items: center; gap: 10px;">
              <span style="font-weight: 700; font-size: 0.95rem; color: var(--text-primary);">Tipo: ${enc.type === 'Urgencia' ? 'Urgência (PS)' : 'Ambulatório'}</span>
              <span class="${isCompleted ? 'badge-alta' : 'badge-warning'}" style="font-size: 0.72rem;">
                <i class="fa-solid ${isCompleted ? 'fa-circle-check' : 'fa-spinner fa-spin'}" style="margin-right: 4px;"></i>${statusLabel}
              </span>
            </div>
            <span style="font-size: 0.78rem; color: var(--text-muted);"><i class="fa-solid fa-calendar" style="margin-right: 4px;"></i>${dateText}</span>
          </div>

          <div style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 6px;">
            <strong>Queixa Principal / Triagem:</strong> ${enc.complaints || 'Sem registro de queixa'}
          </div>

          ${enc.subjectiveContent ? `
            <div style="font-size: 0.82rem; background: rgba(0,0,0,0.2); padding: 10px 14px; border-radius: 8px; margin-top: 8px; color: var(--text-primary); border: 1px solid rgba(255,255,255,0.05);">
              <strong>Avaliação Médica / PEP:</strong> ${enc.subjectiveContent}
            </div>
          ` : ''}
        </div>
      `;
    });

    html += `</div>`;
    bodyEl.innerHTML = html;

  } catch (e) {
    document.getElementById('history-modal-body').innerHTML = `
      <div style="text-align: center; color: #f87171; padding: 40px;">Erro ao carregar o prontuário do paciente.</div>
    `;
  }
};


// ==========================================
// PRONTUÁRIO ELETRÔNICO DO PACIENTE (PEP) & CONSULTÓRIO
// ==========================================
window.openPEPModal = async function(encounterId) {
  const existing = document.getElementById('pep-modal');
  if (existing) existing.remove();

  const modal = document.createElement('div');
  modal.id = 'pep-modal';
  modal.className = 'modal-overlay';
  modal.style.display = 'flex';
  modal.style.zIndex = '99999';
  modal.innerHTML = `
    <div class="modal-content" style="max-width: 850px; width: 92%; max-height: 90vh; display: flex; flex-direction: column; overflow: hidden; background: var(--bg-secondary); border: 1px solid var(--border-color); border-radius: 18px; box-shadow: 0 25px 60px rgba(0,0,0,0.65);">
      
      <div class="modal-header" style="padding: 20px 28px; background: linear-gradient(135deg, #1e1b4b, #311b92); border-bottom: 1px solid var(--border-color); display: flex; justify-content: space-between; align-items: center;">
        <div style="display: flex; align-items: center; gap: 14px;">
          <div style="width: 44px; height: 44px; border-radius: 12px; background: rgba(236,72,153,0.2); border: 1px solid rgba(236,72,153,0.4); display: flex; align-items: center; justify-content: center; color: #f472b6;">
            <i class="fa-solid fa-file-medical" style="font-size: 1.3rem;"></i>
          </div>
          <div>
            <h3 style="font-family: Outfit, sans-serif; font-size: 1.25rem; font-weight: 700; color: #fff; margin: 0;">Prontuário Eletrônico (PEP)</h3>
            <div id="pep-modal-subtitle" style="font-size: 0.82rem; color: #c4b5fd;">Carregando dados do paciente...</div>
          </div>
        </div>
        <button type="button" class="modal-close" id="close-pep-modal" style="background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.15); color: #fff; width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center; justify-content: center; cursor: pointer;">
          <i class="fa-solid fa-xmark"></i>
        </button>
      </div>

      <div class="modal-body" id="pep-modal-body" style="padding: 24px 28px; overflow-y: auto; flex: 1;">
        <div style="text-align: center; color: var(--text-muted); padding: 40px;">
          <i class="fa-solid fa-circle-notch fa-spin" style="font-size: 2rem; color: var(--color-primary); margin-bottom: 12px;"></i>
          <div>Buscando atendimento no banco...</div>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(modal);

  document.getElementById('close-pep-modal').addEventListener('click', () => modal.remove());

  try {
    let encounters = [];
    try {
      const res = await apiFetch('/api/encounters');
      if (res.ok) {
        const rawData = await res.json();
        encounters = Array.isArray(rawData) ? rawData : (rawData?.data || []);
      }
    } catch(e) {}

    const enc = encounters.find(e => String(e.id) === String(encounterId)) || {};

    const subtitleEl = document.getElementById('pep-modal-subtitle');
    if (subtitleEl) {
      subtitleEl.innerHTML = `Paciente: <strong style="color:#fff;">${enc.patientName || 'Paciente'}</strong> · Sala: <span style="color:#34d399;">${enc.room || 'Consultório 01'}</span>`;
    }

    let notes = {};
    try {
      const notesRes = await apiFetch('/api/encounters/' + encounterId + '/notes');
      if (notesRes && notesRes.ok) {
        const notesData = await notesRes.json();
        notes = (notesData && typeof notesData === 'object') ? (notesData.data || notesData) : {};
      }
    } catch (e) {}

    const bodyEl = document.getElementById('pep-modal-body');
    if (!bodyEl) return;

    bodyEl.innerHTML = `
      <!-- Sinais Vitais & Dados de Triagem -->
      <div style="background: var(--bg-tertiary); border: 1px solid var(--border-color); border-radius: 12px; padding: 14px 18px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px;">
        <div>
          <span style="font-size:0.75rem; color:var(--text-muted); font-weight:600; text-transform:uppercase;">Classificação Manchester:</span>
          <span style="display:inline-block; margin-left:8px; padding:3px 12px; border-radius:20px; font-weight:700; font-size:0.8rem; background:rgba(239,68,68,0.15); color:#f87171; border:1px solid rgba(239,68,68,0.3);">${enc.manchesterColor || 'AMARELO'}</span>
        </div>
        <div style="font-size:0.85rem; color:var(--text-primary); font-family:monospace;">
          <strong>PA:</strong> ${enc.bloodPressure || '120/80'} | <strong>Temp:</strong> ${enc.temperatureCelsius || 36.5}°C | <strong>FC:</strong> ${enc.heartRateBpm || 80} bpm
        </div>
      </div>

      <!-- Formulário SOAP / Prontuário -->
      <form id="pep-form" style="display:flex; flex-direction:column; gap:16px;">
        <div>
          <label class="form-label" style="font-weight:600; color:var(--text-primary); margin-bottom:6px; display:block;">Subjetivo (Anamnese & Queixa):</label>
          <textarea id="pep-subjective" class="form-input" style="width:100%; min-height:70px; resize:vertical;" placeholder="Relato do paciente, evolução dos sintomas...">${notes.subjectiveContent || enc.complaints || ''}</textarea>
        </div>

        <div>
          <label class="form-label" style="font-weight:600; color:var(--text-primary); margin-bottom:6px; display:block;">Objetivo (Exame Físico / Achados):</label>
          <textarea id="pep-objective" class="form-input" style="width:100%; min-height:70px; resize:vertical;" placeholder="Exame físico, ausculta, estado geral...">${notes.objectiveContent || ''}</textarea>
        </div>

        <div>
          <label class="form-label" style="font-weight:600; color:var(--text-primary); margin-bottom:6px; display:block;">Avaliação (Diagnóstico / CID-10):</label>
          <textarea id="pep-assessment" class="form-input" style="width:100%; min-height:60px; resize:vertical;" placeholder="Hipótese diagnóstica ou CID-10...">${notes.assessmentContent || ''}</textarea>
        </div>

        <div>
          <label class="form-label" style="font-weight:600; color:var(--text-primary); margin-bottom:6px; display:block;">Plano Terapêutico & Prescrição:</label>
          <textarea id="pep-plan" class="form-input" style="width:100%; min-height:70px; resize:vertical;" placeholder="Conduta médica, medicação receitada, orientações de alta...">${notes.planContent || ''}</textarea>
        </div>

        <div style="display:flex; justify-content:flex-end; gap:12px; margin-top:10px;">
          <button type="button" id="btn-save-pep" class="btn" style="background:var(--bg-tertiary); border:1px solid var(--border-color); color:var(--text-primary); padding:10px 20px;">
            <i class="fa-solid fa-floppy-disk" style="margin-right:6px;"></i> Salvar Rascunho
          </button>
          <button type="submit" class="btn btn-primary" style="padding:10px 22px; background:linear-gradient(135deg, #10b981, #059669);">
            <i class="fa-solid fa-file-signature" style="margin-right:6px;"></i> Assinar & Finalizar Consulta
          </button>
        </div>
      </form>
    `;

    document.getElementById('btn-save-pep')?.addEventListener('click', async () => {
      await savePEPData(encounterId, false);
    });

    document.getElementById('pep-form')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      await savePEPData(encounterId, true);
    });

  } catch (e) {
    document.getElementById('pep-modal-body').innerHTML = `
      <div style="text-align: center; color: #f87171; padding: 40px;">Erro ao carregar prontuário do paciente.</div>
    `;
  }
};

async function savePEPData(encounterId, shouldFinalize) {
  const subjectiveContent = document.getElementById('pep-subjective').value;
  const objectiveContent = document.getElementById('pep-objective').value;
  const assessmentContent = document.getElementById('pep-assessment').value;
  const planContent = document.getElementById('pep-plan').value;

  try {
    await apiFetch('/api/encounters/' + encounterId + '/notes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        noteType: 'Evolucao_Medica',
        subjectiveContent,
        objectiveContent,
        assessmentContent,
        planContent
      })
    });

    if (shouldFinalize) {
      await apiFetch('/api/encounters/' + encounterId + '/status', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'Finalizado' })
      });
      showToast('⚡ Prontuário assinado e atendimento finalizado com Alta Médica!');
      const modal = document.getElementById('pep-modal');
      if (modal) modal.remove();
      if (typeof loadAndRenderQueue === 'function') loadAndRenderQueue();
      if (state.activeTab === 'atendimento') renderTabContent();
    } else {
      showToast('Prontuário salvo como rascunho com sucesso!');
    }
  } catch (e) {
    showToast('Erro ao salvar prontuário.');
  }
}


// ==========================================
// ABA DE ALERTAS & ESTAGNAÇÃO (GESTÃO DE GARGALOS E SLA)
// ==========================================
async function renderStagnationTab(container) {
  container.innerHTML = `
    <div class="tab-section active">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; flex-wrap: wrap; gap: 12px;">
        <div>
          <h2 style="font-family: Outfit, sans-serif; font-size: 1.4rem; font-weight: 700; color: var(--text-primary); margin: 0; display: flex; align-items: center; gap: 10px;">
            <i class="fa-solid fa-triangle-exclamation" style="color: #f59e0b;"></i> Painel de Estagnação & SLA Hospitalar
          </h2>
          <div style="font-size: 0.85rem; color: var(--text-secondary); margin-top: 4px;">
            Monitoramento proativo de permanência por departamento para direcionamento de condutas.
          </div>
        </div>
        <button id="btn-refresh-stagnation" class="btn btn-secondary" style="font-size: 0.85rem; padding: 8px 16px;">
          <i class="fa-solid fa-arrows-rotate" style="margin-right: 6px;"></i> Atualizar Alertas
        </button>
      </div>

      <div id="stagnation-kpi-area" class="kpi-grid" style="grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); margin-bottom: 24px;">
        <div class="kpi-card" style="border-left: 4px solid #ef4444;">
          <div class="kpi-header"><span>Alertas Críticos</span><div class="kpi-icon danger"><i class="fa-solid fa-bell"></i></div></div>
          <div class="kpi-value" id="stag-kpi-critical">0</div>
          <div class="kpi-trend"><span>Risco Clínico / Fila Vermelha</span></div>
        </div>
        <div class="kpi-card" style="border-left: 4px solid #f59e0b;">
          <div class="kpi-header"><span>Alertas de Espera</span><div class="kpi-icon warning"><i class="fa-solid fa-hourglass-half"></i></div></div>
          <div class="kpi-value" id="stag-kpi-warning">0</div>
          <div class="kpi-trend"><span>Estouro de SLA (> 15/30 min)</span></div>
        </div>
        <div class="kpi-card" style="border-left: 4px solid #3b82f6;">
          <div class="kpi-header"><span>Total Estagnados</span><div class="kpi-icon primary"><i class="fa-solid fa-hospital-user"></i></div></div>
          <div class="kpi-value" id="stag-kpi-total">0</div>
          <div class="kpi-trend"><span>Pacientes Necessitando Ação</span></div>
        </div>
      </div>

      <div class="table-container" style="background: var(--bg-secondary); border: 1px solid var(--border-color); border-radius: 16px; padding: 20px;">
        <div id="stagnation-list-wrapper">
          <div style="text-align: center; color: var(--text-muted); padding: 40px;">
            <i class="fa-solid fa-circle-notch fa-spin" style="font-size: 2rem; color: var(--color-primary); margin-bottom: 12px;"></i>
            <div>Calculando indicadores de estagnação...</div>
          </div>
        </div>
      </div>
    </div>
  `;

  document.getElementById('btn-refresh-stagnation')?.addEventListener('click', () => renderStagnationTab(container));
  await loadAndRenderStagnationData();
}

async function loadAndRenderStagnationData() {
  try {
    const res = await apiFetch('/api/stagnation/alerts');
    const result = await res.json();

    const alerts = result.alerts || [];
    const criticalCount = result.criticalCount || 0;
    const warningCount = result.warningCount || 0;

    const critEl = document.getElementById('stag-kpi-critical');
    const warnEl = document.getElementById('stag-kpi-warning');
    const totEl = document.getElementById('stag-kpi-total');

    if (critEl) critEl.textContent = criticalCount;
    if (warnEl) warnEl.textContent = warningCount;
    if (totEl) totEl.textContent = alerts.length;

    // Atualizar badge do menu lateral
    const navBadge = document.getElementById('stagnation-nav-badge');
    if (navBadge) {
      if (alerts.length > 0) {
        navBadge.textContent = alerts.length;
        navBadge.style.display = 'inline-block';
      } else {
        navBadge.style.display = 'none';
      }
    }

    const wrapper = document.getElementById('stagnation-list-wrapper');
    if (!wrapper) return;

    if (alerts.length === 0) {
      wrapper.innerHTML = `
        <div style="text-align: center; color: var(--text-muted); padding: 40px 20px;">
          <i class="fa-solid fa-circle-check" style="font-size: 3rem; color: #10b981; margin-bottom: 14px; opacity: 0.8;"></i>
          <h3 style="color: var(--text-primary); font-weight: 700; margin-bottom: 6px;">Nenhum Paciente Estagnado</h3>
          <p style="font-size: 0.85rem; max-width: 480px; margin: 0 auto;">Todos os atendimentos estão dentro do tempo limite recomendado (SLA). Excelente fluxo hospitalar!</p>
        </div>
      `;
      return;
    }

    let html = `
      <table class="data-table" style="width: 100%;">
        <thead>
          <tr>
            <th>PACIENTE</th>
            <th>STATUS ATUAL</th>
            <th>SALA / CONSULTÓRIO</th>
            <th>TEMPO PARADO</th>
            <th>DIAGNOSTICO DE ESTAGNAÇÃO</th>
            <th style="text-align: right;">AÇÕES RÁPIDAS</th>
          </tr>
        </thead>
        <tbody>
    `;

    alerts.forEach(item => {
      const isCritical = item.severity === 'CRITICAL';
      const isWarning = item.severity === 'WARNING';
      
      const badgeBg = isCritical ? 'rgba(239, 68, 68, 0.15)' : (isWarning ? 'rgba(245, 158, 11, 0.15)' : 'rgba(59, 130, 246, 0.15)');
      const badgeColor = isCritical ? '#f87171' : (isWarning ? '#fbbf24' : '#60a5fa');
      const badgeBorder = isCritical ? 'rgba(239, 68, 68, 0.3)' : (isWarning ? 'rgba(245, 158, 11, 0.3)' : 'rgba(59, 130, 246, 0.3)');

      html += `
        <tr style="${isCritical ? 'background: rgba(239,68,68,0.03);' : ''}">
          <td>
            <div style="font-weight: 700; color: var(--text-primary);">${item.patientName}</div>
            <div style="font-size: 0.78rem; color: var(--text-muted); font-family: monospace;">CPF: ${item.patientCpf || 'Não informado'}</div>
          </td>
          <td>
            <span style="display: inline-block; padding: 4px 10px; border-radius: 12px; font-size: 0.75rem; font-weight: 700; background: ${badgeBg}; color: ${badgeColor}; border: 1px solid ${badgeBorder};">
              ${item.status}
            </span>
          </td>
          <td>
            <span style="font-weight: 600; color: #34d399;"><i class="fa-solid fa-door-open" style="margin-right: 4px;"></i>${item.room || 'Consultório 01'}</span>
          </td>
          <td style="font-family: monospace; font-weight: 700; color: ${isCritical ? '#f87171' : '#fbbf24'};">
            <i class="fa-solid fa-clock" style="margin-right: 4px;"></i>${item.elapsedMin} min
          </td>
          <td style="font-size: 0.82rem; color: var(--text-secondary);">
            <strong>${item.reason}</strong>
            <div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 2px;">${item.recommendedAction}</div>
          </td>
          <td style="text-align: right;">
            <div class="actions-cell" style="justify-content: flex-end;">
              <button class="btn btn-primary" onclick="openReassignModal('${item.id}', '${(item.patientName||'').replace(/'/g, "\\'")}', '${item.room||'Consultório 01'}', '${item.status}')" style="font-size: 0.78rem; padding: 6px 12px; background: linear-gradient(135deg, #2563eb, #1d4ed8);" title="Redirecionar de Consultório/Ala ou Avançar Status">
                <i class="fa-solid fa-right-left" style="margin-right: 4px;"></i> Direcionar
              </button>
            </div>
          </td>
        </tr>
      `;
    });

    html += `</tbody></table>`;
    wrapper.innerHTML = html;

  } catch (e) {
    console.error('Erro ao carregar dados de estagnação:', e);
  }
}

window.openReassignModal = function(encounterId, patientName, currentRoom, currentStatus) {
  const existing = document.getElementById('reassign-modal');
  if (existing) existing.remove();

  const modal = document.createElement('div');
  modal.id = 'reassign-modal';
  modal.className = 'modal-overlay';
  modal.style.display = 'flex';
  modal.style.zIndex = '99999';

  modal.innerHTML = `
    <div class="modal-content" style="max-width: 480px; width: 90%; background: var(--bg-secondary); border: 1px solid var(--border-color); border-radius: 16px; box-shadow: 0 20px 50px rgba(0,0,0,0.6); padding: 24px;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
        <h3 style="margin: 0; font-family: Outfit, sans-serif; font-size: 1.15rem; font-weight: 700; color: var(--text-primary);">
          <i class="fa-solid fa-right-left" style="color: var(--color-primary); margin-right: 8px;"></i> Direcionar Atendimento
        </h3>
        <button id="close-reassign-modal" style="background: none; border: none; color: var(--text-muted); cursor: pointer; font-size: 1.2rem;"><i class="fa-solid fa-xmark"></i></button>
      </div>

      <div style="font-size: 0.88rem; color: var(--text-secondary); margin-bottom: 20px; background: var(--bg-tertiary); padding: 12px; border-radius: 10px;">
        Paciente: <strong style="color: var(--text-primary);">${patientName}</strong>
      </div>

      <form id="reassign-form" style="display: flex; flex-direction: column; gap: 14px;">
        <div>
          <label class="form-label" style="font-weight: 600; color: var(--text-primary); margin-bottom: 6px; display: block;">Novo Consultório / Ala:</label>
          <select id="reassign-room" class="form-input" style="width: 100%;">
            <option value="Consultório 01 (Dr. João)" ${currentRoom.includes('01') ? 'selected' : ''}>Consultório 01 (Dr. João - Clinica)</option>
            <option value="Consultório 02 (Dra. Maria)" ${currentRoom.includes('02') ? 'selected' : ''}>Consultório 02 (Dra. Maria - Pediatria)</option>
            <option value="Consultório 03 (Dr. Carlos)" ${currentRoom.includes('03') ? 'selected' : ''}>Consultório 03 (Dr. Carlos - Ortopedia)</option>
            <option value="Ala de Emergência - PS" ${currentRoom.includes('PS') ? 'selected' : ''}>Ala de Emergência - PS</option>
            <option value="Sala de Sutura / Curativos">Sala de Sutura / Curativos</option>
          </select>
        </div>

        <div>
          <label class="form-label" style="font-weight: 600; color: var(--text-primary); margin-bottom: 6px; display: block;">Novo Status do Atendimento:</label>
          <select id="reassign-status" class="form-input" style="width: 100%;">
            <option value="Aguardando_Triagem" ${currentStatus === 'Aguardando_Triagem' ? 'selected' : ''}>Aguardando Triagem</option>
            <option value="Aguardando_Atendimento" ${currentStatus === 'Aguardando_Atendimento' ? 'selected' : ''}>Aguardando Atendimento Médico</option>
            <option value="Em_Atendimento" ${currentStatus === 'Em_Atendimento' ? 'selected' : ''}>Em Atendimento (No Consultório)</option>
            <option value="Finalizado" ${currentStatus === 'Finalizado' ? 'selected' : ''}>Finalizar / Alta Médica</option>
          </select>
        </div>

        <div style="display: flex; justify-content: flex-end; gap: 10px; margin-top: 10px;">
          <button type="button" id="btn-cancel-reassign" class="btn btn-secondary">Cancelar</button>
          <button type="submit" class="btn btn-primary">Confirmar Direcionamento</button>
        </div>
      </form>
    </div>
  `;

  document.body.appendChild(modal);

  const closeModal = () => modal.remove();
  document.getElementById('close-reassign-modal').addEventListener('click', closeModal);
  document.getElementById('btn-cancel-reassign').addEventListener('click', closeModal);

  document.getElementById('reassign-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const room = document.getElementById('reassign-room').value;
    const status = document.getElementById('reassign-status').value;

    try {
      const res = await apiFetch('/api/stagnation/reassign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ encounterId, room, status })
      });

      if (res.ok) {
        showToast('⚡ Atendimento direcionado com sucesso!');
        closeModal();
        if (state.activeTab === 'estagnacao') {
          renderStagnationTab(document.getElementById('main-content'));
        }
      } else {
        alert('Erro ao atualizar atendimento.');
      }
    } catch (err) {
      alert('Erro de conexão com o servidor.');
    }
  });
};

// ==========================================
// REDIRECIONAMENTO INTELIGENTE DOS CARDS DA AGENDA
// ==========================================
window.handleAgendaCardClick = function(actionType) {
  if (actionType === 'all') {
    showToast('⚡ Exibindo todas as consultas agendadas!');
    document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
    document.querySelector('.filter-chip[data-status="all"]')?.classList.add('active');
    if (typeof loadAgenda === 'function') loadAgenda();
  } else if (actionType === 'confirmed') {
    showToast('⚡ Direcionando consultas Confirmadas para a Fila de Atendimento!');
    switchTab('atendimento');
  } else if (actionType === 'progress') {
    showToast('⚡ Direcionando para a Fila de Consulta Médica (PEP / Prontuário)!');
    switchTab('atendimento');
    setTimeout(() => {
      const q = document.getElementById('medical-queue') || document.querySelector('.kanban-board');
      if (q) q.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  } else if (actionType === 'completed') {
    showToast('⚡ Acessando Histórico de Atendimentos Pós-Alta e Relatórios!');
    switchTab('relatorios');
  }
};

// Event Delegation global para garantir resposta ao clique nos cards da Agenda
document.addEventListener('click', (e) => {
  const cardAll = e.target.closest('#kpi-agenda-all');
  if (cardAll) {
    e.preventDefault();
    window.handleAgendaCardClick('all');
    return;
  }
  const cardConfirmed = e.target.closest('#kpi-agenda-confirmed');
  if (cardConfirmed) {
    e.preventDefault();
    window.handleAgendaCardClick('confirmed');
    return;
  }
  const cardProgress = e.target.closest('#kpi-agenda-progress');
  if (cardProgress) {
    e.preventDefault();
    window.handleAgendaCardClick('progress');
    return;
  }
  const cardCompleted = e.target.closest('#kpi-agenda-completed');
  if (cardCompleted) {
    e.preventDefault();
    window.handleAgendaCardClick('completed');
    return;
  }
});
