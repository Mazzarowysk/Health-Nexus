// ==========================================
// Health Nexus — Clinical AI & Smart Care Module
// Ditado por Voz (Voice-to-SOAP), Escore MEWS, Alerta de Sepse,
// Verificador de Interações Medicamentosas e Integração WhatsApp
// ==========================================

import { showToast, showCustomAlert } from './ui.js';

// --- 1. MOTOR DE RECONHECIMENTO DE FALA (VOICE-TO-SOAP) ---

let activeRecognition = null;
let activeTargetInputId = null;

export const isSpeechRecognitionSupported = () => {
  return 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window;
};

export const startVoiceDictation = (targetInputId, micButtonId = null, onResultCallback = null) => {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  
  if (!SpeechRecognition) {
    showCustomAlert({
      title: 'Recurso Indisponível',
      message: 'Seu navegador não possui suporte à API de Reconhecimento de Voz. Recomendamos o Google Chrome, Edge ou Safari.',
      type: 'warning'
    });
    return;
  }

  const targetInput = document.getElementById(targetInputId);
  const micBtn = micButtonId ? document.getElementById(micButtonId) : null;

  // Se já está gravando no mesmo input, parar
  if (activeRecognition && activeTargetInputId === targetInputId) {
    stopVoiceDictation();
    return;
  }

  // Se estiver gravando em outro input, para o anterior
  if (activeRecognition) {
    stopVoiceDictation();
  }

  try {
    const recognition = new SpeechRecognition();
    recognition.lang = 'pt-BR';
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    activeRecognition = recognition;
    activeTargetInputId = targetInputId;

    if (micBtn) {
      micBtn.classList.add('recording-active');
      micBtn.style.background = 'linear-gradient(135deg, #ef4444, #dc2626)';
      micBtn.style.color = '#fff';
      micBtn.style.boxShadow = '0 0 15px rgba(239, 68, 68, 0.6)';
      micBtn.innerHTML = '<i class="fa-solid fa-microphone-lines fa-fade"></i> Gravando...';
    }

    showToast('🎙️ Ditado clínico ativo. Fale normalmente...');

    let finalTranscript = targetInput ? targetInput.value : '';
    if (finalTranscript && !finalTranscript.endsWith(' ') && !finalTranscript.endsWith('\n')) {
      finalTranscript += ' ';
    }

    recognition.onresult = (event) => {
      let interimTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        let transcript = event.results[i][0].transcript;
        
        // Tratamento inteligente de pontuação clínica falada (com ou sem acentuação)
        transcript = transcript
          .replace(/\bponto final\b/gi, '.')
          .replace(/\bponto e v[íi]rgula\b/gi, ';')
          .replace(/\bdois pontos\b/gi, ':')
          .replace(/\bv[íi]rgula\b/gi, ',')
          .replace(/\bexclama[çc][ãa]o\b/gi, '!')
          .replace(/\binterroga[çc][ãa]o\b/gi, '?')
          .replace(/\bnovo par[áa]grafo\b/gi, '\n\n')
          .replace(/\bnova linha\b/gi, '\n');

        if (event.results[i].isFinal) {
          finalTranscript += transcript + ' ';
        } else {
          interimTranscript += transcript;
        }
      }

      if (targetInput) {
        targetInput.value = finalTranscript + interimTranscript;
        targetInput.scrollTop = targetInput.scrollHeight;
      }

      if (typeof onResultCallback === 'function') {
        onResultCallback(finalTranscript + interimTranscript);
      }
    };

    recognition.onerror = (event) => {
      console.warn('[SpeechRecognition Error]', event.error);
      if (event.error === 'not-allowed') {
        showCustomAlert({
          title: 'Permissão de Microfone',
          message: 'O acesso ao microfone foi bloqueado pelo navegador. Conceda permissão para utilizar o ditado.',
          type: 'danger'
        });
      }
      stopVoiceDictation();
    };

    recognition.onend = () => {
      if (activeRecognition === recognition) {
        stopVoiceDictation();
      }
    };

    recognition.start();

  } catch (err) {
    console.error('[SpeechRecognition Start Error]', err);
    stopVoiceDictation();
  }
};

export const stopVoiceDictation = () => {
  if (activeRecognition) {
    try {
      activeRecognition.stop();
    } catch (e) {}
    activeRecognition = null;
  }

  if (activeTargetInputId) {
    const allMicBtns = document.querySelectorAll('.btn-voice-dictation');
    allMicBtns.forEach(btn => {
      btn.classList.remove('recording-active');
      btn.style.background = '';
      btn.style.color = '';
      btn.style.boxShadow = '';
      btn.innerHTML = '<i class="fa-solid fa-microphone"></i> Ditar';
    });
    activeTargetInputId = null;
    showToast('🎙️ Ditado finalizado.');
  }
};

// --- 2. ESCORE CLÍNICO MEWS (MODIFIED EARLY WARNING SCORE) & ALERTA DE SEPSE ---

