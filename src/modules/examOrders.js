// src/modules/examOrders.js
// Solicitação de Exames no PEP — catálogo, sugestões pelo histórico clínico,
// alerta de duplicidade, persistência local (tabela exam_requests) e impressão da requisição.

import { showToast } from './ui.js';

/* ------------------------------------------------------------------ */
/* Catálogo                                                            */
/* ------------------------------------------------------------------ */

export const EXAM_CATEGORIES = [
  { id: 'lab', label: 'Laboratório', icon: 'fa-vial', color: '#34d399' },
  { id: 'img', label: 'Imagem', icon: 'fa-x-ray', color: '#38bdf8' },
  { id: 'graf', label: 'Métodos Gráficos', icon: 'fa-wave-square', color: '#f472b6' },
  { id: 'adv', label: 'Alta Complexidade', icon: 'fa-dna', color: '#a78bfa' }
];

// interval = dias mínimos entre repetições em acompanhamento ambulatorial (usado no alerta de duplicidade)
export const EXAM_CATALOG = [
  // ---------- Laboratório ----------
  { id: 'hemograma', cat: 'lab', name: 'Hemograma completo', prep: 'Jejum não obrigatório', interval: 30, tags: 'sangue anemia infeccao leucocitos plaquetas' },
  { id: 'pcr', cat: 'lab', name: 'Proteína C-reativa (PCR)', prep: 'Sem preparo', interval: 7, tags: 'inflamacao infeccao' },
  { id: 'vhs', cat: 'lab', name: 'VHS (velocidade de hemossedimentação)', prep: 'Sem preparo', interval: 30, tags: 'inflamacao' },
  { id: 'glicemia', cat: 'lab', name: 'Glicemia de jejum', prep: 'Jejum de 8 horas', interval: 90, tags: 'diabetes acucar' },
  { id: 'hba1c', cat: 'lab', name: 'Hemoglobina glicada (HbA1c)', prep: 'Jejum não obrigatório', interval: 90, tags: 'diabetes controle glicemico' },
  { id: 'lipidico', cat: 'lab', name: 'Perfil lipídico (CT, HDL, LDL, TG)', prep: 'Jejum de 12 horas recomendado', interval: 180, tags: 'colesterol triglicerides dislipidemia' },
  { id: 'creatinina', cat: 'lab', name: 'Creatinina sérica (com TFG estimada)', prep: 'Sem preparo', interval: 90, tags: 'rim renal funcao' },
  { id: 'ureia', cat: 'lab', name: 'Ureia', prep: 'Sem preparo', interval: 90, tags: 'rim renal' },
  { id: 'eletrolitos', cat: 'lab', name: 'Eletrólitos (sódio, potássio, magnésio)', prep: 'Sem preparo', interval: 30, tags: 'sodio potassio magnesio' },
  { id: 'calcio', cat: 'lab', name: 'Cálcio iônico e fósforo', prep: 'Sem preparo', interval: 90, tags: 'calcio fosforo' },
  { id: 'hepatico', cat: 'lab', name: 'Função hepática (TGO, TGP, GGT, FA, bilirrubinas)', prep: 'Jejum de 4 horas', interval: 90, tags: 'figado transaminases' },
  { id: 'albumina', cat: 'lab', name: 'Albumina e proteínas totais', prep: 'Sem preparo', interval: 90, tags: 'nutricao figado' },
  { id: 'coagulograma', cat: 'lab', name: 'Coagulograma (TAP/INR, TTPA)', prep: 'Sem preparo', interval: 7, tags: 'coagulacao varfarina sangramento inr' },
  { id: 'fibrinogenio', cat: 'lab', name: 'Fibrinogênio', prep: 'Sem preparo', interval: 7, tags: 'coagulacao' },
  { id: 'ddimero', cat: 'lab', name: 'D-dímero', prep: 'Sem preparo', interval: 1, tags: 'trombose embolia tep tvp' },
  { id: 'troponina', cat: 'lab', name: 'Troponina ultrassensível (seriada)', prep: 'Sem preparo', interval: 0, tags: 'infarto iam dor toracica' },
  { id: 'ckmb', cat: 'lab', name: 'CK-MB e CPK total', prep: 'Sem preparo', interval: 0, tags: 'infarto musculo estatina' },
  { id: 'bnp', cat: 'lab', name: 'NT-proBNP', prep: 'Sem preparo', interval: 90, tags: 'insuficiencia cardiaca dispneia' },
  { id: 'lactato', cat: 'lab', name: 'Lactato arterial', prep: 'Sem preparo', interval: 0, tags: 'sepse choque' },
  { id: 'gasometria', cat: 'lab', name: 'Gasometria arterial', prep: 'Sem preparo', interval: 0, tags: 'respiratorio acidose dispneia' },
  { id: 'hemocultura', cat: 'lab', name: 'Hemoculturas (2 pares)', prep: 'Coletar antes do antibiótico', interval: 2, tags: 'sepse febre bacteriemia' },
  { id: 'eas', cat: 'lab', name: 'Urina tipo 1 (EAS)', prep: 'Primeira urina da manhã, jato médio', interval: 30, tags: 'urina itu' },
  { id: 'urocultura', cat: 'lab', name: 'Urocultura com antibiograma', prep: 'Jato médio, higiene prévia', interval: 7, tags: 'urina itu infeccao urinaria' },
  { id: 'microalb', cat: 'lab', name: 'Relação albumina/creatinina urinária', prep: 'Amostra isolada matinal', interval: 365, tags: 'diabetes nefropatia rim' },
  { id: 'tsh', cat: 'lab', name: 'TSH e T4 livre', prep: 'Sem preparo; levotiroxina após a coleta', interval: 180, tags: 'tireoide hipotireoidismo' },
  { id: 'amilase', cat: 'lab', name: 'Amilase e lipase', prep: 'Sem preparo', interval: 1, tags: 'pancreatite dor abdominal' },
  { id: 'b12', cat: 'lab', name: 'Vitamina B12 e ácido fólico', prep: 'Jejum de 4 horas', interval: 365, tags: 'anemia metformina neuropatia' },
  { id: 'ferro', cat: 'lab', name: 'Ferro sérico, ferritina e transferrina', prep: 'Jejum de 4 horas', interval: 180, tags: 'anemia ferropriva' },
  { id: 'vitd', cat: 'lab', name: '25-OH vitamina D', prep: 'Sem preparo', interval: 365, tags: 'osteoporose' },
  { id: 'pth', cat: 'lab', name: 'Paratormônio (PTH)', prep: 'Jejum de 4 horas', interval: 180, tags: 'rim calcio' },
  { id: 'psa', cat: 'lab', name: 'PSA total e livre', prep: 'Evitar ejaculação e exercício em bicicleta 48h antes', interval: 365, tags: 'prostata rastreamento' },
  { id: 'sorologias', cat: 'lab', name: 'Sorologias (HIV, sífilis, hepatites B e C)', prep: 'Sem preparo', interval: 365, tags: 'infeccao ist rastreamento' },
  { id: 'betahcg', cat: 'lab', name: 'Beta-hCG quantitativo', prep: 'Sem preparo', interval: 0, tags: 'gravidez gestacao' },
  { id: 'sangueoculto', cat: 'lab', name: 'Pesquisa de sangue oculto nas fezes (imunoquímico)', prep: 'Sem restrição alimentar no método imunoquímico', interval: 365, tags: 'colon rastreamento' },
  { id: 'litemia', cat: 'lab', name: 'Litemia', prep: 'Coletar 12h após a última dose', interval: 90, tags: 'litio' },
  { id: 'digoxinemia', cat: 'lab', name: 'Dosagem sérica de digoxina', prep: 'Coletar antes da próxima dose', interval: 90, tags: 'digoxina' },
  { id: 'afp', cat: 'lab', name: 'Alfafetoproteína (AFP)', prep: 'Sem preparo', interval: 180, tags: 'figado cirrose' },

  // ---------- Imagem ----------
  { id: 'rxtorax', cat: 'img', name: 'Radiografia de tórax (PA e perfil)', prep: 'Retirar objetos metálicos', interval: 30, tags: 'pulmao pneumonia rx' },
  { id: 'rxabdome', cat: 'img', name: 'Radiografia de abdome (rotina de abdome agudo)', prep: 'Sem preparo', interval: 7, tags: 'abdome obstrucao rx' },
  { id: 'usgabd', cat: 'img', name: 'Ultrassonografia de abdome total', prep: 'Jejum de 8 horas; bexiga cheia', interval: 180, tags: 'figado vesicula rim usg' },
  { id: 'usgrins', cat: 'img', name: 'Ultrassonografia de rins e vias urinárias', prep: 'Bexiga cheia', interval: 180, tags: 'rim calculo usg' },
  { id: 'dopplermmii', cat: 'img', name: 'Doppler venoso de membros inferiores', prep: 'Sem preparo', interval: 30, tags: 'trombose tvp' },
  { id: 'dopplercar', cat: 'img', name: 'Doppler de carótidas e vertebrais', prep: 'Sem preparo', interval: 365, tags: 'avc aterosclerose' },
  { id: 'mamografia', cat: 'img', name: 'Mamografia bilateral', prep: 'Não usar desodorante no dia', interval: 365, tags: 'mama rastreamento' },
  { id: 'densitometria', cat: 'img', name: 'Densitometria óssea', prep: 'Suspender cálcio 24h antes', interval: 730, tags: 'osteoporose' },
  { id: 'tccranio', cat: 'img', name: 'Tomografia de crânio sem contraste', prep: 'Sem preparo', interval: 0, tags: 'avc trauma cefaleia tc' },
  { id: 'tctorax', cat: 'img', name: 'Tomografia de tórax', prep: 'Sem preparo (sem contraste)', interval: 90, tags: 'pulmao nodulo tc' },
  { id: 'tcabdome', cat: 'img', name: 'Tomografia de abdome e pelve com contraste', prep: 'Jejum de 4h; creatinina recente', interval: 30, tags: 'abdome tc', contrast: true },
  { id: 'angiotctorax', cat: 'img', name: 'Angiotomografia de tórax (protocolo TEP)', prep: 'Creatinina recente; acesso venoso calibroso', interval: 0, tags: 'embolia tep tc', contrast: true },
  { id: 'angiotccor', cat: 'img', name: 'Angiotomografia de coronárias', prep: 'Jejum de 4h; FC controlada; creatinina recente', interval: 730, tags: 'coronaria cardiaca tc', contrast: true },
  { id: 'rmcranio', cat: 'img', name: 'Ressonância magnética de crânio', prep: 'Checar marcapasso/implantes metálicos', interval: 180, tags: 'cerebro neuro rm' },
  { id: 'rmcoluna', cat: 'img', name: 'Ressonância magnética de coluna', prep: 'Checar implantes metálicos', interval: 365, tags: 'coluna lombar hernia rm' },
  { id: 'colangiorm', cat: 'img', name: 'Colangiorressonância', prep: 'Jejum de 6 horas', interval: 180, tags: 'vias biliares rm' },

  // ---------- Métodos gráficos ----------
  { id: 'ecg', cat: 'graf', name: 'Eletrocardiograma de 12 derivações', prep: 'Sem preparo', interval: 0, tags: 'coracao arritmia dor toracica' },
  { id: 'eco', cat: 'graf', name: 'Ecocardiograma transtorácico', prep: 'Sem preparo', interval: 365, tags: 'coracao insuficiencia cardiaca valvula' },
  { id: 'holter', cat: 'graf', name: 'Holter 24 horas', prep: 'Banho antes da instalação', interval: 365, tags: 'arritmia palpitacao' },
  { id: 'mapa', cat: 'graf', name: 'MAPA 24 horas', prep: 'Manter rotina habitual', interval: 365, tags: 'pressao hipertensao' },
  { id: 'ergometrico', cat: 'graf', name: 'Teste ergométrico', prep: 'Roupa e tênis confortáveis; refeição leve 2h antes', interval: 365, tags: 'coronaria esforco' },
  { id: 'espirometria', cat: 'graf', name: 'Espirometria com prova broncodilatadora', prep: 'Suspender broncodilatador conforme orientação', interval: 365, tags: 'asma dpoc pulmao' },
  { id: 'eeg', cat: 'graf', name: 'Eletroencefalograma', prep: 'Cabelo limpo e seco, sem creme', interval: 365, tags: 'convulsao epilepsia' },
  { id: 'fundoolho', cat: 'graf', name: 'Mapeamento de retina (fundo de olho)', prep: 'Virá com dilatação; trazer acompanhante', interval: 365, tags: 'diabetes retinopatia' },
  { id: 'endoscopia', cat: 'graf', name: 'Endoscopia digestiva alta', prep: 'Jejum de 8 horas; acompanhante', interval: 365, tags: 'estomago dispepsia' },
  { id: 'colonoscopia', cat: 'graf', name: 'Colonoscopia', prep: 'Preparo intestinal conforme protocolo; acompanhante', interval: 1825, tags: 'colon rastreamento' },

  // ---------- Alta complexidade / medicina de precisão ----------
  { id: 'petct', cat: 'adv', name: 'PET-CT com FDG', prep: 'Jejum de 6h; glicemia < 200 mg/dL', interval: 90, tags: 'oncologia estadiamento' },
  { id: 'cintimiocardio', cat: 'adv', name: 'Cintilografia de perfusão miocárdica', prep: 'Jejum de 4h; suspender cafeína 24h', interval: 365, tags: 'coronaria isquemia' },
  { id: 'rmcardiaca', cat: 'adv', name: 'Ressonância magnética cardíaca', prep: 'Checar implantes; função renal se contraste', interval: 365, tags: 'miocardiopatia' },
  { id: 'ngs', cat: 'adv', name: 'Painel genético por sequenciamento (NGS)', prep: 'Termo de consentimento e aconselhamento genético', interval: 3650, tags: 'genetica hereditario' },
  { id: 'biopsialiq', cat: 'adv', name: 'Biópsia líquida (DNA tumoral circulante)', prep: 'Sem preparo', interval: 90, tags: 'oncologia mutacao' },
  { id: 'marcadores', cat: 'adv', name: 'Marcadores tumorais (CEA, CA 19-9, CA-125 conforme caso)', prep: 'Sem preparo', interval: 90, tags: 'oncologia seguimento' },
  { id: 'rtpcr', cat: 'adv', name: 'Painel molecular respiratório (RT-PCR multiplex)', prep: 'Swab nasofaríngeo', interval: 7, tags: 'virus influenza covid' },
  { id: 'farmacogen', cat: 'adv', name: 'Teste farmacogenético (CYP2C19, CYP2D6 e outros)', prep: 'Swab bucal ou sangue', interval: 3650, tags: 'medicamento resposta clopidogrel' },
  { id: 'elastografia', cat: 'adv', name: 'Elastografia hepática', prep: 'Jejum de 3 horas', interval: 365, tags: 'figado fibrose' }
];

