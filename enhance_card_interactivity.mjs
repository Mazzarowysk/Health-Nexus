import { readFileSync, writeFileSync } from 'fs';

const filePath = 'c:/Health Nexus/src/main.js';
let content = readFileSync(filePath, 'utf8');

// Adicionar helper global window.handleCardClick
if (!content.includes('window.handleCardClick')) {
  const globalHelper = `
window.handleCardClick = function(tabName, reportType, message) {
  const existingToast = document.querySelector('.interactive-toast');
  if (existingToast) existingToast.remove();

  const toast = document.createElement('div');
  toast.className = 'interactive-toast';
  toast.innerHTML = \`<i class="fa-solid fa-bolt" style="color:#a855f7;font-size:1.1rem;"></i> <span>\${message || ('Acessando ' + tabName)}</span>\`;
  toast.style.cssText = 'position:fixed;bottom:28px;right:28px;background:linear-gradient(135deg, #1e1b4b, #311b92);color:#ffffff;padding:14px 22px;border-radius:14px;border:1px solid #8b5cf6;box-shadow:0 12px 35px rgba(139,92,246,0.45);font-family:Outfit,sans-serif;font-weight:600;font-size:0.9rem;z-index:999999;transition:all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);display:flex;align-items:center;gap:12px;';
  document.body.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(12px)';
    setTimeout(() => toast.remove(), 300);
  }, 2200);

  switchTab(tabName);
  if (tabName === 'relatorios' && reportType) {
    setTimeout(() => {
      const btn = document.getElementById(reportType);
      if (btn) btn.click();
    }, 150);
  }
};
`;
  content = globalHelper + content;
}

// Substituir onclicks no Dashboard por handleCardClick
content = content.replace(
  `onclick="switchTab('pacientes')"`,
  `onclick="handleCardClick('pacientes', null, 'Atalho: Abrindo lista de Pacientes Ativos')"`
);

content = content.replace(
  `onclick="switchTab('atendimento')"`,
  `onclick="handleCardClick('atendimento', null, 'Atalho: Acessando Fila de Triagem')"`
);

content = content.replace(
  `onclick="switchTab('relatorios'); setTimeout(() => document.getElementById('tab-btn-financial')?.click(), 150);"`,
  `onclick="handleCardClick('relatorios', 'tab-btn-financial', 'Atalho: Gerando Relatório Financeiro')"`
);

// Atualizar o onClick dos gráficos para usar o toast feedback
content = content.replace(
  `onClick: () => switchTab('leitos')`,
  `onClick: () => handleCardClick('leitos', null, 'Atalho: Redirecionando para Mapa de Leitos')`
);

writeFileSync(filePath, content, 'utf8');
console.log('✅ Interatividade avançada com feedback visual aplicada em main.js!');
