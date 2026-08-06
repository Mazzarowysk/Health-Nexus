
import './styles.css';
import * as localDB from './localDB.js';
import { state, CACHE_TTL_MS, dataCache, dataCacheTimestamps, getSyncUploadTimeout, setSyncUploadTimeout } from './state.js';
import './tabs/reports.js';
import './tabs/consultingRooms.js';
import './tabs/agenda.js';
import './tabs/leitos.js';
import './tabs/doctors.js';
import './tabs/stagnation.js';
import './tabs/pharmacy.js';
import './tabs/tv.js';
import { generateMockData } from './mockDataGenerator.js';

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

// --- MODAL FLUTUANTE DE ALERTA DO SISTEMA (Substitui alert nativo) ---
const showCustomAlert = ({ title = 'Aviso do Sistema', message = '', type = 'info' }) => {
  return new Promise((resolve) => {
    const existing = document.getElementById('hn-custom-alert-modal');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.id = 'hn-custom-alert-modal';
    overlay.className = 'modal-overlay';
    overlay.style.cssText = 'z-index: 999999; display: flex; align-items: center; justify-content: center; background: rgba(0, 0, 0, 0.65); backdrop-filter: blur(8px);';

    let headerBg = 'linear-gradient(135deg, #6366f1, #4f46e5)';
    let iconClass = 'fa-circle-info';

    if (type === 'success') {
      headerBg = 'linear-gradient(135deg, #10b981, #059669)';
      iconClass = 'fa-circle-check';
    } else if (type === 'warning') {
      headerBg = 'linear-gradient(135deg, #f59e0b, #d97706)';
      iconClass = 'fa-triangle-exclamation';
    } else if (type === 'danger' || type === 'error') {
      headerBg = 'linear-gradient(135deg, #ef4444, #dc2626)';
      iconClass = 'fa-circle-xmark';
    }

    overlay.innerHTML = `
      <div class="sync-modal-card" style="max-width: 440px;">
        <div class="sync-header-banner" style="background: ${headerBg}; padding: 16px 20px;">
          <h3 class="sync-header-title" style="font-size: 1.1rem; display: flex; align-items: center; gap: 10px;">
            <i class="fa-solid ${iconClass}"></i> ${title}
          </h3>
          <button id="btn-hn-alert-x" class="modal-close" aria-label="Fechar"><i class="fa-solid fa-xmark"></i></button>
        </div>

        <div class="sync-modal-body" style="padding: 22px 24px; gap: 16px;">
          <div style="font-size: 0.95rem; color: var(--text-primary, #f8fafc); line-height: 1.6; text-align: center;">
            ${message}
          </div>

          <button id="btn-hn-alert-ok" class="btn-sync-action" style="background: ${headerBg}; margin-top: 4px; box-shadow: 0 4px 15px rgba(0,0,0,0.3);">
            <i class="fa-solid fa-check"></i> Entendido (OK)
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    const close = () => {
      overlay.remove();
      resolve(true);
    };

    document.getElementById('btn-hn-alert-ok').addEventListener('click', close);
    document.getElementById('btn-hn-alert-x').addEventListener('click', close);
  });
};

// --- MODAL FLUTUANTE DE CONFIRMAÇÃO DO SISTEMA (Substitui confirm nativo) ---
const showCustomConfirm = ({ title = 'Confirmação Necessária', message = '', confirmText = 'Sim, Confirmar', cancelText = 'Cancelar', type = 'warning' }) => {
  return new Promise((resolve) => {
    const existing = document.getElementById('hn-custom-confirm-modal');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.id = 'hn-custom-confirm-modal';
    overlay.className = 'modal-overlay';
    overlay.style.cssText = 'z-index: 999999; display: flex; align-items: center; justify-content: center; background: rgba(0, 0, 0, 0.65); backdrop-filter: blur(8px);';

    let headerBg = type === 'danger' ? 'linear-gradient(135deg, #ef4444, #dc2626)' : 'linear-gradient(135deg, #f59e0b, #ea580c)';
    let btnBg = type === 'danger' ? 'linear-gradient(135deg, #ef4444, #dc2626)' : 'linear-gradient(135deg, #f59e0b, #ea580c)';

    overlay.innerHTML = `
      <div class="sync-modal-card" style="max-width: 450px;">
        <div class="sync-header-banner" style="background: ${headerBg}; padding: 16px 20px;">
          <h3 class="sync-header-title" style="font-size: 1.1rem; display: flex; align-items: center; gap: 10px;">
            <i class="fa-solid fa-triangle-exclamation"></i> ${title}
          </h3>
        </div>

        <div class="sync-modal-body" style="padding: 22px 24px; gap: 16px;">
          <div style="font-size: 0.95rem; color: var(--text-primary, #f8fafc); line-height: 1.6; text-align: center;">
            ${message}
          </div>

          <div style="display: flex; gap: 10px; width: 100%; margin-top: 6px;">
            <button id="btn-hn-confirm-yes" class="btn-sync-action" style="background: ${btnBg}; flex: 1;">
              <i class="fa-solid fa-check"></i> ${confirmText}
            </button>
            <button id="btn-hn-confirm-no" class="btn-sync-secondary" style="flex: 1; border: 1px solid rgba(255,255,255,0.15); border-radius: 12px; padding: 12px;">
              ${cancelText}
            </button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    document.getElementById('btn-hn-confirm-yes').addEventListener('click', () => {
      overlay.remove();
      resolve(true);
    });

    document.getElementById('btn-hn-confirm-no').addEventListener('click', () => {
      overlay.remove();
      resolve(false);
    });
  });
};

// --- MODAL FLUTUANTE DE CARREGAMENTO (LOADING) DO SISTEMA ---
const showLoadingModal = (message = 'Carregando...') => {
  const existing = document.getElementById('hn-custom-loading-modal');
  if (existing) existing.remove();

  const overlay = document.createElement('div');
  overlay.id = 'hn-custom-loading-modal';
  overlay.className = 'modal-overlay';
  overlay.style.cssText = 'z-index: 999999; display: flex; align-items: center; justify-content: center; background: rgba(0, 0, 0, 0.7); backdrop-filter: blur(8px);';

  overlay.innerHTML = `
    <div class="sync-modal-card" style="max-width: 400px; text-align: center; padding: 32px 24px; display: flex; flex-direction: column; align-items: center; gap: 16px; background: var(--bg-card, #1e293b); border: 1px solid var(--border-color, rgba(255,255,255,0.1)); border-radius: 16px;">
      <div style="width: 46px; height: 46px; border: 4px solid rgba(255,255,255,0.1); border-top-color: #6366f1; border-radius: 50%; animation: spin 1s linear infinite;"></div>
      <h3 style="font-size: 1.1rem; color: var(--text-primary, #f8fafc); font-weight: 600; margin: 0;">${message}</h3>
      <p style="font-size: 0.85rem; color: var(--text-secondary, #94a3b8); margin: 0;">Por favor, aguarde alguns instantes...</p>
    </div>
  `;

  document.body.appendChild(overlay);
};

const hideLoadingModal = () => {
  const modal = document.getElementById('hn-custom-loading-modal');
  if (modal) modal.remove();
};

// --- SOBRESCREVER ALERT NATIVO DO NAVEGADOR PARA USAR DESIGN DO SISTEMA ---
window.alert = function(msg) {
  if (!msg) return;
  const isError = String(msg).toLowerCase().includes('erro') || String(msg).includes('❌');
  const isSuccess = String(msg).toLowerCase().includes('sucesso') || String(msg).includes('✅');
  const type = isError ? 'danger' : (isSuccess ? 'success' : 'info');
  const title = isError ? 'Aviso do Sistema' : (isSuccess ? 'Sucesso' : 'Informação');
  showCustomAlert({ title, message: String(msg), type });
};

// --- MODAL FLUTUANTE DE GERENCIAMENTO DE USUÁRIOS E PERMISSÕES ---
const showUserManagementModal = async () => {
  const existing = document.getElementById('hn-users-modal');
  if (existing) existing.remove();

  const overlay = document.createElement('div');
  overlay.id = 'hn-users-modal';
  overlay.className = 'modal-overlay';
  overlay.style.cssText = 'z-index: 99999; display: flex; align-items: center; justify-content: center; background: rgba(0, 0, 0, 0.7); backdrop-filter: blur(8px);';

  overlay.innerHTML = `
    <div class="sync-modal-card" style="max-width: 720px; width: 92%; max-height: 85vh; display: flex; flex-direction: column;">
      <div class="sync-header-banner purple" style="padding: 18px 24px; flex-shrink: 0;">
        <h3 class="sync-header-title" style="display: flex; align-items: center; gap: 10px;">
          <i class="fa-solid fa-users-gear"></i> Gerenciamento de Usuários & Permissões
        </h3>
        <button id="btn-users-modal-close" class="modal-close" aria-label="Fechar"><i class="fa-solid fa-xmark"></i></button>
      </div>

      <div class="sync-modal-body" style="padding: 24px; gap: 16px; overflow-y: auto; text-align: left; align-items: stretch;">
        <div style="display: flex; justify-content: space-between; align-items: center; gap: 12px; flex-wrap: wrap;">
          <p style="color: var(--text-secondary); margin: 0; font-size: 0.9rem;">
            Cadastre novos usuários, altere senhas e defina funções do corpo clínico.
          </p>
          <button id="btn-add-new-user" class="btn btn-primary" style="background: linear-gradient(135deg, #10b981, #059669); border: none; padding: 9px 16px; font-size: 0.88rem;">
            <i class="fa-solid fa-user-plus"></i> Novo Usuário
          </button>
        </div>

        <div id="users-table-container" style="margin-top: 10px;">
          <div style="text-align: center; padding: 30px 0; color: var(--text-secondary);">
            <i class="fa-solid fa-spinner fa-spin" style="font-size: 1.5rem; margin-bottom: 8px;"></i>
            <p>Carregando usuários...</p>
          </div>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  const closeBtn = document.getElementById('btn-users-modal-close');
  closeBtn.addEventListener('click', () => overlay.remove());

  const loadUsersList = async () => {
    const container = document.getElementById('users-table-container');
    if (!container) return;

    try {
      const res = await apiFetch('/api/users');
      if (!res.ok) throw new Error('Falha ao buscar usuários');
      const payload = await res.json();
      const usersList = payload.data || [];

      if (usersList.length === 0) {
        container.innerHTML = `<div style="text-align: center; padding: 20px; color: var(--text-muted);">Nenhum usuário cadastrado.</div>`;
        return;
      }

      const pendingUsers = usersList.filter(u => u.status === 'Pendente' || u.master_key_requested == 1);

      let pendingHtml = '';
      if (pendingUsers.length > 0) {
        pendingHtml = `
          <div style="background: rgba(245, 158, 11, 0.12); border: 1px solid rgba(245, 158, 11, 0.35); color: #fde047; border-radius: 12px; padding: 14px 18px; margin-bottom: 18px;">
            <div style="font-weight: 700; font-size: 0.95rem; margin-bottom: 8px; display: flex; align-items: center; gap: 8px; color: #fbbf24;">
              <i class="fa-solid fa-user-clock" style="font-size: 1.1rem;"></i>
              Solicitações de Acesso Total Pendentes (${pendingUsers.length}):
            </div>
            ${pendingUsers.map(pu => `
              <div style="display: flex; justify-content: space-between; align-items: center; background: rgba(0,0,0,0.3); padding: 8px 12px; border-radius: 8px; margin-top: 8px; flex-wrap: wrap; gap: 8px;">
                <div>
                  <strong style="color: #fff;">${pu.name}</strong> (@${pu.username}) — <span style="color: #a5b4fc;">Solicitou Acesso ${pu.role}</span>
                </div>
                <div style="display: flex; gap: 8px;">
                  <button class="btn-approve-master" data-id="${pu.id}" style="background: #10b981; color: white; border: none; padding: 6px 14px; border-radius: 6px; font-weight: 600; cursor: pointer; font-size: 0.8rem; display: flex; align-items: center; gap: 6px;">
                    <i class="fa-solid fa-shield-halved"></i> Aprovar Acesso Total
                  </button>
                  <button class="btn-reject-master" data-id="${pu.id}" style="background: rgba(239, 68, 68, 0.2); color: #f87171; border: 1px solid rgba(239, 68, 68, 0.4); padding: 6px 12px; border-radius: 6px; font-weight: 600; cursor: pointer; font-size: 0.8rem;">
                    <i class="fa-solid fa-xmark"></i> Recusar
                  </button>
                </div>
              </div>
            `).join('')}
          </div>
        `;
      }

      container.innerHTML = `
        ${pendingHtml}
        <table class="patients-table" style="width: 100%; border-collapse: collapse; font-size: 0.88rem;">
          <thead>
            <tr style="border-bottom: 1px solid var(--border-color); text-align: left; color: var(--text-secondary);">
              <th style="padding: 10px;">Nome</th>
              <th style="padding: 10px;">Usuário</th>
              <th style="padding: 10px;">Função / Cargo</th>
              <th style="padding: 10px; text-align: right;">Ações</th>
            </tr>
          </thead>
          <tbody>
            ${usersList.map(u => {
              let roleBadgeColor = 'rgba(99, 102, 241, 0.2)';
              let roleTextColor = '#818cf8';
              if (u.status === 'Pendente') {
                roleBadgeColor = 'rgba(245, 158, 11, 0.25)';
                roleTextColor = '#fbbf24';
              } else if (u.role === 'Master' || u.role === 'Administrador' || u.username === 'mazzarowysk') {
                roleBadgeColor = 'rgba(16, 185, 129, 0.2)';
                roleTextColor = '#34d399';
              } else if (u.role === 'Enfermeiro') {
                roleBadgeColor = 'rgba(14, 165, 233, 0.2)';
                roleTextColor = '#38bdf8';
              } else if (u.role === 'Recepcionista') {
                roleBadgeColor = 'rgba(245, 158, 11, 0.2)';
                roleTextColor = '#fbbf24';
              }

              // Apenas os usuários do sistema (devs) são imutáveis
              const isSystemUser = u.username === 'mazzarowysk' || u.username === 'bcoltri';

              return `
                <tr style="border-bottom: 1px solid rgba(255,255,255,0.06);">
                  <td style="padding: 12px 10px; font-weight: 600; color: var(--text-primary);">${u.name}</td>
                  <td style="padding: 12px 10px; font-family: monospace; color: var(--text-secondary);">@${u.username}</td>
                  <td style="padding: 12px 10px;">
                    <span style="font-size: 0.76rem; font-weight: 700; background: ${roleBadgeColor}; color: ${roleTextColor}; padding: 3px 10px; border-radius: 10px;">
                      ${u.status === 'Pendente' ? '⚠️ PENDENTE DE APROVAÇÃO' : (u.username === 'mazzarowysk' ? 'MASTER' : u.role)}
                    </span>
                  </td>
                  <td style="padding: 12px 10px; text-align: right;">
                    <button class="btn-icon btn-edit-user" data-user='${JSON.stringify(u)}' title="Editar Usuário" style="margin-right: 6px;">
                      <i class="fa-solid fa-pen"></i>
                    </button>
                    ${!isSystemUser ? `
                      <button class="btn-icon btn-del-user" data-id="${u.id}" data-name="${u.name}" title="Excluir Usuário" style="color: var(--color-danger);">
                        <i class="fa-solid fa-trash"></i>
                      </button>
                    ` : ''}
                  </td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      `;

      // Eventos dos botões de aprovação master
      container.querySelectorAll('.btn-approve-master').forEach(btn => {
        btn.addEventListener('click', async () => {
          const uid = btn.dataset.id;
          try {
            const aprRes = await apiFetch(`/api/users/${uid}/approve-master`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ action: 'approve' })
            });
            if (aprRes.ok) {
              showToast('Acesso Total (Master) APROVADO!');
              loadUsersList();
            } else {
              showCustomAlert({ title: 'Erro', message: 'Falha ao aprovar usuário.', type: 'danger' });
            }
          } catch (e) {
            showCustomAlert({ title: 'Erro', message: 'Erro de conexão.', type: 'danger' });
          }
        });
      });

      container.querySelectorAll('.btn-reject-master').forEach(btn => {
        btn.addEventListener('click', async () => {
          const uid = btn.dataset.id;
          try {
            const rejRes = await apiFetch(`/api/users/${uid}/approve-master`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ action: 'reject' })
            });
            if (rejRes.ok) {
              showToast('Solicitação recusada. Definido perfil básico.');
              loadUsersList();
            }
          } catch (e) {}
        });
      });

      container.querySelectorAll('.btn-edit-user').forEach(btn => {
        btn.addEventListener('click', () => {
          const userObj = JSON.parse(btn.dataset.user);
          const currentUser = state.user || {};
          
          // Regra de Segurança: Proteção de Perfis Master
          const isTargetMaster = userObj.role === 'Master' || userObj.role === 'Administrador' || userObj.username === 'mazzarowysk';
          const isCurrentMaster = currentUser.role === 'Master' || currentUser.role === 'Administrador' || currentUser.username === 'mazzarowysk';
          
          if (isTargetMaster && !isCurrentMaster && currentUser.username !== userObj.username) {
            showCustomAlert({ 
              title: 'Acesso Negado', 
              message: 'Você não tem permissão para editar este perfil. Apenas um usuário MASTER pode autorizar ou realizar mudanças em contas Master.', 
              type: 'danger' 
            });
            return;
          }

          showUserFormModal(userObj, loadUsersList);
        });
      });

      container.querySelectorAll('.btn-del-user').forEach(btn => {
        btn.addEventListener('click', async () => {
          const uid = btn.dataset.id;
          const uname = btn.dataset.name;
          const confirmed = await showCustomConfirm({
            title: 'Excluir Usuário',
            message: `Tem certeza que deseja excluir o usuário <strong>${uname}</strong>?`,
            confirmText: 'Sim, Excluir',
            cancelText: 'Cancelar',
            type: 'danger'
          });

          if (confirmed) {
            try {
              const delRes = await apiFetch(`/api/users/${uid}`, { method: 'DELETE' });
              if (delRes.ok) {
                showToast('Usuário removido com sucesso!');
                loadUsersList();
              } else {
                const errData = await delRes.json().catch(() => ({}));
                showCustomAlert({ title: 'Erro', message: errData.message || 'Falha ao excluir usuário.', type: 'danger' });
              }
            } catch (e) {
              showCustomAlert({ title: 'Erro', message: 'Erro de conexão ao excluir usuário.', type: 'danger' });
            }
          }
        });
      });

    } catch (e) {
      container.innerHTML = `<div style="text-align: center; color: var(--color-danger); padding: 20px;">Erro ao carregar lista de usuários.</div>`;
    }
  };

  document.getElementById('btn-add-new-user').addEventListener('click', () => {
    showUserFormModal(null, loadUsersList);
  });

  loadUsersList();
};

// Sub-modal Formulário para Criar/Editar Usuário com Chave Master
const showUserFormModal = (userToEdit = null, onSaved = null) => {
  const existing = document.getElementById('hn-user-form-modal');
  if (existing) existing.remove();

  const isEdit = !!userToEdit;

  const overlay = document.createElement('div');
  overlay.id = 'hn-user-form-modal';
  overlay.className = 'modal-overlay';
  overlay.style.cssText = 'z-index: 100000; display: flex; align-items: center; justify-content: center; background: rgba(0, 0, 0, 0.75); backdrop-filter: blur(8px);';

  overlay.innerHTML = `
    <div class="sync-modal-card" style="max-width: 480px; width: 90%;">
      <div class="sync-header-banner ${isEdit ? 'purple' : 'orange'}" style="padding: 16px 20px;">
        <h3 class="sync-header-title" style="font-size: 1.1rem; display: flex; align-items: center; gap: 10px;">
          <i class="fa-solid ${isEdit ? 'fa-user-pen' : 'fa-user-plus'}"></i> ${isEdit ? 'Editar Usuário' : 'Novo Usuário'}
        </h3>
        <button id="btn-uform-close" class="modal-close" aria-label="Fechar"><i class="fa-solid fa-xmark"></i></button>
      </div>

      <form id="user-editor-form" class="sync-modal-body" style="padding: 20px 24px; gap: 14px; text-align: left; align-items: stretch;">
        <div class="form-group">
          <label class="form-label" for="uf-name">* Nome Completo:</label>
          <input type="text" id="uf-name" class="form-input" required value="${userToEdit ? userToEdit.name : ''}" placeholder="Ex: Dr. Marcelo Mazarowysk">
        </div>

        <div class="form-group">
          <label class="form-label" for="uf-username">* Nome de Usuário (Login):</label>
          <input type="text" id="uf-username" class="form-input" required value="${userToEdit ? userToEdit.username : ''}" placeholder="Ex: mazzarowysk" ${userToEdit && userToEdit.username === 'mazzarowysk' ? 'disabled' : ''}>
        </div>

        <div class="form-group">
          <label class="form-label" for="uf-role">* Função / Permissão:</label>
          <select id="uf-role" class="form-input" style="background: var(--bg-card, #1e293b); color: var(--text-primary);">
            <option value="Desenvolvedor" ${userToEdit?.role === 'Desenvolvedor' ? 'selected' : ''}>💻 Desenvolvedor (Criador do Sistema)</option>
            <option value="Master" ${userToEdit?.role === 'Master' ? 'selected' : ''}>👑 Master (Acesso Total)</option>
            <option value="Administrador" ${userToEdit?.role === 'Administrador' ? 'selected' : ''}>🛠️ Administrador Hospitalar</option>
            <option value="Médico" ${userToEdit?.role === 'Médico' || !userToEdit ? 'selected' : ''}>🩺 Médico (Corpo Clínico / Especialista)</option>
            <option value="Enfermeiro" ${userToEdit?.role === 'Enfermeiro' ? 'selected' : ''}>🩺 Enfermeiro(a) / Triagem Manchester</option>
            <option value="Recepcionista" ${userToEdit?.role === 'Recepcionista' ? 'selected' : ''}>📋 Recepcionista / Atendimento</option>
            <option value="Farmacêutico" ${userToEdit?.role === 'Farmacêutico' ? 'selected' : ''}>💊 Farmacêutico(a) / Dispensário</option>
            <option value="Biomédico" ${userToEdit?.role === 'Biomédico' ? 'selected' : ''}>🧪 Biomédico(a) / Laboratório</option>
            <option value="Gestor Financeiro" ${userToEdit?.role === 'Gestor Financeiro' ? 'selected' : ''}>📊 Gestor Financeiro / Faturamento</option>
            <option value="Auxiliar de Enfermagem" ${userToEdit?.role === 'Auxiliar de Enfermagem' ? 'selected' : ''}>🏥 Auxiliar de Enfermagem</option>
          </select>
        </div>

        <div id="uf-master-key-box" class="form-group" style="display: none; background: rgba(99, 102, 241, 0.12); border: 1px solid rgba(129, 140, 248, 0.35); border-radius: 8px; padding: 12px;">
          <label class="form-label" for="uf-master-key" style="color: #a5b4fc; font-weight: 600; display: flex; align-items: center; gap: 6px;">
            <i class="fa-solid fa-key" style="color: #fbbf24;"></i> Chave de Aprovação Master:
          </label>
          <input type="password" id="uf-master-key" class="form-input" placeholder="Digite a Chave Master (Ex: MASTER-HN-2026)">
          <small style="color: var(--text-secondary); display: block; margin-top: 6px; font-size: 0.78rem; line-height: 1.4;">
            * Se a Chave Master for válida ou se você for o Master principal, o acesso será liberado imediatamente. Caso contrário, a solicitação ficará pendente de aprovação.
          </small>
        </div>

        <div class="form-group">
          <label class="form-label" for="uf-password">${isEdit ? 'Nova Senha (deixe em branco para manter a atual):' : '* Senha:'}</label>
          <input type="password" id="uf-password" class="form-input" ${!isEdit ? 'required' : ''} placeholder="••••••••">
        </div>

        <div style="display: flex; gap: 10px; margin-top: 10px;">
          <button type="submit" id="btn-uform-save" class="btn-sync-action ${isEdit ? 'purple' : 'orange'}" style="flex: 1;">
            <i class="fa-solid fa-floppy-disk"></i> ${isEdit ? 'Salvar Alterações' : 'Cadastrar Usuário'}
          </button>
          <button type="button" id="btn-uform-cancel" class="btn-sync-secondary" style="flex: 1; border: 1px solid rgba(255,255,255,0.15); border-radius: 12px; padding: 12px;">
            Cancelar
          </button>
        </div>
      </form>
    </div>
  `;

  document.body.appendChild(overlay);

  const close = () => overlay.remove();
  document.getElementById('btn-uform-close').addEventListener('click', close);
  document.getElementById('btn-uform-cancel').addEventListener('click', close);

  const roleSelect = document.getElementById('uf-role');
  const masterKeyBox = document.getElementById('uf-master-key-box');

  const checkMasterRole = () => {
    if (roleSelect.value === 'Master' || roleSelect.value === 'Administrador') {
      masterKeyBox.style.display = 'block';
    } else {
      masterKeyBox.style.display = 'none';
    }
  };
  roleSelect.addEventListener('change', checkMasterRole);
  checkMasterRole();

  document.getElementById('user-editor-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btnSave = document.getElementById('btn-uform-save');
    btnSave.disabled = true;
    btnSave.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Salvando...';

    const name = document.getElementById('uf-name').value.trim();
    const username = document.getElementById('uf-username').value.trim();
    const role = roleSelect.value;
    const masterKey = document.getElementById('uf-master-key')?.value || '';
    const password = document.getElementById('uf-password').value;

    try {
      const url = isEdit ? `/api/users/${userToEdit.id}` : '/api/users';
      const method = isEdit ? 'PUT' : 'POST';

      const res = await apiFetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, username, role, password, masterKey })
      });

      const payload = await res.json();
      if (res.ok) {
        showToast(payload.message || 'Operação realizada com sucesso!');
        close();
        if (onSaved) onSaved();
      } else {
        showCustomAlert({ title: 'Atenção', message: payload.message || 'Erro ao salvar usuário.', type: 'warning' });
      }
    } catch (err) {
      showCustomAlert({ title: 'Erro', message: 'Falha de conexão com o servidor.', type: 'danger' });
    } finally {
      btnSave.disabled = false;
      btnSave.innerHTML = isEdit ? '<i class="fa-solid fa-floppy-disk"></i> Salvar Alterações' : '<i class="fa-solid fa-floppy-disk"></i> Cadastrar Usuário';
    }
  });
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
    
    // Data do último banco de dados existente na nuvem de quando foi feito o upload anteriormente
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
            Sincronização Pendente!
          </h3>
          <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">
            <i class="fa-solid fa-times"></i>
          </button>
        </div>

        <div class="modal-body" style="padding-top: 16px;">
          <!-- Mensagem Principal -->
          <div style="margin-bottom: 20px; color: var(--text-primary); font-size: 0.95rem;">
            ${isVercel 
              ? 'Você está operando no <strong>Vercel</strong>. Deseja registrar a versão com a data e horário atual na nuvem?' 
              : 'Você fez alterações que ainda não foram enviadas para a nuvem.<br><br><strong>Deseja salvar tudo no Turso agora?</strong>'}
          </div>

          <!-- Caixa de Detalhes de Versões -->
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
          <i class="fa-solid fa-cloud-arrow-up"></i> ${isVercel ? 'Sim, Confirmar Sincronização' : 'Sim, Enviar para Nuvem'}
        </button>
        <button id="btn-sync-cancel" class="btn btn-secondary" style="width: 100%; justify-content: center; background: transparent; border: none; color: var(--text-secondary);">
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

