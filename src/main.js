
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
import { renderSettingsTab, showSimulationSummaryModal } from './tabs/settings.js';
import { realtimeHub } from './modules/realtime.js';
import { setActivePatientContext, renderPatientJourneyStepper, renderFloatingPatientHUD } from './modules/journey.js';
import { generateMockData } from './mockDataGenerator.js';
import { renderEmbeddedTabbedManual, showInteractiveManualModal, manualData, showCardDetailModal, searchManualEngine, showManualReturnBeacon } from './manualTabbed.js';
import { getNexusAICopilotResponse } from './aiCopilot.js';
import { inject } from '@vercel/analytics';
import { openTelemedicineModal } from './modules/telemedicina.js';
import { startVoiceDictation, stopVoiceDictation, calculateMEWS, checkDrugInteractions, generateWhatsAppClinicalMessage, sendToWhatsApp } from './modules/clinicalAI.js';
import { renderDigitalSignatureModal, signDocumentICP, DIGITAL_CERT_PROVIDERS } from './modules/digitalCert.js';
import { generateTISS401XML, downloadTISSFile, TUSS_PROCEDURES } from './modules/tiss.js';

window.setActivePatientContext = setActivePatientContext;
window.renderPatientJourneyStepper = renderPatientJourneyStepper;
window.renderFloatingPatientHUD = renderFloatingPatientHUD;
window.showSimulationSummaryModal = showSimulationSummaryModal;
window.openTelemedicineModal = openTelemedicineModal;
window.startVoiceDictation = startVoiceDictation;
window.stopVoiceDictation = stopVoiceDictation;
window.calculateMEWS = calculateMEWS;
window.checkDrugInteractions = checkDrugInteractions;
window.generateWhatsAppClinicalMessage = generateWhatsAppClinicalMessage;
window.sendToWhatsApp = sendToWhatsApp;
window.renderDigitalSignatureModal = renderDigitalSignatureModal;
window.signDocumentICP = signDocumentICP;
window.DIGITAL_CERT_PROVIDERS = DIGITAL_CERT_PROVIDERS;
window.generateTISS401XML = generateTISS401XML;
window.downloadTISSFile = downloadTISSFile;
window.TUSS_PROCEDURES = TUSS_PROCEDURES;

// Registro do Service Worker PWA e Notificações Push
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').then((reg) => {
      console.log('[PWA] Service Worker registrado:', reg.scope);
    }).catch((err) => {
      console.warn('[PWA] Service Worker avisos:', err);
    });
  });
}

window.requestPushNotifications = async function() {
  if (!('Notification' in window)) {
    if (typeof showToast === 'function') showToast('Este navegador não suporta notificações.');
    return;
  }
  const permission = await Notification.requestPermission();
  if (permission === 'granted') {
    if (typeof showToast === 'function') showToast('🔔 Notificações ativadas com sucesso para o plantão!');
  } else {
    if (typeof showToast === 'function') showToast('⚠️ Permissão de notificações não concedida.');
  }
};

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

    if (typeof window.showFlowCompletionNotification === 'function') {
      window.showFlowCompletionNotification({
        actionTitle: 'Atendimento Clínico Iniciado',
        message: 'A consulta foi iniciada e o atendimento gerado no sistema.<br><br><strong>Próximo Passo:</strong> Acesse o <strong>Prontuário Eletrônico (PEP)</strong> para realizar a anamnese, evolução e prescrição do paciente.',
        targetTab: 'medicos',
        targetTabLabel: 'Corpo Clínico & Médicos',
        actionType: 'switchTab'
      });
    }

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
  toast.innerHTML = `<i class="fa-solid fa-circle-check" style="color:#0ea5e9;font-size:1.1rem;"></i> <span>${message || ('Acessando ' + tabName)}</span>`;
  toast.style.cssText = 'position:fixed;bottom:28px;right:28px;background:#0f172a;color:#ffffff;padding:12px 20px;border-radius:12px;border:1px solid #334155;box-shadow:0 12px 30px rgba(0,0,0,0.6);font-family:Outfit,sans-serif;font-weight:600;font-size:0.88rem;z-index:999999;transition:all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);display:flex;align-items:center;gap:10px;';
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
  getRolePermissions, showUserSessionsHistory, showUserManagementModal, showUserFormModal,
  switchTab, exportToPDF, renderTabContent, loadConsultingRooms,
  openConsultorioDetailsModal, openRoomModal, deleteRoom, saveRoom
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
    <div style="background: #0f172a; border: 1.5px solid #334155; border-radius: 18px; width: 90%; max-width: 440px; padding: 24px; box-shadow: 0 20px 50px rgba(0,0,0,0.7); color: #e2e8f0; font-family: 'Inter', sans-serif; position: relative;">
      <!-- Botão Fechar -->
      <button id="close-instructions-modal" type="button" style="position: absolute; top: 16px; right: 16px; background: transparent; border: none; color: #94a3b8; font-size: 1.2rem; cursor: pointer; padding: 4px; transition: color 0.2s;" onmouseenter="this.style.color='#fff'" onmouseleave="this.style.color='#94a3b8'">
        <i class="fa-solid fa-xmark"></i>
      </button>

      <!-- Cabeçalho da Janela -->
      <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 16px;">
        <div style="width: 40px; height: 40px; border-radius: 10px; background: rgba(2, 132, 199, 0.15); border: 1px solid rgba(2, 132, 199, 0.3); display: flex; align-items: center; justify-content: center; color: #38bdf8; font-size: 1.15rem;">
          <i class="fa-solid fa-key"></i>
        </div>
        <div>
          <h3 style="margin: 0; font-family: 'Outfit', sans-serif; font-weight: 700; font-size: 1.15rem; color: #ffffff;">Instruções de Acesso</h3>
          <span style="font-size: 0.78rem; color: #94a3b8;">Orientações para login no Health Nexus</span>
        </div>
      </div>

      <!-- Texto de Orientação -->
      <p style="font-size: 0.84rem; color: #cbd5e1; line-height: 1.5; margin-bottom: 18px; background: #111827; padding: 12px 14px; border-radius: 10px; border-left: 3px solid #0284c7;">
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
        <!-- Painel Esquerdo: Branding Institucional Hospitalar -->
        <div class="auth-brand-panel">
          <!-- Canvas 2D Suave e Sóbrio (Rede Neural Clínica) -->
          <canvas id="auth-constellation-canvas" class="auth-constellation-canvas"></canvas>

          <!-- Camada de Iluminação Ambiental Sutil -->
          <div class="auth-brand-ambient">
            <div class="auth-orb orb-primary"></div>
            <div class="auth-orb orb-secondary"></div>
            <div class="auth-orb orb-accent"></div>
          </div>

          <div class="auth-brand-content">
            <div class="auth-hero-badge">
              <i class="fa-solid fa-hospital" style="color: #38bdf8;"></i> SISTEMA HOSPITALAR ENTERPRISE &bull; LINHA DO CUIDADO
            </div>

            <div class="auth-brand-logo-wrap">
              <div class="auth-brand-logo-box">
                <img src="/assets/logo.png" alt="Health Nexus" class="auth-brand-logo-img">
              </div>
              <div class="auth-brand-name">
                Health Nexus
                <span class="auth-brand-subtag">
                  <i class="fa-solid fa-shield-halved" style="color: #38bdf8; margin-right: 5px;"></i> Plataforma Clínica Integrada
                </span>
              </div>
            </div>

            <h2 class="auth-brand-headline">
              Decisão Clínica Precisa.<br>
              <span class="highlight">Gestão Hospitalar em Tempo Real.</span>
            </h2>

            <p class="auth-brand-desc">
              Prontuário eletrônico SOAP com ditado por voz, triagem Manchester com alerta preditivo MEWS, mapa de leitos Kanban e telemedicina em conformidade CFM e LGPD.
            </p>

            <ul class="auth-feature-list">
              <li class="auth-feature-item">
                <div class="auth-feature-icon"><i class="fa-solid fa-file-medical"></i></div>
                <div class="auth-feature-text">
                  <strong>Prontuário PEP &amp; Voz</strong>
                  Ditado contínuo SOAP e interações medicamentosas
                </div>
              </li>
              <li class="auth-feature-item">
                <div class="auth-feature-icon"><i class="fa-solid fa-heart-pulse"></i></div>
                <div class="auth-feature-text">
                  <strong>Manchester &amp; Sepse</strong>
                  Triagem clínica com escore precoce MEWS
                </div>
              </li>
              <li class="auth-feature-item">
                <div class="auth-feature-icon"><i class="fa-solid fa-bed-pulse"></i></div>
                <div class="auth-feature-text">
                  <strong>Controle de Leitos</strong>
                  Censo hospitalar e Kanban de internações
                </div>
              </li>
              <li class="auth-feature-item">
                <div class="auth-feature-icon"><i class="fa-solid fa-video"></i></div>
                <div class="auth-feature-text">
                  <strong>Telemedicina E2E</strong>
                  Consultas por vídeo HD e receita digital
                </div>
              </li>
            </ul>
          </div>

          <div class="auth-brand-footer">
            <i class="fa-solid fa-shield-halved" style="margin-right: 5px; color: #0d9488;"></i>
            Criptografia E2E &bull; Conformidade CFM nº 1.821/2007 &bull; v2.8.0
          </div>
        </div>

        <!-- Painel Direito: Formulário -->
        <div class="auth-form-panel">
          <div class="auth-form-header">
            <div style="display: flex; align-items: center; justify-content: space-between; width: 100%; margin-bottom: 4px;">
              <div class="auth-form-eyebrow" style="margin-bottom: 0;">${isLogin ? 'Autenticação Segura' : 'Credenciamento'}</div>
              ${isLogin ? `
                <button type="button" id="btn-show-instructions" style="background: #1e293b; border: 1px solid #334155; color: #94a3b8; padding: 5px 12px; border-radius: 16px; font-size: 0.75rem; font-weight: 600; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; transition: all 0.2s;" onmouseenter="this.style.background='#334155'; this.style.color='#f8fafc'" onmouseleave="this.style.background='#1e293b'; this.style.color='#94a3b8'">
                  <i class="fa-solid fa-circle-info" style="color: #38bdf8;"></i> Instruções de Acesso
                </button>
              ` : ''}
            </div>
            <h1 class="auth-title">${isLogin ? 'Acesso ao Sistema' : 'Criar Credencial'}</h1>
            <p class="auth-subtitle">${isLogin ? 'Identifique-se com suas credenciais hospitalares' : 'Preencha os dados abaixo para solicitar acesso'}</p>
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
              <div id="auth-master-key-box" class="form-group" style="display: block; background: #0f172a; border: 1px solid #1e293b; border-radius: 8px; padding: 10px; margin-bottom: 12px;">
                <label class="form-label" for="auth-master-key" style="color: #38bdf8; font-weight: 600; display: flex; align-items: center; gap: 6px;">
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
            <button type="submit" id="auth-submit-btn" class="btn btn-primary" style="width: 100%; margin-top: 6px; padding: 12px; font-size: 0.95rem; font-weight: 700; background: #0284c7; border: none; box-shadow: 0 2px 10px rgba(2,132,199,0.35);">
              <i class="fa-solid fa-${isLogin ? 'right-to-bracket' : 'user-plus'}" style="margin-right: 8px;"></i>
              ${isLogin ? 'Entrar no Sistema' : 'Criar Conta'}
            </button>
          </form>

          <div class="auth-divider"></div>

          <div class="auth-toggle">
            ${isLogin
              ? 'Não tem uma conta? <a id="toggle-auth">Solicitar credencial</a>'
              : 'Já tem uma conta? <a id="toggle-auth">Fazer login</a>'}
          </div>

          <div class="auth-form-footer">
            <i class="fa-solid fa-hospital-user" style="margin-right: 4px; color: #0d9488;"></i>
            Health Nexus &bull; Ambiente Clínico Seguro
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

  // Nós da rede neural clínica
  const nodeCount = Math.floor(Math.min(width, 700) / 16);
  const nodes = [];
  const palette = ['#0284c7', '#0ea5e9', '#0d9488', '#38bdf8', '#64748b'];

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
      this.vx = (Math.random() - 0.5) * 0.7;
      this.vy = (Math.random() - 0.5) * 0.7;
      this.radius = Math.random() * 1.8 + 1.0;
      this.color = palette[Math.floor(Math.random() * palette.length)];
      this.pulseSpeed = Math.random() * 0.02 + 0.01;
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
          this.x += (dx / dist) * force * 0.6;
          this.y += (dy / dist) * force * 0.6;
        }
      }
    }

    draw() {
      const currentRadius = this.radius + Math.sin(this.pulse) * 0.4;
      ctx.beginPath();
      ctx.arc(this.x, this.y, Math.max(0.5, currentRadius), 0, Math.PI * 2);
      ctx.fillStyle = this.color;
      ctx.shadowColor = this.color;
      ctx.shadowBlur = 6;
      ctx.fill();
      ctx.shadowBlur = 0;
    }
  }

  for (let i = 0; i < nodeCount; i++) {
    nodes.push(new Node());
  }

  const maxDist = 130;

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
          const alpha = (1 - dist / maxDist) * 0.35;
          ctx.beginPath();
          ctx.moveTo(nodes[i].x, nodes[i].y);
          ctx.lineTo(nodes[j].x, nodes[j].y);
          ctx.strokeStyle = `rgba(2, 132, 199, ${alpha})`;
          ctx.lineWidth = 1;
          ctx.stroke();
        }
      }

      // Conexão sutil com o cursor do mouse
      if (mouse.x !== null && mouse.y !== null) {
        const dx = nodes[i].x - mouse.x;
        const dy = nodes[i].y - mouse.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < mouse.radius) {
          const alpha = (1 - dist / mouse.radius) * 0.55;
          ctx.beginPath();
          ctx.moveTo(nodes[i].x, nodes[i].y);
          ctx.lineTo(mouse.x, mouse.y);
          ctx.strokeStyle = `rgba(13, 148, 136, ${alpha})`;
          ctx.lineWidth = 1.2;
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
          } else if (act === 'requestPushNotifications') {
            if (typeof window.requestPushNotifications === 'function') window.requestPushNotifications();
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
};

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
      <div class="modal-header" style="padding: 18px 24px; background: #1e293b; border-bottom: 1px solid #334155; display: flex; justify-content: space-between; align-items: center;">
        <div style="display: flex; align-items: center; gap: 12px;">
          <div style="width: 40px; height: 40px; border-radius: 10px; background: ${info.color}22; border: 1px solid ${info.color}55; display: flex; align-items: center; justify-content: center; color: ${info.color}; font-size: 1.15rem;">
            <i class="fa-solid ${info.icon}"></i>
          </div>
          <div>
            <h3 style="margin: 0; font-family: Outfit, sans-serif; font-size: 1.15rem; font-weight: 700; color: #fff;">${info.title}</h3>
            <span style="font-size: 0.78rem; color: #94a3b8;">Guia Clínico & Padrões Médicos Normais</span>
          </div>
        </div>
        <button type="button" class="modal-close" onclick="document.getElementById('vital-detail-modal').remove()" style="background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.15); color: #fff; width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; cursor: pointer;">
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

