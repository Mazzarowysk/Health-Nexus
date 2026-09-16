import { apiFetch, showToast, abbreviateName, switchTab, setupCustomSelect, anonymizeCPF, exportToPDF, formatSyncDate, showCustomAlert, renderTabContent, cachedApiGet, getRolePermissions } from '../main.js';
import { state, dataCache, dataCacheTimestamps } from '../state.js';
import * as localDB from '../localDB.js';

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
          <button class="btn btn-sm btn-outline bed-sector-filter" data-sector="Observação">Observação</button>
          <button class="btn btn-sm btn-outline bed-sector-filter" data-sector="UTI Adulto">UTI Adulto</button>
          <button class="btn btn-sm btn-outline bed-sector-filter" data-sector="Enfermaria">Enfermaria</button>
          <button class="btn btn-sm btn-outline bed-sector-filter" data-sector="Pediatria">Pediatria</button>
          <button class="btn btn-sm btn-outline bed-sector-filter" data-sector="Maternidade">Maternidade</button>
          <button class="btn btn-sm btn-outline bed-sector-filter" data-sector="Isolamento">Isolamento</button>
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
      const activePat = (typeof window.getActivePatientContext === 'function') ? window.getActivePatientContext() : null;
      const activePatName = activePat ? (activePat.fullName || activePat.patientName || '').toLowerCase().trim() : '';
      const activePatBedId = activePat ? String(activePat.bedId || activePat.bed || activePat.bedNumber || '') : '';

      let rawBeds = await cachedApiGet('/api/beds', 'beds');
      let beds = Array.isArray(rawBeds) ? rawBeds : (rawBeds.data || []);

      // Filtrar itens inválidos/corrompidos (como undefined)
      beds = beds.filter(b => b && (b.bedNumber || b.number) && String(b.bedNumber) !== 'undefined' && String(b.number) !== 'undefined');

      // Normalizar dados legados
      beds.forEach(b => {
        if (!b.bedNumber && b.number) b.bedNumber = b.number;
        if (b.type === 'Enfermaria' && b.ward === 'Pediatria') b.sector = 'Pediatria';
        if (b.type === 'UTI Pediátrica') b.sector = 'Pediatria';
        if (!b.sector) b.sector = b.type || 'Enfermaria';
      });

      // Sincronizar com internações ativas do banco local
      try {
        const encounters = await cachedApiGet('/api/encounters', 'encounters');
        const encList = Array.isArray(encounters) ? encounters : (encounters.data || []);

        const hosps = (typeof localDB !== 'undefined' && localDB.list) ? (localDB.list('hospitalizations') || []) : [];
        const activeHosps = hosps.filter(h => h.status !== 'Alta');

        beds.forEach(b => {
          const matchingHosp = activeHosps.find(h => String(h.bed_id) === String(b.id) || h.bed === b.bedNumber || h.bed === b.number);
          const matchingEnc = encList.find(e => (e.status === 'Internado' || e.status === 'Em_Atendimento') && (String(e.bedId) === String(b.id) || e.bed === b.bedNumber || e.bed === b.number));
          
          if (matchingHosp || matchingEnc) {
            b.status = 'Ocupado';
            b.patientName = (matchingHosp && matchingHosp.patientName) || (matchingEnc && matchingEnc.patientName) || b.patientName;
            b.patientId = (matchingHosp && matchingHosp.patient_id) || (matchingEnc && matchingEnc.patientId) || b.patientId;
            b.admittedAt = (matchingHosp && matchingHosp.admitted_at) || (matchingEnc && matchingEnc.hospitalized_at) || b.admittedAt || new Date().toISOString();
          }

          // Sincronização direta com o paciente ativo recém-admitido no contexto
          const isContextBed = activePat && (activePat.status === 'Internado') && (
            (activePatBedId && (String(b.id) === activePatBedId || b.bedNumber === activePatBedId || b.number === activePatBedId)) ||
            (activePat.bedId && String(b.id) === String(activePat.bedId)) ||
            (activePat.bed && (b.bedNumber === activePat.bed || b.number === activePat.bed)) ||
            (activePat.bedNumber && (b.bedNumber === activePat.bedNumber || b.number === activePat.bedNumber))
          );
          if (isContextBed) {
            b.status = 'Ocupado';
            b.patientName = b.patientName || activePat.fullName || activePat.patientName;
            b.patientId = b.patientId || activePat.id;
            b.admittedAt = b.admittedAt || new Date().toISOString();
          }
        });

        // Auto-reconciliação: Sanitizar qualquer leito duplicado para o mesmo paciente
        const occupiedByPatient = {};
        beds.forEach(b => {
          if (b.status === 'Ocupado' && b.patientName) {
            const key = b.patientName.toLowerCase().trim();
            if (!occupiedByPatient[key]) occupiedByPatient[key] = [];
            occupiedByPatient[key].push(b);
          }
        });

        for (const key in occupiedByPatient) {
          const pBeds = occupiedByPatient[key];
          if (pBeds.length > 1) {
            // Identificar o leito oficial:
            // 1º: Leito correspondente ao contexto ativo do paciente
            // 2º: Leito vinculado no encounter ou hospitalization ativa
            // 3º: Leito com admittedAt mais recente
            let officialBed = null;
            if (activePat && (activePat.fullName || activePat.patientName || '').toLowerCase().trim() === key) {
              officialBed = pBeds.find(b => 
                (activePatBedId && (String(b.id) === activePatBedId || b.bedNumber === activePatBedId || b.number === activePatBedId)) ||
                (activePat.bedId && String(b.id) === String(activePat.bedId)) ||
                (activePat.bed && (b.bedNumber === activePat.bed || b.number === activePat.bed)) ||
                (activePat.bedNumber && (b.bedNumber === activePat.bedNumber || b.number === activePat.bedNumber))
              );
            }

            if (!officialBed) {
              officialBed = pBeds.find(b => {
                const bNum = b.bedNumber || b.number;
                const matchEnc = encList.some(e => (e.status === 'Internado' || e.status === 'Em_Atendimento') && (String(e.bedId) === String(b.id) || e.bed === bNum));
                const matchHosp = activeHosps.some(h => String(h.bed_id) === String(b.id) || h.bed === bNum);
                return matchEnc || matchHosp;
              });
            }

            if (!officialBed) {
              // Em caso de empate, manter o leito com o admittedAt mais recente ou o primeiro
              officialBed = pBeds.sort((a, b) => new Date(b.admittedAt || 0) - new Date(a.admittedAt || 0))[0] || pBeds[0];
            }

            // Liberar leitos residuais/duplicados para Higienização
            pBeds.forEach(b => {
              if (b !== officialBed) {
                console.warn(`[Leitos] Duplicidade detectada para ${b.patientName}. Liberando leito anterior ${b.bedNumber || b.number} (Leito oficial mantido: ${officialBed.bedNumber || officialBed.number}).`);
                b.status = 'Higienizacao';
                b.previousPatientName = b.patientName;
                b.patientId = null;
                b.patientName = null;
                b.encounterId = null;
                b.dischargedAt = new Date().toISOString();

                if (typeof localDB !== 'undefined' && localDB.update) {
                  localDB.update('beds', b.id, {
                    ...b,
                    status: 'Higienizacao',
                    patientId: null,
                    patientName: null,
                    encounterId: null,
                    dischargedAt: new Date().toISOString()
                  });
                }
              }
            });
          }
        }

        // Buscar Fila de Internação
        const queue = encList.filter(e => e.status === 'Aguardando_Leito');
        const queueContainer = document.getElementById('internacao-queue-container');
        const queueList = document.getElementById('internacao-queue-list');
        
        if (queue.length > 0) {
          queueContainer.style.display = 'block';

          queueList.innerHTML = queue.map(q => {
            const qName = (q.patientName || '').trim();
            const isSelectedInQueue = !!(activePatName && qName.toLowerCase().trim() === activePatName);
            const safeQNameEsc = qName.replace(/'/g, "\\'");

            return `
              <div class="patient-card-item ${isSelectedInQueue ? 'patient-pulse-selected patient-spotlight-glow' : ''}" 
                data-patient-card-name="${qName.toLowerCase().replace(/"/g, '&quot;')}" 
                style="background: var(--glass-bg); border-top: 4px solid var(--danger); border-left: ${isSelectedInQueue ? '2.5px solid #38bdf8' : '1px solid var(--glass-border)'}; border-right: ${isSelectedInQueue ? '2.5px solid #38bdf8' : '1px solid var(--glass-border)'}; border-bottom: ${isSelectedInQueue ? '2.5px solid #38bdf8' : '1px solid var(--glass-border)'}; backdrop-filter: var(--glass-blur); padding: 16px; border-radius: 12px; display: flex; justify-content: space-between; align-items: center; box-shadow: ${isSelectedInQueue ? '0 0 25px rgba(56,189,248,0.6)' : 'var(--shadow-sm)'}; transition: transform 0.2s ease; position: relative;"
                onclick="if(typeof setActivePatientContext==='function') setActivePatientContext({ id: '${q.id}', fullName: '${safeQNameEsc}', patientName: '${safeQNameEsc}', status: 'Aguardando_Leito' });">
                
                ${isSelectedInQueue ? '<span class="patient-selected-flow-badge" style="position:absolute;top:-10px;right:16px;background:linear-gradient(135deg,#38bdf8,#0284c7);color:#fff;font-size:0.7rem;font-weight:800;padding:2px 8px;border-radius:10px;box-shadow:0 3px 10px rgba(56,189,248,0.55);z-index:9;letter-spacing:0.5px;">⚡ Paciente em Foco</span>' : ''}

                <div>
                  <div style="font-weight: 700; color: var(--text-primary); font-size: 1.05rem; display:flex; align-items:center; gap:8px;">
                    ${q.patientName}
                  </div>
                  <div style="font-size: 0.85rem; color: var(--text-secondary); margin-top: 4px;">
                    <i class="fa-solid fa-clock"></i> Aguardando Leito (${q.room || '-'})
                  </div>
                </div>
                <button class="btn btn-sm ${isSelectedInQueue ? 'btn-tv-call-pulsing' : ''}" 
                  onclick="event.stopPropagation(); if(typeof setActivePatientContext==='function') setActivePatientContext({ id: '${q.id}', fullName: '${safeQNameEsc}', patientName: '${safeQNameEsc}', status: 'Aguardando_Leito' }); quickAdmitBed(null, '${q.id}', '${safeQNameEsc}')" 
                  style="background: linear-gradient(135deg, #10b981, #059669); color: white; border: none; font-weight: 600; padding: 10px 20px; border-radius: 20px; box-shadow: 0 4px 12px rgba(16,185,129,0.3); display: flex; align-items: center; gap: 6px; cursor: pointer; transition: all 0.2s;" 
                  onmouseenter="this.style.transform='scale(1.02)';" onmouseleave="this.style.transform='none';">
                  <i class="fa-solid fa-bed-pulse"></i> Alocar Leito
                </button>
              </div>
            `;
          }).join('');
        } else {
          queueContainer.style.display = 'none';
        }
      } catch (err) {
        console.error('Erro ao carregar fila de internação:', err);
      }

      // Garantir que o leito do paciente ativo não seja ocultado por filtro de setor ou status
      const activePatCtx = (typeof window.getActivePatientContext === 'function') ? window.getActivePatientContext() : null;
      if (activePatCtx && (activePatCtx.status === 'Internado')) {
        const pBedIdent = String(activePatCtx.bed || activePatCtx.bedNumber || activePatCtx.bedId || '');
        const pNameIdent = (activePatCtx.fullName || activePatCtx.patientName || '').toLowerCase().trim();
        const foundBed = beds.find(b => 
          (pBedIdent && (String(b.id) === pBedIdent || b.bedNumber === pBedIdent || b.number === pBedIdent)) ||
          (pNameIdent && b.patientName && b.patientName.toLowerCase().trim().includes(pNameIdent))
        );
        if (foundBed) {
          if (currentSector !== 'Todos' && foundBed.sector !== currentSector) {
            currentSector = 'Todos';
            document.querySelectorAll('.bed-sector-filter').forEach(btn => {
              const isAll = btn.getAttribute('data-sector') === 'Todos';
              btn.classList.toggle('active', isAll);
              btn.classList.toggle('btn-primary', isAll);
              btn.classList.toggle('btn-outline', !isAll);
            });
          }
          if (currentStatus !== 'Todos' && foundBed.status !== currentStatus) {
            currentStatus = 'Todos';
            document.querySelectorAll('.kpi-leitos-filter').forEach(c => {
              c.classList.remove('active');
              c.style.border = '1px solid transparent';
              c.style.background = '';
            });
          }
        }
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
        if (beds.length === 0) {
          grid.innerHTML = `
            <div style="grid-column: 1 / -1; text-align: center; padding: 60px 20px; background: var(--glass-bg); border-radius: 16px; border: 1.5px dashed var(--glass-border); backdrop-filter: var(--glass-blur);">
              <i class="fa-solid fa-bed" style="font-size: 3rem; color: var(--text-muted); opacity: 0.5; margin-bottom: 16px; display: inline-block;"></i>
              <h3 style="font-size: 1.25rem; font-weight: 700; color: var(--text-primary); margin-bottom: 8px;">Nenhum Leito Cadastrado</h3>
              <p style="color: var(--text-secondary); max-width: 480px; margin: 0 auto 20px auto; font-size: 0.9rem;">
                A base de dados foi limpa e não há leitos registrados no momento. Você pode inicializar a grade hospitalar com os 22 leitos padrão (UTI, Enfermaria, Pediatria e Maternidade) com 1 clique.
              </p>
              <button id="btn-load-default-beds" class="btn btn-primary" style="display: inline-flex; align-items: center; gap: 8px; font-weight: 700; padding: 10px 22px; border-radius: 10px;">
                <i class="fa-solid fa-arrows-rotate"></i> Carregar 22 Leitos Padrão
              </button>
            </div>
          `;
          document.getElementById('btn-load-default-beds')?.addEventListener('click', async () => {
            const defaultBeds = localDB.getDefaultBeds();
            const currentDb = localDB.getFullDB();
            currentDb.beds = defaultBeds;
            localDB.saveFullDB(currentDb);
            if (typeof showToast === 'function') {
              showToast('✅ 22 Leitos padrão inicializados com sucesso!');
            }
            await loadBeds();
          });
          return;
        }
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

        const isSelectedBed = !!(activePat && (
          (activePat.bedId && String(b.id) === String(activePat.bedId)) ||
          (activePat.bed && (String(b.bedNumber) === String(activePat.bed) || String(b.number) === String(activePat.bed))) ||
          (activePat.bedNumber && (String(b.bedNumber) === String(activePat.bedNumber) || String(b.number) === String(activePat.bedNumber)))
        ));

        const isPatientNameMatch = !!(activePatName && b.patientName && (
          b.patientName.toLowerCase().trim() === activePatName ||
          b.patientName.toLowerCase().trim().includes(activePatName) ||
          activePatName.includes(b.patientName.toLowerCase().trim())
        ));

        // Só destaca o leito se o paciente internado nele for de fato o paciente em foco no fluxo
        const isSelectedPatient = isPatientNameMatch || (isSelectedBed && isPatientNameMatch);

        const cardPatientName = (b.patientName || '').toLowerCase().replace(/"/g, '&quot;');

        const allBedsRx = (typeof localDB !== 'undefined' && localDB.list) ? (localDB.list('prescriptions') || []) : [];
        const bPatName = (b.patientName || '').toLowerCase().trim();
        const bPatId = b.patientId ? String(b.patientId) : '';
        const bRxMatches = b.status === 'Ocupado' ? allBedsRx.filter(r => (bPatId && String(r.patientId) === bPatId) || (bPatName && r.patientName && r.patientName.toLowerCase().trim() === bPatName)) : [];
        const bMedTotal = bRxMatches.reduce((acc, r) => acc + (Array.isArray(r.medications) ? r.medications.length : 1), 0);

        return `
          <div class="card patient-card-item ${isSelectedPatient ? 'patient-pulse-selected patient-spotlight-glow' : ''}" 
            data-patient-card-name="${cardPatientName}" 
            data-bed-id="${b.id}"
            data-bed-number="${b.bedNumber || b.number || ''}"
            style="padding: 20px; border-top: ${borderTop}; border-left: ${isSelectedPatient ? '2.5px solid #38bdf8' : 'var(--glass-border)'}; border-right: ${isSelectedPatient ? '2.5px solid #38bdf8' : 'var(--glass-border)'}; border-bottom: ${isSelectedPatient ? '2.5px solid #38bdf8' : 'var(--glass-border)'}; background: var(--glass-bg); backdrop-filter: var(--glass-blur); box-shadow: ${isSelectedPatient ? '0 0 25px rgba(56,189,248,0.6)' : 'var(--shadow-sm)'}; display: flex; flex-direction: column; justify-content: space-between; cursor: pointer; transition: transform 0.2s ease, box-shadow 0.2s ease; position: relative;" 
            onclick="window.handleBedCardClick('${b.id}', '${(b.patientName||'').replace(/'/g, "\\'")}', '${b.patientId || ''}', '${b.bedNumber || b.number || ''}', '${(b.sector||'').replace(/'/g, "\\'")}')" 
            onmouseenter="this.style.transform='translateY(-4px)';" 
            onmouseleave="this.style.transform='none';">
            ${isSelectedPatient ? '<span class="patient-selected-flow-badge" style="position:absolute;top:-10px;right:16px;background:linear-gradient(135deg,#38bdf8,#0284c7);color:#fff;font-size:0.7rem;font-weight:800;padding:2px 8px;border-radius:10px;box-shadow:0 3px 10px rgba(56,189,248,0.55);z-index:9;letter-spacing:0.5px;">⚡ Paciente em Foco</span>' : ''}
            <div>
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                <span style="font-weight: 800; font-size: 1.25rem; color: var(--text-primary); display:flex; align-items:center; gap: 6px;">
                  <i class="fa-solid fa-bed" style="color: ${b.status === 'Ocupado' ? '#f87171' : '#4ade80'}; font-size:1.1rem;"></i> Leito ${b.bedNumber}
                </span>
                <span class="badge" style="background: ${statusBg}; color: ${statusColor}; font-weight:700; border: 1px solid ${statusBg.replace('0.15', '0.3')}; border-radius: 12px; padding: 4px 10px;">${b.status}</span>
              </div>
              <div style="font-size: 0.85rem; font-weight: 600; color: var(--text-muted); margin-bottom: 14px;">
                <i class="fa-solid fa-hospital"></i> ${b.sector}
              </div>
              ${b.status === 'Ocupado' ? `
                <div style="background: rgba(255,255,255,0.03); padding: 12px; border-radius: 10px; border: 1px solid var(--border-color); margin-bottom: 14px;">
                  <div style="font-weight: 700; color: var(--text-primary); font-size: 1rem; margin-bottom: 4px; display:flex; align-items:center; gap: 6px;">
                    <i class="fa-solid fa-hospital-user" style="color: var(--color-primary);"></i> ${b.patientName}
                  </div>
                  <div style="font-size: 0.8rem; color: var(--text-muted);">
                    <i class="fa-regular fa-calendar-check"></i> Entrada: ${b.entryDate || b.admittedAt || 'Hoje'}
                  </div>
                  ${bMedTotal > 0 ? `
                    <div style="margin-top: 6px; font-size: 0.75rem; font-weight: 700; color: #38bdf8; display:flex; align-items:center; gap: 4px;">
                      <i class="fa-solid fa-pills"></i> ${bMedTotal} med. ativa(s)
                    </div>
                  ` : ''}
                </div>
              ` : `
                <div style="padding: 18px 0; text-align: center; color: var(--text-muted); font-size: 0.9rem; font-style: italic;">
                  ${b.status === 'Vago' ? 'Pronto para receber paciente' : 'Aguardando limpeza'}
                </div>
              `}
            </div>

            <div style="display: flex; gap: 8px; margin-top: 10px;">
              ${b.status === 'Vago' ? `
                <button class="btn btn-sm btn-primary" onclick="window.openAssignBedModal('${b.id}')" style="width: 100%; border-radius: 8px; font-weight:700; background: linear-gradient(135deg, #0284c7, #0369a1); border:none; padding: 9px 14px;">
                  <i class="fa-solid fa-user-plus"></i> Internar Paciente
                </button>
              ` : ''}
              ${b.status === 'Ocupado' ? `
                <button class="btn btn-sm btn-primary" onclick="window.openPEP('${b.patientId}')" style="flex: 1; border-radius: 8px; font-weight:700; font-size: 0.76rem; padding: 7px 10px; background: rgba(56,189,248,0.15); border: 1px solid rgba(56,189,248,0.3); color: #38bdf8;">
                  <i class="fa-solid fa-notes-medical"></i> PEP
                </button>
                <button class="btn btn-sm btn-danger" onclick="window.dischargeBed('${b.id}')" style="flex: 1; border-radius: 8px; font-weight:700; font-size: 0.76rem; padding: 7px 10px; background: linear-gradient(135deg, #be5a6e, #9e3a52); border:none; color: #fff;">
                  <i class="fa-solid fa-door-open"></i> Alta
                </button>
              ` : ''}
              ${b.status === 'Higienizacao' ? `
                <button class="btn btn-sm btn-success" onclick="window.updateBedStatus('${b.id}', 'Vago')" style="width: 100%; border-radius: 8px; font-weight:700; background: linear-gradient(135deg, #22c55e, #16a34a); border:none; color: #fff; box-shadow: 0 4px 10px rgba(34,197,94,0.25); padding: 9px 14px;">
                  <i class="fa-solid fa-sparkles"></i> Liberar Leito
                </button>
              ` : ''}
            </div>
          </div>
        `;
      }).join('');

      // Acionar destaque pulsante e foco no leito do paciente selecionado
      const patNameToHighlight = (activePat ? (activePat.fullName || activePat.patientName) : '') || window._highlightPatientName || activePatName;
      if (typeof window.executePatientHighlight === 'function' && patNameToHighlight) {
        setTimeout(() => {
          window.executePatientHighlight(patNameToHighlight);
        }, 120);
      }
    } catch (e) {
      console.error('[loadBeds] Erro ao carregar mapa de leitos:', e);
      document.getElementById('beds-grid').innerHTML = `<div style="grid-column: 1 / -1; text-align: center; color: var(--color-danger); padding: 20px;">Erro ao carregar mapa de leitos.</div>`;
    }
  };

  // Carregar Pacientes no Modal (Busca Direta & Rápida com Pré-Seleção Automática)
  const loadPatientsModal = async (preselectedPatientId = null, preselectedPatientName = '') => {
    try {
      const res = await apiFetch(`${API_URL}/patients`);
      if (!res.ok) throw new Error();
      const patients = await res.json();
      const patientList = Array.isArray(patients) ? patients : (patients.data || []);
      
      // Ordenação Alfabética A-Z por nome completo
      patientList.sort((a, b) => (a.fullName || '').localeCompare(b.fullName || '', 'pt-BR', { sensitivity: 'base' }));

      const pComboContainer = document.getElementById('admit-patient-combo');
      const pHiddenInput = document.getElementById('admit-patient-id');

      const activeCtx = (typeof window.getActivePatientContext === 'function') ? window.getActivePatientContext() : null;
      const targetId = preselectedPatientId || activeCtx?.id || activeCtx?.patientId;
      const targetName = (preselectedPatientName || activeCtx?.fullName || activeCtx?.patientName || '').toLowerCase().trim();

      if (pComboContainer && pHiddenInput) {
        setupCustomSelect(pComboContainer, pHiddenInput, patientList, 'Selecione o paciente...');

        // Pré-seleção automática do paciente em foco
        if (targetId || targetName) {
          const match = patientList.find(p => (targetId && String(p.id) === String(targetId)) || (targetName && (p.fullName || '').toLowerCase().trim().includes(targetName)));
          if (match) {
            pHiddenInput.value = match.id;
            pHiddenInput.setAttribute('data-name', match.fullName);
            const triggerEl = pComboContainer.querySelector('.custom-select-trigger, .selected-value, .select-placeholder');
            if (triggerEl) {
              triggerEl.textContent = `${match.fullName}${match.cpf ? ' (' + match.cpf + ')' : ''}`;
              triggerEl.style.color = '#fff';
            }
          }
        }
      }
    } catch (e) {
      const pComboContainer = document.getElementById('admit-patient-combo');
      if (pComboContainer) pComboContainer.innerHTML = '<div class="form-input">Erro ao carregar pacientes</div>';
    }
  };

  window.openAdmitBedModal = function(patientId = null, patientName = '', encounterId = null, bedId = null) {
    const modal = document.getElementById('modal-admit-bed');
    if (!modal) return;
    modal.style.display = 'flex';
    if (encounterId) {
      const encInput = document.getElementById('admit-encounter-id');
      if (encInput) encInput.value = encounterId;
    }
    if (bedId) {
      const bSelect = document.getElementById('admit-bed-id');
      if (bSelect) bSelect.value = bedId;
    }
    loadPatientsModal(patientId, patientName);
    if (typeof window.createSmartFlowGuideCard === 'function') {
      window.createSmartFlowGuideCard('leitos');
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
  document.getElementById('btn-open-admit-modal')?.addEventListener('click', () => {
    const activeCtx = (typeof window.getActivePatientContext === 'function') ? window.getActivePatientContext() : null;
    window.openAdmitBedModal(activeCtx?.id, activeCtx?.fullName || activeCtx?.patientName, activeCtx?.encounterId);
  });
  document.getElementById('btn-close-admit-modal')?.addEventListener('click', () => {
    modal.style.display = 'none';
    if (typeof window.createSmartFlowGuideCard === 'function') window.createSmartFlowGuideCard('leitos');
  });
  document.getElementById('btn-cancel-admit-modal')?.addEventListener('click', () => {
    modal.style.display = 'none';
    if (typeof window.createSmartFlowGuideCard === 'function') window.createSmartFlowGuideCard('leitos');
  });

  document.getElementById('form-admit-bed')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const bedId = document.getElementById('admit-bed-id').value;
    const pSelect = document.getElementById('admit-patient-id');
    const encInput = document.getElementById('admit-encounter-id');
    const selectedOption = pSelect.options ? pSelect.options[pSelect.selectedIndex] : null;
    const patientId = pSelect.value;
    const patientName = selectedOption ? (selectedOption.getAttribute('data-name') || selectedOption.text.split(' (CPF')[0].trim()) : (pSelect.getAttribute('data-name') || '');
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
        modal.style.display = 'none';
        
        const bSelect = document.getElementById('admit-bed-id');
        const selectedBedOpt = bSelect?.options ? bSelect.options[bSelect.selectedIndex] : null;
        const bedOptText = selectedBedOpt ? selectedBedOpt.text : '';
        const bedNumberLabel = bedOptText.includes(' — ') ? bedOptText.split(' — ')[0].trim() : bedId;
        const bedSectorLabel = bedOptText.includes(' — ') ? bedOptText.split(' — ')[1].trim() : 'Internação';

        // 1. Atualizar Contexto Ativo do Paciente para Internado (Etapa 5)
        if (typeof window.setActivePatientContext === 'function') {
          const curCtx = (typeof window.getActivePatientContext === 'function') ? window.getActivePatientContext() : {};
          window.setActivePatientContext({
            ...curCtx,
            id: patientId,
            fullName: patientName,
            patientName: patientName,
            status: 'Internado',
            bed: bedNumberLabel,
            bedNumber: bedNumberLabel,
            bedId: bedId,
            sector: bedSectorLabel,
            ward: bedSectorLabel,
            currentStep: 5
          });
        }

        // 2. Notificação e Sincronização do Guia Flutuante
        if (typeof window.showFlowCompletionNotification === 'function') {
          window.showFlowCompletionNotification({
            actionTitle: `🛏️ Internação Concluída: Leito ${bedNumberLabel}`,
            message: `O paciente <strong>${patientName}</strong> foi internado com sucesso no <strong>Leito ${bedNumberLabel} (${bedSectorLabel})</strong>.<br><br>👉 Paciente acomodado! <strong>Clique no botão abaixo para abrir o Prontuário (PEP)</strong> para prescrever a terapia de internação ou acompanhar no mapa de leitos.`,
            targetTab: 'consultorios',
            targetTabLabel: `🩺 Abrir PEP de ${patientName.split(' ')[0]} (Leito ${bedNumberLabel}) ➔`,
            targetPatientName: patientName,
            targetPatientId: patientId,
            targetStatus: 'Internado',
            bedId: bedId,
            actionType: 'open_pep'
          });
        } else if (typeof window.createSmartFlowGuideCard === 'function') {
          window.createSmartFlowGuideCard('leitos');
        }

        // 3. Recarrega os leitos e aplica o destaque visual (spotlight/pulse) no card do paciente recém-internado
        await loadBeds();

        if (typeof window.executePatientHighlight === 'function') {
          setTimeout(() => {
            window.executePatientHighlight(patientName);
          }, 200);
        }
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
  const perms = (typeof getRolePermissions === 'function') ? getRolePermissions(state.user) : { canManageBeds: true, label: 'Usuário' };
  if (!perms.canManageBeds) {
    showCustomAlert({
      title: 'Acesso Restrito',
      message: `Seu perfil (<strong>${perms.label}</strong>) não possui autorização para internar pacientes em leitos. Esta operação é restrita a Médicos, Enfermeiros e Administradores.`,
      type: 'warning'
    });
    return;
  }

  const activeCtx = (typeof window.getActivePatientContext === 'function') ? window.getActivePatientContext() : null;
  const targetPatientName = patientName || (activeCtx ? (activeCtx.fullName || activeCtx.patientName) : null);

  if (targetPatientName && typeof window.setActivePatientContext === 'function') {
    window.setActivePatientContext({
      ...(activeCtx || {}),
      fullName: targetPatientName,
      patientName: targetPatientName,
      status: 'Aguardando_Leito',
      bedId: bedId || undefined
    });
  }

  const modal = document.getElementById('modal-admit-bed');
  if (modal) {
    modal.style.display = 'flex';
    const bedSelect = document.getElementById('admit-bed-id');
    if (bedSelect && bedId) bedSelect.value = bedId;
    
    const encInput = document.getElementById('admit-encounter-id');
    if (encInput) encInput.value = encounterId || '';

    const pSelect = document.getElementById('admit-patient-id');
    const pSearch = document.getElementById('admit-patient-search');
    if (pSearch) pSearch.value = targetPatientName || '';

    if (pSelect) {
      apiFetch(`${API_URL}/patients`).then(r => r.json()).then(patients => {
        const list = Array.isArray(patients) ? patients : (patients.data || []);
        
        // Ordenação Alfabética A-Z por nome completo
        list.sort((a, b) => (a.fullName || '').localeCompare(b.fullName || '', 'pt-BR', { sensitivity: 'base' }));

        const renderOptions = (items) => {
          pSelect.innerHTML = '<option value="" style="background-color: #19142c; color: #ffffff;">Selecione o paciente...</option>' + 
            items.map(p => `<option value="${p.id}" data-name="${p.fullName}" style="background-color: #19142c; color: #ffffff;">${p.fullName} (CPF: ${p.cpf})</option>`).join('');
          
          // Auto-selecionar se targetPatientName foi fornecido ou está ativo no contexto
          if (targetPatientName) {
            const found = items.find(p => (p.fullName || '').toLowerCase().trim() === targetPatientName.toLowerCase().trim());
            if (found) {
              pSelect.value = found.id;
              if (pSearch) pSearch.value = found.fullName;
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
  const perms = (typeof getRolePermissions === 'function') ? getRolePermissions(state.user) : { canManageBeds: true, label: 'Usuário' };
  if (!perms.canManageBeds) {
    showCustomAlert({
      title: 'Acesso Restrito',
      message: `Seu perfil (<strong>${perms.label}</strong>) não possui autorização para conceder alta de leito hospitalar.`,
      type: 'warning'
    });
    return;
  }

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
          <i class="fa-solid fa-circle-info" style="color: #0284c7; font-size: 1rem; flex-shrink: 0;"></i>
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
  const perms = (typeof getRolePermissions === 'function') ? getRolePermissions(state.user) : { canManageBeds: true, label: 'Usuário' };
  if (!perms.canManageBeds) {
    showCustomAlert({
      title: 'Acesso Restrito',
      message: `Seu perfil (<strong>${perms.label}</strong>) não possui autorização para conceder alta hospitalar.`,
      type: 'warning'
    });
    return;
  }

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
  const perms = (typeof getRolePermissions === 'function') ? getRolePermissions(state.user) : { canManageBeds: true, label: 'Usuário' };
  if (!perms.canManageBeds) {
    showCustomAlert({
      title: 'Acesso Restrito',
      message: `Seu perfil (<strong>${perms.label}</strong>) não possui permissão para alterar o status operacional de leitos.`,
      type: 'warning'
    });
    return;
  }

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

window.handleBedCardClick = function(bedId, patientName, patientId, bedNumber, sector) {
  if (patientName && String(patientName).trim()) {
    if (typeof setActivePatientContext === 'function') {
      setActivePatientContext({
        id: patientId || bedId,
        fullName: patientName,
        patientName: patientName,
        bed: bedNumber,
        bedNumber: bedNumber,
        sector: sector || 'Internação',
        status: 'Internado'
      });
    }
    if (typeof window.ensureSmartFlowGuideMounted === 'function') {
      window.ensureSmartFlowGuideMounted('leitos');
    }
  }
  window.openBedDetailsModal(bedId);
};

window.openBedDetailsModal = async function(bedId) {
  const existing = document.getElementById('bed-details-modal');
  if (existing) existing.remove();

  try {
    const rawBeds = await cachedApiGet('/api/beds', 'beds');
    const beds = Array.isArray(rawBeds) ? rawBeds : (rawBeds.data || []);
    const bed = beds.find(b => String(b.id) === String(bedId) || b.bedNumber === bedId || b.number === bedId);

    if (!bed) {
      showToast('Leito não encontrado.', true);
      return;
    }

    const bedNum = bed.bedNumber || bed.number || bed.id;
    const isOccupied = bed.status === 'Ocupado';

    if (isOccupied && bed.patientName && typeof setActivePatientContext === 'function') {
      setActivePatientContext({
        id: bed.patientId || bed.id,
        fullName: bed.patientName,
        patientName: bed.patientName,
        bed: bedNum,
        bedNumber: bedNum,
        sector: bed.sector || bed.type || 'Internação',
        status: 'Internado'
      });
      if (typeof window.ensureSmartFlowGuideMounted === 'function') {
        window.ensureSmartFlowGuideMounted('leitos');
      }
    }

    // Buscar histórico de internações deste leito
    const hosps = (typeof localDB !== 'undefined' && localDB.list) ? (localDB.list('hospitalizations') || []) : [];
    const bedHosps = hosps.filter(h => String(h.bed_id) === String(bed.id) || h.bed === bedNum);

    // Buscar prescrições médicas ativas deste leito
    const allRxDB = (typeof localDB !== 'undefined' && localDB.list) ? (localDB.list('prescriptions') || []) : [];
    const pTargetName = (bed.patientName || '').toLowerCase().trim();
    const pTargetId = bed.patientId ? String(bed.patientId) : '';
    const bedPrescriptions = isOccupied ? allRxDB.filter(r => 
      (pTargetId && String(r.patientId) === pTargetId) ||
      (pTargetName && r.patientName && r.patientName.toLowerCase().trim() === pTargetName)
    ) : [];

    let bedMedsList = [];
    bedPrescriptions.forEach(p => {
      if (Array.isArray(p.medications)) {
        p.medications.forEach(m => bedMedsList.push({
          name: m.name,
          dosage: m.dosage || m.dose || '',
          route: m.route || m.via || 'VO',
          frequency: m.frequency || m.freq || 'De 8 em 8h',
          instructions: m.instructions || m.notes || '',
          doctorName: p.doctorName || 'Dr(a). Médico(a) Plantonista',
          date: p.created_at || p.date || ''
        }));
      }
    });

    let statusBadgeColor = '#4ade80';
    let statusBadgeBg = 'rgba(74,222,128,0.15)';
    if (bed.status === 'Ocupado') {
      statusBadgeColor = '#f87171';
      statusBadgeBg = 'rgba(248,113,113,0.2)';
    } else if (bed.status === 'Higienizacao') {
      statusBadgeColor = '#facc15';
      statusBadgeBg = 'rgba(250,204,21,0.2)';
    }

    const modalHtml = `
      <div id="bed-details-modal" class="modal-overlay" style="position: fixed; top:0; left:0; width:100vw; height:100vh; z-index: 99999; display: flex; align-items: center; justify-content: center; background: rgba(5,7,20,0.85); backdrop-filter: blur(10px);">
        <div class="modal-content" style="max-width: 720px; width: 95vw; max-height: 90vh; background: var(--bg-secondary); border: 1.5px solid rgba(99,102,241,0.45); border-radius: 18px; overflow: hidden; display: flex; flex-direction: column; box-shadow: 0 20px 60px rgba(0,0,0,0.8); animation: slideIn 0.3s ease-out;">
          
          <div style="background: linear-gradient(135deg, #1e1b4b, #311b92); padding: 18px 24px; display: flex; justify-content: space-between; align-items: center; color: #fff; border-bottom: 1px solid var(--border-color);">
            <div style="display: flex; align-items: center; gap: 12px;">
              <div style="width: 44px; height: 44px; border-radius: 12px; background: rgba(99,102,241,0.25); border: 1px solid rgba(99,102,241,0.4); display: flex; align-items: center; justify-content: center; color: #818cf8; font-size: 1.3rem;">
                <i class="fa-solid fa-bed"></i>
              </div>
              <div>
                <h3 style="margin: 0; font-size: 1.2rem; font-weight: 800; color: #fff; display: flex; align-items: center; gap: 8px;">
                  Leito ${bedNum}
                  <span style="font-size: 0.72rem; padding: 3px 10px; border-radius: 20px; background: ${statusBadgeBg}; color: ${statusBadgeColor}; border: 1px solid ${statusBadgeColor}; font-weight: 700;">${bed.status}</span>
                </h3>
                <small style="color: #c4b5fd; font-size: 0.82rem;">Setor: <strong>${bed.sector || bed.type || 'Enfermaria'}</strong> &bull; Ala: ${bed.ward || 'Geral'}</small>
              </div>
            </div>
            <button onclick="document.getElementById('bed-details-modal').remove()" style="background: rgba(255,255,255,0.1); border: none; color: #fff; width: 32px; height: 32px; border-radius: 50%; cursor: pointer; display: flex; align-items: center; justify-content: center;"><i class="fa-solid fa-xmark"></i></button>
          </div>

          <div style="padding: 22px; overflow-y: auto; display: flex; flex-direction: column; gap: 18px;">
            
            <!-- Paciente Atualmente Alocado -->
            <div style="background: var(--bg-tertiary); border: 1.5px solid ${isOccupied ? 'rgba(239,68,68,0.4)' : 'var(--border-color)'}; border-radius: 14px; padding: 18px;">
              <div style="font-size: 0.78rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase; margin-bottom: 12px; display: flex; justify-content: space-between; align-items: center;">
                <span><i class="fa-solid fa-user-injured" style="color: ${isOccupied ? '#f87171' : '#4ade80'};"></i> Ocupação Atual do Leito</span>
                ${isOccupied ? '<span style="background: #ef4444; color: #fff; padding: 2px 8px; border-radius: 10px; font-size: 0.7rem; font-weight: 700;">Internado</span>' : ''}
              </div>

              ${isOccupied ? `
                <div style="display: flex; flex-direction: column; gap: 14px;">
                  <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 10px;">
                    <div>
                      <h4 style="margin: 0; font-size: 1.3rem; font-weight: 800; color: #ffffff; display: flex; align-items: center; gap: 8px;">
                        <i class="fa-solid fa-hospital-user" style="color: #38bdf8;"></i> ${bed.patientName || 'Paciente'}
                      </h4>
                      <div style="font-size: 0.82rem; color: #94a3b8; margin-top: 6px; display: flex; gap: 12px; flex-wrap: wrap; align-items: center;">
                        <span><i class="fa-solid fa-calendar-check" style="color: #a5b4fc;"></i> Admissão: <strong>${bed.admittedAt ? new Date(bed.admittedAt).toLocaleDateString('pt-BR') + ' às ' + new Date(bed.admittedAt).toLocaleTimeString().slice(0,5) : 'Hoje'}</strong></span>
                        <span><i class="fa-solid fa-bed" style="color: #f87171;"></i> Capacidade: <strong>1 Paciente</strong></span>
                        ${bedMedsList.length > 0 ? `<span style="background: rgba(16,185,129,0.2); color: #34d399; border: 1px solid rgba(16,185,129,0.4); padding: 2px 8px; border-radius: 6px; font-weight: 700; font-size: 0.74rem;"><i class="fa-solid fa-pills"></i> ${bedMedsList.length} medicamento(s) ativo(s)</span>` : ''}
                      </div>
                    </div>
                  </div>

                  <!-- Ações do Paciente Internado -->
                  <div style="display: flex; gap: 8px; flex-wrap: wrap; padding-top: 12px; border-top: 1px solid rgba(255,255,255,0.08);">
                    <button class="btn" style="background: linear-gradient(135deg, #0284c7, #0369a1); color: #fff; border: none; font-size: 0.82rem; padding: 8px 14px; border-radius: 8px; font-weight: 700; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; box-shadow: 0 4px 12px rgba(2,132,199,0.3);" onclick="document.getElementById('bed-details-modal').remove(); if(typeof window.openPEPModal === 'function') window.openPEPModal('${bed.patientId || bed.patientName}');">
                      <i class="fa-solid fa-file-medical"></i> Abrir PEP / Prontuário
                    </button>
                    <button class="btn" style="background: rgba(99,102,241,0.22); border: 1px solid rgba(99,102,241,0.45); color: #c7d2fe; font-size: 0.82rem; padding: 8px 14px; border-radius: 8px; font-weight: 700; cursor: pointer; display: inline-flex; align-items: center; gap: 6px;" onclick="document.getElementById('bed-details-modal').remove(); if(typeof window.openPrescriptionModal === 'function') window.openPrescriptionModal('', '${(bed.patientName||'').replace(/'/g, "\\'")}', '${bed.patientId || ''}');" title="Prescrever Medicações para o Leito">
                      <i class="fa-solid fa-pills"></i> Prescrição Médica
                    </button>
                    <button class="btn" style="background: rgba(99,102,241,0.18); border: 1px solid rgba(99,102,241,0.4); color: #a5b4fc; font-size: 0.82rem; padding: 8px 14px; border-radius: 8px; font-weight: 700; cursor: pointer; display: inline-flex; align-items: center; gap: 6px;" onclick="document.getElementById('bed-details-modal').remove(); if(typeof window.openPatientHistoryModal === 'function') window.openPatientHistoryModal('${bed.patientId || bed.patientName}', '${(bed.patientName||'').replace(/'/g, "\\'")}');">
                      <i class="fa-solid fa-timeline"></i> Ver Jornada Completa
                    </button>
                    <button class="btn" style="background: rgba(239,68,68,0.18); border: 1px solid rgba(239,68,68,0.4); color: #fca5a5; font-size: 0.82rem; padding: 8px 14px; border-radius: 8px; font-weight: 700; cursor: pointer; display: inline-flex; align-items: center; gap: 6px;" onclick="document.getElementById('bed-details-modal').remove(); window.updateBedStatus('${bed.id}', 'Higienizacao');" title="Desocupar este leito e enviar para higienização sem cancelar atendimento geral do paciente">
                      <i class="fa-solid fa-broom"></i> Desocupar p/ Higienização
                    </button>
                    <button class="btn" style="background: linear-gradient(135deg, #be5a6e, #9e3a52); border: none; color: #fff; font-size: 0.82rem; padding: 8px 14px; border-radius: 8px; font-weight: 700; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; margin-left: auto;" onclick="document.getElementById('bed-details-modal').remove(); window.dischargeBed('${bed.id}');">
                      <i class="fa-solid fa-door-open"></i> Dar Alta Hospitalar
                    </button>
                  </div>
                </div>
              ` : `
                <div style="text-align: center; padding: 16px 0; color: var(--text-muted); font-size: 0.88rem;">
                  <i class="fa-solid fa-bed" style="font-size: 1.8rem; color: #4ade80; display: block; margin-bottom: 8px; opacity: 0.8;"></i>
                  Este leito está <strong>Vago</strong> e disponível para receber novas internações.
                  <div style="margin-top: 14px;">
                    <button class="btn btn-primary" style="font-size: 0.85rem; padding: 8px 18px; font-weight: 700;" onclick="document.getElementById('bed-details-modal').remove(); window.quickAdmitBed('${bed.id}');">
                      <i class="fa-solid fa-plus"></i> Internar Paciente Aqui
                    </button>
                  </div>
                </div>
              `}
            </div>

            <!-- Seção: Prescrições Médicas & Aprazamento Ativo do Leito -->
            ${isOccupied ? `
              <div style="background: var(--bg-tertiary); border: 1.5px solid rgba(99,102,241,0.35); border-radius: 14px; padding: 18px;">
                <div style="font-size: 0.78rem; font-weight: 700; color: #a5b4fc; text-transform: uppercase; margin-bottom: 12px; display: flex; justify-content: space-between; align-items: center;">
                  <span style="display: flex; align-items: center; gap: 8px;">
                    <i class="fa-solid fa-pills" style="color: #38bdf8; font-size: 0.95rem;"></i> Prescrições Médicas Ativas deste Leito (${bedMedsList.length})
                  </span>
                  <button class="btn btn-sm" onclick="document.getElementById('bed-details-modal').remove(); if(typeof window.openPrescriptionModal === 'function') window.openPrescriptionModal('', '${(bed.patientName||'').replace(/'/g, "\\'")}', '${bed.patientId || ''}');" style="background: rgba(99,102,241,0.2); border: 1px solid rgba(99,102,241,0.45); color: #c7d2fe; font-size: 0.74rem; font-weight: 700; padding: 4px 10px; border-radius: 6px; cursor: pointer; display: inline-flex; align-items: center; gap: 5px;">
                    <i class="fa-solid fa-plus"></i> Prescrever Novo Fármaco
                  </button>
                </div>

                ${bedMedsList.length > 0 ? `
                  <div style="display: flex; flex-direction: column; gap: 8px; max-height: 220px; overflow-y: auto;">
                    ${bedMedsList.map(m => `
                      <div style="padding: 10px 14px; background: var(--bg-secondary); border-radius: 10px; border: 1px solid var(--border-color); display: flex; justify-content: space-between; align-items: center; gap: 10px; flex-wrap: wrap;">
                        <div>
                          <div style="font-weight: 700; color: #fff; font-size: 0.9rem; display: flex; align-items: center; gap: 8px;">
                            ${m.name}
                            <span style="background: rgba(99,102,241,0.2); color: #a78bfa; padding: 1px 6px; border-radius: 4px; font-size: 0.72rem; font-weight: 700;">${m.route || 'VO'}</span>
                          </div>
                          <div style="font-size: 0.78rem; color: #94a3b8; margin-top: 3px;">
                            Dose: <strong style="color: #cbd5e1;">${m.dosage || 'Conforme prescrição'}</strong> &bull; Frequência: <strong style="color: #cbd5e1;">${m.frequency || 'De 8/8h'}</strong>
                            ${m.instructions ? ` &bull; <em style="color: #a5b4fc;">${m.instructions}</em>` : ''}
                          </div>
                        </div>
                        <div style="text-align: right; font-size: 0.72rem; color: var(--text-muted);">
                          <div style="color: #34d399; font-weight: 600;"><i class="fa-solid fa-circle-check"></i> Em Administração</div>
                          <div>${m.doctorName}</div>
                        </div>
                      </div>
                    `).join('')}
                  </div>
                ` : `
                  <div style="text-align: center; padding: 14px; color: var(--text-muted); font-size: 0.82rem; background: var(--bg-secondary); border-radius: 8px; border: 1px dashed var(--border-color);">
                    <i class="fa-solid fa-file-prescription" style="color: #a5b4fc; font-size: 1.2rem; display: block; margin-bottom: 6px;"></i>
                    Nenhuma prescrição ativa registrada para este leito no momento.
                    <div style="margin-top: 6px;">
                      <button class="btn btn-sm btn-primary" onclick="document.getElementById('bed-details-modal').remove(); if(typeof window.openPrescriptionModal === 'function') window.openPrescriptionModal('', '${(bed.patientName||'').replace(/'/g, "\\'")}', '${bed.patientId || ''}');" style="font-size: 0.76rem; padding: 5px 12px;">
                        <i class="fa-solid fa-plus"></i> Emitir Prescrição Agora
                      </button>
                    </div>
                  </div>
                `}
              </div>
            ` : ''}

            <!-- Histórico de Ocupação do Leito -->
            <div style="background: var(--bg-tertiary); border: 1px solid var(--border-color); border-radius: 14px; padding: 18px;">
              <div style="font-size: 0.78rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase; margin-bottom: 12px; display: flex; align-items: center; gap: 8px;">
                <i class="fa-solid fa-history" style="color: #0284c7;"></i> Histórico de Internações neste Leito (${bedHosps.length})
              </div>

              ${bedHosps.length > 0 ? `
                <div style="display: flex; flex-direction: column; gap: 8px; max-height: 220px; overflow-y: auto;">
                  ${bedHosps.map(h => `
                    <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px 14px; background: var(--bg-secondary); border-radius: 10px; border: 1px solid var(--border-color); gap: 10px; flex-wrap: wrap;">
                      <div>
                        <strong style="color: #f8fafc; font-size: 0.9rem; display: block;">${h.patientName || 'Paciente'}</strong>
                        <small style="color: var(--text-muted); font-size: 0.75rem;">
                          Entrada: ${h.admitted_at ? new Date(h.admitted_at).toLocaleDateString('pt-BR') : '-'}
                          ${h.discharged_at ? ` &bull; Alta: ${new Date(h.discharged_at).toLocaleDateString('pt-BR')}` : ' &bull; 🟢 Ativo'}
                        </small>
                      </div>
                      <span class="badge" style="font-size: 0.72rem; padding: 3px 8px; border-radius: 10px; background: ${h.status === 'Alta' ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)'}; color: ${h.status === 'Alta' ? '#34d399' : '#f87171'}; border: 1px solid ${h.status === 'Alta' ? '#10b981' : '#ef4444'};">
                        ${h.status || 'Internado'}
                      </span>
                    </div>
                  `).join('')}
                </div>
              ` : `
                <div style="color: var(--text-muted); font-size: 0.82rem; text-align: center; padding: 12px 0;">
                  Nenhum registro histórico prévio para este leito.
                </div>
              `}
            </div>

            <!-- Manutenção e Status -->
            <div style="display: flex; justify-content: space-between; align-items: center; background: rgba(255,255,255,0.03); padding: 12px 16px; border-radius: 10px; border: 1px solid var(--border-color); flex-wrap: wrap; gap: 10px;">
              <span style="font-size: 0.82rem; color: var(--text-muted);">Alterar Situação Operacional:</span>
              <div style="display: flex; gap: 6px;">
                <button class="btn btn-sm" onclick="window.updateBedStatus('${bed.id}', 'Vago'); document.getElementById('bed-details-modal').remove();" style="background: rgba(74,222,128,0.15); border: 1px solid #4ade80; color: #4ade80; font-size: 0.75rem; padding: 5px 10px; border-radius: 6px; cursor: pointer;">
                  🟢 Vago
                </button>
                <button class="btn btn-sm" onclick="window.updateBedStatus('${bed.id}', 'Higienizacao'); document.getElementById('bed-details-modal').remove();" style="background: rgba(250,204,21,0.15); border: 1px solid #facc15; color: #facc15; font-size: 0.75rem; padding: 5px 10px; border-radius: 6px; cursor: pointer;">
                  🟡 Higienização
                </button>
                <button class="btn btn-sm" onclick="window.updateBedStatus('${bed.id}', 'Manutenção'); document.getElementById('bed-details-modal').remove();" style="background: rgba(148,163,184,0.15); border: 1px solid #94a3b8; color: #cbd5e1; font-size: 0.75rem; padding: 5px 10px; border-radius: 6px; cursor: pointer;">
                  ⚙️ Manutenção
                </button>
              </div>
            </div>

          </div>

          <div style="padding: 14px 24px; background: var(--bg-tertiary); border-top: 1px solid var(--border-color); display: flex; justify-content: flex-end;">
            <button class="btn btn-primary" onclick="document.getElementById('bed-details-modal').remove()" style="font-size: 0.85rem; padding: 8px 18px;">Fechar</button>
          </div>

        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHtml);
  } catch (err) {
    console.error(err);
    showToast('Erro ao abrir detalhes do leito.', true);
  }
};

window.renderLeitosTab = renderLeitosTab;
