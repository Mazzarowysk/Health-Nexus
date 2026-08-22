// ============================================================
// mockDataGenerator.js — Simulação Completa Health Nexus
// Cobre: Pacientes, Médicos, Agenda, Atendimentos, Triagens,
//        Leitos, Internações, Financeiro, TV/Chamadas,
//        Farmácia, Escalas, Estagnação
// ============================================================
import { getFullDB, saveFullDB } from './localDB.js';

// ──────────────────────────────────────────────
// DADOS BASE
// ──────────────────────────────────────────────
const NOMES_MASC = ['Miguel','Arthur','Gael','Heitor','Theo','Davi','Gabriel','Bernardo','Samuel','João',
  'Enzo','Lucas','Benjamin','Guilherme','Rafael','Joaquim','Pedro','Henrique','Gustavo','Murilo',
  'Matheus','Isaac','Felipe','Vitor','Levi','Daniel','Eduardo','Leonardo','Vicente','Caio',
  'Thiago','Bruno','André','Diego','Rodrigo','Marcelo','Fábio','Alessandro','Renato','Paulo'];

const NOMES_FEM = ['Ana','Beatriz','Carla','Diana','Eduarda','Fernanda','Gabriela','Helena','Isabela','Juliana',
  'Karen','Larissa','Mariana','Natalia','Olivia','Patricia','Rafaela','Sabrina','Tatiana','Ursula',
  'Vanessa','Wanessa','Ximena','Yasmin','Zara','Luiza','Sofia','Alice','Emília','Clara',
  'Vitória','Camila','Letícia','Rebeca','Cristina','Sandra','Mônica','Silvia','Regina','Elaine'];

const SOBRENOMES = ['Silva','Santos','Oliveira','Souza','Rodrigues','Ferreira','Alves','Pereira','Lima','Gomes',
  'Costa','Ribeiro','Martins','Carvalho','Almeida','Lopes','Soares','Fernandes','Vieira','Barbosa',
  'Rocha','Dias','Nascimento','Andrade','Moreira','Nunes','Marques','Machado','Mendes','Freitas',
  'Cardoso','Ramos','Gonçalves','Cruz','Araújo','Pinto','Correia','Figueiredo','Monteiro','Teixeira'];

const ESPECIALIDADES = ['Clínica Médica','Cardiologia','Pediatria','Ortopedia','Neurologia',
  'Ginecologia','Dermatologia','Psiquiatria','Endocrinologia','Oncologia','Urologia','Reumatologia'];

const PLANOS = ['Unimed','Bradesco Saúde','SulAmérica','Amil','Hapvida','NotreDame Intermédica','Particular','SUS'];

const MANCHESTER_COLORS = ['Vermelho','Laranja','Amarelo','Verde','Azul'];
const MANCHASTER_WEIGHTS = [0.10, 0.20, 0.30, 0.30, 0.10]; // distribuição realista

const ENCOUNTER_STATUSES = [
  'Aguardando_Triagem','Aguardando_Atendimento','Em_Atendimento',
  'Aguardando_Exames','Aguardando_Resultado','Alta'
];

const ENCOUNTER_TYPES = ['Urgencia','Ambulatorio'];

const CONSULTÓRIOS = ['Consultório 01','Consultório 02','Consultório 03','Consultório 04',
  'Consultório 05','Sala de Emergência','Sala de Procedimentos'];

const BAIRROS = ['Centro','Jardim América','Vila Nova','Bela Vista','Morumbi',
  'Santo André','Ipiranga','Tatuapé','Pinheiros','Lapa','Consolação','Santana'];

const MEDICAMENTOS = [
  { name: 'Dipirona 500mg', category: 'Analgésico', unit: 'Comprimido', minStock: 100 },
  { name: 'Paracetamol 750mg', category: 'Analgésico', unit: 'Comprimido', minStock: 100 },
  { name: 'Ibuprofeno 400mg', category: 'Anti-inflamatório', unit: 'Comprimido', minStock: 80 },
  { name: 'Amoxicilina 500mg', category: 'Antibiótico', unit: 'Cápsula', minStock: 60 },
  { name: 'Omeprazol 20mg', category: 'Gastroprotetor', unit: 'Comprimido', minStock: 80 },
  { name: 'Metformina 850mg', category: 'Antidiabético', unit: 'Comprimido', minStock: 60 },
  { name: 'Losartana 50mg', category: 'Anti-hipertensivo', unit: 'Comprimido', minStock: 60 },
  { name: 'Atenolol 25mg', category: 'Betabloqueador', unit: 'Comprimido', minStock: 50 },
  { name: 'Sinvastatina 20mg', category: 'Hipolipemiante', unit: 'Comprimido', minStock: 50 },
  { name: 'Soro Fisiológico 0,9% 500ml', category: 'Solução', unit: 'Frasco', minStock: 30 },
  { name: 'Soro Glicosado 5% 500ml', category: 'Solução', unit: 'Frasco', minStock: 30 },
  { name: 'Morfina 10mg/ml', category: 'Opioide', unit: 'Ampola', minStock: 20 },
  { name: 'Tramadol 50mg', category: 'Analgésico', unit: 'Ampola', minStock: 30 },
  { name: 'Ranitidina 150mg', category: 'Antiácido', unit: 'Comprimido', minStock: 50 },
  { name: 'Furosemida 40mg', category: 'Diurético', unit: 'Comprimido', minStock: 40 },
  { name: 'Metoclopramida 10mg', category: 'Antiemético', unit: 'Ampola', minStock: 30 },
  { name: 'Dexametasona 4mg', category: 'Corticóide', unit: 'Ampola', minStock: 40 },
  { name: 'Adrenalina 1mg/ml', category: 'Emergência', unit: 'Ampola', minStock: 20 },
  { name: 'Diazepam 10mg', category: 'Ansiolítico', unit: 'Comprimido', minStock: 30 },
  { name: 'Cetirizina 10mg', category: 'Anti-histamínico', unit: 'Comprimido', minStock: 60 },
  { name: 'Azitromicina 500mg', category: 'Antibiótico', unit: 'Comprimido', minStock: 40 },
  { name: 'Prednisona 20mg', category: 'Corticóide', unit: 'Comprimido', minStock: 40 },
  { name: 'Insulina Regular 100UI/ml', category: 'Hormônio', unit: 'Frasco', minStock: 15 },
  { name: 'Heparina 5000UI/ml', category: 'Anticoagulante', unit: 'Frasco', minStock: 15 },
  { name: 'Vitamina C 1g', category: 'Suplemento', unit: 'Comprimido', minStock: 80 },
  { name: 'Acido Fólico 5mg', category: 'Suplemento', unit: 'Comprimido', minStock: 60 },
  { name: 'Sulfato Ferroso 40mg', category: 'Suplemento', unit: 'Comprimido', minStock: 60 },
  { name: 'Clonazepam 2mg', category: 'Ansiolítico', unit: 'Comprimido', minStock: 30 },
  { name: 'Bromazepam 6mg', category: 'Ansiolítico', unit: 'Comprimido', minStock: 30 },
  { name: 'Ondansetrona 8mg', category: 'Antiemético', unit: 'Comprimido', minStock: 40 },
];