// --- VARREDURA PÓS-LOGIN: Verifica dados na nuvem e exibe modal para baixar ---
const checkCloudStatusAfterLogin = async () => {
  try {
    // Se acabou de sincronizar e recarregar, limpa a flag e evita abrir o modal novamente
    if (sessionStorage.getItem('hn_reloading_after_sync') === 'true') {
      sessionStorage.removeItem('hn_reloading_after_sync');
      return;
    }

    const cloudRes = await apiFetch('/api/sync/cloud-status');
    if (!cloudRes.ok) return;

    const cloudData = await cloudRes.json();
    if (!cloudData.cloudConfigured || !cloudData.hasData) return;

    if (cloudData.isVercel) {
      const approvedTs = Number(localStorage.getItem('hn_vercel_approved_cloud_ts') || 0);
      const cloudTs = Number(cloudData.lastUpdateTime || 0);

      // No Vercel, se a nuvem possui atualizações mais recentes do que a última aprovação neste navegador:
      if (cloudTs > approvedTs) {
        showCloudDataFoundModal(cloudData, approvedTs);
      }
      return;
    }

    // No Notebook (Local): se o banco local e a nuvem forem diferentes (contagem ou data)
    const pendingUpdates = Number(cloudData.local_updates) || 0;
    if (pendingUpdates > 0) {
      // Não peça para baixar, pois há dados locais a serem enviados (que serão sincronizados automaticamente)
      return;
    }
    
    if (cloudData.isDifferent) {
      showCloudDataFoundModal(cloudData, cloudData.localLastUpdate || 0);
    }
  } catch (e) {
    console.warn('[Sync] Varredura pós-login falhou silenciosamente:', e.message);
  }
};

const showCloudDataFoundModal = (cloudStatus, localLastUpdate = 0) => {
  const existing = document.getElementById('cloud-scan-modal');
  if (existing) existing.remove();

  const formatDate = (ts) => {
    if (!ts || ts === 0) return 'Sem dados';
    let t = ts;
    if (typeof t === 'string' && /^\d+$/.test(t.trim())) t = parseInt(t.trim(), 10);
    const d = new Date(t);
    if (isNaN(d.getTime())) return 'Sem dados';
    return d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const cloudTs = Number(cloudStatus.lastUpdateTime) || 0;
  const localTs = Number(localLastUpdate) || 0;
  const cloudNewer = cloudTs > localTs;

  const counts = cloudStatus.counts || {};
  const tableLabels = {
    patients: { label: 'Pacientes', icon: 'fa-user-injured', color: '#6ee7b7' },
    appointments: { label: 'Agendamentos', icon: 'fa-calendar-check', color: '#93c5fd' },
    encounters: { label: 'Atendimentos', icon: 'fa-stethoscope', color: '#fcd34d' },
    doctors: { label: 'Médicos', icon: 'fa-user-doctor', color: '#a5b4fc' },
    beds: { label: 'Leitos', icon: 'fa-bed-pulse', color: '#f9a8d4' },
    prescriptions: { label: 'Prescrições', icon: 'fa-pills', color: '#86efac' },
    pharmacy_items: { label: 'Farmácia', icon: 'fa-capsules', color: '#fbbf24' }
  };

  const tableRows = Object.entries(counts)
    .filter(([, c]) => c > 0)
    .map(([table, count]) => {
      const info = tableLabels[table] || { label: table, icon: 'fa-database', color: '#94a3b8' };
      return `
        <div style="display:flex;align-items:center;gap:10px;padding:7px 0;border-bottom:1px solid rgba(255,255,255,0.06);">
          <i class="fa-solid ${info.icon}" style="color:${info.color};width:18px;text-align:center;font-size:0.85rem;"></i>
          <span style="flex:1;color:#cbd5e1;font-size:0.83rem;">${info.label}</span>
          <strong style="color:${info.color};font-size:0.9rem;">${count}</strong>
        </div>`;
    }).join('');

  const overlay = document.createElement('div');
  overlay.id = 'cloud-scan-modal';
  overlay.style.cssText = `
    position:fixed;inset:0;background:rgba(0,0,0,0.78);backdrop-filter:blur(8px);
    z-index:99999;display:flex;align-items:center;justify-content:center;padding:16px;
  `;

  overlay.innerHTML = `
    <div class="modal-content" style="max-width: 500px; width: 90%;">
      <div class="modal-header">
        <h3 style="display:flex; align-items:center; gap:10px;">
          <i class="fa-solid fa-cloud-arrow-down" style="color: var(--primary);"></i>
          Dados Encontrados na Nuvem!
        </h3>
        <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">
          <i class="fa-solid fa-times"></i>
        </button>
      </div>

      <div class="modal-body" style="padding-top: 16px;">
        <p style="margin-bottom: 16px; color: var(--text-secondary); font-size: 0.95rem;">
          Foi realizada uma varredura e encontramos dados no servidor em nuvem.
        </p>

        <!-- COMPARAÇÃO LOCAL vs NUVEM -->
        <div style="background:var(--bg-tertiary);border-radius:10px;padding:12px 14px;margin-bottom:16px;border:1px solid var(--border-color);">
          <div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid var(--border-color);">
            <i class="fa-solid fa-desktop" style="color:var(--text-secondary);width:18px;text-align:center;font-size:1rem;"></i>
            <span style="flex:1;color:var(--text-secondary);font-size:1rem;">Último Backup Local:</span>
            <strong style="color:var(--text-primary);font-size:1rem;">${formatDate(localTs)}</strong>
          </div>
          <div style="display:flex;align-items:center;gap:10px;padding:8px 0;">
            <i class="fa-solid fa-cloud" style="color:var(--primary);width:18px;text-align:center;font-size:1rem;"></i>
            <span style="flex:1;color:var(--text-secondary);font-size:1rem;">Versão na Nuvem:</span>
            <span style="display:flex;align-items:center;gap:6px;">
              <strong style="color:var(--text-primary);font-size:1rem;">${formatDate(cloudTs)}</strong>
              ${cloudNewer ? '<span style="background:rgba(16, 185, 129, 0.1);color:#10b981;font-size:0.75rem;padding:2px 6px;border-radius:6px;font-weight:700;">MAIS RECENTE</span>' : ''}
            </span>
          </div>
        </div>

        <!-- Resumo por tabela -->
        <details style="margin-bottom:8px;">
          <summary style="cursor:pointer;color:var(--primary);font-size:0.95rem;font-weight:600;display:flex;align-items:center;gap:6px;padding:6px 0;">
            <i class="fa-solid fa-table-list"></i>
            Ver detalhes — ${cloudStatus.totalRecords} registros
          </summary>
          <div style="background:var(--bg-tertiary);border-radius:8px;padding:8px;margin-top:8px;border:1px solid var(--border-color);">
            ${tableRows || '<div style="color:var(--text-secondary);text-align:center;padding:8px;font-size:0.95rem;">Sem dados detalhados</div>'}
          </div>
        </details>
      </div>

      <div class="modal-footer" style="flex-direction: column; gap: 10px;">
        ${cloudStatus.isVercel ? `
          <button id="btn-cloud-scan-ok" class="btn btn-primary" style="width: 100%; justify-content: center;">
            <i class="fa-solid fa-check"></i> Entendido — Usar Dados da Nuvem
          </button>
        ` : `
          <button id="btn-cloud-scan-download" class="btn btn-primary" style="width: 100%; justify-content: center;">
            <i class="fa-solid fa-cloud-arrow-down"></i> Baixar Dados da Nuvem Agora
          </button>
          <button id="btn-cloud-scan-skip" class="btn btn-secondary" style="width: 100%; justify-content: center; background: transparent; border: none; color: var(--text-secondary);">
            Usar apenas banco local por enquanto
          </button>
        `}
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  const okBtn = document.getElementById('btn-cloud-scan-ok');
  const dlBtn = document.getElementById('btn-cloud-scan-download');
  const skipBtn = document.getElementById('btn-cloud-scan-skip');

  if (okBtn) {
    okBtn.addEventListener('click', () => {
      const cloudTs = Number(cloudStatus.lastUpdateTime) || Date.now();
      localStorage.setItem('hn_vercel_approved_cloud_ts', cloudTs.toString());
      sessionStorage.setItem('hn_reloading_after_sync', 'true');
      overlay.remove();
      showToast('✅ Dados da nuvem confirmados!');
      setTimeout(() => location.reload(), 500);
    });
  }

  if (dlBtn) {
    dlBtn.addEventListener('click', async () => {
      dlBtn.disabled = true;
      if (skipBtn) skipBtn.disabled = true;
      dlBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Baixando...';
      try {
        sessionStorage.setItem('hn_reloading_after_sync', 'true');
        await syncManager.pullFromCloud();
        showToast('✅ Dados baixados da nuvem com sucesso!');
        setTimeout(() => location.reload(), 1000);
      } catch (e) {
        showToast('❌ Erro ao baixar: ' + (e.message || e));
        overlay.remove();
      }
    });
  }

  if (skipBtn) skipBtn.addEventListener('click', () => overlay.remove());
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
        <!-- Mensagem Principal -->
        <div style="margin-bottom: 20px; color: var(--text-primary); font-size: 0.95rem;">
          Detectamos que existem alterações feitas em outro dispositivo ou na nuvem.
          <br><br>
          <strong>Deseja atualizar seu banco local agora?</strong>
        </div>

        <!-- Caixa de Detalhes de Versões -->
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
  closeBtn.addEventListener('click', closeModal);

  downloadBtn.addEventListener('click', async () => {
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

// ─── CLASSE SYNCMANAGER (ESPECIFICAÇÃO DE SINCRONIZAÇÃO) ────────────────────
class SyncManager {
  constructor() {
    this.lastLocalUpdate = localDB.getLocalUpdatedAt();
    this.lastCheckTime = 0;
    this.cooldownMs = 60 * 1000; // 60s cooldown
    this.syncIntervalMs = 15 * 60 * 1000; // 15 minutos auto-sync
    this.timerCountdownSeconds = 15 * 60; // 900s
    this.timerInterval = null;
    this.syncInProgress = false;
  }

  startAutoSyncTimer() {
    if (this.timerInterval) clearInterval(this.timerInterval);
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
          // Checagem em background
          if (hasNewData) {
            showSyncComparisonModal(statusData);
          } else if (statusData.local_updates > 0 && !statusData.isVercel) {
            syncManager.pushToCloud(false);
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

  async pushToCloud(showToastMessage = true) {
    if (this.syncInProgress) return false;
    this.syncInProgress = true;

    try {
      const dados_json = localStorage.getItem('healthNexusDados') || '{}';
      const config_json = localStorage.getItem('healthNexusConfig') || '{}';

      const res = await fetch('/api/turso?sync=1', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dados_json, config_json })
      });

      if (res.ok) {
        const body = await res.json();
        const now = body.updated_at || Date.now();
        localStorage.setItem('healthNexusUpdatedAt', now.toString());
        localStorage.setItem('ultimoSync', new Date(now).toLocaleString('pt-BR'));
        this.lastLocalUpdate = now;
        if (showToastMessage) showToast('Dados enviados para a nuvem com sucesso!');
        await getSyncStatus();
        this.startAutoSyncTimer();
        return true;
      } else {
        if (showToastMessage) showToast('Erro ao sincronizar com a nuvem.');
        return false;
      }
    } catch (err) {
      console.error('[SyncManager] Erro no pushToCloud:', err);
      if (showToastMessage) showToast('Erro de conexão ao enviar para a nuvem.');
      return false;
    } finally {
      this.syncInProgress = false;
    }
  }

  async pullFromCloud() {
    try {
      const res = await fetch('/api/turso');
      if (res.ok) {
        const body = await res.json();
        localDB.overwriteLocal(body);
        
        const now = body.updated_at || Date.now();
        localStorage.setItem('healthNexusUpdatedAt', now.toString());
        localStorage.setItem('ultimoSync', new Date(now).toLocaleString('pt-BR'));
        sessionStorage.setItem('hn_reloading_after_sync', 'true');
        showToast('Banco local atualizado com os dados da nuvem!');
        setTimeout(() => window.location.reload(), 800);
        return true;
      } else {
        showToast('Erro ao baixar dados da nuvem.');
        return false;
      }
    } catch (e) {
      console.error('[SyncManager] Erro no pullFromCloud:', e);
      showToast('Erro ao sincronizar com a nuvem.');
      return false;
    }
  }
}

const syncManager = new SyncManager();

const getSyncStatus = async () => {
  const isVercel = window.location.hostname.includes('vercel.app');
  try {
    const res = await fetch('/api/turso?status=1');
    if (!res.ok) {
      state.syncInfo = { cloudConfigured: isVercel, cloudReachable: false, isVercel: isVercel, synchronized: true, local_updates: 0, lastLocalBackup: localDB.getLocalUpdatedAt() };
      updateSyncBadge();
      return state.syncInfo;
    }
    const data = await res.json();
    const localUpdated = localDB.getLocalUpdatedAt();
    const cloudUpdated = data.updated_at || 0;
    
    // Na arquitetura Offline-First, temos "local_updates" se o local for mais novo que a nuvem.
    const local_updates = localUpdated > cloudUpdated ? 1 : 0;
    const synchronized = localUpdated === cloudUpdated;
    
    state.syncInfo = {
      cloudConfigured: true,
      cloudReachable: true,
      synchronized: synchronized,
      local_updates: local_updates,
      localTimestamps: { main_data: localUpdated },
      cloudTimestamps: { main_data: cloudUpdated },
      lastLocalBackup: localUpdated,
      lastCloudBackup: cloudUpdated,
      isVercel: isVercel,
      conflict: (localUpdated > cloudUpdated && cloudUpdated > Number(localStorage.getItem('healthNexusUpdatedAt') || 0)) // simplistic conflict
    };
    updateSyncBadge();
    return state.syncInfo;
  } catch (err) {
    console.error('Erro ao obter status de sincronização:', err);
    state.syncInfo = { cloudConfigured: isVercel, cloudReachable: false, isVercel: isVercel, synchronized: true, local_updates: 0, lastLocalBackup: localDB.getLocalUpdatedAt() };
    updateSyncBadge();
    return null;
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

    const hasLocalUpdates = statusData.local_updates > 0;
    
    if (cloudMax.time > localMax.time) {
      showSyncComparisonModal(statusData);
    } else if (hasLocalUpdates || statusData.isVercel) {
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

const updateSyncBadge = () => {
  const badge = document.getElementById('sync-status-badge');
  if (!badge) return;
  const data = state.syncInfo;

  if (!badge.dataset.listenerAdded) {
    badge.dataset.listenerAdded = 'true';
    badge.addEventListener('click', () => {
      requestSyncPromptIfConfigured();
    });
  }

  if (!data) {
    badge.textContent = 'Verificando Turso...';
    badge.style.background = 'rgba(100,116,139,0.1)';
    badge.style.borderColor = 'rgba(100,116,139,0.3)';
    badge.style.color = '#64748b';
    return;
  }

  if (!data.cloudConfigured) {
    badge.textContent = 'Modo Local (Turso não configurado)';
    badge.style.background = 'rgba(229,62,62,0.1)';
    badge.style.borderColor = 'rgba(229,62,62,0.3)';
    badge.style.color = '#b91c1c';
    return;
  }

  if (data.cloudReachable === false) {
    badge.textContent = 'Nuvem inacessível — modo local';
    badge.style.background = 'rgba(245,158,11,0.12)';
    badge.style.borderColor = 'rgba(245,158,11,0.3)';
    badge.style.color = '#b45309';
    return;
  }

  if (data.isVercel) {
    badge.textContent = 'Conectado ao Turso (Vercel)';
    badge.style.background = 'rgba(13,148,136,0.12)';
    badge.style.borderColor = 'rgba(14,165,233,0.3)';
    badge.style.color = 'var(--color-accent)';
    return;
  }

  badge.style.background = data.synchronized ? 'rgba(34,197,94,0.12)' : 'rgba(245,158,11,0.12)';
  badge.style.borderColor = data.synchronized ? 'rgba(34,197,94,0.3)' : 'rgba(245,158,11,0.3)';
  badge.style.color = data.synchronized ? '#15803d' : '#b45309';

  if (data.local_updates > 0) {
    badge.innerHTML = `🔴 Sincronização Pendente (${data.local_updates})`;
    badge.style.background = 'rgba(239,68,68,0.12)';
    badge.style.borderColor = 'rgba(239,68,68,0.3)';
    badge.style.color = '#b91c1c';
  } else if (data.synchronized) {
    badge.innerHTML = `<i class="fa-solid fa-cloud-arrow-up" style="margin-right:6px;"></i> Local sincronizado com Turso`;
  } else if (data.conflict) {
    badge.innerHTML = `⚠️ Conflito de Sincronização`;
  } else {
    badge.innerHTML = `Fora de Sincronia`;
  }
};

const parseIsoOrSpaceTimestamp = (ts) => {
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
    syncManager.startAutoSyncTimer();
    await syncManager.checkCloudVersion(true);
  } catch (err) {
    console.error('Erro ao verificar sincronização inicial:', err);
  }
};

const initializeApp = async () => {
  initTheme();

  // Timer de segurança anti-trava do loader inicial
  const loaderSafetyTimer = setTimeout(() => {
    const loader = document.querySelector('.initial-loader');
    if (loader && !state.isAuthenticated) {
      console.warn('[Init] Loader inicial persistente detectado. Forçando exibição da tela de login.');
      renderAuthScreen();
    }
  }, 1500);

  if (state.isAuthenticated && state.token) {
    let authValid = false;
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);
      const res = await apiFetch(`${API_URL}/auth/me`, {
        headers: { 'Authorization': `Bearer ${state.token}` },
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        if (data.user) {
          state.user = data.user;
          sessionStorage.setItem('hn_user', JSON.stringify(data.user));
          authValid = true;
        }
      } else {
        clearTimeout(loaderSafetyTimer);
        logout();
        return;
      }
    } catch (e) {
      console.warn('Servidor inacessível ou tempo esgotado na verificação de sessão. Usando sessão em cache.');
      if (state.user) authValid = true;
    }

    clearTimeout(loaderSafetyTimer);

    if (authValid) {
      const fullDB = localDB.getFullDB();
      if (Object.keys(fullDB).length === 0 || (fullDB.medications && fullDB.medications.length > 0 && fullDB.medications[0].stockQuantity === undefined)) {
        console.log('[Init] Banco de dados vazio detectado. Gerando dados simulados iniciais...');
        await generateMockData();
      }
      renderAppStructure();
      const logoutBtn = document.getElementById('btn-logout');
      if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
          e.preventDefault();
          logout();
        });
      }
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
              } else if (cloudMax.time > localMax.time) {
                showSyncComparisonModal(state.syncInfo);
              } else {
                showToast('Banco local já está perfeitamente sincronizado com a nuvem.');
              }
            } else {
              showToast('Turso não configurado ou sem dados para comparar.');
            }
          });
        }
        updateSyncBadge();
      }, 120);
      checkInitialSync();
      setTimeout(() => checkCloudStatusAfterLogin(), 1500);
    } else {
      logout();
    }
  } else {
    clearTimeout(loaderSafetyTimer);
    renderAuthScreen();
  }
};

const logout = () => {
  sessionStorage.removeItem('hn_token');
  sessionStorage.removeItem('hn_user');
  state.isAuthenticated = false;
  state.token = null;
  state.user = null;
  renderAuthScreen();
};

window.renderAuthScreen = renderAuthScreen;
window.logout = logout;
window.initializeApp = initializeApp;

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



const scheduleSyncUpload = async () => {
  if (getSyncUploadTimeout()) clearTimeout(getSyncUploadTimeout());
  
  setSyncUploadTimeout(setTimeout(() => {
    if (document.getElementById('sync-prompt-modal')) return;
    
    // Mostra o modal de sincronização usando o padrão centralizado
    showSyncPromptModal(state.syncInfo || { lastLocalBackup: new Date().toISOString() });
  }, 1000));
};

const apiFetch = async (url, options = {}) => {
  const method = (options.method || 'GET').toUpperCase();
  const body = options.body ? JSON.parse(options.body) : null;
  let responseData = null;
  let status = 200;

  try {
    // Route matching for localDB
    if (url.includes('/api/auth/login')) {
      let isFirstTime = Object.keys(localDB.getFullDB()).length === 0;
      
      // Se for o primeiro acesso, tenta puxar da nuvem silenciosamente
      if (isFirstTime) {
        try {
          const isVercelEnvironment = window.location.hostname.includes('vercel.app');
          if (!isVercelEnvironment) {
            const res = await fetch('/api/turso');
            if (res.ok) {
              const body = await res.json();
              localDB.overwriteLocal(body);
            }
          }
        } catch (e) {
          console.error('Erro ao buscar dados iniciais para login:', e);
        }
      }

      const users = localDB.list('users');

      const user = users.find(u => u.username === body.username);
      // In local mode, we assume the password check is bypassed or checked locally if plain
      if (user) {
        responseData = { token: 'mock-jwt-token', user };
      } else {
        status = 401; responseData = { message: 'Usuário não encontrado' };
      }
    } 
    else if (url.includes('/api/auth/me')) {
      const storedUser = JSON.parse(sessionStorage.getItem('hn_user') || 'null');
      if (storedUser) {
        responseData = { user: storedUser };
      } else {
        status = 401;
        responseData = { message: 'Usuário não autenticado' };
      }
    }
    else if (url.includes('/api/turso/sync')) {
      // handled by real network to vercel proxy, let it pass through
      const res = await fetch(url, options);
      return res;
    }
    else if (url.includes('/api/turso/status')) {
      const res = await fetch(url, options);
      return res;
    }
    else if (url.includes('/api/stagnation/alerts')) {
      const allEncounters = localDB.list('encounters') || [];
      const alerts = [];
      let criticalCount = 0;
      let warningCount = 0;
      
      const now = new Date();
      allEncounters.forEach(enc => {
        if (enc.status === 'Finalizado' || enc.status === 'Cancelado') return;
        
        let elapsedMin = 0;
        if (enc.lastStatusUpdate) {
           const updateTime = new Date(enc.lastStatusUpdate);
           elapsedMin = Math.floor((now - updateTime) / 60000);
        } else if (enc.timestamp) {
           const updateTime = new Date(enc.timestamp);
           elapsedMin = Math.floor((now - updateTime) / 60000);
        }
        
        if (elapsedMin > 15) {
          const isCritical = elapsedMin > 30;
          if (isCritical) criticalCount++; else warningCount++;
          
          let patient = { fullName: 'Desconhecido', cpf: '' };
          if (enc.patientId) {
             patient = localDB.get('patients', enc.patientId) || patient;
          }
          
          alerts.push({
            id: enc.id,
            patientName: patient.fullName,
            patientCpf: patient.cpf,
            status: enc.status,
            room: enc.room || enc.location || '-',
            elapsedMin: elapsedMin,
            severity: isCritical ? 'CRITICAL' : 'WARNING',
            reason: `Aguardando no status '${enc.status}' há ${elapsedMin} min`,
            recommendedAction: 'Verificar situação e prosseguir com atendimento.'
          });
        }
      });
      
      alerts.sort((a, b) => b.elapsedMin - a.elapsedMin);
      
      responseData = { alerts, criticalCount, warningCount };
    }
    else if (url.includes('/api/stagnation/reassign') && method === 'POST') {
      const { encounterId, room, status } = body || {};
      const allEncounters = localDB.list('encounters') || [];
      const enc = allEncounters.find(e => e.id === encounterId || e.encounterId === encounterId || e.patientId === encounterId);

      if (enc) {
        const updated = {
          ...enc,
          room: room || enc.room || 'UTI / Internação',
          status: status || enc.status || 'Aguardando_Leito',
          lastStatusUpdate: new Date().toISOString()
        };
        localDB.update('encounters', enc.id, updated);
        responseData = { status: 'success', data: updated };
      } else {
        // Fallback: Create or update encounter
        const newEnc = {
          id: encounterId || `enc-${Date.now()}`,
          room: room || 'UTI / Internação',
          status: status || 'Aguardando_Leito',
          lastStatusUpdate: new Date().toISOString()
        };
        localDB.insert('encounters', newEnc);
        responseData = { status: 'success', data: newEnc };
      }
    }
    else if (url.startsWith('/api/')) {
      if (url.includes('/api/dashboard/summary')) {
        const db = localDB.getFullDB();
        const patients = db.patients || [];
        const encounters = db.encounters || [];
        const beds = db.beds || [];
        
        const activePatients = patients.length;
        const occupiedBeds = beds.filter(b => b.status === 'Ocupado').length;
        const totalBeds = beds.length || 20;
        const occupancyRate = totalBeds > 0 ? Math.round((occupiedBeds / totalBeds) * 100) : 0;
        
        const occupancyData = [
          { label: 'Ocupados', value: occupiedBeds, color: '#f43f5e' },
          { label: 'Disponíveis', value: totalBeds - occupiedBeds, color: '#10b981' }
        ];
        
        const appointmentsHistory = [
          { label: 'Seg', urgencia: 10, ambulatorial: 12 },
          { label: 'Ter', urgencia: 8, ambulatorial: 15 },
          { label: 'Qua', urgencia: 15, ambulatorial: 10 },
          { label: 'Qui', urgencia: 5, ambulatorial: 20 },
          { label: 'Sex', urgencia: 20, ambulatorial: 25 },
          { label: 'Sáb', urgencia: 25, ambulatorial: 5 },
          { label: 'Dom', urgencia: 30, ambulatorial: 2 }
        ];

        responseData = {
          activePatients,
          occupancyRate,
          averageWaitTimeMinutes: 12,
          dailyAppointmentsCount: encounters.length,
          occupancyData,
          appointmentsHistory
        };
      } else if (url.includes('/api/settings/reset') && method === 'POST') {
        localDB.clear();
        responseData = { message: 'Database reset successfully' };
      } else if (url.includes('/api/settings/seed') && method === 'POST') {
        if (typeof window.populateFakeDatabase === 'function') {
          window.populateFakeDatabase();
        }
      } else if (url.includes('/api/settings/turso') && method === 'POST') {
        const existing = localDB.get('settings', 'turso');
        body.id = 'turso';
        if (existing) {
          responseData = { data: localDB.update('settings', 'turso', body), message: 'Configuração do Turso atualizada com sucesso' };
        } else {
          responseData = { data: localDB.insert('settings', body), message: 'Configuração do Turso criada com sucesso' };
        }
      } else if (url.includes('/history') && url.includes('/patients/')) {
        const match = url.match(/\/patients\/([^\/]+)\/history/);
        const patId = match ? match[1] : null;
        const db = localDB.getFullDB();
        const allPatients = db.patients || [];
        
        let patient = patId ? allPatients.find(p => p.id === patId) : null;
        if (!patient && patId) {
          patient = localDB.get('patients', patId);
        }
        if (!patient && patId) {
          const encs = db.encounters || [];
          const enc = encs.find(e => e.id === patId || e.patientId === patId);
          if (enc) {
            patient = allPatients.find(p => p.id === enc.patientId || p.fullName === enc.patientName) || { id: enc.patientId || patId, fullName: enc.patientName || 'Paciente' };
          }
        }
        
        const allEncounters = db.encounters || [];
        const encounters = patId ? allEncounters.filter(e => e.patientId === patId || e.patientId === patient?.id || (patient?.fullName && e.patientName === patient.fullName)) : [];
        
        const allAppointments = db.appointments || [];
        const appointments = patId ? allAppointments.filter(a => a.patientId === patId || a.patientId === patient?.id || (patient?.fullName && a.patientName === patient.fullName)) : [];
        
        const allTriages = db.triages || [];
        const triages = patId ? allTriages.filter(t => t.patientId === patId || t.patientId === patient?.id || (patient?.fullName && t.patientName === patient.fullName)) : [];
        
        responseData = {
          data: {
            patient: patient || { id: patId || 'PAT-001', fullName: 'Paciente' },
            encounters,
            appointments,
            triages
          }
        };
      } else {
        // Extract table from URL: e.g. /api/patients/PAT-123 -> table: patients, id: PAT-123
        const parts = url.split('?')[0].replace('/api/', '').split('/');
        let table = parts[0];
        let id = parts[1];

        // mapping table names if necessary
        if (table === 'encounters') table = 'encounters';
        if (table === 'patients') table = 'patients';
        if (table === 'appointments') table = 'appointments';
        if (table === 'triages') table = 'triages';
        if (table === 'clinical-notes') table = 'clinical_notes';
        if (table === 'prescriptions') table = 'prescriptions';
        if (table === 'pharmacy') table = 'medications'; // mock stores as 'medications'
        if (table === 'consulting-rooms') table = 'consultorios'; // mock stores as 'consultorios'
        if (table === 'beds') table = 'beds';
        if (table === 'financial') { table = 'financial_installments'; if (id === 'installments') id = undefined; }
        if (table === 'tv') { table = 'tv_calls'; id = undefined; } // fix TV calls routing

        if (method === 'GET') {
          if (id) responseData = localDB.get(table, id);
          else responseData = { data: localDB.list(table) };
        } else if (method === 'POST') {
          if (table === 'tv_calls') {
            body.calledAt = new Date().toISOString();
            // When a patient is called, update their encounter status so they leave the waiting queue
            if (body.patientId) {
              const allEncounters = localDB.list('encounters');
              const enc = allEncounters.find(e => e.patientId === body.patientId && e.status && e.status !== 'Finalizado' && e.status !== 'Cancelado');
              if (enc) localDB.update('encounters', enc.id, { ...enc, status: 'Finalizado' });
            } else if (body.patientName) {
              const allEncounters = localDB.list('encounters');
              const enc = allEncounters.find(e => e.patientName === body.patientName && e.status && e.status !== 'Finalizado' && e.status !== 'Cancelado');
              if (enc) localDB.update('encounters', enc.id, { ...enc, status: 'Finalizado' });
            }
          }
          responseData = { data: localDB.insert(table, body) };
        } else if (method === 'PUT') {
          responseData = { data: localDB.update(table, id, body) };
        } else if (method === 'DELETE') {
          localDB.remove(table, id);
          responseData = { message: 'Removido com sucesso' };
        }
      }
    }
    else {
      // Fallback to real fetch for non-api routes
      return fetch(url, options);
    }
  } catch(e) {
    console.error('LocalDB API Error:', e);
    status = 500;
    responseData = { message: e.message };
  }

  // Create a mock Response object
  const mockRes = {
    ok: status >= 200 && status < 300,
    status: status,
    json: async () => responseData,
    text: async () => JSON.stringify(responseData)
  };

  if (mockRes.ok && ['POST', 'PUT', 'DELETE'].includes(method)) {
    invalidateCacheForUrl(url);
    if (!options.skipSyncPrompt && !url.includes('/api/auth/login')) scheduleSyncUpload();
  }

  return mockRes;
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
          <!-- Canvas 2D de Constelação Tecnológica Interativa (Pontos & Conexões em Rede) -->
          <canvas id="auth-constellation-canvas" class="auth-constellation-canvas"></canvas>

          <!-- Camada de Animações Fluídas & Orbes de Luz -->
          <div class="auth-brand-ambient">
            <div class="auth-orb orb-primary"></div>
            <div class="auth-orb orb-secondary"></div>
            <div class="auth-orb orb-accent"></div>
            <div class="auth-ring ring-1"></div>
            <div class="auth-ring ring-2"></div>
          </div>

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
              <div class="form-group">
                <label class="form-label" for="auth-role">Perfil / Função Desejada</label>
                <select id="auth-role" class="form-input" style="background: var(--bg-card, #1e293b); color: var(--text-primary);">
                  <option value="Médico" selected>🩺 Médico (Corpo Clínico / Especialista)</option>
                  <option value="Enfermeiro">🩺 Enfermeiro(a) / Triagem Manchester</option>
                  <option value="Recepcionista">📋 Recepcionista / Atendimento</option>
                  <option value="Farmacêutico">💊 Farmacêutico(a) / Dispensário</option>
                  <option value="Biomédico">🧪 Biomédico(a) / Laboratório</option>
                  <option value="Gestor Financeiro">📊 Gestor Financeiro / Faturamento</option>
                  <option value="Auxiliar de Enfermagem">🏥 Auxiliar de Enfermagem</option>
                  <option value="Master">👑 Solicitar Acesso Total (Master / Admin)</option>
                  <option value="Desenvolvedor">💻 Solicitar Acesso Desenvolvedor</option>
                </select>
              </div>
              <div id="auth-master-key-box" class="form-group" style="display: none; background: rgba(99, 102, 241, 0.12); border: 1px solid rgba(129, 140, 248, 0.35); border-radius: 8px; padding: 10px; margin-bottom: 12px;">
                <label class="form-label" for="auth-master-key" style="color: #a5b4fc; font-weight: 600; display: flex; align-items: center; gap: 6px;">
                  <i class="fa-solid fa-key" style="color: #fbbf24;"></i> Chave Master (Opcional se pendente):
                </label>
                <input type="password" id="auth-master-key" class="form-input" placeholder="Digite a chave master se possuir">
                <small style="color: var(--text-secondary); display: block; margin-top: 4px; font-size: 0.75rem; line-height: 1.3;">
                  * Se você não possuir a Chave Master, sua solicitação de Acesso Total ficará <strong>Pendente de Aprovação</strong> pelo Usuário Master principal.
                </small>
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

    if (!isLogin) {
      const authRoleSelect = document.getElementById('auth-role');
      const authMasterBox = document.getElementById('auth-master-key-box');
      if (authRoleSelect && authMasterBox) {
        authRoleSelect.addEventListener('change', () => {
          if (authRoleSelect.value === 'Master' || authRoleSelect.value === 'Desenvolvedor') {
            authMasterBox.style.display = 'block';
          } else {
            authMasterBox.style.display = 'none';
          }
        });
      }
    }

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

    const authForm = document.getElementById('auth-form');
    if (authForm) {
      authForm.querySelectorAll('input').forEach(input => {
        input.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            if (typeof authForm.requestSubmit === 'function') {
              authForm.requestSubmit();
            } else {
              const submitBtn = document.getElementById('auth-submit-btn');
              if (submitBtn) submitBtn.click();
            }
          }
        });
      });
    }

    authForm?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const errorContainer = document.getElementById('auth-error-container');
      if (errorContainer) errorContainer.innerHTML = '';

      const username = document.getElementById('auth-username').value.trim();
      const password = document.getElementById('auth-password').value.trim();
      const name = !isLogin ? document.getElementById('auth-name').value.trim() : null;
      const role = !isLogin ? (document.getElementById('auth-role')?.value || 'Médico') : null;
      const masterKey = !isLogin ? (document.getElementById('auth-master-key')?.value || '') : null;
      
      const submitBtn = document.getElementById('auth-submit-btn');
      const originalHTML = submitBtn.innerHTML;
      submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin" style="margin-right: 8px;"></i>Aguarde...';
      submitBtn.disabled = true;

      try {
        const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register';
        const payload = isLogin ? { username, password } : { name, username, password, role, masterKey };
        
        const res = await apiFetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
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
            showToast(data.message || 'Cadastro realizado com sucesso!');
            isLogin = true;
            renderForm();
          }
        } else {
          if (errorContainer) {
            const isPending = res.status === 403;
            errorContainer.innerHTML = isPending ? `
              <div style="background: linear-gradient(135deg, rgba(245,158,11,0.15), rgba(217,119,6,0.1)); border: 1px solid rgba(245,158,11,0.4); border-radius: 12px; padding: 16px 18px; display: flex; align-items: flex-start; gap: 14px; margin-top: 4px;">
                <i class="fa-solid fa-clock" style="color: #fbbf24; font-size: 1.4rem; margin-top: 2px; flex-shrink: 0;"></i>
                <div>
                  <div style="font-weight: 700; color: #fbbf24; font-size: 0.95rem; margin-bottom: 4px;">Acesso Aguardando Aprovação</div>
                  <div style="color: #fde68a; font-size: 0.85rem; line-height: 1.5;">
                    Sua solicitação de acesso está <strong>Pendente</strong>.<br>
                    Aguarde o Desenvolvedor Master aprovar seu cadastro na aba <strong>Alertas & Estagnação</strong>.
                  </div>
                </div>
              </div>
            ` : `
              <div class="auth-error-alert">
                <i class="fa-solid fa-circle-exclamation"></i>
                <span>${data.message || 'Erro na autenticação'}</span>
              </div>
            `;
          }
        }
      } catch (err) {
        if (errorContainer) {
          errorContainer.innerHTML = `
            <div class="auth-error-alert">
              <i class="fa-solid fa-wifi"></i>
              <span>Erro de conexão com o servidor.</span>
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

    setTimeout(() => {
      initConstellationCanvas();
    }, 50);
  };

  renderForm();
}

