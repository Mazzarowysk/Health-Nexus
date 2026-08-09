const fs = require('fs');
const path = 'src/tabs/reports.js';
let content = fs.readFileSync(path, 'utf8');

const anchor = '<!-- KPI CARDS RESUMO -->\r\n        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 12px; margin: 18px 0;">\r\n          <div class="fin-kpi-card" data-filter="Pagas"';

// Add the Visão Geral card
const visaoGeralCard = `          <div class="fin-kpi-card" data-filter="All" style="background: linear-gradient(135deg, rgba(255,255,255,0.1), rgba(255,255,255,0.02)); border: 1px solid rgba(255,255,255,0.2); border-radius: 14px; padding: 14px 16px; cursor: pointer; transition: all 0.2s ease;" onmouseover="this.style.transform='translateY(-2px)'" onmouseout="this.style.transform='translateY(0)'" title="Ver Todos os Títulos">\r\n            <div style="font-size: 0.7rem; color: #fff; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px;"><i class="fa-solid fa-list-ul"></i> Visão Geral</div>\r\n            <div style="font-family: \\'Outfit\\'; font-size: 1.3rem; font-weight: 800; color: #fff;">\${fmt(totalGeral)}</div>\r\n            <div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 2px;">\${installmentsList.length} parcelas no total</div>\r\n          </div>\r\n`;

content = content.replace(
    /<!-- KPI CARDS RESUMO -->\s*<div style="display: grid; grid-template-columns: repeat\(auto-fit, minmax\(160px, 1fr\)\); gap: 12px; margin: 18px 0;">\s*<div class="fin-kpi-card" data-filter="Pagas"/,
    `<!-- KPI CARDS RESUMO -->\r\n        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 12px; margin: 18px 0;">\r\n${visaoGeralCard}          <div class="fin-kpi-card" data-filter="Pagas"`
);

// Modify Saldo Liquido card
content = content.replace(
    /<div class="fin-kpi-card" data-filter="All" style="background: linear-gradient\(135deg, rgba\(52,211,153,0\.08\), rgba\(244,63,94,0\.08\)\);/,
    '<div style="background: linear-gradient(135deg, rgba(52,211,153,0.08), rgba(244,63,94,0.08));'
);
content = content.replace(
    /cursor: pointer; transition: all 0\.2s ease;" onmouseover="this\.style\.transform='translateY\(-2px\)'" onmouseout="this\.style\.transform='translateY\(0\)'" title="Ver Todos \(Saldo Líquido\)">/,
    'title="Indicador de Saldo Líquido">'
);

fs.writeFileSync(path, content, 'utf8');
console.log("Done updating cards!");
