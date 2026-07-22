/**
 * apply_all_reports_features.mjs
 * Aplica TODAS as melhorias do módulo de Relatórios e PDF de prontuário.
 * Estratégia: inserção precisa usando indexOf com strings únicas.
 */
import { readFileSync, writeFileSync } from 'fs';

const PATH = 'c:/Health Nexus/src/main.js';
let src = readFileSync(PATH, 'utf8');
let patches = 0;
let errors = 0;

function apply(description, searchStr, replacement, allowDuplicate = false) {
  if (!allowDuplicate && src.includes(replacement.slice(0, 40))) {
    console.log(`[SKIP] ${description} — já existe`);
    return;
  }
  const idx = src.indexOf(searchStr);
  if (idx === -1) {
    console.error(`[ERROR] ${description} — string não encontrada`);
    errors++;
    return;
  }
  src = src.slice(0, idx) + replacement + src.slice(idx + searchStr.length);
  console.log(`[OK] ${description}`);
  patches++;
}

// ====================================================
// 1. Adicionar aba "Por Médico" no seletor HTML
// ====================================================
apply(
  'Aba Por Médico no seletor',
  `        <button id="tab-btn-financial" class="report-tab-btn">
          <i class="fa-solid fa-chart-pie"></i> Relatório Financeiro
        </button>
      </div>`,
  `        <button id="tab-btn-financial" class="report-tab-btn">
          <i class="fa-solid fa-chart-pie"></i> Relatório Financeiro
        </button>
        <button id="tab-btn-doctors" class="report-tab-btn">
          <i class="fa-solid fa-user-doctor"></i> Por Médico
        </button>
      </div>`
);

// ====================================================
// 2. Declarar variável btnDoctorsTab
// ====================================================
apply(
  'Declarar btnDoctorsTab',
  `  const btnFinancialTab = document.getElementById('tab-btn-financial');
  const filtersContainer = document.getElementById('filters-container');`,
  `  const btnFinancialTab = document.getElementById('tab-btn-financial');
  const btnDoctorsTab = document.getElementById('tab-btn-doctors');
  const filtersContainer = document.getElementById('filters-container');`
);

// ====================================================
// 3. Adicionar listener da aba "Por Médico" após o listener de financeiro
// ====================================================
apply(
  'Listener da aba Por Médico',
  `  btnFinancialTab.addEventListener('click', () => {
    activeTab = 'financial';
    btnFinancialTab.classList.add('active');
    btnPatientsTab.classList.remove('active');
    btnEncountersTab.classList.remove('active');
    renderFilters();
  });`,
  `  btnFinancialTab.addEventListener('click', () => {
    activeTab = 'financial';
    btnFinancialTab.classList.add('active');
    btnPatientsTab.classList.remove('active');
    btnEncountersTab.classList.remove('active');
    if (btnDoctorsTab) btnDoctorsTab.classList.remove('active');
    renderFilters();
  });

  if (btnDoctorsTab) {
    btnDoctorsTab.addEventListener('click', () => {
      activeTab = 'doctors';
      btnDoctorsTab.classList.add('active');
      btnPatientsTab.classList.remove('active');
      btnEncountersTab.classList.remove('active');
      btnFinancialTab.classList.remove('active');
      renderFilters();
    });
  }`
);

// ====================================================
// 4. Adicionar filtros da aba 'doctors' em renderFilters
// ====================================================
apply(
  'Filtros da aba doctors em renderFilters',
  `    } else if (activeTab === 'financial') {
      filtersContainer.innerHTML = \`
        <div class="filters-grid">
          <div class="filter-group">
            <label>Vencimento Inicial</label>`,
  `    } else if (activeTab === 'doctors') {
      filtersContainer.innerHTML = \`
        <div class="filters-grid">
          <div class="filter-group">
            <label>Período Inicial</label>
            <input type="date" id="filter-date-start">
          </div>
          <div class="filter-group">
            <label>Período Final</label>
            <input type="date" id="filter-date-end">
          </div>
        </div>
      \`;
    } else if (activeTab === 'financial') {
      filtersContainer.innerHTML = \`
        <div class="filters-grid">
          <div class="filter-group">
            <label>Vencimento Inicial</label>`
);

// ====================================================
// 5. Delegar aba 'doctors' no filterAndRender
// ====================================================
apply(
  'Delegação renderDoctorReport em filterAndRender',
  `  const filterAndRender = () => {
    if (activeTab === 'financial') {`,
  `  const filterAndRender = () => {
    if (activeTab === 'doctors') {
      renderDoctorReport();
      return;
    }
    if (activeTab === 'financial') {`
);