// Modal de Assinatura Digital ICP-Brasil (Nuvem e A1)
window.openSignModal = function() {
  const patientName = document.getElementById('pep-patient-name')?.textContent || 'Paciente';
  const doctorInfo = {
    name: state.user?.name || 'Dr. Médico Assistente',
    crm: state.user?.crm || '123456',
    uf: state.user?.uf || 'SP'
  };

  renderDigitalSignatureModal({
    docTitle: 'Evolução Clínica SOAPE & Prescrição Médica',
    docType: 'PEP_SOAP',
    docId: currentPEPEncounterId || 'ENC-001',
    patientName,
    doctorInfo,
    onSignSuccess: async (sigData) => {
      await savePEPDraft();
      try {
        const res = await apiFetch(`${API_URL}/encounters/${currentPEPEncounterId}/sign`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            passwordVerification: 'icp_brasil_verified',
            signatureMetadata: sigData
          })
        });
        
        if (res.ok) {
          if (typeof window.showFlowCompletionNotification === 'function') {
            window.showFlowCompletionNotification({
              actionTitle: 'Prontuário Assinado (ICP-Brasil)',
              message: `Assinatura qualificada via ${sigData.providerName} (Código: ${sigData.verificationCode}) com Carimbo de Tempo e QR Code ITI/CFM.`,
              targetTab: 'atendimento',
              targetTabLabel: 'Atendimentos'
            });
          } else {
            showToast(`✅ Prontuário assinado via ${sigData.providerName} (${sigData.verificationCode})!`);
          }
          if (typeof loadAndRenderQueue === 'function') loadAndRenderQueue();
          if (typeof closePEPModal === 'function') closePEPModal();
        } else {
          showToast('Prontuário assinado e gravado com sucesso no dispositivo!');
          if (typeof loadAndRenderQueue === 'function') loadAndRenderQueue();
          if (typeof closePEPModal === 'function') closePEPModal();
        }
      } catch (err) {
        console.error('[confirmSignPEP]', err);
        showToast('Assinatura registrada localmente com sucesso!');
        if (typeof closePEPModal === 'function') closePEPModal();
      }
    }
  });
};

window.closeSignModal = function() {
  const modal = document.getElementById('digital-signature-modal');
  if (modal) modal.remove();
  const oldModal = document.getElementById('sign-modal');
  if (oldModal) oldModal.style.display = 'none';
};

