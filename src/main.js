
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
import './tabs/kanban.js';
import { renderSchedulesTab } from './tabs/escalas.js';
import { renderDashboardTab, fetchDashboardData, initDashboardCharts, initInteractiveFunnel } from './tabs/dashboard.js';
import { renderPatientsTab } from './tabs/patients.js';
import { renderAttendanceTab } from './tabs/attendance.js';
import { renderSettingsTab } from './tabs/settings.js';
import { realtimeHub } from './modules/realtime.js';
import { setActivePatientContext, renderPatientJourneyStepper, renderFloatingPatientHUD } from './modules/journey.js';
import { generateMockData } from './mockDataGenerator.js';
import { renderEmbeddedTabbedManual, showInteractiveManualModal, manualData, showCardDetailModal, searchManualEngine, showManualReturnBeacon } from './manualTabbed.js';
import { getNexusAICopilotResponse } from './aiCopilot.js';
import { inject } from '@vercel/analytics';

window.setActivePatientContext = setActivePatientContext;
window.renderPatientJourneyStepper = renderPatientJourneyStepper;
window.renderFloatingPatientHUD = renderFloatingPatientHUD;

// Inicia o Vercel Analytics
inject();

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
// --- IMPORTAÇÃO & REEXPORTAÇÃO DOS MÓDULOS DESACOPLADOS ---
import {
  API_URL, removeAccents, abbreviateName, anonymizeCPF, invalidateCacheForUrl, cachedApiGet, apiFetch
} from './modules/api.js';

import {
  initTheme, toggleTheme, updateThemeIcon, createChartGradient, setupCustomSelect,
  showCustomAlert, showCustomConfirm, showLoadingModal, hideLoadingModal, showToast
} from './modules/ui.js';

import {
  formatSyncDate, parseIsoOrSpaceTimestamp, getMaxTimestamp, showSyncPromptModal,
  showSyncComparisonModal, SyncManager, syncManager, getSyncStatus,
  requestSyncPromptIfConfigured, updateSyncBadge, checkInitialSync
} from './modules/sync.js';

import {
  getRolePermissions, showUserSessionsHistory, showUserManagementModal, showUserFormModal
} from './modules/auth.js';

export {
  API_URL, removeAccents, abbreviateName, anonymizeCPF, invalidateCacheForUrl, cachedApiGet, apiFetch,
  initTheme, toggleTheme, updateThemeIcon, createChartGradient, setupCustomSelect,
  showCustomAlert, showCustomConfirm, showLoadingModal, hideLoadingModal, showToast,
  formatSyncDate, parseIsoOrSpaceTimestamp, getMaxTimestamp, showSyncPromptModal,
  showSyncComparisonModal, SyncManager, syncManager, getSyncStatus,
  requestSyncPromptIfConfigured, updateSyncBadge, checkInitialSync,
  getRolePermissions, showUserSessionsHistory, showUserManagementModal, showUserFormModal
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
              if (cloudMax.time > localMax.time) {
                showSyncComparisonModal(state.syncInfo);
              } else if (localMax.time > cloudMax.time) {
                showSyncPromptModal(state.syncInfo);
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
      
    } else {
      logout();
    }
  } else {
    clearTimeout(loaderSafetyTimer);
    renderAuthScreen();
  }
};

const logout = () => {
  const sessionId = sessionStorage.getItem('hn_session_id');
  if (sessionId) {
    const sessionRec = localDB.get('user_sessions', sessionId);
    if (sessionRec) {
      const logoutTime = new Date();
      const loginTime = new Date(sessionRec.login_time);
      const durationMinutes = Math.round((logoutTime - loginTime) / 60000);
      localDB.update('user_sessions', sessionId, {
        logout_time: logoutTime.toISOString(),
        duration_minutes: durationMinutes
      });
    }
  }
  sessionStorage.removeItem('hn_session_id');
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

export function showFlowCompletionNotification(options = {}) {
  const {
    actionTitle = 'Próxima Etapa do Atendimento',
    message = 'Ação registrada com sucesso no sistema.',
    targetTab = null,
    targetTabLabel = null,
    targetColumn = null,
    targetPatientName = null,
    targetPatientId = null,
    targetPatientCpf = null,
    actionType = null,
    autoSwitch = false,
    persistent = false
  } = options;

  let container = document.getElementById('hn-flow-notifications-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'hn-flow-notifications-container';
    container.style.cssText = `
      position: fixed;
      top: 76px;
      right: 24px;
      display: flex;
      flex-direction: column;
      gap: 14px;
      z-index: 1000000;
      pointer-events: none;
      width: 420px;
      max-width: 92vw;
    `;
    document.body.appendChild(container);
  }

  const tabLabelsMap = {
    dashboard:     'Visão Geral (Health Nexus)',
    pacientes:     'Recepção & Pacientes',
    medicos:        'Corpo Clínico & Médicos',
    consultorios:  'Salas & Consultórios',
    farmacia:      'Farmácia & Estoque',
    tv_panel:      'Painel TV (Chamador)',
    agenda:        'Agenda & Consultas',
    atendimento:   'Central de Atendimentos',
    estagnacao:    'Alertas & Estagnação',
    leitos:        'Gestão de Leitos & Internação',
    kanban:        'Kanban Hospitalar',
    financeiro:    'Faturamento & Financeiro',
    relatorios:    'Relatórios & Métricas',
    configuracoes: 'Configurações & Turso DB'
  };

  const finalDestinationLabel = targetTabLabel || (targetTab ? tabLabelsMap[targetTab] : null);

  const card = document.createElement('div');
  if (targetTab) {
    card.setAttribute('data-flow-target-tab', targetTab);
  }
  card.style.cssText = `
    background: linear-gradient(135deg, rgba(15, 23, 42, 0.98), rgba(30, 41, 59, 0.99));
    backdrop-filter: blur(24px);
    -webkit-backdrop-filter: blur(24px);
    color: #f8fafc;
    border: 1.5px solid rgba(16, 185, 129, 0.6);
    border-left: 6px solid #10b981;
    padding: 16px 18px;
    border-radius: 16px;
    font-family: 'Outfit', system-ui, -apple-system, sans-serif;
    box-shadow: 0 20px 50px rgba(0, 0, 0, 0.75), 0 0 30px rgba(16, 185, 129, 0.35);
    pointer-events: auto;
    transform: translateX(120%);
    opacity: 0;
    transition: all 0.38s cubic-bezier(0.16, 1, 0.3, 1);
    display: flex;
    flex-direction: column;
    gap: 10px;
    position: relative;
  `;

  card.innerHTML = `
    <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px;">
      <span style="background: rgba(16, 185, 129, 0.15); color: #34d399; font-size: 0.68rem; font-weight: 800; padding: 3px 9px; border-radius: 12px; border: 1px solid rgba(16, 185, 129, 0.35); text-transform: uppercase; letter-spacing: 0.5px; display: inline-flex; align-items: center; gap: 5px;">
        <i class="fa-solid fa-route" style="color: #38bdf8;"></i> Sequência do Fluxo &bull; Próximo Passo
      </span>
      <button class="flow-toast-close" title="Fechar notificação" style="background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1); color: #94a3b8; cursor: pointer; font-size: 0.85rem; padding: 3px 8px; border-radius: 6px; transition: all 0.2s;" onmouseover="this.style.color='#fff'; this.style.background='rgba(239,68,68,0.25)'" onmouseout="this.style.color='#94a3b8'; this.style.background='rgba(255,255,255,0.06)'">
        <i class="fa-solid fa-xmark"></i>
      </button>
    </div>

    <div style="display: flex; align-items: flex-start; gap: 12px;">
      <div style="width: 36px; height: 36px; border-radius: 10px; background: rgba(16, 185, 129, 0.2); border: 1px solid rgba(16, 185, 129, 0.4); display: flex; align-items: center; justify-content: center; flex-shrink: 0; margin-top: 2px;">
        <i class="fa-solid fa-bullhorn" style="font-size: 1.1rem; color: #10b981;"></i>
      </div>
      <div style="flex: 1; min-width: 0;">
        <strong style="color: #ffffff; font-size: 0.95rem; display: block; font-weight: 700; margin-bottom: 2px;">
          ${actionTitle}
        </strong>
        <p style="color: #cbd5e1; font-size: 0.85rem; margin: 0; line-height: 1.4;">
          ${message}
        </p>
      </div>
    </div>

    ${finalDestinationLabel ? `
      <div style="background: rgba(99, 102, 241, 0.12); border: 1px solid rgba(99, 102, 241, 0.3); border-radius: 12px; padding: 10px 14px; margin-top: 2px; display: flex; align-items: center; justify-content: space-between; gap: 10px; flex-wrap: wrap;">
        <span style="font-size: 0.8rem; color: #a5b4fc; font-weight: 600; display: flex; align-items: center; gap: 6px;">
          <i class="fa-solid fa-location-dot" style="color: #38bdf8; font-size: 0.9rem;"></i>
          Destino: <strong style="color: #ffffff; font-weight: 800;">${finalDestinationLabel}</strong>
        </span>
        ${targetTab ? `
          <button class="btn-goto-flow-tab" style="
            background: linear-gradient(135deg, #10b981, #059669); color: #ffffff; border: none;
            padding: 8px 16px; border-radius: 8px; font-size: 0.8rem; font-weight: 800;
            cursor: pointer; transition: all 0.2s; display: inline-flex; align-items: center; gap: 6px;
            box-shadow: 0 4px 16px rgba(16, 185, 129, 0.45); text-transform: uppercase; letter-spacing: 0.3px;
          " onmouseover="this.style.transform='scale(1.05)'; this.style.background='#047857';" onmouseout="this.style.transform='scale(1)'; this.style.background='linear-gradient(135deg, #10b981, #059669)';">
            Ir para a Aba <i class="fa-solid fa-chevron-right" style="font-size: 0.75rem;"></i>
          </button>
        ` : ''}
      </div>
    ` : ''}
  `;

  container.appendChild(card);

  setTimeout(() => {
    card.style.transform = 'translateX(0)';
    card.style.opacity = '1';
  }, 20);

  const closeBtn = card.querySelector('.flow-toast-close');
  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      card.style.transform = 'translateX(120%)';
      card.style.opacity = '0';
      setTimeout(() => card.remove(), 300);
    });
  }

  const gotoBtn = card.querySelector('.btn-goto-flow-tab');
  if (gotoBtn && targetTab) {
    gotoBtn.addEventListener('click', () => {
      // 1. Fecha o card imediatamente
      card.style.transform = 'translateX(120%)';
      card.style.opacity = '0';
      setTimeout(() => card.remove(), 300);

      // Se for ação de admitir paciente na Central de Atendimentos
      if (actionType === 'admit_patient' || (targetTab === 'atendimento' && targetPatientId)) {
        if (typeof window.admitPatientFromPatientsTab === 'function') {
          window.admitPatientFromPatientsTab(targetPatientId, targetPatientName, targetPatientCpf);
          return;
        }
      }

      // 2. Muda para a aba de destino
      if (typeof switchTab === 'function') {
        switchTab(targetTab);
      }

      // 3. Procura o card do paciente pelo nome ou pela coluna e aplica a animação de pré-seleção pulsante
      const highlightTarget = () => {
        let targetEl = null;

        if (targetPatientName) {
          const cleanName = targetPatientName.trim().toLowerCase();
          
          // Tenta 1: por atributo exato data-patient-card-name (criado especialmente para os cards Kanban)
          targetEl = document.querySelector(`[data-patient-card-name*="${cleanName.replace(/"/g, '')}"]`);
          
          // Tenta 2: por texto direto nos elementos de card do contêiner ativo
          if (!targetEl) {
            const candidateCards = Array.from(document.querySelectorAll('#main-content .tab-section.active .patient-card-item, #main-content .tab-section.active .interactive-card, #main-content .tab-section.active .kanban-column > div, #main-content .tab-section.active tr'));
            targetEl = candidateCards.find(el => (el.textContent || '').toLowerCase().includes(cleanName));
          }

          // Tenta 3: fallback para qualquer elemento dentro da seção ativa contendo o nome (limite de filhos p/ não pegar o board todo)
          if (!targetEl) {
            const allElements = Array.from(document.querySelectorAll('#main-content .tab-section.active div'));
            targetEl = allElements.find(el => {
              const txt = (el.textContent || '').toLowerCase();
              return txt.includes(cleanName) && el.children.length > 0 && el.children.length <= 15;
            });
          }
        }

        if (!targetEl && targetColumn) {
          targetEl = document.getElementById(targetColumn) || (document.querySelector(`[data-enc-id="${targetColumn}"]`)?.closest('.kanban-column') || document.querySelector('.kanban-column'));
        }

        if (targetEl) {
          targetEl.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
          targetEl.classList.add('patient-pulse-selected');
          
          // Aplica estilos inline diretamente para garantir animação visível mesmo se o CSS principal demorar ou falhar
          targetEl.style.animation = 'patientCardPulse 1.2s infinite ease-in-out';
          targetEl.style.border = '2px solid #10b981';
          targetEl.style.boxShadow = '0 0 35px rgba(16, 185, 129, 0.95), inset 0 0 15px rgba(16, 185, 129, 0.3)';

          setTimeout(() => {
            targetEl.classList.remove('patient-pulse-selected');
            targetEl.style.animation = '';
            targetEl.style.border = '';
            targetEl.style.boxShadow = '';
          }, 5000);
          return true;
        }
        return false;
      };

      // Tenta destacar com polling caso a rede demore para carregar a aba alvo (ex: Kanban)
      const attempts = [50, 200, 500, 1000, 1500, 2500, 3500];
      let attemptIndex = 0;
      
      const tryHighlight = () => {
        if (!highlightTarget() && attemptIndex < attempts.length) {
          setTimeout(tryHighlight, attempts[attemptIndex++]);
        }
      };
      tryHighlight();
    });
  }

  if (autoSwitch && targetTab && typeof switchTab === 'function') {
    setTimeout(() => {
      switchTab(targetTab);
    }, 1200);
  }

  // Se NÃO for persistente e NÃO tiver uma aba de destino, remove automaticamente após 8 segundos
  if (!persistent && !targetTab) {
    setTimeout(() => {
      if (card.parentNode) {
        card.style.transform = 'translateX(120%)';
        card.style.opacity = '0';
        setTimeout(() => card.remove(), 300);
      }
    }, 8000);
  }
}