// ====================================================
// 6. Inserir renderDoctorReport antes de loadData
// ====================================================
const renderDoctorReportFn = `  // -------------------------------------------------------
  // RELATÓRIO POR MÉDICO
  // -------------------------------------------------------
  const renderDoctorReport = async () => {
    const previewCard = document.querySelector('.preview-card');
    if (!previewCard) return;
    previewCard.innerHTML = \`
      <div class="preview-header" style="margin-bottom:0;">
        <h3><i class="fa-solid fa-user-doctor" style="color:var(--color-primary);"></i> Relatório de Atividades por Médico</h3>
      </div>
      <div style="text-align:center;padding:30px;color:var(--text-muted);">
        <i class="fa-solid fa-spinner fa-spin" style="font-size:1.5rem;color:#818cf8;"></i>
        <div style="margin-top:8px;">Carregando dados dos médicos...</div>
      </div>
    \`;
    try {
      const [resDoc, resAppts] = await Promise.all([
        apiFetch(\`\${API_URL}/doctors\`),
        apiFetch(\`\${API_URL}/appointments\`)
      ]);
      const docs = resDoc.ok ? (await resDoc.json()) : [];
      const apptRaw = resAppts.ok ? (await resAppts.json()) : [];
      const apptList = Array.isArray(apptRaw) ? apptRaw : (apptRaw.data || []);
      const docList = Array.isArray(docs) ? docs : (docs.data || []);
      const todayStr = new Date().toISOString().split('T')[0];
      const docStats = docList.map(doc => {
        const name = doc.name || '';
        const cleanName = name.replace(/^(Dr\\.|Dra\\.)\\s*/i, '');
        const myAppts = apptList.filter(a => (a.doctorName||'').includes(name)||(a.doctorName||'').includes(cleanName));
        const today = myAppts.filter(a => a.appointmentDate === todayStr).length;
        const done = myAppts.filter(a => a.status === 'Concluído').length;
        const inProgress = myAppts.filter(a => a.status === 'Em Atendimento').length;
        return { name: doc.name, crm: doc.crm, specialty: doc.specialty, status: doc.status, total: myAppts.length, today, done, inProgress };
      });
      const totalAppts = docStats.reduce((s,d)=>s+d.total,0);
      const totalDone = docStats.reduce((s,d)=>s+d.done,0);
      const totalInProgress = docStats.reduce((s,d)=>s+d.inProgress,0);
      const ativos = docStats.filter(d=>d.status==='Ativo').length;
      const rows = docStats.map(d=>[d.name, d.specialty||'—', d.crm||'—', d.status||'—', d.total, d.today, d.inProgress, d.done]);
      previewCard.innerHTML = \`
        <div class="preview-header" style="flex-wrap:wrap;gap:10px;">
          <h3><i class="fa-solid fa-user-doctor" style="color:var(--color-primary);"></i> Relatório de Atividades por Médico</h3>
          <div style="display:flex;gap:8px;margin-left:auto;">
            <button id="btn-doc-export-pdf" class="btn btn-primary" style="background:#dc2626;font-size:0.82rem;"><i class="fa-solid fa-file-pdf"></i> Exportar PDF</button>
            <button id="btn-doc-export-csv" class="btn btn-outline" style="font-size:0.82rem;"><i class="fa-solid fa-file-csv"></i> Exportar CSV</button>
          </div>
        </div>
        <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin:16px 0;">
          \${ [
            {val:ativos,       label:'Médicos Ativos',     color:'#818cf8'},
            {val:totalAppts,   label:'Total Agendamentos', color:'#38bdf8'},
            {val:totalInProgress,label:'Em Atendimento',   color:'#fbbf24'},
            {val:totalDone,    label:'Concluídos',          color:'#34d399'}
          ].map(k=>\`<div style="background:var(--bg-tertiary);border-radius:10px;padding:14px;text-align:center;border:1px solid var(--border-color);">
            <div style="font-size:1.6rem;font-weight:800;color:\${k.color};">\${k.val}</div>
            <div style="font-size:0.72rem;color:var(--text-muted);margin-top:2px;">\${k.label}</div>
          </div>\`).join('') }
        </div>
        <div style="border-radius:12px;overflow:hidden;border:1px solid var(--border-color);">
          <table style="width:100%;border-collapse:collapse;">
            <thead>
              <tr style="background:var(--bg-tertiary);border-bottom:1px solid var(--border-color);">
                \${ ['Médico','Especialidade','Status','Total','Hoje','Em Atend.','Concluídos'].map(h=>\`<th style="padding:11px 14px;font-size:0.73rem;color:var(--text-muted);text-transform:uppercase;">\${h}</th>\`).join('') }
              </tr>
            </thead>
            <tbody>
              \${docStats.map(d=>\`
                <tr style="border-bottom:1px solid var(--border-color);">
                  <td style="padding:12px 14px;">
                    <div style="font-weight:600;color:var(--text-primary);font-size:0.88rem;">\${d.name}</div>
                    <div style="font-size:0.74rem;color:var(--text-muted);">CRM: \${d.crm||'—'}</div>
                  </td>
                  <td style="padding:12px 14px;font-size:0.84rem;color:var(--text-secondary);">\${d.specialty||'—'}</td>
                  <td style="padding:12px 14px;text-align:center;">
                    <span style="display:inline-block;padding:3px 10px;border-radius:20px;font-size:0.74rem;font-weight:600;background:\${d.status==='Ativo'?'rgba(52,211,153,0.15)':'rgba(248,113,113,0.15)'};color:\${d.status==='Ativo'?'#34d399':'#f87171'};">\${d.status||'—'}</span>
                  </td>
                  <td style="padding:12px 14px;text-align:center;font-weight:700;color:#818cf8;">\${d.total}</td>
                  <td style="padding:12px 14px;text-align:center;color:#38bdf8;font-weight:600;">\${d.today}</td>
                  <td style="padding:12px 14px;text-align:center;color:#fbbf24;font-weight:600;">\${d.inProgress}</td>
                  <td style="padding:12px 14px;text-align:center;color:#34d399;font-weight:600;">\${d.done}</td>
                </tr>
              \`).join('')}
            </tbody>
          </table>
        </div>
        <div style="margin-top:8px;font-size:0.75rem;color:var(--text-muted);text-align:right;">\${docList.length} médico(s) • Gerado em \${new Date().toLocaleString('pt-BR')}</div>
      \`;
      document.getElementById('btn-doc-export-pdf')?.addEventListener('click', async ()=>{
        const ts = new Date().toISOString().slice(0,10);
        await exportToPDF(['Médico','Especialidade','CRM','Status','Total','Hoje','Em Atend.','Concluídos'], rows, 'Relatório de Atividades por Médico', \`relatorio_medicos_\${ts}\`);
      });
      document.getElementById('btn-doc-export-csv')?.addEventListener('click', ()=>{
        const ts = new Date().toISOString().slice(0,10);
        exportToCSV(['Médico','Especialidade','CRM','Status','Total','Hoje','Em Atend.','Concluídos'], rows, \`relatorio_medicos_\${ts}\`);
      });
    } catch(err) {
      console.error('[DoctorReport]', err);
      const pc = document.querySelector('.preview-card');
      if (pc) pc.innerHTML = '<div style="padding:40px;text-align:center;color:var(--color-danger);"><i class="fa-solid fa-triangle-exclamation"></i> Erro ao carregar relatório de médicos.</div>';
    }
  };

`;