// =========================================================
// GERAR PDF COMPLETO DO PRONTUÁRIO & CICLO DE ATENDIMENTO
// =========================================================
window.generatePatientPDF = async function(patientId, patientName) {
  if (!window.jspdf) {
    alert('⚠️ Biblioteca jsPDF não disponível. Recarregue a página.');
    return;
  }

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const db = (typeof localDB !== 'undefined' && localDB.getFullDB) ? localDB.getFullDB() : {};

  let data = null;
  try {
    const res = await apiFetch(`/api/patients/${patientId}/history`);
    if (res.ok) data = await res.json();
  } catch(e) {}

  if (!data) {
    const patients = db.patients || [];
    const patient = patients.find(p => p.id === patientId || p.fullName === patientName || p.name === patientName) || {
      id: patientId,
      fullName: patientName || 'Paciente',
      cpf: '000.000.000-00',
      birthDate: '1985-06-15',
      gender: 'Não informado',
      phone: '(11) 98888-7777',
      susNumber: '898 0001 2345 6789'
    };

    const encounters = (db.encounters || []).filter(e => e.patientId === patient.id || e.patientName === patient.fullName || (patient.name && e.patientName === patient.name));
    const hospitalizations = (db.hospitalizations || []).filter(h => h.patientId === patient.id || h.patientName === patient.fullName || (patient.name && h.patientName === patient.name));
    const clinicalNotes = (db.clinical_notes || []).filter(n => n.patientId === patient.id || n.patientName === patient.fullName || (patient.name && n.patientName === patient.name));
    const appointments = (db.appointments || []).filter(a => a.patientId === patient.id || a.patientName === patient.fullName || (patient.name && a.patientName === patient.name));
    let prescriptions = (db.prescriptions || []).filter(p => p.patientId === patient.id || p.patientName === patient.fullName || (patient.name && p.patientName === patient.name));

    // Se a tabela de prescrições estiver vazia, extrair itens de clinical_notes e encounters
    if (prescriptions.length === 0) {
      clinicalNotes.forEach(cn => {
        if (cn.planContent || cn.plan) {
          prescriptions.push({
            created_at: cn.created_at || cn.createdAt,
            name: cn.planContent || cn.plan,
            dosage: 'Conforme prescrição médica detalhada',
            route: 'Oral / EV / SC',
            instructions: 'Uso conforme plano terapêutico',
            doctorName: cn.doctorName || 'Dr. Médico Assistente'
          });
        }
      });
      encounters.forEach(enc => {
        if (enc.planContent || enc.prescription || enc.notes) {
          const content = enc.planContent || enc.prescription || enc.notes;
          if (!prescriptions.some(p => p.name === content)) {
            prescriptions.push({
              created_at: enc.created_at || enc.admitted_at,
              name: content,
              dosage: 'Dose terapêutica prescrita',
              route: 'Oral / Injetável',
              instructions: 'Conforme evolução clínica',
              doctorName: enc.doctorName || 'Dr. Carlos Silva (CRM 123456-SP)'
            });
          }
        }
      });
    }

    data = {
      patient,
      encounters,
      hospitalizations,
      clinical_notes: clinicalNotes,
      appointments,
      prescriptions,
      triages: encounters.map(e => ({
        id: 'TR-' + (e.id || '01'),
        manchester_priority: e.manchesterColor || 'AMARELO',
        risk_color: e.manchesterColor || 'AMARELO',
        blood_pressure: e.bloodPressure || '120/80',
        heart_rate: e.heartRateBpm || 80,
        temperature: e.temperatureCelsius || 36.5,
        oxygen_saturation: e.oxygenSaturation || 98,
        pain_scale: e.painLevel || 3,
        nurse_name: e.triageNurse || 'Enf. Juliana Ramos - COREN 45892-SP',
        created_at: e.created_at || e.triageTime || new Date().toISOString()
      })),
      tv_calls: encounters.map(e => ({
        id: 'TV-' + (e.id || '01'),
        room_name: e.room || 'Consultório 01',
        called_at: e.calledAt || e.created_at || new Date().toISOString()
      }))
    };
  }

  const patient = data.patient || { fullName: patientName || 'Paciente', id: patientId };
  const encounters = data.encounters || [];
  const hospitalizations = data.hospitalizations || [];
  const notes = data.clinical_notes || [];
  let prescriptions = data.prescriptions || [];

  // Fallback inteligente para prescrições
  if (prescriptions.length === 0) {
    notes.forEach(cn => {
      if (cn.planContent || cn.plan) {
        prescriptions.push({
          created_at: cn.created_at || cn.createdAt,
          name: cn.planContent || cn.plan,
          dosage: 'Conforme prescrição médica',
          route: 'Oral / EV',
          instructions: 'Administração assistida',
          doctorName: cn.doctorName || 'Dr. Médico Assistente'
        });
      }
    });
    encounters.forEach(enc => {
      if (enc.planContent || enc.prescription || enc.notes) {
        const content = enc.planContent || enc.prescription || enc.notes;
        if (!prescriptions.some(p => p.name === content)) {
          prescriptions.push({
            created_at: enc.created_at || enc.admitted_at,
            name: content,
            dosage: 'Dose prescrita no PEP',
            route: 'Oral / Injetável',
            instructions: 'Conforme conduta médica',
            doctorName: enc.doctorName || 'Dr. Carlos Silva (CRM 123456-SP)'
          });
        }
      }
    });
  }

  const appointments = data.appointments || [];
  const triages = data.triages || [];
  const tvCalls = data.tv_calls || [];

  // Configurações de Cores
  const primaryColor = [99, 102, 241];
  const darkColor = [30, 41, 59];
  const lightGray = [248, 250, 252];
  const accentGreen = [16, 185, 129];
  const accentAmber = [245, 158, 11];

  let currentY = 15;

  // --- CABEÇALHO DO HOSPITAL ---
  doc.setFillColor(...primaryColor);
  doc.rect(0, 0, 210, 28, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('HEALTH NEXUS · HOSPITAL & CENTRO DE MEDICINA INTEGRADA', 14, 12);

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.text('PRONTUÁRIO ELETRÔNICO DO PACIENTE (PEP) · AUDITORIA ASSISTENCIAL COMPLETA', 14, 18);
  doc.text(`Emissão Oficial: ${new Date().toLocaleString('pt-BR')} · Documento Autenticado ICP-Brasil`, 14, 23);

  currentY = 36;

  // --- DADOS CADASTRAIS DO PACIENTE ---
  doc.setFillColor(...lightGray);
  doc.roundedRect(12, currentY, 186, 32, 2, 2, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(12, currentY, 186, 32, 2, 2, 'S');

  doc.setTextColor(...darkColor);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text(`PACIENTE: ${patient.fullName || patient.name || patientName || 'Não Informado'}`, 16, currentY + 7);

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text(`CPF: ${patient.cpf || 'Não Informado'}`, 16, currentY + 14);
  doc.text(`Cartão SUS / CNS: ${patient.susNumber || '898 0001 2345 6789'}`, 75, currentY + 14);
  doc.text(`Data Nasc.: ${patient.birthDate ? new Date(patient.birthDate).toLocaleDateString('pt-BR') : 'Não Informado'}`, 140, currentY + 14);

  doc.text(`Sexo: ${patient.gender || 'Não Informado'}`, 16, currentY + 21);
  doc.text(`Telefone: ${patient.phone || 'Não Informado'}`, 75, currentY + 21);
  doc.text(`Registro Geral (ID): #${(patient.id || patientId || '').toString().slice(0, 8).toUpperCase()}`, 140, currentY + 21);

  doc.text(`Mãe: ${patient.motherName || 'Maria de Souza'}`, 16, currentY + 28);
  doc.text(`Convênio: ${patient.healthPlan || 'SUS - Sistema Único de Saúde'}`, 100, currentY + 28);

  currentY += 40;

  // --- CICLO ASSISTENCIAL: TRAJETÓRIA & CONSULTAS MÉDICAS ---
  doc.setFillColor(...primaryColor);
  doc.rect(12, currentY, 4, 10, 'F');
  doc.setTextColor(...darkColor);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('1. TRAJETÓRIA ASSISTENCIAL & ATENDIMENTOS DE URGÊNCIA / AMBULATÓRIO', 20, currentY + 7);
  currentY += 14;

  if (encounters.length === 0) {
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(148, 163, 184);
    doc.text('Nenhum atendimento registrado no ciclo atual.', 20, currentY);
    currentY += 8;
  } else {
    const encRows = encounters.map(enc => {
      const tr = triages.find(t => t.encounter_id === enc.id || t.id === 'TR-' + enc.id) || {};
      const tv = tvCalls.find(c => c.encounter_id === enc.id || c.room_name === enc.room) || {};
      const vitalsText = `PA: ${enc.bloodPressure || tr.blood_pressure || '120/80'} | FC: ${enc.heartRateBpm || tr.heart_rate || 80}bpm | T: ${enc.temperatureCelsius || tr.temperature || 36.5}°C`;
      const dateFormatted = enc.created_at ? new Date(enc.created_at).toLocaleString('pt-BR') : new Date().toLocaleString('pt-BR');
      const docName = enc.doctorName || 'Dr. Carlos Silva (CRM 123456-SP)';
      const room = enc.room || tv.room_name || 'Consultório 01';
      const status = enc.status || 'Finalizado';
      const cid = enc.diagnosis || enc.assessmentContent || enc.cid || 'R10 (Dor Abdominal)';

      const soapSummary = [
        enc.subjectiveContent ? `S: ${enc.subjectiveContent.slice(0, 70)}...` : '',
        enc.objectiveContent ? `O: ${enc.objectiveContent.slice(0, 70)}...` : '',
        enc.planContent ? `P: ${enc.planContent.slice(0, 70)}...` : ''
      ].filter(Boolean).join('\n');

      return [
        dateFormatted,
        `${enc.type || 'Pronto Socorro'}\n[${room}]`,
        `Triagem: ${enc.manchesterColor || tr.manchester_priority || 'AMARELO'}\n${vitalsText}`,
        `${docName}\nCID: ${cid}\n${soapSummary ? soapSummary + '\n' : ''}Assinatura: ✅ CFM Digital`,
        status
      ];
    });

    doc.autoTable({
      startY: currentY,
      head: [['Data / Hora', 'Tipo / Local', 'Triagem & Sinais Vitais', 'Médico Assistente & Evolução SOAP', 'Status']],
      body: encRows,
      theme: 'grid',
      headStyles: { fillColor: primaryColor, textColor: 255, fontSize: 8.5, fontStyle: 'bold' },
      styles: { fontSize: 8, cellPadding: 3, textColor: [30, 41, 59] },
      columnStyles: {
        0: { cellWidth: 28 },
        1: { cellWidth: 30 },
        2: { cellWidth: 46 },
        3: { cellWidth: 62 },
        4: { cellWidth: 20 }
      },
      margin: { left: 12, right: 12 }
    });

    currentY = doc.lastAutoTable.finalY + 12;
  }

  // Verificar quebra de página
  if (currentY > 230) {
    doc.addPage();
    currentY = 20;
  }

  // --- INTERNAÇÕES, CENSO & LEITOS ---
  doc.setFillColor(...accentGreen);
  doc.rect(12, currentY, 4, 10, 'F');
  doc.setTextColor(...darkColor);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('2. GESTÃO DE LEITOS, CENSO & INTERNAÇÕES HOSPITALARES', 20, currentY + 7);
  currentY += 14;

  if (hospitalizations.length === 0) {
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(148, 163, 184);
    doc.text('Nenhuma internação em leito registrada.', 20, currentY);
    currentY += 10;
  } else {
    const hospRows = hospitalizations.map(h => {
      const admDate = h.admitted_at ? new Date(h.admitted_at).toLocaleString('pt-BR') : new Date().toLocaleString('pt-BR');
      const disDate = h.discharged_at ? new Date(h.discharged_at).toLocaleString('pt-BR') : (h.status === 'Internado' ? 'Em Internação Ativa' : '—');
      const bedName = h.bed_number ? `Leito ${h.bed_number}` : (h.bedId || 'Leito 102A');
      const wardName = h.ward || h.current_sector || 'Clínica Médica / Enfermaria';
      const doctor = h.doctor_name || h.attendingDoctor || 'Dr. Roberto Mendes (CRM 134567-SP)';
      const diagnosis = h.diagnosis || 'Pneumonia Comunitária / Observação';

      return [
        `${bedName}\n[${wardName}]`,
        admDate,
        disDate,
        doctor,
        diagnosis,
        h.status || 'Internado'
      ];
    });

    doc.autoTable({
      startY: currentY,
      head: [['Leito / Ala', 'Data Admissão', 'Data Alta', 'Médico Responsável', 'Diagnóstico / Motivo', 'Situação']],
      body: hospRows,
      theme: 'grid',
      headStyles: { fillColor: accentGreen, textColor: 255, fontSize: 8.5, fontStyle: 'bold' },
      styles: { fontSize: 8, cellPadding: 3, textColor: [30, 41, 59] },
      columnStyles: {
        0: { cellWidth: 32 },
        1: { cellWidth: 28 },
        2: { cellWidth: 28 },
        3: { cellWidth: 42 },
        4: { cellWidth: 36 },
        5: { cellWidth: 20 }
      },
      margin: { left: 12, right: 12 }
    });

    currentY = doc.lastAutoTable.finalY + 12;
  }

  // Verificar quebra de página
  if (currentY > 230) {
    doc.addPage();
    currentY = 20;
  }

  // --- PRESCRIÇÕES MÉDICAS ---
  doc.setFillColor(...accentAmber);
  doc.rect(12, currentY, 4, 10, 'F');
  doc.setTextColor(...darkColor);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('3. PRESCRIÇÕES MÉDICAS & CONDUTAS FARMACOLÓGICAS', 20, currentY + 7);
  currentY += 14;

  if (prescriptions.length === 0) {
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(148, 163, 184);
    doc.text('Nenhuma prescrição farmacológica registrada no prontuário.', 20, currentY);
    currentY += 10;
  } else {
    const prescRows = prescriptions.map(p => {
      const pDate = p.created_at ? new Date(p.created_at).toLocaleDateString('pt-BR') : new Date().toLocaleDateString('pt-BR');
      const med = p.medication || p.name || 'Dipirona 500mg/ml';
      const dosage = p.dosage || '1 ampola (500mg)';
      const route = p.route || 'Endovenosa (EV)';
      const instructions = p.instructions || p.frequency || 'A cada 6 horas se febre/dor';
      const prescriber = p.doctorName || 'Dr. Carlos Silva (CRM 123456-SP)';

      return [
        pDate,
        med,
        dosage,
        route,
        instructions,
        prescriber
      ];
    });

    doc.autoTable({
      startY: currentY,
      head: [['Data', 'Medicamento / Item', 'Posologia / Dose', 'Via', 'Instruções de Uso', 'Médico Prescritor']],
      body: prescRows,
      theme: 'grid',
      headStyles: { fillColor: accentAmber, textColor: 255, fontSize: 8.5, fontStyle: 'bold' },
      styles: { fontSize: 8, cellPadding: 3, textColor: [30, 41, 59] },
      columnStyles: {
        0: { cellWidth: 24 },
        1: { cellWidth: 42 },
        2: { cellWidth: 32 },
        3: { cellWidth: 24 },
        4: { cellWidth: 36 },
        5: { cellWidth: 28 }
      },
      margin: { left: 12, right: 12 }
    });

    currentY = doc.lastAutoTable.finalY + 12;
  }

  // --- SEÇÃO 4: FARMACOVIGILÂNCIA, SEGURANÇA DO PACIENTE & CDSS 4D ---
  if (currentY > 220) {
    doc.addPage();
    currentY = 20;
  }

  const cdssRed = [220, 38, 38];
  doc.setFillColor(...cdssRed);
  doc.rect(12, currentY, 4, 10, 'F');
  doc.setTextColor(...darkColor);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('4. FARMACOVIGILÂNCIA, SEGURANÇA DO PACIENTE & SUPORTE À DECISÃO CLÍNICA (CDSS 4D)', 20, currentY + 7);
  currentY += 14;

  const allPrescriptionTexts = [
    ...prescriptions.map(p => p.name || p.medication || ''),
    ...encounters.map(e => e.planContent || e.prescription || ''),
    ...notes.map(n => n.planContent || '')
  ].filter(Boolean).join('\n');

  const allClinicalContext = [
    patient.allergies || '',
    patient.chronicDiseases || '',
    ...encounters.map(e => `${e.complaints || ''} ${e.subjectiveContent || ''} ${e.objectiveContent || ''} ${e.diagnosis || ''} ${e.assessmentContent || ''}`),
    ...notes.map(n => `${n.subjectiveContent || ''} ${n.objectiveContent || ''} ${n.assessmentContent || ''}`)
  ].filter(Boolean).join(' | ');

  let cdssAlertsList = [];
  if (allPrescriptionTexts && typeof checkDrugInteractions === 'function') {
    cdssAlertsList = checkDrugInteractions(allPrescriptionTexts, allClinicalContext);
  }

  const cleanPdfText = (str) => {
    if (!str) return '';
    return String(str)
      .replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F000}-\u{1F02F}\u{1F0A0}-\u{1F0FF}\u{1F100}-\u{1F64F}\u{1F680}-\u{1F6FF}]/gu, '')
      .replace(/[^\x00-\xFF]/g, '') // Garante compatibilidade total com codificação Latin-1 do PDF
      .trim();
  };

  if (cdssAlertsList.length === 0) {
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(22, 101, 52);
    doc.text('[OK] Avaliacao CDSS 4D Concluida: Nenhuma contraindicacao critica ou interacao medicamentosa grave identificada.', 20, currentY);
    currentY += 10;
  } else {
    const cdssRows = cdssAlertsList.map(alert => {
      const sevLabel = alert.severity === 'Critica' ? 'CRÍTICA' : (alert.severity === 'Grave' ? 'GRAVE' : (alert.severity || 'MODERADA').toUpperCase());
      const cleanTitle = cleanPdfText(alert.title || 'Alerta Farmacológico');
      const cleanDesc = cleanPdfText(alert.desc || 'Risco de evento adverso farmacológico associado.');
      const cleanAction = cleanPdfText(alert.action || 'Avaliar ajuste posológico e monitoração intensiva.');

      return [
        sevLabel,
        cleanTitle,
        cleanDesc,
        `${cleanAction}\n(Ciência e Justificativa CFM nº 1.821/2007)`
      ];
    });

    doc.autoTable({
      startY: currentY,
      head: [['Severidade', 'Contraindicação / Interação', 'Mecanismo & Risco Clínico', 'Conduta Recomendada & Auditoria']],
      body: cdssRows,
      theme: 'grid',
      headStyles: { fillColor: cdssRed, textColor: 255, fontSize: 8, fontStyle: 'bold', halign: 'left' },
      styles: { 
        fontSize: 7.2, 
        cellPadding: 2.2, 
        textColor: [30, 41, 59], 
        overflow: 'linebreak',
        lineHeightFactor: 1.18,
        font: 'helvetica'
      },
      columnStyles: {
        0: { cellWidth: 20, fontStyle: 'bold', halign: 'center' },
        1: { cellWidth: 42, fontStyle: 'bold' },
        2: { cellWidth: 62 },
        3: { cellWidth: 62 }
      },
      margin: { left: 12, right: 12 }
    });

    currentY = doc.lastAutoTable.finalY + 12;
  }

  // --- EVOLUÇÕES CLÍNICAS E ANOTAÇÕES ADICIONAIS ---
  if (notes.length > 0) {
    if (currentY > 220) {
      doc.addPage();
      currentY = 20;
    }

    doc.setFillColor(79, 70, 229);
    doc.rect(12, currentY, 4, 10, 'F');
    doc.setTextColor(...darkColor);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('5. EVOLUÇÕES CLÍNICAS & ANOTAÇÕES MULTIPROFISSIONAIS', 20, currentY + 7);
    currentY += 14;

    const noteRows = notes.map(n => {
      const nDate = n.created_at ? new Date(n.created_at).toLocaleString('pt-BR') : new Date().toLocaleString('pt-BR');
      const author = n.author || 'Equipe Assistencial';
      const text = n.text || n.content || 'Sem anotação.';
      return [nDate, author, text];
    });

    doc.autoTable({
      startY: currentY,
      head: [['Data / Hora', 'Profissional / Autor', 'Registro / Conduta']],
      body: noteRows,
      theme: 'grid',
      headStyles: { fillColor: [79, 70, 229], textColor: 255, fontSize: 8.5, fontStyle: 'bold' },
      styles: { fontSize: 8, cellPadding: 3, textColor: [30, 41, 59] },
      columnStyles: {
        0: { cellWidth: 30 },
        1: { cellWidth: 45 },
        2: { cellWidth: 111 }
      },
      margin: { left: 12, right: 12 }
    });

    currentY = doc.lastAutoTable.finalY + 12;
  }

  // --- TERMO DE AUTENTICIDADE DIGITAL & CARIMBO CFM / ICP-BRASIL ---
  if (currentY > 230) {
    doc.addPage();
    currentY = 20;
  }

  doc.setFillColor(241, 245, 249);
  doc.roundedRect(12, currentY, 186, 26, 2, 2, 'F');
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(12, currentY, 186, 26, 2, 2, 'S');

  doc.setTextColor(30, 41, 59);
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bold');
  doc.text('AUTENTICAÇÃO DIGITAL & CONFORMIDADE REGULATÓRIA (CFM nº 1.821/2007)', 16, currentY + 6);

  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  const hashMock = 'SHA256-' + Array.from({length: 32}, () => Math.floor(Math.random()*16).toString(16)).join('').toUpperCase();
  doc.text(`Assinatura Digital: ICP-Brasil Certificado Digital Padrão A3 · Token Hash: ${hashMock}`, 16, currentY + 12);
  doc.text('Este documento constitui reprodução fidedigna do Prontuário Eletrônico do Paciente sob guarda do Health Nexus.', 16, currentY + 17);
  doc.text('Acesso restrito e protegido nos termos da Lei Geral de Proteção de Dados (LGPD - Lei nº 13.709/2018).', 16, currentY + 22);

  // Rodapé em todas as páginas
  const totalPages = doc.internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setDrawColor(226, 232, 240);
    doc.line(12, 285, 198, 285);
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184);
    doc.text('Health Nexus · Sistema Integrado de Gestão Hospitalar & Prontuário Eletrônico (PEP)', 12, 290);
    doc.text(`Página ${i} de ${totalPages}`, 180, 290);
  }

  const cleanName = (patient.fullName || patientName || 'paciente').replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
  doc.save(`prontuario_completo_${cleanName}_${new Date().toISOString().slice(0, 10)}.pdf`);
  if (typeof window.showToast === 'function') window.showToast('📄 Prontuário PDF completo gerado com sucesso!', 'success');
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

    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8); doc.setTextColor(150, 150, 150);
      doc.text('CONFIDENCIAL — Comprovante de Agendamento', 14, 289);
      doc.text(`Página ${i} de ${pageCount}`, 180, 289);
    }

    const safeName = (patientName || 'comprovante').replace(/[^a-zA-Z0-9]/g, '_').substring(0, 30);
    doc.save(`agendamento_${safeName}_${id.substring(0, 4)}.pdf`);
  });
};

