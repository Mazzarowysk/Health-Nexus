/**
 * run_simulation.mjs
 * Script Node.js para executar a simulação completa do Health Nexus
 * diretamente no localStorage via arquivo JSON local
 * 
 * Uso: node run_simulation.mjs
 * Gera: simulation_output.json (que pode ser importado via console do browser)
 */

import { writeFileSync } from 'fs';

// ──────────────────────────────────────────────
// DADOS BASE (mesmos do mockDataGenerator.js)
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

const PLANOS = ['Unimed','Bradesco Saúde','SulAmérica','Amil','Hapvida','NotreDame Intermédica','Particular','SUS'];
const MANCHESTER_COLORS = ['Vermelho','Laranja','Amarelo','Verde','Azul'];
const MANCHASTER_WEIGHTS = [0.10, 0.20, 0.30, 0.30, 0.10];
const CONSULTÓRIOS = ['Consultório 01','Consultório 02','Consultório 03','Consultório 04','Consultório 05','Sala de Emergência','Sala de Procedimentos'];
const BAIRROS = ['Centro','Jardim América','Vila Nova','Bela Vista','Morumbi','Santo André','Ipiranga','Tatuapé','Pinheiros','Lapa'];

// ── Helpers ──
function rnd(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function pick(arr) { return arr[rnd(0, arr.length - 1)]; }
function pickWeighted(arr, weights) {
  const r = Math.random(); let cum = 0;
  for (let i = 0; i < arr.length; i++) { cum += weights[i]; if (r < cum) return arr[i]; }
  return arr[arr.length - 1];
}
function randomDate(start, end) {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime())).toISOString();
}
function pastDate(maxHoursAgo) {
  return new Date(Date.now() - rnd(0, maxHoursAgo * 3600 * 1000)).toISOString();
}
function randomPhone() {
  return `(${pick(['11','21','31','41','51'])}) 9${rnd(5000,9999)}-${rnd(1000,9999)}`;
}
function manchesterLabel(color) {
  return {Vermelho:'Emergência',Laranja:'Muito Urgente',Amarelo:'Urgente',Verde:'Pouco Urgente',Azul:'Não Urgente'}[color] || color;
}

const cpfSet = new Set();
function uniqueCPF() {
  let cpf;
  do {
    const d = () => rnd(0,9);
    cpf = `${d()}${d()}${d()}.${d()}${d()}${d()}.${d()}${d()}${d()}-${d()}${d()}`;
  } while (cpfSet.has(cpf));
  cpfSet.add(cpf);
  return cpf;
}

// ── Geradores ──
function generatePatients(count = 80) {
  const patients = [];
  const nameSet = new Set();
  for (let i = 0; i < count; i++) {
    const isFem = Math.random() > 0.55;
    const fn = isFem ? pick(NOMES_FEM) : pick(NOMES_MASC);
    let fullName = `${fn} ${pick(SOBRENOMES)} ${pick(SOBRENOMES)}`;
    let t = 0;
    while (nameSet.has(fullName) && t++ < 10) fullName = `${fn} ${pick(SOBRENOMES)} ${pick(SOBRENOMES)}`;
    nameSet.add(fullName);
    const birthYear = rnd(1940, 2015);
    patients.push({
      id: `PAT-${String(i+1).padStart(3,'0')}`,
      fullName, cpf: uniqueCPF(),
      birthDate: `${birthYear}-${String(rnd(1,12)).padStart(2,'0')}-${String(rnd(1,28)).padStart(2,'0')}`,
      age: new Date().getFullYear() - birthYear,
      gender: isFem ? 'Feminino' : 'Masculino',
      phone: randomPhone(),
      email: fullName.toLowerCase().replace(/[^a-z ]/g,'').replace(/ /g,'.').slice(0,20) + rnd(10,999) + '@gmail.com',
      address: `Rua ${pick(['das Flores','São José','Boa Vista','Tiradentes'])}, ${rnd(10,999)} - ${pick(BAIRROS)}`,
      status: Math.random() > 0.08 ? 'Ativo' : 'Inativo',
      healthPlan: pick(PLANOS),
      bloodType: pick(['A+','A-','B+','B-','AB+','AB-','O+','O-']),
      allergies: Math.random() > 0.7 ? pick(['Penicilina','AAS','Dipirona','Látex','Sulfas']) : '',
      created_at: randomDate(new Date('2024-01-01'), new Date()),
      updated_at: new Date().toISOString()
    });
  }
  return patients;
}