export const calculateMEWS = (vitals = {}) => {
  let score = 0;
  const reasons = [];

  // 1. Pressão Arterial Sistólica (PAS)
  let pas = 120;
  if (vitals.bloodPressure || vitals.blood_pressure || vitals.pa) {
    const bpStr = String(vitals.bloodPressure || vitals.blood_pressure || vitals.pa);
    const parts = bpStr.split('/');
    pas = parseInt(parts[0], 10) || 120;
  }

  if (pas <= 70) {
    score += 3; reasons.push('PAS ≤ 70 mmHg (Hipotensão Crítica)');
  } else if (pas <= 80) {
    score += 2; reasons.push('PAS 71-80 mmHg (Hipotensão Severa)');
  } else if (pas <= 100) {
    score += 1; reasons.push('PAS 81-100 mmHg (Hipotensão Leve)');
  } else if (pas >= 200) {
    score += 2; reasons.push('PAS ≥ 200 mmHg (Crise Hipertensiva)');
  }

  // 2. Frequência Cardíaca (FC)
  const fc = parseInt(vitals.heartRateBpm || vitals.heart_rate || vitals.fc || 80, 10);
  if (fc <= 40) {
    score += 2; reasons.push('FC ≤ 40 bpm (Bradicardia Grave)');
  } else if (fc <= 50) {
    score += 1; reasons.push('FC 41-50 bpm (Bradicardia)');
  } else if (fc >= 130) {
    score += 3; reasons.push('FC ≥ 130 bpm (Taquicardia Severa)');
  } else if (fc >= 111) {
    score += 2; reasons.push('FC 111-129 bpm (Taquicardia Moderada)');
  } else if (fc >= 101) {
    score += 1; reasons.push('FC 101-110 bpm (Taquicardia Leve)');
  }

  // 3. Temperatura Corporal (°C)
  const temp = parseFloat(vitals.temperatureCelsius || vitals.temperature || vitals.temp || 36.5);
  if (temp < 35.0) {
    score += 2; reasons.push('Temp < 35.0°C (Hipotermia)');
  } else if (temp >= 38.5) {
    score += 2; reasons.push('Temp ≥ 38.5°C (Febre Alta)');
  } else if (temp >= 37.8) {
    score += 1; reasons.push('Temp 37.8 - 38.4°C (Pirexia)');
  }

  // 4. Saturação de Oxigênio (SpO2)
  const spo2 = parseInt(vitals.oxygenSaturation || vitals.oxygen_saturation || vitals.spo2 || 98, 10);
  if (spo2 <= 85) {
    score += 3; reasons.push('SpO2 ≤ 85% (Hipóxia Crítica)');
  } else if (spo2 <= 90) {
    score += 2; reasons.push('SpO2 86-90% (Hipóxia Severa)');
  } else if (spo2 <= 94) {
    score += 1; reasons.push('SpO2 91-94% (Dessaturação)');
  }

  // 5. Escala de Dor / Estado Geral
  const pain = parseInt(vitals.painScale || vitals.pain_scale || vitals.painLevel || 0, 10);
  if (pain >= 9) {
    score += 1; reasons.push('Dor Extrema (Escala ≥ 9/10)');
  }

  // Classificação do Risco
  let riskLevel = 'Baixo';
  let badgeColor = '#10b981';
  let badgeBg = 'rgba(16, 185, 129, 0.15)';
  let recommendation = 'Manter rotina padrão de atendimento e monitoramento.';
  let isSepsisAlert = false;

  if (score >= 5) {
    riskLevel = 'Alto Risco (Crítico)';
    badgeColor = '#ef4444';
    badgeBg = 'rgba(239, 68, 68, 0.25)';
    recommendation = '🚨 ATENÇÃO IMEDIATA: Avaliação médica urgente, monitorização contínua e acionamento de leito de emergência/UTI.';
    isSepsisAlert = (temp >= 38.0 || temp < 36.0) && (fc > 90 || pas < 90);
  } else if (score >= 3) {
    riskLevel = 'Risco Moderado';
    badgeColor = '#f59e0b';
    badgeBg = 'rgba(245, 158, 11, 0.2)';
    recommendation = '⚠️ Aumentar frequência de checagem dos sinais vitais a cada 30 min e priorizar avaliação médica.';
  }

  return {
    score,
    riskLevel,
    badgeColor,
    badgeBg,
    reasons,
    recommendation,
    isSepsisAlert
  };
};

// --- 3. SISTEMA AVANÇADO DE APOIO À DECISÃO CLÍNICA FARMACOLÓGICA (CDSS 4D) ---
// Base Ontológica indexada por ATC (OMS), DCB (Anvisa) e Nomes Comerciais de Referência

