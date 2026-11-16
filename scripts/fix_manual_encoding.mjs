import fs from 'fs';

const raw = fs.readFileSync('MANUAL_DO_USUARIO_HEALTH_NEXUS.md', 'utf8');

const replacements = [
  ['Ã¡', 'á'], ['Ã©', 'é'], ['Ã­', 'í'], ['Ã³', 'ó'], ['Ãº', 'ú'],
  ['Ã£', 'ã'], ['Ãµ', 'õ'], ['Ã¢', 'â'], ['Ãª', 'ê'], ['Ã´', 'ô'],
  ['Ã§', 'ç'], ['Ã ', 'Á'], ['Ã‰', 'É'], ['Ã ', 'Í'], ['Ã“', 'Ó'],
  ['Ãš', 'Ú'], ['Ãƒ', 'Ã'], ['Ã•', 'Õ'], ['Ã‚', 'Â'], ['ÃŠ', 'Ê'],
  ['Ã”', 'Ô'], ['Ã‡', 'Ç'], ['â€”', '—'], ['â€“', '–'], ['â€œ', '“'],
  ['â€', '”'], ['â€¢', '•'], ['Â°', '°'], ['Âª', 'ª'], ['Âº', 'º'],
  ['Eletrnico', 'Eletrônico']
];

let fixed = raw;
for (const [k, v] of replacements) {
  fixed = fixed.replaceAll(k, v);
}

fs.writeFileSync('MANUAL_DO_USUARIO_HEALTH_NEXUS.md', fixed, 'utf8');
console.log('MANUAL_DO_USUARIO_HEALTH_NEXUS.md successfully fixed and decoded.');