function generateDoctors() {
  const defs = [
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
  return defs.map((d, i) => ({
    id: `DOC-${String(i+1).padStart(3,'0')}`, ...d,
    phone: randomPhone(), status: 'Ativo',
    roomName: CONSULTÓRIOS[i % CONSULTÓRIOS.length],
    created_at: new Date('2024-01-15').toISOString(), updated_at: new Date().toISOString()
  }));
}

function generateAppointments(patients, doctors, count = 60) {
  const apts = [];
  for (let i = 0; i < count; i++) {
    const p = pick(patients); const d = pick(doctors);
    const period = i < 25 ? 'past' : i < 38 ? 'today' : 'future';
    let dt;
    if (period === 'past') dt = new Date(Date.now() - rnd(1,30)*86400000);
    else if (period === 'today') dt = new Date();
    else dt = new Date(Date.now() + rnd(1,21)*86400000);
    const pastStatuses = ['Concluído','Cancelado','Faltou','Concluído','Concluído'];
    const todayStatuses = ['Confirmado','Agendado','Em Atendimento','Concluído'];
    const futureStatuses = ['Agendado','Confirmado','Agendado'];
    const statusArr = period === 'past' ? pastStatuses : period === 'today' ? todayStatuses : futureStatuses;
    apts.push({
      id: `APT-${String(i+1).padStart(3,'0')}`,
      patientId: p.id, patientName: p.fullName, doctorId: d.id, doctorName: d.name,
      specialty: d.specialty, roomName: pick(CONSULTÓRIOS),
      appointmentDate: dt.toISOString().split('T')[0],
      appointmentTime: `${String(rnd(7,17)).padStart(2,'0')}:${rnd(0,1)*30===0?'00':'30'}`,
      status: pick(statusArr),
      type: pick(['Consulta','Retorno','Exame','Procedimento']),
      healthPlan: p.healthPlan,
      created_at: new Date(dt.getTime() - rnd(1,7)*86400000).toISOString(),
      updated_at: new Date().toISOString()
    });
  }
  return apts;
}

function generateEncountersAndTriages(patients, doctors, count = 45) {
  const encounters = [], triages = [];
  const statusDist = [
    {s:'Aguardando_Triagem',w:0.12},{s:'Aguardando_Atendimento',w:0.25},{s:'Em_Atendimento',w:0.22},
    {s:'Aguardando_Exames',w:0.18},{s:'Aguardando_Resultado',w:0.10},{s:'Alta',w:0.13}
  ];
  for (let i = 0; i < count; i++) {
    const p = pick(patients); const d = pick(doctors);
    const roll = Math.random(); let cum = 0, status = 'Aguardando_Triagem';
    for (const s of statusDist) { cum += s.w; if (roll < cum) { status = s.s; break; } }
    const hoursAgo = status === 'Alta' ? rnd(2,72) : rnd(0,12);
    const admittedAt = new Date(Date.now() - hoursAgo*3600000).toISOString();
    const mc = pickWeighted(MANCHESTER_COLORS, MANCHASTER_WEIGHTS);
    const encId = `ENC-${String(i+1).padStart(3,'0')}`;
    encounters.push({
      id: encId, patientId: p.id, patientName: p.fullName,
      doctorId: status !== 'Aguardando_Triagem' ? d.id : null,
      doctorName: status !== 'Aguardando_Triagem' ? d.name : null,
      type: pick(['Urgencia','Ambulatorio']), status,
      manchesterColor: status !== 'Aguardando_Triagem' ? mc : null,
      manchesterLabel: status !== 'Aguardando_Triagem' ? manchesterLabel(mc) : null,
      room: ['Em_Atendimento','Aguardando_Exames'].includes(status) ? pick(CONSULTÓRIOS) : null,
      chiefComplaint: pick(['Dor abdominal','Febre alta','Cefaleia intensa','Dispneia','Dor torácica','Trauma em membro','Tontura','Hipertensão','Lombalgia','Convulsão']),
      admitted_at: admittedAt, finished_at: status === 'Alta' ? new Date(Date.now() - rnd(0,hoursAgo-1)*3600000).toISOString() : null,
      healthPlan: p.healthPlan, created_at: admittedAt, updated_at: new Date().toISOString()
    });
    if (status !== 'Aguardando_Triagem') {
      triages.push({
        id: `TRI-${String(i+1).padStart(3,'0')}`, encounterId: encId,
        patientId: p.id, patientName: p.fullName, color: mc, label: manchesterLabel(mc),
        weight: rnd(45,120), height: rnd(145,195),
        temperature: (36 + Math.random()*3).toFixed(1),
        bloodPressureSystolic: rnd(90,180), bloodPressureDiastolic: rnd(60,110),
        heartRate: rnd(55,130), oxygenSaturation: rnd(88,100), painScale: rnd(0,10),
        created_at: admittedAt, updated_at: new Date().toISOString()
      });
    }
  }
  return { encounters, triages };
}

function generateBeds(encounters) {
  const bedDefs = [
    {number:'101A',type:'Enfermaria',ward:'Clínica Médica'},{number:'101B',type:'Enfermaria',ward:'Clínica Médica'},
    {number:'102A',type:'Enfermaria',ward:'Clínica Médica'},{number:'102B',type:'Enfermaria',ward:'Clínica Médica'},
    {number:'103A',type:'Enfermaria',ward:'Clínica Médica'},{number:'103B',type:'Enfermaria',ward:'Clínica Médica'},
    {number:'201A',type:'Enfermaria',ward:'Pediatria'},{number:'201B',type:'Enfermaria',ward:'Pediatria'},
    {number:'202A',type:'Enfermaria',ward:'Pediatria'},
    {number:'UTI-01',type:'UTI Adulto',ward:'UTI'},{number:'UTI-02',type:'UTI Adulto',ward:'UTI'},
    {number:'UTI-03',type:'UTI Adulto',ward:'UTI'},{number:'UTI-04',type:'UTI Adulto',ward:'UTI'},
    {number:'UTIP-01',type:'UTI Pediátrica',ward:'UTI Pediátrica'},{number:'UTIP-02',type:'UTI Pediátrica',ward:'UTI Pediátrica'},
    {number:'ISO-01',type:'Isolamento',ward:'Isolamento'},{number:'ISO-02',type:'Isolamento',ward:'Isolamento'},
    {number:'OBS-01',type:'Observação',ward:'Observação'},{number:'OBS-02',type:'Observação',ward:'Observação'},
    {number:'OBS-03',type:'Observação',ward:'Observação'},
  ];
  const activeEnc = encounters.filter(e => ['Em_Atendimento','Aguardando_Exames','Aguardando_Resultado'].includes(e.status)).slice(0,12);
  return bedDefs.map((def, i) => {
    const enc = i < activeEnc.length ? activeEnc[i] : null;
    return {
      id: `BED-${String(i+1).padStart(3,'0')}`, number: def.number, type: def.type, ward: def.ward,
      status: enc ? 'Ocupado' : 'Livre',
      patientId: enc?.patientId || null, patientName: enc?.patientName || null,
      encounterId: enc?.id || null,
      doctorResponsible: enc ? pick(['Dr. Carlos Eduardo Silva','Dra. Ana Maria Costa','Dr. João Pedro Santos']) : null,
      admittedAt: enc ? new Date(Date.now() - rnd(1,168)*3600000).toISOString() : null,
      expectedDischarge: enc ? new Date(Date.now() + rnd(1,7)*86400000).toISOString().split('T')[0] : null,
      notes: enc ? pick(['Monitorização contínua','Soro em andamento','Exames pendentes','Estável']) : '',
      created_at: new Date('2024-01-01').toISOString(), updated_at: new Date().toISOString()
    };
  });
}

function generateFinancial(patients, encounters, count = 90) {
  const items = [];
  const payForms = ['PIX','Cartão de Crédito','Cartão de Débito','Dinheiro','Boleto','Convênio','SUS'];
  const cats = ['Consulta','Exame Laboratorial','Exame de Imagem','Procedimento','Internação','Medicamento','Taxa de Uso'];
  const baseVals = {
    'Consulta':[80,120,180,250,350],'Exame Laboratorial':[40,80,120,200],
    'Exame de Imagem':[150,250,400,600,800],'Procedimento':[200,500,800,1200,2000],
    'Internação':[800,1500,2500,4000,7500],'Medicamento':[20,45,80,150],'Taxa de Uso':[30,50,80]
  };
  for (let i = 0; i < count; i++) {
    const p = pick(patients); const cat = pick(cats);
    const enc = Math.random() > 0.4 ? pick(encounters) : null;
    const roll = Math.random();
    const status = roll < 0.50 ? 'Pago' : roll < 0.78 ? 'Pendente' : roll < 0.92 ? 'Vencido' : 'Cancelado';
    let dueDate, payDate;
    if (status === 'Pago') { dueDate = pastDate(90).split('T')[0]; payDate = pastDate(80).split('T')[0]; }
    else if (status === 'Pendente') { dueDate = new Date(Date.now() + rnd(1,30)*86400000).toISOString().split('T')[0]; payDate = null; }
    else if (status === 'Vencido') { dueDate = new Date(Date.now() - rnd(5,90)*86400000).toISOString().split('T')[0]; payDate = null; }
    else { dueDate = pastDate(60).split('T')[0]; payDate = null; }
    const amount = pick(baseVals[cat]);
    items.push({
      id: `FIN-${String(i+1).padStart(3,'0')}`,
      patientId: p.id, patientName: p.fullName, encounterId: enc?.id || null,
      category: cat, description: `${cat} - ${p.fullName.split(' ')[0]}`,
      amount, discount: 0, finalAmount: amount, status,
      paymentForm: status === 'Pago' ? pick(payForms) : null,
      healthPlan: p.healthPlan, dueDate, payDate,
      created_at: pastDate(120), updated_at: new Date().toISOString()
    });
  }
  return items;
}

function generateTvCalls(patients, count = 15) {
  return Array.from({length: count}, (_, i) => {
    const p = pick(patients); const mc = pickWeighted(MANCHESTER_COLORS, MANCHASTER_WEIGHTS);
    return {
      id: `TV-${String(i+1).padStart(3,'0')}`, patientName: p.fullName, patientId: p.id,
      roomName: pick(CONSULTÓRIOS), manchesterColor: mc, manchesterLabel: manchesterLabel(mc),
      calledBy: pick(['Dr. Carlos Eduardo Silva','Dra. Ana Maria Costa','Dr. João Pedro Santos','Recepção']),
      timestamp: new Date(Date.now() - i*rnd(3,12)*60000).toISOString(),
      created_at: new Date().toISOString()
    };
  });
}

function generateMedications() {
  const meds = [
    {name:'Dipirona 500mg',cat:'Analgésico',unit:'Comprimido',min:100},
    {name:'Paracetamol 750mg',cat:'Analgésico',unit:'Comprimido',min:100},
    {name:'Ibuprofeno 400mg',cat:'Anti-inflamatório',unit:'Comprimido',min:80},
    {name:'Amoxicilina 500mg',cat:'Antibiótico',unit:'Cápsula',min:60},
    {name:'Omeprazol 20mg',cat:'Gastroprotetor',unit:'Comprimido',min:80},
    {name:'Metformina 850mg',cat:'Antidiabético',unit:'Comprimido',min:60},
    {name:'Losartana 50mg',cat:'Anti-hipertensivo',unit:'Comprimido',min:60},
    {name:'Atenolol 25mg',cat:'Betabloqueador',unit:'Comprimido',min:50},
    {name:'Sinvastatina 20mg',cat:'Hipolipemiante',unit:'Comprimido',min:50},
    {name:'Soro Fisiológico 0,9% 500ml',cat:'Solução',unit:'Frasco',min:30},
    {name:'Soro Glicosado 5% 500ml',cat:'Solução',unit:'Frasco',min:30},
    {name:'Morfina 10mg/ml',cat:'Opioide',unit:'Ampola',min:20},
    {name:'Tramadol 50mg',cat:'Analgésico',unit:'Ampola',min:30},
    {name:'Furosemida 40mg',cat:'Diurético',unit:'Comprimido',min:40},
    {name:'Metoclopramida 10mg',cat:'Antiemético',unit:'Ampola',min:30},
    {name:'Dexametasona 4mg',cat:'Corticóide',unit:'Ampola',min:40},
    {name:'Adrenalina 1mg/ml',cat:'Emergência',unit:'Ampola',min:20},
    {name:'Diazepam 10mg',cat:'Ansiolítico',unit:'Comprimido',min:30},
    {name:'Cetirizina 10mg',cat:'Anti-histamínico',unit:'Comprimido',min:60},
    {name:'Azitromicina 500mg',cat:'Antibiótico',unit:'Comprimido',min:40},
    {name:'Prednisona 20mg',cat:'Corticóide',unit:'Comprimido',min:40},
    {name:'Insulina Regular 100UI/ml',cat:'Hormônio',unit:'Frasco',min:15},
    {name:'Heparina 5000UI/ml',cat:'Anticoagulante',unit:'Frasco',min:15},
    {name:'Vitamina C 1g',cat:'Suplemento',unit:'Comprimido',min:80},
    {name:'Ácido Fólico 5mg',cat:'Suplemento',unit:'Comprimido',min:60},
    {name:'Sulfato Ferroso 40mg',cat:'Suplemento',unit:'Comprimido',min:60},
    {name:'Clonazepam 2mg',cat:'Ansiolítico',unit:'Comprimido',min:30},
    {name:'Ondansetrona 8mg',cat:'Antiemético',unit:'Comprimido',min:40},
    {name:'Ranitidina 150mg',cat:'Antiácido',unit:'Comprimido',min:50},
    {name:'Omeprazol Injetável 40mg',cat:'Gastroprotetor',unit:'Ampola',min:25},
  ];
  return meds.map((m, i) => {
    const stock = rnd(0, 250);
    return {
      id: `MED-${String(i+1).padStart(3,'0')}`, name: m.name, category: m.cat, unit: m.unit,
      currentStock: stock, minStock: m.min, maxStock: m.min*5,
      status: stock === 0 ? 'Esgotado' : stock < m.min ? 'Estoque Baixo' : 'Normal',
      supplier: pick(['Distribuidora Pharma Plus','MedStock Brasil','FarmaCentral','Distribuidora União Saúde']),
      batch: `LOT-${rnd(10000,99999)}`,
      expiryDate: new Date(Date.now() + rnd(30,730)*86400000).toISOString().split('T')[0],
      unitCost: parseFloat((rnd(5,500) + Math.random()).toFixed(2)),
      location: pick(['Prateleira A1','Prateleira A2','Prateleira B1','Refrigerador 1','Cofre','Armário Controlado']),
      controlled: ['Morfina 10mg/ml','Diazepam 10mg','Clonazepam 2mg','Tramadol 50mg'].includes(m.name),
      created_at: new Date('2024-01-01').toISOString(), updated_at: new Date().toISOString()
    };
  });
}

function generateDutySchedules(doctors) {
  const today = new Date().toISOString().split('T')[0];
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
  const configs = [
    {d:doctors[0],date:today,shift:'Manhã',room:'Consultório 01'},
    {d:doctors[1],date:today,shift:'Manhã',room:'Consultório 02'},
    {d:doctors[2],date:today,shift:'Tarde',room:'Consultório 01'},
    {d:doctors[3],date:today,shift:'Tarde',room:'Consultório 03'},
    {d:doctors[4],date:today,shift:'Noite',room:'Sala de Emergência'},
    {d:doctors[5],date:today,shift:'Plantão 24h',room:'Sala de Procedimentos'},
    {d:doctors[6],date:tomorrow,shift:'Manhã',room:'Consultório 02'},
    {d:doctors[7],date:tomorrow,shift:'Tarde',room:'Consultório 04'},
    {d:doctors[8],date:tomorrow,shift:'Noite',room:'Sala de Emergência'},
    {d:doctors[9],date:tomorrow,shift:'Plantão 24h',room:'Consultório 05'},
  ];
  return configs.map((c, i) => ({
    id: `DS-${String(i+1).padStart(3,'0')}`,
    doctorId: c.d.id, doctorName: c.d.name, specialty: c.d.specialty,
    shiftDate: c.date, shiftType: c.shift, roomName: c.room,
    created_at: new Date().toISOString(), updated_at: new Date().toISOString()
  }));
}

// ── EXECUÇÃO ──
console.log('\n🏥 Health Nexus — Gerador de Simulação Completa\n');

const patients = generatePatients(80);
console.log(`✅ ${patients.length} pacientes gerados`);

const doctors = generateDoctors();
console.log(`✅ ${doctors.length} médicos gerados`);

const appointments = generateAppointments(patients, doctors, 60);
console.log(`✅ ${appointments.length} agendamentos gerados`);

const {encounters, triages} = generateEncountersAndTriages(patients, doctors, 45);
console.log(`✅ ${encounters.length} atendimentos | ${triages.length} triagens geradas`);

const beds = generateBeds(encounters);
const occupied = beds.filter(b => b.status === 'Ocupado').length;
console.log(`✅ ${occupied}/${beds.length} leitos ocupados`);

const financial_installments = generateFinancial(patients, encounters, 90);
const paid = financial_installments.filter(f => f.status === 'Pago').length;
const pending = financial_installments.filter(f => f.status === 'Pendente').length;
const overdue = financial_installments.filter(f => f.status === 'Vencido').length;
console.log(`✅ ${financial_installments.length} títulos financeiros (${paid} pagos, ${pending} pendentes, ${overdue} vencidos)`);

const tv_calls = generateTvCalls(patients, 15);
console.log(`✅ ${tv_calls.length} chamadas TV geradas`);

const medications = generateMedications();
const lowStock = medications.filter(m => m.status !== 'Normal').length;
console.log(`✅ ${medications.length} medicamentos (${lowStock} com alerta de estoque)`);

const duty_schedules = generateDutySchedules(doctors);
console.log(`✅ ${duty_schedules.length} escalas de plantão geradas`);

const users = [
  { id: 'USR-ADMIN', name: 'Administrador Hospitalar', username: 'admin', role: 'Administrador', status: 'Ativo', created_at: new Date().toISOString() },
  { id: 'USR-MAZZAROWYSK', name: 'Dr. Marcelo Mazarowysk', username: 'mazzarowysk', role: 'Master', status: 'Ativo', created_at: new Date().toISOString() }
];

const db = {
  users, patients, doctors, appointments, encounters, triages,
  beds, financial_installments, tv_calls, medications, duty_schedules
};

// Salvar como JSON
writeFileSync('./simulation_output.json', JSON.stringify(db, null, 2));
console.log('\n📦 Arquivo "simulation_output.json" gerado com sucesso!');

// Gerar script de importação para o console do browser
const importScript = `
// Cole este script no console do browser (F12 > Console) enquanto o Health Nexus estiver aberto
localStorage.setItem('oczOnlineDados', ${JSON.stringify(JSON.stringify(db))});
localStorage.setItem('oczOnlineUpdatedAt', '${Date.now()}');
console.log('✅ Banco de dados simulado com sucesso! Recarregando...');
setTimeout(() => window.location.reload(), 1000);
`;

writeFileSync('./import_to_browser.js', importScript);
console.log('📋 Script "import_to_browser.js" gerado!');
console.log('\n📌 Para importar: Abra o Health Nexus no browser, pressione F12,');
console.log('   vá para a aba Console e cole o conteúdo de "import_to_browser.js"\n');

console.log('\n📊 RESUMO FINAL:');
console.log(`  Pacientes:         ${patients.length}`);
console.log(`  Médicos:           ${doctors.length}`);
console.log(`  Agendamentos:      ${appointments.length}`);
console.log(`  Atendimentos:      ${encounters.length}`);
console.log(`  Triagens:          ${triages.length}`);
console.log(`  Leitos:            ${beds.length} (${occupied} ocupados)`);
console.log(`  Financeiro:        ${financial_installments.length} títulos`);
console.log(`  TV Calls:          ${tv_calls.length}`);
console.log(`  Medicamentos:      ${medications.length}`);
console.log(`  Escalas Plantão:   ${duty_schedules.length}`);
console.log(`  Total de registros: ${Object.values(db).reduce((a,t) => a + (Array.isArray(t) ? t.length : 0), 0)}`);
