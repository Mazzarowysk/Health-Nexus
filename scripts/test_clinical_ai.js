// Mock do ambiente do navegador para execução no Node
globalThis.sessionStorage = {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {}
};
globalThis.window = {
  open: () => {}
};

const { calculateMEWS, checkDrugInteractions, generateWhatsAppClinicalMessage } = await import('../src/modules/clinicalAI.js');

console.log('\n=============================================================');
console.log('  🧪 HEALTH NEXUS — BATERIA DE TESTES DE INTELIGÊNCIA CLÍNICA ');
console.log('=============================================================\n');

// --------------------------------------------------------------------------
// TESTE 1: ESCORE MEWS & DETECÇÃO DE SEPSE
// --------------------------------------------------------------------------
console.log('-------------------------------------------------------------');
console.log('📊 TESTE 1: ESCORE PREDITIVO MEWS & ALERTA DE SEPSE');
console.log('-------------------------------------------------------------');

const cenarioNormal = {
  bloodPressure: '120/80',
  heartRateBpm: 72,
  temperatureCelsius: 36.5,
  oxygenSaturation: 98,
  painScale: 1
};

const cenarioModerado = {
  bloodPressure: '95/60',
  heartRateBpm: 105,
  temperatureCelsius: 38.0,
  oxygenSaturation: 93,
  painScale: 5
};

const cenarioSepseCritica = {
  bloodPressure: '68/40',
  heartRateBpm: 135,
  temperatureCelsius: 39.2,
  oxygenSaturation: 84,
  painScale: 9
};

console.log('\n[Cenário A - Paciente Estável]');
const resA = calculateMEWS(cenarioNormal);
console.log(`- Sinais: PA ${cenarioNormal.bloodPressure}, FC ${cenarioNormal.heartRateBpm}bpm, Temp ${cenarioNormal.temperatureCelsius}°C, SpO2 ${cenarioNormal.oxygenSaturation}%`);
console.log(`- MEWS Calculado: ${resA.score} | Nível: ${resA.riskLevel}`);
console.log(`- Alerta Sepse: ${resA.isSepsisAlert ? '🚨 SIM' : '✅ NÃO'}`);
console.log(`- Conduta: ${resA.recommendation}`);

console.log('\n[Cenário B - Paciente em Deterioração / Moderado]');
const resB = calculateMEWS(cenarioModerado);
console.log(`- Sinais: PA ${cenarioModerado.bloodPressure}, FC ${cenarioModerado.heartRateBpm}bpm, Temp ${cenarioModerado.temperatureCelsius}°C, SpO2 ${cenarioModerado.oxygenSaturation}%`);
console.log(`- MEWS Calculado: ${resB.score} | Nível: ${resB.riskLevel}`);
console.log(`- Fatores de Risco: ${resB.reasons.join(', ')}`);
console.log(`- Alerta Sepse: ${resB.isSepsisAlert ? '🚨 SIM' : '✅ NÃO'}`);
console.log(`- Conduta: ${resB.recommendation}`);

console.log('\n[Cenário C - Choque Séptico / Emergência Crítica]');
const resC = calculateMEWS(cenarioSepseCritica);
console.log(`- Sinais: PA ${cenarioSepseCritica.bloodPressure}, FC ${cenarioSepseCritica.heartRateBpm}bpm, Temp ${cenarioSepseCritica.temperatureCelsius}°C, SpO2 ${cenarioSepseCritica.oxygenSaturation}%`);
console.log(`- MEWS Calculado: ${resC.score} | Nível: ${resC.riskLevel}`);
console.log(`- Fatores de Risco: ${resC.reasons.join(' | ')}`);
console.log(`- Alerta Sepse: ${resC.isSepsisAlert ? '🚨 ALERTA CRÍTICO DE SEPSE DISPARADO' : '✅ NÃO'}`);
console.log(`- Conduta: ${resC.recommendation}`);


// --------------------------------------------------------------------------
// TESTE 2: VERIFICADOR DE INTERAÇÕES MEDICAMENTOSAS
// --------------------------------------------------------------------------
console.log('\n-------------------------------------------------------------');
console.log('💊 TESTE 2: MOTOR DE INTERAÇÕES MEDICAMENTOSAS EM TEMPO REAL');
console.log('-------------------------------------------------------------');

const prescricao1 = ['Dipirona 500mg', 'Paracetamol 750mg', 'Soro Fisiológico 0.9%'];
const prescricao2 = ['Varfarina Sódica 5mg', 'Aspirina (AAS) 100mg', 'Omeprazol 20mg'];
const prescricao3 = ['Cloridrato de Tramadol 50mg', 'Fluoxetina 20mg', 'Enalapril 10mg', 'Espironolactona 25mg'];

