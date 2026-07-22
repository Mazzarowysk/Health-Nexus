import { readFileSync, writeFileSync } from 'fs';

// 1. Atualizar backend/app.js para incluir coluna room/consultorio em encounters se não existir
const appJsPath = 'c:/Health Nexus/backend/app.js';
let appJsContent = readFileSync(appJsPath, 'utf8');

if (!appJsContent.includes("ALTER TABLE encounters ADD COLUMN room")) {
  const alterRoomSql = `
    try { await cloud.execute("ALTER TABLE encounters ADD COLUMN room TEXT"); } catch(e){}
    try { await db.execute("ALTER TABLE encounters ADD COLUMN room TEXT"); } catch(e){}
  `;
  appJsContent = appJsContent.replace("await cloud.execute(SQL_ENCOUNTERS);", "await cloud.execute(SQL_ENCOUNTERS);\n" + alterRoomSql);
}

// Atualizar GET /api/encounters para retornar e.room as room/consultorio
if (!appJsContent.includes("e.room as room")) {
  appJsContent = appJsContent.replace(
    "e.id, e.patientId, e.type, e.status, e.admitted_at, e.completed_at,",
    "e.id, e.patientId, e.type, e.status, e.room, e.admitted_at, e.completed_at,"
  );
}

// Atualizar PUT /api/encounters/:id/status para aceitar room
const oldStatusRoute = `app.put('/api/encounters/:id/status', async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;`;

const newStatusRoute = `app.put('/api/encounters/:id/status', async (req, res) => {
  const { id } = req.params;
  const { status, room } = req.body;`;

appJsContent = appJsContent.replace(oldStatusRoute, newStatusRoute);

const oldStatusUpdate = `await db.execute({
        sql: "UPDATE encounters SET status = ? WHERE id = ?",
        args: [status, id]
      });`;

const newStatusUpdate = `await db.execute({
        sql: "UPDATE encounters SET status = ?, room = COALESCE(?, room) WHERE id = ?",
        args: [status, room || null, id]
      });`;

appJsContent = appJsContent.replace(oldStatusUpdate, newStatusUpdate);

writeFileSync(appJsPath, appJsContent, 'utf8');
console.log('✅ backend/app.js atualizado com suporte a consultórios/alas!');

// 2. Adicionar window.openPEPModal em src/main.js
const mainJsPath = 'c:/Health Nexus/src/main.js';
let mainJsContent = readFileSync(mainJsPath, 'utf8');

const pepModalCode = `

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
  modal.innerHTML = \`
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
  \`;
  document.body.appendChild(modal);

  document.getElementById('close-pep-modal').addEventListener('click', () => modal.remove());

  try {
    const res = await apiFetch('/api/encounters');
    const encounters = await res.json();
    const enc = encounters.find(e => e.id === encounterId) || {};

    const subtitleEl = document.getElementById('pep-modal-subtitle');
    if (subtitleEl) {
      subtitleEl.innerHTML = \`Paciente: <strong style="color:#fff;">\${enc.patientName || 'Paciente'}</strong> · Sala: <span style="color:#34d399;">\${enc.room || 'Consultório 01'}</span>\`;
    }

    const notesRes = await apiFetch('/api/encounters/' + encounterId + '/notes');
    const notesData = notesRes.ok ? await notesRes.json() : {};
    const notes = notesData.data || notesData || {};

    const bodyEl = document.getElementById('pep-modal-body');
    if (!bodyEl) return;

    bodyEl.innerHTML = \`
      <!-- Sinais Vitais & Dados de Triagem -->
      <div style="background: var(--bg-tertiary); border: 1px solid var(--border-color); border-radius: 12px; padding: 14px 18px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px;">
        <div>
          <span style="font-size:0.75rem; color:var(--text-muted); font-weight:600; text-transform:uppercase;">Classificação Manchester:</span>
          <span style="display:inline-block; margin-left:8px; padding:3px 12px; border-radius:20px; font-weight:700; font-size:0.8rem; background:rgba(239,68,68,0.15); color:#f87171; border:1px solid rgba(239,68,68,0.3);">\${enc.manchesterColor || 'AMARELO'}</span>
        </div>
        <div style="font-size:0.85rem; color:var(--text-primary); font-family:monospace;">
          <strong>PA:</strong> \${enc.bloodPressure || '120/80'} | <strong>Temp:</strong> \${enc.temperatureCelsius || 36.5}°C | <strong>FC:</strong> \${enc.heartRateBpm || 80} bpm
        </div>
      </div>

      <!-- Formulário SOAP / Prontuário -->
      <form id="pep-form" style="display:flex; flex-direction:column; gap:16px;">
        <div>
          <label class="form-label" style="font-weight:600; color:var(--text-primary); margin-bottom:6px; display:block;">Subjetivo (Anamnese & Queixa):</label>
          <textarea id="pep-subjective" class="form-input" style="width:100%; min-height:70px; resize:vertical;" placeholder="Relato do paciente, evolução dos sintomas...">\${notes.subjectiveContent || enc.complaints || ''}</textarea>
        </div>

        <div>
          <label class="form-label" style="font-weight:600; color:var(--text-primary); margin-bottom:6px; display:block;">Objetivo (Exame Físico / Achados):</label>
          <textarea id="pep-objective" class="form-input" style="width:100%; min-height:70px; resize:vertical;" placeholder="Exame físico, ausculta, estado geral...">\${notes.objectiveContent || ''}</textarea>
        </div>

        <div>
          <label class="form-label" style="font-weight:600; color:var(--text-primary); margin-bottom:6px; display:block;">Avaliação (Diagnóstico / CID-10):</label>
          <textarea id="pep-assessment" class="form-input" style="width:100%; min-height:60px; resize:vertical;" placeholder="Hipótese diagnóstica ou CID-10...">\${notes.assessmentContent || ''}</textarea>
        </div>

        <div>
          <label class="form-label" style="font-weight:600; color:var(--text-primary); margin-bottom:6px; display:block;">Plano Terapêutico & Prescrição:</label>
          <textarea id="pep-plan" class="form-input" style="width:100%; min-height:70px; resize:vertical;" placeholder="Conduta médica, medicação receitada, orientações de alta...">\${notes.planContent || ''}</textarea>
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
    \`;

    document.getElementById('btn-save-pep')?.addEventListener('click', async () => {
      await savePEPData(encounterId, false);
    });

    document.getElementById('pep-form')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      await savePEPData(encounterId, true);
    });

  } catch (e) {
    document.getElementById('pep-modal-body').innerHTML = \`
      <div style="text-align: center; color: #f87171; padding: 40px;">Erro ao carregar prontuário do paciente.</div>
    \`;
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
`;

mainJsContent = mainJsContent.replace(/\/\/ ==========================================\n\/\/ FUNÇÕES GLOBAIS DE INTERATIVIDADE E AGENDA[\s\S]*/, '');
mainJsContent += pepModalCode;

writeFileSync(mainJsPath, mainJsContent, 'utf8');
console.log('✅ window.openPEPModal injetado com sucesso em src/main.js!');
