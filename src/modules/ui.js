// ==========================================
// Health Nexus — UI & Design System Module
// Modais, Alertas, Toasts, Seleção Customizada e Tema
// ==========================================

import * as localDB from '../localDB.js';
import { state } from '../state.js';

// --- CONTROLE DE TEMA (CLARO/ESCURO) ---
export const initTheme = () => {
  const savedTheme = localStorage.getItem('hn_theme') || 'dark';
  if (savedTheme === 'light') {
    document.body.classList.add('light-theme');
  } else {
    document.body.classList.remove('light-theme');
  }
};

export const toggleTheme = () => {
  const isLight = document.body.classList.toggle('light-theme');
  localStorage.setItem('hn_theme', isLight ? 'light' : 'dark');
  updateThemeIcon();
};

export const updateThemeIcon = () => {
  const icon = document.getElementById('theme-icon');
  if (!icon) return;
  icon.className = 'fa-solid fa-circle-half-stroke';
};

// --- HELPER COMPONENTE DE SELEÇÃO CUSTOMIZADA E PESQUISÁVEL ---
export const createChartGradient = function(ctx, colorHex, alpha1 = 'ff', alpha2 = '11', height = 200) {
  const g = ctx.createLinearGradient(0, 0, 0, height);
  const base = colorHex.length >= 7 ? colorHex.substring(0, 7) : colorHex;
  g.addColorStop(0, base + alpha1);
  g.addColorStop(1, base + alpha2);
  return g;
};
if (typeof window !== 'undefined') window.createChartGradient = createChartGradient;

export const setupCustomSelect = (container, hiddenInput, items, placeholder, onSelect) => {
  if (!container || !hiddenInput) return null;
  
  const sortedItems = [...(items || [])].sort((a, b) => 
    (a.fullName || '').localeCompare(b.fullName || '', 'pt-BR', { sensitivity: 'base' })
  );

  const getLabelHtml = (item) => {
    if (!item) {
      return `<i class="fa-solid fa-user" style="color: var(--color-primary, #0284c7); margin-right: 8px;"></i> <span>${placeholder || 'Selecione...'}</span>`;
    }
    return `<i class="fa-solid fa-user" style="color: var(--color-primary, #0284c7); margin-right: 8px;"></i> <span style="font-weight:600;">${item.fullName}</span> <span style="opacity:0.75; font-size:0.82rem; margin-left:4px;">(CPF: ${item.cpf || 'N/I'})</span>`;
  };

  let selectedItem = sortedItems.find(i => String(i.id) === String(hiddenInput.value)) || null;

  container.innerHTML = `
    <div class="custom-select-trigger" tabindex="0">${getLabelHtml(selectedItem)}</div>
    <div class="custom-select-options-panel">
      <div class="custom-select-search-wrapper" style="display: flex; gap: 8px;">
        <div style="position: relative; flex: 1;">
          <i class="fa-solid fa-magnifying-glass" style="position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: var(--text-muted);"></i>
          <input type="text" class="custom-select-search-input" placeholder="🔍 Digite para filtrar por nome ou CPF..." autocomplete="off" style="width: 100%; padding-left: 36px; padding-right: 8px;">
        </div>
        <button type="button" class="btn btn-clear-search" style="background: var(--bg-tertiary); border: 1px solid var(--border-color); color: var(--text-primary); padding: 0 14px; border-radius: 8px; cursor: pointer; display: flex; align-items: center; justify-content: center;" title="Limpar Filtro">
          <i class="fa-solid fa-filter-circle-xmark"></i>
        </button>
      </div>
      <div class="custom-select-options-list"></div>
    </div>
  `;

  const trigger = container.querySelector('.custom-select-trigger');
  const searchInput = container.querySelector('.custom-select-search-input');
  const listContainer = container.querySelector('.custom-select-options-list');
  const clearBtn = container.querySelector('.btn-clear-search');
  if (clearBtn) {
    clearBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      searchInput.value = '';
      renderList(sortedItems);
      searchInput.focus();
    });
  }

  const toggleHandler = (e) => {
    e.stopPropagation();
    const isOpen = container.classList.contains('open');
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

  const clickOutsideHandler = (e) => {
    if (!container.contains(e.target)) {
      container.classList.remove('open');
    }
  };
  document.removeEventListener('click', clickOutsideHandler);
  document.addEventListener('click', clickOutsideHandler);

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
        
        hiddenInput.dispatchEvent(new Event('input', { bubbles: true }));
        hiddenInput.dispatchEvent(new Event('change', { bubbles: true }));
      });

      listContainer.appendChild(opt);
    });
  };

  renderList(sortedItems);

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