// ──────────────────────────────────────────────
// HELPERS
// ──────────────────────────────────────────────
function rnd(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function pick(arr) { return arr[rnd(0, arr.length - 1)]; }
function pickWeighted(arr, weights) {
  const r = Math.random();
  let cum = 0;
  for (let i = 0; i < arr.length; i++) {
    cum += weights[i];
    if (r < cum) return arr[i];
  }
  return arr[arr.length - 1];
}
function uid(prefix) { return `${prefix}-${Date.now()}-${rnd(1000, 9999)}-${rnd(100, 999)}`; }
function randomDate(start, end) {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime())).toISOString();
}
function pastDate(maxHoursAgo) {
  return new Date(Date.now() - rnd(0, maxHoursAgo * 3600 * 1000)).toISOString();
}
function futureDate(maxDaysAhead) {
  const d = new Date();
  d.setDate(d.getDate() + rnd(1, maxDaysAhead));
  d.setHours(rnd(7, 17), rnd(0, 1) === 0 ? 0 : 30, 0, 0);
  return d.toISOString();
}

// Gera CPF único
const cpfSet = new Set();
function uniqueCPF() {
  let cpf;
  do {
    const d = () => rnd(0, 9);
    cpf = `${d()}${d()}${d()}.${d()}${d()}${d()}.${d()}${d()}${d()}-${d()}${d()}`;
  } while (cpfSet.has(cpf));
  cpfSet.add(cpf);
  return cpf;
}

function randomPhone() {
  return `(${pick(['11','21','31','41','51','61','71','81','91'])}) 9${rnd(5000, 9999)}-${rnd(1000, 9999)}`;
}

function randomEmail(name) {
  const domains = ['gmail.com','hotmail.com','yahoo.com.br','outlook.com','uol.com.br'];
  return name.toLowerCase().normalize('NFD').replace(/[^a-z ]/g, '').replace(/\s+/g, '.').slice(0, 20)
    + rnd(10, 999) + '@' + pick(domains);
}

function manchesterLabel(color) {
  const map = { Vermelho: 'Emergência', Laranja: 'Muito Urgente', Amarelo: 'Urgente', Verde: 'Pouco Urgente', Azul: 'Não Urgente' };
  return map[color] || color;
}

// ──────────────────────────────────────────────
// GERADORES
// ──────────────────────────────────────────────

function generatePatients(count = 80) {
  const patients = [];
  const fullNameSet = new Set();
  for (let i = 0; i < count; i++) {
    const isFem = Math.random() > 0.55;
    const firstName = isFem ? pick(NOMES_FEM) : pick(NOMES_MASC);
    const lastName = `${pick(SOBRENOMES)} ${pick(SOBRENOMES)}`;
    let fullName = `${firstName} ${lastName}`;
    // Garantir nome único
    let attempt = 0;
    while (fullNameSet.has(fullName) && attempt < 10) {
      fullName = `${firstName} ${pick(SOBRENOMES)} ${pick(SOBRENOMES)}`;
      attempt++;
    }
    fullNameSet.add(fullName);

    const birthYear = rnd(1940, 2015);
    const birthDate = `${birthYear}-${String(rnd(1,12)).padStart(2,'0')}-${String(rnd(1,28)).padStart(2,'0')}`;
    const age = new Date().getFullYear() - birthYear;

    patients.push({
      id: `PAT-${String(i + 1).padStart(3, '0')}`,
      fullName,
      cpf: uniqueCPF(),
      birthDate,
      age,
      gender: isFem ? 'Feminino' : 'Masculino',
      phone: randomPhone(),
      email: randomEmail(fullName),
      address: `Rua ${pick(['das Flores','São José','Boa Vista','Tiradentes','XV de Novembro','Castro Alves'])}, ${rnd(10, 999)} - ${pick(BAIRROS)}`,
      status: Math.random() > 0.08 ? 'Ativo' : 'Inativo',
      healthPlan: pick(PLANOS),
      bloodType: pick(['A+','A-','B+','B-','AB+','AB-','O+','O-']),
      allergies: Math.random() > 0.7 ? pick(['Penicilina','AAS','Dipirona','Látex','Sulfas']) : '',
      emergencyContact: `${pick(NOMES_MASC)} ${pick(SOBRENOMES)} - ${randomPhone()}`,
      created_at: randomDate(new Date('2024-01-01'), new Date()).replace('T', ' ').slice(0, 19),
      updated_at: new Date().toISOString()
    });
  }
  return patients;
}