const CATALOG_BY_ID = Object.fromEntries(EXAM_CATALOG.map(e => [e.id, e]));
export const getExamById = (id) => CATALOG_BY_ID[id] || null;

/* ------------------------------------------------------------------ */
/* Utilidades                                                          */
/* ------------------------------------------------------------------ */

const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const DAY = 86400000;

function getDB() {
  try {
    return (typeof window !== 'undefined' && window.localDB) ? window.localDB.getFullDB() : {};
  } catch (e) { return {}; }
}

function samePatient(record, patientId, patientName) {
  const pid = norm(patientId);
  const pname = norm(patientName).trim();
  const rid = norm(record.patientId || record.patient_id);
  const rname = norm(record.patientName || record.fullName).trim();
  if (pid && rid && rid === pid) return true;
  if (pname && rname && rname === pname) return true;
  return false;
}

function calcAge(patient) {
  if (!patient) return null;
  if (patient.birthDate) {
    const b = new Date(patient.birthDate);
    if (!isNaN(b)) {
      const now = new Date();
      let a = now.getFullYear() - b.getFullYear();
      if (now.getMonth() < b.getMonth() || (now.getMonth() === b.getMonth() && now.getDate() < b.getDate())) a--;
      return a;
    }
  }
  return typeof patient.age === 'number' ? patient.age : null;
}

