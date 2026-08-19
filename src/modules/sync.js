// ==========================================
// Health Nexus — Cloud Sync Module (Turso LibSQL Dual-Pipeline)
// ==========================================

import * as localDB from '../localDB.js';
import { state } from '../state.js';
import { showToast, showCustomAlert } from './ui.js';

// Helper para formatação de datas pt-BR (ex: 20/07/2026, 16:06:49)
export const formatSyncDate = (isoOrDate) => {
  if (!isoOrDate || isoOrDate === 'Sem dados') return 'Sem dados';
  try {
    let ts = isoOrDate;
    if (typeof ts === 'string' && /^\d+$/.test(ts.trim())) {
      ts = parseInt(ts.trim(), 10);
    }
    const d = new Date(ts);
    if (isNaN(d.getTime())) return 'Sem dados';
    return d.toLocaleString('pt-BR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit', second: '2-digit'
    });
  } catch (e) {
    return 'Sem dados';
  }
};

export const parseIsoOrSpaceTimestamp = (ts) => {
  if (!ts) return 0;
  let s = String(ts).trim();
  if (/^\d+$/.test(s)) {
    return parseInt(s, 10);
  }
  if (s.includes(' ') && !s.includes('T')) {
    s = s.replace(' ', 'T') + 'Z';
  }
  const d = new Date(s);
  return isNaN(d.getTime()) ? 0 : d.getTime();
};