// --- MODAL FLUTUANTE DE ALERTA DO SISTEMA ---
export const showCustomAlert = ({ title = 'Aviso do Sistema', message = '', type = 'info' }) => {
  return new Promise((resolve) => {
    const existing = document.getElementById('hn-custom-alert-modal');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.id = 'hn-custom-alert-modal';
    overlay.className = 'modal-overlay';
    overlay.style.cssText = 'z-index: 999999; display: flex; align-items: center; justify-content: center; background: rgba(0, 0, 0, 0.65); backdrop-filter: blur(8px);';

    let headerBg = 'linear-gradient(135deg, #0284c7, #0369a1)';
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

    document.getElementById('btn-hn-alert-ok')?.addEventListener('click', close);
    document.getElementById('btn-hn-alert-x')?.addEventListener('click', close);
  });
};

// --- MODAL FLUTUANTE DE CONFIRMAÇÃO DO SISTEMA ---
export const showCustomConfirm = ({ title = 'Confirmação Necessária', message = '', confirmText = 'Sim, Confirmar', cancelText = 'Cancelar', type = 'warning' }) => {
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

    document.getElementById('btn-hn-confirm-yes')?.addEventListener('click', () => {
      overlay.remove();
      resolve(true);
    });

    document.getElementById('btn-hn-confirm-no')?.addEventListener('click', () => {
      overlay.remove();
      resolve(false);
    });
  });
};

// --- MODAL FLUTUANTE DE CARREGAMENTO (LOADING) ---
export const showLoadingModal = (message = 'Carregando...') => {
  const existing = document.getElementById('hn-custom-loading-modal');
  if (existing) existing.remove();

  const overlay = document.createElement('div');
  overlay.id = 'hn-custom-loading-modal';
  overlay.className = 'modal-overlay';
  overlay.style.cssText = 'z-index: 999999; display: flex; align-items: center; justify-content: center; background: rgba(0, 0, 0, 0.7); backdrop-filter: blur(8px);';

  overlay.innerHTML = `
    <div class="sync-modal-card" style="max-width: 400px; text-align: center; padding: 32px 24px; display: flex; flex-direction: column; align-items: center; gap: 16px; background: var(--bg-card, #1e293b); border: 1px solid var(--border-color, rgba(255,255,255,0.1)); border-radius: 16px;">
      <div style="width: 46px; height: 46px; border: 4px solid rgba(255,255,255,0.1); border-top-color: #0284c7; border-radius: 50%; animation: spin 1s linear infinite;"></div>
      <h3 style="font-size: 1.1rem; color: var(--text-primary, #f8fafc); font-weight: 600; margin: 0;">${message}</h3>
      <p style="font-size: 0.85rem; color: var(--text-secondary, #94a3b8); margin: 0;">Por favor, aguarde alguns instantes...</p>
    </div>
  `;

  document.body.appendChild(overlay);
};

export const hideLoadingModal = () => {
  const modal = document.getElementById('hn-custom-loading-modal');
  if (modal) modal.remove();
};

