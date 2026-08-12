import { apiFetch, showToast, abbreviateName, switchTab, setupCustomSelect, anonymizeCPF, exportToPDF, formatSyncDate, showCustomAlert, renderTabContent, cachedApiGet, getRolePermissions } from '../main.js';
import { state, dataCache, dataCacheTimestamps } from '../state.js';

const API_URL = '/api';

async function renderLeitosTab() {
  const contentArea = document.getElementById('main-content');

  contentArea.innerHTML = `
    <div class="tab-pane active" style="padding: 24px;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; flex-wrap: wrap; gap: 16px;">
        <div>
          <h2 style="font-size: 1.5rem; font-weight: 700; margin-bottom: 4px;"><i class="fa-solid fa-bed-pulse" style="color: var(--color-primary);"></i> Gestão de Leitos & Internações</h2>
          <p style="color: var(--text-secondary); font-size: 0.9rem;">Mapa em tempo real da ocupação de leitos por setor hospitalar.</p>
        </div>
        <button id="btn-open-admit-modal" class="btn btn-primary">
          <i class="fa-solid fa-plus"></i> Nova Internação
        </button>
      </div>

      <!-- Cards de Métricas de Leitos -->
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 16px; margin-bottom: 24px;">
        <div class="card kpi-leitos-filter active" data-status="Todos" style="padding: 20px; cursor: pointer; transition: all 0.2s ease; border-top: 4px solid var(--color-primary); background: var(--glass-bg, rgba(255,255,255,0.9)); backdrop-filter: var(--glass-blur, blur(12px)); border-left: 1px solid var(--glass-border); border-right: 1px solid var(--glass-border); border-bottom: 1px solid var(--glass-border); box-shadow: var(--shadow-sm);" onmouseenter="this.style.transform='translateY(-2px)';" onmouseleave="this.style.transform='none';">
          <div style="color: var(--text-secondary); font-size: 0.85rem; font-weight: 600;">Total de Leitos</div>
          <div id="kpi-beds-total" style="font-size: 1.8rem; font-weight: 700; color: var(--text-primary); margin-top: 4px;">-</div>
        </div>
        <div class="card kpi-leitos-filter" data-status="Vago" style="padding: 20px; cursor: pointer; transition: all 0.2s ease; border-top: 4px solid #4ade80; background: var(--glass-bg, rgba(255,255,255,0.9)); backdrop-filter: var(--glass-blur, blur(12px)); border-left: 1px solid var(--glass-border); border-right: 1px solid var(--glass-border); border-bottom: 1px solid var(--glass-border); box-shadow: var(--shadow-sm);" onmouseenter="this.style.transform='translateY(-2px)';" onmouseleave="this.style.transform='none';">
          <div style="color: var(--text-secondary); font-size: 0.85rem; font-weight: 600;">Leitos Vagos</div>
          <div id="kpi-beds-vago" style="font-size: 1.8rem; font-weight: 700; color: #4ade80; margin-top: 4px;">-</div>
        </div>
        <div class="card kpi-leitos-filter" data-status="Ocupado" style="padding: 20px; cursor: pointer; transition: all 0.2s ease; border-top: 4px solid #f87171; background: var(--glass-bg, rgba(255,255,255,0.9)); backdrop-filter: var(--glass-blur, blur(12px)); border-left: 1px solid var(--glass-border); border-right: 1px solid var(--glass-border); border-bottom: 1px solid var(--glass-border); box-shadow: var(--shadow-sm);" onmouseenter="this.style.transform='translateY(-2px)';" onmouseleave="this.style.transform='none';">
          <div style="color: var(--text-secondary); font-size: 0.85rem; font-weight: 600;">Leitos Ocupados</div>
          <div id="kpi-beds-ocupado" style="font-size: 1.8rem; font-weight: 700; color: #f87171; margin-top: 4px;">-</div>
        </div>
        <div class="card kpi-leitos-filter" data-status="Higienizacao" style="padding: 20px; cursor: pointer; transition: all 0.2s ease; border-top: 4px solid #facc15; background: var(--glass-bg, rgba(255,255,255,0.9)); backdrop-filter: var(--glass-blur, blur(12px)); border-left: 1px solid var(--glass-border); border-right: 1px solid var(--glass-border); border-bottom: 1px solid var(--glass-border); box-shadow: var(--shadow-sm);" onmouseenter="this.style.transform='translateY(-2px)';" onmouseleave="this.style.transform='none';">
          <div style="color: var(--text-secondary); font-size: 0.85rem; font-weight: 600;">Em Higienização</div>
          <div id="kpi-beds-clean" style="font-size: 1.8rem; font-weight: 700; color: #facc15; margin-top: 4px;">-</div>
        </div>
        <div class="card" style="padding: 20px; border-top: 4px solid var(--color-primary); background: var(--glass-bg, rgba(255,255,255,0.9)); backdrop-filter: var(--glass-blur, blur(12px)); border-left: 1px solid var(--glass-border); border-right: 1px solid var(--glass-border); border-bottom: 1px solid var(--glass-border); box-shadow: var(--shadow-sm);">
          <div style="color: var(--text-secondary); font-size: 0.85rem; font-weight: 600;">Taxa de Ocupação</div>
          <div id="kpi-beds-occupancy" style="font-size: 1.8rem; font-weight: 700; color: var(--color-primary); margin-top: 4px;">-%</div>
        </div>
      </div>

      <!-- Filtro por Setor -->
      <div class="card" style="padding: 16px; margin-bottom: 24px;">
        <div style="display: flex; gap: 12px; align-items: center; flex-wrap: wrap;">
          <span style="font-weight: 600; font-size: 0.9rem; color: var(--text-secondary);">Filtrar Setor:</span>
          <button class="btn btn-sm btn-primary bed-sector-filter active" data-sector="Todos">Todos os Setores</button>
          <button class="btn btn-sm btn-outline bed-sector-filter" data-sector="UTI Adulto">UTI Adulto</button>
          <button class="btn btn-sm btn-outline bed-sector-filter" data-sector="Enfermaria">Enfermaria</button>
          <button class="btn btn-sm btn-outline bed-sector-filter" data-sector="Pediatria">Pediatria</button>
          <button class="btn btn-sm btn-outline bed-sector-filter" data-sector="Maternidade">Maternidade</button>
          <button type="button" id="btn-clear-leitos-filter" style="background: transparent; border: 1px solid var(--border-color); color: var(--text-muted); padding: 4px 14px; border-radius: 8px; cursor: pointer; display: flex; align-items: center; gap: 6px; font-size: 0.82rem; font-weight: 600; transition: all 0.2s ease; margin-left: auto;" title="Limpar Filtros" onmouseover="this.style.color='var(--text-primary)'; this.style.borderColor='var(--color-primary)'" onmouseout="this.style.color='var(--text-muted)'; this.style.borderColor='var(--border-color)'">
            <i class="fa-solid fa-filter-circle-xmark"></i> Limpar
          </button>
        </div>
      </div>

      <!-- Fila de Internação -->
      <div id="internacao-queue-container" style="display: none; margin-bottom: 24px;">
        <h3 style="font-size: 1.1rem; color: var(--danger); margin-bottom: 12px;"><i class="fa-solid fa-clock-rotate-left"></i> Fila de Internação (Aguardando Leito)</h3>
        <div id="internacao-queue-list" style="display: flex; flex-direction: column; gap: 10px;">
          <!-- Items inserted via JS -->
        </div>
      </div>

      <!-- Grid Visual de Leitos -->
      <div id="beds-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 16px;">
        <div style="grid-column: 1 / -1; text-align: center; padding: 40px; color: var(--text-secondary);">
          <i class="fa-solid fa-spinner fa-spin" style="font-size: 1.5rem;"></i>
          <p style="margin-top: 8px;">Carregando mapa de leitos...</p>
        </div>
      </div>
    </div>

    <!-- Modal Internação -->
    <div id="modal-admit-bed" class="modal-overlay" style="display: none;">
      <div class="modal-content" style="max-width: 520px;">
        <div class="modal-header">
          <h3><i class="fa-solid fa-bed" style="color: var(--color-primary);"></i> Internar Paciente em Leito</h3>
          <button class="btn-close" id="btn-close-admit-modal"><i class="fa-solid fa-xmark"></i></button>
        </div>
        <form id="form-admit-bed" class="modal-body">
          <div class="form-group">
            <label for="admit-bed-id">Selecione o Leito Vago *</label>
            <select id="admit-bed-id" class="form-input" required>
              <option value="">Carregando leitos disponíveis...</option>
            </select>
          </div>
          <div class="form-group">
            <label>Selecione o Paciente *</label>
            <div class="custom-select-container" id="admit-patient-combo"></div>
            <input type="hidden" id="admit-patient-id" required>
            <input type="hidden" id="admit-encounter-id">
          </div>
          <div class="modal-footer" style="padding-top: 16px;">
            <button type="button" class="btn btn-secondary" id="btn-cancel-admit-modal">Cancelar</button>
            <button type="submit" class="btn btn-primary">Confirmar Internação</button>
          </div>
        </form>
      </div>
    </div>
  `;

  let currentSector = window.currentLeitosSectorFilter || 'Todos';
  let currentStatus = window.currentLeitosStatusFilter || 'Todos';

  setTimeout(() => {
    if (currentStatus !== 'Todos') {
      document.querySelectorAll('.kpi-leitos-filter').forEach(c => {
        c.classList.remove('active');
        c.style.border = '1px solid transparent';
        c.style.background = '';
      });
      const targetCard = document.querySelector(`.kpi-leitos-filter[data-status="${currentStatus}"]`);
      if (targetCard) {
        targetCard.classList.add('active');
        let color = 'var(--color-primary)';
        if (currentStatus === 'Vago') color = '#4ade80';
        if (currentStatus === 'Ocupado') color = '#f87171';
        if (currentStatus === 'Higienizacao') color = '#facc15';
        targetCard.style.border = `1px solid ${color}`;
        targetCard.style.background = 'rgba(99, 102, 241, 0.05)'; // Base active bg
      }
    }
  }, 100);

  // Limpar os filtros globais após ler para não afetar navegação futura a menos que clicado novamente
  window.currentLeitosSectorFilter = 'Todos';
  window.currentLeitosStatusFilter = 'Todos';

  const loadBeds = async () => {
    try {
      const beds = await cachedApiGet('/api/beds', 'beds');

      // Normalizar dados legados
      beds.forEach(b => {
        if (!b.bedNumber && b.number) b.bedNumber = b.number;
        if (b.type === 'Enfermaria' && b.ward === 'Pediatria') b.sector = 'Pediatria';
        if (b.type === 'UTI Pediátrica') b.sector = 'Pediatria';
        if (!b.sector) b.sector = b.type;
      });

      // Buscar Fila de Internação
      try {
        const encounters = await cachedApiGet('/api/encounters', 'encounters');
        const queue = encounters.filter(e => e.status === 'Aguardando_Leito');
        const queueContainer = document.getElementById('internacao-queue-container');
        const queueList = document.getElementById('internacao-queue-list');
        
        if (queue.length > 0) {
          queueContainer.style.display = 'block';
          queueList.innerHTML = queue.map(q => `
            <div style="background: var(--glass-bg); border-top: 4px solid var(--danger); border-left: 1px solid var(--glass-border); border-right: 1px solid var(--glass-border); border-bottom: 1px solid var(--glass-border); backdrop-filter: var(--glass-blur); padding: 16px; border-radius: 12px; display: flex; justify-content: space-between; align-items: center; box-shadow: var(--shadow-sm); transition: transform 0.2s ease;" onmouseenter="this.style.transform='translateY(-2px)';" onmouseleave="this.style.transform='none';">
              <div>
                <div style="font-weight: 700; color: var(--text-primary); font-size: 1.05rem;">${q.patientName}</div>
                <div style="font-size: 0.85rem; color: var(--text-secondary); margin-top: 4px;">
                  <i class="fa-solid fa-clock"></i> Aguardando Leito (${q.room || '-'})
                </div>
              </div>
              <button class="btn btn-sm" onclick="quickAdmitBed(null, '${q.id}', '${(q.patientName||'').replace(/'/g, "\\'")}')" style="background: linear-gradient(135deg, #10b981, #059669); color: white; border: none; font-weight: 600; padding: 10px 20px; border-radius: 20px; box-shadow: 0 4px 12px rgba(16,185,129,0.3); display: flex; align-items: center; gap: 6px; cursor: pointer; transition: all 0.2s;" onmouseenter="this.style.transform='scale(1.02)';" onmouseleave="this.style.transform='none';">
                <i class="fa-solid fa-bed-pulse"></i> Alocar
              </button>
            </div>
          `).join('');
        } else {
          queueContainer.style.display = 'none';
        }
      } catch (err) {
        console.error('Erro ao carregar fila de internação:', err);
      }

      // Filtrar por Setor (para KPIs)
      const sectorBeds = currentSector === 'Todos' ? beds : beds.filter(b => b.sector === currentSector);

      // Atualizar KPIs baseados no setor selecionado
      const vagos = sectorBeds.filter(b => b.status === 'Vago').length;
      const ocupados = sectorBeds.filter(b => b.status === 'Ocupado').length;
      const higienizacao = sectorBeds.filter(b => b.status === 'Higienizacao').length;
      const total = sectorBeds.length;
      const rate = total > 0 ? Math.round((ocupados / total) * 100) : 0;

      if(document.getElementById('kpi-beds-total')) document.getElementById('kpi-beds-total').textContent = total;
      document.getElementById('kpi-beds-vago').textContent = vagos;
      document.getElementById('kpi-beds-ocupado').textContent = ocupados;
      document.getElementById('kpi-beds-clean').textContent = higienizacao;
      document.getElementById('kpi-beds-occupancy').textContent = `${rate}%`;

      // Preencher Select de Leitos Vagos no Modal
      const bedSelect = document.getElementById('admit-bed-id');
      if (bedSelect) {
        const vagosList = beds.filter(b => b.status === 'Vago');
        if (vagosList.length === 0) {
          bedSelect.innerHTML = '<option value="">Sem leitos vagos no momento</option>';
        } else {
          bedSelect.innerHTML = '<option value="">Selecione o leito...</option>' + 
            vagosList.map(b => `<option value="${b.id}">${b.bedNumber} — ${b.sector}</option>`).join('');
        }
      }

      // Filtrar por Setor e Status (para Grid)
      const filtered = sectorBeds.filter(b => currentStatus === 'Todos' || b.status === currentStatus);
      const grid = document.getElementById('beds-grid');

      if (filtered.length === 0) {
        grid.innerHTML = `<div style="grid-column: 1 / -1; text-align: center; padding: 40px; color: var(--text-secondary);">Nenhum leito encontrado neste setor.</div>`;
        return;
      }

      grid.innerHTML = filtered.map(b => {
        let statusColor = '#4ade80';
        let statusBg = 'rgba(74,222,128,0.15)';
        let borderTop = '4px solid #4ade80';
        if (b.status === 'Ocupado') {
          statusColor = '#f87171';
          statusBg = 'rgba(248,113,113,0.15)';
          borderTop = '4px solid #f87171';
        } else if (b.status === 'Higienizacao') {
          statusColor = '#facc15';
          statusBg = 'rgba(250,204,21,0.15)';
          borderTop = '4px solid #facc15';
        }

        return `
          <div class="card" style="padding: 20px; border-top: ${borderTop}; border-left: 1px solid var(--glass-border); border-right: 1px solid var(--glass-border); border-bottom: 1px solid var(--glass-border); background: var(--glass-bg); backdrop-filter: var(--glass-blur); box-shadow: var(--shadow-sm); display: flex; flex-direction: column; justify-content: space-between; transition: transform 0.2s ease, box-shadow 0.2s ease;" onmouseenter="this.style.transform='translateY(-4px)'; this.style.boxShadow='var(--shadow-lg)';" onmouseleave="this.style.transform='none'; this.style.boxShadow='var(--shadow-sm)';">
            <div>
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                <span style="font-weight: 800; font-size: 1.25rem; color: var(--text-primary); display:flex; align-items:center; gap: 6px;"><i class="fa-solid fa-bed" style="color: var(--text-muted); font-size:1.1rem;"></i> ${b.bedNumber}</span>
                <span class="badge" style="background: ${statusBg}; color: ${statusColor}; font-weight:700; border: 1px solid ${statusBg.replace('0.15', '0.3')}; border-radius: 12px; padding: 4px 10px;">${b.status}</span>
              </div>
              <div style="font-size: 0.85rem; font-weight: 600; color: var(--text-muted); margin-bottom: 16px;">
                <i class="fa-solid fa-building-user"></i> ${b.sector}
              </div>
              ${b.status === 'Ocupado' ? `
                <div style="background: var(--bg-tertiary); padding: 12px; border-radius: 10px; margin-bottom: 16px; border: 1px solid var(--glass-border);">
                  <div style="font-size: 0.95rem; font-weight: 700; color: var(--text-primary);"><i class="fa-solid fa-user-injured" style="margin-right:4px;"></i> ${b.patientName || 'Paciente Inominado'}</div>
                  <div style="font-size: 0.75rem; color: var(--text-secondary); margin-top: 4px;">
                    <i class="fa-solid fa-calendar-check"></i> Int: ${b.admittedAt ? new Date(b.admittedAt).toLocaleDateString() : '-'}
                  </div>
                </div>
              ` : '<div style="margin-bottom: 16px;"></div>'}
            </div>

            <div style="display: flex; gap: 8px; margin-top: auto; justify-content: flex-end;">
              ${b.status === 'Vago' ? `
                <button class="btn btn-sm btn-primary" onclick="quickAdmitBed('${b.id}')" style="width: 100%; border-radius: 8px; font-weight:600;">
                  <i class="fa-solid fa-bed"></i> Internar Neste Leito
                </button>
              ` : ''}
              ${b.status === 'Ocupado' ? `
                <button class="btn btn-sm btn-danger" onclick="dischargeBed('${b.id}')" style="width: 100%; border-radius: 8px; font-weight:600; background: linear-gradient(135deg, #be5a6e, #9e3a52); border:none; box-shadow: 0 4px 10px rgba(158,58,82,0.3);">
                  <i class="fa-solid fa-door-open"></i> Alta Hospitalar
                </button>
              ` : ''}
              ${b.status === 'Higienizacao' ? `
                <button class="btn btn-sm btn-success" onclick="updateBedStatus('${b.id}', 'Vago')" style="width: 100%; border-radius: 8px; font-weight:600; background: linear-gradient(135deg, #22c55e, #16a34a); border:none; color: #fff; box-shadow: 0 4px 10px rgba(34,197,94,0.25);">
                  <i class="fa-solid fa-sparkles"></i> Liberar Leito
                </button>
              ` : ''}
            </div>
          </div>
        `;
      }).join('');
    } catch (e) {
      document.getElementById('beds-grid').innerHTML = `<div style="grid-column: 1 / -1; text-align: center; color: var(--color-danger); padding: 20px;">Erro ao carregar mapa de leitos.</div>`;
    }
  };

  // Carregar Pacientes no Modal (Busca Direta & Rápida)
  const loadPatientsModal = async () => {
    try {
      const res = await apiFetch(`${API_URL}/patients`);
      if (!res.ok) throw new Error();
      const patients = await res.json();
      const patientList = Array.isArray(patients) ? patients : (patients.data || []);
      
      // Ordenação Alfabética A-Z por nome completo
      patientList.sort((a, b) => (a.fullName || '').localeCompare(b.fullName || '', 'pt-BR', { sensitivity: 'base' }));

      const pComboContainer = document.getElementById('admit-patient-combo');
      const pHiddenInput = document.getElementById('admit-patient-id');

      if (pComboContainer && pHiddenInput) {
        setupCustomSelect(pComboContainer, pHiddenInput, patientList, 'Selecione o paciente...');
      }
    } catch (e) {
      const pComboContainer = document.getElementById('admit-patient-combo');
      if (pComboContainer) pComboContainer.innerHTML = '<div class="form-input">Erro ao carregar pacientes</div>';
    }
  };

  // Eventos de Filtro por Setor
  document.getElementById('btn-clear-leitos-filter')?.addEventListener('click', () => {
    // Reset status filter
    document.querySelectorAll('.kpi-leitos-filter').forEach(c => c.classList.remove('active'));
    const allCard = document.querySelector('.kpi-leitos-filter[data-status="Todos"]');
    if (allCard) allCard.classList.add('active');
    window.currentLeitosStatusFilter = 'Todos';
    // Reset sector filter
    document.querySelectorAll('.bed-sector-filter').forEach(b => b.classList.remove('active', 'btn-primary'));
    const allBtn = document.querySelector('.bed-sector-filter[data-sector="Todos"]');
    if(allBtn) { allBtn.classList.add('active', 'btn-primary'); }
    window.currentLeitorSectorFilter = 'Todos';
    if (window.renderBedsGrid) window.renderBedsGrid();
  });
  document.querySelectorAll('.bed-sector-filter').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.bed-sector-filter').forEach(b => {
        b.classList.remove('active', 'btn-primary');
        b.classList.add('btn-outline');
      });
      btn.classList.add('active', 'btn-primary');
      btn.classList.remove('btn-outline');
      currentSector = btn.getAttribute('data-sector');
      loadBeds();
    });
  });

  // Eventos de Filtro por Status (KPIs)
  document.querySelectorAll('.kpi-leitos-filter').forEach(card => {
    card.addEventListener('click', () => {
      document.querySelectorAll('.kpi-leitos-filter').forEach(c => {
        c.classList.remove('active');
        c.style.border = '1px solid transparent';
        c.style.background = '';
      });
      card.classList.add('active');
      card.style.border = '1px solid var(--color-primary)';
      card.style.background = 'rgba(99, 102, 241, 0.05)';
      currentStatus = card.getAttribute('data-status');
      loadBeds();
    });
  });

  // Modal Handlers
  const modal = document.getElementById('modal-admit-bed');
  document.getElementById('btn-open-admit-modal')?.addEventListener('click', () => { modal.style.display = 'flex'; loadPatientsModal(); });
  document.getElementById('btn-close-admit-modal').addEventListener('click', () => { modal.style.display = 'none'; });
  document.getElementById('btn-cancel-admit-modal').addEventListener('click', () => { modal.style.display = 'none'; });

  document.getElementById('form-admit-bed').addEventListener('submit', async (e) => {
    e.preventDefault();
    const bedId = document.getElementById('admit-bed-id').value;
    const pSelect = document.getElementById('admit-patient-id');
    const encInput = document.getElementById('admit-encounter-id');
    const selectedOption = pSelect.options ? pSelect.options[pSelect.selectedIndex] : null;
    const patientId = pSelect.value;
    const patientName = selectedOption ? selectedOption.dataset.name : (pSelect.dataset.name || '');
    const encounterId = encInput ? encInput.value : null;

    if (!bedId || !patientId) {
      alert('Selecione um leito e um paciente.');
      return;
    }

    try {
      const res = await apiFetch('/api/beds/admit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bedId, patientId, patientName, encounterId })
      });
      if (res.ok) {
        showToast('Paciente internado com sucesso!');
        modal.style.display = 'none';
        
        loadBeds();
      } else {
        const d = await res.json();
        alert(d.message || 'Erro ao internar paciente.');
      }
    } catch (err) {
      alert('Erro de conexão ao internar paciente.');
    }
  });

  loadBeds();
  loadPatientsModal();
}