export const getMaxTimestamp = (timestampsObj = {}) => {
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

// --- MODAL LARANJA: "Sincronização Pendente!" (Disparado em CRUD) ---
export const showSyncPromptModal = (syncData = {}) => {
  return new Promise((resolve) => {
    const existing = document.getElementById('sync-prompt-modal');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.id = 'sync-prompt-modal';
    overlay.className = 'modal-overlay';
    overlay.style.zIndex = '99999';
    overlay.style.display = 'flex';

    const isVercel = !!syncData.isVercel;
    const previousCloudUploadDate = syncData.previousCloudBackup || syncData.lastCloudBackup || syncData.cloudTimestamps?.last_sync || syncData.lastLocalBackup;

    let localLabel = isVercel ? 'Horário Atual no Vercel' : 'Último Backup Local';
    let localDateText = formatSyncDate(syncData.lastLocalBackup === 0 || !syncData.lastLocalBackup ? null : syncData.lastLocalBackup);

    let cloudLabel = isVercel ? 'Último Upload na Nuvem (Anterior)' : 'Versão na Nuvem';
    let cloudDateText = formatSyncDate(previousCloudUploadDate);

    overlay.innerHTML = `
      <div class="modal-content" style="max-width: 500px; width: 90%;">
        <div class="modal-header">
          <h3 style="display:flex; align-items:center; gap:10px;">
            <i class="fa-solid fa-cloud-arrow-up" style="color: var(--warning);"></i>
            Enviar Dados para a Nuvem
          </h3>
          <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">
            <i class="fa-solid fa-times"></i>
          </button>
        </div>

        <div class="modal-body" style="padding-top: 16px;">
          <div style="margin-bottom: 20px; color: var(--text-primary); font-size: 0.95rem;">
            ${isVercel 
              ? 'Você está operando no <strong>Vercel</strong>. Há novos dados locais. Deseja <strong>ENVIAR</strong> esses dados para a nuvem?' 
              : 'Você fez alterações locais que ainda não foram enviadas para a nuvem.<br><br>Deseja <strong>ENVIAR</strong> todos os dados locais para a nuvem agora?'}
          </div>

          <div style="background:var(--bg-tertiary);border-radius:10px;padding:12px 14px;margin-bottom:16px;border:1px solid var(--border-color);">
            <div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid var(--border-color);">
              <i class="fa-solid ${isVercel ? 'fa-globe' : 'fa-clock'}" style="color:var(--text-secondary);width:18px;text-align:center;font-size:1rem;"></i>
              <span style="flex:1;color:var(--text-secondary);font-size:1rem;">${localLabel}:</span>
              <strong style="color:var(--text-primary);font-size:1rem;">${localDateText}</strong>
            </div>
            <div style="display:flex;align-items:center;gap:10px;padding:8px 0;">
              <i class="fa-solid fa-cloud-arrow-up" style="color:var(--warning);width:18px;text-align:center;font-size:1rem;"></i>
              <span style="flex:1;color:var(--text-secondary);font-size:1rem;">${cloudLabel}:</span>
              <strong style="color:var(--text-primary);font-size:1rem;">${cloudDateText}</strong>
            </div>
          </div>
        </div>

        <div class="modal-footer" style="flex-direction: column; gap: 10px;">
          <button id="btn-sync-confirm" class="btn btn-primary" style="width: 100%; justify-content: center;">
            <i class="fa-solid fa-cloud-arrow-up"></i> Sim, Enviar para a Nuvem
          </button>
          <button id="btn-sync-cancel" class="btn btn-secondary" style="width: 100%; justify-content: center; background: transparent; border: none; color: var(--text-secondary);">
            Lembrar mais tarde
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    const cleanUp = () => overlay.remove();

    document.getElementById('btn-sync-cancel')?.addEventListener('click', () => {
      cleanUp();
      resolve(false);
    });

    document.getElementById('btn-sync-confirm')?.addEventListener('click', async () => {
      const btn = document.getElementById('btn-sync-confirm');
      btn.disabled = true;
      btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Enviando...';

      try {
        await syncManager.pushToCloud(true);
      } finally {
        cleanUp();
        resolve(true);
      }
    });
  });
};

// --- MODAL ROXO: "Dados Novos na Nuvem!" (Disparado em Login/Início) ---
export const showSyncComparisonModal = (syncData = {}) => {
  const existing = document.getElementById('sync-comparison-modal');
  if (existing) existing.remove();

  const overlay = document.createElement('div');
  overlay.id = 'sync-comparison-modal';
  overlay.className = 'modal-overlay';
  overlay.style.zIndex = '99998';
  overlay.style.display = 'flex';

  const localTs = syncData.lastLocalBackup || syncData.localTimestamps?.main_data || null;
  const cloudTs = syncData.lastCloudBackup || syncData.cloudTimestamps?.main_data || new Date().toISOString();

  const localDateText = formatSyncDate(localTs);
  const cloudDateText = formatSyncDate(cloudTs);

  overlay.innerHTML = `
    <div class="modal-content" style="max-width: 500px; width: 90%;">
      <div class="modal-header">
        <h3 style="display:flex; align-items:center; gap:10px;">
          <i class="fa-solid fa-cloud-arrow-down" style="color: var(--primary);"></i>
          Dados Novos na Nuvem!
        </h3>
        <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">
          <i class="fa-solid fa-times"></i>
        </button>
      </div>

      <div class="modal-body" style="padding-top: 16px;">
        <div style="margin-bottom: 20px; color: var(--text-primary); font-size: 0.95rem;">
          Detectamos que existem alterações feitas em outro dispositivo ou na nuvem.
          <br><br>
          <strong>Deseja atualizar seu banco local agora?</strong>
        </div>

        <div style="background:var(--bg-tertiary);border-radius:10px;padding:12px 14px;margin-bottom:16px;border:1px solid var(--border-color);">
          <div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid var(--border-color);">
            <i class="fa-solid fa-desktop" style="color:var(--text-secondary);width:18px;text-align:center;font-size:1rem;"></i>
            <span style="flex:1;color:var(--text-secondary);font-size:1rem;">Último Backup Local:</span>
            <strong style="color:var(--text-primary);font-size:1rem;">${localDateText}</strong>
          </div>
          <div style="display:flex;align-items:center;gap:10px;padding:8px 0;">
            <i class="fa-solid fa-cloud" style="color:var(--primary);width:18px;text-align:center;font-size:1rem;"></i>
            <span style="flex:1;color:var(--text-secondary);font-size:1rem;">Versão na Nuvem:</span>
            <strong style="color:var(--text-primary);font-size:1rem;">${cloudDateText}</strong>
          </div>
        </div>
      </div>
      
      <div class="modal-footer" style="flex-direction: column; gap: 10px;">
        <button id="btn-sync-comp-download" class="btn btn-primary" style="width: 100%; justify-content: center;">
          <i class="fa-solid fa-cloud-arrow-down"></i> Sim, Baixar da Nuvem
        </button>
        <button id="btn-sync-comp-skip" class="btn btn-secondary" style="width: 100%; justify-content: center; background: transparent; border: none; color: var(--text-secondary);">
          Lembrar mais tarde
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  const closeBtn = document.getElementById('btn-sync-comp-skip');
  const downloadBtn = document.getElementById('btn-sync-comp-download');

  const closeModal = () => overlay.remove();
  closeBtn?.addEventListener('click', closeModal);

  downloadBtn?.addEventListener('click', async () => {
    downloadBtn.disabled = true;
    closeBtn.disabled = true;
    downloadBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Baixando...';

    try {
      await syncManager.pullFromCloud();
    } finally {
      overlay.remove();
    }
  });
};

// ─── CLASSE SYNCMANAGER (DUAL-PIPELINE TURSO CLOUD) ────────────────────────
export class SyncManager {
  constructor() {
    this.lastLocalUpdate = localDB.getLocalUpdatedAt();
    this.lastCheckTime = 0;
    this.cooldownMs = 60 * 1000;
    this.syncIntervalMs = 15 * 60 * 1000;
    this.timerCountdownSeconds = 15 * 60;
    this.timerInterval = null;
    this.syncInProgress = false;
  }

  startAutoSyncTimer() {
    if (this.timerInterval) clearInterval(this.timerInterval);
    if (localStorage.getItem('turso_manual_sync') === 'true') {
      this.timerCountdownSeconds = 0;
      this.updateTimerUI();
      return;
    }
    this.timerCountdownSeconds = 15 * 60;

    this.timerInterval = setInterval(() => {
      if (this.timerCountdownSeconds > 0) {
        this.timerCountdownSeconds--;
        this.updateTimerUI();
      } else {
        this.timerCountdownSeconds = 15 * 60;
        this.checkCloudVersion(false);
      }
    }, 1000);
  }

  updateTimerUI() {
    updateSyncBadge();
  }

  async checkCloudVersion(force = false) {
    const now = Date.now();
    if (!force && (now - this.lastCheckTime < this.cooldownMs)) {
      return { hasNewData: false, cloudTimestamp: 0 };
    }
    this.lastCheckTime = now;

    if (sessionStorage.getItem('hn_reloading_after_sync') === 'true') {
      sessionStorage.removeItem('hn_reloading_after_sync');
      await getSyncStatus();
      return { hasNewData: false, cloudTimestamp: 0 };
    }

    try {
      const statusData = await getSyncStatus();
      if (statusData && statusData.cloudConfigured) {
        const hasNewData = statusData.cloudTimestamps.main_data > statusData.localTimestamps.main_data;
        
        if (force) {
          if (hasNewData || statusData.conflict) {
            showSyncComparisonModal(statusData);
          } else if (statusData.local_updates > 0) {
            showSyncPromptModal(statusData);
          } else {
            showToast('Banco local já está atualizado com a nuvem.');
          }
        } else {
          const hasLocalChanges = statusData.local_updates > 0 || (statusData.localTimestamps.main_data > statusData.cloudTimestamps.main_data);
          if (hasNewData || statusData.conflict) {
            showSyncComparisonModal(statusData);
          } else if (hasLocalChanges) {
            showSyncPromptModal(statusData);
          }
        }
        return { hasNewData, cloudTimestamp: statusData.cloudTimestamps.main_data };
      }
      return { hasNewData: false, cloudTimestamp: 0 };
    } catch (e) {
      console.warn('[SyncManager] Erro ao checar versão da nuvem:', e);
      return { hasNewData: false, cloudTimestamp: 0 };
    }
  }

  async pushDirectToTurso(dados_json, config_json) {
    const directUrl = 'https://health-nexus-mazzarowysk.aws-us-east-1.turso.io/v2/pipeline';
    const directToken = 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3ODYxNDU1NTgsImlkIjoiMDE5Zjc1YmYtMTUwMS03YmMyLTlkYTQtZTA1ZGIxMzdiYjEyIiwia2lkIjoiU0RZWEtINkIzZWg1b3JtRDBPRXpUbmhUaGpFMllXRXJxbjhCNVFnSmVLZyIsInJpZCI6Ijg4YTY2NjM0LTM3YWQtNGEyZC04ZmUxLTFmYjM3ZDAxNGE4YiJ9.teLr9MEIIXvjkOJh_nUWWaGwJuF0vnFwaMdUsyQLQba1kLOP30ziYQJkCWDDbADYl74zhYLujOwdr0Gg5EWoAg';
    const now = Date.now();

    const pipelineBody = {
      requests: [
        { type: 'execute', stmt: { sql: `CREATE TABLE IF NOT EXISTS ocz_sync (id TEXT PRIMARY KEY, dados_json TEXT, config_json TEXT, updated_at INTEGER);` } },
        { type: 'execute', stmt: { sql: `INSERT OR REPLACE INTO ocz_sync (id, dados_json, config_json, updated_at) VALUES ('main', ?, ?, ?);`, args: [{ type: 'text', value: dados_json }, { type: 'text', value: config_json || '{}' }, { type: 'integer', value: String(now) }] } }
      ]
    };

    const res = await fetch(directUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${directToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(pipelineBody)
    });

    if (!res.ok) throw new Error(`Turso HTTP Direct retornou status ${res.status}`);
    const data = await res.json();
    if (data.results && data.results.some(r => r.type === 'error')) {
      throw new Error(data.results.find(r => r.type === 'error')?.response?.message || 'Erro na query Turso');
    }
    return { success: true, updated_at: now };
  }

  async pullDirectFromTurso() {
    const directUrl = 'https://health-nexus-mazzarowysk.aws-us-east-1.turso.io/v2/pipeline';
    const directToken = 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3ODYxNDU1NTgsImlkIjoiMDE5Zjc1YmYtMTUwMS03YmMyLTlkYTQtZTA1ZGIxMzdiYjEyIiwia2lkIjoiU0RZWEtINkIzZWg1b3JtRDBPRXpUbmhUaGpFMllXRXJxbjhCNVFnSmVLZyIsInJpZCI6Ijg4YTY2NjM0LTM3YWQtNGEyZC04ZmUxLTFmYjM3ZDAxNGE4YiJ9.teLr9MEIIXvjkOJh_nUWWaGwJuF0vnFwaMdUsyQLQba1kLOP30ziYQJkCWDDbADYl74zhYLujOwdr0Gg5EWoAg';

    const pipelineBody = {
      requests: [
        { type: 'execute', stmt: { sql: `SELECT id, updated_at, dados_json, config_json FROM ocz_sync WHERE id = 'main';` } }
      ]
    };

    const res = await fetch(directUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${directToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(pipelineBody)
    });

    if (!res.ok) throw new Error(`Turso HTTP Direct retornou status ${res.status}`);
    const data = await res.json();
    const execResult = data?.results?.[0]?.response?.result;
    if (!execResult || !execResult.rows || execResult.rows.length === 0) {
      return { updated_at: 0, dados_json: '{}', config_json: '{}' };
    }

    const row = execResult.rows[0];
    return {
      updated_at: Number(row[1]?.value || 0),
      dados_json: row[2]?.value || '{}',
      config_json: row[3]?.value || '{}'
    };
  }

  async pushToCloud(showToastMessage = true) {
    if (this.syncInProgress) return false;
    this.syncInProgress = true;

    try {
      const dados_json = localStorage.getItem('healthNexusDados') || '{}';
      const config_json = localStorage.getItem('healthNexusConfig') || '{}';

      let recordSummary = '';
      try {
        const parsed = JSON.parse(dados_json);
        const pCount = (parsed.patients || []).length;
        const eCount = (parsed.encounters || []).length;
        const aCount = (parsed.appointments || []).length;
        recordSummary = `${pCount} pacientes, ${eCount} atendimentos, ${aCount} agendamentos`;
      } catch(e) {}

      let success = false;
      let newUpdatedAt = Date.now();

      // Tentativa 1: Via Endpoint Proxy da Vercel / Express
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 12000);
        const res = await fetch('/api/turso?sync=1', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ dados_json, config_json }),
          signal: controller.signal
        });
        clearTimeout(timeoutId);

        if (res.ok) {
          const body = await res.json();
          if (body && body.success && !body.offline && Number(body.updated_at) > 0) {
            success = true;
            newUpdatedAt = Number(body.updated_at);
          }
        }
      } catch (errProxy) {
        console.warn('[SyncManager] Proxy /api/turso indisponível, tentando direto:', errProxy.message);
      }

      // Tentativa 2: Fallback direto via HTTP Pipeline do Turso
      if (!success) {
        try {
          const directResult = await this.pushDirectToTurso(dados_json, config_json);
          if (directResult && directResult.success) {
            success = true;
            newUpdatedAt = directResult.updated_at;
          }
        } catch (errDirect) {
          console.error('[SyncManager] Erro no push direto ao Turso:', errDirect);
        }
      }

      if (success) {
        localStorage.setItem('healthNexusUpdatedAt', newUpdatedAt.toString());
        localStorage.setItem('ultimoSync', new Date(newUpdatedAt).toLocaleString('pt-BR'));
        this.lastLocalUpdate = newUpdatedAt;
        if (showToastMessage) {
          showToast(`✅ Nuvem Atualizada com Sucesso! (${recordSummary || 'dados gravados'})`);
        }
        await getSyncStatus();
        this.startAutoSyncTimer();
        return true;
      } else {
        if (showToastMessage) {
          showCustomAlert({
            title: 'Falha na Sincronização com a Nuvem',
            message: 'Não foi possível conectar ao Turso Cloud para salvar os dados.<br><br>Verifique sua conexão com a internet ou tente novamente em instantes.',
            type: 'danger'
          });
        }
        return false;
      }
    } catch (err) {
      console.error('[SyncManager] Erro geral no pushToCloud:', err);
      if (showToastMessage) showToast('Erro de conexão ao enviar para a nuvem.');
      return false;
    } finally {
      this.syncInProgress = false;
    }
  }

  async pullFromCloud() {
    try {
      let payload = null;

      // Tentativa 1: Endpoint Proxy
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 12000);
        const res = await fetch('/api/turso', { signal: controller.signal });
        clearTimeout(timeoutId);
        if (res.ok) {
          const body = await res.json();
          if (body && !body.offline && body.dados_json) {
            payload = body;
          }
        }
      } catch (e) {
        console.warn('[SyncManager] Erro proxy pull, tentando direto:', e.message);
      }

      // Tentativa 2: Fallback Direto
      if (!payload) {
        try {
          payload = await this.pullDirectFromTurso();
        } catch (errDirect) {
          console.error('[SyncManager] Erro pull direto Turso:', errDirect);
        }
      }

      if (payload && payload.dados_json && payload.dados_json !== '{}') {
        localDB.overwriteLocal(payload);
        
        let recordSummary = '';
        try {
          const parsed = JSON.parse(payload.dados_json);
          const pCount = (parsed.patients || []).length;
          const eCount = (parsed.encounters || []).length;
          recordSummary = `${pCount} pacientes, ${eCount} atendimentos`;
        } catch(e) {}

        const now = payload.updated_at || Date.now();
        localStorage.setItem('healthNexusUpdatedAt', now.toString());
        localStorage.setItem('ultimoSync', new Date(now).toLocaleString('pt-BR'));
        sessionStorage.setItem('hn_reloading_after_sync', 'true');
        showToast(`✅ Banco Local Atualizado da Nuvem! (${recordSummary})`);
        setTimeout(() => window.location.reload(), 700);
        return true;
      } else {
        showCustomAlert({
          title: 'Aviso de Sincronização',
          message: 'A nuvem Turso ainda não possui dados registrados ou está temporariamente inacessível.',
          type: 'warning'
        });
        return false;
      }
    } catch (e) {
      console.error('[SyncManager] Erro no pullFromCloud:', e);
      showToast('Erro de rede ao baixar dados da nuvem.');
      return false;
    }
  }
}