apply(
  'Inserir renderDoctorReport antes de loadData',
  `  const loadData = async () => {
    try {
      previewStatus.textContent = 'Buscando dados...';`,
  renderDoctorReportFn + `  const loadData = async () => {
    try {
      previewStatus.textContent = 'Buscando dados...';`
);

// ====================================================
// 7. generatePatientPDF global — inserir após exportToCSV
// ====================================================
const generatePatientPDFFn = `
// =========================================================
// GERAR PDF DO PRONTUÁRIO DO PACIENTE
// =========================================================
window.generatePatientPDF = async function(patientId, patientName) {
  if (!window.jspdf) {
    showToast('⚠️ Biblioteca PDF não carregada. Aguarde e tente novamente.');
    return;
  }

  showToast('📄 Gerando prontuário PDF...');

  try {
    const res = await apiFetch(\`\${API_URL}/patients/\${patientId}/history\`);
    if (!res.ok) throw new Error('Falha ao buscar dados do paciente');
    const data = (await res.json()).data || {};

    const patient = data.patient || {};
    const encounters = data.encounters || [];
    const appointments = data.appointments || [];

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

    const BRAND = '#6366f1';
    const DARK = '#1e1e2e';
    const GRAY = '#64748b';
    const LIGHT_GRAY = '#f1f5f9';

    const loadLogo = () => new Promise(resolve => {
      const img = new Image();
      img.src = '/assets/logo.png';
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
    });

    const logoImg = await loadLogo();

    // ---- HEADER ----
    doc.setFillColor(99, 102, 241); // indigo
    doc.rect(0, 0, 210, 28, 'F');

    if (logoImg) {
      doc.addImage(logoImg, 'PNG', 8, 5, 18, 18);
    }
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('HEALTH NEXUS', 30, 13);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text('Sistema de Gestão Hospitalar', 30, 19);

    doc.setFontSize(9);
    doc.text(\`Emitido em: \${new Date().toLocaleString('pt-BR')}\`, 140, 13);
    doc.text('PRONTUÁRIO MÉDICO — CONFIDENCIAL', 140, 19);

    // ---- DADOS DO PACIENTE ----
    let y = 36;
    doc.setFillColor(241, 245, 249);
    doc.roundedRect(10, y - 4, 190, 44, 3, 3, 'F');
    doc.setDrawColor(200, 200, 220);
    doc.roundedRect(10, y - 4, 190, 44, 3, 3, 'S');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(99, 102, 241);
    doc.text('IDENTIFICAÇÃO DO PACIENTE', 14, y + 2);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(30, 30, 50);

    const birthDate = patient.birthDate ? new Date(patient.birthDate + 'T12:00:00').toLocaleDateString('pt-BR') : '—';
    doc.text(\`Nome Completo: \${patient.fullName || '—'}\`, 14, y + 10);
    doc.text(\`CPF: \${patient.cpf || '—'}\`, 14, y + 17);
    doc.text(\`Data de Nascimento: \${birthDate}\`, 14, y + 24);
    doc.text(\`Cidade: \${patient.city || '—'}\`, 14, y + 31);
    doc.text(\`Telefone: \${patient.phone || patient.cellphone || '—'}\`, 105, y + 10);
    doc.text(\`Endereço: \${patient.address || '—'}\`, 105, y + 17);
    doc.text(\`Faturamento: \${patient.billingValue || '—'}\`, 105, y + 24);
    doc.text(\`Nº Prontuário: #\${patientId.substring(0, 8).toUpperCase()}\`, 105, y + 31);

    y += 52;

    // ---- HISTÓRICO DE ATENDIMENTOS ----
    if (encounters.length > 0) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(99, 102, 241);
      doc.text('HISTÓRICO DE ATENDIMENTOS', 14, y);
      y += 6;

      const encCols = ['Data / Hora', 'Tipo', 'Status', 'Classificação', 'Queixas'];
      const encRows = encounters.slice(0, 20).map(e => {
        const dateStr = e.admitted_at ? new Date(e.admitted_at).toLocaleString('pt-BR') : '—';
        const typeStr = e.type === 'Urgencia' ? 'Urgência' : (e.type || '—');
        const statusMap = { Aguardando_Triagem:'Ag. Triagem', Aguardando_Atendimento:'Ag. Atendimento', Em_Atendimento:'Em Consulta', Finalizado:'Finalizado' };
        return [
          dateStr,
          typeStr,
          statusMap[e.status] || e.status || '—',
          e.manchesterColor || '—',
          (e.complaints || '—').substring(0, 40)
        ];
      });

      doc.autoTable({
        startY: y,
        head: [encCols],
        body: encRows,
        theme: 'grid',
        styles: { fontSize: 8, cellPadding: 3 },
        headStyles: { fillColor: [99, 102, 241], textColor: 255, fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        margin: { left: 10, right: 10 }
      });
      y = doc.lastAutoTable.finalY + 8;
    }

    // ---- NOTAS CLÍNICAS SOAP ----
    const encWithNotes = encounters.filter(e => e.subjectiveContent || e.objectiveContent || e.assessmentContent || e.planContent);
    if (encWithNotes.length > 0) {
      if (y > 240) { doc.addPage(); y = 20; }

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(99, 102, 241);
      doc.text('NOTAS CLÍNICAS (SOAP)', 14, y);
      y += 6;

      encWithNotes.slice(0, 5).forEach(e => {
        if (y > 250) { doc.addPage(); y = 20; }

        const dateStr = e.admitted_at ? new Date(e.admitted_at).toLocaleDateString('pt-BR') : '—';
        doc.setFillColor(241, 245, 249);
        doc.roundedRect(10, y - 3, 190, 6, 2, 2, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.setTextColor(30, 30, 50);
        doc.text(\`Atendimento: \${dateStr} — Classificação: \${e.manchesterColor || '—'}\`, 14, y + 1);
        y += 9;

        const soapData = [
          ['Subjetivo (S)', e.subjectiveContent || '—'],
          ['Objetivo (O)', e.objectiveContent || '—'],
          ['Avaliação (A)', e.assessmentContent || '—'],
          ['Plano (P)', e.planContent || '—']
        ].filter(([, v]) => v !== '—');

        if (soapData.length > 0) {
          doc.autoTable({
            startY: y,
            head: [['Campo', 'Conteúdo']],
            body: soapData,
            theme: 'grid',
            styles: { fontSize: 8, cellPadding: 3 },
            headStyles: { fillColor: [139, 92, 246], textColor: 255, fontStyle: 'bold' },
            columnStyles: { 0: { cellWidth: 35, fontStyle: 'bold' }, 1: { cellWidth: 155 } },
            alternateRowStyles: { fillColor: [248, 250, 252] },
            margin: { left: 10, right: 10 }
          });
          y = doc.lastAutoTable.finalY + 6;
        }
      });
    }

    // ---- AGENDAMENTOS ----
    if (appointments.length > 0) {
      if (y > 230) { doc.addPage(); y = 20; }
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(99, 102, 241);
      doc.text('AGENDAMENTOS', 14, y);
      y += 6;

      doc.autoTable({
        startY: y,
        head: [['Data', 'Horário', 'Médico', 'Especialidade', 'Status']],
        body: appointments.slice(0, 15).map(a => [
          a.appointmentDate ? new Date(a.appointmentDate + 'T12:00:00').toLocaleDateString('pt-BR') : '—',
          a.appointmentTime || '—',
          a.doctorName || '—',
          a.specialty || '—',
          a.status || '—'
        ]),
        theme: 'grid',
        styles: { fontSize: 8, cellPadding: 3 },
        headStyles: { fillColor: [16, 185, 129], textColor: 255, fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        margin: { left: 10, right: 10 }
      });
    }

    // ---- RODAPÉ EM TODAS AS PÁGINAS ----
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text('CONFIDENCIAL — Uso exclusivo de profissionais de saúde autorizados', 14, 289);
      doc.text(\`Página \${i} de \${pageCount}\`, 180, 289);
      doc.setDrawColor(200, 200, 220);
      doc.line(10, 285, 200, 285);
    }

    const safeName = (patient.fullName || patientName || 'paciente').replace(/[^a-zA-Z0-9]/g, '_').substring(0, 30);
    const ts = new Date().toISOString().slice(0, 10);
    doc.save(\`prontuario_\${safeName}_\${ts}.pdf\`);
    showToast('✅ Prontuário gerado com sucesso!');

  } catch (err) {
    console.error('[generatePatientPDF]', err);
    showToast('❌ Erro ao gerar o prontuário PDF.');
  }
};

`;

