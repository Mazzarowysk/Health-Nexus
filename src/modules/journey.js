// ─── MÓDULO DE LINHA DE CUIDADO GUIADA, HUD FLUTUANTE & SMART FLOW GUIDE ───
// Health Nexus Enterprise — Orquestrador da Jornada do Paciente
// ─────────────────────────────────────────────────────────────────────────────

import { state } from '../state.js';
import { showToast, makeDraggable } from './ui.js';
import { apiFetch } from './api.js';

let activePatientContext = null;
let isGuideMinimized = false;
let currentActiveTabId = 'dashboard';
let lastActionMessage = null;

const WORKFLOW_STEPS = [
  { id: 'recepcao', tab: 'pacientes', label: '1. Recepção', icon: 'fa-id-card' },
  { id: 'triagem', tab: 'atendimento', label: '2. Triagem', icon: 'fa-user-nurse' },
  { id: 'consulta', tab: 'consultorios', label: '3. Médico/PEP', icon: 'fa-user-doctor' },
  { id: 'farmacia', tab: 'farmacia', label: '4. Farmácia', icon: 'fa-pills' },
  { id: 'leitos', tab: 'leitos', label: '5. Leitos/Alta', icon: 'fa-bed-pulse' }
];

const TAB_NEXT_RECOMMENDATION = {
  dashboard: {
    currentLabel: 'Dashboard Executivo',
    title: 'Iniciar Fluxo Hospitalar',
    desc: 'Cadastre um paciente ou inicie um atendimento na Recepção.',
    nextTab: 'pacientes',
    nextLabel: 'Recepção & Pacientes',
    icon: 'fa-hospital-user'
  },
  pacientes: {
    currentLabel: 'Recepção & Pacientes',
    title: 'Classificar Risco Clínico',
    desc: 'Encaminhe o paciente para Triagem Manchester e Sinais Vitais.',
    nextTab: 'atendimento',
    nextLabel: 'Central de Atendimento (Triagem)',
    icon: 'fa-user-nurse'
  },
  atendimento: {
    currentLabel: 'Triagem & Manchester',
    title: 'Chamar no Consultório / PEP',
    desc: 'Paciente triado! Abra o consultório ou chame na TV para atendimento médico.',
    nextTab: 'consultorios',
    nextLabel: 'Salas & Consultórios / PEP',
    icon: 'fa-user-doctor'
  },
  consultorios: {
    currentLabel: 'Salas & Consultórios',
    title: 'Dispensar Medicação / Internar',
    desc: 'Prescrição realizada! Envie para a Farmácia ou direcione para Leito.',
    nextTab: 'farmacia',
    nextLabel: 'Farmácia & Estoque',
    icon: 'fa-pills'
  },
  medicos: {
    currentLabel: 'Corpo Clínico',
    title: 'Ir para Consultórios & Atendimentos',
    desc: 'Acompanhe as salas médicas ativas e atenda os pacientes na fila.',
    nextTab: 'consultorios',
    nextLabel: 'Salas & Consultórios',
    icon: 'fa-stethoscope'
  },
  farmacia: {
    currentLabel: 'Farmácia & Medicamentos',
    title: 'Alocar Leito ou Faturamento',
    desc: 'Medicamentos dispensados. Acompanhe a internação no Mapa de Leitos.',
    nextTab: 'leitos',
    nextLabel: 'Gestão de Leitos & Internação',
    icon: 'fa-bed-pulse'
  },
  leitos: {
    currentLabel: 'Gestão de Leitos',
    title: 'Acompanhar Fluxo no Kanban',
    desc: 'Monitore as alas hospitalares e a previsão de altas em tempo real.',
    nextTab: 'kanban',
    nextLabel: 'Kanban Hospitalar',
    icon: 'fa-table-columns'
  },
  kanban: {
    currentLabel: 'Kanban Hospitalar',
    title: 'Faturamento & Fechamento de Contas',
    desc: 'Gere os lotes eletrônicos no padrão TISS 4.01 para as operadoras.',
    nextTab: 'financeiro',
    nextLabel: 'Faturamento & Financeiro',
    icon: 'fa-file-invoice-dollar'
  },
  financeiro: {
    currentLabel: 'Faturamento & TISS',
    title: 'Relatórios & Métricas Estratégicas',
    desc: 'Consulte os gráficos analíticos, DRE e indicadores de desempenho.',
    nextTab: 'relatorios',
    nextLabel: 'Relatórios & Métricas',
    icon: 'fa-chart-pie'
  },
  relatorios: {
    currentLabel: 'Relatórios Gerenciais',
    title: 'Voltar ao Dashboard Geral',
    desc: 'Acompanhe as taxas de resolutividade e ocupação do hospital.',
    nextTab: 'dashboard',
    nextLabel: 'Dashboard Principal',
    icon: 'fa-gauge-high'
  },
  tv_panel: {
    currentLabel: 'Painel TV (Chamador)',
    title: 'Atender no Consultório',
    desc: 'Paciente chamado na TV! Inicie a anamnese e registro no PEP.',
    nextTab: 'consultorios',
    nextLabel: 'Salas & Consultórios',
    icon: 'fa-user-doctor'
  },
  agenda: {
    currentLabel: 'Agenda & Consultas',
    title: 'Recepção de Agendados',
    desc: 'Confirme a chegada do paciente e envie para a Triagem.',
    nextTab: 'pacientes',
    nextLabel: 'Recepção & Pacientes',
    icon: 'fa-hospital-user'
  },
  estagnacao: {
    currentLabel: 'Alertas & Estagnação',
    title: 'Destravar Pacientes Críticos',
    desc: 'Agilize pacientes com tempo de espera elevado no PS ou Leitos.',
    nextTab: 'atendimento',
    nextLabel: 'Central de Atendimento',
    icon: 'fa-triangle-exclamation'
  },
  configuracoes: {
    currentLabel: 'Configurações do Sistema',
    title: 'Retornar ao Dashboard',
    desc: 'Ajustes concluídos. Retorne à operação geral.',
    nextTab: 'dashboard',
    nextLabel: 'Dashboard Principal',
    icon: 'fa-gauge-high'
  }
};

