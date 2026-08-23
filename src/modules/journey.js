// ─── MÓDULO DE LINHA DE CUIDADO GUIADA & JOURNEY STEPPER (HEALTH NEXUS v2.7.2) ───
import { state } from '../state.js';
import { showToast } from './ui.js';
import { apiFetch } from './api.js';

let activePatientContext = null;

export const setActivePatientContext = (patient) => {
  activePatientContext = patient;
  renderFloatingPatientHUD();
};

export const getActivePatientContext = () => activePatientContext;

export function renderPatientJourneyStepper(container, currentStep = 'consulta') {
  if (!container || !activePatientContext) return;

  const steps = [
    { id: 'recepcao', label: '1. Recepção', icon: 'fa-id-card', tab: 'pacientes' },
    { id: 'triagem', label: '2. Triagem Manchester', icon: 'fa-user-nurse', tab: 'atendimento' },
    { id: 'consulta', label: '3. Consulta Médica', icon: 'fa-user-doctor', tab: 'consultorios' },
    { id: 'farmacia', label: '4. Farmácia & Exames', icon: 'fa-pills', tab: 'farmacia' },
    { id: 'desfecho', label: '5. Desfecho Clínico', icon: 'fa-flag-checkered', tab: 'leitos' }
  ];

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
        ${steps.map((step, idx) => {
          let statusClass = 'pending';
          if (idx < currentIndex) statusClass = 'completed';
          else if (idx === currentIndex) statusClass = 'active';

          return `
            <div class="stepper-step ${statusClass}" onclick="window.handleStepperStepClick('${step.tab}', '${step.id}')" title="Ir para ${step.label}">
              <i class="fa-solid ${statusClass === 'completed' ? 'fa-check' : step.icon}"></i>
              <span>${step.label}</span>
            </div>
            ${idx < steps.length - 1 ? '<i class="fa-solid fa-chevron-right stepper-arrow"></i>' : ''}
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

function getManchesterColor(color) {
  const map = {
    'Vermelho': '#ef4444',
    'Laranja': '#f97316',
    'Amarelo': '#eab308',
    'Verde': '#10b981',
    'Azul': '#3b82f6'
  };
  return map[color] || '#10b981';
}

window.handleStepperStepClick = function(targetTab, stepId) {
  if (typeof window.switchTab === 'function') {
    showToast(`📍 Navegando na Linha de Cuidado: ${stepId.toUpperCase()}`);
    window.switchTab(targetTab);
  }
};

export function renderFloatingPatientHUD() {
  let hud = document.getElementById('floating-patient-hud');
  if (!activePatientContext) {
    if (hud) hud.style.display = 'none';
    return;
  }

  if (!hud) {
    hud = document.createElement('div');
    hud.id = 'floating-patient-hud';
    hud.className = 'floating-patient-hud';
    document.body.appendChild(hud);
  }

  hud.style.display = 'flex';
  hud.innerHTML = `
    <div style="display: flex; align-items: center; gap: 10px;">
      <div style="width: 10px; height: 10px; border-radius: 50%; background: #10b981; box-shadow: 0 0 8px #10b981; animation: pulse 1.5s infinite;"></div>
      <div class="hud-patient-info">
        <span style="font-size: 0.72rem; color: #38bdf8; text-transform: uppercase; font-weight: 700; letter-spacing: 0.04em;">Paciente em Foco</span>
        <strong style="font-size: 0.88rem; color: #ffffff;">${activePatientContext.fullName || activePatientContext.patientName}</strong>
      </div>
    </div>

    <div class="hud-actions-group">
      <button onclick="window.openTelemedicineModal({ id: '${activePatientContext.id}', patientName: '${(activePatientContext.fullName || activePatientContext.patientName || '').replace(/'/g, "\\'")}' })" class="btn" style="font-size: 0.74rem; padding: 5px 10px; background: rgba(16, 185, 129, 0.15); border: 1px solid rgba(16, 185, 129, 0.35); color: #34d399; border-radius: 6px; cursor: pointer;" title="Iniciar Teleconsulta">
        <i class="fa-solid fa-video"></i> Telemed
      </button>
      <button onclick="window.openPEPModal('${activePatientContext.id}')" class="btn" style="font-size: 0.74rem; padding: 5px 10px; background: rgba(2, 132, 199, 0.15); border: 1px solid rgba(2, 132, 199, 0.35); color: #38bdf8; border-radius: 6px; cursor: pointer;" title="Abrir Prontuário">
        <i class="fa-solid fa-file-medical"></i> PEP
      </button>
      <button onclick="window.showClinicalHandoffModal()" class="btn" style="font-size: 0.74rem; padding: 5px 10px; background: rgba(245, 158, 11, 0.15); border: 1px solid rgba(245, 158, 11, 0.35); color: #fbbf24; border-radius: 6px; cursor: pointer;" title="Definir Desfecho Clínico">
        <i class="fa-solid fa-bolt"></i> Desfecho
      </button>
      <button onclick="window.clearActivePatientHUD()" style="background: none; border: none; color: #94a3b8; cursor: pointer; padding: 4px; font-size: 0.85rem;" title="Fechar Foco">
        <i class="fa-solid fa-xmark"></i>
      </button>
    </div>
  `;
}

window.clearActivePatientHUD = function() {
  activePatientContext = null;
  const hud = document.getElementById('floating-patient-hud');
  if (hud) hud.style.display = 'none';
  showToast('Foco no paciente encerrado.');
};

window.showClinicalHandoffModal = function() {
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
};

window.executeHandoffAction = async function(action) {
  const modal = document.getElementById('clinical-handoff-modal');
  if (modal) modal.style.display = 'none';

  const p = activePatientContext;
  if (!p) return;

  const pName = p.fullName || p.patientName;

  if (action === 'alta') {
    showToast(`✅ Alta concedida para ${pName}! Atendimento finalizado.`);
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
    if (typeof window.switchTab === 'function') window.switchTab('atendimento');
  } else if (action === 'internacao') {
    showToast(`🏥 Solicitando internação para ${pName}... Abrindo Mapa de Leitos.`);
    if (typeof window.switchTab === 'function') window.switchTab('leitos');
  }
};
