const fs = require('fs');
let html = fs.readFileSync('public/manual_do_usuario.html', 'utf8');
html = html.replace(
  'Utilize o botão <strong>"Consulta ANVISA / Bula"</strong> para buscar',
  'Ao cadastrar um novo medicamento, digite no campo de <strong>"Buscar na Base de Medicamentos"</strong> para ter o auto-completar e buscar em tempo real os'
);
fs.writeFileSync('public/manual_do_usuario.html', html, 'utf8');

// Also update root manual.html if it exists
if (fs.existsSync('manual_do_usuario.html')) {
  let rootHtml = fs.readFileSync('manual_do_usuario.html', 'utf8');
  rootHtml = rootHtml.replace(
    'Utilize o botão <strong>"Consulta ANVISA / Bula"</strong> para buscar',
    'Ao cadastrar um novo medicamento, digite no campo de <strong>"Buscar na Base de Medicamentos"</strong> para ter o auto-completar e buscar em tempo real os'
  );
  fs.writeFileSync('manual_do_usuario.html', rootHtml, 'utf8');
}

// And check MANUAL_DO_USUARIO_HEALTH_NEXUS.md
if (fs.existsSync('MANUAL_DO_USUARIO_HEALTH_NEXUS.md')) {
  let md = fs.readFileSync('MANUAL_DO_USUARIO_HEALTH_NEXUS.md', 'utf16le');
  md = md.replace(
    'Utilize o botão **"Consulta ANVISA / Bula"** para buscar',
    'Ao cadastrar um novo medicamento, digite no campo de **"Buscar na Base de Medicamentos"** para ter o auto-completar e buscar em tempo real os'
  );
  fs.writeFileSync('MANUAL_DO_USUARIO_HEALTH_NEXUS.md', md, 'utf16le');
}