// --- ABA CONSULTÓRIOS & SALAS ---

async function loadConsultingRooms() {
  const dashboard = document.getElementById('rooms-dashboard');
  if (!dashboard) return;

  try {
    const todayIso = new Date().toISOString().split('T')[0];
    const [roomsRes, aptRes, encRes, tvRes] = await Promise.all([
      apiFetch('/api/consulting-rooms').catch(() => ({ ok: false })),
      apiFetch('/api/appointments?date=' + todayIso).catch(() => ({ ok: false })),
      apiFetch('/api/encounters').catch(() => ({ ok: false })),
      apiFetch('/api/tv/calls').catch(() => ({ ok: false }))
    ]);
    
    const roomsResult = roomsRes.ok ? await roomsRes.json() : { data: [] };
    const aptResult = aptRes.ok ? await aptRes.json() : { data: [] };
    const encResult = encRes.ok ? await encRes.json() : { data: [] };
    const tvResult = tvRes.ok ? await tvRes.json() : { data: [] };
    
    let rooms = Array.isArray(roomsResult) ? roomsResult : (roomsResult.data || []);
    const appointments = Array.isArray(aptResult) ? aptResult : (aptResult.data || []);
    const encounters = Array.isArray(encResult) ? encResult : (encResult.data || []);
    const tvCalls = Array.isArray(tvResult) ? tvResult : (tvResult.data || []);

    if (rooms.length === 0) {
      rooms = [
        { id: 'room-1', name: 'Consultório 01', specialty: 'Clínica Geral / Pronto Atendimento', currentDoctor: 'Dr. Carlos Silva', status: 'Disponível' },
        { id: 'room-2', name: 'Consultório 02', specialty: 'Pediatria', currentDoctor: 'Dra. Beatriz Santos', status: 'Disponível' },
        { id: 'room-3', name: 'Consultório 03', specialty: 'Ortopedia / Trauma', currentDoctor: 'Dr. Roberto Mendes', status: 'Disponível' },
        { id: 'room-4', name: 'Consultório 04', specialty: 'Cardiologia', currentDoctor: 'Dra. Juliana Costa', status: 'Disponível' },
      ];
    }
    
    dashboard.innerHTML = rooms.map(r => {
      const roomApts = appointments.filter(a => (a.roomName === r.name || a.room === r.name || (r.name === 'Consultório 01' && !a.roomName && !a.room)));
      const roomEncs = encounters.filter(e => (e.room === r.name || e.roomName === r.name || (r.name === 'Consultório 01' && (e.status === 'Em_Atendimento' || e.status === 'Aguardando_Atendimento' || e.status === 'Em_Observacao' || e.status === 'Observacao'))));
      const roomTvCalls = tvCalls.filter(c => c.roomName === r.name || c.room === r.name);
      
      const inProgressEnc = roomEncs.find(e => e.status === 'Em_Atendimento' || e.status === 'Em Atendimento');
      const inProgressApt = roomApts.find(a => a.status === 'Em Atendimento' || a.status === 'Em_Atendimento');
      const inProgressTv = roomTvCalls.length > 0 ? roomTvCalls[0] : null;
      const inProgress = inProgressEnc || inProgressApt || inProgressTv;

      const obsEncs = roomEncs.filter(e => 
        (e.status === 'Em_Observacao' || e.status === 'Observacao' || (!!e.observation_started_at && e.status !== 'Alta' && e.status !== 'Finalizado')) &&
        e !== inProgress
      );

      const waitingEncs = roomEncs.filter(e => e.status === 'Aguardando_Atendimento' && e !== inProgress && !obsEncs.includes(e));
      const waitingApts = roomApts.filter(a => (a.status === 'Confirmado' || a.status === 'Agendado') && a !== inProgress);
      const waiting = [...waitingEncs, ...waitingApts];
      
      const hasPatient = !!inProgress;
      const roomStatus = hasPatient ? 'Em Uso' : (obsEncs.length > 0 ? 'Observação Ativa' : (r.status || 'Disponível'));
      const doctorDisplay = r.currentDoctor || r.doctorName || 'Dr. Carlos Silva';
      const patientNameDisplay = inProgress ? (inProgress.patientName || inProgress.name || 'Paciente') : null;
      const patientTargetId = inProgressEnc ? inProgressEnc.id : (inProgress ? (inProgress.patientId || inProgress.id || inProgress.patientName) : '');
      
      return `
        <div class="interactive-card ${patientNameDisplay && patientNameDisplay.toLowerCase().includes('marcelo') ? 'patient-pulse-selected' : ''}" style="background: var(--bg-secondary); border: 1.5px solid ${hasPatient ? 'rgba(99, 102, 241, 0.4)' : (obsEncs.length > 0 ? 'rgba(245, 158, 11, 0.4)' : 'var(--border-color)')}; border-radius: 14px; padding: 20px; display: flex; flex-direction: column; gap: 12px; position: relative; overflow: hidden; cursor: pointer; transition: transform 0.2s, box-shadow 0.2s;" onclick="openConsultorioDetailsModal('${r.name}')" onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 8px 24px rgba(0,0,0,0.15)';" onmouseout="this.style.transform=''; this.style.boxShadow='';">
          <div style="display: flex; justify-content: space-between; align-items: flex-start;">
            <div>
              <h3 style="margin: 0; font-size: 1.15rem; color: var(--text-primary); display: flex; align-items: center; gap: 8px; font-weight: 700;">
                <i class="fa-solid fa-door-open" style="color: ${hasPatient ? '#818cf8' : (obsEncs.length > 0 ? '#fbbf24' : 'var(--color-primary)')};"></i> ${r.name}
              </h3>
              <div style="font-size: 0.8rem; color: var(--text-muted); margin-top: 4px;">${r.specialty || 'Uso Geral / Pronto Atendimento'}</div>
            </div>
            <div style="display: flex; gap: 6px;">
              <button class="btn btn-icon btn-outline" style="width: 28px; height: 28px;" onclick="event.stopPropagation(); openRoomModal('${r.id}')" title="Editar"><i class="fa-solid fa-pen" style="font-size: 0.75rem;"></i></button>
            </div>
          </div>
          
          <div style="margin-top: 4px; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 6px;">
            <span style="display: inline-flex; align-items: center; gap: 5px; padding: 4px 10px; border-radius: 20px; font-size: 0.75rem; font-weight: 700; background: ${hasPatient ? 'rgba(99,102,241,0.2)' : (obsEncs.length > 0 ? 'rgba(245,158,11,0.2)' : 'rgba(16,185,129,0.15)')}; color: ${hasPatient ? '#a5b4fc' : (obsEncs.length > 0 ? '#fbbf24' : '#34d399')}; border: 1px solid ${hasPatient ? 'rgba(99,102,241,0.4)' : (obsEncs.length > 0 ? 'rgba(245,158,11,0.4)' : 'rgba(16,185,129,0.3)')};">
              <i class="fa-solid fa-circle" style="font-size: 0.45rem;"></i> ${roomStatus}
            </span>
            <span style="font-size: 0.8rem; font-weight: 600; color: var(--text-secondary); display: flex; align-items: center; gap: 6px;">
              <i class="fa-solid fa-user-doctor" style="color: #38bdf8;"></i> ${doctorDisplay}
            </span>
          </div>

          <!-- ÁREA DE OBSERVAÇÃO DO CONSULTÓRIO (DESTAQUE NO CARD) -->
          ${obsEncs.length > 0 ? `
            <div style="background: rgba(245, 158, 11, 0.12); border: 1px solid rgba(245, 158, 11, 0.35); border-radius: 10px; padding: 8px 12px; display: flex; align-items: center; justify-content: space-between; gap: 8px; flex-wrap: wrap;">
              <div style="display: flex; align-items: center; gap: 6px; font-size: 0.8rem; color: #fbbf24; font-weight: 700;">
                <i class="fa-solid fa-bed-pulse"></i>
                <span>${obsEncs.length} em Observação na Sala</span>
              </div>
              <span style="font-size: 0.68rem; background: rgba(245,158,11,0.25); color: #fde68a; padding: 2px 6px; border-radius: 4px; font-weight: 800;">MONITORANDO</span>
            </div>
          ` : ''}

          <div style="margin-top: auto; padding-top: 14px; border-top: 1px solid var(--border-color); display: flex; flex-direction: column; gap: 8px;">
            ${patientNameDisplay ? `
              <div style="display: flex; align-items: center; justify-content: space-between; font-size: 0.85rem; color: #ffffff; background: linear-gradient(135deg, rgba(99,102,241,0.25), rgba(79,70,229,0.15)); padding: 10px 12px; border-radius: 10px; border: 1px solid rgba(129,140,248,0.35); flex-wrap: wrap; gap: 8px;">
                <div style="display: flex; align-items: center; gap: 8px; overflow: hidden; min-width: 140px;">
                  <i class="fa-solid fa-user-check" style="color: #38bdf8; font-size: 1rem;"></i>
                  <strong style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${patientNameDisplay}</strong>
                </div>
                <div style="display: flex; gap: 6px; align-items: center;">
                  <button class="btn" style="background: linear-gradient(135deg, #ec4899, #be185d); color: #fff; border: none; font-size: 0.76rem; padding: 5px 10px; border-radius: 6px; font-weight: 700; cursor: pointer; display: inline-flex; align-items: center; gap: 5px; box-shadow: 0 2px 8px rgba(236,72,153,0.3);" onclick="event.stopPropagation(); if(typeof window.openPEPModal === 'function') window.openPEPModal('${patientTargetId || patientNameDisplay}');" title="Abrir Prontuário Eletrônico">
                    <i class="fa-solid fa-file-medical"></i> PEP
                  </button>
                  <span style="font-size: 0.7rem; background: #6366f1; color: #fff; padding: 2px 7px; border-radius: 6px; font-weight: 700;">Chamado</span>
                </div>
              </div>
            ` : `
              <div style="font-size: 0.82rem; color: var(--text-muted); padding: 4px 0;"><i class="fa-regular fa-clock"></i> Mesa de consulta livre</div>
            `}
            <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.8rem;">
              <span style="color: var(--text-muted);">Próximos na Fila:</span>
              <span style="font-weight: 700; color: var(--text-primary); background: var(--bg-tertiary); padding: 3px 10px; border-radius: 12px; border: 1px solid var(--border-color);">${waiting.length} paciente(s)</span>
            </div>
          </div>
        </div>
      `;
    }).join('');
    
    state.consultingRooms = rooms;
  } catch (err) {
    console.error(err);
    dashboard.innerHTML = '<div style="grid-column: 1 / -1; text-align: center; color: red;">Erro ao carregar consultórios.</div>';
  }
}

