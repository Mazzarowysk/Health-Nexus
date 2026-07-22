import { readFileSync, writeFileSync } from 'fs';

const filePath = 'c:/Health Nexus/src/main.js';
let content = readFileSync(filePath, 'utf8');

// 1. Tornar os KPI Cards do Dashboard Interativos (com onClick)
content = content.replace(
  `          <!-- Card Ocupação -->\n          <div class="kpi-card">\n            <div class="kpi-header">\n              <span>Pacientes Ativos</span>`,
  `          <!-- Card Ocupação -->\n          <div class="kpi-card interactive-card" onclick="switchTab('pacientes')" title="Clique para ver a lista de Pacientes">\n            <div class="kpi-header">\n              <span>Pacientes Ativos</span>`
);

content = content.replace(
  `          <!-- Card Atendimentos -->\n          <div class="kpi-card">\n            <div class="kpi-header">\n              <span>Tempo de Espera Triagem</span>`,
  `          <!-- Card Atendimentos -->\n          <div class="kpi-card interactive-card" onclick="switchTab('atendimento')" title="Clique para ir à Fila de Triagem">\n            <div class="kpi-header">\n              <span>Tempo de Espera Triagem</span>`
);

content = content.replace(
  `          <!-- Card Faturamento -->\n          <div class="kpi-card">\n            <div class="kpi-header">\n              <span>Receita do Mês (Particulares)</span>`,
  `          <!-- Card Faturamento -->\n          <div class="kpi-card interactive-card" onclick="switchTab('relatorios'); setTimeout(() => document.getElementById('tab-btn-financial')?.click(), 150);" title="Clique para ver o Relatório Financeiro">\n            <div class="kpi-header">\n              <span>Receita do Mês (Particulares)</span>`
);

// 2. Gráficos do Dashboard Interativos (com onClick)
if (content.includes('initDashboardCharts(data)')) {
  const chartClickTarget = `new Chart(occupancyCtx, {`;
  const chartClickReplacement = `occupancyCtx.style.cursor = 'pointer';
    new Chart(occupancyCtx, {`;
  content = content.replace(chartClickTarget, chartClickReplacement);

  const chartOptionsTarget = `options: {\n        responsive: true,\n        maintainAspectRatio: false,\n        plugins: {`;
  const chartOptionsReplacement = `options: {\n        responsive: true,\n        maintainAspectRatio: false,\n        onClick: () => switchTab('leitos'),\n        plugins: {`;
  content = content.replace(chartOptionsTarget, chartOptionsReplacement);

  const apptChartClickTarget = `new Chart(appointmentsCtx, {`;
  const apptChartClickReplacement = `appointmentsCtx.style.cursor = 'pointer';
    new Chart(appointmentsCtx, {`;
  content = content.replace(apptChartClickTarget, apptChartClickReplacement);
}

// 3. Atualizar Corpo Clínico KPI Cards com classe interactive-card e eventos
content = content.replace(
  `        <div style="background: var(--bg-secondary); border: 1px solid var(--border-color); border-radius: 12px; padding: 16px 20px; display: flex; align-items: center; gap: 16px;">\n          <div style="width: 44px; height: 44px; border-radius: 12px; background: rgba(139,92,246,0.12); border: 1px solid rgba(139,92,246,0.25); display: flex; align-items: center; justify-content: center; color: #a78bfa;">\n            <i class="fa-solid fa-user-doctor" style="font-size: 1.2rem;"></i>\n          </div>\n          <div>\n            <div style="font-size: 0.75rem; color: var(--text-muted); font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em;">Total de Médicos</div>`,
  `        <div class="interactive-card" id="kpi-doc-total" title="Clique para exibir todos os médicos" style="background: var(--bg-secondary); border: 1px solid var(--border-color); border-radius: 12px; padding: 16px 20px; display: flex; align-items: center; gap: 16px;">\n          <div style="width: 44px; height: 44px; border-radius: 12px; background: rgba(139,92,246,0.12); border: 1px solid rgba(139,92,246,0.25); display: flex; align-items: center; justify-content: center; color: #a78bfa;">\n            <i class="fa-solid fa-user-doctor" style="font-size: 1.2rem;"></i>\n          </div>\n          <div>\n            <div style="font-size: 0.75rem; color: var(--text-muted); font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em;">Total de Médicos</div>`
);

