
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

              const isMasterOrAdmin = u.username === 'mazzarowysk' || u.username === 'admin';

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
                    ${!isMasterOrAdmin ? `
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
          Detectamos que existem alterações feitas em outro dispositivo ou na nuvem.
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
      await syncManager.pullFromCloud();
    } finally {
      overlay.remove();
    }
  });
};

// ─── CLASSE SYNCMANAGER (ESPECIFICAÇÃO DE SINCRONIZAÇÃO) ────────────────────
class SyncManager {
  constructor() {
    this.lastLocalUpdate = Number(localStorage.getItem('hn_last_local_update') || 0);
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
    const mins = Math.floor(this.timerCountdownSeconds / 60);
    const secs = this.timerCountdownSeconds % 60;
    const timeStr = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    const badge = document.getElementById('sync-status-badge');
    if (badge && state.syncInfo && state.syncInfo.cloudConfigured) {
      const baseText = state.syncInfo.synchronized ? 'Local sincronizado com Turso' : 'Fora de Sincronia';
      badge.innerHTML = `<i class="fa-solid fa-cloud-arrow-up" style="margin-right:6px;"></i> ${baseText} <span style="opacity:0.8; font-size:0.78rem; margin-left:6px;">(${timeStr})</span>`;
    }
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
      const res = await apiFetch('/api/sync/check-version');
      if (!res.ok) return { hasNewData: false, cloudTimestamp: 0 };
      const data = await res.json();

      if (data.cloudConfigured) {
        const localTs = Number(localStorage.getItem('hn_last_local_update') || data.localTimestamp || 0);
        const hasNewData = data.cloudTimestamp > (localTs + 5000);

        if (hasNewData) {
          const statusData = await getSyncStatus();
          if (statusData) {
            showSyncComparisonModal(statusData);
          }
        } else {
          await getSyncStatus();
        }
        return { hasNewData, cloudTimestamp: data.cloudTimestamp };
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
      const res = await apiFetch('/api/sync/upload', {
        method: 'POST'
      });

      if (res.ok) {
        const data = await res.json();
        const now = data.updatedAt || Date.now();
        localStorage.setItem('hn_last_local_update', now.toString());
        localStorage.setItem('ultimoSync', new Date(now).toLocaleString('pt-BR'));
        this.lastLocalUpdate = now;
        if (showToastMessage) showToast('Dados sincronizados com o Turso na nuvem!');
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
      const res = await apiFetch('/api/sync/download', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        const now = data.updatedAt || Date.now();
        localStorage.setItem('hn_last_local_update', now.toString());
        localStorage.setItem('ultimoSync', new Date(now).toLocaleString('pt-BR'));
        sessionStorage.setItem('hn_reloading_after_sync', 'true');
        showToast('Banco local atualizado com os dados da nuvem!');
        setTimeout(() => window.location.reload(), 800);
        return true;
      } else {
        const err = await res.json().catch(() => ({}));
        showToast(err.message || 'Erro ao baixar dados da nuvem.');
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

const scheduleSyncUpload = () => {
  if (state.syncInfo && !state.syncInfo.cloudConfigured) return;
  if (syncUploadTimeout) clearTimeout(syncUploadTimeout);
  syncUploadTimeout = setTimeout(async () => {
    await syncManager.pushToCloud(false);
  }, 500);
};

const getSyncStatus = async () => {
  try {
    const res = await apiFetch('/api/sync/status');
    if (!res.ok) {
      state.syncInfo = { cloudConfigured: true, isVercel: false, synchronized: true };
      updateSyncBadge();
      return state.syncInfo;
    }
    const data = await res.json();
    state.syncInfo = data;
    updateSyncBadge();
    return data;
  } catch (err) {
    console.error('Erro ao obter status de sincronização:', err);
    state.syncInfo = { cloudConfigured: true, isVercel: false, synchronized: true };
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

  if (!badge.dataset.listenerAdded) {
    badge.dataset.listenerAdded = 'true';
    badge.addEventListener('click', () => {
      requestSyncPromptIfConfigured();
    });
  }

  if (!data) {
    badge.textContent = 'Turso Cloud Conectado';
    badge.style.background = 'rgba(59,130,246,0.12)';
    badge.style.borderColor = 'rgba(59,130,246,0.3)';
    badge.style.color = '#2563eb';
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

  syncManager.updateTimerUI();
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
    syncManager.startAutoSyncTimer();
    await syncManager.checkCloudVersion(true);
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

  // Fix JSON parsing crash by attaching a safe json parser
  const originalJson = res.json.bind(res);
  res.json = async () => {
    try {
      const text = await res.text();
      return JSON.parse(text);
    } catch (e) {
      console.warn('apiFetch JSON parse error:', e);
      return { status: 'error', message: 'Erro de comunicação com o servidor.' };
    }
  };

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
        const body = isLogin ? { username, password } : { name, username, password, role, masterKey };
        
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
    { id: 'pacientes', label: 'Pacientes', icon: 'fa-user-injured' },
    { id: 'medicos', label: 'Corpo Clínico', icon: 'fa-user-doctor' },
    { id: 'consultorios', label: 'Consultórios', icon: 'fa-door-open' },
    { id: 'farmacia', label: 'Farmácia & Estoque', icon: 'fa-pills' },
    { id: 'tv_panel', label: 'Painel TV (Chamador)', icon: 'fa-tv' },
    { id: 'agenda', label: 'Agenda', icon: 'fa-calendar-check' },
    { id: 'atendimento', label: 'Atendimentos', icon: 'fa-stethoscope' },
    { id: 'estagnacao', label: 'Alertas & Estagnação', icon: 'fa-triangle-exclamation', hasBadge: true },
    { id: 'leitos', label: 'Leitos', icon: 'fa-bed-pulse' },
    { id: 'financeiro', label: 'Financeiro', icon: 'fa-hand-holding-dollar' },
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
          <!-- Card 1: Ocupação Híbrida de Leitos -->
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

          <!-- Card 2: Histórico de Atendimentos Mensais -->
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

        const res = await apiFetch(url, {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fullName, cpf, birthDate, cep, address, number, neighborhood, city, phone, cellphone, billingValue }),
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
            <div id="atd-kpi-bar" style="display:flex; gap:8px;">
              <span class="atd-kpi-chip" style="background:rgba(245,158,11,0.12); color:#f59e0b; border:1px solid rgba(245,158,11,0.3); font-size:0.78rem; padding:5px 10px; border-radius:20px; font-weight:600;">
                <i class="fa-solid fa-hourglass-half"></i> <span id="kpi-aguardando-num">0</span> Aguardando
              </span>
              <span class="atd-kpi-chip" style="background:rgba(139,92,246,0.12); color:#8b5cf6; border:1px solid rgba(139,92,246,0.3); font-size:0.78rem; padding:5px 10px; border-radius:20px; font-weight:600;">
                <i class="fa-solid fa-stethoscope"></i> <span id="kpi-triagem-num">0</span> Triagem
              </span>
              <span class="atd-kpi-chip" style="background:rgba(16,185,129,0.12); color:#10b981; border:1px solid rgba(16,185,129,0.3); font-size:0.78rem; padding:5px 10px; border-radius:20px; font-weight:600;">
                <i class="fa-solid fa-user-doctor"></i> <span id="kpi-consulta-num">0</span> Em Consulta
              </span>
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
        allEncounters = await res.json();
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
        const fin = document.querySelector(`#col-active [data-enc-id="${e.id}"].btn-finish-consult`);
        if (pep) pep.addEventListener('click', () => window.openPEPModal(e.id));
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
      return `
        <div style="background:var(--bg-tertiary);border:1px solid rgba(16,185,129,0.3);border-left:4px solid #10b981;border-radius:var(--radius-md);padding:14px;margin-bottom:4px;">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px;">
            <div style="font-weight:700;font-size:0.88rem;color:var(--text-primary);">${e.patientName}</div>
            <span id="timer-${e.id}" style="font-size:0.7rem;color:#10b981;font-family:monospace;background:rgba(16,185,129,0.1);padding:2px 6px;border-radius:4px;white-space:nowrap;"></span>
          </div>
          <div style="display:flex;align-items:center;gap:6px;margin-bottom:${e.complaints?'8px':'12px'};">
            <span style="width:7px;height:7px;background:#10b981;border-radius:50%;display:inline-block;animation:pulse 1.5s infinite;"></span>
            <span style="font-size:0.75rem;color:#10b981;font-weight:600;">Em Consulta</span>
            ${e.manchesterColor?`<span style="font-size:0.7rem;background:${mc.bg};color:${mc.text};border:1px solid ${mc.border};border-radius:10px;padding:1px 8px;margin-left:auto;">${mc.label}</span>`:''}
          </div>
          ${e.complaints?`<p style="font-size:0.75rem;color:var(--text-secondary);font-style:italic;margin:0 0 12px;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;">"${e.complaints}"</p>`:''}
          <div style="display:flex;gap:8px;">
            <button class="btn btn-open-pep" data-enc-id="${e.id}" style="flex:1;font-size:0.78rem;padding:7px;background:var(--bg-secondary);border:1px solid var(--border-color);color:var(--text-primary);border-radius:var(--radius-md);cursor:pointer;">
              <i class="fa-solid fa-file-medical"></i> PEP
            </button>
            <button class="btn btn-primary btn-finish-consult" data-enc-id="${e.id}" style="flex:1;font-size:0.78rem;padding:7px;background:linear-gradient(135deg,#10b981,#059669);border:none;cursor:pointer;">
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
        allHistory = (await res.json()).filter(e => e.status === 'Finalizado').reverse();
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

          <!-- Accordion de Sincronização Cloud Turso -->
          <details class="settings-accordion" open>
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

              <div class="settings-actions" style="display: flex; gap: 12px; flex-wrap: wrap;">
                <button id="btn-sync-turso-now" class="btn btn-primary" style="background: linear-gradient(135deg, #0284c7, #0369a1); border: none;">
                  <i class="fa-solid fa-cloud-arrow-up"></i> Sincronizar Agora com Turso (Upload)
                </button>
                <button id="btn-sync-turso-download" class="btn btn-secondary" style="border-color: #8b5cf6; color: #a78bfa;">
                  <i class="fa-solid fa-cloud-arrow-down"></i> Baixar Dados do Turso (Restore)
                </button>
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
                  <button id="btn-edit-permissions" class="btn btn-primary">
                    <i class="fa-solid fa-users-gear"></i> Gerenciar Usuários & Permissões
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
      const statusData = await getSyncStatus();
      if (statusData) {
        const localEl = document.getElementById('cfg-sync-local-time');
        const cloudEl = document.getElementById('cfg-sync-cloud-time');
        if (localEl) localEl.textContent = formatSyncDate(statusData.lastLocalBackup);
        if (cloudEl) cloudEl.textContent = formatSyncDate(statusData.lastCloudBackup);
      }
    })();

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
            const localEl = document.getElementById('cfg-sync-local-time');
            const cloudEl = document.getElementById('cfg-sync-cloud-time');
            if (localEl) localEl.textContent = formatSyncDate(statusData.lastLocalBackup);
            if (cloudEl) cloudEl.textContent = formatSyncDate(statusData.lastCloudBackup);
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

    document.getElementById('btn-seed').addEventListener('click', async () => {
      try {
        const res = await apiFetch(`${API_URL}/settings/seed`, { method: 'POST' });
        const data = await res.json();
        if (res.ok) {
          showCustomAlert({ title: 'Sucesso', message: '5 pacientes fictícios foram inseridos no banco Turso.', type: 'success' });
          state.loading = true;
        } else {
          showCustomAlert({ title: 'Erro', message: data.message || 'Falha ao popular banco.', type: 'danger' });
        }
      } catch (err) {
        showCustomAlert({ title: 'Erro de Conexão', message: 'Erro ao conectar-se à API.', type: 'danger' });
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

// --- FUNÇÃO PARA INICIALIZAR GRÁFICOS CHART.JS MODERNOS (DARK NEON GLASS) ---
function initDashboardCharts(data) {
  if (!data) return;

  const occupancyCtx = document.getElementById('occupancyChart');
  const appointmentsCtx = document.getElementById('appointmentsChart');

  const occupancyData = (data.occupancyData && data.occupancyData.length > 0) ? data.occupancyData : [
    { label: 'UTI Adulto', value: 25, color: '#f43f5e' },
    { label: 'Enfermaria', value: 85, color: '#6366f1' },
    { label: 'Pediatria', value: 12, color: '#00f2fe' },
    { label: 'Maternidade', value: 18, color: '#f59e0b' },
    { label: 'Disponíveis', value: 25, color: '#10b981' }
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

    const ChartClass = window.Chart || (typeof Chart !== 'undefined' ? Chart : null);
    if (!ChartClass) return;

    const pagasItem = data.find(d => d.label === 'Pagas');
    const totalCount = quantities.reduce((a, b) => a + b, 0);
    const totalVal = valuesR$.reduce((a, b) => a + b, 0);
    const pctPagas = totalCount > 0 ? Math.round((pagasItem ? pagasItem.count : 0) / totalCount * 100) : 0;

    const pctEl = document.getElementById('fin-completion-pct');
    if (pctEl) {
      const startTime = performance.now();
      const duration = 1200;
      const updatePct = (now) => {
        const progress = Math.min(1, (now - startTime) / duration);
        const ease = 1 - Math.pow(1 - progress, 3);
        pctEl.textContent = `${Math.floor(ease * pctPagas)}%`;
        if (progress < 1) requestAnimationFrame(updatePct);
        else pctEl.textContent = `${pctPagas}%`;
      };
      requestAnimationFrame(updatePct);
    }

    // Animar barras de progresso da lista lateral
    setTimeout(() => {
      document.querySelectorAll('#fin-status-progress-list .ward-bar-fill').forEach(fill => {
        const target = fill.dataset.target || '0';
        fill.style.width = `${target}%`;
      });
    }, 80);

    // 1. Gráfico de Rosca Neon Glass (Sem legenda interna pois a lista lateral atua como legenda ativa)
    finPieChartInstance = new ChartClass(pieCtx.getContext('2d'), {
      type: 'doughnut',
      data: {
        labels: labels,
        datasets: [{
          data: quantities,
          backgroundColor: colors,
          borderWidth: 3,
          borderColor: 'rgba(11, 8, 22, 0.95)',
          borderRadius: 6,
          spacing: 3,
          hoverOffset: 14
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '76%',
        animation: { animateScale: true, animateRotate: true, duration: 1100 },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: 'rgba(18, 14, 34, 0.94)',
            titleColor: '#00f2fe',
            bodyColor: '#f8fafc',
            borderColor: 'rgba(0, 242, 254, 0.35)',
            borderWidth: 1,
            padding: 12,
            callbacks: {
              label: function(context) {
                const idx = context.dataIndex;
                const count = context.parsed;
                const valor = valuesR$[idx] || 0;
                const totalQtd = quantities.reduce((a, b) => a + b, 0);
                const pct = totalQtd > 0 ? ((count / totalQtd) * 100).toFixed(1) : '0.0';
                const valorFormatado = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor);
                return [
                  ` Quantidade: ${count} parcelas (${pct}%)`,
                  ` Valor Total: ${valorFormatado}`
                ];
              }
            }
          }
        }
      }
    });

    // Interatividade Hover Lista -> Anel
    document.querySelectorAll('.fin-progress-row').forEach(row => {
      row.addEventListener('mouseenter', () => {
        const idx = parseInt(row.dataset.idx, 10);
        if (finPieChartInstance && finPieChartInstance.setActiveElements) {
          finPieChartInstance.setActiveElements([{ datasetIndex: 0, index: idx }]);
          finPieChartInstance.update();
        }
      });
      row.addEventListener('mouseleave', () => {
        if (finPieChartInstance && finPieChartInstance.setActiveElements) {
          finPieChartInstance.setActiveElements([]);
          finPieChartInstance.update();
        }
      });
    });

    // 2. Gráfico de Barras Neon Glass ("Comparativo Financeiro (R$)")
    const c2dBar = barCtx.getContext('2d');
    const barGradients = colors.map(c => {
      const grad = c2dBar.createLinearGradient(0, 0, 0, 180);
      grad.addColorStop(0, c);
      grad.addColorStop(1, 'rgba(11, 8, 22, 0.4)');
      return grad;
    });

    finBarChartInstance = new ChartClass(c2dBar, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [{
          label: 'Valor (R$)',
          data: valuesR$,
          backgroundColor: barGradients,
          borderColor: colors,
          borderWidth: 1.5,
          borderRadius: 8,
          borderSkipped: false
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 1100, easing: 'easeOutQuart' },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: 'rgba(18, 14, 34, 0.94)',
            titleColor: '#00f2fe',
            bodyColor: '#f8fafc',
            borderColor: 'rgba(0, 242, 254, 0.35)',
            borderWidth: 1,
            padding: 12,
            callbacks: {
              label: function(context) {
                const valor = context.parsed.y;
                return ' Total: ' + new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor);
              }
            }
          }
        },
        scales: {
          x: {
            grid: { color: 'rgba(255,255,255,0.04)', drawBorder: false },
            ticks: { color: '#94a3b8', font: { family: 'Plus Jakarta Sans', size: 10.5, weight: '600' } }
          },
          y: {
            grid: { color: 'rgba(255,255,255,0.04)', drawBorder: false },
            ticks: {
              color: '#94a3b8',
              font: { family: 'Plus Jakarta Sans', size: 10 },
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

      let pagasCount = 89, pagasVal = 13500.00;
      let aVencerCount = 8, aVencerVal = 850.00;
      let vencidasCount = 5, vencidasVal = 991.00;
      let bonificadasCount = 2, bonificadasVal = 300.00;
      let suspensasCount = 0, suspensasVal = 0;
      let canceladasCount = 0, canceladasVal = 0;
      let excluidasCount = 0, excluidasVal = 0;

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
      const pctPagasCount = totalParcelas > 0 ? Math.round((pagasCount / totalParcelas) * 100) : 0;

      const totalFormatted = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalVal);

      const finData = [
        { label: 'Pagas', count: pagasCount, totalValue: pagasVal, color: '#34d399' },
        { label: 'A Vencer', count: aVencerCount, totalValue: aVencerVal, color: '#00f2fe' },
        { label: 'Vencidas', count: vencidasCount, totalValue: vencidasVal, color: '#f43f5e' },
        { label: 'Bonificadas', count: bonificadasCount, totalValue: bonificadasVal, color: '#fbbf24' },
        { label: 'Suspensas', count: suspensasCount, totalValue: suspensasVal, color: '#a855f7' },
        { label: 'Canceladas', count: canceladasCount, totalValue: canceladasVal, color: '#f97316' },
        { label: 'Excluídas', count: excluidasCount, totalValue: excluidasVal, color: '#dc2626' }
      ];

      const finTitlesList = [
        { id: 'TIT-90481', client: 'Carlos Eduardo Silva', desc: 'Consulta Ambulatorial & Exames Especializados', dueDate: '15/06/2026', amount: 350.00, amountFormatted: 'R$ 350,00', status: 'Vencidas', color: '#f43f5e' },
        { id: 'TIT-90482', client: 'Mariana Oliveira Souza', desc: 'Procedimento Cirúrgico Porte 2', dueDate: '20/06/2026', amount: 1250.00, amountFormatted: 'R$ 1.250,00', status: 'Vencidas', color: '#f43f5e' },
        { id: 'TIT-90483', client: 'Roberto Mendes Santos', desc: 'Internação UTI Geral (3 diárias)', dueDate: '02/07/2026', amount: 4800.00, amountFormatted: 'R$ 4.800,00', status: 'Vencidas', color: '#f43f5e' },
        { id: 'TIT-90484', client: 'Ana Paula Ferreira', desc: 'Exames Laboratoriais Completos', dueDate: '10/07/2026', amount: 280.00, amountFormatted: 'R$ 280,00', status: 'Vencidas', color: '#f43f5e' },
        { id: 'TIT-90485', client: 'Fernando Henrique Rocha', desc: 'Sessão de Fisioterapia Respiratória', dueDate: '18/07/2026', amount: 190.00, amountFormatted: 'R$ 190,00', status: 'Vencidas', color: '#f43f5e' },
        { id: 'TIT-90410', client: 'Juliana Costa Lima', desc: 'Consulta Cardiologia Especializada', dueDate: '28/07/2026', amount: 420.00, amountFormatted: 'R$ 420,00', status: 'A Vencer', color: '#00f2fe' },
        { id: 'TIT-90411', client: 'Lucas Gabriel Pereira', desc: 'Tomografia Computadorizada de Tórax', dueDate: '05/08/2026', amount: 850.00, amountFormatted: 'R$ 850,00', status: 'A Vencer', color: '#00f2fe' },
        { id: 'TIT-90301', client: 'Beatriz Castro Alencar', desc: 'Atendimento de Urgência Pediatria', dueDate: '10/05/2026', amount: 540.00, amountFormatted: 'R$ 540,00', status: 'Pagas', color: '#34d399' },
        { id: 'TIT-90302', client: 'Thiago Martins Fonseca', desc: 'Internação Enfermaria Geral (2 diárias)', dueDate: '12/05/2026', amount: 2150.00, amountFormatted: 'R$ 2.150,00', status: 'Pagas', color: '#34d399' },
        { id: 'TIT-90303', client: 'Patrícia Duarte Ribeiro', desc: 'Consulta Ginecologia & Ultrassom', dueDate: '15/05/2026', amount: 480.00, amountFormatted: 'R$ 480,00', status: 'Pagas', color: '#34d399' },
        { id: 'TIT-90304', client: 'Marcos Vinícius Barbosa', desc: 'Procedimento Ortopédico Eletivo', dueDate: '01/06/2026', amount: 1800.00, amountFormatted: 'R$ 1.800,00', status: 'Pagas', color: '#34d399' },
        { id: 'TIT-90201', client: 'Renata Albuquerque Lima', desc: 'Isenção de Taxa Hospitalar Conveniada', dueDate: '05/06/2026', amount: 150.00, amountFormatted: 'R$ 150,00', status: 'Bonificadas', color: '#fbbf24' },
        { id: 'TIT-90202', client: 'Eduardo Correia Neves', desc: 'Bonificação Convênio Parceiro VIP', dueDate: '10/06/2026', amount: 150.00, amountFormatted: 'R$ 150,00', status: 'Bonificadas', color: '#fbbf24' }
      ];

      window._activeFinStatusFilter = 'Todos';

      previewCard.innerHTML = `
        <div class="preview-header" style="flex-wrap: wrap; gap: 15px;">
          <h3><i class="fa-solid fa-file-invoice-dollar" style="color: var(--color-primary);"></i> Relatório Financeiro de Títulos</h3>
          <div style="margin-left: auto; display: flex; gap: 8px; flex-wrap: wrap;">
            <button id="btn-export-pdf" class="btn btn-primary" style="background: var(--danger-color); font-size: 0.8rem;"><i class="fa-solid fa-file-pdf"></i> Exportar PDF</button>
            <button id="btn-export-xls" class="btn btn-primary" style="background: var(--success-color); font-size: 0.8rem;"><i class="fa-solid fa-file-excel"></i> Exportar Excel</button>
            <button id="btn-export-csv" class="btn btn-outline" style="font-size: 0.8rem;"><i class="fa-solid fa-file-csv"></i> Exportar CSV</button>
          </div>
        </div>

        <div class="financial-kpi-bar" style="margin-top: 15px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px; background: rgba(0,0,0,0.15); padding: 14px; border-radius: var(--radius-md); border: 1px solid var(--border-color);">
          <div class="financial-badges-group" style="display: flex; gap: 8px; flex-wrap: wrap; font-size: 0.85rem;">
            <span class="fin-kpi-badge" data-status="Pagas" style="border-left: 3px solid #34d399; padding: 4px 10px; background: rgba(52,211,153,0.1); border-radius: 4px; color: var(--text-primary); cursor:pointer;" title="Clique para filtrar apenas títulos Pagos">• Pagas: <strong>${pagasCount}</strong></span>
            <span class="fin-kpi-badge" data-status="A Vencer" style="border-left: 3px solid #00f2fe; padding: 4px 10px; background: rgba(0,242,254,0.1); border-radius: 4px; color: var(--text-primary); cursor:pointer;" title="Clique para filtrar apenas títulos A Vencer">• A Vencer: <strong>${aVencerCount}</strong></span>
            <span class="fin-kpi-badge" data-status="Vencidas" style="border-left: 3px solid #f43f5e; padding: 4px 10px; background: rgba(244,63,94,0.1); border-radius: 4px; color: var(--text-primary); cursor:pointer;" title="Clique para filtrar apenas títulos Vencidos">• Vencidas: <strong>${vencidasCount}</strong></span>
            <span class="fin-kpi-badge" data-status="Bonificadas" style="border-left: 3px solid #fbbf24; padding: 4px 10px; background: rgba(251,191,36,0.1); border-radius: 4px; color: var(--text-primary); cursor:pointer;" title="Clique para filtrar apenas títulos Bonificados">• Bonificadas: <strong>${bonificadasCount}</strong></span>
          </div>
          <div style="font-family: 'Outfit'; text-align: right;">
            <span style="font-size: 0.75rem; color: var(--text-muted); display: block;">SUBTOTAL CLIENTE</span>
            <strong style="font-size: 1.2rem; color: var(--color-primary);">${totalFormatted}</strong>
          </div>
        </div>

        <!-- COMPONENTE HÍBRIDO (ANEL NEON + BARRAS POR CATEGORIA) -->
        <div class="chart-card tilt-card-3d" style="margin-top: 20px; padding: 22px;">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 18px; flex-wrap: wrap; gap: 10px;">
            <h4 style="margin:0; font-size:1.05rem; font-weight:700; color:var(--text-primary); display:flex; align-items:center; gap:8px;">
              <i class="fa-solid fa-chart-pie" style="color: #00f2fe;"></i> Distribuição Financeira por Status
            </h4>
            <span class="badge-occupancy-status" style="border: 1px solid #34d399; background: rgba(52,211,153,0.12); color: #34d399; padding: 5px 14px; border-radius: 20px; font-size: 0.8rem; font-weight: 700;">
              <i class="fa-solid fa-circle-check"></i> ${pctPagasCount}% Pagas (${pagasCount} parcelas)
            </span>
          </div>

          <div style="display: grid; grid-template-columns: 240px 1fr; gap: 24px; align-items: center;">
            <!-- Lado Esquerdo: Anel Donut com KPI Central -->
            <div style="position: relative; width: 210px; height: 210px; margin: 0 auto; display: flex; align-items: center; justify-content: center;">
              <canvas id="finPieChart"></canvas>
              <div class="fin-donut-kpi" style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); text-align: center; pointer-events: none;">
                <span id="fin-completion-pct" style="font-family: 'Outfit', sans-serif; font-size: 2.2rem; font-weight: 800; background: linear-gradient(135deg, #ffffff 0%, #34d399 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; display: block; line-height: 1; filter: drop-shadow(0 0 10px rgba(52, 211, 153, 0.45));">0%</span>
                <span style="font-size: 0.65rem; font-weight: 700; color: var(--text-secondary, #94a3b8); text-transform: uppercase; letter-spacing: 0.05em; display: block; margin-top: 4px;">PAGAS DA CARTEIRA</span>
              </div>
            </div>

            <!-- Lado Direito: Lista de Barras de Progresso por Status -->
            <div class="ward-progress-list" id="fin-status-progress-list">
              ${finData.map((item, idx) => {
                const pct = totalVal > 0 ? ((item.totalValue / totalVal) * 100).toFixed(1) : '0.0';
                const pctCount = totalParcelas > 0 ? ((item.count / totalParcelas) * 100).toFixed(1) : '0.0';
                const formattedVal = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.totalValue);
                const iconMap = {
                  'Pagas': 'fa-circle-check', 'A Vencer': 'fa-clock', 'Vencidas': 'fa-circle-exclamation',
                  'Bonificadas': 'fa-award', 'Suspensas': 'fa-ban', 'Canceladas': 'fa-xmark', 'Excluídas': 'fa-trash'
                };
                return `
                  <div class="ward-progress-item fin-progress-row" data-idx="${idx}" data-status="${item.label}" style="cursor:pointer;" title="Clique para filtrar a tabela para o status ${item.label}">
                    <div class="ward-progress-header">
                      <span class="ward-name"><i class="fa-solid ${iconMap[item.label]||'fa-circle'}" style="color:${item.color};"></i> ${item.label}</span>
                      <span class="ward-stats">
                        <strong style="color:${item.color};font-weight:700;">${item.count} parcelas</strong> 
                        <span style="color:var(--text-muted);font-size:0.76rem;">(${pctCount}%) • ${formattedVal}</span>
                      </span>
                    </div>
                    <div class="ward-bar-track" style="height:6px;background:rgba(255,255,255,0.08);border-radius:10px;overflow:hidden;margin-top:4px;">
                      <div class="ward-bar-fill" style="height:100%;width:0%;background:${item.color};border-radius:10px;transition:width 1.2s cubic-bezier(0.165,0.84,0.44,1);" data-target="${pctCount}"></div>
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
          </div>
        </div>

        <!-- Seção do Gráfico de Barras por Valor -->
        <div class="chart-card tilt-card-3d" style="margin-top: 18px; padding: 18px; height: 250px; position: relative;">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px;">
            <h4 style="margin:0; font-size:0.9rem; font-weight:700; color:var(--text-primary); display:flex; align-items:center; gap:8px;">
              <i class="fa-solid fa-chart-column" style="color: #00f2fe;"></i> Comparativo Financeiro por Status (R$)
            </h4>
          </div>
          <div style="position: relative; height: 185px; width: 100%;">
            <canvas id="finBarChart"></canvas>
          </div>
        </div>

        <!-- TABELA DE TÍTULOS FINANCEIROS FILTRADOS POR STATUS -->
        <div id="fin-titles-table-card" class="glass-card" style="margin-top: 22px; padding: 20px; border-radius: 14px; border: 1px solid var(--border-color);">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; flex-wrap: wrap; gap: 12px;">
            <div>
              <h4 id="fin-table-title" style="margin: 0; font-size: 1.05rem; font-weight: 700; color: var(--text-primary); display: flex; align-items: center; gap: 8px;">
                <i class="fa-solid fa-list-check" style="color: #00f2fe;"></i> Títulos Financeiros
                <span id="fin-status-filter-tag" style="font-size:0.76rem; font-weight:600; padding:3px 10px; border-radius:12px; background:rgba(0,242,254,0.12); color:#00f2fe; border:1px solid rgba(0,242,254,0.3);">Todos os Status</span>
              </h4>
              <p style="margin: 4px 0 0 0; font-size: 0.78rem; color: var(--text-muted);">Clique em qualquer status acima (ex: <strong style="color:#f43f5e;">Vencidas</strong>) para filtrar instantaneamente e emitir o relatório.</p>
            </div>
            <div style="display: flex; gap: 8px; flex-wrap: wrap;">
              <button id="btn-fin-show-all" class="btn btn-outline" style="font-size: 0.78rem; padding: 5px 12px;"><i class="fa-solid fa-rotate-left"></i> Mostrar Todos</button>
            </div>
          </div>

          <div style="border-radius: 10px; overflow: hidden; border: 1px solid var(--border-color);">
            <table style="width: 100%; border-collapse: collapse;">
              <thead>
                <tr style="background: var(--bg-tertiary); border-bottom: 1px solid var(--border-color);">
                  <th style="padding: 10px 14px; font-size: 0.72rem; color: var(--text-muted); text-transform: uppercase;">Nosso Número</th>
                  <th style="padding: 10px 14px; font-size: 0.72rem; color: var(--text-muted); text-transform: uppercase;">Paciente / Cliente</th>
                  <th style="padding: 10px 14px; font-size: 0.72rem; color: var(--text-muted); text-transform: uppercase;">Descrição / Serviço</th>
                  <th style="padding: 10px 14px; font-size: 0.72rem; color: var(--text-muted); text-transform: uppercase; text-align: center;">Vencimento</th>
                  <th style="padding: 10px 14px; font-size: 0.72rem; color: var(--text-muted); text-transform: uppercase; text-align: right;">Valor (R$)</th>
                  <th style="padding: 10px 14px; font-size: 0.72rem; color: var(--text-muted); text-transform: uppercase; text-align: center;">Status</th>
                  <th style="padding: 10px 14px; font-size: 0.72rem; color: var(--text-muted); text-transform: uppercase; text-align: center;">Ações</th>
                </tr>
              </thead>
              <tbody id="fin-titles-table-body">
                <!-- Títulos renderizados dinamicamente -->
              </tbody>
            </table>
          </div>
        </div>
      `;

      // Função de Renderização da Tabela Filtrada de Títulos
      const renderFinTable = (statusFilter = 'Todos') => {
        window._activeFinStatusFilter = statusFilter;
        const tbody = document.getElementById('fin-titles-table-body');
        const filterTag = document.getElementById('fin-status-filter-tag');
        if (!tbody) return;

        let filtered = finTitlesList;
        if (statusFilter && statusFilter !== 'Todos') {
          filtered = finTitlesList.filter(t => t.status === statusFilter);
        }

        if (filterTag) {
          filterTag.textContent = statusFilter === 'Todos' ? 'Todos os Status' : `Filtrado por: ${statusFilter} (${filtered.length})`;
          filterTag.style.borderColor = statusFilter === 'Vencidas' ? '#f43f5e' : (statusFilter === 'Pagas' ? '#34d399' : '#00f2fe');
          filterTag.style.color = statusFilter === 'Vencidas' ? '#f43f5e' : (statusFilter === 'Pagas' ? '#34d399' : '#00f2fe');
        }

        if (filtered.length === 0) {
          tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:24px;color:var(--text-muted);">Nenhum título encontrado com o status "${statusFilter}".</td></tr>`;
          return;
        }

        const hasPEP = state.user && (state.user.role === 'Médico' || state.user.role === 'Enfermeiro');

        tbody.innerHTML = filtered.map(t => `
          <tr style="border-bottom:1px solid var(--border-color);transition:background 0.2s ease;">
            <td style="padding:10px 14px;font-family:monospace;font-weight:700;color:var(--color-primary);font-size:0.84rem;">${t.id}</td>
            <td style="padding:10px 14px;font-weight:600;color:var(--text-primary);font-size:0.86rem;">${hasPEP ? t.client : abbreviateName(t.client)}</td>
            <td style="padding:10px 14px;font-size:0.82rem;color:var(--text-secondary);">${t.desc}</td>
            <td style="padding:10px 14px;text-align:center;font-size:0.82rem;color:var(--text-secondary);">${t.dueDate}</td>
            <td style="padding:10px 14px;text-align:right;font-family:monospace;font-weight:700;color:${t.color};font-size:0.88rem;">${t.amountFormatted}</td>
            <td style="padding:10px 14px;text-align:center;">
              <span style="padding:3px 10px;border-radius:20px;font-size:0.72rem;font-weight:700;background:${t.color}1e;color:${t.color};border:1px solid ${t.color}40;">${t.status}</span>
            </td>
            <td style="padding:10px 14px;text-align:center;">
              <button class="btn btn-outline btn-view-boleto" style="font-size:0.72rem;padding:3px 9px;" data-id="${t.id}" data-client="${t.client}" data-desc="${t.desc}" data-duedate="${t.dueDate}" data-amount="${t.amountFormatted}" data-val="${t.amount}"><i class="fa-solid fa-barcode"></i> 2ª Via</button>
            </td>
          </tr>
        `).join('');

        tbody.querySelectorAll('.btn-view-boleto').forEach(btn => {
          btn.addEventListener('click', () => {
            openBoletoModal({
              id: btn.dataset.id,
              client: btn.dataset.client,
              desc: btn.dataset.desc,
              dueDate: btn.dataset.duedate,
              amountFormatted: btn.dataset.amount,
              amount: parseFloat(btn.dataset.val) || 0
            });
          });
        });
      };

      renderFinTable('Todos');

      setTimeout(() => {
        renderFinancialCharts(finData);

        // Adicionar evento de clique nos badges e linhas para filtrar por status (ex: Vencidas)
        document.querySelectorAll('.fin-progress-row, .fin-kpi-badge').forEach(el => {
          el.addEventListener('click', (e) => {
            const statusTarget = el.dataset.status;
            if (statusTarget) {
              renderFinTable(statusTarget);
              document.getElementById('fin-titles-table-card')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
          });
        });

        document.getElementById('btn-fin-show-all')?.addEventListener('click', () => {
          renderFinTable('Todos');
        });

        // Botões de exportação direta do Relatório Financeiro
        document.getElementById('btn-export-pdf')?.addEventListener('click', () => processExport('pdf'));
        document.getElementById('btn-export-xls')?.addEventListener('click', () => processExport('xls'));
        document.getElementById('btn-export-csv')?.addEventListener('click', () => processExport('csv'));
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

  // FUNÇÕES DE EXPORTAÇÃO GLOBAL (CSV, EXCEL, PDF) E EMISSÃO DE BOLETO
  function exportToCSV(columns, rows, filename) {
    const csvContent = "\uFEFF" + [
      columns.join(";"),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(";"))
    ].join("\r\n");

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `${filename}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    if (typeof showToast === 'function') showToast(`Relatório CSV '${filename}.csv' exportado com sucesso!`);
  }

  function exportToXLS(columns, rows, filename) {
    const tableHTML = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head><meta charset="UTF-8"><!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet><x:Name>Relatório Health Nexus</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions></x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]--></head>
      <body style="font-family: Arial; padding: 20px;">
        <h2 style="color: #4f46e5;">Health Nexus — Relatório Oficial</h2>
        <p style="color: #64748b; font-size: 0.9rem;">Emissão: ${new Date().toLocaleString('pt-BR')}</p>
        <table border="1" style="border-collapse: collapse; width: 100%; font-family: Arial;">
          <thead>
            <tr style="background-color: #4f46e5; color: #ffffff; font-weight: bold;">
              ${columns.map(col => `<th style="padding: 10px; text-align: left;">${col}</th>`).join('')}
            </tr>
          </thead>
          <tbody>
            ${rows.map(row => `
              <tr>
                ${row.map(cell => `<td style="padding: 8px;">${cell}</td>`).join('')}
              </tr>
            `).join('')}
          </tbody>
        </table>
      </body>
      </html>
    `;
    const blob = new Blob([tableHTML], { type: 'application/vnd.ms-excel;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `${filename}.xls`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    if (typeof showToast === 'function') showToast(`Relatório Excel '${filename}.xls' gerado e baixado!`);
  }

  async function exportToPDF(columns, rows, title, filename) {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Por favor, habilite pop-ups para gerar a impressão/visualização em PDF.');
      return;
    }

    const dateNow = new Date().toLocaleString('pt-BR');
    const htmlContent = `
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="UTF-8">
        <title>${title} — Health Nexus</title>
        <style>
          @page { size: A4 portrait; margin: 15mm; }
          body { font-family: 'Segoe UI', Arial, sans-serif; color: #0f172a; margin: 0; padding: 15px; font-size: 10pt; }
          .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #6366f1; padding-bottom: 12px; margin-bottom: 18px; }
          .logo { font-size: 18pt; font-weight: bold; color: #4f46e5; }
          .sublogo { font-size: 8.5pt; color: #64748b; }
          .meta { text-align: right; font-size: 8.5pt; color: #64748b; }
          h1 { font-size: 15pt; color: #0f172a; margin-top: 0; margin-bottom: 12px; }
          table { width: 100%; border-collapse: collapse; margin-top: 12px; }
          th { background-color: #4f46e5; color: #ffffff; text-align: left; padding: 7px 9px; font-size: 8.5pt; text-transform: uppercase; letter-spacing: 0.5px; }
          td { padding: 7px 9px; border-bottom: 1px solid #e2e8f0; font-size: 9pt; }
          tr:nth-child(even) td { background-color: #f8fafc; }
          .footer { margin-top: 25px; border-top: 1px solid #cbd5e1; padding-top: 8px; font-size: 8pt; color: #94a3b8; text-align: center; }
          .badge { display: inline-block; padding: 2px 7px; border-radius: 4px; font-weight: bold; font-size: 8pt; }
          .badge-vencidas { background: #ffe4e6; color: #e11d48; }
          .badge-pagas { background: #d1fae5; color: #059669; }
          .badge-avencer { background: #e0f2fe; color: #0284c7; }
          .badge-bonificadas { background: #fef3c7; color: #d97706; }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <div class="logo">🏥 HEALTH NEXUS</div>
            <div class="sublogo">Gestão Hospitalar & Inteligência Médica</div>
          </div>
          <div class="meta">
            <div>Data de Emissão: <strong>${dateNow}</strong></div>
            <div>Documento Autenticado do Sistema</div>
          </div>
        </div>

        <h1>${title}</h1>
        <p style="font-size: 8.5pt; color: #64748b; margin-top: -6px;">Total de registros impressos: <strong>${rows.length}</strong></p>

        <table>
          <thead>
            <tr>
              ${columns.map(col => `<th>${col}</th>`).join('')}
            </tr>
          </thead>
          <tbody>
            ${rows.map(row => `
              <tr>
                ${row.map((cell, idx) => {
                  if (columns[idx] === 'Status') {
                    const s = String(cell).toLowerCase().replace(/\s+/g, '');
                    return `<td><span class="badge badge-${s}">${cell}</span></td>`;
                  }
                  return `<td>${cell}</td>`;
                }).join('')}
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div class="footer">
          Health Nexus © 2026 — Sistema Integrado de Saúde Hospitalar • Documento impresso digitalmente.
        </div>
        <script>
          window.onload = function() { window.print(); };
        </script>
      </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
    if (typeof showToast === 'function') showToast(`Relatório PDF gerado! Janela de impressão pronta.`);
  }

  function openBoletoModal(t) {
    let modal = document.getElementById('modal-boleto-2via');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'modal-boleto-2via';
      modal.className = 'modal-overlay';
      document.body.appendChild(modal);
    }

    const linhaDigitavel = `34191.79001 01043.510047 91020.150008 5 94100000035000`;
    const pixCopyPaste = `00020126580014br.gov.bcb.pix0136123e4567-e89b-12d3-a456-426614174000520400005303986540${t.amount ? t.amount.toFixed(2) : '350.00'}5802BR5912HEALTH NEXUS6009SAO PAULO62070503***6304A1B2`;

    modal.innerHTML = `
      <div class="modal-card glass-card" style="max-width: 680px; width: 92%; padding: 24px; border-radius: 18px; border: 1px solid var(--border-color); background: var(--bg-secondary); color: var(--text-primary); max-height: 90vh; overflow-y: auto;">
        <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid var(--border-color); padding-bottom: 14px; margin-bottom: 18px;">
          <div style="display: flex; align-items: center; gap: 12px;">
            <div style="width: 42px; height: 42px; border-radius: 10px; background: linear-gradient(135deg, #6366f1, #4f46e5); display: flex; align-items: center; justify-content: center; font-size: 1.2rem; color: #fff;">
              <i class="fa-solid fa-barcode"></i>
            </div>
            <div>
              <h3 style="margin: 0; font-size: 1.15rem; font-weight: 700;">2ª Via do Boleto Bancário</h3>
              <span style="font-size: 0.8rem; color: var(--text-muted);">Título Nº <strong>${t.id}</strong> — Banco Health Nexus (341-7)</span>
            </div>
          </div>
          <button id="close-boleto-modal" class="btn-icon" style="background: transparent; border: none; font-size: 1.2rem; color: var(--text-muted); cursor: pointer;"><i class="fa-solid fa-xmark"></i></button>
        </div>

        <!-- CORPO DO BOLETO -->
        <div id="printable-boleto-area" style="background: #ffffff; color: #0f172a; padding: 20px; border-radius: 12px; border: 1px solid #cbd5e1; font-family: Arial, sans-serif;">
          <!-- CABEÇALHO DO BANCO -->
          <div style="display: flex; align-items: center; border-bottom: 2px solid #000; padding-bottom: 8px; font-weight: bold;">
            <span style="font-size: 1.2rem; color: #4f46e5; flex: 1;">HEALTH NEXUS BANK</span>
            <span style="border-left: 2px solid #000; border-right: 2px solid #000; padding: 0 12px; font-size: 1.2rem;">341-7</span>
            <span style="font-size: 0.85rem; font-family: monospace; letter-spacing: 0.5px; padding-left: 10px;">${linhaDigitavel}</span>
          </div>

          <!-- GRID DE INFORMAÇÕES -->
          <div style="display: grid; grid-template-columns: 2fr 1fr 1fr; gap: 1px; background: #94a3b8; margin-top: 10px; border: 1px solid #94a3b8;">
            <div style="background: #fff; padding: 6px 10px;">
              <span style="font-size: 0.65rem; color: #64748b; display: block; text-transform: uppercase;">Beneficiário</span>
              <strong style="font-size: 0.85rem;">Health Nexus Serviços Médicos Hospitalares Ltda</strong>
            </div>
            <div style="background: #fff; padding: 6px 10px;">
              <span style="font-size: 0.65rem; color: #64748b; display: block; text-transform: uppercase;">Agência / Código Beneficiário</span>
              <strong style="font-size: 0.85rem;">0412 / 00948-2</strong>
            </div>
            <div style="background: #fff; padding: 6px 10px;">
              <span style="font-size: 0.65rem; color: #64748b; display: block; text-transform: uppercase;">Vencimento</span>
              <strong style="font-size: 0.85rem; color: #e11d48;">${t.dueDate}</strong>
            </div>

            <div style="background: #fff; padding: 6px 10px; grid-column: span 2;">
              <span style="font-size: 0.65rem; color: #64748b; display: block; text-transform: uppercase;">Pagador / Paciente</span>
              <strong style="font-size: 0.85rem;">${t.client}</strong>
              <span style="font-size: 0.75rem; color: #475569; display: block; margin-top: 2px;">Serviço: ${t.desc}</span>
            </div>
            <div style="background: #fff; padding: 6px 10px;">
              <span style="font-size: 0.65rem; color: #64748b; display: block; text-transform: uppercase;">Valor do Título</span>
              <strong style="font-size: 1.1rem; color: #059669;">${t.amountFormatted}</strong>
            </div>
          </div>

          <!-- CÓDIGO DE BARRAS & PIX -->
          <div style="margin-top: 16px; padding: 14px; background: #f8fafc; border-radius: 8px; border: 1px dashed #cbd5e1; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 15px;">
            <div>
              <span style="font-size: 0.72rem; color: #64748b; font-weight: bold; display: block; margin-bottom: 4px;">PAGUE VIA PIX (APROVAÇÃO INSTANTÂNEA)</span>
              <div style="display: flex; align-items: center; gap: 10px;">
                <div style="width: 58px; height: 58px; background: #fff; padding: 4px; border: 1px solid #cbd5e1; border-radius: 6px; display: flex; align-items: center; justify-content: center;">
                  <i class="fa-solid fa-qrcode" style="font-size: 2.5rem; color: #0f172a;"></i>
                </div>
                <button id="btn-copy-pix" class="btn" style="background: #0d9488; color: #fff; font-size: 0.78rem; padding: 6px 12px; border-radius: 6px; border: none; cursor: pointer;">
                  <i class="fa-solid fa-copy"></i> Copiar Chave Pix
                </button>
              </div>
            </div>

            <div style="text-align: right;">
              <span style="font-size: 0.72rem; color: #64748b; font-weight: bold; display: block; margin-bottom: 4px;">LINHA DIGITÁVEL BOLETO</span>
              <button id="btn-copy-linha" class="btn" style="background: #4f46e5; color: #fff; font-size: 0.78rem; padding: 6px 12px; border-radius: 6px; border: none; cursor: pointer;">
                <i class="fa-solid fa-barcode"></i> Copiar Linha Digitável
              </button>
            </div>
          </div>

          <!-- REPRESENTAÇÃO GRÁFICA DO CÓDIGO DE BARRAS -->
          <div style="margin-top: 16px; text-align: center;">
            <div style="height: 48px; background: repeating-linear-gradient(90deg, #000 0px, #000 2px, #fff 2px, #fff 4px, #000 4px, #000 7px, #fff 7px, #fff 9px, #000 9px, #000 10px); width: 100%; border-radius: 2px;"></div>
            <span style="font-family: monospace; font-size: 0.75rem; color: #64748b; letter-spacing: 2px; margin-top: 4px; display: block;">${t.id} - AUTH 894018492048102</span>
          </div>
        </div>

        <!-- BOTÕES DE AÇÃO DO MODAL -->
        <div style="display: flex; justify-content: flex-end; gap: 10px; margin-top: 20px;">
          <button id="btn-close-boleto-foot" class="btn btn-outline" style="font-size: 0.85rem;">Fechar</button>
          <button id="btn-print-boleto" class="btn btn-primary" style="background: linear-gradient(135deg, #3b82f6, #1d4ed8); font-size: 0.85rem;"><i class="fa-solid fa-print"></i> Imprimir / Baixar Boleto PDF</button>
        </div>
      </div>
    `;

    modal.classList.add('active');

    const close = () => modal.classList.remove('active');
    document.getElementById('close-boleto-modal')?.addEventListener('click', close);
    document.getElementById('btn-close-boleto-foot')?.addEventListener('click', close);

    document.getElementById('btn-copy-linha')?.addEventListener('click', () => {
      navigator.clipboard.writeText(linhaDigitavel);
      if (typeof showToast === 'function') showToast('Linha digitável copiada para a área de transferência!');
    });

    document.getElementById('btn-copy-pix')?.addEventListener('click', () => {
      navigator.clipboard.writeText(pixCopyPaste);
      if (typeof showToast === 'function') showToast('Chave Pix Copia e Cola copiada com sucesso!');
    });

    document.getElementById('btn-print-boleto')?.addEventListener('click', () => {
      const printWin = window.open('', '_blank');
      if (!printWin) {
        alert('Por favor, habilite janelas pop-up para imprimir o boleto.');
        return;
      }
      const boletoHTML = document.getElementById('printable-boleto-area').innerHTML;
      printWin.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Boleto 2ª Via — ${t.id}</title>
          <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
          <style>
            body { font-family: Arial, sans-serif; padding: 30px; color: #000; background: #fff; }
            @page { size: A4 portrait; margin: 10mm; }
          </style>
        </head>
        <body>
          <div style="max-width: 700px; margin: 0 auto; border: 1px solid #000; padding: 20px; border-radius: 8px;">
            ${boletoHTML}
          </div>
          <script>
            window.onload = function() { window.print(); };
          </script>
        </body>
        </html>
      `);
      printWin.document.close();
    });
  }

  const processExport = async (format) => {
    let recordsToExport = [];
    if (activeTab !== 'financial') {
      const checkedIds = Array.from(document.querySelectorAll('.record-checkbox:checked')).map(cb => cb.getAttribute('data-id'));
      if (checkedIds.length === 0) {
        alert('Por favor, selecione ao menos um registro para exportar.');
        return;
      }
      recordsToExport = currentFilteredList.filter(item => checkedIds.includes(item.id));
    }
    
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
      const activeFinStatus = window._activeFinStatusFilter || 'Todos';
      title = activeFinStatus === 'Todos' 
        ? 'Relatório Financeiro de Títulos (Todos os Status)' 
        : `Relatório Financeiro — Títulos ${activeFinStatus.toUpperCase()}`;
      filename = `relatorio_financeiro_${activeFinStatus.toLowerCase().replace(/\s+/g, '_')}`;
      columns = ['Nosso Número', 'Paciente / Cliente', 'Descrição do Serviço', 'Vencimento', 'Valor (R$)', 'Status'];
      
      const finTitlesMasterList = [
        { id: 'TIT-90481', client: 'Carlos Eduardo Silva', desc: 'Consulta Ambulatorial & Exames Especializados', dueDate: '15/06/2026', amountFormatted: 'R$ 350,00', status: 'Vencidas' },
        { id: 'TIT-90482', client: 'Mariana Oliveira Souza', desc: 'Procedimento Cirúrgico Porte 2', dueDate: '20/06/2026', amountFormatted: 'R$ 1.250,00', status: 'Vencidas' },
        { id: 'TIT-90483', client: 'Roberto Mendes Santos', desc: 'Internação UTI Geral (3 diárias)', dueDate: '02/07/2026', amountFormatted: 'R$ 4.800,00', status: 'Vencidas' },
        { id: 'TIT-90484', client: 'Ana Paula Ferreira', desc: 'Exames Laboratoriais Completos', dueDate: '10/07/2026', amountFormatted: 'R$ 280,00', status: 'Vencidas' },
        { id: 'TIT-90485', client: 'Fernando Henrique Rocha', desc: 'Sessão de Fisioterapia Respiratória', dueDate: '18/07/2026', amountFormatted: 'R$ 190,00', status: 'Vencidas' },
        { id: 'TIT-90410', client: 'Juliana Costa Lima', desc: 'Consulta Cardiologia Especializada', dueDate: '28/07/2026', amountFormatted: 'R$ 420,00', status: 'A Vencer' },
        { id: 'TIT-90411', client: 'Lucas Gabriel Pereira', desc: 'Tomografia Computadorizada de Tórax', dueDate: '05/08/2026', amountFormatted: 'R$ 850,00', status: 'A Vencer' },
        { id: 'TIT-90301', client: 'Beatriz Castro Alencar', desc: 'Atendimento de Urgência Pediatria', dueDate: '10/05/2026', amountFormatted: 'R$ 540,00', status: 'Pagas' },
        { id: 'TIT-90302', client: 'Thiago Martins Fonseca', desc: 'Internação Enfermaria Geral (2 diárias)', dueDate: '12/05/2026', amountFormatted: 'R$ 2.150,00', status: 'Pagas' },
        { id: 'TIT-90303', client: 'Patrícia Duarte Ribeiro', desc: 'Consulta Ginecologia & Ultrassom', dueDate: '15/05/2026', amountFormatted: 'R$ 480,00', status: 'Pagas' },
        { id: 'TIT-90304', client: 'Marcos Vinícius Barbosa', desc: 'Procedimento Ortopédico Eletivo', dueDate: '01/06/2026', amountFormatted: 'R$ 1.800,00', status: 'Pagas' },
        { id: 'TIT-90201', client: 'Renata Albuquerque Lima', desc: 'Isenção de Taxa Hospitalar Conveniada', dueDate: '05/06/2026', amountFormatted: 'R$ 150,00', status: 'Bonificadas' },
        { id: 'TIT-90202', client: 'Eduardo Correia Neves', desc: 'Bonificação Convênio Parceiro VIP', dueDate: '10/06/2026', amountFormatted: 'R$ 150,00', status: 'Bonificadas' }
      ];

      const listToExport = activeFinStatus === 'Todos'
        ? finTitlesMasterList
        : finTitlesMasterList.filter(t => t.status === activeFinStatus);

      rows = listToExport.map(t => [
        t.id,
        hasPEP ? t.client : abbreviateName(t.client),
        t.desc,
        t.dueDate,
        t.amountFormatted,
        t.status
      ]);
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
          <div class="tilt-card-3d" style="background:var(--bg-tertiary);border-radius:10px;padding:14px;text-align:center;border:1px solid var(--border-color);"><div id="kpi-doc-active" style="font-size:1.6rem;font-weight:800;color:#818cf8;">0</div><div style="font-size:0.72rem;color:var(--text-muted);margin-top:2px;">Médicos Ativos</div></div>
          <div class="tilt-card-3d" style="background:var(--bg-tertiary);border-radius:10px;padding:14px;text-align:center;border:1px solid var(--border-color);"><div id="kpi-doc-total" style="font-size:1.6rem;font-weight:800;color:#38bdf8;">0</div><div style="font-size:0.72rem;color:var(--text-muted);margin-top:2px;">Total Agendamentos</div></div>
          <div class="tilt-card-3d" style="background:var(--bg-tertiary);border-radius:10px;padding:14px;text-align:center;border:1px solid var(--border-color);"><div id="kpi-doc-progress" style="font-size:1.6rem;font-weight:800;color:#fbbf24;">0</div><div style="font-size:0.72rem;color:var(--text-muted);margin-top:2px;">Em Atendimento</div></div>
          <div class="tilt-card-3d" style="background:var(--bg-tertiary);border-radius:10px;padding:14px;text-align:center;border:1px solid var(--border-color);"><div id="kpi-doc-done" style="font-size:1.6rem;font-weight:800;color:#34d399;">0</div><div style="font-size:0.72rem;color:var(--text-muted);margin-top:2px;">Concluídos</div></div>
        </div>

        <div style="display:grid;grid-template-columns:2fr 1.1fr;gap:18px;margin-bottom:18px;">
          <div class="chart-card tilt-card-3d" id="card-doc-productivity" style="padding:18px;height:250px;position:relative;">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;">
              <h4 style="margin:0;font-size:0.9rem;font-weight:700;color:var(--text-primary);display:flex;align-items:center;gap:8px;">
                <i class="fa-solid fa-chart-column" style="color:#00f2fe;"></i> Agendamentos por Médico
              </h4>
              <div style="display:flex;gap:4px;" id="doc-chart-mode-toggle">
                <button class="chart-mode-pill active" data-mode="bar" title="Visão em Colunas"><i class="fa-solid fa-chart-column"></i></button>
                <button class="chart-mode-pill" data-mode="line" title="Visão em Onda Smooth Wave"><i class="fa-solid fa-chart-line"></i></button>
              </div>
            </div>
            <div style="position:relative;height:185px;width:100%;">
              <canvas id="chart-doc-productivity"></canvas>
            </div>
          </div>

          <div class="chart-card tilt-card-3d" id="card-doc-completion" style="padding:18px;height:250px;position:relative;">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;">
              <h4 style="margin:0;font-size:0.9rem;font-weight:700;color:var(--text-primary);display:flex;align-items:center;gap:8px;">
                <i class="fa-solid fa-chart-pie" style="color:#a855f7;"></i> Distribuição Geral
              </h4>
            </div>
            <div style="position:relative;height:185px;width:100%;display:flex;align-items:center;justify-content:center;">
              <canvas id="chart-doc-completion"></canvas>
              <div class="doc-donut-kpi" style="position:absolute;top:44%;left:50%;transform:translate(-50%,-50%);text-align:center;pointer-events:none;">
                <span id="doc-completion-pct" style="font-family:'Outfit',sans-serif;font-size:1.75rem;font-weight:800;background:linear-gradient(135deg,#ffffff 0%,#34d399 100%);-webkit-background-clip:text;-webkit-text-fill-color:transparent;display:block;line-height:1;filter:drop-shadow(0 0 10px rgba(52,211,153,0.4));">0%</span>
                <span style="font-size:0.65rem;font-weight:700;color:var(--text-secondary,#94a3b8);text-transform:uppercase;letter-spacing:0.04em;display:block;margin-top:2px;">Conclusão</span>
              </div>
            </div>
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
              ${docStats.map((d, idx)=>`
                <tr id="doc-table-row-${idx}" class="doc-table-row" data-idx="${idx}" style="border-bottom:1px solid var(--border-color);transition:background 0.2s ease;cursor:pointer;">
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

      // Animação Numérica 0 -> Final (CountUp)
      const countUp = (el, target, duration = 1200, suffix = '') => {
        if (!el) return;
        const startTime = performance.now();
        const update = (now) => {
          const progress = Math.min(1, (now - startTime) / duration);
          const ease = 1 - Math.pow(1 - progress, 3);
          el.textContent = `${Math.floor(ease * target)}${suffix}`;
          if (progress < 1) requestAnimationFrame(update);
          else el.textContent = `${target}${suffix}`;
        };
        requestAnimationFrame(update);
      };

      countUp(document.getElementById('kpi-doc-active'), ativos);
      countUp(document.getElementById('kpi-doc-total'), totalAppts);
      countUp(document.getElementById('kpi-doc-progress'), totalInProgress);
      countUp(document.getElementById('kpi-doc-done'), totalDone);

      let currentChartMode = 'bar';

      setTimeout(() => {
        const ctxBar = document.getElementById('chart-doc-productivity');
        let instBar = null;

        const renderBarChart = (mode = 'bar') => {
          if (!ctxBar || !window.Chart) return;
          if (instBar) instBar.destroy();
          const c2d = ctxBar.getContext('2d');

          const gradDone = c2d.createLinearGradient(0, 0, 0, 180);
          gradDone.addColorStop(0, '#34d399'); gradDone.addColorStop(1, '#059669');

          const gradProgress = c2d.createLinearGradient(0, 0, 0, 180);
          gradProgress.addColorStop(0, '#fbbf24'); gradProgress.addColorStop(1, '#d97706');

          const gradPending = c2d.createLinearGradient(0, 0, 0, 180);
          gradPending.addColorStop(0, '#6366f1'); gradPending.addColorStop(1, '#00f2fe');

          const labels = docStats.map(d => d.name.replace(/^(Dr\.|Dra\.)\s*/i, '').split(' ')[0]);

          instBar = new window.Chart(c2d, {
            type: mode === 'line' ? 'line' : 'bar',
            data: {
              labels,
              datasets: [
                { label: 'Concluídos', data: docStats.map(d => d.done), backgroundColor: mode === 'line' ? 'rgba(52, 211, 153, 0.15)' : gradDone, borderColor: '#10b981', borderWidth: 2, borderRadius: 6, tension: 0.4, fill: mode === 'line' },
                { label: 'Em Atend.', data: docStats.map(d => d.inProgress), backgroundColor: mode === 'line' ? 'rgba(251, 191, 36, 0.15)' : gradProgress, borderColor: '#f59e0b', borderWidth: 2, borderRadius: 6, tension: 0.4, fill: mode === 'line' },
                { label: 'Pendentes', data: docStats.map(d => Math.max(0, d.total - d.done - d.inProgress)), backgroundColor: mode === 'line' ? 'rgba(99, 102, 241, 0.15)' : gradPending, borderColor: '#6366f1', borderWidth: 2, borderRadius: 6, tension: 0.4, fill: mode === 'line' }
              ]
            },
            options: {
              responsive: true,
              maintainAspectRatio: false,
              animation: { duration: 900, easing: 'easeOutQuart' },
              onClick: (evt, elements) => {
                if (elements && elements.length > 0) {
                  const idx = elements[0].index;
                  const rowEl = document.getElementById(`doc-table-row-${idx}`);
                  if (rowEl) {
                    document.querySelectorAll('.row-highlight-pulse').forEach(r => r.classList.remove('row-highlight-pulse'));
                    rowEl.classList.add('row-highlight-pulse');
                    rowEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
                  }
                }
              },
              plugins: {
                legend: {
                  position: 'top', align: 'end',
                  labels: { color: '#cbd5e1', font: { family: 'Plus Jakarta Sans', size: 10.5, weight: '600' }, usePointStyle: true, boxWidth: 7, padding: 10 }
                },
                tooltip: {
                  backgroundColor: 'rgba(18, 14, 34, 0.94)', titleColor: '#00f2fe', bodyColor: '#f8fafc', borderColor: 'rgba(0, 242, 254, 0.35)', borderWidth: 1, padding: 10, usePointStyle: true
                }
              },
              scales: {
                x: { stacked: mode !== 'line', grid: { color: 'rgba(255, 255, 255, 0.05)', drawBorder: false }, ticks: { color: '#94a3b8', font: { family: 'Plus Jakarta Sans', size: 11, weight: '600' } } },
                y: { stacked: mode !== 'line', grid: { color: 'rgba(255, 255, 255, 0.05)', drawBorder: false }, ticks: { color: '#94a3b8', font: { family: 'Plus Jakarta Sans', size: 10 } } }
              }
            }
          });
          ctxBar._chartInstance = instBar;
        };

        renderBarChart('bar');

        // Ouvintes do Seletor de Modo de Gráfico
        document.querySelectorAll('#doc-chart-mode-toggle .chart-mode-pill').forEach(btn => {
          btn.addEventListener('click', () => {
            document.querySelectorAll('#doc-chart-mode-toggle .chart-mode-pill').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const mode = btn.dataset.mode;
            currentChartMode = mode;
            renderBarChart(mode);
          });
        });

        // Interatividade Hover Tabela -> Gráfico
        document.querySelectorAll('.doc-table-row').forEach(row => {
          row.addEventListener('mouseenter', () => {
            const idx = parseInt(row.dataset.idx, 10);
            if (instBar && instBar.setActiveElements) {
              instBar.setActiveElements([{ datasetIndex: 0, index: idx }, { datasetIndex: 1, index: idx }, { datasetIndex: 2, index: idx }]);
              instBar.update();
            }
          });
          row.addEventListener('mouseleave', () => {
            if (instBar && instBar.setActiveElements) {
              instBar.setActiveElements([]);
              instBar.update();
            }
          });
        });

        const ctxDoughnut = document.getElementById('chart-doc-completion');
        if (ctxDoughnut && window.Chart) {
          if (ctxDoughnut._chartInstance) ctxDoughnut._chartInstance.destroy();

          const pendingCount = Math.max(0, totalAppts - totalDone - totalInProgress);
          const completionRate = totalAppts > 0 ? Math.round((totalDone / totalAppts) * 100) : 0;

          countUp(document.getElementById('doc-completion-pct'), completionRate, 1400, '%');

          const inst2 = new window.Chart(ctxDoughnut.getContext('2d'), {
            type: 'doughnut',
            data: {
              labels: ['Concluídos', 'Em Atendimento', 'Pendentes'],
              datasets: [{
                data: [totalDone, totalInProgress, pendingCount],
                backgroundColor: ['#34d399', '#fbbf24', '#6366f1'],
                borderWidth: 3,
                borderColor: 'rgba(11, 8, 22, 0.95)',
                borderRadius: 6,
                spacing: 3,
                hoverOffset: 12
              }]
            },
            options: {
              responsive: true,
              maintainAspectRatio: false,
              cutout: '76%',
              animation: { animateScale: true, animateRotate: true, duration: 1200 },
              plugins: {
                legend: {
                  position: 'bottom',
                  labels: { color: '#cbd5e1', font: { family: 'Plus Jakarta Sans', size: 10.5, weight: '600' }, usePointStyle: true, padding: 10 }
                },
                tooltip: {
                  backgroundColor: 'rgba(18, 14, 34, 0.94)', titleColor: '#00f2fe', bodyColor: '#f8fafc', borderColor: 'rgba(0, 242, 254, 0.35)', borderWidth: 1, padding: 10,
                  callbacks: {
                    label: (context) => {
                      const val = context.raw || 0;
                      const pct = totalAppts > 0 ? Math.round((val / totalAppts) * 100) : 0;
                      return ` ${context.label}: ${val} (${pct}%)`;
                    }
                  }
                }
              }
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
// --- ABA CONSULTÓRIOS ---
async function renderConsultingRoomsTab() {
  const contentArea = document.getElementById('main-content');
  contentArea.innerHTML = `
    <div class="tab-section active">
      <div class="section-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
        <h2 style="margin: 0;"><i class="fa-solid fa-door-open" style="color: var(--primary);"></i> Gestão de Consultórios</h2>
        <button id="btn-new-room" class="btn btn-primary"><i class="fa-solid fa-plus"></i> Novo Consultório</button>
      </div>

      <div class="table-responsive">
        <table class="data-table" style="width: 100%;">
          <thead>
            <tr>
              <th>ID / Nome</th>
              <th>Especialidade/Uso</th>
              <th>Médico Atual</th>
              <th>Status</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody id="rooms-table-body">
            <tr><td colspan="5" style="text-align: center;">Carregando...</td></tr>
          </tbody>
        </table>
      </div>
    </div>
  `;

  document.getElementById('btn-new-room').addEventListener('click', () => openRoomModal());
  await loadConsultingRooms();
}

async function loadConsultingRooms() {
  const tbody = document.getElementById('rooms-table-body');
  if (!tbody) return;

  try {
    const res = await apiFetch('/api/consulting-rooms');
    const result = await res.json();
    if (result.status === 'success') {
      const rooms = result.data;
      if (rooms.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align: center;">Nenhum consultório cadastrado.</td></tr>';
        return;
      }

      tbody.innerHTML = rooms.map(r => `
        <tr>
          <td><strong>${r.name}</strong><br><small style="color: var(--text-muted);">${r.id}</small></td>
          <td>${r.specialty || '-'}</td>
          <td>${r.currentDoctor ? `<span class="badge" style="background: var(--info); color: white;">${r.currentDoctor}</span>` : '-'}</td>
          <td><span class="badge" style="background: ${r.status === 'Disponível' ? 'var(--success)' : 'var(--warning)'}; color: white;">${r.status}</span></td>
          <td>
            <button class="btn btn-icon btn-outline" onclick="openRoomModal('${r.id}')" title="Editar"><i class="fa-solid fa-pen"></i></button>
            <button class="btn btn-icon btn-danger" onclick="deleteRoom('${r.id}')" title="Excluir"><i class="fa-solid fa-trash"></i></button>
          </td>
        </tr>
      `).join('');
      
      // Salva no state para uso no modal de edição
      state.consultingRooms = rooms;
    } else {
      tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: red;">${result.message || 'Erro ao carregar consultórios.'}</td></tr>`;
    }
  } catch (err) {
    console.error(err);
    tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: red;">Erro de conexão ao carregar consultórios.</td></tr>';
  }
}

function openRoomModal(roomId = null) {
  let room = { id: '', name: '', specialty: '', currentDoctor: '', status: 'Disponível' };
  if (roomId && state.consultingRooms) {
    room = state.consultingRooms.find(r => r.id === roomId) || room;
  }

  const isEdit = !!roomId;
  const modalHtml = `
    <div id="room-modal" class="modal">
      <div class="modal-content" style="max-width: 500px;">
        <div class="modal-header">
          <h3>${isEdit ? 'Editar Consultório' : 'Novo Consultório'}</h3>
          <span class="close-modal" onclick="document.getElementById('room-modal').remove()"><i class="fa-solid fa-xmark"></i></span>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label>Nome / Número do Consultório *</label>
            <input type="text" id="room-name" class="form-control" value="${room.name}" placeholder="Ex: Consultório 01" required>
          </div>
          <div class="form-group">
            <label>Especialidade / Uso Sugerido</label>
            <input type="text" id="room-specialty" class="form-control" value="${room.specialty || ''}" placeholder="Ex: Clínica Geral">
          </div>
          ${isEdit ? `
          <div class="form-group">
            <label>Médico Atual (Opcional)</label>
            <input type="text" id="room-doctor" class="form-control" value="${room.currentDoctor || ''}" placeholder="Deixe em branco se vazio">
          </div>
          <div class="form-group">
            <label>Status</label>
            <select id="room-status" class="form-control">
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

      <!-- Fila de Internação -->
      <div id="internacao-queue-container" style="display: none; margin-bottom: 24px;">
        <h3 style="font-size: 1.1rem; color: var(--danger); margin-bottom: 12px;"><i class="fa-solid fa-clock-rotate-left"></i> Fila de Internação (Aguardando Leito)</h3>
        <div id="internacao-queue-list" style="display: flex; flex-direction: column; gap: 10px;">
          <!-- Items inserted via JS -->
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
            <input type="hidden" id="admit-encounter-id">
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

      // Buscar Fila de Internação
      try {
        const encounters = await cachedApiGet('/api/encounters', 'encounters');
        const queue = encounters.filter(e => e.status === 'Aguardando_Leito');
        const queueContainer = document.getElementById('internacao-queue-container');
        const queueList = document.getElementById('internacao-queue-list');
        
        if (queue.length > 0) {
          queueContainer.style.display = 'block';
          queueList.innerHTML = queue.map(q => `
            <div style="background: var(--bg-secondary); border-left: 4px solid var(--danger); padding: 12px 16px; border-radius: 8px; display: flex; justify-content: space-between; align-items: center; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
              <div>
                <div style="font-weight: 700; color: var(--text-primary); font-size: 1.05rem;">${q.patientName}</div>
                <div style="font-size: 0.85rem; color: var(--text-secondary); margin-top: 4px;">
                  <i class="fa-solid fa-clock"></i> Aguardando Leito (${q.room || '-'})
                </div>
              </div>
              <button class="btn btn-primary btn-sm" onclick="quickAdmitBed(null, '${q.id}', '${(q.patientName||'').replace(/'/g, "\\'")}')">
                <i class="fa-solid fa-bed-pulse"></i> Alocar Leito
              </button>
            </div>
          `).join('');
        } else {
          queueContainer.style.display = 'none';
        }
      } catch (err) {
        console.error('Erro ao carregar fila de internação:', err);
      }

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
    const encInput = document.getElementById('admit-encounter-id');
    const selectedOption = pSelect.options ? pSelect.options[pSelect.selectedIndex] : null;
    const patientId = pSelect.value;
    const patientName = selectedOption ? selectedOption.dataset.name : (pSelect.dataset.name || '');
    const encounterId = encInput ? encInput.value : null;

    if (!bedId || !patientId) {
      alert('Selecione um leito e um paciente.');
      return;
    }

    try {
      const res = await apiFetch('/api/beds/admit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bedId, patientId, patientName, encounterId })
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

window.quickAdmitBed = (bedId, encounterId = null, patientName = null) => {
  const modal = document.getElementById('modal-admit-bed');
  if (modal) {
    modal.style.display = 'flex';
    const bedSelect = document.getElementById('admit-bed-id');
    if (bedSelect && bedId) bedSelect.value = bedId;
    
    const encInput = document.getElementById('admit-encounter-id');
    if (encInput) encInput.value = encounterId || '';

    const pSelect = document.getElementById('admit-patient-id');
    const pSearch = document.getElementById('admit-patient-search');
    if (pSearch) pSearch.value = patientName || ''; // preenche se veio da fila

    if (pSelect) {
      apiFetch(`${API_URL}/patients`).then(r => r.json()).then(patients => {
        const list = Array.isArray(patients) ? patients : (patients.data || []);
        
        // Ordenação Alfabética A-Z por nome completo
        list.sort((a, b) => (a.fullName || '').localeCompare(b.fullName || '', 'pt-BR', { sensitivity: 'base' }));

        const renderOptions = (items) => {
          pSelect.innerHTML = '<option value="" style="background-color: #19142c; color: #ffffff;">Selecione o paciente...</option>' + 
            items.map(p => `<option value="${p.id}" data-name="${p.fullName}" style="background-color: #19142c; color: #ffffff;">${p.fullName} (CPF: ${p.cpf})</option>`).join('');
          
          // Auto-selecionar se patientName foi fornecido e encontrado
          if (patientName) {
            const found = items.find(p => (p.fullName || '').toLowerCase() === patientName.toLowerCase());
            if (found) {
              pSelect.value = found.id;
            }
          }
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
            <i class="fa-solid fa-triangle-exclamation" style="color: #f59e0b;"></i> Painel de Alertas & Estagnação
          </h2>
          <div style="font-size: 0.85rem; color: var(--text-secondary); margin-top: 4px;">
            Monitoramento proativo de permissões, permanência e gargalos hospitalares.
          </div>
        </div>
        <button id="btn-refresh-stagnation" class="btn btn-secondary" style="font-size: 0.85rem; padding: 8px 16px;">
          <i class="fa-solid fa-arrows-rotate" style="margin-right: 6px;"></i> Atualizar Alertas
        </button>
      </div>

      <!-- Área de Aprovações de Acesso Master (Exclusivo para Master) -->
      <div id="stagnation-master-approval-area"></div>

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
    const perms = getRolePermissions(state.user);
    const isMaster = perms.canApproveUsers;
    let pendingUsers = [];

    if (isMaster) {
      try {
        const resUsers = await apiFetch('/api/users');
        if (resUsers.ok) {
          const payloadUsers = await resUsers.json();
          const uList = payloadUsers.data || [];
          pendingUsers = uList.filter(u => u.status === 'Pendente' || u.master_key_requested == 1);
        }
      } catch (e) {
        console.error('Erro ao buscar usuários pendentes:', e);
      }
    }

    const masterArea = document.getElementById('stagnation-master-approval-area');
    if (masterArea) {
      if (isMaster && pendingUsers.length > 0) {
        masterArea.innerHTML = `
          <div style="background: linear-gradient(135deg, rgba(245,158,11,0.12), rgba(217,119,6,0.08)); border: 1px solid rgba(245,158,11,0.4); border-radius: 16px; padding: 20px; margin-bottom: 24px; box-shadow: 0 10px 30px rgba(245,158,11,0.1);">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px; flex-wrap: wrap; gap: 10px;">
              <div style="display: flex; align-items: center; gap: 12px;">
                <div style="width: 44px; height: 44px; border-radius: 12px; background: rgba(245,158,11,0.25); border: 1px solid rgba(245,158,11,0.4); display: flex; align-items: center; justify-content: center; color: #fbbf24;">
                  <i class="fa-solid fa-user-shield" style="font-size: 1.3rem;"></i>
                </div>
                <div>
                  <h3 style="margin: 0; font-size: 1.15rem; font-weight: 700; color: #fbbf24; display: flex; align-items: center; gap: 8px;">
                    Solicitações de Acesso Total (Master) Pendentes
                  </h3>
                  <div style="font-size: 0.82rem; color: var(--text-secondary); margin-top: 2px;">
                    Somente você como Administrador Master pode aprovar ou recusar estas solicitações de acesso.
                  </div>
                </div>
              </div>
              <span style="background: #f59e0b; color: #000; font-weight: 800; font-size: 0.8rem; padding: 4px 14px; border-radius: 20px; box-shadow: 0 0 10px rgba(245,158,11,0.4);">
                ${pendingUsers.length} Solicitação(ões)
              </span>
            </div>

            <div style="display: flex; flex-direction: column; gap: 10px;">
              ${pendingUsers.map(u => `
                <div style="display: flex; align-items: center; justify-content: space-between; background: var(--bg-tertiary); border: 1px solid var(--border-color); border-radius: 12px; padding: 14px 20px; flex-wrap: wrap; gap: 12px;">
                  <div>
                    <div style="font-weight: 700; color: var(--text-primary); font-size: 1rem; display: flex; align-items: center; gap: 8px;">
                      ${u.name} <span style="font-size: 0.82rem; color: #818cf8; font-weight: 600;">(@${u.username})</span>
                    </div>
                    <div style="font-size: 0.8rem; color: var(--text-muted); margin-top: 4px;">
                      Função Solicitada: <strong style="color: #fbbf24;">${u.role || 'Master'}</strong> · Status: <span style="color: #f59e0b; font-weight: 600;">Pendente de Liberação</span>
                    </div>
                  </div>
                  <div style="display: flex; gap: 10px;">
                    <button class="btn btn-stag-approve" data-id="${u.id}" data-name="${u.name}" style="background: linear-gradient(135deg, #10b981, #059669); color: #fff; border: none; font-size: 0.82rem; font-weight: 700; padding: 9px 18px; border-radius: 999px; cursor: pointer; display: flex; align-items: center; gap: 8px; box-shadow: 0 4px 12px rgba(16,185,129,0.3);">
                      <i class="fa-solid fa-shield-check"></i> Aprovar Acesso Total
                    </button>
                    <button class="btn btn-stag-reject" data-id="${u.id}" data-name="${u.name}" style="background: rgba(239,68,68,0.15); color: #f87171; border: 1px solid rgba(239,68,68,0.3); font-size: 0.82rem; font-weight: 600; padding: 9px 16px; border-radius: 999px; cursor: pointer; display: flex; align-items: center; gap: 6px;">
                      <i class="fa-solid fa-xmark"></i> Recusar
                    </button>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
        `;

        masterArea.querySelectorAll('.btn-stag-approve').forEach(btn => {
          btn.addEventListener('click', async () => {
            const uid = btn.dataset.id;
            const uname = btn.dataset.name;
            btn.disabled = true;
            btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Aprovando...';
            try {
              const r = await apiFetch(`/api/users/${uid}/approve-master`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'approve', role: 'Master' })
              });
              if (r.ok) {
                showToast(`✅ Acesso Total aprovado para ${uname}!`);
                loadAndRenderStagnationData();
              } else {
                showCustomAlert({ title: 'Atenção', message: 'Erro ao aprovar usuário.', type: 'warning' });
              }
            } catch (e) {
              showCustomAlert({ title: 'Erro', message: 'Falha de conexão com o servidor.', type: 'danger' });
            }
          });
        });

        masterArea.querySelectorAll('.btn-stag-reject').forEach(btn => {
          btn.addEventListener('click', async () => {
            const uid = btn.dataset.id;
            const uname = btn.dataset.name;
            btn.disabled = true;
            btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Recusando...';
            try {
              const r = await apiFetch(`/api/users/${uid}/approve-master`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'reject', role: 'Médico' })
              });
              if (r.ok) {
                showToast(`Solicitação de ${uname} recusada.`);
                loadAndRenderStagnationData();
              } else {
                showCustomAlert({ title: 'Atenção', message: 'Erro ao recusar usuário.', type: 'warning' });
              }
            } catch (e) {
              showCustomAlert({ title: 'Erro', message: 'Falha de conexão com o servidor.', type: 'danger' });
            }
          });
        });

      } else if (isMaster) {
        masterArea.innerHTML = `
          <div style="background: rgba(255,255,255,0.03); border: 1px dashed rgba(255,255,255,0.1); border-radius: 16px; padding: 20px; margin-bottom: 24px; text-align: center;">
            <i class="fa-solid fa-user-check" style="font-size: 2rem; color: var(--text-muted); margin-bottom: 10px;"></i>
            <h3 style="margin: 0; font-size: 1rem; color: var(--text-secondary);">Nenhuma solicitação pendente</h3>
            <div style="font-size: 0.85rem; color: var(--text-muted); margin-top: 4px;">Não há novos usuários aguardando aprovação no momento.</div>
          </div>
        `;
      } else {
        masterArea.innerHTML = '';
      }
    }

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

    // Atualizar badge do menu lateral acumulando alertas + aprovações pendentes
    const totalNavBadge = alerts.length + (isMaster ? pendingUsers.length : 0);
    const navBadge = document.getElementById('stagnation-nav-badge');
    if (navBadge) {
      if (totalNavBadge > 0) {
        navBadge.textContent = totalNavBadge;
        navBadge.style.display = 'inline-block';
        navBadge.style.background = (isMaster && pendingUsers.length > 0) ? '#f59e0b' : '#ef4444';
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

window.openReassignModal = async function(encounterId, patientName, currentRoom, currentStatus) {
  const existing = document.getElementById('reassign-modal');
  if (existing) existing.remove();

  const modal = document.createElement('div');
  modal.id = 'reassign-modal';
  modal.className = 'modal-overlay';
  modal.style.display = 'flex';
  modal.style.zIndex = '99999';

  // Fetch consulting rooms dynamically
  let roomOptionsHtml = '<option value="">Carregando...</option>';
  try {
    const res = await apiFetch('/api/consulting-rooms');
    const result = await res.json();
    if (result.status === 'success' && result.data.length > 0) {
      roomOptionsHtml = result.data.map(r => {
        const roomValue = `${r.name} ${r.currentDoctor ? `(${r.currentDoctor})` : ''}`.trim();
        const selected = currentRoom && currentRoom.includes(r.name) ? 'selected' : '';
        return `<option value="${roomValue}" ${selected}>${r.name} ${r.specialty ? ` - ${r.specialty}` : ''}</option>`;
      }).join('');
    }
  } catch (err) {
    console.error('Erro ao carregar consultórios no modal:', err);
  }

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
            ${roomOptionsHtml}
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

        <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 10px;">
          <div>
            <button type="button" id="btn-internacao" class="btn" style="background: var(--danger); color: white; border: none;"><i class="fa-solid fa-bed-pulse"></i> Solicitar Internação (UTI / Enf)</button>
          </div>
          <div style="display: flex; gap: 10px;">
            <button type="button" id="btn-cancel-reassign" class="btn btn-secondary">Cancelar</button>
            <button type="submit" class="btn btn-primary">Confirmar Direcionamento</button>
          </div>
        </div>
      </form>
    </div>
  `;

  document.body.appendChild(modal);

  const closeModal = () => modal.remove();
  document.getElementById('close-reassign-modal').addEventListener('click', closeModal);
  document.getElementById('btn-cancel-reassign').addEventListener('click', closeModal);
  
  const btnInternacao = document.getElementById('btn-internacao');
  if (btnInternacao) {
    btnInternacao.addEventListener('click', async () => {
      document.getElementById('reassign-room').value = 'UTI/Internação';
      document.getElementById('reassign-status').value = 'Aguardando_Leito';
      // Option to submit immediately or wait for user to click Confirm:
      // Let's submit immediately
      if (confirm('Deseja realmente solicitar internação para este paciente?')) {
        document.getElementById('reassign-form').dispatchEvent(new Event('submit', { cancelable: true }));
      }
    });
  }

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

// ============================================================================
// --- 💊 MÓDULO DE FARMÁCIA HOSPITALAR & CONTROLE DE ESTOQUE ---
// ============================================================================
async function renderPharmacyTab() {
  const contentArea = document.getElementById('main-content') || document.getElementById('content-area');
  if (!contentArea) return;

  contentArea.innerHTML = `
    <div class="tab-section active">
      <div class="tab-header-banner" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
        <div>
          <h2 style="font-size: 1.5rem; color: var(--text-primary); margin: 0; display: flex; align-items: center; gap: 10px;">
            <i class="fa-solid fa-pills" style="color: #ec4899;"></i> Farmácia Hospitalar &amp; Controle de Estoque
          </h2>
          <p style="color: var(--text-secondary); font-size: 0.88rem; margin-top: 4px;">
            Gerenciamento de medicamentos, dispensação para leitos e alertas de estoque crítico.
          </p>
        </div>
        <div style="display: flex; gap: 10px;">
          <button id="btn-dispense-med" class="btn btn-secondary" style="border-color: #ec4899; color: #f472b6;">
            <i class="fa-solid fa-hand-holding-medical"></i> Dispensar Medicação
          </button>
          <button id="btn-add-pharm-item" class="btn btn-primary" style="background: linear-gradient(135deg, #ec4899, #be185d); border: none;">
            <i class="fa-solid fa-plus"></i> Novo Medicamento
          </button>
        </div>
      </div>

      <!-- KPI CARDS FARMÁCIA -->
      <div class="kpi-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 16px; margin-bottom: 24px;">
        <div class="kpi-card" style="background: var(--bg-secondary); border: 1px solid var(--border-color); padding: 18px; border-radius: 12px;">
          <div style="display: flex; justify-content: space-between; align-items: center; color: var(--text-secondary); font-size: 0.85rem;">
            <span>TOTAL DE ITENS</span>
            <i class="fa-solid fa-boxes-stacked" style="color: var(--color-primary);"></i>
          </div>
          <div id="kpi-pharm-total" style="font-size: 1.8rem; font-weight: 700; color: var(--text-primary); margin-top: 8px;">--</div>
        </div>

        <div class="kpi-card" style="background: var(--bg-secondary); border: 1px solid var(--border-color); padding: 18px; border-radius: 12px;">
          <div style="display: flex; justify-content: space-between; align-items: center; color: var(--text-secondary); font-size: 0.85rem;">
            <span>ESTOQUE CRÍTICO</span>
            <i class="fa-solid fa-triangle-exclamation" style="color: #ef4444;"></i>
          </div>
          <div id="kpi-pharm-critical" style="font-size: 1.8rem; font-weight: 700; color: #ef4444; margin-top: 8px;">--</div>
        </div>

        <div class="kpi-card" style="background: var(--bg-secondary); border: 1px solid var(--border-color); padding: 18px; border-radius: 12px;">
          <div style="display: flex; justify-content: space-between; align-items: center; color: var(--text-secondary); font-size: 0.85rem;">
            <span>UNIDADES EM ESTOQUE</span>
            <i class="fa-solid fa-capsules" style="color: #10b981;"></i>
          </div>
          <div id="kpi-pharm-units" style="font-size: 1.8rem; font-weight: 700; color: #10b981; margin-top: 8px;">--</div>
        </div>

        <div class="kpi-card" style="background: var(--bg-secondary); border: 1px solid var(--border-color); padding: 18px; border-radius: 12px;">
          <div style="display: flex; justify-content: space-between; align-items: center; color: var(--text-secondary); font-size: 0.85rem;">
            <span>VALOR EM ESTOQUE</span>
            <i class="fa-solid fa-brazilian-real-sign" style="color: #3b82f6;"></i>
          </div>
          <div id="kpi-pharm-value" style="font-size: 1.8rem; font-weight: 700; color: #3b82f6; margin-top: 8px;">R$ --</div>
        </div>
      </div>

      <!-- TABELA DE ESTOQUE DA FARMÁCIA -->
      <div class="card" style="background: var(--bg-secondary); border: 1px solid var(--border-color); border-radius: 12px; padding: 20px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
          <h3 style="margin: 0; font-size: 1.1rem; color: var(--text-primary);">Estoque Central de Medicamentos &amp; Insumos</h3>
          <input type="text" id="pharm-search-input" class="form-input" placeholder="Buscar medicamento ou lote..." style="max-width: 280px;">
        </div>

        <div class="table-responsive">
          <table class="data-table" style="width: 100%; border-collapse: collapse;">
            <thead>
              <tr style="border-bottom: 1px solid var(--border-color); text-align: left; font-size: 0.82rem; color: var(--text-secondary);">
                <th style="padding: 12px;">ID / CÓDIGO</th>
                <th style="padding: 12px;">MEDICAMENTO</th>
                <th style="padding: 12px;">DOSAGEM / APRESENTAÇÃO</th>
                <th style="padding: 12px;">LOTE / VALIDADE</th>
                <th style="padding: 12px;">QTD ESTOQUE</th>
                <th style="padding: 12px;">STATUS</th>
                <th style="padding: 12px;">PREÇO UNIT.</th>
              </tr>
            </thead>
            <tbody id="pharmacy-table-body">
              <tr>
                <td colspan="7" style="text-align: center; padding: 24px; color: var(--text-secondary);">
                  <i class="fa-solid fa-spinner fa-spin" style="margin-right: 8px;"></i> Carregando estoque da farmácia...
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;

  // Carregar dados da API
  try {
    const res = await apiFetch('/api/pharmacy');
    if (res.ok) {
      const data = await res.json();
      const items = data.data || [];
      renderPharmacyTable(items);
    }
  } catch (err) {
    showCustomAlert({ title: 'Erro', message: 'Falha ao buscar estoque da farmácia.', type: 'danger' });
  }

  // Event Listeners
  document.getElementById('btn-add-pharm-item')?.addEventListener('click', openAddPharmModal);
  document.getElementById('btn-dispense-med')?.addEventListener('click', openDispenseMedModal);
  document.getElementById('pharm-search-input')?.addEventListener('input', (e) => {
    const term = e.target.value.toLowerCase();
    const rows = document.querySelectorAll('#pharmacy-table-body tr[data-search]');
    rows.forEach(r => {
      const txt = r.getAttribute('data-search') || '';
      r.style.display = txt.includes(term) ? '' : 'none';
    });
  });
}

function renderPharmacyTable(items) {
  const tbody = document.getElementById('pharmacy-table-body');
  if (!tbody) return;

  if (items.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" style="text-align: center; padding: 24px; color: var(--text-secondary);">
          Nenhum medicamento cadastrado no estoque.
        </td>
      </tr>
    `;
    return;
  }

  let totalItems = items.length;
  let criticalCount = 0;
  let totalUnits = 0;
  let totalValue = 0;

  tbody.innerHTML = items.map(item => {
    const qty = Number(item.stockQuantity || 0);
    const min = Number(item.minStock || 10);
    const price = Number(item.unitPrice || 0);
    const isCritical = qty <= min;

    totalUnits += qty;
    totalValue += (qty * price);
    if (isCritical) criticalCount++;

    const statusBadge = isCritical
      ? `<span class="badge" style="background: rgba(239,68,68,0.15); color: #ef4444; border: 1px solid rgba(239,68,68,0.3); padding: 4px 10px; border-radius: 20px; font-size: 0.75rem; font-weight:700;"><i class="fa-solid fa-triangle-exclamation"></i> Estoque Baixo</span>`
      : `<span class="badge" style="background: rgba(16,185,129,0.15); color: #10b981; border: 1px solid rgba(16,185,129,0.3); padding: 4px 10px; border-radius: 20px; font-size: 0.75rem; font-weight:700;"><i class="fa-solid fa-check"></i> Normal</span>`;

    const searchTxt = `${item.id} ${item.name} ${item.lotNumber} ${item.dosage}`.toLowerCase();

    return `
      <tr data-search="${searchTxt}" style="border-bottom: 1px solid var(--border-color); font-size: 0.88rem;">
        <td style="padding: 12px; font-family: monospace; font-weight: 700; color: #ec4899;">${item.id}</td>
        <td style="padding: 12px; font-weight: 600; color: var(--text-primary);">${item.name}</td>
        <td style="padding: 12px; color: var(--text-secondary);">${item.dosage || '-'} (${item.form || 'Und'})</td>
        <td style="padding: 12px; color: var(--text-secondary);">${item.lotNumber || '-'} / <span style="color: var(--text-primary);">${item.expirationDate || '-'}</span></td>
        <td style="padding: 12px; font-weight: 700; color: ${isCritical ? '#ef4444' : 'var(--text-primary)'};">${qty} unds</td>
        <td style="padding: 12px;">${statusBadge}</td>
        <td style="padding: 12px; color: var(--text-primary); font-weight: 600;">R$ ${price.toFixed(2)}</td>
      </tr>
    `;
  }).join('');

  document.getElementById('kpi-pharm-total').textContent = totalItems;
  document.getElementById('kpi-pharm-critical').textContent = criticalCount;
  document.getElementById('kpi-pharm-units').textContent = totalUnits;
  document.getElementById('kpi-pharm-value').textContent = `R$ ${totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
}

function openAddPharmModal() {
  showCustomAlert({ title: 'Novo Medicamento', message: 'Preencha o formulário para adicionar ao Estoque Central.', type: 'info' });
}

function openDispenseMedModal() {
  showCustomAlert({ title: 'Dispensação de Medicação', message: 'Selecione a prescrição ou leito para baixa de estoque.', type: 'info' });
}


// ============================================================================
// --- 📺 MÓDULO PAINEL DE CHAMADA PARA TV (TV SIGNAGE COM VOZ E MANCHESTER) ---
// ============================================================================
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
            Exibição em tela cheia para TV com chamada sonora e classificação por Manchester.
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
              <span style="font-size: 0.8rem; color: #94a3b8;">SISTEMA DE CHAMADA AUDÍVEL &amp; TRIAGEM VISUAL</span>
            </div>
          </div>
          <div id="tv-clock" style="font-size: 1.8rem; font-weight: 800; font-family: monospace; color: #38bdf8;">--:--:--</div>
        </div>

        <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 24px;">
          
          <!-- CARD CENTRAL: ÚLTIMO PACIENTE CHAMADO -->
          <div style="background: rgba(15, 23, 42, 0.8); border: 2px solid #38bdf8; border-radius: 16px; padding: 32px; text-align: center; display: flex; flex-direction: column; justify-content: center; align-items: center; min-height: 300px; box-shadow: 0 0 25px rgba(2, 132, 199, 0.3);">
            <span style="font-size: 0.9rem; letter-spacing: 2px; text-transform: uppercase; color: #94a3b8; font-weight: 700; margin-bottom: 12px;">ÚLTIMO PACIENTE CHAMADO</span>
            <div id="tv-last-patient" style="font-size: 2.6rem; font-weight: 900; color: #fff; margin-bottom: 16px; text-shadow: 0 2px 10px rgba(0,0,0,0.5);">Aguardando chamada...</div>
            
            <div style="display: flex; align-items: center; gap: 16px; margin-top: 10px;">
              <div id="tv-last-room" style="font-size: 1.6rem; font-weight: 800; background: #0284c7; padding: 8px 24px; border-radius: 30px; color: #fff;">--</div>
              <div id="tv-last-badge" style="font-size: 1.1rem; font-weight: 800; padding: 8px 20px; border-radius: 30px; background: rgba(255,255,255,0.1); color: #cbd5e1;">--</div>
            </div>
          </div>

          <!-- HISTÓRICO DAS ÚLTIMAS CHAMADAS -->
          <div style="background: rgba(15, 23, 42, 0.6); border: 1px solid rgba(255,255,255,0.1); border-radius: 16px; padding: 20px;">
            <h4 style="margin-top: 0; margin-bottom: 16px; font-size: 1rem; color: #94a3b8; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 8px; display: flex; align-items: center; gap: 8px;">
              <i class="fa-solid fa-history"></i> ÚLTIMAS CHAMADAS
            </h4>
            <div id="tv-history-list" style="display: flex; flex-direction: column; gap: 10px; max-height: 260px; overflow-y: auto;">
              <div style="text-align: center; color: #64748b; padding: 20px; font-size: 0.85rem;">Nenhuma chamada registrada hoje.</div>
            </div>
          </div>

        </div>

      </div>
    </div>
  `;

  // Iniciar relógio digital da TV
  const updateClock = () => {
    const el = document.getElementById('tv-clock');
    if (el) el.textContent = new Date().toLocaleTimeString('pt-BR');
  };
  updateClock();
  if (window._tvPollingTimer) clearInterval(window._tvPollingTimer);
  loadTVCalls();
  window._tvPollingTimer = setInterval(() => {
    const tvEl = document.getElementById('tv-last-patient');
    if (tvEl) {
      loadTVCalls();
    } else {
      clearInterval(window._tvPollingTimer);
      window._tvPollingTimer = null;
    }
  }, 3000);

  // Listener para botão de chamar paciente
  document.getElementById('btn-tv-call-modal')?.addEventListener('click', openTVCallModal);
}

async function loadTVCalls() {
  try {
    const res = await apiFetch('/api/tv/calls');
    if (res.ok) {
      const data = await res.json();
      const calls = data.data || [];
      renderTVCallsUI(calls);
    }
  } catch (e) {}
}

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

async function openTVCallModal() {
  let waitingPatients = [];
  try {
    const res = await apiFetch('/api/encounters');
    if (res.ok) {
      const data = await res.json();
      waitingPatients = (data.data || []).filter(e => e.status !== 'Finalizado' && e.status !== 'Cancelado');
    }
  } catch(e) {}

  const existingModal = document.getElementById('hn-tv-call-modal');
  if (existingModal) existingModal.remove();

  const overlay = document.createElement('div');
  overlay.id = 'hn-tv-call-modal';
  overlay.className = 'modal-overlay';
  overlay.style.cssText = 'z-index: 999999; display: flex; align-items: center; justify-content: center; background: rgba(0, 0, 0, 0.75); backdrop-filter: blur(8px);';

  const patientOptions = waitingPatients.map(p => `
    <option value="${p.patientName}" data-manchester="${p.manchesterColor || 'Verde'}">${p.patientName} (${p.status === 'Aguardando_Triagem' ? 'Ag. Triagem' : p.status === 'Aguardando_Atendimento' ? 'Ag. Atendimento' : 'Em Consulta'})</option>
  `).join('');

  overlay.innerHTML = `
    <div class="sync-modal-card" style="max-width: 480px; width: 90%; background: #0f172a; border: 1px solid #0284c7; border-radius: 16px; overflow: hidden; box-shadow: 0 20px 50px rgba(0,0,0,0.6);">
      <div class="sync-header-banner" style="background: linear-gradient(135deg, #0284c7, #0369a1); padding: 16px 20px;">
        <h3 class="sync-header-title" style="font-size: 1.1rem; display: flex; align-items: center; gap: 10px; color: #fff; margin: 0;">
          <i class="fa-solid fa-bullhorn"></i> Chamar Paciente no Painel TV
        </h3>
      </div>

      <div class="sync-modal-body" style="padding: 20px 24px; display: flex; flex-direction: column; gap: 14px;">
        <div>
          <label style="display: block; font-size: 0.85rem; font-weight: 600; color: #94a3b8; margin-bottom: 6px;">
            <i class="fa-solid fa-user"></i> Selecionar Paciente da Fila:
          </label>
          ${waitingPatients.length > 0 ? `
            <select id="tv-modal-patient-select" style="width: 100%; padding: 10px; border-radius: 8px; background: #1e293b; color: #fff; border: 1px solid #334155; margin-bottom: 8px;">
              <option value="">-- Selecionar da fila em atendimento --</option>
              ${patientOptions}
            </select>
          ` : ''}
          <input type="text" id="tv-modal-patient-name" placeholder="Ou digite o nome do paciente..." value="${waitingPatients.length > 0 ? waitingPatients[0].patientName : ''}" style="width: 100%; padding: 10px; border-radius: 8px; background: #1e293b; color: #fff; border: 1px solid #334155;" />
        </div>

        <div>
          <label style="display: block; font-size: 0.85rem; font-weight: 600; color: #94a3b8; margin-bottom: 6px;">
            <i class="fa-solid fa-door-open"></i> Consultório / Sala de Destino:
          </label>
          <select id="tv-modal-room" style="width: 100%; padding: 10px; border-radius: 8px; background: #1e293b; color: #fff; border: 1px solid #334155;">
            <option value="Consultório 01">Consultório 01</option>
            <option value="Consultório 02">Consultório 02</option>
            <option value="Consultório 03">Consultório 03</option>
            <option value="Sala de Triagem">Sala de Triagem</option>
            <option value="Exames / Raio-X">Exames / Raio-X</option>
            <option value="Recepção">Recepção</option>
          </select>
        </div>

        <div>
          <label style="display: block; font-size: 0.85rem; font-weight: 600; color: #94a3b8; margin-bottom: 6px;">
            <i class="fa-solid fa-notes-medical"></i> Classificação Manchester:
          </label>
          <select id="tv-modal-color" style="width: 100%; padding: 10px; border-radius: 8px; background: #1e293b; color: #fff; border: 1px solid #334155;">
            <option value="Verde">Pouco Urgente (Verde)</option>
            <option value="Amarelo">Urgente (Amarelo)</option>
            <option value="Laranja">Muito Urgente (Laranja)</option>
            <option value="Vermelho">Emergência (Vermelho)</option>
            <option value="Azul">Não Urgente (Azul)</option>
          </select>
        </div>

        <div style="display: flex; gap: 10px; margin-top: 10px;">
          <button id="btn-tv-modal-confirm" class="btn btn-primary" style="flex: 1; padding: 12px; background: linear-gradient(135deg, #0284c7, #0369a1); border: none; font-weight: 700; cursor: pointer;">
            <i class="fa-solid fa-volume-high"></i> Emitir Chamada
          </button>
          <button id="btn-tv-modal-cancel" class="btn" style="flex: 1; padding: 12px; background: #1e293b; border: 1px solid #334155; color: #cbd5e1; cursor: pointer;">
            Cancelar
          </button>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  const selectEl = document.getElementById('tv-modal-patient-select');
  const inputEl = document.getElementById('tv-modal-patient-name');
  const colorEl = document.getElementById('tv-modal-color');

  if (selectEl) {
    selectEl.addEventListener('change', (ev) => {
      if (ev.target.value) {
        inputEl.value = ev.target.value;
        const opt = ev.target.options[ev.target.selectedIndex];
        const m = opt.getAttribute('data-manchester');
        if (m) colorEl.value = m;
      }
    });
  }

  document.getElementById('btn-tv-modal-cancel').addEventListener('click', () => overlay.remove());

  document.getElementById('btn-tv-modal-confirm').addEventListener('click', async () => {
    const patientName = inputEl.value.trim();
    const roomName = document.getElementById('tv-modal-room').value;
    const manchesterColor = colorEl.value;

    if (!patientName) {
      showCustomAlert({ title: 'Atenção', message: 'Por favor, informe o nome do paciente.', type: 'warning' });
      return;
    }

    try {
      await apiFetch('/api/tv/call', {
        method: 'POST',
        body: JSON.stringify({ patientName, roomName, manchesterColor })
      });

      if ('speechSynthesis' in window) {
        const text = `Atenção: Paciente ${patientName}, favor dirigir-se ao ${roomName}.`;
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'pt-BR';
        utterance.rate = 0.9;
        window.speechSynthesis.speak(utterance);
      }

      overlay.remove();
      showCustomAlert({ title: 'Chamada Emitida', message: `Chamada para ${patientName} no ${roomName} emitida com voz!`, type: 'success' });
      loadTVCalls();
    } catch (e) {
      showCustomAlert({ title: 'Erro', message: 'Falha ao emitir chamada na TV.', type: 'danger' });
    }
  });
}