function generateDoctors() {
  const doctorDefs = [
    { name: 'Dr. Carlos Eduardo Silva', specialty: 'Clínica Médica', crm: 'CRM-SP 12345' },
    { name: 'Dra. Ana Maria Costa', specialty: 'Cardiologia', crm: 'CRM-SP 23456' },
    { name: 'Dr. João Pedro Santos', specialty: 'Pediatria', crm: 'CRM-SP 34567' },
    { name: 'Dra. Beatriz Oliveira', specialty: 'Ortopedia', crm: 'CRM-SP 45678' },
    { name: 'Dr. Roberto Fernandes', specialty: 'Neurologia', crm: 'CRM-SP 56789' },
    { name: 'Dra. Mariana Lima', specialty: 'Ginecologia', crm: 'CRM-SP 67890' },
    { name: 'Dr. Fábio Rodrigues', specialty: 'Dermatologia', crm: 'CRM-SP 78901' },
    { name: 'Dr. André Mendes', specialty: 'Psiquiatria', crm: 'CRM-SP 89012' },
    { name: 'Dra. Cristina Souza', specialty: 'Endocrinologia', crm: 'CRM-SP 90123' },
    { name: 'Dr. Marcelo Andrade', specialty: 'Urologia', crm: 'CRM-SP 01234' },
    { name: 'Dra. Renata Carvalho', specialty: 'Reumatologia', crm: 'CRM-SP 11235' },
    { name: 'Dr. Thiago Martins', specialty: 'Clínica Médica', crm: 'CRM-SP 22346' },
  ];
  return doctorDefs.map((d, i) => {
    const username = d.name.toLowerCase()
      .normalize('NFD').replace(/[^a-z]/g, '')
      .replace(/^(dr|dra)/, '')
      .slice(0, 12);
    return {
      id: `DOC-${String(i + 1).padStart(3, '0')}`,
      ...d,
      username: username ? `dr.${username}` : `dr.medico${i+1}`,
      phone: randomPhone(),
      email: randomEmail(d.name),
      status: 'Ativo',
      roomName: pick(CONSULTÓRIOS),
      created_at: new Date('2024-01-15').toISOString(),
      updated_at: new Date().toISOString()
    };
  });
}

function generateNurses() {
  const nurseDefs = [
    { name: 'Enf. Sílvia Regina Santos', coren: 'COREN-SP 123456-ENF', roleFunction: 'Supervisão / UTI', username: 'silviacwb' },
    { name: 'Enf. Patrícia Oliveira Lima', coren: 'COREN-SP 234567-ENF', roleFunction: 'Triagem Manchester', username: 'enf.patricia' },
    { name: 'Enf. Marcos Vinícius Souza', coren: 'COREN-SP 345678-ENF', roleFunction: 'Pronto Socorro / Emergência', username: 'enf.marcos' },
    { name: 'Enf. Juliana Ferreira Costa', coren: 'COREN-SP 456789-ENF', roleFunction: 'Enfermaria Geral', username: 'enf.juliana' },
    { name: 'Enf. Rodrigo Alves Ribeiro', coren: 'COREN-SP 567890-ENF', roleFunction: 'Centro Cirúrgico', username: 'enf.rodrigo' },
    { name: 'Enf. Camila Rocha Silva', coren: 'COREN-SP 678901-ENF', roleFunction: 'Medicação / Procedimentos', username: 'enf.camila' },
    { name: 'Enf. Lucas Mendes Freitas', coren: 'COREN-SP 789012-ENF', roleFunction: 'Pediatria', username: 'enf.lucas' },
    { name: 'Enf. Tatiane Barbosa Cruz', coren: 'COREN-SP 890123-ENF', roleFunction: 'UTI Adulto', username: 'enf.tatiane' },
  ];
  return nurseDefs.map((n, i) => ({
    id: `NUR-${String(i + 1).padStart(3, '0')}`,
    ...n,
    phone: randomPhone(),
    email: randomEmail(n.name),
    status: 'Ativo',
    created_at: new Date('2024-01-15').toISOString(),
    updated_at: new Date().toISOString()
  }));
}


function generateAppointments(patients, doctors, count = 60) {
  const appointments = [];
  const apptStatuses = {
    past: ['Concluído', 'Cancelado', 'Faltou', 'Concluído', 'Concluído'],
    today: ['Confirmado', 'Agendado', 'Em Atendimento', 'Concluído'],
    future: ['Agendado', 'Confirmado', 'Agendado']
  };

  for (let i = 0; i < count; i++) {
    const patient = pick(patients);
    const doctor = pick(doctors);
    const period = i < 25 ? 'past' : i < 38 ? 'today' : 'future';
    let dateObj;
    if (period === 'past') {
      dateObj = new Date(Date.now() - rnd(1, 30) * 86400000);
    } else if (period === 'today') {
      dateObj = new Date();
    } else {
      dateObj = new Date(Date.now() + rnd(1, 21) * 86400000);
    }
    const hour = rnd(7, 17);
    const min = rnd(0, 1) * 30;

    appointments.push({
      id: `APT-${String(i + 1).padStart(3, '0')}`,
      patientId: patient.id,
      patientName: patient.fullName,
      doctorId: doctor.id,
      doctorName: doctor.name,
      specialty: doctor.specialty,
      roomName: pick(CONSULTÓRIOS),
      appointmentDate: dateObj.toISOString().split('T')[0],
      appointmentTime: `${String(hour).padStart(2,'0')}:${String(min).padStart(2,'0')}`,
      status: pick(apptStatuses[period]),
      type: pick(['Consulta','Retorno','Exame','Procedimento']),
      notes: pick(['','Paciente hipertenso - verificar PA','Alergia a Dipirona','Retorno pós-cirurgia','Trazer exames anteriores','']),
      healthPlan: patient.healthPlan,
      created_at: new Date(dateObj.getTime() - rnd(1, 7) * 86400000).toISOString(),
      updated_at: new Date().toISOString()
    });
  }
  return appointments;
}