// ─── GERENCIAMENTO DE CONTEXTO DO PACIENTE ───────────────────────────────────

export const setActivePatientContext = (patient) => {
  activePatientContext = patient || null;
  if (!patient) {
    try { localStorage.removeItem('activePatientContext'); } catch(e) {}
  }
  updateFloatingWorkflowGuide(currentActiveTabId);
};

export const getActivePatientContext = () => activePatientContext;

export function getManchesterColor(color) {
  const map = {
    'Vermelho': '#ef4444',
    'Laranja': '#f97316',
    'Amarelo': '#eab308',
    'Verde': '#10b981',
    'Azul': '#3b82f6'
  };
  return map[color] || '#10b981';
}

// ─── INICIALIZAÇÃO DO CARD FLUTUANTE GUIA DE FLUXO (SMART FLOW GUIDE) ────────

export function initFloatingWorkflowGuide() {
  document.querySelectorAll('#floating-flow-guide').forEach(el => el.remove());
  if (typeof window.createSmartFlowGuideCard === 'function') {
    window.createSmartFlowGuideCard(currentActiveTabId);
  }
}

export function updateFloatingWorkflowGuide(tabId = 'dashboard', lastAction = null) {
  document.querySelectorAll('#floating-flow-guide').forEach(el => el.remove());
  currentActiveTabId = tabId || 'dashboard';
  if (lastAction) lastActionMessage = lastAction;
  if (typeof window.createSmartFlowGuideCard === 'function') {
    window.createSmartFlowGuideCard(currentActiveTabId, lastAction);
  }
}

// ─── STEPPER DE LINHA DE CUIDADO DENTRO DAS ABAS ──────────────────────────────

