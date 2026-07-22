import { readFileSync, writeFileSync } from 'fs';

// 1. Atualizar backend/app.js com a rota GET /api/doctors/:name/activity
const appJsPath = 'c:/Health Nexus/backend/app.js';
let appJsContent = readFileSync(appJsPath, 'utf8');

const doctorActivityRoute = `
// --- PAINEL DE ATIVIDADES E PROCEDIMENTOS DO MÉDICO ---
app.get('/api/doctors/:name/activity', async (req, res) => {
  try {
    const rawName = decodeURIComponent(req.params.name);
    // Limpar prefixos comuns para busca robusta no banco
    const cleanSearchName = rawName.replace(/^(Dr\\.|Dra\\.)\\s*/i, '').trim();

    // 1. Consultas e Agendamentos do médico
    const apptsRes = await db.execute({
      sql: 'SELECT * FROM appointments WHERE doctorName LIKE ? OR doctorName LIKE ? ORDER BY appointmentDate DESC, appointmentTime ASC LIMIT 50',
      args: [\`%\${rawName}%\`, \`%\${cleanSearchName}%\`]
    });

    // 2. Anotações clínicas / Prontuários (SOAP)
    const notesRes = await db.execute({
      sql: \`SELECT cn.*, p.fullName as patientName, p.cpf as patientCpf, e.status as encounterStatus, e.room
            FROM clinical_notes cn
            LEFT JOIN encounters e ON cn.encounterId = e.id
            LEFT JOIN patients p ON e.patientId = p.id
            ORDER BY cn.created_at DESC LIMIT 50\`
    });

    const appointments = apptsRes.rows || [];
    const clinicalNotes = notesRes.rows || [];

    const todayStr = new Date().toISOString().split('T')[0];
    const summary = {
      totalAppointments: appointments.length,
      todayAppointments: appointments.filter(a => a.appointmentDate === todayStr).length,
      inProgress: appointments.filter(a => a.status === 'Em Atendimento').length,
      completed: appointments.filter(a => a.status === 'Concluído').length,
      totalProcedures: clinicalNotes.length
    };

    res.status(200).json({
      status: 'success',
      doctorName: rawName,
      summary,
      appointments,
      clinicalNotes
    });
  } catch (err) {
    console.error('Erro em GET /api/doctors/:name/activity:', err);
    res.status(500).json({ status: 'error', message: 'Erro ao carregar histórico de atividades do médico: ' + err.message });
  }
});
`;

if (!appJsContent.includes('/api/doctors/:name/activity')) {
  appJsContent = appJsContent.replace("app.post('/api/beds/discharge'", doctorActivityRoute + "\napp.post('/api/beds/discharge'");
  writeFileSync(appJsPath, appJsContent, 'utf8');
  console.log('✅ Rota GET /api/doctors/:name/activity adicionada em backend/app.js!');
}

// 2. Atualizar src/main.js com o botão de Ação e o Modal do Médico
const mainJsPath = 'c:/Health Nexus/src/main.js';
let mainJsContent = readFileSync(mainJsPath, 'utf8');

// Injetar o botão Atividades na tabela de médicos
const oldButtons = `<button class="btn-edit-doctor" data-id="\${d.id}" title="Editar"`;
const newButtons = `<button class="btn-doctor-activity" onclick="openDoctorActivityModal('\${d.name}', '\${d.specialty}', '\${d.crm}')" title="Ver Atendimentos, Procedimentos e Solicitações do Médico" style="display: inline-flex; align-items: center; gap: 6px; padding: 6px 12px; border-radius: 8px; border: 1px solid rgba(99,102,241,0.3); background: rgba(99,102,241,0.12); color: #818cf8; font-size: 0.78rem; font-weight: 600; cursor: pointer; transition: all 0.15s;" onmouseenter="this.style.background='rgba(99,102,241,0.22)'" onmouseleave="this.style.background='rgba(99,102,241,0.12)'">
                <i class="fa-solid fa-clipboard-user"></i> Atividades
              </button>
              <button class="btn-edit-doctor" data-id="\${d.id}" title="Editar"`;

