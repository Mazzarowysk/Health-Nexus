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
let kanbanChartInstance = null;

export async function renderKanbanTab() {
  const contentArea = document.getElementById('main-content');
  if (!contentArea) return;

  const FILTER_CARDS = [
    { id: 'all', label: 'Todos Setores', icon: 'fa-hospital-user', color: '#6366f1', rgb: '99,102,241' },
    { id: 'pronto_socorro', label: 'Pronto Socorro', icon: 'fa-truck-medical', color: '#3b82f6', rgb: '59,130,246' },
    { id: 'corredor_internacao', label: 'Corredor', icon: 'fa-bed-pulse', color: '#f59e0b', rgb: '245,158,11' },
    { id: 'clinica_cirurgica', label: 'Cirurgica', icon: 'fa-scalpel', color: '#8b5cf6', rgb: '139,92,246' },
    { id: 'clinica_medica', label: 'Clinica Medica', icon: 'fa-stethoscope', color: '#10b981', rgb: '16,185,129' },
    { id: 'uti', label: 'UTI', icon: 'fa-heart-pulse', color: '#ef4444', rgb: '239,68,68' }
  ];

  const filtersHtml = FILTER_CARDS.map(f => `
    <div onclick="setKanbanFilter('${f.id}')" id="kf-${f.id}" class="kanban-filter-card" data-color="${f.color}" data-rgb="${f.rgb}" style="background: var(--bg-secondary); border: 1px solid var(--border-color); border-radius: 14px; padding: 14px; cursor: pointer; transition: all 0.2s ease; position: relative; display: flex; flex-direction: column; justify-content: space-between; height: 100%;" onmouseenter="if(currentFilter !== '${f.id}') { this.style.transform='translateY(-2px)'; this.style.borderColor='rgba(${f.rgb},0.4)'; }" onmouseleave="if(currentFilter !== '${f.id}') { this.style.transform='none'; this.style.borderColor='var(--border-color)'; }">
      <div style="display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 12px;">
        <div style="width: 38px; height: 38px; border-radius: 10px; background: rgba(${f.rgb}, 0.15); border: 1px solid rgba(${f.rgb}, 0.3); display: flex; align-items: center; justify-content: center; color: ${f.color}; font-size: 1.1rem;">
          <i class="fa-solid ${f.icon}"></i>
        </div>
        <span class="card-status-badge" style="display: none; font-size: 0.65rem; font-weight: 700; padding: 3px 8px; border-radius: 20px; background: rgba(${f.rgb}, 0.2); color: ${f.color}; border: 1px solid rgba(${f.rgb}, 0.4); letter-spacing: 0.5px;">ATIVO</span>
      </div>
      <div>
        <h4 style="font-size: 0.95rem; font-weight: 700; color: var(--text-primary); margin: 0 0 4px 0;">${f.label}</h4>
        <p style="font-size: 0.75rem; color: var(--text-muted); margin: 0; font-weight: 600;"><span id="count-${f.id}">0</span> pacientes</p>
      </div>
    </div>
  `).join('');

  contentArea.innerHTML = `
    <div class="tab-section active" id="kanban-root" style="display:flex; flex-direction:column; height: calc(100vh - 60px); overflow:hidden;">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px; flex-wrap:wrap; gap:12px; flex-shrink:0;">
        <div>
          <h2 style="font-family:'Outfit'; font-weight:700; font-size:1.4rem; margin:0; color:var(--text-primary);">
            <i class="fa-solid fa-table-columns" style="color:var(--color-primary);"></i> Kanban de Internação
          </h2>
          <p style="margin:4px 0 0; font-size:0.82rem; color:var(--text-muted);">Gestão visual do fluxo de pacientes e acompanhamento de metas evolutivas.</p>
        </div>
        <div style="display:flex; gap:8px; align-items:center; flex-wrap:wrap;">
          <button onclick="openAddPatientKanbanModal()" class="btn-primary" style="padding:10px 18px; border-radius:10px; font-size:0.85rem; font-weight:600; display:flex; align-items:center; gap:8px; box-shadow: 0 4px 14px rgba(99,102,241,0.3);">
            <i class="fa-solid fa-plus"></i> Adicionar Paciente
          </button>
        </div>
      </div>

      <!-- Analytics Header Dashboard -->
      <div style="display:flex; gap: 16px; margin-bottom: 16px; flex-shrink:0; flex-wrap:wrap; align-items:stretch;">
        
        <!-- Chart 1: Distribuição por Setor -->
        <div class="kanban-chart-card" style="flex: 1; min-width: 220px; background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 14px; padding: 14px; box-shadow: 0 4px 14px rgba(0,0,0,0.1); display: flex; flex-direction: column; position: relative;">
          <h4 style="font-size: 0.85rem; font-weight: 700; color: var(--text-primary); margin: 0 0 10px 0; text-align: center; display:flex; align-items:center; justify-content:center; gap:6px;">
            <i class="fa-solid fa-chart-pie" style="color: #6366f1;"></i> Distribuição por Setor
          </h4>
          <div style="flex-grow: 1; position: relative; height: 140px;">
            <canvas id="kanbanSectorChart"></canvas>
            <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); text-align: center; pointer-events: none;">
              <span id="kanban-chart-center-val" style="font-size: 1.3rem; font-weight: 800; color: var(--text-primary);">0</span>
              <br>
              <span style="font-size: 0.6rem; color: var(--text-muted); text-transform: uppercase; font-weight: 700;">Pacientes</span>
            </div>
          </div>
        </div>

        <!-- Chart 2: SLA & Metas de Tempo -->
        <div class="kanban-chart-card" style="flex: 1; min-width: 220px; background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 14px; padding: 14px; box-shadow: 0 4px 14px rgba(0,0,0,0.1); display: flex; flex-direction: column; position: relative;">
          <h4 style="font-size: 0.85rem; font-weight: 700; color: var(--text-primary); margin: 0 0 10px 0; text-align: center; display:flex; align-items:center; justify-content:center; gap:6px;">
            <i class="fa-solid fa-hourglass-half" style="color: #f59e0b;"></i> Metas de Tempo (SLA)
          </h4>
          <div style="flex-grow: 1; position: relative; height: 140px;">
            <canvas id="kanbanSlaChart"></canvas>
            <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); text-align: center; pointer-events: none;">
              <span id="kanban-sla-center-val" style="font-size: 1.3rem; font-weight: 800; color: #10b981;">0%</span>
              <br>
              <span style="font-size: 0.6rem; color: var(--text-muted); text-transform: uppercase; font-weight: 700;">No Prazo</span>
            </div>
          </div>
        </div>

        <!-- Funil da Jornada de Internação -->
        <div style="flex: 1.6; min-width: 280px; background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 14px; padding: 14px; box-shadow: 0 4px 14px rgba(0,0,0,0.1); display: flex; flex-direction: column; justify-content: space-between;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
            <h4 style="font-size: 0.85rem; font-weight: 700; color: var(--text-primary); margin: 0; display:flex; align-items:center; gap:6px;">
              <i class="fa-solid fa-filter" style="color: #3b82f6;"></i> Funil da Jornada Hospitalar
            </h4>
            <span id="kanban-resolutividade-tag" style="font-size: 0.68rem; font-weight: 700; padding: 2px 8px; border-radius: 12px; background: rgba(16,185,129,0.15); color: #10b981; border: 1px solid rgba(16,185,129,0.3);">
              Carregando...
            </span>
          </div>

          <!-- Progress / Funnel Bars -->
          <div id="kanban-funnel-container" style="display:flex; flex-direction:column; gap:6px; justify-content:center; flex-grow:1;">
          </div>
        </div>

      </div>

      <!-- Filters Grid -->
      <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: 12px; margin-bottom: 16px; flex-shrink:0;">
        ${filtersHtml}
      </div>

      <div class="kanban-board" id="kanban-board" style="display:flex; gap:16px; overflow-x:auto; flex-grow:1; padding-bottom:16px; align-items:flex-start;">
      </div>
    </div>
  `;

  loadAndRenderKanban();
  // Ensure the correct filter styling is applied initially
  setTimeout(() => setKanbanFilter(currentFilter), 10);
}