export const syncManager = new SyncManager();

export const getSyncStatus = async () => {
  const isVercel = window.location.hostname.includes('vercel.app');
  const localUpdated = localDB.getLocalUpdatedAt();
  
  try {
    const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const timeoutId = controller ? setTimeout(() => controller.abort(), 6000) : null;

    let res = await fetch('/api/turso?status=1', { signal: controller?.signal }).catch(() => null);
    if (timeoutId) clearTimeout(timeoutId);

    let cloudUpdated = 0;
    let cloudOffline = true;
    
    if (res && res.ok) {
      const data = await res.json().catch(() => ({}));
      cloudOffline = !!data.offline;
      if (data.updated_at !== undefined) {
        cloudUpdated = Number(data.updated_at);
      }
    }

    if (cloudOffline || cloudUpdated === 0) {
      try {
        const direct = await syncManager.pullDirectFromTurso();
        if (direct && direct.updated_at) {
          cloudUpdated = direct.updated_at;
          cloudOffline = false;
        }
      } catch(e) {}
    }

    const local_updates = (localUpdated > cloudUpdated && cloudUpdated > 0) ? 1 : 0;
    const synchronized = (localUpdated === cloudUpdated) || (local_updates === 0);

    state.syncInfo = {
      cloudConfigured: !cloudOffline,
      cloudReachable: !cloudOffline,
      synchronized: synchronized,
      local_updates: local_updates,
      localTimestamps: { main_data: localUpdated || cloudUpdated },
      cloudTimestamps: { main_data: cloudUpdated },
      lastLocalBackup: localUpdated || cloudUpdated,
      lastCloudBackup: cloudUpdated,
      isVercel: isVercel,
      conflict: false
    };
    updateSyncBadge();
    return state.syncInfo;
  } catch (err) {
    console.warn('[Sync] Erro ao obter status:', err.message);
    state.syncInfo = {
      cloudConfigured: false,
      cloudReachable: false,
      synchronized: true,
      local_updates: 0,
      localTimestamps: { main_data: localUpdated || Date.now() },
      cloudTimestamps: { main_data: 0 },
      lastLocalBackup: localUpdated || Date.now(),
      lastCloudBackup: 0,
      isVercel: isVercel,
      conflict: false
    };
    updateSyncBadge();
    return null;
  }
};

