import { generateSHA256Hash, signDocumentICP, DIGITAL_CERT_PROVIDERS } from '../src/modules/digitalCert.js';
import { generateTISS401XML, calculateMD5, TUSS_PROCEDURES } from '../src/modules/tiss.js';
import { searchManualEngine } from '../src/manualTabbed.js';
import { getNexusAICopilotResponse } from '../src/aiCopilot.js';
import fs from 'fs';

console.log('🧪 ========================================================');
console.log('🧪 TESTE AUTOMATIZADO: HEALTH NEXUS v2.9.0 NOOK & CRANNY');
console.log('🧪 ========================================================\n');

let passCount = 0;
let failCount = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✅ [PASS] ${message}`);
    passCount++;
  } else {
    console.error(`  ❌ [FAIL] ${message}`);
    failCount++;
  }
}

// ── TESTE 1: MÓDULO DE ASSINATURA DIGITAL ICP-BRASIL ───────────
console.log('🔐 [1/4] Testando Módulo de Assinatura Digital ICP-Brasil:');
assert(DIGITAL_CERT_PROVIDERS.length >= 5, `Possui ${DIGITAL_CERT_PROVIDERS.length} provedores configurados (BirdID, NeoID, Certisign, VIDaaS, A1).`);

async function testSign() {
  const sig = await signDocumentICP({
    documentType: 'PEP_SOAP',
    documentId: 'ENC-2026-9988',
    patientName: 'Marcelo Mazaro',
    patientCpf: '123.456.789-00',
    doctorName: 'Dr. Lucas Silva',
    doctorCrm: '45892',
    doctorUf: 'SP',
    providerId: 'birdid',
    otpOrPin: '123456'
  });

  assert(sig.signed === true, 'Documento marcado como assinado com sucesso.');
  assert(sig.providerName.includes('BirdID'), 'Provedor BirdID identificado.');
  assert(sig.hashSHA256 && sig.hashSHA256.length === 64, `Hash SHA-256 gerado com 64 caracteres hex: ${sig.hashSHA256.substring(0, 12)}...`);
  assert(sig.verificationCode && sig.verificationCode.length >= 16, `Código de validação ITI gerado: ${sig.verificationCode}`);
  assert(sig.validationUrl.includes('validar.iti.gov.br'), 'URL de validação pública ITI gerada corretamente.');
}

// ── TESTE 2: MÓDULO DE FATURAMENTO TISS 4.01 XML (ANS) ─────────
console.log('\n📑 [2/4] Testando Geração e Validação de Lote TISS 4.01.00 (ANS):');
assert(TUSS_PROCEDURES.length >= 6, `Tabela TUSS embarcada com ${TUSS_PROCEDURES.length} procedimentos clínicos.`);

const testEncounters = [
  { patientName: 'Carlos Eduardo', susNumber: '111222333444555', doctorName: 'Dra. Beatriz Santos', doctorCrm: '99881', manchesterColor: 'AMARELO', cid: 'I10' },
  { patientName: 'Ana Paula Lima', cpf: '987.654.321-11', doctorName: 'Dr. Roberto Mendes', doctorCrm: '77665', manchesterColor: 'VERMELHO', cid: 'J06.9' }
];

const tiss = generateTISS401XML({
  numeroLote: '9901',
  registroANS: '359012',
  cnpjPrestador: '12345678000199',
  cnesHospital: '7654321',
  nomeHospital: 'Hospital & Maternidade Health Nexus',
  atendimentos: testEncounters
});

assert(tiss.xml.includes('<ans:Padrao>4.01.00</ans:Padrao>'), 'Padrão TISS 4.01.00 declarado no cabeçalho.');
assert(tiss.xml.includes('<ans:tipoTransacao>ENVIO_LOTE_GUIAS</ans:tipoTransacao>'), 'Tipo de transação ENVIO_LOTE_GUIAS presente.');
assert(tiss.xml.includes('<ans:numeroLote>9901</ans:numeroLote>'), 'Número do lote correto.');
assert(tiss.xml.includes('<ans:codigoProcedimento>10101012</ans:codigoProcedimento>'), 'Procedimento TUSS de consulta ambulatorial incluído.');
assert(tiss.xml.includes('<ans:codigoProcedimento>10101039</ans:codigoProcedimento>'), 'Procedimento TUSS de consulta urgência/emergência incluído.');
assert(tiss.xml.includes('<ans:epilogo>'), 'Epílogo com tag de integridade presente.');
assert(tiss.hashMD5 && tiss.hashMD5.length === 32, `Hash MD5 do lote calculado: ${tiss.hashMD5}`);
assert(tiss.totalGuias === 2, 'Total de 2 guias contabilizadas no lote.');
assert(tiss.valorTotal === 370.00, 'Valor financeiro total do lote apurado: R$ 370,00.');

// ── TESTE 3: SERVICE WORKER & MANIFEST PWA ───────────────────────
console.log('\n📲 [3/4] Testando Arquivos PWA & Service Worker:');
assert(fs.existsSync('public/sw.js'), 'Arquivo public/sw.js (Service Worker) existe.');
const swContent = fs.readFileSync('public/sw.js', 'utf8');
assert(swContent.includes('health-nexus-v2.9.0'), 'Cache versionado v2.9.0 no Service Worker.');
assert(swContent.includes('push'), 'Handler de push notifications configurado no Service Worker.');

assert(fs.existsSync('public/manifest.webmanifest'), 'Arquivo public/manifest.webmanifest existe.');
const manifest = JSON.parse(fs.readFileSync('public/manifest.webmanifest', 'utf8'));
assert(manifest.display === 'standalone', 'PWA configurado em modo standalone.');
assert(manifest.theme_color === '#0284c7', 'Cor de tema configurada corretamente.');

// ── TESTE 4: BUSCA SEMÂNTICA & PLN PARA AS NOVAS FUNCIONALIDADES ─
console.log('\n🔎 [4/4] Testando Indexação Semântica & PLN:');

const testTerms = [
  { term: 'icp-brasil', expectedMod: 'atendimento' },
  { term: 'assinatura digital', expectedMod: 'atendimento' },
  { term: 'birdid', expectedMod: 'atendimento' },
  { term: 'tiss', expectedMod: 'relatorios' },
  { term: 'xml', expectedMod: 'relatorios' },
  { term: 'guia tiss', expectedMod: 'relatorios' },
  { term: 'pwa', expectedMod: 'pwa' },
  { term: 'notificacao push', expectedMod: 'pwa' },
  { term: 'sobreaviso', expectedMod: 'pwa' }
];

testTerms.forEach(({ term, expectedMod }) => {
  const res = searchManualEngine(term, 'Master');
  const copilot = getNexusAICopilotResponse(term.toLowerCase(), term);
  const foundCards = res ? res.buttonMatches.length : 0;
  const topMatch = res && res.buttonMatches[0] ? (res.buttonMatches[0].btn ? res.buttonMatches[0].btn.name : (res.buttonMatches[0].item ? res.buttonMatches[0].item.name : 'Match')) : 'Nenhum';
  const topScore = res && res.buttonMatches[0] ? res.buttonMatches[0].score : 0;

  assert(foundCards > 0 || copilot.actionTarget === expectedMod, `Termo "${term}": Top match "${topMatch}" (Score: ${topScore}), Copilot -> ${copilot.actionTarget}`);
});

(async () => {
  await testSign();
  console.log('\n========================================================');
  console.log(`📊 RESULTADO DOS TESTES: ${passCount} APROVADOS, ${failCount} FALHAS`);
  console.log('========================================================');
  if (failCount === 0) {
    console.log('🎉 TODOS OS TESTES DA VERSÃO 2.9.0 PASSARAM COM 100% DE SUCESSO!\n');
  } else {
    process.exit(1);
  }
})();
