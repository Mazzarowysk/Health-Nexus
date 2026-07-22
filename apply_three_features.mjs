/**
 * apply_three_features.mjs
 * 1. Filtro por médico no relatório de atendimentos
 * 2. PDF de comprovante de agendamento
 * 3. Gráficos de produtividade na aba "Por Médico"
 */
import { readFileSync, writeFileSync } from 'fs';

const PATH = 'c:/Health Nexus/src/main.js';
let src = readFileSync(PATH, 'utf8');
let ok = 0; let fail = 0;

function patch(desc, search, replace) {
  if (src.includes(replace.substring(0, 50))) { console.log(`[SKIP] ${desc}`); return; }
  const i = src.indexOf(search);
  if (i === -1) { console.error(`[FAIL] ${desc} — NÃO ENCONTRADO`); fail++; return; }
  src = src.slice(0, i) + replace + src.slice(i + search.length);
  console.log(`[OK  ] ${desc}`); ok++;
}

// =====================================================================
// FEATURE 1 — FILTRO POR MÉDICO NO RELATÓRIO DE ATENDIMENTOS
// Adiciona um dropdown de médico ao filtro de encounters
// =====================================================================

// 1a. Adicionar filtro de médico ao HTML de filtros de encounters
patch(
  'Filtro médico: HTML no painel de encounters',
  `          <div class="filter-group">
            <label>Tipo de Atendimento</label>
            <div class="dropdown-check-list" id="dropdown-type">
              <div class="anchor" onclick="toggleFilterDropdown('dropdown-type', event)">Tipos: Todos</div>
              <ul class="items">
                <li>
                  <input type="checkbox" id="filter-type-all" checked>
                  <label for="filter-type-all"><strong>Selecionar Todos</strong></label>
                </li>
                <li>
                  <input type="checkbox" class="filter-type-item" value="Urgencia" id="filter-type-1" checked>
                  <label for="filter-type-1">Urgência</label>
                </li>
                <li>
                  <input type="checkbox" class="filter-type-item" value="Ambulatorio" id="filter-type-2" checked>
                  <label for="filter-type-2">Ambulatório</label>
                </li>
              </ul>
            </div>
          </div>
        </div>
      \`;
    } else if (activeTab === 'financial') {`,
  `          <div class="filter-group">
            <label>Tipo de Atendimento</label>
            <div class="dropdown-check-list" id="dropdown-type">
              <div class="anchor" onclick="toggleFilterDropdown('dropdown-type', event)">Tipos: Todos</div>
              <ul class="items">
                <li>
                  <input type="checkbox" id="filter-type-all" checked>
                  <label for="filter-type-all"><strong>Selecionar Todos</strong></label>
                </li>
                <li>
                  <input type="checkbox" class="filter-type-item" value="Urgencia" id="filter-type-1" checked>
                  <label for="filter-type-1">Urgência</label>
                </li>
                <li>
                  <input type="checkbox" class="filter-type-item" value="Ambulatorio" id="filter-type-2" checked>
                  <label for="filter-type-2">Ambulatório</label>
                </li>
              </ul>
            </div>
          </div>
          <div class="filter-group" style="min-width: 180px;">
            <label>Médico Responsável</label>
            <select id="filter-doctor-name" style="width:100%;padding:8px 12px;border-radius:8px;border:1px solid var(--border-color);background:var(--bg-tertiary);color:var(--text-primary);font-size:0.85rem;cursor:pointer;">
              <option value="">— Todos os Médicos —</option>
              \${[...new Set(encountersList.map(e => e.doctorName).filter(Boolean))].sort().map(d => \`<option value="\${d}">\${d}</option>\`).join('')}
            </select>
          </div>
        </div>
      \`;
    } else if (activeTab === 'financial') {`
);

// 1b. Usar o filtro de médico no filterAndRender de encounters
patch(
  'Filtro médico: aplicar na lógica de filtro',
  `        const checkedStatuses = Array.from(document.querySelectorAll('.filter-status-item:checked')).map(cb => cb.value);
      const checkedManchester = Array.from(document.querySelectorAll('.filter-manchester-item:checked')).map(cb => cb.value);
      const checkedTypes = Array.from(document.querySelectorAll('.filter-type-item:checked')).map(cb => cb.value);

      currentFilteredList = encountersList.filter(e => {`,
  `        const checkedStatuses = Array.from(document.querySelectorAll('.filter-status-item:checked')).map(cb => cb.value);
      const checkedManchester = Array.from(document.querySelectorAll('.filter-manchester-item:checked')).map(cb => cb.value);
      const checkedTypes = Array.from(document.querySelectorAll('.filter-type-item:checked')).map(cb => cb.value);
      const filterDoctor = (document.getElementById('filter-doctor-name') || {}).value || '';

      currentFilteredList = encountersList.filter(e => {`
);

