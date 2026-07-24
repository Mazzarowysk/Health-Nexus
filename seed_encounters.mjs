/**
 * seed_encounters.mjs
 * Cria atendimentos de teste no banco local para testar o Kanban
 * Uso: node seed_encounters.mjs
 */
import http from 'http';

const PORT = 3001;
const BASE = `http://127.0.0.1:${PORT}`;

function request(method, path, body, token) {
  return new Promise((res, rej) => {
    const data = body ? JSON.stringify(body) : null;
    const headers = { 'Content-Type': 'application/json', 'Content-Length': data ? Buffer.byteLength(data) : 0 };
    if (token) headers['Authorization'] = 'Bearer ' + token;
    const req = http.request({ hostname: '127.0.0.1', port: PORT, path, method, headers }, r => {
      let d = ''; r.on('data', c => d += c); r.on('end', () => { try { res(JSON.parse(d)); } catch { res(d); } });
    });
    req.on('error', rej);
    if (data) req.write(data);
    req.end();
  });
}

async function main() {
  console.log('🔑 Fazendo login...');
  const login = await request('POST', '/api/auth/login', { username: 'admin', password: 'admin' });
  if (!login.token) { console.error('❌ Login falhou:', login.message); process.exit(1); }
  const token = login.token;
  console.log('✅ Login OK como:', login.user?.name || login.user?.username);

  console.log('\n👥 Buscando pacientes...');
  const patients = await request('GET', '/api/patients', null, token);
  if (!Array.isArray(patients) || patients.length === 0) { console.error('❌ Nenhum paciente encontrado'); process.exit(1); }
  console.log(`✅ ${patients.length} pacientes encontrados`);

  // Selecionar 6 pacientes para os cenários
  const picks = patients.slice(0, 6);

  // Cenários de teste
  const scenarios = [
    // Aguardando Triagem (urgência)
    { patient: picks[0], type: 'Urgencia', phase: 'triage' },
    { patient: picks[1], type: 'Urgencia', phase: 'triage' },
    // Aguardando Médico (pós-triagem) - vários Manchesters
    { patient: picks[2], type: 'Urgencia', phase: 'waiting', manchester: 'Vermelho', pa: '160/100', temp: '38.9', fc: 110, queixa: 'Dor torácica intensa com irradiação para o braço' },
    { patient: picks[3], type: 'Urgencia', phase: 'waiting', manchester: 'Amarelo', pa: '130/85', temp: '37.5', fc: 92, queixa: 'Dor abdominal há 3 horas, náuseas' },
    { patient: picks[4], type: 'Ambulatorial', phase: 'waiting', manchester: 'Verde', pa: '120/80', temp: '36.8', fc: 78, queixa: 'Consulta de rotina — acompanhamento hipertensão' },
    // Em Atendimento
    { patient: picks[5], type: 'Urgencia', phase: 'active', manchester: 'Laranja', pa: '145/95', temp: '38.2', fc: 105, queixa: 'Febre há 2 dias, tosse seca e dispneia leve' },
  ];

  console.log('\n🏥 Criando atendimentos de teste...\n');

  for (const s of scenarios) {
    process.stdout.write(`  → ${s.patient.fullName} (${s.type}, fase: ${s.phase})... `);
    
    // 1. Admitir
    const enc = await request('POST', '/api/encounters', { patientId: s.patient.id, type: s.type }, token);
    if (!enc.id) { console.log('❌ Falhou:', enc.message); continue; }
    
    if (s.phase === 'triage') {
      console.log(`✅ Aguardando Triagem`);
      continue;
    }

    // 2. Fazer triagem (para ir para fila médica ou ativo)
    const triage = await request('POST', `/api/encounters/${enc.id}/triage`, {
      manchesterColor: s.manchester,
      bloodPressure: s.pa,
      temperatureCelsius: s.temp,
      heartRateBpm: s.fc,
      weightKg: '70',
      complaints: s.queixa
    }, token);
    
    if (s.phase === 'waiting') {
      console.log(`✅ Aguardando Médico [${s.manchester}]`);
      continue;
    }

    // 3. Chamar para atendimento ativo
    await request('PUT', `/api/encounters/${enc.id}/status`, { status: 'Em_Atendimento' }, token);
    console.log(`✅ Em Atendimento [${s.manchester}]`);
  }

  // Resumo final
  console.log('\n📊 Verificando resultado...');
  const final = await request('GET', '/api/encounters', null, token);
  if (Array.isArray(final)) {
    const byStatus = {};
    final.forEach(e => { byStatus[e.status] = (byStatus[e.status]||0)+1; });
    console.log('\n=== KANBAN ATUAL ===');
    console.log(`🟣 Aguardando Triagem:  ${byStatus['Aguardando_Triagem'] || 0}`);
    console.log(`🟡 Aguardando Médico:   ${byStatus['Aguardando_Atendimento'] || 0}`);
    console.log(`🟢 Em Atendimento:      ${byStatus['Em_Atendimento'] || 0}`);
    console.log(`⚪ Finalizados:         ${byStatus['Finalizado'] || 0}`);
    console.log('\n✅ Seed concluído! Atualize a aba Atendimentos no navegador.');
  }
}

main().catch(err => { console.error('❌ Erro inesperado:', err.message); process.exit(1); });
