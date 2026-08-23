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
        
        // Tratamento inteligente de pontuação clínica falada
        transcript = transcript
          .replace(/\bponto final\b/gi, '.')
          .replace(/\bponto e vírgula\b/gi, ';')
          .replace(/\bdois pontos\b/gi, ':')
          .replace(/\bvírgula\b/gi, ',')
          .replace(/\bexclamação\b/gi, '!')
          .replace(/\binterrogação\b/gi, '?')
          .replace(/\bnovo parágrafo\b/gi, '\n\n')
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

// --- 3. VERIFICADOR DE INTERAÇÕES MEDICAMENTOSAS EM TEMPO REAL ---

const DRUG_INTERACTIONS_DB = [
  {
    drugs: ['varfarina', 'aspirina'],
    severity: 'Grave',
    color: '#ef4444',
    title: 'Hemorragia Severa',
    desc: 'O uso concomitante de Varfarina e Aspirina (AAS) potencializa drasticamente o risco de sangramento gastrointestinal e intracraniano.',
    action: 'Evitar associação. Monitorar INR e considerar alternativa antiplaquetária com protetor gástrico.'
  },
  {
    drugs: ['varfarina', 'ibuprofeno'],
    severity: 'Grave',
    color: '#ef4444',
    title: 'Risco de Sangramento Gastrointestinal',
    desc: 'Anti-inflamatórios não esteroidais (AINEs) deslocam a varfarina de proteínas plasmáticas e inibem agregação plaquetária.',
    action: 'Substituir AINE por analgésico puro (Dipirona ou Paracetamol).'
  },
  {
    drugs: ['ciprofloxacino', 'teofilina'],
    severity: 'Grave',
    color: '#ef4444',
    title: 'Toxicidade por Teofilina',
    desc: 'Ciprofloxacino inibe o citocromo P450 (CYP1A2), elevando os níveis séricos de Teofilina com risco de convulsões e arritmias ventriculares.',
    action: 'Reduzir dose da teofilina ou escolher outro antibiótico (ex: Azitromicina).'
  },
  {
    drugs: ['omeprazol', 'clopidogrel'],
    severity: 'Moderada',
    color: '#f59e0b',
    title: 'Redução da Eficácia Antiagregante',
    desc: 'Omeprazol inibe a ativação do pró-fármaco Clopidogrel via CYP2C19, aumentando risco de eventos trombóticos/isquêmicos.',
    action: 'Substituir Omeprazol por Pantoprazol ou Famotidina.'
  },
  {
    drugs: ['enalapril', 'espironolactona'],
    severity: 'Moderada',
    color: '#f59e0b',
    title: 'Risco de Hipercalemia Grave',
    desc: 'Associação de IECA com poupador de potássio pode causar elevação perigosa de potássio sérico (K+ > 5.5 mEq/L) com arritmias.',
    action: 'Monitorar eletrólitos séricos e função renal frequentemente.'
  },
  {
    drugs: ['tramadol', 'fluoxetina'],
    severity: 'Grave',
    color: '#ef4444',
    title: 'Síndrome Serotoninérgica & Convulsões',
    desc: 'Associação de opioide com inibidor de recaptação de serotonina (ISRS) eleva serotonina cerebral e reduz limiar convulsivo.',
    action: 'Monitorar sinais de tremores, hiperreflexia e febre. Considerar analgésico não serotoninérgico.'
  },
  {
    drugs: ['amoxicilina', 'metotrexato'],
    severity: 'Moderada',
    color: '#f59e0b',
    title: 'Toxicidade por Metotrexato',
    desc: 'Penicilinas competem com a secreção tubular renal do metotrexato, elevando sua toxicidade hematológica.',
    action: 'Monitorar hemograma e plaquetas de perto durante o tratamento.'
  },
  {
    drugs: ['digoxina', 'amiodarona'],
    severity: 'Grave',
    color: '#ef4444',
    title: 'Intoxicação Digitálica',
    desc: 'Amiodarona reduz o clearance da digoxina, dobrando seus níveis plasmáticos com risco de bloqueio AV e arritmias fatais.',
    action: 'Reduzir dose da Digoxina em 50% e monitorar ECG constantemente.'
  }
];

export const checkDrugInteractions = (textOrArray) => {
  let content = '';
  if (Array.isArray(textOrArray)) {
    content = textOrArray.map(item => typeof item === 'string' ? item : (item.name || item.medication || '')).join(' ');
  } else if (typeof textOrArray === 'string') {
    content = textOrArray;
  }

  const normalized = content.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const foundInteractions = [];

  DRUG_INTERACTIONS_DB.forEach(inter => {
    const allPresent = inter.drugs.every(d => normalized.includes(d));
    if (allPresent) {
      foundInteractions.push(inter);
    }
  });

  return foundInteractions;
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