export const PHARMACOLOGICAL_TAXONOMY = {
  // 1. Inibidores de PDE-5 (Vasodilatadores para Disfunção Erétil / HAP)
  'ATC_G04BE': {
    className: 'Inibidores da Fosfodiesterase Tipo 5 (PDE-5)',
    substances: ['sildenafila', 'viagra', 'tadalafila', 'cialis', 'vardenafila', 'levitra', 'avanafila', 'spedra'],
    mechanism: 'Vasodilatação mediada por GMPc com relaxamento da musculatura lisa vascular'
  },
  // 2. Nitratos Vasodilatadores Coronarianos
  'ATC_C01DA': {
    className: 'Nitratos Vasodilatadores Coronarianos',
    substances: ['monocordil', 'sustrate', 'isossorbida', 'nitroglicerina', 'dinitrato', 'propatilnitrato', 'tridil', 'nitrato', 'nitratos'],
    mechanism: 'Doadores de óxido nítrico com vasodilatação venosa e coronariana potente'
  },
  // 3. Anti-inflamatórios Não Esteroidais (AINEs)
  'ATC_M01A': {
    className: 'Anti-inflamatórios Não Esteroidais (AINEs)',
    substances: ['ibuprofeno', 'advil', 'alivium', 'cetoprofeno', 'profenid', 'diclofenaco', 'voltaren', 'cataflam', 'naproxeno', 'flanax', 'nimesulida', 'nisulid', 'meloxicam', 'piroxicam', 'celecoxibe', 'celebra'],
    mechanism: 'Inibição das enzimas ciclo-oxigenases (COX-1 e COX-2), inibindo prostaglandinas'
  },
  // 4. Anticoagulantes Cumarínicos / Orais
  'ATC_B01AA': {
    className: 'Anticoagulantes Cumarínicos (Antivitamina K)',
    substances: ['varfarina', 'warfarin', 'marevan', 'coumadin'],
    mechanism: 'Inibição da síntese hepática de fatores de coagulação dependentes de Vitamina K'
  },
  // 5. Antiagregantes Plaquetários / Salicilatos
  'ATC_B01AC': {
    className: 'Antiagregantes Plaquetários & Salicilatos',
    substances: ['aspirina', 'aas', 'acido acetilsalicilico', 'somalgin', 'clopidogrel', 'plavix', 'ticagrelor', 'brilinta', 'prasugrel'],
    mechanism: 'Inibição irreversível da COX-1 plaquetária e bloqueio de receptores P2Y12'
  },
  // 6. Analgésicos Opioides
  'ATC_N02A': {
    className: 'Analgésicos Opioides de Ação Central',
    substances: ['tramadol', 'cloridrato de tramadol', 'tramal', 'sylador', 'morfina', 'dimorf', 'codeina', 'tylex', 'fentanil', 'oxicodona', 'oxycontin'],
    mechanism: 'Agonismo de receptores opioides mu no sistema nervoso central'
  },
  // 7. Antidepressivos ISRS / IRSN
  'ATC_N06AB': {
    className: 'Inibidores de Recaptação de Serotonina / Noradrenalina (ISRS/IRSN)',
    substances: ['fluoxetina', 'prozac', 'daforin', 'sertralina', 'zoloft', 'assert', 'escitalopram', 'lexapro', 'paroxetina', 'aropax', 'citalopram', 'cipramil', 'venlafaxina', 'efexor', 'duloxetina', 'cymbalta'],
    mechanism: 'Aumento da disponibilidade sináptica de serotonina e/ou noradrenalina'
  },
  // 8. Benzodiazepínicos (Sedativos/Ansiolíticos)
  'ATC_N05BA': {
    className: 'Benzodiazepínicos Depressores do SNC',
    substances: ['diazepam', 'valium', 'clonazepam', 'rivotril', 'midazolam', 'dormonid', 'alprazolam', 'frontal', 'lorazepam'],
    mechanism: 'Potencialização da neurotransmissão inibitória gabaérgica'
  },
  // 9. Betabloqueadores
  'ATC_C07A': {
    className: 'Betabloqueadores Adrenérgicos',
    substances: ['propranolol', 'inderal', 'atenolol', 'atenol', 'metoprolol', 'selozok', 'carvedilol', 'coreg', 'bisoprolol', 'concor'],
    mechanism: 'Antagonismo competitivo dos receptores beta-1 e beta-2 adrenérgicos'
  },
  // 10. Bloqueadores dos Canais de Cálcio Não-Di-hidropiridínicos
  'ATC_C08D': {
    className: 'Bloqueadores de Canais de Cálcio (Não-Di-hidropiridínicos)',
    substances: ['verapamil', 'dilacoron', 'diltiazem', 'cardizem', 'balcor'],
    mechanism: 'Inibição do influxo de cálcio no miocárdio e nódulo atrioventricular'
  },
  // 11. Inibidores da ECA & Bloqueadores dos Receptores de Angiotensina (IECA/BRA)
  'ATC_C09A': {
    className: 'Inibidores do Sistema Renina-Angiotensina (IECA/BRA)',
    substances: ['enalapril', 'renitec', 'captopril', 'capoten', 'ramipril', 'triatec', 'losartana', 'aradois', 'cozaar', 'valsartana', 'diovan', 'candesartana'],
    mechanism: 'Bloqueio da conversão ou ação da angiotensina II com vasodilatação sistêmica'
  },
  // 12. Diuréticos Poupadores de Potássio
  'ATC_C03DA': {
    className: 'Diuréticos Poupadores de Potássio / Antagonistas da Aldosterona',
    substances: ['espironolactona', 'aldactone'],
    mechanism: 'Antagonismo competitivo da aldosterona nos túbulos coletores renais'
  },
  // 13. Estatinas (Hipolipemiantes)
  'ATC_C10AA': {
    className: 'Inibidores da HMG-CoA Redutase (Estatinas)',
    substances: ['sinvastatina', 'zocor', 'atorvastatina', 'lipitor', 'rosuvastatina', 'crestor', 'pravastatina'],
    mechanism: 'Inibição da síntese hepática de colesterol via enzima HMG-CoA redutase'
  },
  // 14. Inibidores Enzimáticos CYP3A4 & Azóis / Macrolídeos
  'ATC_J01FA_J02AC': {
    className: 'Macrolídeos & Antifúngicos Azólicos Inibidores Potentes do CYP3A4',
    substances: ['claritromicina', 'klaricid', 'eritromicina', 'fluconazol', 'diflucan', 'itraconazol', 'sporanox', 'cetoconazol'],
    mechanism: 'Inibição potente do citocromo CYP3A4 elevando concentrações plasmáticas de substratos'
  },
  // 15. Inibidores da Bomba de Prótons (IBP)
  'ATC_A02BC': {
    className: 'Inibidores da Bomba de Prótons (IBP)',
    substances: ['omeprazol', 'losec', 'pantoprazol', 'pantozol', 'esomeprazol', 'nexium', 'lansoprazol'],
    mechanism: 'Inibição irreversível da H+/K+ ATPase na mucosa gástrica'
  },
  // 16. Estabilizadores de Humor (Lítio)
  'ATC_N05AN': {
    className: 'Estabilizadores do Humor (Sais de Lítio)',
    substances: ['litio', 'carbonato de litio', 'carbolitium'],
    mechanism: 'Modulação de segundos mensageiros fosfoinositídeos e neurotransmissão glutamatérgica'
  },
  // 17. Digitálicos
  'ATC_C01AA': {
    className: 'Glicosídeos Cardiotônicos (Digitálicos)',
    substances: ['digoxina'],
    mechanism: 'Inibição da Na+/K+ ATPase aumentando o cálcio intracelular e contratilidade miocárdica'
  },
  // 18. Antiarrítmicos Classe III
  'ATC_C01BD': {
    className: 'Antiarrítmicos Bloqueadores dos Canais de Potássio',
    substances: ['amiodarona', 'ancoron'],
    mechanism: 'Prolongamento do potencial de ação e período refratário miocárdico'
  },
  // 19. Suplementos Eletrolíticos
  'ATC_A12BA': {
    className: 'Suplementos de Potássio',
    substances: ['cloreto de potassio', 'slow-k', 'potassio'],
    mechanism: 'Reposição direta de cátions de potássio sérico'
  },
  // 20. Quinolonas
  'ATC_J01MA': {
    className: 'Antibióticos Quinolonas / Fluoroquinolonas',
    substances: ['ciprofloxacino', 'ciprofloxacina', 'cipro', 'levofloxacino', 'levaquin'],
    mechanism: 'Inibição da DNA girase bacteriana e topoisomerase IV'
  },
  // 21. Teofilinas / Metilxantinas
  'ATC_R03DA': {
    className: 'Broncodilatadores Metilxantinas',
    substances: ['teofilina', 'aminofilina'],
    mechanism: 'Inibição não-seletiva da fosfodiesterase promovendo broncodilatação'
  },
  // 22. Antimetabólitos Imunossupressores
  'ATC_L01BA': {
    className: 'Antimetabólitos Antagonistas do Ácido Fólico',
    substances: ['metotrexato', 'methotrexate'],
    mechanism: 'Inibição da di-hidrofolato redutase bloqueando síntese de DNA celular'
  },
  // 23. Penicilinas & Beta-lactâmicos
  'ATC_J01CA': {
    className: 'Penicilinas & Antibacterianos Beta-lactâmicos',
    substances: ['amoxicilina', 'amoxil', 'ampicilina', 'clavulanato', 'amoxicilina + clavulanato', 'ceftriaxona', 'rocefin', 'cefalosporina', 'penicilina'],
    mechanism: 'Inibição da síntese da parede celular bacteriana via PBPs'
  }
};