// --- ANIMAÇÃO DE CONSTELAÇÃO TECNOLÓGICA INTERATIVA (CANVAS 2D 60FPS) ---
function initConstellationCanvas() {
  const canvas = document.getElementById('auth-constellation-canvas');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  const parent = canvas.parentElement;
  let animationFrameId;
  let width, height;

  const resize = () => {
    if (!parent) return;
    width = canvas.width = parent.clientWidth;
    height = canvas.height = parent.clientHeight;
  };

  resize();

  const resizeObserver = new ResizeObserver(() => resize());
  resizeObserver.observe(parent);

  // Nós da rede tecnológica
  const nodeCount = Math.floor(Math.min(width, 700) / 13);
  const nodes = [];
  const palette = ['#00f2fe', '#a855f7', '#e026b8', '#38bdf8', '#818cf8', '#34d399'];

  const mouse = { x: null, y: null, radius: 180 };

  const handleMouseMove = (e) => {
    const rect = parent.getBoundingClientRect();
    mouse.x = e.clientX - rect.left;
    mouse.y = e.clientY - rect.top;
  };

  const handleMouseLeave = () => {
    mouse.x = null;
    mouse.y = null;
  };

  parent.removeEventListener('mousemove', handleMouseMove);
  parent.removeEventListener('mouseleave', handleMouseLeave);
  parent.addEventListener('mousemove', handleMouseMove);
  parent.addEventListener('mouseleave', handleMouseLeave);

  class Node {
    constructor() {
      this.x = Math.random() * width;
      this.y = Math.random() * height;
      this.vx = (Math.random() - 0.5) * 0.9;
      this.vy = (Math.random() - 0.5) * 0.9;
      this.radius = Math.random() * 2.2 + 1.2;
      this.color = palette[Math.floor(Math.random() * palette.length)];
      this.pulseSpeed = Math.random() * 0.03 + 0.01;
      this.pulse = Math.random() * Math.PI;
    }

    update() {
      this.x += this.vx;
      this.y += this.vy;
      this.pulse += this.pulseSpeed;

      if (this.x < 0 || this.x > width) this.vx *= -1;
      if (this.y < 0 || this.y > height) this.vy *= -1;

      // Atração magnética sutil ao mouse
      if (mouse.x !== null && mouse.y !== null) {
        const dx = mouse.x - this.x;
        const dy = mouse.y - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < mouse.radius && dist > 0) {
          const force = (mouse.radius - dist) / mouse.radius;
          this.x += (dx / dist) * force * 0.8;
          this.y += (dy / dist) * force * 0.8;
        }
      }
    }

    draw() {
      const currentRadius = this.radius + Math.sin(this.pulse) * 0.6;
      ctx.beginPath();
      ctx.arc(this.x, this.y, Math.max(0.5, currentRadius), 0, Math.PI * 2);
      ctx.fillStyle = this.color;
      ctx.shadowColor = this.color;
      ctx.shadowBlur = 10;
      ctx.fill();
      ctx.shadowBlur = 0;
    }
  }

  for (let i = 0; i < nodeCount; i++) {
    nodes.push(new Node());
  }

  const maxDist = 140;

  const animate = () => {
    ctx.clearRect(0, 0, width, height);

    // Conexões de rede entre nós próximos
    for (let i = 0; i < nodes.length; i++) {
      nodes[i].update();
      nodes[i].draw();

      for (let j = i + 1; j < nodes.length; j++) {
        const dx = nodes[i].x - nodes[j].x;
        const dy = nodes[i].y - nodes[j].y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < maxDist) {
          const alpha = (1 - dist / maxDist) * 0.55;
          ctx.beginPath();
          ctx.moveTo(nodes[i].x, nodes[i].y);
          ctx.lineTo(nodes[j].x, nodes[j].y);
          ctx.strokeStyle = `rgba(0, 242, 254, ${alpha})`;
          ctx.lineWidth = 1;
          ctx.stroke();
        }
      }

      // Conexão cintilante com o cursor do mouse
      if (mouse.x !== null && mouse.y !== null) {
        const dx = nodes[i].x - mouse.x;
        const dy = nodes[i].y - mouse.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < mouse.radius) {
          const alpha = (1 - dist / mouse.radius) * 0.75;
          ctx.beginPath();
          ctx.moveTo(nodes[i].x, nodes[i].y);
          ctx.lineTo(mouse.x, mouse.y);
          ctx.strokeStyle = `rgba(168, 85, 247, ${alpha})`;
          ctx.lineWidth = 1.3;
          ctx.stroke();
        }
      }
    }

    animationFrameId = requestAnimationFrame(animate);
  };

  if (window._authConstellationCancel) {
    window._authConstellationCancel();
  }
  window._authConstellationCancel = () => {
    cancelAnimationFrame(animationFrameId);
    resizeObserver.disconnect();
  };

  animate();
}

// --- SISTEMA DE NÍVEIS DE ACESSO COMPLETO (RBAC PERFIS HOSPITALARES + DEV) ---
function getRolePermissions(user) {
  const username = (user?.username || '').toLowerCase();
  const role = (user?.role || '').trim();

  // Função Suprema: Desenvolvedor / Criador do Sistema (mazzarowysk e bcoltri)
  if (username === 'mazzarowysk' || username === 'bcoltri' || role === 'Desenvolvedor' || role === 'Dev') {
    return {
      role: 'Desenvolvedor',
      label: '💻 Desenvolvedor (Master)',
      badgeColor: 'linear-gradient(135deg, #a855f7, #7e22ce)',
      allowedTabs: ['dashboard', 'pacientes', 'medicos', 'agenda', 'atendimento', 'consultorios', 'farmacia', 'tv_panel', 'estagnacao', 'leitos', 'financeiro', 'relatorios', 'configuracoes'],
      canApproveUsers: true,
      canManageUsers: true,
      canDeleteRecords: true,
      canSignPEP: true,
      canDoTriage: true
    };
  }

  // Garantia: admin e perfil Master possuem acesso Master
  if (username === 'admin' || role === 'Master') {
    return {
      role: role || 'Master',
      label: '👑 Master (Acesso Total)',
      badgeColor: 'linear-gradient(135deg, #f59e0b, #d97706)',
      allowedTabs: ['dashboard', 'pacientes', 'medicos', 'agenda', 'atendimento', 'consultorios', 'farmacia', 'tv_panel', 'estagnacao', 'leitos', 'financeiro', 'relatorios', 'configuracoes'],
      canApproveUsers: true,
      canManageUsers: true,
      canDeleteRecords: true,
      canSignPEP: true,
      canDoTriage: true
    };
  }

  if (role === 'Administrador') {
    return {
      role: 'Administrador',
      label: '🛠️ Administrador',
      badgeColor: 'linear-gradient(135deg, #6366f1, #4f46e5)',
      allowedTabs: ['dashboard', 'pacientes', 'medicos', 'agenda', 'atendimento', 'consultorios', 'farmacia', 'tv_panel', 'estagnacao', 'leitos', 'financeiro', 'relatorios', 'configuracoes'],
      canApproveUsers: true,
      canManageUsers: true,
      canDeleteRecords: true,
      canSignPEP: true,
      canDoTriage: true
    };
  }

  if (role === 'Enfermeiro' || role === 'Enfermeira') {
    return {
      role: 'Enfermeiro',
      label: '🩺 Enfermeiro(a)',
      badgeColor: 'linear-gradient(135deg, #06b6d4, #0891b2)',
      allowedTabs: ['dashboard', 'pacientes', 'atendimento', 'consultorios', 'farmacia', 'tv_panel', 'estagnacao', 'leitos', 'financeiro'],
      canApproveUsers: false,
      canManageUsers: false,
      canDeleteRecords: false,
      canSignPEP: false,
      canDoTriage: true
    };
  }

  if (role === 'Recepcionista') {
    return {
      role: 'Recepcionista',
      label: '📋 Recepcionista',
      badgeColor: 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
      allowedTabs: ['dashboard', 'pacientes', 'agenda', 'atendimento', 'consultorios', 'tv_panel', 'financeiro'],
      canApproveUsers: false,
      canManageUsers: false,
      canDeleteRecords: false,
      canSignPEP: false,
      canDoTriage: false
    };
  }

  if (role === 'Farmacêutico' || role === 'Farmacêutica') {
    return {
      role: 'Farmacêutico',
      label: '💊 Farmacêutico(a)',
      badgeColor: 'linear-gradient(135deg, #ec4899, #db2777)',
      allowedTabs: ['dashboard', 'pacientes', 'farmacia', 'atendimento', 'financeiro', 'relatorios'],
      canApproveUsers: false,
      canManageUsers: false,
      canDeleteRecords: false,
      canSignPEP: false,
      canDoTriage: false
    };
  }

  if (role === 'Biomédico' || role === 'Biomédica') {
    return {
      role: 'Biomédico',
      label: '🧪 Biomédico(a)',
      badgeColor: 'linear-gradient(135deg, #14b8a6, #0d9488)',
      allowedTabs: ['dashboard', 'pacientes', 'atendimento', 'financeiro', 'relatorios'],
      canApproveUsers: false,
      canManageUsers: false,
      canDeleteRecords: false,
      canSignPEP: false,
      canDoTriage: false
    };
  }

  if (role === 'Gestor Financeiro' || role === 'Faturamento') {
    return {
      role: 'Gestor Financeiro',
      label: '📊 Gestor Financeiro',
      badgeColor: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
      allowedTabs: ['dashboard', 'pacientes', 'financeiro', 'relatorios'],
      canApproveUsers: false,
      canManageUsers: false,
      canDeleteRecords: false,
      canSignPEP: false,
      canDoTriage: false
    };
  }

  if (role === 'Auxiliar de Enfermagem') {
    return {
      role: 'Auxiliar de Enfermagem',
      label: '🏥 Aux. de Enfermagem',
      badgeColor: 'linear-gradient(135deg, #64748b, #475569)',
      allowedTabs: ['dashboard', 'pacientes', 'atendimento', 'consultorios', 'leitos'],
      canApproveUsers: false,
      canManageUsers: false,
      canDeleteRecords: false,
      canSignPEP: false,
      canDoTriage: true
    };
  }

  // Padrão: Médico
  return {
    role: 'Médico',
    label: '🩺 Médico',
    badgeColor: 'linear-gradient(135deg, #10b981, #059669)',
    allowedTabs: ['dashboard', 'pacientes', 'medicos', 'agenda', 'atendimento', 'consultorios', 'farmacia', 'tv_panel', 'estagnacao', 'leitos', 'financeiro', 'relatorios'],
    canApproveUsers: false,
    canManageUsers: false,
    canDeleteRecords: false,
    canSignPEP: true,
    canDoTriage: true
  };
}

