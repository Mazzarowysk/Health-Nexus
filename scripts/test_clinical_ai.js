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

console.log('\n[Prescrição de Risco 4 - Tramadol + Aspirina / AAS (Objetos de Prescrição)]');
const prescricao4 = [
  { name: 'Cloridrato de Tramadol', dosage: '50mg', route: 'VO' },
  { name: 'AAS Infantil', dosage: '100mg', route: 'VO' }
];
console.log('Fármacos:', prescricao4.map(p => `${p.name} ${p.dosage}`).join(', '));
const inter4 = checkDrugInteractions(prescricao4);
inter4.forEach(i => {
  console.log(`🚨 [${i.severity.toUpperCase()}] ${i.title}`);
  console.log(`   Explicação: ${i.desc}`);
  console.log(`   👉 Ação Médica Sugerida: ${i.action}`);
});

console.log('\n[Prescrição de Risco 5 - 1 ÚNICA Medicação Prescrita cruzada com a ANAMNESE/Uso Contínuo]');
const prescricaoUnica = 'Cloridrato de Tramadol 50mg de 8 em 8h se dor intensa';
const anamnesePaciente = 'Paciente relata histórico de depressão em uso contínuo de Fluoxetina 20mg/dia e hipertensão arterial.';
console.log('Prescrição Atual (1 único remédio):', prescricaoUnica);
console.log('Anamnese / Histórico do Paciente:', anamnesePaciente);
const inter5 = checkDrugInteractions(prescricaoUnica, anamnesePaciente);
inter5.forEach(i => {
  console.log(`🚨 [${i.severity.toUpperCase()}] ${i.title}`);
  console.log(`   Explicação: ${i.desc}`);
  console.log(`   👉 Ação Médica Sugerida: ${i.action}`);
});

console.log('\n[Prescrição de Risco 6 - 1 ÚNICA Medicação Prescrita cruzada com ALERGIA na Anamnese]');
const prescricaoAlergia = 'Dipirona Sódica 500mg/ml - 1 ampola EV em caso de febre';
const anamneseAlergia = 'Paciente hipertenso. Relata alergia severa a Dipirona e Novalgina (edema de glote prévio).';
console.log('Prescrição Atual:', prescricaoAlergia);
console.log('Anamnese / Alergias do Paciente:', anamneseAlergia);
const inter6 = checkDrugInteractions(prescricaoAlergia, anamneseAlergia);
inter6.forEach(i => {
  console.log(`🚨 [${i.severity.toUpperCase()}] ${i.title}`);
  console.log(`   Explicação: ${i.desc}`);
  console.log(`   👉 Ação Médica Sugerida: ${i.action}`);
});

console.log('\n[Prescrição de Risco 7 - Sildenafila / Tadalafila em Paciente com Dor no Peito / Taquicardia (Cenário do Usuário)]');
const prescricaoPde5 = 'Sildenafila 50 mg ou Tadalafila 20 mg — 1 comp. VO.';
const contextoCardiovascular = 'Subjetivo: Dores no peito. Paciente relata dor torácica de início recente, acompanhada de palpitação/taquicardia. Objetivo: Taquicárdico (FC: 150 bpm). Avaliação: Taquicardia paroxística (CID-10: R00.0 / I47.9)';
console.log('Prescrição Atual:', prescricaoPde5);
console.log('Quadro Clínico / Anamnese:', contextoCardiovascular);
const inter7 = checkDrugInteractions(prescricaoPde5, contextoCardiovascular);
inter7.forEach(i => {
  console.log(`🚨 [${i.severity.toUpperCase()}] ${i.title}`);
  console.log(`   Explicação: ${i.desc}`);
  console.log(`   👉 Ação Médica Sugerida: ${i.action}`);
});

console.log('\n[Prescrição de Risco 8 - Betabloqueador em Paciente com Asma / Broncoespasmo (Contraindicação Clínica)]');
const prescricaoBeta = 'Propranolol 40mg VO de 12/12h para controle pressórico';
const contextoAsma = 'Diagnóstico: Crise de Asma Brônquica Moderada (CID-10: J45). Paciente refere dispneia e sibilância.';
console.log('Prescrição Atual:', prescricaoBeta);
console.log('Condição Clínica / CID-10:', contextoAsma);
const inter8 = checkDrugInteractions(prescricaoBeta, contextoAsma);
inter8.forEach(i => {
  console.log(`🚨 [${i.severity.toUpperCase()}] ${i.title}`);
  console.log(`   Explicação: ${i.desc}`);
  console.log(`   👉 Ação Médica Sugerida: ${i.action}`);
});

console.log('\n[Prescrição de Risco 9 - AINE em Paciente com Insuficiência Renal Crônica (Contraindicação Clínica)]');
const prescricaoAine = 'Ibuprofeno 600mg de 8/8h se dor articular';
const contextoRenal = 'Histórico: Paciente portador de Insuficiência Renal Crônica estágio 4 (CID-10: N18.4), Creatinina 3.2 mg/dL.';
console.log('Prescrição Atual:', prescricaoAine);
console.log('Condição Clínica / CID-10:', contextoRenal);
const inter9 = checkDrugInteractions(prescricaoAine, contextoRenal);
inter9.forEach(i => {
  console.log(`🚨 [${i.severity.toUpperCase()}] ${i.title}`);
  console.log(`   Explicação: ${i.desc}`);
  console.log(`   👉 Ação Médica Sugerida: ${i.action}`);
});

console.log('\n[Prescrição de Risco 10 - Duplicidade Terapêutica de Mesma Classe (Dois AINEs Prescritos Juntos)]');
const prescricaoDuplicada = '1. Cetoprofeno 100mg IV de 12/12h\n2. Ibuprofeno 600mg VO se dor';
console.log('Prescrição Atual (Múltiplos AINEs):', prescricaoDuplicada);
const inter10 = checkDrugInteractions(prescricaoDuplicada, 'Paciente sem outras comorbidades.');
inter10.forEach(i => {
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