window.quickAdmitBed = (bedId, encounterId = null, patientName = null) => {
  const modal = document.getElementById('modal-admit-bed');
  if (modal) {
    modal.style.display = 'flex';
    const bedSelect = document.getElementById('admit-bed-id');
    if (bedSelect && bedId) bedSelect.value = bedId;
    
    const encInput = document.getElementById('admit-encounter-id');
    if (encInput) encInput.value = encounterId || '';

    const pSelect = document.getElementById('admit-patient-id');
    const pSearch = document.getElementById('admit-patient-search');
    if (pSearch) pSearch.value = patientName || ''; // preenche se veio da fila

    if (pSelect) {
      apiFetch(`${API_URL}/patients`).then(r => r.json()).then(patients => {
        const list = Array.isArray(patients) ? patients : (patients.data || []);
        
        // Ordenação Alfabética A-Z por nome completo
        list.sort((a, b) => (a.fullName || '').localeCompare(b.fullName || '', 'pt-BR', { sensitivity: 'base' }));

        const renderOptions = (items) => {
          pSelect.innerHTML = '<option value="" style="background-color: #19142c; color: #ffffff;">Selecione o paciente...</option>' + 
            items.map(p => `<option value="${p.id}" data-name="${p.fullName}" style="background-color: #19142c; color: #ffffff;">${p.fullName} (CPF: ${p.cpf})</option>`).join('');
          
          // Auto-selecionar se patientName foi fornecido e encontrado
          if (patientName) {
            const found = items.find(p => (p.fullName || '').toLowerCase() === patientName.toLowerCase());
            if (found) {
              pSelect.value = found.id;
            }
          }
        };

        renderOptions(list);

        if (pSearch && !pSearch.dataset.bound) {
          pSearch.dataset.bound = 'true';
          pSearch.addEventListener('input', (e) => {
            const query = e.target.value.toLowerCase().trim();
            if (!query) {
              renderOptions(list);
            } else {
              const filtered = list.filter(p => {
                const nameMatch = (p.fullName || '').toLowerCase().includes(query);
                const cpfDigits = (p.cpf || '').replace(/\D/g, '');
                const queryDigits = query.replace(/\D/g, '');
                const cpfMatch = queryDigits ? cpfDigits.includes(queryDigits) : (p.cpf || '').toLowerCase().includes(query);
                return nameMatch || cpfMatch;
              });
              renderOptions(filtered);
            }
          });
        }
      }).catch(() => {});
    }
  }
};

