import { apiFetch, showToast, abbreviateName, switchTab, setupCustomSelect, anonymizeCPF, exportToPDF, formatSyncDate, showCustomAlert, renderTabContent, cachedApiGet, getRolePermissions } from '../main.js';
import { state, dataCache, dataCacheTimestamps } from '../state.js';
import * as localDB from '../localDB.js';
import { startVoiceDictation, stopVoiceDictation, calculateMEWS, checkDrugInteractions, generateWhatsAppClinicalMessage, sendToWhatsApp } from '../modules/clinicalAI.js';
import { openTelemedicineModal } from '../modules/telemedicina.js';

const API_URL = '/api';

async function renderDoctorsTab() {
  const contentArea = document.getElementById('main-content');

  contentArea.innerHTML = `
    <div class="tab-pane active" style="padding: 28px 36px; width: 100%; max-width: 100%; box-sizing: border-box;">
      
      <!-- CABEÇALHO DA ABA -->
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; flex-wrap: wrap; gap: 16px;">
        <div>
          <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 4px;">
            <div style="width: 42px; height: 42px; border-radius: 12px; background: rgba(139,92,246,0.15); border: 1px solid rgba(139,92,246,0.3); display: flex; align-items: center; justify-content: center; color: #a78bfa;">
              <i class="fa-solid fa-user-doctor" style="font-size: 1.2rem;"></i>
            </div>
            <div>
              <h2 style="font-size: 1.5rem; font-weight: 700; color: var(--text-primary); margin: 0; line-height: 1.2;">Profissionais & Equipe</h2>
              <span style="color: var(--text-muted); font-size: 0.85rem;">Gestão de Médicos, Enfermeiros, Fisioterapeutas e outros profissionais</span>
            </div>
          </div>
        </div>

        <div style="display: flex; gap: 10px; align-items: center; flex-wrap: wrap;">
          <button id="btn-open-duty-modal" class="btn" style="background: rgba(59,130,246,0.15); color: #60a5fa; border: 1px solid rgba(59,130,246,0.3); padding: 10px 20px; font-size: 0.88rem; font-weight: 600; border-radius: 10px; cursor: pointer; transition: all 0.2s;" onclick="window.openDutyScheduleModal()">
            <i class="fa-solid fa-calendar-days" style="margin-right: 6px;"></i> Escala de Plantão
          </button>
          <button id="doctors-trash-btn" class="btn" style="background-color: rgba(239, 68, 68, 0.1); color: var(--danger-color); border: 1px solid rgba(239, 68, 68, 0.3); padding: 10px 22px; font-size: 0.88rem; font-weight: 600; border-radius: 10px; cursor: pointer; transition: all 0.2s;">
            <i class="fa-solid fa-trash-can" style="margin-right: 6px;"></i> Lixeira
          </button>
          <button id="btn-open-doctor-modal" class="btn btn-primary" style="display: inline-flex; align-items: center; gap: 8px; padding: 10px 22px; font-size: 0.88rem; font-weight: 600; border-radius: 10px; box-shadow: 0 4px 14px rgba(99,102,241,0.3); cursor: pointer;">
            <i class="fa-solid fa-plus"></i> Novo Profissional
          </button>
        </div>
      </div>

      <!-- ESCALA DO DIA BANNER -->
      <div id="duty-schedule-banner" style="background: var(--bg-secondary); border: 1px solid var(--border-color); border-radius: 14px; padding: 18px 22px; margin-bottom: 24px; backdrop-filter: var(--glass-blur);">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; flex-wrap: wrap; gap: 10px;">
          <div style="display: flex; align-items: center; gap: 10px;">
            <div style="width: 36px; height: 36px; border-radius: 10px; background: rgba(59,130,246,0.15); border: 1px solid rgba(59,130,246,0.3); display: flex; align-items: center; justify-content: center; color: #60a5fa;">
              <i class="fa-solid fa-calendar-check" style="font-size: 1.1rem;"></i>
            </div>
            <div>
              <h3 style="margin: 0; font-size: 1.05rem; font-weight: 700; color: var(--text-primary);">Profissionais de Plantão Hoje</h3>
              <span id="duty-schedule-date" style="font-size: 0.78rem; color: var(--text-muted);"></span>
            </div>
          </div>
          <button class="btn" onclick="window.openDutyScheduleModal()" style="background: var(--bg-tertiary); border: 1px solid var(--border-color); color: var(--text-primary); padding: 6px 14px; font-size: 0.8rem; border-radius: 8px; cursor: pointer;">
            <i class="fa-solid fa-plus-circle" style="color: #60a5fa;"></i> Adicionar Plantonista
          </button>
        </div>
        <div id="duty-schedule-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 12px;">
          <div style="text-align: center; color: var(--text-muted); padding: 18px; font-size: 0.85rem;">Carregando escala de plantão...</div>
        </div>
      </div>

      <!-- CARDS DE KPIS -->
      <div id="doctors-kpis" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; margin-bottom: 24px;"></div>

      <!-- BARRA DE PESQUISA -->
      <div style="display: flex; gap: 12px; flex-wrap: wrap; align-items: center; background: var(--bg-secondary); border: 1px solid var(--border-color); border-radius: 14px; padding: 14px 20px; margin-bottom: 24px; backdrop-filter: var(--glass-blur);">
        <div style="position: relative; flex: 1; min-width: 240px; display: flex; align-items: center; gap: 8px;">
          <div style="position: relative; flex: 1;">
            <i class="fa-solid fa-magnifying-glass" style="position: absolute; left: 14px; top: 50%; transform: translateY(-50%); color: var(--text-muted); font-size: 0.85rem;"></i>
            <input type="text" id="filter-doctor-search" placeholder="Buscar por nome, CRM ou especialidade..." style="width: 100%; background: var(--bg-tertiary); border: 1px solid var(--border-color); border-radius: 8px; padding: 9px 14px 9px 38px; color: var(--text-primary); font-size: 0.85rem; outline: none;">
          </div>
          <button onclick="document.getElementById('filter-doctor-search').value=''; window.currentDocFilter = 'all'; document.getElementById('filter-doctor-search').dispatchEvent(new Event('input'));" class="btn" style="background: var(--bg-tertiary); border: 1px solid var(--border-color); color: var(--text-primary); padding: 9px 14px; font-size: 0.85rem; border-radius: 8px; cursor: pointer; display: flex; align-items: center; justify-content: center;" title="Limpar Filtros">
            <i class="fa-solid fa-filter-circle-xmark"></i>
          </button>
        </div>
      </div>

      <div id="doctors-list-container">
        <div style="text-align: center; padding: 60px 20px; color: var(--text-muted);">
          <i class="fa-solid fa-spinner fa-spin" style="font-size: 1.6rem; color: var(--color-primary); margin-bottom: 12px; display: block;"></i>
          <span style="font-size: 0.9rem;">Carregando profissionais...</span>
        </div>
      </div>
    </div>

    <!-- MODAL CADASTRO / EDIÇÃO DE MÉDICO -->
    <div id="modal-doctor" class="modal-overlay" style="display: none;">
      <div class="modal-content" style="max-width: 650px; width: 100%; padding: 24px;">
        <div class="modal-header" style="margin-bottom: 20px;">
          <h3 id="modal-doctor-title"><i class="fa-solid fa-user-nurse" style="color: var(--color-primary);"></i> Cadastrar Profissional</h3>
          <button class="btn-close" id="btn-close-doctor-modal"><i class="fa-solid fa-xmark"></i></button>
        </div>
        <form id="form-doctor" class="modal-body">
          <input type="hidden" id="doc-id">
          <div class="form-group">
            <label for="doc-name">Nome Completo *</label>
            <input type="text" id="doc-name" class="form-input" placeholder="Ex: Dr. Roberto Almeida" required>
          </div>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
            <div class="form-group">
              <label for="doc-role" style="display: flex; align-items: center; gap: 6px;">
                Função / Cargo *
                <i class="fa-solid fa-circle-question" title="Selecione na lista ou clique no '+' para adicionar uma nova função." style="color: var(--text-muted); cursor: help; font-size: 0.8rem;"></i>
              </label>
              <div style="display: flex; gap: 8px;">
                <input type="text" id="doc-role" class="form-input" list="role-options" placeholder="Ex: Médico(a), Biomédico(a)" autocomplete="off" required style="flex: 1;">
                <button type="button" id="btn-add-role" style="background: var(--bg-tertiary); border: 1px solid var(--border-color); border-radius: 8px; width: 40px; color: var(--text-secondary); cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.2s;" title="Adicionar nova Função/Cargo" onmouseenter="this.style.background='var(--bg-secondary)';this.style.color='var(--color-primary)'" onmouseleave="this.style.background='var(--bg-tertiary)';this.style.color='var(--text-secondary)'">
                  <i class="fa-solid fa-plus"></i>
                </button>
              </div>
              <datalist id="role-options">
                <option value="Médico(a)">
                <option value="Enfermeiro(a)">
                <option value="Técnico(a) Enfermagem">
                <option value="Fisioterapeuta">
                <option value="Nutricionista">
                <option value="Psicólogo(a)">
                <option value="Farmacêutico(a)">
                <option value="Biomédico(a)">
                <option value="Fonoaudiólogo(a)">
                <option value="Assistente Social">
                <option value="Administrativo">
                <option value="Recepcionista">
                <option value="Auxiliar de Limpeza">
                <option value="Segurança">
              </datalist>
            </div>
            <div class="form-group">
              <label for="doc-specialty" style="display: flex; align-items: center; gap: 6px;">
                Especialidade / Setor *
                <i class="fa-solid fa-circle-question" title="Selecione na lista ou clique no '+' para adicionar um novo setor ou especialidade." style="color: var(--text-muted); cursor: help; font-size: 0.8rem;"></i>
              </label>
              <div style="display: flex; gap: 8px;">
                <input type="text" id="doc-specialty" class="form-input" list="sector-options" placeholder="Ex: Cardiologia, UTI, Recepção" autocomplete="off" required style="flex: 1;">
                <button type="button" id="btn-add-specialty" style="background: var(--bg-tertiary); border: 1px solid var(--border-color); border-radius: 8px; width: 40px; color: var(--text-secondary); cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.2s;" title="Adicionar nova Especialidade/Setor" onmouseenter="this.style.background='var(--bg-secondary)';this.style.color='var(--color-primary)'" onmouseleave="this.style.background='var(--bg-tertiary)';this.style.color='var(--text-secondary)'">
                  <i class="fa-solid fa-plus"></i>
                </button>
              </div>
              <datalist id="sector-options">
                <option value="Administrativo">
                <option value="Cardiologia">
                <option value="Centro Cirúrgico">
                <option value="Clínica Médica">
                <option value="Farmácia">
                <option value="Financeiro">
                <option value="Fisioterapia">
                <option value="Limpeza / Higienização">
                <option value="Manutenção">
                <option value="Neurologia">
                <option value="Nutrição">
                <option value="Ortopedia">
                <option value="Pediatria">
                <option value="Pronto Socorro (PS)">
                <option value="Psicologia">
                <option value="Recepção">
                <option value="Recursos Humanos (RH)">
                <option value="Segurança / Portaria">
                <option value="TI / Tecnologia">
                <option value="UTI">
              </datalist>
            </div>
          </div>
          <div style="display: grid; grid-template-columns: 1fr 2fr; gap: 16px;" id="doc-registry-container">
            <div class="form-group">
              <label for="doc-crm" id="label-doc-crm">CRM *</label>
              <div style="display: flex; gap: 6px; align-items: center;">
                <input type="text" id="doc-crm" class="form-input" placeholder="123456-SP" required style="flex: 1;">
                <button type="button" id="btn-verify-crm" style="background: rgba(99,102,241,0.15); border: 1px solid rgba(99,102,241,0.4); color: #818cf8; padding: 0 12px; border-radius: 8px; cursor: pointer; height: 40px; font-size: 0.75rem; font-weight: 700; white-space: nowrap; transition: all 0.2s; display: flex; align-items: center; gap: 5px;" title="Verificar no conselho">
                  <i class="fa-solid fa-shield-halved"></i> Verificar
                </button>
              </div>
              <div id="crm-verify-status" style="margin-top: 6px; font-size: 0.75rem; display: none;"></div>
            </div>
            <div class="form-group" style="visibility: hidden;">
               <!-- Placeholder to maintain grid -->
            </div>
          </div>
          <div style="display: grid; grid-template-columns: 1fr 2fr; gap: 16px;">
            <div class="form-group">
              <label for="doc-phone">Telefone / Celular</label>
              <input type="text" id="doc-phone" class="form-input" placeholder="(11) 98765-4321">
            </div>
            <div class="form-group">
              <label for="doc-email">E-mail Corporativo</label>
              <input type="email" id="doc-email" class="form-input" placeholder="medico@healthnexus.com">
            </div>
          </div>
          <div class="form-group">
            <label for="doc-status">Status</label>
            <select id="doc-status" class="form-input">
              <option value="Ativo">Ativo</option>
              <option value="Inativo">Inativo</option>
            </select>
          </div>
          <div class="modal-footer" style="padding-top: 16px;">
            <button type="button" class="btn btn-secondary" id="btn-cancel-doctor-modal">Cancelar</button>
            <button type="submit" class="btn btn-primary" id="btn-submit-doctor">Salvar Profissional</button>
          </div>
        </form>
      </div>
    </div>
  `;

  let allDoctorsCache = [];
  // Track current active filter: 'all' | 'Ativo' | specialty string
  if (!window.currentDocFilter) window.currentDocFilter = 'all';

  // ---- CFM CRM Verification Logic ----
  const verifyCrmBtn = document.getElementById('btn-verify-crm');
  const crmInput = document.getElementById('doc-crm');
  const crmStatus = document.getElementById('crm-verify-status');

  const doVerifyCRM = async () => {
    const crmVal = crmInput?.value?.trim();
    if (!crmVal) { showToast('Digite o CRM antes de verificar.', 'warning'); return; }

    verifyCrmBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';
    verifyCrmBtn.disabled = true;
    crmStatus.style.display = 'flex';
    crmStatus.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin" style="margin-right:5px;"></i> Consultando CFM...';
    crmStatus.style.color = 'var(--text-muted)';

    try {
      const resp = await fetch(`/api/cfm/verificar?crm=${encodeURIComponent(crmVal)}`);
      const data = await resp.json();

      if (!data.success) {
        crmStatus.innerHTML = `<i class="fa-solid fa-xmark-circle" style="color:#ef4444;margin-right:5px;"></i> <span style="color:#ef4444;">${data.error || 'Erro ao verificar CRM.'}</span>`;
      } else if (data.status === 'ATIVO' || data.fonte === 'CFM Portal') {
        crmStatus.innerHTML = `
          <i class="fa-solid fa-circle-check" style="color:#10b981;margin-right:5px;"></i>
          <span style="color:#10b981;font-weight:700;">CRM Verificado no CFM</span>
          ${data.nome ? ` · <span style="color:var(--text-secondary);">${data.nome}</span>` : ''}
          ${data.especialidade ? ` · <span style="color:#818cf8;">${data.especialidade}</span>` : ''}
          <a href="${data.portalCfm || 'https://portal.cfm.org.br/busca-medicos/?q=' + encodeURIComponent(crmVal)}" target="_blank" style="color:#6366f1;margin-left:8px;font-size:0.72rem;"><i class="fa-solid fa-arrow-up-right-from-square"></i> Ver no CFM</a>`;
        verifyCrmBtn.style.background = 'rgba(16,185,129,0.15)';
        verifyCrmBtn.style.borderColor = 'rgba(16,185,129,0.4)';
        verifyCrmBtn.style.color = '#10b981';
        verifyCrmBtn.innerHTML = '<i class="fa-solid fa-circle-check"></i>';
      } else if (data.status === 'FORMATO_VALIDO') {
        crmStatus.innerHTML = `
          <i class="fa-solid fa-triangle-exclamation" style="color:#f59e0b;margin-right:5px;"></i>
          <span style="color:#f59e0b;font-weight:600;">${data.mensagem}</span>
          <a href="${data.portalCfm}" target="_blank" style="color:#6366f1;margin-left:8px;font-size:0.72rem;"><i class="fa-solid fa-arrow-up-right-from-square"></i> Verificar no CFM</a>`;
        verifyCrmBtn.style.background = 'rgba(245,158,11,0.12)';
        verifyCrmBtn.style.borderColor = 'rgba(245,158,11,0.4)';
        verifyCrmBtn.style.color = '#f59e0b';
        verifyCrmBtn.innerHTML = '<i class="fa-solid fa-triangle-exclamation"></i>';
      } else {
        crmStatus.innerHTML = `<i class="fa-solid fa-xmark-circle" style="color:#ef4444;margin-right:5px;"></i> <span style="color:#ef4444;">Formato de CRM inválido. Use: 123456-SP ou 123456/SP</span>`;
        verifyCrmBtn.style.borderColor = 'rgba(239,68,68,0.5)';
        verifyCrmBtn.style.color = '#ef4444';
        verifyCrmBtn.innerHTML = '<i class="fa-solid fa-xmark-circle"></i>';
      }
    } catch (err) {
      crmStatus.innerHTML = '<i class="fa-solid fa-xmark-circle" style="color:#ef4444;margin-right:5px;"></i> <span style="color:#ef4444;">Erro de conexão.</span>';
    } finally {
      if (verifyCrmBtn.innerHTML.includes('spinner') || verifyCrmBtn.innerHTML.includes('Verificar')) {
        verifyCrmBtn.innerHTML = '<i class="fa-solid fa-shield-halved"></i> Verificar';
      }
      verifyCrmBtn.disabled = false;
    }
  };

  verifyCrmBtn?.addEventListener('click', doVerifyCRM);
  crmInput?.addEventListener('input', () => {
    // Reset badge when user types
    crmStatus.style.display = 'none';
    verifyCrmBtn.style.background = 'rgba(99,102,241,0.15)';
    verifyCrmBtn.style.borderColor = 'rgba(99,102,241,0.4)';
    verifyCrmBtn.style.color = '#818cf8';
    verifyCrmBtn.innerHTML = '<i class="fa-solid fa-shield-halved"></i> Verificar';
  });
  // ---- End CFM Verification ----

  const updateCardStyles = () => {
    const curFilter = window.currentDocFilter;
    const configs = [
      { id: 'kpi-doc-total',  color: '#a78bfa', active: curFilter === 'all' },
      { id: 'kpi-doc-active', color: '#34d399', active: curFilter === 'Ativo' },
      { id: 'kpi-doc-specs',  color: '#67e8f9', active: typeof curFilter === 'string' && curFilter !== 'all' && curFilter !== 'Ativo' },
    ];
    configs.forEach(({ id, color, active }) => {
      const el = document.getElementById(id);
      if (!el) return;
      el.style.border      = active ? `1px solid ${color}` : '1px solid var(--border-color)';
      el.style.transform   = active ? 'translateY(-2px)' : 'none';
      el.style.boxShadow   = active ? `0 6px 18px ${color}40` : 'none';
      el.style.background  = active ? `color-mix(in srgb, ${color} 8%, var(--bg-secondary))` : 'var(--bg-secondary)';
    });
  };

  const renderTable = (doctors) => {
    const container = document.getElementById('doctors-list-container');
    const kpisEl    = document.getElementById('doctors-kpis');
    const searchQuery = (document.getElementById('filter-doctor-search')?.value || '').toLowerCase().trim();

    let filtered = doctors || [];

    if (window.currentDocFilter === 'Ativo') {
      filtered = filtered.filter(d => (d.status || 'Ativo') === 'Ativo');
    } else if (window.currentDocFilter !== 'all') {
      // Filter by specialty
      filtered = filtered.filter(d => (d.specialty || '') === window.currentDocFilter);
    }

    if (searchQuery) {
      filtered = filtered.filter(d =>
        (d.name     || '').toLowerCase().includes(searchQuery) ||
        (d.crm      || '').toLowerCase().includes(searchQuery) ||
        (d.specialty|| '').toLowerCase().includes(searchQuery)
      );
    }

    const total        = doctors.length;
    const ativos       = doctors.filter(d => (d.status || 'Ativo') === 'Ativo').length;
    const especialidades = new Set(doctors.map(d => d.specialty)).size;

    if (kpisEl) {
      kpisEl.innerHTML = `
        <div class="interactive-card" id="kpi-doc-total"
          title="Clique para exibir todos os médicos"
          style="background: var(--bg-secondary); border: 1px solid var(--border-color); border-radius: 12px; padding: 16px 20px; display: flex; align-items: center; gap: 16px; cursor: pointer; transition: all 0.22s ease;">
          <div style="width: 44px; height: 44px; border-radius: 12px; background: rgba(139,92,246,0.12); border: 1px solid rgba(139,92,246,0.25); display: flex; align-items: center; justify-content: center; color: #a78bfa; flex-shrink: 0;">
            <i class="fa-solid fa-user-doctor" style="font-size: 1.2rem;"></i>
          </div>
          <div>
            <div style="font-size: 0.75rem; color: var(--text-muted); font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em;">Total de Médicos</div>
            <div style="font-size: 1.4rem; font-weight: 800; color: var(--text-primary);">${total}</div>
            <div style="font-size: 0.72rem; color: var(--text-muted); margin-top: 1px;">Ver todos</div>
          </div>
        </div>

        <div class="interactive-card" id="kpi-doc-active"
          title="Clique para filtrar médicos ativos"
          style="background: var(--bg-secondary); border: 1px solid var(--border-color); border-radius: 12px; padding: 16px 20px; display: flex; align-items: center; gap: 16px; cursor: pointer; transition: all 0.22s ease;">
          <div style="width: 44px; height: 44px; border-radius: 12px; background: rgba(16,185,129,0.12); border: 1px solid rgba(16,185,129,0.25); display: flex; align-items: center; justify-content: center; color: #34d399; flex-shrink: 0;">
            <i class="fa-solid fa-user-check" style="font-size: 1.2rem;"></i>
          </div>
          <div>
            <div style="font-size: 0.75rem; color: var(--text-muted); font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em;">Médicos Ativos</div>
            <div style="font-size: 1.4rem; font-weight: 800; color: #34d399;">${ativos}</div>
            <div style="font-size: 0.72rem; color: var(--text-muted); margin-top: 1px;">Filtrar ativos</div>
          </div>
        </div>

        <div class="interactive-card" id="kpi-doc-specs"
          title="Clique para filtrar por especialidade"
          style="background: var(--bg-secondary); border: 1px solid var(--border-color); border-radius: 12px; padding: 16px 20px; display: flex; align-items: center; gap: 16px; cursor: pointer; transition: all 0.22s ease;">
          <div style="width: 44px; height: 44px; border-radius: 12px; background: rgba(34,211,238,0.12); border: 1px solid rgba(34,211,238,0.25); display: flex; align-items: center; justify-content: center; color: #67e8f9; flex-shrink: 0;">
            <i class="fa-solid fa-stethoscope" style="font-size: 1.2rem;"></i>
          </div>
          <div>
            <div style="font-size: 0.75rem; color: var(--text-muted); font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em;">Especialidades</div>
            <div style="font-size: 1.4rem; font-weight: 800; color: #67e8f9;">${especialidades}</div>
            <div style="font-size: 0.72rem; color: var(--text-muted); margin-top: 1px;">Filtrar por área</div>
          </div>
        </div>
      `;

      updateCardStyles();

      // --- Card Click Handlers (attached once per render) ---
      document.getElementById('kpi-doc-total')?.addEventListener('click', () => {
        window.currentDocFilter = 'all';
        const inp = document.getElementById('filter-doctor-search');
        if (inp) inp.value = '';
        renderTable(allDoctorsCache);
      });

      document.getElementById('kpi-doc-active')?.addEventListener('click', () => {
        window.currentDocFilter = window.currentDocFilter === 'Ativo' ? 'all' : 'Ativo';
        const inp = document.getElementById('filter-doctor-search');
        if (inp) inp.value = '';
        renderTable(allDoctorsCache);
      });

      document.getElementById('kpi-doc-specs')?.addEventListener('click', () => {
        openSpecialtyFilterPanel(allDoctorsCache);
      });
    }

    if (filtered.length === 0) {
      container.innerHTML = `
        <div style="text-align: center; padding: 60px 20px; background: var(--bg-secondary); border: 1px solid var(--border-color); border-radius: 14px;">
          <i class="fa-solid fa-user-slash" style="font-size: 2.8rem; color: var(--text-muted); opacity: 0.4; margin-bottom: 14px; display: block;"></i>
          <p style="font-size: 1rem; font-weight: 600; color: var(--text-secondary); margin-bottom: 4px;">Nenhum médico encontrado</p>
          <p style="font-size: 0.83rem; color: var(--text-muted);">Não há cadastros com os filtros utilizados.</p>
        </div>
      `;
      return;
    }

    let rowsHtml = filtered.map(d => {
      const isAtivo = (d.status || 'Ativo') === 'Ativo';
      const statusBadge = isAtivo 
        ? '<span style="display:inline-flex;align-items:center;gap:4px;font-size:0.75rem;font-weight:600;padding:3px 10px;border-radius:20px;background:rgba(16,185,129,0.12);color:#34d399;border:1px solid rgba(16,185,129,0.25);"><i class="fa-solid fa-circle" style="font-size:0.45rem;"></i> Ativo</span>'
        : '<span style="display:inline-flex;align-items:center;gap:4px;font-size:0.75rem;font-weight:600;padding:3px 10px;border-radius:20px;background:rgba(239,68,68,0.12);color:#f87171;border:1px solid rgba(239,68,68,0.25);"><i class="fa-solid fa-circle" style="font-size:0.45rem;"></i> Inativo</span>';
      
      const initials = d.name.replace(/^(Dr.|Dra.)s*/i, '').split(' ').map(n => n[0]).join('').substring(0,2).toUpperCase() || 'MD';

      return `
        <tr style="border-bottom: 1px solid var(--border-color); transition: background 0.15s;" onmouseenter="this.style.background='var(--bg-tertiary)'" onmouseleave="this.style.background='transparent'">
          <td style="padding: 16px 20px;">
            <div style="display: flex; align-items: center; gap: 12px;">
              <div style="width: 36px; height: 36px; border-radius: 50%; background: rgba(99,102,241,0.15); border: 1px solid rgba(99,102,241,0.3); display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 0.78rem; color: #a78bfa;">
                ${initials}
              </div>
              <div>
                <strong style="font-size: 0.95rem; color: var(--text-primary); display: block;">${d.name}</strong>
                <span style="font-size: 0.78rem; color: var(--text-muted);">
                  ${!d.role || d.role === 'Médico(a)' ? 'CRM' : (d.role.includes('Enferm') ? 'COREN' : (d.role === 'Fisioterapeuta' ? 'CREFITO' : (d.role === 'Nutricionista' ? 'CRN' : (d.role.includes('Psic') ? 'CRP' : 'Registro'))))}: ${d.crm}
                  ${(!d.role || d.role === 'Médico(a)') ? `<a href="https://portal.cfm.org.br/busca-medicos/?q=${encodeURIComponent((d.crm || '').replace(/[^0-9]/g,''))}&uf=${encodeURIComponent((d.crm || '').replace(/[^a-zA-Z]/g,'').toUpperCase() || 'SP')}" target="_blank" title="Verificar CRM no portal CFM" style="margin-left: 5px; color: #6366f1; text-decoration: none; font-size: 0.72rem;" onclick="event.stopPropagation()">
                    <i class="fa-solid fa-shield-halved"></i>
                  </a>` : ''}
                </span>
              </div>
            </div>
          </td>
          <td style="padding: 16px 20px;">
            <span style="display: inline-flex; align-items: center; gap: 6px; padding: 4px 12px; border-radius: 20px; background: rgba(255,255,255,0.05); border: 1px solid var(--border-color); font-size: 0.82rem; font-weight: 600; color: var(--text-secondary);">
              <i class="fa-solid fa-stethoscope" style="font-size: 0.75rem; color: var(--color-primary);"></i> ${d.specialty}
            </span>
          </td>
          <td style="padding: 16px 20px;">
            <div style="font-size: 0.83rem; color: var(--text-secondary);">
              ${d.phone ? '<div><i class="fa-solid fa-phone" style="font-size:0.75rem;color:var(--text-muted);margin-right:6px;"></i>' + d.phone + '</div>' : ''}
              ${d.email ? '<div><i class="fa-regular fa-envelope" style="font-size:0.75rem;color:var(--text-muted);margin-right:6px;"></i>' + d.email + '</div>' : ''}
            </div>
          </td>
          <td style="padding: 16px 20px;">
            ${statusBadge}
          </td>
          <td style="padding: 16px 20px; text-align: right;">
            <div style="display: flex; gap: 8px; justify-content: flex-end;">
              <button class="btn-doctor-activity" onclick="openDoctorActivityModal('${d.name}', '${d.specialty}', '${d.crm}')" title="Ver Atendimentos, Procedimentos e Solicitações do Médico" style="display: inline-flex; align-items: center; gap: 6px; padding: 6px 12px; border-radius: 8px; border: 1px solid rgba(99,102,241,0.3); background: rgba(99,102,241,0.12); color: #818cf8; font-size: 0.78rem; font-weight: 600; cursor: pointer; transition: all 0.15s;" onmouseenter="this.style.background='rgba(99,102,241,0.22)'" onmouseleave="this.style.background='rgba(99,102,241,0.12)'">
                <i class="fa-solid fa-clipboard-user"></i> Atividades
              </button>
              <button class="btn-edit-doctor" data-id="${d.id}" title="Editar" style="width: 32px; height: 32px; border-radius: 8px; border: 1px solid var(--border-color); background: var(--bg-tertiary); color: var(--text-secondary); cursor: pointer; display: flex; align-items: center; justify-content: center;">
                <i class="fa-solid fa-pen" style="font-size: 0.8rem;"></i>
              </button>
              <button class="btn-toggle-doctor" data-id="${d.id}" data-status="${d.status}" title="${isAtivo ? 'Inativar' : 'Ativar'}" style="width: 32px; height: 32px; border-radius: 8px; border: 1px solid var(--border-color); background: var(--bg-tertiary); color: ${isAtivo ? '#f87171' : '#34d399'}; cursor: pointer; display: flex; align-items: center; justify-content: center;">
                <i class="fa-solid ${isAtivo ? 'fa-user-xmark' : 'fa-user-check'}" style="font-size: 0.8rem;"></i>
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join('');

    container.innerHTML = `
      <div style="background: var(--bg-secondary); border: 1px solid var(--border-color); border-radius: 14px; overflow: hidden;">
        <table style="width: 100%; border-collapse: collapse; text-align: left;">
          <thead>
            <tr style="border-bottom: 1px solid var(--border-color); background: var(--bg-tertiary);">
              <th style="padding: 14px 20px; font-size: 0.78rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase;">Profissional / Registro</th>
              <th style="padding: 14px 20px; font-size: 0.78rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase;">Especialidade</th>
              <th style="padding: 14px 20px; font-size: 0.78rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase;">Contato</th>
              <th style="padding: 14px 20px; font-size: 0.78rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase;">Status</th>
              <th style="padding: 14px 20px; font-size: 0.78rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase; text-align: right;">Ações</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>
      </div>
    `;

    // Eventos de Editar e Inativar
    document.querySelectorAll('.btn-edit-doctor').forEach(btn => {
      btn.addEventListener('click', () => {
        const doc = allDoctorsCache.find(d => d.id === btn.dataset.id);
        if (doc) {
          document.getElementById('doc-id').value = doc.id;
          document.getElementById('doc-name').value = doc.name;
          if (document.getElementById('doc-role')) {
            document.getElementById('doc-role').value = doc.role || 'Médico(a)';
            document.getElementById('doc-role').dispatchEvent(new Event('change'));
          }
          document.getElementById('doc-crm').value = doc.crm;
          document.getElementById('doc-specialty').value = doc.specialty;
          document.getElementById('doc-phone').value = doc.phone || '';
          document.getElementById('doc-email').value = doc.email || '';
          document.getElementById('doc-status').value = doc.status || 'Ativo';
          document.getElementById('modal-doctor-title').innerHTML = '<i class="fa-solid fa-user-pen" style="color: var(--color-primary);"></i> Editar Médico';
          document.getElementById('modal-doctor').style.display = 'flex';
        }
      });
    });

    document.querySelectorAll('.btn-toggle-doctor').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.dataset.id;
        const current = btn.dataset.status;
        const nextStatus = current === 'Ativo' ? 'Inativo' : 'Ativo';
        if (confirm(`Deseja realmente alterar o status deste médico para ${nextStatus}?`)) {
          try {
            const doc = allDoctorsCache.find(d => d.id === id);
            if (doc) {
              const res = await apiFetch(`/api/doctors/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...doc, status: nextStatus })
              });
              if (res.ok) {
                showToast(`Médico marcado como ${nextStatus}!`);
                dataCache.delete('doctors');
                loadDoctors();
              }
            }
          } catch (e) { alert('Erro ao alterar status.'); }
        }
      });
    });
  };

  const loadDoctors = async () => {
    try {
      window.loadDutyScheduleBanner();
      const doctors = await cachedApiGet('/api/doctors', 'doctors');
      allDoctorsCache = Array.isArray(doctors) ? doctors : [];
      renderTable(allDoctorsCache);
    } catch (e) {
      console.error('[Doctors] Erro:', e);
      document.getElementById('doctors-list-container').innerHTML = `<div style="text-align:center;padding:40px;color:var(--color-danger);"><i class="fa-solid fa-triangle-exclamation"></i> Erro ao carregar médicos: ${e.message}<br><small>${e.stack}</small></div>`;
    }
  };

  // Event Listeners
  document.getElementById('filter-doctor-search').addEventListener('input', () => renderTable(allDoctorsCache));

  // Specialty Filter Panel — opens a floating card with specialty chips
  function openSpecialtyFilterPanel(doctors) {
    const existing = document.getElementById('specialty-filter-panel');
    if (existing) { existing.remove(); return; }

    const specsMap = {};
    doctors.forEach(d => { specsMap[d.specialty || 'Sem especialidade'] = (specsMap[d.specialty || 'Sem especialidade'] || 0) + 1; });
    const specEntries = Object.entries(specsMap).sort((a, b) => b[1] - a[1]);

    const kpiCard = document.getElementById('kpi-doc-specs');
    const rect    = kpiCard ? kpiCard.getBoundingClientRect() : { left: 0, bottom: 0 };

    const panel = document.createElement('div');
    panel.id = 'specialty-filter-panel';
    panel.style.cssText = `
      position: fixed;
      top: ${rect.bottom + 8 + window.scrollY}px;
      left: ${Math.max(8, rect.left)}px;
      z-index: 99999;
      background: var(--bg-secondary);
      border: 1px solid var(--border-color);
      border-radius: 16px;
      padding: 16px 20px;
      min-width: 280px; max-width: 380px;
      box-shadow: 0 16px 48px rgba(0,0,0,0.4);
      animation: fadeInDown 0.18s ease;
    `;

    const activeSpec = (window.currentDocFilter !== 'all' && window.currentDocFilter !== 'Ativo') ? window.currentDocFilter : null;

    panel.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
        <div style="font-size: 0.82rem; font-weight: 700; color: var(--text-primary); display: flex; align-items: center; gap: 8px;">
          <i class="fa-solid fa-stethoscope" style="color: #67e8f9;"></i> Filtrar por Especialidade
        </div>
        <button id="btn-close-spec-panel" style="background:none;border:none;color:var(--text-muted);cursor:pointer;font-size:1rem;"><i class="fa-solid fa-xmark"></i></button>
      </div>
      <div style="display: flex; flex-wrap: wrap; gap: 8px; max-height: 260px; overflow-y: auto;">
        <button class="spec-chip ${!activeSpec ? 'spec-chip-active' : ''}" data-spec="all"
          style="padding: 5px 14px; border-radius: 20px; font-size: 0.78rem; font-weight: 600; cursor: pointer;
          border: 1px solid ${!activeSpec ? '#67e8f9' : 'var(--border-color)'};
          background: ${!activeSpec ? 'rgba(34,211,238,0.15)' : 'var(--bg-tertiary)'};
          color: ${!activeSpec ? '#67e8f9' : 'var(--text-secondary)'}; transition: all 0.15s;">
          Todas (${doctors.length})
        </button>
        ${specEntries.map(([spec, count]) => `
          <button class="spec-chip ${activeSpec === spec ? 'spec-chip-active' : ''}" data-spec="${spec}"
            style="padding: 5px 14px; border-radius: 20px; font-size: 0.78rem; font-weight: 600; cursor: pointer;
            border: 1px solid ${activeSpec === spec ? '#67e8f9' : 'var(--border-color)'};
            background: ${activeSpec === spec ? 'rgba(34,211,238,0.15)' : 'var(--bg-tertiary)'};
            color: ${activeSpec === spec ? '#67e8f9' : 'var(--text-secondary)'}; transition: all 0.15s;">
            ${spec} <span style="opacity:0.7;">(${count})</span>
          </button>
        `).join('')}
      </div>
    `;

    document.body.appendChild(panel);

    panel.querySelectorAll('.spec-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        const spec = chip.dataset.spec;
        window.currentDocFilter = spec === 'all' ? 'all' : spec;
        const inp = document.getElementById('filter-doctor-search');
        if (inp) inp.value = '';
        panel.remove();
        renderTable(allDoctorsCache);
      });
    });

    document.getElementById('btn-close-spec-panel').addEventListener('click', () => panel.remove());

    // Close on outside click
    setTimeout(() => {
      const closeOnOutside = (e) => {
        if (!panel.contains(e.target) && e.target.id !== 'kpi-doc-specs') {
          panel.remove();
          document.removeEventListener('click', closeOnOutside);
        }
      };
      document.addEventListener('click', closeOnOutside);
    }, 100);
  }

  const docRoleInput = document.getElementById('doc-role');
  const labelDocCrm = document.getElementById('label-doc-crm');
  const btnVerifyCrm = document.getElementById('btn-verify-crm');
  const docCrmInput = document.getElementById('doc-crm');
  
  if (docRoleInput) {
    const handleRoleChange = (e) => {
      const val = e.target.value;
      let label = 'CRM';
      let placeholder = '123456-SP';
      let showVerifyBtn = false;
      
      if (val.includes('Enferm')) { label = 'COREN'; placeholder = 'Ex: 123456-SP'; }
      else if (val === 'Fisioterapeuta') { label = 'CREFITO'; placeholder = 'Ex: 123456-SP'; }
      else if (val === 'Nutricionista') { label = 'CRN'; placeholder = 'Ex: 12345-SP'; }
      else if (val.includes('Psic')) { label = 'CRP'; placeholder = 'Ex: 06/12345'; }
      else if (val === 'Médico(a)') { label = 'CRM'; showVerifyBtn = true; }
      else { label = 'Registro/Matrícula'; placeholder = 'Ex: 123456'; }
      
      if (labelDocCrm) labelDocCrm.innerHTML = label + ' *';
      if (docCrmInput) docCrmInput.placeholder = placeholder;
      if (btnVerifyCrm) btnVerifyCrm.style.display = showVerifyBtn ? 'flex' : 'none';
    };

    docRoleInput.addEventListener('change', handleRoleChange);
    docRoleInput.addEventListener('input', handleRoleChange);
  }

  const handleAddNewOption = (inputId, datalistId, label) => {
    const modalId = 'custom-prompt-modal';
    let modal = document.getElementById(modalId);
    if (!modal) {
      modal = document.createElement('div');
      modal.id = modalId;
      modal.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.6);backdrop-filter:blur(4px);z-index:9999;display:flex;align-items:center;justify-content:center;';
      modal.innerHTML = `
        <div style="background:var(--bg-secondary);border:1px solid var(--border-color);border-radius:12px;padding:24px;width:100%;max-width:400px;box-shadow:0 10px 25px rgba(0,0,0,0.5);">
          <h3 id="cpm-title" style="margin-top:0;margin-bottom:16px;color:var(--text-primary);font-size:1.1rem;display:flex;align-items:center;gap:8px;"><i class="fa-solid fa-plus-circle" style="color:var(--color-primary);"></i> <span id="cpm-label">Adicionar</span></h3>
          <input type="text" id="cpm-input" class="form-input" style="width:100%;margin-bottom:20px;box-sizing:border-box;" autocomplete="off">
          <div style="display:flex;justify-content:flex-end;gap:12px;">
            <button id="cpm-cancel" class="btn-cancel" style="padding:8px 16px;">Cancelar</button>
            <button id="cpm-confirm" class="btn-primary" style="padding:8px 16px;">Adicionar</button>
          </div>
        </div>
      `;
      document.body.appendChild(modal);
    }
    
    document.getElementById('cpm-label').textContent = `Nova ${label}`;
    const inputField = document.getElementById('cpm-input');
    inputField.placeholder = `Digite a nova ${label}...`;
    inputField.value = '';
    
    modal.style.display = 'flex';
    inputField.focus();

    const cleanup = () => {
      modal.style.display = 'none';
      document.getElementById('cpm-confirm').onclick = null;
      document.getElementById('cpm-cancel').onclick = null;
      inputField.onkeydown = null;
    };

    const confirmAction = () => {
      const newVal = inputField.value;
      if (newVal && newVal.trim() !== '') {
        const datalist = document.getElementById(datalistId);
        const input = document.getElementById(inputId);
        if (datalist && input) {
          const option = document.createElement('option');
          option.value = newVal.trim();
          datalist.appendChild(option);
          input.value = newVal.trim();
          input.dispatchEvent(new Event('change'));
        }
      }
      cleanup();
    };

    document.getElementById('cpm-confirm').onclick = confirmAction;
    document.getElementById('cpm-cancel').onclick = cleanup;
    inputField.onkeydown = (e) => {
      if (e.key === 'Enter') { e.preventDefault(); confirmAction(); }
      if (e.key === 'Escape') cleanup();
    };
  };

  const btnAddRole = document.getElementById('btn-add-role');
  if (btnAddRole) btnAddRole.addEventListener('click', () => handleAddNewOption('doc-role', 'role-options', 'Função / Cargo'));

  const btnAddSpecialty = document.getElementById('btn-add-specialty');
  if (btnAddSpecialty) btnAddSpecialty.addEventListener('click', () => handleAddNewOption('doc-specialty', 'sector-options', 'Especialidade / Setor'));

  const modal = document.getElementById('modal-doctor');
  document.getElementById('btn-open-doctor-modal')?.addEventListener('click', () => {
    const perms = (typeof getRolePermissions === 'function') ? getRolePermissions(state.user) : { canEditProfessionals: true, label: 'Usuário' };
    if (!perms.canEditProfessionals && !perms.canManageUsers) {
      showCustomAlert({
        title: 'Acesso Restrito',
        message: `Seu perfil (<strong>${perms.label}</strong>) não possui permissão para cadastrar ou editar profissionais de saúde. Apenas Administradores e Master possuem esta autorização.`,
        type: 'warning'
      });
      return;
    }
    document.getElementById('doc-id').value = '';
    document.getElementById('form-doctor').reset();
    if (docRoleInput) docRoleInput.dispatchEvent(new Event('change'));
    document.getElementById('modal-doctor-title').innerHTML = '<i class="fa-solid fa-user-nurse" style="color: var(--color-primary);"></i> Cadastrar Profissional';
    modal.style.display = 'flex';
  });

  document.getElementById('btn-close-doctor-modal')?.addEventListener('click', () => { modal.style.display = 'none'; });
  document.getElementById('btn-cancel-doctor-modal')?.addEventListener('click', () => { modal.style.display = 'none'; });

  document.getElementById('doctors-trash-btn')?.addEventListener('click', () => {
    const perms = (typeof getRolePermissions === 'function') ? getRolePermissions(state.user) : { canDeleteRecords: true, label: 'Usuário' };
    if (!perms.canDeleteRecords) {
      showCustomAlert({
        title: 'Acesso Restrito',
        message: `Seu perfil (<strong>${perms.label}</strong>) não possui autorização para acessar ou restaurar registros da lixeira.`,
        type: 'warning'
      });
      return;
    }
    showTrashModal('doctors');
  });

  document.getElementById('form-doctor')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const perms = (typeof getRolePermissions === 'function') ? getRolePermissions(state.user) : { canEditProfessionals: true, label: 'Usuário' };
    if (!perms.canEditProfessionals && !perms.canManageUsers) {
      showCustomAlert({
        title: 'Acesso Restrito',
        message: `Seu perfil (<strong>${perms.label}</strong>) não possui autorização para salvar dados cadastrais de profissionais.`,
        type: 'warning'
      });
      return;
    }
    const id = document.getElementById('doc-id').value;
    const name = document.getElementById('doc-name').value;
    const role = document.getElementById('doc-role') ? document.getElementById('doc-role').value : 'Médico(a)';
    const crm = document.getElementById('doc-crm').value;
    const specialty = document.getElementById('doc-specialty').value;
    const phone = document.getElementById('doc-phone').value;
    const email = document.getElementById('doc-email').value;
    const status = document.getElementById('doc-status').value;

    try {
      const url = id ? `/api/doctors/${id}` : '/api/doctors';
      const method = id ? 'PUT' : 'POST';
      const res = await apiFetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, role, crm, specialty, phone, email, status })
      });
      if (res.ok) {
        showToast(id ? 'Cadastro de médico atualizado!' : 'Médico cadastrado com sucesso!');
        modal.style.display = 'none';
        dataCache.delete('doctors');
        loadDoctors();
      } else {
        const d = await res.json();
        alert(d.message || 'Erro ao salvar médico.');
      }
    } catch (err) { alert('Erro de conexão ao salvar médico.'); }
  });

  loadDoctors();
}

// =========================================================
// MODAL DE ATIVIDADES DO MÉDICO (Corpo Clínico)
// =========================================================
window.openDoctorActivityModal = async function(doctorName, specialty, crm) {
  // Remove modal anterior se existir
  const old = document.getElementById('modal-doctor-activity');
  if (old) old.remove();

  const encodedName = encodeURIComponent(doctorName);

  // Cria estrutura do modal com spinner
  const modal = document.createElement('div');
  modal.id = 'modal-doctor-activity';
  modal.style.cssText = `
    position: fixed; inset: 0; z-index: 9999;
    display: flex; align-items: center; justify-content: center;
    background: rgba(0,0,0,0.65); backdrop-filter: blur(6px);
    padding: 16px;
  `;
  modal.innerHTML = `
    <div style="
      background: var(--bg-secondary);
      border: 1px solid var(--border-color);
      border-radius: 20px;
      width: 100%; max-width: 860px; max-height: 90vh;
      display: flex; flex-direction: column;
      box-shadow: 0 24px 60px rgba(0,0,0,0.5);
      overflow: hidden;
    ">
      <!-- Header -->
      <div style="
        padding: 22px 28px;
        border-bottom: 1px solid var(--border-color);
        display: flex; align-items: center; gap: 16px;
        background: linear-gradient(135deg, rgba(99,102,241,0.12), rgba(139,92,246,0.08));
      ">
        <div style="
          width: 52px; height: 52px; border-radius: 14px;
          background: linear-gradient(135deg, #6366f1, #8b5cf6);
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
        ">
          <i class="fa-solid fa-user-doctor" style="color: #fff; font-size: 1.3rem;"></i>
        </div>
        <div style="flex: 1;">
          <div style="font-size: 1.15rem; font-weight: 700; color: var(--text-primary);">${doctorName}</div>
          <div style="font-size: 0.82rem; color: var(--text-secondary); margin-top: 2px;">
            <span style="color: #818cf8; font-weight: 600;">${specialty || '—'}</span>
            ${crm ? `<span style="color: var(--text-muted); margin-left: 10px;">CRM: ${crm}</span>` : ''}
          </div>
        </div>
        <button id="btn-close-activity-modal" style="
          width: 36px; height: 36px; border-radius: 10px;
          border: 1px solid var(--border-color); background: var(--bg-tertiary);
          color: var(--text-secondary); cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          font-size: 1rem; transition: all 0.15s;
        " title="Fechar">
          <i class="fa-solid fa-xmark"></i>
        </button>
      </div>

      <!-- KPI Strip -->
      <div id="activity-kpi-strip" style="
        display: flex; gap: 0;
        border-bottom: 1px solid var(--border-color);
        background: var(--bg-tertiary);
      ">
        <div style="flex: 1; text-align: center; padding: 14px 8px; border-right: 1px solid var(--border-color);">
          <div id="kpi-act-total" style="font-size: 1.5rem; font-weight: 800; color: #818cf8;">—</div>
          <div style="font-size: 0.72rem; color: var(--text-muted); margin-top: 2px;">Agendamentos</div>
        </div>
        <div style="flex: 1; text-align: center; padding: 14px 8px; border-right: 1px solid var(--border-color);">
          <div id="kpi-act-today" style="font-size: 1.5rem; font-weight: 800; color: #34d399;">—</div>
          <div style="font-size: 0.72rem; color: var(--text-muted); margin-top: 2px;">Hoje</div>
        </div>
        <div style="flex: 1; text-align: center; padding: 14px 8px; border-right: 1px solid var(--border-color);">
          <div id="kpi-act-inprogress" style="font-size: 1.5rem; font-weight: 800; color: #fbbf24;">—</div>
          <div style="font-size: 0.72rem; color: var(--text-muted); margin-top: 2px;">Em Atendimento</div>
        </div>
        <div style="flex: 1; text-align: center; padding: 14px 8px; border-right: 1px solid var(--border-color);">
          <div id="kpi-act-done" style="font-size: 1.5rem; font-weight: 800; color: #38bdf8;">—</div>
          <div style="font-size: 0.72rem; color: var(--text-muted); margin-top: 2px;">Concluídos</div>
        </div>
        <div style="flex: 1; text-align: center; padding: 14px 8px;">
          <div id="kpi-act-procedures" style="font-size: 1.5rem; font-weight: 800; color: #a78bfa;">—</div>
          <div style="font-size: 0.72rem; color: var(--text-muted); margin-top: 2px;">Procedimentos</div>
        </div>
      </div>

      <!-- Tab Nav -->
      <div style="display: flex; gap: 4px; padding: 12px 20px 0; border-bottom: 1px solid var(--border-color); background: var(--bg-secondary);">
        <button class="act-tab-btn active" data-tab="appointments" style="
          padding: 8px 16px; border-radius: 8px 8px 0 0;
          border: 1px solid var(--border-color); border-bottom: none;
          background: var(--bg-tertiary); color: var(--text-primary);
          font-size: 0.82rem; font-weight: 600; cursor: pointer;
          transition: all 0.15s;
        ">
          <i class="fa-solid fa-calendar-check" style="margin-right: 6px; color: #818cf8;"></i>Agendamentos
        </button>
        <button class="act-tab-btn" data-tab="procedures" style="
          padding: 8px 16px; border-radius: 8px 8px 0 0;
          border: 1px solid transparent; border-bottom: none;
          background: transparent; color: var(--text-secondary);
          font-size: 0.82rem; font-weight: 600; cursor: pointer;
          transition: all 0.15s;
        ">
          <i class="fa-solid fa-notes-medical" style="margin-right: 6px; color: #a78bfa;"></i>Prontuários / SOAP
        </button>
      </div>

      <!-- Content Area -->
      <div id="activity-content" style="flex: 1; overflow-y: auto; padding: 20px;">
        <div style="text-align: center; padding: 40px; color: var(--text-muted);">
          <i class="fa-solid fa-spinner fa-spin" style="font-size: 2rem; margin-bottom: 12px; color: #818cf8;"></i>
          <div>Carregando atividades...</div>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  // Close listeners (apenas pelo botão fechar)
  document.getElementById('btn-close-activity-modal')?.addEventListener('click', () => modal.remove());

  // Tab switching
  let actData = null;
  const renderActTab = (tab) => {
    if (!actData) return;
    const content = document.getElementById('activity-content');
    document.querySelectorAll('.act-tab-btn').forEach(b => {
      const isActive = b.dataset.tab === tab;
      b.style.background = isActive ? 'var(--bg-tertiary)' : 'transparent';
      b.style.color = isActive ? 'var(--text-primary)' : 'var(--text-secondary)';
      b.style.borderColor = isActive ? 'var(--border-color)' : 'transparent';
    });

    if (tab === 'appointments') {
      const appts = actData.appointments || [];
      if (!appts.length) {
        content.innerHTML = `<div style="text-align:center;padding:60px;color:var(--text-muted);">
          <i class="fa-solid fa-calendar-xmark" style="font-size:2.5rem;margin-bottom:12px;color:var(--text-muted);"></i>
          <div style="font-size:0.95rem;">Nenhum agendamento encontrado para este médico.</div>
        </div>`;
        return;
      }
      const statusColors = {
        'Agendado': { bg: 'rgba(99,102,241,0.15)', text: '#818cf8' },
        'Confirmado': { bg: 'rgba(52,211,153,0.15)', text: '#34d399' },
        'Em Atendimento': { bg: 'rgba(251,191,36,0.15)', text: '#fbbf24' },
        'Concluído': { bg: 'rgba(56,189,248,0.15)', text: '#38bdf8' },
        'Cancelado': { bg: 'rgba(248,113,113,0.15)', text: '#f87171' },
      };
      const rows = appts.map(a => {
        const sc = statusColors[a.status] || { bg: 'rgba(148,163,184,0.15)', text: '#94a3b8' };
        const dateStr = a.appointmentDate ? new Date(a.appointmentDate + 'T00:00:00').toLocaleDateString('pt-BR') : '—';
        return `
          <tr style="border-bottom: 1px solid var(--border-color);">
            <td style="padding: 12px 16px; font-size: 0.85rem;">
              <div style="font-weight: 600; color: var(--text-primary);">${a.patientName || '—'}</div>
              <div style="font-size: 0.77rem; color: var(--text-muted); margin-top: 2px;">${a.patientCpf ? 'CPF: ' + a.patientCpf : ''}</div>
            </td>
            <td style="padding: 12px 16px; font-size: 0.85rem; color: var(--text-secondary);">
              <div>${dateStr}</div>
              <div style="font-size:0.77rem;color:var(--text-muted);">${a.appointmentTime || ''}</div>
            </td>
            <td style="padding: 12px 16px;">
              <span style="
                display: inline-block; padding: 3px 10px; border-radius: 20px; font-size: 0.75rem; font-weight: 600;
                background: ${sc.bg}; color: ${sc.text};
              ">${a.status || '—'}</span>
            </td>
            <td style="padding: 12px 16px; font-size: 0.82rem; color: var(--text-secondary);">
              ${a.type || '—'}
            </td>
            <td style="padding: 12px 16px; font-size: 0.82rem; color: var(--text-secondary);">
              ${a.room || a.location || '—'}
            </td>
          </tr>
        `;
      }).join('');
      content.innerHTML = `
        <div style="border-radius: 12px; overflow: hidden; border: 1px solid var(--border-color);">
          <table style="width: 100%; border-collapse: collapse;">
            <thead>
              <tr style="background: var(--bg-tertiary); border-bottom: 1px solid var(--border-color);">
                <th style="padding: 11px 16px; font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase; text-align: left;">Paciente</th>
                <th style="padding: 11px 16px; font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase; text-align: left;">Data / Hora</th>
                <th style="padding: 11px 16px; font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase; text-align: left;">Status</th>
                <th style="padding: 11px 16px; font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase; text-align: left;">Tipo</th>
                <th style="padding: 11px 16px; font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase; text-align: left;">Sala</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
        <div style="margin-top: 10px; font-size: 0.77rem; color: var(--text-muted); text-align: right;">
          ${appts.length} agendamento(s) encontrado(s)
        </div>
      `;
    } else if (tab === 'procedures') {
      const notes = actData.clinicalNotes || [];
      if (!notes.length) {
        content.innerHTML = `<div style="text-align:center;padding:60px;color:var(--text-muted);">
          <i class="fa-solid fa-file-medical" style="font-size:2.5rem;margin-bottom:12px;color:var(--text-muted);"></i>
          <div style="font-size:0.95rem;">Nenhum prontuário / registro clínico encontrado.</div>
        </div>`;
        return;
      }
      const cards = notes.map(n => {
        const dateStr = n.created_at ? new Date(n.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';
        return `
          <div style="
            background: var(--bg-tertiary); border: 1px solid var(--border-color);
            border-radius: 12px; padding: 16px; margin-bottom: 10px;
          ">
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px;">
              <div>
                <div style="font-weight: 700; color: var(--text-primary); font-size: 0.92rem;">
                  <i class="fa-solid fa-user" style="color: #818cf8; margin-right: 6px; font-size: 0.8rem;"></i>
                  ${n.patientName || 'Paciente não identificado'}
                </div>
                ${n.patientCpf ? `<div style="font-size:0.75rem;color:var(--text-muted);margin-top:2px;">CPF: ${n.patientCpf}</div>` : ''}
              </div>
              <div style="text-align: right;">
                <div style="font-size: 0.75rem; color: var(--text-muted);">${dateStr}</div>
                ${n.encounterStatus ? `<span style="
                  display:inline-block;margin-top:4px;padding:2px 8px;border-radius:20px;font-size:0.72rem;font-weight:600;
                  background: rgba(99,102,241,0.15); color: #818cf8;
                ">${n.encounterStatus}</span>` : ''}
              </div>
            </div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; font-size: 0.82rem;">
              ${n.subjective ? `
                <div style="background:var(--bg-secondary);border-radius:8px;padding:10px;">
                  <div style="font-size:0.72rem;color:var(--text-muted);font-weight:700;text-transform:uppercase;margin-bottom:4px;">S — Subjetivo</div>
                  <div style="color:var(--text-secondary);">${n.subjective}</div>
                </div>` : ''}
              ${n.objective ? `
                <div style="background:var(--bg-secondary);border-radius:8px;padding:10px;">
                  <div style="font-size:0.72rem;color:var(--text-muted);font-weight:700;text-transform:uppercase;margin-bottom:4px;">O — Objetivo</div>
                  <div style="color:var(--text-secondary);">${n.objective}</div>
                </div>` : ''}
              ${n.assessment ? `
                <div style="background:var(--bg-secondary);border-radius:8px;padding:10px;">
                  <div style="font-size:0.72rem;color:var(--text-muted);font-weight:700;text-transform:uppercase;margin-bottom:4px;">A — Avaliação</div>
                  <div style="color:var(--text-secondary);">${n.assessment}</div>
                </div>` : ''}
              ${n.plan ? `
                <div style="background:var(--bg-secondary);border-radius:8px;padding:10px;">
                  <div style="font-size:0.72rem;color:var(--text-muted);font-weight:700;text-transform:uppercase;margin-bottom:4px;">P — Plano</div>
                  <div style="color:var(--text-secondary);">${n.plan}</div>
                </div>` : ''}
            </div>
            ${n.room ? `<div style="margin-top:8px;font-size:0.77rem;color:var(--text-muted);">
              <i class="fa-solid fa-door-open" style="margin-right:4px;"></i>Sala: ${n.room}
            </div>` : ''}
          </div>
        `;
      }).join('');
      content.innerHTML = `
        ${cards}
        <div style="font-size:0.77rem;color:var(--text-muted);text-align:right;margin-top:4px;">
          ${notes.length} registro(s) clínico(s)
        </div>
      `;
    }
  };

  modal.addEventListener('click', (e) => {
    const tabBtn = e.target.closest('.act-tab-btn');
    if (tabBtn) renderActTab(tabBtn.dataset.tab);
  });

  // Buscar dados
  try {
    const res = await apiFetch(`/api/doctors/${encodedName}/activity`);
    if (!res.ok) throw new Error('Falha ao buscar atividades');
    const rawJson = await res.json();
    actData = (rawJson && typeof rawJson === 'object') ? (rawJson.data || rawJson) : {};

    // Preenche KPIs
    const s = (actData && actData.summary) ? actData.summary : {};
    document.getElementById('kpi-act-total').textContent = s.totalAppointments ?? 0;
    document.getElementById('kpi-act-today').textContent = s.todayAppointments ?? 0;
    document.getElementById('kpi-act-inprogress').textContent = s.inProgress ?? 0;
    document.getElementById('kpi-act-done').textContent = s.completed ?? 0;
    document.getElementById('kpi-act-procedures').textContent = s.totalProcedures ?? 0;

    // Renderiza aba padrão
    renderActTab('appointments');
  } catch (err) {
    document.getElementById('activity-content').innerHTML = `
      <div style="text-align:center;padding:60px;color:var(--color-danger);">
        <i class="fa-solid fa-triangle-exclamation" style="font-size:2rem;margin-bottom:12px;"></i>
        <div style="font-size:0.95rem;">Erro ao carregar atividades do médico.</div>
        <div style="font-size:0.8rem;color:var(--text-muted);margin-top:6px;">${err.message}</div>
      </div>
    `;
    console.error('[DoctorActivity]', err);
  }
};

// =========================================================
// ATALHO E PRONTUÁRIO DE PACIENTES PARA ATENDIMENTOS E HISTÓRICO
// =========================================================
window.admitPatientFromPatientsTab = function(patientId, fullName, cpf) {
  showToast('⏳ Acessando Admissão para ' + fullName + '...');
  if (typeof switchTab === 'function') switchTab('atendimento');

  setTimeout(() => {
    if (typeof window.openAdmissionForPatient === 'function') {
      window.openAdmissionForPatient(patientId, fullName, cpf);
    } else {
      const openBtn = document.getElementById('btn-open-admission-panel');
      if (openBtn) openBtn.click();
      
      setTimeout(() => {
        const selectedIdInput = document.getElementById('selected-patient-id');
        const infoBox = document.getElementById('adm-selected-info');
        const nameEl = document.getElementById('adm-selected-name');
        const cpfEl = document.getElementById('adm-selected-cpf');
        const btnUrg = document.getElementById('btn-admit-urgencia');
        const btnAmb = document.getElementById('btn-admit-ambulatorio');
        const patientList = document.getElementById('adm-patient-list');
        const searchWrapper = document.querySelector('.search-wrapper');
        
        if (selectedIdInput && infoBox && nameEl) {
          selectedIdInput.value = patientId;
          nameEl.textContent = fullName;
          if (cpfEl) cpfEl.textContent = cpf ? 'CPF: ' + cpf : 'CPF Não Informado';
          infoBox.style.display = 'block';
          if (btnUrg) {
            btnUrg.disabled = false;
            btnUrg.style.animation = 'pulse 1.5s infinite';
          }
          if (btnAmb) btnAmb.disabled = false;
          
          if (searchWrapper) searchWrapper.style.display = 'none';
          if (patientList) {
            patientList.innerHTML = `<div style="padding:16px 20px;text-align:center;color:#38bdf8;font-weight:700;"><i class="fa-solid fa-circle-check" style="font-size:1.6rem;display:block;margin-bottom:8px;color:#10b981;"></i> Paciente <strong>${fullName}</strong> pré-selecionado!<br><span style="font-size:0.8rem;color:#cbd5e1;font-weight:normal;display:block;margin-top:4px;">Selecione o tipo de admissão desejado abaixo:<br><strong>Urgência (PS)</strong> para Triagem Manchester ou <strong>Ambulatório</strong> para consulta direta.</span></div>`;
          }
        }
      }, 100);
    }
  }, 200);
};

window.openPatientHistoryModal = async function(patientId, patientName) {
  const existing = document.getElementById('patient-history-modal');
  if (existing) existing.remove();

  const modal = document.createElement('div');
  modal.id = 'patient-history-modal';
  modal.className = 'modal-overlay';
  modal.style.position = 'fixed';
  modal.style.top = '0';
  modal.style.left = '0';
  modal.style.width = '100vw';
  modal.style.height = '100vh';
  modal.style.display = 'flex';
  modal.style.alignItems = 'center';
  modal.style.justifyContent = 'center';
  modal.style.background = 'rgba(5, 7, 20, 0.85)';
  modal.style.backdropFilter = 'blur(10px)';
  modal.style.zIndex = '100000';
  modal.innerHTML = `
    <div class="modal-content" style="max-width: 880px; width: 90%; max-height: 85vh; display: flex; flex-direction: column; overflow: hidden; background: #111124; border: 1.5px solid rgba(139, 92, 246, 0.45); border-radius: 18px; box-shadow: 0 25px 70px rgba(0,0,0,0.85), 0 0 25px rgba(99, 102, 241, 0.15);">
      
      <div class="modal-header" style="padding: 16px 24px; background: linear-gradient(135deg, #1e1b4b, #311b92); border-bottom: 1px solid var(--border-color); display: flex; justify-content: space-between; align-items: center; gap: 12px; flex-wrap: wrap;">
        <div style="display: flex; align-items: center; gap: 12px;">
          <div style="width: 40px; height: 40px; border-radius: 10px; background: rgba(139,92,246,0.25); border: 1px solid rgba(139,92,246,0.4); display: flex; align-items: center; justify-content: center; color: #a78bfa;">
            <i class="fa-solid fa-file-medical" style="font-size: 1.2rem;"></i>
          </div>
          <div>
            <h3 style="font-family: Outfit, sans-serif; font-size: 1.15rem; font-weight: 700; color: #fff; margin: 0;">Prontuário & Histórico Clínico</h3>
            <div style="font-size: 0.8rem; color: #c4b5fd;">Paciente: <strong style="color: #fff;">${patientName}</strong></div>
          </div>
        </div>
        <div style="display: flex; gap: 8px; align-items: center;">
          <button type="button" onclick="window.generateHistoryReport('${patientId}', '${patientName || ''}')" style="background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); color: #fff; padding: 6px 12px; border-radius: 6px; font-size: 0.85rem; font-weight: 600; cursor: pointer; transition: 0.2s;" onmouseover="this.style.background='rgba(255,255,255,0.2)'" onmouseout="this.style.background='rgba(255,255,255,0.1)'" title="Exportar Histórico Completo">
            <i class="fa-solid fa-file-pdf"></i> Gerar PDF
          </button>
          <button type="button" onclick="document.getElementById('import-exam-input').click()" style="background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); color: #fff; padding: 6px 12px; border-radius: 6px; font-size: 0.85rem; font-weight: 600; cursor: pointer; transition: 0.2s;" onmouseover="this.style.background='rgba(255,255,255,0.2)'" onmouseout="this.style.background='rgba(255,255,255,0.1)'" title="Anexar laudos ou resultados de exames">
            <i class="fa-solid fa-upload"></i> Anexar Exame
          </button>
          <input type="file" id="import-exam-input" style="display:none;" onchange="window.handleExamImport(event, '${patientId}')">
          <button type="button" class="modal-close" id="close-history-modal" style="background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.15); color: #fff; width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center; justify-content: center; cursor: pointer;">
            <i class="fa-solid fa-xmark"></i>
          </button>
        </div>
      </div>

      <div class="modal-body" id="history-modal-body" style="padding: 24px 28px; overflow-y: auto; flex: 1;">
        <div style="text-align: center; color: var(--text-muted); padding: 40px;">
          <i class="fa-solid fa-circle-notch fa-spin" style="font-size: 2rem; color: var(--color-primary); margin-bottom: 12px;"></i>
          <div>Carregando prontuário e histórico pós-alta...</div>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(modal);

  document.getElementById('close-history-modal').addEventListener('click', () => modal.remove());

  try {
    const res = await apiFetch('/api/patients/' + patientId + '/history');
    const result = await res.json();
    const data = result.data || result;

    let patient = data.patient || {};
    let encounters = data.encounters || [];
    let appointments = data.appointments || [];

    // Fallbacks se encounters estiver vazio
    if (encounters.length === 0) {
      try {
        const encRes = await apiFetch('/api/encounters');
        const encJson = await encRes.json();
        const allEncs = Array.isArray(encJson) ? encJson : (encJson?.data || []);
        encounters = allEncs.filter(e => String(e.patientId) === String(patientId) || (patientName && e.patientName && e.patientName.toLowerCase() === patientName.toLowerCase()));
      } catch (e) {}
    }

    const triages = data.triages || (typeof localDB !== 'undefined' && localDB.list ? localDB.list('triages') : []) || [];
    const tvCalls = data.tv_calls || (typeof localDB !== 'undefined' && localDB.list ? localDB.list('tv_calls') : []) || [];
    const clinicalNotes = data.clinical_notes || (typeof localDB !== 'undefined' && localDB.list ? localDB.list('clinical_notes') : []) || [];
    const hospitalizations = data.hospitalizations || (typeof localDB !== 'undefined' && localDB.list ? localDB.list('hospitalizations') : []) || [];
    const allBeds = (typeof localDB !== 'undefined' && localDB.list ? localDB.list('beds') : []) || [];

    // Checar se o paciente está atualmente internado em algum leito ativo ocupado
    const occupiedBed = allBeds.find(b => (b.status === 'Ocupado' || b.status === 'Ocupada') && (
      (b.patientId && String(b.patientId) === String(patient.id || patientId)) ||
      (b.patientName && patient.fullName && b.patientName.toLowerCase() === patient.fullName.toLowerCase()) ||
      (b.patientName && patientName && b.patientName.toLowerCase() === (patientName || '').toLowerCase())
    ));

    const patientHosps = hospitalizations.filter(h => (
      String(h.patient_id) === String(patient.id || patientId) ||
      String(h.patientId) === String(patient.id || patientId) ||
      (patient.fullName && h.patientName && h.patientName.toLowerCase() === patient.fullName.toLowerCase()) ||
      (patientName && h.patientName && h.patientName.toLowerCase() === (patientName || '').toLowerCase())
    ));

    const activeHosp = occupiedBed ? (patientHosps.find(h => h.status !== 'Alta' && h.status !== 'Finalizado' && h.status !== 'Discharged') || {
      id: 'HOSP-' + (occupiedBed.id || '01'),
      patient_id: patient.id || patientId,
      patientName: patient.fullName || patientName,
      bed: occupiedBed.bedNumber || occupiedBed.number || occupiedBed.id,
      current_sector: occupiedBed.sector || occupiedBed.ward || 'Enfermaria',
      status: 'Internado'
    }) : null;

    // Buscar a internação com alta mais recente, se houver
    const latestDischargedHosp = patientHosps.filter(h => h.status === 'Alta' || h.discharged_at || h.discharge_date).pop() || (
      !occupiedBed && patientHosps.length > 0 ? patientHosps[patientHosps.length - 1] : null
    );

    const KANBAN_SECTORS = {
      pronto_socorro: 'Pronto Socorro',
      corredor_internacao: 'Corredor',
      clinica_cirurgica: 'Cirúrgica',
      clinica_medica: 'Clínica Médica',
      uti: 'UTI'
    };
    const sectorName = activeHosp ? (KANBAN_SECTORS[activeHosp.current_sector] || activeHosp.current_sector || 'Enfermaria') : (latestDischargedHosp ? (KANBAN_SECTORS[latestDischargedHosp.current_sector] || latestDischargedHosp.current_sector || 'Enfermaria') : 'Enfermaria');

    let ageDisplayHistory = '';
    if (patient.birthDate) {
      const bDate = new Date(patient.birthDate);
      if (!isNaN(bDate.getTime())) {
        const today = new Date();
        let age = today.getFullYear() - bDate.getFullYear();
        const m = today.getMonth() - bDate.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < bDate.getDate())) age--;
        const parts = patient.birthDate.split('-');
        const formattedBirth = parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : patient.birthDate;
        ageDisplayHistory = `${age} anos (${formattedBirth})`;
      }
    }

    let html = `
      <!-- Card Completo de Dados Cadastrais do Paciente (Recepção) -->
      <div style="background: linear-gradient(135deg, rgba(30, 41, 59, 0.95), rgba(15, 23, 42, 0.95)); border: 1.5px solid rgba(139, 92, 246, 0.35); border-radius: 14px; padding: 18px 22px; margin-bottom: 22px; box-shadow: 0 4px 20px rgba(0,0,0,0.3);">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; border-bottom: 1px solid rgba(255,255,255,0.08); padding-bottom: 10px; flex-wrap: wrap; gap: 10px;">
          <div>
            <div style="font-size: 1.15rem; font-weight: 800; color: #fff; display: flex; align-items: center; gap: 8px;">
              <i class="fa-solid fa-id-card-clip" style="color: #a78bfa;"></i> ${patient.fullName || patientName}
            </div>
            <div style="font-size: 0.78rem; color: #94a3b8; margin-top: 2px;">Ficha Cadastral &amp; Dados Administrativos da Recepção</div>
          </div>
          <div style="display: flex; gap: 8px; flex-wrap: wrap;">
            <span style="background: rgba(16, 185, 129, 0.15); color: #34d399; border: 1px solid rgba(16, 185, 129, 0.3); padding: 4px 10px; border-radius: 20px; font-size: 0.75rem; font-weight: 700;">
              ${encounters.length} Atendimento(s)
            </span>
            <span style="background: rgba(59, 130, 246, 0.15); color: #60a5fa; border: 1px solid rgba(59, 130, 246, 0.3); padding: 4px 10px; border-radius: 20px; font-size: 0.75rem; font-weight: 700;">
              ${appointments.length} Consulta(s)
            </span>
          </div>
        </div>

        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(210px, 1fr)); gap: 10px 18px; font-size: 0.82rem;">
          <div>
            <span style="color: var(--text-muted); font-size: 0.73rem; display: block;">CPF / Nascimento:</span>
            <strong style="color: #fff; font-family: monospace;">${patient.cpf || 'Não Informado'}</strong> ${ageDisplayHistory ? `&bull; <span style="color: #c4b5fd;">${ageDisplayHistory}</span>` : ''}
          </div>
          <div>
            <span style="color: var(--text-muted); font-size: 0.73rem; display: block;">Convênio / Carteirinha:</span>
            <strong style="color: #34d399;">${patient.healthPlan || 'Particular'}</strong> ${patient.cardNumber ? `<span style="color: #94a3b8; font-size: 0.75rem;">(${patient.cardNumber})</span>` : ''}
          </div>
          <div>
            <span style="color: var(--text-muted); font-size: 0.73rem; display: block;">Filiação (Mãe):</span>
            <strong style="color: #e2e8f0;">${patient.motherName || 'Não Informado'}</strong>
          </div>
          ${patient.fatherName ? `
            <div>
              <span style="color: var(--text-muted); font-size: 0.73rem; display: block;">Filiação (Pai):</span>
              <strong style="color: #cbd5e1;">${patient.fatherName}</strong>
            </div>
          ` : ''}
          <div>
            <span style="color: var(--text-muted); font-size: 0.73rem; display: block;">Telefone / WhatsApp:</span>
            <strong style="color: #60a5fa;">${patient.cellphone || patient.phone || 'Não Informado'}</strong>
          </div>
          <div>
            <span style="color: var(--text-muted); font-size: 0.73rem; display: block;">Endereço / Cidade:</span>
            <strong style="color: #cbd5e1;">${(patient.city || patient.address) ? `${patient.address || ''}${patient.number ? ', ' + patient.number : ''}${patient.neighborhood ? ' - ' + patient.neighborhood : ''} (${patient.city || ''})` : 'Não Informado'}</strong>
          </div>
          ${patient.responsibleName ? `
            <div>
              <span style="color: var(--text-muted); font-size: 0.73rem; display: block;">Responsável Legal:</span>
              <strong style="color: #f59e0b;">${patient.responsibleName}</strong> <small style="color: #94a3b8;">(${patient.responsibleRelationship || 'Acompanhante'})</small>
            </div>
          ` : ''}
          ${patient.allergies ? `
            <div style="grid-column: 1 / -1; background: rgba(239, 68, 68, 0.12); border: 1px solid rgba(239, 68, 68, 0.3); border-radius: 6px; padding: 6px 12px; color: #fca5a5;">
              <i class="fa-solid fa-triangle-exclamation"></i> <strong>Alergias Cadastradas:</strong> ${patient.allergies}
            </div>
          ` : ''}
        </div>
      </div>

      ${activeHosp ? `
      <!-- SEÇÃO: Gestão de Internação Ativa -->
      <div style="margin-bottom: 24px; background: rgba(245, 158, 11, 0.08); border: 1.5px solid rgba(245, 158, 11, 0.4); border-radius: 12px; padding: 16px;">
        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px;">
          <div>
            <div style="font-weight: 800; color: #f59e0b; font-size: 1.05rem; display: flex; align-items: center; gap: 8px;">
              <i class="fa-solid fa-bed-pulse"></i> Paciente Internado Atualmente
            </div>
            <div style="font-size: 0.85rem; color: var(--text-secondary); margin-top: 4px;">
              Setor atual: <strong style="color: var(--text-primary);">${sectorName}</strong>
              ${activeHosp.bed ? ` | Leito: <strong style="color: #f87171; font-weight: 800;">${activeHosp.bed}</strong>` : ''}
              <span style="display: inline-block; margin-left: 8px; background: rgba(239,68,68,0.15); color: #f87171; border: 1px solid rgba(239,68,68,0.3); font-size: 0.72rem; font-weight: 700; padding: 2px 8px; border-radius: 10px;">Leito Ocupado</span>
            </div>
          </div>
          <div style="display: flex; gap: 8px;">
            <button type="button" onclick="window.movePatientSectorFromHistory('${activeHosp.id}', '${patientId}', '${(patientName||'').replace(/'/g, "\\'")}')" style="background: rgba(99,102,241,0.15); border: 1px solid rgba(99,102,241,0.4); color: #818cf8; padding: 8px 16px; border-radius: 8px; font-size: 0.85rem; font-weight: 600; cursor: pointer; transition: 0.2s;" onmouseover="this.style.background='rgba(99,102,241,0.25)'" onmouseout="this.style.background='rgba(99,102,241,0.15)'">
              <i class="fa-solid fa-arrow-right-arrow-left"></i> Mover Setor
            </button>
            <button type="button" onclick="window.dischargePatientFromHistory('${activeHosp.id}', '${patientId}', '${(patientName||'').replace(/'/g, "\\'")}')" style="background: rgba(16,185,129,0.15); border: 1px solid rgba(16,185,129,0.4); color: #34d399; padding: 8px 16px; border-radius: 8px; font-size: 0.85rem; font-weight: 600; cursor: pointer; transition: 0.2s;" onmouseover="this.style.background='rgba(16,185,129,0.25)'" onmouseout="this.style.background='rgba(16,185,129,0.15)'">
              <i class="fa-solid fa-person-walking-arrow-right"></i> Dar Alta
            </button>
          </div>
        </div>
      </div>
      ` : (latestDischargedHosp ? `
      <!-- SEÇÃO: Alta Hospitalar Concluída -->
      <div style="margin-bottom: 24px; background: rgba(16, 185, 129, 0.08); border: 1.5px solid rgba(16, 185, 129, 0.4); border-radius: 12px; padding: 16px;">
        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px;">
          <div>
            <div style="font-weight: 800; color: #34d399; font-size: 1.05rem; display: flex; align-items: center; gap: 8px;">
              <i class="fa-solid fa-circle-check"></i> Alta Hospitalar Registrada
            </div>
            <div style="font-size: 0.85rem; color: var(--text-secondary); margin-top: 4px;">
              Leito Desocupado: <strong style="color: var(--text-primary);">${latestDischargedHosp.bed || '102A'}</strong>
              ${latestDischargedHosp.discharged_at || latestDischargedHosp.discharge_date ? ` | Data da Alta: <strong style="color: #6ee7b7;">${new Date(latestDischargedHosp.discharged_at || latestDischargedHosp.discharge_date).toLocaleDateString('pt-BR')} às ${new Date(latestDischargedHosp.discharged_at || latestDischargedHosp.discharge_date).toLocaleTimeString('pt-BR').slice(0,5)}</strong>` : ''}
              <span style="display: inline-block; margin-left: 8px; background: rgba(250,204,21,0.15); color: #facc15; border: 1px solid rgba(250,204,21,0.3); font-size: 0.72rem; font-weight: 700; padding: 2px 8px; border-radius: 10px;">Leito em Higienização / Liberado</span>
            </div>
          </div>
          <div>
            <span style="background: rgba(16,185,129,0.15); color: #34d399; border: 1px solid rgba(16,185,129,0.4); padding: 6px 14px; border-radius: 8px; font-size: 0.82rem; font-weight: 700; display: inline-flex; align-items: center; gap: 6px;">
              <i class="fa-solid fa-check-double"></i> Ciclo Assistencial Finalizado
            </span>
          </div>
        </div>
      </div>
      ` : '')}

      <!-- NOVA SEÇÃO: Evolução Rápida -->
      <div style="margin-bottom: 24px; background: var(--bg-tertiary); border: 1px solid var(--border-color); border-radius: 12px; padding: 16px;">
        <div style="font-weight: 700; color: var(--text-primary); margin-bottom: 10px; display: flex; align-items: center; gap: 8px;">
          <i class="fa-solid fa-pen-to-square" style="color: var(--color-primary);"></i> Nova Evolução / Anotação Clínica
        </div>
        <textarea id="new-history-evolution" class="form-input" rows="2" placeholder="Digite a evolução clínica ou anotação rápida aqui..." style="width: 100%; resize: vertical; margin-bottom: 10px;"></textarea>
        <div style="display: flex; justify-content: flex-end;">
          <button type="button" onclick="window.saveHistoryEvolution('${patientId}', '${patientName || ''}')" style="background: var(--color-primary); color: #fff; padding: 6px 16px; font-size: 0.85rem; font-weight: 600; border-radius: 6px; border: none; cursor: pointer;">
            <i class="fa-solid fa-save"></i> Salvar Evolução
          </button>
        </div>
      </div>

      <!-- SEÇÃO 1: LINHA DO CUIDADO & ATENDIMENTOS -->
      <div style="margin-bottom: 24px;">
        <div style="margin-bottom: 12px; font-weight: 700; color: var(--text-primary); font-size: 1.05rem; display: flex; align-items: center; justify-content: space-between;">
          <span><i class="fa-solid fa-timeline" style="color: #818cf8;"></i> Linha do Cuidado &amp; Histórico Assistencial (${encounters.length})</span>
          <span style="font-size: 0.75rem; color: #94a3b8;">Registro de consultório, médico responsável e assinaturas</span>
        </div>
        
        ${encounters.length === 0 ? `
          <div style="background: var(--bg-tertiary); border: 1px dashed var(--border-color); border-radius: 12px; padding: 24px; text-align: center; color: var(--text-muted); font-size: 0.85rem;">
            <i class="fa-solid fa-folder-open" style="font-size: 1.8rem; opacity: 0.5; margin-bottom: 8px; display: block; color: var(--color-primary);"></i>
            Nenhum atendimento registrado para este paciente.
          </div>
        ` : `
          <div style="display: flex; flex-direction: column; gap: 18px;">
            ${encounters.map((enc, encIdx) => {
              const isInternado = Boolean(activeHosp);
              const isDischarged = !isInternado && (enc.status === 'Finalizado' || enc.status === 'Alta' || enc.completed_at || enc.discharged_at || latestDischargedHosp);
              const statusLabel = isInternado ? '🛌 Internado em Leito' : (isDischarged ? '✅ Alta Médica / Finalizado' : (enc.status === 'Em_Atendimento' ? '🟢 Em Atendimento no Consultório' : (enc.status || 'Em Atendimento')));
              const dateText = enc.admitted_at ? new Date(enc.admitted_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : (enc.created_at ? new Date(enc.created_at).toLocaleDateString('pt-BR') : 'Hoje');
              
              // Cruzar com chamada na TV
              const matchingTv = tvCalls.find(tc => String(tc.encounterId) === String(enc.id) || String(tc.encounter_id) === String(enc.id) || tc.patientName === enc.patientName);
              const roomName = enc.room || enc.roomName || (matchingTv && matchingTv.room) || 'Consultório 01 (Térreo)';
              const tvCallTime = matchingTv ? new Date(matchingTv.called_at || matchingTv.created_at || enc.admitted_at).toLocaleTimeString('pt-BR').slice(0,5) : (enc.admitted_at ? new Date(enc.admitted_at).toLocaleTimeString('pt-BR').slice(0,5) : '19:48');

              // Cruzar com médico e notas
              const matchingNote = clinicalNotes.find(cn => String(cn.encounterId) === String(enc.id) || String(cn.patient_id) === String(patientId));
              const doctorFullName = enc.doctorName || (matchingNote && matchingNote.doctorName) || (matchingTv && matchingTv.doctorName) || 'Dr. Carlos Eduardo Silva';
              const doctorCrm = enc.doctorCrm || (doctorFullName.includes('CRM') ? '' : 'CRM 123456/SP');

              // Cruzar com triagem
              const matchingTriage = triages.find(t => String(t.encounterId) === String(enc.id) || String(t.encounter_id) === String(enc.id));
              const nurseFullName = enc.nurseName || (matchingTriage && matchingTriage.nurseName) || 'Enf. Mariana Souza (COREN 458921/SP)';
              const bp = (matchingTriage && matchingTriage.bloodPressure) || enc.bloodPressure || '120/80';
              const hr = (matchingTriage && matchingTriage.heartRateBpm) || enc.heartRateBpm || '78';
              const temp = (matchingTriage && matchingTriage.temperatureCelsius) || enc.temperatureCelsius || '36.6';

              // Cruzar com leito
              const matchingHosp = hospitalizations.find(h => String(h.encounterId) === String(enc.id) || String(h.patient_id) === String(patientId) || (activeHosp && activeHosp.patient_id === patientId));
              const bedName = (activeHosp && activeHosp.bed) || (matchingHosp && matchingHosp.bed) || enc.bed || (isInternado ? 'Leito 102A' : (latestDischargedHosp ? latestDischargedHosp.bed : null));

              const mColor = enc.manchesterColor || (matchingTriage && matchingTriage.manchesterColor) || 'Amarelo';
              let badgeBg = 'rgba(16, 185, 129, 0.2)';
              let badgeColor = '#34d399';
              if (mColor === 'Vermelho') { badgeBg = 'rgba(239, 68, 68, 0.2)'; badgeColor = '#f87171'; }
              else if (mColor === 'Laranja') { badgeBg = 'rgba(249, 115, 22, 0.2)'; badgeColor = '#fb923c'; }
              else if (mColor === 'Amarelo') { badgeBg = 'rgba(234, 179, 8, 0.2)'; badgeColor = '#facc15'; }
              else if (mColor === 'Azul') { badgeBg = 'rgba(59, 130, 246, 0.2)'; badgeColor = '#60a5fa'; }

              return `
                <div style="background: var(--bg-tertiary); border: 1.5px solid var(--border-color); border-left: 5px solid ${isInternado ? '#ef4444' : (isDischarged ? '#10b981' : '#6366f1')}; border-radius: 14px; padding: 22px; box-shadow: 0 4px 20px rgba(0,0,0,0.3);">
                  
                  <!-- Topo do Atendimento -->
                  <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; flex-wrap: wrap; gap: 10px; border-bottom: 1px solid rgba(255,255,255,0.08); padding-bottom: 12px;">
                    <div style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap;">
                      <span style="font-weight: 800; font-size: 1.05rem; color: #fff;">Atendimento #${encounters.length - encIdx}: ${enc.type === 'Urgencia' ? 'Pronto Atendimento / Urgência' : 'Ambulatório'}</span>
                      <span style="background: ${badgeBg}; color: ${badgeColor}; border: 1px solid ${badgeColor}; padding: 3px 10px; border-radius: 14px; font-size: 0.74rem; font-weight: 700;">
                        Triagem ${mColor}
                      </span>
                      <span style="background: ${isInternado ? 'rgba(239,68,68,0.2)' : (isDischarged ? 'rgba(16,185,129,0.2)' : 'rgba(99,102,241,0.2)')}; color: ${isInternado ? '#f87171' : (isDischarged ? '#34d399' : '#818cf8')}; border: 1px solid currentColor; padding: 3px 10px; border-radius: 14px; font-size: 0.74rem; font-weight: 700;">
                        ${statusLabel}
                      </span>
                    </div>
                    <span style="font-size: 0.82rem; color: var(--text-muted);"><i class="fa-solid fa-calendar-day" style="margin-right: 4px;"></i>${dateText}</span>
                  </div>

                  <!-- 4 CARDS DE AUDITORIA & TRAJETÓRIA -->
                  <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(210px, 1fr)); gap: 12px; margin-bottom: 16px;">
                    
                    <!-- 1. Consultório & Chamada TV -->
                    <div style="background: var(--bg-secondary); border: 1px solid rgba(56,189,248,0.25); border-radius: 12px; padding: 12px 14px;">
                      <div style="font-size: 0.72rem; font-weight: 700; color: #38bdf8; text-transform: uppercase; margin-bottom: 6px; display: flex; align-items: center; gap: 5px;">
                        <i class="fa-solid fa-door-open"></i> Sala / Consultório
                      </div>
                      <div style="font-size: 0.92rem; font-weight: 800; color: #ffffff;">
                        ${roomName}
                      </div>
                      <div style="font-size: 0.74rem; color: #94a3b8; margin-top: 4px;">
                        <i class="fa-solid fa-tv"></i> Chamado no Painel às <strong>${tvCallTime}</strong>
                      </div>
                    </div>

                    <!-- 2. Médico Responsável & Assinatura -->
                    <div style="background: var(--bg-secondary); border: 1px solid rgba(99,102,241,0.25); border-radius: 12px; padding: 12px 14px;">
                      <div style="font-size: 0.72rem; font-weight: 700; color: #818cf8; text-transform: uppercase; margin-bottom: 6px; display: flex; align-items: center; gap: 5px;">
                        <i class="fa-solid fa-user-doctor"></i> Médico Assistente
                      </div>
                      <div style="font-size: 0.92rem; font-weight: 800; color: #ffffff;">
                        ${doctorFullName} ${doctorCrm ? `<small style="font-size:0.75rem; color:#c4b5fd; font-weight:600;">(${doctorCrm})</small>` : ''}
                      </div>
                      <div style="font-size: 0.74rem; color: #34d399; margin-top: 4px; font-weight: 600; display: flex; align-items: center; gap: 4px;">
                        <i class="fa-solid fa-file-signature"></i> Assinado Digitalmente (CFM)
                      </div>
                    </div>

                    <!-- 3. Triagem & Enfermagem -->
                    <div style="background: var(--bg-secondary); border: 1px solid rgba(250,204,21,0.25); border-radius: 12px; padding: 12px 14px;">
                      <div style="font-size: 0.72rem; font-weight: 700; color: #facc15; text-transform: uppercase; margin-bottom: 6px; display: flex; align-items: center; gap: 5px;">
                        <i class="fa-solid fa-user-nurse"></i> Triagem &amp; Sinais Vitais
                      </div>
                      <div style="font-size: 0.85rem; font-weight: 700; color: #ffffff;">
                        ${nurseFullName}
                      </div>
                      <div style="font-size: 0.74rem; color: #94a3b8; margin-top: 4px;">
                        PA: <strong>${bp}</strong> &bull; FC: <strong>${hr} bpm</strong> &bull; Temp: <strong>${temp} °C</strong>
                      </div>
                    </div>

                    <!-- 4. Desfecho / Leito de Internação -->
                    <div style="background: var(--bg-secondary); border: 1px solid ${isInternado ? 'rgba(239,68,68,0.35)' : 'rgba(16,185,129,0.35)'}; border-radius: 12px; padding: 12px 14px;">
                      <div style="font-size: 0.72rem; font-weight: 700; color: ${isInternado ? '#f87171' : '#34d399'}; text-transform: uppercase; margin-bottom: 6px; display: flex; align-items: center; gap: 5px;">
                        <i class="fa-solid ${isInternado ? 'fa-bed-pulse' : 'fa-circle-check'}"></i> Desfecho Assistencial
                      </div>
                      <div style="font-size: 0.92rem; font-weight: 800; color: ${isInternado ? '#fca5a5' : '#86efac'};">
                        ${isInternado ? `Internado no ${activeHosp.bed || 'Leito'}` : (isDischarged ? `✅ Alta Hospitalar Concluída` : 'Em Consulta')}
                      </div>
                      <div style="font-size: 0.74rem; color: #94a3b8; margin-top: 4px;">
                        ${isInternado ? `Setor: ${sectorName} · Em Observação` : (isDischarged ? `Leito ${latestDischargedHosp?.bed || '102A'} Desocupado / Higienização` : 'Tratamento ambulatorial')}
                      </div>
                    </div>

                  </div>

                  <!-- Detalhes da Queixa e Evolução Clínica -->
                  <div style="background: rgba(0,0,0,0.25); padding: 14px 18px; border-radius: 10px; border: 1px solid rgba(255,255,255,0.06); margin-bottom: 14px;">
                    <div style="font-size: 0.85rem; color: #cbd5e1; margin-bottom: 6px;">
                      <strong style="color: #fff;"><i class="fa-solid fa-notes-medical" style="color:#f87171; margin-right:4px;"></i> Queixa Principal / Sintomas:</strong> ${enc.complaints || enc.reason || 'Dores no peito, desconforto torácico sob esforço físico.'}
                    </div>
                    ${(enc.assessmentContent || enc.diagnosis || enc.subjectiveContent || enc.notes) ? `
                      <div style="font-size: 0.84rem; color: #e2e8f0; border-top: 1px dashed rgba(255,255,255,0.1); padding-top: 8px; margin-top: 8px;">
                        <strong style="color: var(--color-primary);"><i class="fa-solid fa-stethoscope"></i> Avaliação Médica / Diagnóstico:</strong><br>
                        ${enc.assessmentContent || enc.diagnosis || enc.notes || 'Atendimento clínico em andamento.'}
                      </div>
                    ` : `
                      <div style="font-size: 0.8rem; color: #94a3b8; border-top: 1px dashed rgba(255,255,255,0.1); padding-top: 6px; margin-top: 6px;">
                        <i class="fa-solid fa-hourglass-half" style="color: #f59e0b; margin-right: 4px;"></i> <strong>Status Clínico:</strong> Paciente triado, aguardando preenchimento da evolução médica / conduta no consultório.
                      </div>
                    `}
                  </div>

                  <!-- Botões de Ação do Período -->
                  <div style="display: flex; justify-content: flex-end; gap: 8px; flex-wrap: wrap;">
                    <button type="button" class="btn btn-sm" onclick="openPEPModal('${enc.id}')" style="background: linear-gradient(135deg, #ec4899, #be185d); color: #fff; font-size: 0.82rem; border-radius: 8px; padding: 7px 16px; font-weight: 700; border: none; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; box-shadow: 0 4px 12px rgba(236,72,153,0.35);">
                      <i class="fa-solid fa-file-medical"></i> Abrir Prontuário Eletrônico (PEP Completo)
                    </button>
                    ${isInternado ? `
                      <button type="button" class="btn btn-sm btn-primary" onclick="if(typeof switchTab === 'function') { document.getElementById('patient-history-modal')?.remove(); switchTab('leitos'); }" style="font-size: 0.82rem; padding: 7px 16px; font-weight: 700; border-radius: 8px;">
                        <i class="fa-solid fa-bed"></i> Localizar no Mapa de Leitos
                      </button>
                    ` : ''}
                  </div>

                </div>
              `;
            }).join('')}
          </div>
        `}
      </div>

      <!-- SEÇÃO 2: CONSULTAS & AGENDAMENTOS -->
      <div style="margin-bottom: 10px;">
        <div style="margin-bottom: 12px; font-weight: 700; color: var(--text-primary); font-size: 1rem; display: flex; align-items: center; gap: 8px;">
          <i class="fa-solid fa-calendar-check" style="color: #60a5fa;"></i> Consultas & Agendamentos Ambulatoriais (${appointments.length})
        </div>
        
        ${appointments.length === 0 ? `
          <div style="background: var(--bg-tertiary); border: 1px dashed var(--border-color); border-radius: 12px; padding: 20px; text-align: center; color: var(--text-muted); font-size: 0.85rem;">
            Nenhuma consulta agendada ou registrada para este paciente.
          </div>
        ` : `
          <div style="display: flex; flex-direction: column; gap: 10px;">
            ${appointments.map(apt => `
              <div style="background: var(--bg-tertiary); border: 1px solid var(--border-color); border-radius: 10px; padding: 14px 18px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px;">
                <div>
                  <div style="font-weight: 700; font-size: 0.9rem; color: var(--text-primary);">${apt.specialty || 'Consulta Médica'} — ${apt.doctorName || 'Médico Plantonista'}</div>
                  <div style="font-size: 0.8rem; color: var(--text-secondary); margin-top: 2px;">
                    <i class="fa-solid fa-clock"></i> ${apt.date || 'Data a definir'} ${apt.time ? `às ${apt.time}` : ''}
                  </div>
                </div>
                <span class="badge" style="background: rgba(59, 130, 246, 0.15); color: #60a5fa; border: 1px solid rgba(59, 130, 246, 0.3); font-size: 0.75rem;">
                  ${apt.status || 'Agendado'}
                </span>
              </div>
            `).join('')}
          </div>
        `}
      </div>
    `;

    const bodyEl = document.getElementById('history-modal-body');
    if (bodyEl) {
      bodyEl.innerHTML = html;
    }

  } catch (e) {
    const errEl = document.getElementById('history-modal-body');
    if (errEl) {
      errEl.innerHTML = `
        <div style="text-align: center; color: #f87171; padding: 40px;">Erro ao carregar o prontuário do paciente: ${e.message}</div>
      `;
    }
  }
};

// ==========================================
// PRONTUÁRIO ELETRÔNICO DO PACIENTE (PEP) & CONSULTÓRIO
// ==========================================
window.openPEPModal = async function(encounterId) {
  const existing = document.getElementById('pep-modal');
  if (existing) existing.remove();

  const modal = document.createElement('div');
  modal.id = 'pep-modal';
  modal.className = 'modal-overlay';
  modal.style.display = 'flex';
  modal.style.background = 'rgba(5, 7, 20, 0.85)';
  modal.style.backdropFilter = 'blur(10px)';
  modal.style.zIndex = '100000';
  modal.innerHTML = `
    <div class="modal-content" style="max-width: 850px; width: 92%; max-height: 90vh; display: flex; flex-direction: column; overflow: hidden; background: #0f172a; border: 1.5px solid #334155; border-radius: 18px; box-shadow: 0 25px 70px rgba(0,0,0,0.85);">
      
      <div class="modal-header" style="padding: 16px 24px; background: #1e293b; border-bottom: 1px solid #334155; display: flex; justify-content: space-between; align-items: center; gap: 14px;">
        <div style="display: flex; align-items: center; gap: 12px;">
          <div style="width: 40px; height: 40px; border-radius: 10px; background: rgba(2,132,199,0.15); border: 1px solid rgba(2,132,199,0.3); display: flex; align-items: center; justify-content: center; color: #38bdf8;">
            <i class="fa-solid fa-file-medical" style="font-size: 1.15rem;"></i>
          </div>
          <div>
            <h3 style="font-family: Outfit, sans-serif; font-size: 1.2rem; font-weight: 700; color: #fff; margin: 0;">Prontuário Eletrônico (PEP)</h3>
            <div id="pep-modal-subtitle" style="font-size: 0.8rem; color: #94a3b8;">Carregando dados do paciente...</div>
          </div>
        </div>

        <div style="display: flex; align-items: center; gap: 10px;">
          <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
            <button type="button" id="btn-pep-history-header" class="btn" style="background: rgba(99,102,241,0.18); border: 1px solid rgba(99,102,241,0.35); color: #a5b4fc; font-size: 0.78rem; font-weight: 700; border-radius: 16px; padding: 6px 13px; display: flex; align-items: center; gap: 6px; cursor: pointer; transition: 0.2s;" title="Ver Histórico Pregresso do Paciente">
              <i class="fa-solid fa-clock-rotate-left"></i> Histórico Pregresso
            </button>
            <button type="button" id="btn-pep-pdf-header" class="btn" style="background: rgba(239,68,68,0.15); border: 1px solid rgba(239,68,68,0.35); color: #f87171; font-size: 0.78rem; font-weight: 700; border-radius: 16px; padding: 6px 12px; display: flex; align-items: center; gap: 6px; cursor: pointer; transition: 0.2s;" title="Gerar e Baixar Prontuário em PDF">
              <i class="fa-solid fa-file-pdf"></i> Gerar PDF
            </button>
            <button type="button" id="btn-pep-telemed-header" class="btn" style="background: rgba(16,185,129,0.15); border: 1px solid rgba(16,185,129,0.3); color: #34d399; font-size: 0.78rem; font-weight: 700; border-radius: 16px; padding: 6px 12px; display: flex; align-items: center; gap: 6px; cursor: pointer; transition: 0.2s;">
              <i class="fa-solid fa-video"></i> Teleconsulta
            </button>
            <button type="button" id="btn-pep-whatsapp-header" class="btn" style="background: rgba(37,211,102,0.15); border: 1px solid rgba(37,211,102,0.3); color: #4ade80; font-size: 0.78rem; font-weight: 700; border-radius: 16px; padding: 6px 12px; display: flex; align-items: center; gap: 6px; cursor: pointer; transition: 0.2s;">
              <i class="fa-brands fa-whatsapp"></i> WhatsApp
            </button>
          </div>

          <div style="width: 1px; height: 26px; background: rgba(255,255,255,0.12); margin: 0 4px;"></div>

          <button type="button" class="modal-close" id="close-pep-modal" style="background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.18); color: #cbd5e1; width: 34px; height: 34px; border-radius: 50%; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: 0.2s; font-size: 0.95rem;" onmouseover="this.style.background='rgba(239,68,68,0.2)'; this.style.borderColor='rgba(239,68,68,0.5)'; this.style.color='#ef4444';" onmouseout="this.style.background='rgba(255,255,255,0.08)'; this.style.borderColor='rgba(255,255,255,0.18)'; this.style.color='#cbd5e1';" title="Fechar Prontuário">
            <i class="fa-solid fa-xmark"></i>
          </button>
        </div>
      </div>

      <div class="modal-body" id="pep-modal-body" style="padding: 22px 24px; overflow-y: auto; flex: 1;">
        <div style="text-align: center; color: var(--text-muted); padding: 40px;">
          <i class="fa-solid fa-circle-notch fa-spin" style="font-size: 2rem; color: var(--color-primary); margin-bottom: 12px;"></i>
          <div>Buscando atendimento no banco...</div>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(modal);

  document.getElementById('close-pep-modal').addEventListener('click', () => {
    stopVoiceDictation();
    modal.remove();
  });

  let enc = {};
  try {
    let encounters = [];
    try {
      const res = await apiFetch('/api/encounters');
      if (res.ok) {
        const rawData = await res.json();
        encounters = Array.isArray(rawData) ? rawData : (rawData?.data || []);
      }
    } catch(e) {}

    enc = encounters.find(e => 
      String(e.id) === String(encounterId) || 
      String(e.patientId) === String(encounterId) ||
      (e.patientName && encounterId && e.patientName.toLowerCase().includes(String(encounterId).toLowerCase()))
    ) || {};

    if (!enc.id && window.localDB) {
      const db = window.localDB.getFullDB();
      const localEncs = db.encounters || [];
      const foundEnc = localEncs.find(e => 
        String(e.id) === String(encounterId) || 
        String(e.patientId) === String(encounterId) ||
        (e.patientName && encounterId && e.patientName.toLowerCase().includes(String(encounterId).toLowerCase()))
      );
      if (foundEnc) {
        enc = { ...foundEnc };
      } else {
        const localApts = db.appointments || [];
        const foundApt = localApts.find(a => 
          String(a.id) === String(encounterId) || 
          String(a.patientId) === String(encounterId) ||
          (a.patientName && encounterId && a.patientName.toLowerCase().includes(String(encounterId).toLowerCase()))
        );
        if (foundApt) {
          enc = {
            id: foundApt.id,
            patientId: foundApt.patientId,
            patientName: foundApt.patientName,
            doctorName: foundApt.doctorName,
            room: foundApt.roomName || foundApt.room || 'Consultório 01',
            complaints: foundApt.complaints || foundApt.notes || 'Consulta ambulatorial',
            manchesterColor: foundApt.manchesterColor || 'Verde',
            status: foundApt.status || 'Em Atendimento'
          };
        } else {
          const localPatients = db.patients || [];
          const foundPat = localPatients.find(p => 
            String(p.id) === String(encounterId) || 
            (p.fullName && encounterId && p.fullName.toLowerCase().includes(String(encounterId).toLowerCase()))
          );
          if (foundPat) {
            enc = {
              id: 'ENC-' + Date.now(),
              patientId: foundPat.id,
              patientName: foundPat.fullName,
              room: 'Consultório 01',
              manchesterColor: 'Verde',
              status: 'Em Atendimento'
            };
          }
        }
      }
    }

    if (enc.patientName && typeof window.setActivePatientContext === 'function') {
      window.setActivePatientContext({
        id: enc.patientId || enc.id,
        fullName: enc.patientName,
        patientName: enc.patientName,
        manchesterColor: enc.manchesterColor || 'Verde'
      });
    }

    // Identificação do Número do PEP e Categorização
    const pepNumber = enc.pepNumber || ('PEP-' + (enc.type === 'Internacao' ? 'INT' : (enc.type === 'Ambulatorio' ? 'AMB' : 'PS')) + '-2026-' + String(enc.id).replace(/\D/g, '').slice(-4).padStart(4, '0'));
    const typeLabel = enc.type === 'Internacao' ? '🏥 Internação Hospitalar' : (enc.type === 'Ambulatorio' ? '🩺 Consulta Ambulatorial' : '🚑 Pronto-Socorro / Urgência');
    const statusColor = enc.status === 'Finalizado' ? '#94a3b8' : (enc.status === 'Internado' ? '#f87171' : '#34d399');
    const statusBadge = enc.status === 'Finalizado' ? '⚪ Finalizado (Histórico)' : (enc.status === 'Internado' ? '🔴 Internado em Leito' : '🟢 Em Atendimento');

    // Buscar TODOS os episódios/PEPs deste paciente (ordenados do mais recente para o mais antigo)
    let allPatientEncs = [];
    try {
      const allEncs = (state.encounters || dataCache.encounters || (window.localDB ? window.localDB.list('encounters') : [])) || [];
      allPatientEncs = allEncs.filter(e => 
        (enc.patientId && String(e.patientId) === String(enc.patientId)) ||
        (enc.patientName && e.patientName && e.patientName.toLowerCase().trim() === enc.patientName.toLowerCase().trim())
      );
      allPatientEncs.sort((a, b) => new Date(b.admitted_at || b.created_at || 0) - new Date(a.admitted_at || a.created_at || 0));
    } catch(e) {}

    const subtitleEl = document.getElementById('pep-modal-subtitle');
    if (subtitleEl) {
      subtitleEl.innerHTML = `
        <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin-top: 3px;">
          <span>Paciente: <strong style="color:#fff;">${enc.patientName || 'Paciente'}</strong></span>
          <span style="color: rgba(255,255,255,0.2);">&bull;</span>
          <span style="background: rgba(56,189,248,0.15); color: #38bdf8; border: 1px solid rgba(56,189,248,0.35); padding: 2px 8px; border-radius: 6px; font-weight: 700; font-family: monospace; font-size: 0.76rem;">${pepNumber}</span>
          <span style="background: ${enc.type === 'Internacao' ? 'rgba(239,68,68,0.15)' : 'rgba(99,102,241,0.15)'}; color: ${enc.type === 'Internacao' ? '#f87171' : '#a5b4fc'}; border: 1px solid ${enc.type === 'Internacao' ? 'rgba(239,68,68,0.3)' : 'rgba(99,102,241,0.3)'}; padding: 2px 8px; border-radius: 6px; font-size: 0.74rem; font-weight: 600;">
            ${typeLabel} ${enc.bed ? '· Leito ' + enc.bed : (enc.room ? '· ' + enc.room : '')}
          </span>
          <span style="font-size: 0.74rem; color: ${statusColor}; font-weight: 700; background: rgba(0,0,0,0.25); padding: 2px 8px; border-radius: 6px;">${statusBadge}</span>
        </div>
      `;
    }

    // Botão Gerar PDF direto do cabeçalho do PEP
    document.getElementById('btn-pep-pdf-header')?.addEventListener('click', () => {
      const subjectiveContent = document.getElementById('pep-subjective')?.value || '';
      const objectiveContent = document.getElementById('pep-objective')?.value || '';
      const assessmentContent = document.getElementById('pep-assessment')?.value || '';
      const planContent = document.getElementById('pep-plan')?.value || '';

      if (window.localDB && typeof window.localDB.update === 'function' && enc.id) {
        window.localDB.update('encounters', enc.id, {
          subjectiveContent,
          objectiveContent,
          assessmentContent,
          planContent,
          notes: planContent,
          diagnosis: assessmentContent
        });
      }

      if (typeof window.generatePatientPDF === 'function') {
        window.generatePatientPDF(enc.patientId || enc.id, enc.patientName || 'Paciente');
      }
    });

    // Botões de Cabeçalho (Telemedicina e WhatsApp)
    document.getElementById('btn-pep-telemed-header')?.addEventListener('click', () => {
      openTelemedicineModal({
        id: enc.patientId || enc.id,
        patientName: enc.patientName,
        doctorName: state.user?.name || enc.doctorName || 'Dr. Médico Assistente'
      });
    });

    document.getElementById('btn-pep-whatsapp-header')?.addEventListener('click', () => {
      const msg = generateWhatsAppClinicalMessage({
        patientName: enc.patientName,
        doctorName: state.user?.name || enc.doctorName,
        diagnosis: document.getElementById('pep-assessment')?.value || 'Atendimento Médico Especializado',
        plan: document.getElementById('pep-plan')?.value || 'Seguir orientações e prescrição em anexo.',
        room: enc.room
      });
      sendToWhatsApp(enc.phone || '', msg);
    });

    let notes = {};
    try {
      const notesRes = await apiFetch('/api/encounters/' + (enc.id || encounterId) + '/notes');
      if (notesRes && notesRes.ok) {
        const notesData = await notesRes.json();
        notes = (notesData && typeof notesData === 'object') ? (notesData.data || notesData) : {};
      }
    } catch (e) {}

    const bodyEl = document.getElementById('pep-modal-body');
    if (!bodyEl) return;

    const perms = (typeof getRolePermissions === 'function') ? getRolePermissions(state.user) : { canSignPEP: true, label: 'Usuário' };
    const isReadOnly = !perms.canSignPEP;

    // Cálculo do Escore MEWS e Risco Clínico
    const mewsData = calculateMEWS(enc);

    // Buscar histórico de atendimentos anteriores do paciente
    const pastEncs = allPatientEncs.filter(e => e.id !== enc.id);

    // Buscar dados cadastrais completos do paciente (Recepção / Admissão)
    let patientData = {};
    try {
      const allPatients = (state.patients || dataCache.patients || (window.localDB ? window.localDB.list('patients') : [])) || [];
      patientData = allPatients.find(p => 
        (enc.patientId && String(p.id) === String(enc.patientId)) || 
        (p.fullName && enc.patientName && p.fullName.toLowerCase().trim() === enc.patientName.toLowerCase().trim())
      ) || {};
    } catch(e) {}

    let ageDisplay = '';
    if (patientData.birthDate) {
      const bDate = new Date(patientData.birthDate);
      if (!isNaN(bDate.getTime())) {
        const today = new Date();
        let age = today.getFullYear() - bDate.getFullYear();
        const m = today.getMonth() - bDate.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < bDate.getDate())) age--;
        const parts = patientData.birthDate.split('-');
        const formattedBirth = parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : patientData.birthDate;
        ageDisplay = `${age} anos (${formattedBirth})`;
      }
    }

    bodyEl.innerHTML = `
      ${isReadOnly ? `
        <div style="background: rgba(245, 158, 11, 0.12); border: 1px solid rgba(245, 158, 11, 0.35); border-radius: 10px; padding: 12px 16px; margin-bottom: 18px; display: flex; align-items: center; gap: 10px; color: #fbbf24; font-size: 0.85rem;">
          <i class="fa-solid fa-lock" style="font-size: 1.1rem;"></i>
          <div>
            <strong>Modo Somente Leitura (Auditoria):</strong> Seu perfil (<strong>${perms.label}</strong>) possui acesso para consulta ao prontuário. A evolução clínica, prescrição e assinatura médica são restritas a médicos habilitados (CFM/CRM).
          </div>
        </div>
      ` : ''}

      <!-- Barra de Navegação de Episódios de Cuidado / PEPs Anteriores -->
      ${allPatientEncs.length > 1 ? `
        <div style="background: linear-gradient(135deg, rgba(30, 41, 59, 0.95), rgba(15, 23, 42, 0.95)); border: 1px solid rgba(139, 92, 246, 0.35); border-radius: 12px; padding: 10px 16px; margin-bottom: 16px; display: flex; justify-content: space-between; align-items: center; gap: 12px; flex-wrap: wrap; box-shadow: 0 4px 16px rgba(0,0,0,0.25);">
          <div style="display: flex; align-items: center; gap: 10px;">
            <div style="width: 32px; height: 32px; border-radius: 8px; background: rgba(139,92,246,0.2); color: #c084fc; display: flex; align-items: center; justify-content: center; font-size: 0.95rem;">
              <i class="fa-solid fa-layer-group"></i>
            </div>
            <div>
              <div style="font-size: 0.86rem; font-weight: 700; color: #fff;">
                Episódio Atual: <strong style="color: #38bdf8;">${pepNumber}</strong>
              </div>
              <div style="font-size: 0.74rem; color: #94a3b8;">
                Este paciente possui <strong style="color: #c084fc;">${allPatientEncs.length} episódios/PEPs</strong> arquivados no prontuário.
              </div>
            </div>
          </div>
          <div style="display: flex; align-items: center; gap: 8px;">
            <label for="select-pep-episode" style="font-size: 0.78rem; font-weight: 600; color: #cbd5e1; white-space: nowrap;">
              <i class="fa-solid fa-arrow-right-arrow-left" style="margin-right: 4px; color: #818cf8;"></i> Alternar PEP:
            </label>
            <select id="select-pep-episode" class="form-input" style="background: #0f172a; color: #fff; border: 1px solid rgba(139,92,246,0.4); border-radius: 8px; padding: 6px 12px; font-size: 0.8rem; font-weight: 600; cursor: pointer; max-width: 330px;">
              ${allPatientEncs.map(pe => {
                const pNum = pe.pepNumber || ('PEP-' + (pe.type === 'Internacao' ? 'INT' : (pe.type === 'Ambulatorio' ? 'AMB' : 'PS')) + '-2026-' + String(pe.id).replace(/\D/g, '').slice(-4).padStart(4, '0'));
                const pType = pe.type === 'Internacao' ? 'Internação' : (pe.type === 'Ambulatorio' ? 'Ambulatório' : 'Pronto-Socorro');
                const pStat = pe.status === 'Finalizado' ? 'Finalizado' : 'Ativo';
                const isCurrent = String(pe.id) === String(enc.id);
                return `<option value="${pe.id}" ${isCurrent ? 'selected' : ''}>${isCurrent ? '▶ ' : ''}${pNum} — ${pType} [${pStat}] ${pe.bed ? '· Leito ' + pe.bed : ''}</option>`;
              }).join('')}
            </select>
          </div>
        </div>
      ` : ''}

      <!-- Banner de Episódio Finalizado (Modo Consulta Histórica) -->
      ${enc.status === 'Finalizado' ? `
        <div style="background: rgba(59, 130, 246, 0.12); border: 1px solid rgba(59, 130, 246, 0.35); border-radius: 10px; padding: 12px 16px; margin-bottom: 14px; display: flex; justify-content: space-between; align-items: center; color: #93c5fd; font-size: 0.84rem; flex-wrap: wrap; gap: 10px;">
          <div style="display: flex; align-items: center; gap: 10px;">
            <i class="fa-solid fa-clock-rotate-left" style="font-size: 1.1rem; color: #60a5fa;"></i>
            <div>
              <strong>Episódio de Cuidado Concluído (${pepNumber}):</strong><br>
              <span style="font-size: 0.78rem; color: #cbd5e1;">${enc.closingReason || enc.outcome || 'Atendimento finalizado com sucesso'}. Registro médico arquivado para consulta e auditoria.</span>
            </div>
          </div>
          <span style="font-size: 0.74rem; background: rgba(59,130,246,0.2); padding: 3px 10px; border-radius: 12px; font-weight: 700; color: #60a5fa; border: 1px solid rgba(59,130,246,0.4);">
            ARQUIVADO
          </span>
        </div>
      ` : ''}

      <!-- Banner de Continuidade (Internação vinculada ao PEP do PS) -->
      ${(enc.type === 'Internacao' && enc.previousEncounterId) ? `
        <div style="background: rgba(16, 185, 129, 0.1); border: 1px solid rgba(16, 185, 129, 0.25); border-radius: 10px; padding: 10px 16px; margin-bottom: 14px; display: flex; justify-content: space-between; align-items: center; color: #86efac; font-size: 0.84rem; flex-wrap: wrap; gap: 10px;">
          <div style="display: flex; align-items: center; gap: 8px;">
            <i class="fa-solid fa-link" style="color: #34d399;"></i>
            <span><strong>Internação Hospitalar Vinculada:</strong> Atendimento originado da emergência/PS (${enc.previousPepNumber || 'PEP Anterior'}).</span>
          </div>
          <button type="button" class="btn btn-sm" onclick="openPEPModal('${enc.previousEncounterId}')" style="background: rgba(16,185,129,0.2); border: 1px solid rgba(16,185,129,0.4); color: #4ade80; font-size: 0.74rem; font-weight: 700; border-radius: 6px; padding: 4px 12px; cursor: pointer;">
            <i class="fa-solid fa-eye"></i> Visualizar PEP do PS
          </button>
        </div>
      ` : ''}

      <!-- Ficha de Identificação Cadastral do Paciente (Recepção / Admissão) -->
      <div style="background: linear-gradient(135deg, rgba(30, 41, 59, 0.95), rgba(15, 23, 42, 0.95)); border: 1.5px solid rgba(99, 102, 241, 0.3); border-radius: 12px; padding: 14px 18px; margin-bottom: 16px; box-shadow: 0 4px 16px rgba(0,0,0,0.25);">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; border-bottom: 1px solid rgba(255,255,255,0.08); padding-bottom: 8px;">
          <div style="display: flex; align-items: center; gap: 8px;">
            <i class="fa-solid fa-id-card-clip" style="color: #818cf8; font-size: 1.1rem;"></i>
            <span style="font-weight: 700; color: #fff; font-size: 0.92rem;">Dados Cadastrais do Paciente (Ato do Cadastro / Recepção)</span>
          </div>
          <span style="font-size: 0.75rem; color: #94a3b8; background: rgba(255,255,255,0.06); padding: 2px 8px; border-radius: 6px;">
            ID: <strong style="color: #cbd5e1;">${patientData.id || enc.patientId || 'N/A'}</strong>
          </span>
        </div>

        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 10px 16px; font-size: 0.82rem;">
          <div>
            <span style="color: var(--text-muted); font-size: 0.74rem; display: block;">Nome Completo:</span>
            <strong style="color: #ffffff; font-size: 0.92rem;">${patientData.fullName || enc.patientName || 'Não Informado'}</strong>
          </div>
          <div>
            <span style="color: var(--text-muted); font-size: 0.74rem; display: block;">CPF / Nascimento:</span>
            <strong style="color: #e2e8f0; font-family: monospace;">${patientData.cpf || enc.cpf || 'Não Informado'}</strong> ${ageDisplay ? `&bull; <span style="color: #a5b4fc;">${ageDisplay}</span>` : ''}
          </div>
          <div>
            <span style="color: var(--text-muted); font-size: 0.74rem; display: block;">Convênio / Carteirinha:</span>
            <strong style="color: #34d399;">${patientData.healthPlan || 'Particular'}</strong> ${patientData.cardNumber ? `<span style="color: #94a3b8; font-size: 0.75rem;">(${patientData.cardNumber})</span>` : ''}
          </div>
          <div>
            <span style="color: var(--text-muted); font-size: 0.74rem; display: block;">Filiação (Nome da Mãe):</span>
            <strong style="color: #cbd5e1;">${patientData.motherName || 'Não Informado'}</strong>
          </div>
          <div>
            <span style="color: var(--text-muted); font-size: 0.74rem; display: block;">Telefone / WhatsApp:</span>
            <strong style="color: #60a5fa;">${patientData.cellphone || patientData.phone || enc.phone || 'Não Informado'}</strong>
          </div>
          <div>
            <span style="color: var(--text-muted); font-size: 0.74rem; display: block;">Endereço / Cidade:</span>
            <strong style="color: #cbd5e1;">${(patientData.city || patientData.address) ? `${patientData.address || ''}${patientData.number ? ', ' + patientData.number : ''}${patientData.neighborhood ? ' - ' + patientData.neighborhood : ''} (${patientData.city || ''})` : 'Não Informado'}</strong>
          </div>
          ${patientData.responsibleName ? `
            <div>
              <span style="color: var(--text-muted); font-size: 0.74rem; display: block;">Responsável Legal:</span>
              <strong style="color: #f59e0b;">${patientData.responsibleName}</strong> <small style="color: #94a3b8;">(${patientData.responsibleRelationship || 'Acompanhante'})</small>
            </div>
          ` : ''}
          ${patientData.allergies ? `
            <div style="grid-column: 1 / -1; background: rgba(239, 68, 68, 0.12); border: 1px solid rgba(239, 68, 68, 0.3); border-radius: 6px; padding: 6px 10px; color: #fca5a5;">
              <i class="fa-solid fa-triangle-exclamation"></i> <strong>Alergias Cadastradas:</strong> ${patientData.allergies}
            </div>
          ` : ''}
        </div>
      </div>

      <!-- Painel de Histórico Pregresso do Paciente -->
      <div style="background: rgba(99, 102, 241, 0.08); border: 1px solid rgba(99, 102, 241, 0.25); border-radius: 12px; padding: 12px 16px; margin-bottom: 16px;">
        <div style="display: flex; justify-content: space-between; align-items: center; cursor: pointer;" id="pep-history-toggle-header">
          <div style="display: flex; align-items: center; gap: 8px; font-weight: 700; color: #a5b4fc; font-size: 0.88rem;">
            <i class="fa-solid fa-clock-rotate-left"></i> Histórico Pregresso & Atendimentos Anteriores (${pastEncs.length})
          </div>
          <button type="button" id="btn-toggle-pep-history-inner" class="btn btn-sm" style="background: rgba(99,102,241,0.15); border: 1px solid rgba(99,102,241,0.3); color: #c7d2fe; font-size: 0.74rem; padding: 3px 10px; border-radius: 6px; cursor: pointer;">
            <i class="fa-solid fa-chevron-down" id="pep-history-chevron-icon"></i> <span id="pep-history-toggle-text">Ver Histórico</span>
          </button>
        </div>

        <div id="pep-history-drawer-content" style="display: none; margin-top: 12px; border-top: 1px dashed rgba(99,102,241,0.25); padding-top: 10px; max-height: 220px; overflow-y: auto;">
          ${pastEncs.length === 0 ? `
            <div style="font-size: 0.8rem; color: var(--text-muted); text-align: center; padding: 8px;">
              Este é o primeiro atendimento registrado para este paciente no sistema.
            </div>
          ` : `
            <div style="display: flex; flex-direction: column; gap: 8px;">
              ${pastEncs.map(pe => `
                <div style="background: var(--bg-secondary); border: 1px solid var(--border-color); border-radius: 8px; padding: 10px 14px; font-size: 0.8rem;">
                  <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                    <strong style="color: #fff;">📅 ${pe.entryTime || (pe.created_at ? new Date(pe.created_at).toLocaleDateString('pt-BR') : 'Atendimento Anterior')} — ${pe.doctorName || 'Médico Assistente'}</strong>
                    <span style="font-size: 0.7rem; padding: 2px 6px; border-radius: 4px; background: rgba(99,102,241,0.15); color: #a5b4fc;">${pe.status || 'Concluído'}</span>
                  </div>
                  <div style="color: var(--text-secondary);"><strong style="color: var(--text-primary);">Queixa / Anamnese:</strong> ${pe.complaints || pe.reason || 'Consulta médica'}</div>
                  ${(pe.assessmentContent || pe.notes) ? `<div style="color: #93c5fd; margin-top: 2px;"><strong style="color: var(--text-primary);">Diagnóstico / Conduta:</strong> ${pe.assessmentContent || pe.notes}</div>` : ''}
                </div>
              `).join('')}
            </div>
          `}
        </div>
      </div>

      <!-- Sinais Vitais & Escore MEWS -->
      <div style="background: var(--bg-tertiary); border: 1px solid ${mewsData.isSepsisAlert ? '#ef4444' : 'var(--border-color)'}; border-radius: 12px; padding: 12px 16px; margin-bottom: 18px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px; ${mewsData.isSepsisAlert ? 'box-shadow: 0 0 16px rgba(239,68,68,0.3);' : ''}">
        <div style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap;">
          <div>
            <span style="font-size:0.72rem; color:var(--text-muted); font-weight:600; text-transform:uppercase;">Manchester:</span>
            <span style="display:inline-block; margin-left:6px; padding:2px 10px; border-radius:20px; font-weight:700; font-size:0.78rem; background:rgba(239,68,68,0.15); color:#f87171; border:1px solid rgba(239,68,68,0.3);">${enc.manchesterColor || 'AMARELO'}</span>
          </div>
          <div style="background: ${mewsData.badgeBg}; border: 1px solid ${mewsData.badgeColor}; color: ${mewsData.badgeColor}; padding: 3px 10px; border-radius: 16px; font-size: 0.76rem; font-weight: 700; display: flex; align-items: center; gap: 5px;">
            <i class="fa-solid fa-heart-pulse"></i> Escore MEWS: ${mewsData.score} · ${mewsData.riskLevel}
          </div>
        </div>
        <div style="font-size:0.82rem; color:var(--text-primary); font-family:monospace;">
          <strong>PA:</strong> ${enc.bloodPressure || '120/80'} | <strong>Temp:</strong> ${enc.temperatureCelsius || 36.5}°C | <strong>FC:</strong> ${enc.heartRateBpm || 80} bpm | <strong>SpO2:</strong> ${enc.oxygenSaturation || 98}%
        </div>
      </div>

      ${mewsData.isSepsisAlert ? `
        <div style="background: rgba(239,68,68,0.15); border: 1.5px solid #ef4444; border-radius: 10px; padding: 12px 16px; margin-bottom: 16px; color: #fca5a5; font-size: 0.84rem; display: flex; align-items: center; gap: 10px; animation: pulse 2s infinite;">
          <i class="fa-solid fa-triangle-exclamation" style="font-size: 1.3rem; color: #ef4444;"></i>
          <div>
            <strong style="color: #fff; font-size: 0.88rem;">ALERTA PREDITIVO DE SEPSE / DETERIORAÇÃO:</strong><br>
            ${mewsData.recommendation}
          </div>
        </div>
      ` : ''}

      <!-- Formulário SOAP / Prontuário com Ditado por Voz -->
      <form id="pep-form" style="display:flex; flex-direction:column; gap:14px;">
        
        <div>
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
            <label class="form-label" style="font-weight:600; color:var(--text-primary); margin: 0; font-size: 0.88rem;">Subjetivo (Anamnese & Queixa):</label>
            ${!isReadOnly ? `<button type="button" id="btn-voice-subj" class="btn btn-sm btn-voice-dictation" style="font-size:0.72rem; padding:2px 8px; border-radius:6px; background:rgba(99,102,241,0.15); color:#a5b4fc; border:1px solid rgba(99,102,241,0.3); cursor:pointer;"><i class="fa-solid fa-microphone"></i> Ditar</button>` : ''}
          </div>
          <textarea id="pep-subjective" class="form-input" ${isReadOnly ? 'readonly style="width:100%; min-height:65px; resize:none; opacity:0.85; cursor:not-allowed;"' : 'style="width:100%; min-height:65px; resize:vertical;"'} placeholder="Relato do paciente, evolução dos sintomas...">${notes.subjectiveContent || enc.subjectiveContent || enc.complaints || ''}</textarea>
        </div>

        <div>
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
            <label class="form-label" style="font-weight:600; color:var(--text-primary); margin: 0; font-size: 0.88rem;">Objetivo (Exame Físico / Achados):</label>
            ${!isReadOnly ? `<button type="button" id="btn-voice-obj" class="btn btn-sm btn-voice-dictation" style="font-size:0.72rem; padding:2px 8px; border-radius:6px; background:rgba(99,102,241,0.15); color:#a5b4fc; border:1px solid rgba(99,102,241,0.3); cursor:pointer;"><i class="fa-solid fa-microphone"></i> Ditar</button>` : ''}
          </div>
          <textarea id="pep-objective" class="form-input" ${isReadOnly ? 'readonly style="width:100%; min-height:65px; resize:none; opacity:0.85; cursor:not-allowed;"' : 'style="width:100%; min-height:65px; resize:vertical;"'} placeholder="Exame físico, ausculta, estado geral...">${notes.objectiveContent || enc.objectiveContent || enc.physicalExam || ''}</textarea>
        </div>

        <div class="autocomplete-container" style="position:relative;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
            <label class="form-label" style="font-weight:600; color:var(--text-primary); margin: 0; font-size: 0.88rem;">Avaliação (Diagnóstico / CID-10):</label>
            ${!isReadOnly ? `<button type="button" id="btn-voice-ass" class="btn btn-sm btn-voice-dictation" style="font-size:0.72rem; padding:2px 8px; border-radius:6px; background:rgba(99,102,241,0.15); color:#a5b4fc; border:1px solid rgba(99,102,241,0.3); cursor:pointer;"><i class="fa-solid fa-microphone"></i> Ditar</button>` : ''}
          </div>
          <textarea id="pep-assessment" class="form-input pep-cid-input" ${isReadOnly ? 'readonly style="width:100%; min-height:55px; resize:none; opacity:0.85; cursor:not-allowed;"' : 'style="width:100%; min-height:55px; resize:vertical;"'} placeholder="Hipótese diagnóstica ou CID-10..." autocomplete="off">${notes.assessmentContent || enc.assessmentContent || enc.diagnosis || ''}</textarea>
          <div id="pep-cid-dropdown" class="autocomplete-dropdown"></div>
        </div>

        <div>
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
            <label class="form-label" style="font-weight:600; color:var(--text-primary); margin: 0; font-size: 0.88rem;">Plano Terapêutico & Prescrição:</label>
            ${!isReadOnly ? `<button type="button" id="btn-voice-plan" class="btn btn-sm btn-voice-dictation" style="font-size:0.72rem; padding:2px 8px; border-radius:6px; background:rgba(99,102,241,0.15); color:#a5b4fc; border:1px solid rgba(99,102,241,0.3); cursor:pointer;"><i class="fa-solid fa-microphone"></i> Ditar</button>` : ''}
          </div>
          <textarea id="pep-plan" class="form-input" ${isReadOnly ? 'readonly style="width:100%; min-height:65px; resize:none; opacity:0.85; cursor:not-allowed;"' : 'style="width:100%; min-height:65px; resize:vertical;"'} placeholder="Conduta médica, medicação receitada, orientações de alta...">${notes.planContent || enc.planContent || enc.plan || enc.prescription || ''}</textarea>
          
          <!-- Banner Dinâmico CDSS 4D de Apoio à Decisão Farmacológica -->
          <div id="pep-drug-interactions-alert" style="display: none; margin-top: 10px; border-radius: 8px; overflow: hidden; border: 1.5px solid #ef4444; box-shadow: 0 4px 14px rgba(0,0,0,0.25);">
            <div id="pep-cdss-header" style="background: rgba(239, 68, 68, 0.22); padding: 8px 12px; display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid rgba(239,68,68,0.3);">
              <span style="font-weight: 700; font-size: 0.84rem; color: #fff; display: flex; align-items: center; gap: 7px;">
                <i class="fa-solid fa-shield-virus" style="color: #ef4444;"></i> Alertas Farmacológicos & Segurança do Paciente (CDSS 4D)
              </span>
              <span id="pep-cdss-count-badge" style="background: #ef4444; color: #fff; font-size: 0.72rem; padding: 2px 8px; border-radius: 10px; font-weight: bold;"></span>
            </div>
            <div id="pep-cdss-list" style="padding: 10px 12px; background: rgba(15, 23, 42, 0.85); display: flex; flex-direction: column; gap: 8px; max-height: 240px; overflow-y: auto;"></div>
          </div>
        </div>

        <div style="margin-top: 6px; background: var(--bg-secondary); padding: 12px; border-radius: 8px; border: 1px solid var(--border-color);">
          <label class="form-label" style="font-weight:600; color:var(--text-primary); margin-bottom:6px; display:block;">
            <i class="fa-solid fa-route" style="color: #6366f1; margin-right: 6px;"></i> Desfecho do Atendimento:
          </label>
          <select id="pep-outcome" class="form-input" style="width:100%;" ${isReadOnly ? 'disabled' : ''}>
            <option value="alta" selected>Alta Médica (Encerrar Consulta)</option>
            <option value="observacao">Manter em Observação Médica (PS)</option>
            <option value="internacao">Solicitar Internação (Transferência de Leito)</option>
          </select>
        </div>

        <div style="display:flex; justify-content:space-between; align-items:center; gap:12px; margin-top:10px; flex-wrap:wrap;">
          <div>
            <span style="font-size: 0.75rem; color: #34d399; display: inline-flex; align-items: center; gap: 5px;">
              <i class="fa-solid fa-shield-halved"></i> Autenticação Digital CFM nº 1.821
            </span>
          </div>

          <div style="display: flex; gap: 10px;">
            ${isReadOnly ? `
              <button type="button" class="btn" onclick="document.getElementById('pep-modal')?.remove()" style="background:var(--bg-tertiary); border:1px solid var(--border-color); color:var(--text-primary); padding:8px 18px;">
                <i class="fa-solid fa-xmark" style="margin-right:6px;"></i> Fechar Prontuário
              </button>
            ` : `
              <button type="button" id="btn-save-pep" class="btn" style="background:var(--bg-tertiary); border:1px solid var(--border-color); color:var(--text-primary); padding:8px 16px;">
                <i class="fa-solid fa-floppy-disk" style="margin-right:6px;"></i> Salvar Rascunho
              </button>
              <button type="submit" class="btn btn-primary" style="padding:8px 20px; background:#0284c7; border:none; box-shadow: 0 2px 8px rgba(2,132,199,0.35);">
                <i class="fa-solid fa-file-signature" style="margin-right:6px;"></i> Assinar & Encaminhar
              </button>
            `}
          </div>
        </div>
      </form>
    `;

    // Eventos de Ditado por Voz para cada campo SOAP
    if (!isReadOnly) {
      document.getElementById('btn-voice-subj')?.addEventListener('click', () => {
        startVoiceDictation('pep-subjective', 'btn-voice-subj');
      });
      document.getElementById('btn-voice-obj')?.addEventListener('click', () => {
        startVoiceDictation('pep-objective', 'btn-voice-obj');
      });
      document.getElementById('btn-voice-ass')?.addEventListener('click', () => {
        startVoiceDictation('pep-assessment', 'btn-voice-ass');
      });
      document.getElementById('btn-voice-plan')?.addEventListener('click', () => {
        startVoiceDictation('pep-plan', 'btn-voice-plan', (text) => {
          checkPlanInteractions(text);
        });
      });

      // Validador de Interações Medicamentosas & Alergias no Plano cruzado com a Anamnese
      const planTextarea = document.getElementById('pep-plan');
      const subjectiveTextarea = document.getElementById('pep-subjective');
      const objectiveTextarea = document.getElementById('pep-objective');
      const assessmentTextarea = document.getElementById('pep-assessment');

      const getAnamnesisContext = () => {
        const subjText = subjectiveTextarea?.value || notes.subjectiveContent || '';
        const objText = objectiveTextarea?.value || notes.objectiveContent || '';
        const assText = assessmentTextarea?.value || notes.assessmentContent || '';
        const complaints = enc.complaints || '';
        const patientNotes = enc.patientNotes || enc.notes || '';
        const allergies = patientData.allergies || '';
        return [subjText, objText, assText, complaints, patientNotes, allergies].filter(Boolean).join(' | ');
      };

      const checkPlanInteractions = (content) => {
        const anamnesisCtx = getAnamnesisContext();
        const interactions = checkDrugInteractions(content || '', anamnesisCtx);
        const alertBox = document.getElementById('pep-drug-interactions-alert');
        const countBadge = document.getElementById('pep-cdss-count-badge');
        const listEl = document.getElementById('pep-cdss-list');

        if (interactions && interactions.length > 0 && alertBox && listEl) {
          alertBox.style.display = 'block';
          if (countBadge) countBadge.textContent = `${interactions.length} ${interactions.length === 1 ? 'alerta' : 'alertas'}`;

          const hasCritical = interactions.some(i => i.severity === 'Critica');
          alertBox.style.border = hasCritical ? '1.5px solid #ef4444' : '1.5px solid #f59e0b';

          listEl.innerHTML = interactions.map(item => {
            let badgeBg = '#f59e0b';
            let badgeText = 'MODERADA';
            let icon = 'fa-triangle-exclamation';

            if (item.severity === 'Critica') {
              badgeBg = '#ef4444';
              badgeText = 'CRÍTICA / CONTRAINDICADA';
              icon = 'fa-ban';
            } else if (item.severity === 'Grave') {
              badgeBg = '#f97316';
              badgeText = 'GRAVE';
              icon = 'fa-triangle-exclamation';
            } else if (item.dimension === 'DUPLICATION') {
              badgeBg = '#3b82f6';
              badgeText = 'DUPLICIDADE';
              icon = 'fa-clone';
            }

            return `
              <div style="background: rgba(30, 41, 59, 0.9); border-left: 4px solid ${badgeBg}; padding: 8px 10px; border-radius: 4px;">
                <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 3px;">
                  <span style="font-weight: 700; font-size: 0.8rem; color: #fff; display: flex; align-items: center; gap: 6px;">
                    <i class="fa-solid ${icon}" style="color: ${badgeBg};"></i> ${item.title}
                  </span>
                  <span style="background: ${badgeBg}; color: #fff; font-size: 0.65rem; font-weight: bold; padding: 2px 6px; border-radius: 4px; text-transform: uppercase;">
                    ${badgeText}
                  </span>
                </div>
                <div style="font-size: 0.76rem; color: #cbd5e1; line-height: 1.35; margin-bottom: 4px;">
                  ${item.desc}
                </div>
                <div style="font-size: 0.74rem; font-weight: 600; color: #fde047; display: flex; align-items: flex-start; gap: 4px;">
                  <span>💡</span> <span>Conduta Recomendada: ${item.action}</span>
                </div>
              </div>
            `;
          }).join('');
        } else if (alertBox) {
          alertBox.style.display = 'none';
        }
      };

      planTextarea?.addEventListener('input', (e) => {
        checkPlanInteractions(e.target.value);
      });

      subjectiveTextarea?.addEventListener('input', () => {
        checkPlanInteractions(planTextarea?.value || '');
      });

      objectiveTextarea?.addEventListener('input', () => {
        checkPlanInteractions(planTextarea?.value || '');
      });

      assessmentTextarea?.addEventListener('input', () => {
        checkPlanInteractions(planTextarea?.value || '');
      });

      // Checagem inicial
      if (notes.planContent || planTextarea?.value) {
        checkPlanInteractions(notes.planContent || planTextarea?.value || '');
      }
    }

    // Listener do Histórico Pregresso
    const toggleHistory = () => {
      const drawer = document.getElementById('pep-history-drawer-content');
      const chevron = document.getElementById('pep-history-chevron-icon');
      const toggleText = document.getElementById('pep-history-toggle-text');
      if (drawer) {
        const isClosed = drawer.style.display === 'none';
        drawer.style.display = isClosed ? 'block' : 'none';
        if (chevron) chevron.className = isClosed ? 'fa-solid fa-chevron-up' : 'fa-solid fa-chevron-down';
        if (toggleText) toggleText.textContent = isClosed ? 'Ocultar' : 'Ver Histórico';
      }
    };

    document.getElementById('select-pep-episode')?.addEventListener('change', (e) => {
      const selectedId = e.target.value;
      if (selectedId && selectedId !== enc.id) {
        stopVoiceDictation();
        modal.remove();
        openPEPModal(selectedId);
      }
    });

    document.getElementById('pep-history-toggle-header')?.addEventListener('click', toggleHistory);
    document.getElementById('btn-pep-history-header')?.addEventListener('click', () => {
      toggleHistory();
      const drawer = document.getElementById('pep-history-drawer-content');
      if (drawer && drawer.style.display === 'block') {
        drawer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    });

    document.getElementById('btn-save-pep')?.addEventListener('click', async () => {
      await savePEPData(encounterId, false);
    });

    document.getElementById('pep-form')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      await savePEPData(encounterId, true);
    });

    if (typeof window.setupCidAutocomplete === 'function') {
      window.setupCidAutocomplete();
    }

  } catch (e) {
    document.getElementById('pep-modal-body').innerHTML = `
      <div style="text-align: center; color: #f87171; padding: 40px;">Erro ao carregar prontuário do paciente.</div>
    `;
  }
};

export function showCDSSCriticalOverrideModal(criticalBlockers = []) {
  return new Promise((resolve) => {
    const existing = document.getElementById('cdss-override-modal');
    if (existing) existing.remove();

    const modal = document.createElement('div');
    modal.id = 'cdss-override-modal';
    modal.className = 'modal-overlay';
    modal.style.cssText = `
      display: flex;
      align-items: center;
      justify-content: center;
      background: rgba(5, 7, 20, 0.88);
      backdrop-filter: blur(12px);
      z-index: 200000;
      padding: 16px;
      position: fixed;
      inset: 0;
    `;

    modal.innerHTML = `
      <div style="background: #0f172a; border: 1.5px solid rgba(239, 68, 68, 0.6); border-radius: 18px; max-width: 620px; width: 100%; box-shadow: 0 25px 70px rgba(239, 68, 68, 0.25), 0 10px 30px rgba(0,0,0,0.8); overflow: hidden; display: flex; flex-direction: column;">
        
        <!-- Header -->
        <div style="background: linear-gradient(135deg, rgba(239,68,68,0.25), rgba(15,23,42,0.95)); padding: 18px 24px; border-bottom: 1px solid rgba(239, 68, 68, 0.35); display: flex; align-items: center; justify-content: space-between; gap: 12px;">
          <div style="display: flex; align-items: center; gap: 12px;">
            <div style="width: 44px; height: 44px; border-radius: 12px; background: rgba(239,68,68,0.2); border: 1px solid rgba(239,68,68,0.5); display: flex; align-items: center; justify-content: center; color: #ef4444; font-size: 1.3rem; box-shadow: 0 0 16px rgba(239,68,68,0.4);">
              <i class="fa-solid fa-shield-virus"></i>
            </div>
            <div>
              <div style="font-family: Outfit, sans-serif; font-size: 1.15rem; font-weight: 700; color: #ffffff; display: flex; align-items: center; gap: 8px;">
                Alerta Crítico de Farmacovigilância
                <span style="font-size: 0.65rem; background: #ef4444; color: #fff; padding: 2px 8px; border-radius: 10px; font-weight: 800; text-transform: uppercase;">CDSS 4D</span>
              </div>
              <div style="font-size: 0.76rem; color: #94a3b8; margin-top: 2px;">
                Conformidade Médico-Legal &middot; Resolução CFM nº 1.821/2007
              </div>
            </div>
          </div>
        </div>

        <!-- Body -->
        <div style="padding: 20px 24px; max-height: 60vh; overflow-y: auto; display: flex; flex-direction: column; gap: 14px;">
          <div style="color: #fca5a5; font-size: 0.86rem; line-height: 1.45; background: rgba(239,68,68,0.1); border-left: 3px solid #ef4444; padding: 10px 14px; border-radius: 6px;">
            O motor de inteligência farmacológica detectou <strong>${criticalBlockers.length} contraindicações graves/críticas</strong> na prescrição que oferecem risco de colapso hemodinâmico ou evento adverso severo:
          </div>

          <div style="display: flex; flex-direction: column; gap: 10px;">
            ${criticalBlockers.map((item) => `
              <div style="background: rgba(30, 41, 59, 0.8); border: 1px solid rgba(239,68,68,0.35); border-radius: 10px; padding: 12px 14px;">
                <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 6px;">
                  <strong style="color: #fff; font-size: 0.88rem; display: flex; align-items: center; gap: 6px;">
                    <i class="fa-solid fa-triangle-exclamation" style="color: #ef4444;"></i> ${item.title}
                  </strong>
                  <span style="background: #ef4444; color: #fff; font-size: 0.64rem; font-weight: 800; padding: 2px 7px; border-radius: 4px;">CRÍTICA</span>
                </div>
                <div style="font-size: 0.8rem; color: #cbd5e1; line-height: 1.4; margin-bottom: 6px;">
                  ${item.desc}
                </div>
                <div style="font-size: 0.78rem; font-weight: 600; color: #fde047; background: rgba(0,0,0,0.3); padding: 6px 10px; border-radius: 6px;">
                  💡 <strong>Conduta Recomendada:</strong> ${item.action}
                </div>
              </div>
            `).join('')}
          </div>

          <div style="margin-top: 4px;">
            <label style="display: block; font-size: 0.78rem; font-weight: 600; color: var(--text-muted); margin-bottom: 5px;">
              <i class="fa-solid fa-pen-nib" style="color: #60a5fa; margin-right: 4px;"></i> Justificativa Clínica do Médico Assistente (Opcional para Auditoria CFM):
            </label>
            <textarea id="cdss-override-reason" class="form-input" style="width: 100%; min-height: 50px; font-size: 0.82rem; resize: vertical;" placeholder="Informe a justificativa médica caso opte por manter a prescrição sob monitorização intensiva..."></textarea>
          </div>
        </div>

        <!-- Footer Actions -->
        <div style="padding: 16px 24px; background: #1e293b; border-top: 1px solid #334155; display: flex; justify-content: flex-end; align-items: center; gap: 12px;">
          <button type="button" id="btn-cdss-cancel" class="btn" style="background: var(--bg-tertiary); border: 1px solid var(--border-color); color: var(--text-primary); padding: 9px 18px; font-size: 0.85rem; font-weight: 600; border-radius: 10px; cursor: pointer;">
            <i class="fa-solid fa-arrow-left" style="margin-right: 6px;"></i> Revisar Prescrição
          </button>
          <button type="button" id="btn-cdss-confirm" class="btn" style="background: linear-gradient(135deg, #ef4444, #b91c1c); border: none; color: #fff; padding: 9px 20px; font-size: 0.85rem; font-weight: 700; border-radius: 10px; cursor: pointer; box-shadow: 0 4px 14px rgba(239, 68, 68, 0.4);">
            <i class="fa-solid fa-signature" style="margin-right: 6px;"></i> Confirmar Conduta & Assinar
          </button>
        </div>

      </div>
    `;

    document.body.appendChild(modal);

    const closeModal = (confirmed) => {
      modal.remove();
      resolve(confirmed);
    };

    document.getElementById('btn-cdss-cancel')?.addEventListener('click', () => closeModal(false));
    document.getElementById('btn-cdss-confirm')?.addEventListener('click', () => closeModal(true));
  });
}

async function savePEPData(encounterId, shouldFinalize) {
  const perms = (typeof getRolePermissions === 'function') ? getRolePermissions(state.user) : { canSignPEP: true, label: 'Usuário' };
  if (!perms.canSignPEP) {
    showCustomAlert({
      title: 'Acesso Restrito',
      message: `Seu perfil (<strong>${perms.label}</strong>) não possui permissão para preencher ou assinar evoluções médicas no PEP.`,
      type: 'warning'
    });
    return;
  }

  const subjectiveContent = document.getElementById('pep-subjective')?.value || '';
  const objectiveContent = document.getElementById('pep-objective')?.value || '';
  const assessmentContent = document.getElementById('pep-assessment')?.value || '';
  const planContent = document.getElementById('pep-plan')?.value || '';
  const outcomeElement = document.getElementById('pep-outcome');
  const outcome = outcomeElement ? outcomeElement.value : 'alta';

  // Validação de Segurança Farmacológica CDSS 4D antes de Assinar/Finalizar
  if (shouldFinalize && planContent) {
    const cdssAlerts = checkDrugInteractions(planContent, `${subjectiveContent} | ${objectiveContent} | ${assessmentContent}`);
    const criticalBlockers = cdssAlerts.filter(a => a.severity === 'Critica' || a.isBlocker);
    if (criticalBlockers.length > 0) {
      const userConfirmed = await showCDSSCriticalOverrideModal(criticalBlockers);
      if (!userConfirmed) {
        return;
      }
    }
  }

  try {
    await apiFetch('/api/encounters/' + encounterId + '/notes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        noteType: 'Evolucao_Medica',
        subjectiveContent,
        objectiveContent,
        assessmentContent,
        planContent
      })
    });

    const targetStatus = !shouldFinalize 
      ? 'Em Atendimento' 
      : (outcome === 'observacao' ? 'Em_Observacao' : (outcome === 'internacao' ? 'Aguardando_Leito' : 'Finalizado'));

    if (window.localDB && typeof window.localDB.update === 'function') {
      window.localDB.update('encounters', encounterId, {
        subjectiveContent,
        objectiveContent,
        assessmentContent,
        planContent,
        notes: planContent,
        diagnosis: assessmentContent,
        status: targetStatus,
        lastStatusUpdate: new Date().toISOString()
      });
    }

    if (shouldFinalize) {
      const encounters = (typeof localDB !== 'undefined' && localDB.list) ? localDB.list('encounters') : [];
      const enc = encounters.find(e => e.id === encounterId) || {};
      const patientName = enc.patientName || 'Paciente';
      const nowIso = new Date().toISOString();

      // Enviar prescrição automaticamente para a Fila de Dispensação da Farmácia se houver conduta farmacológica
      if (planContent && planContent.trim().length > 3) {
        try {
          localDB.insert('prescriptions', {
            id: 'RX-' + Date.now(),
            encounterId: encounterId,
            patientId: enc.patientId || encounterId,
            patientName: patientName,
            doctorName: state.user?.name || enc.doctorName || 'Dr. Médico Assistente',
            items: planContent,
            instructions: planContent,
            status: 'Pendente',
            created_at: nowIso,
            date: nowIso.slice(0, 10)
          });
        } catch(e) {}
      }

      if (outcome === 'observacao') {
        const activeRoom = enc.room || enc.roomName || (state.currentRoom ? state.currentRoom.name : 'Consultório 01');
        await apiFetch(`/api/encounters/${encounterId}/start-observation`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            notes: 'Encaminhado para leito de observação do consultório após evolução médica.',
            room: activeRoom
          })
        });
        if (typeof window.showFlowCompletionNotification === 'function') {
          window.showFlowCompletionNotification({
            actionTitle: 'Alocado na Observação do Consultório',
            message: `O prontuário foi assinado e o paciente <strong>${patientName}</strong> foi alocado na <strong>Área de Observação do ${activeRoom}</strong> para monitoramento contínuo.`,
            targetTab: 'consultorios',
            targetTabLabel: `Salas & Consultórios (${activeRoom})`,
            targetPatientName: patientName
          });
        }
      } else if (outcome === 'internacao') {
        const modal = document.getElementById('pep-modal');
        if (modal) modal.remove();
        
        if (typeof window.showFlowCompletionNotification === 'function') {
          window.showFlowCompletionNotification({
            actionTitle: 'Solicitação de Internação Registrada',
            message: `O prontuário foi assinado. O paciente <strong>${patientName}</strong> foi colocado na <strong>Fila de Internação (Aguardando Leito)</strong>. Selecione o Leito a seguir para alocar.`,
            targetTab: 'leitos',
            targetTabLabel: 'Gestão de Leitos (Transferência)',
            persistent: true
          });
        }
        if (typeof window.openTransferBedModal === 'function') {
          window.openTransferBedModal(encounterId, patientName);
        }
        return;
      } else {
        await apiFetch('/api/encounters/' + encounterId + '/status', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'Finalizado' })
        });
        
        if (typeof window.showFlowCompletionNotification === 'function') {
          window.showFlowCompletionNotification({
            actionTitle: 'Alta Médica (Atendimento Finalizado)',
            message: `O prontuário foi assinado e a consulta de ${patientName} foi concluída (Alta).`,
            targetTab: 'atendimento',
            targetTabLabel: 'Atendimentos Médicos'
          });
        } else {
          showToast('⚡ Prontuário assinado e atendimento finalizado com Alta Médica!');
        }
      }

      const modal = document.getElementById('pep-modal');
      if (modal) modal.remove();
      if (typeof loadAndRenderQueue === 'function') loadAndRenderQueue();
      if (typeof renderTabContent === 'function' && state.activeTab === 'atendimento') renderTabContent();
    } else {
      if (typeof window.showFlowCompletionNotification === 'function') {
        window.showFlowCompletionNotification({
          actionTitle: 'Rascunho do Prontuário Salvo',
          message: 'O rascunho da evolução foi salvo.',
          targetTab: 'consultorios',
          targetTabLabel: 'Consultórios'
        });
      } else {
        showToast('Prontuário salvo como rascunho com sucesso!');
      }
      const modal = document.getElementById('pep-modal');
      if (modal) modal.remove();
    }
  } catch (e) {
    showToast('Erro ao salvar prontuário.');
  }
}

window.saveHistoryEvolution = function(patientId, patientName) {
  const perms = (typeof getRolePermissions === 'function') ? getRolePermissions(state.user) : { canSignPEP: true, canDoTriage: true, label: 'Usuário' };
  if (!perms.canSignPEP && !perms.canDoTriage) {
    if (typeof showCustomAlert === 'function') {
      showCustomAlert({
        title: 'Acesso Restrito',
        message: `Seu perfil (<strong>${perms.label}</strong>) não possui autorização assistencial para registrar evoluções clínicas no prontuário.`,
        type: 'warning'
      });
    } else if (typeof window.showToast === 'function') {
      window.showToast('Acesso restrito a profissionais assistenciais.', 'warning');
    }
    return;
  }

  const textarea = document.getElementById('new-history-evolution');
  if (!textarea || !textarea.value.trim()) {
    if (typeof window.showToast === 'function') window.showToast('Digite alguma anotação antes de salvar.', 'warning');
    else alert('Digite alguma anotação antes de salvar.');
    return;
  }
  
  const text = textarea.value.trim();
  const db = (typeof localDB !== 'undefined' && localDB.getFullDB) ? localDB.getFullDB() : {};
  const notes = db.clinical_notes || [];
  notes.push({
    id: 'NOTE-' + Math.floor(Math.random() * 100000),
    patientId: patientId,
    patientName: patientName,
    text: text,
    created_at: new Date().toISOString(),
    author: `${perms.label || 'Equipe Assistencial'} (${state.user?.name || state.user?.username || 'Profissional'})`
  });
  db.clinical_notes = notes;
  localStorage.setItem('healthNexusDados', JSON.stringify(db));
  
  if (typeof window.showToast === 'function') window.showToast('Evolução clínica salva com sucesso!', 'success');
  else alert('Evolução clínica salva com sucesso!');
  
  textarea.value = '';
};

window.generateHistoryReport = async function(patientId, patientName) {
  if (typeof window.generatePatientPDF === 'function') {
    return window.generatePatientPDF(patientId, patientName);
  }
  if (typeof window.showToast === 'function') window.showToast('Gerando relatório PDF do prontuário...', 'info');
};

window.handleExamImport = function(event, patientId) {
  const file = event.target.files[0];
  if (!file) return;
  
  if (typeof localDB !== 'undefined' && localDB.getFullDB) {
    const db = localDB.getFullDB();
    const notes = db.clinical_notes || [];
    notes.push({
      id: 'EXAM-' + Math.floor(Math.random() * 100000),
      patientId: patientId,
      text: `📎 Exame/Laudo Anexado: ${file.name} (${(file.size / 1024).toFixed(1)} KB)`,
      created_at: new Date().toISOString(),
      author: 'Anexo de Exame'
    });
    db.clinical_notes = notes;
    localStorage.setItem('healthNexusDados', JSON.stringify(db));
  }

  if (typeof window.showToast === 'function') window.showToast(`Exame "${file.name}" anexado ao prontuário!`, 'success');
  else alert(`Exame "${file.name}" anexado!`);
  event.target.value = '';
};

window.renderDoctorsTab = renderDoctorsTab;

window.movePatientSectorFromHistory = function(hospId, patientId, patientName) {
  const perms = (typeof getRolePermissions === 'function') ? getRolePermissions(state.user) : { canManageBeds: true, label: 'Usuário' };
  if (!perms.canManageBeds) {
    if (typeof showCustomAlert === 'function') {
      showCustomAlert({
        title: 'Acesso Restrito',
        message: `Seu perfil (<strong>${perms.label}</strong>) não possui permissão para transferir pacientes entre setores hospitalares.`,
        type: 'warning'
      });
    } else {
      alert('Acesso restrito: você não tem permissão para transferir pacientes.');
    }
    return;
  }

  const KANBAN_SECTORS = [
    { id: 'pronto_socorro', name: 'Pronto Socorro' },
    { id: 'corredor_internacao', name: 'Corredor' },
    { id: 'clinica_cirurgica', name: 'Cirúrgica' },
    { id: 'clinica_medica', name: 'Clínica Médica' },
    { id: 'uti', name: 'UTI' }
  ];

  const html = `
    <div class="modal-overlay" id="history-move-modal-overlay" style="z-index: 100200;"></div>
    <div class="modal-content" id="history-move-modal-content" style="z-index: 100201; max-width: 400px;">
      <div class="modal-header">
        <h3 style="margin:0; font-size: 1.15rem; color: var(--text-primary);">Mover Setor</h3>
        <button type="button" class="close-btn" id="history-move-close-btn">&times;</button>
      </div>
      <div class="modal-body" style="padding: 20px;">
        <p style="margin-top:0; font-size: 0.9rem; color: var(--text-secondary);">Selecione o novo setor para <strong>${patientName}</strong>:</p>
        <div class="form-group" style="margin-bottom: 20px;">
          <label class="form-label">Setor Destino</label>
          <select id="history-new-sector-select" class="form-input" style="width: 100%;">
            ${KANBAN_SECTORS.map(s => `<option value="${s.id}">${s.name}</option>`).join('')}
          </select>
        </div>
        <div style="display: flex; justify-content: flex-end; gap: 10px;">
          <button type="button" id="history-move-cancel" style="padding: 8px 16px; background: transparent; border: 1px solid var(--border-color); border-radius: 6px; cursor: pointer; color: var(--text-primary);">Cancelar</button>
          <button type="button" id="history-move-confirm" style="padding: 8px 16px; background: var(--color-primary); border: none; border-radius: 6px; cursor: pointer; color: #fff; font-weight: 600;">Mover</button>
        </div>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', html);

  const cleanup = () => {
    document.getElementById('history-move-modal-overlay')?.remove();
    document.getElementById('history-move-modal-content')?.remove();
  };

  document.getElementById('history-move-close-btn').addEventListener('click', cleanup);
  document.getElementById('history-move-cancel').addEventListener('click', cleanup);
  document.getElementById('history-move-confirm').addEventListener('click', () => {
    const newSector = document.getElementById('history-new-sector-select').value;
    const db = typeof localDB !== 'undefined' ? localDB : window.localDB;
    if (db) {
      const hosp = db.getById('hospitalizations', hospId);
      if (hosp) {
        hosp.current_sector = newSector;
        db.update('hospitalizations', hospId, hosp);
        if (typeof window.showToast === 'function') window.showToast('Setor atualizado com sucesso!', 'success');
        
        const historyModal = document.getElementById('history-modal-content');
        if (historyModal) {
          document.getElementById('close-history-modal')?.click();
          setTimeout(() => window.openPatientHistoryModal(patientId, patientName), 100);
        }
        
        if (typeof window.loadAndRenderKanban === 'function' && document.querySelector('#kanban-tab.active')) {
          window.loadAndRenderKanban();
        }
      }
    }
    cleanup();
  });
};

window.dischargePatientFromHistory = function(hospId, patientId, patientName) {
  const perms = (typeof getRolePermissions === 'function') ? getRolePermissions(state.user) : { canManageBeds: true, label: 'Usuário' };
  if (!perms.canManageBeds) {
    if (typeof showCustomAlert === 'function') {
      showCustomAlert({
        title: 'Acesso Restrito',
        message: `Seu perfil (<strong>${perms.label}</strong>) não possui permissão para conceder alta hospitalar.`,
        type: 'warning'
      });
    } else {
      alert('Acesso restrito: você não tem permissão para conceder alta.');
    }
    return;
  }

  if (confirm(`Confirmar ALTA para o paciente ${patientName}?`)) {
    const db = typeof localDB !== 'undefined' ? localDB : window.localDB;
    if (db) {
      const hosp = db.getById('hospitalizations', hospId);
      if (hosp) {
        hosp.status = 'Alta';
        hosp.discharged_at = new Date().toISOString();
        db.update('hospitalizations', hospId, hosp);
        if (typeof window.showToast === 'function') window.showToast('Alta registrada com sucesso!', 'success');
        
        if (typeof db.insert === 'function') {
          db.insert('clinical_notes', {
            id: 'NOTE-' + Math.floor(Math.random() * 1000000),
            patientId: patientId,
            text: '✅ Alta Hospitalar/Administrativa registrada no sistema.',
            created_at: new Date().toISOString(),
            author: `${perms.label} (${state.user?.name || state.user?.username || 'Sistema'})`
          });
        }
        
        const historyModal = document.getElementById('history-modal-content');
        if (historyModal) {
          document.getElementById('close-history-modal')?.click();
          setTimeout(() => window.openPatientHistoryModal(patientId, patientName), 100);
        }

        if (typeof window.loadAndRenderKanban === 'function' && document.querySelector('#kanban-tab.active')) {
          window.loadAndRenderKanban();
        }
      }
    }
  }
};
