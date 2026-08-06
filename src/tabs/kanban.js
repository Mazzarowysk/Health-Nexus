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

      <div style="display:grid; grid-template-columns: repeat(6, minmax(0, 1fr)); gap: 14px; margin-bottom: 20px; flex-shrink:0;">
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
    <div class="kanban-card" draggable="true" data-hosp-id="${hosp.id}" style="background:var(--bg-card); border:1px solid var(--border-color); border-left:4px solid ${statusColor}; border-radius:10px; padding:14px; cursor:grab; box-shadow:0 2px 8px rgba(0,0,0,0.15); position:relative; transition: transform 0.2s ease, box-shadow 0.2s ease; display:flex; flex-direction:column; gap:12px;" onmouseenter="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 6px 14px rgba(0,0,0,0.25)';" onmouseleave="this.style.transform='none'; this.style.boxShadow='0 2px 8px rgba(0,0,0,0.15)';">
      
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
          ${hosp.notes ? '<span style="width:6px;height:6px;background:#ef4444;border-radius:50%;margin-left:2px;" title="Há anotações recentes"></span>' : ''}
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
          ${cards.length === 0 ? `<div style="text-align:center;padding:40px 10px;color:rgba(${rgb},0.6);font-size:0.85rem;"><i class="fa-regular fa-circle-check" style="font-size:2.2rem;margin-bottom:12px;display:block;opacity:0.5;color:${col.color}"></i>Nenhum paciente</div>` : ''}
        </div>
      </div>`;
  }).join('');
  setupDND();
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
window.openAddPatientKanbanModal = function() {
  const ex=document.getElementById('kanban-modal'); if(ex) ex.remove();
  const patients=localDB.list('patients');
  const users=localDB.list('users').filter(u=>['Medico','Master','Desenvolvedor','Enfermeiro'].includes(u.role));
  document.body.insertAdjacentHTML('beforeend', `
    <div id="kanban-modal" style="display:flex;justify-content:center;align-items:center;position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.65);z-index:9999;backdrop-filter:blur(4px);">
      <div style="background:var(--bg-card);padding:28px;border-radius:14px;width:100%;max-width:460px;box-shadow:0 20px 50px rgba(0,0,0,0.4);border:1px solid var(--border-color);max-height:90vh;overflow-y:auto;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;">
          <h3 style="margin:0;color:var(--text-primary);font-family:'Outfit';font-size:1.1rem;"><i class="fa-solid fa-bed-pulse" style="color:var(--color-primary);"></i> Adicionar ao Kanban</h3>
          <button onclick="document.getElementById('kanban-modal').remove()" style="background:none;border:none;cursor:pointer;color:var(--text-muted);font-size:1.3rem;">&times;</button>
        </div>
        <div style="display:grid;gap:14px;">
          <div>
            <label style="display:block;margin-bottom:6px;font-size:0.82rem;color:var(--text-muted);font-weight:600;">Paciente *</label>
            <select id="kanban-pat-select" class="form-control" style="width:100%;padding:9px;border-radius:8px;border:1px solid var(--border-color);background:var(--bg-color);color:var(--text-primary);font-size:0.9rem;">
              <option value="">Selecione o paciente...</option>
              ${patients.map(p => `<option value="${p.id}">${p.fullName || p.name || '(sem nome)'} ${p.cpf ? '— CPF: ' + p.cpf : ''}</option>`).join('')}
            </select>
          </div>
          <div>
            <label style="display:block;margin-bottom:6px;font-size:0.82rem;color:var(--text-muted);font-weight:600;">Setor Inicial *</label>
            <select id="kanban-sector-select" class="form-control" style="width:100%;padding:9px;border-radius:8px;border:1px solid var(--border-color);background:var(--bg-color);color:var(--text-primary);font-size:0.9rem;">
              ${KANBAN_COLUMNS.map(c=>`<option value="${c.id}">${c.label}</option>`).join('')}
            </select>
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
            <div>
              <label style="display:block;margin-bottom:6px;font-size:0.82rem;color:var(--text-muted);font-weight:600;">Leito</label>
              <input id="kanban-bed" type="text" placeholder="Ex: UTI-05" class="form-control" style="width:100%;padding:9px;border-radius:8px;border:1px solid var(--border-color);background:var(--bg-color);color:var(--text-primary);font-size:0.9rem;box-sizing:border-box;">
            </div>
            <div>
              <label style="display:block;margin-bottom:6px;font-size:0.82rem;color:var(--text-muted);font-weight:600;">Data Admissao</label>
              <input id="kanban-admission" type="datetime-local" class="form-control" style="width:100%;padding:9px;border-radius:8px;border:1px solid var(--border-color);background:var(--bg-color);color:var(--text-primary);font-size:0.9rem;box-sizing:border-box;" value="${new Date().toISOString().slice(0,16)}">
            </div>
          </div>
          <div>
            <label style="display:block;margin-bottom:6px;font-size:0.82rem;color:var(--text-muted);font-weight:600;">Diagnostico / Hipotese</label>
            <input id="kanban-diagnosis" type="text" placeholder="Ex: Pneumonia, TCE..." class="form-control" style="width:100%;padding:9px;border-radius:8px;border:1px solid var(--border-color);background:var(--bg-color);color:var(--text-primary);font-size:0.9rem;box-sizing:border-box;">
          </div>
          <div>
            <label style="display:block;margin-bottom:6px;font-size:0.82rem;color:var(--text-muted);font-weight:600;">Medico Responsavel</label>
            <select id="kanban-doctor-select" class="form-control" style="width:100%;padding:9px;border-radius:8px;border:1px solid var(--border-color);background:var(--bg-color);color:var(--text-primary);font-size:0.9rem;">
              <option value="">Selecione...</option>
              ${users.map(u=>`<option value="${u.id}">${u.name || u.username || '(sem nome)'}</option>`).join('')}
            </select>
          </div>
          <div>
            <label style="display:block;margin-bottom:6px;font-size:0.82rem;color:var(--text-muted);font-weight:600;">Observacoes Iniciais</label>
            <textarea id="kanban-notes" placeholder="Notas de admissao..." class="form-control" style="width:100%;padding:9px;border-radius:8px;border:1px solid var(--border-color);background:var(--bg-color);color:var(--text-primary);font-size:0.9rem;min-height:70px;resize:vertical;box-sizing:border-box;"></textarea>
          </div>
        </div>
        <div style="display:flex;justify-content:flex-end;gap:10px;margin-top:20px;">
          <button onclick="document.getElementById('kanban-modal').remove()" style="padding:9px 18px;border-radius:8px;border:1px solid var(--border-color);background:transparent;color:var(--text-primary);cursor:pointer;font-size:0.88rem;">Cancelar</button>
          <button onclick="saveKanbanPatient()" style="padding:9px 18px;border-radius:8px;background:var(--color-primary);color:#fff;border:none;cursor:pointer;font-size:0.88rem;font-weight:600;"><i class="fa-solid fa-plus"></i> Adicionar</button>
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
    <div id="kanban-edit-modal" style="display:flex;justify-content:center;align-items:center;position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.65);z-index:9999;backdrop-filter:blur(4px);">
      <div style="background:var(--bg-card);padding:28px;border-radius:14px;width:100%;max-width:460px;box-shadow:0 20px 50px rgba(0,0,0,0.4);border:1px solid var(--border-color);">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
          <h3 style="margin:0;color:var(--text-primary);font-family:'Outfit';font-size:1.1rem;"><i class="fa-regular fa-pen-to-square" style="color:var(--color-primary);"></i> Evoluir Paciente</h3>
          <button onclick="document.getElementById('kanban-edit-modal').remove()" style="background:none;border:none;cursor:pointer;color:var(--text-muted);font-size:1.3rem;">&times;</button>
        </div>
        <p style="margin:0 0 16px;font-size:0.9rem;color:var(--text-muted);">${patName} &middot; <b style="color:var(--text-primary);">${colLabel}</b></p>
        <div style="display:grid;gap:12px;">
          <div><label style="display:block;margin-bottom:6px;font-size:0.82rem;color:var(--text-muted);font-weight:600;">Diagnostico</label>
            <input id="edit-diagnosis" type="text" class="form-control" value="${hosp.diagnosis||''}" placeholder="Diagnostico..." style="width:100%;padding:9px;border-radius:8px;border:1px solid var(--border-color);background:var(--bg-color);color:var(--text-primary);font-size:0.9rem;box-sizing:border-box;"></div>
          <div><label style="display:block;margin-bottom:6px;font-size:0.82rem;color:var(--text-muted);font-weight:600;">Leito</label>
            <input id="edit-bed" type="text" class="form-control" value="${hosp.bed||''}" placeholder="Leito..." style="width:100%;padding:9px;border-radius:8px;border:1px solid var(--border-color);background:var(--bg-color);color:var(--text-primary);font-size:0.9rem;box-sizing:border-box;"></div>
          <div><label style="display:block;margin-bottom:6px;font-size:0.82rem;color:var(--text-muted);font-weight:600;">Notas de Evolucao</label>
            <textarea id="edit-notes" class="form-control" placeholder="Evolucao clinica..." style="width:100%;padding:9px;border-radius:8px;border:1px solid var(--border-color);background:var(--bg-color);color:var(--text-primary);font-size:0.9rem;min-height:90px;resize:vertical;box-sizing:border-box;">${hosp.notes||''}</textarea></div>
        </div>
        <div style="display:flex;justify-content:flex-end;gap:10px;margin-top:20px;">
          <button onclick="document.getElementById('kanban-edit-modal').remove()" style="padding:9px 18px;border-radius:8px;border:1px solid var(--border-color);background:transparent;color:var(--text-primary);cursor:pointer;font-size:0.88rem;">Cancelar</button>
          <button onclick="saveEditKanbanCard('${hospId}')" style="padding:9px 18px;border-radius:8px;background:var(--color-primary);color:#fff;border:none;cursor:pointer;font-size:0.88rem;font-weight:600;"><i class="fa-solid fa-floppy-disk"></i> Salvar</button>
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
  if(window.showToast) window.showToast('Evolucao registrada!');
  loadAndRenderKanban();
};