patch(
  'Filtro médico: condição no filter de encounters',
  `        // Filtrar pelos tipos de atendimento
        if (!checkedTypes.includes(e.type)) return false;

        return true;
      });`,
  `        // Filtrar pelos tipos de atendimento
        if (!checkedTypes.includes(e.type)) return false;

        // Filtrar por médico responsável
        if (filterDoctor && (e.doctorName || '') !== filterDoctor) return false;

        return true;
      });`
);

// 1c. Vincular o select de médico ao filterAndRender
patch(
  'Filtro médico: listener do select',
  `      setupFilterGroupSelectAll('filter-type-all', 'filter-type-item', 'dropdown-type', 'Tipos');
    }
    // aba doctors não precisa de filtros de checkbox`,
  `      setupFilterGroupSelectAll('filter-type-all', 'filter-type-item', 'dropdown-type', 'Tipos');
      document.getElementById('filter-doctor-name')?.addEventListener('change', filterAndRender);
    }
    // aba doctors não precisa de filtros de checkbox`
);

// =====================================================================
// FEATURE 2 — PDF DE COMPROVANTE DE AGENDAMENTO (na agenda)
// Adicionar botão PDF ao card de agendamento concluído/confirmado
// =====================================================================
patch(
  'Comprovante PDF: botão no card de agendamento',
  `          <!-- AÇÕES DA CONSULTA -->
          <div style="display: flex; align-items: center; gap: 8px; flex-shrink: 0;">
            \${canAct ? confirmBtn + atenderBtn + cancelBtn : ''}
          </div>`,
  `          <!-- AÇÕES DA CONSULTA -->
          <div style="display: flex; align-items: center; gap: 8px; flex-shrink: 0; flex-wrap: wrap;">
            \${canAct ? confirmBtn + atenderBtn + cancelBtn : ''}
            <button onclick="window.generateAppointmentPDF('${apt.id}', '${(apt.patientName||'').replace(/'/g,"\\'")}', '${(apt.doctorName||'').replace(/'/g,"\\'")}', '${apt.appointmentDate||''}', '${apt.appointmentTime||''}', '${(apt.specialty||'').replace(/'/g,"\\'")}', '${(apt.status||'')}', \`${(apt.notes||'').replace(/`/g,'\\`')}\`)" title="Gerar Comprovante PDF" style="display:inline-flex;align-items:center;gap:5px;padding:8px 14px;border-radius:8px;border:1px solid rgba(239,68,68,0.3);background:rgba(239,68,68,0.08);color:#f87171;font-size:0.8rem;font-weight:600;cursor:pointer;transition:all 0.15s;" onmouseenter="this.style.background='rgba(239,68,68,0.2)'" onmouseleave="this.style.background='rgba(239,68,68,0.08)'">
              <i class="fa-solid fa-file-pdf"></i> Comprovante
            </button>
          </div>`
);