/* ------------------------------------------------------------------ */
/* Contexto clínico do paciente                                        */
/* ------------------------------------------------------------------ */

export function buildPatientClinicalContext({ patientId, patientName, currentEncounterId, currentTexts = {} }) {
  const db = getDB();
  const patient = (db.patients || []).find(p => samePatient({ patientId: p.id, patientName: p.fullName || p.name }, patientId, patientName)) || null;

  const pastEncounters = (db.encounters || []).filter(e =>
    String(e.id) !== String(currentEncounterId) && samePatient(e, patientId, patientName)
  );
  const prescriptions = (db.prescriptions || []).filter(p => samePatient(p, patientId, patientName));
  const examHistory = (db.exam_requests || [])
    .filter(r => samePatient(r, patientId, patientName))
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  const historyText = norm([
    ...pastEncounters.map(e => [e.complaints, e.subjectiveContent, e.assessmentContent, e.planContent, e.diagnosis, e.cid].join(' ')),
    ...prescriptions.map(p => [p.medication, p.medicationName, p.items ? JSON.stringify(p.items) : '', p.notes].join(' ')),
    patient?.comorbidities, patient?.notes, patient?.medicalHistory
  ].join(' \n '));

  const currentText = norm([currentTexts.complaint, currentTexts.subjective, currentTexts.objective, currentTexts.assessment].join(' '));
  const planText = norm(currentTexts.plan);

  return {
    patient,
    age: calcAge(patient),
    gender: norm(patient?.gender),
    allergies: norm(patient?.allergies),
    pastEncounters,
    examHistory,
    historyText,
    currentText,
    planText
  };
}

/* ------------------------------------------------------------------ */
/* Motor de sugestões                                                  */
/* ------------------------------------------------------------------ */

// Condições crônicas detectadas no histórico (texto livre, CID-10 e medicamentos)
const CHRONIC_RULES = [
  { key: 'diabetes', label: 'Diabetes mellitus', re: /diabet|\bdm ?[12]?\b|\be1[0-4]|metformina|insulina|glibenclamida|gliclazida|dapagliflozina|empagliflozina/,
    exams: ['hba1c', 'glicemia', 'microalb', 'creatinina', 'lipidico', 'fundoolho'] },
  { key: 'has', label: 'Hipertensão arterial', re: /hipertens|\bhas\b|\bi10\b|losartana|enalapril|captopril|anlodipino|hidroclorotiazida|valsartana/,
    exams: ['creatinina', 'eletrolitos', 'eas', 'lipidico', 'ecg'] },
  { key: 'ic', label: 'Cardiopatia / insuficiência cardíaca', re: /insuficiencia cardiaca|\bi50|\bicc\b|cardiopat|miocardiopat|furosemida|espironolactona|sacubitril|carvedilol/,
    exams: ['bnp', 'eco', 'eletrolitos', 'creatinina', 'ecg'] },
  { key: 'arritmia', label: 'Arritmia / fibrilação atrial', re: /fibrilacao atrial|\bfa\b cronica|\bi48|arritmia|palpitac|amiodarona/,
    exams: ['ecg', 'holter', 'tsh', 'eco'] },
  { key: 'coronaria', label: 'Doença coronariana', re: /infarto previo|iam previo|coronari|angina|\bi2[0-5]|stent|revasculariz|clopidogrel/,
    exams: ['lipidico', 'ecg', 'ergometrico', 'eco'] },
  { key: 'drc', label: 'Doença renal crônica', re: /renal cronic|\bdrc\b|\bn18|nefropat|dialise|hemodialise/,
    exams: ['creatinina', 'ureia', 'eletrolitos', 'calcio', 'pth', 'hemograma', 'microalb'] },
  { key: 'tireoide', label: 'Doença da tireoide', re: /hipotireoid|hipertireoid|tireoid|\be0[0-5]|levotiroxina|puran|metimazol/,
    exams: ['tsh'] },
  { key: 'dislipidemia', label: 'Dislipidemia', re: /dislipidem|colesterol alto|hipercolesterol|\be78|sinvastatina|atorvastatina|rosuvastatina/,
    exams: ['lipidico', 'hepatico', 'ckmb'] },
  { key: 'pulmonar', label: 'Asma / DPOC', re: /\basma\b|\bdpoc\b|\bj4[45]|enfisema|bronquite cronica|salbutamol|formoterol|budesonida|tiotropio/,
    exams: ['espirometria', 'rxtorax'] },
  { key: 'hepatopatia', label: 'Hepatopatia', re: /cirrose|hepatopat|esteatose|\bk7[0-6]|hepatite cronica/,
    exams: ['hepatico', 'albumina', 'coagulograma', 'usgabd', 'afp', 'elastografia'] },
  { key: 'onco', label: 'Neoplasia em acompanhamento', re: /neoplas|cancer|carcinoma|tumor maligno|linfoma|\bc[0-8]\d\b|quimioterap|oncolog/,
    exams: ['hemograma', 'marcadores', 'petct', 'biopsialiq'] },
  { key: 'anemia', label: 'Anemia', re: /anemia|\bd5[0-3]|sulfato ferroso/,
    exams: ['hemograma', 'ferro', 'b12'] },
  { key: 'tvp', label: 'Trombose prévia', re: /trombose|\btvp\b|\btep\b|embolia pulmonar|\bi26|\bi80/,
    exams: ['coagulograma', 'dopplermmii'] }
];

