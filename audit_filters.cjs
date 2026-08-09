const fs = require('fs');
const files = ['kanban.js','leitos.js','stagnation.js','tv.js','consultingRooms.js'];
files.forEach(f => {
  const path = 'src/tabs/' + f;
  if(!fs.existsSync(path)) return;
  const c = fs.readFileSync(path, 'utf8');
  const inputMatches = c.match(/input[^>]*type="text"[^>]*/gi) || [];
  const idMatches = c.match(/id="[^"]*(?:filter|search|busca)[^"]*"/gi) || [];
  const placeholderMatches = c.match(/placeholder="[^"]*(?:filtrar|buscar|pesquisar|busca|search)[^"]*"/gi) || [];
  console.log('=== ' + f);
  inputMatches.slice(0,3).forEach(m => console.log('  INPUT:', m.substring(0,100)));
  idMatches.slice(0,5).forEach(m => console.log('  ID:', m));
  placeholderMatches.slice(0,5).forEach(m => console.log('  PLACEHOLDER:', m));
  console.log('  Has Limpar btn:', c.includes('filter-circle-xmark'));
  console.log('');
});
