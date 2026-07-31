
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
    // Timer was removed because we don't auto-sync. 
    // We let updateSyncBadge handle the UI.
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
      if (statusData && statusData.cloudConfigured && !statusData.isVercel) {
        const hasNewData = statusData.cloudTimestamps.main_data > statusData.localTimestamps.main_data;
        
        if (force) {
          if (statusData.local_updates > 0) {
            showSyncPromptModal(statusData);
          } else if (hasNewData || statusData.conflict) {
            showSyncComparisonModal(statusData);
          } else {
            showToast('Banco local já está atualizado com a nuvem.');
          }
        } else {
          // Checagem em background
          if (statusData.local_updates > 0) {
            // Ação principal do usuário: sempre envie para a nuvem!
            syncManager.pushToCloud(false);
          } else if (hasNewData) {
            showSyncComparisonModal(statusData);
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
      const res = await apiFetch('/api/sync/push', {
        method: 'POST'
      });

      if (res.ok) {
        const body = await res.json().catch(() => ({}));
        if (body.isVercel) {
          if (showToastMessage) showToast('Modo Vercel: Dados gravados na nuvem em tempo real.');
          return true;
        }
        const now = Date.now();
        localStorage.setItem('hn_last_local_update', now.toString());
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
      const res = await apiFetch('/api/sync/pull', { method: 'POST' });
      if (res.ok) {
        const body = await res.json().catch(() => ({}));
        if (body.isVercel) {
          showToast('Modo Vercel: O sistema já utiliza os dados diretamente da nuvem.');
          return true;
        }
        const now = Date.now();
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

const scheduleSyncUpload = async () => {
  if (state.syncInfo && (!state.syncInfo.cloudConfigured || state.syncInfo.isVercel)) return;
  if (syncUploadTimeout) clearTimeout(syncUploadTimeout);
  
  syncUploadTimeout = setTimeout(async () => {
    // Toda alteração feita no notebook é automaticamente enviada para a nuvem em 1s
    await syncManager.pushToCloud(false);
  }, 1000);
};

const getSyncStatus = async () => {
  try {
    const res = await apiFetch('/api/sync/check');
    if (!res.ok) {
      state.syncInfo = { cloudConfigured: false, isVercel: false, synchronized: true, local_updates: 0 };
      updateSyncBadge();
      return state.syncInfo;
    }
    const body = await res.json();
    // `data` pode ser undefined se o servidor retornar status de erro sem campo data
    const data = body.data;
    if (!data) {
      state.syncInfo = { cloudConfigured: false, isVercel: !!body.isVercel, synchronized: true, local_updates: 0 };
      updateSyncBadge();
      return state.syncInfo;
    }
    const isVercel = !!body.isVercel;
    state.syncInfo = {
      cloudConfigured: isVercel ? true : !!data.cloud_connected,
      cloudReachable: !!data.cloud_connected,
      synchronized: isVercel ? true : (data.local_updates === 0 && data.cloud_last_update <= data.local_last_update),
      local_updates: data.local_updates || 0,
      localTimestamps: { main_data: data.local_last_update || 0 },
      cloudTimestamps: { main_data: data.cloud_last_update || 0 },
      isVercel,
      conflict: data.conflict || false
    };
    updateSyncBadge();
    return state.syncInfo;
  } catch (err) {
    console.error('Erro ao obter status de sincronização:', err);
    state.syncInfo = { cloudConfigured: false, isVercel: false, synchronized: true, local_updates: 0 };
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
    if (hasLocalUpdates || statusData.isVercel) {
      showSyncPromptModal(statusData);
    } else if (cloudMax.time > localMax.time) {
      showSyncComparisonModal(statusData);
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

  if (data.cloudReachable === false) {
    badge.textContent = 'Nuvem inacessível — modo local';
    badge.style.background = 'rgba(245,158,11,0.12)';
    badge.style.borderColor = 'rgba(245,158,11,0.3)';
    badge.style.color = '#b45309';
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
      const res = await fetch(`${API_URL}/auth/me`, {
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
          <!-- Coluna 1: Formulário Completo com Máscaras e Dados Hospitalares/SUS -->
          <div class="patients-form-container" style="max-width: 100%;">
            <h3 id="form-title" style="margin-bottom: 16px; font-family: 'Outfit'; font-weight: 600; display: flex; align-items: center; gap: 8px;">
              <i class="fa-solid fa-id-card" style="color: var(--color-primary);"></i> Admissão de Paciente
            </h3>
            <form id="patient-form">
              <input type="hidden" id="editId">

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
              </div>

              <!-- SEÇÃO 2: CONVÊNIO & CONTATO -->
              <div style="background: var(--bg-tertiary); border: 1px solid var(--border-color); border-radius: 10px; padding: 14px; margin-bottom: 16px;">
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
              <div style="background: var(--bg-tertiary); border: 1px solid var(--border-color); border-radius: 10px; padding: 14px; margin-bottom: 16px;">
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

              <div style="display: flex; gap: 10px; margin-top: 20px;">
                <button type="submit" id="submit-btn" class="btn btn-primary" style="flex: 1;">Registrar Paciente</button>
                <button type="button" id="cancel-edit-btn" class="btn" style="display: none; background-color: var(--bg-tertiary); color: var(--text-primary);">Cancelar</button>
              </div>
            </form>
          </div>

          <!-- Coluna 2: Lista com Busca Inteligente -->
          <div class="patients-list-container">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
              <h3 style="margin: 0; font-family: 'Outfit'; font-weight: 600;">Pacientes Cadastrados</h3>
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
          document.getElementById('cancel-edit-btn').style.display = "inline-flex";

          checkAgeValidation();

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
      document.getElementById('cancel-edit-btn').style.display = "none";
      const alertBadge = document.getElementById('responsible-alert-badge');
      if (alertBadge) alertBadge.style.display = 'none';
    };

    // Registrar cancelamento
    document.getElementById('cancel-edit-btn').addEventListener('click', resetForm);

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

  const billingSum = d.billingSummary
    ? d.billingSummary
    : { totalRevenue: 245000.00, pendingClaims: 45100.00 };

  state.dashboardData = {
    activePatients: realActivePatients || 28,
    occupancyRate: d.occupancyRate || 84.5,
    averageWaitTimeMinutes: d.averageWaitTimeMinutes || 18,
    dailyAppointmentsCount: d.dailyAppointmentsCount || 84,
    billingSummary: billingSum,
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
        <div class="filters-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(170px, 1fr)); gap: 10px; align-items: flex-end;">
          <div class="filter-group">
            <label>Vencimento Inicial</label>
            <input type="date" id="filter-date-start" value="${new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0]}">
          </div>
          <div class="filter-group">
            <label>Vencimento Final</label>
            <input type="date" id="filter-date-end" value="${new Date(new Date().getFullYear(), 11, 31).toISOString().split('T')[0]}">
          </div>
          <div class="filter-group">
            <label>Tipo Operação</label>
            <select id="filter-fin-type" style="width:100%;padding:7px 10px;border-radius:8px;border:1px solid var(--border-color);background:var(--bg-tertiary);color:var(--text-primary);font-size:0.82rem;cursor:pointer;">
              <option value="Todos">Todos (Receitas/Despesas)</option>
              <option value="Receita">Receitas (Entradas)</option>
              <option value="Despesa">Despesas (Saídas)</option>
            </select>
          </div>
          <div class="filter-group">
            <label>Status (Checkboxes)</label>
            <div class="dropdown-check-list" id="dropdown-fin-status">
              <div class="anchor" onclick="toggleFilterDropdown('dropdown-fin-status', event)">Status: Todos</div>
              <ul class="items">
                <li><input type="checkbox" id="filter-fin-all" checked><label for="filter-fin-all"><strong>Selecionar Todos</strong></label></li>
                <li><input type="checkbox" class="filter-fin-item" value="Pagas" id="fin-st-1" checked><label for="fin-st-1">Pagas</label></li>
                <li><input type="checkbox" class="filter-fin-item" value="A Vencer" id="fin-st-2" checked><label for="fin-st-2">A Vencer</label></li>
                <li><input type="checkbox" class="filter-fin-item" value="Vencidas" id="fin-st-3" checked><label for="fin-st-3">Vencidas</label></li>
                <li><input type="checkbox" class="filter-fin-item" value="Bonificadas" id="fin-st-4" checked><label for="fin-st-4">Bonificadas</label></li>
                <li><input type="checkbox" class="filter-fin-item" value="Suspensas" id="fin-st-5" checked><label for="fin-st-5">Suspensas</label></li>
                <li><input type="checkbox" class="filter-fin-item" value="Canceladas" id="fin-st-6" checked><label for="fin-st-6">Canceladas</label></li>
                <li><input type="checkbox" class="filter-fin-item" value="Excluídas" id="fin-st-7" checked><label for="fin-st-7">Excluídas</label></li>
              </ul>
            </div>
          </div>
          <div class="filter-group">
            <label>Categorias</label>
            <div class="dropdown-check-list" id="dropdown-fin-category">
              <div class="anchor" onclick="toggleFilterDropdown('dropdown-fin-category', event)">Categorias: Todas</div>
              <ul class="items">
                <li><input type="checkbox" id="filter-fin-cat-all" checked><label for="filter-fin-cat-all"><strong>Selecionar Todas</strong></label></li>
                <li><input type="checkbox" class="filter-fin-cat-item" value="Consultas" id="fin-cat-1" checked><label for="fin-cat-1">Consultas</label></li>
                <li><input type="checkbox" class="filter-fin-cat-item" value="Procedimentos" id="fin-cat-2" checked><label for="fin-cat-2">Procedimentos</label></li>
                <li><input type="checkbox" class="filter-fin-cat-item" value="Exames" id="fin-cat-3" checked><label for="fin-cat-3">Exames</label></li>
                <li><input type="checkbox" class="filter-fin-cat-item" value="Operacionais" id="fin-cat-4" checked><label for="fin-cat-4">Operacionais</label></li>
                <li><input type="checkbox" class="filter-fin-cat-item" value="Farmácia" id="fin-cat-5" checked><label for="fin-cat-5">Farmácia</label></li>
                <li><input type="checkbox" class="filter-fin-cat-item" value="Insumos" id="fin-cat-6" checked><label for="fin-cat-6">Insumos</label></li>
              </ul>
            </div>
          </div>
          <div class="filter-group">
            <label>Forma Pagamento</label>
            <div class="dropdown-check-list" id="dropdown-fin-method">
              <div class="anchor" onclick="toggleFilterDropdown('dropdown-fin-method', event)">Formas: Todas</div>
              <ul class="items">
                <li><input type="checkbox" id="filter-fin-method-all" checked><label for="filter-fin-method-all"><strong>Selecionar Todas</strong></label></li>
                <li><input type="checkbox" class="filter-fin-method-item" value="Pix" id="fin-m-1" checked><label for="fin-m-1">Pix</label></li>
                <li><input type="checkbox" class="filter-fin-method-item" value="Boleto" id="fin-m-2" checked><label for="fin-m-2">Boleto</label></li>
                <li><input type="checkbox" class="filter-fin-method-item" value="Cartão de Crédito" id="fin-m-3" checked><label for="fin-m-3">Cartão Crédito</label></li>
                <li><input type="checkbox" class="filter-fin-method-item" value="Cartão de Débito" id="fin-m-4" checked><label for="fin-m-4">Cartão Débito</label></li>
                <li><input type="checkbox" class="filter-fin-method-item" value="Dinheiro" id="fin-m-5" checked><label for="fin-m-5">Dinheiro</label></li>
                <li><input type="checkbox" class="filter-fin-method-item" value="Convênio" id="fin-m-6" checked><label for="fin-m-6">Convênio</label></li>
              </ul>
            </div>
          </div>
          <div class="filter-group">
            <label>Busca Livre</label>
            <input type="text" id="filter-fin-search" placeholder="Paciente ou ID..." style="width:100%;padding:7px 10px;border-radius:8px;border:1px solid var(--border-color);background:var(--bg-tertiary);color:var(--text-primary);font-size:0.82rem;">
          </div>
          <div class="filter-group" style="grid-column: span 2; min-width: 240px;">
            <button id="btn-open-fin-window-top" class="btn btn-primary" style="width:100%;background:linear-gradient(135deg, #00f2fe, #4f46e5);color:#fff;font-weight:700;font-size:0.82rem;padding:8px 12px;border-radius:8px;display:flex;align-items:center;justify-content:center;gap:6px;box-shadow:0 4px 12px rgba(0,242,254,0.25);cursor:pointer;">
              <i class="fa-solid fa-window-restore"></i> Visualizar Listagem em Janela Dedicada
            </button>
          </div>
        </div>
      `;
    }

    // Registrar event listeners nos campos de texto/data/select
    const textInputs = filtersContainer.querySelectorAll('input[type="date"], input[type="text"], input[type="number"], select');
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
      setupFilterGroupSelectAll('filter-fin-cat-all', 'filter-fin-cat-item', 'dropdown-fin-category', 'Categorias');
      setupFilterGroupSelectAll('filter-fin-method-all', 'filter-fin-method-item', 'dropdown-fin-method', 'Formas');
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

  const filterAndRender = async () => {
    if (activeTab === 'financial') {
      const previewCard = document.querySelector('.preview-card');
      if (!previewCard) return;

      // Capturar filtros ativos dos controles da UI
      const dStart = document.getElementById('filter-date-start')?.value;
      const dEnd = document.getElementById('filter-date-end')?.value;
      const opType = document.getElementById('filter-fin-type')?.value || 'Todos';
      const selStatus = [...document.querySelectorAll('.filter-fin-item:checked')].map(c => c.value);
      const selCat = [...document.querySelectorAll('.filter-fin-cat-item:checked')].map(c => c.value);
      const selMethod = [...document.querySelectorAll('.filter-fin-method-item:checked')].map(c => c.value);
      const sTerm = document.getElementById('filter-fin-search')?.value?.toLowerCase()?.trim() || '';

      let pagasCount = 0, pagasVal = 0;
      let aVencerCount = 0, aVencerVal = 0;
      let vencidasCount = 0, vencidasVal = 0;
      let bonificadasCount = 0, bonificadasVal = 0;
      let suspensasCount = 0, suspensasVal = 0;
      let canceladasCount = 0, canceladasVal = 0;
      let excluidasCount = 0, excluidasVal = 0;

      let finTitlesList = [];
      try {
        const response = await apiFetch('/api/financial/installments');
        if (response.ok) {
          const installments = await response.json();
          finTitlesList = installments.filter(inst => {
            const val = parseFloat(inst.amount) || 0;
            const due = inst.dueDate || '';
            const instType = inst.type || 'Receita';
            const instCat = inst.category || 'Consultas';
            const instMethod = inst.paymentMethod || 'Pix';
            const clientName = (inst.patientName || '').toLowerCase();
            const descName = (inst.description || '').toLowerCase();
            const idName = (inst.id || '').toLowerCase();

            // Filtro por Data
            if (dStart && due < dStart) return false;
            if (dEnd && due > dEnd) return false;

            // Filtro por Tipo de Operação
            if (opType !== 'Todos' && instType !== opType) return false;

            // Filtro por Status
            if (selStatus.length > 0 && !selStatus.includes(inst.status)) return false;

            // Filtro por Categoria
            if (selCat.length > 0 && !selCat.includes(instCat)) return false;

            // Filtro por Forma de Pagamento
            if (selMethod.length > 0 && !selMethod.includes(instMethod)) return false;

            // Busca Livre por Texto
            if (sTerm && !clientName.includes(sTerm) && !descName.includes(sTerm) && !idName.includes(sTerm)) return false;

            return true;
          }).map(inst => {
            const val = parseFloat(inst.amount) || 0;
            switch(inst.status) {
              case 'Pagas': pagasCount++; pagasVal += val; break;
              case 'A Vencer': aVencerCount++; aVencerVal += val; break;
              case 'Vencidas': vencidasCount++; vencidasVal += val; break;
              case 'Bonificadas': bonificadasCount++; bonificadasVal += val; break;
              case 'Suspensas': suspensasCount++; suspensasVal += val; break;
              case 'Canceladas': canceladasCount++; canceladasVal += val; break;
              case 'Excluídas': excluidasCount++; excluidasVal += val; break;
            }

            let color = '#00f2fe';
            if (inst.status === 'Pagas') color = '#34d399';
            if (inst.status === 'Vencidas') color = '#f43f5e';
            if (inst.status === 'Bonificadas') color = '#fbbf24';
            if (inst.status === 'Suspensas') color = '#a855f7';
            if (inst.status === 'Canceladas') color = '#f97316';
            if (inst.status === 'Excluídas') color = '#dc2626';

            return {
              id: inst.id,
              client: inst.patientName,
              desc: inst.description,
              dueDate: new Date(inst.dueDate).toLocaleDateString('pt-BR'),
              amount: val,
              amountFormatted: new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val),
              status: inst.status,
              type: inst.type || 'Receita',
              category: inst.category || 'Consultas',
              paymentMethod: inst.paymentMethod || 'Pix',
              installmentNumber: inst.installmentNumber || 1,
              totalInstallments: inst.totalInstallments || 1,
              color: color
            };
          });
        }
      } catch (e) {
        console.error("Erro ao carregar dados financeiros", e);
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

      window._activeFinStatusFilter = 'Todos';

      previewCard.innerHTML = `
        <div class="preview-header" style="flex-wrap: wrap; gap: 15px;">
          <h3><i class="fa-solid fa-file-invoice-dollar" style="color: var(--color-primary);"></i> Relatório Financeiro de Títulos & Baixa Manual</h3>
          <div style="margin-left: auto; display: flex; gap: 8px; flex-wrap: wrap;">
            <button id="btn-open-fin-window-card" class="btn btn-primary" style="background: linear-gradient(135deg, #00f2fe, #4f46e5); font-size: 0.8rem;"><i class="fa-solid fa-window-restore"></i> Abrir Janela Dedicada</button>
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
            <span style="font-size: 0.75rem; color: var(--text-muted); display: block;">SUBTOTAL FILTRADO</span>
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
            <div style="position: relative; width: 210px; height: 210px; margin: 0 auto; display: flex; align-items: center; justify-content: center;">
              <canvas id="finPieChart"></canvas>
              <div class="fin-donut-kpi" style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); text-align: center; pointer-events: none;">
                <span id="fin-completion-pct" style="font-family: 'Outfit', sans-serif; font-size: 2.2rem; font-weight: 800; background: linear-gradient(135deg, #ffffff 0%, #34d399 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; display: block; line-height: 1; filter: drop-shadow(0 0 10px rgba(52, 211, 153, 0.45));">0%</span>
                <span style="font-size: 0.65rem; font-weight: 700; color: var(--text-secondary, #94a3b8); text-transform: uppercase; letter-spacing: 0.05em; display: block; margin-top: 4px;">PAGAS DA CARTEIRA</span>
              </div>
            </div>

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

        <div id="fin-titles-table-card" class="glass-card" style="margin-top: 22px; padding: 20px; border-radius: 14px; border: 1px solid var(--border-color);">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; flex-wrap: wrap; gap: 12px;">
            <div>
              <h4 id="fin-table-title" style="margin: 0; font-size: 1.05rem; font-weight: 700; color: var(--text-primary); display: flex; align-items: center; gap: 8px;">
                <i class="fa-solid fa-list-check" style="color: #00f2fe;"></i> Títulos Financeiros
                <span id="fin-status-filter-tag" style="font-size:0.76rem; font-weight:600; padding:3px 10px; border-radius:12px; background:rgba(0,242,254,0.12); color:#00f2fe; border:1px solid rgba(0,242,254,0.3);">Todos os Status</span>
              </h4>
              <p style="margin: 4px 0 0 0; font-size: 0.78rem; color: var(--text-muted);">Clique no botão <strong style="color:#00f2fe;">Dar Baixa Manual</strong> para quitar qualquer parcela de forma simples e detalhada.</p>
            </div>
            <div style="display: flex; gap: 8px; flex-wrap: wrap;">
              <button id="btn-fin-show-all" class="btn btn-outline" style="font-size: 0.78rem; padding: 5px 12px;"><i class="fa-solid fa-rotate-left"></i> Mostrar Todos</button>
              <button id="btn-fin-card-pdf" class="btn btn-primary" style="background: linear-gradient(135deg, #ef4444, #dc2626); font-size: 0.78rem; padding: 5px 12px;"><i class="fa-solid fa-file-pdf"></i> Imprimir / PDF</button>
              <button id="btn-fin-card-xls" class="btn btn-primary" style="background: linear-gradient(135deg, #10b981, #059669); font-size: 0.78rem; padding: 5px 12px;"><i class="fa-solid fa-file-excel"></i> Exportar Excel</button>
              <button id="btn-fin-card-csv" class="btn btn-outline" style="font-size: 0.78rem; padding: 5px 12px;"><i class="fa-solid fa-file-csv"></i> Exportar CSV</button>
            </div>
          </div>

          <div style="border-radius: 10px; overflow: hidden; border: 1px solid var(--border-color);">
            <table style="width: 100%; border-collapse: collapse;">
              <thead>
                <tr style="background: var(--bg-tertiary); border-bottom: 1px solid var(--border-color);">
                  <th style="padding: 10px 14px; font-size: 0.72rem; color: var(--text-muted); text-transform: uppercase;">Nosso Número</th>
                  <th style="padding: 10px 14px; font-size: 0.72rem; color: var(--text-muted); text-transform: uppercase;">Paciente / Cliente</th>
                  <th style="padding: 10px 14px; font-size: 0.72rem; color: var(--text-muted); text-transform: uppercase;">Descrição / Serviço</th>
                  <th style="padding: 10px 14px; font-size: 0.72rem; color: var(--text-muted); text-transform: uppercase; text-align: center;">Parcela</th>
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
          tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:24px;color:var(--text-muted);">Nenhum título encontrado com o status "${statusFilter}".</td></tr>`;
          return;
        }

        const hasPEP = state.user && (state.user.role === 'Médico' || state.user.role === 'Enfermeiro');

        tbody.innerHTML = filtered.map(t => {
          const instStr = (t.installmentNumber && t.totalInstallments) ? `${t.installmentNumber}/${t.totalInstallments}` : '1/1';
          return `
            <tr style="border-bottom:1px solid var(--border-color);transition:background 0.2s ease;">
              <td style="padding:10px 14px;font-family:monospace;font-weight:700;color:var(--color-primary);font-size:0.84rem;">${t.id}</td>
              <td style="padding:10px 14px;font-weight:600;color:var(--text-primary);font-size:0.86rem;">${hasPEP ? t.client : (typeof abbreviateName === 'function' ? abbreviateName(t.client) : t.client)}</td>
              <td style="padding:10px 14px;font-size:0.82rem;color:var(--text-secondary);">${t.desc}</td>
              <td style="padding:10px 14px;text-align:center;font-size:0.8rem;font-weight:700;color:#00f2fe;">${instStr}</td>
              <td style="padding:10px 14px;text-align:center;font-size:0.82rem;color:var(--text-secondary);">${t.dueDate}</td>
              <td style="padding:10px 14px;text-align:right;font-family:monospace;font-weight:700;color:${t.color};font-size:0.88rem;">${t.amountFormatted}</td>
              <td style="padding:10px 14px;text-align:center;">
                <span style="padding:3px 10px;border-radius:20px;font-size:0.72rem;font-weight:700;background:${t.color}1e;color:${t.color};border:1px solid ${t.color}40;">${t.status}</span>
              </td>
              <td style="padding:10px 14px;text-align:center;">
                <div style="display:flex;gap:5px;justify-content:center;">
                  <button class="btn btn-outline btn-view-boleto" style="font-size:0.72rem;padding:3px 9px;" data-id="${t.id}" data-client="${t.client}" data-desc="${t.desc}" data-duedate="${t.dueDate}" data-amount="${t.amountFormatted}" data-val="${t.amount}"><i class="fa-solid fa-barcode"></i> 2ª Via</button>
                  ${t.status !== 'Pagas' ? `<button class="btn btn-primary btn-pay-installment-modal" style="background:linear-gradient(135deg, #10b981, #059669);font-size:0.72rem;padding:3px 9px;cursor:pointer;" data-id="${t.id}"><i class="fa-solid fa-hand-holding-dollar"></i> Quitar</button>` : ''}
                </div>
              </td>
            </tr>
          `;
        }).join('');

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

        tbody.querySelectorAll('.btn-pay-installment-modal').forEach(btn => {
          btn.addEventListener('click', () => {
            const item = finTitlesList.find(t => t.id === btn.dataset.id);
            if (item) {
              openPayInstallmentModal(item, () => {
                filterAndRender();
                if (typeof fetchDashboardData === 'function') fetchDashboardData();
              });
            }
          });
        });
      };

      renderFinTable('Todos');

      setTimeout(() => {
        renderFinancialCharts(finData);

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

        // Event listener para a janela dedicada (Modal de Resultados)
        const openWindowHandler = () => {
          openFinancialListWindowModal(finTitlesList, () => {
            filterAndRender();
            if (typeof fetchDashboardData === 'function') fetchDashboardData();
          });
        };

        document.getElementById('btn-open-fin-window-top')?.addEventListener('click', openWindowHandler);
        document.getElementById('btn-open-fin-window-card')?.addEventListener('click', openWindowHandler);

        document.getElementById('btn-fin-card-pdf')?.addEventListener('click', () => processExport('pdf'));
        document.getElementById('btn-fin-card-xls')?.addEventListener('click', () => processExport('xls'));
        document.getElementById('btn-fin-card-csv')?.addEventListener('click', () => processExport('csv'));

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

    // Setup checkbox events for preview table
    function setupCheckboxEvents() {
      const selectAll = document.getElementById('select-all-records');
      if (selectAll) {
        selectAll.addEventListener('change', (e) => {
          document.querySelectorAll('.record-checkbox').forEach(cb => cb.checked = e.target.checked);
        });
      }
      document.querySelectorAll('.record-checkbox').forEach(cb => {
        cb.addEventListener('change', () => {
          const allChecked = document.querySelectorAll('.record-checkbox:checked').length === document.querySelectorAll('.record-checkbox').length;
          if (selectAll) selectAll.checked = allChecked;
        });
      });
    }

    // ─── RESUMO + GRÁFICOS DINÂMICOS POR ABA ────────────────────────────────
    const summaryContainerId = 'report-summary-charts';
    let summaryContainer = document.getElementById(summaryContainerId);
    if (!summaryContainer) {
      summaryContainer = document.createElement('div');
      summaryContainer.id = summaryContainerId;
      summaryContainer.style.marginTop = '20px';
      const previewCard = document.querySelector('.preview-card');
      if (previewCard) previewCard.appendChild(summaryContainer);
    }
    summaryContainer.innerHTML = '';

    const ChartClass = window.Chart || (typeof Chart !== 'undefined' ? Chart : null);

    if (activeTab === 'patients' && currentFilteredList.length > 0) {
      // ── KPIs
      const totalBilling = currentFilteredList.reduce((acc, p) => {
        const v = parseFloat((p.billingValue || '').replace(/[^\d,]/g, '').replace(',', '.')) || 0;
        return acc + v;
      }, 0);
      const avgBilling = totalBilling / currentFilteredList.length;
      const cityCounts = {};
      currentFilteredList.forEach(p => { cityCounts[p.city || 'N/D'] = (cityCounts[p.city || 'N/D'] || 0) + 1; });
      const topCity = Object.entries(cityCounts).sort((a,b) => b[1]-a[1])[0];
      const fmt = v => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

      summaryContainer.innerHTML = `
        <!-- KPI Cards -->
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:14px;margin-bottom:18px;">
          <div class="glass-card" style="padding:16px;border-radius:14px;border:1px solid rgba(99,102,241,0.3);background:rgba(99,102,241,0.07);text-align:center;">
            <div style="font-size:1.9rem;font-weight:800;font-family:'Outfit',sans-serif;color:#818cf8;">${currentFilteredList.length}</div>
            <div style="font-size:0.72rem;text-transform:uppercase;color:var(--text-muted);margin-top:4px;letter-spacing:.05em;">Pacientes</div>
          </div>
          <div class="glass-card" style="padding:16px;border-radius:14px;border:1px solid rgba(52,211,153,0.3);background:rgba(52,211,153,0.07);text-align:center;">
            <div style="font-size:1.4rem;font-weight:800;font-family:'Outfit',sans-serif;color:#34d399;">${fmt(totalBilling)}</div>
            <div style="font-size:0.72rem;text-transform:uppercase;color:var(--text-muted);margin-top:4px;letter-spacing:.05em;">Faturamento Total</div>
          </div>
          <div class="glass-card" style="padding:16px;border-radius:14px;border:1px solid rgba(251,191,36,0.3);background:rgba(251,191,36,0.07);text-align:center;">
            <div style="font-size:1.4rem;font-weight:800;font-family:'Outfit',sans-serif;color:#fbbf24;">${fmt(avgBilling)}</div>
            <div style="font-size:0.72rem;text-transform:uppercase;color:var(--text-muted);margin-top:4px;letter-spacing:.05em;">Ticket Médio</div>
          </div>
          <div class="glass-card" style="padding:16px;border-radius:14px;border:1px solid rgba(0,242,254,0.3);background:rgba(0,242,254,0.07);text-align:center;">
            <div style="font-size:1.2rem;font-weight:800;font-family:'Outfit',sans-serif;color:#00f2fe;">${topCity ? topCity[0] : '-'}</div>
            <div style="font-size:0.72rem;text-transform:uppercase;color:var(--text-muted);margin-top:4px;letter-spacing:.05em;">Cidade Predominante</div>
          </div>
        </div>

        <!-- Gráficos -->
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">
          <div class="glass-card" style="padding:18px;border-radius:14px;border:1px solid var(--border-color);">
            <h4 style="margin:0 0 14px;font-size:0.9rem;font-weight:700;color:var(--text-primary);display:flex;align-items:center;gap:8px;">
              <i class="fa-solid fa-city" style="color:#818cf8;"></i> Pacientes por Cidade
            </h4>
            <div style="position:relative;height:210px;"><canvas id="chart-patients-city"></canvas></div>
          </div>
          <div class="glass-card" style="padding:18px;border-radius:14px;border:1px solid var(--border-color);">
            <h4 style="margin:0 0 14px;font-size:0.9rem;font-weight:700;color:var(--text-primary);display:flex;align-items:center;gap:8px;">
              <i class="fa-solid fa-sack-dollar" style="color:#34d399;"></i> Faturamento por Cidade (R$)
            </h4>
            <div style="position:relative;height:210px;"><canvas id="chart-patients-billing"></canvas></div>
          </div>
        </div>
      `;

      if (ChartClass) {
        setTimeout(() => {
          const cityLabels = Object.keys(cityCounts).slice(0, 8);
          const cityVals = cityLabels.map(c => cityCounts[c]);
          const palette = ['#818cf8','#34d399','#fbbf24','#00f2fe','#f472b6','#a78bfa','#6ee7b7','#fcd34d'];

          const ctxCity = document.getElementById('chart-patients-city');
          if (ctxCity) new ChartClass(ctxCity.getContext('2d'), {
            type: 'doughnut',
            data: { labels: cityLabels, datasets: [{ data: cityVals, backgroundColor: palette, borderWidth: 2, borderColor: 'rgba(0,0,0,0.2)' }] },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { color: '#94a3b8', font: { size: 10 }, boxWidth: 12, padding: 10 } } } }
          });

          const billingByCity = {};
          currentFilteredList.forEach(p => {
            const city = p.city || 'N/D';
            const v = parseFloat((p.billingValue || '').replace(/[^\d,]/g, '').replace(',', '.')) || 0;
            billingByCity[city] = (billingByCity[city] || 0) + v;
          });
          const billingLabels = Object.keys(billingByCity).slice(0, 8);
          const billingVals = billingLabels.map(c => billingByCity[c]);

          const ctxBilling = document.getElementById('chart-patients-billing');
          if (ctxBilling) new ChartClass(ctxBilling.getContext('2d'), {
            type: 'bar',
            data: { labels: billingLabels, datasets: [{ label: 'R$', data: billingVals, backgroundColor: palette.map(c => c + '99'), borderColor: palette, borderWidth: 1.5, borderRadius: 6 }] },
            options: {
              responsive: true, maintainAspectRatio: false,
              plugins: { legend: { display: false } },
              scales: {
                x: { ticks: { color: '#94a3b8', font: { size: 10 } }, grid: { color: 'rgba(255,255,255,0.04)' } },
                y: { ticks: { color: '#94a3b8', font: { size: 10 }, callback: v => 'R$ ' + v.toLocaleString('pt-BR') }, grid: { color: 'rgba(255,255,255,0.04)' } }
              }
            }
          });
        }, 60);
      }

    } else if (activeTab === 'encounters' && currentFilteredList.length > 0) {
      // ── KPIs Atendimentos
      const total = currentFilteredList.length;
      const urgencias = currentFilteredList.filter(e => e.type === 'Urgencia').length;
      const ambulatorio = total - urgencias;
      const finalizados = currentFilteredList.filter(e => e.status === 'Finalizado').length;
      const pctFin = total > 0 ? Math.round((finalizados / total) * 100) : 0;

      const manchesterCounts = {};
      currentFilteredList.forEach(e => { const k = e.manchesterColor || 'Não Classificado'; manchesterCounts[k] = (manchesterCounts[k] || 0) + 1; });

      const statusCounts = {};
      const statusLabels = { Aguardando_Triagem: 'Ag. Triagem', Aguardando_Atendimento: 'Ag. Consulta', Em_Atendimento: 'Em Consulta', Finalizado: 'Finalizado' };
      currentFilteredList.forEach(e => { const k = statusLabels[e.status] || e.status; statusCounts[k] = (statusCounts[k] || 0) + 1; });

      summaryContainer.innerHTML = `
        <!-- KPI Cards Atendimentos -->
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:14px;margin-bottom:18px;">
          <div class="glass-card" style="padding:16px;border-radius:14px;border:1px solid rgba(236,72,153,0.3);background:rgba(236,72,153,0.07);text-align:center;">
            <div style="font-size:1.9rem;font-weight:800;font-family:'Outfit',sans-serif;color:#ec4899;">${total}</div>
            <div style="font-size:0.72rem;text-transform:uppercase;color:var(--text-muted);margin-top:4px;">Total Atendimentos</div>
          </div>
          <div class="glass-card" style="padding:16px;border-radius:14px;border:1px solid rgba(244,63,94,0.3);background:rgba(244,63,94,0.07);text-align:center;">
            <div style="font-size:1.9rem;font-weight:800;font-family:'Outfit',sans-serif;color:#f43f5e;">${urgencias}</div>
            <div style="font-size:0.72rem;text-transform:uppercase;color:var(--text-muted);margin-top:4px;">Urgências</div>
          </div>
          <div class="glass-card" style="padding:16px;border-radius:14px;border:1px solid rgba(99,102,241,0.3);background:rgba(99,102,241,0.07);text-align:center;">
            <div style="font-size:1.9rem;font-weight:800;font-family:'Outfit',sans-serif;color:#818cf8;">${ambulatorio}</div>
            <div style="font-size:0.72rem;text-transform:uppercase;color:var(--text-muted);margin-top:4px;">Ambulatório</div>
          </div>
          <div class="glass-card" style="padding:16px;border-radius:14px;border:1px solid rgba(52,211,153,0.3);background:rgba(52,211,153,0.07);text-align:center;">
            <div style="font-size:1.9rem;font-weight:800;font-family:'Outfit',sans-serif;color:#34d399;">${pctFin}%</div>
            <div style="font-size:0.72rem;text-transform:uppercase;color:var(--text-muted);margin-top:4px;">Taxa Conclusão</div>
          </div>
        </div>

        <!-- Gráficos Atendimentos -->
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">
          <div class="glass-card" style="padding:18px;border-radius:14px;border:1px solid var(--border-color);">
            <h4 style="margin:0 0 14px;font-size:0.9rem;font-weight:700;color:var(--text-primary);display:flex;align-items:center;gap:8px;">
              <i class="fa-solid fa-shield-halved" style="color:#ec4899;"></i> Classificação Manchester
            </h4>
            <div style="position:relative;height:210px;"><canvas id="chart-enc-manchester"></canvas></div>
          </div>
          <div class="glass-card" style="padding:18px;border-radius:14px;border:1px solid var(--border-color);">
            <h4 style="margin:0 0 14px;font-size:0.9rem;font-weight:700;color:var(--text-primary);display:flex;align-items:center;gap:8px;">
              <i class="fa-solid fa-chart-bar" style="color:#818cf8;"></i> Situação dos Atendimentos
            </h4>
            <div style="position:relative;height:210px;"><canvas id="chart-enc-status"></canvas></div>
          </div>
        </div>
      `;

      if (ChartClass) {
        setTimeout(() => {
          const manchColors = { Vermelho: '#ef4444', Laranja: '#f97316', Amarelo: '#eab308', Verde: '#22c55e', Azul: '#3b82f6', 'Não Classificado': '#64748b' };
          const mLabels = Object.keys(manchesterCounts);
          const mVals = mLabels.map(k => manchesterCounts[k]);
          const mColors = mLabels.map(k => manchColors[k] || '#a78bfa');

          const ctxManch = document.getElementById('chart-enc-manchester');
          if (ctxManch) new ChartClass(ctxManch.getContext('2d'), {
            type: 'pie',
            data: { labels: mLabels, datasets: [{ data: mVals, backgroundColor: mColors, borderWidth: 2, borderColor: 'rgba(0,0,0,0.15)' }] },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { color: '#94a3b8', font: { size: 10 }, boxWidth: 12, padding: 10 } } } }
          });

          const sLabels = Object.keys(statusCounts);
          const sVals = sLabels.map(k => statusCounts[k]);
          const sPalette = ['#fbbf24','#00f2fe','#ec4899','#34d399'];

          const ctxStatus = document.getElementById('chart-enc-status');
          if (ctxStatus) new ChartClass(ctxStatus.getContext('2d'), {
            type: 'bar',
            data: { labels: sLabels, datasets: [{ label: 'Qtd', data: sVals, backgroundColor: sPalette.map(c => c + '99'), borderColor: sPalette, borderWidth: 1.5, borderRadius: 6 }] },
            options: {
              responsive: true, maintainAspectRatio: false, indexAxis: 'y',
              plugins: { legend: { display: false } },
              scales: {
                x: { ticks: { color: '#94a3b8', font: { size: 10 } }, grid: { color: 'rgba(255,255,255,0.04)' } },
                y: { ticks: { color: '#94a3b8', font: { size: 10 } }, grid: { color: 'rgba(255,255,255,0.04)' } }
              }
            }
          });
        }, 60);
      }
    }
    // ─────────────────────────────────────────────────────────────────────────
  };

  // FUNÇÕES DE EXPORTAÇÃO GLOBAL (CSV, EXCEL, PDF) E EMISSÃO DE BOLETO
  function exportHtmlCSV(columns, rows, filename) {
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

  function exportHtmlXLS(columns, rows, filename) {
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

  async function exportHtmlPDF(columns, rows, title, filename, financialSummary) {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      if (typeof showCustomAlert === 'function') {
        showCustomAlert({ title: 'Pop-up Bloqueado', message: 'Por favor, habilite pop-ups para este site nas configurações do navegador e tente novamente.', type: 'warning' });
      } else {
        alert('Por favor, habilite pop-ups para gerar a impressão/visualização em PDF.');
      }
      return;
    }

    const dateNow = new Date().toLocaleString('pt-BR');
    const fmt = v => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);

    // ---- Bloco de Resumo Financeiro (opcional) ----
    const summaryBlock = financialSummary ? `
      <div style="margin-bottom: 22px;">
        <div style="font-size: 11pt; font-weight: 700; color: #1e1b4b; border-bottom: 2px solid #6366f1; padding-bottom: 6px; margin-bottom: 12px; display: flex; align-items: center; gap: 6px;">
          📊 Resumo Executivo do Filtro
        </div>

        <!-- KPI CARDS em 3 colunas -->
        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-bottom: 14px; -webkit-print-color-adjust: exact; print-color-adjust: exact;">
          <div style="background: #f0fdf4; border: 1.5px solid #86efac; border-radius: 8px; padding: 10px 12px;">
            <div style="font-size: 7.5pt; color: #15803d; font-weight: 700; text-transform: uppercase; margin-bottom: 2px;">✅ Pagas</div>
            <div style="font-size: 13pt; font-weight: 800; color: #16a34a;">${fmt(financialSummary.pagasVal)}</div>
            <div style="font-size: 7.5pt; color: #4b5563;">${financialSummary.pagasC} parcela(s)</div>
          </div>
          <div style="background: #eff6ff; border: 1.5px solid #93c5fd; border-radius: 8px; padding: 10px 12px;">
            <div style="font-size: 7.5pt; color: #1d4ed8; font-weight: 700; text-transform: uppercase; margin-bottom: 2px;">🕐 A Vencer</div>
            <div style="font-size: 13pt; font-weight: 800; color: #2563eb;">${fmt(financialSummary.aVencerVal)}</div>
            <div style="font-size: 7.5pt; color: #4b5563;">${financialSummary.aVencerC} parcela(s)</div>
          </div>
          <div style="background: #fff1f2; border: 1.5px solid #fda4af; border-radius: 8px; padding: 10px 12px;">
            <div style="font-size: 7.5pt; color: #be123c; font-weight: 700; text-transform: uppercase; margin-bottom: 2px;">❗ Vencidas</div>
            <div style="font-size: 13pt; font-weight: 800; color: #e11d48;">${fmt(financialSummary.vencidasVal)}</div>
            <div style="font-size: 7.5pt; color: #4b5563;">${financialSummary.vencidasC} parcela(s)</div>
          </div>
          <div style="background: #f5f3ff; border: 1.5px solid #c4b5fd; border-radius: 8px; padding: 10px 12px;">
            <div style="font-size: 7.5pt; color: #7c3aed; font-weight: 700; text-transform: uppercase; margin-bottom: 2px;">⚖️ Saldo Líquido</div>
            <div style="font-size: 13pt; font-weight: 800; color: ${financialSummary.saldo >= 0 ? '#16a34a' : '#e11d48'};">${fmt(financialSummary.saldo)}</div>
            <div style="font-size: 7.5pt; color: #4b5563;">Receitas − Despesas</div>
          </div>
          <div style="background: #fffbeb; border: 1.5px solid #fcd34d; border-radius: 8px; padding: 10px 12px;">
            <div style="font-size: 7.5pt; color: #b45309; font-weight: 700; text-transform: uppercase; margin-bottom: 2px;">🏆 Bonificadas</div>
            <div style="font-size: 13pt; font-weight: 800; color: #d97706;">${fmt(financialSummary.bonificadasVal)}</div>
            <div style="font-size: 7.5pt; color: #4b5563;">${financialSummary.bonificadasC} parcela(s)</div>
          </div>
          <div style="background: #fef2f2; border: 1.5px solid #fca5a5; border-radius: 8px; padding: 10px 12px;">
            <div style="font-size: 7.5pt; color: #dc2626; font-weight: 700; text-transform: uppercase; margin-bottom: 2px;">🚫 Outras</div>
            <div style="font-size: 13pt; font-weight: 800; color: #dc2626;">${fmt((financialSummary.suspensasVal||0)+(financialSummary.canceladasVal||0)+(financialSummary.excluidasVal||0))}</div>
            <div style="font-size: 7.5pt; color: #4b5563;">Suspensas / Canceladas / Excluídas</div>
          </div>
        </div>

        <!-- GRÁFICOS como imagens base64 -->
        ${(financialSummary.donutImg || financialSummary.barImg) ? `
        <div style="display: grid; grid-template-columns: 1fr 1.6fr; gap: 12px; margin-bottom: 8px;">
          ${financialSummary.donutImg ? `
          <div style="border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px; text-align: center;">
            <div style="font-size: 8pt; font-weight: 700; color: #475569; margin-bottom: 6px;">📈 Distribuição por Status</div>
            <img src="${financialSummary.donutImg}" style="max-width: 100%; max-height: 160px; object-fit: contain;" />
          </div>` : ''}
          ${financialSummary.barImg ? `
          <div style="border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px; text-align: center;">
            <div style="font-size: 8pt; font-weight: 700; color: #475569; margin-bottom: 6px;">📊 Volume por Forma de Pagamento (R$)</div>
            <img src="${financialSummary.barImg}" style="max-width: 100%; max-height: 160px; object-fit: contain;" />
          </div>` : ''}
        </div>` : ''}
      </div>
    ` : '';

    const htmlContent = `
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="UTF-8">
        <title>${title} — Health Nexus</title>
        <style>
          @page { size: A4 portrait; margin: 15mm; }
          body { font-family: 'Segoe UI', Arial, sans-serif; color: #0f172a; margin: 0; padding: 15px; font-size: 10pt; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
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
          .badge-suspensas { background: #f3f4f6; color: #374151; }
          .badge-canceladas { background: #fee2e2; color: #dc2626; }
          .badge-excluídas { background: #fee2e2; color: #7f1d1d; }
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

        ${summaryBlock}

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

    // Escreve o conteúdo na nova janela para acionar a impressão
    printWindow.document.open();
    printWindow.document.write(htmlContent);
    printWindow.document.close();
    printWindow.focus();

    if (typeof showToast === 'function') showToast(`Visualização para impressão PDF aberta com sucesso!`);
  }

  function openPayInstallmentModal(installment, onComplete) {
    let modal = document.getElementById('modal-manual-settlement');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'modal-manual-settlement';
      modal.className = 'modal-overlay';
      document.body.appendChild(modal);
    }

    const todayStr = new Date().toISOString().split('T')[0];
    const origAmount = parseFloat(installment.amount) || 0;
    const instNumStr = (installment.installmentNumber && installment.totalInstallments) 
      ? `${installment.installmentNumber}/${installment.totalInstallments}` 
      : '1/1 (À Vista)';

    modal.innerHTML = `
      <div class="modal-card glass-card" style="max-width: 580px; width: 92%; padding: 24px; border-radius: 20px; border: 1px solid var(--border-color); background: var(--bg-secondary); color: var(--text-primary); box-shadow: 0 25px 50px -12px rgba(0,0,0,0.7); position: relative; z-index: 99999;">
        <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid var(--border-color); padding-bottom: 14px; margin-bottom: 18px;">
          <div style="display: flex; align-items: center; gap: 12px;">
            <div style="width: 42px; height: 42px; border-radius: 12px; background: linear-gradient(135deg, #10b981, #059669); display: flex; align-items: center; justify-content: center; color: #fff; font-size: 1.25rem; box-shadow: 0 4px 14px rgba(16,185,129,0.35);">
              <i class="fa-solid fa-hand-holding-dollar"></i>
            </div>
            <div>
              <h3 style="margin: 0; font-size: 1.15rem; font-weight: 700; font-family: 'Outfit', sans-serif;">Baixa Manual de Parcela</h3>
              <span style="font-size: 0.78rem; color: var(--text-muted);">Quitação de Título Financeiro • Nosso Nº: <strong>${installment.id}</strong></span>
            </div>
          </div>
          <button id="close-pay-modal-btn" class="btn-icon" style="background: rgba(255,255,255,0.08); border: 1px solid var(--border-color); width: 34px; height: 34px; border-radius: 50%; font-size: 1.1rem; color: var(--text-primary); cursor: pointer; display: flex; align-items: center; justify-content: center;"><i class="fa-solid fa-xmark"></i></button>
        </div>

        <div style="background: rgba(0,0,0,0.2); border: 1px solid var(--border-color); border-radius: 12px; padding: 14px; margin-bottom: 18px; font-size: 0.84rem;">
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
            <div><span style="color: var(--text-muted); display: block; font-size: 0.74rem;">PACIENTE / FAVORECIDO</span><strong>${installment.client || installment.patientName || 'Cliente Particular'}</strong></div>
            <div><span style="color: var(--text-muted); display: block; font-size: 0.74rem;">Nº PARCELA</span><strong style="color: #00f2fe;">${instNumStr}</strong></div>
            <div><span style="color: var(--text-muted); display: block; font-size: 0.74rem;">DESCRIÇÃO / SERVIÇO</span><span>${installment.desc || installment.description || 'Consulta Médica'}</span></div>
            <div><span style="color: var(--text-muted); display: block; font-size: 0.74rem;">VALOR ORIGINAL</span><strong style="color: #34d399; font-size: 1rem;">${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(origAmount)}</strong></div>
          </div>
        </div>

        <form id="pay-installment-form">
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 14px;">
            <div>
              <label style="font-size: 0.8rem; font-weight: 600; color: var(--text-primary); display: block; margin-bottom: 6px;">Data do Pagamento *</label>
              <input type="date" id="pay-date-input" value="${todayStr}" required style="width: 100%; padding: 8px 12px; border-radius: 8px; border: 1px solid var(--border-color); background: var(--bg-tertiary); color: var(--text-primary); font-size: 0.86rem;">
            </div>
            <div>
              <label style="font-size: 0.8rem; font-weight: 600; color: var(--text-primary); display: block; margin-bottom: 6px;">Forma de Pagamento Efetiva *</label>
              <select id="pay-method-input" required style="width: 100%; padding: 8px 12px; border-radius: 8px; border: 1px solid var(--border-color); background: var(--bg-tertiary); color: var(--text-primary); font-size: 0.86rem;">
                <option value="Pix" ${installment.paymentMethod === 'Pix' ? 'selected' : ''}>Pix (Transferência Instantânea)</option>
                <option value="Boleto" ${installment.paymentMethod === 'Boleto' ? 'selected' : ''}>Boleto Bancário</option>
                <option value="Cartão de Crédito" ${installment.paymentMethod === 'Cartão de Crédito' ? 'selected' : ''}>Cartão de Crédito</option>
                <option value="Cartão de Débito" ${installment.paymentMethod === 'Cartão de Débito' ? 'selected' : ''}>Cartão de Débito</option>
                <option value="Dinheiro" ${installment.paymentMethod === 'Dinheiro' ? 'selected' : ''}>Dinheiro / Espécie</option>
                <option value="Convênio" ${installment.paymentMethod === 'Convênio' ? 'selected' : ''}>Faturamento Convênio</option>
              </select>
            </div>
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; margin-bottom: 14px;">
            <div>
              <label style="font-size: 0.78rem; font-weight: 600; color: var(--text-primary); display: block; margin-bottom: 6px;">Valor Pago (R$) *</label>
              <input type="number" step="0.01" id="pay-amount-input" value="${origAmount.toFixed(2)}" required style="width: 100%; padding: 8px 12px; border-radius: 8px; border: 1px solid var(--border-color); background: var(--bg-tertiary); color: #34d399; font-weight: 700; font-size: 0.9rem;">
            </div>
            <div>
              <label style="font-size: 0.78rem; font-weight: 600; color: var(--text-primary); display: block; margin-bottom: 6px;">Desconto (R$)</label>
              <input type="number" step="0.01" id="pay-discount-input" value="0.00" style="width: 100%; padding: 8px 12px; border-radius: 8px; border: 1px solid var(--border-color); background: var(--bg-tertiary); color: var(--text-primary); font-size: 0.86rem;">
            </div>
            <div>
              <label style="font-size: 0.78rem; font-weight: 600; color: var(--text-primary); display: block; margin-bottom: 6px;">Juros / Multa (R$)</label>
              <input type="number" step="0.01" id="pay-interest-input" value="0.00" style="width: 100%; padding: 8px 12px; border-radius: 8px; border: 1px solid var(--border-color); background: var(--bg-tertiary); color: var(--text-primary); font-size: 0.86rem;">
            </div>
          </div>

          <div style="margin-bottom: 20px;">
            <label style="font-size: 0.8rem; font-weight: 600; color: var(--text-primary); display: block; margin-bottom: 6px;">Observação / Nº do Comprovante</label>
            <input type="text" id="pay-notes-input" placeholder="Ex: Aut. Pix 987654321 - Quitado no caixa hospitalar" style="width: 100%; padding: 8px 12px; border-radius: 8px; border: 1px solid var(--border-color); background: var(--bg-tertiary); color: var(--text-primary); font-size: 0.86rem;">
          </div>

          <div style="display: flex; gap: 10px; justify-content: flex-end;">
            <button type="button" id="cancel-pay-modal-btn" class="btn btn-outline" style="font-size: 0.85rem; padding: 8px 16px;">Cancelar</button>
            <button type="submit" class="btn btn-primary" style="background: linear-gradient(135deg, #10b981, #059669); color: #fff; font-weight: 700; font-size: 0.88rem; padding: 8px 20px; border-radius: 8px; box-shadow: 0 4px 12px rgba(16,185,129,0.3); cursor: pointer;">
              <i class="fa-solid fa-check"></i> Confirmar Baixa Manual
            </button>
          </div>
        </form>
      </div>
    `;

    modal.style.display = 'flex';

    const closeModal = () => { modal.style.display = 'none'; };
    document.getElementById('close-pay-modal-btn')?.addEventListener('click', closeModal);
    document.getElementById('cancel-pay-modal-btn')?.addEventListener('click', closeModal);

    document.getElementById('pay-installment-form')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const payDate = document.getElementById('pay-date-input').value;
      const payMethod = document.getElementById('pay-method-input').value;
      const amountPaid = parseFloat(document.getElementById('pay-amount-input').value) || origAmount;
      const discount = parseFloat(document.getElementById('pay-discount-input').value) || 0;
      const interest = parseFloat(document.getElementById('pay-interest-input').value) || 0;
      const notes = document.getElementById('pay-notes-input').value;

      try {
        const response = await apiFetch('/api/financial/installments/' + installment.id + '/pay', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            paymentDate: payDate,
            amountPaid: amountPaid,
            paymentMethod: payMethod,
            discount: discount,
            interest: interest,
            notes: notes
          })
        });

        if (response.ok) {
          closeModal();
          if (typeof showToast === 'function') showToast(`✅ Baixa manual da parcela ${installment.id} efetuada com sucesso!`);
          if (typeof onComplete === 'function') onComplete();
        } else {
          alert('Erro ao efetuar baixa manual.');
        }
      } catch (err) {
        console.error(err);
        alert('Erro na comunicação com o servidor.');
      }
    });
  }

  function openFinancialListWindowModal(installmentsList, onRefresh) {
    // Expor dados do modal para exportação global
    window._modalFinTitlesList = installmentsList;
    let modal = document.getElementById('modal-financial-results-window');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'modal-financial-results-window';
      modal.className = 'modal-overlay';
      document.body.appendChild(modal);
    }

    // ---- Computar KPIs completos (todos os 7 status) ----
    let totalReceitas = 0, totalDespesas = 0;
    let pagasCount = 0, aVencerCount = 0, vencidasCount = 0;
    const saldoLiquido_ref = { val: 0 };
    const hasPEP = state.user && (state.user.role === 'Médico' || state.user.role === 'Enfermeiro');
    let pagasVal = 0, aVencerVal = 0, vencidasVal = 0, bonificadasVal = 0, suspensasVal = 0, canceladasVal = 0, excluidasVal = 0;
    let pagasC = 0, aVencerC = 0, vencidasC = 0, bonificadasC = 0, suspensasC = 0, canceladasC = 0, excluidasC = 0;
    installmentsList.forEach(t => {
      const v = parseFloat(t.amount) || 0;
      if (t.type === 'Despesa') totalDespesas += v; else totalReceitas += v;
      switch(t.status) {
        case 'Pagas':       pagasC++;       pagasVal += v;       break;
        case 'A Vencer':    aVencerC++;     aVencerVal += v;     break;
        case 'Vencidas':    vencidasC++;    vencidasVal += v;    break;
        case 'Bonificadas': bonificadasC++; bonificadasVal += v; break;
        case 'Suspensas':   suspensasC++;   suspensasVal += v;   break;
        case 'Canceladas':  canceladasC++;  canceladasVal += v;  break;
        case 'Excluídas':   excluidasC++;   excluidasVal += v;   break;
      }
    });

    // Recalcular com os totais corretos
    pagasCount = pagasC; aVencerCount = aVencerC; vencidasCount = vencidasC;
    const saldoLiquido = totalReceitas - totalDespesas;
    const totalGeral = pagasVal + aVencerVal + vencidasVal + bonificadasVal + suspensasVal + canceladasVal + excluidasVal;
    const fmt = v => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

    // Formas de pagamento para gráfico de barras
    const methodMap = {};
    installmentsList.forEach(t => {
      const m = t.paymentMethod || 'Pix';
      if (!methodMap[m]) methodMap[m] = 0;
      methodMap[m] += parseFloat(t.amount) || 0;
    });

    modal.innerHTML = `
      <div class="modal-card glass-card" style="max-width: 1280px; width: 97%; padding: 24px; border-radius: 20px; border: 1px solid var(--border-color); background: var(--bg-secondary); color: var(--text-primary); max-height: 94vh; overflow-y: auto; box-shadow: 0 25px 60px -12px rgba(0,0,0,0.85); position: relative;">
        
        <!-- CABEÇALHO STICKY -->
        <div style="position: sticky; top: -24px; z-index: 40; background: var(--bg-secondary); border-bottom: 1px solid var(--border-color); padding: 14px 20px; margin: -24px -24px 0 -24px; border-top-left-radius: 20px; border-top-right-radius: 20px; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px; backdrop-filter: blur(12px);">
          <div style="display: flex; align-items: center; gap: 12px;">
            <div style="width: 42px; height: 42px; border-radius: 12px; background: linear-gradient(135deg, #00f2fe, #4f46e5); display: flex; align-items: center; justify-content: center; font-size: 1.25rem; color: #fff; box-shadow: 0 4px 14px rgba(0,242,254,0.3);">
              <i class="fa-solid fa-chart-line"></i>
            </div>
            <div>
              <h3 style="margin: 0; font-size: 1.2rem; font-weight: 700; font-family: 'Outfit', sans-serif;">Janela Dedicada: Títulos Financeiros & Parcelas</h3>
              <span style="font-size: 0.78rem; color: var(--text-muted);">${installmentsList.length} títulos no filtro ativo • Total geral: ${fmt(totalGeral)}</span>
            </div>
          </div>
          <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
            <button id="modal-fin-btn-pdf" class="btn btn-primary" style="background: linear-gradient(135deg, #ef4444, #dc2626); font-size: 0.78rem; padding: 6px 12px;"><i class="fa-solid fa-file-pdf"></i> PDF</button>
            <button id="modal-fin-btn-xls" class="btn btn-primary" style="background: linear-gradient(135deg, #10b981, #059669); font-size: 0.78rem; padding: 6px 12px;"><i class="fa-solid fa-file-excel"></i> Excel</button>
            <button id="modal-fin-btn-csv" class="btn btn-outline" style="font-size: 0.78rem; padding: 6px 12px;"><i class="fa-solid fa-file-csv"></i> CSV</button>
            <button id="modal-fin-btn-batch-pay" class="btn btn-primary" style="background: linear-gradient(135deg, #3b82f6, #1d4ed8); font-size: 0.78rem; padding: 6px 14px; display: none;"><i class="fa-solid fa-check-double"></i> Baixar Lote (<span id="modal-fin-batch-count">0</span>)</button>
            <button id="close-modal-fin-window" class="btn-icon" style="background: rgba(255,255,255,0.08); border: 1px solid var(--border-color); width: 34px; height: 34px; border-radius: 50%; font-size: 1.1rem; color: var(--text-primary); cursor: pointer; display: flex; align-items: center; justify-content: center;"><i class="fa-solid fa-xmark"></i></button>
          </div>
        </div>

        <!-- KPI CARDS RESUMO -->
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 12px; margin: 18px 0;">
          <div style="background: linear-gradient(135deg, rgba(52,211,153,0.12), rgba(52,211,153,0.04)); border: 1px solid rgba(52,211,153,0.35); border-radius: 14px; padding: 14px 16px;">
            <div style="font-size: 0.7rem; color: #34d399; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px;"><i class="fa-solid fa-circle-check"></i> Pagas</div>
            <div style="font-family: 'Outfit'; font-size: 1.3rem; font-weight: 800; color: #34d399;">${fmt(pagasVal)}</div>
            <div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 2px;">${pagasC} parcelas</div>
          </div>
          <div style="background: linear-gradient(135deg, rgba(0,242,254,0.12), rgba(0,242,254,0.04)); border: 1px solid rgba(0,242,254,0.35); border-radius: 14px; padding: 14px 16px;">
            <div style="font-size: 0.7rem; color: #00f2fe; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px;"><i class="fa-solid fa-clock"></i> A Vencer</div>
            <div style="font-family: 'Outfit'; font-size: 1.3rem; font-weight: 800; color: #00f2fe;">${fmt(aVencerVal)}</div>
            <div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 2px;">${aVencerC} parcelas</div>
          </div>
          <div style="background: linear-gradient(135deg, rgba(244,63,94,0.12), rgba(244,63,94,0.04)); border: 1px solid rgba(244,63,94,0.35); border-radius: 14px; padding: 14px 16px;">
            <div style="font-size: 0.7rem; color: #f43f5e; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px;"><i class="fa-solid fa-circle-exclamation"></i> Vencidas</div>
            <div style="font-family: 'Outfit'; font-size: 1.3rem; font-weight: 800; color: #f43f5e;">${fmt(vencidasVal)}</div>
            <div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 2px;">${vencidasC} parcelas</div>
          </div>
          <div style="background: linear-gradient(135deg, rgba(52,211,153,0.08), rgba(244,63,94,0.08)); border: 1px solid rgba(255,255,255,0.12); border-radius: 14px; padding: 14px 16px;">
            <div style="font-size: 0.7rem; color: var(--text-muted); font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px;"><i class="fa-solid fa-scale-balanced"></i> Saldo Líquido</div>
            <div style="font-family: 'Outfit'; font-size: 1.3rem; font-weight: 800; color: ${saldoLiquido >= 0 ? '#34d399' : '#f43f5e'};">${fmt(saldoLiquido)}</div>
            <div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 2px;">Receitas − Despesas</div>
          </div>
          <div style="background: linear-gradient(135deg, rgba(251,191,36,0.08), rgba(251,191,36,0.04)); border: 1px solid rgba(251,191,36,0.25); border-radius: 14px; padding: 14px 16px;">
            <div style="font-size: 0.7rem; color: #fbbf24; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px;"><i class="fa-solid fa-award"></i> Bonificadas</div>
            <div style="font-family: 'Outfit'; font-size: 1.3rem; font-weight: 800; color: #fbbf24;">${fmt(bonificadasVal)}</div>
            <div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 2px;">${bonificadasC} parcelas</div>
          </div>
          <div style="background: linear-gradient(135deg, rgba(248,113,113,0.08), rgba(248,113,113,0.04)); border: 1px solid rgba(248,113,113,0.2); border-radius: 14px; padding: 14px 16px;">
            <div style="font-size: 0.7rem; color: #f87171; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px;"><i class="fa-solid fa-ban"></i> Outras</div>
            <div style="font-family: 'Outfit'; font-size: 1.3rem; font-weight: 800; color: #f87171;">${fmt(suspensasVal + canceladasVal + excluidasVal)}</div>
            <div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 2px;">${suspensasC + canceladasC + excluidasC} parcelas</div>
          </div>
        </div>

        <!-- SEÇÃO DE GRÁFICOS -->
        <div style="display: grid; grid-template-columns: 280px 1fr; gap: 16px; margin-bottom: 20px; align-items: stretch;">
          <!-- Gráfico de Rosca: Distribuição por Status -->
          <div style="background: rgba(0,0,0,0.2); border: 1px solid var(--border-color); border-radius: 14px; padding: 16px;">
            <div style="font-size: 0.8rem; font-weight: 700; color: var(--text-primary); margin-bottom: 12px; display: flex; align-items: center; gap: 6px;">
              <i class="fa-solid fa-chart-pie" style="color:#00f2fe;"></i> Distribuição por Status
            </div>
            <div style="position: relative; height: 190px; display: flex; align-items: center; justify-content: center;">
              <canvas id="modal-fin-donut-chart"></canvas>
            </div>
          </div>
          <!-- Gráfico de Barras: Volume por Forma de Pagamento -->
          <div style="background: rgba(0,0,0,0.2); border: 1px solid var(--border-color); border-radius: 14px; padding: 16px;">
            <div style="font-size: 0.8rem; font-weight: 700; color: var(--text-primary); margin-bottom: 12px; display: flex; align-items: center; gap: 6px;">
              <i class="fa-solid fa-chart-bar" style="color:#a855f7;"></i> Volume por Forma de Pagamento (R$)
            </div>
            <div style="position: relative; height: 190px;">
              <canvas id="modal-fin-bar-chart"></canvas>
            </div>
          </div>
        </div>

        <!-- TABELA DE PARCELAS -->
        <div style="border-radius: 12px; overflow: hidden; border: 1px solid var(--border-color); margin-bottom: 20px;">
          <table style="width: 100%; border-collapse: collapse; font-size: 0.84rem;">
            <thead>
              <tr style="background: var(--bg-tertiary); border-bottom: 1px solid var(--border-color);">
                <th style="padding: 10px 12px; width: 36px; text-align: center;"><input type="checkbox" id="modal-fin-select-all" style="cursor:pointer;"></th>
                <th style="padding: 10px 12px; font-size: 0.72rem; color: var(--text-muted); text-transform: uppercase;">Nosso Número</th>
                <th style="padding: 10px 12px; font-size: 0.72rem; color: var(--text-muted); text-transform: uppercase;">Paciente / Favorecido</th>
                <th style="padding: 10px 12px; font-size: 0.72rem; color: var(--text-muted); text-transform: uppercase;">Descrição / Categoria</th>
                <th style="padding: 10px 12px; font-size: 0.72rem; color: var(--text-muted); text-transform: uppercase; text-align: center;">Parcela</th>
                <th style="padding: 10px 12px; font-size: 0.72rem; color: var(--text-muted); text-transform: uppercase; text-align: center;">Vencimento</th>
                <th style="padding: 10px 12px; font-size: 0.72rem; color: var(--text-muted); text-transform: uppercase; text-align: center;">Forma Pagto</th>
                <th style="padding: 10px 12px; font-size: 0.72rem; color: var(--text-muted); text-transform: uppercase; text-align: right;">Valor (R$)</th>
                <th style="padding: 10px 12px; font-size: 0.72rem; color: var(--text-muted); text-transform: uppercase; text-align: center;">Status</th>
                <th style="padding: 10px 12px; font-size: 0.72rem; color: var(--text-muted); text-transform: uppercase; text-align: center;">Ações</th>
              </tr>
            </thead>
            <tbody>
              ${installmentsList.length === 0 ? `
                <tr><td colspan="10" style="text-align:center; padding: 24px; color: var(--text-muted);">Nenhum título financeiro encontrado para os filtros selecionados.</td></tr>
              ` : installmentsList.map(t => {
                const instStr = (t.installmentNumber && t.totalInstallments) ? `${t.installmentNumber}/${t.totalInstallments}` : '1/1';
                const clientName = hasPEP ? t.client : (typeof abbreviateName === 'function' ? abbreviateName(t.client) : t.client);
                return `
                  <tr style="border-bottom: 1px solid var(--border-color); transition: background 0.15s ease;" onmouseover="this.style.background='rgba(255,255,255,0.03)'" onmouseout="this.style.background=''">
                    <td style="padding: 10px 12px; text-align: center;"><input type="checkbox" class="modal-fin-row-check" data-id="${t.id}" style="cursor:pointer;"></td>
                    <td style="padding: 10px 12px; font-family: monospace; font-weight: 700; color: var(--color-primary); font-size: 0.84rem;">${t.id}</td>
                    <td style="padding: 10px 12px; font-weight: 600; color: var(--text-primary); font-size: 0.86rem;">${clientName}</td>
                    <td style="padding: 10px 12px; font-size: 0.82rem; color: var(--text-secondary);">${t.desc} <span style="font-size:0.7rem; padding:1px 6px; border-radius:8px; background:rgba(255,255,255,0.06); margin-left:4px;">${t.category || 'Geral'}</span></td>
                    <td style="padding: 10px 12px; text-align: center; font-size: 0.8rem; font-weight: 700; color: #00f2fe;">${instStr}</td>
                    <td style="padding: 10px 12px; text-align: center; font-size: 0.82rem; color: var(--text-secondary);">${t.dueDate}</td>
                    <td style="padding: 10px 12px; text-align: center; font-size: 0.78rem;"><span style="padding: 2px 8px; border-radius: 10px; background: rgba(255,255,255,0.06); font-weight: 600;">${t.paymentMethod || 'Pix'}</span></td>
                    <td style="padding: 10px 12px; text-align: right; font-family: monospace; font-weight: 700; color: ${t.color}; font-size: 0.88rem;">${t.amountFormatted}</td>
                    <td style="padding: 10px 12px; text-align: center;">
                      <span style="padding: 3px 10px; border-radius: 20px; font-size: 0.72rem; font-weight: 700; background: ${t.color}1e; color: ${t.color}; border: 1px solid ${t.color}40;">${t.status}</span>
                    </td>
                    <td style="padding: 10px 12px; text-align: center;">
                      <div style="display: flex; gap: 6px; justify-content: center;">
                        <button class="btn btn-outline modal-btn-boleto" style="font-size: 0.72rem; padding: 4px 8px;" data-id="${t.id}" data-client="${t.client}" data-desc="${t.desc}" data-duedate="${t.dueDate}" data-amount="${t.amountFormatted}" data-val="${t.amount}"><i class="fa-solid fa-barcode"></i> 2ª Via</button>
                        ${t.status !== 'Pagas' ? `<button class="btn btn-primary modal-btn-pay" style="background: linear-gradient(135deg, #10b981, #059669); font-size: 0.72rem; padding: 4px 10px; border-radius: 6px; cursor: pointer;" data-id="${t.id}"><i class="fa-solid fa-hand-holding-dollar"></i> Quitar</button>` : ''}
                      </div>
                    </td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;

    modal.style.display = 'flex';

    // ---- Renderizar gráficos após o DOM estar pronto ----
    setTimeout(() => {
      // Gráfico de Rosca - Status
      const donutCtx = document.getElementById('modal-fin-donut-chart');
      if (donutCtx && window.Chart) {
        const donutData = [
          { label: 'Pagas', value: pagasVal, color: '#34d399' },
          { label: 'A Vencer', value: aVencerVal, color: '#00f2fe' },
          { label: 'Vencidas', value: vencidasVal, color: '#f43f5e' },
          { label: 'Bonificadas', value: bonificadasVal, color: '#fbbf24' },
          { label: 'Suspensas', value: suspensasVal, color: '#a855f7' },
          { label: 'Canceladas', value: canceladasVal, color: '#f97316' },
          { label: 'Excluídas', value: excluidasVal, color: '#dc2626' },
        ].filter(d => d.value > 0);

        new window.Chart(donutCtx, {
          type: 'doughnut',
          data: {
            labels: donutData.map(d => d.label),
            datasets: [{
              data: donutData.map(d => d.value),
              backgroundColor: donutData.map(d => d.color + '99'),
              borderColor: donutData.map(d => d.color),
              borderWidth: 2,
              hoverOffset: 6
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '65%',
            plugins: {
              legend: { position: 'right', labels: { color: '#94a3b8', font: { size: 10 }, boxWidth: 10, padding: 8 } },
              tooltip: { callbacks: { label: ctx => ` ${ctx.label}: ${fmt(ctx.parsed)}` } }
            }
          }
        });
      }

      // Gráfico de Barras - Forma de Pagamento
      const barCtx = document.getElementById('modal-fin-bar-chart');
      if (barCtx && window.Chart) {
        const methods = Object.keys(methodMap);
        const methodColors = ['#6366f1','#34d399','#00f2fe','#f43f5e','#fbbf24','#a855f7'];
        new window.Chart(barCtx, {
          type: 'bar',
          data: {
            labels: methods,
            datasets: [{
              label: 'Valor Total (R$)',
              data: methods.map(m => methodMap[m]),
              backgroundColor: methods.map((_, i) => methodColors[i % methodColors.length] + 'bb'),
              borderColor: methods.map((_, i) => methodColors[i % methodColors.length]),
              borderWidth: 1.5,
              borderRadius: 6,
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: { display: false },
              tooltip: { callbacks: { label: ctx => ` ${fmt(ctx.parsed.y)}` } }
            },
            scales: {
              x: { ticks: { color: '#94a3b8', font: { size: 10 } }, grid: { color: 'rgba(255,255,255,0.04)' } },
              y: { ticks: { color: '#94a3b8', font: { size: 10 }, callback: v => 'R$' + (v/1000).toFixed(1) + 'k' }, grid: { color: 'rgba(255,255,255,0.06)' } }
            }
          }
        });
      }
    }, 80);

    const closeModal = () => { modal.style.display = 'none'; };
    document.getElementById('close-modal-fin-window')?.addEventListener('click', closeModal);

    const selectAll = document.getElementById('modal-fin-select-all');
    const batchBtn = document.getElementById('modal-fin-btn-batch-pay');
    const batchCount = document.getElementById('modal-fin-batch-count');

    const updateBatchState = () => {
      const checked = document.querySelectorAll('.modal-fin-row-check:checked');
      if (checked.length > 0) {
        batchBtn.style.display = 'inline-flex';
        batchCount.textContent = checked.length;
      } else {
        batchBtn.style.display = 'none';
      }
    };

    selectAll?.addEventListener('change', (e) => {
      document.querySelectorAll('.modal-fin-row-check').forEach(cb => {
        cb.checked = e.target.checked;
      });
      updateBatchState();
    });

    document.querySelectorAll('.modal-fin-row-check').forEach(cb => {
      cb.addEventListener('change', updateBatchState);
    });

    batchBtn?.addEventListener('click', async () => {
      const checked = [...document.querySelectorAll('.modal-fin-row-check:checked')].map(c => c.dataset.id);
      if (checked.length === 0) return;
      if (confirm(`Confirmar baixa manual em lote de ${checked.length} parcelas selecionadas?`)) {
        try {
          const response = await apiFetch('/api/financial/installments/pay-batch', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ids: checked, notes: 'Baixa em lote realizada pela janela dedicada' })
          });
          if (response.ok) {
            if (typeof showToast === 'function') showToast(`✅ ${checked.length} parcelas baixadas com sucesso!`);
            closeModal();
            if (typeof onRefresh === 'function') onRefresh();
          } else {
            alert('Erro ao efetuar baixa em lote.');
          }
        } catch (err) {
          console.error(err);
        }
      }
    });

    document.querySelectorAll('.modal-btn-boleto').forEach(btn => {
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

    document.querySelectorAll('.modal-btn-pay').forEach(btn => {
      btn.addEventListener('click', () => {
        const item = installmentsList.find(t => t.id === btn.dataset.id);
        if (item) {
          openPayInstallmentModal(item, () => {
            closeModal();
            if (typeof onRefresh === 'function') onRefresh();
          });
        }
      });
    });

    document.getElementById('modal-fin-btn-pdf')?.addEventListener('click', () => processExport('pdf'));
    document.getElementById('modal-fin-btn-xls')?.addEventListener('click', () => processExport('xls'));
    document.getElementById('modal-fin-btn-csv')?.addEventListener('click', () => processExport('csv'));
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
      <div class="modal-card glass-card" style="max-width: 840px; width: 94%; padding: 24px; border-radius: 20px; border: 1px solid var(--border-color); background: var(--bg-secondary); color: var(--text-primary); max-height: 90vh; overflow-y: auto; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.6); position: relative;">
        
        <!-- CABEÇALHO DO MODAL COM AÇÕES RÁPIDAS (FIXO AO ROLAR) -->
        <div style="position: sticky; top: -24px; z-index: 30; background: var(--bg-secondary); border-bottom: 1px solid var(--border-color); padding: 14px 24px; margin: -24px -24px 18px -24px; border-top-left-radius: 20px; border-top-right-radius: 20px; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px; backdrop-filter: blur(12px);">
          <div style="display: flex; align-items: center; gap: 12px;">
            <div style="width: 40px; height: 40px; border-radius: 10px; background: linear-gradient(135deg, #4f46e5, #3730a3); display: flex; align-items: center; justify-content: center; font-size: 1.2rem; color: #fff; box-shadow: 0 4px 12px rgba(79,70,229,0.3);">
              <i class="fa-solid fa-barcode"></i>
            </div>
            <div>
              <h3 style="margin: 0; font-size: 1.15rem; font-weight: 700; font-family: 'Outfit', sans-serif;">2ª Via do Boleto Bancário FEBRABAN</h3>
              <span style="font-size: 0.78rem; color: var(--text-muted);">Nosso Número: <strong>${t.id}</strong> • Health Nexus Bank (341-7)</span>
            </div>
          </div>
          
          <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
            <button id="btn-copy-linha-top" class="btn btn-outline" style="font-size: 0.78rem; padding: 6px 12px; border-color: rgba(99,102,241,0.4);"><i class="fa-solid fa-copy"></i> Copiar Linha</button>
            <button id="btn-copy-pix-top" class="btn btn-outline" style="font-size: 0.78rem; padding: 6px 12px; border-color: rgba(52,211,153,0.4); color: #34d399;"><i class="fa-solid fa-qrcode"></i> Copiar Pix</button>
            <button id="btn-print-boleto" class="btn btn-primary" style="font-size: 0.78rem; padding: 6px 14px; background: linear-gradient(135deg, #6366f1, #4f46e5);"><i class="fa-solid fa-print"></i> Imprimir PDF</button>
            <button id="close-boleto-modal" class="btn-icon" style="background: rgba(255,255,255,0.08); border: 1px solid var(--border-color); width: 34px; height: 34px; border-radius: 50%; font-size: 1.1rem; color: var(--text-primary); cursor: pointer; display: flex; align-items: center; justify-content: center;" title="Fechar Janela (ESC)"><i class="fa-solid fa-xmark"></i></button>
          </div>
        </div>

        <!-- PAINEL PIX (QR CODE COMPACTO) -->
        <div style="background: rgba(52, 211, 153, 0.06); border: 1px dashed rgba(52, 211, 153, 0.3); border-radius: 12px; padding: 12px 18px; margin-bottom: 20px; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px;">
          <div style="display: flex; align-items: center; gap: 14px;">
            <div style="width: 48px; height: 48px; background: #fff; border-radius: 8px; padding: 4px; display: flex; align-items: center; justify-content: center; border: 1px solid rgba(52, 211, 153, 0.4);">
              <i class="fa-solid fa-qrcode" style="font-size: 2.2rem; color: #0d9488;"></i>
            </div>
            <div>
              <div style="font-size: 0.85rem; font-weight: 700; color: #34d399;">Pagamento Instantâneo via Pix</div>
              <div style="font-size: 0.76rem; color: var(--text-muted);">Escaneie com o app do seu banco para quitação em tempo real.</div>
            </div>
          </div>
          <button id="btn-copy-pix-banner" class="btn" style="background: #0d9488; color: #fff; font-size: 0.78rem; padding: 6px 14px; border-radius: 8px; border: none; font-weight: 600; cursor: pointer;">
            <i class="fa-solid fa-copy"></i> Copiar Pix Copia e Cola
          </button>
        </div>

        <!-- ESTRUTURA OFICIAL DO BOLETO FEBRABAN COM LOGO -->
        <div id="printable-boleto-area" style="background: #ffffff; color: #000000; padding: 24px; border-radius: 10px; border: 1px solid #cbd5e1; font-family: 'Arial', sans-serif; box-shadow: 0 4px 15px rgba(0,0,0,0.15);">
          
          <!-- 1. RECIBO DO PAGADOR (CANHOTO SUPERIOR COM LOGOTIPO) -->
          <div style="margin-bottom: 12px;">
            <div style="display: flex; align-items: center; border-bottom: 2px solid #000; padding-bottom: 6px; margin-bottom: 6px;">
              <!-- LOGO BRANDED HEALTH NEXUS -->
              <div style="display: flex; align-items: center; gap: 8px; flex: 1;">
                <div style="width: 32px; height: 32px; border-radius: 8px; background: linear-gradient(135deg, #4f46e5, #3730a3); display: flex; align-items: center; justify-content: center; color: #ffffff; font-size: 1.05rem; box-shadow: 0 2px 6px rgba(79,70,229,0.3);">
                  <i class="fa-solid fa-heart-pulse"></i>
                </div>
                <div>
                  <div style="font-size: 1.15rem; font-weight: 900; color: #1e1b4b; font-family: 'Outfit', sans-serif; line-height: 1; letter-spacing: -0.4px;">HEALTH <span style="color: #4f46e5;">NEXUS</span></div>
                  <div style="font-size: 0.58rem; font-weight: 800; color: #64748b; letter-spacing: 1.2px; text-transform: uppercase; margin-top: 2px;">BANK • GESTÃO HOSPITALAR</div>
                </div>
              </div>

              <span style="font-size: 1.1rem; font-weight: 900; border-left: 2px solid #000; border-right: 2px solid #000; padding: 0 12px; margin-right: 12px;">341-7</span>
              <span style="font-size: 0.85rem; font-weight: 700; font-family: monospace; letter-spacing: 0.5px;">RECIBO DO PAGADOR</span>
            </div>

            <!-- TABELA CANHOTO -->
            <table style="width: 100%; border-collapse: collapse; border: 1px solid #000; font-size: 7.5pt; margin-bottom: 8px;">
              <tr>
                <td style="border: 1px solid #000; padding: 4px 6px; width: 50%;">
                  <span style="color: #475569; display: block; font-size: 6.5pt; text-transform: uppercase;">Beneficiário</span>
                  <strong style="font-size: 8.5pt;">Health Nexus Serviços Médicos Hospitalares Ltda - CNPJ: 42.109.843/0001-90</strong>
                </td>
                <td style="border: 1px solid #000; padding: 4px 6px; width: 25%;">
                  <span style="color: #475569; display: block; font-size: 6.5pt; text-transform: uppercase;">Agência / Código Beneficiário</span>
                  <strong style="font-size: 8.5pt;">0412 / 00948-2</strong>
                </td>
                <td style="border: 1px solid #000; padding: 4px 6px; width: 25%;">
                  <span style="color: #475569; display: block; font-size: 6.5pt; text-transform: uppercase;">Vencimento</span>
                  <strong style="font-size: 9pt; color: #e11d48;">${t.dueDate}</strong>
                </td>
              </tr>
              <tr>
                <td style="border: 1px solid #000; padding: 4px 6px;">
                  <span style="color: #475569; display: block; font-size: 6.5pt; text-transform: uppercase;">Pagador / Paciente</span>
                  <strong style="font-size: 8.5pt;">${t.client}</strong>
                </td>
                <td style="border: 1px solid #000; padding: 4px 6px;">
                  <span style="color: #475569; display: block; font-size: 6.5pt; text-transform: uppercase;">Nosso Número</span>
                  <strong style="font-size: 8.5pt;">175/00948201-9 (${t.id})</strong>
                </td>
                <td style="border: 1px solid #000; padding: 4px 6px;">
                  <span style="color: #475569; display: block; font-size: 6.5pt; text-transform: uppercase;">Valor do Documento</span>
                  <strong style="font-size: 9.5pt; color: #059669;">${t.amountFormatted}</strong>
                </td>
              </tr>
              <tr>
                <td colspan="3" style="border: 1px solid #000; padding: 4px 6px; background: #f8fafc;">
                  <span style="color: #64748b; font-size: 7pt;">Demonstrativo / Descrição: <strong>${t.desc}</strong></span>
                  <span style="float: right; color: #94a3b8; font-size: 6.5pt;">Autenticação Mecânica - Recibo do Sacado</span>
                </td>
              </tr>
            </table>
          </div>

          <!-- LINHA PONTILHADA DE CORTE -->
          <div style="border-bottom: 1.5px dashed #64748b; margin: 16px 0; position: relative; text-align: right;">
            <span style="position: absolute; right: 0; top: -10px; background: #fff; padding-left: 8px; font-size: 7pt; color: #64748b;">
              <i class="fa-solid fa-scissors" style="transform: rotate(180deg);"></i> Corte na linha pontilhada abaixo
            </span>
          </div>

          <!-- 2. FICHA DE COMPENSAÇÃO FEBRABAN COM LOGOTIPO -->
          <div style="margin-top: 14px;">
            <!-- CABEÇALHO DO BANCO COM LOGO -->
            <div style="display: flex; align-items: center; border-bottom: 2px solid #000; padding-bottom: 6px; margin-bottom: 4px;">
              <!-- LOGO BRANDED HEALTH NEXUS -->
              <div style="display: flex; align-items: center; gap: 8px; flex: 1;">
                <div style="width: 32px; height: 32px; border-radius: 8px; background: linear-gradient(135deg, #4f46e5, #3730a3); display: flex; align-items: center; justify-content: center; color: #ffffff; font-size: 1.05rem; box-shadow: 0 2px 6px rgba(79,70,229,0.3);">
                  <i class="fa-solid fa-heart-pulse"></i>
                </div>
                <div>
                  <div style="font-size: 1.15rem; font-weight: 900; color: #1e1b4b; font-family: 'Outfit', sans-serif; line-height: 1; letter-spacing: -0.4px;">HEALTH <span style="color: #4f46e5;">NEXUS</span></div>
                  <div style="font-size: 0.58rem; font-weight: 800; color: #64748b; letter-spacing: 1.2px; text-transform: uppercase; margin-top: 2px;">BANK • GESTÃO HOSPITALAR</div>
                </div>
              </div>

              <span style="font-size: 1.1rem; font-weight: 900; border-left: 2px solid #000; border-right: 2px solid #000; padding: 0 12px; margin-right: 10px;">341-7</span>
              <span style="font-size: 0.92rem; font-weight: 800; font-family: monospace; letter-spacing: 0.8px;">${linhaDigitavel}</span>
            </div>

            <!-- TABELA FEBRABAN COMPLETA -->
            <table style="width: 100%; border-collapse: collapse; border: 1px solid #000; font-size: 7.5pt;">
              <tr>
                <td colspan="5" style="border: 1px solid #000; padding: 3px 6px; width: 75%;">
                  <span style="color: #475569; display: block; font-size: 6.5pt; text-transform: uppercase;">Local de Pagamento</span>
                  <strong style="font-size: 8pt;">PAGÁVEL EM QUALQUER BANCO OU CORRESPONDENTE BANCÁRIO ATÉ O VENCIMENTO</strong>
                </td>
                <td style="border: 1px solid #000; padding: 3px 6px; width: 25%; background: #fef2f2;">
                  <span style="color: #991b1b; display: block; font-size: 6.5pt; text-transform: uppercase; font-weight: bold;">Vencimento</span>
                  <strong style="font-size: 9.5pt; color: #dc2626;">${t.dueDate}</strong>
                </td>
              </tr>
              <tr>
                <td colspan="5" style="border: 1px solid #000; padding: 3px 6px;">
                  <span style="color: #475569; display: block; font-size: 6.5pt; text-transform: uppercase;">Beneficiário</span>
                  <strong style="font-size: 8.5pt;">Health Nexus Serviços Médicos Hospitalares Ltda - CNPJ: 42.109.843/0001-90</strong>
                </td>
                <td style="border: 1px solid #000; padding: 3px 6px;">
                  <span style="color: #475569; display: block; font-size: 6.5pt; text-transform: uppercase;">Agência / Código Beneficiário</span>
                  <strong style="font-size: 8.5pt;">0412 / 00948-2</strong>
                </td>
              </tr>

              <tr>
                <td style="border: 1px solid #000; padding: 3px 6px; width: 18%;">
                  <span style="color: #475569; display: block; font-size: 6.5pt; text-transform: uppercase;">Data do Documento</span>
                  <span>10/05/2026</span>
                </td>
                <td style="border: 1px solid #000; padding: 3px 6px; width: 20%;">
                  <span style="color: #475569; display: block; font-size: 6.5pt; text-transform: uppercase;">Nº do Documento</span>
                  <strong>${t.id}</strong>
                </td>
                <td style="border: 1px solid #000; padding: 3px 6px; width: 12%;">
                  <span style="color: #475569; display: block; font-size: 6.5pt; text-transform: uppercase;">Espécie Doc.</span>
                  <span>DM</span>
                </td>
                <td style="border: 1px solid #000; padding: 3px 6px; width: 10%;">
                  <span style="color: #475569; display: block; font-size: 6.5pt; text-transform: uppercase;">Aceite</span>
                  <span>N</span>
                </td>
                <td style="border: 1px solid #000; padding: 3px 6px; width: 15%;">
                  <span style="color: #475569; display: block; font-size: 6.5pt; text-transform: uppercase;">Data Processamento</span>
                  <span>10/05/2026</span>
                </td>
                <td style="border: 1px solid #000; padding: 3px 6px;">
                  <span style="color: #475569; display: block; font-size: 6.5pt; text-transform: uppercase;">Nosso Número</span>
                  <strong>175/00948201-9</strong>
                </td>
              </tr>

              <tr>
                <td style="border: 1px solid #000; padding: 3px 6px;">
                  <span style="color: #475569; display: block; font-size: 6.5pt; text-transform: uppercase;">Uso do Banco</span>
                </td>
                <td style="border: 1px solid #000; padding: 3px 6px;">
                  <span style="color: #475569; display: block; font-size: 6.5pt; text-transform: uppercase;">Carteira</span>
                  <span>109</span>
                </td>
                <td style="border: 1px solid #000; padding: 3px 6px;">
                  <span style="color: #475569; display: block; font-size: 6.5pt; text-transform: uppercase;">Moeda</span>
                  <span>R$</span>
                </td>
                <td style="border: 1px solid #000; padding: 3px 6px;">
                  <span style="color: #475569; display: block; font-size: 6.5pt; text-transform: uppercase;">Quantidade</span>
                  <span>1</span>
                </td>
                <td style="border: 1px solid #000; padding: 3px 6px;">
                  <span style="color: #475569; display: block; font-size: 6.5pt; text-transform: uppercase;">Valor do Documento</span>
                </td>
                <td style="border: 1px solid #000; padding: 3px 6px; background: #f0fdf4;">
                  <span style="color: #166534; display: block; font-size: 6.5pt; text-transform: uppercase; font-weight: bold;">(=) Valor do Documento</span>
                  <strong style="font-size: 10pt; color: #15803d;">${t.amountFormatted}</strong>
                </td>
              </tr>

              <tr>
                <td colspan="5" rowspan="5" style="border: 1px solid #000; padding: 8px; vertical-align: top; font-size: 7.5pt; line-height: 1.4;">
                  <span style="color: #475569; display: block; font-size: 6.5pt; text-transform: uppercase; font-weight: bold; margin-bottom: 4px;">Instruções (Texto de Responsabilidade do Beneficiário)</span>
                  • NÃO RECEBER APÓS 30 DIAS DO VENCIMENTO.<br>
                  • APÓS O VENCIMENTO COBRAR MULTA DE 2,00% E JUROS DE 1,00% AO MÊS.<br>
                  • TÍTULO REFERENTE A PRESTAÇÃO DE SERVIÇOS HOSPITALARES E CONSULTAS MÉDICAS.<br>
                  • SERVIÇO PRESTADO: <strong>${t.desc}</strong><br>
                  • DÚVIDAS OU SEGUNDA VIA LIGUE: (11) 4003-8900 OU WHATSAPP (11) 98888-7700.
                </td>
                <td style="border: 1px solid #000; padding: 3px 6px;">
                  <span style="color: #475569; display: block; font-size: 6.5pt; text-transform: uppercase;">(-) Desconto / Abatimento</span>
                </td>
              </tr>
              <tr>
                <td style="border: 1px solid #000; padding: 3px 6px;">
                  <span style="color: #475569; display: block; font-size: 6.5pt; text-transform: uppercase;">(-) Outras Deduções</span>
                </td>
              </tr>
              <tr>
                <td style="border: 1px solid #000; padding: 3px 6px;">
                  <span style="color: #475569; display: block; font-size: 6.5pt; text-transform: uppercase;">(+) Mora / Multa</span>
                </td>
              </tr>
              <tr>
                <td style="border: 1px solid #000; padding: 3px 6px;">
                  <span style="color: #475569; display: block; font-size: 6.5pt; text-transform: uppercase;">(+) Outros Acréscimos</span>
                </td>
              </tr>
              <tr>
                <td style="border: 1px solid #000; padding: 3px 6px; background: #f8fafc;">
                  <span style="color: #475569; display: block; font-size: 6.5pt; text-transform: uppercase; font-weight: bold;">(=) Valor Cobrado</span>
                  <strong style="font-size: 9pt;">${t.amountFormatted}</strong>
                </td>
              </tr>

              <tr>
                <td colspan="6" style="border: 1px solid #000; padding: 6px; background: #fafafa;">
                  <span style="color: #475569; display: block; font-size: 6.5pt; text-transform: uppercase;">Pagador / Sacado</span>
                  <strong style="font-size: 8.5pt;">${t.client} — CPF: 384.910.284-00</strong><br>
                  <span style="font-size: 7.5pt; color: #475569;">Av. Paulista, 1000 - Bela Vista - São Paulo / SP - CEP: 01310-100</span>
                  <span style="float: right; font-size: 7pt; color: #64748b;">Sacador / Avalista: Health Nexus S.A.</span>
                </td>
              </tr>
            </table>

            <!-- CÓDIGO DE BARRAS NÍTIDO FEBRABAN -->
            <div style="margin-top: 14px; display: flex; justify-content: space-between; align-items: flex-end;">
              <div style="flex: 1;">
                <svg width="100%" height="54" viewBox="0 0 450 54" preserveAspectRatio="none" style="display: block;">
                  <rect x="0" y="0" width="4" height="54" fill="#000"/>
                  <rect x="6" y="0" width="2" height="54" fill="#000"/>
                  <rect x="10" y="0" width="6" height="54" fill="#000"/>
                  <rect x="18" y="0" width="2" height="54" fill="#000"/>
                  <rect x="22" y="0" width="8" height="54" fill="#000"/>
                  <rect x="32" y="0" width="3" height="54" fill="#000"/>
                  <rect x="37" y="0" width="5" height="54" fill="#000"/>
                  <rect x="44" y="0" width="2" height="54" fill="#000"/>
                  <rect x="48" y="0" width="7" height="54" fill="#000"/>
                  <rect x="57" y="0" width="3" height="54" fill="#000"/>
                  <rect x="62" y="0" width="4" height="54" fill="#000"/>
                  <rect x="68" y="0" width="8" height="54" fill="#000"/>
                  <rect x="78" y="0" width="2" height="54" fill="#000"/>
                  <rect x="82" y="0" width="5" height="54" fill="#000"/>
                  <rect x="89" y="0" width="3" height="54" fill="#000"/>
                  <rect x="94" y="0" width="7" height="54" fill="#000"/>
                  <rect x="103" y="0" width="2" height="54" fill="#000"/>
                  <rect x="107" y="0" width="6" height="54" fill="#000"/>
                  <rect x="115" y="0" width="4" height="54" fill="#000"/>
                  <rect x="121" y="0" width="2" height="54" fill="#000"/>
                  <rect x="125" y="0" width="8" height="54" fill="#000"/>
                  <rect x="135" y="0" width="3" height="54" fill="#000"/>
                  <rect x="140" y="0" width="6" height="54" fill="#000"/>
                  <rect x="148" y="0" width="2" height="54" fill="#000"/>
                  <rect x="152" y="0" width="5" height="54" fill="#000"/>
                  <rect x="159" y="0" width="4" height="54" fill="#000"/>
                  <rect x="165" y="0" width="7" height="54" fill="#000"/>
                  <rect x="174" y="0" width="2" height="54" fill="#000"/>
                  <rect x="178" y="0" width="6" height="54" fill="#000"/>
                  <rect x="186" y="0" width="3" height="54" fill="#000"/>
                  <rect x="191" y="0" width="5" height="54" fill="#000"/>
                  <rect x="198" y="0" width="8" height="54" fill="#000"/>
                  <rect x="208" y="0" width="2" height="54" fill="#000"/>
                  <rect x="212" y="0" width="4" height="54" fill="#000"/>
                  <rect x="218" y="0" width="6" height="54" fill="#000"/>
                  <rect x="226" y="0" width="3" height="54" fill="#000"/>
                  <rect x="231" y="0" width="7" height="54" fill="#000"/>
                  <rect x="240" y="0" width="2" height="54" fill="#000"/>
                  <rect x="244" y="0" width="5" height="54" fill="#000"/>
                  <rect x="251" y="0" width="4" height="54" fill="#000"/>
                  <rect x="257" y="0" width="8" height="54" fill="#000"/>
                  <rect x="267" y="0" width="2" height="54" fill="#000"/>
                  <rect x="271" y="0" width="6" height="54" fill="#000"/>
                  <rect x="279" y="0" width="3" height="54" fill="#000"/>
                  <rect x="284" y="0" width="5" height="54" fill="#000"/>
                  <rect x="291" y="0" width="7" height="54" fill="#000"/>
                  <rect x="300" y="0" width="2" height="54" fill="#000"/>
                  <rect x="304" y="0" width="4" height="54" fill="#000"/>
                  <rect x="310" y="0" width="6" height="54" fill="#000"/>
                  <rect x="318" y="0" width="3" height="54" fill="#000"/>
                  <rect x="323" y="0" width="8" height="54" fill="#000"/>
                  <rect x="333" y="0" width="2" height="54" fill="#000"/>
                  <rect x="337" y="0" width="5" height="54" fill="#000"/>
                  <rect x="344" y="0" width="4" height="54" fill="#000"/>
                  <rect x="350" y="0" width="7" height="54" fill="#000"/>
                  <rect x="359" y="0" width="2" height="54" fill="#000"/>
                  <rect x="363" y="0" width="6" height="54" fill="#000"/>
                  <rect x="371" y="0" width="3" height="54" fill="#000"/>
                  <rect x="376" y="0" width="5" height="54" fill="#000"/>
                  <rect x="383" y="0" width="8" height="54" fill="#000"/>
                  <rect x="393" y="0" width="2" height="54" fill="#000"/>
                  <rect x="397" y="0" width="4" height="54" fill="#000"/>
                  <rect x="403" y="0" width="6" height="54" fill="#000"/>
                  <rect x="411" y="0" width="3" height="54" fill="#000"/>
                  <rect x="416" y="0" width="7" height="54" fill="#000"/>
                  <rect x="425" y="0" width="2" height="54" fill="#000"/>
                  <rect x="429" y="0" width="5" height="54" fill="#000"/>
                  <rect x="436" y="0" width="4" height="54" fill="#000"/>
                  <rect x="442" y="0" width="8" height="54" fill="#000"/>
                </svg>
                <div style="font-family: monospace; font-size: 7.5pt; color: #475569; letter-spacing: 2px; margin-top: 4px;">
                  34191.79001 01043.510047 91020.150008 5 94100000035000
                </div>
              </div>
              <div style="text-align: right; padding-left: 15px; font-size: 6.5pt; color: #64748b;">
                Ficha de Compensação<br>
                Autenticação Mecânica FEBRABAN
              </div>
            </div>
          </div>
        </div>

        <!-- BOTÕES DE FECHAMENTO DO MODAL -->
        <div style="display: flex; justify-content: flex-end; gap: 12px; margin-top: 22px;">
          <button id="btn-close-boleto-foot" class="btn btn-outline" style="font-size: 0.85rem; padding: 8px 18px;">Fechar Visualização</button>
          <button id="btn-print-boleto-foot" class="btn btn-primary" style="background: linear-gradient(135deg, #6366f1, #4f46e5); font-size: 0.85rem; padding: 8px 20px;"><i class="fa-solid fa-print"></i> Imprimir Boleto FEBRABAN</button>
        </div>
      </div>
    `;

    modal.classList.add('active');

    const close = () => {
      modal.classList.remove('active');
      setTimeout(() => { modal.remove(); }, 150);
    };

    document.getElementById('close-boleto-modal')?.addEventListener('click', close);
    document.getElementById('btn-close-boleto-foot')?.addEventListener('click', close);

    // Fechar ao clicar fora do cartão (no fundo escuro)
    modal.addEventListener('click', (e) => {
      if (e.target === modal) close();
    });

    // Fechar com a tecla ESC (Escape)
    const escHandler = (e) => {
      if (e.key === 'Escape') {
        close();
        document.removeEventListener('keydown', escHandler);
      }
    };
    document.addEventListener('keydown', escHandler);

    const copyToClipboard = (text) => {
      if (navigator.clipboard?.writeText) {
        return navigator.clipboard.writeText(text);
      }
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    };

    const handleCopyLinha = () => {
      copyToClipboard(linhaDigitavel);
      if (typeof showToast === 'function') showToast('Linha digitável FEBRABAN copiada para a área de transferência!');
    };

    const handleCopyPix = () => {
      copyToClipboard(pixCopyPaste);
      if (typeof showToast === 'function') showToast('Chave Pix Copia e Cola copiada com sucesso!');
    };

    document.getElementById('btn-copy-linha-top')?.addEventListener('click', handleCopyLinha);
    document.getElementById('btn-copy-pix-top')?.addEventListener('click', handleCopyPix);
    document.getElementById('btn-copy-pix-banner')?.addEventListener('click', handleCopyPix);

    const handlePrint = () => {
      const printWin = window.open('', '_blank');
      if (!printWin) {
        alert('Por favor, habilite janelas pop-up no seu navegador para imprimir o boleto.');
        return;
      }
      const boletoHTML = document.getElementById('printable-boleto-area').innerHTML;
      printWin.document.write(`
        <!DOCTYPE html>
        <html lang="pt-BR">
        <head>
          <meta charset="UTF-8">
          <title>Boleto Bancário FEBRABAN — Título ${t.id}</title>
          <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
          <style>
            @page { size: A4 portrait; margin: 10mm; }
            body { font-family: Arial, sans-serif; padding: 15px; color: #000; background: #fff; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          </style>
        </head>
        <body>
          <div style="max-width: 800px; margin: 0 auto;">
            ${boletoHTML}
          </div>
          <script>
            window.onload = function() { window.print(); };
          </script>
        </body>
        </html>
      `);
      printWin.document.close();
    };

    document.getElementById('btn-print-boleto')?.addEventListener('click', handlePrint);
    document.getElementById('btn-print-boleto-foot')?.addEventListener('click', handlePrint);
  }

  const processExport = async (format) => {
    try {
      if (typeof showToast === 'function') showToast(`Gerando ${format.toUpperCase()}...`);
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
    let financialSummary;

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
      // ---- ABA FINANCEIRO: usa dados reais da janela dedicada ----
      const activeFinStatus = window._activeFinStatusFilter || 'Todos';
      title = activeFinStatus === 'Todos'
        ? 'Relatório Financeiro de Títulos (Todos os Status)'
        : `Relatório Financeiro — Títulos ${activeFinStatus.toUpperCase()}`;
      filename = `relatorio_financeiro_${activeFinStatus.toLowerCase().replace(/\s+/g, '_')}`;
      columns = ['Nosso Número', 'Paciente / Cliente', 'Descrição do Serviço', 'Vencimento', 'Valor (R$)', 'Status'];

      // Preferir dados do modal se estiver aberto, senão da aba financeiro
      const modalList = window._modalFinTitlesList || [];
      const tabList = window._finTitlesList || [];
      const sourceList = modalList.length > 0 ? modalList : tabList;
      const listToExport = sourceList.filter(t =>
        activeFinStatus === 'Todos' || t.status === activeFinStatus
      );

      rows = listToExport.map(t => [
        t.id,
        hasPEP ? t.client : (typeof abbreviateName === 'function' ? abbreviateName(t.client) : t.client),
        t.desc,
        t.dueDate,
        t.amountFormatted,
        t.status
      ]);

      // ---- Computar KPI summary para o PDF ----
      let pagasVal=0, aVencerVal=0, vencidasVal=0, bonificadasVal=0, suspensasVal=0, canceladasVal=0, excluidasVal=0;
      let pagasC=0, aVencerC=0, vencidasC=0, bonificadasC=0, suspensasC=0, canceladasC=0, excluidasC=0;
      let totalRec=0, totalDesp=0;
      listToExport.forEach(t => {
        const v = parseFloat(t.amount) || 0;
        if (t.type === 'Despesa') totalDesp += v; else totalRec += v;
        switch(t.status) {
          case 'Pagas':       pagasC++;       pagasVal += v;       break;
          case 'A Vencer':    aVencerC++;     aVencerVal += v;     break;
          case 'Vencidas':    vencidasC++;    vencidasVal += v;    break;
          case 'Bonificadas': bonificadasC++; bonificadasVal += v; break;
          case 'Suspensas':   suspensasC++;   suspensasVal += v;   break;
          case 'Canceladas':  canceladasC++;  canceladasVal += v;  break;
          case 'Excluídas':   excluidasC++;   excluidasVal += v;   break;
        }
      });

      // Capturar imagens dos gráficos Chart.js (canvas -> base64)
      // Priorizar canvas do modal, depois da aba financeiro
      const donutCanvas = document.getElementById('modal-fin-donut-chart') || document.getElementById('finPieChart');
      const barCanvas = document.getElementById('modal-fin-bar-chart') || document.getElementById('finBarChart');
      const donutImg = donutCanvas ? donutCanvas.toDataURL('image/png') : null;
      const barImg   = barCanvas   ? barCanvas.toDataURL('image/png')   : null;

      financialSummary = {
        pagasVal, aVencerVal, vencidasVal, bonificadasVal, suspensasVal, canceladasVal, excluidasVal,
        pagasC, aVencerC, vencidasC, bonificadasC, suspensasC, canceladasC, excluidasC,
        totalRec, totalDesp, saldo: totalRec - totalDesp,
        donutImg, barImg
      };
    }

    const timestamp = new Date().toISOString().slice(0,10);
    filename = `${filename}_${timestamp}`;

    if (format === 'pdf') {
      await exportHtmlPDF(columns, rows, title, filename, activeTab === 'financial' ? financialSummary : undefined);
    } else if (format === 'xls') {
      exportHtmlXLS(columns, rows, filename);
    } else if (format === 'csv') {
      exportHtmlCSV(columns, rows, filename);
    }
  } catch (err) {
    console.error('Erro ao exportar:', err);
    if (typeof showToast === 'function') showToast('Erro ao exportar: ' + err.message);
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
        <h2 style="margin: 0;"><i class="fa-solid fa-door-open" style="color: var(--primary);"></i> Painel de Consultórios</h2>
        <button id="btn-new-room" class="btn btn-primary"><i class="fa-solid fa-plus"></i> Novo Consultório</button>
      </div>

      <div id="rooms-dashboard" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 20px;">
        <div style="text-align: center; grid-column: 1 / -1; padding: 40px;">
          <i class="fa-solid fa-spinner fa-spin" style="font-size: 2rem; color: var(--color-primary);"></i>
        </div>
      </div>
    </div>
  `;

  document.getElementById('btn-new-room').addEventListener('click', () => openRoomModal());
  await loadConsultingRooms();
}

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
    
    if (roomsResult.status === 'success') {
      const rooms = roomsResult.data;
      const appointments = aptResult.data || [];
      
      if (rooms.length === 0) {
        dashboard.innerHTML = '<div style="grid-column: 1 / -1; text-align: center; color: var(--text-muted); padding: 40px;">Nenhum consultório cadastrado.</div>';
        return;
      }

      dashboard.innerHTML = rooms.map(r => {
        const roomApts = appointments.filter(a => a.roomName === r.name);
        const waiting = roomApts.filter(a => a.status === 'Confirmado' || a.status === 'Agendado');
        const inProgress = roomApts.find(a => a.status === 'Em Atendimento');
        
        const statusColor = r.status === 'Disponível' ? 'var(--success)' : 'var(--warning)';
        
        return `
          <div class="interactive-card" style="background: var(--bg-secondary); border: 1px solid var(--border-color); border-radius: 12px; padding: 20px; display: flex; flex-direction: column; gap: 12px; position: relative; overflow: hidden; cursor: pointer; transition: transform 0.2s, box-shadow 0.2s;" onclick="window.pendingAgendaRoomFilter = '${r.name}'; switchTab('agenda');" onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 4px 12px rgba(0,0,0,0.1)';" onmouseout="this.style.transform=''; this.style.boxShadow='';">
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
                <i class="fa-solid fa-circle" style="font-size: 0.5rem;"></i> ${r.status}
              </span>
              ${r.currentDoctor ? `<span style="font-size: 0.8rem; font-weight: 600; color: var(--text-secondary);"><i class="fa-solid fa-user-doctor"></i> ${r.currentDoctor}</span>` : ''}
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
            <i class="fa-solid fa-plus"></i> Novo Agendamento
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
          <!-- Consultório (Dinâmico) -->
          <div style="display: flex; align-items: center; gap: 8px; background: var(--bg-tertiary); border: 1px solid var(--border-color); border-radius: 8px; padding: 8px 14px; min-width: 200px;">
            <i class="fa-solid fa-door-open" style="color: var(--text-muted); font-size: 0.82rem;"></i>
            <select id="filter-agenda-room" style="background: transparent; border: none; color: var(--text-primary); font-size: 0.85rem; outline: none; cursor: pointer; flex: 1; -webkit-appearance: none;">
              <option value="">Todos os Consultórios</option>
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
      <div class="modal-content" style="max-width: 550px; width: 100%;">
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
          <div class="form-group">
            <label for="apt-room">Consultório *</label>
            <select id="apt-room" class="form-input" required>
              <option value="">Selecione o consultório...</option>
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

  const loadRoomsList = async () => {
    try {
      const rList = await cachedApiGet('/api/consulting-rooms', 'consulting_rooms');
      const rooms = Array.isArray(rList) ? rList : (rList.data || []);
      
      const filterSelect = document.getElementById('filter-agenda-room');
      const modalSelect = document.getElementById('apt-room');
      
      if (filterSelect) {
        const curVal = window.pendingAgendaRoomFilter !== undefined ? window.pendingAgendaRoomFilter : filterSelect.value;
        filterSelect.innerHTML = '<option value="">Todos os Consultórios</option>';
        rooms.forEach(r => {
          const opt = document.createElement('option');
          opt.value = r.name;
          opt.textContent = r.name;
          filterSelect.appendChild(opt);
        });
        filterSelect.value = curVal;
        
        if (window.pendingAgendaRoomFilter !== undefined) {
          window.pendingAgendaRoomFilter = undefined;
          if (typeof window.reloadAgenda === 'function') window.reloadAgenda();
        }
      }
      
      if (modalSelect) {
        modalSelect.innerHTML = '<option value="">Selecione o consultório...</option>';
        rooms.forEach(r => {
          const opt = document.createElement('option');
          opt.value = r.name;
          opt.textContent = r.name;
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
              ${apt.roomName ? `
              <div style="display: inline-flex; align-items: center; gap: 5px; font-size: 0.75rem; color: var(--text-muted); background: var(--bg-tertiary); border: 1px solid var(--border-color); border-radius: 20px; padding: 3px 10px;">
                <i class="fa-solid fa-door-open" style="font-size: 0.7rem;"></i> ${apt.roomName}
              </div>
              ` : ''}
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
    const roomEl = document.getElementById('filter-agenda-room');
    const selectedRoom = roomEl ? roomEl.value : '';
    const container = document.getElementById('agenda-list-container');
    container.innerHTML = '<div style="text-align: center; padding: 48px; color: var(--text-muted);"><i class="fa-solid fa-spinner fa-spin" style="font-size: 1.6rem; color: var(--color-primary);"></i></div>';
    try {
      let url = '/api/appointments?date=' + selectedDate;
      if (selectedDoctor) url += '&doctor=' + encodeURIComponent(selectedDoctor);
      if (selectedRoom) url += '&room=' + encodeURIComponent(selectedRoom);
      const cacheKey = 'appointments_' + selectedDate + '_' + selectedDoctor + '_' + selectedRoom;
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
  
  const filterRoomEl = document.getElementById('filter-agenda-room');
  if (filterRoomEl) {
    filterRoomEl.addEventListener('change', loadAgenda);
  }

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

    const roomSelect = document.getElementById('apt-room');
    const roomName = roomSelect ? roomSelect.value : '';
    const appointmentDate = document.getElementById('apt-date').value;
    const appointmentTime = document.getElementById('apt-time').value;
    const notes = document.getElementById('apt-notes').value;
    try {
      const res = await apiFetch('/api/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ patientId, patientName, doctorName, specialty, roomName, appointmentDate, appointmentTime, notes })
      });
      if (res.ok) {
        showToast('Consulta agendada com sucesso!');
        modal.style.display = 'none';
        
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
  loadRoomsList();
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
      <div class="modal-content" style="max-width: 520px;">
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

        <div style="display: flex; gap: 10px; align-items: center; flex-wrap: wrap;">
          <button id="btn-open-duty-modal" class="btn" style="background: rgba(59,130,246,0.15); color: #60a5fa; border: 1px solid rgba(59,130,246,0.3); padding: 10px 20px; font-size: 0.88rem; font-weight: 600; border-radius: 10px; cursor: pointer; transition: all 0.2s;" onclick="window.openDutyScheduleModal()">
            <i class="fa-solid fa-calendar-days" style="margin-right: 6px;"></i> Escala de Plantão
          </button>
          <button id="doctors-trash-btn" class="btn" style="background-color: rgba(239, 68, 68, 0.1); color: var(--danger-color); border: 1px solid rgba(239, 68, 68, 0.3); padding: 10px 22px; font-size: 0.88rem; font-weight: 600; border-radius: 10px; cursor: pointer; transition: all 0.2s;">
            <i class="fa-solid fa-trash-can" style="margin-right: 6px;"></i> Lixeira
          </button>
          <button id="btn-open-doctor-modal" class="btn btn-primary" style="display: inline-flex; align-items: center; gap: 8px; padding: 10px 22px; font-size: 0.88rem; font-weight: 600; border-radius: 10px; box-shadow: 0 4px 14px rgba(99,102,241,0.3); cursor: pointer;">
            <i class="fa-solid fa-plus"></i> Novo Médico
          </button>
        </div>
      </div>

      <!-- ESCALA DO DIA BANNER -->
      <div id="duty-schedule-banner" style="background: var(--bg-secondary); border: 1px solid var(--border-color); border-radius: 14px; padding: 18px 22px; margin-bottom: 24px; backdrop-filter: var(--glass-blur);">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; flex-wrap: wrap; gap: 10px;">
          <div style="display: flex; align-items: center; gap: 10px;">
            <div style="width: 36px; height: 36px; border-radius: 10px; background: rgba(59,130,246,0.15); border: 1px solid rgba(59,130,246,0.3); display: flex; align-items: center; justify-content: center; color: #60a5fa;">
              <i class="fa-solid fa-calendar-check" style="font-size: 1.1rem;"></i>
            </div>
            <div>
              <h3 style="margin: 0; font-size: 1.05rem; font-weight: 700; color: var(--text-primary);">Médicos de Plantão Hoje</h3>
              <span id="duty-schedule-date" style="font-size: 0.78rem; color: var(--text-muted);"></span>
            </div>
          </div>
          <button class="btn" onclick="window.openDutyScheduleModal()" style="background: var(--bg-tertiary); border: 1px solid var(--border-color); color: var(--text-primary); padding: 6px 14px; font-size: 0.8rem; border-radius: 8px; cursor: pointer;">
            <i class="fa-solid fa-plus-circle" style="color: #60a5fa;"></i> Adicionar Plantonista
          </button>
        </div>
        <div id="duty-schedule-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 12px;">
          <div style="text-align: center; color: var(--text-muted); padding: 18px; font-size: 0.85rem;">Carregando escala de plantão...</div>
        </div>
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
      <div class="modal-content" style="max-width: 650px; width: 100%; padding: 24px;">
        <div class="modal-header" style="margin-bottom: 20px;">
          <h3 id="modal-doctor-title"><i class="fa-solid fa-user-doctor" style="color: var(--color-primary);"></i> Cadastrar Médico</h3>
          <button class="btn-close" id="btn-close-doctor-modal"><i class="fa-solid fa-xmark"></i></button>
        </div>
        <form id="form-doctor" class="modal-body">
          <input type="hidden" id="doc-id">
          <div class="form-group">
            <label for="doc-name">Nome Completo *</label>
            <input type="text" id="doc-name" class="form-input" placeholder="Ex: Dr. Roberto Almeida" required>
          </div>
          <div style="display: grid; grid-template-columns: 1fr 2fr; gap: 16px;">
            <div class="form-group">
              <label for="doc-crm">CRM *</label>
              <input type="text" id="doc-crm" class="form-input" placeholder="123456-SP" required>
            </div>
            <div class="form-group">
              <label for="doc-specialty">Especialidade *</label>
              <input type="text" id="doc-specialty" class="form-input" placeholder="Ex: Cardiologia" required>
            </div>
          </div>
          <div style="display: grid; grid-template-columns: 1fr 2fr; gap: 16px;">
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
      window.loadDutyScheduleBanner();
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

  document.getElementById('doctors-trash-btn').addEventListener('click', () => {
    showTrashModal('doctors');
  });

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
  try {
    console.log('Abrindo modal para:', patientName);
    const existing = document.getElementById('reassign-modal');
    if (existing) existing.remove();

    const modal = document.createElement('div');
    modal.id = 'reassign-modal';
    modal.className = 'modal-overlay';
    modal.style.display = 'flex';
    modal.style.zIndex = '99999';

    // Append modal IMMEDIATELY so the user sees action
    document.body.appendChild(modal);

    modal.innerHTML = `
      <div class="modal-content" style="max-width: 480px; width: 90%; background: var(--bg-secondary); border: 1px solid var(--border-color); border-radius: 16px; box-shadow: 0 20px 50px rgba(0,0,0,0.6); padding: 24px; text-align: center;">
        <i class="fa-solid fa-circle-notch fa-spin" style="font-size: 2rem; color: var(--color-primary); margin-bottom: 12px;"></i>
        <p>Carregando informações...</p>
      </div>
    `;

    // Fetch consulting rooms dynamically
    let roomOptionsHtml = '<option value="">Carregando...</option>';
    try {
      const res = await apiFetch('/api/consulting-rooms');
      const result = await res.json();
      if (result.status === 'success' && result.data && result.data.length > 0) {
        roomOptionsHtml = result.data.map(r => {
          const roomValue = `${r.name} ${r.currentDoctor ? `(${r.currentDoctor})` : ''}`.trim();
          const selected = currentRoom && currentRoom.includes(r.name) ? 'selected' : '';
          return `<option value="${roomValue}" ${selected}>${r.name} ${r.specialty ? ` - ${r.specialty}` : ''}</option>`;
        }).join('');
      } else {
        roomOptionsHtml = '<option value="">Nenhum consultório encontrado</option>';
      }
    } catch (err) {
      console.error('Erro ao carregar consultórios no modal:', err);
      roomOptionsHtml = '<option value="">Erro ao carregar</option>';
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
              <button type="button" id="btn-internacao" class="btn" style="background: var(--danger); color: white; border: none;"><i class="fa-solid fa-bed-pulse"></i> Solicitar Internação</button>
            </div>
            <div style="display: flex; gap: 10px;">
              <button type="button" id="btn-cancel-reassign" class="btn btn-secondary">Cancelar</button>
              <button type="submit" class="btn btn-primary">Confirmar Direcionamento</button>
            </div>
          </div>
        </form>
      </div>
    `;

    const closeModal = () => modal.remove();
    document.getElementById('close-reassign-modal').addEventListener('click', closeModal);
    document.getElementById('btn-cancel-reassign').addEventListener('click', closeModal);
    
    const btnInternacao = document.getElementById('btn-internacao');
    if (btnInternacao) {
      btnInternacao.addEventListener('click', async () => {
        document.getElementById('reassign-room').value = 'UTI/Internação';
        document.getElementById('reassign-status').value = 'Aguardando_Leito';
        
        const confirmed = await showCustomConfirm({
          title: 'Solicitar Internação',
          message: 'Deseja realmente solicitar internação para este paciente?',
          confirmText: 'Sim, Solicitar Internação',
          type: 'danger'
        });
        
        if (confirmed) {
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
  } catch (err) {
    console.error('Erro na função openReassignModal:', err);
    alert('Erro ao tentar abrir o modal. Verifique o console.');
  }
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
                <th style="padding: 12px; text-align: right;">AÇÕES</th>
              </tr>
            </thead>
            <tbody id="pharmacy-table-body">
              <tr>
                <td colspan="8" style="text-align: center; padding: 24px; color: var(--text-secondary);">
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
  await loadPharmacyData();

  // Event Listeners
  document.getElementById('btn-add-pharm-item')?.addEventListener('click', () => openAddPharmModal());
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

let currentPharmacyItems = [];

async function loadPharmacyData() {
  try {
    const res = await apiFetch('/api/pharmacy');
    if (res.ok) {
      const data = await res.json();
      currentPharmacyItems = data.data || [];
      renderPharmacyTable(currentPharmacyItems);
    }
  } catch (err) {
    showCustomAlert({ title: 'Erro', message: 'Falha ao buscar estoque da farmácia.', type: 'danger' });
  }
}

function renderPharmacyTable(items) {
  const tbody = document.getElementById('pharmacy-table-body');
  if (!tbody) return;

  if (items.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="8" style="text-align: center; padding: 24px; color: var(--text-secondary);">
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
        <td style="padding: 12px; text-align: right;">
          <div class="actions-cell" style="justify-content: flex-end;">
            <button class="btn-icon btn-edit-pharm" data-id="${item.id}" title="Editar Medicamento" style="color: #ec4899;">
              <i class="fa-solid fa-pen-to-square"></i>
            </button>
            <button class="btn-icon btn-del-pharm" data-id="${item.id}" data-name="${item.name}" title="Excluir Medicamento" style="color: var(--color-danger);">
              <i class="fa-solid fa-trash-can"></i>
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');

  document.getElementById('kpi-pharm-total').textContent = totalItems;
  document.getElementById('kpi-pharm-critical').textContent = criticalCount;
  document.getElementById('kpi-pharm-units').textContent = totalUnits;
  document.getElementById('kpi-pharm-value').textContent = `R$ ${totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;

  // Eventos de Editar e Excluir
  document.querySelectorAll('.btn-edit-pharm').forEach(btn => {
    btn.addEventListener('click', () => {
      const item = currentPharmacyItems.find(i => i.id === btn.dataset.id);
      if (item) openAddPharmModal(item);
    });
  });

  document.querySelectorAll('.btn-del-pharm').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = btn.dataset.id;
      const name = btn.dataset.name;
      const confirmed = await showCustomConfirm({
        title: 'Excluir Medicamento',
        message: `Tem certeza que deseja excluir o medicamento <strong>${name}</strong> do estoque?`,
        confirmText: 'Sim, Excluir',
        type: 'danger'
      });

      if (confirmed) {
        try {
          const res = await apiFetch(`/api/pharmacy/${id}`, { method: 'DELETE' });
          if (res.ok) {
            showToast(`Medicamento "${name}" removido!`);
            loadPharmacyData();
          } else {
            showCustomAlert({ title: 'Erro', message: 'Falha ao remover medicamento.', type: 'danger' });
          }
        } catch (e) {
          showCustomAlert({ title: 'Erro', message: 'Erro de conexão.', type: 'danger' });
        }
      }
    });
  });
}

function openAddPharmModal(itemToEdit = null) {
  const existingModal = document.getElementById('modal-pharm-add-overlay');
  if (existingModal) existingModal.remove();

  const isEdit = !!itemToEdit;
  const modalHtml = `
    <div id="modal-pharm-add-overlay" style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(10, 10, 20, 0.82); backdrop-filter: blur(8px); display: flex; justify-content: center; align-items: center; z-index: 10000; padding: 16px;">
      <div style="background: #1e1c2e; border: 1px solid rgba(236, 72, 153, 0.3); border-radius: 16px; width: 100%; max-width: 560px; box-shadow: 0 20px 50px rgba(0,0,0,0.6); overflow: hidden; animation: fadeInModal 0.25s ease-out;">
        <div style="background: linear-gradient(135deg, #be185d, #ec4899); padding: 18px 24px; display: flex; justify-content: space-between; align-items: center; color: #fff;">
          <h3 style="margin: 0; font-size: 1.15rem; font-weight: 700; display: flex; align-items: center; gap: 10px;">
            <i class="fa-solid ${isEdit ? 'fa-pen-to-square' : 'fa-pills'}"></i> ${isEdit ? 'Editar Medicamento' : 'Cadastrar Novo Medicamento'}
          </h3>
          <button type="button" id="btn-close-pharm-add-modal" style="background: rgba(255,255,255,0.2); border: none; color: #fff; width: 32px; height: 32px; border-radius: 50%; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 1rem; transition: background 0.2s;">
            <i class="fa-solid fa-xmark"></i>
          </button>
        </div>

        <form id="form-add-pharm-item" style="padding: 24px;">
          <div style="display: grid; grid-template-columns: 1fr; gap: 16px;">
            <div>
              <label style="display: block; font-size: 0.85rem; font-weight: 600; color: var(--text-secondary); margin-bottom: 6px;">
                Nome do Medicamento *
              </label>
              <input type="text" id="pharm-input-name" class="form-input" required value="${itemToEdit?.name || ''}" placeholder="Ex: Amoxicilina + Clavulanato" style="width: 100%; box-sizing: border-box;">
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
              <div>
                <label style="display: block; font-size: 0.85rem; font-weight: 600; color: var(--text-secondary); margin-bottom: 6px;">
                  Dosagem
                </label>
                <input type="text" id="pharm-input-dosage" class="form-input" value="${itemToEdit?.dosage || ''}" placeholder="Ex: 500mg + 125mg" style="width: 100%; box-sizing: border-box;">
              </div>
              <div>
                <label style="display: block; font-size: 0.85rem; font-weight: 600; color: var(--text-secondary); margin-bottom: 6px;">
                  Forma / Apresentação
                </label>
                <input type="text" id="pharm-input-form" class="form-input" value="${itemToEdit?.form || ''}" placeholder="Ex: Comprimido, Ampola" style="width: 100%; box-sizing: border-box;">
              </div>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
              <div>
                <label style="display: block; font-size: 0.85rem; font-weight: 600; color: var(--text-secondary); margin-bottom: 6px;">
                  Qtd Atual em Estoque
                </label>
                <input type="number" id="pharm-input-stock" class="form-input" min="0" value="${itemToEdit ? itemToEdit.stockQuantity : 100}" style="width: 100%; box-sizing: border-box;">
              </div>
              <div>
                <label style="display: block; font-size: 0.85rem; font-weight: 600; color: var(--text-secondary); margin-bottom: 6px;">
                  Estoque Mínimo (Alerta)
                </label>
                <input type="number" id="pharm-input-minstock" class="form-input" min="1" value="${itemToEdit ? itemToEdit.minStock : 10}" style="width: 100%; box-sizing: border-box;">
              </div>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
              <div>
                <label style="display: block; font-size: 0.85rem; font-weight: 600; color: var(--text-secondary); margin-bottom: 6px;">
                  Lote
                </label>
                <input type="text" id="pharm-input-lot" class="form-input" value="${itemToEdit?.lotNumber || ''}" placeholder="Ex: L2026C08" style="width: 100%; box-sizing: border-box;">
              </div>
              <div>
                <label style="display: block; font-size: 0.85rem; font-weight: 600; color: var(--text-secondary); margin-bottom: 6px;">
                  Validade
                </label>
                <input type="date" id="pharm-input-exp" class="form-input" value="${itemToEdit?.expirationDate || ''}" style="width: 100%; box-sizing: border-box;">
              </div>
            </div>

            <div>
              <label style="display: block; font-size: 0.85rem; font-weight: 600; color: var(--text-secondary); margin-bottom: 6px;">
                Preço Unitário (R$)
              </label>
              <input type="number" step="0.01" id="pharm-input-price" class="form-input" min="0" value="${itemToEdit?.unitPrice || 0}" placeholder="0.00" style="width: 100%; box-sizing: border-box;">
            </div>
          </div>

          <div style="display: flex; justify-content: flex-end; gap: 12px; margin-top: 24px;">
            <button type="button" id="btn-cancel-pharm-add" class="btn btn-secondary" style="padding: 10px 18px;">
              Cancelar
            </button>
            <button type="submit" class="btn btn-primary" style="background: linear-gradient(135deg, #ec4899, #be185d); border: none; padding: 10px 20px; font-weight: 600;">
              <i class="fa-solid fa-check" style="margin-right: 6px;"></i> ${isEdit ? 'Salvar Alterações' : 'Salvar Medicamento'}
            </button>
          </div>
        </form>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', modalHtml);

  const overlay = document.getElementById('modal-pharm-add-overlay');
  const closeModal = () => overlay?.remove();

  document.getElementById('btn-close-pharm-add-modal')?.addEventListener('click', closeModal);
  document.getElementById('btn-cancel-pharm-add')?.addEventListener('click', closeModal);

  document.getElementById('form-add-pharm-item')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('pharm-input-name').value.trim();
    const dosage = document.getElementById('pharm-input-dosage').value.trim();
    const form = document.getElementById('pharm-input-form').value.trim();
    const stockQuantity = Number(document.getElementById('pharm-input-stock').value || 0);
    const minStock = Number(document.getElementById('pharm-input-minstock').value || 10);
    const lotNumber = document.getElementById('pharm-input-lot').value.trim() || 'L2026';
    const expirationDate = document.getElementById('pharm-input-exp').value || '2027-12-31';
    const unitPrice = Number(document.getElementById('pharm-input-price').value || 0);

    if (!name) {
      showCustomAlert({ title: 'Aviso', message: 'Informe o nome do medicamento.', type: 'warning' });
      return;
    }

    const url = isEdit ? `/api/pharmacy/${itemToEdit.id}` : '/api/pharmacy';
    const method = isEdit ? 'PUT' : 'POST';

    try {
      const res = await apiFetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, dosage, form, stockQuantity, minStock, lotNumber, expirationDate, unitPrice })
      });

      if (res.ok) {
        closeModal();
        showCustomAlert({ title: 'Sucesso', message: `Medicamento "${name}" ${isEdit ? 'atualizado' : 'cadastrado'} com sucesso!`, type: 'success' });
        await loadPharmacyData();
      } else {
        const errData = await res.json();
        showCustomAlert({ title: 'Erro', message: errData.message || 'Falha ao salvar medicamento.', type: 'danger' });
      }
    } catch (err) {
      showCustomAlert({ title: 'Erro', message: 'Erro ao conectar com o servidor.', type: 'danger' });
    }
  });
}

function openDispenseMedModal() {
  const existingModal = document.getElementById('modal-pharm-dispense-overlay');
  if (existingModal) existingModal.remove();

  const options = currentPharmacyItems.map(item => `
    <option value="${item.id}">${item.name} (${item.dosage || 'Sem dosagem'}) - Disponível: ${item.stockQuantity || 0} unds</option>
  `).join('');

  const modalHtml = `
    <div id="modal-pharm-dispense-overlay" style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(10, 10, 20, 0.82); backdrop-filter: blur(8px); display: flex; justify-content: center; align-items: center; z-index: 10000; padding: 16px;">
      <div style="background: #1e1c2e; border: 1px solid rgba(236, 72, 153, 0.3); border-radius: 16px; width: 100%; max-width: 500px; box-shadow: 0 20px 50px rgba(0,0,0,0.6); overflow: hidden; animation: fadeInModal 0.25s ease-out;">
        <div style="background: linear-gradient(135deg, #ec4899, #be185d); padding: 18px 24px; display: flex; justify-content: space-between; align-items: center; color: #fff;">
          <h3 style="margin: 0; font-size: 1.15rem; font-weight: 700; display: flex; align-items: center; gap: 10px;">
            <i class="fa-solid fa-hand-holding-medical"></i> Dispensação de Medicação
          </h3>
          <button type="button" id="btn-close-pharm-disp-modal" style="background: rgba(255,255,255,0.2); border: none; color: #fff; width: 32px; height: 32px; border-radius: 50%; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 1rem; transition: background 0.2s;">
            <i class="fa-solid fa-xmark"></i>
          </button>
        </div>

        <form id="form-dispense-pharm-item" style="padding: 24px;">
          <div style="display: grid; grid-template-columns: 1fr; gap: 16px;">
            <div>
              <label style="display: block; font-size: 0.85rem; font-weight: 600; color: var(--text-secondary); margin-bottom: 6px;">
                Selecione o Medicamento *
              </label>
              <select id="pharm-disp-item-id" class="form-input" style="width: 100%; box-sizing: border-box;" required>
                ${options.length ? options : '<option value="">Nenhum medicamento disponível</option>'}
              </select>
            </div>

            <div>
              <label style="display: block; font-size: 0.85rem; font-weight: 600; color: var(--text-secondary); margin-bottom: 6px;">
                Quantidade a Dispensar *
              </label>
              <input type="number" id="pharm-disp-qty" class="form-input" min="1" value="1" required style="width: 100%; box-sizing: border-box;">
            </div>
          </div>

          <div style="display: flex; justify-content: flex-end; gap: 12px; margin-top: 24px;">
            <button type="button" id="btn-cancel-pharm-disp" class="btn btn-secondary" style="padding: 10px 18px;">
              Cancelar
            </button>
            <button type="submit" class="btn btn-primary" style="background: linear-gradient(135deg, #ec4899, #be185d); border: none; padding: 10px 20px; font-weight: 600;">
              <i class="fa-solid fa-check" style="margin-right: 6px;"></i> Confirmar Baixa
            </button>
          </div>
        </form>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', modalHtml);

  const overlay = document.getElementById('modal-pharm-dispense-overlay');
  const closeModal = () => overlay?.remove();

  document.getElementById('btn-close-pharm-disp-modal')?.addEventListener('click', closeModal);
  document.getElementById('btn-cancel-pharm-disp')?.addEventListener('click', closeModal);

  document.getElementById('form-dispense-pharm-item')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const itemId = document.getElementById('pharm-disp-item-id').value;
    const quantity = Number(document.getElementById('pharm-disp-qty').value || 1);

    if (!itemId) {
      showCustomAlert({ title: 'Aviso', message: 'Selecione um medicamento válido.', type: 'warning' });
      return;
    }

    try {
      const res = await apiFetch('/api/pharmacy/dispense', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemId, quantity })
      });

      if (res.ok) {
        closeModal();
        showCustomAlert({ title: 'Sucesso', message: 'Dispensação realizada com sucesso!', type: 'success' });
        await loadPharmacyData();
      } else {
        const errData = await res.json();
        showCustomAlert({ title: 'Erro', message: errData.message || 'Falha ao dispensar medicação.', type: 'danger' });
      }
    } catch (err) {
      showCustomAlert({ title: 'Erro', message: 'Erro ao conectar com o servidor.', type: 'danger' });
    }
  });
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
            Exibi&#231;&#227;o em tela cheia para TV com chamada sonora e classifica&#231;&#227;o por Manchester.
          </p>
        </div>
        <div style="display: flex; gap: 10px;">
          <button id="btn-tv-call-modal" class="btn btn-primary" style="background: linear-gradient(135deg, #8b5cf6, #7c3aed); border: none;">
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
      const calls = data.data || [];
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

  // Fechar clicando fora
  overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
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
window.saveRoom = saveRoom;
window.deleteRoom = deleteRoom;
window.openRoomModal = openRoomModal;

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

    html += '</tbody></table>';
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
        showToast(' Prescrição médica salva com sucesso!');
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
              showToast(`💉 Medicação ${medName} checada e administrada por ${nurseName}!`);
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
    const res = await apiFetch('/api/beds');
    const beds = await res.json();
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
        showToast(`🛌 Paciente ${patientName} transferido(a) para internação hospitalar!`);
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
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeApp);
} else {
  initializeApp();
}

