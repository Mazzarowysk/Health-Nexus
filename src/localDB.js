// src/localDB.js

const DB_KEY = 'healthNexusDados';
const CONFIG_KEY = 'healthNexusConfig';
const UPDATED_AT_KEY = 'healthNexusUpdatedAt';

// Função para obter todo o banco
export function getFullDB() {
  try {
    const data = localStorage.getItem(DB_KEY);
    return data ? JSON.parse(data) : {};
  } catch (e) {
    console.error('Erro ao ler DB local:', e);
    return {};
  }
}

// Função para salvar todo o banco
export function saveFullDB(dbData, silent = false) {
  try {
    localStorage.setItem(DB_KEY, JSON.stringify(dbData));
    if (!silent) {
      localStorage.setItem(UPDATED_AT_KEY, Date.now().toString());
    }
  } catch (e) {
    console.error('Erro ao salvar DB local. Possível limite de quota do localStorage atingido.', e);
  }
}

export function getConfig() {
  try {
    const config = localStorage.getItem(CONFIG_KEY);
    return config ? JSON.parse(config) : {};
  } catch (e) {
    return {};
  }
}

export function saveConfig(configData) {
  localStorage.setItem(CONFIG_KEY, JSON.stringify(configData));
  localStorage.setItem(UPDATED_AT_KEY, Date.now().toString());
}

export function getLocalUpdatedAt() {
  return parseInt(localStorage.getItem(UPDATED_AT_KEY) || '0', 10);
}

export function generateId(prefix = 'ID') {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
}

// Inicializa a tabela se não existir
function ensureTable(db, table) {
  let modified = false;
  if (!db[table]) {
    db[table] = [];
    modified = true;
  }
  
  // Seed padrão garantido para usuários essenciais do sistema e corpo clínico
  if (table === 'users') {
    const coreSystemUsers = [
      { id: 'USR-MAZZAROWYSK', name: 'Marcelo Mazaro', username: 'mazzarowysk', role: 'Master', password: 'T@zm4n1c0054180', status: 'Ativo' },
      { id: 'USR-BCOLTRI', name: 'Breno Coltri', username: 'bcoltri', role: 'Desenvolvedor', password: 'bcoltritupa', status: 'Ativo' },
      { id: 'USR-ADMIN', name: 'Administrador Hospitalar', username: 'admin', role: 'Administrador', password: 'admin123', status: 'Ativo' },
      { id: 'USR-FFACCO', name: 'Franciele Facco de Carvalho', username: 'ffacco', role: 'Desenvolvedor', password: 'caliope', status: 'Ativo' },
      { id: 'USR-PFORTE', name: 'Dra. Paula Forte', username: 'pforte', role: 'Médico', password: 'pfortesantos', status: 'Ativo' }
    ];

    if (db[table].length === 0) {
      coreSystemUsers.forEach(reqUser => {
        db[table].push({
          ...reqUser,
          created_at: new Date().toISOString()
        });
      });
      modified = true;
    } else {
      // Garante apenas o usuário Master fundador (mazzarowysk) caso a tabela já exista
      const masterUser = coreSystemUsers.find(u => u.username === 'mazzarowysk');
      if (masterUser && !db[table].some(u => u.username === 'mazzarowysk')) {
        db[table].push({
          ...masterUser,
          created_at: new Date().toISOString()
        });
        modified = true;
      }
    }
  }

  if (modified) {
    try {
      localStorage.setItem(DB_KEY, JSON.stringify(db));
    } catch(e) {}
  }
}

// CRUD Genérico

export function list(table, queryFn = null) {
  const db = getFullDB();
  ensureTable(db, table);
  let results = db[table];
  
  if (queryFn) {
    results = results.filter(queryFn);
  }
  return results;
}

export function get(table, id) {
  const db = getFullDB();
  ensureTable(db, table);
  return db[table].find(item => item.id === id) || null;
}