export function renderPatientJourneyStepper(container, currentStep = 'consulta') {
  if (!container || !activePatientContext) return;

  const stepOrder = ['recepcao', 'triagem', 'consulta', 'farmacia', 'desfecho'];
  const currentIndex = stepOrder.indexOf(currentStep);

  container.innerHTML = `
    <div class="patient-journey-stepper">
      <div class="stepper-header-info">
        <div class="stepper-patient-avatar">
          <i class="fa-solid fa-hospital-user"></i>
        </div>
        <div>
          <div style="font-weight: 700; font-size: 0.88rem; color: var(--text-primary);">
            ${activePatientContext.fullName || activePatientContext.patientName || 'Paciente Ativo'}
          </div>
          <div style="font-size: 0.72rem; color: var(--text-muted);">
            CPF: ${activePatientContext.cpf || '—'} | Risco: <strong style="color: ${getManchesterColor(activePatientContext.manchesterColor)};">${activePatientContext.manchesterColor || 'Verde'}</strong>
          </div>
        </div>
      </div>

      <div class="stepper-steps-track">
        ${WORKFLOW_STEPS.map((step, idx) => {
          let statusClass = 'pending';
          if (idx < currentIndex) statusClass = 'completed';
          else if (idx === currentIndex) statusClass = 'active';

          return `
            <div class="stepper-step ${statusClass}" onclick="window.switchTab('${step.tab}')" title="Ir para ${step.label}">
              <i class="fa-solid ${statusClass === 'completed' ? 'fa-check' : step.icon}"></i>
              <span>${step.label}</span>
            </div>
            ${idx < WORKFLOW_STEPS.length - 1 ? '<i class="fa-solid fa-chevron-right stepper-arrow"></i>' : ''}
          `;
        }).join('')}
      </div>

      <div>
        <button class="btn btn-sm" onclick="window.showClinicalHandoffModal()" style="font-size: 0.76rem; padding: 6px 12px; background: linear-gradient(135deg, #10b981, #059669); color: #ffffff; border: none; border-radius: 8px; font-weight: 700; cursor: pointer;">
          <i class="fa-solid fa-bolt"></i> Desfecho Rápido
        </button>
      </div>
    </div>
  `;
}

// ─── MODAL DE DESFECHO CLÍNICO RÁPIDO (1-CLICK HAND-OFF) ──────────────────────

