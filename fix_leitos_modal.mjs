import { readFileSync, writeFileSync } from 'fs';

const mainJsPath = 'c:/Health Nexus/src/main.js';
let content = readFileSync(mainJsPath, 'utf8');

// Replace cachedApiGet in loadPatientsModal with fast apiFetch
const oldLoadPatientsModal = `  // Carregar Pacientes no Modal
  const loadPatientsModal = async () => {
    try {
      const patients = await cachedApiGet('/api/patients', 'patients');
      const patientList = Array.isArray(patients) ? patients : (patients.data || []);
      const pSelect = document.getElementById('admit-patient-id');
      if (pSelect) {
        if (patientList.length === 0) {
          pSelect.innerHTML = '<option value="">Nenhum paciente disponível</option>';
          return;
        }
        pSelect.innerHTML = '<option value="" style="background-color: #19142c; color: #ffffff;">Selecione o paciente...</option>' + 
          patientList.map(p => \`<option value="\${p.id}" data-name="\${p.fullName}" style="background-color: #19142c; color: #ffffff;">\${p.fullName} (CPF: \${p.cpf})</option>\`).join('');
      }
    } catch (e) {}
  };`;

const newLoadPatientsModal = `  // Carregar Pacientes no Modal (Busca Direta & Rápida)
  const loadPatientsModal = async () => {
    try {
      const pSelect = document.getElementById('admit-patient-id');
      if (pSelect && pSelect.options.length <= 1) {
        pSelect.innerHTML = '<option value="">Carregando lista de pacientes...</option>';
      }
      const res = await apiFetch(\`\${API_URL}/patients\`);
      if (!res.ok) throw new Error();
      const patients = await res.json();
      const patientList = Array.isArray(patients) ? patients : (patients.data || []);
      if (pSelect) {
        if (patientList.length === 0) {
          pSelect.innerHTML = '<option value="">Nenhum paciente disponível</option>';
          return;
        }
        pSelect.innerHTML = '<option value="" style="background-color: #19142c; color: #ffffff;">Selecione o paciente...</option>' + 
          patientList.map(p => \`<option value="\${p.id}" data-name="\${p.fullName}" style="background-color: #19142c; color: #ffffff;">\${p.fullName} (CPF: \${p.cpf})</option>\`).join('');
      }
    } catch (e) {
      const pSelect = document.getElementById('admit-patient-id');
      if (pSelect) pSelect.innerHTML = '<option value="">Erro ao carregar pacientes</option>';
    }
  };`;

content = content.replace(oldLoadPatientsModal, newLoadPatientsModal);

// Replace button click handlers to invoke loadPatientsModal
content = content.replace(
  "document.getElementById('btn-open-admit-modal').addEventListener('click', () => { modal.style.display = 'flex'; });",
  "document.getElementById('btn-open-admit-modal')?.addEventListener('click', () => { modal.style.display = 'flex'; loadPatientsModal(); });"
);

// Call loadPatientsModal when tab initializes
content = content.replace(
  "  loadBeds();\n}",
  "  loadBeds();\n  loadPatientsModal();\n}"
);

// Update quickAdmitBed to load patients if dropdown is empty
const oldQuickAdmit = `window.quickAdmitBed = (bedId) => {
  const modal = document.getElementById('modal-admit-bed');
  if (modal) {
    modal.style.display = 'flex';
    const bedSelect = document.getElementById('admit-bed-id');
    if (bedSelect) bedSelect.value = bedId;
  }
};`;

const newQuickAdmit = `window.quickAdmitBed = (bedId) => {
  const modal = document.getElementById('modal-admit-bed');
  if (modal) {
    modal.style.display = 'flex';
    const bedSelect = document.getElementById('admit-bed-id');
    if (bedSelect) bedSelect.value = bedId;
    const pSelect = document.getElementById('admit-patient-id');
    if (pSelect) {
      apiFetch('/api/patients').then(r => r.json()).then(patients => {
        const list = Array.isArray(patients) ? patients : (patients.data || []);
        pSelect.innerHTML = '<option value="" style="background-color: #19142c; color: #ffffff;">Selecione o paciente...</option>' + 
          list.map(p => \`<option value="\${p.id}" data-name="\${p.fullName}" style="background-color: #19142c; color: #ffffff;">\${p.fullName} (CPF: \${p.cpf})</option>\`).join('');
      }).catch(() => {});
    }
  }
};`;

content = content.replace(oldQuickAdmit, newQuickAdmit);

writeFileSync(mainJsPath, content, 'utf8');
console.log('✅ Modal de Leitos corrigido para carregar pacientes instantaneamente!');
