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
export function saveFullDB(dbData) {
  try {
    localStorage.setItem(DB_KEY, JSON.stringify(dbData));
    localStorage.setItem(UPDATED_AT_KEY, Date.now().toString());
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
  
  // Seed padrão garantido para usuários essenciais do sistema
  if (table === 'users') {
    const hasMazz = db[table].some(u => u.username === 'mazzarowysk');
    const hasBcoltri = db[table].some(u => u.username === 'bcoltri');
    const hasSilvia = db[table].some(u => u.username === 'silviacwb');

    if (!hasMazz) {
      db[table].push({
        id: 'USR-MAZZAROWYSK',
        name: 'Marcelo Mazaro',
        username: 'mazzarowysk',
        role: 'Master',
        status: 'Ativo',
        created_at: new Date().toISOString()
      });
      modified = true;
    }

    if (!hasBcoltri) {
      db[table].push({
        id: 'USR-BCOLTRI',
        name: 'Breno Coltri',
        username: 'bcoltri',
        role: 'Desenvolvedor',
        status: 'Ativo',
        created_at: new Date().toISOString()
      });
      modified = true;
    }

    if (!hasSilvia) {
      db[table].push({
        id: 'USR-SILVIACWB',
        name: 'Enf. Sílvia',
        username: 'silviacwb',
        role: 'Enfermeiro',
        status: 'Ativo',
        created_at: new Date().toISOString()
      });
      modified = true;
    }
  }
  
  if (modified) {
    // Only safely save if we actually modified something fundamental like table initialization
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
  saveFullDB(db);
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
  saveFullDB(db);
  return updatedItem;
}

export function remove(table, id) {
  const db = getFullDB();
  ensureTable(db, table);
  
  const index = db[table].findIndex(item => item.id === id);
  if (index === -1) return false;
  
  db[table].splice(index, 1);
  saveFullDB(db);
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