// =====================================================================
// FEATURE 2b — Função generateAppointmentPDF global
// =====================================================================
const apptPDFFn = `
// =========================================================
// GERAR PDF DE COMPROVANTE DE AGENDAMENTO
// =========================================================
window.generateAppointmentPDF = function(id, patientName, doctorName, date, time, specialty, status, notes) {
  if (!window.jspdf) { alert('⚠️ Biblioteca PDF não carregada.'); return; }
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  const loadLogo = () => new Promise(resolve => {
    const img = new Image(); img.src = '/assets/logo.png';
    img.onload = () => resolve(img); img.onerror = () => resolve(null);
  });

  loadLogo().then(logoImg => {
    // Header
    doc.setFillColor(99, 102, 241);
    doc.rect(0, 0, 210, 28, 'F');
    if (logoImg) doc.addImage(logoImg, 'PNG', 8, 5, 18, 18);
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16); doc.setFont('helvetica', 'bold');
    doc.text('HEALTH NEXUS', 30, 13);
    doc.setFontSize(9); doc.setFont('helvetica', 'normal');
    doc.text('Sistema de Gestão Hospitalar', 30, 19);
    doc.text('COMPROVANTE DE AGENDAMENTO', 140, 13);
    doc.text(\`Emitido em: \${new Date().toLocaleString('pt-BR')}\`, 140, 19);

    // Título central
    doc.setTextColor(30, 30, 50);
    doc.setFontSize(18); doc.setFont('helvetica', 'bold');
    doc.text('COMPROVANTE DE CONSULTA', 105, 44, { align: 'center' });
    doc.setDrawColor(99, 102, 241); doc.setLineWidth(0.5);
    doc.line(20, 47, 190, 47);

    // Número do comprovante
    doc.setFontSize(10); doc.setFont('helvetica', 'normal'); doc.setTextColor(100, 100, 120);
    doc.text(\`Nº: \${id.substring(0,8).toUpperCase()}\`, 105, 53, { align: 'center' });

    // Box de dados
    let y = 62;
    const addRow = (label, value, bold = false) => {
      doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(99, 102, 241);
      doc.text(label, 20, y);
      doc.setFont('helvetica', bold ? 'bold' : 'normal'); doc.setTextColor(30, 30, 50);
      doc.setFontSize(11);
      doc.text(value || '—', 20, y + 6);
      y += 16;
    };

    doc.setFillColor(248, 250, 252); doc.roundedRect(15, y - 6, 180, 108, 3, 3, 'F');
    doc.setDrawColor(200, 210, 230); doc.roundedRect(15, y - 6, 180, 108, 3, 3, 'S');

    addRow('PACIENTE', patientName, true);
    addRow('MÉDICO RESPONSÁVEL', doctorName);
    addRow('ESPECIALIDADE', specialty);
    const fmtDate = date ? new Date(date + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' }) : '—';
    addRow('DATA DA CONSULTA', fmtDate);
    addRow('HORÁRIO', time || '—');
    addRow('STATUS', status || 'Agendado');

    if (notes) {
      y += 4;
      doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(99, 102, 241);
      doc.text('OBSERVAÇÕES', 20, y);
      doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(60, 60, 80);
      const splitNotes = doc.splitTextToSize(notes, 160);
      doc.text(splitNotes, 20, y + 6);
    }

    // QR / rodapé
    y = 200;
    doc.setFillColor(241, 245, 249); doc.roundedRect(15, y, 180, 30, 3, 3, 'F');
    doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.setTextColor(99, 102, 241);
    doc.text('⚕ Informações Importantes', 105, y + 8, { align: 'center' });
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); doc.setTextColor(80, 80, 100);
    doc.text('• Chegue com 15 minutos de antecedência', 105, y + 15, { align: 'center' });
    doc.text('• Traga documentos pessoais e cartão de plano de saúde', 105, y + 21, { align: 'center' });

    // Footer
    doc.setFontSize(8); doc.setTextColor(160, 160, 160);
    doc.line(10, 283, 200, 283);
    doc.text('Health Nexus — Sistema de Gestão Hospitalar | Documento gerado eletronicamente', 105, 288, { align: 'center' });

    const safeName = (patientName||'paciente').replace(/[^a-zA-Z0-9]/g,'_').substring(0,25);
    doc.save(\`comprovante_\${safeName}_\${date||'sem-data'}.pdf\`);
  });
};

`;

patch(
  'Inserir generateAppointmentPDF após generatePatientPDF',
  `// --- ABA AGENDA MÉDICA ---
async function renderAgendaTab() {`,
  apptPDFFn + `// --- ABA AGENDA MÉDICA ---
async function renderAgendaTab() {`
);

