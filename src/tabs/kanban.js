import { state } from '../state.js';
import * as localDB from '../localDB.js';

window.renderKanbanTab = renderKanbanTab;

const KANBAN_COLUMNS = [
  { id: 'pronto_socorro', label: 'Pronto Socorro (Obs)', shortLabel: 'PS', color: '#3b82f6', maxHours: 24 },
  { id: 'corredor_internacao', label: 'Corredor de Internacao', shortLabel: 'Corredor', color: '#f59e0b', maxDays: 1 },
  { id: 'clinica_cirurgica', label: 'Clinica Cirurgica', shortLabel: 'Cirurgica', color: '#8b5cf6', maxDays: 7 },
  { id: 'clinica_medica', label: 'Clinica Medica (SUS)', shortLabel: 'Medica', color: '#10b981', maxDays: 10 },
  { id: 'uti', label: 'UTI', shortLabel: 'UTI', color: '#ef4444', maxDays: 5 }
];

let currentFilter = 'all';
let currentSlaFilter = 'all';
let kanbanChartInstance = null;

export async function renderKanbanTab() {
  const contentArea = document.getElementById('main-content');
  if (!contentArea) return;

  const FILTER_CARDS = [
    { id: 'all', label: 'Visão Geral', icon: 'fa-layer-group', color: '#818cf8', rgb: '129,140,248' },
    { id: 'pronto_socorro', label: 'Pronto Socorro', icon: 'fa-truck-medical', color: '#3b82f6', rgb: '59,130,246' },
    { id: 'corredor_internacao', label: 'Corredor', icon: 'fa-bed-pulse', color: '#f59e0b', rgb: '245,158,11' },
    { id: 'clinica_cirurgica', label: 'Cirurgica', icon: 'fa-scalpel', color: '#8b5cf6', rgb: '139,92,246' },
    { id: 'clinica_medica', label: 'Clinica Medica', icon: 'fa-stethoscope', color: '#10b981', rgb: '16,185,129' },
    { id: 'uti', label: 'UTI', icon: 'fa-heart-pulse', color: '#ef4444', rgb: '239,68,68' }
  ];

  const filtersHtml = FILTER_CARDS.map(f => `
    <div onclick="setKanbanFilter('${f.id}')" id="kf-${f.id}" class="kanban-filter-card" data-color="${f.color}" data-rgb="${f.rgb}" style="background: var(--glass-bg, var(--bg-secondary)); border: 1px solid var(--glass-border, var(--border-color)); border-top: 6px solid ${f.color}; border-radius: 12px; padding: 24px 16px; cursor: pointer; transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); position: relative; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; min-height: 140px; box-shadow: var(--shadow-sm); backdrop-filter: var(--glass-blur);" onmouseenter="if(currentFilter !== '${f.id}') { this.style.transform='translateY(-4px)'; this.style.boxShadow='var(--shadow-lg)'; }" onmouseleave="if(currentFilter !== '${f.id}') { this.style.transform='none'; this.style.boxShadow='var(--shadow-sm)'; }">
      <div style="width: 48px; height: 48px; border-radius: 12px; background: rgba(${f.rgb}, 0.15); border: 1px solid rgba(${f.rgb}, 0.3); display: flex; align-items: center; justify-content: center; color: ${f.color}; font-size: 1.3rem; margin-bottom: 12px; box-shadow: 0 4px 10px rgba(${f.rgb}, 0.15);">
        <i class="fa-solid ${f.icon}"></i>
      </div>
      <h4 style="font-size: 1.1rem; font-weight: 700; color: var(--text-primary); margin: 0 0 8px 0; text-align: center; line-height: 1.2;">${f.label}</h4>
      <p style="font-size: 1.8rem; color: ${f.color}; margin: 0; font-weight: 800; text-align: center;"><span id="count-${f.id}">0</span></p>
      <p style="font-size: 0.8rem; color: var(--text-muted); margin: 2px 0 0 0; font-weight: 600; text-align: center; text-transform: uppercase; letter-spacing: 0.5px;">pacientes</p>
      <span class="card-status-badge" style="display: none; position: absolute; top: 10px; right: 10px; font-size: 0.6rem; font-weight: 800; padding: 3px 8px; border-radius: 12px; background: rgba(${f.rgb}, 0.2); color: ${f.color}; border: 1px solid rgba(${f.rgb}, 0.5); letter-spacing: 0.5px;">ATIVO</span>
    </div>
  `).join('');

  contentArea.innerHTML = `
    <div class="tab-section active" id="kanban-root" style="display:flex; flex-direction:column; height: calc(100vh - 60px); overflow:hidden;">
      
      <!-- Top Action Bar -->
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:14px; flex-wrap:wrap; gap:12px; flex-shrink:0;">
        <div>
          <h2 style="font-family:'Outfit'; font-weight:700; font-size:1.35rem; margin:0; color:var(--text-primary);">
            <i class="fa-solid fa-table-columns" style="color:var(--color-primary);"></i> Kanban de Internação
          </h2>
          <p style="margin:2px 0 0; font-size:0.8rem; color:var(--text-muted);">Gestão visual interativa do fluxo assistencial, SLAs e ocupação de leitos.</p>
        </div>
        <div style="display:flex; gap:10px; align-items:center; flex-wrap:wrap;">
          <div id="kanban-active-filter-badge" style="display:none; align-items:center; gap:6px; background:rgba(245,158,11,0.15); border:1px solid rgba(245,158,11,0.4); padding:6px 12px; border-radius:10px; font-size:0.78rem; font-weight:700; color:#f59e0b;">
            <i class="fa-solid fa-filter"></i> <span id="kanban-filter-label">Filtro Ativo</span>
            <button onclick="resetKanbanAllFilters()" style="background:none; border:none; color:#f59e0b; cursor:pointer; font-size:0.85rem; margin-left:4px; padding:0;" title="Limpar todos os filtros"><i class="fa-solid fa-xmark"></i></button>
          </div>
          
          <button onclick="openAddPatientKanbanModal()" class="btn-primary" style="padding:10px 18px; border-radius:10px; font-size:0.85rem; font-weight:600; display:flex; align-items:center; gap:8px; box-shadow: 0 4px 14px rgba(99,102,241,0.3);">
            <i class="fa-solid fa-plus"></i> Adicionar Paciente
          </button>
        </div>
      </div>

      <!-- Analytics Header Dashboard - Interativo -->
      <div style="display:flex; gap: 14px; margin-bottom: 14px; flex-shrink:0; flex-wrap:wrap; align-items:stretch;">
        
        <!-- Chart 1: Distribuição por Setor (Interativo) -->
        <div class="kanban-chart-card" onclick="openKanbanSectorBreakdownModal()" style="flex: 1; min-width: 200px; background: var(--glass-bg, rgba(30, 41, 59, 0.65)); backdrop-filter: var(--glass-blur, blur(12px)); border: 1px solid var(--glass-border, rgba(255,255,255,0.08)); border-radius: 16px; padding: 16px; box-shadow: var(--shadow-sm); display: flex; flex-direction: column; position: relative; cursor: pointer; transition: all 0.2s ease;" onmouseenter="this.style.borderColor='var(--color-primary)'; this.style.transform='translateY(-2px)';" onmouseleave="this.style.borderColor='var(--glass-border, rgba(255,255,255,0.08))'; this.style.transform='none';" title="Clique para ver detalhamento de pacientes por setor">
          <h4 style="font-size: 0.82rem; font-weight: 700; color: var(--text-primary); margin: 0 0 8px 0; text-align: center; display:flex; align-items:center; justify-content:center; gap:6px;">
            <i class="fa-solid fa-chart-pie" style="color: #6366f1;"></i> Distribuição por Setor
            <i class="fa-solid fa-arrow-pointer" style="font-size:0.65rem; color:var(--text-muted); opacity:0.7;"></i>
          </h4>
          <div style="flex-grow: 1; position: relative; height: 125px;">
            <canvas id="kanbanSectorChart"></canvas>
            <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); text-align: center; pointer-events: none;">
              <span id="kanban-chart-center-val" style="font-size: 1.2rem; font-weight: 800; color: var(--text-primary);">0</span>
              <br>
              <span style="font-size: 0.58rem; color: var(--text-muted); text-transform: uppercase; font-weight: 700;">Pacientes</span>
            </div>
          </div>
        </div>

        <!-- Chart 2: SLA & Metas de Tempo (Interativo) -->
        <div class="kanban-chart-card" onclick="openKanbanSlaAuditModal()" style="flex: 1; min-width: 200px; background: var(--glass-bg, rgba(30, 41, 59, 0.65)); backdrop-filter: var(--glass-blur, blur(12px)); border: 1px solid var(--glass-border, rgba(255,255,255,0.08)); border-radius: 16px; padding: 16px; box-shadow: var(--shadow-sm); display: flex; flex-direction: column; position: relative; cursor: pointer; transition: all 0.2s ease;" onmouseenter="this.style.borderColor='#f59e0b'; this.style.transform='translateY(-2px)';" onmouseleave="this.style.borderColor='var(--glass-border, rgba(255,255,255,0.08))'; this.style.transform='none';" title="Clique para ver auditoria detalhada de SLAs e atrasos">
          <h4 style="font-size: 0.82rem; font-weight: 700; color: var(--text-primary); margin: 0 0 8px 0; text-align: center; display:flex; align-items:center; justify-content:center; gap:6px;">
            <i class="fa-solid fa-hourglass-half" style="color: #f59e0b;"></i> Metas de Tempo (SLA)
            <i class="fa-solid fa-arrow-pointer" style="font-size:0.65rem; color:var(--text-muted); opacity:0.7;"></i>
          </h4>
          <div style="flex-grow: 1; position: relative; height: 125px;">
            <canvas id="kanbanSlaChart"></canvas>
            <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); text-align: center; pointer-events: none;">
              <span id="kanban-sla-center-val" style="font-size: 1.2rem; font-weight: 800; color: #10b981;">0%</span>
              <br>
              <span style="font-size: 0.58rem; color: var(--text-muted); text-transform: uppercase; font-weight: 700;">No Prazo</span>
            </div>
          </div>
        </div>

        <!-- Funil da Jornada de Internação (Interativo) -->
        <div style="flex: 1.6; min-width: 260px; background: var(--glass-bg, rgba(30, 41, 59, 0.65)); backdrop-filter: var(--glass-blur, blur(12px)); border: 1px solid var(--glass-border, rgba(255,255,255,0.08)); border-radius: 16px; padding: 16px; box-shadow: var(--shadow-sm); display: flex; flex-direction: column; justify-content: space-between;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
            <h4 style="font-size: 0.82rem; font-weight: 700; color: var(--text-primary); margin: 0; display:flex; align-items:center; gap:6px; cursor:pointer;" onclick="openKanbanFunnelDetailModal()" title="Clique para ver detalhes do fluxo do funil">
              <i class="fa-solid fa-filter" style="color: #3b82f6;"></i> Funil da Jornada Hospitalar
              <i class="fa-solid fa-chart-line" style="font-size:0.7rem; color:#3b82f6;"></i>
            </h4>
            <span id="kanban-resolutividade-tag" onclick="openKanbanSlaAuditModal()" style="font-size: 0.65rem; font-weight: 700; padding: 2px 8px; border-radius: 12px; background: rgba(16,185,129,0.15); color: #10b981; border: 1px solid rgba(16,185,129,0.3); cursor:pointer;" title="Ver auditoria de resolutividade">
              Carregando...
            </span>
          </div>
          <div id="kanban-funnel-container" style="display:flex; flex-direction:column; gap:5px; justify-content:center; flex-grow:1;">
          </div>
        </div>

      </div>

      <!-- Synchronized Scrollable Board Container (Sector Header Cards + Kanban Columns 1-to-1 Grid) -->
      <div style="overflow-x:auto; flex-grow:1; display:flex; flex-direction:column; padding-bottom:12px;">
        <div id="kanban-scroll-wrapper" style="min-width: 1400px; display:flex; flex-direction:column; gap:14px; flex-grow:1;">
          
          <!-- Sector Cards Row (5 Columns) -->
          <div id="kanban-filters-row" style="display:grid; grid-template-columns: repeat(6, 1fr); gap: 16px; flex-shrink:0; margin-top: 24px;">
            ${filtersHtml}
          </div>

          <!-- Kanban Columns Row (5 Columns - Directly aligned below Sector Cards) -->
          <div class="kanban-board" id="kanban-board" style="display:grid; grid-template-columns: repeat(6, 1fr); gap:14px; flex-grow:1; align-items:stretch;">
          </div>

        </div>
      </div>

    </div>
  `;

  loadAndRenderKanban();
  setTimeout(() => setKanbanFilter(currentFilter), 10);
}

