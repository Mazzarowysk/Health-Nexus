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
      { id: 'USR-MAZZAROWYSK', name: 'Marcelo Mazaro', username: 'mazzarowysk', role: 'Master', status: 'Ativo' },
      { id: 'USR-BCOLTRI', name: 'Breno Coltri', username: 'bcoltri', role: 'Desenvolvedor', status: 'Ativo' },
      { id: 'USR-ADMIN', name: 'Administrador Hospitalar', username: 'admin', role: 'Administrador', status: 'Ativo' },
      { id: 'USR-FFACCO', name: 'Franciele Facco de Carvalho', username: 'ffacco', role: 'Desenvolvedor', status: 'Ativo' }
    ];

    const defaultClinicalUsers = [
      // Médicos (Corpo Clínico)
      { id: 'USR-DOC-001', name: 'Dr. Carlos Eduardo Silva', username: 'dr.carloseduard', role: 'Médico', status: 'Ativo' },
      { id: 'USR-DOC-002', name: 'Dra. Ana Maria Costa', username: 'dra.anamaria', role: 'Médico', status: 'Ativo' },
      { id: 'USR-DOC-003', name: 'Dr. João Pedro Santos', username: 'dr.joaopedro', role: 'Médico', status: 'Ativo' },
      { id: 'USR-DOC-004', name: 'Dra. Beatriz Oliveira', username: 'dra.beatriz', role: 'Médico', status: 'Ativo' },
      { id: 'USR-DOC-005', name: 'Dr. Roberto Fernandes', username: 'dr.roberto', role: 'Médico', status: 'Ativo' },
      { id: 'USR-DOC-006', name: 'Dra. Mariana Lima', username: 'dra.mariana', role: 'Médico', status: 'Ativo' },
      { id: 'USR-DOC-007', name: 'Dr. Fábio Rodrigues', username: 'dr.fabio', role: 'Médico', status: 'Ativo' },
      { id: 'USR-DOC-008', name: 'Dr. André Mendes', username: 'dr.andre', role: 'Médico', status: 'Ativo' },
      { id: 'USR-DOC-009', name: 'Dra. Cristina Souza', username: 'dra.cristina', role: 'Médico', status: 'Ativo' },
      { id: 'USR-DOC-010', name: 'Dr. Marcelo Andrade', username: 'dr.marcelo', role: 'Médico', status: 'Ativo' },
      { id: 'USR-DOC-011', name: 'Dra. Renata Carvalho', username: 'dra.renata', role: 'Médico', status: 'Ativo' },
      { id: 'USR-DOC-012', name: 'Dr. Thiago Martins', username: 'dr.thiago', role: 'Médico', status: 'Ativo' },

      // Enfermeiros (Equipe Enfermagem)
      { id: 'USR-NUR-001', name: 'Enf. Sílvia Regina Santos', username: 'silviacwb', role: 'Enfermeiro', status: 'Ativo' },
      { id: 'USR-NUR-002', name: 'Enf. Patrícia Oliveira Lima', username: 'enf.patricia', role: 'Enfermeiro', status: 'Ativo' },
      { id: 'USR-NUR-003', name: 'Enf. Marcos Vinícius Souza', username: 'enf.marcos', role: 'Enfermeiro', status: 'Ativo' },
      { id: 'USR-NUR-004', name: 'Enf. Juliana Ferreira Costa', username: 'enf.juliana', role: 'Enfermeiro', status: 'Ativo' },
      { id: 'USR-NUR-005', name: 'Enf. Rodrigo Alves Ribeiro', username: 'enf.rodrigo', role: 'Enfermeiro', status: 'Ativo' },
      { id: 'USR-NUR-006', name: 'Enf. Camila Rocha Silva', username: 'enf.camila', role: 'Enfermeiro', status: 'Ativo' },
      { id: 'USR-NUR-007', name: 'Enf. Lucas Mendes Freitas', username: 'enf.lucas', role: 'Enfermeiro', status: 'Ativo' },
      { id: 'USR-NUR-008', name: 'Enf. Tatiane Barbosa Cruz', username: 'enf.tatiane', role: 'Enfermeiro', status: 'Ativo' },
      { id: 'USR-PFORTE', name: 'Dra. Paula Forte', username: 'pforte', role: 'Médico', status: 'Ativo' }
    ];

    if (db[table].length === 0) {
      const initialUsers = [...coreSystemUsers, ...defaultClinicalUsers];
      initialUsers.forEach(reqUser => {
        db[table].push({
          ...reqUser,
          created_at: new Date().toISOString()
        });
      });
      modified = true;
    } else {
      coreSystemUsers.forEach(coreUser => {
        const exists = db[table].some(u => u.username === coreUser.username);
        if (!exists) {
          db[table].push({
            ...coreUser,
            created_at: new Date().toISOString()
          });
          modified = true;
        }
      });
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
  
  const index = db[table].findIndex(item => item.id === id);
  if (index === -1) return false;
  
  db[table].splice(index, 1);
  const isSilent = (table === 'user_sessions' || table === 'settings');
  saveFullDB(db, isSilent);
  return true;
}

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

export function clear() {
  localStorage.removeItem(DB_KEY);
  localStorage.setItem(UPDATED_AT_KEY, Date.now().toString());
}