function generateEncountersAndTriages(patients, doctors, count = 45) {
  const encounters = [];
  const triages = [];
  const statusDist = [
    { status: 'Aguardando_Triagem', weight: 0.12 },
    { status: 'Aguardando_Atendimento', weight: 0.25 },
    { status: 'Em_Atendimento', weight: 0.22 },
    { status: 'Aguardando_Exames', weight: 0.18 },
    { status: 'Aguardando_Resultado', weight: 0.10 },
    { status: 'Alta', weight: 0.13 },
  ];

  for (let i = 0; i < count; i++) {
    const patient = pick(patients);
    const doctor = pick(doctors);
    const typeEnc = pick(ENCOUNTER_TYPES);

    // Determinar status com distribuição ponderada
    const statusRoll = Math.random();
    let cumW = 0, status = 'Aguardando_Triagem';
    for (const s of statusDist) { cumW += s.weight; if (statusRoll < cumW) { status = s.status; break; } }

    const isFinished = status === 'Alta';
    const hoursAgo = isFinished ? rnd(2, 72) : rnd(0, 12);
    const admittedAt = new Date(Date.now() - hoursAgo * 3600000).toISOString();
    const manchColor = pickWeighted(MANCHESTER_COLORS, MANCHASTER_WEIGHTS);

    const encId = `ENC-${String(i + 1).padStart(3, '0')}`;
    encounters.push({
      id: encId,
      patientId: patient.id,
      patientName: patient.fullName,
      doctorId: status !== 'Aguardando_Triagem' ? doctor.id : null,
      doctorName: status !== 'Aguardando_Triagem' ? doctor.name : null,
      type: typeEnc,
      status,
      manchesterColor: status !== 'Aguardando_Triagem' ? manchColor : null,
      manchesterLabel: status !== 'Aguardando_Triagem' ? manchesterLabel(manchColor) : null,
      room: (status === 'Em_Atendimento' || status === 'Aguardando_Exames') ? pick(CONSULTÓRIOS) : null,
      chiefComplaint: pick(['Dor abdominal','Febre alta','Cefaleia intensa','Dispneia','Dor torácica','Trauma em membro','Tontura e vômito','Hipertensão','Lombalgia','Convulsão','Sangramento','Reação alérgica']),
      admitted_at: admittedAt,
      finished_at: isFinished ? new Date(Date.now() - rnd(0, hoursAgo - 1) * 3600000).toISOString() : null,
      healthPlan: patient.healthPlan,
      lastStatusUpdate: new Date(Date.now() - rnd(5, 50) * 60000).toISOString(),
      created_at: admittedAt,
      updated_at: new Date().toISOString()
    });

    // Gerar triagem para todos exceto Aguardando_Triagem
    if (status !== 'Aguardando_Triagem') {
      const triId = `TRI-${String(i + 1).padStart(3, '0')}`;
      triages.push({
        id: triId,
        encounterId: encId,
        patientId: patient.id,
        patientName: patient.fullName,
        color: manchColor,
        label: manchesterLabel(manchColor),
        weight: rnd(45, 120),
        height: rnd(145, 195),
        temperature: (36 + Math.random() * 3).toFixed(1),
        bloodPressureSystolic: rnd(90, 180),
        bloodPressureDiastolic: rnd(60, 110),
        heartRate: rnd(55, 130),
        oxygenSaturation: rnd(88, 100),
        painScale: rnd(0, 10),
        notes: pick(['Paciente agitado','Cooperativo','Sonolento','Orientado','Em uso de medicação contínua','']),
        created_at: admittedAt,
        updated_at: new Date().toISOString()
      });
    }
  }

  return { encounters, triages };
}


