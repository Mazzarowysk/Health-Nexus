const fs = require('fs');
const path = require('path');

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
  'Ã§': 'ç',
  'ðŸ“Š': '📊',
  'ðŸ• ': '🕒',
  'ðŸ•': '🕒',
  'ðŸ †': '🏆',
  'ðŸš«': '🚫',
  'ðŸ“ˆ': '📈',
  'ðŸ ¥': '🏥',
  'ðŸš¨': '🚨',
  'âœ…': '✅',
  'â —': '❗',
  'âš–ï¸ ': '⚖️',
  'Â©': '©',
  'â€¢': '•',
  'âˆ’': '−'
};

function walkDir(dir) {
    let files = [];
    fs.readdirSync(dir).forEach(f => {
        let dirPath = path.join(dir, f);
        if (fs.statSync(dirPath).isDirectory()) {
            files = files.concat(walkDir(dirPath));
        } else {
            if (dirPath.endsWith('.js') || dirPath.endsWith('.html')) {
                files.push(dirPath);
            }
        }
    });
    return files;
}

const files = walkDir('src');

for (let file of files) {
    let content = fs.readFileSync(file, 'utf8');
    let original = content;
    for (let bad in replacements) {
        content = content.split(bad).join(replacements[bad]);
    }
    // Específico para tratar casos que sobraram do espaço diferente ou outros encodings:
    content = content.replace(/ðŸ ¥/g, '🏥'); // emoji hospital

    if (content !== original) {
        fs.writeFileSync(file, content, 'utf8');
        console.log('Fixed encoding issues in: ' + file);
    }
}
console.log('Done replacing garbled strings');
