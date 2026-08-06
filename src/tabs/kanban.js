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

  contentArea.innerHTML = `
    <div class="tab-section active" id="kanban-root" style="display:flex; flex-direction:column; height: calc(100vh - 60px); overflow:hidden;">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px; flex-wrap:wrap; gap:12px; flex-shrink:0;">
        <div>
          <h2 style="font-family:'Outfit'; font-weight:700; font-size:1.4rem; margin:0; color:var(--text-primary);">
            <i class="fa-solid fa-table-columns" style="color:var(--color-primary);"></i> Kanban de Internacao
          </h2>
          <p style="margin:4px 0 0; font-size:0.82rem; color:var(--text-muted);">Gestao visual do fluxo de pacientes e acompanhamento de metas evolutivas.</p>
        </div>
        <div style="display:flex; gap:8px; align-items:center; flex-wrap:wrap;">
          <span style="font-size:0.78rem; color:var(--text-muted); background:var(--bg-card); border:1px solid var(--border-color); padding:4px 12px; border-radius:20px;">
            <i class="fa-solid fa-bed-pulse"></i> <span id="kanban-total-count">0</span> internados
          </span>
          <button onclick="openAddPatientKanbanModal()" class="btn-primary" style="padding:8px 16px; border-radius:8px; font-size:0.85rem; display:flex; align-items:center; gap:6px;">
            <i class="fa-solid fa-plus"></i> Adicionar Paciente
          </button>
        </div>
      </div>

      <div style="display:flex; gap:8px; margin-bottom:16px; flex-shrink:0; flex-wrap:wrap;">
        <button onclick="setKanbanFilter('all')" id="kf-all" style="padding:5px 14px; border-radius:20px; font-size:0.78rem; cursor:pointer; border:1px solid var(--color-primary); background:var(--color-primary); color:#fff; font-weight:600; transition:all 0.2s;" class="kanban-filter-btn">
          Todos
        </button>
        <button onclick="setKanbanFilter('pronto_socorro')" id="kf-pronto_socorro" style="padding:5px 14px; border-radius:20px; font-size:0.78rem; cursor:pointer; border:1px solid #3b82f6; background:transparent; color:#3b82f6; font-weight:600;" class="kanban-filter-btn">PS</button>
        <button onclick="setKanbanFilter('corredor_internacao')" id="kf-corredor_internacao" style="padding:5px 14px; border-radius:20px; font-size:0.78rem; cursor:pointer; border:1px solid #f59e0b; background:transparent; color:#f59e0b; font-weight:600;" class="kanban-filter-btn">Corredor</button>
        <button onclick="setKanbanFilter('clinica_cirurgica')" id="kf-clinica_cirurgica" style="padding:5px 14px; border-radius:20px; font-size:0.78rem; cursor:pointer; border:1px solid #8b5cf6; background:transparent; color:#8b5cf6; font-weight:600;" class="kanban-filter-btn">Cirurgica</button>
        <button onclick="setKanbanFilter('clinica_medica')" id="kf-clinica_medica" style="padding:5px 14px; border-radius:20px; font-size:0.78rem; cursor:pointer; border:1px solid #10b981; background:transparent; color:#10b981; font-weight:600;" class="kanban-filter-btn">Medica</button>
        <button onclick="setKanbanFilter('uti')" id="kf-uti" style="padding:5px 14px; border-radius:20px; font-size:0.78rem; cursor:pointer; border:1px solid #ef4444; background:transparent; color:#ef4444; font-weight:600;" class="kanban-filter-btn">UTI</button>
      </div>

      <div class="kanban-board" id="kanban-board" style="display:flex; gap:14px; overflow-x:auto; flex-grow:1; padding-bottom:16px; align-items:flex-start;">
      </div>
    </div>
  `;

  loadAndRenderKanban();
}

