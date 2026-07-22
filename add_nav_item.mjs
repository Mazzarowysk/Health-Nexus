import { readFileSync, writeFileSync } from 'fs';

const filePath = 'c:/Health Nexus/src/main.js';
let content = readFileSync(filePath, 'utf8');

const target = 'data-tab="pacientes">\n                <i class="fa-solid fa-user-injured"></i>\n                <span>Pacientes</span>\n              </a>\n            </li>';
const targetCrLf = 'data-tab="pacientes">\r\n                <i class="fa-solid fa-user-injured"></i>\r\n                <span>Pacientes</span>\r\n              </a>\r\n            </li>';

const itemToAdd = `\n            <li>\n              <a class="nav-item \${state.activeTab === 'medicos' ? 'active' : ''}" data-tab="medicos">\n                <i class="fa-solid fa-user-doctor"></i>\n                <span>Corpo Clínico</span>\n              </a>\n            </li>`;

if (!content.includes('data-tab="medicos"')) {
  if (content.includes(targetCrLf)) {
    content = content.replace(targetCrLf, targetCrLf + itemToAdd.replace(/\n/g, '\r\n'));
  } else if (content.includes(target)) {
    content = content.replace(target, target + itemToAdd);
  } else {
    // Fallback: replace `<span>Pacientes</span>`
    content = content.replace('<span>Pacientes</span>\n              </a>\n            </li>', '<span>Pacientes</span>\n              </a>\n            </li>' + itemToAdd);
    content = content.replace('<span>Pacientes</span>\r\n              </a>\r\n            </li>', '<span>Pacientes</span>\r\n              </a>\r\n            </li>' + itemToAdd.replace(/\n/g, '\r\n'));
  }
}

writeFileSync(filePath, content, 'utf8');
console.log('✅ add_nav_item.mjs executado!');
