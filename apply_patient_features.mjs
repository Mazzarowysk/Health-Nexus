import { readFileSync, writeFileSync } from 'fs';

// 1. Atualizar backend/app.js com GET /api/patients/:id/history
const appJsPath = 'c:/Health Nexus/backend/app.js';
let appJsContent = readFileSync(appJsPath, 'utf8');

const historyEndpointCode = `
// Rota de Histórico Clínico & Prontuário Pós-Alta do Paciente
app.get('/api/patients/:id/history', async (req, res) => {
  try {
    const { id } = req.params;
    
    const patientRes = await db.execute({
      sql: 'SELECT * FROM patients WHERE id = ?',
      args: [id]
    });

    const patient = patientRes.rows[0] || { id, fullName: 'Paciente Agendado' };

    const encountersRes = await db.execute({
      sql: \`
        SELECT 
          e.id, e.patientId, e.type, e.status, e.admitted_at, e.completed_at,
          t.manchesterColor, t.bloodPressure, t.temperatureCelsius, t.complaints,
          cn.noteType, cn.subjectiveContent, cn.assessmentContent, cn.planContent
        FROM encounters e
        LEFT JOIN triages t ON e.id = t.encounterId
        LEFT JOIN clinical_notes cn ON e.id = cn.encounterId
        WHERE e.patientId = ?
        ORDER BY e.admitted_at DESC
      \`,
      args: [id]
    });

    const appointmentsRes = await db.execute({
      sql: 'SELECT * FROM appointments WHERE patientId = ? ORDER BY appointmentDate DESC',
      args: [id]
    });

    const prescriptionsRes = await db.execute({
      sql: 'SELECT * FROM prescriptions WHERE patientId = ? ORDER BY created_at DESC',
      args: [id]
    });

    res.status(200).json({
      status: 'success',
      data: {
        patient,
        encounters: encountersRes.rows || [],
        appointments: appointmentsRes.rows || [],
        prescriptions: prescriptionsRes.rows || []
      }
    });
  } catch (err) {
    console.error('Erro ao buscar histórico do paciente:', err);
    res.status(500).json({ status: 'error', message: 'Falha ao buscar histórico do paciente.' });
  }
});
`;

if (!appJsContent.includes('/api/patients/:id/history')) {
  appJsContent = appJsContent.replace("export default app;", historyEndpointCode + "\nexport default app;");
  writeFileSync(appJsPath, appJsContent, 'utf8');
  console.log('✅ Rota GET /api/patients/:id/history adicionada em backend/app.js!');
}

// 2. Atualizar src/styles.css com os estilos dos botões de ação e modal
const stylesPath = 'c:/Health Nexus/src/styles.css';
let stylesContent = readFileSync(stylesPath, 'utf8');

const extraCss = `
/* === BOTÕES DE AÇÃO ADICIONAIS NA TABELA DE PACIENTES === */
.btn-icon-admit {
  background: rgba(34, 211, 238, 0.12) !important;
  color: #22d3ee !important;
  border: 1px solid rgba(34, 211, 238, 0.3) !important;
}
.btn-icon-admit:hover {
  background: rgba(34, 211, 238, 0.25) !important;
  box-shadow: 0 0 12px rgba(34, 211, 238, 0.4) !important;
  transform: translateY(-1px);
}

.btn-icon-history {
  background: rgba(168, 85, 247, 0.12) !important;
  color: #c084fc !important;
  border: 1px solid rgba(168, 85, 247, 0.3) !important;
}
.btn-icon-history:hover {
  background: rgba(168, 85, 247, 0.25) !important;
  box-shadow: 0 0 12px rgba(168, 85, 247, 0.4) !important;
  transform: translateY(-1px);
}

.badge-alta {
  background: rgba(16, 185, 129, 0.15) !important;
  color: #34d399 !important;
  border: 1px solid rgba(16, 185, 129, 0.3) !important;
  padding: 4px 10px;
  border-radius: 20px;
  font-size: 0.75rem;
  font-weight: 700;
}
`;

if (!stylesContent.includes('.btn-icon-admit')) {
  stylesContent += extraCss;
  writeFileSync(stylesPath, stylesContent, 'utf8');
  console.log('✅ Estilos CSS adicionados em src/styles.css!');
}

// 3. Atualizar src/main.js com os botões e modais de histórico e atalho
const mainJsPath = 'c:/Health Nexus/src/main.js';
let mainJsContent = readFileSync(mainJsPath, 'utf8');