// Base de Interações Fármaco x Fármaco (DDI) com Severidade Padrão Ouro (Micromedex/Lexicomp)
export const DRUG_INTERACTIONS_DB = [
  {
    classA: 'ATC_G04BE',
    classB: 'ATC_C01DA',
    severity: 'Critica',
    color: '#ef4444',
    title: 'CONTRAINDICAÇÃO ABSOLUTA: Inibidores da PDE-5 + Nitratos',
    desc: 'A associação de Inibidores da PDE-5 (Sildenafila, Tadalafila) com Nitratos (Monocordil, Sustrate, Isossorbida, Nitroglicerina) produz vasodilatação sistêmica maciça com colapso hemodinâmico, choque cardiogênico refratário e risco de morte súbita.',
    action: 'CONTRAINDICAÇÃO ABSOLUTA. Suspender nitratos por no mínimo 24h (Sildenafila) ou 48h (Tadalafila) antes do uso, ou prescrever alternativa terapêutica segura.',
    isBlocker: true
  },
  {
    classA: 'ATC_B01AA',
    classB: 'ATC_B01AC',
    severity: 'Grave',
    color: '#ef4444',
    title: 'Hemorragia Severa por Dupla Anticoagulação/Antiagregação',
    desc: 'O uso concomitante de Varfarina com Salicilatos/Antiagregantes potencializa drasticamente o risco de sangramento gastrointestinal volumoso e hemorragia intracraniana.',
    action: 'Evitar associação não planejada. Se mandatória por prótese/SCA, monitorar INR frequentemente e associar protetor gástrico (IBP).'
  },
  {
    classA: 'ATC_B01AA',
    classB: 'ATC_M01A',
    severity: 'Grave',
    color: '#ef4444',
    title: 'Risco de Sangramento Gastrointestinal Grave (Varfarina + AINEs)',
    desc: 'Anti-inflamatórios não esteroidais (AINEs) deslocam a varfarina de proteínas plasmáticas, inibem a função plaquetária e causam lesão direta da mucosa gástrica.',
    action: 'Substituir AINE por analgésico puro (Dipirona ou Paracetamol). Não associar AINEs a anticoagulantes orais.'
  },
  {
    classA: 'ATC_N02A',
    classB: 'ATC_N06AB',
    severity: 'Grave',
    color: '#ef4444',
    title: 'Síndrome Serotoninérgica & Redução do Limiar Convulsivo',
    desc: 'A combinação de Tramadol com antidepressivos ISRS/IRSN (Fluoxetina, Sertralina, Escitalopram, Venlafaxina) eleva os níveis sinápticos de serotonina, podendo precipitar Síndrome Serotoninérgica com hipertermia, clônus e convulsões.',
    action: 'Monitorar sinais precoces de neurotoxicidade (tremores, hiperreflexia, diaforese). Preferir analgesia sem componente serotoninérgico.'
  },
  {
    classA: 'ATC_N02A',
    classB: 'ATC_N05BA',
    severity: 'Grave',
    color: '#ef4444',
    title: 'Depressão Respiratória & Sedação Profunda',
    desc: 'Associação de opioides com benzodiazepínicos causa depressão sinérgica profunda do centro respiratório bulbar e do SNC, com risco de parada respiratória e coma.',
    action: 'Evitar associação. Se imprescindível em ambiente hospitalar, monitorar oximetria de pulso contínua e manter Naloxona/Flumazenil de fácil acesso.'
  },
  {
    classA: 'ATC_C07A',
    classB: 'ATC_C08D',
    severity: 'Critica',
    color: '#ef4444',
    title: 'Bloqueio AV Total & Bradicardia Severa / Choque',
    desc: 'Associação de Beta-bloqueador com Bloqueador de Canal de Cálcio não-di-hidropiridínico (Verapamil ou Diltiazem) suprime aditivamente o nódulo sinusal e condução atrioventricular, podendo desencadear BAVT, assistolia e choque cardiogênico.',
    action: 'CONTRAINDICADO na maioria dos casos clínicos. Monitorar eletrocardiograma e frequência cardíaca continuamente.'
  },
  {
    classA: 'ATC_C10AA',
    classB: 'ATC_J01FA_J02AC',
    severity: 'Grave',
    color: '#ef4444',
    title: 'Risco Elevado de Rabdomiólise & Lesão Renal Aguda',
    desc: 'Macrolídeos (Claritromicina/Eritromicina) e Azóis (Fluconazol/Itraconazol) inibem potentemente o CYP3A4, multiplicando a exposição sérica às estatinas (Sinvastatina/Atorvastatina).',
    action: 'Suspender temporariamente a estatina durante o ciclo antimicrobiano ou selecionar Rosuvastatina/Pravastatina.'
  },
  {
    classA: 'ATC_N05AN',
    classB: 'ATC_M01A',
    severity: 'Grave',
    color: '#ef4444',
    title: 'Intoxicação Aguda por Lítio (Nefrotoxicidade & Neurotoxicidade)',
    desc: 'AINEs inibem prostaglandinas renais, reduzindo a taxa de filtração glomerular do Lítio e elevando rapidamente a litiemia sérica para faixas tóxicas.',
    action: 'Evitar AINEs em uso de Lítio. Utilizar Paracetamol ou Dipirona como analgésicos e monitorar litiemia.'
  },
  {
    classA: 'ATC_C09A',
    classB: 'ATC_C03DA',
    severity: 'Moderada',
    color: '#f59e0b',
    title: 'Risco de Hipercalemia Grave (IECA/BRA + Espironolactona)',
    desc: 'Bloqueio dual do eixo renina-angiotensina-aldosterona retém potássio sérico, podendo elevar K+ > 5.5 mEq/L e induzir arritmias cardíacas.',
    action: 'Monitorar eletrólitos séricos (K+) e função renal (Creatinina/Ureia) periodicamente.'
  },
  {
    classA: 'ATC_C03DA',
    classB: 'ATC_A12BA',
    severity: 'Critica',
    color: '#ef4444',
    title: 'Hipercalemia Fatal & Parada Cardíaca em Diástole',
    desc: 'Associação de diurético poupador de potássio com suplementação direta de potássio pode disparar hipercalemia hiperaguda fatal.',
    action: 'CONTRAINDICADO em pacientes com normocalemia. Monitorar potássio sérico diariamente.'
  },
  {
    classA: 'ATC_C01AA',
    classB: 'ATC_C01BD',
    severity: 'Grave',
    color: '#ef4444',
    title: 'Intoxicação Digitálica Grave por Amiodarona',
    desc: 'Amiodarona inibe a glicoproteína-P renal e reduz o clearance da Digoxina em 50%, provocando acúmulo tóxico com BAV e arritmias ventriculares.',
    action: 'Reduzir a dose de Digoxina em 50% ao introduzir Amiodarona e solicitar dosagem de digoxinemia e ECG.'
  },
  {
    classA: 'ATC_A02BC',
    classB: 'ATC_B01AC',
    severity: 'Moderada',
    color: '#f59e0b',
    title: 'Redução da Ativação do Clopidogrel por Omeprazol',
    desc: 'Omeprazol inibe o CYP2C19, enzima necessária para bioativar o pró-fármaco Clopidogrel, reduzindo a proteção contra trombose de stent/SCA.',
    action: 'Substituir Omeprazol por Pantoprazol (menor afinidade pelo CYP2C19) ou Famotidina.'
  },
  {
    classA: 'ATC_J01MA',
    classB: 'ATC_R03DA',
    severity: 'Grave',
    color: '#ef4444',
    title: 'Toxicidade Severa por Teofilina (Ciprofloxacino)',
    desc: 'Ciprofloxacino inibe o CYP1A2, elevando os níveis de Teofilina com risco de taquiarritmias graves e convulsões.',
    action: 'Reduzir dose da teofilina ou prescrever antibiótico alternativo (ex.: Azitromicina ou Amoxicilina).'
  },
  {
    classA: 'ATC_J01CA',
    classB: 'ATC_L01BA',
    severity: 'Moderada',
    color: '#f59e0b',
    title: 'Toxicidade Medular por Metotrexato (Penicilinas)',
    desc: 'Penicilinas competem com a secreção tubular renal do Metotrexato, aumentando seus níveis séricos e risco de mielossupressão.',
    action: 'Monitorar hemograma e plaquetas rigorosamente durante o tratamento.'
  },
  {
    classA: 'ATC_N02A',
    classB: 'ATC_B01AC',
    severity: 'Moderada',
    color: '#f59e0b',
    title: 'Risco de Lesão de Mucosa & Sangramento GI (Tramadol + Salicilatos)',
    desc: 'Associação de analgésico opioide com salicilatos pode elevar o risco de desconforto gástrico e sangramento oculto em mucosa predisposta.',
    action: 'Avaliar prescrição de IBP protetor gástrico e orientar tomada após as refeições.'
  }
];

