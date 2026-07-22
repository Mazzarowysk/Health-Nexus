import { readFileSync } from 'fs';

try {
  const css = readFileSync('c:/Health Nexus/src/styles.css', 'utf8');
  let openBrackets = 0;
  let lines = css.split('\n');
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    for (let char of line) {
      if (char === '{') openBrackets++;
      if (char === '}') openBrackets--;
    }
    if (openBrackets < 0) {
      console.error(`Erro de fechamento de chave extra '}' na linha ${i + 1}`);
      break;
    }
  }

  if (openBrackets !== 0) {
    console.error(`Erro de chaves desbalanceadas! Saldo final de '{': ${openBrackets}`);
  } else {
    console.log('✅ Nível de chaves { } está totalmente balanceado!');
  }
} catch (e) {
  console.error(e);
}