apply(
  'Inserir generatePatientPDF após exportToCSV',
  `function exportToCSV(columns, rows, filename) {
  const csvContent = [
    columns.join(','),
    ...rows.map(e => e.map(cell => \`"\${String(cell).replace(/"/g, '""')}"\`).join(','))
  ].join('\\n');

  // Adiciona BOM para UTF-8 (corrige acentuação no Excel)
  const blob = new Blob(['\\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.setAttribute("href", url);
  link.setAttribute("download", \`\${filename}.csv\`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}`,
  `function exportToCSV(columns, rows, filename) {
  const csvContent = [
    columns.join(','),
    ...rows.map(e => e.map(cell => \`"\${String(cell).replace(/"/g, '""')}"\`).join(','))
  ].join('\\n');

  // Adiciona BOM para UTF-8 (corrige acentuação no Excel)
  const blob = new Blob(['\\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.setAttribute("href", url);
  link.setAttribute("download", \`\${filename}.csv\`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}` + generatePatientPDFFn
);

// ====================================================
// 8. Adicionar botão "Prontuário PDF" na tabela de pacientes
// ====================================================
apply(
  'Botão Prontuário PDF na tabela de pacientes',
  `<button onclick="window.openPatientHistory && window.openPatientHistory('${p.id}', '${p.fullName}')" title="Histórico"`,
  `<button onclick="window.generatePatientPDF('${p.id}', '${p.fullName}')" title="Gerar Prontuário PDF" style="padding:5px 10px;border-radius:7px;border:1px solid rgba(99,102,241,0.3);background:rgba(99,102,241,0.12);color:#818cf8;font-size:0.75rem;font-weight:600;cursor:pointer;display:inline-flex;align-items:center;gap:4px;" onmouseenter="this.style.background='rgba(99,102,241,0.22)'" onmouseleave="this.style.background='rgba(99,102,241,0.12)'"><i class="fa-solid fa-file-pdf"></i> PDF</button>
<button onclick="window.openPatientHistory && window.openPatientHistory('${p.id}', '${p.fullName}')" title="Histórico"`
);

writeFileSync(PATH, src, 'utf8');

console.log(`\n========================================`);
console.log(`Patches aplicados: ${patches}`);
console.log(`Erros: ${errors}`);
if (errors > 0) {
  console.log('⚠ Alguns patches falharam. Verifique manualmente.');
  process.exit(1);
}
