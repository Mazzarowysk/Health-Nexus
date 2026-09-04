// src/modules/emergencyProtocols.js — Protocolos de Emergência Aguda & Cronômetros Assistenciais (Health Nexus v2.8.0)

export const EMERGENCY_PROTOCOLS_DEF = {
  IAM: {
    id: 'IAM',
    name: 'Protocolo de Síndrome Coronariana Aguda (IAM)',
    icon: 'fa-heart-pulse',
    color: '#ef4444',
    bgColor: 'rgba(239, 68, 68, 0.15)',
    borderColor: '#ef4444',
    targets: [
      { name: 'ECG de 12 Derivações', maxMinutes: 10, key: 'ecg' },
      { name: 'Coleta de Troponina & Marcadores', maxMinutes: 30, key: 'troponin' },
      { name: 'Angioplastia / Porta-Balão', maxMinutes: 90, key: 'angioplasty' }
    ],
    keywords: ['dor no peito', 'dor toracica', 'angina', 'infarto', 'iam', 'coronaria', 'isquemia', 'desconforto toracico', 'r07.4', 'i21']
  },
  AVC: {
    id: 'AVC',
    name: 'Protocolo de AVC Agudo (Acidente Vascular Cerebral)',
    icon: 'fa-brain',
    color: '#f59e0b',
    bgColor: 'rgba(245, 158, 11, 0.15)',
    borderColor: '#f59e0b',
    targets: [
      { name: 'Tomografia de Crânio (TC)', maxMinutes: 25, key: 'ct_scan' },
      { name: 'Avaliação Neurológica / NIHSS', maxMinutes: 45, key: 'nihss' },
      { name: 'Janela Trombolítica (Porta-Agulha)', maxMinutes: 270, key: 'thrombolysis' } // 4.5h
    ],
    keywords: ['avc', 'derrame', 'fraqueza facial', 'disartria', 'hemiparesia', 'perda de forca', 'assimetria facial', 'i63', 'i64']
  },
  SEPSE: {
    id: 'SEPSE',
    name: 'Protocolo de Sepse (Pacote da 1ª Hora)',
    icon: 'fa-triangle-exclamation',
    color: '#8b5cf6',
    bgColor: 'rgba(139, 92, 246, 0.15)',
    borderColor: '#8b5cf6',
    targets: [
      { name: 'Dosagem de Lactato Sérico', maxMinutes: 30, key: 'lactate' },
      { name: 'Coleta de Hemoculturas (2 Pares)', maxMinutes: 45, key: 'hemoculture' },
      { name: 'Início de Antibiótico Amplo Espectro', maxMinutes: 60, key: 'antibiotic' }
    ],
    keywords: ['sepse', 'choque septico', 'febre alta', 'hipotensao', 'infeccao grave', 'bacteremia', 'a41', 'r65']
  }
};

const PROTOCOL_STORAGE_KEY = 'healthNexusEmergencyProtocols';

export function getActiveEmergencyProtocols() {
  try {
    const raw = localStorage.getItem(PROTOCOL_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

export function saveActiveEmergencyProtocols(protocols) {
  try {
    localStorage.setItem(PROTOCOL_STORAGE_KEY, JSON.stringify(protocols));
  } catch (e) {
    console.error('Erro ao salvar protocolos de emergência:', e);
  }
}

export function detectEmergencyProtocolByComplaint(complaint = '') {
  const norm = String(complaint).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  for (const [protoKey, protoDef] of Object.entries(EMERGENCY_PROTOCOLS_DEF)) {
    if (protoDef.keywords.some(kw => norm.includes(kw))) {
      return protoDef;
    }
  }
  return null;
}

export function startEmergencyProtocol(patientId, patientName, protocolType, sector = 'Pronto Atendimento') {
  const protoDef = EMERGENCY_PROTOCOLS_DEF[protocolType];
  if (!protoDef) return null;

  const active = getActiveEmergencyProtocols();
  const existing = active.find(p => String(p.patientId) === String(patientId) && p.protocolType === protocolType && p.status === 'Ativo');
  if (existing) return existing;

  const startTime = Date.now();
  const newProto = {
    id: 'PROTO-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
    patientId,
    patientName,
    protocolType,
    name: protoDef.name,
    icon: protoDef.icon,
    color: protoDef.color,
    bgColor: protoDef.bgColor,
    sector,
    status: 'Ativo',
    startTime,
    targets: protoDef.targets.map(t => ({
      ...t,
      deadline: startTime + (t.maxMinutes * 60 * 1000),
      completed: false,
      completedAt: null
    }))
  };

  active.unshift(newProto);
  saveActiveEmergencyProtocols(active);
  return newProto;
}

export function completeProtocolTarget(protocolId, targetKey) {
  const active = getActiveEmergencyProtocols();
  const proto = active.find(p => p.id === protocolId);
  if (proto) {
    const target = proto.targets.find(t => t.key === targetKey);
    if (target) {
      target.completed = true;
      target.completedAt = Date.now();
    }
    if (proto.targets.every(t => t.completed)) {
      proto.status = 'Concluído';
      proto.completedAt = Date.now();
    }
    saveActiveEmergencyProtocols(active);
  }
}

export function getPatientEmergencyProtocols(patientId) {
  const active = getActiveEmergencyProtocols();
  return active.filter(p => String(p.patientId) === String(patientId));
}

export function calculateProtocolTimeRemaining(deadline) {
  const diff = deadline - Date.now();
  if (diff <= 0) {
    const overdueMins = Math.abs(Math.floor(diff / 60000));
    return { isOverdue: true, text: `ATRASADO +${overdueMins}m`, mins: -overdueMins };
  }
  const mins = Math.floor(diff / 60000);
  const secs = Math.floor((diff % 60000) / 1000);
  return { isOverdue: false, text: `${mins}m ${secs < 10 ? '0' : ''}${secs}s`, mins };
}