// Medicamentos que pedem monitorização laboratorial
const DRUG_MONITOR_RULES = [
  { re: /varfarina|marevan|coumadin/, exams: ['coagulograma'], why: 'Uso de varfarina: controle do INR' },
  { re: /rivaroxabana|apixabana|dabigatrana|edoxabana/, exams: ['creatinina', 'hemograma'], why: 'Anticoagulante oral direto: ajuste de dose pela função renal' },
  { re: /amiodarona/, exams: ['tsh', 'hepatico'], why: 'Amiodarona: monitorar tireoide e fígado' },
  { re: /\blitio\b|carbolitium/, exams: ['litemia', 'tsh', 'creatinina'], why: 'Lítio: nível sérico, tireoide e rim' },
  { re: /digoxina/, exams: ['digoxinemia', 'eletrolitos', 'creatinina'], why: 'Digoxina: nível sérico e potássio' },
  { re: /metformina/, exams: ['b12', 'creatinina'], why: 'Metformina: B12 e função renal' },
  { re: /furosemida|hidroclorotiazida|espironolactona|clortalidona/, exams: ['eletrolitos', 'creatinina'], why: 'Diurético: eletrólitos e função renal' },
  { re: /estatina|sinvastatina|atorvastatina|rosuvastatina/, exams: ['hepatico'], why: 'Estatina: função hepática' },
  { re: /metotrexato/, exams: ['hemograma', 'hepatico', 'creatinina'], why: 'Metotrexato: hemograma, fígado e rim' },
  { re: /clopidogrel/, exams: ['farmacogen'], why: 'Clopidogrel: genotipagem CYP2C19 pode orientar a escolha do antiagregante' }
];

// Quadro atual (queixa, subjetivo, avaliação)
const ACUTE_RULES = [
  { re: /dor (no )?peito|dor torac|precordial|angina|infarto|\biam\b|\bi21/, label: 'Dor torácica', exams: ['ecg', 'troponina', 'ckmb', 'rxtorax', 'eletrolitos', 'creatinina'] },
  { re: /\bavc\b|derrame|hemipares|desvio de rima|afasia|fala enrolada|\bi6[34]/, label: 'Suspeita de AVC', exams: ['tccranio', 'glicemia', 'hemograma', 'coagulograma', 'ecg'] },
  { re: /sepse|septic|choque|calafrio|febre alta|\ba41/, label: 'Suspeita de sepse', exams: ['lactato', 'hemocultura', 'hemograma', 'pcr', 'creatinina', 'hepatico', 'gasometria'] },
  { re: /dispneia|falta de ar|cansaco aos esforcos|ortopneia/, label: 'Dispneia', exams: ['rxtorax', 'gasometria', 'bnp', 'ddimero', 'ecg', 'hemograma'] },
  { re: /embolia|\btep\b|dor pleuritica/, label: 'Suspeita de TEP', exams: ['ddimero', 'angiotctorax', 'ecg', 'gasometria'] },
  { re: /edema (de|em) (perna|membro)|panturrilha|\btvp\b/, label: 'Suspeita de TVP', exams: ['ddimero', 'dopplermmii'] },
  { re: /dor abdominal|abdome agudo|epigastr|colica biliar|vomit/, label: 'Dor abdominal', exams: ['hemograma', 'amilase', 'hepatico', 'eas', 'usgabd', 'betahcg'] },
  { re: /disuria|ardencia (ao|para) urinar|polaciuria|infeccao urinaria|\bitu\b|\bn39/, label: 'Sintomas urinários', exams: ['eas', 'urocultura'] },
  { re: /cefaleia|dor de cabeca/, label: 'Cefaleia', exams: ['tccranio'], note: 'Indicar imagem se houver sinais de alarme' },
  { re: /trauma craniano|tce|queda com batida/, label: 'Trauma de crânio', exams: ['tccranio'] },
  { re: /convuls|crise epilept/, label: 'Crise convulsiva', exams: ['glicemia', 'eletrolitos', 'calcio', 'tccranio', 'eeg'] },
  { re: /tosse|coriza|sindrome gripal|influenza|covid/, label: 'Sintomas respiratórios', exams: ['rtpcr', 'rxtorax', 'hemograma'] },
  { re: /palpitac|taquicardia|arritmia/, label: 'Palpitações', exams: ['ecg', 'eletrolitos', 'tsh', 'holter'] },
  { re: /lombalgia|dor lombar|ciatalgia/, label: 'Lombalgia', exams: ['rmcoluna'], note: 'Imagem só com sinais de alarme ou falha do tratamento' },
  { re: /sangramento|melena|hematemese|enterorragia/, label: 'Sangramento', exams: ['hemograma', 'coagulograma', 'endoscopia'] },
  { re: /atraso menstrual|gravidez|gestante|amenorreia/, label: 'Possível gestação', exams: ['betahcg'] }
];

function pushSuggestion(map, examId, source, reason, weight) {
  const exam = CATALOG_BY_ID[examId];
  if (!exam) return;
  const cur = map.get(examId);
  if (cur) {
    if (!cur.reasons.includes(reason)) cur.reasons.push(reason);
    if (!cur.sources.includes(source)) cur.sources.push(source);
    cur.score += weight;
  } else {
    map.set(examId, { examId, exam, reasons: [reason], sources: [source], score: weight });
  }
}

/**
 * Gera sugestões de exames a partir do histórico, quadro atual, medicação e faixa etária.
 * Retorna { suggestions, conditions, alerts }.
 */