// =====================================================================
// FEATURE 3 — GRÁFICOS DE PRODUTIVIDADE NA ABA "POR MÉDICO"
// Adicionar dois gráficos Chart.js antes da tabela
// =====================================================================
patch(
  'Gráficos de produtividade: inserir canvas + dados Chart.js',
  `      document.getElementById('btn-doc-export-pdf')?.addEventListener('click', async () => {`,
  `      // ----- GRÁFICOS DE PRODUTIVIDADE -----
      setTimeout(() => {
        // Gráfico de barras: agendamentos por médico
        const ctxBar = document.getElementById('chart-doc-productivity');
        if (ctxBar && window.Chart) {
          if (ctxBar._chartInstance) ctxBar._chartInstance.destroy();
          const labels = docStats.map(d => d.name.replace(/^(Dr\\.|Dra\\.)\\s*/i, '').split(' ')[0]);
          const inst = new window.Chart(ctxBar.getContext('2d'), {
            type: 'bar',
            data: {
              labels,
              datasets: [
                { label: 'Concluídos', data: docStats.map(d => d.done), backgroundColor: 'rgba(52,211,153,0.7)', borderRadius: 6 },
                { label: 'Em Atend.', data: docStats.map(d => d.inProgress), backgroundColor: 'rgba(251,191,36,0.7)', borderRadius: 6 },
                { label: 'Pendentes', data: docStats.map(d => Math.max(0, d.total - d.done - d.inProgress)), backgroundColor: 'rgba(129,140,248,0.7)', borderRadius: 6 }
              ]
            },
            options: {
              responsive: true, maintainAspectRatio: false,
              plugins: { legend: { labels: { color: '#94a3b8', font: { size: 11 } } }, title: { display: true, text: 'Agendamentos por Médico', color: '#e2e8f0', font: { size: 13, weight: '600' } } },
              scales: {
                x: { stacked: true, ticks: { color: '#94a3b8' }, grid: { color: 'rgba(255,255,255,0.05)' } },
                y: { stacked: true, ticks: { color: '#94a3b8' }, grid: { color: 'rgba(255,255,255,0.05)' } }
              }
            }
          });
          ctxBar._chartInstance = inst;
        }
        // Gráfico de rosca: taxa de conclusão geral
        const ctxDoughnut = document.getElementById('chart-doc-completion');
        if (ctxDoughnut && window.Chart) {
          if (ctxDoughnut._chartInstance) ctxDoughnut._chartInstance.destroy();
          const inst2 = new window.Chart(ctxDoughnut.getContext('2d'), {
            type: 'doughnut',
            data: {
              labels: ['Concluídos', 'Em Atendimento', 'Pendentes'],
              datasets: [{ data: [totalDone, totalInProgress, Math.max(0, totalAppts - totalDone - totalInProgress)], backgroundColor: ['rgba(52,211,153,0.85)', 'rgba(251,191,36,0.85)', 'rgba(129,140,248,0.85)'], borderWidth: 0, hoverOffset: 8 }]
            },
            options: {
              responsive: true, maintainAspectRatio: false, cutout: '68%',
              plugins: { legend: { position: 'bottom', labels: { color: '#94a3b8', font: { size: 11 }, padding: 14 } }, title: { display: true, text: 'Distribuição Geral', color: '#e2e8f0', font: { size: 13, weight: '600' } } }
            }
          });
          ctxDoughnut._chartInstance = inst2;
        }
      }, 50);

      document.getElementById('btn-doc-export-pdf')?.addEventListener('click', async () => {`
);

// Adicionar os canvas ao HTML antes da tabela
patch(
  'Gráficos de produtividade: canvas no HTML',
  `        <div style="border-radius:12px;overflow:hidden;border:1px solid var(--border-color);">
          <table style="width:100%;border-collapse:collapse;">
            <thead>
              <tr style="background:var(--bg-tertiary);border-bottom:1px solid var(--border-color);">
                \${['Médico','Especialidade','Status','Total','Hoje','Em Atend.','Concluídos'].map(h=>\`<th style="padding:11px 14px;font-size:0.73rem;color:var(--text-muted);text-transform:uppercase;">\${h}</th>\`).join('')}
              </tr>
            </thead>`,
  `        <div style="display:grid;grid-template-columns:2fr 1fr;gap:16px;margin-bottom:16px;">
          <div style="background:var(--bg-tertiary);border-radius:12px;padding:16px;border:1px solid var(--border-color);height:220px;position:relative;">
            <canvas id="chart-doc-productivity"></canvas>
          </div>
          <div style="background:var(--bg-tertiary);border-radius:12px;padding:16px;border:1px solid var(--border-color);height:220px;position:relative;">
            <canvas id="chart-doc-completion"></canvas>
          </div>
        </div>

        <div style="border-radius:12px;overflow:hidden;border:1px solid var(--border-color);">
          <table style="width:100%;border-collapse:collapse;">
            <thead>
              <tr style="background:var(--bg-tertiary);border-bottom:1px solid var(--border-color);">
                \${['Médico','Especialidade','Status','Total','Hoje','Em Atend.','Concluídos'].map(h=>\`<th style="padding:11px 14px;font-size:0.73rem;color:var(--text-muted);text-transform:uppercase;">\${h}</th>\`).join('')}
              </tr>
            </thead>`
);

writeFileSync(PATH, src, 'utf8');
console.log(`\n=== CONCLUÍDO: ${ok} patches aplicados, ${fail} falhas ===`);
if (fail > 0) process.exit(1);
