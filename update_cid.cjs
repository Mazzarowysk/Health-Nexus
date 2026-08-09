const fs = require('fs');
let content = fs.readFileSync('MANUAL_DO_USUARIO_HEALTH_NEXUS.md', 'utf8');

const targetStr = 'Estrutura SOAP & Autocomplete CID-10';
const insertion = '\n\n> ℹ️ **Nota de Atualização:** O Autocomplete de CID-10 foi otimizado para lidar com grandes volumes de dados (2.5MB), exibindo agora um indicador visual ("Carregando banco de dados CID-10...") até estar pronto para uso, e garantindo codificação UTF-8 rigorosa para prevenir quebras de acentuação.';

if (content.includes(targetStr)) {
  content = content.replace(targetStr, targetStr + insertion);
  fs.writeFileSync('MANUAL_DO_USUARIO_HEALTH_NEXUS.md', content, 'utf8');
  console.log('Markdown updated successfully (CID-10 note).');
} else {
  console.log('Target string CID-10 not found!');
}