export function predictExams(ctx) {
  const map = new Map();
  const conditions = [];
  const alerts = [];
  const fullText = ctx.historyText + ' ' + ctx.currentText;

  // 1. Quadro atual (maior peso)
  ACUTE_RULES.forEach(rule => {
    if (rule.re.test(ctx.currentText)) {
      rule.exams.forEach(id => pushSuggestion(map, id, 'Quadro atual', rule.label + (rule.note ? ` (${rule.note})` : ''), 5));
    }
  });

  // 2. Condições crônicas do histórico
  CHRONIC_RULES.forEach(rule => {
    if (rule.re.test(fullText)) {
      conditions.push(rule.label);
      rule.exams.forEach(id => pushSuggestion(map, id, 'Histórico clínico', `Acompanhamento de ${rule.label.toLowerCase()}`, 3));
    }
  });

  // 3. Medicamentos em uso (histórico + plano atual)
  const drugText = ctx.historyText + ' ' + ctx.planText;
  DRUG_MONITOR_RULES.forEach(rule => {
    if (rule.re.test(drugText)) {
      rule.exams.forEach(id => pushSuggestion(map, id, 'Medicação em uso', rule.why, 4));
    }
  });

  // 4. Rastreamento por idade e sexo
  const age = ctx.age;
  const isFem = ctx.gender.startsWith('f');
  const isMasc = ctx.gender.startsWith('m');
  if (age !== null) {
    if (age >= 40) pushSuggestion(map, 'lipidico', 'Rastreamento', 'Rastreamento cardiovascular a partir dos 40 anos', 1);
    if (age >= 45) pushSuggestion(map, 'glicemia', 'Rastreamento', 'Rastreamento de diabetes a partir dos 45 anos', 1);
    if (age >= 50 && age <= 75) {
      pushSuggestion(map, 'sangueoculto', 'Rastreamento', 'Rastreamento de câncer colorretal (50 a 75 anos)', 1);
    }
    if (isFem && age >= 50 && age <= 69) pushSuggestion(map, 'mamografia', 'Rastreamento', 'Rastreamento de câncer de mama (50 a 69 anos)', 1);
    if (isFem && age >= 65) pushSuggestion(map, 'densitometria', 'Rastreamento', 'Rastreamento de osteoporose (mulheres a partir de 65 anos)', 1);
    if (isMasc && age >= 50 && age <= 75) pushSuggestion(map, 'psa', 'Rastreamento', 'PSA a partir dos 50 anos, após decisão compartilhada', 0.5);
  }

  // 5. Duplicidade: exames já pedidos dentro do intervalo mínimo
  const now = Date.now();
  const suggestions = [];
  map.forEach(s => {
    const last = ctx.examHistory.find(r => (r.items || []).some(i => i.examId === s.examId));
    if (last) {
      const days = Math.floor((now - new Date(last.created_at).getTime()) / DAY);
      s.lastRequestedDays = days;
      const isAcute = s.sources.includes('Quadro atual');
      if (s.exam.interval > 0 && days < s.exam.interval && !isAcute) {
        // Pedido recente em acompanhamento crônico: não sugerir, apenas avisar
        alerts.push({ type: 'duplicate', examId: s.examId, message: `${s.exam.name} já foi pedido há ${days} dia(s). Intervalo usual: ${s.exam.interval} dias.` });
        return;
      }
    }
    suggestions.push(s);
  });

  // 6. Alerta de contraste para alérgicos e pacientes renais
  const contrastAllergy = /contraste|iodo/.test(ctx.allergies);
  const renalRisk = conditions.some(c => /renal|diabetes/i.test(c));
  suggestions.forEach(s => {
    if (s.exam.contrast && contrastAllergy) s.warning = 'Alergia a contraste registrada: avaliar pré-medicação ou método alternativo.';
    else if (s.exam.contrast && renalRisk) s.warning = 'Risco renal: confirmar creatinina recente antes do contraste.';
  });

  suggestions.sort((a, b) => b.score - a.score);
  return { suggestions: suggestions.slice(0, 18), conditions, alerts };
}

/* ------------------------------------------------------------------ */
/* Persistência                                                        */
/* ------------------------------------------------------------------ */

export function saveExamRequest(request) {
  if (typeof window === 'undefined' || !window.localDB) return null;
  const record = {
    id: window.localDB.generateId('EXM'),
    status: 'Solicitado',
    created_at: new Date().toISOString(),
    ...request
  };
  window.localDB.insert('exam_requests', record);
  return record;
}

/* ------------------------------------------------------------------ */
/* Impressão da requisição                                             */
/* ------------------------------------------------------------------ */

export function printExamRequisition(request) {
  const w = window.open('', '_blank', 'width=900,height=1000');
  if (!w) {
    showToast('Libere os pop-ups do navegador para imprimir a requisição.');
    return;
  }
  const groups = EXAM_CATEGORIES.map(cat => ({
    cat,
    items: (request.items || []).filter(i => (CATALOG_BY_ID[i.examId]?.cat || i.cat) === cat.id)
  })).filter(g => g.items.length);

  const date = new Date(request.created_at || Date.now()).toLocaleString('pt-BR');
  w.document.write(`<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><title>Requisição de Exames — ${esc(request.patientName)}</title>
  <style>
    body{font-family:Arial,Helvetica,sans-serif;color:#0f172a;margin:32px;font-size:13px}
    h1{font-size:18px;margin:0 0 4px;color:#1e1b4b}
    .head{display:flex;justify-content:space-between;border-bottom:2px solid #1e1b4b;padding-bottom:10px;margin-bottom:16px}
    .box{border:1px solid #cbd5e1;border-radius:6px;padding:10px 14px;margin-bottom:14px}
    h2{font-size:14px;margin:16px 0 6px;color:#3730a3}
    table{width:100%;border-collapse:collapse}
    th,td{border:1px solid #cbd5e1;padding:6px 8px;text-align:left;vertical-align:top}
    th{background:#eef2ff;font-size:12px}
    .pri-Urgente{color:#b45309;font-weight:bold}.pri-Emergência{color:#b91c1c;font-weight:bold}
    .sign{margin-top:60px;text-align:center}
    .sign div{border-top:1px solid #0f172a;width:320px;margin:0 auto;padding-top:4px}
    @media print{button{display:none}}
  </style></head><body>
  <div class="head"><div><h1>Health Nexus — Requisição de Exames</h1><div>Pedido ${esc(request.id || '')}</div></div><div style="text-align:right">${esc(date)}</div></div>
  <div class="box"><strong>Paciente:</strong> ${esc(request.patientName)}<br><strong>Local:</strong> ${esc(request.sector || '—')}<br><strong>Indicação clínica:</strong> ${esc(request.justification || '—')}</div>
  ${groups.map(g => `<h2>${esc(g.cat.label)}</h2><table><thead><tr><th style="width:45%">Exame</th><th style="width:15%">Prioridade</th><th>Preparo / observação</th></tr></thead><tbody>
    ${g.items.map(i => `<tr><td>${esc(i.name)}</td><td class="pri-${esc(i.priority)}">${esc(i.priority)}</td><td>${esc(i.prep || '')}${i.note ? `<br><em>${esc(i.note)}</em>` : ''}</td></tr>`).join('')}
  </tbody></table>`).join('')}
  <div class="sign"><div>${esc(request.doctorName || 'Médico solicitante')}${request.councilNumber ? ' · CRM ' + esc(request.councilNumber) : ''}</div></div>
  <p style="text-align:center;margin-top:24px"><button onclick="window.print()" style="padding:8px 18px;font-size:13px;cursor:pointer">Imprimir</button></p>
  </body></html>`);
  w.document.close();
  setTimeout(() => { try { w.focus(); w.print(); } catch (e) {} }, 400);
}

/* ------------------------------------------------------------------ */
/* Interface no PEP                                                    */
/* ------------------------------------------------------------------ */

const PRIORITIES = ['Rotina', 'Urgente', 'Emergência'];