if (typeof window !== 'undefined') {
  window.showFlowCompletionNotification = showFlowCompletionNotification;
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

// --- MODAL DE AUTENTICAÇÃO DO GOOGLE DRIVE (PADRÃO VISUAL DO SISTEMA) ---
function showGoogleDriveAuthModal(defaultEmail = 'usuario.hospitalar@gmail.com') {
  return new Promise((resolve) => {
    const existing = document.getElementById('gdrive-auth-modal');
    if (existing) existing.remove();

    const modal = document.createElement('div');
    modal.id = 'gdrive-auth-modal';
    modal.className = 'modal-overlay';
    modal.style.cssText = 'position:fixed;top:0;left:0;width:100vw;height:100vh;background:rgba(10,8,22,0.8);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);display:flex;align-items:center;justify-content:center;z-index:999999;animation:fadeIn 0.25s ease-out;';

    modal.innerHTML = `
      <div style="background: linear-gradient(145deg, #1e293b 0%, #0f172a 100%); border: 1.5px solid rgba(56, 189, 248, 0.4); border-radius: 24px; width: 90%; max-width: 480px; padding: 28px; box-shadow: 0 25px 60px rgba(0,0,0,0.7), 0 0 50px rgba(14, 165, 233, 0.2); color: #e2e8f0; font-family: 'Inter', sans-serif; position: relative;">
        <!-- Botão Fechar -->
        <button id="close-gdrive-modal" type="button" style="position: absolute; top: 18px; right: 18px; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); color: #94a3b8; width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 1rem; cursor: pointer; transition: all 0.2s;" onmouseenter="this.style.color='#fff'; this.style.background='rgba(255,255,255,0.15)'" onmouseleave="this.style.color='#94a3b8'; this.style.background='rgba(255,255,255,0.05)'">
          <i class="fa-solid fa-xmark"></i>
        </button>

        <!-- Cabeçalho com Ícone do Google Drive -->
        <div style="display: flex; align-items: center; gap: 14px; margin-bottom: 20px;">
          <div style="width: 52px; height: 52px; border-radius: 16px; background: rgba(2, 132, 199, 0.15); border: 1.5px solid rgba(56, 189, 248, 0.5); display: flex; align-items: center; justify-content: center; color: #38bdf8; font-size: 1.6rem; box-shadow: 0 4px 14px rgba(2, 132, 199, 0.3);">
            <i class="fa-brands fa-google-drive"></i>
          </div>
          <div>
            <h3 style="margin: 0; font-family: 'Outfit', sans-serif; font-weight: 700; font-size: 1.25rem; color: #ffffff;">Conectar Google Drive</h3>
            <span style="font-size: 0.82rem; color: #38bdf8; font-weight: 500;">Sincronização &amp; Redundância de Backups</span>
          </div>
        </div>

        <!-- Descrição -->
        <p style="font-size: 0.88rem; color: #cbd5e1; line-height: 1.55; margin-bottom: 20px; background: rgba(14, 165, 233, 0.08); padding: 14px 16px; border-radius: 12px; border-left: 4px solid #0284c7;">
          Informe o e-mail da sua conta Google para autorizar o salvamento de cópias de segurança na nuvem (pasta <strong>Health Nexus Backups</strong>).
        </p>

        <!-- Form Inputs -->
        <div style="margin-bottom: 16px;">
          <label style="display: block; font-size: 0.8rem; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 8px;">
            E-mail da Conta Google
          </label>
          <div style="position: relative;">
            <i class="fa-solid fa-envelope" style="position: absolute; left: 14px; top: 50%; transform: translateY(-50%); color: #64748b; font-size: 0.95rem;"></i>
            <input type="email" id="gdrive-email-input" value="${defaultEmail}" placeholder="seu-email@gmail.com" style="width: 100%; background: #0f172a; border: 1.5px solid rgba(56, 189, 248, 0.4); color: #ffffff; padding: 12px 14px 12px 40px; border-radius: 12px; font-size: 0.95rem; outline: none; font-family: 'Inter', sans-serif; transition: border-color 0.2s, box-shadow 0.2s;" onfocus="this.style.borderColor='#38bdf8'; this.style.boxShadow='0 0 0 3px rgba(56, 189, 248, 0.2)'" onblur="this.style.borderColor='rgba(56, 189, 248, 0.4)'; this.style.boxShadow='none'">
          </div>
          <small id="gdrive-email-error" style="color: #f87171; font-size: 0.78rem; display: none; margin-top: 6px; font-weight: 500;">Por favor, digite um e-mail válido.</small>
        </div>

        <div style="margin-bottom: 14px;">
          <label style="display: block; font-size: 0.8rem; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 8px;">
            Client ID do Google Cloud
          </label>
          <div style="position: relative;">
            <i class="fa-solid fa-key" style="position: absolute; left: 14px; top: 50%; transform: translateY(-50%); color: #64748b; font-size: 0.95rem;"></i>
            <input type="text" id="gdrive-clientid-input" value="${localStorage.getItem('hn_gdrive_client_id') || ''}" placeholder="931151048551-xxx.apps.googleusercontent.com" style="width: 100%; background: #0f172a; border: 1.5px solid rgba(56, 189, 248, 0.4); color: #ffffff; padding: 12px 14px 12px 40px; border-radius: 12px; font-size: 0.82rem; outline: none; font-family: monospace; transition: border-color 0.2s, box-shadow 0.2s;" onfocus="this.style.borderColor='#38bdf8'; this.style.boxShadow='0 0 0 3px rgba(56, 189, 248, 0.2)'" onblur="this.style.borderColor='rgba(56, 189, 248, 0.4)'; this.style.boxShadow='none'">
          </div>
        </div>

        <div style="margin-bottom: 24px;">
          <label style="display: block; font-size: 0.8rem; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 8px;">
            Chave Secreta do Cliente (Client Secret)
          </label>
          <div style="position: relative;">
            <i class="fa-solid fa-lock" style="position: absolute; left: 14px; top: 50%; transform: translateY(-50%); color: #64748b; font-size: 0.95rem;"></i>
            <input type="password" id="gdrive-clientsecret-input" value="${localStorage.getItem('hn_gdrive_client_secret') || ''}" placeholder="GOCSPX-xxx" style="width: 100%; background: #0f172a; border: 1.5px solid rgba(56, 189, 248, 0.4); color: #ffffff; padding: 12px 14px 12px 40px; border-radius: 12px; font-size: 0.82rem; outline: none; font-family: monospace; transition: border-color 0.2s, box-shadow 0.2s;" onfocus="this.style.borderColor='#38bdf8'; this.style.boxShadow='0 0 0 3px rgba(56, 189, 248, 0.2)'" onblur="this.style.borderColor='rgba(56, 189, 248, 0.4)'; this.style.boxShadow='none'">
          </div>
        </div>

        <!-- Botões de Ação -->
        <div style="display: flex; justify-content: flex-end; gap: 12px;">
          <button id="btn-cancel-gdrive-modal" type="button" style="background: rgba(255,255,255,0.06); color: #cbd5e1; border: 1px solid rgba(255,255,255,0.15); padding: 10px 20px; border-radius: 12px; font-weight: 600; font-size: 0.88rem; cursor: pointer; transition: all 0.2s;" onmouseenter="this.style.background='rgba(255,255,255,0.12)'" onmouseleave="this.style.background='rgba(255,255,255,0.06)'">
            Cancelar
          </button>
          <button id="btn-confirm-gdrive-modal" type="button" style="background: linear-gradient(135deg, #0284c7, #0369a1); color: #ffffff; border: none; padding: 10px 24px; border-radius: 12px; font-weight: 700; font-size: 0.88rem; cursor: pointer; box-shadow: 0 4px 16px rgba(2, 132, 199, 0.4); display: flex; align-items: center; gap: 8px; transition: transform 0.2s, box-shadow 0.2s;" onmouseenter="this.style.transform='scale(1.02)'" onmouseleave="this.style.transform='scale(1)'">
            <i class="fa-brands fa-google-drive"></i> Conectar Conta
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    const input = document.getElementById('gdrive-email-input');
    if (input) {
      input.focus();
      input.select();
    }

    const closeModal = (value = null) => {
      modal.style.opacity = '0';
      modal.style.transition = 'opacity 0.2s ease';
      setTimeout(() => {
        modal.remove();
        resolve(value);
      }, 200);
    };

    document.getElementById('close-gdrive-modal').addEventListener('click', () => closeModal(null));
    document.getElementById('btn-cancel-gdrive-modal').addEventListener('click', () => closeModal(null));

    const submit = () => {
      const emailVal = input ? input.value.trim() : '';
      const clientVal = document.getElementById('gdrive-clientid-input')?.value?.trim() || '';
      if (!emailVal || !emailVal.includes('@')) {
        const errEl = document.getElementById('gdrive-email-error');
        if (errEl) errEl.style.display = 'block';
        return;
      }
      if (clientVal) {
        localStorage.setItem('hn_gdrive_client_id', clientVal);
      }
      closeModal(emailVal);
    };

    document.getElementById('btn-confirm-gdrive-modal').addEventListener('click', submit);
    if (input) {
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          submit();
        }
      });
    }
  });
}

// --- FUNÇÃO REAL DE UPLOAD PARA O GOOGLE DRIVE API V3 ---
async function uploadBackupToGoogleDrive(snapshotData, customFileName) {
  const gdriveSync = document.getElementById('cfg-gdrive-sync-enable')?.checked;
  const gdriveUser = localStorage.getItem('hn_gdrive_user') || 'mazzarowysk@gmail.com';
  const clientId = localStorage.getItem('hn_gdrive_client_id');
  const accessToken = localStorage.getItem('hn_gdrive_access_token');

  if (gdriveSync === false) return null;

  const nowStr = new Date().toISOString();
  const fileName = customFileName || `Health_Nexus_Backup_${nowStr.slice(0,10)}_${nowStr.slice(11,19).replace(/:/g,'-')}.json`;
  const backupJson = JSON.stringify(snapshotData || localDB.getFullDB(), null, 2);

  // Se tivermos um Token OAuth ativo, envia diretamente via API REST v3 do Google Drive
  if (accessToken) {
    try {
      showToast('☁️ Enviando backup para o seu Google Drive...');

      const metadata = {
        name: fileName,
        mimeType: 'application/json'
      };

      const fileBlob = new Blob([backupJson], { type: 'application/json' });
      const formData = new FormData();
      formData.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
      formData.append('file', fileBlob);

      const res = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`
        },
        body: formData
      });

      if (res.ok) {
        const fileData = await res.json();
        showToast('✅ Backup salvo com sucesso no seu Google Drive!');
        return fileData;
      } else if (res.status === 401) {
        localStorage.removeItem('hn_gdrive_access_token');
      }
    } catch (err) {
      console.warn('Falha no upload direto via API token:', err);
    }
  }

  // Se o Client ID estiver configurado e o SDK do Google estiver disponível, solicita o login/token real
  if (clientId && window.google && window.google.accounts && window.google.accounts.oauth2) {
    return new Promise((resolve) => {
      try {
        const client = window.google.accounts.oauth2.initTokenClient({
          client_id: clientId,
          scope: 'https://www.googleapis.com/auth/drive.file',
          hint: gdriveUser,
          callback: async (tokenResponse) => {
            if (tokenResponse.error) {
              showToast('⚠️ Autenticação do Google Drive não concluída.');
              return resolve(null);
            }
            if (tokenResponse.access_token) {
              localStorage.setItem('hn_gdrive_access_token', tokenResponse.access_token);
              const result = await uploadBackupToGoogleDrive(snapshotData, fileName);
              resolve(result);
            }
          }
        });
        client.requestAccessToken();
      } catch (oauthErr) {
        console.error('Erro ao abrir popup de autenticação do Google:', oauthErr);
        resolve(null);
      }
    });
  } else if (!clientId) {
    showCustomAlert({
      title: '🔑 Client ID Necessário',
      message: 'Para o Google enviar os arquivos para o seu Drive, insira o seu <strong>Client ID do Google Cloud</strong> no campo abaixo e clique em <strong>Salvar Credenciais</strong>.',
      type: 'warning'
    });
    return null;
  }

  showToast('☁️ Backup vinculado registrado para ' + gdriveUser);
  return { simulated: true, name: fileName };
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
            <div class="auth-hero-badge">
              <i class="fa-solid fa-hospital" style="color: #fbbf24;"></i> PLATAFORMA OFICIAL &bull; GESTÃO HOSPITALAR
            </div>

            <div class="auth-brand-logo-wrap">
              <div class="auth-brand-logo-box">
                <img src="/assets/logo.png" alt="Health Nexus" class="auth-brand-logo-img">
              </div>
              <div class="auth-brand-name">
                Health Nexus
                <span class="auth-brand-subtag">
                  <i class="fa-solid fa-shield-halved" style="color: #818cf8; margin-right: 5px;"></i> Sistema de Gestão Hospitalar
                </span>
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
              <div id="auth-master-key-box" class="form-group" style="display: block; background: rgba(99, 102, 241, 0.12); border: 1px solid rgba(129, 140, 248, 0.35); border-radius: 8px; padding: 10px; margin-bottom: 12px;">
                <label class="form-label" for="auth-master-key" style="color: #a5b4fc; font-weight: 600; display: flex; align-items: center; gap: 6px;">
                  <i class="fa-solid fa-key" style="color: #fbbf24;"></i> Chave Master (Opcional):
                </label>
                <input type="password" id="auth-master-key" class="form-input" placeholder="Digite a chave se possuir">
                <small style="color: var(--text-secondary); display: block; margin-top: 4px; font-size: 0.75rem; line-height: 1.3;">
                  * Todo novo cadastro fica <strong>Pendente de Aprovação</strong> pelo Usuário Master principal, exceto se você possuir a Chave Master.
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
      // The box is now always visible because all registrations need approval
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
            
            const newSession = {
              user_id: data.user.id,
              login_time: new Date().toISOString(),
              logout_time: null,
              duration_minutes: 0
            };
            const sessionRec = localDB.insert('user_sessions', newSession);
            sessionStorage.setItem('hn_session_id', sessionRec.id);
            
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
          const isPending = res.status === 403;
          if (isPending) {
            // Switch to login form automatically
            isLogin = true;
            renderForm();
            // Re-fetch the error container since renderForm recreates the DOM
            const newErrorContainer = document.getElementById('auth-error-container');
            if (newErrorContainer) {
              newErrorContainer.innerHTML = `
                <div style="background: linear-gradient(135deg, rgba(245,158,11,0.15), rgba(217,119,6,0.1)); border: 1px solid rgba(245,158,11,0.4); border-radius: 12px; padding: 16px 18px; display: flex; align-items: flex-start; gap: 14px; margin-top: 4px; margin-bottom: 16px;">
                  <i class="fa-solid fa-clock" style="color: #fbbf24; font-size: 1.4rem; margin-top: 2px; flex-shrink: 0;"></i>
                  <div>
                    <div style="font-weight: 700; color: #fbbf24; font-size: 0.95rem; margin-bottom: 4px;">Acesso Aguardando Aprovação</div>
                    <div style="color: #fde68a; font-size: 0.85rem; line-height: 1.5;">
                      A solicitação de acesso está <strong>Pendente</strong>.<br>
                      Faça login com um usuário Master para aprovar o cadastro na aba <strong>Alertas & Estagnação</strong>.
                    </div>
                  </div>
                </div>
              `;
            }
          } else {
            if (errorContainer) {
              errorContainer.innerHTML = `
                <div class="auth-error-alert">
                  <i class="fa-solid fa-circle-exclamation"></i>
                  <span>${data.message || 'Erro na autenticação'}</span>
                </div>
              `;
            }
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



// --- ESTRUTURA GERAL DA INTERFACE (TEMPLATE DINÂMICO POR PERFIL) ---
function renderAppStructure() {
  const root = document.getElementById('app');
  const perms = getRolePermissions(state.user);

  const allNavItems = [
    { id: 'dashboard', label: 'Health Nexus', icon: 'fa-chart-line' },
    { id: 'escalas', label: 'Escalas de Trabalho', icon: 'fa-user-clock' },
    { id: 'agenda', label: 'Agenda', icon: 'fa-calendar-check' },
    { id: 'pacientes', label: 'Pacientes', icon: 'fa-user-injured' },
    { id: 'atendimento', label: 'Atendimentos', icon: 'fa-stethoscope' },
    { id: 'tv_panel', label: 'Painel TV (Chamador)', icon: 'fa-tv' },
    { id: 'estagnacao', label: 'Alertas & Estagnação', icon: 'fa-triangle-exclamation', hasBadge: true },
    { id: 'leitos', label: 'Leitos', icon: 'fa-bed-pulse' },
    { id: 'kanban', label: 'Kanban', icon: 'fa-table-columns' },
    { id: 'farmacia', label: 'Farmácia & Estoque', icon: 'fa-pills' },
    { id: 'financeiro', label: 'Financeiro', icon: 'fa-hand-holding-dollar' },
    { id: 'medicos', label: 'Profissionais', icon: 'fa-user-nurse' },
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
          <div class="brand-logo-card">
            <img src="/assets/logo.png" alt="Health Nexus" class="brand-logo-img">
          </div>
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
        <div style="display: flex; align-items: center; gap: 14px;">
          <button id="global-back-btn" style="display: none; background: linear-gradient(135deg, rgba(99,102,241,0.25), rgba(59,130,246,0.25)); border: 1px solid rgba(129,140,248,0.4); color: #818cf8; font-weight: 700; font-size: 0.82rem; padding: 7px 14px; border-radius: 20px; cursor: pointer; align-items: center; gap: 8px; transition: all 0.2s ease; box-shadow: 0 4px 12px rgba(0,0,0,0.25);" title="Voltar para a tela anterior (Atalho: Alt + Seta Esquerda)">
            <i class="fa-solid fa-arrow-left"></i>
            <span id="global-back-label">Voltar</span>
          </button>
          <h1 class="page-title" id="page-title-label" style="margin: 0;">Health Nexus</h1>
          <div class="header-brand-text" style="margin: 0;">
            <i class="fa-solid fa-circle-nodes"></i>
            <span>Sistema de Gestão Hospitalar Health Nexus</span>
          </div>
        </div>

        <!-- CAMPO DE BUSCA GLOBAL DO SISTEMA (SPOTLIGHT / COMMAND PALETTE) -->
        <div class="global-search-wrapper" style="position: relative; flex: 1; max-width: 540px; margin: 0 16px; transition: max-width 0.3s ease;">
          <i class="fa-solid fa-magnifying-glass" style="position: absolute; left: 14px; top: 50%; transform: translateY(-50%); color: #818cf8; font-size: 0.88rem; pointer-events: none; z-index: 3;"></i>
          <input type="text" id="global-system-search" placeholder="Buscar no sistema (ex: Excluir Usuário, RBAC, Novo Paciente)..." style="
            width: 100%; background: rgba(15, 23, 42, 0.85); border: 1px solid rgba(129, 140, 248, 0.4);
            color: #f8fafc; padding: 9px 68px 9px 38px; border-radius: 20px; font-size: 0.84rem;
            outline: none; transition: all 0.25s ease; box-shadow: inset 0 2px 4px rgba(0,0,0,0.3);
          " onfocus="this.style.borderColor='#818cf8'; this.style.boxShadow='0 0 20px rgba(129, 140, 248, 0.5)';" autocomplete="off">
          <span style="position: absolute; right: 10px; top: 50%; transform: translateY(-50%); font-size: 0.68rem; font-weight: 700; background: rgba(129, 140, 248, 0.15); color: #a5b4fc; padding: 2px 8px; border-radius: 6px; pointer-events: none; border: 1px solid rgba(129, 140, 248, 0.3); z-index: 3;">
            Ctrl K
          </span>

          <!-- Dropdown de Resultados da Busca em Tempo Real -->
          <div id="global-search-results" style="
            display: none; position: absolute; top: 46px; left: 0; right: 0;
            background: #0b0f19; border: 1px solid rgba(129, 140, 248, 0.5);
            border-radius: 14px; box-shadow: 0 20px 45px rgba(0,0,0,0.85), 0 0 30px rgba(99, 102, 241, 0.25);
            z-index: 100000; max-height: 480px; overflow-y: auto; scrollbar-width: thin;
            padding: 10px; font-family: system-ui, -apple-system, sans-serif;
          "></div>
        </div>

        <div id="sync-status-container" style="display: flex; align-items: center; gap: 10px;">
          <span id="sync-status-badge" style="font-size: 0.82rem; padding: 8px 12px; border-radius: 999px; border: 1px solid var(--border-color); background: rgba(59,130,246,0.08); color: var(--text-primary);">
            Verificando Turso...
          </span>
          <button id="btn-density-toggle" class="btn" style="background: var(--bg-tertiary); border: 1px solid var(--border-color); color: var(--text-primary); cursor: pointer; display: flex; align-items: center; justify-content: center; padding: 0 14px; height: 40px; border-radius: 20px; font-size: 0.82rem; font-weight: 600; gap: 6px; transition: transform 0.2s ease, background 0.2s ease;" title="Alternar Densidade Visual (Modo Normal / Modo Compacto Hospitalar)">
            <i class="fa-solid fa-compress" id="density-icon"></i> <span id="density-label">Modo Compacto</span>
          </button>
          <button id="btn-theme-toggle" class="btn" style="background: var(--bg-tertiary); border: 1px solid var(--border-color); color: var(--text-primary); cursor: pointer; display: flex; align-items: center; justify-content: center; width: 40px; height: 40px; border-radius: 50%; padding: 0; font-size: 1.15rem; transition: transform 0.2s ease, background 0.2s ease;" title="Alternar Tema Claro/Escuro">
            <i class="fa-solid fa-circle-half-stroke" id="theme-icon"></i>
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
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <label class="pep-sidebar-label" style="margin: 0;"><i class="fa-solid fa-heart-pulse"></i> Sinais Vitais (Triagem)</label>
                <span style="font-size: 0.7rem; color: #a78bfa; font-weight: 600; cursor: pointer;" title="Clique em qualquer sinal vital para ver a referência médica"><i class="fa-solid fa-circle-info"></i> Guia Rápido</span>
              </div>
              <div class="pep-vitals-grid">
                <div class="pep-vital-item" onclick="openVitalDetailModal('pa')" style="cursor: pointer;" title="Clique para ver referência médica da PA">
                  <span class="pep-vital-lbl"><i class="fa-solid fa-gauge-high" style="color: #60a5fa;"></i> PA <i class="fa-solid fa-chevron-right" style="font-size: 0.65rem; margin-left: auto; opacity: 0.5;"></i></span>
                  <span class="pep-vital-val"><strong id="pep-bp">-</strong> <small>mmHg</small></span>
                </div>
                <div class="pep-vital-item" onclick="openVitalDetailModal('fc')" style="cursor: pointer;" title="Clique para ver referência médica da FC">
                  <span class="pep-vital-lbl"><i class="fa-solid fa-heartbeat" style="color: #f87171;"></i> FC <i class="fa-solid fa-chevron-right" style="font-size: 0.65rem; margin-left: auto; opacity: 0.5;"></i></span>
                  <span class="pep-vital-val"><strong id="pep-hr">-</strong> <small>bpm</small></span>
                </div>
                <div class="pep-vital-item" onclick="openVitalDetailModal('temp')" style="cursor: pointer;" title="Clique para ver referência médica da Temperatura">
                  <span class="pep-vital-lbl"><i class="fa-solid fa-temperature-three-quarters" style="color: #fbbf24;"></i> Temp <i class="fa-solid fa-chevron-right" style="font-size: 0.65rem; margin-left: auto; opacity: 0.5;"></i></span>
                  <span class="pep-vital-val"><strong id="pep-temp">-</strong> <small>°C</small></span>
                </div>
                <div class="pep-vital-item" onclick="openVitalDetailModal('weight')" style="cursor: pointer;" title="Clique para ver referência médica do Peso">
                  <span class="pep-vital-lbl"><i class="fa-solid fa-weight-scale" style="color: #34d399;"></i> Peso <i class="fa-solid fa-chevron-right" style="font-size: 0.65rem; margin-left: auto; opacity: 0.5;"></i></span>
                  <span class="pep-vital-val"><strong id="pep-weight">-</strong> <small>kg</small></span>
                </div>
                <div class="pep-vital-item" onclick="openVitalDetailModal('spo2')" style="cursor: pointer;" title="Clique para ver referência médica da SpO2">
                  <span class="pep-vital-lbl"><i class="fa-solid fa-lungs" style="color: #a78bfa;"></i> SpO2 <i class="fa-solid fa-chevron-right" style="font-size: 0.65rem; margin-left: auto; opacity: 0.5;"></i></span>
                  <span class="pep-vital-val"><strong id="pep-spo2">-</strong> <small>%</small></span>
                </div>
                <div class="pep-vital-item" onclick="openVitalDetailModal('pain')" style="cursor: pointer;" title="Clique para ver referência médica da Dor">
                  <span class="pep-vital-lbl"><i class="fa-solid fa-face-frown-open" style="color: #f43f5e;"></i> Dor <i class="fa-solid fa-chevron-right" style="font-size: 0.65rem; margin-left: auto; opacity: 0.5;"></i></span>
                  <span class="pep-vital-val"><strong id="pep-pain">-</strong> <small>/10</small></span>
                </div>
              </div>
            </div>

            <div class="pep-sidebar-group">
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <label class="pep-sidebar-label" style="margin: 0;"><i class="fa-solid fa-comment-medical"></i> Queixa Principal</label>
                <span style="font-size: 0.7rem; color: #34d399; font-weight: 600;"><i class="fa-solid fa-pen-to-square"></i> Editável</span>
              </div>
              <div class="pep-complaints-card" style="padding: 0; background: none; border: none;">
                <textarea id="pep-complaints" class="form-input pep-textarea" style="width: 100%; min-height: 130px; resize: vertical; font-size: 0.9rem; line-height: 1.5; background: rgba(167, 139, 250, 0.08); border: 1px solid rgba(167, 139, 250, 0.3); border-left: 4px solid #a78bfa; border-radius: 12px; color: var(--text-primary); padding: 14px 16px;" placeholder="Digite ou edite a queixa principal do paciente..."></textarea>
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

  const backBtn = document.getElementById('global-back-btn');
  if (backBtn) {
    backBtn.addEventListener('click', goBack);
  }

  document.addEventListener('keydown', (e) => {
    if (e.altKey && e.key === 'ArrowLeft') {
      e.preventDefault();
      goBack();
    }
  });

  // Inicializar o mecanismo de Busca Global do Sistema (Spotlight / Command K)
  initGlobalSystemSearch();

  // Renderizar o conteúdo da aba ativa
  renderTabContent();
}

// ─── MECANISMO DE BUSCA GLOBAL DO SISTEMA (SPOTLIGHT / COMMAND K) ──────────────
function initGlobalSystemSearch() {
  const searchInput = document.getElementById('global-system-search');
  const searchResultsContainer = document.getElementById('global-search-results');
  if (!searchInput || !searchResultsContainer) return;

  const normalizeStr = (str) => {
    if (!str) return '';
    return String(str).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  };

  const performSearch = () => {
    const rawQuery = searchInput.value.trim();
    if (!rawQuery) {
      searchResultsContainer.style.display = 'none';
      searchResultsContainer.innerHTML = '';
      return;
    }

    const qNorm = normalizeStr(rawQuery);
    const queryTokens = qNorm.split(/\s+/).filter(Boolean);

    const searchResult = typeof searchManualEngine === 'function' ? searchManualEngine(rawQuery, 'Master') : null;
    const buttonMatches = searchResult ? searchResult.buttonMatches : [];
    const faqMatches = searchResult ? searchResult.faqMatches : [];

    // 2. Pesquisar abas da aplicação
    const allNavItems = [
      { id: 'dashboard', label: 'Health Nexus (Visão Geral)', icon: 'fa-chart-line', tabColor: '#818cf8' },
      { id: 'escalas', label: 'Escalas de Trabalho & Plantões', icon: 'fa-user-clock', tabColor: '#a855f7' },
      { id: 'agenda', label: 'Agenda & Consultas', icon: 'fa-calendar-check', tabColor: '#93c5fd' },
      { id: 'pacientes', label: 'Recepção & Pacientes', icon: 'fa-user-injured', tabColor: '#38bdf8' },
      { id: 'atendimento', label: 'Atendimentos & Prontuário Médico', icon: 'fa-stethoscope', tabColor: '#fcd34d' },
      { id: 'tv_panel', label: 'Painel TV & Sala de Espera', icon: 'fa-tv', tabColor: '#a78bfa' },
      { id: 'estagnacao', label: 'Alertas & Estagnação', icon: 'fa-triangle-exclamation', tabColor: '#f59e0b' },
      { id: 'leitos', label: 'Gestão de Leitos & Internação', icon: 'fa-bed-pulse', tabColor: '#f9a8d4' },
      { id: 'kanban', label: 'Quadro Kanban Hospitalar', icon: 'fa-table-columns', tabColor: '#60a5fa' },
      { id: 'farmacia', label: 'Farmácia & Estoque', icon: 'fa-pills', tabColor: '#fbbf24' },
      { id: 'financeiro', label: 'Faturamento & Financeiro', icon: 'fa-hand-holding-dollar', tabColor: '#34d399' },
      { id: 'medicos', label: 'Profissionais & Equipe', icon: 'fa-user-nurse', tabColor: '#818cf8' },
      { id: 'consultorios', label: 'Salas & Consultórios', icon: 'fa-door-open', tabColor: '#c084fc' },
      { id: 'relatorios', label: 'Relatórios & Métricas', icon: 'fa-file-contract', tabColor: '#06b6d4' },
      { id: 'configuracoes', label: 'Configurações & Turso Cloud DB', icon: 'fa-gear', tabColor: '#a5b4fc' }
    ];

    const tabMatches = allNavItems.filter(item => {
      const lbl = normalizeStr(item.label);
      const id = normalizeStr(item.id);
      return lbl.includes(qNorm) || id.includes(qNorm) || queryTokens.every(t => lbl.includes(t));
    });

    // 3. Pesquisar Pacientes cadastrados
    const patientMatches = [];
    if (state.patients && Array.isArray(state.patients)) {
      state.patients.forEach(p => {
        const pName = normalizeStr(p.name);
        const pCpf = (p.cpf || '').replace(/\D/g, '');
        const qDigits = rawQuery.replace(/\D/g, '');

        if (pName.includes(qNorm) || queryTokens.every(t => pName.includes(t)) || (qDigits && pCpf.includes(qDigits))) {
          patientMatches.push(p);
        }
      });
    }

    // 🤖 Nexus AI Knowledge Copilot Engine v2.5
    const aiCopilot = searchResult && searchResult.aiCopilot ? searchResult.aiCopilot : getNexusAICopilotResponse(qNorm, rawQuery);

    if (buttonMatches.length === 0 && tabMatches.length === 0 && patientMatches.length === 0 && faqMatches.length === 0) {
      searchResultsContainer.innerHTML = `
        <div style="padding: 14px; background: linear-gradient(135deg, rgba(124, 58, 237, 0.18) 0%, rgba(79, 70, 229, 0.18) 100%); border: 1px solid rgba(167, 139, 250, 0.35); border-radius: 12px; margin-bottom: 12px;">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px;">
            <strong style="color: #c4b5fd; font-size: 0.85rem; display: flex; align-items: center; gap: 8px;">
              <i class="fa-solid fa-wand-magic-sparkles" style="color: #a78bfa;"></i> ${aiCopilot.title}
            </strong>
            <span style="font-size: 0.65rem; background: rgba(167, 139, 250, 0.25); color: #e9d5ff; padding: 2px 8px; border-radius: 10px; font-weight: 700;">IA Ativa</span>
          </div>
          <p style="color: #f3e8ff; font-size: 0.81rem; margin: 0 0 10px 0; line-height: 1.4;">
            ${aiCopilot.summary}
          </p>
          ${aiCopilot.actionButton !== false ? `
            <button class="search-result-item" data-type="ai_action" data-action="${aiCopilot.actionType}" data-target="${aiCopilot.actionTarget}" style="
              background: #7c3aed; color: #ffffff; border: none; padding: 7px 14px; border-radius: 8px; font-size: 0.78rem; font-weight: 700; cursor: pointer; transition: all 0.2s; display: inline-flex; align-items: center; gap: 6px; box-shadow: 0 4px 12px rgba(124, 58, 237, 0.3);
            " onmouseover="this.style.background='#6d28d9'" onmouseout="this.style.background='#7c3aed'">
              ${aiCopilot.actionText}
            </button>
          ` : ''}
        </div>
      `;
      searchResultsContainer.style.display = 'block';
      
      // Setup listener for AI Action button when no other matches
      const aiBtn = searchResultsContainer.querySelector('[data-type="ai_action"]');
      if (aiBtn) {
        aiBtn.addEventListener('click', () => {
          const act = aiBtn.dataset.action;
          const tgt = aiBtn.dataset.target;
          if (act === 'openDoctorModal') {
            switchTab('medicos');
            setTimeout(() => { document.getElementById('btn-open-doctor-modal')?.click(); }, 350);
          } else if (act === 'openPatientModal') {
            switchTab('pacientes');
            setTimeout(() => { document.getElementById('btn-open-patient-modal')?.click(); }, 350);
          } else if (act === 'switchTab') {
            switchTab(tgt);
          } else if (act === 'openManual') {
            if (typeof showInteractiveManualModal === 'function') showInteractiveManualModal(tgt);
          }
          searchResultsContainer.style.display = 'none';
          searchInput.value = '';
        });
      }
      return;
    }

    let html = '';

    // Renderizar Card da IA Assistente no topo dos resultados
    html += `
      <div style="padding: 12px 14px; background: linear-gradient(135deg, rgba(124, 58, 237, 0.22) 0%, rgba(79, 70, 229, 0.22) 100%); border: 1px solid rgba(167, 139, 250, 0.4); border-radius: 12px; margin-bottom: 12px; box-shadow: 0 4px 16px rgba(124, 58, 237, 0.15);">
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px;">
          <strong style="color: #ddd6fe; font-size: 0.85rem; display: flex; align-items: center; gap: 8px;">
            <i class="fa-solid fa-wand-magic-sparkles" style="color: #c084fc;"></i> ${aiCopilot.title}
          </strong>
          <span style="font-size: 0.65rem; background: rgba(167, 139, 250, 0.25); color: #e9d5ff; padding: 2px 8px; border-radius: 10px; font-weight: 700;">IA Ativa</span>
        </div>
        <p style="color: #f3e8ff; font-size: 0.81rem; margin: 0 0 10px 0; line-height: 1.4;">
          ${aiCopilot.summary}
        </p>
        <button class="search-result-item" data-type="ai_action" data-action="${aiCopilot.actionType}" data-target="${aiCopilot.actionTarget}" style="
          background: #7c3aed; color: #ffffff; border: none; padding: 7px 14px; border-radius: 8px; font-size: 0.78rem; font-weight: 700; cursor: pointer; transition: all 0.2s; display: inline-flex; align-items: center; gap: 6px; box-shadow: 0 4px 12px rgba(124, 58, 237, 0.3);
        " onmouseover="this.style.background='#6d28d9'" onmouseout="this.style.background='#7c3aed'">
          ${aiCopilot.actionText}
        </button>
      </div>
    `;

    // Renderizar Funcionalidades & Botões Encontrados (Ordenados por Relevância)
    if (buttonMatches.length > 0) {
      const isDeleteSearch = buttonMatches.some(b => b._isDelete);
      html += `<div style="font-size: 0.72rem; font-weight: 800; text-transform: uppercase; color: ${isDeleteSearch ? '#f87171' : '#10b981'}; letter-spacing: 0.5px; padding: 6px 8px 4px 8px;">${isDeleteSearch ? '🗑️ Ações de Exclusão & Desativação' : '⚙️ Funcionalidades & Ações Relevantes'} (${buttonMatches.length})</div>`;
      buttonMatches.slice(0, 10).forEach(btn => {
        html += `
          <div class="search-result-item" data-type="btn" data-mod-id="${btn._moduleId}" data-btn-name="${encodeURIComponent(btn.name)}" style="
            padding: 10px 12px; border-radius: 10px; cursor: pointer; transition: all 0.2s;
            background: rgba(15, 23, 42, 0.75); margin-bottom: 6px; border: 1px solid ${btn._isDelete ? 'rgba(239, 68, 68, 0.25)' : 'rgba(255,255,255,0.07)'};
          " onmouseover="this.style.background='${btn._isDelete ? 'rgba(239, 68, 68, 0.22)' : 'rgba(16, 185, 129, 0.22)'}'; this.style.borderColor='${btn.color}'" onmouseout="this.style.background='rgba(15, 23, 42, 0.75)'; this.style.borderColor='${btn._isDelete ? 'rgba(239, 68, 68, 0.25)' : 'rgba(255,255,255,0.07)'}'">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 4px;">
              <strong style="color: #ffffff; font-size: 0.88rem; display: flex; align-items: center; gap: 8px;">
                <i class="fa-solid ${btn.icon}" style="color: ${btn.color}; font-size: 0.95rem;"></i>
                ${btn.name}
              </strong>
              <span style="font-size: 0.65rem; background: rgba(255,255,255,0.08); color: ${btn._moduleColor || '#818cf8'}; padding: 3px 8px; border-radius: 8px; font-weight: 700;">
                ${btn._moduleTitle}
              </span>
            </div>
            <p style="color: #cbd5e1; font-size: 0.78rem; margin: 0; line-height: 1.35; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">
              ${btn.description}
            </p>
          </div>
        `;
      });
    }

    // Renderizar Abas Encontradas
    if (tabMatches.length > 0) {
      html += `<div style="font-size: 0.72rem; font-weight: 800; text-transform: uppercase; color: #818cf8; letter-spacing: 0.5px; padding: 10px 8px 4px 8px;">📌 Módulos & Abas (${tabMatches.length})</div>`;
      tabMatches.slice(0, 4).forEach(t => {
        html += `
          <div class="search-result-item" data-type="tab" data-tab-id="${t.id}" style="
            display: flex; align-items: center; justify-content: space-between;
            padding: 9px 12px; border-radius: 10px; cursor: pointer; transition: all 0.2s;
            background: rgba(255,255,255,0.03); margin-bottom: 5px; border: 1px solid rgba(255,255,255,0.05);
          " onmouseover="this.style.background='rgba(99, 102, 241, 0.25)'; this.style.borderColor='rgba(129, 140, 248, 0.5)'" onmouseout="this.style.background='rgba(255,255,255,0.03)'; this.style.borderColor='rgba(255,255,255,0.05)'">
            <div style="display: flex; align-items: center; gap: 10px;">
              <i class="fa-solid ${t.icon}" style="color: ${t.tabColor}; font-size: 0.95rem;"></i>
              <span style="font-weight: 700; color: #f8fafc; font-size: 0.86rem;">${t.label}</span>
            </div>
            <span style="font-size: 0.68rem; background: rgba(99, 102, 241, 0.2); color: #a5b4fc; padding: 3px 9px; border-radius: 10px; font-weight: 700;">Navegar ➔</span>
          </div>
        `;
      });
    }

    // Renderizar Pacientes Encontrados (se houver)
    if (patientMatches.length > 0) {
      html += `<div style="font-size: 0.72rem; font-weight: 800; text-transform: uppercase; color: #38bdf8; letter-spacing: 0.5px; padding: 10px 8px 4px 8px;">👤 Pacientes Cadastrados & Localização Atual (${patientMatches.length})</div>`;
      patientMatches.slice(0, 4).forEach(p => {
        let statusBadge = '<span style="font-size: 0.68rem; background: rgba(56, 189, 248, 0.2); color: #38bdf8; padding: 3px 9px; border-radius: 10px; font-weight: 700;">Ver Prontuário ➔</span>';
        if (state.encounters && Array.isArray(state.encounters)) {
          const activeEnc = state.encounters.find(e => (e.patientId === p.id || e.patientName === p.name) && e.status !== 'Finalizado' && e.status !== 'Cancelado');
          if (activeEnc) {
            if (activeEnc.status === 'Em_Atendimento') {
              statusBadge = '<span style="font-size: 0.68rem; background: rgba(16, 185, 129, 0.25); color: #10b981; border: 1px solid #10b981; padding: 3px 9px; border-radius: 10px; font-weight: 700;">🩺 Consultório 01 (Em Atendimento) ➔</span>';
            } else if (activeEnc.status === 'Aguardando_Atendimento') {
              statusBadge = '<span style="font-size: 0.68rem; background: rgba(245, 158, 11, 0.25); color: #fbbf24; border: 1px solid #f59e0b; padding: 3px 9px; border-radius: 10px; font-weight: 700;">⏳ Aguardando Médico (Atendimentos) ➔</span>';
            } else if (activeEnc.status === 'Aguardando_Triagem') {
              statusBadge = '<span style="font-size: 0.68rem; background: rgba(139, 92, 246, 0.25); color: #c084fc; border: 1px solid #8b5cf6; padding: 3px 9px; border-radius: 10px; font-weight: 700;">🩺 Aguardando Triagem ➔</span>';
            } else if (activeEnc.status === 'Em_Observacao') {
              statusBadge = '<span style="font-size: 0.68rem; background: rgba(239, 68, 68, 0.25); color: #f87171; border: 1px solid #ef4444; padding: 3px 9px; border-radius: 10px; font-weight: 700;">⏱️ Observação PS ➔</span>';
            }
          }
        }
        html += `
          <div class="search-result-item" data-type="patient" data-patient-id="${p.id}" style="
            display: flex; align-items: center; justify-content: space-between;
            padding: 9px 12px; border-radius: 10px; cursor: pointer; transition: all 0.2s;
            background: rgba(255,255,255,0.03); margin-bottom: 5px; border: 1px solid rgba(255,255,255,0.05);
          " onmouseover="this.style.background='rgba(56, 189, 248, 0.2)'; this.style.borderColor='rgba(56, 189, 248, 0.5)'" onmouseout="this.style.background='rgba(255,255,255,0.03)'; this.style.borderColor='rgba(255,255,255,0.05)'">
            <div>
              <strong style="color: #f8fafc; font-size: 0.86rem; display: block;">${p.name}</strong>
              <small style="color: #94a3b8; font-size: 0.75rem;">CPF: ${p.cpf || 'Não informado'}</small>
            </div>
            ${statusBadge}
          </div>
        `;
      });
    }

    // Renderizar Dúvidas Operacionais / FAQ Encontradas
    if (faqMatches.length > 0) {
      html += `<div style="font-size: 0.72rem; font-weight: 800; text-transform: uppercase; color: #f59e0b; letter-spacing: 0.5px; padding: 10px 8px 4px 8px;">❓ Dúvidas Operacionais & Respostas (${faqMatches.length})</div>`;
      faqMatches.slice(0, 3).forEach(f => {
        const { item, module } = f;
        html += `
          <div class="search-result-item" data-type="faq" data-mod-id="${module.id}" style="
            padding: 10px 12px; border-radius: 10px; cursor: pointer; transition: all 0.2s;
            background: rgba(245, 158, 11, 0.08); margin-bottom: 5px; border: 1px solid rgba(245, 158, 11, 0.25);
          " onmouseover="this.style.background='rgba(245, 158, 11, 0.2)'; this.style.borderColor='#f59e0b'" onmouseout="this.style.background='rgba(245, 158, 11, 0.08)'; this.style.borderColor='rgba(245, 158, 11, 0.25)'">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 3px;">
              <strong style="color: #fbbf24; font-size: 0.86rem; display: flex; align-items: center; gap: 8px;">
                <i class="fa-solid fa-circle-question"></i> ${item.q}
              </strong>
              <span style="font-size: 0.65rem; background: rgba(245, 158, 11, 0.2); color: #fcd34d; padding: 2px 7px; border-radius: 8px; font-weight: 700;">
                ${module.title}
              </span>
            </div>
            <p style="color: #cbd5e1; font-size: 0.78rem; margin: 0; line-height: 1.35;">
              ${item.a}
            </p>
          </div>
        `;
      });
    }

    searchResultsContainer.innerHTML = html;
    searchResultsContainer.style.display = 'block';

    // Handler de clique nos resultados
    searchResultsContainer.querySelectorAll('.search-result-item').forEach(item => {
      item.addEventListener('click', () => {
        const itemType = item.dataset.type;
        if (itemType === 'ai_action') {
          const act = item.dataset.action;
          const tgt = item.dataset.target;
          if (act === 'openDoctorModal') {
            switchTab('medicos');
            setTimeout(() => { document.getElementById('btn-open-doctor-modal')?.click(); }, 350);
            if (typeof showManualReturnBeacon === 'function') {
              showManualReturnBeacon({ moduleId: 'medicos', moduleTitle: 'Corpo Clínico', btnName: 'Cadastrar / Incluir Novo Profissional', targetTab: 'medicos' });
            }
          } else if (act === 'openPatientModal') {
            switchTab('pacientes');
            setTimeout(() => { document.getElementById('btn-open-patient-modal')?.click(); }, 350);
            if (typeof showManualReturnBeacon === 'function') {
              showManualReturnBeacon({ moduleId: 'recepcao', moduleTitle: 'Recepção & Pacientes', btnName: '➕ Novo Paciente', targetTab: 'pacientes' });
            }
          } else if (act === 'switchTab') {
            switchTab(tgt);
            if (typeof showManualReturnBeacon === 'function') {
              showManualReturnBeacon({ moduleId: tgt, moduleTitle: tgt, btnName: 'Navegação por IA', targetTab: tgt });
            }
          } else if (act === 'openManual') {
            if (typeof showInteractiveManualModal === 'function') showInteractiveManualModal(tgt);
          }
        } else if (itemType === 'tab') {
          const tabId = item.dataset.tabId;
          switchTab(tabId);
          if (typeof showManualReturnBeacon === 'function') {
            showManualReturnBeacon({ moduleId: tabId, moduleTitle: tabId, btnName: `Módulo: ${tabId}`, targetTab: tabId });
          }
        } else if (itemType === 'btn') {
          const modId = item.dataset.modId;
          const btnName = decodeURIComponent(item.dataset.btnName || '');
          const mod = manualData.find(m => m.id === modId);
          const btn = mod ? mod.buttons.find(b => b.name === btnName) : null;
          if (btn && mod) {
            const navMap = {
              'geral': 'dashboard',
              'agenda': 'agenda',
              'recepcao': 'pacientes',
              'prontuario': 'atendimento',
              'tv': 'tv_panel',
              'estagnacao': 'estagnacao',
              'leitos': 'leitos',
              'kanban': 'kanban',
              'farmacia': 'farmacia',
              'financeiro': 'financeiro',
              'medicos': 'medicos',
              'consultorios': 'consultorios',
              'escalas': 'escalas',
              'relatorios': 'relatorios',
              'configuracoes': 'configuracoes'
            };
            if (navMap[modId]) switchTab(navMap[modId]);
            if (btnName.includes('Cadastrar / Incluir Novo Médico') || btnName.includes('Cadastrar / Incluir Novo Profissional')) {
              setTimeout(() => { document.getElementById('btn-open-doctor-modal')?.click(); }, 350);
            } else if (typeof showCardDetailModal === 'function') {
              showCardDetailModal(btn, mod);
            }

            if (typeof showManualReturnBeacon === 'function') {
              showManualReturnBeacon({
                moduleId: modId,
                moduleTitle: mod.title,
                btnName: btn.name,
                targetTab: navMap[modId] || 'dashboard'
              });
            }
          }
        } else if (itemType === 'patient') {
          switchTab('pacientes');
        } else if (itemType === 'faq') {
          const modId = item.dataset.modId;
          if (typeof showInteractiveManualModal === 'function') {
            showInteractiveManualModal(modId);
          }
        }

        searchResultsContainer.style.display = 'none';
        searchInput.value = '';
      });
    });
  };

  searchInput.addEventListener('input', performSearch);
  searchInput.addEventListener('focus', () => {
    if (searchInput.value.trim()) performSearch();
  });

  // Fechar dropdown ao clicar fora
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.global-search-wrapper')) {
      searchResultsContainer.style.display = 'none';
    }
  });

  // Tecla Atalho Ctrl + K ou Cmd + K para focar na busca
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'K')) {
      e.preventDefault();
      searchInput.focus();
      searchInput.select();
    }
  });
}

