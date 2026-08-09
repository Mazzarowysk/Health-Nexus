const fs = require('fs');
const path = 'src/tabs/reports.js';
let content = fs.readFileSync(path, 'utf8');

// Fix the missing quote in style attribute
content = content.replace(
    /padding: 14px 16px; title="Indicador de Saldo Líquido">/,
    'padding: 14px 16px;" title="Indicador de Saldo Líquido">'
);

fs.writeFileSync(path, content, 'utf8');
console.log("Fixed missing quote!");