function generateHospitalizations(patients, doctors, count = 35) {
  const hospitalizations = [];
  const sectors = ['pronto_socorro', 'corredor_internacao', 'clinica_cirurgica', 'clinica_medica', 'uti'];
  
  const EVOLUCOES_EXEMPLO = [
    'Paciente admitido no setor. Quadro hemodinamicamente estável, mantendo boa saturação em ar ambiente.',
    'Avaliando resultados de exames laboratoriais. Prescrição médica ajustada e antibioticoterapia mantida.',
    'Realizada troca de curativo cirúrgico. Ferida operatória com bom aspecto, sem sinais flogísticos.',
    'Aguardando parecer da equipe cirúrgica e liberação de vaga em leito de enfermaria.',
    'Paciente refere melhora álgica significativa. Programada alta médica após rodada de exames matinais.',
    'Mantendo suporte hemodinâmico leve. Monitorização contínua de sinais vitais sem intercorrências.'
  ];

  for (let i = 0; i < count; i++) {
    const patient = pick(patients);
    const doctor = pick(doctors);

    // Distribui uniformemente pelos 5 setores do Kanban
    const sector = sectors[i % sectors.length];
    
    // Status: 85% Internado, 15% Alta
    const status = Math.random() > 0.85 ? 'Alta' : 'Internado';
    const admHoursAgo = rnd(12, 180);
    const admDate = new Date(Date.now() - admHoursAgo * 3600000).toISOString();
    const sectorDate = new Date(Date.now() - rnd(1, Math.max(2, admHoursAgo - 2)) * 3600000).toISOString();

    let bedName = 'S/ Leito';
    if (sector === 'pronto_socorro') bedName = `Box PS-0${rnd(1, 9)}`;
    else if (sector === 'corredor_internacao') bedName = `Maca COR-0${rnd(1, 9)}`;
    else if (sector === 'clinica_cirurgica') bedName = `Quarto CIR-${rnd(101, 110)}`;
    else if (sector === 'clinica_medica') bedName = `Enf MED-${rnd(201, 215)}`;
    else if (sector === 'uti') bedName = `Leito UTI-0${rnd(1, 9)}`;

    const evolutions = [
      { ts: admDate, text: 'Admissão: Paciente recebido no setor com queixa de ' + pick(['dor intensa', 'falta de ar', 'febre alta', 'desconforto abdominal', 'tontura']), author: doctor.name },
      { ts: sectorDate, text: pick(EVOLUCOES_EXEMPLO), author: 'Equipe de Enfermagem' }
    ];

    hospitalizations.push({
      id: `HOSP-${String(i + 1).padStart(3, '0')}`,
      patient_id: patient.id,
      patientName: patient.fullName,
      current_sector: sector,
      sector_entry_date: sectorDate,
      admission_date: admDate,
      bed: bedName,
      diagnosis: pick(['Pneumonia Comunitária', 'IAM com Supra', 'Sepse Foco Pulmonar', 'Pós-op Apendicectomia', 'Trauma Abdominal', 'Insuficiência Cardíaca Descompensada', 'Acidente Vascular Cerebral']),
      doctor_id: doctor.id,
      doctor_name: doctor.name,
      notes: pick(EVOLUCOES_EXEMPLO),
      status: status,
      discharge_date: status === 'Alta' ? new Date(Date.now() - rnd(1, 12) * 3600000).toISOString() : null,
      evolutions: evolutions,
      created_at: admDate,
      updated_at: new Date().toISOString()
    });
  }
  return hospitalizations;
}

function generateBeds(encounters) {
  const bedDefs = [
    // Enfermaria
    { number: '101A', type: 'Enfermaria', ward: 'Clínica Médica' },
    { number: '101B', type: 'Enfermaria', ward: 'Clínica Médica' },
    { number: '102A', type: 'Enfermaria', ward: 'Clínica Médica' },
    { number: '102B', type: 'Enfermaria', ward: 'Clínica Médica' },
    { number: '103A', type: 'Enfermaria', ward: 'Clínica Médica' },
    { number: '103B', type: 'Enfermaria', ward: 'Clínica Médica' },
    { number: '201A', type: 'Enfermaria', ward: 'Pediatria' },
    { number: '201B', type: 'Enfermaria', ward: 'Pediatria' },
    { number: '202A', type: 'Enfermaria', ward: 'Pediatria' },
    // UTI Adulto
    { number: 'UTI-01', type: 'UTI Adulto', ward: 'UTI' },
    { number: 'UTI-02', type: 'UTI Adulto', ward: 'UTI' },
    { number: 'UTI-03', type: 'UTI Adulto', ward: 'UTI' },
    { number: 'UTI-04', type: 'UTI Adulto', ward: 'UTI' },
    // UTI Pediátrica
    { number: 'UTIP-01', type: 'UTI Pediátrica', ward: 'UTI Pediátrica' },
    { number: 'UTIP-02', type: 'UTI Pediátrica', ward: 'UTI Pediátrica' },
    // Isolamento
    { number: 'ISO-01', type: 'Isolamento', ward: 'Isolamento' },
    { number: 'ISO-02', type: 'Isolamento', ward: 'Isolamento' },
    // Observação
    { number: 'OBS-01', type: 'Observação', ward: 'Observação' },
    { number: 'OBS-02', type: 'Observação', ward: 'Observação' },
    { number: 'OBS-03', type: 'Observação', ward: 'Observação' },
    // Maternidade
    { number: 'MAT-01', type: 'Maternidade', ward: 'Maternidade' },
    { number: 'MAT-02', type: 'Maternidade', ward: 'Maternidade' },
  ];

  // Pacientes dos encounters finalizados/internados (excluir Alta)
  const internedEncounters = encounters.filter(e =>
    ['Em_Atendimento','Aguardando_Exames','Aguardando_Resultado'].includes(e.status)
  ).slice(0, 12);

  const beds = bedDefs.map((def, i) => {
    const enc = i < internedEncounters.length ? internedEncounters[i] : null;
    const admittedAt = enc ? new Date(Date.now() - rnd(1, 168) * 3600000).toISOString() : null;
    return {
      id: `BED-${String(i + 1).padStart(3, '0')}`,
      bedNumber: def.number,
      number: def.number,
      type: def.type,
      sector: def.ward === 'Pediatria' || def.type === 'UTI Pediátrica' ? 'Pediatria' : def.type,
      ward: def.ward,
      status: enc ? 'Ocupado' : 'Vago',
      patientId: enc ? enc.patientId : null,
      patientName: enc ? enc.patientName : null,
      encounterId: enc ? enc.id : null,
      doctorResponsible: enc ? pick(['Dr. Carlos Eduardo Silva','Dra. Ana Maria Costa','Dr. João Pedro Santos']) : null,
      admittedAt,
      expectedDischarge: enc ? new Date(Date.now() + rnd(1, 7) * 86400000).toISOString().split('T')[0] : null,
      notes: enc ? pick(['Monitorização contínua','Em dieta zero','Soro em andamento','Exames pendentes','Estável']) : '',
      created_at: new Date('2024-01-01').toISOString(),
      updated_at: new Date().toISOString()
    };
  });

  return beds;
}