export function showClinicalHandoffModal() {
  if (!activePatientContext) {
    showToast('⚠️ Selecione um paciente primeiro.');
    return;
  }

  let modal = document.getElementById('clinical-handoff-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'clinical-handoff-modal';
    modal.className = 'modal-overlay';
    document.body.appendChild(modal);
  }

  const pName = activePatientContext.fullName || activePatientContext.patientName;

  modal.style.display = 'flex';
  modal.innerHTML = `
    <div class="modal-content" style="max-width: 680px; width: 95vw;">
      <div class="modal-header">
        <h3><i class="fa-solid fa-bolt" style="color: #10b981;"></i> Desfecho Clínico Rápido (1-Click Hand-off)</h3>
        <button type="button" class="modal-close" onclick="document.getElementById('clinical-handoff-modal').style.display='none'"><i class="fa-solid fa-xmark"></i></button>
      </div>
      <div class="modal-body" style="padding: 20px;">
        <p style="color: var(--text-secondary); margin-bottom: 16px; font-size: 0.85rem;">
          Defina o destino clínico para <strong>${pName}</strong>. O sistema executará a transição de setor e notificará a equipe responsável imediatamente.
        </p>

        <div class="handoff-options-grid">
          <!-- Opção 1: Alta Médica -->
          <div class="handoff-option-card alta" onclick="window.executeHandoffAction('alta')">
            <div style="font-size: 1.3rem; color: #10b981;"><i class="fa-solid fa-circle-check"></i></div>
            <div>
              <strong style="color: #34d399; font-size: 0.92rem; display: block; margin-bottom: 4px;">Alta Médica Imediata</strong>
              <p style="font-size: 0.75rem; color: var(--text-muted); margin: 0; line-height: 1.4;">Finaliza o atendimento, gera o resumo clínico e libera a vaga do consultório.</p>
            </div>
          </div>

          <!-- Opção 2: Observação no PS -->
          <div class="handoff-option-card obs" onclick="window.executeHandoffAction('observacao')">
            <div style="font-size: 1.3rem; color: #f59e0b;"><i class="fa-solid fa-clock"></i></div>
            <div>
              <strong style="color: #fbbf24; font-size: 0.92rem; display: block; margin-bottom: 4px;">Observação PS (12 Horas)</strong>
              <p style="font-size: 0.75rem; color: var(--text-muted); margin: 0; line-height: 1.4;">Inicia o cronômetro de permanência no Pronto-Socorro com monitoramento contínuo.</p>
            </div>
          </div>

          <!-- Opção 3: Solicitar Internação -->
          <div class="handoff-option-card internar" onclick="window.executeHandoffAction('internacao')">
            <div style="font-size: 1.3rem; color: #ef4444;"><i class="fa-solid fa-bed-pulse"></i></div>
            <div>
              <strong style="color: #f87171; font-size: 0.92rem; display: block; margin-bottom: 4px;">Solicitar Internação / Leito</strong>
              <p style="font-size: 0.75rem; color: var(--text-muted); margin: 0; line-height: 1.4;">Direciona para o Mapa de Leitos para alocação em Enfermaria ou UTI.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}

export async function executeHandoffAction(action) {
  const modal = document.getElementById('clinical-handoff-modal');
  if (modal) modal.style.display = 'none';

  const p = activePatientContext;
  if (!p) return;

  const pName = p.fullName || p.patientName;

  if (action === 'alta') {
    showToast(`✅ Alta concedida para ${pName}! Atendimento finalizado.`);
    updateFloatingWorkflowGuide('atendimento', `Alta médica de ${pName}`);
    if (typeof window.showFlowCompletionNotification === 'function') {
      window.showFlowCompletionNotification({
        actionTitle: '✅ Alta Médica Concluída',
        message: `O paciente <strong>${pName}</strong> recebeu alta médica. O relatório foi arquivado no prontuário.`,
        targetTab: 'atendimento',
        targetTabLabel: 'Central de Atendimentos',
        persistent: true
      });
    }
  } else if (action === 'observacao') {
    showToast(`⏱️ ${pName} colocado em Observação Médica (12h PS).`);
    updateFloatingWorkflowGuide('atendimento', `Observação PS para ${pName}`);
    if (typeof window.switchTab === 'function') window.switchTab('atendimento');
  } else if (action === 'internacao') {
    showToast(`🏥 Solicitando internação para ${pName}... Abrindo Mapa de Leitos.`);
    updateFloatingWorkflowGuide('leitos', `Solicitação de Leito para ${pName}`);
    if (typeof window.switchTab === 'function') window.switchTab('leitos');
  }
}

export function renderFloatingPatientHUD() {
  updateFloatingWorkflowGuide();
}

// Vinculação global ao window
if (typeof window !== 'undefined') {
  window.initFloatingWorkflowGuide = initFloatingWorkflowGuide;
  window.updateFloatingWorkflowGuide = updateFloatingWorkflowGuide;
  window.renderFloatingPatientHUD = renderFloatingPatientHUD;
  window.setActivePatientContext = setActivePatientContext;
  window.getActivePatientContext = getActivePatientContext;
  window.renderPatientJourneyStepper = renderPatientJourneyStepper;
  window.showClinicalHandoffModal = showClinicalHandoffModal;
  window.executeHandoffAction = executeHandoffAction;

  // NOTA: O card só é inicializado pelo main.js APÓS autenticação.
  // Não auto-inicializar aqui para evitar criar o card na tela de login.
}
