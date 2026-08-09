const fs = require('fs');
const path = 'src/tabs/reports.js';
let content = fs.readFileSync(path, 'utf8');

// Remover o botao menor
const btnStr = '<button id="btn-open-fin-window-card" class="btn btn-primary" style="background: linear-gradient(135deg, #00f2fe, #4f46e5); font-size: 0.8rem;"><i class="fa-solid fa-window-restore"></i> Abrir Janela Dedicada</button>';
content = content.replace(btnStr, '');

// Remover o event listener
const listenerStr = "document.getElementById('btn-open-fin-window-card')?.addEventListener('click', openWindowHandler);";
content = content.replace(listenerStr, '');

fs.writeFileSync(path, content, 'utf8');
console.log('Botao removido com sucesso.');