content = content.replace(
  `        <div style="background: var(--bg-secondary); border: 1px solid var(--border-color); border-radius: 12px; padding: 16px 20px; display: flex; align-items: center; gap: 16px;">\n          <div style="width: 44px; height: 44px; border-radius: 12px; background: rgba(16,185,129,0.12); border: 1px solid rgba(16,185,129,0.25); display: flex; align-items: center; justify-content: center; color: #34d399;">\n            <i class="fa-solid fa-user-check" style="font-size: 1.2rem;"></i>\n          </div>\n          <div>\n            <div style="font-size: 0.75rem; color: var(--text-muted); font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em;">Médicos Ativos</div>`,
  `        <div class="interactive-card" id="kpi-doc-active" title="Clique para buscar médicos ativos" style="background: var(--bg-secondary); border: 1px solid var(--border-color); border-radius: 12px; padding: 16px 20px; display: flex; align-items: center; gap: 16px;">\n          <div style="width: 44px; height: 44px; border-radius: 12px; background: rgba(16,185,129,0.12); border: 1px solid rgba(16,185,129,0.25); display: flex; align-items: center; justify-content: center; color: #34d399;">\n            <i class="fa-solid fa-user-check" style="font-size: 1.2rem;"></i>\n          </div>\n          <div>\n            <div style="font-size: 0.75rem; color: var(--text-muted); font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em;">Médicos Ativos</div>`
);

content = content.replace(
  `        <div style="background: var(--bg-secondary); border: 1px solid var(--border-color); border-radius: 12px; padding: 16px 20px; display: flex; align-items: center; gap: 16px;">\n          <div style="width: 44px; height: 44px; border-radius: 12px; background: rgba(34,211,238,0.12); border: 1px solid rgba(34,211,238,0.25); display: flex; align-items: center; justify-content: center; color: #67e8f9;">\n            <i class="fa-solid fa-stethoscope" style="font-size: 1.2rem;"></i>\n          </div>\n          <div>\n            <div style="font-size: 0.75rem; color: var(--text-muted); font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em;">Especialidades</div>`,
  `        <div class="interactive-card" id="kpi-doc-specs" title="Clique para ver resumo por Especialidade" style="background: var(--bg-secondary); border: 1px solid var(--border-color); border-radius: 12px; padding: 16px 20px; display: flex; align-items: center; gap: 16px;">\n          <div style="width: 44px; height: 44px; border-radius: 12px; background: rgba(34,211,238,0.12); border: 1px solid rgba(34,211,238,0.25); display: flex; align-items: center; justify-content: center; color: #67e8f9;">\n            <i class="fa-solid fa-stethoscope" style="font-size: 1.2rem;"></i>\n          </div>\n          <div>\n            <div style="font-size: 0.75rem; color: var(--text-muted); font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em;">Especialidades</div>`
);

// Adicionar ouvintes para os KPIs do Corpo Clínico
if (content.includes("document.getElementById('filter-doctor-search').addEventListener('input', () => renderTable(allDoctorsCache));")) {
  const targetListener = "document.getElementById('filter-doctor-search').addEventListener('input', () => renderTable(allDoctorsCache));";
  const replacementListener = `document.getElementById('filter-doctor-search').addEventListener('input', () => renderTable(allDoctorsCache));

  document.getElementById('kpi-doc-total')?.addEventListener('click', () => {
    const input = document.getElementById('filter-doctor-search');
    if (input) { input.value = ''; renderTable(allDoctorsCache); }
  });

  document.getElementById('kpi-doc-active')?.addEventListener('click', () => {
    const input = document.getElementById('filter-doctor-search');
    if (input) { input.value = ''; renderTable(allDoctorsCache); }
  });

  document.getElementById('kpi-doc-specs')?.addEventListener('click', () => {
    const specsMap = {};
    allDoctorsCache.forEach(d => { specsMap[d.specialty] = (specsMap[d.specialty] || 0) + 1; });
    const list = Object.entries(specsMap).map(([s, c]) => \`• \${s}: \${c} médico(s)\`).join('\\n');
    alert('Resumo de Especialidades no Corpo Clínico:\\n\\n' + (list || 'Nenhuma especialidade cadastrada.'));
  });`;

  content = content.replace(targetListener, replacementListener);
}

writeFileSync(filePath, content, 'utf8');
console.log('✅ Interatividade aplicada com sucesso em main.js!');