window.setKanbanFilter = function(filterId) {
  currentFilter = filterId;
  
  // Style all 6 sector cards
  document.querySelectorAll('.kanban-filter-card').forEach(card => {
    const id = card.id.replace('kf-', '');
    const isActive = id === filterId;
    const rgb = card.getAttribute('data-rgb');
    const color = card.getAttribute('data-color');
    const badge = card.querySelector('.card-status-badge');
    
    if (isActive) {
      card.style.background = `rgba(${rgb}, 0.12)`;
      card.style.borderTop = `6px solid ${color}`;
      card.style.borderRight = '1px solid var(--border-color)';
      card.style.borderBottom = '1px solid var(--border-color)';
      card.style.borderLeft = '1px solid var(--border-color)';
      card.style.boxShadow = `0 8px 24px rgba(0,0,0,0.4), inset 0 24px 24px -24px rgba(${rgb}, 0.5)`;
      card.style.transform = 'translateY(-4px)';
      card.style.backdropFilter = 'var(--glass-blur)';
      if (badge) badge.style.display = 'inline-block';
    } else {
      card.style.background = 'var(--glass-bg, var(--bg-secondary))';
      card.style.borderTop = `6px solid ${color}`;
      card.style.borderRight = '1px solid var(--glass-border, var(--border-color))';
      card.style.borderBottom = '1px solid var(--glass-border, var(--border-color))';
      card.style.borderLeft = '1px solid var(--glass-border, var(--border-color))';
      card.style.boxShadow = 'var(--shadow-sm)';
      card.style.transform = 'none';
      card.style.backdropFilter = 'var(--glass-blur)';
      if (badge) badge.style.display = 'none';
    }
  });
  
  loadAndRenderKanban();
};

function calcStatus(hosp, col) {
  const now = new Date();
  const entry = new Date(hosp.sector_entry_date);
  const hoursIn = (now - entry) / 3600000;
  const daysIn = hoursIn / 24;
  let pct = 0, statusColor = '#10b981', statusText = 'No prazo', timeStr;

  if (col.maxDays) {
    pct = Math.min((daysIn / col.maxDays) * 100, 100);
    if (daysIn >= col.maxDays) { statusColor = '#ef4444'; statusText = 'Meta excedida'; }
    else if (daysIn >= col.maxDays * 0.75) { statusColor = '#f59e0b'; statusText = 'Atencao'; }
  } else if (col.maxHours) {
    pct = Math.min((hoursIn / col.maxHours) * 100, 100);
    if (hoursIn >= col.maxHours) { statusColor = '#ef4444'; statusText = 'Meta excedida'; }
    else if (hoursIn >= col.maxHours * 0.75) { statusColor = '#f59e0b'; statusText = 'Atencao'; }
  }

  timeStr = daysIn >= 1 ? `${Math.floor(daysIn)}d ${Math.floor(hoursIn % 24)}h` : `${Math.floor(hoursIn)}h`;
  const totalDays = Math.floor((now - new Date(hosp.admission_date)) / 86400000);
  const totalStr = totalDays > 0 ? `${totalDays}d` : 'Hoje';
  return { pct, statusColor, statusText, timeStr, totalStr };
}