window.setKanbanFilter = function(filterId) {
  currentFilter = filterId;
  document.querySelectorAll('.kanban-filter-card').forEach(card => {
    const id = card.id.replace('kf-', '');
    const isActive = id === filterId;
    const rgb = card.getAttribute('data-rgb');
    const badge = card.querySelector('.card-status-badge');
    
    if (isActive) {
      card.style.background = `rgba(${rgb}, 0.08)`;
      card.style.borderColor = `rgba(${rgb}, 0.5)`;
      card.style.borderWidth = '1.5px';
      card.style.boxShadow = `0 6px 20px rgba(${rgb}, 0.15)`;
      card.style.transform = 'translateY(-2px)';
      if (badge) badge.style.display = 'inline-block';
    } else {
      card.style.background = 'var(--bg-secondary)';
      card.style.borderColor = 'var(--border-color)';
      card.style.borderWidth = '1px';
      card.style.boxShadow = 'none';
      card.style.transform = 'none';
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
  const diagHtml = hosp.diagnosis ? `<div style="font-size:0.72rem; color:var(--text-muted); display:flex; align-items:center; gap:6px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;" title="${hosp.diagnosis}"><i class="fa-solid fa-stethoscope" style="width:14px; text-align:center;"></i> <span style="overflow:hidden; text-overflow:ellipsis;">${hosp.diagnosis}</span></div>` : '';
  const bedHtml = hosp.bed ? `<div style="font-size:0.72rem; color:var(--text-muted); display:flex; align-items:center; gap:6px;"><i class="fa-solid fa-bed" style="width:14px; text-align:center;"></i> Leito: <b style="color:var(--text-primary);">${hosp.bed}</b></div>` : '';
  const drHtml = hosp.doctor_name ? `<div style="font-size:0.72rem; color:var(--text-muted); display:flex; align-items:center; gap:6px;"><i class="fa-solid fa-user-doctor" style="width:14px; text-align:center;"></i> Dr(a). ${hosp.doctor_name}</div>` : '';

  // Safe escape for name if it contains single quotes
  const safeName = (hosp.patientName || '').replace(/'/g, "\\'");

  return `
    <div class="kanban-card" onclick="if(typeof window.openPatientHistoryModal === 'function') window.openPatientHistoryModal('${hosp.patient_id}', '${safeName}');" draggable="true" data-hosp-id="${hosp.id}" style="background:var(--bg-card); border:1px solid var(--border-color); border-left:4px solid ${statusColor}; border-radius:10px; padding:14px; cursor:pointer; box-shadow:0 2px 8px rgba(0,0,0,0.15); position:relative; transition: transform 0.2s ease, box-shadow 0.2s ease; display:flex; flex-direction:column; gap:12px;" onmouseenter="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 6px 14px rgba(0,0,0,0.25)';" onmouseleave="this.style.transform='none'; this.style.boxShadow='0 2px 8px rgba(0,0,0,0.15)';">
      
      <!-- Top: User Info & ID -->
      <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:8px;">
        <div style="display:flex; align-items:center; gap:10px; min-width:0;">
          <div style="width:34px; height:34px; border-radius:50%; background:linear-gradient(135deg,${col.color}44,${col.color}88); display:flex; align-items:center; justify-content:center; font-size:0.75rem; font-weight:700; color:${col.color}; flex-shrink:0; border: 1px solid ${col.color}44;">${initials}</div>
          <strong style="font-size:0.95rem; color:var(--text-primary); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;" title="${hosp.patientName}">${hosp.patientName}</strong>
        </div>
        <div style="display:flex; align-items:center; flex-shrink:0;">
          <span style="font-size:0.65rem; padding:3px 6px; border-radius:6px; font-weight:600; background:var(--bg-secondary); color:var(--text-muted); border: 1px solid var(--border-color);">${(hosp.patient_id||'').substring(0,6)}</span>
        </div>
      </div>
      
      <!-- Middle: Details -->
      <div style="display:flex; flex-direction:column; gap:4px; margin-top:-2px;">
        ${diagHtml}${bedHtml}${drHtml}
      </div>
      
      <!-- Progress/Sector bar -->
      <div style="background: rgba(0,0,0,0.1); padding: 8px 10px; border-radius: 8px;">
        <div style="display:flex; justify-content:space-between; margin-bottom:6px; align-items:center;">
          <span style="font-size:0.7rem; color:var(--text-muted);"><i class="fa-regular fa-clock" style="margin-right:4px;"></i>Setor: <b style="color:var(--text-primary);">${timeStr}</b></span>
          <span style="font-size:0.7rem; font-weight:700; color:${statusColor};">${statusText}</span>
        </div>
        <div style="height:6px; background:var(--border-color); border-radius:3px; overflow:hidden;">
          <div style="height:100%; width:${pct}%; background:${statusColor}; border-radius:3px; box-shadow: 0 0 6px ${statusColor};"></div>
        </div>
      </div>
      
      <!-- Action Buttons Row 1: Interactions -->
      <div style="display:grid; grid-template-columns: 1fr 1fr; gap:8px;">
        <button onclick="openPatientHistoryModal('${hosp.patient_id}', '${safeName}')" style="background:var(--color-primary); color:#fff; border:none; border-radius:6px; padding:6px; font-size:0.75rem; font-weight:600; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:6px; transition:0.2s; box-shadow:0 2px 6px rgba(0,0,0,0.1);" onmouseover="this.style.opacity='0.9'" onmouseout="this.style.opacity='1'" title="Acessar Prontuário, Consultas e Histórico">
          <i class="fa-solid fa-notes-medical"></i> Prontuário
        </button>
        <button onclick="viewKanbanNotes('${hosp.id}')" style="background:var(--bg-secondary); color:var(--text-primary); border:1px solid var(--border-color); border-radius:6px; padding:6px; font-size:0.75rem; font-weight:600; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:6px; transition:0.2s;" onmouseover="this.style.background='var(--bg-hover)'" onmouseout="this.style.background='var(--bg-secondary)'" title="Evoluções e Anotações">
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

function loadAndRenderKanban() {
  const board = document.getElementById('kanban-board');
  if (!board) return;
  const all = localDB.list('hospitalizations');
  const patients = localDB.list('patients');
  const active = all.filter(h => h.status !== 'Alta').map(h => {
    const pat = patients.find(p => p.id === h.patient_id) || {};
    return { ...h, patientName: pat.fullName || pat.name || 'Desconhecido' };
  });

  // Atualizar os contadores nos filtros
  const cAll = document.getElementById('count-all'); if(cAll) cAll.textContent = active.length;
  const cPs = document.getElementById('count-pronto_socorro'); if(cPs) cPs.textContent = active.filter(h => h.current_sector === 'pronto_socorro').length;
  const cCor = document.getElementById('count-corredor_internacao'); if(cCor) cCor.textContent = active.filter(h => h.current_sector === 'corredor_internacao').length;
  const cCir = document.getElementById('count-clinica_cirurgica'); if(cCir) cCir.textContent = active.filter(h => h.current_sector === 'clinica_cirurgica').length;
  const cMed = document.getElementById('count-clinica_medica'); if(cMed) cMed.textContent = active.filter(h => h.current_sector === 'clinica_medica').length;
  const cUti = document.getElementById('count-uti'); if(cUti) cUti.textContent = active.filter(h => h.current_sector === 'uti').length;

  const cols = currentFilter === 'all' ? KANBAN_COLUMNS : KANBAN_COLUMNS.filter(c => c.id === currentFilter);
  const w = currentFilter === 'all' ? '290px' : '360px'; // Colunas mais largas

  function hexToRgb(hex) {
    const bigint = parseInt(hex.slice(1), 16);
    return `${(bigint >> 16) & 255}, ${(bigint >> 8) & 255}, ${bigint & 255}`;
  }

  board.innerHTML = cols.map(col => {
    const cards = active.filter(h => h.current_sector === col.id).sort((a,b) => new Date(a.sector_entry_date)-new Date(b.sector_entry_date));
    const rgb = hexToRgb(col.color);
    
    return `
      <div class="kanban-col" data-col="${col.id}" style="min-width:${w}; width:${w}; background: rgba(${rgb}, 0.05); border-radius:14px; display:flex; flex-direction:column; border:1.5px solid rgba(${rgb}, 0.3); box-shadow:0 6px 16px rgba(${rgb}, 0.08); flex-shrink:0; overflow:hidden;">
        <div style="padding:16px; border-bottom:1px solid rgba(${rgb}, 0.2); background: rgba(${rgb}, 0.1); display:flex; justify-content:space-between; align-items:center;">
          <h3 style="margin:0; font-size:0.95rem; font-weight:700; color:${col.color}; display:flex; align-items:center; gap:8px;">
            <span style="width:12px; height:12px; border-radius:50%; background:${col.color}; display:inline-block; flex-shrink:0; box-shadow: 0 0 8px ${col.color};"></span>
            ${col.label}
          </h3>
          <div style="display:flex; align-items:center; gap:8px;">
            ${col.maxDays ? `<span style="font-size:0.7rem; color:${col.color}; font-weight:700; padding: 2px 6px; background: rgba(${rgb}, 0.15); border-radius: 6px; border: 1px solid rgba(${rgb}, 0.3);">Meta: ${col.maxDays}d</span>` : (col.maxHours ? `<span style="font-size:0.7rem; color:${col.color}; font-weight:700; padding: 2px 6px; background: rgba(${rgb}, 0.15); border-radius: 6px; border: 1px solid rgba(${rgb}, 0.3);">Meta: ${col.maxHours}h</span>` : '')}
            <span style="background: ${col.color}; color:#fff; font-size:0.75rem; padding:2px 10px; border-radius:12px; font-weight:800; box-shadow: 0 2px 6px rgba(${rgb}, 0.4);">${cards.length}</span>
          </div>
        </div>
        <div class="kanban-col-body" style="padding:14px; flex-grow:1; overflow-y:auto; display:flex; flex-direction:column; gap:14px; min-height:200px; max-height:calc(100vh - 350px);">
          ${cards.map(h => renderCard(h, col)).join('')}
          ${cards.length === 0 ? `<div onclick="openAddPatientKanbanModal('${col.id}')" style="text-align:center;padding:40px 10px;color:rgba(${rgb},0.6);font-size:0.85rem; cursor:pointer; transition:all 0.2s; border-radius:10px;" onmouseover="this.style.background='rgba(${rgb},0.1)';this.style.color='rgba(${rgb},0.9)'" onmouseout="this.style.background='transparent';this.style.color='rgba(${rgb},0.6)'" title="Clique para adicionar paciente neste setor"><i class="fa-regular fa-circle-check" style="font-size:2.2rem;margin-bottom:12px;display:block;opacity:0.5;color:${col.color}"></i>Clique para adicionar</div>` : ''}
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
        if(window.showToast) window.showToast('Paciente movido para '+name);
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
    <div id="kanban-modal" style="display:flex;justify-content:center;align-items:center;position:fixed;top:0;left:0;width:100vw;height:100vh;background:rgba(0,0,0,0.75);z-index:99999;backdrop-filter:blur(6px);">
      <div style="background:#18152e;padding:26px 28px;border-radius:16px;width:92%;max-width:480px;box-shadow:0 25px 60px rgba(0,0,0,0.7);border:1px solid rgba(139,92,246,0.35);max-height:90vh;overflow-y:auto;">
        
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
  localDB.insert('hospitalizations',{patient_id:patId,current_sector:sectorId,sector_entry_date:admDate,admission_date:admDate,bed,diagnosis,doctor_id:doctorId,doctor_name:doctorName,notes,status:'Internado'});
  document.getElementById('kanban-modal').remove();
  if(window.showToast) window.showToast('Paciente adicionado ao Kanban!');
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
    <div id="kanban-edit-modal" style="display:flex;justify-content:center;align-items:center;position:fixed;top:0;left:0;width:100vw;height:100vh;background:rgba(0,0,0,0.75);z-index:99999;backdrop-filter:blur(6px);">
      <div style="background:#18152e;padding:26px 28px;border-radius:16px;width:92%;max-width:480px;box-shadow:0 25px 60px rgba(0,0,0,0.7);border:1px solid rgba(139,92,246,0.35);">
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
    <div id="kanban-move-modal" style="display:flex;justify-content:center;align-items:center;position:fixed;top:0;left:0;width:100vw;height:100vh;background:rgba(0,0,0,0.75);z-index:99999;backdrop-filter:blur(6px);">
      <div style="background:#18152e;padding:26px 28px;border-radius:16px;width:92%;max-width:380px;box-shadow:0 25px 60px rgba(0,0,0,0.7);border:1px solid rgba(139,92,246,0.35);">
        <h3 style="margin:0 0 8px;color:#ffffff;font-family:'Outfit',sans-serif;font-size:1.15rem;font-weight:700;"><i class="fa-solid fa-arrow-right-arrow-left" style="color:#6366f1;"></i> Mover Setor</h3>
        <p style="font-size:0.9rem;color:#cbd5e1;margin:0 0 18px;font-weight:600;">${pat.fullName || pat.name||'Paciente'}</p>
        <div><label style="display:block;margin-bottom:6px;font-size:0.85rem;color:#f1f5f9;font-weight:700;">Novo Setor</label>
          <select id="move-sector-select" class="form-control" style="width:100%;padding:10px;border-radius:8px;border:1.5px solid rgba(139,92,246,0.4);background:#0f172a;color:#ffffff;font-size:0.9rem;font-weight:500;">
            ${KANBAN_COLUMNS.map(c=>`<option value="${c.id}" ${c.id===hosp.current_sector?'selected':''} style="background:#0f172a;color:#ffffff;">${c.label}</option>`).join('')}
          </select></div>
        <div style="display:flex;justify-content:flex-end;gap:10px;margin-top:22px;">
          <button onclick="document.getElementById('kanban-move-modal').remove()" style="padding:9px 18px;border-radius:8px;border:1px solid rgba(255,255,255,0.2);background:rgba(255,255,255,0.06);color:#f1f5f9;cursor:pointer;font-size:0.88rem;font-weight:600;">Cancelar</button>
          <button onclick="confirmMoveKanban('${hospId}')" style="padding:9px 18px;border-radius:8px;background:linear-gradient(135deg, #6366f1, #8b5cf6);color:#fff;border:none;cursor:pointer;font-size:0.88rem;font-weight:700;box-shadow:0 4px 14px rgba(99,102,241,0.4);"><i class="fa-solid fa-check"></i> Mover</button>
        </div>
      </div>
    </div>`);
};

window.confirmMoveKanban = function(hospId) {
  const ns=document.getElementById('move-sector-select').value;
  const hosp=localDB.get('hospitalizations',hospId);
  if(hosp && hosp.current_sector!==ns) {
    localDB.update('hospitalizations',hospId,{current_sector:ns,sector_entry_date:new Date().toISOString()});
    const name=KANBAN_COLUMNS.find(c=>c.id===ns)?.label||ns;
    if(window.showToast) window.showToast('Paciente movido para '+name);
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
    <div id="kanban-notes-modal" style="display:flex;justify-content:center;align-items:center;position:fixed;top:0;left:0;width:100vw;height:100vh;background:rgba(0,0,0,0.75);z-index:99999;backdrop-filter:blur(6px);">
      <div style="background:#18152e;padding:26px 28px;border-radius:16px;width:92%;max-width:560px;box-shadow:0 25px 60px rgba(0,0,0,0.7);border:1px solid rgba(139,92,246,0.35);max-height:90vh;overflow-y:auto;display:flex;flex-direction:column;gap:0;">
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
  if(confirm('Registrar ALTA para este paciente? Ele sai do Kanban.')) {
    localDB.update('hospitalizations',hospId,{status:'Alta',discharge_date:new Date().toISOString()});
    if(window.showToast) window.showToast('Alta registrada com sucesso!');
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

  // Render Funnel Container
  const funnelContainer = document.getElementById('kanban-funnel-container');
  if (funnelContainer) {
    const sectorCounts = {};
    KANBAN_COLUMNS.forEach(c => sectorCounts[c.id] = 0);
    activePatients.forEach(p => { if (sectorCounts[p.current_sector] !== undefined) sectorCounts[p.current_sector]++; });

    funnelContainer.innerHTML = KANBAN_COLUMNS.map(col => {
      const count = sectorCounts[col.id] || 0;
      const pct = Math.round((count / total) * 100);
      return `
        <div style="display:flex; align-items:center; gap:8px; font-size:0.75rem;">
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

  // 2. Render Sector Chart
  const ctxSector = document.getElementById('kanbanSectorChart');
  if (ctxSector) {
    if (kanbanSectorChartInstance) kanbanSectorChartInstance.destroy();
    
    const dataMap = {};
    KANBAN_COLUMNS.forEach(col => dataMap[col.id] = 0);
    activePatients.forEach(p => { if (dataMap[p.current_sector] !== undefined) dataMap[p.current_sector]++; });

    const centerVal = document.getElementById('kanban-chart-center-val');
    if (centerVal) centerVal.textContent = activePatients.length;

    kanbanSectorChartInstance = new ChartClass(ctxSector, {
      type: 'doughnut',
      data: {
        labels: KANBAN_COLUMNS.map(c => c.shortLabel),
        datasets: [{
          data: KANBAN_COLUMNS.map(c => dataMap[c.id]),
          backgroundColor: KANBAN_COLUMNS.map(c => c.color),
          borderWidth: 2,
          borderColor: 'rgba(18, 14, 34, 0.95)',
          hoverOffset: 4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '72%',
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: 'rgba(18, 14, 34, 0.94)',
            titleColor: '#00f2fe',
            bodyColor: '#f8fafc',
            borderColor: 'rgba(0, 242, 254, 0.35)',
            borderWidth: 1,
            padding: 8
          }
        }
      }
    });
  }

  // 3. Render SLA Chart
  const ctxSla = document.getElementById('kanbanSlaChart');
  if (ctxSla) {
    if (kanbanSlaChartInstance) kanbanSlaChartInstance.destroy();

    kanbanSlaChartInstance = new ChartClass(ctxSla, {
      type: 'doughnut',
      data: {
        labels: ['No Prazo', 'Atenção', 'Meta Excedida'],
        datasets: [{
          data: [onTime, warning, exceeded],
          backgroundColor: ['#10b981', '#f59e0b', '#ef4444'],
          borderWidth: 2,
          borderColor: 'rgba(18, 14, 34, 0.95)',
          hoverOffset: 4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '72%',
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: 'rgba(18, 14, 34, 0.94)',
            titleColor: '#f59e0b',
            bodyColor: '#f8fafc',
            borderColor: 'rgba(245, 158, 11, 0.35)',
            borderWidth: 1,
            padding: 8
          }
        }
      }
    });
  }
}