// ──── Mover ────
window.moveKanbanCard = function(hospId) {
  const ex=document.getElementById('kanban-move-modal'); if(ex) ex.remove();
  const hosp=localDB.get('hospitalizations',hospId); if(!hosp) return;
  const pat=(localDB.list('patients').find(p=>p.id===hosp.patient_id)||{});
  document.body.insertAdjacentHTML('beforeend',`
    <div id="kanban-move-modal" style="display:flex;justify-content:center;align-items:center;position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.65);z-index:9999;backdrop-filter:blur(4px);">
      <div style="background:var(--bg-card);padding:28px;border-radius:14px;width:100%;max-width:360px;box-shadow:0 20px 50px rgba(0,0,0,0.4);border:1px solid var(--border-color);">
        <h3 style="margin:0 0 8px;color:var(--text-primary);font-family:'Outfit';font-size:1.1rem;"><i class="fa-solid fa-arrow-right-arrow-left" style="color:var(--color-primary);"></i> Mover Setor</h3>
        <p style="font-size:0.85rem;color:var(--text-muted);margin:0 0 18px;">${pat.fullName || pat.name||'Paciente'}</p>
        <div><label style="display:block;margin-bottom:6px;font-size:0.82rem;color:var(--text-muted);font-weight:600;">Novo Setor</label>
          <select id="move-sector-select" class="form-control" style="width:100%;padding:9px;border-radius:8px;border:1px solid var(--border-color);background:var(--bg-color);color:var(--text-primary);">
            ${KANBAN_COLUMNS.map(c=>`<option value="${c.id}" ${c.id===hosp.current_sector?'selected':''}>${c.label}</option>`).join('')}
          </select></div>
        <div style="display:flex;justify-content:flex-end;gap:10px;margin-top:20px;">
          <button onclick="document.getElementById('kanban-move-modal').remove()" style="padding:9px 18px;border-radius:8px;border:1px solid var(--border-color);background:transparent;color:var(--text-primary);cursor:pointer;font-size:0.88rem;">Cancelar</button>
          <button onclick="confirmMoveKanban('${hospId}')" style="padding:9px 18px;border-radius:8px;background:var(--color-primary);color:#fff;border:none;cursor:pointer;font-size:0.88rem;font-weight:600;"><i class="fa-solid fa-check"></i> Mover</button>
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

// ──── Notas ────
window.viewKanbanNotes = function(hospId) {
  const ex=document.getElementById('kanban-notes-modal'); if(ex) ex.remove();
  const hosp=localDB.get('hospitalizations',hospId); if(!hosp||!hosp.notes) return;
  const pat=(localDB.list('patients').find(p=>p.id===hosp.patient_id)||{});
  document.body.insertAdjacentHTML('beforeend',`
    <div id="kanban-notes-modal" style="display:flex;justify-content:center;align-items:center;position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.65);z-index:9999;backdrop-filter:blur(4px);">
      <div style="background:var(--bg-card);padding:24px;border-radius:14px;width:100%;max-width:420px;box-shadow:0 20px 50px rgba(0,0,0,0.4);border:1px solid var(--border-color);">
        <h3 style="margin:0 0 10px;color:var(--text-primary);font-family:'Outfit';font-size:1.0rem;"><i class="fa-regular fa-note-sticky" style="color:var(--color-primary);"></i> Notas — ${pat.name||'Paciente'}</h3>
        <div style="background:var(--bg-color);padding:14px;border-radius:8px;border:1px solid var(--border-color);white-space:pre-wrap;font-size:0.88rem;color:var(--text-primary);max-height:220px;overflow-y:auto;margin-bottom:16px;">${hosp.notes}</div>
        <div style="text-align:right;"><button onclick="document.getElementById('kanban-notes-modal').remove()" style="padding:8px 18px;border-radius:8px;background:var(--color-primary);color:#fff;border:none;cursor:pointer;font-size:0.88rem;">Fechar</button></div>
      </div>
    </div>`);
};

// ──── Alta ────
window.dischargePatient = function(hospId) {
  if(confirm('Registrar ALTA para este paciente? Ele sai do Kanban.')) {
    localDB.update('hospitalizations',hospId,{status:'Alta',discharge_date:new Date().toISOString()});
    if(window.showToast) window.showToast('Alta registrada com sucesso!');
    loadAndRenderKanban();
  }
};