function generateFinancial(patients, encounters, count = 150) {
  const installments = [];
  // Field names must match what reports.js filterAndRender expects
  const paymentMethods = ['Pix','Boleto','Cartão de Crédito','Cartão de Débito','Dinheiro','Convênio'];
  const categories = ['Consultas','Procedimentos','Exames','Operacionais','Farmácia','Insumos'];
  const statusWeights = { Pagas: 0.50, 'A Vencer': 0.28, Vencidas: 0.14, Canceladas: 0.08 };

  const baseValues = {
    'Consultas': [80, 120, 180, 250, 350],
    'Exames': [40, 80, 120, 200, 350],
    'Procedimentos': [200, 500, 800, 1200, 2000],
    'Operacionais': [150, 300, 500, 800],
    'Farmácia': [20, 45, 80, 150, 250],
    'Insumos': [30, 50, 80, 120]
  };

  for (let i = 0; i < count; i++) {
    const patient = pick(patients);
    const cat = pick(categories);
    const enc = Math.random() > 0.4 ? pick(encounters) : null;

    const statusRoll = Math.random();
    let cumW = 0, status = 'Pagas';
    for (const [s, w] of Object.entries(statusWeights)) { cumW += w; if (statusRoll < cumW) { status = s; break; } }

    let dueDate, payDate;
    if (status === 'Pagas') {
      dueDate = pastDate(90).split('T')[0];
      payDate = pastDate(80).split('T')[0];
    } else if (status === 'A Vencer') {
      const future = new Date(Date.now() + rnd(1, 30) * 86400000);
      dueDate = future.toISOString().split('T')[0];
      payDate = null;
    } else if (status === 'Vencidas') {
      dueDate = new Date(Date.now() - rnd(5, 90) * 86400000).toISOString().split('T')[0];
      payDate = null;
    } else {
      dueDate = pastDate(60).split('T')[0];
      payDate = null;
    }

    const amount = pick(baseValues[cat]);
    const discount = status === 'Pago' && Math.random() > 0.8 ? rnd(5, 20) : 0;
    const finalAmount = parseFloat((amount * (1 - discount / 100)).toFixed(2));

    installments.push({
      id: `FIN-${String(i + 1).padStart(3, '0')}`,
      patientId: patient.id,
      patientName: patient.fullName,
      encounterId: enc ? enc.id : null,
      type: ['Operacionais', 'Insumos'].includes(cat) ? 'Despesa' : 'Receita',
      category: cat,
      description: `${cat} - ${patient.fullName.split(' ')[0]}`,
      amount,
      discount,
      finalAmount,
      status,
      paymentMethod: status === 'Pagas' ? pick(paymentMethods) : null,
      healthPlan: patient.healthPlan,
      dueDate,
      payDate,
      notes: Math.random() > 0.8 ? pick(['Convênio em análise','Aguardando autorização','Parcelado em 2x','Desconto aplicado']) : '',
      created_at: pastDate(120),
      updated_at: new Date().toISOString()
    });
  }
  return installments;
}

function generateTvCalls(patients, count = 15) {
  const calls = [];
  for (let i = 0; i < count; i++) {
    const patient = pick(patients);
    const manchColor = pickWeighted(MANCHESTER_COLORS, MANCHASTER_WEIGHTS);
    const tsOffset = i * rnd(3, 12) * 60000; // espaçados no tempo
    calls.push({
      id: `TV-${String(i + 1).padStart(3, '0')}`,
      patientName: patient.fullName,
      roomName: pick(CONSULTÓRIOS),
      manchesterColor: manchColor,
      manchesterLabel: manchesterLabel(manchColor),
      patientId: patient.id,
      calledBy: pick(['Dr. Carlos Eduardo Silva','Dra. Ana Maria Costa','Dr. João Pedro Santos','Recepção']),
      timestamp: new Date(Date.now() - tsOffset).toISOString(),
      calledAt: new Date(Date.now() - tsOffset).toISOString(),
      created_at: new Date(Date.now() - tsOffset).toISOString()
    });
  }
  return calls;
}

function generateMedications() {
  return MEDICAMENTOS.map((med, i) => {
    const currentStock = rnd(0, 250);
    const belowMin = currentStock < med.minStock;
    return {
      id: `MED-${String(i + 1).padStart(3, '0')}`,
      name: med.name,
      category: med.category,
      form: med.unit,
      stockQuantity: currentStock,
      minStock: med.minStock,
      maxStock: med.minStock * 5,
      status: currentStock === 0 ? 'Esgotado' : belowMin ? 'Estoque Baixo' : 'Normal',
      supplier: pick(['Distribuidora Pharma Plus','MedStock Brasil','FarmaCentral','Distribuidora União Saúde']),
      lotNumber: `LOT-${rnd(10000, 99999)}`,
      expirationDate: new Date(Date.now() + rnd(30, 730) * 86400000).toISOString().split('T')[0],
      unitPrice: parseFloat((rnd(5, 500) + Math.random()).toFixed(2)),
      location: pick(['Prateleira A1','Prateleira A2','Prateleira B1','Refrigerador 1','Cofre','Armário Controlado']),
      controlled: ['Morfina 10mg/ml','Diazepam 10mg','Clonazepam 2mg','Bromazepam 6mg','Tramadol 50mg'].includes(med.name),
      created_at: new Date('2024-01-01').toISOString(),
      updated_at: new Date().toISOString()
    };
  });
}

