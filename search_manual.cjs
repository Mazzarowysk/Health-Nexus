const fs = require('fs');
const content = fs.readFileSync('MANUAL_DO_USUARIO_HEALTH_NEXUS.md', 'utf8');
const lines = content.split('\n');
const match1 = lines.findIndex(l => l.includes('id="sec-15"'));
if (match1 !== -1) {
  console.log(lines.slice(match1, match1 + 50).join('\n'));
}

const match2 = lines.findIndex(l => l.includes('Níveis de Acesso') || l.includes('Perfil') || l.includes('Desenvolvedor') && l.includes('Master'));
if (match2 !== -1) {
  console.log('--- Permissions Section ---');
  console.log(lines.slice(match2, match2 + 50).join('\n'));
}