window.dischargeBed = (bedId) => {
  const modalHtml = `
    <div id="discharge-confirm-modal" class="modal-overlay" style="z-index: 9999; display:flex; align-items:center; justify-content:center; background: rgba(0,0,0,0.45); backdrop-filter: blur(8px);">
      <div class="modal-content" style="max-width: 420px; width: 90%; text-align: center; background: var(--bg-secondary); border: 1px solid var(--glass-border); border-radius: 24px; padding: 40px 36px 32px; box-shadow: 0 24px 60px rgba(0,0,0,0.25); position: relative; overflow: hidden;">
        
        <!-- Decorative top accent -->
        <div style="position: absolute; top: 0; left: 0; right: 0; height: 4px; background: linear-gradient(90deg, #be5a6e, #9e3a52);"></div>
        
        <!-- Icon -->
        <div style="width: 72px; height: 72px; border-radius: 20px; background: linear-gradient(135deg, rgba(190,90,110,0.15), rgba(158,58,82,0.08)); border: 1px solid rgba(190,90,110,0.25); color: #be5a6e; display: flex; align-items: center; justify-content: center; font-size: 2.2rem; margin: 0 auto 24px; box-shadow: 0 8px 20px rgba(190,90,110,0.15);">
          <i class="fa-solid fa-person-walking-arrow-right"></i>
        </div>
        
        <!-- Title -->
        <h3 style="font-size: 1.35rem; font-weight: 800; color: var(--text-primary); margin: 0 0 10px;">Confirmar Alta</h3>
        
        <!-- Description -->
        <p style="font-size: 0.92rem; color: var(--text-muted); line-height: 1.65; margin: 0 0 28px; padding: 0 8px;">
          Confirma a <strong style="color: var(--text-secondary);">alta do paciente</strong> e o envio do leito para <strong style="color: var(--text-secondary);">higienização</strong>?
        </p>

        <!-- Info badge -->
        <div style="background: var(--bg-tertiary); border: 1px solid var(--border-color); border-radius: 10px; padding: 10px 16px; margin-bottom: 28px; display: flex; align-items: center; gap: 10px; text-align: left;">
          <i class="fa-solid fa-circle-info" style="color: #6366f1; font-size: 1rem; flex-shrink: 0;"></i>
          <span style="font-size: 0.8rem; color: var(--text-muted); line-height: 1.4;">O leito será marcado como <em>Em Higienização</em> automaticamente após a confirmação.</span>
        </div>

        <!-- Buttons -->
        <div style="display: flex; gap: 12px; justify-content: center;">
          <button onclick="document.getElementById('discharge-confirm-modal').remove()" 
            style="flex: 1; padding: 12px 20px; border-radius: 12px; font-size: 0.9rem; font-weight: 700; cursor: pointer; background: var(--bg-tertiary); color: var(--text-secondary); border: 1px solid var(--border-color); transition: all 0.2s;"
            onmouseover="this.style.background='var(--bg-hover)'; this.style.borderColor='var(--text-muted)';"
            onmouseout="this.style.background='var(--bg-tertiary)'; this.style.borderColor='var(--border-color)';">
            <i class="fa-solid fa-xmark" style="margin-right: 6px;"></i>Cancelar
          </button>
          <button onclick="window.executeDischarge('${bedId}')" 
            style="flex: 1; padding: 12px 20px; border-radius: 12px; font-size: 0.9rem; font-weight: 700; cursor: pointer; background: linear-gradient(135deg, #be5a6e, #9e3a52); color: #fff; border: none; box-shadow: 0 6px 20px rgba(158,58,82,0.35); transition: all 0.2s;"
            onmouseover="this.style.transform='translateY(-1px)'; this.style.boxShadow='0 10px 28px rgba(158,58,82,0.45)';"
            onmouseout="this.style.transform='none'; this.style.boxShadow='0 6px 20px rgba(158,58,82,0.35)';">
            <i class="fa-solid fa-check" style="margin-right: 6px;"></i>Sim, Confirmar
          </button>
        </div>
      </div>
    </div>
  `;
  document.body.insertAdjacentHTML('beforeend', modalHtml);
};