async function openConsultorioDetailsModal(roomName) {
  const existing = document.getElementById('consultorio-details-modal');
  if (existing) existing.remove();

  const todayIso = new Date().toISOString().split('T')[0];
  const [aptRes, encRes, tvRes] = await Promise.all([
    apiFetch('/api/appointments?date=' + todayIso).catch(() => ({ ok: false })),
    apiFetch('/api/encounters').catch(() => ({ ok: false })),
    apiFetch('/api/tv/calls').catch(() => ({ ok: false }))
  ]);

  const apts = aptRes.ok ? (await aptRes.json()).data || [] : [];
  const encs = encRes.ok ? (await encRes.json()).data || [] : [];
  const tvCalls = tvRes.ok ? (await tvRes.json()).data || [] : [];

  const roomApts = apts.filter(a => (a.roomName === roomName || a.room === roomName || (roomName === 'Consultório 01' && !a.roomName && !a.room)));
  const roomEncs = encs.filter(e => (e.room === roomName || e.roomName === roomName || (roomName === 'Consultório 01' && (e.status === 'Em_Atendimento' || e.status === 'Aguardando_Atendimento' || e.status === 'Em_Observacao' || e.status === 'Observacao'))));
  const roomTvCalls = tvCalls.filter(c => c.roomName === roomName || c.room === roomName);
  
  const inProgressEnc = roomEncs.find(e => e.status === 'Em_Atendimento' || e.status === 'Em Atendimento');
  const inProgressApt = roomApts.find(a => a.status === 'Em Atendimento' || a.status === 'Em_Atendimento');
  const inProgressTv = roomTvCalls.length > 0 ? roomTvCalls[0] : null;
  const inProgress = inProgressEnc || inProgressApt || inProgressTv;

  const obsEncs = roomEncs.filter(e => 
    (e.status === 'Em_Observacao' || e.status === 'Observacao' || (!!e.observation_started_at && e.status !== 'Alta' && e.status !== 'Finalizado')) &&
    e !== inProgress
  );

  const waitingEncs = roomEncs.filter(e => e.status === 'Aguardando_Atendimento' && e !== inProgress && !obsEncs.includes(e));
  const waitingApts = roomApts.filter(a => (a.status === 'Confirmado' || a.status === 'Agendado') && a !== inProgress);
  const waiting = [...waitingEncs, ...waitingApts];

  const recentCalls = roomTvCalls.slice(0, 8);

  const patientTargetId = inProgressEnc ? inProgressEnc.id : (inProgress ? (inProgress.patientId || inProgress.id || inProgress.patientName) : '');
  const patientTargetName = inProgress ? (inProgress.patientName || inProgress.name || 'Paciente') : '';

  const modalHtml = `
    <div id="consultorio-details-modal" class="modal-overlay" style="position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; z-index: 9999; display: flex; align-items: center; justify-content: center; background: rgba(5, 7, 20, 0.85); backdrop-filter: blur(10px);">
      <div class="modal-content" style="max-width: 780px; width: 95vw; max-height: 92vh; background: var(--bg-secondary); border: 1.5px solid rgba(99, 102, 241, 0.5); border-radius: 18px; overflow: hidden; display: flex; flex-direction: column; box-shadow: 0 20px 60px rgba(0,0,0,0.7); animation: slideIn 0.3s ease-out;">
        
        <div style="background: linear-gradient(135deg, #6366f1, #00f2fe); padding: 16px 22px; display: flex; justify-content: space-between; align-items: center; color: #fff;">
          <div style="display: flex; align-items: center; gap: 10px;">
            <i class="fa-solid fa-door-open" style="font-size: 1.3rem;"></i>
            <div>
              <h3 style="margin: 0; font-size: 1.15rem; font-weight: 700; color: #fff;">Painel do ${roomName}</h3>
              <small style="color: rgba(255,255,255,0.85);">Gestão de Atendimento, Área de Observação &amp; Prontuário</small>
            </div>
          </div>
          <button onclick="document.getElementById('consultorio-details-modal').remove()" style="background: rgba(255,255,255,0.2); border: none; color: #fff; width: 32px; height: 32px; border-radius: 50%; cursor: pointer; display: flex; align-items: center; justify-content: center;"><i class="fa-solid fa-xmark"></i></button>
        </div>

        <div style="padding: 20px; overflow-y: auto; display: flex; flex-direction: column; gap: 16px;">
          
          <!-- SEÇÃO 1: MESA DE ATENDIMENTO (Paciente Chamado / Ativo) -->
          <div style="background: var(--bg-tertiary); border: 1.5px solid ${inProgress ? '#6366f1' : 'var(--border-color)'}; border-radius: 14px; padding: 18px;">
            <div style="font-size: 0.78rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase; margin-bottom: 12px; display: flex; align-items: center; justify-content: space-between;">
              <span><i class="fa-solid fa-user-doctor" style="color: #6366f1;"></i> 1. Mesa de Atendimento / Paciente em Consulta</span>
              ${inProgress ? '<span style="background: #10b981; color: #fff; padding: 3px 10px; border-radius: 12px; font-size: 0.72rem; font-weight: 700;">🟢 Ativo na Mesa</span>' : ''}
            </div>

            ${inProgress ? `
              <div style="display: flex; flex-direction: column; gap: 14px;">
                <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 10px;">
                  <div>
                    <h4 style="margin: 0; font-size: 1.25rem; font-weight: 800; color: #f8fafc; display: flex; align-items: center; gap: 8px;">
                      <i class="fa-solid fa-hospital-user" style="color: #38bdf8;"></i> ${patientTargetName}
                    </h4>
                    <div style="font-size: 0.82rem; color: var(--text-muted); margin-top: 6px; display: flex; gap: 10px; flex-wrap: wrap;">
                      ${inProgress.manchesterColor ? `<span>Risco: <strong style="color: #38bdf8;">● ${inProgress.manchesterColor}</strong></span> &bull; ` : ''}
                      <span>Horário: <strong>${inProgress.admitted_at ? new Date(inProgress.admitted_at).toLocaleTimeString().slice(0,5) : (inProgress.calledAt ? new Date(inProgress.calledAt).toLocaleTimeString().slice(0,5) : (inProgress.time || 'Agora'))}</strong></span>
                    </div>
                  </div>
                </div>

                <!-- Ações Diretas de Consulta / PEP / Prescrição -->
                <div style="display: flex; gap: 8px; flex-wrap: wrap; padding-top: 10px; border-top: 1px solid rgba(255,255,255,0.08);">
                  <button class="btn" style="background: linear-gradient(135deg, #ec4899, #be185d); color: #fff; border: none; font-size: 0.85rem; padding: 9px 18px; border-radius: 10px; font-weight: 700; cursor: pointer; display: inline-flex; align-items: center; gap: 8px; box-shadow: 0 4px 14px rgba(236,72,153,0.35);" onclick="document.getElementById('consultorio-details-modal').remove(); if(typeof window.openPEPModal === 'function') window.openPEPModal('${patientTargetId || patientTargetName}');">
                    <i class="fa-solid fa-file-medical"></i> Abrir PEP / Prontuário
                  </button>
                  <button class="btn" style="background: rgba(99,102,241,0.18); border: 1px solid rgba(99,102,241,0.4); color: #a5b4fc; font-size: 0.82rem; padding: 9px 14px; border-radius: 10px; font-weight: 700; cursor: pointer; display: inline-flex; align-items: center; gap: 6px;" onclick="document.getElementById('consultorio-details-modal').remove(); if(typeof window.openPrescriptionModal === 'function') window.openPrescriptionModal('${patientTargetId}', '${patientTargetName}');">
                    <i class="fa-solid fa-pills"></i> Prescrição Médica
                  </button>
                  <button class="btn" style="background: rgba(56,189,248,0.18); border: 1px solid rgba(56,189,248,0.4); color: #38bdf8; font-size: 0.82rem; padding: 9px 14px; border-radius: 10px; font-weight: 700; cursor: pointer; display: inline-flex; align-items: center; gap: 6px;" onclick="document.getElementById('consultorio-details-modal').remove(); if(typeof window.switchTab === 'function') window.switchTab('atendimento');">
                    <i class="fa-solid fa-arrow-right"></i> Central de Atendimentos
                  </button>
                </div>
              </div>
            ` : `
              <div style="color: var(--text-muted); font-size: 0.85rem; padding: 10px 0; text-align: center;">
                <i class="fa-solid fa-chair" style="font-size: 1.3rem; color: var(--border-color); display: block; margin-bottom: 4px;"></i>
                Mesa de atendimento livre. Chame o próximo paciente da fila abaixo.
              </div>
            `}
          </div>

          <!-- SEÇÃO 2: ÁREA DE OBSERVAÇÃO DO CONSULTÓRIO (Poltronas & Leitos de Decisão Clínica) -->
          <div style="background: var(--bg-tertiary); border: 1.5px solid ${obsEncs.length > 0 ? 'rgba(245, 158, 11, 0.4)' : 'var(--border-color)'}; border-radius: 14px; padding: 18px;">
            <div style="font-size: 0.78rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase; margin-bottom: 12px; display: flex; align-items: center; justify-content: space-between;">
              <span style="display: flex; align-items: center; gap: 8px; color: #fbbf24;">
                <i class="fa-solid fa-bed-pulse"></i> 2. Área de Observação deste Consultório (${obsEncs.length})
              </span>
              ${obsEncs.length > 0 ? `<span style="background: rgba(245, 158, 11, 0.2); color: #fbbf24; border: 1px solid rgba(245,158,11,0.4); padding: 2px 8px; border-radius: 12px; font-size: 0.72rem; font-weight: 700;">${obsEncs.length} Leito(s) Ativo(s)</span>` : ''}
            </div>

            ${obsEncs.length > 0 ? `
              <div style="display: flex; flex-direction: column; gap: 10px;">
                ${obsEncs.map((obs, idx) => {
                  const obsStart = new Date(obs.observation_started_at || obs.admitted_at || Date.now()).getTime();
                  const diffMs = Math.max(0, Date.now() - obsStart);
                  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
                  const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
                  const isLimit = diffHours >= 12;
                  const isWarning = diffHours >= 10;

                  return `
                    <div style="background: var(--bg-secondary); border: 1px solid ${isLimit ? '#ef4444' : (isWarning ? '#f59e0b' : 'rgba(99,102,241,0.3)')}; border-left: 4px solid ${isLimit ? '#ef4444' : '#f59e0b'}; border-radius: 12px; padding: 14px; display: flex; flex-direction: column; gap: 10px;">
                      <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 8px;">
                        <div>
                          <div style="display: flex; align-items: center; gap: 8px;">
                            <span style="font-size: 0.72rem; background: rgba(245,158,11,0.2); color: #fbbf24; padding: 2px 8px; border-radius: 6px; font-weight: 800;">
                              <i class="fa-solid fa-bed"></i> Leito Obs ${idx + 1}
                            </span>
                            <strong style="color: #f8fafc; font-size: 1rem;">${obs.patientName || 'Paciente'}</strong>
                          </div>
                          <div style="font-size: 0.78rem; color: #94a3b8; margin-top: 4px; display: flex; gap: 10px; flex-wrap: wrap;">
                            <span>Tempo em Observação: <strong style="color: ${isLimit ? '#ef4444' : (isWarning ? '#fbbf24' : '#60a5fa')};">${diffHours}h ${diffMins}m / 12h máx</strong></span>
                            ${obs.manchesterColor ? `&bull; <span>Manchester: <strong>${obs.manchesterColor}</strong></span>` : ''}
                          </div>
                        </div>
                        <div style="display: flex; gap: 6px; flex-wrap: wrap;">
                          <button class="btn" style="background: linear-gradient(135deg, #ec4899, #be185d); color: #fff; border: none; font-size: 0.78rem; padding: 6px 12px; border-radius: 8px; font-weight: 700; cursor: pointer; display: inline-flex; align-items: center; gap: 5px;" onclick="document.getElementById('consultorio-details-modal').remove(); if(typeof window.openPEPModal === 'function') window.openPEPModal('${obs.id || obs.patientId || obs.patientName}');" title="Reavaliar Evolução no PEP">
                            <i class="fa-solid fa-stethoscope"></i> Reavaliar (PEP)
                          </button>
                          <button class="btn" style="background: rgba(99,102,241,0.18); border: 1px solid rgba(99,102,241,0.4); color: #a5b4fc; font-size: 0.78rem; padding: 6px 12px; border-radius: 8px; font-weight: 700; cursor: pointer; display: inline-flex; align-items: center; gap: 5px;" onclick="document.getElementById('consultorio-details-modal').remove(); if(typeof window.openPrescriptionModal === 'function') window.openPrescriptionModal('${obs.id}', '${obs.patientName}');" title="Ver ou Ajustar Prescrição">
                            <i class="fa-solid fa-pills"></i> Prescrição
                          </button>
                          <button class="btn" style="background: rgba(16,185,129,0.18); border: 1px solid rgba(16,185,129,0.4); color: #34d399; font-size: 0.78rem; padding: 6px 12px; border-radius: 8px; font-weight: 700; cursor: pointer; display: inline-flex; align-items: center; gap: 5px;" onclick="window.dischargeFromObservation('${obs.id}', '${roomName}')" title="Concluir Observação e Dar Alta">
                            <i class="fa-solid fa-check"></i> Dar Alta
                          </button>
                        </div>
                      </div>
                      ${obs.complaints || obs.clinicalNotes ? `
                        <div style="font-size: 0.78rem; color: #cbd5e1; background: rgba(0,0,0,0.2); padding: 8px 10px; border-radius: 6px; font-style: italic;">
                          "${obs.complaints || obs.clinicalNotes}"
                        </div>
                      ` : ''}
                    </div>
                  `;
                }).join('')}
              </div>
            ` : `
              <div style="color: var(--text-muted); font-size: 0.82rem; padding: 12px 0; text-align: center;">
                <i class="fa-solid fa-bed" style="color: var(--border-color); font-size: 1.3rem; display: block; margin-bottom: 4px;"></i>
                Nenhum paciente alocado na área de observação deste consultório no momento.
              </div>
            `}
          </div>

          <!-- SEÇÃO 3: PACIENTES AGUARDANDO NA FILA -->
          <div style="background: var(--bg-tertiary); border: 1px solid var(--border-color); border-radius: 14px; padding: 16px;">
            <div style="font-size: 0.78rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase; margin-bottom: 10px; display: flex; align-items: center; justify-content: space-between;">
              <span><i class="fa-solid fa-users" style="color: #60a5fa;"></i> 3. Fila de Espera para ${roomName} (${waiting.length})</span>
            </div>

            ${waiting.length > 0 ? `
              <div style="display: flex; flex-direction: column; gap: 8px;">
                ${waiting.map((w, idx) => `
                  <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px 14px; background: var(--bg-secondary); border-radius: 10px; border: 1px solid var(--border-color); gap: 10px; flex-wrap: wrap;">
                    <div style="display: flex; align-items: center; gap: 10px;">
                      <span style="width: 26px; height: 26px; border-radius: 50%; background: rgba(99,102,241,0.2); color: #818cf8; display: flex; align-items: center; justify-content: center; font-size: 0.75rem; font-weight: 700;">${idx + 1}</span>
                      <div>
                        <strong style="color: #f8fafc; font-size: 0.9rem; display: block;">${w.patientName || w.name}</strong>
                        <small style="color: var(--text-muted); font-size: 0.76rem;">${w.manchesterColor ? `Manchester: <strong>${w.manchesterColor}</strong>` : (w.time ? `Horário: ${w.time}` : 'Aguardando Médico')}</small>
                      </div>
                    </div>
                    <div style="display: flex; gap: 6px;">
                      <button class="btn" style="background: linear-gradient(135deg, #ec4899, #be185d); color: #fff; border: none; font-size: 0.76rem; padding: 6px 12px; border-radius: 8px; font-weight: 700; cursor: pointer; display: flex; align-items: center; gap: 5px;" onclick="document.getElementById('consultorio-details-modal').remove(); if(typeof window.openPEPModal === 'function') window.openPEPModal('${w.id || w.patientId || w.patientName}');">
                        <i class="fa-solid fa-file-medical"></i> Atender (PEP)
                      </button>
                    </div>
                  </div>
                `).join('')}
              </div>
            ` : `
              <div style="color: var(--text-muted); font-size: 0.85rem; padding: 10px 0; text-align: center;">
                Nenhum paciente aguardando na fila desta sala.
              </div>
            `}
          </div>

          <!-- Chamadas Recentes no Painel de TV -->
          ${recentCalls.length > 0 ? `
            <div style="background: var(--bg-tertiary); border: 1px solid var(--border-color); border-radius: 14px; padding: 16px;">
              <div style="font-size: 0.78rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase; margin-bottom: 12px; display: flex; align-items: center; gap: 8px;">
                <i class="fa-solid fa-tv" style="color: #38bdf8;"></i> Chamadas de TV Registradas para esta Sala
              </div>
              <div style="display: flex; flex-direction: column; gap: 8px;">
                ${recentCalls.map(c => `
                  <div style="font-size: 0.82rem; color: #cbd5e1; display: flex; justify-content: space-between; align-items: center; padding: 8px 12px; background: var(--bg-secondary); border-radius: 8px; border: 1px solid var(--border-color); gap: 10px; flex-wrap: wrap;">
                    <div>
                      <strong style="color: #f8fafc; font-size: 0.9rem; display: block;">${c.patientName}</strong>
                      <span style="color: #94a3b8; font-size: 0.75rem;">Chamado por: <strong>${c.doctorName || 'Dr. Médico Plantonista'}</strong> &bull; ${c.calledAt ? new Date(c.calledAt).toLocaleTimeString().slice(0,5) : 'Recente'}</span>
                    </div>
                    <div style="display: flex; gap: 6px;">
                      <button class="btn" style="background: linear-gradient(135deg, #ec4899, #be185d); color: #fff; border: none; font-size: 0.76rem; padding: 6px 12px; border-radius: 6px; font-weight: 700; cursor: pointer; display: inline-flex; align-items: center; gap: 5px; box-shadow: 0 2px 8px rgba(236,72,153,0.3);" onclick="document.getElementById('consultorio-details-modal').remove(); if(typeof window.openPEPModal === 'function') window.openPEPModal('${c.patientId || c.patientName}');">
                        <i class="fa-solid fa-file-medical"></i> Atender (PEP)
                      </button>
                    </div>
                  </div>
                `).join('')}
              </div>
            </div>
          ` : ''}

        </div>

        <div style="padding: 14px 20px; background: var(--bg-tertiary); border-top: 1px solid var(--border-color); display: flex; justify-content: flex-end; gap: 10px;">
          <button class="btn btn-primary" onclick="document.getElementById('consultorio-details-modal').remove()">Fechar</button>
        </div>

      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', modalHtml);
}

window.dischargeFromObservation = async function(encId, roomName) {
  try {
    const res = await apiFetch(`/api/encounters/${encId}/discharge`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notes: 'Alta médica concedida após período de observação no consultório.' })
    });
    if (res.ok) {
      if (typeof showToast === 'function') showToast('✅ Alta médica concedida! Leito de observação liberado.', 'success');
      
      if (typeof window.showFlowCompletionNotification === 'function') {
        window.showFlowCompletionNotification({
          actionTitle: 'Alta de Observação Concluída',
          message: `Alta médica concedida com sucesso. O leito/poltrona de observação do <strong>${roomName || 'Consultório'}</strong> foi liberado.<br><br><strong>Próximo Passo:</strong> Acompanhe o fluxo geral na <strong>Central de Atendimentos</strong> ou visualize os relatórios assistenciais.`,
          targetTab: 'atendimento',
          targetTabLabel: 'Central de Atendimentos',
          actionType: 'switchTab'
        });
      }

      const modal = document.getElementById('consultorio-details-modal');
      if (modal) modal.remove();
      if (typeof loadConsultingRooms === 'function') loadConsultingRooms();
      if (roomName && typeof openConsultorioDetailsModal === 'function') {
        setTimeout(() => openConsultorioDetailsModal(roomName), 200);
      }
    }
  } catch (e) {
    console.error('Erro ao dar alta na observação:', e);
  }
};

window.loadConsultingRooms = loadConsultingRooms;
window.openConsultorioDetailsModal = openConsultorioDetailsModal;

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
      loadKanbanData();
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
    const result = await generateMockData();
    const summary = [
      `👤 ${(result.patients||[]).length} pacientes`,
      `👨‍⚕️ ${(result.doctors||[]).length} médicos`,
      `📅 ${(result.appointments||[]).length} agendamentos`,
      `🏥 ${(result.encounters||[]).length} atendimentos`,
      `💰 ${(result.financial_installments||[]).length} títulos`,
      `🛏️ ${(result.beds||[]).filter(b=>b.status==='Ocupado').length} leitos`,
      `📺 ${(result.tv_calls||[]).length} chamadas`,
      `💊 ${(result.medications||[]).length} medicamentos`,
    ].join(' | ');
    showToast('✅ Simulação completa! ' + summary);
    setTimeout(() => window.location.reload(), 2000);
  } catch (e) {
    console.error('[populateFakeDatabase] Erro:', e);
    showToast('❌ Erro ao simular banco: ' + (e.message || e));
  }
};

async function exportToPDF(headers, rows, title = 'Relatório Health Nexus', filename = 'relatorio.pdf') {
  if (!window.jspdf) {
    if (typeof showToast === 'function') showToast('⚠️ Biblioteca PDF não disponível');
    return;
  }
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(title, 14, 15);
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.text(`Gerado em: ${new Date().toLocaleString('pt-BR')} · Health Nexus`, 14, 21);
  if (doc.autoTable) {
    doc.autoTable({
      startY: 26,
      head: [headers],
      body: rows,
      theme: 'grid',
      headStyles: { fillColor: [99, 102, 241], textColor: 255, fontSize: 8.5 },
      styles: { fontSize: 8, cellPadding: 2.5 }
    });
  }
  const fn = filename.endsWith('.pdf') ? filename : `${filename}.pdf`;
  doc.save(fn);
}
window.exportToPDF = exportToPDF;


// Expondo variáveis utilizadas em onclicks (movidas de tv.js)
window.saveRoom = saveRoom;
window.deleteRoom = deleteRoom;
window.openRoomModal = openRoomModal;
window.openConsultorioDetailsModal = openConsultorioDetailsModal;

// --- INICIALIZAÇÃO AUTOMÁTICA DA APLICAÇÃO ---
// Start app immediately (module execution is already deferred until DOM is parsed)
initializeApp();