// --- NOTIFICAÇÃO TOAST ---
export function showToast(message) {
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
    gap: 12px;
    transform: translateY(20px);
    opacity: 0;
    transition: all var(--transition-normal);
    pointer-events: auto;
  `;

  toast.innerHTML = `<i class="fa-solid fa-circle-check" style="color: var(--color-primary);"></i> <span>${message}</span>`;
  container.appendChild(toast);

  requestAnimationFrame(() => {
    toast.style.transform = 'translateY(0)';
    toast.style.opacity = '1';
  });

  setTimeout(() => {
    toast.style.transform = 'translateY(20px)';
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

// --- HELPER DE JANELAS E MODAIS ARRASTÁVEIS (DRAGGABLE) ---
export function makeDraggable(element, handle = element) {
  if (!element || !handle) return;
  let isDragging = false;
  let startX, startY, initialLeft, initialTop;

  handle.style.cursor = 'grab';

  const onMouseDown = (e) => {
    if (e.button !== 0) return;
    if (e.target.closest('button, input, textarea, select, a, [data-no-drag]')) return;

    isDragging = true;
    handle.style.cursor = 'grabbing';
    startX = e.clientX;
    startY = e.clientY;

    const rect = element.getBoundingClientRect();
    initialLeft = rect.left;
    initialTop = rect.top;

    element.style.position = 'fixed';
    element.style.margin = '0';
    element.style.left = `${initialLeft}px`;
    element.style.top = `${initialTop}px`;
    element.style.transform = 'none';

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
    e.preventDefault();
  };

  const onMouseMove = (e) => {
    if (!isDragging) return;
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;

    let newLeft = initialLeft + dx;
    let newTop = initialTop + dy;

    const maxLeft = window.innerWidth - element.offsetWidth;
    const maxTop = window.innerHeight - element.offsetHeight;
    newLeft = Math.max(0, Math.min(newLeft, Math.max(0, maxLeft)));
    newTop = Math.max(0, Math.min(newTop, Math.max(0, maxTop)));

    element.style.left = `${newLeft}px`;
    element.style.top = `${newTop}px`;
  };

  const onMouseUp = () => {
    if (!isDragging) return;
    isDragging = false;
    handle.style.cursor = 'grab';
    document.removeEventListener('mousemove', onMouseMove);
    document.removeEventListener('mouseup', onMouseUp);
  };

  handle.addEventListener('mousedown', onMouseDown);
}

// Sobrescrever alert global nativo com a UI moderna do Health Nexus
if (typeof window !== 'undefined') {
  window.alert = function(msg) {
    if (!msg) return;
    const isError = String(msg).toLowerCase().includes('erro') || String(msg).includes('❌');
    const isSuccess = String(msg).toLowerCase().includes('sucesso') || String(msg).includes('✅');
    const type = isError ? 'danger' : (isSuccess ? 'success' : 'info');
    const title = isError ? 'Aviso do Sistema' : (isSuccess ? 'Sucesso' : 'Informação');
    showCustomAlert({ title, message: String(msg), type });
  };
}

// --- VERIFICAÇÃO E ALERTA DE ATENDIMENTO DUPLICADO / PENDENTE ---

export function getActiveEncounterForPatient(patientId, patientName, patientCpf) {
  if (typeof window === 'undefined') return null;
  const db = (window.localDB && typeof window.localDB.getFullDB === 'function') 
    ? window.localDB.getFullDB() 
    : {};
  const encounters = db.encounters || [];

  const normPid = String(patientId || '').toLowerCase().trim();
  const normPname = String(patientName || '').toLowerCase().trim();
  const normCpf = String(patientCpf || '').replace(/\D/g, '');

  return encounters.slice().reverse().find(e => {
    const s = String(e.status || '').toLowerCase().trim();
    if (['finalizado', 'alta', 'cancelado'].includes(s)) return false;

    if (normPid && e.patientId && String(e.patientId).toLowerCase().trim() === normPid) return true;
    if (normPname && e.patientName && e.patientName.toLowerCase().trim() === normPname) return true;
    if (normCpf && e.cpf && String(e.cpf).replace(/\D/g, '') === normCpf) return true;

    return false;
  }) || null;
}

export function showActiveEncounterAlertModal({ patientId, patientName, patientCpf, activeEncounter }) {
  return new Promise((resolve) => {
    const enc = activeEncounter || getActiveEncounterForPatient(patientId, patientName, patientCpf);
    if (!enc) {
      resolve({ action: 'proceed_new' });
      return;
    }

    const existing = document.getElementById('hn-active-encounter-modal');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.id = 'hn-active-encounter-modal';
    overlay.className = 'modal-overlay';
    overlay.style.cssText = 'z-index: 999999; display: flex; align-items: center; justify-content: center; background: rgba(0, 0, 0, 0.72); backdrop-filter: blur(8px); padding: 16px;';

    const pName = enc.patientName || patientName || 'Paciente';
    const admTime = new Date(enc.observation_started_at || enc.admitted_at || enc.created_at || Date.now());
    const hoursElapsed = Math.floor((Date.now() - admTime.getTime()) / (1000 * 60 * 60));
    const minsElapsed = Math.floor(((Date.now() - admTime.getTime()) % (1000 * 60 * 60)) / (1000 * 60));
    const durationStr = `${hoursElapsed}h ${String(minsElapsed).padStart(2, '0')}m`;

    const mcMap = {
      'Vermelho': { bg: 'rgba(239,68,68,0.2)', border: '#ef4444', text: '#fca5a5', label: 'Emergência (Vermelho)' },
      'Laranja':  { bg: 'rgba(249,115,22,0.2)', border: '#f97316', text: '#fdba74', label: 'Muito Urgente (Laranja)' },
      'Amarelo':  { bg: 'rgba(234,179,8,0.2)', border: '#eab308', text: '#fde047', label: 'Urgente (Amarelo)' },
      'Verde':    { bg: 'rgba(16,185,129,0.2)', border: '#10b981', text: '#86efac', label: 'Pouco Urgente (Verde)' },
      'Azul':     { bg: 'rgba(59,130,246,0.2)', border: '#3b82f6', text: '#93c5fd', label: 'Não Urgente (Azul)' }
    };
    const mc = mcMap[enc.manchesterColor] || { bg: 'rgba(148,163,184,0.15)', border: '#94a3b8', text: '#cbd5e1', label: enc.manchesterColor || 'Não Classificado' };

    let statusDisplay = 'Em Atendimento';
    let locationDisplay = enc.room || 'Pronto-Socorro';
    const s = String(enc.status || '').toLowerCase();
    if (s.includes('observa')) {
      statusDisplay = 'Em Observação Clínica';
      locationDisplay = enc.room || 'Sala de Observação (PS)';
    } else if (s.includes('triagem')) {
      statusDisplay = 'Aguardando Triagem';
      locationDisplay = 'Sala de Triagem Manchester';
    } else if (s.includes('aguardando')) {
      statusDisplay = 'Aguardando Consulta Médica';
      locationDisplay = enc.room || 'Consultório 01';
    } else if (s.includes('internado')) {
      statusDisplay = 'Internação Ativa';
      locationDisplay = enc.room || 'Enfermaria / Leito';
    }

    overlay.innerHTML = `
      <div class="sync-modal-card" style="max-width: 520px; width: 100%; border-radius: 16px; overflow: hidden; background: var(--bg-secondary, #0f172a); border: 1px solid rgba(245, 158, 11, 0.45); box-shadow: 0 25px 50px -12px rgba(0,0,0,0.7);">
        <div class="sync-header-banner" style="background: linear-gradient(135deg, #f59e0b, #d97706); padding: 18px 24px; display: flex; justify-content: space-between; align-items: center;">
          <h3 style="font-family:'Outfit', sans-serif; font-size: 1.15rem; font-weight: 700; color: #fff; margin: 0; display: flex; align-items: center; gap: 10px;">
            <i class="fa-solid fa-triangle-exclamation" style="font-size: 1.3rem;"></i>
            Atendimento Pendente em Andamento
          </h3>
          <button id="btn-enc-alert-close" style="background: transparent; border: none; color: #fff; font-size: 1.2rem; cursor: pointer; opacity: 0.85; line-height: 1;">
            <i class="fa-solid fa-xmark"></i>
          </button>
        </div>

        <div style="padding: 22px 24px; display: flex; flex-direction: column; gap: 16px;">
          <div style="font-size: 0.92rem; color: var(--text-primary, #f8fafc); line-height: 1.5;">
            O paciente <strong>${pName}</strong> já possui uma passagem ativa no Pronto-Socorro com atendimento pendente de conclusão ou alta médica.
          </div>

          <div style="background: var(--bg-tertiary, #1e293b); border: 1px solid var(--border-color, rgba(255,255,255,0.08)); border-left: 4px solid #f59e0b; border-radius: 12px; padding: 14px 16px; display: flex; flex-direction: column; gap: 10px;">
            <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 6px;">
              <span style="font-size: 0.75rem; color: var(--text-muted, #94a3b8); text-transform: uppercase; font-weight: 700; font-family: monospace;">Ficha: ${enc.id || 'Ativa'}</span>
              <span style="background: ${mc.bg}; border: 1px solid ${mc.border}; color: ${mc.text}; font-size: 0.72rem; font-weight: 800; padding: 2px 10px; border-radius: 10px;">
                ${mc.label}
              </span>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; font-size: 0.84rem;">
              <div>
                <span style="font-size: 0.72rem; color: var(--text-muted, #94a3b8); display: block;">Localização Atual:</span>
                <strong style="color: #38bdf8;"><i class="fa-solid fa-location-dot" style="margin-right: 4px;"></i>${locationDisplay}</strong>
              </div>
              <div>
                <span style="font-size: 0.72rem; color: var(--text-muted, #94a3b8); display: block;">Status do Fluxo:</span>
                <strong style="color: #fbbf24;">${statusDisplay}</strong>
              </div>
              <div>
                <span style="font-size: 0.72rem; color: var(--text-muted, #94a3b8); display: block;">Entrada / Início:</span>
                <span style="color: var(--text-secondary, #cbd5e1); font-weight: 600;">${admTime.toLocaleDateString('pt-BR')} às ${admTime.toLocaleTimeString('pt-BR').slice(0,5)}</span>
              </div>
              <div>
                <span style="font-size: 0.72rem; color: var(--text-muted, #94a3b8); display: block;">Tempo de Permanência:</span>
                <span style="color: #f87171; font-weight: 800; font-family: monospace;">${durationStr}</span>
              </div>
            </div>
          </div>

          <div style="font-size: 0.8rem; color: var(--text-muted, #94a3b8); line-height: 1.4; background: rgba(56, 189, 248, 0.08); border: 1px solid rgba(56, 189, 248, 0.2); border-radius: 8px; padding: 10px 12px;">
            <i class="fa-solid fa-circle-info" style="color: #38bdf8; margin-right: 6px;"></i>
            Para garantir a segurança do paciente e evitar cards duplicados na Sala de Observação e no Kanban, escolha uma das ações recomendadas:
          </div>

          <div style="display: flex; flex-direction: column; gap: 10px; margin-top: 4px;">
            <button id="btn-enc-alert-view" class="btn btn-primary" style="padding: 12px; font-size: 0.88rem; font-weight: 700; border-radius: 10px; display: flex; align-items: center; justify-content: center; gap: 8px; background: linear-gradient(135deg, #0284c7, #0369a1); border: none; cursor: pointer; color: #fff; box-shadow: 0 4px 14px rgba(2,132,199,0.35);">
              <i class="fa-solid fa-arrow-right-to-bracket"></i> Visualizar Atendimento em Andamento
            </button>

            <button id="btn-enc-alert-new" class="btn" style="padding: 11px; font-size: 0.84rem; font-weight: 600; border-radius: 10px; display: flex; align-items: center; justify-content: center; gap: 8px; background: rgba(245, 158, 11, 0.15); border: 1px solid rgba(245, 158, 11, 0.4); color: #fbbf24; cursor: pointer;">
              <i class="fa-solid fa-rotate"></i> Encerrar Anterior e Abrir Novo Atendimento
            </button>

            <button id="btn-enc-alert-cancel" class="btn" style="padding: 10px; font-size: 0.82rem; border-radius: 10px; background: var(--bg-tertiary, #1e293b); border: 1px solid var(--border-color, rgba(255,255,255,0.1)); color: var(--text-muted, #94a3b8); cursor: pointer;">
              Cancelar Admissão
            </button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    const close = () => {
      overlay.remove();
    };

    document.getElementById('btn-enc-alert-close')?.addEventListener('click', () => {
      close();
      resolve({ action: 'cancel' });
    });

    document.getElementById('btn-enc-alert-cancel')?.addEventListener('click', () => {
      close();
      resolve({ action: 'cancel' });
    });

    document.getElementById('btn-enc-alert-view')?.addEventListener('click', () => {
      close();
      if (typeof window.setActivePatientContext === 'function') {
        window.setActivePatientContext({
          id: enc.patientId || enc.id,
          encounterId: enc.id,
          fullName: pName,
          patientName: pName,
          status: enc.status,
          room: locationDisplay,
          manchesterColor: enc.manchesterColor || null
        });
      }

      if (s.includes('observa')) {
        showToast(`🛏️ Conduzindo para a Sala de Observação do paciente ${pName}!`);
        if (typeof window.switchTab === 'function') window.switchTab('observacao');
      } else if (s.includes('internado') || (enc.room && (enc.room.toLowerCase().includes('leito') || enc.room.toLowerCase().includes('uti')))) {
        showToast(`🛏️ Conduzindo para o Mapa de Leitos do paciente ${pName}!`);
        if (typeof window.switchTab === 'function') window.switchTab('leitos');
      } else {
        showToast(`📋 Conduzindo para a Central de Atendimento do paciente ${pName}!`);
        if (typeof window.switchTab === 'function') window.switchTab('atendimento');
      }
      resolve({ action: 'view', encounter: enc });
    });

    document.getElementById('btn-enc-alert-new')?.addEventListener('click', () => {
      close();
      if (window.localDB && typeof window.localDB.update === 'function') {
        try {
          window.localDB.update('encounters', enc.id, {
            ...enc,
            status: 'Finalizado',
            dischargeType: 'Novo Atendimento Iniciado pela Recepção',
            completed_at: new Date().toISOString(),
            lastStatusUpdate: new Date().toISOString()
          });
          showToast(`⚠️ Atendimento anterior finalizado com sucesso.`);
        } catch(e) {
          console.warn('Erro ao finalizar encounter anterior:', e);
        }
      }
      resolve({ action: 'proceed_new', encounter: enc });
    });
  });
}

