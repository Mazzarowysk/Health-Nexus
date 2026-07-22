import { readFileSync, writeFileSync } from 'fs';

const mainJsPath = 'c:/Health Nexus/src/main.js';
let mainJs = readFileSync(mainJsPath, 'utf8');

// 1. Injetar a definição de updateAppointmentStatus e arrumar startAppointmentEncounter
const appointmentFixFunctions = `
window.updateAppointmentStatus = async function(aptId, newStatus) {
  try {
    const res = await apiFetch('/api/appointments/' + aptId, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus })
    });
    if (res.ok) {
      showToast('Consulta ' + newStatus.toLowerCase() + ' com sucesso!');
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
    await window.updateAppointmentStatus(aptId, 'Em Atendimento');
    await apiFetch('/api/encounters', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ patientId, type: 'Ambulatorio' })
    });
    switchTab('atendimento');
    showToast('⚡ Atendimento iniciado! Paciente encaminhado para a fila de Atendimentos.');
  } catch (e) {
    console.error('Erro em startAppointmentEncounter:', e);
  }
};
`;

if (!mainJs.includes('window.updateAppointmentStatus =')) {
  mainJs = appointmentFixFunctions + mainJs;
} else {
  // Substituir se já existia parcial
  const idx = mainJs.indexOf('window.startAppointmentEncounter =');
  if (idx !== -1) {
    mainJs = mainJs.replace(/window\.startAppointmentEncounter = async [\s\S]*?\n\};/, '');
    mainJs = appointmentFixFunctions + mainJs;
  }
}

writeFileSync(mainJsPath, mainJs, 'utf8');
console.log('✅ main.js atualizado com fix para Atender e updateAppointmentStatus!');

// 2. Reformular o CSS de Cores em src/styles.css (da Login até o Painel Principal)
const cssPath = 'c:/Health Nexus/src/styles.css';
let css = readFileSync(cssPath, 'utf8');

// Substituir as cores da marca e tela de login para um degradê roxo/esmeralda enterprise
css = css.replace(
  `  background:\n    radial-gradient(ellipse at 20% 20%, rgba(200, 50, 255, 0.25) 0%, transparent 50%),\n    radial-gradient(ellipse at 80% 80%, rgba(0, 220, 255, 0.2) 0%, transparent 50%),\n    radial-gradient(ellipse at 50% 50%, rgba(120, 0, 200, 0.1) 0%, transparent 70%);`,
  `  background:\n    radial-gradient(ellipse at 15% 15%, rgba(139, 92, 246, 0.4) 0%, transparent 60%),\n    radial-gradient(ellipse at 85% 85%, rgba(6, 182, 212, 0.35) 0%, transparent 60%),\n    radial-gradient(ellipse at 50% 50%, rgba(15, 10, 35, 0.96) 0%, #060410 100%);`
);

// Form Card da Login
css = css.replace(
  `.auth-form-card {`,
  `.auth-form-card {\n  background: linear-gradient(145deg, rgba(25, 20, 50, 0.85) 0%, rgba(12, 9, 28, 0.95) 100%) !important;\n  border: 1px solid rgba(168, 85, 247, 0.3) !important;\n  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.5), 0 0 30px rgba(139, 92, 246, 0.15) !important;\n`
);

// Botões primários com degradê luxuoso
css = css.replace(
  `.btn-primary {`,
  `.btn-primary {\n  background: linear-gradient(135deg, #6366f1 0%, #a855f7 100%) !important;\n  border: 1px solid rgba(255, 255, 255, 0.2) !important;\n  box-shadow: 0 4px 18px rgba(99, 102, 241, 0.4) !important;\n`
);

writeFileSync(cssPath, css, 'utf8');
console.log('✅ styles.css reformulado com novas cores em degradê!');