export function insert(table, data) {
  const db = getFullDB();
  ensureTable(db, table);
  
  const newItem = {
    ...data,
    id: data.id || generateId(table.toUpperCase().substring(0, 3)),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
  
  db[table].push(newItem);
  const isSilent = (table === 'user_sessions' || table === 'settings');
  saveFullDB(db, isSilent);
  return newItem;
}

export const create = insert;

export function update(table, id, data) {
  const db = getFullDB();
  ensureTable(db, table);
  
  const index = db[table].findIndex(item => item.id === id);
  if (index === -1) return null;
  
  const updatedItem = {
    ...db[table][index],
    ...data,
    updated_at: new Date().toISOString()
  };
  
  db[table][index] = updatedItem;
  const isSilent = (table === 'user_sessions' || table === 'settings');
  saveFullDB(db, isSilent);
  return updatedItem;
}

export function remove(table, id) {
  const db = getFullDB();
  ensureTable(db, table);
  
  if (!db[table] || !Array.isArray(db[table])) return false;
  
  const initialLength = db[table].length;
  
  if (table === 'users') {
    const targetUser = db[table].find(u => u.id === id || u.username === id);
    const targetUsername = targetUser ? targetUser.username : id;
    db[table] = db[table].filter(u => u.id !== id && u.username !== id && u.username !== targetUsername);
  } else {
    db[table] = db[table].filter(item => item.id !== id);
  }

  if (db[table].length === initialLength) return false;

  const isSilent = (table === 'user_sessions' || table === 'settings');
  saveFullDB(db, isSilent);
  return true;
}

export const deleteItem = remove;

export function overwriteLocal(cloudPayload) {
  if (cloudPayload.dados_json) {
    localStorage.setItem(DB_KEY, cloudPayload.dados_json);
  }
  if (cloudPayload.config_json) {
    localStorage.setItem(CONFIG_KEY, cloudPayload.config_json);
  }
  if (cloudPayload.updated_at) {
    localStorage.setItem(UPDATED_AT_KEY, cloudPayload.updated_at.toString());
  }
}

export function getDefaultBeds() {
  return [
    { id: 'BED-001', bedNumber: '101A', number: '101A', type: 'Enfermaria', sector: 'Enfermaria', ward: 'Clínica Médica', status: 'Vago', patientId: null, patientName: null, encounterId: null, admittedAt: null },
    { id: 'BED-002', bedNumber: '101B', number: '101B', type: 'Enfermaria', sector: 'Enfermaria', ward: 'Clínica Médica', status: 'Vago', patientId: null, patientName: null, encounterId: null, admittedAt: null },
    { id: 'BED-003', bedNumber: '102A', number: '102A', type: 'Enfermaria', sector: 'Enfermaria', ward: 'Clínica Médica', status: 'Vago', patientId: null, patientName: null, encounterId: null, admittedAt: null },
    { id: 'BED-004', bedNumber: '102B', number: '102B', type: 'Enfermaria', sector: 'Enfermaria', ward: 'Clínica Médica', status: 'Vago', patientId: null, patientName: null, encounterId: null, admittedAt: null },
    { id: 'BED-005', bedNumber: '103A', number: '103A', type: 'Enfermaria', sector: 'Enfermaria', ward: 'Clínica Médica', status: 'Vago', patientId: null, patientName: null, encounterId: null, admittedAt: null },
    { id: 'BED-006', bedNumber: '103B', number: '103B', type: 'Enfermaria', sector: 'Enfermaria', ward: 'Clínica Médica', status: 'Vago', patientId: null, patientName: null, encounterId: null, admittedAt: null },
    { id: 'BED-007', bedNumber: '201A', number: '201A', type: 'Enfermaria', sector: 'Pediatria', ward: 'Pediatria', status: 'Vago', patientId: null, patientName: null, encounterId: null, admittedAt: null },
    { id: 'BED-008', bedNumber: '201B', number: '201B', type: 'Enfermaria', sector: 'Pediatria', ward: 'Pediatria', status: 'Vago', patientId: null, patientName: null, encounterId: null, admittedAt: null },
    { id: 'BED-009', bedNumber: '202A', number: '202A', type: 'Enfermaria', sector: 'Pediatria', ward: 'Pediatria', status: 'Vago', patientId: null, patientName: null, encounterId: null, admittedAt: null },
    { id: 'BED-010', bedNumber: 'UTI-01', number: 'UTI-01', type: 'UTI Adulto', sector: 'UTI Adulto', ward: 'UTI', status: 'Vago', patientId: null, patientName: null, encounterId: null, admittedAt: null },
    { id: 'BED-011', bedNumber: 'UTI-02', number: 'UTI-02', type: 'UTI Adulto', sector: 'UTI Adulto', ward: 'UTI', status: 'Vago', patientId: null, patientName: null, encounterId: null, admittedAt: null },
    { id: 'BED-012', bedNumber: 'UTI-03', number: 'UTI-03', type: 'UTI Adulto', sector: 'UTI Adulto', ward: 'UTI', status: 'Vago', patientId: null, patientName: null, encounterId: null, admittedAt: null },
    { id: 'BED-013', bedNumber: 'UTI-04', number: 'UTI-04', type: 'UTI Adulto', sector: 'UTI Adulto', ward: 'UTI', status: 'Vago', patientId: null, patientName: null, encounterId: null, admittedAt: null },
    { id: 'BED-014', bedNumber: 'UTIP-01', number: 'UTIP-01', type: 'UTI Pediátrica', sector: 'Pediatria', ward: 'UTI Pediátrica', status: 'Vago', patientId: null, patientName: null, encounterId: null, admittedAt: null },
    { id: 'BED-015', bedNumber: 'UTIP-02', number: 'UTIP-02', type: 'UTI Pediátrica', sector: 'Pediatria', ward: 'UTI Pediátrica', status: 'Vago', patientId: null, patientName: null, encounterId: null, admittedAt: null },
    { id: 'BED-016', bedNumber: 'ISO-01', number: 'ISO-01', type: 'Isolamento', sector: 'Isolamento', ward: 'Isolamento', status: 'Vago', patientId: null, patientName: null, encounterId: null, admittedAt: null },
    { id: 'BED-017', bedNumber: 'ISO-02', number: 'ISO-02', type: 'Isolamento', sector: 'Isolamento', ward: 'Isolamento', status: 'Vago', patientId: null, patientName: null, encounterId: null, admittedAt: null },
    { id: 'BED-018', bedNumber: 'OBS-01', number: 'OBS-01', type: 'Observação', sector: 'Observação', ward: 'Observação', status: 'Vago', patientId: null, patientName: null, encounterId: null, admittedAt: null },
    { id: 'BED-019', bedNumber: 'OBS-02', number: 'OBS-02', type: 'Observação', sector: 'Observação', ward: 'Observação', status: 'Vago', patientId: null, patientName: null, encounterId: null, admittedAt: null },
    { id: 'BED-020', bedNumber: 'OBS-03', number: 'OBS-03', type: 'Observação', sector: 'Observação', ward: 'Observação', status: 'Vago', patientId: null, patientName: null, encounterId: null, admittedAt: null },
    { id: 'BED-021', bedNumber: 'MAT-01', number: 'MAT-01', type: 'Maternidade', sector: 'Maternidade', ward: 'Maternidade', status: 'Vago', patientId: null, patientName: null, encounterId: null, admittedAt: null },
    { id: 'BED-022', bedNumber: 'MAT-02', number: 'MAT-02', type: 'Maternidade', sector: 'Maternidade', ward: 'Maternidade', status: 'Vago', patientId: null, patientName: null, encounterId: null, admittedAt: null }
  ];
}

export function clear() {
  const db = getFullDB();
  const rawUsers = db.users || [];
  const savedSettings = db.settings || [];
  const savedSessions = db.user_sessions || [];

  // Preservar usuários principais do sistema:
  const coreUsernames = ['mazzarowysk', 'bcoltri', 'admin', 'ffacco', 'pforte'];
  const defaultCoreUsers = [
    { id: 'USR-MAZZAROWYSK', name: 'Marcelo Mazaro', username: 'mazzarowysk', role: 'Master', password: 'T@zm4n1c0054180', status: 'Ativo' },
    { id: 'USR-BCOLTRI', name: 'Breno Coltri', username: 'bcoltri', role: 'Desenvolvedor', password: 'bcoltritupa', status: 'Ativo' },
    { id: 'USR-ADMIN', name: 'Administrador Hospitalar', username: 'admin', role: 'Administrador', password: 'admin123', status: 'Ativo' },
    { id: 'USR-FFACCO', name: 'Franciele Facco de Carvalho', username: 'ffacco', role: 'Desenvolvedor', password: 'caliope', status: 'Ativo' },
    { id: 'USR-PFORTE', name: 'Dra. Paula Forte', username: 'pforte', role: 'Médico', password: 'pfortesantos', status: 'Ativo' }
  ];

  // Filtrar rigorosamente médicos e enfermeiros criados em lote pelo mock generator (ignorando maiúsculas/minúsculas)
  const preservedUsers = rawUsers.filter(u => {
    if (!u) return false;
    const un = (u.username || '').toLowerCase().trim();
    if (coreUsernames.includes(un)) return true;
    const uid = (u.id || '').toLowerCase().trim();
    if (uid.startsWith('usr-doc') || uid.startsWith('usr-nur')) return false;
    if (un.startsWith('dr.') || un.startsWith('dra.') || un.startsWith('enf.')) return false;
    return true;
  });

  // Assegurar que as 5 contas principais do sistema existam obrigatoriamente
  defaultCoreUsers.forEach(core => {
    if (!preservedUsers.some(u => (u.username || '').toLowerCase().trim() === core.username)) {
      preservedUsers.push(core);
    }
  });

  const emptyDB = {
    settings: savedSettings,
    users: preservedUsers,
    user_sessions: savedSessions,
    patients: [],
    encounters: [],
    appointments: [],
    triages: [],
    prescriptions: [],
    clinical_notes: [],
    hospitalizations: [],
    financial_installments: [],
    financial_transactions: [],
    tv_calls: [],
    duty_schedules: [],
    stagnation_alerts: [],
    doctors: [],
    nurses: [],
    medications: [],
    consultorios: [],
    tiss_guides: [],
    tiss_batches: [],
    exam_requests: [],
    beds: []
  };

  const freshTimestamp = Date.now().toString();
  localStorage.setItem(DB_KEY, JSON.stringify(emptyDB));
  localStorage.setItem(UPDATED_AT_KEY, freshTimestamp);

  // Limpeza de chaves adicionais de armazenamento local e de sessão
  try {
    localStorage.removeItem('protocolos_emergencia_ativos');
    localStorage.removeItem('activePatientContext');
    localStorage.removeItem('realtime_events');
    localStorage.removeItem('healthNexusLastBackup');
    localStorage.removeItem('hn_pending_flow_action');
  } catch (e) {}

  try {
    sessionStorage.removeItem('hn_notified_pending');
  } catch (e) {}

  // Limpar variáveis de contexto, destaques e caches em memória
  if (typeof window !== 'undefined') {
    window._highlightPatientName = null;
    window._highlightTargetColumn = null;
    window._highlightPatientId = null;
    window._lastAdmittedPatientId = null;
    window.__hn_realtime_events = [];
    window.__hn_recent_triages = [];
    window.__hn_recent_tv_calls = [];

    if (window._SFG) {
      window._SFG.pendingAction = null;
    }
    if (typeof window.clearFlowNotification === 'function') {
      window.clearFlowNotification();
    }
    if (typeof window.dismissFlowGuide === 'function') {
      window.dismissFlowGuide();
    }
    if (typeof window.setActivePatientContext === 'function') {
      window.setActivePatientContext(null);
    }
    if (typeof window.clearDataCache === 'function') {
      window.clearDataCache();
    }
  }

  return emptyDB;
}

if (typeof window !== 'undefined') {
  window.localDB = {
    getFullDB,
    saveFullDB,
    getConfig,
    saveConfig,
    getLocalUpdatedAt,
    generateId,
    list,
    get,
    insert,
    update,
    remove,
    overwriteLocal,
    getDefaultBeds,
    clear
  };
}
