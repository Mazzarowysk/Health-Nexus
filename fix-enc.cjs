const fs = require('fs');
let content = fs.readFileSync('src/tabs/reports.js', 'utf8');
const replacements = {
  'MÃ©dico': 'Médico',
  'disponÃ­vel': 'disponível',
  'â‚‚': '₂',
  'clÃ­nica': 'clínica',
  'clÃnica': 'clínica',
  'mÃ©dico': 'médico',
  'UrgÃªncia': 'Urgência',
  'AmbulatÃ³rio': 'Ambulatório',
  'AvaliaÃ§Ã£o': 'Avaliação',
  'GestÃ£o': 'Gestão',
  'ConvÃªnio': 'Convênio',
  'Â°C': '°C',
  'â€”': '—',
  'â€¦': '…',
  'ðŸ‘¤': '👤',
  'ðŸ©º': '🩺',
  'ðŸ’¬': '💬',
  'ðŸ“‹': '📋',
  'âœ“': '✓',
  'serÃ¡': 'será',
  'Ã£o': 'ão',
  'Ã§': 'ç'
};

for (let bad in replacements) {
  content = content.split(bad).join(replacements[bad]);
}
fs.writeFileSync('src/tabs/reports.js', content, 'utf8');
console.log('Done replacing garbled strings');
