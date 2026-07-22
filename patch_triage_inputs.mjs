import { readFileSync, writeFileSync } from 'fs';

const filePath = 'c:/Health Nexus/src/main.js';
let content = readFileSync(filePath, 'utf8');

const targetOld = `        if (val.length <= 3) {
          e.target.value = val;
        } else {
          e.target.value = \`\${val.slice(0, 3)}/\${val.slice(3)}\`;
        }
      });
    }`;

const autoDecimalCode = `        if (val.length <= 3) {
          e.target.value = val;
        } else {
          e.target.value = \`\${val.slice(0, 3)}/\${val.slice(3)}\`;
        }
      });
    }

    const triageTempInput = document.getElementById('triage-temp');
    if (triageTempInput) {
      triageTempInput.type = 'text';
      triageTempInput.setAttribute('inputmode', 'decimal');
      
      triageTempInput.addEventListener('input', (e) => {
        let val = e.target.value;
        if (val.includes('.') || val.includes(',')) return;
        const digits = val.replace(/\\D/g, '');
        if (digits.length === 3) {
          e.target.value = (parseFloat(digits) / 10).toFixed(1);
        }
      });

      triageTempInput.addEventListener('blur', (e) => {
        let val = e.target.value.replace(',', '.');
        if (!val) return;
        let digits = val.replace(/\\D/g, '');
        if (!val.includes('.')) {
          if (digits.length === 3 || (parseFloat(digits) >= 300 && parseFloat(digits) <= 450)) {
            val = (parseFloat(digits) / 10).toFixed(1);
          }
        }
        e.target.value = val;
      });
    }

    const triagePesoInput = document.getElementById('triage-peso');
    if (triagePesoInput) {
      triagePesoInput.type = 'text';
      triagePesoInput.setAttribute('inputmode', 'decimal');

      triagePesoInput.addEventListener('input', (e) => {
        let val = e.target.value;
        if (val.includes('.') || val.includes(',')) return;
        const digits = val.replace(/\\D/g, '');
        if (digits.length === 3) {
          e.target.value = (parseFloat(digits) / 10).toFixed(1);
        } else if (digits.length === 5) {
          e.target.value = (parseFloat(digits) / 100).toFixed(2);
        }
      });

      triagePesoInput.addEventListener('blur', (e) => {
        let val = e.target.value.replace(',', '.');
        if (!val) return;
        let digits = val.replace(/\\D/g, '');
        if (!val.includes('.')) {
          if (digits.length === 3) {
            val = (parseFloat(digits) / 10).toFixed(1);
          } else if (digits.length === 4) {
            val = (parseFloat(digits) / 10).toFixed(1);
          } else if (digits.length >= 5) {
            val = (parseFloat(digits) / 100).toFixed(2);
          }
        }
        e.target.value = val;
      });
    }`;

const idx = content.indexOf('triagePaInput.addEventListener');
if (idx !== -1) {
  const closeIdx = content.indexOf('});\n    }', idx);
  if (closeIdx !== -1) {
    const patchPos = closeIdx + '});\n    }'.length;
    const before = content.slice(0, patchPos);
    const after = content.slice(patchPos);
    
    const extraCode = `

    const triageTempInput = document.getElementById('triage-temp');
    if (triageTempInput) {
      triageTempInput.type = 'text';
      triageTempInput.setAttribute('inputmode', 'decimal');
      
      triageTempInput.addEventListener('input', (e) => {
        let val = e.target.value;
        if (val.includes('.') || val.includes(',')) return;
        const digits = val.replace(/\\D/g, '');
        if (digits.length === 3) {
          e.target.value = (parseFloat(digits) / 10).toFixed(1);
        }
      });

      triageTempInput.addEventListener('blur', (e) => {
        let val = e.target.value.replace(',', '.');
        if (!val) return;
        let digits = val.replace(/\\D/g, '');
        if (!val.includes('.')) {
          if (digits.length === 3 || (parseFloat(digits) >= 300 && parseFloat(digits) <= 450)) {
            val = (parseFloat(digits) / 10).toFixed(1);
          }
        }
        e.target.value = val;
      });
    }

    const triagePesoInput = document.getElementById('triage-peso');
    if (triagePesoInput) {
      triagePesoInput.type = 'text';
      triagePesoInput.setAttribute('inputmode', 'decimal');

      triagePesoInput.addEventListener('input', (e) => {
        let val = e.target.value;
        if (val.includes('.') || val.includes(',')) return;
        const digits = val.replace(/\\D/g, '');
        if (digits.length === 3) {
          e.target.value = (parseFloat(digits) / 10).toFixed(1);
        } else if (digits.length === 5) {
          e.target.value = (parseFloat(digits) / 100).toFixed(2);
        }
      });

      triagePesoInput.addEventListener('blur', (e) => {
        let val = e.target.value.replace(',', '.');
        if (!val) return;
        let digits = val.replace(/\\D/g, '');
        if (!val.includes('.')) {
          if (digits.length === 3) {
            val = (parseFloat(digits) / 10).toFixed(1);
          } else if (digits.length === 4) {
            val = (parseFloat(digits) / 10).toFixed(1);
          } else if (digits.length >= 5) {
            val = (parseFloat(digits) / 100).toFixed(2);
          }
        }
        e.target.value = val;
      });
    }`;
    
    writeFileSync(filePath, before + extraCode + after, 'utf8');
    console.log('✅ Injetado com sucesso no ponto exato!');
  }
}