window.setKanbanFilter = function(filterId) {
  currentFilter = filterId;
  const colorMap = { pronto_socorro:'#3b82f6', corredor_internacao:'#f59e0b', clinica_cirurgica:'#8b5cf6', clinica_medica:'#10b981', uti:'#ef4444' };
  document.querySelectorAll('.kanban-filter-btn').forEach(btn => {
    const id = btn.id.replace('kf-', '');
    const isActive = `kf-${filterId}` === btn.id || (filterId === 'all' && btn.id === 'kf-all');
    const color = id === 'all' ? 'var(--color-primary)' : (colorMap[id] || 'var(--color-primary)');
    btn.style.background = isActive ? color : 'transparent';
    btn.style.color = isActive ? '#fff' : color;
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
  const diagHtml = hosp.diagnosis ? `<div style="font-size:0.72rem; color:var(--text-muted); margin-bottom:3px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;" title="${hosp.diagnosis}"><i class="fa-solid fa-stethoscope" style="width:12px;"></i> ${hosp.diagnosis}</div>` : '';
  const bedHtml = hosp.bed ? `<div style="font-size:0.72rem; color:var(--text-muted); margin-bottom:3px;"><i class="fa-solid fa-bed" style="width:12px;"></i> Leito: <b>${hosp.bed}</b></div>` : '';
  const drHtml = hosp.doctor_name ? `<div style="font-size:0.72rem; color:var(--text-muted); margin-bottom:3px;"><i class="fa-solid fa-user-doctor" style="width:12px;"></i> Dr(a). ${hosp.doctor_name}</div>` : '';
  const notesBadge = hosp.notes ? `<span title="${hosp.notes.substring(0,60)}" onclick="viewKanbanNotes('${hosp.id}')" style="font-size:0.65rem; color:var(--color-primary); border:1px solid var(--color-primary); padding:1px 5px; border-radius:3px; cursor:pointer;"><i class="fa-regular fa-note-sticky"></i></span>` : '';

  return `
    <div class="kanban-card" draggable="true" data-hosp-id="${hosp.id}" style="background:var(--bg-color); border:1px solid var(--border-color); border-left:3px solid ${statusColor}; border-radius:8px; padding:12px; cursor:grab; box-shadow:0 1px 4px rgba(0,0,0,0.1); position:relative;">
      <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:8px; gap:8px;">
        <div style="display:flex; align-items:center; gap:7px; min-width:0;">
          <div style="width:28px; height:28px; border-radius:50%; background:linear-gradient(135deg,${col.color}44,${col.color}88); display:flex; align-items:center; justify-content:center; font-size:0.65rem; font-weight:700; color:${col.color}; flex-shrink:0;">${initials}</div>
          <strong style="font-size:0.85rem; color:var(--text-primary); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;" title="${hosp.patientName}">${hosp.patientName}</strong>
        </div>
        <div style="display:flex; align-items:center; gap:4px; flex-shrink:0;">
          ${notesBadge}
          <span style="font-size:0.65rem; padding:2px 5px; border-radius:4px; font-weight:600; background:rgba(0,0,0,0.06); color:var(--text-muted);">${(hosp.patient_id||'').substring(0,6)}</span>
        </div>
      </div>
      <div style="margin-bottom:8px;">${diagHtml}${bedHtml}${drHtml}</div>
      <div style="margin-bottom:10px;">
        <div style="display:flex; justify-content:space-between; margin-bottom:3px;">
          <span style="font-size:0.7rem; color:var(--text-muted);">Setor: <b style="color:var(--text-primary);">${timeStr}</b></span>
          <span style="font-size:0.7rem; font-weight:600; color:${statusColor};">${statusText}</span>
        </div>
        <div style="height:4px; background:var(--border-color); border-radius:2px; overflow:hidden;">
          <div style="height:100%; width:${pct}%; background:${statusColor}; border-radius:2px;"></div>
        </div>
      </div>
      <div style="display:flex; justify-content:space-between; align-items:center; border-top:1px solid var(--border-color); padding-top:7px;">
        <span style="font-size:0.7rem; color:var(--text-muted);"><i class="fa-solid fa-hospital" style="width:12px;"></i> Total: <b>${totalStr}</b></span>
        <div style="display:flex; gap:2px;">
          <button onclick="openEditKanbanCard('${hosp.id}')" style="background:none; border:none; cursor:pointer; color:var(--text-muted); font-size:0.82rem; padding:3px 6px; border-radius:4px;" title="Editar"><i class="fa-regular fa-pen-to-square"></i></button>
          <button onclick="moveKanbanCard('${hosp.id}')" style="background:none; border:none; cursor:pointer; color:var(--color-primary); font-size:0.82rem; padding:3px 6px; border-radius:4px;" title="Mover setor"><i class="fa-solid fa-arrow-right-arrow-left"></i></button>
          <button onclick="dischargePatient('${hosp.id}')" style="background:none; border:none; cursor:pointer; color:#10b981; font-size:0.82rem; padding:3px 6px; border-radius:4px;" title="Alta"><i class="fa-solid fa-person-walking-arrow-right"></i></button>
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
  const totalEl = document.getElementById('kanban-total-count');
  if (totalEl) totalEl.textContent = active.length;
  const cols = currentFilter === 'all' ? KANBAN_COLUMNS : KANBAN_COLUMNS.filter(c => c.id === currentFilter);
  const w = currentFilter === 'all' ? '270px' : '340px';
  board.innerHTML = cols.map(col => {
    const cards = active.filter(h => h.current_sector === col.id).sort((a,b) => new Date(a.sector_entry_date)-new Date(b.sector_entry_date));
    return `
      <div class="kanban-col" data-col="${col.id}" style="min-width:${w}; width:${w}; background:var(--bg-card); border-radius:12px; display:flex; flex-direction:column; border:1px solid var(--border-color); box-shadow:0 4px 12px rgba(0,0,0,0.08); flex-shrink:0;">
        <div style="padding:12px 16px; border-bottom:3px solid ${col.color}; display:flex; justify-content:space-between; align-items:center; border-radius:12px 12px 0 0;">
          <h3 style="margin:0; font-size:0.88rem; font-weight:700; color:var(--text-primary); display:flex; align-items:center; gap:7px;">
            <span style="width:10px; height:10px; border-radius:50%; background:${col.color}; display:inline-block; flex-shrink:0;"></span>
            ${col.label}
          </h3>
          <div style="display:flex; align-items:center; gap:6px;">
            ${col.maxDays ? `<span style="font-size:0.68rem; color:${col.color}; font-weight:600;">Meta:${col.maxDays}d</span>` : (col.maxHours ? `<span style="font-size:0.68rem; color:${col.color}; font-weight:600;">Meta:${col.maxHours}h</span>` : '')}
            <span style="background:rgba(0,0,0,0.12); color:var(--text-muted); font-size:0.75rem; padding:2px 8px; border-radius:10px; font-weight:700;">${cards.length}</span>
          </div>
        </div>
        <div class="kanban-col-body" style="padding:10px; flex-grow:1; overflow-y:auto; display:flex; flex-direction:column; gap:10px; min-height:200px; max-height:calc(100vh - 280px);">
          ${cards.map(h => renderCard(h, col)).join('')}
          ${cards.length === 0 ? '<div style="text-align:center;padding:30px 10px;color:var(--text-muted);font-size:0.82rem;"><i class="fa-regular fa-circle-check" style="font-size:1.5rem;margin-bottom:8px;display:block;opacity:0.4;"></i>Nenhum paciente</div>' : ''}
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