if (!mainJsContent.includes('btn-doctor-activity')) {
  mainJsContent = mainJsContent.replace(oldButtons, newButtons);
}

// Injetar o HTML do Modal de Atividades do Médico e a Função Global
const doctorActivityModalHtml = `
  <!-- MODAL DE ATIVIDADES E PROCEDIMENTOS DO MÉDICO -->
  <div id="modal-doctor-activity" class="modal-overlay" style="display: none; z-index: 2500;">
    <div class="modal-content" style="max-width: 850px; width: 95%; max-height: 90vh; display: flex; flex-direction: column;">
      <div class="modal-header" style="border-bottom: 1px solid var(--border-color); padding-bottom: 16px;">
        <div style="display: flex; align-items: center; gap: 14px;">
          <div id="doc-act-avatar" style="width: 46px; height: 46px; border-radius: 50%; background: rgba(99,102,241,0.15); border: 2px solid rgba(99,102,241,0.3); display: flex; align-items: center; justify-content: center; font-weight: 800; color: #818cf8; font-size: 1.1rem;">
            MD
          </div>
          <div>
            <h3 id="doc-act-name" style="margin: 0; font-size: 1.15rem; color: var(--text-primary);">Dr. Médico</h3>
            <div style="display: flex; align-items: center; gap: 10px; margin-top: 4px; font-size: 0.8rem; color: var(--text-secondary);">
              <span id="doc-act-crm"><i class="fa-solid fa-id-card"></i> CRM: -</span>
              <span>·</span>
              <span id="doc-act-spec" style="color: var(--color-primary); font-weight: 600;"><i class="fa-solid fa-stethoscope"></i> -</span>
            </div>
          </div>
        </div>
        <button class="btn-close" onclick="document.getElementById('modal-doctor-activity').style.display='none'"><i class="fa-solid fa-xmark"></i></button>
      </div>

      <!-- MÉTRICAS DE DESEMPENHO E ATIVIDADES -->
      <div class="modal-body" style="flex: 1; overflow-y: auto; padding-top: 16px;">
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 12px; margin-bottom: 20px;">
          <div style="background: var(--bg-tertiary); border: 1px solid var(--border-color); border-radius: 10px; padding: 12px 16px;">
            <div style="font-size: 0.72rem; color: var(--text-muted); font-weight: 600; text-transform: uppercase;">Total de Atendimentos</div>
            <div id="doc-act-kpi-total" style="font-size: 1.3rem; font-weight: 800; color: var(--text-primary); margin-top: 2px;">0</div>
          </div>
          <div style="background: var(--bg-tertiary); border: 1px solid var(--border-color); border-radius: 10px; padding: 12px 16px;">
            <div style="font-size: 0.72rem; color: var(--text-muted); font-weight: 600; text-transform: uppercase;">Consultas Hoje</div>
            <div id="doc-act-kpi-today" style="font-size: 1.3rem; font-weight: 800; color: #818cf8; margin-top: 2px;">0</div>
          </div>
          <div style="background: var(--bg-tertiary); border: 1px solid var(--border-color); border-radius: 10px; padding: 12px 16px;">
            <div style="font-size: 0.72rem; color: var(--text-muted); font-weight: 600; text-transform: uppercase;">Em Andamento</div>
            <div id="doc-act-kpi-progress" style="font-size: 1.3rem; font-weight: 800; color: #fbbf24; margin-top: 2px;">0</div>
          </div>
          <div style="background: var(--bg-tertiary); border: 1px solid var(--border-color); border-radius: 10px; padding: 12px 16px;">
            <div style="font-size: 0.72rem; color: var(--text-muted); font-weight: 600; text-transform: uppercase;">Prontuários & Procedimentos</div>
            <div id="doc-act-kpi-notes" style="font-size: 1.3rem; font-weight: 800; color: #34d399; margin-top: 2px;">0</div>
          </div>
        </div>

        <!-- LISTAS DE ATENDIMENTOS E PRONTUÁRIOS -->
        <div style="margin-bottom: 20px;">
          <h4 style="font-size: 0.92rem; color: var(--text-primary); margin-bottom: 10px; display: flex; align-items: center; gap: 8px;">
            <i class="fa-solid fa-calendar-check" style="color: var(--color-primary);"></i> Consultas & Atendimentos Recentes
          </h4>
          <div id="doc-act-appts-list" style="display: flex; flex-direction: column; gap: 8px;">
            <div style="text-align: center; padding: 20px; color: var(--text-muted); font-size: 0.85rem;"><i class="fa-solid fa-spinner fa-spin"></i> Carregando atendimentos...</div>
          </div>
        </div>

        <div>
          <h4 style="font-size: 0.92rem; color: var(--text-primary); margin-bottom: 10px; display: flex; align-items: center; gap: 8px;">
            <i class="fa-solid fa-file-medical-declined" style="color: #34d399;"></i> Procedimentos & Diagnósticos Registrados (SOAP)
          </h4>
          <div id="doc-act-notes-list" style="display: flex; flex-direction: column; gap: 8px;">
            <div style="text-align: center; padding: 20px; color: var(--text-muted); font-size: 0.85rem;"><i class="fa-solid fa-spinner fa-spin"></i> Carregando registros SOAP...</div>
          </div>
        </div>
      </div>

      <div class="modal-footer" style="border-top: 1px solid var(--border-color); padding-top: 14px;">
        <button class="btn btn-secondary" onclick="document.getElementById('modal-doctor-activity').style.display='none'">
          Fechar Painel
        </button>
      </div>
    </div>
  </div>
`;