/**
 * Monta a seção "Solicitação de Exames" dentro do formulário do PEP.
 * @param {HTMLElement} container
 * @param {object} opts { enc, user, isReadOnly, getCurrentTexts }
 * @returns {{ getSelected: Function, saveIfPending: Function }}
 */
export function mountExamOrdersSection(container, opts) {
  if (!container) return null;
  const { enc = {}, user = {}, isReadOnly = false, getCurrentTexts = () => ({}) } = opts || {};
  const patientId = enc.patientId || enc.id;
  const patientName = enc.patientName || '';

  const state = {
    selected: [],        // { examId, name, cat, prep, priority, note }
    category: 'all',
    query: '',
    prediction: { suggestions: [], conditions: [], alerts: [] },
    ctx: null
  };

  const isSelected = (id) => state.selected.some(s => s.examId === id);

  function addExam(examId, reasonNote = '') {
    if (isReadOnly || isSelected(examId)) return;
    const exam = CATALOG_BY_ID[examId];
    if (!exam) return;
    const isAcute = /Quadro atual/.test(reasonNote);
    state.selected.push({
      examId, name: exam.name, cat: exam.cat, prep: exam.prep,
      priority: isAcute ? 'Urgente' : 'Rotina',
      note: ''
    });
    render();
  }

  function removeExam(examId) {
    state.selected = state.selected.filter(s => s.examId !== examId);
    render();
  }

  function refreshPrediction() {
    const texts = getCurrentTexts();
    state.ctx = buildPatientClinicalContext({
      patientId, patientName, currentEncounterId: enc.id,
      currentTexts: { complaint: enc.complaints, ...texts }
    });
    state.prediction = predictExams(state.ctx);
  }

  function lastRequestInfo(examId) {
    const last = (state.ctx?.examHistory || []).find(r => (r.items || []).some(i => i.examId === examId));
    if (!last) return '';
    const days = Math.floor((Date.now() - new Date(last.created_at).getTime()) / DAY);
    return days === 0 ? 'pedido hoje' : `pedido há ${days} dia(s)`;
  }

  function buildRequest() {
    const texts = getCurrentTexts();
    return {
      patientId, patientName,
      encounterId: enc.id,
      sector: enc.sector || enc.room || '',
      doctorName: user?.name || enc.doctorName || '',
      councilNumber: user?.councilNumber || '',
      justification: (container.querySelector('#exam-justification')?.value || '').trim() || (texts.assessment || '').trim(),
      items: state.selected.map(s => ({ ...s }))
    };
  }

  function saveIfPending({ silent = false } = {}) {
    if (!state.selected.length) return null;
    const record = saveExamRequest(buildRequest());
    state.selected = [];
    refreshPrediction();
    render();
    if (!silent) showToast(`🧪 Pedido de exames salvo (${record?.items?.length || 0} itens).`);
    return record;
  }

  function catBadge(catId) {
    const c = EXAM_CATEGORIES.find(x => x.id === catId);
    return c ? `<span style="font-size:0.66rem; color:${c.color}; border:1px solid ${c.color}55; background:${c.color}1a; border-radius:10px; padding:1px 7px; white-space:nowrap;"><i class="fa-solid ${c.icon}"></i> ${c.label}</span>` : '';
  }

  function renderSuggestions() {
    const { suggestions, conditions, alerts } = state.prediction;
    const sourceColor = { 'Quadro atual': '#f87171', 'Histórico clínico': '#a78bfa', 'Medicação em uso': '#fbbf24', 'Rastreamento': '#38bdf8' };
    const pending = suggestions.filter(s => !isSelected(s.examId));
    return `
      <div style="background:linear-gradient(135deg, rgba(139,92,246,0.12), rgba(14,165,233,0.08)); border:1px solid rgba(139,92,246,0.35); border-radius:10px; padding:12px 14px; margin-bottom:12px;">
        <div style="display:flex; justify-content:space-between; align-items:center; gap:8px; flex-wrap:wrap; margin-bottom:8px;">
          <span style="font-weight:700; color:#c4b5fd; font-size:0.82rem;"><i class="fa-solid fa-wand-magic-sparkles"></i> Sugestões pelo histórico clínico</span>
          <div style="display:flex; gap:6px;">
            <button type="button" id="exam-refresh-suggestions" class="btn btn-sm" style="font-size:0.7rem; padding:3px 9px; border-radius:6px; background:rgba(255,255,255,0.06); color:#cbd5e1; border:1px solid var(--border-color); cursor:pointer;" title="Recalcular com o texto atual do SOAP"><i class="fa-solid fa-rotate"></i> Atualizar</button>
            ${!isReadOnly && pending.length ? `<button type="button" id="exam-add-all-suggestions" class="btn btn-sm" style="font-size:0.7rem; padding:3px 9px; border-radius:6px; background:rgba(16,185,129,0.15); color:#34d399; border:1px solid rgba(16,185,129,0.35); cursor:pointer;"><i class="fa-solid fa-check-double"></i> Incluir todas (${pending.length})</button>` : ''}
          </div>
        </div>
        ${conditions.length ? `<div style="font-size:0.74rem; color:#cbd5e1; margin-bottom:8px;">Condições encontradas no histórico: ${conditions.map(c => `<span style="background:rgba(167,139,250,0.15); color:#ddd6fe; border-radius:10px; padding:1px 8px; margin-right:4px;">${esc(c)}</span>`).join('')}</div>` : ''}
        ${alerts.map(a => `<div style="font-size:0.74rem; color:#fde68a; background:rgba(245,158,11,0.12); border:1px solid rgba(245,158,11,0.3); border-radius:6px; padding:5px 9px; margin-bottom:6px;"><i class="fa-solid fa-clock-rotate-left"></i> ${esc(a.message)}</div>`).join('')}
        ${suggestions.length === 0 ? `<div style="font-size:0.76rem; color:var(--text-muted);">Ainda não há dados suficientes para sugerir exames. Preencha a queixa ou a hipótese diagnóstica e clique em <strong>Atualizar</strong>.</div>` : `
          <div style="display:flex; flex-direction:column; gap:6px; max-height:240px; overflow-y:auto; padding-right:4px;">
            ${suggestions.map(s => {
              const sel = isSelected(s.examId);
              const last = lastRequestInfo(s.examId);
              return `
              <div class="exam-suggestion-row" style="display:flex; justify-content:space-between; align-items:center; gap:10px; background:var(--bg-secondary); border:1px solid ${sel ? 'rgba(16,185,129,0.45)' : 'var(--border-color)'}; border-radius:8px; padding:7px 10px;">
                <div style="min-width:0;">
                  <div style="font-size:0.8rem; color:#fff; font-weight:600; display:flex; gap:6px; align-items:center; flex-wrap:wrap;">${esc(s.exam.name)} ${catBadge(s.exam.cat)}
                    ${s.sources.map(src => `<span style="font-size:0.64rem; color:${sourceColor[src] || '#cbd5e1'}; border:1px solid ${(sourceColor[src] || '#cbd5e1')}55; border-radius:10px; padding:0 6px;">${esc(src)}</span>`).join('')}
                  </div>
                  <div style="font-size:0.72rem; color:var(--text-muted); margin-top:2px;">${esc(s.reasons.join(' · '))}${last ? ` · <span style="color:#fbbf24;">${esc(last)}</span>` : ''}</div>
                  ${s.warning ? `<div style="font-size:0.72rem; color:#fca5a5; margin-top:2px;"><i class="fa-solid fa-triangle-exclamation"></i> ${esc(s.warning)}</div>` : ''}
                </div>
                ${isReadOnly ? '' : sel
                  ? `<span style="font-size:0.72rem; color:#34d399; white-space:nowrap;"><i class="fa-solid fa-check"></i> Incluído</span>`
                  : `<button type="button" class="btn btn-sm exam-add-suggestion" data-exam="${s.examId}" data-src="${esc(s.sources.join(','))}" style="font-size:0.72rem; padding:3px 10px; border-radius:6px; background:rgba(16,185,129,0.15); color:#34d399; border:1px solid rgba(16,185,129,0.35); cursor:pointer; white-space:nowrap;"><i class="fa-solid fa-plus"></i> Incluir</button>`}
              </div>`;
            }).join('')}
          </div>
          <div style="font-size:0.68rem; color:var(--text-muted); margin-top:8px;"><i class="fa-solid fa-circle-info"></i> As sugestões apoiam a decisão. A indicação final é sempre do médico.</div>
        `}
      </div>`;
  }

  function renderCatalog() {
    const q = norm(state.query).trim();
    const list = EXAM_CATALOG.filter(e =>
      (state.category === 'all' || e.cat === state.category) &&
      (!q || norm(e.name).includes(q) || norm(e.tags).includes(q))
    );
    return `
      <div style="display:flex; gap:6px; flex-wrap:wrap; margin-bottom:8px;">
        ${[{ id: 'all', label: 'Todos', icon: 'fa-layer-group', color: '#cbd5e1' }, ...EXAM_CATEGORIES].map(c => `
          <button type="button" class="btn btn-sm exam-cat-btn" data-cat="${c.id}" style="font-size:0.72rem; padding:4px 10px; border-radius:16px; cursor:pointer; border:1px solid ${state.category === c.id ? c.color : 'var(--border-color)'}; background:${state.category === c.id ? c.color + '26' : 'transparent'}; color:${state.category === c.id ? c.color : '#94a3b8'};"><i class="fa-solid ${c.icon}"></i> ${c.label}</button>`).join('')}
      </div>
      <div style="position:relative; margin-bottom:8px;">
        <i class="fa-solid fa-magnifying-glass" style="position:absolute; left:10px; top:50%; transform:translateY(-50%); color:#64748b; font-size:0.78rem;"></i>
        <input type="text" id="exam-search-input" class="form-input" value="${esc(state.query)}" placeholder="Buscar exame pelo nome ou finalidade (ex: troponina, tireoide, PET)..." style="width:100%; padding-left:30px; font-size:0.82rem;" ${isReadOnly ? 'disabled' : ''}>
      </div>
      <div id="exam-catalog-list" style="display:grid; grid-template-columns:repeat(auto-fill, minmax(230px, 1fr)); gap:6px; max-height:210px; overflow-y:auto; padding-right:4px;">
        ${list.length === 0 ? `<div style="font-size:0.76rem; color:var(--text-muted); padding:8px;">Nenhum exame encontrado com esse termo.</div>` : list.map(e => {
          const sel = isSelected(e.id);
          return `<button type="button" class="exam-catalog-item" data-exam="${e.id}" ${isReadOnly || sel ? 'disabled' : ''} style="text-align:left; background:${sel ? 'rgba(16,185,129,0.1)' : 'var(--bg-secondary)'}; border:1px solid ${sel ? 'rgba(16,185,129,0.45)' : 'var(--border-color)'}; border-radius:8px; padding:7px 9px; cursor:${isReadOnly || sel ? 'default' : 'pointer'}; color:#e2e8f0; font-size:0.76rem; display:flex; flex-direction:column; gap:3px; transition:border-color .15s;">
            <span style="font-weight:600;">${sel ? '<i class="fa-solid fa-check" style="color:#34d399;"></i> ' : ''}${esc(e.name)}</span>
            ${catBadge(e.cat)}
          </button>`;
        }).join('')}
      </div>`;
  }

  function renderSelected() {
    if (!state.selected.length) {
      return `<div style="font-size:0.78rem; color:var(--text-muted); border:1px dashed var(--border-color); border-radius:8px; padding:12px; text-align:center;">Nenhum exame neste pedido ainda. Use as sugestões ou busque no catálogo.</div>`;
    }
    return `
      <div style="display:flex; flex-direction:column; gap:6px;">
        ${state.selected.map(s => `
          <div style="display:grid; grid-template-columns: 1fr 130px 32px; gap:8px; align-items:center; background:var(--bg-secondary); border:1px solid var(--border-color); border-left:3px solid ${(EXAM_CATEGORIES.find(c => c.id === s.cat) || {}).color || '#64748b'}; border-radius:8px; padding:7px 10px;">
            <div style="min-width:0;">
              <div style="font-size:0.8rem; color:#fff; font-weight:600;">${esc(s.name)}</div>
              <div style="font-size:0.7rem; color:var(--text-muted);"><i class="fa-solid fa-clipboard-list"></i> Preparo: ${esc(s.prep)}</div>
            </div>
            <select class="form-input exam-priority" data-exam="${s.examId}" style="font-size:0.74rem; padding:4px 6px;" ${isReadOnly ? 'disabled' : ''}>
              ${PRIORITIES.map(p => `<option value="${p}" ${s.priority === p ? 'selected' : ''}>${p}</option>`).join('')}
            </select>
            ${isReadOnly ? '' : `<button type="button" class="exam-remove" data-exam="${s.examId}" title="Remover do pedido" style="background:rgba(239,68,68,0.12); border:1px solid rgba(239,68,68,0.3); color:#f87171; border-radius:6px; height:28px; cursor:pointer;"><i class="fa-solid fa-xmark"></i></button>`}
          </div>`).join('')}
      </div>`;
  }

  function renderHistory() {
    const hist = (state.ctx?.examHistory || []).slice(0, 5);
    if (!hist.length) return '';
    return `
      <details style="margin-top:12px;">
        <summary style="cursor:pointer; font-size:0.78rem; color:#94a3b8; font-weight:600;"><i class="fa-solid fa-clock-rotate-left"></i> Pedidos anteriores deste paciente (${state.ctx.examHistory.length})</summary>
        <div style="display:flex; flex-direction:column; gap:6px; margin-top:8px;">
          ${hist.map(r => `
            <div style="display:flex; justify-content:space-between; align-items:center; gap:8px; background:var(--bg-secondary); border:1px solid var(--border-color); border-radius:8px; padding:7px 10px;">
              <div style="min-width:0;">
                <div style="font-size:0.74rem; color:#cbd5e1;">${esc(new Date(r.created_at).toLocaleString('pt-BR'))} · ${esc(r.doctorName || '')} · <span style="color:#34d399;">${esc(r.status || 'Solicitado')}</span></div>
                <div style="font-size:0.72rem; color:var(--text-muted); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${esc((r.items || []).map(i => i.name).join(', '))}</div>
              </div>
              <button type="button" class="btn btn-sm exam-reprint" data-req="${esc(r.id)}" style="font-size:0.7rem; padding:3px 9px; border-radius:6px; background:rgba(255,255,255,0.06); color:#cbd5e1; border:1px solid var(--border-color); cursor:pointer; white-space:nowrap;"><i class="fa-solid fa-print"></i> Reimprimir</button>
            </div>`).join('')}
        </div>
      </details>`;
  }

  function render() {
    const texts = getCurrentTexts();
    const prevJust = container.querySelector('#exam-justification')?.value;
    container.innerHTML = `
      <div id="pep-exam-orders" style="background:var(--bg-tertiary); border:1px solid rgba(56,189,248,0.3); border-radius:12px; padding:14px 16px;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px; gap:8px; flex-wrap:wrap;">
          <label class="form-label" style="font-weight:700; color:var(--text-primary); margin:0; font-size:0.9rem;">
            <i class="fa-solid fa-flask-vial" style="color:#38bdf8; margin-right:6px;"></i> Solicitação de Exames
          </label>
          <span id="exam-selected-count" style="font-size:0.72rem; font-weight:700; color:#38bdf8; background:rgba(56,189,248,0.12); border:1px solid rgba(56,189,248,0.3); border-radius:12px; padding:2px 10px;">${state.selected.length} no pedido</span>
        </div>

        ${renderSuggestions()}

        <div style="display:grid; grid-template-columns: minmax(0,1.1fr) minmax(0,1fr); gap:14px;" class="exam-orders-grid">
          <div>
            <div style="font-size:0.76rem; font-weight:700; color:#94a3b8; text-transform:uppercase; margin-bottom:6px;">📚 Catálogo de exames</div>
            ${renderCatalog()}
          </div>
          <div>
            <div style="font-size:0.76rem; font-weight:700; color:#94a3b8; text-transform:uppercase; margin-bottom:6px;">🧾 Pedido atual</div>
            ${renderSelected()}
            <label class="form-label" style="font-size:0.76rem; color:#94a3b8; margin:10px 0 4px; display:block;">Indicação clínica (vai impressa na requisição)</label>
            <textarea id="exam-justification" class="form-input" style="width:100%; min-height:48px; resize:vertical; font-size:0.8rem;" placeholder="Ex: Dor torácica há 2h, investigar síndrome coronariana aguda" ${isReadOnly ? 'readonly' : ''}>${esc(prevJust ?? (texts.assessment || ''))}</textarea>
            ${isReadOnly ? '' : `
            <div style="display:flex; gap:8px; justify-content:flex-end; margin-top:10px; flex-wrap:wrap;">
              <button type="button" id="exam-print-btn" class="btn btn-sm" ${state.selected.length ? '' : 'disabled'} style="font-size:0.76rem; padding:6px 12px; border-radius:8px; background:rgba(255,255,255,0.06); color:#e2e8f0; border:1px solid var(--border-color); cursor:pointer;"><i class="fa-solid fa-print"></i> Salvar e imprimir requisição</button>
              <button type="button" id="exam-save-btn" class="btn btn-sm" ${state.selected.length ? '' : 'disabled'} style="font-size:0.76rem; padding:6px 12px; border-radius:8px; background:linear-gradient(135deg, #0ea5e9, #0369a1); color:#fff; border:none; cursor:pointer;"><i class="fa-solid fa-paper-plane"></i> Enviar pedido</button>
            </div>`}
          </div>
        </div>
        ${renderHistory()}
      </div>`;
    bind();
  }

  function bind() {
    container.querySelector('#exam-refresh-suggestions')?.addEventListener('click', () => {
      refreshPrediction();
      render();
    });
    container.querySelector('#exam-add-all-suggestions')?.addEventListener('click', () => {
      state.prediction.suggestions.forEach(s => {
        if (!isSelected(s.examId)) {
          const exam = s.exam;
          state.selected.push({ examId: s.examId, name: exam.name, cat: exam.cat, prep: exam.prep, priority: s.sources.includes('Quadro atual') ? 'Urgente' : 'Rotina', note: '' });
        }
      });
      render();
    });
    container.querySelectorAll('.exam-add-suggestion').forEach(btn => {
      btn.addEventListener('click', () => addExam(btn.dataset.exam, btn.dataset.src || ''));
    });
    container.querySelectorAll('.exam-cat-btn').forEach(btn => {
      btn.addEventListener('click', () => { state.category = btn.dataset.cat; render(); });
    });
    const search = container.querySelector('#exam-search-input');
    if (search) {
      search.addEventListener('keydown', (e) => {
        // Enter não deve assinar o PEP: inclui o primeiro exame da busca
        if (e.key === 'Enter') {
          e.preventDefault();
          const first = container.querySelector('.exam-catalog-item:not([disabled])');
          if (first) addExam(first.dataset.exam);
        }
      });
      search.addEventListener('input', (e) => {
        state.query = e.target.value;
        const caret = e.target.selectionStart;
        render();
        const again = container.querySelector('#exam-search-input');
        if (again) { again.focus(); try { again.setSelectionRange(caret, caret); } catch (err) {} }
      });
    }
    container.querySelectorAll('.exam-catalog-item').forEach(btn => {
      btn.addEventListener('click', () => addExam(btn.dataset.exam));
    });
    container.querySelectorAll('.exam-priority').forEach(sel => {
      sel.addEventListener('change', () => {
        const item = state.selected.find(s => s.examId === sel.dataset.exam);
        if (item) item.priority = sel.value;
      });
    });
    container.querySelectorAll('.exam-remove').forEach(btn => {
      btn.addEventListener('click', () => removeExam(btn.dataset.exam));
    });
    container.querySelector('#exam-save-btn')?.addEventListener('click', () => saveIfPending());
    container.querySelector('#exam-print-btn')?.addEventListener('click', () => {
      const rec = saveIfPending({ silent: true });
      if (rec) {
        printExamRequisition(rec);
        showToast('🖨️ Pedido salvo. Requisição aberta para impressão.');
      }
    });
    container.querySelectorAll('.exam-reprint').forEach(btn => {
      btn.addEventListener('click', () => {
        const rec = (state.ctx?.examHistory || []).find(r => String(r.id) === btn.dataset.req);
        if (rec) printExamRequisition(rec);
      });
    });
  }

  refreshPrediction();
  render();

  return {
    getSelected: () => state.selected.slice(),
    saveIfPending,
    refresh: () => { refreshPrediction(); render(); }
  };
}

if (typeof window !== 'undefined') {
  window.EXAM_CATALOG = EXAM_CATALOG;
  window.predictExams = predictExams;
  window.printExamRequisition = printExamRequisition;
}
