import { readFileSync, writeFileSync } from 'fs';

const filePath = 'c:/Health Nexus/src/main.js';
let content = readFileSync(filePath, 'utf8');

const targetOld = '<div class="actions-cell">';

const targetNew = `<div class="actions-cell">
                <button class="btn-icon btn-icon-admit" onclick="admitPatientFromPatientsTab('\${p.id}', '\${(p.fullName||'').replace(/'/g, "\\\\'")}', '\${p.cpf||''}')" title="Admitir / Atender este Paciente">
                  <i class="fa-solid fa-hospital-user"></i>
                </button>
                <button class="btn-icon btn-icon-history" onclick="openPatientHistoryModal('\${p.id}', '\${(p.fullName||'').replace(/'/g, "\\\\'")}')" title="Ver Prontuário & Histórico Pós-Alta">
                  <i class="fa-solid fa-file-medical"></i>
                </button>`;

if (content.includes(targetOld)) {
  content = content.replace(targetOld, targetNew);
  writeFileSync(filePath, content, 'utf8');
  console.log('✅ Botões de ação injetados com sucesso em src/main.js!');
} else {
  console.error('❌ Marcador não encontrado!');
}