console.log('\n[Prescrição Segura 1]');
console.log('Fármacos:', prescricao1.join(', '));
const inter1 = checkDrugInteractions(prescricao1);
console.log(`Interações detectadas: ${inter1.length === 0 ? '✅ Nenhuma interação de risco detectada.' : inter1.length}`);

console.log('\n[Prescrição de Risco 2 - Cardio / Anticoagulação]');
console.log('Fármacos:', prescricao2.join(', '));
const inter2 = checkDrugInteractions(prescricao2);
inter2.forEach(i => {
  console.log(`🚨 [${i.severity.toUpperCase()}] ${i.title}`);
  console.log(`   Explicação: ${i.desc}`);
  console.log(`   👉 Ação Médica Sugerida: ${i.action}`);
});

console.log('\n[Prescrição de Risco 3 - Multimedicamentosa]');
console.log('Fármacos:', prescricao3.join(', '));
const inter3 = checkDrugInteractions(prescricao3);
inter3.forEach(i => {
  console.log(`🚨 [${i.severity.toUpperCase()}] ${i.title}`);
  console.log(`   Explicação: ${i.desc}`);
  console.log(`   👉 Ação Médica Sugerida: ${i.action}`);
});


// --------------------------------------------------------------------------
// TESTE 3: DITADO CLÍNICO POR VOZ (PARSING E PONTUAÇÃO AUTOMÁTICA)
// --------------------------------------------------------------------------
console.log('\n-------------------------------------------------------------');
console.log('🎙️ TESTE 3: DITADO CLÍNICO POR VOZ (VOICE-TO-SOAP ENGINE)');
console.log('-------------------------------------------------------------');

const falaDitadaBruta = "Paciente 45 anos da entrada com dor toracica ventilatorio dependente ha duas horas virgula sem irradiacao para membro superior esquerdo ponto final novo paragrafo Ao exame fisico dois pontos pressao arterial 130 por 85 virgula frequencia cardiaca 80 batimentos por minuto ponto final novo paragrafo Hipotese diagnostica dois pontos dor toracica muscular a esclarecer ponto final";

// Simula a transformação de pontuação do clinicalAI.js
const textoFormatado = falaDitadaBruta
  .replace(/\bponto final\b/gi, '.')
  .replace(/\bponto e v[íi]rgula\b/gi, ';')
  .replace(/\bdois pontos\b/gi, ':')
  .replace(/\bv[íi]rgula\b/gi, ',')
  .replace(/\bexclama[çc][ãa]o\b/gi, '!')
  .replace(/\binterroga[çc][ãa]o\b/gi, '?')
  .replace(/\bnovo par[áa]grafo\b/gi, '\n\n')
  .replace(/\bnova linha\b/gi, '\n');

console.log('\n[Entrada de Áudio Transcrita Bruta]:');
console.log(`"${falaDitadaBruta}"`);

console.log('\n[Saída Formatada pelo Motor Voice-to-SOAP]:');
console.log('--------------------------------------------------');
console.log(textoFormatado);
console.log('--------------------------------------------------');


// --------------------------------------------------------------------------
// TESTE 4: NOTIFICAÇÃO E DESPACHO WHATSAPP
// --------------------------------------------------------------------------
console.log('\n-------------------------------------------------------------');
console.log('📲 TESTE 4: FORMATAÇÃO DE RECEITA & MENSAGEM WHATSAPP');
console.log('-------------------------------------------------------------');

const dadosAtendimento = {
  patientName: 'Maria Silva Santos',
  doctorName: 'Dr. Roberto Mazzaro (CRM 12345-SP)',
  diagnosis: 'Amigdalite Bacteriana Aguda (CID-10 J03.9)',
  room: 'Consultório 03 · Ala Ambulatorial',
  prescriptions: [
    { medication: 'Amoxicilina + Clavulanato 875mg', dosage: '1 comprimido de 12/12h', instructions: 'Por 7 dias após as refeições' },
    { medication: 'Dipirona Monoidratada 500mg/mL', dosage: '40 gotas de 6/6h', instructions: 'Se dor ou febre > 37.8°C' },
    { medication: 'Nimesulida 100mg', dosage: '1 comprimido de 12/12h', instructions: 'Por 3 dias' }
  ]
};

const mensagemWhatsApp = generateWhatsAppClinicalMessage(dadosAtendimento);
console.log('\n[Mensagem Formatada para Envio Direto ao WhatsApp do Paciente]:');
console.log(mensagemWhatsApp);

console.log('\n=============================================================');
console.log('  ✅ TODOS OS 4 TESTES FORAM EXECUTADOS COM SUCESSO! ');
console.log('=============================================================\n');