const doctorActivityFnCode = `
// ==========================================
// PAINEL DE ATIVIDADES & PROCEDIMENTOS DO MÉDICO
// ==========================================
window.openDoctorActivityModal = async function(doctorName, specialty, crm) {
  let modal = document.getElementById('modal-doctor-activity');
  if (!modal) {
    document.body.insertAdjacentHTML('beforeend', \`${doctorActivityModalHtml}\`);
    modal = document.getElementById('modal-doctor-activity');
  }

  const initials = doctorName.replace(/^(Dr\\.|Dra\\.)\\s*/i, '').split(' ').map(n => n[0]).join('').substring(0,2).toUpperCase() || 'MD';
  document.getElementById('doc-act-avatar').textContent = initials;
  document.getElementById('doc-act-name').textContent = doctorName;
  document.getElementById('doc-act-crm').innerHTML = \`<i class="fa-solid fa-id-card"></i> CRM: \${crm || '-'}\`;
  document.getElementById('doc-act-spec').innerHTML = \`<i class="fa-solid fa-stethoscope"></i> \${specialty || 'Clínica Geral'}\`;

  document.getElementById('doc-act-appts-list').innerHTML = '<div style="text-align: center; padding: 20px; color: var(--text-muted);"><i class="fa-solid fa-spinner fa-spin"></i> Carregando atendimentos do médico...</div>';
  document.getElementById('doc-act-notes-list').innerHTML = '<div style="text-align: center; padding: 20px; color: var(--text-muted);"><i class="fa-solid fa-spinner fa-spin"></i> Carregando procedimentos...</div>';

  modal.style.display = 'flex';

  try {
    const res = await apiFetch(\`/api/doctors/\${encodeURIComponent(doctorName)}/activity\`);
    if (!res.ok) throw new Error('Erro ao buscar dados do médico');
    const data = await res.json();
    
    const summary = data.summary || {};
    document.getElementById('doc-act-kpi-total').textContent = summary.totalAppointments || 0;
    document.getElementById('doc-act-kpi-today').textContent = summary.todayAppointments || 0;
    document.getElementById('doc-act-kpi-progress').textContent = summary.inProgress || 0;
    document.getElementById('doc-act-kpi-notes').textContent = summary.totalProcedures || 0;

    // Renderizar Agendamentos do Médico
    const appts = data.appointments || [];
    const apptsContainer = document.getElementById('doc-act-appts-list');
    if (appts.length === 0) {
      apptsContainer.innerHTML = '<div style="text-align: center; padding: 16px; background: var(--bg-tertiary); border-radius: 8px; color: var(--text-muted); font-size: 0.82rem;">Nenhum atendimento recente registrado para este médico.</div>';
    } else {
      apptsContainer.innerHTML = appts.map(a => \`
        <div style="background: var(--bg-tertiary); border: 1px solid var(--border-color); border-radius: 8px; padding: 10px 14px; display: flex; justify-content: space-between; align-items: center;">
          <div>
            <strong style="font-size: 0.88rem; color: var(--text-primary);">\${a.patientName}</strong>
            <div style="font-size: 0.76rem; color: var(--text-muted); margin-top: 2px;">
              <i class="fa-solid fa-calendar-day"></i> \${a.appointmentDate} às \${a.appointmentTime} · <span style="color: var(--text-secondary);">\${a.specialty || 'Consulta'}</span>
            </div>
          </div>
          <span class="badge" style="font-size: 0.72rem; padding: 3px 8px; border-radius: 12px; background: rgba(99,102,241,0.12); color: #818cf8; border: 1px solid rgba(99,102,241,0.25);">\${a.status}</span>
        </div>
      \`).join('');
    }

    // Renderizar Prontuários & Procedimentos (SOAP)
    const notes = data.clinicalNotes || [];
    const notesContainer = document.getElementById('doc-act-notes-list');
    if (notes.length === 0) {
      notesContainer.innerHTML = '<div style="text-align: center; padding: 16px; background: var(--bg-tertiary); border-radius: 8px; color: var(--text-muted); font-size: 0.82rem;">Nenhum registro clínico (SOAP) ou diagnóstico emitido ainda.</div>';
    } else {
      notesContainer.innerHTML = notes.map(n => \`
        <div style="background: var(--bg-tertiary); border: 1px solid var(--border-color); border-left: 3px solid #34d399; border-radius: 8px; padding: 10px 14px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
            <strong style="font-size: 0.86rem; color: var(--text-primary);"><i class="fa-solid fa-user-injured" style="color: #34d399; margin-right: 6px;"></i> \${n.patientName || 'Paciente'}</strong>
            <span style="font-size: 0.72rem; color: var(--text-muted);">\${n.created_at ? new Date(n.created_at).toLocaleDateString('pt-BR') : '-'}</span>
          </div>
          \${n.assessmentContent ? \`<div style="font-size: 0.78rem; color: #67e8f9; font-weight: 600; margin-bottom: 3px;"><i class="fa-solid fa-stethoscope"></i> Diagnóstico: \${n.assessmentContent}</div>\` : ''}
          \${n.planContent ? \`<div style="font-size: 0.76rem; color: var(--text-secondary);"><i class="fa-solid fa-pills"></i> Conduta/Prescrição: \${n.planContent}</div>\` : ''}
        </div>
      \`).join('');
    }

  } catch (err) {
    document.getElementById('doc-act-appts-list').innerHTML = '<div style="text-align: center; padding: 16px; color: var(--color-danger); font-size: 0.82rem;"><i class="fa-solid fa-triangle-exclamation"></i> Erro ao carregar histórico.</div>';
  }
};
`;

if (!mainJsContent.includes('openDoctorActivityModal')) {
  mainJsContent += doctorActivityFnCode;
  writeFileSync(mainJsPath, mainJsContent, 'utf8');
  console.log('✅ Modal de Atividades do Médico adicionado em src/main.js!');
}
