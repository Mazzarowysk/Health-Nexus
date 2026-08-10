const fs = require('fs');
let r = fs.readFileSync('README.md', 'utf8');

// Fix 1: Update infra table
r = r.replace(
  '| 🗄️ **Turso (LibSQL)** | ✅ Ativo | Banco de dados edge distribuído — Pacientes, Atendimentos, PEP |',
  `| 🗄️ **Turso (LibSQL)** | ✅ Ativo | Banco de dados edge distribuído — Pacientes, Atendimentos, PEP |
| 📊 **OpenFDA / ANVISA** | ✅ Ativo | Busca de medicamentos por nome genérico ou comercial — gratuito |
| 🧠 **CFM Portal** | ✅ Ativo | Verificação de CRM médico via portal oficial CFM |
| 📍 **ViaCEP** | ✅ Ativo | Autopreenchimento de endereço por CEP |
| 🏥 **CID-10** | ✅ Ativo | Base completa embarcada localmente (offline-first) |`
);

// Fix 2: Update RBAC roles list
r = r.replace(
  "Login com JWT e gestão de papéis: `Master`, `Médico`, `Enfermeiro`, `Recepcionista`.  \n   - Aprovação de todos os novos usuários pelo Master via Painel de Estagnação.\n   - Liberação automática de acesso através da Chave Master secreta.",
  "Login com JWT e gestão de papéis: `Master`, `Desenvolvedor`, `Administrador`, `Médico`, `Enfermeiro`, `Recepcionista`, `Farmacêutico`, `Financeiro`.  \n   - Aprovação de novos usuários pelo Master via Gestão de Usuários nas Configurações.\n   - Acesso restrito à aba Configurações: apenas **Master** (total) e **Desenvolvedor** (grupos técnicos)."
);

fs.writeFileSync('README.md', r, 'utf8');
console.log('README updated');

// Also check if changes applied
const updated = fs.readFileSync('README.md', 'utf8');
console.log('ANVISA in README:', updated.includes('OpenFDA'));
console.log('Desenvolvedor in README:', updated.includes('Desenvolvedor'));