const clientHelpers = `

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
      preview.innerHTML = \`
        <div style="font-weight:700; color: var(--color-primary); font-size:1.05rem;">\${fullName}</div>
        <div style="font-size:0.78rem; color: var(--text-secondary); margin-top:4px;">CPF: \${cpf || 'Não informado'} · Paciente selecionado</div>
      \`;
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
  modal.innerHTML = \`
    <div class="modal-content" style="max-width: 900px; width: 92%; max-height: 90vh; display: flex; flex-direction: column; overflow: hidden; background: var(--bg-secondary); border: 1px solid var(--border-color); border-radius: 18px; box-shadow: 0 25px 60px rgba(0,0,0,0.65);">
      
      <div class="modal-header" style="padding: 20px 28px; background: linear-gradient(135deg, #1e1b4b, #311b92); border-bottom: 1px solid var(--border-color); display: flex; justify-content: space-between; align-items: center;">
        <div style="display: flex; align-items: center; gap: 14px;">
          <div style="width: 44px; height: 44px; border-radius: 12px; background: rgba(139,92,246,0.25); border: 1px solid rgba(139,92,246,0.4); display: flex; align-items: center; justify-content: center; color: #a78bfa;">
            <i class="fa-solid fa-file-medical" style="font-size: 1.3rem;"></i>
          </div>
          <div>
            <h3 style="font-family: Outfit, sans-serif; font-size: 1.25rem; font-weight: 700; color: #fff; margin: 0;">Prontuário & Histórico Clínico</h3>
            <div style="font-size: 0.82rem; color: #c4b5fd;">Paciente: <strong style="color: #fff;">\${patientName}</strong></div>
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
  \`;
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
      bodyEl.innerHTML = \`
        <div style="text-align: center; color: var(--text-muted); padding: 40px 20px;">
          <i class="fa-solid fa-folder-open" style="font-size: 2.5rem; color: var(--text-muted); margin-bottom: 12px; opacity: 0.5;"></i>
          <h4 style="color: var(--text-primary); margin-bottom: 6px;">Nenhum atendimento registrado</h4>
          <p style="font-size: 0.85rem;">Este paciente ainda não possui histórico de consultas ou internações pós-alta.</p>
        </div>
      \`;
      return;
    }

    let html = \`
      <div style="margin-bottom: 20px; font-weight: 700; color: var(--text-primary); font-size: 1rem; display: flex; align-items: center; gap: 8px;">
        <i class="fa-solid fa-clock-rotate-left" style="color: var(--color-primary);"></i> Histórico de Atendimentos & Pós-Alta (\${encounters.length})
      </div>
      <div style="display: flex; flex-direction: column; gap: 14px;">
    \`;

    encounters.forEach(enc => {
      const isCompleted = enc.status === 'Finalizado' || enc.completed_at;
      const statusLabel = isCompleted ? 'Alta Médica / Finalizado' : enc.status;
      const dateText = enc.admitted_at ? new Date(enc.admitted_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Data não registrada';

      html += \`
        <div style="background: var(--bg-tertiary); border: 1px solid var(--border-color); border-left: 4px solid \${isCompleted ? '#10b981' : '#f59e0b'}; border-radius: 12px; padding: 18px 22px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; flex-wrap: wrap; gap: 8px;">
            <div style="display: flex; align-items: center; gap: 10px;">
              <span style="font-weight: 700; font-size: 0.95rem; color: var(--text-primary);">Tipo: \${enc.type === 'Urgencia' ? 'Urgência (PS)' : 'Ambulatório'}</span>
              <span class="\${isCompleted ? 'badge-alta' : 'badge-warning'}" style="font-size: 0.72rem;">
                <i class="fa-solid \${isCompleted ? 'fa-circle-check' : 'fa-spinner fa-spin'}" style="margin-right: 4px;"></i>\${statusLabel}
              </span>
            </div>
            <span style="font-size: 0.78rem; color: var(--text-muted);"><i class="fa-solid fa-calendar" style="margin-right: 4px;"></i>\${dateText}</span>
          </div>

          <div style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 6px;">
            <strong>Queixa Principal / Triagem:</strong> \${enc.complaints || 'Sem registro de queixa'}
          </div>

          \${enc.subjectiveContent ? \`
            <div style="font-size: 0.82rem; background: rgba(0,0,0,0.2); padding: 10px 14px; border-radius: 8px; margin-top: 8px; color: var(--text-primary); border: 1px solid rgba(255,255,255,0.05);">
              <strong>Avaliação Médica / PEP:</strong> \${enc.subjectiveContent}
            </div>
          \` : ''}
        </div>
      \`;
    });

    html += \`</div>\`;
    bodyEl.innerHTML = html;

  } catch (e) {
    document.getElementById('history-modal-body').innerHTML = \`
      <div style="text-align: center; color: #f87171; padding: 40px;">Erro ao carregar o prontuário do paciente.</div>
    \`;
  }
};
`;

mainJsContent = mainJsContent.replace(/\/\/ ==========================================\n\/\/ FUNÇÕES GLOBAIS DE INTERATIVIDADE E AGENDA[\s\S]*/, '');
mainJsContent += clientHelpers;

// Atualizar botões na tabela de pacientes em main.js
const oldActionButtons = `<button class="btn-icon btn-icon-delete" data-delete-id="\${p.id}" title="Excluir">
                  <i class="fa-solid fa-trash-can"></i>
                </button>`;

const newActionButtons = `<button class="btn-icon btn-icon-admit" onclick="admitPatientFromPatientsTab('\${p.id}', '\${(p.fullName||'').replace(/'/g, "\\\\'")}', '\${p.cpf||''}')" title="Admitir / Atender este Paciente">
                  <i class="fa-solid fa-hospital-user"></i>
                </button>
                <button class="btn-icon btn-icon-history" onclick="openPatientHistoryModal('\${p.id}', '\${(p.fullName||'').replace(/'/g, "\\\\'")}')" title="Ver Prontuário & Histórico Pós-Alta">
                  <i class="fa-solid fa-file-medical"></i>
                </button>
                <button class="btn-icon btn-icon-delete" data-delete-id="\${p.id}" title="Excluir">
                  <i class="fa-solid fa-trash-can"></i>
                </button>`;

mainJsContent = mainJsContent.replace(oldActionButtons, newActionButtons);

writeFileSync(mainJsPath, mainJsContent, 'utf8');
console.log('✅ apply_patient_features.mjs executado com sucesso em src/main.js!');