export const requestSyncPromptIfConfigured = async () => {
  try {
    const statusData = await getSyncStatus();
    if (!statusData || !statusData.cloudConfigured) return false;

    const localMax = getMaxTimestamp(statusData.localTimestamps);
    const cloudMax = getMaxTimestamp(statusData.cloudTimestamps);
    statusData.lastLocalBackup = localMax.str || new Date().toISOString();
    statusData.lastCloudBackup = cloudMax.str || new Date().toISOString();

    const hasLocalUpdates = statusData.local_updates > 0;
    
    if (cloudMax.time > localMax.time) {
      showSyncComparisonModal(statusData);
    } else if (hasLocalUpdates) {
      showSyncPromptModal(statusData);
    } else {
      showToast('Banco local já está perfeitamente sincronizado com a nuvem.');
    }
    return true;
  } catch (err) {
    console.error('Erro ao verificar configuração de nuvem para prompt:', err);
    return false;
  }
};

export const updateSyncBadge = () => {
  const badge = document.getElementById('sync-status-badge');
  if (!badge) return;
  const data = state.syncInfo;

  if (!badge.dataset.listenerAdded) {
    badge.dataset.listenerAdded = 'true';
    badge.addEventListener('click', () => {
      requestSyncPromptIfConfigured();
    });
  }

  const isManual = localStorage.getItem('turso_manual_sync') === 'true';
  const mins = Math.floor((syncManager.timerCountdownSeconds || 900) / 60);
  const secs = (syncManager.timerCountdownSeconds || 900) % 60;
  const timeStr = isManual ? 'MANUAL' : `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

  if (!data) {
    badge.innerHTML = `<i class="fa-solid fa-clock" style="margin-right:6px; color: #818cf8;"></i> Verificação em ${timeStr}`;
    badge.style.background = 'rgba(99,102,241,0.12)';
    badge.style.borderColor = 'rgba(99,102,241,0.3)';
    badge.style.color = '#818cf8';
    return;
  }

  if (data.cloudReachable === false) {
    badge.innerHTML = `<i class="fa-solid fa-cloud" style="margin-right:6px; color: #38bdf8;"></i> Turso Cloud &bull; ${timeStr}`;
    badge.style.background = 'rgba(16, 185, 129, 0.15)';
    badge.style.borderColor = 'rgba(16, 185, 129, 0.4)';
    badge.style.color = '#34d399';
    return;
  }

  if (data.local_updates > 0) {
    badge.innerHTML = `<i class="fa-solid fa-arrows-rotate" style="margin-right:6px;"></i> Mudanças no banco (${data.local_updates}) &bull; ${timeStr}`;
    badge.style.background = 'rgba(245,158,11,0.15)';
    badge.style.borderColor = 'rgba(245,158,11,0.4)';
    badge.style.color = '#fbbf24';
  } else {
    badge.innerHTML = `<i class="fa-solid fa-cloud-check" style="margin-right:6px; color: #34d399;"></i> Sincronizado &bull; ${timeStr}`;
    badge.style.background = 'rgba(16, 185, 129, 0.15)';
    badge.style.borderColor = 'rgba(16, 185, 129, 0.4)';
    badge.style.color = '#34d399';
  }
};

export const checkInitialSync = async () => {
  try {
    syncManager.startAutoSyncTimer();
    await syncManager.checkCloudVersion(true);
  } catch (err) {
    console.error('Erro ao verificar sincronização inicial:', err);
  }
};