function generateDutySchedules(doctors, nurses) {
  const schedules = [];
  const today = new Date();
  
  // Format data local (YYYY-MM-DD)
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  const dates = [];
  for (let offset = -2; offset <= 7; offset++) {
    const d = new Date(today.getTime() + offset * 86400000);
    const dStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    dates.push(dStr);
  }

  const doctorShifts = [
    { type: 'Manhã (07:00 - 13:00)', hours: 6, start: '07:00', end: '13:00' },
    { type: 'Tarde (13:00 - 19:00)', hours: 6, start: '13:00', end: '19:00' },
    { type: 'Noite (19:00 - 07:00)', hours: 12, start: '19:00', end: '07:00' },
    { type: 'Plantão 24h (07:00 - 07:00)', hours: 24, start: '07:00', end: '07:00' },
  ];

  const nurseShifts = [
    { type: 'Turno A (07:00 - 13:00)', hours: 6, start: '07:00', end: '13:00' },
    { type: 'Turno B (13:00 - 19:00)', hours: 6, start: '13:00', end: '19:00' },
    { type: 'Noturno SD (19:00 - 07:00)', hours: 12, start: '19:00', end: '07:00' },
    { type: 'Escala 12x36 (07:00 - 19:00)', hours: 12, start: '07:00', end: '19:00' },
  ];

  const docSectors = ['Consultório 01', 'Consultório 02', 'Consultório 03', 'Consultório 04', 'Consultório 05', 'Sala de Emergência', 'UTI Adulto', 'Centro Cirúrgico'];
  const nurseSectors = ['Triagem Manchester', 'Enfermaria Geral', 'UTI Adulto', 'Pronto Socorro', 'Centro Cirúrgico', 'Sala de Medicação', 'Pediatria'];

  let idCounter = 1;

  // 1. Escalas para Médicos
  dates.forEach(dateStr => {
    doctors.forEach((doc, idx) => {
      const isToday = dateStr === todayStr;
      // Garante plantão para HOJE (100%), e 70% de chance nos outros dias
      if (isToday || Math.random() < 0.70) {
        const shift = doctorShifts[(idx + dates.indexOf(dateStr)) % doctorShifts.length];
        const sector = docSectors[(idx + idCounter) % docSectors.length];
        const isPast = dateStr < todayStr;
        const status = isPast ? 'Concluído' : isToday ? 'Em Andamento' : pick(['Confirmado', 'Confirmado', 'Troca Solicitada']);

        schedules.push({
          id: `DS-MED-${String(idCounter++).padStart(3, '0')}`,
          category: 'medico',
          professionalId: doc.id,
          professionalName: doc.name,
          crm_coren: doc.crm,
          specialty_role: doc.specialty,
          shiftDate: dateStr,
          shiftType: shift.type,
          startTime: shift.start,
          endTime: shift.end,
          workloadHours: shift.hours,
          roomName: sector,
          sector: sector,
          status,
          notes: pick(['', 'Plantão presencial', 'Sobreaviso cirúrgico', 'Cobertura de leitos', '']),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
      }
    });
  });

  // 2. Escalas para Enfermeiros
  dates.forEach(dateStr => {
    nurses.forEach((nurse, idx) => {
      const isToday = dateStr === todayStr;
      // Garante plantão para HOJE (100%), e 75% de chance nos outros dias
      if (isToday || Math.random() < 0.75) {
        const shift = nurseShifts[(idx + dates.indexOf(dateStr)) % nurseShifts.length];
        const sector = nurseSectors[(idx + idCounter) % nurseSectors.length];
        const isPast = dateStr < todayStr;
        const status = isPast ? 'Concluído' : isToday ? 'Em Andamento' : pick(['Confirmado', 'Confirmado', 'Troca Solicitada']);

        schedules.push({
          id: `DS-ENF-${String(idCounter++).padStart(3, '0')}`,
          category: 'enfermeiro',
          professionalId: nurse.id,
          professionalName: nurse.name,
          crm_coren: nurse.coren,
          specialty_role: nurse.roleFunction,
          shiftDate: dateStr,
          shiftType: shift.type,
          startTime: shift.start,
          endTime: shift.end,
          workloadHours: shift.hours,
          roomName: sector,
          sector: sector,
          status,
          notes: pick(['', 'Supervisão de equipe', 'Triagem Manchester', 'Escala 12x36', '']),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
      }
    });
  });

  return schedules;
}

function generateConsultorios(doctors) {
  return CONSULTÓRIOS.map((name, i) => ({
    id: `CON-${String(i + 1).padStart(3, '0')}`,
    name,
    floor: i < 4 ? '1º Andar' : '2º Andar',
    status: Math.random() > 0.3 ? 'Ativo' : 'Em Manutenção',
    doctorId: i < doctors.length ? doctors[i].id : null,
    doctorName: i < doctors.length ? doctors[i].name : null,
    specialty: i < doctors.length ? doctors[i].specialty : null,
    equipment: pick(['Monitor Cardíaco, Oxímetro','Otoscópio, Oftalmoscópio','Ultrassom portátil','ECG, Desfibrilador','Equipamento básico']),
    created_at: new Date('2024-01-01').toISOString(),
    updated_at: new Date().toISOString()
  }));
}

// ──────────────────────────────────────────────
// FUNÇÃO PRINCIPAL
// ──────────────────────────────────────────────
export async function generateMockData(baseAmount = 300) {
  // ── 1. Limpar banco (PRESERVAR TODOS OS USUÁRIOS EXISTENTES + SISTEMA + CORPO CLÍNICO) ──
  const currentDB = (() => {
    try { return JSON.parse(localStorage.getItem('healthNexusDados') || '{}'); } catch { return {}; }
  })();

  const existingUsers = Array.isArray(currentDB.users) ? currentDB.users : [];
  const preservedUsers = [...existingUsers];

  const defaultSystemUsers = [
    { id: 'USR-MAZZAROWYSK', name: 'Marcelo Mazaro', username: 'mazzarowysk', role: 'Master', status: 'Ativo', created_at: new Date().toISOString() },
    { id: 'USR-BCOLTRI', name: 'Breno Coltri', username: 'bcoltri', role: 'Desenvolvedor', status: 'Ativo', created_at: new Date().toISOString() },
    { id: 'USR-ADMIN', name: 'Administrador Hospitalar', username: 'admin', role: 'Administrador', status: 'Ativo', created_at: new Date().toISOString() },
    { id: 'USR-FFACCO', name: 'Franciele Facco de Carvalho', username: 'ffacco', role: 'Desenvolvedor', status: 'Ativo', created_at: new Date().toISOString() },
    { id: 'USR-PFORTE', name: 'Dra. Paula Forte', username: 'pforte', role: 'Médico', status: 'Ativo', created_at: new Date().toISOString() }
  ];

  defaultSystemUsers.forEach(sysUser => {
    if (!preservedUsers.find(u => u.username === sysUser.username)) {
      preservedUsers.push(sysUser);
    }
  });

  // ── 2. Gerar Médicos e Enfermeiros com Logins ──
  const numPatients = baseAmount;
  const numAppts = Math.max(1, Math.round(baseAmount * 0.75));
  const numEncounters = Math.max(1, Math.round(baseAmount * 0.60));
  const numHosp = Math.max(1, Math.round(baseAmount * 0.30));
  const numFin = Math.max(1, Math.round(baseAmount * 1.15));
  const numTv = Math.max(1, Math.round(baseAmount * 0.25));

  console.log('[MockGen] Gerando médicos e enfermeiros...');
  const doctors = generateDoctors();
  const nurses = generateNurses();

  // Adicionar logins automáticos de Médicos ao banco de usuários se ainda não existirem
  doctors.forEach(doc => {
    if (!preservedUsers.find(u => u.username === doc.username)) {
      preservedUsers.push({
        id: `USR-${doc.id}`,
        name: doc.name,
        username: doc.username,
        role: 'Médico',
        status: 'Ativo',
        created_at: doc.created_at
      });
    }
  });

  // Adicionar logins automáticos de Enfermeiros ao banco de usuários se ainda não existirem
  nurses.forEach(nurse => {
    if (!preservedUsers.find(u => u.username === nurse.username)) {
      preservedUsers.push({
        id: `USR-${nurse.id}`,
        name: nurse.name,
        username: nurse.username,
        role: 'Enfermeiro',
        status: 'Ativo',
        created_at: nurse.created_at
      });
    }
  });


  console.log('[MockGen] Gerando pacientes...');
  const patients = generatePatients(numPatients);

  console.log('[MockGen] Gerando agendamentos...');
  const appointments = generateAppointments(patients, doctors, numAppts);

  console.log('[MockGen] Gerando atendimentos e triagens...');
  const { encounters, triages } = generateEncountersAndTriages(patients, doctors, numEncounters);

  console.log('[MockGen] Gerando leitos...');
  const beds = generateBeds(encounters);

  console.log('[MockGen] Gerando internações (Kanban)...');
  const hospitalizations = generateHospitalizations(patients, doctors, numHosp);

  console.log('[MockGen] Gerando financeiro...');
  const financial_installments = generateFinancial(patients, encounters, numFin);

  console.log('[MockGen] Gerando chamadas TV...');
  const tv_calls = generateTvCalls(patients, numTv);

  console.log('[MockGen] Gerando farmácia...');
  const medications = generateMedications();

  console.log('[MockGen] Gerando escalas de plantão (Médicos e Enfermeiros)...');
  const duty_schedules = generateDutySchedules(doctors, nurses);

  console.log('[MockGen] Gerando consultórios...');
  const consultorios = generateConsultorios(doctors);

  // ── 3. Montar e salvar banco completo ──
  const db = {
    settings: currentDB.settings || [],
    users: preservedUsers,
    patients,
    doctors,
    nurses,
    appointments,
    encounters,
    triages,
    beds,
    hospitalizations,
    financial_installments,
    tv_calls,
    medications,
    duty_schedules,
    consultorios,
  };

  localStorage.setItem('healthNexusDados', JSON.stringify(db));
  localStorage.setItem('healthNexusUpdatedAt', Date.now().toString());
  if (typeof window !== 'undefined' && typeof window.clearDataCache === 'function') {
    window.clearDataCache();
  }

  console.log('[MockGen] ✅ Simulação completa gerada!');
  console.log(`  → ${patients.length} pacientes`);
  console.log(`  → ${doctors.length} médicos | ${nurses.length} enfermeiros`);
  console.log(`  → ${preservedUsers.length} usuários com login`);
  console.log(`  → ${appointments.length} agendamentos`);
  console.log(`  → ${encounters.length} atendimentos | ${triages.length} triagens`);
  console.log(`  → ${beds.filter(b => b.status === 'Ocupado').length}/${beds.length} leitos ocupados`);
  console.log(`  → ${financial_installments.length} títulos financeiros`);
  console.log(`  → ${tv_calls.length} chamadas TV`);
  console.log(`  → ${medications.length} medicamentos`);
  console.log(`  → ${duty_schedules.length} escalas de plantão (Médicos + Enfermeiros)`);

  return { patients, doctors, nurses, users: preservedUsers, appointments, encounters, triages, beds, hospitalizations, financial_installments, tv_calls, medications, duty_schedules };
}