// --- MODAL DE ALERTA DE PEP PENDENTE DE FINALIZAÇÃO / EM ANDAMENTO ---

export function showPendingPEPAlertModal({ patientName, pendingEncounter }) {
  return new Promise((resolve) => {
    if (!pendingEncounter) {
      resolve({ action: 'create_new' });
      return;
    }

    const existing = document.getElementById('hn-pending-pep-modal');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.id = 'hn-pending-pep-modal';
    overlay.className = 'modal-overlay';
    overlay.style.cssText = 'z-index: 1000000; display: flex; align-items: center; justify-content: center; background: rgba(0, 0, 0, 0.78); backdrop-filter: blur(10px); padding: 16px;';

    const pName = pendingEncounter.patientName || patientName || 'Paciente';
    const sector = pendingEncounter.sector || pendingEncounter.room || 'Consultório / Atendimento';
    const docName = pendingEncounter.doctorName || pendingEncounter.signed_by || 'Médico Assistente';
    
    const entryDate = pendingEncounter.updated_at || pendingEncounter.created_at || Date.now();
    const d = new Date(entryDate);
    const dateStr = d.toLocaleDateString('pt-BR') + ' às ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

    const subj = pendingEncounter.subjectiveContent ? (pendingEncounter.subjectiveContent.substring(0, 110) + (pendingEncounter.subjectiveContent.length > 110 ? '...' : '')) : null;
    const cid = pendingEncounter.assessmentContent || null;

    overlay.innerHTML = `
      <div class="sync-modal-card" style="max-width: 530px; width: 100%; border-radius: 18px; overflow: hidden; background: #111124; border: 1.5px solid rgba(245, 158, 11, 0.5); box-shadow: 0 25px 70px rgba(0,0,0,0.9), 0 0 30px rgba(245, 158, 11, 0.2);">
        <div style="background: linear-gradient(135deg, #d97706, #b45309); padding: 18px 24px; display: flex; justify-content: space-between; align-items: center;">
          <h3 style="font-family:'Outfit', sans-serif; font-size: 1.15rem; font-weight: 700; color: #fff; margin: 0; display: flex; align-items: center; gap: 10px;">
            <i class="fa-solid fa-triangle-exclamation" style="font-size: 1.25rem;"></i>
            PEP Pendente de Finalização
          </h3>
          <button id="btn-pep-pending-alert-close" style="background: rgba(255,255,255,0.15); border: 1px solid rgba(255,255,255,0.25); color: #fff; width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: 0.2s;" title="Fechar">
            <i class="fa-solid fa-xmark"></i>
          </button>
        </div>

        <div style="padding: 22px 24px; display: flex; flex-direction: column; gap: 15px;">
          <div style="font-size: 0.92rem; color: #f8fafc; line-height: 1.5;">
            O paciente <strong>${pName}</strong> já possui uma evolução médica em andamento (Rascunho não finalizado).
          </div>

          <div style="background: rgba(245, 158, 11, 0.08); border: 1.5px solid rgba(245, 158, 11, 0.35); border-left: 4px solid #f59e0b; border-radius: 12px; padding: 14px 16px; display: flex; flex-direction: column; gap: 8px;">
            <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 6px;">
              <span style="font-size: 0.74rem; color: #cbd5e1; text-transform: uppercase; font-weight: 700; font-family: monospace;">Ficha: ${pendingEncounter.id || 'Ativa'}</span>
              <span style="background: rgba(245, 158, 11, 0.2); border: 1px solid #f59e0b; color: #fbbf24; font-size: 0.72rem; font-weight: 800; padding: 2px 10px; border-radius: 10px;">
                🟡 Rascunho / Em Andamento
              </span>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-size: 0.82rem; margin-top: 4px;">
              <div>
                <span style="font-size: 0.72rem; color: #94a3b8; display: block;">Local / Setor:</span>
                <strong style="color: #38bdf8;"><i class="fa-solid fa-location-dot" style="margin-right: 4px;"></i>${sector}</strong>
              </div>
              <div>
                <span style="font-size: 0.72rem; color: #94a3b8; display: block;">Profissional:</span>
                <strong style="color: #c4b5fd;"><i class="fa-solid fa-user-doctor" style="margin-right: 4px;"></i>${docName}</strong>
              </div>
              <div style="grid-column: span 2;">
                <span style="font-size: 0.72rem; color: #94a3b8; display: block;">Última Atualização:</span>
                <span style="color: #e2e8f0; font-weight: 600;"><i class="fa-regular fa-clock" style="margin-right: 4px;"></i>${dateStr}</span>
              </div>
            </div>

            ${cid ? `
              <div style="font-size: 0.78rem; color: #cbd5e1; background: rgba(255,255,255,0.04); padding: 6px 10px; border-radius: 6px; margin-top: 4px;">
                <strong style="color: #38bdf8;">Hipótese / CID-10:</strong> ${cid}
              </div>
            ` : ''}
            ${subj ? `
              <div style="font-size: 0.76rem; color: #94a3b8; background: rgba(255,255,255,0.03); padding: 6px 10px; border-radius: 6px;">
                <strong style="color: #a78bfa;">Queixa / Subjetivo:</strong> ${subj}
              </div>
            ` : ''}
          </div>

          <div style="font-size: 0.82rem; color: #94a3b8; line-height: 1.45; background: rgba(56, 189, 248, 0.08); border: 1px solid rgba(56, 189, 248, 0.2); border-radius: 10px; padding: 10px 14px;">
            <i class="fa-solid fa-circle-info" style="color: #38bdf8; margin-right: 6px;"></i>
            Para preservar a integridade do prontuário, você pode continuar editando o rascunho existente até a sua assinatura ou iniciar uma nova folha avulsa se for um novo atendimento.
          </div>

          <div style="display: flex; flex-direction: column; gap: 10px; margin-top: 4px;">
            <button id="btn-pep-pending-continue" class="btn btn-primary" style="padding: 12px; font-size: 0.88rem; font-weight: 700; border-radius: 10px; display: flex; align-items: center; justify-content: center; gap: 8px; background: linear-gradient(135deg, #0284c7, #0369a1); border: none; cursor: pointer; color: #fff; box-shadow: 0 4px 14px rgba(2,132,199,0.35);">
              <i class="fa-solid fa-pen-to-square"></i> Continuar Editando PEP Existente
            </button>

            <button id="btn-pep-pending-new" class="btn" style="padding: 11px; font-size: 0.84rem; font-weight: 600; border-radius: 10px; display: flex; align-items: center; justify-content: center; gap: 8px; background: rgba(245, 158, 11, 0.15); border: 1px solid rgba(245, 158, 11, 0.4); color: #fbbf24; cursor: pointer;">
              <i class="fa-solid fa-file-circle-plus"></i> Abrir Nova Folha de Evolução Mesmo Assim
            </button>

            <button id="btn-pep-pending-cancel" class="btn" style="padding: 10px; font-size: 0.82rem; border-radius: 10px; background: var(--bg-tertiary, #1e293b); border: 1px solid var(--border-color, rgba(255,255,255,0.1)); color: var(--text-muted, #94a3b8); cursor: pointer;">
              Cancelar
            </button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    const close = () => {
      overlay.remove();
    };

    document.getElementById('btn-pep-pending-alert-close')?.addEventListener('click', () => {
      close();
      resolve({ action: 'cancel' });
    });

    document.getElementById('btn-pep-pending-cancel')?.addEventListener('click', () => {
      close();
      resolve({ action: 'cancel' });
    });

    document.getElementById('btn-pep-pending-continue')?.addEventListener('click', () => {
      close();
      resolve({ action: 'continue_existing', encounterId: pendingEncounter.id });
    });

    document.getElementById('btn-pep-pending-new')?.addEventListener('click', () => {
      close();
      resolve({ action: 'create_new', encounterId: pendingEncounter.id });
    });
  });
}

if (typeof window !== 'undefined') {
  window.getActiveEncounterForPatient = getActiveEncounterForPatient;
  window.showActiveEncounterAlertModal = showActiveEncounterAlertModal;
  window.showPendingPEPAlertModal = showPendingPEPAlertModal;
}


