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
  activePatientContext = patient;
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
  let guide = document.getElementById('floating-flow-guide');
  if (!guide) {
    guide = document.createElement('div');
    guide.id = 'floating-flow-guide';
    guide.className = 'floating-flow-guide';
    document.body.appendChild(guide);
  }

  updateFloatingWorkflowGuide(currentActiveTabId);
}

export function updateFloatingWorkflowGuide(tabId = 'dashboard', lastAction = null) {
  currentActiveTabId = tabId || 'dashboard';
  if (lastAction) lastActionMessage = lastAction;

  let guide = document.getElementById('floating-flow-guide');
  if (!guide) {
    initFloatingWorkflowGuide();
    guide = document.getElementById('floating-flow-guide');
    if (!guide) return;
  }

  const rec = TAB_NEXT_RECOMMENDATION[currentActiveTabId] || TAB_NEXT_RECOMMENDATION.dashboard;

  if (isGuideMinimized) {
    guide.className = 'floating-flow-guide minimized';
    guide.innerHTML = `
      <div id="flow-guide-mini-btn" style="
        background: linear-gradient(135deg, #1e1b4b, #0f172a);
        border: 1px solid rgba(99,102,241,0.5);
        padding: 8px 14px;
        border-radius: 24px;
        display: flex;
        align-items: center;
        gap: 8px;
        cursor: grab;
        box-shadow: 0 4px 16px rgba(79, 70, 229, 0.4);
        color: #ffffff;
        font-weight: 700;
        font-size: 0.78rem;
        white-space: nowrap;
      " title="Clique para expandir o Guia de Fluxo">
        <i class="fa-solid fa-route" style="color:#38bdf8; font-size: 0.85rem;"></i>
        <span style="color:#a5b4fc;">Próximo:</span> <strong style="color:#fff;">${rec.nextLabel}</strong>
        <i class="fa-solid fa-chevron-up" style="font-size: 0.65rem; opacity: 0.7; margin-left: 2px;"></i>
      </div>
    `;

    const miniBtn = guide.querySelector('#flow-guide-mini-btn');
    if (miniBtn) {
      miniBtn.addEventListener('click', () => {
        isGuideMinimized = false;
        updateFloatingWorkflowGuide(currentActiveTabId);
      });
    }
    makeDraggable(guide, miniBtn);
    return;
  }

  // ─── CARD EXPANDIDO: RETÂNGULO COMPACTO E LEGÍVEL ───
  const stepActiveIdx = WORKFLOW_STEPS.findIndex(s => s.tab === currentActiveTabId);

  guide.className = 'floating-flow-guide';
  guide.innerHTML = `
    <!-- Cabeçalho (handle de arrasto) -->
    <div id="flow-guide-drag-handle" style="
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 9px 12px 8px 12px;
      border-bottom: 1px solid rgba(255,255,255,0.07);
      cursor: grab;
      background: rgba(255,255,255,0.03);
      border-radius: 14px 14px 0 0;
    ">
      <div style="display:flex;align-items:center;gap:7px;">
        <i class="fa-solid fa-route" style="color:#38bdf8;font-size:0.85rem;"></i>
        <span style="font-weight:800;font-size:0.82rem;color:#f1f5f9;letter-spacing:0.2px;">Guia de Fluxo</span>
        <span style="font-size:0.6rem;font-weight:800;text-transform:uppercase;letter-spacing:0.5px;color:#38bdf8;background:rgba(56,189,248,0.12);border:1px solid rgba(56,189,248,0.3);padding:1px 6px;border-radius:8px;">Passo a Passo</span>
      </div>
      <button id="btn-minimize-flow-guide" title="Minimizar" style="
        background:none;border:none;color:#64748b;cursor:pointer;
        font-size:0.8rem;padding:2px 5px;border-radius:5px;
        transition:color 0.2s;
      " onmouseover="this.style.color='#fff'" onmouseout="this.style.color='#64748b'">
        <i class="fa-solid fa-minus"></i>
      </button>
    </div>

    <!-- Trilha de Etapas (horizontal compacta) -->
    <div style="
      display:flex;
      align-items:center;
      padding:8px 10px 6px 10px;
      gap:0;
      border-bottom:1px solid rgba(255,255,255,0.06);
    ">
      ${WORKFLOW_STEPS.map((step, idx) => {
        const isDone = stepActiveIdx > idx;
        const isNow = stepActiveIdx === idx;
        const color = isDone ? '#10b981' : isNow ? '#38bdf8' : '#475569';
        const bg = isDone ? 'rgba(16,185,129,0.15)' : isNow ? 'rgba(56,189,248,0.15)' : 'rgba(255,255,255,0.04)';
        const border = isDone ? 'rgba(16,185,129,0.4)' : isNow ? 'rgba(56,189,248,0.5)' : 'rgba(255,255,255,0.08)';
        return `
          <button onclick="window.switchTab('${step.tab}')" title="${step.label}" style="
            flex:1;display:flex;flex-direction:column;align-items:center;
            gap:3px;padding:5px 2px;border:none;background:none;cursor:pointer;
            border-radius:8px;transition:background 0.2s;
          " onmouseover="this.style.background='rgba(255,255,255,0.06)'" onmouseout="this.style.background='none'">
            <div style="
              width:28px;height:28px;border-radius:50%;
              background:${bg};border:1.5px solid ${border};
              display:flex;align-items:center;justify-content:center;
            ">
              <i class="fa-solid ${isDone ? 'fa-check' : step.icon}" style="font-size:0.7rem;color:${color};"></i>
            </div>
            <span style="font-size:0.58rem;font-weight:${isNow?'800':'600'};color:${color};white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:52px;">
              ${step.label.replace(/^\d+\.\s*/, '')}
            </span>
          </button>
          ${idx < WORKFLOW_STEPS.length - 1 ? `<div style="flex-shrink:0;width:10px;height:1px;background:${isDone?'#10b981':'rgba(255,255,255,0.1)'};margin-bottom:14px;"></div>` : ''}
        `;
      }).join('')}
    </div>

    <!-- Próxima Ação: compacta -->
    <div style="padding:10px 12px;">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:5px;">
        <span style="font-size:0.62rem;font-weight:800;text-transform:uppercase;letter-spacing:0.5px;color:#a5b4fc;display:flex;align-items:center;gap:4px;">
          <span style="color:#fbbf24;">⚡</span> Próximo Passo
        </span>
        <span style="font-size:0.62rem;color:#64748b;display:flex;align-items:center;gap:3px;">
          <i class="fa-solid fa-location-dot" style="color:#38bdf8;font-size:0.6rem;"></i>
          ${rec.currentLabel}
        </span>
      </div>

      <div style="margin-bottom:8px;">
        <div style="font-size:0.86rem;font-weight:800;color:#ffffff;margin-bottom:2px;">${rec.title}</div>
        <div style="font-size:0.73rem;color:#94a3b8;line-height:1.35;">${rec.desc}</div>
      </div>

      <button onclick="window.switchTab('${rec.nextTab}')" style="
        width:100%;padding:8px 12px;
        background:linear-gradient(135deg,#10b981,#059669);
        color:#fff;border:none;border-radius:9px;
        font-weight:800;font-size:0.78rem;
        cursor:pointer;display:flex;align-items:center;justify-content:center;
        gap:6px;box-shadow:0 3px 12px rgba(16,185,129,0.35);
        transition:filter 0.2s;
      " onmouseover="this.style.filter='brightness(1.12)'" onmouseout="this.style.filter='none'">
        Avançar para: <strong>${rec.nextLabel}</strong>
        <i class="fa-solid fa-arrow-right" style="font-size:0.72rem;"></i>
      </button>

      ${activePatientContext ? `
        <div style="
          margin-top:8px;display:flex;align-items:center;justify-content:space-between;
          background:rgba(16,185,129,0.08);border:1px solid rgba(16,185,129,0.25);
          border-radius:8px;padding:6px 10px;gap:6px;
        ">
          <div style="display:flex;align-items:center;gap:6px;min-width:0;">
            <div style="width:7px;height:7px;border-radius:50%;background:#10b981;box-shadow:0 0 6px #10b981;flex-shrink:0;"></div>
            <div style="min-width:0;">
              <div style="font-size:0.6rem;color:#6ee7b7;font-weight:700;text-transform:uppercase;">Paciente</div>
              <div style="font-size:0.76rem;font-weight:800;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:130px;">${activePatientContext.fullName || activePatientContext.patientName}</div>
            </div>
          </div>
          <div style="display:flex;gap:4px;flex-shrink:0;">
            <button onclick="window.openPEPModal('${activePatientContext.id}')" style="background:rgba(99,102,241,0.25);border:1px solid rgba(99,102,241,0.4);color:#a5b4fc;padding:3px 8px;border-radius:6px;font-size:0.68rem;font-weight:700;cursor:pointer;">PEP</button>
            <button onclick="window.showClinicalHandoffModal()" style="background:rgba(245,158,11,0.25);border:1px solid rgba(245,158,11,0.4);color:#fbbf24;padding:3px 8px;border-radius:6px;font-size:0.68rem;font-weight:700;cursor:pointer;">Alta</button>
          </div>
        </div>
      ` : ''}
    </div>
  `;

  const minBtn = guide.querySelector('#btn-minimize-flow-guide');
  if (minBtn) {
    minBtn.addEventListener('click', () => {
      isGuideMinimized = true;
      updateFloatingWorkflowGuide(currentActiveTabId);
    });
  }

  const dragHandle = guide.querySelector('#flow-guide-drag-handle');
  if (dragHandle) {
    makeDraggable(guide, dragHandle);
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

  // Auto-inicializar com segurança assim que o documento carregar
  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    setTimeout(initFloatingWorkflowGuide, 300);
  } else {
    document.addEventListener('DOMContentLoaded', () => {
      setTimeout(initFloatingWorkflowGuide, 300);
    });
  }
}
