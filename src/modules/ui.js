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
export const createChartGradient = function(canvasOrCtx, colorHex, alpha1 = 'ff', alpha2 = '11', height = 200) {
  if (!canvasOrCtx) return colorHex;
  const ctx = (typeof canvasOrCtx.getContext === 'function') ? canvasOrCtx.getContext('2d') : canvasOrCtx;
  if (!ctx || typeof ctx.createLinearGradient !== 'function') return colorHex;
  try {
    const g = ctx.createLinearGradient(0, 0, 0, height);
    const base = colorHex.length >= 7 ? colorHex.substring(0, 7) : colorHex;
    g.addColorStop(0, base + alpha1);
    g.addColorStop(1, base + alpha2);
    return g;
  } catch(e) {
    return colorHex;
  }
};
if (typeof window !== 'undefined') window.createChartGradient = createChartGradient;

export const setupCustomSelect = (container, hiddenInput, items, placeholder, onSelect) => {
  if (!container || !hiddenInput) return null;
  
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
      <div style="width: 46px; height: 46px; border: 4px solid rgba(255,255,255,0.1); border-top-color: #6366f1; border-radius: 50%; animation: spin 1s linear infinite;"></div>
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

// ==========================================================================
// SISTEMA DE DRAG & DROP UNIVERSAL PARA MODAIS E JANELAS FLUTUANTES (v2.8.0)
// ==========================================================================
export const makeDraggable = (element, handle = null) => {
  if (!element) return;
  
  const dragHandle = handle || 
    element.querySelector('.modal-header, .sync-header-banner, .tab-header-banner, .modal-top-bar, .modal-title-bar, .sync-header') || 
    element.firstElementChild || 
    element;

  if (!dragHandle || dragHandle.dataset.draggableInitialized === 'true') return;
  dragHandle.dataset.draggableInitialized = 'true';

  dragHandle.style.cursor = 'grab';
  dragHandle.style.userSelect = 'none';

  let isDragging = false;
  let startMouseX = 0;
  let startMouseY = 0;
  let startElemX = 0;
  let startElemY = 0;

  const getElementPos = () => {
    const style = window.getComputedStyle(element);
    try {
      const matrix = window.DOMMatrixReadOnly ? new DOMMatrixReadOnly(style.transform) : new WebKitCSSMatrix(style.transform);
      return {
        x: matrix.m41 || 0,
        y: matrix.m42 || 0
      };
    } catch {
      return { x: 0, y: 0 };
    }
  };

  const startDrag = (clientX, clientY, target) => {
    if (target.closest('button, input, select, textarea, a, .modal-close, [data-no-drag]')) {
      return;
    }

    isDragging = true;
    startMouseX = clientX;
    startMouseY = clientY;

    const pos = getElementPos();
    startElemX = pos.x;
    startElemY = pos.y;

    dragHandle.style.cursor = 'grabbing';
    document.body.style.userSelect = 'none';
  };

  const moveDrag = (clientX, clientY) => {
    if (!isDragging) return;
    const deltaX = clientX - startMouseX;
    const deltaY = clientY - startMouseY;

    const newX = startElemX + deltaX;
    const newY = startElemY + deltaY;

    element.style.transform = `translate(${newX}px, ${newY}px)`;
    element.style.transition = 'none';
  };

  const endDrag = () => {
    if (!isDragging) return;
    isDragging = false;
    dragHandle.style.cursor = 'grab';
    document.body.style.userSelect = '';
    element.style.transition = '';
  };

  dragHandle.addEventListener('mousedown', (e) => {
    startDrag(e.clientX, e.clientY, e.target);
  });

  window.addEventListener('mousemove', (e) => {
    if (isDragging) {
      e.preventDefault();
      moveDrag(e.clientX, e.clientY);
    }
  });

  window.addEventListener('mouseup', () => {
    endDrag();
  });

  dragHandle.addEventListener('touchstart', (e) => {
    if (e.touches && e.touches.length === 1) {
      startDrag(e.touches[0].clientX, e.touches[0].clientY, e.target);
    }
  }, { passive: true });

  window.addEventListener('touchmove', (e) => {
    if (isDragging && e.touches && e.touches.length === 1) {
      moveDrag(e.touches[0].clientX, e.touches[0].clientY);
    }
  }, { passive: true });

  window.addEventListener('touchend', () => {
    endDrag();
  });
};

// Auto-draggable Observer para novos modais no DOM
export const initDraggableModalsObserver = () => {
  if (typeof window === 'undefined' || !window.MutationObserver) return;

  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (node.nodeType === 1) {
          if (node.classList?.contains('modal-overlay') || node.id?.includes('modal') || node.id?.includes('overlay')) {
            const card = node.querySelector('.sync-modal-card, .modal-card, .glass-card, [style*="border-radius"]') || node.firstElementChild;
            if (card) {
              const header = card.querySelector('div:first-child, .modal-header, .sync-header-banner');
              makeDraggable(card, header);
            }
          }
        }
      }
    }
  });

  observer.observe(document.body, { childList: true, subtree: true });
};

if (typeof window !== 'undefined') {
  window.makeDraggable = makeDraggable;
  initDraggableModalsObserver();
}

