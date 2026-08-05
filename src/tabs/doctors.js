import { apiFetch, showToast, abbreviateName, switchTab, setupCustomSelect, anonymizeCPF, exportToPDF, formatSyncDate, showCustomAlert, renderTabContent, cachedApiGet, getRolePermissions } from '../main.js';
import { state, dataCache, dataCacheTimestamps } from '../state.js';

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
              <h2 style="font-size: 1.5rem; font-weight: 700; color: var(--text-primary); margin: 0; line-height: 1.2;">Corpo Clínico</h2>
              <span style="color: var(--text-muted); font-size: 0.85rem;">Gestão de Médicos e Especialistas Hospitalares</span>
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
            <i class="fa-solid fa-plus"></i> Novo Médico
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
              <h3 style="margin: 0; font-size: 1.05rem; font-weight: 700; color: var(--text-primary);">Médicos de Plantão Hoje</h3>
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
        <div style="position: relative; flex: 1; min-width: 240px;">
          <i class="fa-solid fa-magnifying-glass" style="position: absolute; left: 14px; top: 50%; transform: translateY(-50%); color: var(--text-muted); font-size: 0.85rem;"></i>
          <input type="text" id="filter-doctor-search" placeholder="Buscar por nome, CRM ou especialidade..." style="width: 100%; background: var(--bg-tertiary); border: 1px solid var(--border-color); border-radius: 8px; padding: 9px 14px 9px 38px; color: var(--text-primary); font-size: 0.85rem; outline: none;">
        </div>
      </div>

      <!-- TABELA DE MÉDICOS CONTAINER -->
      <div id="doctors-list-container">
        <div style="text-align: center; padding: 60px 20px; color: var(--text-muted);">
          <i class="fa-solid fa-spinner fa-spin" style="font-size: 1.6rem; color: var(--color-primary); margin-bottom: 12px; display: block;"></i>
          <span style="font-size: 0.9rem;">Carregando médicos...</span>
        </div>
      </div>
    </div>

    <!-- MODAL CADASTRO / EDIÇÃO DE MÉDICO -->
    <div id="modal-doctor" class="modal-overlay" style="display: none;">
      <div class="modal-content" style="max-width: 650px; width: 100%; padding: 24px;">
        <div class="modal-header" style="margin-bottom: 20px;">
          <h3 id="modal-doctor-title"><i class="fa-solid fa-user-doctor" style="color: var(--color-primary);"></i> Cadastrar Médico</h3>
          <button class="btn-close" id="btn-close-doctor-modal"><i class="fa-solid fa-xmark"></i></button>
        </div>
        <form id="form-doctor" class="modal-body">
          <input type="hidden" id="doc-id">
          <div class="form-group">
            <label for="doc-name">Nome Completo *</label>
            <input type="text" id="doc-name" class="form-input" placeholder="Ex: Dr. Roberto Almeida" required>
          </div>
          <div style="display: grid; grid-template-columns: 1fr 2fr; gap: 16px;">
            <div class="form-group">
              <label for="doc-crm">CRM *</label>
              <input type="text" id="doc-crm" class="form-input" placeholder="123456-SP" required>
            </div>
            <div class="form-group">
              <label for="doc-specialty">Especialidade *</label>
              <input type="text" id="doc-specialty" class="form-input" placeholder="Ex: Cardiologia" required>
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
            <button type="submit" class="btn btn-primary" id="btn-submit-doctor">Salvar Médico</button>
          </div>
        </form>
      </div>
    </div>
  `;

  let allDoctorsCache = [];

  const renderTable = (doctors) => {
    const container = document.getElementById('doctors-list-container');
    const kpisEl = document.getElementById('doctors-kpis');
    const searchQuery = (document.getElementById('filter-doctor-search')?.value || '').toLowerCase().trim();

    let filtered = doctors || [];
    
    if (window.currentDocFilter === 'Ativo') {
      filtered = filtered.filter(d => (d.status || 'Ativo') === 'Ativo');
    }

    if (searchQuery) {
      filtered = filtered.filter(d => 
        (d.name || '').toLowerCase().includes(searchQuery) ||
        (d.crm || '').toLowerCase().includes(searchQuery) ||
        (d.specialty || '').toLowerCase().includes(searchQuery)
      );
    }

    const total = doctors.length;
    const ativos = doctors.filter(d => (d.status || 'Ativo') === 'Ativo').length;
    const especialidades = new Set(doctors.map(d => d.specialty)).size;

    if (kpisEl) {
      kpisEl.innerHTML = `
        <div class="interactive-card" id="kpi-doc-total" title="Clique para exibir todos os médicos" style="background: var(--bg-secondary); border: 1px solid var(--border-color); border-radius: 12px; padding: 16px 20px; display: flex; align-items: center; gap: 16px; cursor: pointer; transition: all 0.2s ease;">
          <div style="width: 44px; height: 44px; border-radius: 12px; background: rgba(139,92,246,0.12); border: 1px solid rgba(139,92,246,0.25); display: flex; align-items: center; justify-content: center; color: #a78bfa;">
            <i class="fa-solid fa-user-doctor" style="font-size: 1.2rem;"></i>
          </div>
          <div>
            <div style="font-size: 0.75rem; color: var(--text-muted); font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em;">Total de Médicos</div>
            <div style="font-size: 1.4rem; font-weight: 800; color: var(--text-primary);">${total}</div>
          </div>
        </div>

        <div class="interactive-card" id="kpi-doc-active" title="Clique para buscar médicos ativos" style="background: var(--bg-secondary); border: 1px solid var(--border-color); border-radius: 12px; padding: 16px 20px; display: flex; align-items: center; gap: 16px; cursor: pointer; transition: all 0.2s ease;">
          <div style="width: 44px; height: 44px; border-radius: 12px; background: rgba(16,185,129,0.12); border: 1px solid rgba(16,185,129,0.25); display: flex; align-items: center; justify-content: center; color: #34d399;">
            <i class="fa-solid fa-user-check" style="font-size: 1.2rem;"></i>
          </div>
          <div>
            <div style="font-size: 0.75rem; color: var(--text-muted); font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em;">Médicos Ativos</div>
            <div style="font-size: 1.4rem; font-weight: 800; color: #34d399;">${ativos}</div>
          </div>
        </div>

        <div class="interactive-card" id="kpi-doc-specs" title="Clique para ver resumo por Especialidade" style="background: var(--bg-secondary); border: 1px solid var(--border-color); border-radius: 12px; padding: 16px 20px; display: flex; align-items: center; gap: 16px; cursor: pointer; transition: all 0.2s ease;">
          <div style="width: 44px; height: 44px; border-radius: 12px; background: rgba(34,211,238,0.12); border: 1px solid rgba(34,211,238,0.25); display: flex; align-items: center; justify-content: center; color: #67e8f9;">
            <i class="fa-solid fa-stethoscope" style="font-size: 1.2rem;"></i>
          </div>
          <div>
            <div style="font-size: 0.75rem; color: var(--text-muted); font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em;">Especialidades</div>
            <div style="font-size: 1.4rem; font-weight: 800; color: #67e8f9;">${especialidades}</div>
          </div>
        </div>
      `;

      const applyCardStyle = (id, color, isActive) => {
        const el = document.getElementById(id);
        if (el) {
          if (isActive) {
            el.style.border = `1px solid ${color}`;
            el.style.transform = 'translateY(-2px)';
            el.style.boxShadow = `0 4px 12px ${color}30`;
          } else {
            el.style.border = '1px solid var(--border-color)';
            el.style.transform = 'none';
            el.style.boxShadow = 'none';
          }
        }
      };

      const curFilter = window.currentDocFilter || 'all';
      applyCardStyle('kpi-doc-total', '#a78bfa', curFilter === 'all');
      applyCardStyle('kpi-doc-active', '#34d399', curFilter === 'Ativo');
      applyCardStyle('kpi-doc-specs', '#67e8f9', curFilter === 'specs');

      const setFilter = (f) => { window.currentDocFilter = f; renderTable(allDoctorsCache); };
      document.getElementById('kpi-doc-total')?.addEventListener('click', () => setFilter('all'));
      document.getElementById('kpi-doc-active')?.addEventListener('click', () => setFilter('Ativo'));
      document.getElementById('kpi-doc-specs')?.addEventListener('click', () => setFilter('all')); // Fallback to all
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
                <span style="font-size: 0.78rem; color: var(--text-muted);">CRM: ${d.crm}</span>
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
              <th style="padding: 14px 20px; font-size: 0.78rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase;">Médico / CRM</th>
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
    const list = Object.entries(specsMap).map(([s, c]) => `• ${s}: ${c} médico(s)`).join('\n');
    alert('Resumo de Especialidades no Corpo Clínico:\n\n' + (list || 'Nenhuma especialidade cadastrada.'));
  });

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
    const list = Object.entries(specsMap).map(([s, c]) => `• ${s}: ${c} médico(s)`).join('\n');
    alert('Resumo de Especialidades no Corpo Clínico:\n\n' + (list || 'Nenhuma especialidade cadastrada.'));
  });

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
    const list = Object.entries(specsMap).map(([s, c]) => `• ${s}: ${c} médico(s)`).join('\n');
    alert('Resumo de Especialidades no Corpo Clínico:\n\n' + (list || 'Nenhuma especialidade cadastrada.'));
  });

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
    const list = Object.entries(specsMap).map(([s, c]) => `• ${s}: ${c} médico(s)`).join('\n');
    alert('Resumo de Especialidades no Corpo Clínico:\n\n' + (list || 'Nenhuma especialidade cadastrada.'));
  });

  const modal = document.getElementById('modal-doctor');
  document.getElementById('btn-open-doctor-modal').addEventListener('click', () => {
    document.getElementById('doc-id').value = '';
    document.getElementById('form-doctor').reset();
    document.getElementById('modal-doctor-title').innerHTML = '<i class="fa-solid fa-user-doctor" style="color: var(--color-primary);"></i> Cadastrar Médico';
    modal.style.display = 'flex';
  });

  document.getElementById('btn-close-doctor-modal').addEventListener('click', () => { modal.style.display = 'none'; });
  document.getElementById('btn-cancel-doctor-modal').addEventListener('click', () => { modal.style.display = 'none'; });

  document.getElementById('doctors-trash-btn').addEventListener('click', () => {
    showTrashModal('doctors');
  });

  document.getElementById('form-doctor').addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('doc-id').value;
    const name = document.getElementById('doc-name').value;
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
        body: JSON.stringify({ name, crm, specialty, phone, email, status })
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

  // Close listeners
  document.getElementById('btn-close-activity-modal').addEventListener('click', () => modal.remove());
  modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });

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
    actData = await res.json();

    // Preenche KPIs
    const s = actData.summary || {};
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
  showToast('⚡ Acessando Atendimentos para ' + fullName + '...');
  switchTab('atendimento');

  setTimeout(() => {
    const searchInput = document.getElementById('adm-search-input');
    if (searchInput) {
      searchInput.value = fullName;
      searchInput.dispatchEvent(new Event('input'));
    }
    const selectedIdInput = document.getElementById('selected-patient-id');
    const preview = document.getElementById('selected-patient-preview');
    const actionsContainer = document.getElementById('adm-actions-container');
    
    if (selectedIdInput && preview && actionsContainer) {
      selectedIdInput.value = patientId;
      preview.innerHTML = `
        <div style="font-weight:700; color: var(--color-primary); font-size:1.05rem;">${fullName}</div>
        <div style="font-size:0.78rem; color: var(--text-secondary); margin-top:4px;">CPF: ${cpf || 'Não informado'} · Paciente selecionado</div>
      `;
      actionsContainer.style.display = 'flex';
      actionsContainer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, 150);
};

window.openPatientHistoryModal = async function(patientId, patientName) {
  const existing = document.getElementById('patient-history-modal');
  if (existing) existing.remove();

  const modal = document.createElement('div');
  modal.id = 'patient-history-modal';
  modal.className = 'modal-overlay';
  modal.style.display = 'flex';
  modal.style.zIndex = '99999';
  modal.innerHTML = `
    <div class="modal-content" style="max-width: 900px; width: 92%; max-height: 90vh; display: flex; flex-direction: column; overflow: hidden; background: var(--bg-secondary); border: 1px solid var(--border-color); border-radius: 18px; box-shadow: 0 25px 60px rgba(0,0,0,0.65);">
      
      <div class="modal-header" style="padding: 20px 28px; background: linear-gradient(135deg, #1e1b4b, #311b92); border-bottom: 1px solid var(--border-color); display: flex; justify-content: space-between; align-items: center;">
        <div style="display: flex; align-items: center; gap: 14px;">
          <div style="width: 44px; height: 44px; border-radius: 12px; background: rgba(139,92,246,0.25); border: 1px solid rgba(139,92,246,0.4); display: flex; align-items: center; justify-content: center; color: #a78bfa;">
            <i class="fa-solid fa-file-medical" style="font-size: 1.3rem;"></i>
          </div>
          <div>
            <h3 style="font-family: Outfit, sans-serif; font-size: 1.25rem; font-weight: 700; color: #fff; margin: 0;">Prontuário & Histórico Clínico</h3>
            <div style="font-size: 0.82rem; color: #c4b5fd;">Paciente: <strong style="color: #fff;">${patientName}</strong></div>
          </div>
        </div>
        <button type="button" class="modal-close" id="close-history-modal" style="background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.15); color: #fff; width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center; justify-content: center; cursor: pointer;">
          <i class="fa-solid fa-xmark"></i>
        </button>
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

    const encounters = data.encounters || [];
    const appointments = data.appointments || [];

    const bodyEl = document.getElementById('history-modal-body');
    if (!bodyEl) return;

    if (encounters.length === 0 && appointments.length === 0) {
      bodyEl.innerHTML = `
        <div style="text-align: center; color: var(--text-muted); padding: 40px 20px;">
          <i class="fa-solid fa-folder-open" style="font-size: 2.5rem; color: var(--text-muted); margin-bottom: 12px; opacity: 0.5;"></i>
          <h4 style="color: var(--text-primary); margin-bottom: 6px;">Nenhum atendimento registrado</h4>
          <p style="font-size: 0.85rem;">Este paciente ainda não possui histórico de consultas ou internações pós-alta.</p>
        </div>
      `;
      return;
    }

    let html = `
      <div style="margin-bottom: 20px; font-weight: 700; color: var(--text-primary); font-size: 1rem; display: flex; align-items: center; gap: 8px;">
        <i class="fa-solid fa-clock-rotate-left" style="color: var(--color-primary);"></i> Histórico de Atendimentos & Pós-Alta (${encounters.length})
      </div>
      <div style="display: flex; flex-direction: column; gap: 14px;">
    `;

    encounters.forEach(enc => {
      const isCompleted = enc.status === 'Finalizado' || enc.completed_at;
      const statusLabel = isCompleted ? 'Alta Médica / Finalizado' : enc.status;
      const dateText = enc.admitted_at ? new Date(enc.admitted_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Data não registrada';

      html += `
        <div style="background: var(--bg-tertiary); border: 1px solid var(--border-color); border-left: 4px solid ${isCompleted ? '#10b981' : '#f59e0b'}; border-radius: 12px; padding: 18px 22px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; flex-wrap: wrap; gap: 8px;">
            <div style="display: flex; align-items: center; gap: 10px;">
              <span style="font-weight: 700; font-size: 0.95rem; color: var(--text-primary);">Tipo: ${enc.type === 'Urgencia' ? 'Urgência (PS)' : 'Ambulatório'}</span>
              <span class="${isCompleted ? 'badge-alta' : 'badge-warning'}" style="font-size: 0.72rem;">
                <i class="fa-solid ${isCompleted ? 'fa-circle-check' : 'fa-spinner fa-spin'}" style="margin-right: 4px;"></i>${statusLabel}
              </span>
            </div>
            <span style="font-size: 0.78rem; color: var(--text-muted);"><i class="fa-solid fa-calendar" style="margin-right: 4px;"></i>${dateText}</span>
          </div>

          <div style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 6px;">
            <strong>Queixa Principal / Triagem:</strong> ${enc.complaints || 'Sem registro de queixa'}
          </div>

          ${enc.subjectiveContent ? `
            <div style="font-size: 0.82rem; background: rgba(0,0,0,0.2); padding: 10px 14px; border-radius: 8px; margin-top: 8px; color: var(--text-primary); border: 1px solid rgba(255,255,255,0.05);">
              <strong>Avaliação Médica / PEP:</strong> ${enc.subjectiveContent}
            </div>
          ` : ''}
        </div>
      `;
    });

    html += `</div>`;
    bodyEl.innerHTML = html;

  } catch (e) {
    document.getElementById('history-modal-body').innerHTML = `
      <div style="text-align: center; color: #f87171; padding: 40px;">Erro ao carregar o prontuário do paciente.</div>
    `;
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
  modal.style.zIndex = '99999';
  modal.innerHTML = `
    <div class="modal-content" style="max-width: 850px; width: 92%; max-height: 90vh; display: flex; flex-direction: column; overflow: hidden; background: var(--bg-secondary); border: 1px solid var(--border-color); border-radius: 18px; box-shadow: 0 25px 60px rgba(0,0,0,0.65);">
      
      <div class="modal-header" style="padding: 20px 28px; background: linear-gradient(135deg, #1e1b4b, #311b92); border-bottom: 1px solid var(--border-color); display: flex; justify-content: space-between; align-items: center;">
        <div style="display: flex; align-items: center; gap: 14px;">
          <div style="width: 44px; height: 44px; border-radius: 12px; background: rgba(236,72,153,0.2); border: 1px solid rgba(236,72,153,0.4); display: flex; align-items: center; justify-content: center; color: #f472b6;">
            <i class="fa-solid fa-file-medical" style="font-size: 1.3rem;"></i>
          </div>
          <div>
            <h3 style="font-family: Outfit, sans-serif; font-size: 1.25rem; font-weight: 700; color: #fff; margin: 0;">Prontuário Eletrônico (PEP)</h3>
            <div id="pep-modal-subtitle" style="font-size: 0.82rem; color: #c4b5fd;">Carregando dados do paciente...</div>
          </div>
        </div>
        <button type="button" class="modal-close" id="close-pep-modal" style="background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.15); color: #fff; width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center; justify-content: center; cursor: pointer;">
          <i class="fa-solid fa-xmark"></i>
        </button>
      </div>

      <div class="modal-body" id="pep-modal-body" style="padding: 24px 28px; overflow-y: auto; flex: 1;">
        <div style="text-align: center; color: var(--text-muted); padding: 40px;">
          <i class="fa-solid fa-circle-notch fa-spin" style="font-size: 2rem; color: var(--color-primary); margin-bottom: 12px;"></i>
          <div>Buscando atendimento no banco...</div>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(modal);

  document.getElementById('close-pep-modal').addEventListener('click', () => modal.remove());

  try {
    let encounters = [];
    try {
      const res = await apiFetch('/api/encounters');
      if (res.ok) {
        const rawData = await res.json();
        encounters = Array.isArray(rawData) ? rawData : (rawData?.data || []);
      }
    } catch(e) {}

    const enc = encounters.find(e => String(e.id) === String(encounterId)) || {};

    const subtitleEl = document.getElementById('pep-modal-subtitle');
    if (subtitleEl) {
      subtitleEl.innerHTML = `Paciente: <strong style="color:#fff;">${enc.patientName || 'Paciente'}</strong> · Sala: <span style="color:#34d399;">${enc.room || 'Consultório 01'}</span>`;
    }

    let notes = {};
    try {
      const notesRes = await apiFetch('/api/encounters/' + encounterId + '/notes');
      if (notesRes && notesRes.ok) {
        const notesData = await notesRes.json();
        notes = (notesData && typeof notesData === 'object') ? (notesData.data || notesData) : {};
      }
    } catch (e) {}

    const bodyEl = document.getElementById('pep-modal-body');
    if (!bodyEl) return;

    bodyEl.innerHTML = `
      <!-- Sinais Vitais & Dados de Triagem -->
      <div style="background: var(--bg-tertiary); border: 1px solid var(--border-color); border-radius: 12px; padding: 14px 18px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px;">
        <div>
          <span style="font-size:0.75rem; color:var(--text-muted); font-weight:600; text-transform:uppercase;">Classificação Manchester:</span>
          <span style="display:inline-block; margin-left:8px; padding:3px 12px; border-radius:20px; font-weight:700; font-size:0.8rem; background:rgba(239,68,68,0.15); color:#f87171; border:1px solid rgba(239,68,68,0.3);">${enc.manchesterColor || 'AMARELO'}</span>
        </div>
        <div style="font-size:0.85rem; color:var(--text-primary); font-family:monospace;">
          <strong>PA:</strong> ${enc.bloodPressure || '120/80'} | <strong>Temp:</strong> ${enc.temperatureCelsius || 36.5}°C | <strong>FC:</strong> ${enc.heartRateBpm || 80} bpm
        </div>
      </div>

      <!-- Formulário SOAP / Prontuário -->
      <form id="pep-form" style="display:flex; flex-direction:column; gap:16px;">
        <div>
          <label class="form-label" style="font-weight:600; color:var(--text-primary); margin-bottom:6px; display:block;">Subjetivo (Anamnese & Queixa):</label>
          <textarea id="pep-subjective" class="form-input" style="width:100%; min-height:70px; resize:vertical;" placeholder="Relato do paciente, evolução dos sintomas...">${notes.subjectiveContent || enc.complaints || ''}</textarea>
        </div>

        <div>
          <label class="form-label" style="font-weight:600; color:var(--text-primary); margin-bottom:6px; display:block;">Objetivo (Exame Físico / Achados):</label>
          <textarea id="pep-objective" class="form-input" style="width:100%; min-height:70px; resize:vertical;" placeholder="Exame físico, ausculta, estado geral...">${notes.objectiveContent || ''}</textarea>
        </div>

        <div>
          <label class="form-label" style="font-weight:600; color:var(--text-primary); margin-bottom:6px; display:block;">Avaliação (Diagnóstico / CID-10):</label>
          <textarea id="pep-assessment" class="form-input" style="width:100%; min-height:60px; resize:vertical;" placeholder="Hipótese diagnóstica ou CID-10...">${notes.assessmentContent || ''}</textarea>
        </div>

        <div>
          <label class="form-label" style="font-weight:600; color:var(--text-primary); margin-bottom:6px; display:block;">Plano Terapêutico & Prescrição:</label>
          <textarea id="pep-plan" class="form-input" style="width:100%; min-height:70px; resize:vertical;" placeholder="Conduta médica, medicação receitada, orientações de alta...">${notes.planContent || ''}</textarea>
        </div>

        <div style="display:flex; justify-content:flex-end; gap:12px; margin-top:10px;">
          <button type="button" id="btn-save-pep" class="btn" style="background:var(--bg-tertiary); border:1px solid var(--border-color); color:var(--text-primary); padding:10px 20px;">
            <i class="fa-solid fa-floppy-disk" style="margin-right:6px;"></i> Salvar Rascunho
          </button>
          <button type="submit" class="btn btn-primary" style="padding:10px 22px; background:linear-gradient(135deg, #10b981, #059669);">
            <i class="fa-solid fa-file-signature" style="margin-right:6px;"></i> Assinar & Finalizar Consulta
          </button>
        </div>
      </form>
    `;

    document.getElementById('btn-save-pep')?.addEventListener('click', async () => {
      await savePEPData(encounterId, false);
    });

    document.getElementById('pep-form')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      await savePEPData(encounterId, true);
    });

  } catch (e) {
    document.getElementById('pep-modal-body').innerHTML = `
      <div style="text-align: center; color: #f87171; padding: 40px;">Erro ao carregar prontuário do paciente.</div>
    `;
  }
};

async function savePEPData(encounterId, shouldFinalize) {
  const subjectiveContent = document.getElementById('pep-subjective').value;
  const objectiveContent = document.getElementById('pep-objective').value;
  const assessmentContent = document.getElementById('pep-assessment').value;
  const planContent = document.getElementById('pep-plan').value;

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

    if (shouldFinalize) {
      await apiFetch('/api/encounters/' + encounterId + '/status', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'Finalizado' })
      });
      showToast('⚡ Prontuário assinado e atendimento finalizado com Alta Médica!');
      const modal = document.getElementById('pep-modal');
      if (modal) modal.remove();
      if (typeof loadAndRenderQueue === 'function') loadAndRenderQueue();
      if (state.activeTab === 'atendimento') renderTabContent();
    } else {
      showToast('Prontuário salvo como rascunho com sucesso!');
    }
  } catch (e) {
    showToast('Erro ao salvar prontuário.');
  }
}


// ==========================================
// ABA DE ALERTAS & ESTAGNAÇÃO (GESTÃO DE GARGALOS E SLA)
// ==========================================

window.renderDoctorsTab = renderDoctorsTab;