function renderCard(hosp, col) {
  const { pct, statusColor, statusText, timeStr, totalStr } = calcStatus(hosp, col);
  const initials = (hosp.patientName || '?').split(' ').slice(0,2).map(n => n[0]).join('').toUpperCase();
  const diagHtml = hosp.diagnosis ? `<div style="font-size:0.95rem; color:var(--text-muted); display:flex; align-items:center; gap:6px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;" title="${hosp.diagnosis}"><i class="fa-solid fa-stethoscope" style="width:16px; text-align:center;"></i> <span style="overflow:hidden; text-overflow:ellipsis;">${hosp.diagnosis}</span></div>` : '';
  const bedHtml = hosp.bed ? `<div style="font-size:0.95rem; color:var(--text-muted); display:flex; align-items:center; gap:6px;"><i class="fa-solid fa-bed" style="width:16px; text-align:center;"></i> Leito: <b style="color:var(--text-primary);">${hosp.bed}</b></div>` : '';
  const drHtml = hosp.doctor_name ? `<div style="font-size:0.95rem; color:var(--text-muted); display:flex; align-items:center; gap:6px;"><i class="fa-solid fa-user-doctor" style="width:16px; text-align:center;"></i> Dr(a). ${hosp.doctor_name}</div>` : '';

  // Safe escape for name if it contains single quotes
  const safeName = (hosp.patientName || '').replace(/'/g, "\\'");

  return `
    <div class="kanban-card" onclick="if(typeof window.openPatientHistoryModal === 'function') window.openPatientHistoryModal('${hosp.patient_id}', '${safeName}');" draggable="true" data-hosp-id="${hosp.id}" style="background:var(--glass-bg, var(--bg-secondary)); backdrop-filter:var(--glass-blur, blur(10px)); -webkit-backdrop-filter:var(--glass-blur, blur(10px)); border:1px solid var(--glass-border, var(--border-color)); border-top:6px solid ${statusColor}; border-radius:12px; padding:24px; cursor:pointer; box-shadow:var(--shadow-sm); position:relative; transition: transform 0.2s ease, box-shadow 0.2s ease; display:flex; flex-direction:column; gap:16px;" onmouseenter="this.style.transform='translateY(-2px)'; this.style.boxShadow='var(--shadow-lg)';" onmouseleave="this.style.transform='none'; this.style.boxShadow='var(--shadow-sm)';">
      
      <!-- Top: User Info & ID -->
      <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:8px;">
        <div style="display:flex; align-items:center; gap:12px; min-width:0;">
          <div style="width:48px; height:48px; border-radius:50%; background:linear-gradient(135deg,${col.color}44,${col.color}88); display:flex; align-items:center; justify-content:center; font-size:1.1rem; font-weight:700; color:${col.color}; flex-shrink:0; border: 1px solid ${col.color}44;">${initials}</div>
          <strong style="font-size:1.25rem; color:var(--text-primary); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;" title="${hosp.patientName}">${hosp.patientName}</strong>
        </div>
        <div style="display:flex; align-items:center; flex-shrink:0;">
          <span style="font-size:0.75rem; padding:4px 8px; border-radius:6px; font-weight:600; background:var(--bg-secondary); color:var(--text-muted); border: 1px solid var(--border-color);">${(hosp.patient_id||'').substring(0,6)}</span>
        </div>
      </div>
      
      <!-- Middle: Details -->
      <div style="display:flex; flex-direction:column; gap:4px; margin-top:-2px;">
        ${diagHtml}${bedHtml}${drHtml}
      </div>
      
      <!-- Progress/Sector bar -->
      <div style="background: var(--bg-hover); padding: 8px 10px; border-radius: 8px; border: 1px solid var(--border-color);">
        <div style="display:flex; justify-content:space-between; margin-bottom:6px; align-items:center;">
          <span style="font-size:0.82rem; color:var(--text-muted);"><i class="fa-regular fa-clock" style="margin-right:4px;"></i>Setor: <b style="color:var(--text-primary);">${timeStr}</b></span>
          <span style="font-size:0.82rem; font-weight:700; color:${statusColor};">${statusText}</span>
        </div>
        <div style="height:6px; background:var(--border-color); border-radius:3px; overflow:hidden;">
          <div style="height:100%; width:${pct}%; background:${statusColor}; border-radius:3px; box-shadow: 0 0 6px ${statusColor};"></div>
        </div>
      </div>
      
      <!-- Action Buttons Row 1: Interactions -->
      <div style="display:grid; grid-template-columns: 1fr 1fr; gap:8px;">
        <button onclick="openPatientHistoryModal('${hosp.patient_id}', '${safeName}')" style="background:var(--color-primary); color:#fff; border:none; border-radius:6px; padding:8px; font-size:0.85rem; font-weight:600; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:6px; transition:0.2s; box-shadow:0 2px 6px rgba(0,0,0,0.1);" onmouseover="this.style.opacity='0.9'" onmouseout="this.style.opacity='1'" title="Acessar Prontuário, Consultas e Histórico">
          <i class="fa-solid fa-notes-medical"></i> Prontuário
        </button>
        <button onclick="viewKanbanNotes('${hosp.id}')" style="background:var(--bg-secondary); color:var(--text-primary); border:1px solid var(--border-color); border-radius:6px; padding:8px; font-size:0.85rem; font-weight:600; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:6px; transition:0.2s;" onmouseover="this.style.background='var(--bg-hover)'" onmouseout="this.style.background='var(--bg-secondary)'" title="Evoluções e Anotações">
          <i class="fa-regular fa-note-sticky" style="color:var(--color-primary);"></i> Evolução
          ${(hosp.evolutions?.length > 0 || hosp.notes) ? '<span style="width:6px;height:6px;background:#ef4444;border-radius:50%;margin-left:2px;" title="Há anotações recentes"></span>' : ''}
        </button>
      </div>

      <!-- Action Buttons Row 2: Management -->
      <div style="display:flex; justify-content:space-between; align-items:center; border-top:1px solid var(--border-color); padding-top:12px;">
        <span style="font-size:0.7rem; color:var(--text-muted);"><i class="fa-solid fa-hospital" style="width:12px;"></i> Total: <b style="color:var(--text-primary);">${totalStr}</b></span>
        <div style="display:flex; gap:6px;">
          <button onclick="openEditKanbanCard('${hosp.id}')" style="background:var(--bg-secondary); border:1px solid var(--border-color); cursor:pointer; color:var(--text-primary); font-size:0.8rem; padding:4px 8px; border-radius:6px; transition: 0.2s;" onmouseover="this.style.background='var(--bg-hover)'" onmouseout="this.style.background='var(--bg-secondary)'" title="Editar"><i class="fa-regular fa-pen-to-square"></i></button>
          <button onclick="moveKanbanCard('${hosp.id}')" style="background:rgba(99,102,241,0.1); border:1px solid rgba(99,102,241,0.3); cursor:pointer; color:var(--color-primary); font-size:0.8rem; padding:4px 8px; border-radius:6px; transition: 0.2s;" onmouseover="this.style.background='rgba(99,102,241,0.2)'" onmouseout="this.style.background='rgba(99,102,241,0.1)'" title="Mover setor"><i class="fa-solid fa-arrow-right-arrow-left"></i></button>
          <button onclick="dischargePatient('${hosp.id}')" style="background:rgba(16,185,129,0.1); border:1px solid rgba(16,185,129,0.3); cursor:pointer; color:#10b981; font-size:0.8rem; padding:4px 8px; border-radius:6px; transition: 0.2s;" onmouseover="this.style.background='rgba(16,185,129,0.2)'" onmouseout="this.style.background='rgba(16,185,129,0.1)'" title="Alta"><i class="fa-solid fa-person-walking-arrow-right"></i></button>
        </div>
      </div>
      
    </div>
  `;
}

function normalizeSector(sec) {
  if (!sec) return 'pronto_socorro';
  const s = String(sec).toLowerCase().trim().replace(/-/g, '_').normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  if (s.includes('ps') || s.includes('socorro') || s.includes('observ') || s.includes('pronto') || s.includes('emerg')) return 'pronto_socorro';
  if (s.includes('corredor') || s.includes('maca') || s.includes('espera')) return 'corredor_internacao';
  if (s.includes('cirurg') || s.includes('bloco') || s.includes('oper') || s.includes('cc') || s.includes('trauma')) return 'clinica_cirurgica';
  if (s.includes('medica') || s.includes('enf') || s.includes('clinica') || s.includes('sus') || s.includes('geral') || s.includes('intern')) return 'clinica_medica';
  if (s.includes('uti') || s.includes('cti') || s.includes('intensiv') || s.includes('critico')) return 'uti';
  return 'pronto_socorro';
}

function ensureKanbanData() {
  let all = localDB.list('hospitalizations') || [];
  // Se não houver internações ativas ou lista muito vazia, povoar com internações realistas
  const activeCount = all.filter(h => h.status !== 'Alta').length;
  if (activeCount < 5) {
    const patients = localDB.list('patients') || [];
    const doctors = (localDB.list('users') || []).filter(u => ['Medico', 'Master'].includes(u.role));
    if (patients.length > 0) {
      const sectors = ['pronto_socorro', 'corredor_internacao', 'clinica_cirurgica', 'clinica_medica', 'uti'];
      const diagnoses = ['Pneumonia Comunitária', 'IAM com Supra', 'Sepse Foco Pulmonar', 'Pós-op Apendicectomia', 'Insuficiência Cardíaca Descompensada', 'AVC Isquêmico Agudo', 'Trauma Abdominal Fechado', 'Cetoacidose Diabética'];
      const notesList = [
        'Paciente lúcido, orientado, estável hemodinamicamente. Aguardando exames de controle.',
        'Em uso de antibioticoterapia venosa. Melhora dos parâmetros inflamatórios.',
        'Programada reavaliação cirúrgica no período vespertino. Ferida operatória limpa.',
        'Mantendo suporte ventilatório não-invasivo com boa resposta. Sinais vitais estáveis.'
      ];

      // Criar internações para distribuir pelos 5 setores
      for (let i = 0; i < 15; i++) {
        const p = patients[i % patients.length];
        const doc = doctors.length > 0 ? doctors[i % doctors.length] : { id: 'doc-1', name: 'Dr. Roberto Silva' };
        const sec = sectors[i % sectors.length];
        const hoursAgo = (i + 1) * 6 + Math.floor(Math.random() * 12);
        const admDate = new Date(Date.now() - hoursAgo * 3600000).toISOString();
        const sectorDate = new Date(Date.now() - Math.floor(hoursAgo * 0.6) * 3600000).toISOString();
        
        let bedName = 'S/ Leito';
        if (sec === 'pronto_socorro') bedName = `Box PS-0${(i % 5) + 1}`;
        else if (sec === 'corredor_internacao') bedName = `Maca COR-0${(i % 5) + 1}`;
        else if (sec === 'clinica_cirurgica') bedName = `Quarto CIR-${101 + (i % 8)}`;
        else if (sec === 'clinica_medica') bedName = `Enf MED-${201 + (i % 8)}`;
        else if (sec === 'uti') bedName = `Leito UTI-0${(i % 6) + 1}`;

        localDB.insert('hospitalizations', {
          id: `HOSP-KN-${Date.now().toString(36)}-${i+1}`,
          patient_id: p.id,
          patientName: p.fullName || p.name,
          current_sector: sec,
          sector_entry_date: sectorDate,
          admission_date: admDate,
          bed: bedName,
          diagnosis: diagnoses[i % diagnoses.length],
          doctor_id: doc.id,
          doctor_name: doc.name || doc.username || 'Dr. Plantonista',
          notes: notesList[i % notesList.length],
          status: 'Internado',
          evolutions: [
            { ts: admDate, text: 'Admissão no setor de internação. Conduta inicial estabelecida.', author: doc.name || 'Médico Plantonista' },
            { ts: sectorDate, text: notesList[i % notesList.length], author: 'Enfermagem' }
          ],
          created_at: admDate,
          updated_at: new Date().toISOString()
        });
      }
    }
  }
}

function loadAndRenderKanban() {
  const board = document.getElementById('kanban-board');
  if (!board) return;

  ensureKanbanData();

  const all = localDB.list('hospitalizations') || [];
  const patients = localDB.list('patients') || [];

  const active = all.filter(h => h.status !== 'Alta').map(h => {
    const pat = patients.find(p => p.id === h.patient_id) || {};
    const normSector = normalizeSector(h.current_sector);
    return { 
      ...h, 
      current_sector: normSector, 
      patientName: pat.fullName || pat.name || h.patientName || 'Paciente' 
    };
  });

  // Update filter counters
  const cAll = document.getElementById('count-all'); if(cAll) cAll.textContent = active.length;
  const cPs = document.getElementById('count-pronto_socorro'); if(cPs) cPs.textContent = active.filter(h => h.current_sector === 'pronto_socorro').length;
  const cCor = document.getElementById('count-corredor_internacao'); if(cCor) cCor.textContent = active.filter(h => h.current_sector === 'corredor_internacao').length;
  const cCir = document.getElementById('count-clinica_cirurgica'); if(cCir) cCir.textContent = active.filter(h => h.current_sector === 'clinica_cirurgica').length;
  const cMed = document.getElementById('count-clinica_medica'); if(cMed) cMed.textContent = active.filter(h => h.current_sector === 'clinica_medica').length;
  const cUti = document.getElementById('count-uti'); if(cUti) cUti.textContent = active.filter(h => h.current_sector === 'uti').length;

  // Active filter badge update
  const badge = document.getElementById('kanban-active-filter-badge');
  const badgeLabel = document.getElementById('kanban-filter-label');
  if (badge && badgeLabel) {
    if (currentFilter !== 'all' || currentSlaFilter !== 'all') {
      badge.style.display = 'inline-flex';
      let parts = [];
      if (currentFilter !== 'all') {
        const col = KANBAN_COLUMNS.find(c => c.id === currentFilter);
        if (col) parts.push(`Setor: ${col.shortLabel}`);
      }
      if (currentSlaFilter !== 'all') {
        const slaNames = { ontime: 'No Prazo', warning: 'Atenção', exceeded: 'Meta Excedida' };
        parts.push(`SLA: ${slaNames[currentSlaFilter] || currentSlaFilter}`);
      }
      badgeLabel.textContent = parts.join(' | ');
    } else {
      badge.style.display = 'none';
    }
  }

  function hexToRgb(hex) {
    const bigint = parseInt(hex.slice(1), 16);
    return `${(bigint >> 16) & 255}, ${(bigint >> 8) & 255}, ${bigint & 255}`;
  }

  // Update layouts for isolation
  const scrollWrapper = document.getElementById('kanban-scroll-wrapper');
  if (scrollWrapper) scrollWrapper.style.minWidth = currentFilter === 'all' ? '1400px' : '100%';
  
  const filtersRow = document.getElementById('kanban-filters-row');
  if (filtersRow) {
    filtersRow.style.minWidth = currentFilter === 'all' ? 'auto' : '1400px'; 
  }

  if (currentFilter !== 'all') {
    board.style.display = 'flex';
    board.style.justifyContent = 'stretch';
    board.style.width = '100%';
  } else {
    board.style.display = 'grid';
    board.style.gridTemplateColumns = 'repeat(5, 1fr)';
    board.style.width = 'auto';
  }

  board.innerHTML = KANBAN_COLUMNS.map(col => {
    let cards = active.filter(h => h.current_sector === col.id).sort((a,b) => new Date(a.sector_entry_date)-new Date(b.sector_entry_date));
    
    // Apply SLA filter if active
    if (currentSlaFilter !== 'all') {
      cards = cards.filter(h => {
        const { statusText } = calcStatus(h, col);
        if (currentSlaFilter === 'ontime') return statusText === 'No prazo';
        if (currentSlaFilter === 'warning') return statusText === 'Atencao';
        if (currentSlaFilter === 'exceeded') return statusText === 'Meta excedida';
        return true;
      });
    }

    const rgb = hexToRgb(col.color);
    const isSelected = currentFilter === col.id;
    const isFilteredOut = currentFilter !== 'all' && !isSelected;

    if (isFilteredOut) return ''; // Completely hide unselected columns

    return `
      <div class="kanban-col" data-col="${col.id}" style="background: var(--glass-bg, rgba(${rgb}, 0.05)); backdrop-filter: var(--glass-blur); border-radius:16px; display:flex; flex-direction:column; border: 1px solid var(--glass-border); border-top: 5px solid ${col.color}; box-shadow:${isSelected ? 'var(--shadow-lg)' : 'var(--shadow-sm)'}; overflow:hidden; transition: all 0.3s ease; width: ${isSelected ? '100%' : 'auto'}; max-width: none;">
        <div style="padding:16px 20px; border-bottom:1px solid var(--glass-border); background: rgba(${rgb}, 0.06); display:flex; justify-content:space-between; align-items:center;">
          <h3 style="margin:0; font-size:1.05rem; font-weight:800; color:${col.color}; display:flex; align-items:center; gap:8px;">
            <span style="width:12px; height:12px; border-radius:50%; background:${col.color}; display:inline-block; flex-shrink:0; box-shadow: 0 0 10px ${col.color};"></span>
            ${col.label}
          </h3>
          <div style="display:flex; align-items:center; gap:10px;">
            ${col.maxDays ? `<span style="font-size:0.75rem; color:${col.color}; font-weight:800; padding: 4px 12px; background: rgba(${rgb}, 0.15); border-radius: 100px; border: 1px solid rgba(${rgb}, 0.3);">Meta: ${col.maxDays}d</span>` : (col.maxHours ? `<span style="font-size:0.75rem; color:${col.color}; font-weight:800; padding: 4px 12px; background: rgba(${rgb}, 0.15); border-radius: 100px; border: 1px solid rgba(${rgb}, 0.3);">Meta: ${col.maxHours}h</span>` : '')}
            <span style="background: ${col.color}; color:#fff; font-size:0.85rem; padding:4px 12px; border-radius:100px; font-weight:800; box-shadow: 0 4px 10px rgba(${rgb}, 0.4);">${cards.length}</span>
          </div>
        </div>
        <div class="kanban-col-body" style="padding:16px; flex-grow:1; overflow-y:auto; display:${isSelected ? 'grid' : 'flex'}; grid-template-columns: ${isSelected ? 'repeat(auto-fill, minmax(360px, 1fr))' : 'none'}; flex-direction:${isSelected ? 'row' : 'column'}; align-content: start; gap:16px; min-height:200px; max-height:calc(100vh - 330px);">
          ${cards.map(h => renderCard(h, col)).join('')}
          ${cards.length === 0 ? `<div onclick="openAddPatientKanbanModal('${col.id}')" style="text-align:center;padding:50px 10px;color:rgba(${rgb},0.8);font-size:0.95rem; font-weight:600; cursor:pointer; transition:all 0.2s; border-radius:12px; border: 2px dashed rgba(${rgb}, 0.3);" onmouseover="this.style.background='rgba(${rgb},0.1)';this.style.color='rgba(${rgb},1)';this.style.borderColor='rgba(${rgb}, 0.6)';" onmouseout="this.style.background='transparent';this.style.color='rgba(${rgb},0.8)';this.style.borderColor='rgba(${rgb}, 0.3)';" title="Clique para adicionar paciente neste setor"><i class="fa-solid fa-bed-pulse" style="font-size:2.5rem;margin-bottom:16px;display:block;opacity:0.85;color:${col.color}"></i>${currentSlaFilter !== 'all' ? 'Nenhum paciente neste filtro SLA' : 'Clique para adicionar paciente'}</div>` : ''}
        </div>
      </div>`;
  }).join('');
  setupDND();
  setTimeout(() => initKanbanChart(active), 50);
}

function setupDND() {
  document.querySelectorAll('.kanban-card').forEach(card => {
    card.addEventListener('dragstart', () => { card.classList.add('dragging'); card.style.opacity='0.5'; });
    card.addEventListener('dragend', () => { card.classList.remove('dragging'); card.style.opacity='1'; });
  });
  document.querySelectorAll('.kanban-col-body').forEach(col => {
    col.addEventListener('dragover', e => { e.preventDefault(); const d=document.querySelector('.dragging'); if(d) col.appendChild(d); });
    col.addEventListener('drop', e => {
      e.preventDefault();
      const d=document.querySelector('.dragging'); if(!d) return;
      const hospId=d.getAttribute('data-hosp-id');
      const newCol=col.parentElement.getAttribute('data-col');
      const hosp=localDB.get('hospitalizations',hospId);
      if(hosp && hosp.current_sector!==newCol) {
        localDB.update('hospitalizations',hospId,{current_sector:newCol,sector_entry_date:new Date().toISOString()});
        const name=KANBAN_COLUMNS.find(c=>c.id===newCol)?.label||newCol;
        const pat=(localDB.list('patients').find(p=>p.id===hosp?.patient_id)||{});
        const patName = pat.fullName || pat.name || 'Paciente';

        if(window.showToast) window.showToast('Paciente movido para '+name);

        if (typeof window.showFlowCompletionNotification === 'function') {
          window.showFlowCompletionNotification({
            actionTitle: 'Transferência de Setor Realizada',
            message: `O paciente <strong>${patName}</strong> foi transferido para o setor <strong>${name}</strong>.<br><br><strong>Próximo Passo:</strong> O tempo de permanência (SLA) foi reiniciado para o novo setor.`,
            targetTab: 'kanban',
            targetTabLabel: 'Kanban de Internação',
            actionType: 'switchTab'
          });
        }

        loadAndRenderKanban();
      }
    });
  });
}

// ──── Adicionar ────
window.openAddPatientKanbanModal = function(preselectedSectorId = null) {
  const ex=document.getElementById('kanban-modal'); if(ex) ex.remove();
  const patients=localDB.list('patients');
  const users=localDB.list('users').filter(u=>['Medico','Master','Desenvolvedor','Enfermeiro'].includes(u.role));
  document.body.insertAdjacentHTML('beforeend', `
    <div id="kanban-modal" style="display:flex;justify-content:center;align-items:center;position:fixed;top:0;left:0;width:100vw;height:100vh;background:rgba(5,7,20,0.85);z-index:100100;backdrop-filter:blur(10px);">
      <div style="background:#131326;padding:26px 28px;border-radius:18px;width:92%;max-width:480px;box-shadow:0 25px 70px rgba(0,0,0,0.85), 0 0 25px rgba(99,102,241,0.15);border:1.5px solid rgba(139,92,246,0.45);max-height:90vh;overflow-y:auto;">
        
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;padding-bottom:12px;border-bottom:1px solid rgba(255,255,255,0.1);">
          <h3 style="margin:0;color:#ffffff;font-family:'Outfit',sans-serif;font-size:1.15rem;font-weight:700;display:flex;align-items:center;gap:10px;">
            <i class="fa-solid fa-bed-pulse" style="color:#ec4899;font-size:1.2rem;"></i> Adicionar ao Kanban
          </h3>
          <button onclick="document.getElementById('kanban-modal').remove()" style="background:rgba(255,255,255,0.1);border:none;cursor:pointer;color:#ffffff;width:30px;height:30px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:1.1rem;transition:0.2s;" onmouseover="this.style.background='rgba(255,255,255,0.2)'" onmouseout="this.style.background='rgba(255,255,255,0.1)'">&times;</button>
        </div>

        <div style="display:grid;gap:16px;">
          <div>
            <label style="display:block;margin-bottom:6px;font-size:0.85rem;color:#f1f5f9;font-weight:700;letter-spacing:0.3px;">Paciente *</label>
            <select id="kanban-pat-select" class="form-control" style="width:100%;padding:10px 12px;border-radius:8px;border:1.5px solid rgba(139,92,246,0.4);background:#0f172a;color:#ffffff;font-size:0.9rem;font-weight:500;box-sizing:border-box;">
              <option value="" style="background:#0f172a;color:#94a3b8;">Selecione o paciente...</option>
              ${patients.map(p => `<option value="${p.id}" style="background:#0f172a;color:#ffffff;">${p.fullName || p.name || '(sem nome)'} ${p.cpf ? '— CPF: ' + p.cpf : ''}</option>`).join('')}
            </select>
          </div>

          <div>
            <label style="display:block;margin-bottom:6px;font-size:0.85rem;color:#f1f5f9;font-weight:700;letter-spacing:0.3px;">Setor Inicial *</label>
            <select id="kanban-sector-select" class="form-control" style="width:100%;padding:10px 12px;border-radius:8px;border:1.5px solid rgba(139,92,246,0.4);background:#0f172a;color:#ffffff;font-size:0.9rem;font-weight:500;box-sizing:border-box;">
              ${KANBAN_COLUMNS.map(c=>`<option value="${c.id}" ${c.id === preselectedSectorId ? 'selected' : ''} style="background:#0f172a;color:#ffffff;">${c.label}</option>`).join('')}
            </select>
          </div>

          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
            <div>
              <label style="display:block;margin-bottom:6px;font-size:0.85rem;color:#f1f5f9;font-weight:700;letter-spacing:0.3px;">Leito</label>
              <input id="kanban-bed" type="text" placeholder="Ex: UTI-05" class="form-control" style="width:100%;padding:10px 12px;border-radius:8px;border:1.5px solid rgba(139,92,246,0.4);background:#0f172a;color:#ffffff;font-size:0.9rem;box-sizing:border-box;">
            </div>
            <div>
              <label style="display:block;margin-bottom:6px;font-size:0.85rem;color:#f1f5f9;font-weight:700;letter-spacing:0.3px;">Data Admissão</label>
              <input id="kanban-admission" type="datetime-local" class="form-control" style="width:100%;padding:10px 12px;border-radius:8px;border:1.5px solid rgba(139,92,246,0.4);background:#0f172a;color:#ffffff;font-size:0.9rem;box-sizing:border-box;color-scheme:dark;" value="${new Date().toISOString().slice(0,16)}">
            </div>
          </div>

          <div>
            <label style="display:block;margin-bottom:6px;font-size:0.85rem;color:#f1f5f9;font-weight:700;letter-spacing:0.3px;">Diagnóstico / Hipótese</label>
            <input id="kanban-diagnosis" type="text" placeholder="Ex: Pneumonia, TCE..." class="form-control" style="width:100%;padding:10px 12px;border-radius:8px;border:1.5px solid rgba(139,92,246,0.4);background:#0f172a;color:#ffffff;font-size:0.9rem;box-sizing:border-box;">
          </div>

          <div>
            <label style="display:block;margin-bottom:6px;font-size:0.85rem;color:#f1f5f9;font-weight:700;letter-spacing:0.3px;">Médico Responsável</label>
            <select id="kanban-doctor-select" class="form-control" style="width:100%;padding:10px 12px;border-radius:8px;border:1.5px solid rgba(139,92,246,0.4);background:#0f172a;color:#ffffff;font-size:0.9rem;font-weight:500;box-sizing:border-box;">
              <option value="" style="background:#0f172a;color:#94a3b8;">Selecione o médico...</option>
              ${users.map(u=>`<option value="${u.id}" style="background:#0f172a;color:#ffffff;">${u.name || u.username || '(sem nome)'}</option>`).join('')}
            </select>
          </div>

          <div>
            <label style="display:block;margin-bottom:6px;font-size:0.85rem;color:#f1f5f9;font-weight:700;letter-spacing:0.3px;">Observações Iniciais</label>
            <textarea id="kanban-notes" placeholder="Notas de admissão..." class="form-control" style="width:100%;padding:10px 12px;border-radius:8px;border:1.5px solid rgba(139,92,246,0.4);background:#0f172a;color:#ffffff;font-size:0.9rem;min-height:75px;resize:vertical;box-sizing:border-box;font-family:inherit;"></textarea>
          </div>
        </div>

        <div style="display:flex;justify-content:flex-end;gap:12px;margin-top:24px;padding-top:14px;border-top:1px solid rgba(255,255,255,0.1);">
          <button onclick="document.getElementById('kanban-modal').remove()" style="padding:10px 20px;border-radius:8px;border:1px solid rgba(255,255,255,0.2);background:rgba(255,255,255,0.06);color:#f1f5f9;cursor:pointer;font-size:0.88rem;font-weight:600;transition:0.2s;" onmouseover="this.style.background='rgba(255,255,255,0.12)'" onmouseout="this.style.background='rgba(255,255,255,0.06)'">Cancelar</button>
          <button onclick="saveKanbanPatient()" style="padding:10px 22px;border-radius:8px;background:linear-gradient(135deg, #ec4899, #8b5cf6);color:#ffffff;border:none;cursor:pointer;font-size:0.88rem;font-weight:700;box-shadow:0 4px 15px rgba(236,72,153,0.4);display:flex;align-items:center;gap:6px;"><i class="fa-solid fa-plus"></i> Adicionar</button>
        </div>
      </div>
    </div>
  `);
};

window.saveKanbanPatient = function() {
  const patId=document.getElementById('kanban-pat-select').value;
  if(!patId){alert('Selecione um paciente.');return;}
  const sectorId=document.getElementById('kanban-sector-select').value;
  const bed=document.getElementById('kanban-bed').value.trim();
  const admRaw=document.getElementById('kanban-admission').value;
  const diagnosis=document.getElementById('kanban-diagnosis').value.trim();
  const docEl=document.getElementById('kanban-doctor-select');
  const doctorId=docEl.value;
  const doctorName=docEl.selectedIndex>0?docEl.options[docEl.selectedIndex].text:'';
  const notes=document.getElementById('kanban-notes').value.trim();
  const admDate=admRaw?new Date(admRaw).toISOString():new Date().toISOString();
  
  const patObj = localDB.list('patients')?.find(p => p.id === patId) || {};
  const patName = patObj.fullName || patObj.name || 'Paciente';
  const sectorLabel = KANBAN_COLUMNS.find(c => c.id === sectorId)?.label || sectorId;

  localDB.insert('hospitalizations',{patient_id:patId,current_sector:sectorId,sector_entry_date:admDate,admission_date:admDate,bed,diagnosis,doctor_id:doctorId,doctor_name:doctorName,notes,status:'Internado'});
  document.getElementById('kanban-modal').remove();
  
  if(window.showToast) window.showToast('Paciente adicionado ao Kanban!');

  if (typeof window.showFlowCompletionNotification === 'function') {
    window.showFlowCompletionNotification({
      actionTitle: 'Paciente Alocado no Kanban',
      message: `O paciente <strong>${patName}</strong> foi inserido no setor <strong>${sectorLabel}</strong> (Leito: ${bed || 'Aguardando'}).<br><br><strong>Próximo Passo:</strong> Acompanhe a meta de permanência (SLA) e lance novas evoluções diárias no cartão.`,
      targetTab: 'kanban',
      targetTabLabel: 'Kanban de Internação',
      actionType: 'switchTab'
    });
  }

  loadAndRenderKanban();
};

// ──── Editar ────
window.openEditKanbanCard = function(hospId) {
  const ex=document.getElementById('kanban-edit-modal'); if(ex) ex.remove();
  const hosp=localDB.get('hospitalizations',hospId); if(!hosp) return;
  const pat=(localDB.list('patients').find(p=>p.id===hosp.patient_id)||{});
  const patName = pat.fullName || pat.name || 'Desconhecido';
  const colLabel=KANBAN_COLUMNS.find(c=>c.id===hosp.current_sector)?.label||hosp.current_sector;
  document.body.insertAdjacentHTML('beforeend',`
    <div id="kanban-edit-modal" style="display:flex;justify-content:center;align-items:center;position:fixed;top:0;left:0;width:100vw;height:100vh;background:rgba(5,7,20,0.85);z-index:100100;backdrop-filter:blur(10px);">
      <div style="background:#131326;padding:26px 28px;border-radius:18px;width:92%;max-width:480px;box-shadow:0 25px 70px rgba(0,0,0,0.85), 0 0 25px rgba(99,102,241,0.15);border:1.5px solid rgba(139,92,246,0.45);">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;padding-bottom:10px;border-bottom:1px solid rgba(255,255,255,0.1);">
          <h3 style="margin:0;color:#ffffff;font-family:'Outfit',sans-serif;font-size:1.15rem;font-weight:700;"><i class="fa-regular fa-pen-to-square" style="color:#ec4899;"></i> Evoluir Paciente</h3>
          <button onclick="document.getElementById('kanban-edit-modal').remove()" style="background:rgba(255,255,255,0.1);border:none;cursor:pointer;color:#ffffff;width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;">&times;</button>
        </div>
        <p style="margin:0 0 16px;font-size:0.92rem;color:#cbd5e1;font-weight:600;">${patName} &middot; <b style="color:#a7f3d0;">${colLabel}</b></p>
        <div style="display:grid;gap:14px;">
          <div><label style="display:block;margin-bottom:6px;font-size:0.85rem;color:#f1f5f9;font-weight:700;">Diagnóstico</label>
            <input id="edit-diagnosis" type="text" class="form-control" value="${hosp.diagnosis||''}" placeholder="Diagnóstico..." style="width:100%;padding:10px;border-radius:8px;border:1.5px solid rgba(139,92,246,0.4);background:#0f172a;color:#ffffff;font-size:0.9rem;box-sizing:border-box;"></div>
          <div><label style="display:block;margin-bottom:6px;font-size:0.85rem;color:#f1f5f9;font-weight:700;">Leito</label>
            <input id="edit-bed" type="text" class="form-control" value="${hosp.bed||''}" placeholder="Leito..." style="width:100%;padding:10px;border-radius:8px;border:1.5px solid rgba(139,92,246,0.4);background:#0f172a;color:#ffffff;font-size:0.9rem;box-sizing:border-box;"></div>
          <div><label style="display:block;margin-bottom:6px;font-size:0.85rem;color:#f1f5f9;font-weight:700;">Notas de Evolução</label>
            <textarea id="edit-notes" class="form-control" placeholder="Evolução clínica..." style="width:100%;padding:10px;border-radius:8px;border:1.5px solid rgba(139,92,246,0.4);background:#0f172a;color:#ffffff;font-size:0.9rem;min-height:90px;resize:vertical;box-sizing:border-box;">${hosp.notes||''}</textarea></div>
        </div>
        <div style="display:flex;justify-content:flex-end;gap:10px;margin-top:22px;padding-top:14px;border-top:1px solid rgba(255,255,255,0.1);">
          <button onclick="document.getElementById('kanban-edit-modal').remove()" style="padding:9px 18px;border-radius:8px;border:1px solid rgba(255,255,255,0.2);background:rgba(255,255,255,0.06);color:#f1f5f9;cursor:pointer;font-size:0.88rem;font-weight:600;">Cancelar</button>
          <button onclick="saveEditKanbanCard('${hospId}')" style="padding:9px 18px;border-radius:8px;background:linear-gradient(135deg, #ec4899, #8b5cf6);color:#fff;border:none;cursor:pointer;font-size:0.88rem;font-weight:700;box-shadow:0 4px 14px rgba(236,72,153,0.4);"><i class="fa-solid fa-floppy-disk"></i> Salvar</button>
        </div>
      </div>
    </div>`);
};

window.saveEditKanbanCard = function(hospId) {
  localDB.update('hospitalizations',hospId,{
    diagnosis:document.getElementById('edit-diagnosis').value.trim(),
    bed:document.getElementById('edit-bed').value.trim(),
    notes:document.getElementById('edit-notes').value.trim()
  });
  document.getElementById('kanban-edit-modal').remove();
  if(window.showToast) window.showToast('Evolução registrada!');
  loadAndRenderKanban();
};

// ──── Mover ────
window.moveKanbanCard = function(hospId) {
  const ex=document.getElementById('kanban-move-modal'); if(ex) ex.remove();
  const hosp=localDB.get('hospitalizations',hospId); if(!hosp) return;
  const pat=(localDB.list('patients').find(p=>p.id===hosp.patient_id)||{});
  document.body.insertAdjacentHTML('beforeend',`
    <div id="kanban-move-modal" style="display:flex;justify-content:center;align-items:center;position:fixed;top:0;left:0;width:100vw;height:100vh;background:rgba(5,7,20,0.85);z-index:100200;backdrop-filter:blur(10px);">
      <div style="background:#131326;padding:26px 28px;border-radius:18px;width:92%;max-width:400px;box-shadow:0 25px 70px rgba(0,0,0,0.9), 0 0 30px rgba(99,102,241,0.25);border:1.5px solid rgba(139,92,246,0.5);">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;padding-bottom:10px;border-bottom:1px solid rgba(139,92,246,0.25);">
          <h3 style="margin:0;color:#ffffff;font-family:'Outfit',sans-serif;font-size:1.2rem;font-weight:700;display:flex;align-items:center;gap:8px;"><i class="fa-solid fa-arrow-right-arrow-left" style="color:#38bdf8;"></i> Mover Setor</h3>
          <button onclick="document.getElementById('kanban-move-modal').remove()" style="background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.15);color:#fff;width:30px;height:30px;border-radius:50%;display:flex;align-items:center;justify-content:center;cursor:pointer;"><i class="fa-solid fa-xmark"></i></button>
        </div>
        <p style="font-size:0.92rem;color:#e2e8f0;margin:0 0 18px;font-weight:600;">Paciente: <strong style="color:#38bdf8;">${pat.fullName || pat.name||'Paciente'}</strong></p>
        <div><label style="display:block;margin-bottom:6px;font-size:0.85rem;color:#f1f5f9;font-weight:700;">Novo Setor Destino</label>
          <select id="move-sector-select" class="form-control" style="width:100%;padding:10px 12px;border-radius:8px;border:1px solid #334155;background:#0f172a;color:#ffffff;font-size:0.92rem;font-weight:600;">
            ${KANBAN_COLUMNS.map(c=>`<option value="${c.id}" ${c.id===hosp.current_sector?'selected':''} style="background:#0f172a;color:#ffffff;">${c.label}</option>`).join('')}
          </select></div>
        <div style="display:flex;justify-content:flex-end;gap:10px;margin-top:24px;">
          <button onclick="document.getElementById('kanban-move-modal').remove()" style="padding:9px 18px;border-radius:8px;border:1px solid #334155;background:#1e293b;color:#f1f5f9;cursor:pointer;font-size:0.88rem;font-weight:600;">Cancelar</button>
          <button onclick="confirmMoveKanban('${hospId}')" style="padding:9px 18px;border-radius:8px;background:#0284c7;color:#fff;border:none;cursor:pointer;font-size:0.88rem;font-weight:700;box-shadow:0 2px 10px rgba(2,132,199,0.35);"><i class="fa-solid fa-check"></i> Mover</button>
        </div>
      </div>
    </div>`);
};

window.confirmMoveKanban = function(hospId) {
  const ns=document.getElementById('move-sector-select').value;
  const hosp=localDB.get('hospitalizations',hospId);
  const pat=(localDB.list('patients').find(p=>p.id===hosp?.patient_id)||{});
  const patName = pat.fullName || pat.name || 'Paciente';

  if(hosp && hosp.current_sector!==ns) {
    localDB.update('hospitalizations',hospId,{current_sector:ns,sector_entry_date:new Date().toISOString()});
    const name=KANBAN_COLUMNS.find(c=>c.id===ns)?.label||ns;
    if(window.showToast) window.showToast('Paciente movido para '+name);

    if (typeof window.showFlowCompletionNotification === 'function') {
      window.showFlowCompletionNotification({
        actionTitle: 'Transferência de Setor Realizada',
        message: `O paciente <strong>${patName}</strong> foi transferido para o setor <strong>${name}</strong>.<br><br><strong>Próximo Passo:</strong> O cronômetro de permanência (SLA) foi iniciado para o novo setor.`,
        targetTab: 'kanban',
        targetTabLabel: 'Kanban de Internação',
        actionType: 'switchTab'
      });
    }
  }
  document.getElementById('kanban-move-modal').remove();
  loadAndRenderKanban();
};

// ──── Notas / Evolução Clínica ────
window.viewKanbanNotes = function(hospId) {
  const ex=document.getElementById('kanban-notes-modal'); if(ex) ex.remove();
  const hosp=localDB.get('hospitalizations',hospId); if(!hosp) return;
  const pat=(localDB.list('patients').find(p=>p.id===hosp.patient_id)||{});
  // Parse evolutions: stored as JSON array or legacy plain text
  let evolutions = [];
  if (hosp.evolutions && Array.isArray(hosp.evolutions)) {
    evolutions = hosp.evolutions;
  } else if (hosp.notes) {
    // Migrate legacy notes to evolution format
    evolutions = [{ ts: hosp.admission_date || new Date().toISOString(), text: hosp.notes, author: 'Sistema' }];
  }
  const evoHtml = evolutions.length > 0
    ? evolutions.slice().reverse().map(e => `
        <div style="background:#0f172a;padding:12px 14px;border-radius:10px;border:1px solid rgba(139,92,246,0.3);margin-bottom:10px;">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
            <span style="font-size:0.75rem;font-weight:700;color:#38bdf8;"><i class="fa-regular fa-user-circle"></i> ${e.author||'Equipe'}</span>
            <span style="font-size:0.75rem;color:#94a3b8;font-weight:500;">${new Date(e.ts).toLocaleString('pt-BR')}</span>
          </div>
          <p style="margin:0;font-size:0.88rem;color:#f8fafc;white-space:pre-wrap;line-height:1.6;font-weight:400;">${e.text}</p>
        </div>`).join('')
    : `<div style="text-align:center;color:#94a3b8;font-size:0.85rem;padding:20px 0;"><i class="fa-regular fa-circle-check" style="font-size:1.8rem;display:block;margin-bottom:8px;opacity:0.4;"></i>Nenhuma evolução registrada ainda.</div>`;

  document.body.insertAdjacentHTML('beforeend',`
    <div id="kanban-notes-modal" style="display:flex;justify-content:center;align-items:center;position:fixed;top:0;left:0;width:100vw;height:100vh;background:rgba(5,7,20,0.85);z-index:100100;backdrop-filter:blur(10px);">
      <div style="background:#131326;padding:26px 28px;border-radius:18px;width:92%;max-width:560px;box-shadow:0 25px 70px rgba(0,0,0,0.85), 0 0 25px rgba(99,102,241,0.15);border:1.5px solid rgba(139,92,246,0.45);max-height:90vh;overflow-y:auto;display:flex;flex-direction:column;gap:0;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;padding-bottom:10px;border-bottom:1px solid rgba(255,255,255,0.1);">
          <div>
            <h3 style="margin:0 0 2px;color:#ffffff;font-family:'Outfit',sans-serif;font-size:1.15rem;font-weight:700;"><i class="fa-solid fa-notes-medical" style="color:#ec4899;"></i> Evolução Clínica</h3>
            <p style="margin:0;font-size:0.85rem;color:#cbd5e1;font-weight:600;">${pat.fullName||pat.name||'Paciente'} · Leito: <b style="color:#a7f3d0;">${hosp.bed||'—'}</b></p>
          </div>
          <button onclick="document.getElementById('kanban-notes-modal').remove()" style="background:rgba(255,255,255,0.1);border:none;cursor:pointer;color:#ffffff;width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;">&times;</button>
        </div>

        <div style="margin-bottom:14px;">
          <label style="display:block;margin-bottom:6px;font-size:0.85rem;color:#f1f5f9;font-weight:700;"><i class="fa-solid fa-pen-to-square" style="margin-right:4px;"></i>Nova Anotação / Evolução</label>
          <textarea id="kanban-new-note" placeholder="Descreva a evolução clínica, observações ou procedimentos realizados..." style="width:100%;padding:12px;border-radius:8px;border:1.5px solid rgba(139,92,246,0.4);background:#0f172a;color:#ffffff;font-size:0.9rem;min-height:90px;resize:vertical;box-sizing:border-box;font-family:inherit;"></textarea>
        </div>
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:18px;gap:10px;">
          <span style="font-size:0.75rem;color:var(--text-muted);"><i class="fa-regular fa-clock"></i> ${new Date().toLocaleString('pt-BR')}</span>
          <div style="display:flex;gap:8px;">
            <button onclick="openPatientHistoryModal('${hosp.patient_id}', '${pat.fullName||pat.name||'Paciente'}')" style="padding:7px 14px;border-radius:8px;background:var(--bg-secondary);color:var(--color-primary);border:1px solid rgba(99,102,241,0.3);cursor:pointer;font-size:0.82rem;font-weight:600;display:flex;align-items:center;gap:5px;" title="Ver prontuário completo"><i class="fa-solid fa-file-medical"></i> Prontuário</button>
            <button onclick="saveKanbanEvolution('${hospId}')" style="padding:7px 16px;border-radius:8px;background:var(--color-primary);color:#fff;border:none;cursor:pointer;font-size:0.85rem;font-weight:600;display:flex;align-items:center;gap:6px;"><i class="fa-solid fa-floppy-disk"></i> Salvar</button>
          </div>
        </div>

        <div style="border-top:1px solid var(--border-color);padding-top:14px;">
          <p style="font-size:0.75rem;font-weight:700;color:var(--text-muted);margin:0 0 12px;text-transform:uppercase;letter-spacing:0.5px;display:flex;align-items:center;gap:6px;">
            <i class="fa-solid fa-timeline" style="color:var(--color-primary);"></i>
            Histórico de Evoluções (${evolutions.length})
          </p>
          <div style="max-height:280px;overflow-y:auto;padding-right:2px;">${evoHtml}</div>
        </div>
      </div>
    </div>`);
};

window.saveKanbanEvolution = function(hospId) {
  const text = (document.getElementById('kanban-new-note')?.value || '').trim();
  if (!text) { if(window.showToast) window.showToast('Digite a evolução antes de salvar.'); return; }
  const hosp = localDB.get('hospitalizations', hospId); if (!hosp) return;
  const user = window.state?.currentUser;
  const author = user?.name || user?.username || 'Equipe';

  // Migrate legacy notes
  let evolutions = [];
  if (hosp.evolutions && Array.isArray(hosp.evolutions)) {
    evolutions = hosp.evolutions;
  } else if (hosp.notes) {
    evolutions = [{ ts: hosp.admission_date || new Date().toISOString(), text: hosp.notes, author: 'Sistema' }];
  }
  evolutions.push({ ts: new Date().toISOString(), text, author });
  localDB.update('hospitalizations', hospId, { evolutions, notes: text });
  document.getElementById('kanban-notes-modal')?.remove();
  if(window.showToast) window.showToast('Evolução registrada!');
  loadAndRenderKanban();
};

// ──── Alta ────
window.dischargePatient = function(hospId) {
  if(confirm('Registrar ALTA para este paciente? Ele sai do Kanban e o leito será liberado para Higienização.')) {
    const hosp = localDB.get('hospitalizations', hospId);
    const pat = (localDB.list('patients').find(p => p.id === hosp?.patient_id) || {});
    const patName = pat.fullName || pat.name || (hosp ? hosp.patientName : 'Paciente');
    const nowIso = new Date().toISOString();

    // 1. Atualizar Hospitalização para Alta
    localDB.update('hospitalizations', hospId, {
      status: 'Alta',
      discharge_date: nowIso,
      discharged_at: nowIso
    });

    // 2. Liberar Leito correspondente para Higienização
    const allBeds = localDB.list('beds') || [];
    allBeds.forEach(bed => {
      const matchBed = (hosp && hosp.bed_id && String(bed.id) === String(hosp.bed_id)) ||
                       (hosp && hosp.bed && (bed.bedNumber === hosp.bed || bed.number === hosp.bed)) ||
                       (hosp && hosp.patient_id && String(bed.patientId) === String(hosp.patient_id)) ||
                       (patName && bed.patientName && bed.patientName.toLowerCase().trim() === patName.toLowerCase().trim());
      if (matchBed) {
        localDB.update('beds', bed.id, {
          ...bed,
          status: 'Higienizacao',
          patientId: null,
          patientName: null,
          encounterId: null,
          pepNumber: null,
          admittedAt: null,
          dischargedAt: nowIso,
          updated_at: nowIso
        });
      }
    });

    // 3. Finalizar Encounter de Internação
    const allEncs = localDB.list('encounters') || [];
    allEncs.forEach(enc => {
      const matchEnc = (hosp && hosp.encounter_id && String(enc.id) === String(hosp.encounter_id)) ||
                       (hosp && hosp.patient_id && String(enc.patientId) === String(hosp.patient_id)) ||
                       (patName && enc.patientName && enc.patientName.toLowerCase().trim() === patName.toLowerCase().trim());
      if (matchEnc && (enc.status === 'Internado' || enc.status === 'Em_Atendimento')) {
        localDB.update('encounters', enc.id, {
          ...enc,
          status: 'Finalizado',
          dischargeType: 'Alta Hospitalar',
          discharged_at: nowIso,
          completed_at: nowIso,
          lastStatusUpdate: nowIso
        });
      }
    });

    // 4. Inserir Anotação Clínica de Alta
    if (hosp && hosp.patient_id) {
      localDB.insert('clinical_notes', {
        id: 'NOTE-' + Date.now(),
        patientId: hosp.patient_id,
        text: `✅ Alta Hospitalar concedida via Kanban (${hosp.current_sector || 'Setor'}). Paciente desinternado e leito liberado para higienização.`,
        created_at: nowIso,
        author: hosp.doctor_name || 'Médico Assistente'
      });
    }

    if(window.showToast) window.showToast('✅ Alta registrada com sucesso! Leito liberado para higienização.');

    if (typeof window.showFlowCompletionNotification === 'function') {
      window.showFlowCompletionNotification({
        actionTitle: 'Alta Médica Hospitalar Concluída',
        message: `O paciente <strong>${patName}</strong> recebeu alta médica. O leito hospitalar foi encaminhado automaticamente para a <strong>Fila de Higienização</strong>.`,
        targetTab: 'leitos',
        targetTabLabel: 'Gestão de Leitos & Internação',
        actionType: 'switchTab'
      });
    }

    loadAndRenderKanban();
  }
};

let kanbanSectorChartInstance = null;
let kanbanSlaChartInstance = null;

function initKanbanChart(activePatients) {
  const ChartClass = window.Chart || (typeof Chart !== 'undefined' ? Chart : null);
  
  // 1. Calculate SLA stats
  let onTime = 0, warning = 0, exceeded = 0;
  const now = new Date();

  activePatients.forEach(p => {
    const col = KANBAN_COLUMNS.find(c => c.id === p.current_sector);
    if (!col) return;
    const entry = new Date(p.sector_entry_date || p.admission_date);
    const hoursIn = (now - entry) / 3600000;
    const daysIn = hoursIn / 24;

    if (col.maxDays) {
      if (daysIn >= col.maxDays) exceeded++;
      else if (daysIn >= col.maxDays * 0.75) warning++;
      else onTime++;
    } else if (col.maxHours) {
      if (hoursIn >= col.maxHours) exceeded++;
      else if (hoursIn >= col.maxHours * 0.75) warning++;
      else onTime++;
    } else {
      onTime++;
    }
  });

  const total = activePatients.length || 1;
  const onTimePct = Math.round((onTime / total) * 100);

  // Update SLA center text
  const slaCenter = document.getElementById('kanban-sla-center-val');
  if (slaCenter) {
    slaCenter.textContent = `${onTimePct}%`;
    slaCenter.style.color = onTimePct > 70 ? '#10b981' : (onTimePct > 40 ? '#f59e0b' : '#ef4444');
  }

  const resTag = document.getElementById('kanban-resolutividade-tag');
  if (resTag) {
    resTag.textContent = `${onTimePct}% no prazo`;
    resTag.style.background = onTimePct > 70 ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)';
    resTag.style.color = onTimePct > 70 ? '#10b981' : '#ef4444';
  }

  // Render Funnel Container - Interativo (clique filtra setor)
  const funnelContainer = document.getElementById('kanban-funnel-container');
  if (funnelContainer) {
    const sectorCounts = {};
    KANBAN_COLUMNS.forEach(c => sectorCounts[c.id] = 0);
    activePatients.forEach(p => { if (sectorCounts[p.current_sector] !== undefined) sectorCounts[p.current_sector]++; });

    funnelContainer.innerHTML = KANBAN_COLUMNS.map(col => {
      const count = sectorCounts[col.id] || 0;
      const pct = Math.round((count / total) * 100);
      const isCurrentSectorFilter = currentFilter === col.id;
      return `
        <div onclick="setKanbanFilter('${col.id}')" style="display:flex; align-items:center; gap:8px; font-size:0.75rem; cursor:pointer; padding:4px 6px; border-radius:6px; transition:all 0.2s; background:${isCurrentSectorFilter ? 'rgba(99,102,241,0.15)' : 'transparent'}; border:1px solid ${isCurrentSectorFilter ? 'rgba(99,102,241,0.4)' : 'transparent'};" onmouseenter="this.style.background='rgba(255,255,255,0.06)'" onmouseleave="this.style.background='${isCurrentSectorFilter ? 'rgba(99,102,241,0.15)' : 'transparent'}'" title="Clique para filtrar apenas o setor ${col.label}">
          <span style="width:75px; color:var(--text-muted); font-weight:600; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;" title="${col.label}">${col.shortLabel}</span>
          <div style="flex-grow:1; height:8px; background:var(--bg-secondary); border-radius:4px; overflow:hidden; border:1px solid var(--border-color);">
            <div style="height:100%; width:${pct}%; background:${col.color}; border-radius:4px; box-shadow:0 0 6px ${col.color}; transition: width 0.4s ease;"></div>
          </div>
          <span style="width:45px; text-align:right; font-weight:700; color:var(--text-primary);">${count} <small style="color:var(--text-muted); font-size:0.65rem;">(${pct}%)</small></span>
        </div>
      `;
    }).join('');
  }

  if (!ChartClass) return;

  // 2. Render Sector Chart (Interativo com clique)
  const ctxSector = document.getElementById('kanbanSectorChart');
  if (ctxSector && ChartClass) {
    try {
      if (kanbanSectorChartInstance) {
        kanbanSectorChartInstance.destroy();
        kanbanSectorChartInstance = null;
      }
      
      const dataMap = {};
      KANBAN_COLUMNS.forEach(col => dataMap[col.id] = 0);
      activePatients.forEach(p => { if (dataMap[p.current_sector] !== undefined) dataMap[p.current_sector]++; });

      const centerVal = document.getElementById('kanban-chart-center-val');
      if (centerVal) centerVal.textContent = activePatients.length;

      const sectorContext = ctxSector.getContext ? ctxSector.getContext('2d') : ctxSector;

      kanbanSectorChartInstance = new ChartClass(sectorContext, {
        type: 'doughnut',
        data: {
          labels: KANBAN_COLUMNS.map(c => c.shortLabel),
          datasets: [{
            data: KANBAN_COLUMNS.map(c => dataMap[c.id]),
            backgroundColor: KANBAN_COLUMNS.map(c => (window.createChartGradient ? window.createChartGradient(ctxSector, c.color, 'ee', '33') : c.color)),
            borderWidth: 2,
            borderColor: 'rgba(255, 255, 255, 0.08)',
            borderRadius: 8,
            spacing: 4,
            hoverOffset: 8
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          cutout: '72%',
          animation: { duration: 500 },
          onClick: (evt, activeEls) => {
            if (activeEls && activeEls.length > 0) {
              const idx = activeEls[0].index;
              const sector = KANBAN_COLUMNS[idx];
              if (sector) setKanbanFilter(sector.id);
            } else {
              openKanbanSectorBreakdownModal();
            }
          },
          plugins: {
            legend: { display: false },
            tooltip: {
              backgroundColor: 'rgba(18, 14, 34, 0.94)',
              titleColor: '#818cf8',
              bodyColor: '#f8fafc',
              borderColor: 'rgba(129, 140, 248, 0.35)',
              borderWidth: 1,
              padding: 8,
              callbacks: {
                label: (context) => ` ${context.label}: ${context.raw} paciente(s) (Clique para filtrar)`
              }
            }
          }
        }
      });
    } catch(err) {
      console.warn('Erro ao renderizar kanbanSectorChart:', err);
    }
  }

  // 3. Render SLA Chart (Interativo com clique no status)
  const ctxSla = document.getElementById('kanbanSlaChart');
  if (ctxSla && ChartClass) {
    try {
      if (kanbanSlaChartInstance) {
        kanbanSlaChartInstance.destroy();
        kanbanSlaChartInstance = null;
      }

      const slaContext = ctxSla.getContext ? ctxSla.getContext('2d') : ctxSla;

      kanbanSlaChartInstance = new ChartClass(slaContext, {
        type: 'doughnut',
        data: {
          labels: ['No Prazo', 'Atenção', 'Meta Excedida'],
          datasets: [{
            data: [onTime, warning, exceeded],
            backgroundColor: ['#10b981', '#f59e0b', '#ef4444'].map(c => (window.createChartGradient ? window.createChartGradient(ctxSla, c, 'ee', '33') : c)),
            borderWidth: 2,
            borderColor: 'rgba(255, 255, 255, 0.08)',
            borderRadius: 8,
            spacing: 4,
            hoverOffset: 8
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          cutout: '72%',
          animation: { duration: 500 },
          onClick: (evt, activeEls) => {
            if (activeEls && activeEls.length > 0) {
              const idx = activeEls[0].index;
              const slaTypes = ['ontime', 'warning', 'exceeded'];
              setKanbanSlaFilter(slaTypes[idx]);
            } else {
              openKanbanSlaAuditModal();
            }
          },
          plugins: {
            legend: { display: false },
            tooltip: {
              backgroundColor: 'rgba(18, 14, 34, 0.94)',
              titleColor: '#f59e0b',
              bodyColor: '#f8fafc',
              borderColor: 'rgba(245, 158, 11, 0.35)',
              borderWidth: 1,
              padding: 8,
              callbacks: {
                label: (context) => ` ${context.label}: ${context.raw} paciente(s) (Clique para filtrar)`
              }
            }
          }
        }
      });
    } catch(err) {
      console.warn('Erro ao renderizar kanbanSlaChart:', err);
    }
  }
}

// Global Filter Handlers
window.setKanbanSlaFilter = function(slaType) {
  currentSlaFilter = (currentSlaFilter === slaType) ? 'all' : slaType;
  if(window.showToast) window.showToast(currentSlaFilter === 'all' ? 'Filtro SLA removido' : `Filtrando por SLA: ${slaType}`);
  loadAndRenderKanban();
};

window.resetKanbanAllFilters = function() {
  currentFilter = 'all';
  currentSlaFilter = 'all';
  if (typeof window.setKanbanFilter === 'function') window.setKanbanFilter('all');
  else loadAndRenderKanban();
};

// ──── Modais Interativos dos Cards do Kanban ────
window.openKanbanSectorBreakdownModal = function() {
  document.getElementById('kanban-sector-modal')?.remove();
  const all = localDB.list('hospitalizations');
  const patients = localDB.list('patients');
  const active = all.filter(h => h.status !== 'Alta').map(h => {
    const pat = patients.find(p => p.id === h.patient_id) || {};
    return { ...h, patientName: pat.fullName || pat.name || 'Desconhecido' };
  });

  const total = active.length;
  const sectorRowsHtml = KANBAN_COLUMNS.map(col => {
    const sectorPatients = active.filter(h => h.current_sector === col.id);
    const pct = total > 0 ? Math.round((sectorPatients.length / total) * 100) : 0;
    
    const listHtml = sectorPatients.map(h => `
      <div style="display:flex; justify-content:space-between; align-items:center; padding:8px 10px; background:var(--bg-tertiary); border-radius:8px; border:1px solid var(--border-color); font-size:0.8rem;">
        <div style="display:flex; align-items:center; gap:8px;">
          <i class="fa-solid fa-user" style="color:${col.color}; font-size:0.8rem;"></i>
          <strong style="color:var(--text-primary);">${h.patientName}</strong>
        </div>
        <div style="display:flex; gap:8px; align-items:center;">
          <span style="font-size:0.7rem; color:var(--text-muted);">Leito ${h.bed || '-'}</span>
          <button onclick="window.openPatientHistoryModal('${h.patient_id}', '${(h.patientName||'').replace(/'/g, "\\'")}'  ); document.getElementById('kanban-sector-modal')?.remove();" style="padding:2px 8px; border-radius:6px; background:rgba(99,102,241,0.15); border:1px solid rgba(99,102,241,0.3); color:var(--color-primary); font-size:0.7rem; font-weight:700; cursor:pointer;">Ver Card</button>
        </div>
      </div>
    `).join('');

    return `
      <div style="margin-bottom:14px; background:var(--glass-bg); border:1px solid var(--glass-border); border-left:4px solid ${col.color}; border-radius:12px; padding:14px;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
          <h4 style="margin:0; font-size:0.9rem; font-weight:700; color:${col.color}; display:flex; align-items:center; gap:8px;">
            <span style="width:10px; height:10px; border-radius:50%; background:${col.color};"></span>
            ${col.label} (${sectorPatients.length})
          </h4>
          <span style="font-size:0.75rem; font-weight:700; color:var(--text-muted);">${pct}% do total</span>
        </div>
        <div style="display:flex; flex-direction:column; gap:6px; max-height:160px; overflow-y:auto;">
          ${sectorPatients.length > 0 ? listHtml : '<p style="font-size:0.75rem; color:var(--text-muted); margin:0;">Nenhum paciente neste setor.</p>'}
        </div>
      </div>
    `;
  }).join('');

  document.body.insertAdjacentHTML('beforeend', `
    <div id="kanban-sector-modal" style="display:flex; justify-content:center; align-items:center; position:fixed; top:0; left:0; width:100vw; height:100vh; background:rgba(5,7,20,0.85); z-index:100000; backdrop-filter:blur(10px);">
      <div style="background:var(--bg-secondary); border:1px solid var(--glass-border); width:90%; max-width:650px; max-height:85vh; border-radius:24px; display:flex; flex-direction:column; box-shadow:var(--shadow-xl, 0 30px 60px rgba(0,0,0,0.3)); overflow:hidden;">
        <div style="padding:20px 24px; border-bottom:1px solid var(--border-color); display:flex; justify-content:space-between; align-items:center; background:var(--bg-tertiary);">
          <h3 style="margin:0; font-size:1.1rem; font-weight:700; color:var(--text-primary); display:flex; align-items:center; gap:8px;">
            <i class="fa-solid fa-chart-pie" style="color:#6366f1;"></i> Detalhamento por Setor (${total} Pacientes)
          </h3>
          <button onclick="document.getElementById('kanban-sector-modal').remove()" style="background:none; border:none; color:var(--text-muted); font-size:1.2rem; cursor:pointer;"><i class="fa-solid fa-xmark"></i></button>
        </div>
        <div style="padding:20px; overflow-y:auto; flex-grow:1; background:var(--bg-secondary);">
          ${sectorRowsHtml}
        </div>
        <div style="padding:16px 24px; border-top:1px solid var(--border-color); background:var(--bg-tertiary); display:flex; justify-content:flex-end;">
          <button onclick="document.getElementById('kanban-sector-modal').remove()" class="btn-primary" style="padding:8px 18px; border-radius:8px; font-weight:600; font-size:0.85rem;">Fechar</button>
        </div>
      </div>
    </div>
  `);
};

window.openKanbanSlaAuditModal = function() {
  document.getElementById('kanban-sla-modal')?.remove();
  const all = localDB.list('hospitalizations');
  const patients = localDB.list('patients');
  const active = all.filter(h => h.status !== 'Alta').map(h => {
    const pat = patients.find(p => p.id === h.patient_id) || {};
    return { ...h, patientName: pat.fullName || pat.name || 'Desconhecido' };
  });

  const now = new Date();
  const audited = active.map(p => {
    const col = KANBAN_COLUMNS.find(c => c.id === p.current_sector) || KANBAN_COLUMNS[0];
    const { statusText, timeStr, pct, statusColor } = calcStatus(p, col);
    return { ...p, col, statusText, timeStr, pct, statusColor };
  });

  const exceededList = audited.filter(a => a.statusText === 'Meta excedida');
  const warningList = audited.filter(a => a.statusText === 'Atencao');
  const onTimeList = audited.filter(a => a.statusText === 'No prazo');

  const renderGroup = (title, icon, color, list) => `
    <div style="margin-bottom:16px; background:var(--glass-bg); border:1px solid var(--glass-border); border-left:4px solid ${color}; border-radius:12px; padding:14px;">
      <h4 style="margin:0 0 10px 0; font-size:0.9rem; font-weight:700; color:${color}; display:flex; align-items:center; gap:8px;">
        <i class="fa-solid ${icon}"></i> ${title} (${list.length})
      </h4>
      <div style="display:flex; flex-direction:column; gap:6px; max-height:160px; overflow-y:auto;">
        ${list.map(p => `
          <div style="display:flex; justify-content:space-between; align-items:center; padding:8px 12px; background:var(--bg-tertiary); border-radius:8px; border:1px solid var(--border-color); font-size:0.8rem;">
            <div>
              <strong style="color:var(--text-primary);">${p.patientName}</strong>
              <span style="font-size:0.7rem; color:var(--text-muted); margin-left:8px;">Setor: ${p.col.shortLabel}</span>
            </div>
            <div style="display:flex; gap:10px; align-items:center;">
              <span style="font-weight:700; color:${color}; font-size:0.75rem;">${p.timeStr}</span>
              <button onclick="window.openPatientHistoryModal('${p.patient_id}', '${(p.patientName||'').replace(/'/g, "\\'")}'); document.getElementById('kanban-sla-modal')?.remove();" style="padding:3px 8px; border-radius:6px; background:rgba(99,102,241,0.15); border:1px solid rgba(99,102,241,0.3); color:var(--color-primary); font-size:0.7rem; font-weight:700; cursor:pointer;">Prontuário</button>
            </div>
          </div>
        `).join('')}
        ${list.length === 0 ? `<p style="font-size:0.75rem; color:var(--text-muted); margin:0;">Nenhum paciente neste status.</p>` : ''}
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', `
    <div id="kanban-sla-modal" style="display:flex; justify-content:center; align-items:center; position:fixed; top:0; left:0; width:100vw; height:100vh; background:rgba(5,7,20,0.85); z-index:100000; backdrop-filter:blur(10px);">
      <div style="background:var(--bg-secondary); border:1px solid var(--glass-border); width:90%; max-width:680px; max-height:85vh; border-radius:24px; display:flex; flex-direction:column; box-shadow:var(--shadow-xl, 0 30px 60px rgba(0,0,0,0.3)); overflow:hidden;">
        <div style="padding:20px 24px; border-bottom:1px solid var(--border-color); display:flex; justify-content:space-between; align-items:center; background:var(--bg-tertiary);">
          <h3 style="margin:0; font-size:1.1rem; font-weight:700; color:var(--text-primary); display:flex; align-items:center; gap:8px;">
            <i class="fa-solid fa-hourglass-half" style="color:#f59e0b;"></i> Auditoria de SLAs & Metas de Permanência
          </h3>
          <button onclick="document.getElementById('kanban-sla-modal').remove()" style="background:none; border:none; color:var(--text-muted); font-size:1.2rem; cursor:pointer;"><i class="fa-solid fa-xmark"></i></button>
        </div>
        <div style="padding:20px; overflow-y:auto; flex-grow:1; background:var(--bg-secondary);">
          ${renderGroup('Meta Excedida (Gargalos de Permanência)', 'fa-circle-exclamation', '#e05c6e', exceededList)}
          ${renderGroup('Atenção (Próximos do Limite)', 'fa-triangle-exclamation', '#f59e0b', warningList)}
          ${renderGroup('No Prazo', 'fa-circle-check', '#10b981', onTimeList)}
        </div>
        <div style="padding:16px 24px; border-top:1px solid var(--border-color); background:var(--bg-tertiary); display:flex; justify-content:space-between; align-items:center;">
          <div style="display:flex; gap:8px;">
            <button onclick="setKanbanSlaFilter('exceeded'); document.getElementById('kanban-sla-modal').remove();" style="padding:6px 12px; border-radius:8px; background:rgba(224,92,110,0.12); border:1px solid rgba(224,92,110,0.3); color:#e05c6e; font-size:0.75rem; font-weight:700; cursor:pointer;">Filtrar Atrasados</button>
            <button onclick="resetKanbanAllFilters(); document.getElementById('kanban-sla-modal').remove();" style="padding:6px 12px; border-radius:8px; background:var(--bg-hover); border:1px solid var(--border-color); color:var(--text-muted); font-size:0.75rem; font-weight:700; cursor:pointer;">Ver Todos</button>
          </div>
          <button onclick="document.getElementById('kanban-sla-modal').remove()" class="btn-primary" style="padding:8px 18px; border-radius:8px; font-weight:600; font-size:0.85rem;">Fechar</button>
        </div>
      </div>
    </div>
  `);
};

window.openKanbanFunnelDetailModal = function() {
  document.getElementById('kanban-funnel-modal')?.remove();
  const all = localDB.list('hospitalizations');
  const active = all.filter(h => h.status !== 'Alta');
  const total = active.length || 1;

  const funnelRowsHtml = KANBAN_COLUMNS.map(col => {
    const count = active.filter(h => h.current_sector === col.id).length;
    const pct = Math.round((count / total) * 100);
    return `
      <div style="background:rgba(30, 41, 59, 0.5); border:1px solid rgba(255,255,255,0.08); border-radius:10px; padding:12px 16px; margin-bottom:8px; display:flex; justify-content:space-between; align-items:center;">
        <div style="display:flex; align-items:center; gap:10px;">
          <span style="width:12px; height:12px; border-radius:50%; background:${col.color};"></span>
          <strong style="color:var(--text-primary); font-size:0.88rem;">${col.label}</strong>
        </div>
        <div style="display:flex; align-items:center; gap:16px;">
          <span style="font-size:0.8rem; color:var(--text-muted);">Meta: <b>${col.maxDays ? col.maxDays+' dias' : col.maxHours+' horas'}</b></span>
          <span style="font-weight:800; color:${col.color}; font-size:0.9rem;">${count} <small style="font-size:0.7rem; color:var(--text-muted);">(${pct}%)</small></span>
          <button onclick="setKanbanFilter('${col.id}'); document.getElementById('kanban-funnel-modal')?.remove();" style="padding:4px 10px; border-radius:6px; background:rgba(99,102,241,0.15); border:1px solid rgba(99,102,241,0.3); color:#818cf8; font-size:0.72rem; font-weight:700; cursor:pointer;">Filtrar</button>
        </div>
      </div>
    `;
  }).join('');

  document.body.insertAdjacentHTML('beforeend', `
    <div id="kanban-funnel-modal" style="display:flex; justify-content:center; align-items:center; position:fixed; top:0; left:0; width:100vw; height:100vh; background:rgba(5,7,20,0.85); z-index:100000; backdrop-filter:blur(10px);">
      <div style="background:var(--bg-primary); border:1px solid var(--border-color); width:90%; max-width:600px; border-radius:16px; display:flex; flex-direction:column; box-shadow:0 20px 40px rgba(0,0,0,0.5); overflow:hidden;">
        <div style="padding:16px 20px; border-bottom:1px solid var(--border-color); display:flex; justify-content:space-between; align-items:center; background:var(--bg-card);">
          <h3 style="margin:0; font-size:1.1rem; font-weight:700; color:var(--text-primary); display:flex; align-items:center; gap:8px;">
            <i class="fa-solid fa-filter" style="color:#3b82f6;"></i> Análise do Funil Assistencial
          </h3>
          <button onclick="document.getElementById('kanban-funnel-modal').remove()" style="background:none; border:none; color:var(--text-muted); font-size:1.2rem; cursor:pointer;"><i class="fa-solid fa-xmark"></i></button>
        </div>
        <div style="padding:20px; overflow-y:auto;">
          <p style="font-size:0.82rem; color:var(--text-muted); margin-top:0; margin-bottom:14px; line-height:1.5;">
            O funil da jornada hospitalar retrata a taxa de vazão e retenção dos pacientes em cada setor de hospitalização.
          </p>
          ${funnelRowsHtml}
        </div>
        <div style="padding:14px 20px; border-top:1px solid var(--border-color); background:var(--bg-card); display:flex; justify-content:flex-end;">
          <button onclick="document.getElementById('kanban-funnel-modal').remove()" class="btn-primary" style="padding:8px 18px; border-radius:8px; font-weight:600; font-size:0.85rem;">Fechar</button>
        </div>
      </div>
    </div>
  `);
};

