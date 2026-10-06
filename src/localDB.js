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

  // Seed padrão garantido para Estoque da Farmácia Hospitalar
  if (table === 'medications' && (!db[table] || db[table].length === 0)) {
    db[table] = [
      { id: 'MED-001', name: 'Dipirona 500mg/ml (Ampola 2ml)', category: 'Analgésico / Antitérmico', form: 'Ampola', stockQuantity: 180, minStock: 50, maxStock: 300, status: 'Normal', supplier: 'MedStock Brasil', lotNumber: 'LOT-54120', expirationDate: '2027-08-30', unitPrice: 3.50, location: 'Prateleira A1', controlled: false, created_at: new Date().toISOString() },
      { id: 'MED-002', name: 'Dipirona 500mg (Comprimido)', category: 'Analgésico / Antitérmico', form: 'Comprimido', stockQuantity: 240, minStock: 60, maxStock: 400, status: 'Normal', supplier: 'Distribuidora Pharma Plus', lotNumber: 'LOT-54121', expirationDate: '2028-01-15', unitPrice: 0.80, location: 'Prateleira A1', controlled: false, created_at: new Date().toISOString() },
      { id: 'MED-003', name: 'Paracetamol 750mg (Comprimido)', category: 'Analgésico / Antitérmico', form: 'Comprimido', stockQuantity: 150, minStock: 50, maxStock: 300, status: 'Normal', supplier: 'Distribuidora Pharma Plus', lotNumber: 'LOT-33210', expirationDate: '2027-11-20', unitPrice: 0.95, location: 'Prateleira A2', controlled: false, created_at: new Date().toISOString() },
      { id: 'MED-004', name: 'Ibuprofeno 600mg (Comprimido)', category: 'Anti-inflamatório (AINE)', form: 'Comprimido', stockQuantity: 110, minStock: 40, maxStock: 250, status: 'Normal', supplier: 'MedStock Brasil', lotNumber: 'LOT-21405', expirationDate: '2027-06-18', unitPrice: 1.20, location: 'Prateleira A2', controlled: false, created_at: new Date().toISOString() },
      { id: 'MED-005', name: 'Cetoprofeno 100mg IV (Frasco-Ampola)', category: 'Anti-inflamatório', form: 'Frasco-Ampola', stockQuantity: 85, minStock: 30, maxStock: 200, status: 'Normal', supplier: 'FarmaCentral', lotNumber: 'LOT-98214', expirationDate: '2027-09-10', unitPrice: 6.80, location: 'Prateleira A3', controlled: false, created_at: new Date().toISOString() },
      { id: 'MED-006', name: 'Morfina 10mg/ml (Ampola 1ml)', category: 'Opioide / Controle Especial', form: 'Ampola', stockQuantity: 15, minStock: 20, maxStock: 80, status: 'Estoque Baixo', supplier: 'União Saúde Controlados', lotNumber: 'LOT-77142', expirationDate: '2026-12-31', unitPrice: 18.50, location: 'Cofre / Armário Controlado', controlled: true, created_at: new Date().toISOString() },
      { id: 'MED-007', name: 'Tramadol 50mg/ml (Ampola 2ml)', category: 'Opioide / Analgésico Potente', form: 'Ampola', stockQuantity: 45, minStock: 25, maxStock: 120, status: 'Normal', supplier: 'MedStock Brasil', lotNumber: 'LOT-44129', expirationDate: '2027-04-22', unitPrice: 8.90, location: 'Armário Controlado', controlled: true, created_at: new Date().toISOString() },
      { id: 'MED-008', name: 'Fentanila 50mcg/ml (Ampola 2ml)', category: 'Anestésico / UTI', form: 'Ampola', stockQuantity: 12, minStock: 20, maxStock: 60, status: 'Estoque Baixo', supplier: 'União Saúde Controlados', lotNumber: 'LOT-66391', expirationDate: '2027-03-15', unitPrice: 22.00, location: 'Cofre / Armário Controlado', controlled: true, created_at: new Date().toISOString() },
      { id: 'MED-009', name: 'Midazolam 15mg/3ml (Ampola)', category: 'Sedativo / Ansiolítico', form: 'Ampola', stockQuantity: 28, minStock: 20, maxStock: 80, status: 'Normal', supplier: 'União Saúde Controlados', lotNumber: 'LOT-11984', expirationDate: '2027-05-19', unitPrice: 14.50, location: 'Armário Controlado', controlled: true, created_at: new Date().toISOString() },
      { id: 'MED-010', name: 'Diazepam 10mg (Comprimido)', category: 'Ansiolítico (BZD)', form: 'Comprimido', stockQuantity: 90, minStock: 30, maxStock: 150, status: 'Normal', supplier: 'FarmaCentral', lotNumber: 'LOT-55210', expirationDate: '2027-10-05', unitPrice: 1.10, location: 'Armário Controlado', controlled: true, created_at: new Date().toISOString() },
      { id: 'MED-011', name: 'Clonazepam 2mg (Comprimido)', category: 'Anticonvulsivante / Ansiolítico', form: 'Comprimido', stockQuantity: 75, minStock: 30, maxStock: 150, status: 'Normal', supplier: 'FarmaCentral', lotNumber: 'LOT-33120', expirationDate: '2028-02-14', unitPrice: 1.40, location: 'Armário Controlado', controlled: true, created_at: new Date().toISOString() },
      { id: 'MED-012', name: 'Ceftriaxona 1g IV (Frasco-Ampola)', category: 'Antibiótico Cefalosporina', form: 'Frasco-Ampola', stockQuantity: 65, minStock: 30, maxStock: 150, status: 'Normal', supplier: 'MedStock Brasil', lotNumber: 'LOT-88123', expirationDate: '2027-07-25', unitPrice: 16.80, location: 'Prateleira B1', controlled: false, created_at: new Date().toISOString() },
      { id: 'MED-013', name: 'Amoxicilina + Clavulanato 500/125mg', category: 'Antibiótico Penicilínico', form: 'Comprimido', stockQuantity: 95, minStock: 40, maxStock: 200, status: 'Normal', supplier: 'Distribuidora Pharma Plus', lotNumber: 'LOT-44219', expirationDate: '2027-11-10', unitPrice: 4.20, location: 'Prateleira B1', controlled: false, created_at: new Date().toISOString() },
      { id: 'MED-014', name: 'Ciprofloxacino 400mg/200ml (Bolsa)', category: 'Antibiótico Quinolona', form: 'Bolsa', stockQuantity: 40, minStock: 25, maxStock: 100, status: 'Normal', supplier: 'MedStock Brasil', lotNumber: 'LOT-66512', expirationDate: '2027-08-14', unitPrice: 28.50, location: 'Prateleira B2', controlled: false, created_at: new Date().toISOString() },
      { id: 'MED-015', name: 'Meropenem 1g IV (Frasco-Ampola)', category: 'Antibiótico Carbapenêmico', form: 'Frasco-Ampola', stockQuantity: 18, minStock: 20, maxStock: 80, status: 'Estoque Baixo', supplier: 'MedStock Brasil', lotNumber: 'LOT-99231', expirationDate: '2027-01-30', unitPrice: 65.00, location: 'Prateleira B2', controlled: false, created_at: new Date().toISOString() },
      { id: 'MED-016', name: 'Vancomicina 500mg (Frasco-Ampola)', category: 'Antibiótico Glicopeptídeo', form: 'Frasco-Ampola', stockQuantity: 32, minStock: 20, maxStock: 90, status: 'Normal', supplier: 'FarmaCentral', lotNumber: 'LOT-33871', expirationDate: '2027-03-22', unitPrice: 42.00, location: 'Prateleira B3', controlled: false, created_at: new Date().toISOString() },
      { id: 'MED-017', name: 'Azitromicina 500mg (Comprimido)', category: 'Antibiótico Macrolídeo', form: 'Comprimido', stockQuantity: 80, minStock: 30, maxStock: 150, status: 'Normal', supplier: 'Distribuidora Pharma Plus', lotNumber: 'LOT-22819', expirationDate: '2027-10-18', unitPrice: 3.90, location: 'Prateleira B3', controlled: false, created_at: new Date().toISOString() },
      { id: 'MED-018', name: 'Omeprazol 40mg IV (Frasco-Ampola)', category: 'Gastroprotetor (IBP)', form: 'Frasco-Ampola', stockQuantity: 120, minStock: 40, maxStock: 250, status: 'Normal', supplier: 'MedStock Brasil', lotNumber: 'LOT-77291', expirationDate: '2027-12-05', unitPrice: 7.50, location: 'Prateleira C1', controlled: false, created_at: new Date().toISOString() },
      { id: 'MED-019', name: 'Pantoprazol 40mg (Comprimido)', category: 'Gastroprotetor (IBP)', form: 'Comprimido', stockQuantity: 160, minStock: 50, maxStock: 300, status: 'Normal', supplier: 'Distribuidora Pharma Plus', lotNumber: 'LOT-11928', expirationDate: '2028-02-28', unitPrice: 1.80, location: 'Prateleira C1', controlled: false, created_at: new Date().toISOString() },
      { id: 'MED-020', name: 'Ondansetrona 8mg/4ml (Ampola)', category: 'Antiemético', form: 'Ampola', stockQuantity: 140, minStock: 40, maxStock: 250, status: 'Normal', supplier: 'MedStock Brasil', lotNumber: 'LOT-55102', expirationDate: '2027-09-15', unitPrice: 5.20, location: 'Prateleira C2', controlled: false, created_at: new Date().toISOString() },
      { id: 'MED-021', name: 'Metoclopramida 10mg (Ampola 2ml)', category: 'Antiemético / Pró-cinético', form: 'Ampola', stockQuantity: 90, minStock: 30, maxStock: 180, status: 'Normal', supplier: 'FarmaCentral', lotNumber: 'LOT-44109', expirationDate: '2027-06-30', unitPrice: 2.90, location: 'Prateleira C2', controlled: false, created_at: new Date().toISOString() },
      { id: 'MED-022', name: 'Enoxaparina Sódica 40mg/0,4ml (Seringa)', category: 'Anticoagulante (HBPM)', form: 'Seringa Preenchida', stockQuantity: 70, minStock: 25, maxStock: 150, status: 'Normal', supplier: 'MedStock Brasil', lotNumber: 'LOT-88201', expirationDate: '2027-05-10', unitPrice: 32.00, location: 'Refrigerador 1 (2-8°C)', controlled: false, created_at: new Date().toISOString() },
      { id: 'MED-023', name: 'Heparina Sódica 5000UI/ml (Frasco 5ml)', category: 'Anticoagulante', form: 'Frasco', stockQuantity: 35, minStock: 20, maxStock: 80, status: 'Normal', supplier: 'MedStock Brasil', lotNumber: 'LOT-66219', expirationDate: '2027-04-12', unitPrice: 24.50, location: 'Prateleira D1', controlled: false, created_at: new Date().toISOString() },
      { id: 'MED-024', name: 'Hidrocortisona 100mg IV (Frasco-Ampola)', category: 'Corticosteroide', form: 'Frasco-Ampola', stockQuantity: 85, minStock: 30, maxStock: 180, status: 'Normal', supplier: 'FarmaCentral', lotNumber: 'LOT-33910', expirationDate: '2027-11-01', unitPrice: 8.50, location: 'Prateleira D2', controlled: false, created_at: new Date().toISOString() },
      { id: 'MED-025', name: 'Dexametasona 4mg/ml (Ampola 2,5ml)', category: 'Corticosteroide', form: 'Ampola', stockQuantity: 110, minStock: 35, maxStock: 220, status: 'Normal', supplier: 'MedStock Brasil', lotNumber: 'LOT-22104', expirationDate: '2027-08-20', unitPrice: 4.10, location: 'Prateleira D2', controlled: false, created_at: new Date().toISOString() },
      { id: 'MED-026', name: 'Adrenalina (Epinefrina) 1mg/ml (Ampola)', category: 'Emergência / PCR / Choque', form: 'Ampola', stockQuantity: 50, minStock: 30, maxStock: 120, status: 'Normal', supplier: 'MedStock Brasil', lotNumber: 'LOT-99104', expirationDate: '2027-02-18', unitPrice: 4.80, location: 'Carro de Parada / Gaveta A', controlled: false, created_at: new Date().toISOString() },
      { id: 'MED-027', name: 'Norepinefrina 2mg/ml (Ampola 4ml)', category: 'Vasoativo / Choque / UTI', form: 'Ampola', stockQuantity: 40, minStock: 25, maxStock: 100, status: 'Normal', supplier: 'MedStock Brasil', lotNumber: 'LOT-44912', expirationDate: '2027-07-08', unitPrice: 19.50, location: 'Prateleira D3', controlled: false, created_at: new Date().toISOString() },
      { id: 'MED-028', name: 'Amiodarona 150mg/3ml (Ampola)', category: 'Antiarrítmico', form: 'Ampola', stockQuantity: 45, minStock: 20, maxStock: 90, status: 'Normal', supplier: 'MedStock Brasil', lotNumber: 'LOT-77312', expirationDate: '2027-06-14', unitPrice: 9.80, location: 'Prateleira D3', controlled: false, created_at: new Date().toISOString() },
      { id: 'MED-029', name: 'Furosemida 20mg/2ml (Ampola)', category: 'Diurético de Alça', form: 'Ampola', stockQuantity: 95, minStock: 30, maxStock: 180, status: 'Normal', supplier: 'Distribuidora Pharma Plus', lotNumber: 'LOT-11492', expirationDate: '2027-10-25', unitPrice: 3.20, location: 'Prateleira E1', controlled: false, created_at: new Date().toISOString() },
      { id: 'MED-030', name: 'Insulina Regular 100UI/ml (Frasco 10ml)', category: 'Antidiabético / Hormônio', form: 'Frasco', stockQuantity: 25, minStock: 15, maxStock: 60, status: 'Normal', supplier: 'FarmaCentral', lotNumber: 'LOT-88391', expirationDate: '2027-03-31', unitPrice: 38.00, location: 'Refrigerador 1 (2-8°C)', controlled: false, created_at: new Date().toISOString() },
      { id: 'MED-031', name: 'Insulina NPH 100UI/ml (Frasco 10ml)', category: 'Antidiabético / Hormônio', form: 'Frasco', stockQuantity: 22, minStock: 15, maxStock: 60, status: 'Normal', supplier: 'FarmaCentral', lotNumber: 'LOT-88392', expirationDate: '2027-03-31', unitPrice: 38.00, location: 'Refrigerador 1 (2-8°C)', controlled: false, created_at: new Date().toISOString() },
      { id: 'MED-032', name: 'Soro Fisiológico 0,9% 500ml (Bolsa)', category: 'Solução Parenteral', form: 'Bolsa', stockQuantity: 320, minStock: 100, maxStock: 600, status: 'Normal', supplier: 'MedStock Brasil', lotNumber: 'LOT-55910', expirationDate: '2028-06-30', unitPrice: 7.20, location: 'Palete Soro P1', controlled: false, created_at: new Date().toISOString() },
      { id: 'MED-033', name: 'Soro Glicosado 5% 500ml (Bolsa)', category: 'Solução Parenteral', form: 'Bolsa', stockQuantity: 190, minStock: 60, maxStock: 400, status: 'Normal', supplier: 'MedStock Brasil', lotNumber: 'LOT-55911', expirationDate: '2028-05-15', unitPrice: 7.50, location: 'Palete Soro P2', controlled: false, created_at: new Date().toISOString() },
      { id: 'MED-034', name: 'Ringer Lactato 500ml (Bolsa)', category: 'Solução Parenteral', form: 'Bolsa', stockQuantity: 180, minStock: 50, maxStock: 350, status: 'Normal', supplier: 'MedStock Brasil', lotNumber: 'LOT-55912', expirationDate: '2028-04-20', unitPrice: 8.10, location: 'Palete Soro P3', controlled: false, created_at: new Date().toISOString() },
      { id: 'MED-035', name: 'Losartana Potássica 50mg (Comprimido)', category: 'Anti-hipertensivo (BRA)', form: 'Comprimido', stockQuantity: 260, minStock: 60, maxStock: 500, status: 'Normal', supplier: 'Distribuidora Pharma Plus', lotNumber: 'LOT-33190', expirationDate: '2028-01-30', unitPrice: 0.65, location: 'Prateleira F1', controlled: false, created_at: new Date().toISOString() }
    ];
    modified = true;
  }

  // Seed padrão garantido para Prescrições Hospitalares (Circuito Fechado)
  if (table === 'prescriptions' && (!db[table] || db[table].length === 0)) {
    db[table] = [
      {
        id: 'RX-78901',
        patientId: 'PAT-001',
        patientName: 'Marcelo Mazaro',
        encounterId: 'ENC-001',
        doctorName: 'Dr. Carlos Eduardo Silva',
        bed: 'Leito UTI 01',
        status: 'Aguardando_Farmacia',
        priority: 'Urgente',
        medications: [
          { name: 'Ceftriaxona 1g IV', dosage: '1g', route: 'Endovenosa (IV)', frequency: 'A cada 12 horas' },
          { name: 'Omeprazol 40mg IV', dosage: '40mg', route: 'Endovenosa (IV)', frequency: '1x ao dia (manhã)' },
          { name: 'Dipirona 1g IV', dosage: '1g (2ml)', route: 'Endovenosa (IV)', frequency: 'Se dor ou febre > 38°C (6/6h)' },
          { name: 'Soro Fisiológico 0,9% 500ml', dosage: '500ml', route: 'Endovenosa contínua', frequency: '28 gotas/min' }
        ],
        created_at: new Date(Date.now() - 45 * 60000).toISOString()
      },
      {
        id: 'RX-78902',
        patientId: 'PAT-002',
        patientName: 'Ana Clara Souza',
        encounterId: 'ENC-002',
        doctorName: 'Dra. Ana Maria Costa',
        bed: 'Leito 102 - Observação PS',
        status: 'Aguardando_Farmacia',
        priority: 'Rotina',
        medications: [
          { name: 'Enoxaparina 40mg SC', dosage: '40mg (0,4ml)', route: 'Subcutânea (SC)', frequency: '1x ao dia (à noite)' },
          { name: 'Ondansetrona 8mg IV', dosage: '8mg (4ml)', route: 'Endovenosa (IV)', frequency: 'A cada 8 horas se náuseas' },
          { name: 'Tramadol 50mg IV', dosage: '50mg diluído em 100ml SF', route: 'Endovenosa lenta', frequency: 'A cada 8 horas se dor intensa' }
        ],
        created_at: new Date(Date.now() - 80 * 60000).toISOString()
      },
      {
        id: 'RX-78903',
        patientId: 'PAT-003',
        patientName: 'Roberto Alves Santos',
        encounterId: 'ENC-003',
        doctorName: 'Dr. João Pedro Santos',
        bed: 'Leito 201 - Enfermaria Clínica',
        status: 'Aguardando_Farmacia',
        priority: 'Rotina',
        medications: [
          { name: 'Amoxicilina + Clavulanato 500/125mg', dosage: '1 comprimido', route: 'Via Oral (VO)', frequency: 'A cada 8 horas' },
          { name: 'Paracetamol 750mg', dosage: '1 comprimido', route: 'Via Oral (VO)', frequency: 'A cada 6 horas se dor' },
          { name: 'Losartana Potássica 50mg', dosage: '1 comprimido', route: 'Via Oral (VO)', frequency: '1x ao dia pela manhã' }
        ],
        created_at: new Date(Date.now() - 110 * 60000).toISOString()
      },
      {
        id: 'RX-78904',
        patientId: 'PAT-004',
        patientName: 'Juliana Ferreira Costa',
        encounterId: 'ENC-004',
        doctorName: 'Dra. Beatriz Oliveira',
        bed: 'Leito 203 - Cirúrgico',
        status: 'Liberado_Farmacia',
        priority: 'Rotina',
        medications: [
          { name: 'Cetoprofeno 100mg IV', dosage: '100mg', route: 'Endovenosa (IV)', frequency: 'A cada 12 horas' },
          { name: 'Dipirona 500mg/ml Ampola', dosage: '1g IV', route: 'Endovenosa (IV)', frequency: 'A cada 6 horas' },
          { name: 'Pantoprazol 40mg VO', dosage: '40mg', route: 'Via Oral (VO)', frequency: '1x ao dia em jejum' }
        ],
        releasedBy: 'Dr(a). Farmacêutico(a) Responsável (CRF-SP 45.890)',
        releasedAt: new Date(Date.now() - 30 * 60000).toISOString(),
        releaseNotes: 'Dosagens e aprazamentos validados. Dispensação liberada para a enfermaria.',
        created_at: new Date(Date.now() - 150 * 60000).toISOString()
      },
      {
        id: 'RX-78905',
        patientId: 'PAT-005',
        patientName: 'Lucas Mendes Ferreira',
        encounterId: 'ENC-005',
        doctorName: 'Dr. Roberto Fernandes',
        bed: 'Leito 305 - Cardiologia',
        status: 'Liberado_Farmacia',
        priority: 'Rotina',
        medications: [
          { name: 'Furosemida 20mg IV', dosage: '20mg (1 ampola)', route: 'Endovenosa (IV)', frequency: '1x ao dia pela manhã' },
          { name: 'Insulina Regular 100UI/ml', dosage: 'Conforme glicemia capilar', route: 'Subcutânea (SC)', frequency: 'Antes das refeições' },
          { name: 'Amiodarona 150mg IV', dosage: '150mg diluído em SG5%', route: 'Infusão contínua', frequency: 'Conforme protocolo' }
        ],
        releasedBy: 'Dr(a). Farmacêutico(a) Responsável (CRF-SP 45.890)',
        releasedAt: new Date(Date.now() - 20 * 60000).toISOString(),
        releaseNotes: 'Checado em circuito fechado. Identificação com código de barras enviada ao leito.',
        created_at: new Date(Date.now() - 200 * 60000).toISOString()
      }
    ];
    modified = true;
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
export const getById = get;

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
export const save = (table, data) => (data && data.id && get(table, data.id)) ? update(table, data.id, data) : insert(table, data);

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
    sessionStorage.removeItem('activePatientContext');
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