// --- ESTRUTURA GERAL DA INTERFACE (TEMPLATE DINÂMICO POR PERFIL) ---
function renderAppStructure() {
  const root = document.getElementById('app');
  const perms = getRolePermissions(state.user);

  const allNavItems = [
    { id: 'dashboard', label: 'Health Nexus', icon: 'fa-chart-line' },
    { id: 'agenda', label: 'Agenda', icon: 'fa-calendar-check' },
    { id: 'pacientes', label: 'Pacientes', icon: 'fa-user-injured' },
    { id: 'atendimento', label: 'Atendimentos', icon: 'fa-stethoscope' },
    { id: 'tv_panel', label: 'Painel TV (Chamador)', icon: 'fa-tv' },
    { id: 'estagnacao', label: 'Alertas & Estagnação', icon: 'fa-triangle-exclamation', hasBadge: true },
    { id: 'leitos', label: 'Leitos', icon: 'fa-bed-pulse' },
    { id: 'farmacia', label: 'Farmácia & Estoque', icon: 'fa-pills' },
    { id: 'financeiro', label: 'Financeiro', icon: 'fa-hand-holding-dollar' },
    { id: 'medicos', label: 'Corpo Clínico', icon: 'fa-user-doctor' },
    { id: 'consultorios', label: 'Consultórios', icon: 'fa-door-open' },
    { id: 'relatorios', label: 'Relatórios', icon: 'fa-file-contract' },
    { id: 'configuracoes', label: 'Configurações', icon: 'fa-gear' }
  ];

  const visibleNavItems = allNavItems.filter(item => perms.allowedTabs.includes(item.id));

  // Ajusta aba ativa caso a atual não seja permitida para o perfil
  if (!perms.allowedTabs.includes(state.activeTab)) {
    state.activeTab = perms.allowedTabs[0] || 'dashboard';
  }

  const navHtml = visibleNavItems.map(item => `
    <li>
      <a class="nav-item ${state.activeTab === item.id ? 'active' : ''}" data-tab="${item.id}" style="${item.hasBadge ? 'position: relative;' : ''}">
        <i class="fa-solid ${item.icon}" style="${item.id === 'estagnacao' ? 'color: #f59e0b;' : ''}"></i>
        <span>${item.label}</span>
        ${item.hasBadge ? `<span id="stagnation-nav-badge" class="badge-count" style="display:none; margin-left: auto; background: #ef4444; color: #fff; border-radius: 10px; font-size: 0.7rem; padding: 2px 7px; font-weight: 700;">0</span>` : ''}
      </a>
    </li>
  `).join('');

  root.innerHTML = `
    <div class="app-container">
      <!-- Sidebar de Navegação -->
      <aside class="app-sidebar">
        <div class="brand-logo">
          <img src="/assets/logo.png" alt="Health Nexus" class="brand-logo-img">
        </div>
        <nav>
          <ul class="nav-menu">
            ${navHtml}
          </ul>
        </nav>
        <div style="margin-top: auto; border-top: 1px solid var(--border-color); padding-top: 16px;">
          <div style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 10px;">
            Logado como: <br>
            <strong style="color: var(--text-primary); display: block; margin-top: 2px;">${state.user ? state.user.name : 'Usuário'}</strong>
            <span style="display: inline-block; margin-top: 4px; padding: 3px 10px; border-radius: 20px; font-size: 0.72rem; font-weight: 700; color: #fff; background: ${perms.badgeColor}; box-shadow: 0 2px 8px rgba(0,0,0,0.3);">
              ${perms.label}
            </span>
          </div>
          <button id="btn-logout" class="btn" style="width: 100%; background: var(--bg-tertiary); color: var(--color-danger); border: 1px solid var(--border-color); margin-bottom: 12px;">
            <i class="fa-solid fa-arrow-right-from-bracket"></i> Sair
          </button>
          <div style="text-align: center; font-size: 0.65rem; color: var(--text-secondary); opacity: 0.6;">
            <i class="fa-solid fa-code" style="margin-right: 4px;"></i> Desenvolvido por @mazzarowysk &amp; @_coltri_
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
          <button id="btn-density-toggle" class="btn" style="background: var(--bg-tertiary); border: 1px solid var(--border-color); color: var(--text-primary); cursor: pointer; display: flex; align-items: center; justify-content: center; padding: 0 14px; height: 40px; border-radius: 20px; font-size: 0.82rem; font-weight: 600; gap: 6px; transition: transform 0.2s ease, background 0.2s ease;" title="Alternar Densidade Visual (Modo Normal / Modo Compacto Hospitalar)">
            <i class="fa-solid fa-compress" id="density-icon"></i> <span id="density-label">Modo Compacto</span>
          </button>
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
          <div class="pep-title-container">
            <div class="pep-title">
              <i class="fa-solid fa-file-waveform" style="color: #a78bfa; font-size: 1.4rem;"></i>
              <div>
                <span>Prontuário Eletrônico do Paciente</span>
                <span class="pep-subtitle">Evolução Clínica SOAP & Prescrição Médica</span>
              </div>
            </div>
          </div>
          <div class="pep-header-info">
            <div class="pep-info-chip"><i class="fa-solid fa-user-circle" style="color: #60a5fa;"></i> <span id="pep-patient-name">Paciente</span></div>
            <div class="pep-info-chip"><i class="fa-solid fa-clock" style="color: #34d399;"></i> <span id="pep-encounter-status">-</span></div>
          </div>
        </div>
        <div class="pep-body">
          <div class="pep-sidebar">
            <div class="pep-sidebar-group">
              <label class="pep-sidebar-label"><i class="fa-solid fa-shield-heart"></i> Classificação de Risco</label>
              <div id="pep-manchester-badge" class="pep-manchester-pill">-</div>
            </div>
            
            <div class="pep-sidebar-group">
              <label class="pep-sidebar-label"><i class="fa-solid fa-heart-pulse"></i> Sinais Vitais (Triagem)</label>
              <div class="pep-vitals-grid">
                <div class="pep-vital-item">
                  <span class="pep-vital-lbl"><i class="fa-solid fa-gauge-high" style="color: #60a5fa;"></i> PA</span>
                  <span class="pep-vital-val"><strong id="pep-bp">-</strong> <small>mmHg</small></span>
                </div>
                <div class="pep-vital-item">
                  <span class="pep-vital-lbl"><i class="fa-solid fa-heartbeat" style="color: #f87171;"></i> FC</span>
                  <span class="pep-vital-val"><strong id="pep-hr">-</strong> <small>bpm</small></span>
                </div>
                <div class="pep-vital-item">
                  <span class="pep-vital-lbl"><i class="fa-solid fa-temperature-three-quarters" style="color: #fbbf24;"></i> Temp</span>
                  <span class="pep-vital-val"><strong id="pep-temp">-</strong> <small>°C</small></span>
                </div>
                <div class="pep-vital-item">
                  <span class="pep-vital-lbl"><i class="fa-solid fa-weight-scale" style="color: #34d399;"></i> Peso</span>
                  <span class="pep-vital-val"><strong id="pep-weight">-</strong> <small>kg</small></span>
                </div>
                <div class="pep-vital-item">
                  <span class="pep-vital-lbl"><i class="fa-solid fa-lungs" style="color: #a78bfa;"></i> SpO2</span>
                  <span class="pep-vital-val"><strong id="pep-spo2">-</strong> <small>%</small></span>
                </div>
                <div class="pep-vital-item">
                  <span class="pep-vital-lbl"><i class="fa-solid fa-face-frown-open" style="color: #f43f5e;"></i> Dor</span>
                  <span class="pep-vital-val"><strong id="pep-pain">-</strong> <small>/10</small></span>
                </div>
              </div>
            </div>

            <div class="pep-sidebar-group">
              <label class="pep-sidebar-label"><i class="fa-solid fa-comment-medical"></i> Queixa Principal</label>
              <div class="pep-complaints-card">
                <p id="pep-complaints">-</p>
              </div>
            </div>
          </div>
          
          <div class="pep-main">
            <div class="pep-soap-card">
              <div class="pep-soap-header">
                <span class="pep-soap-tag tag-s">S</span>
                <label for="pep-subjective">Subjetivo (Anamnese & Queixa)</label>
                <small class="pep-soap-hint">Relato do paciente, histórico dos sintomas e medicamentos em uso</small>
              </div>
              <textarea id="pep-subjective" class="pep-textarea" placeholder="Digite o relato detalhado do paciente, início e evolução das queixas..."></textarea>
            </div>

            <div class="pep-soap-card">
              <div class="pep-soap-header">
                <span class="pep-soap-tag tag-o">O</span>
                <label for="pep-objective">Objetivo (Exame Físico & Achados)</label>
                <small class="pep-soap-hint">Exame físico segmentar, sinais clínicos e exames complementares</small>
              </div>
              <textarea id="pep-objective" class="pep-textarea" placeholder="Achados ao exame físico (ex: RCR 2T BNF sem sopros, MV+ sem ruidos adventícios...)"></textarea>
            </div>

            <div class="pep-soap-card autocomplete-container">
              <div class="pep-soap-header">
                <span class="pep-soap-tag tag-a">A</span>
                <label for="pep-assessment">Avaliação (Diagnóstico / CID-10)</label>
                <small class="pep-soap-hint">Hipótese diagnóstica principal e busca automática CID-10</small>
              </div>
              <input type="text" id="pep-assessment" class="form-input pep-cid-input" placeholder="Digite para buscar código ou descrição do CID-10..." autocomplete="off">
              <div id="pep-cid-dropdown" class="autocomplete-dropdown"></div>
            </div>

            <div class="pep-soap-card pep-soap-card-fill">
              <div class="pep-soap-header">
                <span class="pep-soap-tag tag-p">P</span>
                <label for="pep-plan">Plano (Prescrição / Conduta Terapêutica)</label>
                <small class="pep-soap-hint">Medicamentos prescritos, exames solicitados e conduta de alta/internação</small>
              </div>
              <textarea id="pep-plan" class="pep-textarea" placeholder="Prescrição médica completa, dosagens, horários, recomendações e conduta final..."></textarea>
            </div>
          </div>
        </div>
        <div class="pep-footer">
          <div class="pep-footer-status" style="display: flex; align-items: center; gap: 8px;">
            <span style="font-size: 0.76rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase;">Status do Prontuário:</span>
            <span id="pep-status-badge"></span>
          </div>
          <div class="pep-footer-actions">
            <button class="btn btn-secondary" onclick="closePEPModal()">
              <i class="fa-solid fa-xmark"></i> Fechar
            </button>
            <button class="btn btn-secondary" onclick="printCurrentPEP()">
              <i class="fa-solid fa-print"></i> Imprimir / PDF
            </button>
            <button class="btn btn-secondary" id="btn-save-draft" onclick="savePEPDraft()">
              <i class="fa-solid fa-floppy-disk"></i> Salvar Rascunho
            </button>
            <button class="btn btn-primary btn-sign-highlight" id="btn-sign-pep" onclick="openSignModal()">
              <i class="fa-solid fa-file-signature"></i> Assinar e Finalizar
            </button>
          </div>
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

  // Botão de alternar densidade (Modo Compacto Hospitalar)
  const savedDensity = localStorage.getItem('hn_density');
  if (savedDensity === 'compact') {
    document.body.classList.add('compact-mode');
  }
  const densityToggle = document.getElementById('btn-density-toggle');
  if (densityToggle) {
    const updateDensityBtn = () => {
      const isCompact = document.body.classList.contains('compact-mode');
      const icon = document.getElementById('density-icon');
      const label = document.getElementById('density-label');
      if (icon) icon.className = isCompact ? 'fa-solid fa-expand' : 'fa-solid fa-compress';
      if (label) label.textContent = isCompact ? 'Modo Normal' : 'Modo Compacto';
    };
    updateDensityBtn();
    densityToggle.addEventListener('click', () => {
      document.body.classList.toggle('compact-mode');
      const isCompact = document.body.classList.contains('compact-mode');
      localStorage.setItem('hn_density', isCompact ? 'compact' : 'normal');
      updateDensityBtn();
      showToast(isCompact ? 'Modo Compacto (Alta Densidade) ativado!' : 'Modo Normal ativado.');
    });
  }

  // Renderizar o conteúdo da aba ativa
  renderTabContent();
}

// --- CONTROLE DE MUDANÇA DE ABA COM PERMISSÃO (RBAC) ---
function switchTab(tabName) {
  const perms = getRolePermissions(state.user);
  if (!perms.allowedTabs.includes(tabName)) {
    showCustomAlert({
      title: 'Acesso Restrito',
      message: `Seu perfil (<strong>${perms.label}</strong>) não possui autorização para acessar esta funcionalidade.`,
      type: 'warning'
    });
    return;
  }

  state.activeTab = tabName;
  
  // Mapa de nomes de exibição por aba
  const tabLabels = {
    dashboard:     'Health Nexus',
    pacientes:     'Pacientes',
    medicos:        'Corpo Clínico',
    consultorios:  'Consultórios',
    farmacia:      'Farmácia & Estoque',
    tv_panel:      'Painel TV (Chamador)',
    agenda:        'Agenda Médica',
    atendimento:   'Atendimentos',
    estagnacao:    'Alertas & Estagnação',
    leitos:        'Gestão de Leitos',
    financeiro:    'Gestão Financeira & Títulos',
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

        <!-- Seção de Gráficos Interativos (Layout Híbrido Neon Glass) -->
        <div class="charts-grid">
          <!-- Card 1: FUNIL DE ATENDIMENTO HOSPITALAR (Estilo Funil Interativo) -->
          <div class="chart-card">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; flex-wrap: wrap; gap: 8px;">
              <h4 class="chart-card-title" style="margin-bottom: 0;">
                <i class="fa-solid fa-filter" style="color: #3b82f6;"></i> Funil de Atendimento Hospitalar
              </h4>
              <!-- Seletor de Período Interativo -->
              <div style="display: flex; gap: 6px;">
                <button class="funnel-period-pill active" data-period="hoje">Hoje</button>
                <button class="funnel-period-pill" data-period="semana">Semana</button>
                <button class="funnel-period-pill" data-period="mes">Mês</button>
              </div>
            </div>

            <div class="funnel-card-body">
              <!-- Visual do Funil Trapezoidal Interativo -->
              <div class="funnel-wrapper">
                <div class="funnel-stage funnel-stage-1" data-target-tab="atendimento" data-stage-name="Recepção" title="Clique para ver os Pacientes na Recepção (1.250)">
                  <i class="fa-solid fa-users" style="margin-right: 6px;"></i> <span id="funnel-num-1">1.250 (100%)</span>
                </div>
                <div class="funnel-stage funnel-stage-2" data-target-tab="estagnacao" data-stage-name="Triagem Manchester" title="Clique para ver os Pacientes Triados (1.080)">
                  <i class="fa-solid fa-clipboard-check" style="margin-right: 6px;"></i> <span id="funnel-num-2">1.080 (86,4%)</span>
                </div>
                <div class="funnel-stage funnel-stage-3" data-target-tab="consultorios" data-stage-name="Consultórios" title="Clique para ver os Consultórios (890)">
                  <i class="fa-solid fa-user-doctor" style="margin-right: 6px;"></i> <span id="funnel-num-3">890 (71,2%)</span>
                </div>
                <div class="funnel-stage funnel-stage-4" data-target-tab="farmacia" data-stage-name="Exames / Medicação" title="Clique para ver a Farmácia (420)">
                  <i class="fa-solid fa-vial" style="margin-right: 6px;"></i> <span id="funnel-num-4">420 (33,6%)</span>
                </div>
                <div class="funnel-stage funnel-stage-5" data-target-tab="relatorios" data-stage-name="Alta Médica" title="Clique para ver Relatório de Altas (385)">
                  <i class="fa-solid fa-circle-check" style="margin-right: 6px;"></i> <span id="funnel-num-5">385 (30,8%)</span>
                </div>
              </div>

              <!-- Legenda Detalhada Lateral Interativa -->
              <div class="funnel-legend-list">
                <div class="funnel-legend-item" data-target-tab="atendimento" data-stage-name="Recepção">
                  <span style="font-size: 0.8rem; color: #cbd5e1; display: flex; align-items: center;">
                    <span class="funnel-dot" style="background: #3b82f6; color: #3b82f6;"></span> Recepção / Entrada
                  </span>
                  <span style="font-weight: 700; color: #ffffff; font-size: 0.85rem;"><span id="funnel-leg-1">1.250</span> <small style="color: #3b82f6; font-size: 0.72rem;">100%</small></span>
                </div>
                <div class="funnel-legend-item" data-target-tab="estagnacao" data-stage-name="Triagem Manchester">
                  <span style="font-size: 0.8rem; color: #cbd5e1; display: flex; align-items: center;">
                    <span class="funnel-dot" style="background: #10b981; color: #10b981;"></span> Triados Manchester
                  </span>
                  <span style="font-weight: 700; color: #ffffff; font-size: 0.85rem;"><span id="funnel-leg-2">1.080</span> <small style="color: #10b981; font-size: 0.72rem;">86,4%</small></span>
                </div>
                <div class="funnel-legend-item" data-target-tab="consultorios" data-stage-name="Consultórios">
                  <span style="font-size: 0.8rem; color: #cbd5e1; display: flex; align-items: center;">
                    <span class="funnel-dot" style="background: #f59e0b; color: #f59e0b;"></span> Atendidos Consultório
                  </span>
                  <span style="font-weight: 700; color: #ffffff; font-size: 0.85rem;"><span id="funnel-leg-3">890</span> <small style="color: #f59e0b; font-size: 0.72rem;">71,2%</small></span>
                </div>
                <div class="funnel-legend-item" data-target-tab="farmacia" data-stage-name="Exames / Medicação">
                  <span style="font-size: 0.8rem; color: #cbd5e1; display: flex; align-items: center;">
                    <span class="funnel-dot" style="background: #f97316; color: #f97316;"></span> Exames & Medicação
                  </span>
                  <span style="font-weight: 700; color: #ffffff; font-size: 0.85rem;"><span id="funnel-leg-4">420</span> <small style="color: #f97316; font-size: 0.72rem;">33,6%</small></span>
                </div>
                <div class="funnel-legend-item" data-target-tab="relatorios" data-stage-name="Alta Médica">
                  <span style="font-size: 0.8rem; color: #cbd5e1; display: flex; align-items: center;">
                    <span class="funnel-dot" style="background: #34d399; color: #34d399;"></span> Alta / Resolvidos
                  </span>
                  <span style="font-weight: 700; color: #ffffff; font-size: 0.85rem;"><span id="funnel-leg-5">385</span> <small style="color: #34d399; font-size: 0.72rem;">30,8%</small></span>
                </div>
              </div>
            </div>

            <!-- Rodapé de Taxa de Conversão / Resolutividade Final -->
            <div style="margin-top: 14px; padding-top: 12px; border-top: 1px solid rgba(255,255,255,0.08); display: flex; align-items: center; justify-content: space-between;">
              <div>
                <div style="font-size: 0.72rem; text-transform: uppercase; letter-spacing: 0.05em; color: #94a3b8; font-weight: 700;">Taxa de Resolutividade Final</div>
                <div style="font-size: 1.25rem; font-weight: 800; color: #34d399; display: flex; align-items: center; gap: 6px;">
                  <i class="fa-solid fa-arrow-trend-up"></i> <span id="funnel-res-rate">30,8%</span>
                </div>
              </div>
              <div style="text-align: right; width: 45%;">
                <div style="font-size: 0.75rem; color: #94a3b8; margin-bottom: 4px;">Meta: <strong>35,0%</strong> <span style="color: #34d399; font-size: 0.7rem;" id="funnel-goal-text">(88% da meta)</span></div>
                <div style="width: 100%; height: 6px; background: rgba(255,255,255,0.1); border-radius: 10px; overflow: hidden;">
                  <div id="funnel-goal-bar" style="width: 88%; height: 100%; background: linear-gradient(90deg, #10b981, #34d399); border-radius: 10px; transition: width 0.4s ease;"></div>
                </div>
              </div>
            </div>
          </div>

          <!-- Card 2: Ocupação Híbrida de Leitos -->
          <div class="chart-card hybrid-occupancy-card">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px;">
              <h4 class="chart-card-title" style="margin-bottom: 0;">
                <i class="fa-solid fa-bed-pulse" style="color: var(--color-primary);"></i> Ocupação de Leitos por Ala
              </h4>
              <span id="occupancy-total-badge" class="badge-status-pill" style="background: rgba(99, 102, 241, 0.15); border: 1px solid rgba(129, 140, 248, 0.35); color: #818cf8; font-weight: 700; padding: 4px 11px; border-radius: 20px; font-size: 0.78rem; display: inline-flex; align-items: center; gap: 6px;">
                <i class="fa-solid fa-chart-line"></i> 82% Ocupado
              </span>
            </div>

            <div class="hybrid-occupancy-body">
              <!-- Lado Esquerdo: Doughnut com KPI Central Gigante -->
              <div class="doughnut-center-wrap">
                <div class="chart-container-donut">
                  <canvas id="occupancyChart"></canvas>
                </div>
                <div class="donut-center-kpi">
                  <span id="donut-center-percentage" class="donut-kpi-num">82%</span>
                  <span class="donut-kpi-label">Ocupação Geral</span>
                </div>
              </div>

              <!-- Lado Direito: Barras de Progresso Neon por Ala -->
              <div id="ward-progress-list" class="ward-progress-list">
                <!-- Carregado dinamicamente via JS -->
              </div>
            </div>
          </div>

          <!-- Card 3: Classificação de Risco Manchester -->
          <div class="chart-card">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px;">
              <h4 class="chart-card-title" style="margin-bottom: 0;">
                <i class="fa-solid fa-shield-halved" style="color: #ef4444;"></i> Risco Manchester (Gravidade)
              </h4>
              <span class="badge-status-pill" style="background: rgba(239, 68, 68, 0.15); border: 1px solid rgba(239, 68, 68, 0.35); color: #f87171; font-weight: 700; padding: 4px 11px; border-radius: 20px; font-size: 0.78rem;">
                <i class="fa-solid fa-triangle-exclamation"></i> Triagem PS
              </span>
            </div>
            <div class="chart-container" style="height: 240px;">
              <canvas id="manchesterChart"></canvas>
            </div>
          </div>

          <!-- Card 4: Histórico de Atendimentos Mensais -->
          <div class="chart-card">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px;">
              <h4 class="chart-card-title" style="margin-bottom: 0;">
                <i class="fa-solid fa-chart-line" style="color: var(--color-accent);"></i> Histórico de Atendimentos Mensais
              </h4>
              <span class="badge-status-pill" style="background: rgba(0, 242, 254, 0.15); border: 1px solid rgba(0, 242, 254, 0.35); color: #00f2fe; font-weight: 700; padding: 4px 11px; border-radius: 20px; font-size: 0.78rem;">
                <i class="fa-solid fa-calendar-days"></i> Mês Atual
              </span>
            </div>
            <div class="chart-container" style="height: 240px;">
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
        <!-- Coluna Única: Lista com Busca Inteligente -->
        <div class="patients-list-container" style="width: 100%;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; flex-wrap: wrap; gap: 10px;">
            <div style="display: flex; align-items: center; gap: 12px;">
              <h3 style="margin: 0; font-family: 'Outfit'; font-weight: 600;">Pacientes Cadastrados</h3>
              <button id="btn-new-patient" class="btn btn-primary" style="padding: 6px 12px; font-size: 0.85rem; font-weight: 600; border-radius: 8px;"><i class="fa-solid fa-plus"></i> Novo Paciente</button>
            </div>
            <button id="patients-trash-btn" class="btn" style="background-color: rgba(239, 68, 68, 0.1); color: var(--danger-color); border: 1px solid rgba(239, 68, 68, 0.3); padding: 6px 12px; font-size: 0.85rem; font-weight: 600; border-radius: 8px; transition: all 0.2s;"><i class="fa-solid fa-trash-can" style="margin-right: 6px;"></i> Lixeira</button>
          </div>
          
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

      <!-- Modal de Admissão de Paciente -->
      <div id="patient-modal-overlay" style="display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 1000; justify-content: center; align-items: center; backdrop-filter: blur(4px);">
        <div class="patients-form-container" style="background: var(--bg-secondary); width: 95%; max-width: 1000px; max-height: 90vh; display: flex; flex-direction: column; overflow: hidden; border-radius: 12px; padding: 24px; box-shadow: 0 10px 30px rgba(0,0,0,0.3); position: relative; animation: fadeIn 0.3s ease-out;">
          <button type="button" id="btn-close-patient-modal" style="position: absolute; top: 16px; right: 16px; background: transparent; border: none; font-size: 1.2rem; cursor: pointer; color: var(--text-secondary);"><i class="fa-solid fa-xmark"></i></button>
          <h3 id="form-title" style="margin-bottom: 16px; font-family: 'Outfit'; font-weight: 600; display: flex; align-items: center; gap: 8px;">
            <i class="fa-solid fa-id-card" style="color: var(--color-primary);"></i> Admissão de Paciente
          </h3>
          <form id="patient-form" style="display: flex; flex-direction: column; flex: 1; min-height: 0;">
            <input type="hidden" id="editId">
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(400px, 1fr)); gap: 20px; flex: 1; overflow: hidden; align-items: start;">
              <div style="display: flex; flex-direction: column; gap: 16px; overflow-y: auto; padding-right: 8px; max-height: 65vh;" class="custom-scrollbar">

            <!-- SEÇÃO 1: DADOS PESSOAIS & FILIAÇÃO -->
            <div style="background: var(--bg-tertiary); border: 1px solid var(--border-color); border-radius: 10px; padding: 14px; margin-bottom: 16px;">
              <div style="font-size: 0.82rem; font-weight: 700; color: var(--color-primary); text-transform: uppercase; margin-bottom: 12px; display: flex; align-items: center; gap: 6px;">
                <i class="fa-solid fa-user"></i> 1. Dados Pessoais &amp; Filiação
              </div>

              <div class="form-group">
                  <label class="form-label" for="fullName">* Nome Completo (Civil):</label>
                  <input type="text" id="fullName" class="form-input" required placeholder="Nome completo do paciente">
                </div>
                
                <div class="form-row">
                  <div class="form-group">
                    <label class="form-label" for="cpf">* CPF:</label>
                    <input type="text" id="cpf" class="form-input" required placeholder="000.000.000-00" inputmode="numeric">
                  </div>
                  <div class="form-group">
                    <label class="form-label" for="birthDate">* Data de Nascimento:</label>
                    <input type="date" id="birthDate" class="form-input" required>
                  </div>
                </div>

                <div class="form-row">
                  <div class="form-group">
                    <label class="form-label" for="motherName">* Nome da Mãe (Obrigatório SUS):</label>
                    <input type="text" id="motherName" class="form-input" placeholder="Nome completo da mãe" required>
                  </div>
                  <div class="form-group">
                    <label class="form-label" for="fatherName">Nome do Pai:</label>
                    <input type="text" id="fatherName" class="form-input" placeholder="Nome completo do pai (opcional)">
                  </div>
                </div>

                <div class="form-row">
                  <div class="form-group">
                    <label class="form-label" for="organDonor">Doador de Órgãos:</label>
                    <select id="organDonor" class="form-input">
                      <option value="Não Declarado">Não Declarado</option>
                      <option value="Sim">Sim</option>
                      <option value="Não">Não</option>
                    </select>
                  </div>
                  <div class="form-group">
                    <label class="form-label" for="race">Raça / Cor (IBGE):</label>
                    <select id="race" class="form-input">
                      <option value="Parda">Parda</option>
                      <option value="Branca">Branca</option>
                      <option value="Preta">Preta</option>
                      <option value="Amarela">Amarela</option>
                      <option value="Indígena">Indígena</option>
                      <option value="Não Informado">Não Informado</option>
                    </select>
                  </div>
                  <div class="form-group">
                    <label class="form-label" for="religion">Religião / Crença:</label>
                    <input type="text" id="religion" class="form-input" placeholder="Ex: Católica, Evangélica, etc.">
                  </div>
                </div>
              </div> <!-- Fim Seção 1 -->
              </div> <!-- Fim coluna 1 -->
              
              <div style="display: flex; flex-direction: column; gap: 16px; overflow-y: auto; padding-right: 8px; max-height: 65vh;" class="custom-scrollbar"> <!-- Início coluna 2 -->
              <!-- SEÇÃO 2: CONVÊNIO & CONTATO -->
              <div style="background: var(--bg-tertiary); border: 1px solid var(--border-color); border-radius: 10px; padding: 14px; margin-bottom: 0px; flex-shrink: 0;">
                <div style="font-size: 0.82rem; font-weight: 700; color: #10b981; text-transform: uppercase; margin-bottom: 12px; display: flex; align-items: center; gap: 6px;">
                  <i class="fa-solid fa-hospital-user"></i> 2. Convênio &amp; Contato
                </div>

                <div class="form-row">
                  <div class="form-group" style="flex: 1;">
                    <label class="form-label" for="healthPlan">Plano de Saúde / Convênio:</label>
                    <select id="healthPlan" class="form-input">
                      <option value="Particular">Particular</option>
                      <option value="SUS">SUS (Sistema Único de Saúde)</option>
                      <option value="Unimed">Unimed</option>
                      <option value="Bradesco Saúde">Bradesco Saúde</option>
                      <option value="Amil">Amil</option>
                      <option value="SulAmérica">SulAmérica</option>
                      <option value="Outro">Outro Convênio</option>
                    </select>
                  </div>
                  <div class="form-group" style="flex: 1;">
                    <label class="form-label" for="cardNumber">Nº Carteirinha / Cartão SUS:</label>
                    <input type="text" id="cardNumber" class="form-input" placeholder="000 0000 0000 0000">
                  </div>
                </div>

                <div class="form-row">
                  <div class="form-group" style="flex: 1;">
                    <label class="form-label" for="cep">CEP (Busca Auto):</label>
                    <div style="position: relative; display: flex; align-items: center;">
                      <input type="text" id="cep" class="form-input" placeholder="00000-000" inputmode="numeric" maxlength="9" style="padding-right: 36px;">
                      <button type="button" id="btn-search-cep" title="Buscar Endereço pelo CEP" style="position: absolute; right: 8px; background: transparent; border: none; color: #818cf8; cursor: pointer; font-size: 1rem; padding: 4px;">
                        <i class="fa-solid fa-magnifying-glass" id="cep-search-icon"></i>
                        <i class="fa-solid fa-spinner fa-spin" id="cep-loading-icon" style="display: none;"></i>
                      </button>
                    </div>
                  </div>
                  <div class="form-group" style="flex: 2;">
                    <label class="form-label" for="address">Endereço (Rua/Av):</label>
                    <input type="text" id="address" class="form-input" placeholder="Ex: Rua Santa Anita">
                  </div>
                </div>
                
                <div class="form-row">
                  <div class="form-group" style="flex: 1;">
                    <label class="form-label" for="number">Número / Compl.:</label>
                    <input type="text" id="number" class="form-input" placeholder="Ex: 120 / Ap 42">
                  </div>
                  <div class="form-group" style="flex: 1;">
                    <label class="form-label" for="neighborhood">Bairro:</label>
                    <input type="text" id="neighborhood" class="form-input" placeholder="Ex: Vila Promissão">
                  </div>
                  <div class="form-group" style="flex: 1;">
                    <label class="form-label" for="city">Cidade / UF:</label>
                    <input type="text" id="city" class="form-input" placeholder="Ex: Osvaldo Cruz - SP">
                  </div>
                </div>
                
                <div class="form-row">
                  <div class="form-group">
                    <label class="form-label" for="phone">Telefone Fixo:</label>
                    <input type="text" id="phone" class="form-input" placeholder="(18) 3528-5022">
                  </div>
                  <div class="form-group">
                    <label class="form-label" for="cellphone">Celular / WhatsApp:</label>
                    <input type="text" id="cellphone" class="form-input" placeholder="(18) 98817-5809">
                  </div>
                  <div class="form-group">
                    <label class="form-label" for="billingValue">Valor Consulta/Tabela:</label>
                    <input type="text" id="billingValue" class="form-input" placeholder="R$ 0,00">
                  </div>
                </div>
              </div>

              <!-- SEÇÃO 3: RESPONSÁVEL LEGAL (AUTOMÁTICO PARA MENORES DE 18 OU MAIORES DE 65 ANOS) -->
              <div style="background: var(--bg-tertiary); border: 1px solid var(--border-color); border-radius: 10px; padding: 14px; margin-bottom: 0px; flex-shrink: 0;">
                <div style="font-size: 0.82rem; font-weight: 700; color: #f59e0b; text-transform: uppercase; margin-bottom: 12px; display: flex; align-items: center; gap: 6px;">
                  <i class="fa-solid fa-users"></i> 3. Responsável Legal / Acompanhante
                </div>

                <div id="responsible-alert-badge" style="display: none; background: rgba(245, 158, 11, 0.12); border: 1px solid rgba(245, 158, 11, 0.35); color: #fbbf24; border-radius: 8px; padding: 10px 12px; font-size: 0.8rem; margin-bottom: 12px;">
                  <i class="fa-solid fa-circle-info"></i> Preenchimento obrigatório para menores de 18 anos ou maiores de 65 anos.
                </div>

                <div class="form-row">
                  <div class="form-group" style="flex: 2;">
                    <label class="form-label" for="responsibleName" id="lbl-responsibleName">Nome do Responsável:</label>
                    <input type="text" id="responsibleName" class="form-input" placeholder="Nome completo do responsável legal">
                  </div>
                  <div class="form-group" style="flex: 1;">
                    <label class="form-label" for="responsibleCpf" id="lbl-responsibleCpf">CPF Responsável:</label>
                    <input type="text" id="responsibleCpf" class="form-input" placeholder="000.000.000-00" inputmode="numeric">
                  </div>
                </div>

                <div class="form-row">
                  <div class="form-group">
                    <label class="form-label" for="responsiblePhone">Telefone Responsável:</label>
                    <input type="text" id="responsiblePhone" class="form-input" placeholder="(18) 99999-0000">
                  </div>
                  <div class="form-group">
                    <label class="form-label" for="responsibleRelationship">Grau de Parentesco:</label>
                    <select id="responsibleRelationship" class="form-input">
                      <option value="Pai/Mãe">Pai / Mãe</option>
                      <option value="Cônjuge">Cônjuge / Esposo(a)</option>
                      <option value="Filho(a)">Filho(a)</option>
                      <option value="Tutor(a)">Tutor(a) Legal</option>
                      <option value="Outro">Outro Parentesco</option>
                    </select>
                  </div>
                </div>
              </div>
              </div> <!-- Fim coluna 2 -->
            </div> <!-- Fim grid duas colunas -->

              <div style="display: flex; gap: 10px; margin-top: 20px; padding-top: 16px; border-top: 1px solid var(--border-color);">
                <button type="submit" id="submit-btn" class="btn btn-primary" style="flex: 1;">Registrar Paciente</button>
                <button type="button" id="cancel-edit-btn" class="btn" style="background-color: var(--bg-tertiary); color: var(--text-primary); flex: 1;">Cancelar</button>
              </div>
            </form>
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
            <td style="font-weight: 500;">${p.fullName}<br><small style="color: var(--text-muted); font-size: 0.76rem;">Mãe: ${p.motherName || '-'}</small></td>
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
                  data-full-name="${p.fullName || ''}" 
                  data-cpf="${p.cpf || ''}" 
                  data-birth-date="${p.birthDate || ''}"
                  data-mother-name="${p.motherName || ''}"
                  data-father-name="${p.fatherName || ''}"
                  data-organ-donor="${p.organDonor || 'Não Declarado'}"
                  data-race="${p.race || 'Parda'}"
                  data-religion="${p.religion || ''}"
                  data-health-plan="${p.healthPlan || 'Particular'}"
                  data-card-number="${p.cardNumber || ''}"
                  data-responsible-name="${p.responsibleName || ''}"
                  data-responsible-cpf="${p.responsibleCpf || ''}"
                  data-responsible-phone="${p.responsiblePhone || ''}"
                  data-responsible-relationship="${p.responsibleRelationship || 'Pai/Mãe'}"
                  data-cep="${p.cep || ''}"
                  data-address="${p.address || ''}"
                  data-number="${p.number || ''}"
                  data-neighborhood="${p.neighborhood || ''}"
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
          
          if (document.getElementById('motherName')) document.getElementById('motherName').value = btn.getAttribute('data-mother-name') || '';
          if (document.getElementById('fatherName')) document.getElementById('fatherName').value = btn.getAttribute('data-father-name') || '';
          if (document.getElementById('organDonor')) document.getElementById('organDonor').value = btn.getAttribute('data-organ-donor') || 'Não Declarado';
          if (document.getElementById('race')) document.getElementById('race').value = btn.getAttribute('data-race') || 'Parda';
          if (document.getElementById('religion')) document.getElementById('religion').value = btn.getAttribute('data-religion') || '';
          if (document.getElementById('healthPlan')) document.getElementById('healthPlan').value = btn.getAttribute('data-health-plan') || 'Particular';
          if (document.getElementById('cardNumber')) document.getElementById('cardNumber').value = btn.getAttribute('data-card-number') || '';
          if (document.getElementById('responsibleName')) document.getElementById('responsibleName').value = btn.getAttribute('data-responsible-name') || '';
          if (document.getElementById('responsibleCpf')) document.getElementById('responsibleCpf').value = btn.getAttribute('data-responsible-cpf') || '';
          if (document.getElementById('responsiblePhone')) document.getElementById('responsiblePhone').value = btn.getAttribute('data-responsible-phone') || '';
          if (document.getElementById('responsibleRelationship')) document.getElementById('responsibleRelationship').value = btn.getAttribute('data-responsible-relationship') || 'Pai/Mãe';

          const cepEl = document.getElementById('cep');
          if (cepEl) cepEl.value = btn.getAttribute('data-cep') || '';
          document.getElementById('address').value = btn.getAttribute('data-address');
          const numEl = document.getElementById('number');
          if (numEl) numEl.value = btn.getAttribute('data-number') || '';
          const neighEl = document.getElementById('neighborhood');
          if (neighEl) neighEl.value = btn.getAttribute('data-neighborhood') || '';
          document.getElementById('city').value = btn.getAttribute('data-city');
          document.getElementById('phone').value = btn.getAttribute('data-phone');
          document.getElementById('cellphone').value = btn.getAttribute('data-cellphone');
          document.getElementById('billingValue').value = btn.getAttribute('data-billing-value');

          document.getElementById('form-title').innerHTML = '<i class="fa-solid fa-pen-to-square" style="color: var(--color-primary);"></i> Editar Paciente';
          document.getElementById('submit-btn').textContent = "Salvar Alterações";

          checkAgeValidation();

          const modalOverlay = document.getElementById('patient-modal-overlay');
          if (modalOverlay) {
            modalOverlay.style.display = 'flex';
          }
        });
      });

      document.querySelectorAll('.btn-icon-delete').forEach(btn => {
        btn.addEventListener('click', async () => {
          const id = btn.getAttribute('data-delete-id');
          const confirmed = await showCustomConfirm({
            title: 'Excluir Paciente',
            message: 'Tem certeza de que deseja excluir este paciente do sistema?',
            confirmText: 'Sim, Excluir',
            cancelText: 'Cancelar',
            type: 'danger'
          });

          if (confirmed) {
            try {
              const deleteRes = await apiFetch(`${API_URL}/patients/${id}`, { method: 'DELETE' });
              if (deleteRes.ok) {
                loadAndRenderTable();
                if (document.getElementById('editId').value === id) {
                  resetForm();
                }
                state.loading = true;
              } else {
                showCustomAlert({ title: 'Erro', message: 'Erro ao excluir paciente.', type: 'danger' });
              }
            } catch (err) {
              showCustomAlert({ title: 'Erro', message: 'Erro ao conectar-se à API.', type: 'danger' });
            }
          }
        });
      });
    };

    // Validação Automática de Responsável Legal por Idade (<18 ou >65)
    const checkAgeValidation = () => {
      const birthVal = document.getElementById('birthDate')?.value;
      if (!birthVal) return;
      const birth = new Date(birthVal + 'T12:00:00');
      const today = new Date();
      let age = today.getFullYear() - birth.getFullYear();
      const m = today.getMonth() - birth.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;

      const alertBadge = document.getElementById('responsible-alert-badge');
      const respName = document.getElementById('responsibleName');
      const respCpf = document.getElementById('responsibleCpf');
      const lblName = document.getElementById('lbl-responsibleName');
      const lblCpf = document.getElementById('lbl-responsibleCpf');

      if (age < 18 || age > 65) {
        if (alertBadge) {
          alertBadge.style.display = 'block';
          alertBadge.innerHTML = `<i class="fa-solid fa-triangle-exclamation"></i> <strong>Idade (${age} anos):</strong> Menores de 18 anos ou maiores de 65 anos exigem o preenchimento do Responsável Legal.`;
        }
        if (respName) respName.required = true;
        if (respCpf) respCpf.required = true;
        if (lblName) lblName.textContent = '* Nome do Responsável (Obrigatório):';
        if (lblCpf) lblCpf.textContent = '* CPF Responsável (Obrigatório):';
      } else {
        if (alertBadge) alertBadge.style.display = 'none';
        if (respName) respName.required = false;
        if (respCpf) respCpf.required = false;
        if (lblName) lblName.textContent = 'Nome do Responsável:';
        if (lblCpf) lblCpf.textContent = 'CPF Responsável:';
      }
    };

    const birthInput = document.getElementById('birthDate');
    if (birthInput) {
      birthInput.addEventListener('change', checkAgeValidation);
      birthInput.addEventListener('input', checkAgeValidation);
    }

    // Máscara e Busca Automática de CEP via ViaCEP + BrasilAPI + Backend
    const cepInput = document.getElementById('cep');
    const btnSearchCep = document.getElementById('btn-search-cep');
    let lastSearchedCep = '';

    const executeCepLookup = async () => {
      if (!cepInput) return;
      let rawVal = cepInput.value || '';
      let cleanVal = rawVal.replace(/\D/g, '');
      if (cleanVal.length > 8) cleanVal = cleanVal.substring(0, 8);

      if (cleanVal.length > 5) {
        cepInput.value = cleanVal.substring(0, 5) + '-' + cleanVal.substring(5);
      } else {
        cepInput.value = cleanVal;
      }

      if (cleanVal.length !== 8) return;
      if (cleanVal === lastSearchedCep) return;
      lastSearchedCep = cleanVal;

      const searchIcon = document.getElementById('cep-search-icon');
      const loadingIcon = document.getElementById('cep-loading-icon');
      if (searchIcon) searchIcon.style.display = 'none';
      if (loadingIcon) loadingIcon.style.display = 'inline-block';

      try {
        let foundData = null;

        // 1. Tentativa via ViaCEP (Direto com CORS)
        try {
          const r1 = await fetch(`https://viacep.com.br/ws/${cleanVal}/json/`);
          if (r1.ok) {
            const d1 = await r1.json();
            if (!d1.erro && d1.localidade) {
              foundData = {
                street: d1.logradouro || '',
                neighborhood: d1.bairro || '',
                city: `${d1.localidade} - ${d1.uf}`
              };
            }
          }
        } catch (e) {}

        // 2. Fallback via BrasilAPI
        if (!foundData) {
          try {
            const r2 = await fetch(`https://brasilapi.com.br/api/cep/v1/${cleanVal}`);
            if (r2.ok) {
              const d2 = await r2.json();
              if (d2.city) {
                foundData = {
                  street: d2.street || '',
                  neighborhood: d2.neighborhood || '',
                  city: `${d2.city} - ${d2.state}`
                };
              }
            }
          } catch (e) {}
        }

        // 3. Fallback via Backend API
        if (!foundData) {
          try {
            const r3 = await apiFetch(`/api/cep/${cleanVal}`);
            if (r3.ok) {
              const p3 = await r3.json();
              if (p3.status === 'success' && p3.data) {
                foundData = {
                  street: p3.data.street || p3.data.address || '',
                  neighborhood: p3.data.neighborhood || '',
                  city: p3.data.city
                };
              }
            }
          } catch (e) {}
        }

        if (foundData) {
          const addressInput = document.getElementById('address');
          const neighborhoodInput = document.getElementById('neighborhood');
          const cityInput = document.getElementById('city');
          const numberInput = document.getElementById('number');

          if (addressInput && foundData.street) addressInput.value = foundData.street;
          if (neighborhoodInput && foundData.neighborhood) neighborhoodInput.value = foundData.neighborhood;
          if (cityInput && foundData.city) cityInput.value = foundData.city;

          showToast(`Endereço localizado: ${foundData.city}`);

          if (numberInput) {
            numberInput.focus();
          }
        } else {
          showCustomAlert({
            title: 'CEP Não Encontrado',
            message: `Não foi possível localizar o endereço para o CEP <strong>${cepInput.value}</strong>. Por favor, digite o endereço manualmente.`,
            type: 'warning'
          });
        }
      } catch (err) {
        console.error('Erro na busca de CEP:', err);
      } finally {
        if (searchIcon) searchIcon.style.display = 'inline-block';
        if (loadingIcon) loadingIcon.style.display = 'none';
      }
    };

    if (cepInput) {
      cepInput.addEventListener('input', executeCepLookup);
      cepInput.addEventListener('change', executeCepLookup);
      cepInput.addEventListener('blur', executeCepLookup);
    }
    if (btnSearchCep) {
      btnSearchCep.addEventListener('click', () => {
        lastSearchedCep = '';
        executeCepLookup();
      });
    }

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
      document.getElementById('form-title').innerHTML = '<i class="fa-solid fa-id-card" style="color: var(--color-primary);"></i> Admissão de Paciente';
      document.getElementById('submit-btn').textContent = "Registrar Paciente";
      const alertBadge = document.getElementById('responsible-alert-badge');
      if (alertBadge) alertBadge.style.display = 'none';
      
      const modalOverlay = document.getElementById('patient-modal-overlay');
      if (modalOverlay) modalOverlay.style.display = 'none';
    };

    // Registrar cancelamento e botões do modal
    document.getElementById('cancel-edit-btn')?.addEventListener('click', resetForm);
    document.getElementById('btn-close-patient-modal')?.addEventListener('click', resetForm);
    document.getElementById('btn-new-patient')?.addEventListener('click', () => {
      resetForm();
      const modalOverlay = document.getElementById('patient-modal-overlay');
      if (modalOverlay) modalOverlay.style.display = 'flex';
    });

    // Lixeira de pacientes
    document.getElementById('patients-trash-btn').addEventListener('click', () => {
      showTrashModal('patients');
    });

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
      const motherName = document.getElementById('motherName')?.value || '';
      const fatherName = document.getElementById('fatherName')?.value || '';
      const organDonor = document.getElementById('organDonor')?.value || 'Não Declarado';
      const race = document.getElementById('race')?.value || 'Parda';
      const religion = document.getElementById('religion')?.value || '';
      const healthPlan = document.getElementById('healthPlan')?.value || 'Particular';
      const cardNumber = document.getElementById('cardNumber')?.value || '';
      const responsibleName = document.getElementById('responsibleName')?.value || '';
      const responsibleCpf = document.getElementById('responsibleCpf')?.value || '';
      const responsiblePhone = document.getElementById('responsiblePhone')?.value || '';
      const responsibleRelationship = document.getElementById('responsibleRelationship')?.value || 'Pai/Mãe';
      const cep = document.getElementById('cep')?.value || '';
      const address = document.getElementById('address').value;
      const number = document.getElementById('number')?.value || '';
      const neighborhood = document.getElementById('neighborhood')?.value || '';
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

        const payload = {
          fullName, cpf, birthDate, motherName, fatherName, organDonor, race, religion,
          healthPlan, cardNumber, responsibleName, responsibleCpf, responsiblePhone, responsibleRelationship,
          cep, address, number, neighborhood, city, phone, cellphone, billingValue
        };

        const res = await apiFetch(url, {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (res.ok) {
          resetForm();
          dataCache.delete('patients');
          await loadAndRenderTable();
          showToast(`✅ Paciente ${isEdit ? 'atualizado' : 'cadastrado'} com sucesso!`);
          state.loading = true;
        } else {
          showCustomAlert({ title: 'Erro', message: data.message || 'Falha ao salvar paciente.', type: 'danger' });
        }
      } catch (err) {
        showCustomAlert({ title: 'Erro', message: 'Erro ao conectar-se à API.', type: 'danger' });
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
  } else if (state.activeTab === 'consultorios') {
    renderConsultingRoomsTab();
  } else if (state.activeTab === 'farmacia') {
    renderPharmacyTab();
  } else if (state.activeTab === 'tv_panel') {
    renderTVPanelTab();
  } else if (state.activeTab === 'agenda') {
    renderAgendaTab();
  } else if (state.activeTab === 'atendimento') {
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
              <div id="card-kpi-triage" class="atd-metric-card" onclick="filterKanbanColumn('triage')" title="Filtrar por Fila de Triagem" style="background:rgba(139,92,246,0.12); color:#a78bfa; border:1px solid rgba(139,92,246,0.3); border-radius:20px; height:38px; padding:0 14px; display:flex; align-items:center; gap:8px; font-size:0.82rem; font-weight:600; cursor:pointer;">
                <i class="fa-solid fa-stethoscope" style="font-size:0.9rem; color:#8b5cf6;"></i>
                <strong id="kpi-triagem-num" style="font-size:0.95rem; font-weight:800; color:#a78bfa;">0</strong>
                <span>Triagem</span>
              </div>

              <div id="card-kpi-waiting" class="atd-metric-card" onclick="filterKanbanColumn('waiting')" title="Filtrar por Pacientes Aguardando Médico" style="background:rgba(245,158,11,0.12); color:#fbbf24; border:1px solid rgba(245,158,11,0.3); border-radius:20px; height:38px; padding:0 14px; display:flex; align-items:center; gap:8px; font-size:0.82rem; font-weight:600; cursor:pointer;">
                <i class="fa-solid fa-hourglass-half" style="font-size:0.9rem; color:#f59e0b;"></i>
                <strong id="kpi-aguardando-num" style="font-size:0.95rem; font-weight:800; color:#fbbf24;">0</strong>
                <span>Ag. Médico</span>
              </div>

              <div id="card-kpi-active" class="atd-metric-card" onclick="filterKanbanColumn('active')" title="Filtrar por Atendimentos em Consulta" style="background:rgba(16,185,129,0.12); color:#34d399; border:1px solid rgba(16,185,129,0.3); border-radius:20px; height:38px; padding:0 14px; display:flex; align-items:center; gap:8px; font-size:0.82rem; font-weight:600; cursor:pointer;">
                <i class="fa-solid fa-user-doctor" style="font-size:0.9rem; color:#10b981;"></i>
                <strong id="kpi-consulta-num" style="font-size:0.95rem; font-weight:800; color:#34d399;">0</strong>
                <span>Em Consulta</span>
              </div>

              <div id="card-kpi-all" class="atd-metric-card active-filter" onclick="filterKanbanColumn('all')" title="Exibir Todas as Colunas" style="background:rgba(255,255,255,0.05); color:var(--text-primary); border:1px solid rgba(255,255,255,0.15); border-radius:20px; height:38px; padding:0 14px; display:flex; align-items:center; gap:8px; font-size:0.82rem; font-weight:600; cursor:pointer;">
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

    // === KANBAN DE ATENDIMENTOS — NOVA IMPLEMENTAÇÃO ===
    let admissionPatients = [];
    let selectedPatient = null;
    let allEncounters = [];
    let allHistory = [];
    let activeKanbanTimers = [];

    // Utilitário de tempo de espera
    const getWaitTimeText = (since) => {
      const s = Math.max(0, Math.floor((Date.now() - new Date(since).getTime()) / 1000));
      if (s < 60) return `${s}s`;
      const m = Math.floor(s / 60);
      if (m < 60) return `${m}min`;
      return `${Math.floor(m/60)}h ${m%60}m`;
    };

    // Mapa de cores Manchester
    const getMC = (color) => ({
      'Vermelho': { bg:'#7f1d1d', border:'#dc2626', text:'#fca5a5', label:'Emergência' },
      'Laranja':  { bg:'#431407', border:'#ea580c', text:'#fb923c', label:'Muito Urgente' },
      'Amarelo':  { bg:'#422006', border:'#ca8a04', text:'#fde047', label:'Urgente' },
      'Verde':    { bg:'#052e16', border:'#16a34a', text:'#86efac', label:'Pouco Urgente' },
      'Azul':     { bg:'#0c1a4e', border:'#2563eb', text:'#93c5fd', label:'Não Urgente' },
    }[color] || { bg:'var(--bg-tertiary)', border:'var(--border-color)', text:'var(--text-secondary)', label: color || '—' });

    // === PAINEL DE ADMISSÃO (slide-in drawer) ===
    const openAdmissionPanel = () => {
      const p = document.getElementById('admission-panel');
      const o = document.getElementById('admission-overlay');
      p.style.display = 'flex';
      o.style.display = 'block';
      setTimeout(() => { p.style.transform = 'translateX(0)'; }, 10);
      loadAdmissionPatients();
    };
    const closeAdmissionPanel = () => {
      const p = document.getElementById('admission-panel');
      const o = document.getElementById('admission-overlay');
      p.style.transform = 'translateX(100%)';
      setTimeout(() => { p.style.display = 'none'; o.style.display = 'none'; }, 350);
      selectedPatient = null;
      document.getElementById('selected-patient-id').value = '';
      document.getElementById('adm-selected-info').style.display = 'none';
      document.getElementById('btn-admit-urgencia').disabled = true;
      document.getElementById('btn-admit-ambulatorio').disabled = true;
    };

    const loadAdmissionPatients = async () => {
      try {
        const res = await apiFetch(`${API_URL}/patients`);
        admissionPatients = await res.json();
        renderAdmList(admissionPatients);
      } catch {
        document.getElementById('adm-patient-list').innerHTML = '<div style="padding:20px;text-align:center;color:var(--text-muted);font-size:0.83rem;">Erro ao carregar.</div>';
      }
    };
    const renderAdmList = (list) => {
      const c = document.getElementById('adm-patient-list');
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

    document.getElementById('adm-search-input').addEventListener('input', e => {
      const q = removeAccents(e.target.value.toLowerCase());
      renderAdmList(admissionPatients.filter(p => removeAccents(p.fullName).toLowerCase().includes(q) || p.cpf.includes(q)));
    });
    document.getElementById('btn-open-admission-panel').addEventListener('click', openAdmissionPanel);
    document.getElementById('btn-close-admission-panel').addEventListener('click', closeAdmissionPanel);
    document.getElementById('admission-overlay').addEventListener('click', closeAdmissionPanel);

    const createEncounter = async (type) => {
      const patientId = document.getElementById('selected-patient-id').value;
      if (!patientId) return;
      const btn = document.getElementById(type === 'Urgencia' ? 'btn-admit-urgencia' : 'btn-admit-ambulatorio');
      btn.disabled = true; btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Admitindo...';
      try {
        const res = await apiFetch(`${API_URL}/encounters`, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ patientId, type }) });
        const d = await res.json();
        if (res.ok) {
          showToast(`✅ ${selectedPatient?.fullName || 'Paciente'} admitido(a)!`);
          closeAdmissionPanel();
          await loadAndRenderKanban();
        } else {
          showToast(`❌ ${d.message || 'Erro ao admitir.'}`, true);
          btn.disabled = false;
          btn.innerHTML = type === 'Urgencia' ? '<i class="fa-solid fa-truck-medical"></i> Urgência (PS)' : '<i class="fa-solid fa-user-doctor"></i> Ambulatório';
        }
      } catch { showToast('❌ Erro de conexão.', true); btn.disabled = false; }
    };
    document.getElementById('btn-admit-urgencia').addEventListener('click', () => createEncounter('Urgencia'));
    document.getElementById('btn-admit-ambulatorio').addEventListener('click', () => createEncounter('Ambulatorial'));

    // === KANBAN ===
    const colorPri = { Vermelho:5, Laranja:4, Amarelo:3, Verde:2, Azul:1 };

    const loadAndRenderKanban = async () => {
      try {
        const res = await apiFetch(`${API_URL}/encounters`);
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

      // Update KPI chips
      document.getElementById('kpi-triagem-num').textContent = triage.length;
      document.getElementById('kpi-aguardando-num').textContent = waiting.length;
      document.getElementById('kpi-consulta-num').textContent = active.length;
      document.getElementById('count-triage').textContent = triage.length;
      document.getElementById('count-waiting').textContent = waiting.length;
      document.getElementById('count-active').textContent = active.length;

      // Render columns
      const setCol = (id, items, emptyColor, emptyMsg, buildFn, bindFn) => {
        const col = document.getElementById(id);
        if (!col) return;
        if (!items.length) { col.innerHTML = `<div style="text-align:center;color:var(--text-muted);padding:30px 16px;font-size:0.82rem;"><i class="fa-solid fa-check-circle" style="color:${emptyColor};font-size:1.5rem;display:block;margin-bottom:8px;"></i>${emptyMsg}</div>`; return; }
        col.innerHTML = items.map(buildFn).join('');
        items.forEach(e => { bindFn(e); startLiveTimer(e.id, e.admitted_at); });
      };

      setCol('col-triage', triage, '#8b5cf6', 'Fila vazia', buildTriageCard, (e) => {
        const b = document.querySelector(`#col-triage [data-enc-id="${e.id}"].btn-triar`);
        if (b) b.addEventListener('click', () => openTriageModal(e.id, e.patientName));
      });
      setCol('col-waiting', waiting, '#f59e0b', 'Nenhum aguardando', buildWaitCard, (e) => {
        const b = document.querySelector(`#col-waiting [data-enc-id="${e.id}"].btn-call-consult`);
        if (b) b.addEventListener('click', () => updateStatus(e.id, 'Em_Atendimento', e.patientName, e.manchesterColor));
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
      <div style="background:var(--bg-tertiary);border:1px solid var(--border-color);border-left:4px solid #8b5cf6;border-radius:var(--radius-md);padding:14px;margin-bottom:4px;">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px;">
          <div style="font-weight:700;font-size:0.88rem;color:var(--text-primary);">${e.patientName}</div>
          <span id="timer-${e.id}" style="font-size:0.7rem;color:#8b5cf6;font-family:monospace;background:rgba(139,92,246,0.1);padding:2px 6px;border-radius:4px;white-space:nowrap;"></span>
        </div>
        <div style="font-size:0.75rem;color:var(--text-muted);margin-bottom:12px;"><i class="fa-solid fa-tag" style="color:#8b5cf6;"></i> ${e.type==='Urgencia'?'Urgência / PS':'Ambulatório'}</div>
        <button class="btn btn-primary btn-triar" data-enc-id="${e.id}" style="width:100%;font-size:0.8rem;padding:7px;background:linear-gradient(135deg,#8b5cf6,#6d28d9);border:none;cursor:pointer;">
          <i class="fa-solid fa-user-nurse"></i> Realizar Triagem
        </button>
      </div>`;

    const buildWaitCard = (e) => {
      const mc = getMC(e.manchesterColor);
      return `
        <div style="background:var(--bg-tertiary);border:1px solid var(--border-color);border-left:4px solid ${mc.border};border-radius:var(--radius-md);padding:14px;margin-bottom:4px;">
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
          <button class="btn btn-primary btn-call-consult" data-enc-id="${e.id}" style="width:100%;font-size:0.8rem;padding:7px;cursor:pointer;">
            <i class="fa-solid fa-bullhorn"></i> Chamar para Consulta
          </button>
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
        <div style="background:var(--bg-tertiary);border:1px solid rgba(16,185,129,0.3);border-left:4px solid ${isObs ? '#f59e0b' : '#10b981'};border-radius:var(--radius-md);padding:14px;margin-bottom:4px;">
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
        const res = await apiFetch(`${API_URL}/encounters/${id}/status`, { method:'PUT', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ status }) });
        if (res.ok) {
          if (status === 'Em_Atendimento') {
            apiFetch('/api/tv/call', {
              method: 'POST',
              body: JSON.stringify({
                patientName: patientName,
                roomName: 'Consultório 01',
                manchesterColor: manchesterColor || 'Verde'
              })
            }).catch(() => {});

            if ('speechSynthesis' in window) {
              const text = `Atenção: Paciente ${patientName}, favor dirigir-se ao Consultório 01.`;
              const utterance = new SpeechSynthesisUtterance(text);
              utterance.lang = 'pt-BR';
              utterance.rate = 0.9;
              window.speechSynthesis.speak(utterance);
            }
          }
          const msgs = { 'Em_Atendimento': `📣 ${patientName} chamado(a) para consulta!`, 'Finalizado': `✅ Atendimento de ${patientName} finalizado.` };
          showToast(msgs[status] || 'Status atualizado.');
          await loadAndRenderKanban();
        } else { showToast('❌ Erro ao atualizar status.', true); }
      } catch { showToast('❌ Erro de conexão.', true); }
    };

    // === MODAL DE TRIAGEM ===
    const openTriageModal = (id, name) => {
      document.getElementById('triage-encounter-id').value = id;
      document.getElementById('triage-patient-name').textContent = name;
      document.getElementById('triage-modal').style.display = 'flex';
    };
    const closeTriageModal = () => { document.getElementById('triage-modal').style.display = 'none'; document.getElementById('triage-form').reset(); };
    document.getElementById('close-triage-modal').addEventListener('click', closeTriageModal);
    document.getElementById('btn-cancel-triage').addEventListener('click', closeTriageModal);
    document.getElementById('triage-modal').addEventListener('click', e => { if (e.target === document.getElementById('triage-modal')) closeTriageModal(); });

    document.getElementById('triage-pa').addEventListener('input', e => {
      let v = e.target.value.replace(/\D/g,'').substring(0,6);
      e.target.value = v.length <= 3 ? v : v.slice(0,3)+'/'+v.slice(3);
    });

    document.getElementById('triage-form').addEventListener('submit', async e => {
      e.preventDefault();
      const radio = document.querySelector('input[name="manchesterColor"]:checked');
      if (!radio) { showToast('❌ Selecione a classificação de risco.', true); return; }
      const btn = e.target.querySelector('button[type="submit"]');
      btn.disabled = true; btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Salvando...';
      try {
        const res = await apiFetch(`${API_URL}/encounters/${document.getElementById('triage-encounter-id').value}/triage`, {
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
        if (res.ok) { closeTriageModal(); showToast('✅ Triagem salva! Paciente na fila médica.'); await loadAndRenderKanban(); }
        else { const d=await res.json(); showToast(`❌ ${d.message||'Erro ao salvar triagem.'}`,true); }
      } catch { showToast('❌ Erro de conexão.',true); }
      finally { btn.disabled=false; btn.innerHTML='<i class="fa-solid fa-floppy-disk"></i> Salvar Triagem'; }
    });

    // === HISTÓRICO ===
    const renderHistory = (list) => {
      const el = document.getElementById('history-list');
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

    document.getElementById('btn-show-history').addEventListener('click', async () => {
      document.getElementById('history-panel').style.display = 'flex';
      try {
        const res = await apiFetch(`${API_URL}/encounters`);
        const encJson = await res.json();
        const encountersList = Array.isArray(encJson) ? encJson : (encJson?.data || []);
        allHistory = encountersList.filter(e => e.status === 'Finalizado').reverse();
        renderHistory(allHistory);
      } catch { document.getElementById('history-list').innerHTML = '<div style="text-align:center;color:var(--text-muted);padding:40px;">Erro ao carregar histórico.</div>'; }
    });
    document.getElementById('close-history-panel').addEventListener('click', () => document.getElementById('history-panel').style.display = 'none');
    document.getElementById('history-panel').addEventListener('click', e => { if (e.target === document.getElementById('history-panel')) document.getElementById('history-panel').style.display = 'none'; });
    document.getElementById('history-search').addEventListener('input', e => {
      const q = removeAccents(e.target.value.toLowerCase());
      renderHistory(allHistory.filter(enc => removeAccents(enc.patientName||'').toLowerCase().includes(q)));
    });

    // Carregar Kanban e auto-refresh a cada 30s
    loadAndRenderKanban();
    const _atdAutoRefresh = setInterval(() => {
      if (state.activeTab === 'atendimento') loadAndRenderKanban();
      else clearInterval(_atdAutoRefresh);
    }, 30000);
    
  } else if (state.activeTab === 'estagnacao') {
    renderStagnationTab(contentArea);
  } else if (state.activeTab === 'leitos') {
      renderLeitosTab();
    } else if (state.activeTab === 'financeiro') {
      renderReportsTab(contentArea);
      setTimeout(() => {
        const btnFin = document.getElementById('tab-btn-financial');
        if (btnFin) btnFin.click();
      }, 20);
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
                  <span class="status-badge" id="turso-settings-status-badge">
                    <span class="status-indicator"></span>
                    Verificando...
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

          <!-- Accordion de Centro de Documentação & Manuais -->
          <details class="settings-accordion" open>
            <summary class="settings-accordion-header">
              <i class="fa-solid fa-book-medical" style="color: #a5b4fc;"></i> Centro de Documentação &amp; Manuais do Usuário
            </summary>
            <div class="settings-accordion-body">
              <p style="color: var(--text-secondary); margin-bottom: 16px; line-height: 1.6;">
                Acesse a documentação unificada e exaustiva do <strong>Health Nexus v1.2.1</strong>. Disponível em portal web interativo com navegação rápida e em documento PDF corporativo para download ou impressão.
              </p>
              <div style="display: flex; gap: 14px; flex-wrap: wrap; margin-top: 14px;">
                <a href="manual_do_usuario.html" target="_blank" class="btn btn-primary" style="display: inline-flex; align-items: center; gap: 8px; text-decoration: none; font-weight: 600; padding: 10px 18px; border-radius: 8px;">
                  <i class="fa-solid fa-globe"></i> Abrir Portal Web Interativo (HTML)
                </a>
                <a href="Manual_do_Usuario_Health_Nexus.pdf" target="_blank" class="btn" style="display: inline-flex; align-items: center; gap: 8px; text-decoration: none; font-weight: 600; padding: 10px 18px; border-radius: 8px; background: rgba(99, 102, 241, 0.15); border: 1px solid rgba(99, 102, 241, 0.4); color: #a5b4fc;">
                  <i class="fa-solid fa-file-pdf"></i> Baixar Manual Oficial (PDF)
                </a>
                <a href="MANUAL_DO_USUARIO_HEALTH_NEXUS.md" target="_blank" class="btn" style="display: inline-flex; align-items: center; gap: 8px; text-decoration: none; font-weight: 500; padding: 10px 18px; border-radius: 8px; background: rgba(255, 255, 255, 0.05); border: 1px solid var(--border-color); color: #cbd5e1;">
                  <i class="fa-solid fa-file-code"></i> Código Fonte (Markdown)
                </a>
              </div>
            </div>
          </details>

          <!-- Accordion de Sincronização Cloud Turso -->
          <details class="settings-accordion">
            <summary class="settings-accordion-header">
              <i class="fa-solid fa-cloud-arrow-up" style="color: #38bdf8;"></i> Sincronização com Banco Turso Cloud
            </summary>
            <div class="settings-accordion-body">
              <p style="color: var(--text-secondary); margin-bottom: 16px; line-height: 1.6;">
                Gerencie a sincronização bidirecional entre o computador local e a nuvem <strong>Turso Cloud DB</strong>.
              </p>
              
              <div class="sync-info-box" style="margin-bottom: 18px;">
                <div class="sync-info-item">
                  <span><i class="fa-solid fa-desktop" style="color: #818cf8;"></i> Último Backup Local:</span>
                  <val id="cfg-sync-local-time">Carregando...</val>
                </div>
                <div class="sync-info-divider"></div>
                <div class="sync-info-item">
                  <span><i class="fa-solid fa-cloud" style="color: #38bdf8;"></i> Versão no Turso Cloud:</span>
                  <val id="cfg-sync-cloud-time">Carregando...</val>
                </div>
              </div>

              <div class="settings-form-group" style="margin-bottom: 16px;">
                <label style="display: block; color: var(--text-secondary); margin-bottom: 6px; font-size: 13px;">URL do Banco de Dados Turso (Ex: libsql://...)</label>
                <input type="text" id="turso-cfg-url" class="form-input" style="width: 100%;" placeholder="libsql://...">
              </div>
              <div class="settings-form-group" style="margin-bottom: 16px;">
                <label style="display: block; color: var(--text-secondary); margin-bottom: 6px; font-size: 13px;">Token de Autenticação (JWT)</label>
                <input type="password" id="turso-cfg-token" class="form-input" style="width: 100%;" placeholder="ey...">
                <small style="color: #64748b; font-size: 12px; margin-top: 4px; display: block;">Deixe em branco para não alterar se já estiver configurado.</small>
              </div>
              <div style="display: flex; gap: 12px; align-items: center; flex-wrap: wrap; margin-top: 16px; padding-top: 16px; border-top: 1px solid var(--border-color);">
                <button id="btn-save-turso-cfg" style="background-color: #6366f1; color: white; border: none; padding: 8px 16px; border-radius: 6px; font-weight: 500; display: flex; align-items: center; gap: 8px; cursor: pointer; transition: opacity 0.2s;" onmouseover="this.style.opacity='0.9'" onmouseout="this.style.opacity='1'">
                  <i class="fa-solid fa-save"></i> Salvar Credenciais
                </button>
                <button id="btn-test-turso-cfg" style="background-color: #334155; color: white; border: none; padding: 8px 16px; border-radius: 6px; font-weight: 500; display: flex; align-items: center; gap: 8px; cursor: pointer; transition: opacity 0.2s;" onmouseover="this.style.opacity='0.9'" onmouseout="this.style.opacity='1'">
                  <i class="fa-solid fa-arrows-rotate"></i> Testar Conexão
                </button>
                <button id="btn-sync-turso-download" style="background-color: #f59e0b; color: white; border: none; padding: 8px 16px; border-radius: 6px; font-weight: 500; display: flex; align-items: center; gap: 8px; cursor: pointer; transition: opacity 0.2s;" onmouseover="this.style.opacity='0.9'" onmouseout="this.style.opacity='1'">
                  <i class="fa-solid fa-cloud-arrow-down"></i> Restaurar do Banco
                </button>
                <button id="btn-sync-turso-now" style="background-color: #10b981; color: white; border: none; padding: 8px 16px; border-radius: 6px; font-weight: 500; display: flex; align-items: center; gap: 8px; cursor: pointer; transition: opacity 0.2s;" onmouseover="this.style.opacity='0.9'" onmouseout="this.style.opacity='1'">
                  <i class="fa-solid fa-cloud-arrow-up"></i> Sincronizar Agora
                </button>

                <div id="turso-last-sync-container" style="margin-left: auto; font-size: 12px; color: #94a3b8; display: block;">
                  Última sincronização: <span id="turso-last-sync-time" style="color: #10b981;">---</span>
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

                <button id="btn-seed-300" class="btn btn-primary" style="margin-left: 8px;">
                  <i class="fa-solid fa-users"></i> Gerar 300 Registros de Teste
                </button>
                <button id="btn-reset" class="btn" style="background-color: rgba(255, 50, 80, 0.15); border-color: var(--color-danger); color: var(--color-danger); margin-left: 8px;">
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

          <!-- Accordion de Gerenciamento de Usuários (Apenas Master/Admin) -->
          <details class="settings-accordion">
            <summary class="settings-accordion-header">
              <i class="fa-solid fa-users-gear"></i> Gerenciamento de Usuários
              ${getRolePermissions(state.user).canManageUsers ? '<span class="status-badge" style="margin-left:auto;"><span class="status-indicator success"></span>' + (getRolePermissions(state.user).role || 'MASTER').toUpperCase() + '</span>' : '<span class="status-badge" style="margin-left:auto; background:rgba(255,0,0,0.1);"><i class="fa-solid fa-lock"></i> BLOQUEADO</span>'}
            </summary>
            <div class="settings-accordion-body">
              ${getRolePermissions(state.user).canManageUsers ? `
                <p style="color: var(--text-secondary); margin-bottom: 16px; line-height: 1.6;">
                  <strong>Bem-vindo, ${getRolePermissions(state.user).label}.</strong> Aqui você poderá editar perfis, resetar senhas e alterar permissões de outros usuários da clínica.
                </p>
                <div class="settings-actions">
                  <button id="btn-edit-permissions" class="btn btn-primary">
                    <i class="fa-solid fa-users-gear"></i> Gerenciar Usuários &amp; Permissões
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

    // Botão de Gerenciamento de Usuários
    const btnEditPerms = document.getElementById('btn-edit-permissions');
    if (btnEditPerms) {
      btnEditPerms.addEventListener('click', () => {
        showUserManagementModal();
      });
    }

    // Atualiza datas da seção de sincronização na aba Configurações
    (async () => {
      try {
        const statusData = await getSyncStatus();
        if (statusData) {
          const localEl = document.getElementById('cfg-sync-local-time');
          const cloudEl = document.getElementById('cfg-sync-cloud-time');
          if (localEl) localEl.textContent = formatSyncDate(statusData.lastLocalBackup);
          if (cloudEl) cloudEl.textContent = formatSyncDate(statusData.lastCloudBackup);
        }

        const tursoRes = await apiFetch(`${API_URL}/settings/turso`);
        if (tursoRes.ok) {
          const tursoData = await tursoRes.json();
          // Compatibilidade: hasToken pode ser bool (local) ou inferido do token mascarado (Vercel)
          const hasToken = tursoData.hasToken || (tursoData.token && tursoData.token.length > 0 && tursoData.token !== '');
          const cloudConnected = tursoData.cloud_connected !== undefined ? tursoData.cloud_connected : hasToken;

          document.getElementById('turso-cfg-url').value = tursoData.url || '';
          if (hasToken) {
            document.getElementById('turso-cfg-token').value = tursoData.token || '********************************';
          }

          // No Vercel, marcar campos como somente leitura e mostrar aviso
          if (tursoData.isVercel) {
            const urlInput = document.getElementById('turso-cfg-url');
            const tokenInput = document.getElementById('turso-cfg-token');
            if (urlInput) { urlInput.readOnly = true; urlInput.style.opacity = '0.6'; }
            if (tokenInput) { tokenInput.readOnly = true; tokenInput.style.opacity = '0.6'; }
            const formSection = document.getElementById('turso-cfg-url')?.closest('.sync-settings-section, div');
            // Inserir aviso de modo Vercel se ainda não existe
            if (!document.getElementById('vercel-mode-notice')) {
              const notice = document.createElement('div');
              notice.id = 'vercel-mode-notice';
              notice.style.cssText = 'background:rgba(56,189,248,0.1);border:1px solid rgba(56,189,248,0.3);border-radius:10px;padding:10px 14px;margin-bottom:12px;color:#38bdf8;font-size:0.82rem;display:flex;align-items:center;gap:8px;';
              notice.innerHTML = '<i class="fa-solid fa-cloud"></i> <strong>Modo Vercel:</strong> Credenciais gerenciadas pelo servidor. Não é necessário alterar.';
              const urlInput2 = document.getElementById('turso-cfg-url');
              if (urlInput2 && urlInput2.parentNode) urlInput2.parentNode.insertBefore(notice, urlInput2);
            }
          }

          const statusBadge = document.getElementById('turso-settings-status-badge');
          if (statusBadge) {
            if (cloudConnected) {
              statusBadge.innerHTML = '<span class="status-indicator success"></span>Conectado (AWS Us-East-1)';
            } else {
              statusBadge.innerHTML = '<span class="status-indicator" style="background: red;"></span>Desconectado';
            }
          }
          if (tursoData.lastSync) {
            document.getElementById('turso-last-sync-time').textContent = new Date(tursoData.lastSync).toLocaleString('pt-BR');
          } else {
            document.getElementById('turso-last-sync-time').textContent = 'Nenhuma';
          }
        }
      } catch (err) {
        console.warn('Erro ao carregar configuracoes Turso:', err);
      }
    })();

    const btnSaveTurso = document.getElementById('btn-save-turso-cfg');
    if (btnSaveTurso) {
      btnSaveTurso.addEventListener('click', async () => {
        const url = document.getElementById('turso-cfg-url').value;
        const token = document.getElementById('turso-cfg-token').value;
        btnSaveTurso.disabled = true;
        const oldHtml = btnSaveTurso.innerHTML;
        btnSaveTurso.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Salvando...';
        try {
          const res = await apiFetch(`${API_URL}/settings/turso`, {
            method: 'POST',
            body: JSON.stringify({ url, token })
          });
          const data = await res.json();
          if (res.ok) {
            showCustomAlert({ title: 'Sucesso', message: data.message, type: 'success' });
            if (typeof checkInitialSync === 'function') {
              checkInitialSync();
            }
          } else {
            showCustomAlert({ title: 'Erro', message: data.message, type: 'error' });
          }
        } catch (e) {
          showCustomAlert({ title: 'Erro', message: 'Falha de rede ao salvar credenciais.', type: 'error' });
        } finally {
          btnSaveTurso.disabled = false;
          btnSaveTurso.innerHTML = oldHtml;
        }
      });
    }

    const btnTestTurso = document.getElementById('btn-test-turso-cfg');
    if (btnTestTurso) {
      btnTestTurso.addEventListener('click', async () => {
        btnTestTurso.disabled = true;
        const oldHtml = btnTestTurso.innerHTML;
        btnTestTurso.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Testando...';
        try {
          const res = await apiFetch(`${API_URL}/settings/turso/test`);
          const data = await res.json();
          if (res.ok) {
            showCustomAlert({ title: 'Sucesso', message: data.message, type: 'success' });
          } else {
            showCustomAlert({ title: 'Erro', message: data.message, type: 'error' });
          }
        } catch (e) {
          showCustomAlert({ title: 'Erro', message: 'Falha de rede ao testar conexão.', type: 'error' });
        } finally {
          btnTestTurso.disabled = false;
          btnTestTurso.innerHTML = oldHtml;
        }
      });
    }

    const btnSyncNow = document.getElementById('btn-sync-turso-now');
    if (btnSyncNow) {
      btnSyncNow.addEventListener('click', async () => {
        btnSyncNow.disabled = true;
        const originalHtml = btnSyncNow.innerHTML;
        btnSyncNow.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Sincronizando...';
        try {
          await syncManager.pushToCloud(true);
          const statusData = await getSyncStatus();
          if (statusData) {
            const tursoLastEl = document.getElementById('turso-last-sync-time');
            if (tursoLastEl) {
              tursoLastEl.textContent = new Date().toLocaleString('pt-BR');
            }
          }
        } finally {
          btnSyncNow.disabled = false;
          btnSyncNow.innerHTML = originalHtml;
        }
      });
    }

    const btnSyncDownload = document.getElementById('btn-sync-turso-download');
    if (btnSyncDownload) {
      btnSyncDownload.addEventListener('click', async () => {
        const confirmed = await showCustomConfirm({
          title: 'Baixar Dados do Turso Cloud',
          message: 'Deseja baixar e substituir os dados locais pelos dados armazenados no Turso Cloud?',
          confirmText: 'Sim, Baixar Dados',
          cancelText: 'Cancelar',
          type: 'warning'
        });

        if (confirmed) {
          btnSyncDownload.disabled = true;
          const originalHtml = btnSyncDownload.innerHTML;
          btnSyncDownload.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Baixando...';
          try {
            await syncManager.pullFromCloud();
          } finally {
            btnSyncDownload.disabled = false;
            btnSyncDownload.innerHTML = originalHtml;
          }
        }
      });
    }



    document.getElementById('btn-seed-300').addEventListener('click', async () => {
      const confirmAction = await showCustomConfirm({
        title: '🏥 Simulação Completa do Sistema',
        message: `<strong>Esta ação irá:</strong>
          <br>• Limpar todos os dados de simulação anteriores
          <br>• Gerar <strong>80 pacientes</strong> com CPFs únicos
          <br>• Gerar <strong>12 médicos</strong> com especialidades variadas
          <br>• Gerar <strong>60 agendamentos</strong> (passados, hoje e futuros)
          <br>• Gerar <strong>45 atendimentos</strong> com triagem Manchester completa
          <br>• Gerar <strong>20 leitos</strong> (12 ocupados + fila de internação)
          <br>• Gerar <strong>90 títulos financeiros</strong> (pagos, pendentes, vencidos)
          <br>• Gerar <strong>15 chamadas TV</strong> com timestamps escalonados
          <br>• Gerar <strong>30 medicamentos</strong> com alertas de estoque
          <br>• Gerar <strong>10 escalas de plantão</strong> (hoje e amanhã)
          <br><br><em>Usuários admin/mazzarowysk serão preservados.</em>`,
        confirmText: '🚀 Executar Simulação Completa',
        cancelText: 'Cancelar',
        type: 'warning'
      });
      if (!confirmAction) return;

      showLoadingModal('⚙️ Executando simulação completa do sistema...');
      try {
        await new Promise(r => setTimeout(r, 200));
        const result = await generateMockData();
        dataCache.clear();
        dataCacheTimestamps.clear();
        hideLoadingModal();
        const paidCount = (result.financial_installments || []).filter(f => f.status === 'Pago').length;
        const pendingCount = (result.financial_installments || []).filter(f => f.status === 'Pendente').length;
        const overdueCount = (result.financial_installments || []).filter(f => f.status === 'Vencido').length;
        const occupiedBeds = (result.beds || []).filter(b => b.status === 'Ocupado').length;
        await showCustomAlert({
          title: '✅ Simulação Concluída com Sucesso!',
          message: `<strong>Dados gerados:</strong>
            <br>👤 ${(result.patients || []).length} pacientes únicos
            <br>👨‍⚕️ ${(result.doctors || []).length} médicos cadastrados
            <br>📅 ${(result.appointments || []).length} agendamentos
            <br>🏥 ${(result.encounters || []).length} atendimentos | ${(result.triages || []).length} triagens
            <br>🛏️ ${occupiedBeds}/${(result.beds || []).length} leitos ocupados
            <br>💰 ${paidCount} pagos | ${pendingCount} pendentes | ${overdueCount} vencidos
            <br>📺 ${(result.tv_calls || []).length} chamadas TV
            <br>💊 ${(result.medications || []).length} medicamentos no estoque
            <br>📋 ${(result.duty_schedules || []).length} escalas de plantão`,
          type: 'success'
        });
        window.location.reload();
      } catch (e) {
        hideLoadingModal();
        console.error('Erro ao gerar dados mockados:', e);
        showCustomAlert({ title: 'Erro ao Gerar Dados', message: 'Erro: ' + (e.message || e), type: 'danger' });
      }
    });

    document.getElementById('btn-reset').addEventListener('click', async () => {
      const confirmed = await showCustomConfirm({
        title: 'Limpar Banco de Dados',
        message: 'Tem certeza de que deseja APAGAR TODOS os pacientes do banco Turso? Esta ação não pode ser desfeita.',
        confirmText: 'Sim, Apagar Tudo',
        cancelText: 'Cancelar',
        type: 'danger'
      });

      if (confirmed) {
        try {
          const res = await apiFetch(`${API_URL}/settings/reset`, { method: 'POST' });
          const data = await res.json();
          if (res.ok) {
            showCustomAlert({ title: 'Sucesso', message: 'Todos os dados de pacientes foram removidos.', type: 'success' });
            state.loading = true;
          } else {
            showCustomAlert({ title: 'Erro', message: data.message || 'Falha ao resetar banco.', type: 'danger' });
          }
        } catch (err) {
          showCustomAlert({ title: 'Erro de Conexão', message: 'Erro ao conectar-se à API.', type: 'danger' });
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

  // Buscar contagem real de pacientes se activePatients for undefined/null ou 0
  let realActivePatients = d.activePatients;
  if (realActivePatients === undefined || realActivePatients === null || realActivePatients === 0) {
    try {
      const resP = await apiFetch(`${API_URL}/patients`);
      if (resP.ok) {
        const pList = await resP.json();
        const arr = Array.isArray(pList) ? pList : (pList.data || []);
        realActivePatients = arr.length;
      }
    } catch(e) {}
  }
  
  let totalRealRevenue = 0;
  let revenueLoaded = false;
  try {
    const resF = await apiFetch(`${API_URL}/financial`);
    if (resF.ok) {
      const fList = await resF.json();
      const arrF = Array.isArray(fList) ? fList : (fList.data || []);
      totalRealRevenue = arrF.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
      revenueLoaded = true;
    }
  } catch(e) {}

  const billingSum = {
    totalRevenue: revenueLoaded ? totalRealRevenue : (d.billingSummary?.totalRevenue ?? 0),
    pendingClaims: d.billingSummary?.pendingClaims ?? 0
  };

  state.dashboardData = {
    activePatients: realActivePatients ?? 0,
    occupancyRate: d.occupancyRate ?? 0,
    averageWaitTimeMinutes: d.averageWaitTimeMinutes ?? 0,
    dailyAppointmentsCount: d.dailyAppointmentsCount ?? 0,
    billingSummary: billingSum,
    occupancyData: (d.occupancyData && d.occupancyData.length > 0) ? d.occupancyData : [
      { label: 'UTI Adulto', value: 0, color: '#818cf8' },
      { label: 'Enfermaria', value: 0, color: '#f472b6' },
      { label: 'Pediatria', value: 0, color: '#38bdf8' },
      { label: 'Maternidade', value: 0, color: '#fbbf24' },
      { label: 'Disponíveis', value: 100, color: '#34d399' }
    ],
    appointmentsHistory: (d.appointmentsHistory && d.appointmentsHistory.length > 0) ? d.appointmentsHistory : [
      { label: 'Seg', urgencia: 0, ambulatorial: 0 },
      { label: 'Ter', urgencia: 0, ambulatorial: 0 },
      { label: 'Qua', urgencia: 0, ambulatorial: 0 },
      { label: 'Qui', urgencia: 0, ambulatorial: 0 },
      { label: 'Sex', urgencia: 0, ambulatorial: 0 },
      { label: 'Sáb', urgencia: 0, ambulatorial: 0 },
      { label: 'Dom', urgencia: 0, ambulatorial: 0 }
    ]
  };

  state.loading = false;
}

// --- FUNÇÃO PARA INICIALIZAR GRÁFICOS CHART.JS MODERNOS (DARK NEON GLASS) ---
function initDashboardCharts(data) {
  if (!data) return;

  const occupancyCtx = document.getElementById('occupancyChart');
  const appointmentsCtx = document.getElementById('appointmentsChart');

  const occupancyData = (data.occupancyData && data.occupancyData.length > 0) ? data.occupancyData : [
    { label: 'UTI Adulto', value: 0, color: '#f43f5e' },
    { label: 'Enfermaria', value: 0, color: '#6366f1' },
    { label: 'Pediatria', value: 0, color: '#00f2fe' },
    { label: 'Maternidade', value: 0, color: '#f59e0b' },
    { label: 'Disponíveis', value: 100, color: '#10b981' }
  ];

  const apptHistory = (data.appointmentsHistory && data.appointmentsHistory.length > 0) ? data.appointmentsHistory : [
    { label: 'Seg', urgencia: 0, ambulatorial: 0 },
    { label: 'Ter', urgencia: 0, ambulatorial: 0 },
    { label: 'Qua', urgencia: 0, ambulatorial: 0 },
    { label: 'Qui', urgencia: 0, ambulatorial: 0 },
    { label: 'Sex', urgencia: 0, ambulatorial: 0 },
    { label: 'Sáb', urgencia: 0, ambulatorial: 0 },
    { label: 'Dom', urgencia: 0, ambulatorial: 0 }
  ];

  const ChartClass = window.Chart || (typeof Chart !== 'undefined' ? Chart : null);
  if (!ChartClass) {
    console.warn('[DashboardCharts] Chart.js não encontrado no ambiente.');
    return;
  }

  // 1. Gráfico Híbrido de Ocupação de Leitos (Doughnut Neon + KPI Central + Progress Bars)
  if (occupancyCtx) {
    if (occupancyCtx._chartInstance) occupancyCtx._chartInstance.destroy();
    occupancyCtx.style.cursor = 'pointer';

    const ctx = occupancyCtx.getContext('2d');

    const neonColors = [
      '#f43f5e', // UTI Adulto (Rose Neon)
      '#6366f1', // Enfermaria (Indigo Neon)
      '#00f2fe', // Pediatria (Ciano Electric)
      '#f59e0b', // Maternidade (Amber Warm)
      '#10b981'  // Disponíveis (Emerald Glow)
    ];

    // Cálculos de Totais & Ocupação %
    let totalBeds = 0;
    let occupiedBeds = 0;
    occupancyData.forEach(item => {
      totalBeds += item.value;
      if (item.label !== 'Disponíveis') {
        occupiedBeds += item.value;
      }
    });
    const occupancyPct = totalBeds > 0 ? Math.round((occupiedBeds / totalBeds) * 100) : 0;

    // Atualizar KPI Central & Badge de Status
    const donutCenterNum = document.getElementById('donut-center-percentage');
    if (donutCenterNum) donutCenterNum.textContent = `${occupancyPct}%`;

    const statusBadge = document.getElementById('occupancy-total-badge');
    if (statusBadge) {
      const statusColor = occupancyPct > 85 ? '#f43f5e' : (occupancyPct > 70 ? '#f59e0b' : '#10b981');
      const statusText = occupancyPct > 85 ? 'Lotação Crítica' : (occupancyPct > 70 ? 'Alta Demanda' : 'Estável');
      statusBadge.style.borderColor = statusColor;
      statusBadge.style.color = statusColor;
      statusBadge.innerHTML = `<i class="fa-solid fa-bed-pulse"></i> ${occupancyPct}% Ocupado (${statusText})`;
    }

    // Renderizar Lista de Barras de Progresso por Ala
    const progressListEl = document.getElementById('ward-progress-list');
    if (progressListEl) {
      progressListEl.innerHTML = '';
      const wardIcons = {
        'UTI Adulto': 'fa-heart-pulse',
        'Enfermaria': 'fa-hospital-user',
        'Pediatria': 'fa-baby',
        'Maternidade': 'fa-person-breastfeeding',
        'Disponíveis': 'fa-bed'
      };

      occupancyData.forEach((item, idx) => {
        const color = item.color || neonColors[idx % neonColors.length];
        const pct = totalBeds > 0 ? Math.round((item.value / totalBeds) * 100) : 0;
        const icon = wardIcons[item.label] || 'fa-procedures';

        const wardItem = document.createElement('div');
        wardItem.className = 'ward-progress-item';
        wardItem.style.cursor = 'pointer';
        wardItem.onclick = () => { if (typeof switchTab === 'function') switchTab('leitos'); };

        wardItem.innerHTML = `
          <div class="ward-progress-header">
            <span class="ward-name">
              <i class="fa-solid ${icon}" style="color: ${color}; width: 14px;"></i>
              ${item.label}
            </span>
            <span class="ward-stats">
              <strong style="color: ${color}; font-size: 0.88rem;">${item.value}</strong> leitos <span style="opacity: 0.65; font-size: 0.75rem;">(${pct}%)</span>
            </span>
          </div>
          <div class="ward-bar-track">
            <div class="ward-bar-fill" style="width: ${pct}%; background: linear-gradient(90deg, ${color}, ${color}dd); box-shadow: 0 0 10px ${color}88;"></div>
          </div>
        `;
        progressListEl.appendChild(wardItem);
      });
    }

    const inst = new ChartClass(ctx, {
      type: 'doughnut',
      data: {
        labels: occupancyData.map(item => item.label),
        datasets: [{
          data: occupancyData.map(item => item.value),
          backgroundColor: occupancyData.map((item, idx) => item.color || neonColors[idx % neonColors.length]),
          borderWidth: 3,
          borderColor: 'rgba(11, 8, 22, 0.95)',
          borderRadius: 6,
          spacing: 3,
          hoverOffset: 8
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '78%',
        animation: {
          animateScale: true,
          animateRotate: true,
          duration: 1200,
          easing: 'easeOutQuart'
        },
        onClick: () => {
          if (typeof switchTab === 'function') switchTab('leitos');
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: 'rgba(18, 14, 34, 0.94)',
            titleColor: '#00f2fe',
            bodyColor: '#f8fafc',
            borderColor: 'rgba(0, 242, 254, 0.35)',
            borderWidth: 1,
            padding: 12,
            boxPadding: 6,
            usePointStyle: true,
            titleFont: { family: 'Plus Jakarta Sans', size: 12, weight: 'bold' },
            bodyFont: { family: 'Plus Jakarta Sans', size: 11 },
            callbacks: {
              label: (context) => {
                const label = context.label || '';
                const val = context.raw || 0;
                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                const pct = Math.round((val / total) * 100);
                return ` ${label}: ${val} leitos (${pct}%)`;
              }
            }
          }
        }
      }
    });
    occupancyCtx._chartInstance = inst;
  }

  // 2. Gráfico de Histórico Mensal/Semanal (Line Area Wave Neon)
  if (appointmentsCtx) {
    if (appointmentsCtx._chartInstance) appointmentsCtx._chartInstance.destroy();
    appointmentsCtx.style.cursor = 'pointer';

    const ctx2 = appointmentsCtx.getContext('2d');
    
    // Gradiente Linear de Fundo Neon Ciano/Roxo
    const fillGradient = ctx2.createLinearGradient(0, 0, 0, 220);
    fillGradient.addColorStop(0, 'rgba(0, 242, 254, 0.38)');
    fillGradient.addColorStop(0.5, 'rgba(99, 102, 241, 0.15)');
    fillGradient.addColorStop(1, 'rgba(11, 8, 22, 0.0)');

    const labels = apptHistory.map(item => item.label);
    const valuesTotal = apptHistory.map(item => (item.urgencia || 0) + (item.ambulatorial || 0));
    const valuesUrgencia = apptHistory.map(item => item.urgencia || 0);

    const inst2 = new ChartClass(ctx2, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [
          {
            label: 'Atendimentos Totais',
            data: valuesTotal,
            fill: true,
            backgroundColor: fillGradient,
            borderColor: '#00f2fe',
            borderWidth: 3.5,
            tension: 0.4,
            pointBackgroundColor: '#00f2fe',
            pointBorderColor: '#ffffff',
            pointBorderWidth: 2,
            pointRadius: 5,
            pointHoverRadius: 8,
            pointHoverBackgroundColor: '#ffffff',
            pointHoverBorderColor: '#00f2fe',
            pointHoverBorderWidth: 3
          },
          {
            label: 'Urgência (Triagem)',
            data: valuesUrgencia,
            fill: false,
            borderColor: '#e026b8',
            borderWidth: 2.5,
            borderDash: [5, 5],
            tension: 0.4,
            pointBackgroundColor: '#e026b8',
            pointBorderColor: '#ffffff',
            pointBorderWidth: 1.5,
            pointRadius: 3.5,
            pointHoverRadius: 6
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: {
          duration: 1200,
          easing: 'easeOutQuart'
        },
        onClick: () => {
          if (typeof switchTab === 'function') switchTab('atendimento');
        },
        plugins: {
          legend: {
            display: true,
            position: 'top',
            align: 'end',
            labels: {
              color: '#cbd5e1',
              font: { family: 'Plus Jakarta Sans', size: 11, weight: '600' },
              usePointStyle: true,
              boxWidth: 8,
              padding: 14
            }
          },
          tooltip: {
            backgroundColor: 'rgba(18, 14, 34, 0.92)',
            titleColor: '#00f2fe',
            bodyColor: '#f8fafc',
            borderColor: 'rgba(0, 242, 254, 0.35)',
            borderWidth: 1,
            padding: 12,
            boxPadding: 6,
            usePointStyle: true,
            titleFont: { family: 'Plus Jakarta Sans', size: 12, weight: 'bold' },
            bodyFont: { family: 'Plus Jakarta Sans', size: 11 }
          }
        },
        scales: {
          x: {
            grid: {
              color: 'rgba(255, 255, 255, 0.05)',
              drawBorder: false
            },
            ticks: {
              color: '#94a3b8',
              font: { family: 'Plus Jakarta Sans', size: 11, weight: '500' }
            }
          },
          y: {
            grid: {
              color: 'rgba(255, 255, 255, 0.05)',
              drawBorder: false
            },
            ticks: {
              color: '#94a3b8',
              font: { family: 'Plus Jakarta Sans', size: 11, weight: '500' }
            }
          }
        }
      }
    });
    appointmentsCtx._chartInstance = inst2;
  }

  // 3. Gráfico de Classificação de Risco Manchester (Doughnut Risco PS)
  const manchesterCtx = document.getElementById('manchesterChart');
  if (manchesterCtx) {
    if (manchesterCtx._chartInstance) manchesterCtx._chartInstance.destroy();
    const ctxM = manchesterCtx.getContext('2d');
    const instM = new ChartClass(ctxM, {
      type: 'doughnut',
      data: {
        labels: ['Vermelho (Emergência)', 'Laranja (Muito Urgente)', 'Amarelo (Urgente)', 'Verde (Pouco Urgente)', 'Azul (Não Urgente)'],
        datasets: [{
          data: [8, 18, 42, 24, 8],
          backgroundColor: ['#ef4444', '#f97316', '#eab308', '#10b981', '#3b82f6'],
          borderWidth: 3,
          borderColor: 'rgba(11, 8, 22, 0.95)',
          borderRadius: 6,
          spacing: 3
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '65%',
        animation: { duration: 1200, easing: 'easeOutQuart' },
        onClick: () => {
          if (typeof switchTab === 'function') switchTab('estagnacao');
        },
        plugins: {
          legend: {
            display: true,
            position: 'right',
            labels: {
              color: '#cbd5e1',
              font: { family: 'Plus Jakarta Sans', size: 10, weight: '600' },
              usePointStyle: true,
              boxWidth: 8,
              padding: 10
            }
          },
          tooltip: {
            backgroundColor: 'rgba(18, 14, 34, 0.92)',
            titleColor: '#00f2fe',
            bodyColor: '#f8fafc',
            borderColor: 'rgba(239, 68, 68, 0.35)',
            borderWidth: 1,
            padding: 10
          }
        }
      }
    });
    manchesterCtx._chartInstance = instM;
  }

  // 4. Inicialização da Interatividade do Funil
  initInteractiveFunnel();
}

function initInteractiveFunnel() {
  const periodPills = document.querySelectorAll('.funnel-period-pill');
  const stageEls = document.querySelectorAll('.funnel-stage, .funnel-legend-item');

  const periodData = {
    hoje: {
      nums: ['142 (100%)', '124 (87,3%)', '102 (71,8%)', '48 (33,8%)', '44 (31,0%)'],
      legs: ['142', '124', '102', '48', '44'],
      resRate: '31,0%',
      goalText: '(88% da meta)',
      goalWidth: '88%'
    },
    semana: {
      nums: ['860 (100%)', '748 (86,9%)', '612 (71,1%)', '292 (33,9%)', '268 (31,1%)'],
      legs: ['860', '748', '612', '292', '268'],
      resRate: '31,1%',
      goalText: '(89% da meta)',
      goalWidth: '89%'
    },
    mes: {
      nums: ['1.250 (100%)', '1.080 (86,4%)', '890 (71,2%)', '420 (33,6%)', '385 (30,8%)'],
      legs: ['1.250', '1.080', '890', '420', '385'],
      resRate: '30,8%',
      goalText: '(88% da meta)',
      goalWidth: '88%'
    }
  };

  periodPills.forEach(pill => {
    pill.addEventListener('click', () => {
      periodPills.forEach(p => p.classList.remove('active'));
      pill.classList.add('active');

      const period = pill.dataset.period || 'hoje';
      const data = periodData[period] || periodData['hoje'];

      data.nums.forEach((val, idx) => {
        const el = document.getElementById(`funnel-num-${idx + 1}`);
        if (el) el.textContent = val;
      });

      data.legs.forEach((val, idx) => {
        const el = document.getElementById(`funnel-leg-${idx + 1}`);
        if (el) el.textContent = val;
      });

      const resRateEl = document.getElementById('funnel-res-rate');
      if (resRateEl) resRateEl.textContent = data.resRate;

      const goalTextEl = document.getElementById('funnel-goal-text');
      if (goalTextEl) goalTextEl.textContent = data.goalText;

      const goalBarEl = document.getElementById('funnel-goal-bar');
      if (goalBarEl) goalBarEl.style.width = data.goalWidth;

      if (typeof showToast === 'function') {
        showToast(`📊 Funil recalculado para o período: ${period.toUpperCase()}`);
      }
    });
  });

  stageEls.forEach(el => {
    el.addEventListener('click', () => {
      const targetTab = el.dataset.targetTab;
      const stageName = el.dataset.stageName;

      if (stageName && typeof showToast === 'function') {
        showToast(`🎯 Direcionando visão detalhada: ${stageName}`);
      }

      if (targetTab && typeof switchTab === 'function') {
        switchTab(targetTab);
      }
    });
  });
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
// Inicializar aplicativo (chamada movida para o final do arquivo)

// Heartbeat para manter o servidor rodando apenas enquanto a aba estiver aberta
setInterval(() => {
  // fetch('/api/heartbeat', { method: 'POST' }).catch(() => {});
}, 3000);

// Encerramento do servidor apenas em producao (nao mata o servidor ao recarregar em dev)
window.addEventListener('beforeunload', () => {
  if (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
    navigator.sendBeacon('/api/shutdown');
  }
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
    const encJson = await encRes.json();
    const encounters = Array.isArray(encJson) ? encJson : (encJson?.data || []);
    const encounter = encounters.find(e => e.id === encounterId);
    
    if (encounter) {
      document.getElementById('pep-patient-name').textContent = encounter.patientName || 'Paciente';
      const dateVal = encounter.created_at || encounter.timestamp || Date.now();
      document.getElementById('pep-encounter-status').textContent = new Date(dateVal).toLocaleString('pt-BR');
    }
    
    // 2. Buscar dados da Triagem para Sidebar
    const trRes = await apiFetch(`${API_URL}/triages`);
    const trJson = await trRes.json();
    const triages = Array.isArray(trJson) ? trJson : (trJson?.data || []);
    const triage = triages.find(t => t.encounterId === encounterId || t.patientId === encounter?.patientId);
    
    const trColor = triage?.manchesterColor || triage?.color || triage?.label || encounter?.manchesterColor || encounter?.manchesterLabel || 'AMARELO';
    const bp = triage?.bloodPressure || (triage?.bloodPressureSystolic && triage?.bloodPressureDiastolic ? `${triage.bloodPressureSystolic}/${triage.bloodPressureDiastolic}` : null) || encounter?.bloodPressure || '-';
    const hr = triage?.heartRateBpm || triage?.heartRate || encounter?.heartRateBpm || '-';
    const temp = triage?.temperatureCelsius || triage?.temperature || encounter?.temperatureCelsius || '-';
    const weight = triage?.weightKg || triage?.weight || encounter?.weightKg || '-';
    const complaints = triage?.complaints || triage?.notes || encounter?.complaints || '-';
    const oxygenSaturation = triage?.oxygenSaturation || triage?.spo2 || encounter?.oxygenSaturation || '-';
    const painScale = triage?.painScale !== undefined ? triage.painScale : (encounter?.painScale !== undefined ? encounter.painScale : '-');

    const badge = document.getElementById('pep-manchester-badge');
    if (badge) {
      badge.textContent = trColor.toUpperCase();
      const hex = getManchesterColorHex(trColor);
      badge.style.backgroundColor = `${hex}22`;
      badge.style.color = hex;
      badge.style.border = `1px solid ${hex}55`;
    }
    
    const bpEl = document.getElementById('pep-bp'); if (bpEl) bpEl.textContent = bp;
    const hrEl = document.getElementById('pep-hr'); if (hrEl) hrEl.textContent = hr;
    const tempEl = document.getElementById('pep-temp'); if (tempEl) tempEl.textContent = temp;
    const weightEl = document.getElementById('pep-weight'); if (weightEl) weightEl.textContent = weight;
    const spo2El = document.getElementById('pep-spo2'); if (spo2El) spo2El.textContent = oxygenSaturation;
    const painEl = document.getElementById('pep-pain'); if (painEl) painEl.textContent = painScale;
    const compEl = document.getElementById('pep-complaints'); if (compEl) compEl.textContent = complaints;
    
    // 3. Buscar Nota Clínica se existir
    const noteRes = await apiFetch(`${API_URL}/encounters/${encounterId}/notes`);
    const noteRaw = await noteRes.json();
    const note = (noteRaw && typeof noteRaw === 'object') ? (noteRaw.data || noteRaw) : null;
    
    const isClosed = note && note.isClosed === 1;
    
    if (note && (note.subjectiveContent || note.objectiveContent || note.assessmentContent || note.planContent)) {
      document.getElementById('pep-subjective').value = note.subjectiveContent || '';
      document.getElementById('pep-objective').value = note.objectiveContent || '';
      document.getElementById('pep-assessment').value = note.assessmentContent || '';
      document.getElementById('pep-plan').value = note.planContent || '';
      
      const badge = document.getElementById('pep-status-badge');
      if (badge) {
        if (isClosed) {
          badge.innerHTML = '<i class="fa-solid fa-lock"></i> ASSINADO E FECHADO';
          badge.className = 'badge-signed';
        } else {
          badge.innerHTML = '<i class="fa-solid fa-file-pen"></i> RASCUNHO SALVO';
          badge.className = 'badge-draft';
        }
      }
    } else {
      const badge = document.getElementById('pep-status-badge');
      if (badge) {
        badge.innerHTML = '<i class="fa-solid fa-pencil"></i> NOVO ATENDIMENTO';
        badge.className = 'badge-draft';
      }
    }
    
    // Bloquear campos se estiver assinado
    const fields = ['pep-subjective', 'pep-objective', 'pep-assessment', 'pep-plan'];
    fields.forEach(f => {
      const el = document.getElementById(f);
      if (el) el.disabled = isClosed;
    });
    
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

// Imprimir PEP atual em PDF
window.printCurrentPEP = async function() {
  if (!currentPEPEncounterId) {
    showToast('Nenhum atendimento ativo selecionado.');
    return;
  }
  
  try {
    const encRes = await apiFetch(`${API_URL}/encounters`);
    const encJson = await encRes.json();
    const encounters = Array.isArray(encJson) ? encJson : (encJson?.data || []);
    const encounter = encounters.find(e => e.id === currentPEPEncounterId);
    
    let patId = encounter?.patientId;
    let patName = encounter?.patientName || 'Paciente';
    
    if (!patId) {
      const patRes = await apiFetch(`${API_URL}/patients`);
      const patJson = await patRes.json();
      const patients = Array.isArray(patJson) ? patJson : (patJson?.data || []);
      const patient = patients.find(p => p.fullName === patName);
      patId = patient ? patient.id : currentPEPEncounterId;
    }
    
    await generatePatientPDF(patId, patName);
  } catch (err) {
    console.error('Erro ao gerar PDF do PEP:', err);
    showToast('Erro ao gerar PDF do prontuário.');
  }
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
    const data = resp.data || resp;
    let patient = data.patient || (data.fullName ? data : {});
    let encounters = data.encounters || [];
    let appointments = data.appointments || [];

    // Fallback: se dados do paciente estiverem incompletos, busca diretamente na tabela de pacientes
    if (!patient.fullName || !patient.cpf) {
      try {
        const patRes = await apiFetch(`${API_URL}/patients`);
        const patJson = await patRes.json();
        const allPatients = Array.isArray(patJson) ? patJson : (patJson?.data || []);
        const found = allPatients.find(p => p.id === patientId || (patientName && p.fullName === patientName));
        if (found) patient = { ...patient, ...found };
      } catch (e) {}
    }

    if (encounters.length === 0) {
      try {
        const encRes = await apiFetch(`${API_URL}/encounters`);
        const encJson = await encRes.json();
        const allEncs = Array.isArray(encJson) ? encJson : (encJson?.data || []);
        encounters = allEncs.filter(e => e.patientId === patientId || (patient?.fullName && e.patientName === patient.fullName) || (patientName && e.patientName === patientName));
      } catch (e) {}
    }

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
// --- ABA CONSULTÓRIOS ---

async function loadConsultingRooms() {
  const dashboard = document.getElementById('rooms-dashboard');
  if (!dashboard) return;

  try {
    const todayIso = new Date().toISOString().split('T')[0];
    const [roomsRes, aptRes] = await Promise.all([
      apiFetch('/api/consulting-rooms'),
      apiFetch('/api/appointments?date=' + todayIso)
    ]);
    
    const roomsResult = await roomsRes.json();
    const aptResult = aptRes.ok ? await aptRes.json() : { data: [] };
    
    if (roomsResult.data !== undefined || Array.isArray(roomsResult)) {
      const rooms = Array.isArray(roomsResult) ? roomsResult : (roomsResult.data || []);
      const appointments = aptResult.data || [];
      
      if (rooms.length === 0) {
        dashboard.innerHTML = '<div style="grid-column: 1 / -1; text-align: center; color: var(--text-muted); padding: 40px;">Nenhum consultório cadastrado.</div>';
        return;
      }

      dashboard.innerHTML = rooms.map(r => {
        const roomApts = appointments.filter(a => a.roomName === r.name);
        const waiting = roomApts.filter(a => a.status === 'Confirmado' || a.status === 'Agendado');
        const inProgress = roomApts.find(a => a.status === 'Em Atendimento');
        
        const roomStatus = r.status || 'Disponível';
        const isActive = roomStatus === 'Disponível' || roomStatus === 'Ativo';
        const statusColor = isActive ? 'var(--success)' : 'var(--warning)';
        const doctorDisplay = r.currentDoctor || r.doctorName || '';
        
        return `
          <div class="interactive-card" style="background: var(--bg-secondary); border: 1px solid var(--border-color); border-radius: 12px; padding: 20px; display: flex; flex-direction: column; gap: 12px; position: relative; overflow: hidden; cursor: pointer; transition: transform 0.2s, box-shadow 0.2s;" onclick="openConsultorioDetailsModal('${r.name}')" onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 4px 12px rgba(0,0,0,0.1)';" onmouseout="this.style.transform=''; this.style.boxShadow='';">
            <div style="display: flex; justify-content: space-between; align-items: flex-start;">
              <div>
                <h3 style="margin: 0; font-size: 1.1rem; color: var(--text-primary); display: flex; align-items: center; gap: 8px;">
                  <i class="fa-solid fa-door-open" style="color: var(--color-primary);"></i> ${r.name}
                </h3>
                <div style="font-size: 0.8rem; color: var(--text-muted); margin-top: 4px;">${r.specialty || 'Uso Geral'}</div>
              </div>
              <div style="display: flex; gap: 6px;">
                <button class="btn btn-icon btn-outline" style="width: 28px; height: 28px;" onclick="event.stopPropagation(); openRoomModal('${r.id}')" title="Editar"><i class="fa-solid fa-pen" style="font-size: 0.75rem;"></i></button>
              </div>
            </div>
            
            <div style="margin-top: 8px; display: flex; align-items: center; gap: 8px;">
              <span style="display: inline-flex; align-items: center; gap: 4px; padding: 4px 10px; border-radius: 20px; font-size: 0.75rem; font-weight: 600; background: ${statusColor}22; color: ${statusColor}; border: 1px solid ${statusColor}44;">
                <i class="fa-solid fa-circle" style="font-size: 0.5rem;"></i> ${r.status || 'Disponível'}
              </span>
              ${doctorDisplay ? `<span style="font-size: 0.8rem; font-weight: 600; color: var(--text-secondary);"><i class="fa-solid fa-user-doctor"></i> ${doctorDisplay}</span>` : ''}
            </div>

            <div style="margin-top: auto; padding-top: 16px; border-top: 1px solid var(--border-color); display: flex; flex-direction: column; gap: 8px;">
              ${inProgress ? `
                <div style="display: flex; align-items: center; gap: 8px; font-size: 0.85rem; color: var(--text-primary); background: rgba(99,102,241,0.1); padding: 8px 12px; border-radius: 8px; border: 1px solid rgba(99,102,241,0.2);">
                  <i class="fa-solid fa-stethoscope" style="color: var(--color-primary);"></i>
                  <span style="font-weight: 600;">${inProgress.patientName}</span>
                </div>
              ` : `
                <div style="font-size: 0.85rem; color: var(--text-muted); padding: 8px 0;"><i class="fa-regular fa-clock"></i> Nenhum atendimento agora</div>
              `}
              
              <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.8rem;">
                <span style="color: var(--text-muted);">Próximos na Fila:</span>
                <span style="font-weight: 700; color: var(--text-primary); background: var(--bg-tertiary); padding: 2px 8px; border-radius: 12px;">${waiting.length}</span>
              </div>
            </div>
          </div>
        `;
      }).join('');
      
      state.consultingRooms = rooms;
    } else {
      dashboard.innerHTML = `<div style="grid-column: 1 / -1; text-align: center; color: red;">${roomsResult.message || 'Erro ao carregar consultórios.'}</div>`;
    }
  } catch (err) {
    console.error(err);
    dashboard.innerHTML = '<div style="grid-column: 1 / -1; text-align: center; color: red;">Erro de conexão ao carregar consultórios.</div>';
  }
}

function openRoomModal(roomId = null) {
  let room = { id: '', name: '', specialty: '', currentDoctor: '', status: 'Disponível' };
  if (roomId && state.consultingRooms) {
    room = state.consultingRooms.find(r => r.id === roomId) || room;
  }

  const isEdit = !!roomId;
  const modalHtml = `
    <div id="room-modal" class="modal-overlay">
      <div class="modal-content" style="max-width: 650px;">
        <div class="modal-header">
          <h3>${isEdit ? 'Editar Consultório' : 'Novo Consultório'}</h3>
          <span class="close-modal" onclick="document.getElementById('room-modal').remove()"><i class="fa-solid fa-xmark"></i></span>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label>Nome / Número do Consultório *</label>
            <input type="text" id="room-name" class="form-input" value="${room.name}" placeholder="Ex: Consultório 01" required>
          </div>
          <div class="form-group">
            <label>Especialidade / Uso Sugerido</label>
            <input type="text" id="room-specialty" class="form-input" value="${room.specialty || ''}" placeholder="Ex: Clínica Geral">
          </div>
          ${isEdit ? `
          <div class="form-group">
            <label>Médico Atual (Opcional)</label>
            <input type="text" id="room-doctor" class="form-input" value="${room.currentDoctor || ''}" placeholder="Deixe em branco se vazio">
          </div>
          <div class="form-group">
            <label>Status</label>
            <select id="room-status" class="form-input">
              <option value="Disponível" ${room.status === 'Disponível' ? 'selected' : ''}>Disponível</option>
              <option value="Em Uso" ${room.status === 'Em Uso' ? 'selected' : ''}>Em Uso</option>
              <option value="Manutenção" ${room.status === 'Manutenção' ? 'selected' : ''}>Manutenção</option>
            </select>
          </div>
          ` : ''}
        </div>
        <div class="modal-footer">
          <button class="btn btn-outline" onclick="document.getElementById('room-modal').remove()">Cancelar</button>
          <button class="btn btn-primary" onclick="saveRoom('${room.id}')">Salvar Consultório</button>
        </div>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', modalHtml);
}

async function saveRoom(roomId) {
  const name = document.getElementById('room-name').value.trim();
  const specialty = document.getElementById('room-specialty').value.trim();
  
  if (!name) return showCustomAlert({ title: 'Aviso', message: 'O nome do consultório é obrigatório.', type: 'warning' });

  let payload = { name, specialty };
  let url = '/api/consulting-rooms';
  let method = 'POST';

  if (roomId) {
    url = `/api/consulting-rooms/${roomId}`;
    method = 'PUT';
    payload.currentDoctor = document.getElementById('room-doctor').value.trim();
    payload.status = document.getElementById('room-status').value;
  }

  try {
    const res = await apiFetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    
    if (res.ok) {
      document.getElementById('room-modal').remove();
      showCustomAlert({ title: 'Sucesso', message: 'Consultório salvo com sucesso.', type: 'success' });
      loadConsultingRooms();
    } else {
      showCustomAlert({ title: 'Erro', message: 'Falha ao salvar consultório.', type: 'error' });
    }
  } catch (e) {
    showCustomAlert({ title: 'Erro', message: 'Erro de conexão.', type: 'error' });
  }
}

async function deleteRoom(roomId) {
  if (!confirm('Tem certeza que deseja excluir este consultório?')) return;
  try {
    const res = await apiFetch(`/api/consulting-rooms/${roomId}`, { method: 'DELETE' });
    if (res.ok) {
      showCustomAlert({ title: 'Sucesso', message: 'Consultório removido.', type: 'success' });
      loadConsultingRooms();
    } else {
      showCustomAlert({ title: 'Erro', message: 'Falha ao remover consultório.', type: 'error' });
    }
  } catch (e) {
    showCustomAlert({ title: 'Erro', message: 'Erro de conexão.', type: 'error' });
  }
}

async function openConsultorioDetailsModal(roomName) {
  try {
    const todayIso = new Date().toISOString().split('T')[0];
    const aptRes = await apiFetch('/api/appointments?date=' + todayIso);
    const aptResult = aptRes.ok ? await aptRes.json() : { data: [] };
    const appointments = aptResult.data || [];
    
    const roomApts = appointments.filter(a => a.roomName === roomName);
    const inProgress = roomApts.find(a => a.status === 'Em Atendimento');
    const completed = roomApts.filter(a => a.status === 'Concluído');
    
    let html = `
      <div id="consultorio-details-modal" class="modal-overlay">
        <div class="modal-content" style="max-width: 600px;">
          <div class="modal-header">
            <h3><i class="fa-solid fa-door-open" style="color: var(--color-primary);"></i> Detalhes: ${roomName}</h3>
            <span class="close-modal" onclick="document.getElementById('consultorio-details-modal').remove()"><i class="fa-solid fa-xmark"></i></span>
          </div>
          <div class="modal-body">
            <h4 style="margin-bottom: 12px; color: var(--text-primary); font-size: 1.05rem;"><i class="fa-solid fa-stethoscope" style="color: var(--color-primary);"></i> Em Realização</h4>
            ${inProgress ? `
              <div style="background: rgba(99,102,241,0.1); border: 1px solid rgba(99,102,241,0.3); padding: 14px; border-radius: 8px; margin-bottom: 24px; color: var(--text-primary);">
                <strong>Paciente:</strong> ${inProgress.patientName} <br/>
                <strong style="margin-top: 6px; display: inline-block;">Médico:</strong> ${inProgress.doctorName || 'Não atribuído'} <br/>
                <strong style="margin-top: 6px; display: inline-block;">Horário:</strong> ${inProgress.time || 'N/A'}
              </div>
            ` : '<div style="color: var(--text-muted); margin-bottom: 24px; padding: 10px; background: var(--bg-secondary); border-radius: 8px;">Nenhum atendimento em andamento no momento.</div>'}

            <h4 style="margin-bottom: 12px; color: var(--text-primary); font-size: 1.05rem;"><i class="fa-solid fa-check-double" style="color: var(--success);"></i> Procedimentos Feitos (Hoje)</h4>
            ${completed.length > 0 ? `
              <ul style="list-style: none; padding: 0; margin-bottom: 24px; max-height: 250px; overflow-y: auto; background: var(--bg-secondary); border-radius: 8px; border: 1px solid var(--border-color);">
                ${completed.map((c, i) => `
                  <li style="border-bottom: ${i === completed.length - 1 ? 'none' : '1px solid var(--border-color)'}; padding: 12px 14px; color: var(--text-primary);">
                    <span style="color: var(--text-muted); font-size: 0.85rem; margin-right: 8px;">${c.time || '--:--'}</span>
                    <strong>${c.patientName}</strong> <span style="color: var(--text-muted); font-size: 0.9rem;">(${c.doctorName ? 'Dr. ' + c.doctorName : 'N/A'})</span>
                  </li>
                `).join('')}
              </ul>
            ` : '<div style="color: var(--text-muted); margin-bottom: 24px; padding: 10px; background: var(--bg-secondary); border-radius: 8px;">Nenhum procedimento concluído hoje neste consultório.</div>'}

            <div style="display: flex; gap: 12px; margin-top: 20px; justify-content: flex-end;">
              <button class="btn btn-outline" style="margin-right: auto;" onclick="document.getElementById('consultorio-details-modal').remove();"><i class="fa-solid fa-arrow-left"></i> Voltar</button>
              <button class="btn btn-outline" onclick="
                window.pendingAgendaRoomFilter = '${roomName}';
                window.returnToConsultorio = '${roomName}';
                document.getElementById('consultorio-details-modal').remove();
                switchTab('agenda');
              "><i class="fa-solid fa-list"></i> Ver Agendamentos</button>
              
              <button class="btn btn-primary" onclick="
                window.pendingAgendaRoomFilter = '${roomName}';
                window.returnToConsultorio = '${roomName}';
                document.getElementById('consultorio-details-modal').remove();
                switchTab('agenda');
                setTimeout(() => {
                  const btn = document.getElementById('btn-open-new-appointment');
                  if (btn) btn.click();
                }, 100);
              "><i class="fa-solid fa-calendar-plus"></i> Criar Agendamento</button>
            </div>
          </div>
        </div>
      </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', html);
  } catch (err) {
    console.error(err);
    showCustomAlert({ title: 'Erro', message: 'Erro ao carregar detalhes do consultório.', type: 'error' });
  }
}

window.populateFakeDatabase = async function() {
  showToast('⚙️ Executando simulação completa... aguarde.');
  try {
    await generateMockData();
    showToast('✅ Banco de dados simulado com sucesso! Recarregando...');
    setTimeout(() => window.location.reload(), 1500);
  } catch (e) {
    console.error('[populateFakeDatabase] Erro:', e);
    showToast('❌ Erro ao simular banco: ' + (e.message || e));
  }
};

window.generateMockData = async function() {
  const result = await generateMockData();
  const summary = [
    `👤 ${(result.patients||[]).length} pacientes`,
    `👨‍⚕️ ${(result.doctors||[]).length} médicos`,
    `📅 ${(result.appointments||[]).length} agendamentos`,
    `🏥 ${(result.encounters||[]).length} atendimentos`,
    `💰 ${(result.financial_installments||[]).length} títulos financeiros`,
    `🛏️ ${(result.beds||[]).filter(b=>b.status==='Ocupado').length} leitos ocupados`,
    `📺 ${(result.tv_calls||[]).length} chamadas TV`,
    `💊 ${(result.medications||[]).length} medicamentos`,
  ].join(' | ');
  showToast('✅ Simulação completa! ' + summary);
  setTimeout(() => window.location.reload(), 2000);
};

export { apiFetch, showToast, abbreviateName, switchTab, setupCustomSelect, anonymizeCPF, exportToPDF, formatSyncDate, showCustomAlert, renderTabContent, cachedApiGet, getRolePermissions, loadConsultingRooms, openRoomModal, deleteRoom, saveRoom };

// Expondo variáveis utilizadas em onclicks (movidas de tv.js)
window.saveRoom = saveRoom;
window.deleteRoom = deleteRoom;
window.openRoomModal = openRoomModal;
window.openConsultorioDetailsModal = openConsultorioDetailsModal;

// --- INICIALIZAÇÃO AUTOMÁTICA DA APLICAÇÃO ---
// Start app immediately (module execution is already deferred until DOM is parsed)
initializeApp();