// --- CONTROLE DE MUDANÇA DE ABA COM PERMISSÃO (RBAC) & NAVEGAÇÃO DE RETORNO ---
function switchTab(tabName, isBack = false) {
  const perms = getRolePermissions(state.user);
  if (!perms.allowedTabs.includes(tabName)) {
    showCustomAlert({
      title: 'Acesso Restrito',
      message: `Seu perfil (<strong>${perms.label}</strong>) não possui autorização para acessar esta funcionalidade.`,
      type: 'warning'
    });
    return;
  }

  // Expor globalmente para módulos interativos
  window.switchTab = switchTab;
  window.showInteractiveManualModal = showInteractiveManualModal;

  // Registrar histórico de navegação global
  if (!isBack && state.activeTab && state.activeTab !== tabName) {
    if (!state.navHistory) state.navHistory = [];
    if (state.navHistory[state.navHistory.length - 1] !== state.activeTab) {
      state.navHistory.push(state.activeTab);
    }
  }

  state.activeTab = tabName;
  updateGlobalBackButton();

  // Remover notificação de fluxo pendente para esta aba de destino se houver
  const existingFlowToast = document.querySelector(`[data-flow-target-tab="${tabName}"]`);
  if (existingFlowToast) {
    existingFlowToast.style.transform = 'translateX(120%)';
    existingFlowToast.style.opacity = '0';
    setTimeout(() => existingFlowToast.remove(), 300);
  }
  
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
    kanban:        'Kanban de Internação',
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

function updateGlobalBackButton() {
  const backBtn = document.getElementById('global-back-btn');
  const backLabel = document.getElementById('global-back-label');
  if (!backBtn) return;

  const tabShortLabels = {
    dashboard: 'Health Nexus',
    pacientes: 'Pacientes',
    medicos: 'Médicos',
    consultorios: 'Consultórios',
    farmacia: 'Farmácia',
    tv_panel: 'Painel TV',
    agenda: 'Agenda',
    atendimento: 'Atendimentos',
    estagnacao: 'Alertas',
    leitos: 'Leitos',
    kanban: 'Kanban',
    financeiro: 'Financeiro',
    relatorios: 'Relatórios',
    configuracoes: 'Configurações'
  };

  if (state.navHistory && state.navHistory.length > 0) {
    const prevTab = state.navHistory[state.navHistory.length - 1];
    const prevName = tabShortLabels[prevTab] || prevTab;
    if (backLabel) backLabel.textContent = `Voltar para ${prevName}`;
    backBtn.style.display = 'inline-flex';
  } else {
    backBtn.style.display = 'none';
  }
}

function goBack() {
  if (state.navHistory && state.navHistory.length > 0) {
    const prevTab = state.navHistory.pop();
    if (typeof showToast === 'function') {
      showToast(`⬅️ Voltando para a tela anterior...`);
    }
    switchTab(prevTab, true);
  }
}

// --- CONTEÚDO DAS ABAS (ORQUESTRADOR MODULAR HEALTH NEXUS v2.7.2) ---
async function renderTabContent() {
  const contentArea = document.getElementById('main-content');
  if (!contentArea) return;
  
  if (state.activeTab === 'dashboard') {
    await renderDashboardTab(contentArea);
  } else if (state.activeTab === 'pacientes') {
    renderPatientsTab(contentArea);
  } else if (state.activeTab === 'medicos') {
    renderDoctorsTab();
  } else if (state.activeTab === 'escalas') {
    renderSchedulesTab();
  } else if (state.activeTab === 'consultorios') {
    renderConsultingRoomsTab();
  } else if (state.activeTab === 'farmacia') {
    renderPharmacyTab();
  } else if (state.activeTab === 'tv_panel') {
    renderTVPanelTab();
  } else if (state.activeTab === 'agenda') {
    renderAgendaTab();
  } else if (state.activeTab === 'atendimento') {
    renderAttendanceTab(contentArea);
  } else if (state.activeTab === 'estagnacao') {
    renderStagnationTab(contentArea);
  } else if (state.activeTab === 'kanban') {
    if (typeof window.renderKanbanTab === 'function') window.renderKanbanTab();
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
    renderSettingsTab(contentArea);
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

// Catálogo de CID-10
let cidCatalog = [];

// Configurar Autocomplete do CID
window.setupCidAutocomplete = async function setupCidAutocomplete() {
  const input = document.getElementById('pep-assessment');
  const dropdown = document.getElementById('pep-cid-dropdown');
  
  if (!input || !dropdown) return;
  
  // Buscar os CIDs apenas uma vez
  if (cidCatalog.length === 0) {
    const originalPlaceholder = input.placeholder;
    input.placeholder = "Carregando banco de dados CID-10...";
    input.disabled = true;
    try {
      const res = await fetch('/assets/cid10.json');
      if (res.ok) {
        // Forçar decodificação UTF-8 para evitar caracteres estranhos
        const buffer = await res.arrayBuffer();
        const text = new TextDecoder('utf-8').decode(buffer);
        cidCatalog = JSON.parse(text);
      } else {
        console.warn('Falha ao carregar o CID-10:', res.status);
        input.placeholder = "Erro ao carregar CID-10";
      }
    } catch (e) {
      console.warn('Erro na requisição do CID-10:', e);
      input.placeholder = "Erro de conexão CID-10";
    }
    if (cidCatalog.length > 0) {
      input.placeholder = originalPlaceholder;
    }
    input.disabled = false;
  }

  function removeAccents(str) {
    return (str || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  }
  
  input.setAttribute('autocomplete', 'new-password'); // Forçar o navegador a ignorar o autocomplete nativo

  input.addEventListener('input', (e) => {
    const val = e.target.value;
    const term = removeAccents(val.trim());
    dropdown.innerHTML = '';
    
    if (term.length < 2) {
      dropdown.classList.remove('active');
      return;
    }
    
    // cid10.json now has a 'search' field which is pre-normalized
    const matches = cidCatalog.filter(cid => 
      cid.search && cid.search.includes(term)
    );
    
    
    if (matches.length > 0) {
      // Limitar a 50 resultados para evitar travamento da UI
      const maxResults = matches.slice(0, 50);
      maxResults.forEach(cid => {
        const div = document.createElement('div');
        div.className = 'autocomplete-item';
        div.textContent = `${cid.code} - ${cid.description}`;
        div.addEventListener('click', () => {
          input.value = `${cid.code} - ${cid.description}`;
          dropdown.classList.remove('active');
          input.focus();
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

// Modal de Guia Clínico & Referência Médica de Sinais Vitais
window.openVitalDetailModal = function(vitalKey) {
  const VITAL_INFO = {
    pa: {
      title: 'Pressão Arterial (PA)',
      unit: 'mmHg',
      icon: 'fa-gauge-high',
      color: '#60a5fa',
      targetId: 'pep-bp',
      description: 'Mede a força exercida pelo sangue contra as paredes das artérias durante a sístole (contração) e diástole (relaxamento) do coração.',
      normalRange: '120/80 mmHg (Ótima) | 120-129 / <80 (Normal)',
      stages: [
        { label: 'Ótima', range: '< 120 / < 80 mmHg', badgeStyle: 'background:rgba(52,199,89,0.15); color:#34c759; border:1px solid rgba(52,199,89,0.3);', desc: 'Pressão arterial ideal para adultos.' },
        { label: 'Normal', range: '120-129 / 80-84 mmHg', badgeStyle: 'background:rgba(59,130,246,0.15); color:#60a5fa; border:1px solid rgba(59,130,246,0.3);', desc: 'Dentro do padrão fisiológico normal.' },
        { label: 'Pré-Hipertensão', range: '130-139 / 85-89 mmHg', badgeStyle: 'background:rgba(245,158,11,0.15); color:#fbbf24; border:1px solid rgba(245,158,11,0.3);', desc: 'Atenção preventiva e monitoramento.' },
        { label: 'Hipertensão Estágio 1', range: '140-159 / 90-99 mmHg', badgeStyle: 'background:rgba(249,115,22,0.15); color:#fb923c; border:1px solid rgba(249,115,22,0.3);', desc: 'Elevação moderada. Avaliação médica recomendada.' },
        { label: 'Hipertensão Estágio 2/3', range: '≥ 160 / ≥ 100 mmHg', badgeStyle: 'background:rgba(239,68,68,0.15); color:#f87171; border:1px solid rgba(239,68,68,0.3);', desc: 'Crítico. Risco cardiovascular e de lesão de órgão-alvo.' }
      ]
    },
    fc: {
      title: 'Frequência Cardíaca (FC)',
      unit: 'bpm',
      icon: 'fa-heartbeat',
      color: '#f87171',
      targetId: 'pep-hr',
      description: 'Número de batimentos que o coração realiza por minuto (bpm). Indicador vital de estresse e perfusão.',
      normalRange: '60 a 100 bpm (em repouso)',
      stages: [
        { label: 'Bradicardia', range: '< 60 bpm', badgeStyle: 'background:rgba(59,130,246,0.15); color:#60a5fa; border:1px solid rgba(59,130,246,0.3);', desc: 'Ritmo cardíaco reduzido. Comum em atletas ou por medicação.' },
        { label: 'Normocardia', range: '60 - 100 bpm', badgeStyle: 'background:rgba(52,199,89,0.15); color:#34c759; border:1px solid rgba(52,199,89,0.3);', desc: 'Frequência cardíaca ideal em repouso.' },
        { label: 'Taquicardia Leve', range: '101 - 120 bpm', badgeStyle: 'background:rgba(245,158,11,0.15); color:#fbbf24; border:1px solid rgba(245,158,11,0.3);', desc: 'Acelerado. Investigar dor, ansiedade, desidratação ou febre.' },
        { label: 'Taquicardia Grave', range: '> 120 bpm', badgeStyle: 'background:rgba(239,68,68,0.15); color:#f87171; border:1px solid rgba(239,68,68,0.3);', desc: 'Batimentos muito elevados. Risco de choque ou arritmia.' }
      ]
    },
    temp: {
      title: 'Temperatura Corporal (Temp)',
      unit: '°C',
      icon: 'fa-temperature-three-quarters',
      color: '#fbbf24',
      targetId: 'pep-temp',
      description: 'Mede a temperatura corporal interna. Alterações indicam processos infecciosos ou inflamatórios sistêmicos.',
      normalRange: '36.1°C a 37.2°C',
      stages: [
        { label: 'Hipotermia', range: '< 35.5 °C', badgeStyle: 'background:rgba(59,130,246,0.15); color:#60a5fa; border:1px solid rgba(59,130,246,0.3);', desc: 'Perda excessiva de calor corporal.' },
        { label: 'Normotermia (Afebril)', range: '35.5°C - 37.2°C', badgeStyle: 'background:rgba(52,199,89,0.15); color:#34c759; border:1px solid rgba(52,199,89,0.3);', desc: 'Temperatura corporal normal.' },
        { label: 'Subfebril / Febrícula', range: '37.3°C - 37.7°C', badgeStyle: 'background:rgba(245,158,11,0.15); color:#fbbf24; border:1px solid rgba(245,158,11,0.3);', desc: 'Elevação leve. Acompanhar a evolução.' },
        { label: 'Febre (Hipertermia)', range: '37.8°C - 38.9°C', badgeStyle: 'background:rgba(249,115,22,0.15); color:#fb923c; border:1px solid rgba(249,115,22,0.3);', desc: 'Reação imune ativa contra patógenos.' },
        { label: 'Febre Alta / Pirexia', range: '≥ 39.0 °C', badgeStyle: 'background:rgba(239,68,68,0.15); color:#f87171; border:1px solid rgba(239,68,68,0.3);', desc: 'Crítico. Intervenção antitérmica imediata.' }
      ]
    },
    weight: {
      title: 'Peso Corporal (Peso)',
      unit: 'kg',
      icon: 'fa-weight-scale',
      color: '#34d399',
      targetId: 'pep-weight',
      description: 'Massa corporal total. Usado no cálculo de IMC, balanço hídrico e dosagens de medicamentos e anestésicos.',
      normalRange: 'Varia por altura (IMC saudável: 18.5 - 24.9 kg/m²)',
      stages: [
        { label: 'Baixo Peso', range: 'IMC < 18.5', badgeStyle: 'background:rgba(59,130,246,0.15); color:#60a5fa; border:1px solid rgba(59,130,246,0.3);', desc: 'Possível desnutrição ou déficit de massa corporal.' },
        { label: 'Peso Eutrófico (Normal)', range: 'IMC 18.5 - 24.9', badgeStyle: 'background:rgba(52,199,89,0.15); color:#34c759; border:1px solid rgba(52,199,89,0.3);', desc: 'Faixa recomendada pelas diretrizes mundiais.' },
        { label: 'Sobrepeso', range: 'IMC 25.0 - 29.9', badgeStyle: 'background:rgba(245,158,11,0.15); color:#fbbf24; border:1px solid rgba(245,158,11,0.3);', desc: 'Aumento leve de risco metabólico.' },
        { label: 'Obesidade', range: 'IMC ≥ 30.0', badgeStyle: 'background:rgba(239,68,68,0.15); color:#f87171; border:1px solid rgba(239,68,68,0.3);', desc: 'Fator de risco para comorbidades cardiovasculares.' }
      ]
    },
    spo2: {
      title: 'Saturação de Oxigênio (SpO2)',
      unit: '%',
      icon: 'fa-lungs',
      color: '#a78bfa',
      targetId: 'pep-spo2',
      description: 'Mede o percentual de hemoglobina ligada ao oxigênio. Avalia diretamente a capacidade ventilatória pulmonar.',
      normalRange: '95% a 100% em ar ambiente',
      stages: [
        { label: 'Normal / Eupneico', range: '95% - 100%', badgeStyle: 'background:rgba(52,199,89,0.15); color:#34c759; border:1px solid rgba(52,199,89,0.3);', desc: 'Excelente troca gasosa e oxigenação tecidual.' },
        { label: 'Hipóxia Leve', range: '91% - 94%', badgeStyle: 'background:rgba(245,158,11,0.15); color:#fbbf24; border:1px solid rgba(245,158,11,0.3);', desc: 'Desconforto respiratório inicial. Monitorar com atenção.' },
        { label: 'Hipóxia Moderada', range: '86% - 90%', badgeStyle: 'background:rgba(249,115,22,0.15); color:#fb923c; border:1px solid rgba(249,115,22,0.3);', desc: 'Indicação de oxigenoterapia complementar (cateter/máscara).' },
        { label: 'Hipóxia Grave', range: '< 85%', badgeStyle: 'background:rgba(239,68,68,0.15); color:#f87171; border:1px solid rgba(239,68,68,0.3);', desc: 'Emergência médica. Risco iminente de falência respiratória.' }
      ]
    },
    pain: {
      title: 'Escala Visual Analógica da Dor (Dor)',
      unit: '/10',
      icon: 'fa-face-frown-open',
      color: '#f43f5e',
      targetId: 'pep-pain',
      description: 'Mensuração subjetiva da dor relatada pelo paciente, pontuada de 0 (sem dor) a 10 (dor insuportável).',
      normalRange: '0 / 10 (Sem dor)',
      stages: [
        { label: 'Sem Dor', range: '0 / 10', badgeStyle: 'background:rgba(52,199,89,0.15); color:#34c759; border:1px solid rgba(52,199,89,0.3);', desc: 'Conforto total preservado.' },
        { label: 'Dor Leve', range: '1 - 3 / 10', badgeStyle: 'background:rgba(59,130,246,0.15); color:#60a5fa; border:1px solid rgba(59,130,246,0.3);', desc: 'Desconforto leve. Analgésicos de primeira linha.' },
        { label: 'Dor Moderada', range: '4 - 6 / 10', badgeStyle: 'background:rgba(245,158,11,0.15); color:#fbbf24; border:1px solid rgba(245,158,11,0.3);', desc: 'Interfere na concentração/atividades. Analgesia moderada.' },
        { label: 'Dor Intensa', range: '7 - 9 / 10', badgeStyle: 'background:rgba(249,115,22,0.15); color:#fb923c; border:1px solid rgba(249,115,22,0.3);', desc: 'Incapacitante. Analgesia potente/opioides.' },
        { label: 'Dor Insuportável', range: '10 / 10', badgeStyle: 'background:rgba(239,68,68,0.15); color:#f87171; border:1px solid rgba(239,68,68,0.3);', desc: 'Máxima intensidade descrita. Abordagem imediata de emergência.' }
      ]
    }
  };

  const info = VITAL_INFO[vitalKey];
  if (!info) return;

  const currentValEl = document.getElementById(info.targetId);
  const currentVal = currentValEl ? currentValEl.textContent.trim() : '-';

  const existing = document.getElementById('vital-detail-modal');
  if (existing) existing.remove();

  const modal = document.createElement('div');
  modal.id = 'vital-detail-modal';
  modal.className = 'modal-overlay';
  modal.style.display = 'flex';
  modal.style.zIndex = '999999';
  modal.innerHTML = `
    <div class="modal-content" style="max-width: 580px; width: 92%; background: var(--bg-secondary); border: 1px solid var(--border-color); border-radius: 18px; overflow: hidden; box-shadow: 0 25px 60px rgba(0,0,0,0.7);">
      <div class="modal-header" style="padding: 20px 24px; background: linear-gradient(135deg, #1e1b4b, #2e1065); border-bottom: 1px solid var(--border-color); display: flex; justify-content: space-between; align-items: center;">
        <div style="display: flex; align-items: center; gap: 12px;">
          <div style="width: 42px; height: 42px; border-radius: 12px; background: ${info.color}22; border: 1px solid ${info.color}55; display: flex; align-items: center; justify-content: center; color: ${info.color}; font-size: 1.2rem;">
            <i class="fa-solid ${info.icon}"></i>
          </div>
          <div>
            <h3 style="margin: 0; font-family: Outfit, sans-serif; font-size: 1.15rem; font-weight: 700; color: #fff;">${info.title}</h3>
            <span style="font-size: 0.78rem; color: #c4b5fd;">Guia Clínico & Padrões Médicos Normais</span>
          </div>
        </div>
        <button type="button" class="modal-close" onclick="document.getElementById('vital-detail-modal').remove()" style="background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.15); color: #fff; width: 34px; height: 34px; border-radius: 50%; display: flex; align-items: center; justify-content: center; cursor: pointer;">
          <i class="fa-solid fa-xmark"></i>
        </button>
      </div>

      <div class="modal-body" style="padding: 24px; overflow-y: auto; max-height: 75vh; display: flex; flex-direction: column; gap: 20px;">
        <div style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 14px; padding: 16px 20px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px;">
          <div>
            <div style="font-size: 0.76rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase;">Medição Registrada no Paciente</div>
            <div style="font-size: 1.6rem; font-weight: 800; color: #fff; font-family: 'JetBrains Mono', monospace; margin-top: 4px;">
              ${currentVal} <span style="font-size: 0.9rem; color: var(--text-muted); font-weight: 500;">${info.unit}</span>
            </div>
          </div>
          <div style="text-align: right;">
            <div style="font-size: 0.75rem; color: var(--text-muted); margin-bottom: 4px;">Padrão Clínico Ideal</div>
            <span style="font-size: 0.8rem; font-weight: 700; background: rgba(52,199,89,0.15); color: #34c759; border: 1px solid rgba(52,199,89,0.3); padding: 4px 10px; border-radius: 12px; display: inline-block;">
              ${info.normalRange}
            </span>
          </div>
        </div>

        <div style="font-size: 0.88rem; line-height: 1.6; color: var(--text-primary); background: rgba(0,0,0,0.2); padding: 14px 16px; border-radius: 10px; border-left: 4px solid ${info.color};">
          <strong style="color: ${info.color}; display: block; margin-bottom: 4px;"><i class="fa-solid fa-book-medical"></i> Definição Fisiológica:</strong>
          ${info.description}
        </div>

        <div>
          <h4 style="font-family: Outfit, sans-serif; font-size: 0.92rem; font-weight: 700; color: #fff; margin: 0 0 12px; display: flex; align-items: center; gap: 8px;">
            <i class="fa-solid fa-list-check" style="color: #a78bfa;"></i> Tabela de Classificação e Intervalos Médicos
          </h4>
          <div style="display: flex; flex-direction: column; gap: 8px;">
            ${info.stages.map(st => `
              <div style="background: var(--bg-tertiary); border: 1px solid var(--border-color); border-radius: 10px; padding: 10px 14px; display: flex; justify-content: space-between; align-items: center; gap: 12px; flex-wrap: wrap;">
                <div style="flex: 1; min-width: 140px;">
                  <span style="font-size: 0.78rem; font-weight: 700; padding: 3px 8px; border-radius: 8px; ${st.badgeStyle}">
                    ${st.label}
                  </span>
                  <div style="font-size: 0.78rem; color: var(--text-secondary); margin-top: 4px;">${st.desc}</div>
                </div>
                <div style="font-size: 0.88rem; font-weight: 800; color: #fff; font-family: monospace;">
                  ${st.range}
                </div>
              </div>
            `).join('')}
          </div>
        </div>

        <div style="border-top: 1px solid var(--border-color); padding-top: 16px; margin-top: 4px;">
          <label style="font-size: 0.8rem; font-weight: 700; color: var(--text-primary); display: block; margin-bottom: 8px;">
            <i class="fa-solid fa-pen-to-square" style="color: #34d399;"></i> Atualizar ou Informar Valor no Prontuário (${info.unit}):
          </label>
          <div style="display: flex; gap: 10px;">
            <input type="text" id="vital-quick-input" class="form-input" style="flex: 1; font-size: 0.9rem;" placeholder="Digite o novo valor (ex: ${info.unit === 'mmHg' ? '120/80' : '36.5'})..." value="${currentVal !== '-' ? currentVal : ''}">
            <button type="button" class="btn btn-primary" onclick="updateVitalValueInPEP('${info.targetId}')" style="font-size: 0.82rem; padding: 8px 16px;">
              <i class="fa-solid fa-floppy-disk"></i> Salvar Valor
            </button>
          </div>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(modal);
};

window.updateVitalValueInPEP = function(targetId) {
  const val = document.getElementById('vital-quick-input').value.trim();
  const targetEl = document.getElementById(targetId);
  if (targetEl) {
    targetEl.textContent = val || '-';
    showToast('Sinal vital atualizado no prontuário!');
  }
  const modal = document.getElementById('vital-detail-modal');
  if (modal) modal.remove();
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
      if (typeof window.showFlowCompletionNotification === 'function') {
        window.showFlowCompletionNotification({
          actionTitle: 'Atendimento Finalizado',
          message: 'O prontuário foi assinado eletronicamente e a consulta foi concluída.',
          targetTab: 'atendimento',
          targetTabLabel: 'Prontuário (Atendimentos Médicos)'
        });
      } else {
        showToast('Prontuário assinado e finalizado com sucesso!');
      }
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
        const roomApts = appointments.filter(a => (a.roomName === r.name || a.room === r.name));
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
    
    const roomApts = appointments.filter(a => (a.roomName === roomName || a.room === roomName));
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
                
                <div style="display:flex; gap:10px; margin-top:15px; padding-top:15px; border-top:1px solid rgba(99,102,241,0.2);">
                  <button class="btn btn-secondary btn-open-pep-direct" onclick="document.getElementById('consultorio-details-modal').remove(); window.openPEPModal('${inProgress.id}')" style="flex:1; display:flex; justify-content:center; align-items:center; gap:6px;">
                    <i class="fa-solid fa-file-medical"></i> Abrir PEP / Prontuário
                  </button>
                  <button class="btn btn-primary" onclick="finishConsultation('${inProgress.id}', '${roomName}')" style="flex:1; display:flex; justify-content:center; align-items:center; gap:6px;">
                    <i class="fa-solid fa-check"></i> Finalizar Consulta
                  </button>
                </div>
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

window.finishConsultation = async function(appointmentId, roomName) {
  if (!confirm(`Deseja concluir o atendimento atual no ${roomName}?`)) return;
  try {
    const res = await apiFetch(`/api/appointments/${appointmentId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'Concluído' })
    });
    
    if (res.ok) {
      document.getElementById('consultorio-details-modal')?.remove();
      
      showFlowCompletionNotification({
        title: 'CONSULTA FINALIZADA',
        patientName: '',
        targetTab: 'consultorios',
        targetColumn: null,
        message: `O atendimento foi marcado como <strong>Concluído</strong> e o ${roomName} está livre para o próximo paciente.`,
        icon: '<i class="fa-solid fa-check-double" style="color: #10b981;"></i>',
        btnText: 'FECHAR'
      });
      
      loadConsultingRooms();
      loadKanbanData(); // Atualiza também o Kanban para tirar do 'Em Atendimento'
    } else {
      showCustomAlert({ title: 'Erro', message: 'Falha ao concluir atendimento.', type: 'error' });
    }
  } catch (e) {
    showCustomAlert({ title: 'Erro', message: 'Erro de conexão.', type: 'error' });
  }
};

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

export {
  switchTab,
  exportToPDF,
  renderTabContent,
  loadConsultingRooms,
  openRoomModal,
  deleteRoom,
  saveRoom
};

// Expondo variáveis utilizadas em onclicks (movidas de tv.js)
window.saveRoom = saveRoom;
window.deleteRoom = deleteRoom;
window.openRoomModal = openRoomModal;
window.openConsultorioDetailsModal = openConsultorioDetailsModal;

// --- INICIALIZAÇÃO AUTOMÁTICA DA APLICAÇÃO ---
// Start app immediately (module execution is already deferred until DOM is parsed)
initializeApp();




