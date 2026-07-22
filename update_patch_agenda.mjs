import { readFileSync, writeFileSync } from 'fs';

const filePath = 'c:/Health Nexus/patch_agenda.mjs';
let content = readFileSync(filePath, 'utf8');

// Atualizar a linha do botão Atender para passar o nome do paciente
const oldBtn = `<button onclick="startAppointmentEncounter('\\${apt.patientId}', '\\${apt.id}')"`;
const newBtn = `<button onclick="startAppointmentEncounter('\\${apt.patientId}', '\\${apt.id}', '\\${(apt.patientName || '').replace(/'/g, "\\\\\\'")}')"`;

content = content.replace(oldBtn, newBtn);

writeFileSync(filePath, content, 'utf8');
console.log('✅ patch_agenda.mjs atualizado com suporte a patientName!');