// Helper: Identificar classes farmacológicas presentes em um texto
export const detectPharmacologicalClasses = (text = '') => {
  const norm = String(text).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const detected = [];

  for (const [classCode, classData] of Object.entries(PHARMACOLOGICAL_TAXONOMY)) {
    const matchedSubstances = classData.substances.filter(s => {
      const cleanSub = s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      const escaped = cleanSub.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`\\b${escaped}\\b`, 'i');
      return regex.test(norm) || norm.includes(cleanSub);
    });

    matchedSubstances.forEach(matchedSubstance => {
      detected.push({
        classCode,
        className: classData.className,
        matchedSubstance,
        mechanism: classData.mechanism
      });
    });
  }

  return detected;
};

// --- MOTOR PRINCIPAL CDSS EM 4 DIMENSÕES ---
export const evaluatePrescriptionCDSS = (prescriptionInput, clinicalContext = {}) => {
  let prescriptionText = '';
  if (Array.isArray(prescriptionInput)) {
    prescriptionText = prescriptionInput.map(i => typeof i === 'string' ? i : (i.name || i.medication || '')).join(' ');
  } else if (typeof prescriptionInput === 'string') {
    prescriptionText = prescriptionInput;
  }

  let historyText = '';
  if (typeof clinicalContext === 'string') {
    historyText = clinicalContext;
  } else if (clinicalContext && typeof clinicalContext === 'object') {
    historyText = [
      clinicalContext.subjectiveContent || '',
      clinicalContext.objectiveContent || '',
      clinicalContext.assessmentContent || '',
      clinicalContext.complaints || '',
      clinicalContext.notes || '',
      clinicalContext.patientNotes || '',
      clinicalContext.allergies || '',
      clinicalContext.medicalHistory || '',
      clinicalContext.continuousMedications || ''
    ].filter(Boolean).join(' | ');
  }

  const normPrescription = prescriptionText.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const normHistory = historyText.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const combinedNorm = (normPrescription + ' ' + normHistory).trim();

  if (!normPrescription) return [];

  const alerts = [];

  const rxClasses = detectPharmacologicalClasses(normPrescription);
  const historyClasses = detectPharmacologicalClasses(normHistory);

  // ──────────────────────────────────────────────────────────────────────────
  // DIMENSÃO 1: INTERAÇÕES FÁRMACO X FÁRMACO (DDI)
  // ──────────────────────────────────────────────────────────────────────────
  DRUG_INTERACTIONS_DB.forEach(rule => {
    const rxHasA = rxClasses.some(c => c.classCode === rule.classA);
    const rxHasB = rxClasses.some(c => c.classCode === rule.classB);

    const historyHasA = historyClasses.some(c => c.classCode === rule.classA);
    const historyHasB = historyClasses.some(c => c.classCode === rule.classB);

    const matchCase1 = rxHasA && (rxHasB || historyHasB);
    const matchCase2 = rxHasB && (rxHasA || historyHasA);

    if (matchCase1 || matchCase2) {
      const isWithContinuous = (rxHasA && !rxHasB && historyHasB) || (rxHasB && !rxHasA && historyHasA);
      alerts.push({
        dimension: 'DDI',
        severity: rule.severity,
        color: rule.color,
        title: isWithContinuous ? `[Uso Contínuo / Anamnese] ${rule.title}` : rule.title,
        desc: isWithContinuous ? `O paciente possui histórico de uso prévio na anamnese. ${rule.desc}` : rule.desc,
        action: rule.action,
        isBlocker: Boolean(rule.isBlocker)
      });
    }
  });

  // ──────────────────────────────────────────────────────────────────────────
  // DIMENSÃO 2: FÁRMACO X ALERGIAS DO PACIENTE
  // ──────────────────────────────────────────────────────────────────────────
  const allergyKeywords = ['alergia', 'alergico', 'alergica', 'hipersensibilidade', 'anafilaxia', 'reacao adversa', 'edema de glote'];
  const hasAllergySignal = allergyKeywords.some(kw => normHistory.includes(kw)) || Boolean(clinicalContext?.allergies);

  if (hasAllergySignal) {
    const ALLERGEN_TAXONOMY = [
      {
        label: 'Dipirona / Pirazolonas',
        aliases: ['dipirona', 'metamizol', 'novalgina', 'anador', 'lisador'],
        matchClasses: []
      },
      {
        label: 'Penicilinas & Beta-lactâmicos',
        aliases: ['penicilina', 'amoxicilina', 'amoxil', 'ampicilina', 'cefalosporina', 'ceftriaxona', 'rocefin', 'clavulanato'],
        matchClasses: ['ATC_J01CA']
      },
      {
        label: 'Aspirina / Salicilatos',
        aliases: ['aspirina', 'aas', 'acido acetilsalicilico', 'somalgin'],
        matchClasses: ['ATC_B01AC']
      },
      {
        label: 'Anti-inflamatórios (AINEs)',
        aliases: ['ibuprofeno', 'cetoprofeno', 'diclofenaco', 'naproxeno', 'nimesulida', 'piroxicam', 'meloxicam', 'voltaren', 'cataflam', 'profenid'],
        matchClasses: ['ATC_M01A']
      },
      {
        label: 'Sulfonamidas / Sulfas',
        aliases: ['sulfametoxazol', 'sulfa', 'sulfas', 'bactrim'],
        matchClasses: []
      },
      {
        label: 'Opioides / Tramadol',
        aliases: ['tramadol', 'tramal', 'morfina', 'codeina', 'fentanil'],
        matchClasses: ['ATC_N02A']
      }
    ];

    ALLERGEN_TAXONOMY.forEach(alg => {
      const historyHasAllergy = alg.aliases.some(alias => normHistory.includes(alias));
      const prescriptionHasAllergen = alg.aliases.some(alias => normPrescription.includes(alias)) ||
                                     rxClasses.some(c => alg.matchClasses.includes(c.classCode));

      if (historyHasAllergy && prescriptionHasAllergen) {
        alerts.unshift({
          dimension: 'ALLERGY',
          severity: 'Critica',
          color: '#ef4444',
          title: `🚨 ALERTA CRÍTICO DE ALERGIA: PACIENTE ALÉRGICO A ${alg.label.toUpperCase()}`,
          desc: `Consta no cadastro/anamnese do paciente histórico formal de hipersensibilidade a "${alg.label}". A prescrição deste fármaco apresenta ALTO RISCO de reação anafilática grave, broncoespasmo e choque.`,
          action: `SUSPENDER IMEDIATAMENTE a prescrição de ${alg.label} e prescrever alternativa farmacológica segura de outra classe terapêutica.`,
          isAllergyAlert: true,
          isBlocker: true
        });
      }
    });
  }

  // ──────────────────────────────────────────────────────────────────────────
  // DIMENSÃO 3: FÁRMACO X CONDIÇÃO CLÍNICA / CID-10 / SINAIS VITAIS
  // ──────────────────────────────────────────────────────────────────────────
  // Regra 3.1: Inibidores de PDE-5 em Dor Torácica / Angina / Isquemia / Arritmias Agudas
  const hasPDE5 = rxClasses.some(c => c.classCode === 'ATC_G04BE');
  if (hasPDE5) {
    const cardiacSymptomKeywords = [
      'dor no peito', 'dor toracica', 'desconforto toracico', 'angina', 'palpitacao', 
      'taquicardia', 'taquiarritmia', 'isquemia', 'infarto', 'iam', 'coronaria', 
      'insuficiencia cardiaca', 'arritmia', 'pos-infarto', 'sindrome coronariana', 'r00.0', 'i47', 'i20', 'i21'
    ];
    if (cardiacSymptomKeywords.some(kw => combinedNorm.includes(kw))) {
      alerts.unshift({
        dimension: 'CLINICAL_CONTRAINDICATION',
        severity: 'Critica',
        color: '#ef4444',
        title: '🚨 CONTRAINDICAÇÃO CARDIOVASCULAR CRÍTICA: Inibidores da PDE-5 em Dor Torácica / Taquiarritmia',
        desc: 'O paciente apresenta quadro agudo de dor torácica / taquiarritmia / síndrome coronariana. O uso de inibidores da PDE-5 (Sildenafila, Tadalafila) é fortemente contraindicado pelo risco de vasodilatação reflexa, queda crítica da pressão de perfusão coronariana, isquemia miocárdica e choque.',
        action: 'SUSPENDER IMEDIATAMENTE a prescrição de Sildenafila/Tadalafila. Priorizar estabilização hemodinâmica, ECG de 12 derivações e investigação de emergência cardiológica.',
        isBlocker: true
      });
    }
  }

  // Regra 3.2: Betabloqueadores em Asma / Broncoespasmo / DPOC
  const hasBetaBlocker = rxClasses.some(c => c.classCode === 'ATC_C07A');
  if (hasBetaBlocker) {
    const asthmaKeywords = ['asma', 'broncoespasmo', 'dpoc', 'chiado', 'sibilância', 'j45', 'j44'];
    if (asthmaKeywords.some(kw => combinedNorm.includes(kw))) {
      alerts.push({
        dimension: 'CLINICAL_CONTRAINDICATION',
        severity: 'Grave',
        color: '#ef4444',
        title: 'CONTRAINDICAÇÃO RESPIRATÓRIA: Betabloqueadores em Paciente Asmático / DPOC',
        desc: 'Betabloqueadores podem antagonizar receptores beta-2 brônquicos e desencadear broncoespasmo severo e insuficiência respiratória em pacientes com asma ou DPOC.',
        action: 'Substituir por classe anti-hipertensiva alternativa (IECA/BRA ou Bloqueador de Canal de Cálcio di-hidropiridínico).'
      });
    }
  }

  // Regra 3.3: AINEs em Insuficiência Renal Crônica / Úlcera Péptica Ativa
  const hasAINE = rxClasses.some(c => c.classCode === 'ATC_M01A');
  if (hasAINE) {
    const renalUlcerKeywords = ['insuficiencia renal', 'drc', 'creatinina elevada', 'ulcera', 'hemorragia digestiva', 'hda', 'n18', 'k25', 'k26'];
    if (renalUlcerKeywords.some(kw => combinedNorm.includes(kw))) {
      alerts.push({
        dimension: 'CLINICAL_CONTRAINDICATION',
        severity: 'Grave',
        color: '#ef4444',
        title: 'CONTRAINDICAÇÃO CLÍNICA: AINEs em Doença Renal / Úlcera Ativa',
        desc: 'Anti-inflamatórios reduzem a síntese de prostaglandinas vasodilatadoras renais (precipitando IRA) e inibem a proteção da mucosa gástrica com risco de perfuração/sangramento.',
        action: 'Prescrever analgésicos puros (Dipirona / Paracetamol) ou opioides fracos para controle álgico seguro.'
      });
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // DIMENSÃO 4: DUPLICIDADE TERAPÊUTICA (Mesma Classe Farmacológica no Plano)
  // ──────────────────────────────────────────────────────────────────────────
  const classOccurrences = {};
  rxClasses.forEach(item => {
    if (!classOccurrences[item.classCode]) {
      classOccurrences[item.classCode] = [];
    }
    if (!classOccurrences[item.classCode].includes(item.matchedSubstance)) {
      classOccurrences[item.classCode].push(item.matchedSubstance);
    }
  });

  for (const [classCode, substances] of Object.entries(classOccurrences)) {
    // Normaliza para não considerar sinônimos do mesmo fármaco como duplicidade
    const uniqueBases = [];
    substances.forEach(s => {
      const isDuplicateVariation = uniqueBases.some(b => b.includes(s) || s.includes(b));
      if (!isDuplicateVariation) uniqueBases.push(s);
    });

    if (uniqueBases.length >= 2) {
      const classInfo = PHARMACOLOGICAL_TAXONOMY[classCode];
      alerts.push({
        dimension: 'DUPLICATION',
        severity: classCode === 'ATC_G04BE' ? 'Critica' : 'Moderada',
        color: classCode === 'ATC_G04BE' ? '#ef4444' : '#60a5fa',
        title: `DUPLICIDADE TERAPÊUTICA: ${classInfo.className}`,
        desc: `Prescrição simultânea de ${uniqueBases.length} fármacos da mesma classe terapêutica (${uniqueBases.join(' + ')}). Essa associação raramente traz benefício clínico e multiplica a toxicidade e os efeitos adversos.`,
        action: `Avaliar prescrição e manter apenas um único princípio ativo na dose terapêutica recomendada.`
      });
    }
  }

  return alerts;
};

// Wrapper para manter compatibilidade total com chamadas antigas
export const checkDrugInteractions = (textOrArray, patientHistoryContext = '') => {
  return evaluatePrescriptionCDSS(textOrArray, patientHistoryContext);
};

// Helper: Conector Assíncrono com a API OpenFDA para enriquecimento de bulas e reações adversas
export const queryOpenFDADrugSafety = async (drugName = '') => {
  if (!drugName) return null;
  try {
    const cleanDrug = encodeURIComponent(drugName.trim());
    const res = await fetch(`https://api.fda.gov/drug/label.json?search=openfda.generic_name:${cleanDrug}&limit=1`);
    if (!res.ok) return null;
    const json = await res.json();
    const result = json.results?.[0];
    if (!result) return null;
    return {
      genericName: result.openfda?.generic_name?.[0] || drugName,
      brandName: result.openfda?.brand_name?.[0] || '',
      warnings: result.warnings?.[0] || result.boxed_warning?.[0] || '',
      contraindications: result.contraindications?.[0] || '',
      drugInteractions: result.drug_interactions?.[0] || ''
    };
  } catch (e) {
    return null;
  }
};

// --- 4. FORMATADOR E INTEGRAÇÃO WHATSAPP ---

export const generateWhatsAppClinicalMessage = (data = {}) => {
  const patientName = data.patientName || 'Paciente';
  const doctorName = data.doctorName || 'Dr(a). Médico(a) Assistente';
  const clinicName = 'Health Nexus · Hospital & Centro de Medicina Integrada';
  const dateStr = new Date().toLocaleDateString('pt-BR');
  const timeStr = new Date().toLocaleTimeString('pt-BR').slice(0, 5);

  let msg = `🏥 *${clinicName}*\n`;
  msg += `📅 *Data:* ${dateStr} às ${timeStr}\n\n`;
  msg += `Olá, *${patientName}*! Seguem as orientações do seu atendimento médico:\n\n`;
  
  if (data.doctorName) {
    msg += `👨‍⚕️ *Profissional:* ${doctorName}\n`;
  }
  if (data.diagnosis) {
    msg += `📋 *Avaliação Clínica:* ${data.diagnosis}\n`;
  }
  if (data.prescriptions && data.prescriptions.length > 0) {
    msg += `\n💊 *Prescrição Médica & Medicamentos:*\n`;
    data.prescriptions.forEach((p, i) => {
      msg += `  ${i + 1}. *${p.medication || p.name}* — ${p.dosage || '1 dose'} (${p.instructions || 'Conforme orientação'})\n`;
    });
  } else if (data.plan) {
    msg += `\n💊 *Conduta / Orientações:*\n${data.plan}\n`;
  }

  if (data.room) {
    msg += `\n🚪 *Local / Consultório:* ${data.room}\n`;
  }

  msg += `\n🔒 *Autenticação Digital:* CFM nº 1.821/2007\n`;
  msg += `Em caso de dúvidas ou sintomas de emergência, procure nossa unidade imediatamente.`;

  return msg;
};

export const sendToWhatsApp = (phone = '', message = '') => {
  let cleanPhone = String(phone).replace(/\D/g, '');
  
  if (cleanPhone.length >= 10 && cleanPhone.length <= 11) {
    cleanPhone = '55' + cleanPhone;
  }

  const encodedMsg = encodeURIComponent(message);
  let url = '';

  if (cleanPhone && cleanPhone.length >= 12) {
    url = `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodedMsg}`;
  } else {
    url = `https://api.whatsapp.com/send?text=${encodedMsg}`;
  }

  window.open(url, '_blank');
};

export const SMART_POSOLOGY_DATABASE = [
  {
    keys: ['dipirona', 'novalgina', 'anador', 'metamizol'],
    name: 'Dipirona Sódica',
    dose: '500 mg/mL (1 ampola - 2mL)',
    route: 'EV',
    frequency: 'De 6 em 6h',
    instructions: 'Diluir em 100ml SF 0,9% e infundir em 15 min se dor ou febre > 37.8°C.'
  },
  {
    keys: ['paracetamol', 'tylenol'],
    name: 'Paracetamol',
    dose: '750 mg (1 comprimido)',
    route: 'VO',
    frequency: 'De 6 em 6h',
    instructions: 'Tomar por via oral com água se febre ou dor. Dose máxima 4g/dia.'
  },
  {
    keys: ['ibuprofeno', 'advil', 'alivium'],
    name: 'Ibuprofeno',
    dose: '600 mg (1 comprimido)',
    route: 'VO',
    frequency: 'De 8 em 8h',
    instructions: 'Tomar após as refeições. Evitar uso prolongado em idosos ou nefropatas.'
  },
  {
    keys: ['cetoprofeno', 'profenid'],
    name: 'Cetoprofeno',
    dose: '100 mg (1 ampola)',
    route: 'EV',
    frequency: 'De 12 em 12h',
    instructions: 'Diluir em 100ml SG 5% ou SF 0,9% e infundir em 30 min.'
  },
  {
    keys: ['diclofenaco', 'voltaren', 'cataflam'],
    name: 'Diclofenaco Sódico',
    dose: '75 mg (1 ampola - 3mL)',
    route: 'IM',
    frequency: '1x ao dia',
    instructions: 'Injeção intramuscular profunda no quadrante superior externo do glúteo.'
  },
  {
    keys: ['amoxicilina', 'clavulin', 'amoxicilina + clavulanato', 'amoxil'],
    name: 'Amoxicilina + Clavulanato',
    dose: '875 + 125 mg (1 comp)',
    route: 'VO',
    frequency: 'De 12 em 12h',
    instructions: 'Tomar no início das refeições por 7 a 10 dias consecutivos.'
  },
  {
    keys: ['ceftriaxona', 'rocefin', 'triaxin'],
    name: 'Ceftriaxona Sódica',
    dose: '1 g (1 frasco-ampola)',
    route: 'EV',
    frequency: '1x ao dia',
    instructions: 'Reconstituir e diluir em 100ml de SF 0,9%. Infundir em 30 min.'
  },
  {
    keys: ['azitromicina', 'astro', 'zitromax'],
    name: 'Azitromicina',
    dose: '500 mg (1 comprimido)',
    route: 'VO',
    frequency: '1x ao dia',
    instructions: 'Tomar 1h antes ou 2h após a refeição, por 5 dias.'
  },
  {
    keys: ['ciprofloxacino', 'cipro', 'quinoflox'],
    name: 'Ciprofloxacino',
    dose: '500 mg (1 comprimido)',
    route: 'VO',
    frequency: 'De 12 em 12h',
    instructions: 'Ingerir com bastante líquido. Evitar uso simultâneo com antiácidos.'
  },
  {
    keys: ['tramadol', 'cloridrato de tramadol', 'tramal', 'sylador'],
    name: 'Cloridrato de Tramadol',
    dose: '50 mg (1 ampola - 1mL)',
    route: 'EV',
    frequency: 'De 8 em 8h',
    instructions: 'Diluir em 100ml SF 0,9% e infundir lentamente em 30 min se dor intensa.'
  },
  {
    keys: ['morfina', 'dimorf'],
    name: 'Sulfato de Morfina',
    dose: '2 mg a 4 mg (fracionado)',
    route: 'EV',
    frequency: 'De 4 em 4h',
    instructions: 'Diluir 1 amp (10mg/mL) em 9mL AD (1mg/mL). Administrar lentamente em bólus.'
  },
  {
    keys: ['ondansetrona', 'vonau', 'nausedron', 'zofran'],
    name: 'Cloridrato de Ondansetrona',
    dose: '8 mg (1 ampola - 4mL)',
    route: 'EV',
    frequency: 'De 8 em 8h',
    instructions: 'Injetar EV direto lento em 2 a 5 minutos se náuseas ou vômitos.'
  },
  {
    keys: ['metoclopramida', 'plasil'],
    name: 'Cloridrato de Metoclopramida',
    dose: '10 mg (1 ampola - 2mL)',
    route: 'EV',
    frequency: 'De 8 em 8h',
    instructions: 'Injetar EV lento (mínimo 3 min) para prevenção de efeitos extrapiramidais.'
  },
  {
    keys: ['omeprazol', 'losec', 'victrix'],
    name: 'Omeprazol',
    dose: '40 mg (1 frasco-ampola)',
    route: 'EV',
    frequency: '1x ao dia',
    instructions: 'Reconstituir com diluente próprio e infundir EV lento pela manhã em jejum.'
  },
  {
    keys: ['pantoprazol', 'pantozol'],
    name: 'Pantoprazol',
    dose: '40 mg (1 frasco-ampola)',
    route: 'EV',
    frequency: '1x ao dia',
    instructions: 'Injetar EV lento em 2 a 5 minutos para proteção gástrica.'
  },
  {
    keys: ['losartana', 'cozaar', 'aradois'],
    name: 'Losartana Potássica',
    dose: '50 mg (1 comprimido)',
    route: 'VO',
    frequency: '1x ao dia',
    instructions: 'Tomar no mesmo horário pela manhã. Monitorar pressão arterial.'
  },
  {
    keys: ['metoprolol', 'selozok', 'succinato de metoprolol'],
    name: 'Succinato de Metoprolol',
    dose: '50 mg (1 comprimido)',
    route: 'VO',
    frequency: '1x ao dia',
    instructions: 'Tomar pela manhã com água. Não mastigar comprimido de liberação controlada.'
  },
  {
    keys: ['propranolol', 'inderal'],
    name: 'Cloridrato de Propranolol',
    dose: '40 mg (1 comprimido)',
    route: 'VO',
    frequency: 'De 12 em 12h',
    instructions: 'Checar frequência cardíaca antes da tomada. Contraindicado na asma ativa.'
  },
  {
    keys: ['furosemida', 'lasix'],
    name: 'Furosemida',
    dose: '20 mg (1 ampola - 2mL)',
    route: 'EV',
    frequency: '1x ao dia',
    instructions: 'Injetar EV direto lento (1 a 2 min). Monitorar débito urinário e eletrólitos.'
  },
  {
    keys: ['enoxaparina', 'clexane', 'versa'],
    name: 'Enoxaparina Sódica',
    dose: '40 mg (0,4 mL - seringa pré-enchida)',
    route: 'SC',
    frequency: '1x ao dia',
    instructions: 'Injeção subcutânea profunda na parede abdominal anterolateral. Não massagear.'
  },
  {
    keys: ['varfarina', 'marevan', 'coumadin'],
    name: 'Varfarina Sódica',
    dose: '5 mg (1 comprimido)',
    route: 'VO',
    frequency: '1x ao dia',
    instructions: 'Tomar à noite com água. Controle estrito de INR/TP periodicamente.'
  },
  {
    keys: ['aspirina', 'aas', 'acido acetilsalicilico', 'somalgin'],
    name: 'Ácido Acetilsalicílico (AAS)',
    dose: '100 mg (1 comprimido)',
    route: 'VO',
    frequency: '1x ao dia',
    instructions: 'Tomar logo após o almoço para minimizar irritação gástrica.'
  },
  {
    keys: ['clopidogrel', 'plavix'],
    name: 'Bissulfato de Clopidogrel',
    dose: '75 mg (1 comprimido)',
    route: 'VO',
    frequency: '1x ao dia',
    instructions: 'Tomar diariamente no mesmo horário com ou sem alimentos.'
  },
  {
    keys: ['sustrate', 'isossorbida', 'monocordil', 'dinitrato'],
    name: 'Mononitrato de Isossorbida',
    dose: '10 mg (1 comprimido)',
    route: 'VO',
    frequency: 'De 12 em 12h',
    instructions: 'Se dor torácica aguda em crise, preferir forma sublingual 5mg. Cautela com hipotensão.'
  },
  {
    keys: ['sildenafila', 'viagra', 'tadalafila', 'cialis'],
    name: 'Citrato de Sildenafila',
    dose: '50 mg (1 comprimido)',
    route: 'VO',
    frequency: 'Dose Única',
    instructions: 'CONTRAINDICADO USO COM NITRATOS. Risco de hipotensão severa e colapso circulatório.'
  },
  {
    keys: ['diazepam', 'valium'],
    name: 'Diazepam',
    dose: '10 mg (1 ampola - 2mL)',
    route: 'EV',
    frequency: 'Dose Única',
    instructions: 'Injetar EV direto lento em veia calibrosa. Monitorar saturação e padrão respiratório.'
  },
  {
    keys: ['clonazepam', 'rivotril'],
    name: 'Clonazepam',
    dose: '2 mg (1 comprimido) ou 5 gotas',
    route: 'VO',
    frequency: '1x ao dia',
    instructions: 'Tomar à noite antes de deitar. Evitar ingestão concomitante com álcool ou depressores.'
  },
  {
    keys: ['hidrocortisona', 'solu-cortef', 'flebodiscort'],
    name: 'Succinato Sódico de Hidrocortisona',
    dose: '100 mg a 500 mg (1 frasco)',
    route: 'EV',
    frequency: 'De 8 em 8h',
    instructions: 'Reconstituir com diluente próprio e infundir em 100ml SF 0,9% em 20 a 30 min.'
  },
  {
    keys: ['dexametasona', 'decadron'],
    name: 'Fosfato Dissódico de Dexametasona',
    dose: '4 mg a 10 mg (1 ampola)',
    route: 'EV',
    frequency: '1x ao dia',
    instructions: 'Injetar EV direto lento em 3 minutos ou diluir em soro fisiológico.'
  },
  {
    keys: ['salbutamol', 'aerolin'],
    name: 'Sulfato de Salbutamol (Aerolin)',
    dose: '4 jatos (spray) ou 10 gotas (nebulização)',
    route: 'Inalatória',
    frequency: 'De 4 em 4h',
    instructions: 'Nebulização com 3ml de SF 0,9% com fluxo de O2 a 6L/min ou spray com espaçador.'
  },
  {
    keys: ['ipratropio', 'atrovent'],
    name: 'Brometo de Ipratrópio (Atrovent)',
    dose: '20 a 40 gotas',
    route: 'Inalatória',
    frequency: 'De 6 em 6h',
    instructions: 'Diluir em 3ml a 5ml de SF 0,9% para nebulização contínua.'
  },
  {
    keys: ['insulina regular', 'insulina nph', 'novorapid', 'humalog'],
    name: 'Insulina Humana',
    dose: 'Conforme glicemia capilar (HGT)',
    route: 'SC',
    frequency: 'Conforme protocolo de HGT',
    instructions: 'Aplicação subcutânea em abdômen ou braço. Checar HGT prévio obrigatoriamente.'
  }
];

export function getSmartPosologyForMedication(medInput) {
  if (!medInput || typeof medInput !== 'string') return null;
  const cleanInput = medInput.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
  
  for (const item of SMART_POSOLOGY_DATABASE) {
    if (item.keys.some(k => cleanInput.includes(k) || k.includes(cleanInput))) {
      return item;
    }
  }
  return null;
}

if (typeof window !== 'undefined') {
  window.SMART_POSOLOGY_DATABASE = SMART_POSOLOGY_DATABASE;
  window.getSmartPosologyForMedication = getSmartPosologyForMedication;
}

