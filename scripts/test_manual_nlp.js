// Teste do Motor de PLN e Busca Semântica do Manual Interativo e Spotlight
import { searchManualEngine } from '../src/manualTabbed.js';
import { getNexusAICopilotResponse } from '../src/aiCopilot.js';

const testQueries = [
  'telemedicina',
  'teleconsulta',
  'videochamada',
  'ditado por voz',
  'voice-to-soap',
  'mews',
  'sepse',
  'interacoes medicamentosas',
  'whatsapp',
  'linha do cuidado',
  'excluir paciente',
  'cadastrar medico',
  'novo leito',
  'faturamento'
];

console.log('🧪 INICIANDO TESTES DE BUSCA E PLN DO MANUAL INTERATIVO:\n');

let passCount = 0;

testQueries.forEach(query => {
  const result = searchManualEngine(query);
  const copilot = getNexusAICopilotResponse(query, query);
  
  const hasButtons = result.buttonMatches && result.buttonMatches.length > 0;
  const copilotHasTarget = copilot && copilot.actionTarget && copilot.summary && !copilot.summary.includes('Analisei sua busca');

  console.log(`🔎 Termo: "${query}"`);
  console.log(`   - Botões encontrados: ${result.buttonMatches ? result.buttonMatches.length : 0}`);
  if (hasButtons) {
    console.log(`   - Top Match: "${result.buttonMatches[0].name}" (Score: ${result.buttonMatches[0]._score})`);
  }
  console.log(`   - IA Copilot: ${copilot.title} -> ${copilot.actionTarget} (${copilot.actionText})`);
  
  if (hasButtons || copilotHasTarget) {
    console.log(`   ✅ Status: SUCESSO (Indexado com PLN)\n`);
    passCount++;
  } else {
    console.log(`   ❌ Status: FALHA\n`);
  }
});

console.log(`📊 RESULTADO FINAL: ${passCount}/${testQueries.length} termos validados com sucesso.`);
if (passCount === testQueries.length) {
  console.log('🎉 TODOS OS TESTES DE PLN E BUSCA PASSARAM COM 100% DE SUCESSO!');
} else {
  process.exit(1);
}