window.executeDischarge = async (bedId) => {
  const modal = document.getElementById('discharge-confirm-modal');
  if (modal) modal.remove();
  
  try {
    const res = await apiFetch('/api/beds/discharge', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bedId })
    });
    if (res.ok) {
      if (typeof window.showFlowCompletionNotification === 'function') {
        window.showFlowCompletionNotification({
          actionTitle: 'Alta Hospitalar Concluída',
          message: 'O paciente recebeu alta e o leito foi direcionado automaticamente para a Fila de Higienização & Limpeza.',
          targetTab: 'leitos',
          targetTabLabel: 'Gestão de Leitos & Internação'
        });
      } else {
        showToast('Alta concedida com sucesso! Leito encaminhado para limpeza.');
      }
      if (typeof renderLeitosTab === 'function') {
        renderLeitosTab();
      } else {
        window.location.reload();
      }
    } else {
      const data = await res.json();
      showToast(data.message || 'Erro ao dar alta no leito.', true);
    }
  } catch (e) {
    console.error('Erro em executeDischarge:', e);
    showToast('Erro interno ao tentar dar alta.', true);
  }
};

window.updateBedStatus = async (bedId, status) => {
  try {
    const res = await apiFetch(`/api/beds/${bedId}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    });
    if (res.ok) {
      showToast('Status do leito atualizado!');
      
      renderLeitosTab();
    }
  } catch (e) {}
};

// --- ABA CORPO CLÍNICO (GESTÃO DE MÉDICOS) ---

window.renderLeitosTab = renderLeitosTab;
