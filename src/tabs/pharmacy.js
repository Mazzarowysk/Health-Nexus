import { apiFetch, showToast, abbreviateName, switchTab, setupCustomSelect, anonymizeCPF, exportToPDF, formatSyncDate, showCustomAlert, renderTabContent, cachedApiGet, getRolePermissions } from '../main.js';
import { state, dataCache, dataCacheTimestamps } from '../state.js';

const API_URL = '/api';

async function renderPharmacyTab() {
  const contentArea = document.getElementById('main-content') || document.getElementById('content-area');
  if (!contentArea) return;

  contentArea.innerHTML = `
    <div class="tab-section active">
      <div class="tab-header-banner" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
        <div>
          <h2 style="font-size: 1.5rem; color: var(--text-primary); margin: 0; display: flex; align-items: center; gap: 10px;">
            <i class="fa-solid fa-pills" style="color: #ec4899;"></i> Farmácia Hospitalar &amp; Controle de Estoque
          </h2>
          <p style="color: var(--text-secondary); font-size: 0.88rem; margin-top: 4px;">
            Gerenciamento de medicamentos, dispensação para leitos e alertas de estoque crítico.
          </p>
        </div>
        <div style="display: flex; gap: 10px;">
          <button id="btn-dispense-med" class="btn btn-secondary" style="border-color: #ec4899; color: #f472b6;">
            <i class="fa-solid fa-hand-holding-medical"></i> Dispensar Medicação
          </button>
          <button id="btn-add-pharm-item" class="btn btn-primary" style="background: linear-gradient(135deg, #ec4899, #be185d); border: none;">
            <i class="fa-solid fa-plus"></i> Novo Medicamento
          </button>
        </div>
      </div>

      <!-- KPI CARDS FARMÁCIA -->
      <div class="kpi-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 16px; margin-bottom: 24px;">
        <div id="kpi-card-pharm-all" class="kpi-card" style="background: var(--bg-secondary); border: 1px solid var(--color-primary); padding: 18px; border-radius: 12px; cursor: pointer; transition: all 0.2s ease; transform: translateY(-2px); box-shadow: 0 4px 12px rgba(236, 72, 153, 0.15);">
          <div style="display: flex; justify-content: space-between; align-items: center; color: var(--text-secondary); font-size: 0.85rem;">
            <span>TOTAL DE ITENS</span>
            <i class="fa-solid fa-boxes-stacked" style="color: var(--color-primary);"></i>
          </div>
          <div id="kpi-pharm-total" style="font-size: 1.8rem; font-weight: 700; color: var(--text-primary); margin-top: 8px;">--</div>
        </div>

        <div id="kpi-card-pharm-critical" class="kpi-card" style="background: var(--bg-secondary); border: 1px solid var(--border-color); padding: 18px; border-radius: 12px; cursor: pointer; transition: all 0.2s ease;">
          <div style="display: flex; justify-content: space-between; align-items: center; color: var(--text-secondary); font-size: 0.85rem;">
            <span>ESTOQUE CRÍTICO</span>
            <i class="fa-solid fa-triangle-exclamation" style="color: #ef4444;"></i>
          </div>
          <div id="kpi-pharm-critical" style="font-size: 1.8rem; font-weight: 700; color: #ef4444; margin-top: 8px;">--</div>
        </div>

        <div id="kpi-card-pharm-units" class="kpi-card" style="background: var(--bg-secondary); border: 1px solid var(--border-color); padding: 18px; border-radius: 12px; cursor: pointer; transition: all 0.2s ease;">
          <div style="display: flex; justify-content: space-between; align-items: center; color: var(--text-secondary); font-size: 0.85rem;">
            <span>UNIDADES EM ESTOQUE</span>
            <i class="fa-solid fa-capsules" style="color: #10b981;"></i>
          </div>
          <div id="kpi-pharm-units" style="font-size: 1.8rem; font-weight: 700; color: #10b981; margin-top: 8px;">--</div>
        </div>

        <div class="kpi-card" style="background: var(--bg-secondary); border: 1px solid var(--border-color); padding: 18px; border-radius: 12px; opacity: 0.8;">
          <div style="display: flex; justify-content: space-between; align-items: center; color: var(--text-secondary); font-size: 0.85rem;">
            <span>VALOR EM ESTOQUE</span>
            <i class="fa-solid fa-brazilian-real-sign" style="color: #3b82f6;"></i>
          </div>
          <div id="kpi-pharm-value" style="font-size: 1.8rem; font-weight: 700; color: #3b82f6; margin-top: 8px;">R$ --</div>
        </div>
      </div>

      <!-- TABELA DE ESTOQUE DA FARMÁCIA -->
      <div class="card" style="background: var(--bg-secondary); border: 1px solid var(--border-color); border-radius: 12px; padding: 20px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
          <h3 style="margin: 0; font-size: 1.1rem; color: var(--text-primary);">Estoque Central de Medicamentos &amp; Insumos</h3>
          <div style="display: flex; gap: 8px; align-items: center;">
            <input type="text" id="pharm-search-input" class="form-input" placeholder="Buscar medicamento ou lote..." style="max-width: 240px;">
            <button type="button" id="btn-clear-pharm-filter" style="background: var(--bg-tertiary, var(--bg-secondary)); border: 1px solid var(--border-color); color: var(--text-primary); padding: 0 14px; border-radius: 8px; cursor: pointer; display: flex; align-items: center; justify-content: center; height: 40px; gap: 6px; font-size: 0.82rem; font-weight: 600; transition: all 0.2s ease; white-space: nowrap;" title="Limpar Filtro" onmouseover="this.style.background='rgba(99,102,241,0.15)'" onmouseout="this.style.background='var(--bg-tertiary, var(--bg-secondary))'">
              <i class="fa-solid fa-filter-circle-xmark"></i> Limpar
            </button>
          </div>
        </div>

        <div class="table-responsive">
          <table class="data-table" style="width: 100%; border-collapse: collapse;">
            <thead>
              <tr style="border-bottom: 1px solid var(--border-color); text-align: left; font-size: 0.82rem; color: var(--text-secondary);">
                <th style="padding: 12px;">ID / CÓDIGO</th>
                <th style="padding: 12px;">MEDICAMENTO</th>
                <th style="padding: 12px;">DOSAGEM / APRESENTAÇÃO</th>
                <th style="padding: 12px;">LOTE / VALIDADE</th>
                <th style="padding: 12px;">QTD ESTOQUE</th>
                <th style="padding: 12px;">STATUS</th>
                <th style="padding: 12px;">PREÇO UNIT.</th>
                <th style="padding: 12px; text-align: right;">AÇÕES</th>
              </tr>
            </thead>
            <tbody id="pharmacy-table-body">
              <tr>
                <td colspan="8" style="text-align: center; padding: 24px; color: var(--text-secondary);">
                  <i class="fa-solid fa-spinner fa-spin" style="margin-right: 8px;"></i> Carregando estoque da farmácia...
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;

  // Carregar dados da API
  await loadPharmacyData();

  // Event Listeners
  document.getElementById('btn-add-pharm-item')?.addEventListener('click', () => openAddPharmModal());
  document.getElementById('btn-dispense-med')?.addEventListener('click', openDispenseMedModal);
  document.getElementById('pharm-search-input')?.addEventListener('input', (e) => {
    const term = e.target.value.toLowerCase();
    const rows = document.querySelectorAll('#pharmacy-table-body tr[data-search]');
    rows.forEach(r => {
      const txt = r.getAttribute('data-search') || '';
      r.style.display = txt.includes(term) ? '' : 'none';
    });
  });

  document.getElementById('btn-clear-pharm-filter')?.addEventListener('click', () => {
    const inp = document.getElementById('pharm-search-input');
    if (inp) { inp.value = ''; inp.dispatchEvent(new Event('input')); }
    window.currentPharmFilter = 'ALL';
    ['kpi-card-pharm-all', 'kpi-card-pharm-critical', 'kpi-card-pharm-units'].forEach(id => {
      const el = document.getElementById(id);
      if (el) { el.style.border = '1px solid var(--border-color)'; el.style.transform = 'none'; el.style.boxShadow = 'none'; }
    });
    const allCard = document.getElementById('kpi-card-pharm-all');
    if (allCard) allCard.style.border = '1px solid var(--color-primary)';
    renderPharmacyTable(currentPharmacyItems);
  });

  // KPI Filter click listeners
  const updateActiveCardStyle = (activeId, color) => {
    ['kpi-card-pharm-all', 'kpi-card-pharm-critical', 'kpi-card-pharm-units'].forEach(id => {
      const el = document.getElementById(id);
      if (!el) return;
      if (id === activeId) {
        el.style.border = `1px solid ${color}`;
        el.style.transform = 'translateY(-2px)';
        el.style.boxShadow = `0 4px 12px ${color}26`; // adds transparency to hex color
      } else {
        el.style.border = '1px solid var(--border-color)';
        el.style.transform = 'none';
        el.style.boxShadow = 'none';
      }
    });
  };

  document.getElementById('kpi-card-pharm-all')?.addEventListener('click', () => {
    window.currentPharmFilter = 'ALL';
    updateActiveCardStyle('kpi-card-pharm-all', 'var(--color-primary)');
    renderPharmacyTable(currentPharmacyItems);
  });

  document.getElementById('kpi-card-pharm-critical')?.addEventListener('click', () => {
    window.currentPharmFilter = 'CRITICAL';
    updateActiveCardStyle('kpi-card-pharm-critical', '#ef4444');
    renderPharmacyTable(currentPharmacyItems);
  });

  document.getElementById('kpi-card-pharm-units')?.addEventListener('click', () => {
    window.currentPharmFilter = 'IN_STOCK';
    updateActiveCardStyle('kpi-card-pharm-units', '#10b981');
    renderPharmacyTable(currentPharmacyItems);
  });
}

window.currentPharmFilter = 'ALL';
let currentPharmacyItems = [];

async function loadPharmacyData() {
  try {
    const res = await apiFetch('/api/pharmacy');
    if (res.ok) {
      const data = await res.json();
      currentPharmacyItems = data.data || [];
      renderPharmacyTable(currentPharmacyItems);
    }
  } catch (err) {
    showCustomAlert({ title: 'Erro', message: 'Falha ao buscar estoque da farmácia.', type: 'danger' });
  }
}

function renderPharmacyTable(items) {
  const tbody = document.getElementById('pharmacy-table-body');
  if (!tbody) return;

  if (items.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="8" style="text-align: center; padding: 24px; color: var(--text-secondary);">
          Nenhum medicamento cadastrado no estoque.
        </td>
      </tr>
    `;
    return;
  }

  let totalItems = items.length;
  let criticalCount = 0;
  let totalUnits = 0;
  let totalValue = 0;

  // Calculte KPIs from ALL items
  items.forEach(item => {
    const qty = Number(item.stockQuantity || 0);
    const min = Number(item.minStock || 10);
    const price = Number(item.unitPrice || 0);
    const isCritical = qty <= min;

    totalUnits += qty;
    totalValue += (qty * price);
    if (isCritical) criticalCount++;
  });

  // Apply filter for rendering
  let filteredItems = items;
  if (window.currentPharmFilter === 'CRITICAL') {
    filteredItems = items.filter(item => Number(item.stockQuantity || 0) <= Number(item.minStock || 10));
  } else if (window.currentPharmFilter === 'IN_STOCK') {
    filteredItems = items.filter(item => Number(item.stockQuantity || 0) > 0);
  }

  if (filteredItems.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="8" style="text-align: center; padding: 24px; color: var(--text-secondary);">
          Nenhum medicamento encontrado para este filtro.
        </td>
      </tr>
    `;
  } else {
    tbody.innerHTML = filteredItems.map(item => {
      const qty = Number(item.stockQuantity || 0);
      const min = Number(item.minStock || 10);
      const price = Number(item.unitPrice || 0);
      const isCritical = qty <= min;

      const statusBadge = isCritical
        ? `<span class="badge" style="background: rgba(239,68,68,0.15); color: #ef4444; border: 1px solid rgba(239,68,68,0.3); padding: 4px 10px; border-radius: 20px; font-size: 0.75rem; font-weight:700;"><i class="fa-solid fa-triangle-exclamation"></i> Estoque Baixo</span>`
        : `<span class="badge" style="background: rgba(16,185,129,0.15); color: #10b981; border: 1px solid rgba(16,185,129,0.3); padding: 4px 10px; border-radius: 20px; font-size: 0.75rem; font-weight:700;"><i class="fa-solid fa-check"></i> Normal</span>`;

      const searchTxt = `${item.id} ${item.name} ${item.lotNumber} ${item.dosage}`.toLowerCase();

      return `
        <tr data-search="${searchTxt}" style="border-bottom: 1px solid var(--border-color); font-size: 0.88rem;">
          <td style="padding: 12px; font-family: monospace; font-weight: 700; color: #ec4899;">${item.id}</td>
          <td style="padding: 12px; font-weight: 600; color: var(--text-primary);">${item.name}</td>
          <td style="padding: 12px; color: var(--text-secondary);">${item.dosage || '-'} (${item.form || 'Und'})</td>
          <td style="padding: 12px; color: var(--text-secondary);">${item.lotNumber || '-'} / <span style="color: var(--text-primary);">${item.expirationDate || '-'}</span></td>
          <td style="padding: 12px; font-weight: 700; color: ${isCritical ? '#ef4444' : 'var(--text-primary)'};">${qty} unds</td>
          <td style="padding: 12px;">${statusBadge}</td>
          <td style="padding: 12px; color: var(--text-primary); font-weight: 600;">R$ ${price.toFixed(2)}</td>
          <td style="padding: 12px; text-align: right;">
            <div class="actions-cell" style="justify-content: flex-end;">
              <button class="btn-icon btn-edit-pharm" data-id="${item.id}" title="Editar Medicamento" style="color: #ec4899;">
                <i class="fa-solid fa-pen-to-square"></i>
              </button>
              <button class="btn-icon btn-del-pharm" data-id="${item.id}" data-name="${item.name}" title="Excluir Medicamento" style="color: var(--color-danger);">
                <i class="fa-solid fa-trash-can"></i>
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  }

  document.getElementById('kpi-pharm-total').textContent = totalItems;
  document.getElementById('kpi-pharm-critical').textContent = criticalCount;
  document.getElementById('kpi-pharm-units').textContent = totalUnits;
  document.getElementById('kpi-pharm-value').textContent = `R$ ${totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;

  // Eventos de Editar e Excluir
  document.querySelectorAll('.btn-edit-pharm').forEach(btn => {
    btn.addEventListener('click', () => {
      const perms = (typeof getRolePermissions === 'function') ? getRolePermissions(state.user) : { canManagePharmacy: true, label: 'Usuário' };
      if (!perms.canManagePharmacy) {
        showCustomAlert({
          title: 'Acesso Restrito',
          message: `Seu perfil (<strong>${perms.label}</strong>) não possui permissão para alterar o cadastro de medicamentos.`,
          type: 'warning'
        });
        return;
      }
      const item = currentPharmacyItems.find(i => i.id === btn.dataset.id);
      if (item) openAddPharmModal(item);
    });
  });

  document.querySelectorAll('.btn-del-pharm').forEach(btn => {
    btn.addEventListener('click', async () => {
      const perms = (typeof getRolePermissions === 'function') ? getRolePermissions(state.user) : { canDeleteRecords: true, label: 'Usuário' };
      if (!perms.canDeleteRecords && !perms.canManagePharmacy) {
        showCustomAlert({
          title: 'Acesso Restrito',
          message: `Seu perfil (<strong>${perms.label}</strong>) não possui permissão para excluir medicamentos do estoque.`,
          type: 'warning'
        });
        return;
      }

      const id = btn.dataset.id;
      const name = btn.dataset.name;
      const confirmed = await showCustomConfirm({
        title: 'Excluir Medicamento',
        message: `Tem certeza que deseja excluir o medicamento <strong>${name}</strong> do estoque?`,
        confirmText: 'Sim, Excluir',
        type: 'danger'
      });

      if (confirmed) {
        try {
          const res = await apiFetch(`/api/pharmacy/${id}`, { method: 'DELETE' });
          if (res.ok) {
            showToast(`Medicamento "${name}" removido!`);
            loadPharmacyData();
          } else {
            showCustomAlert({ title: 'Erro', message: 'Falha ao remover medicamento.', type: 'danger' });
          }
        } catch (e) {
          showCustomAlert({ title: 'Erro', message: 'Erro de conexão.', type: 'danger' });
        }
      }
    });
  });
}

function openAddPharmModal(itemToEdit = null) {
  const perms = (typeof getRolePermissions === 'function') ? getRolePermissions(state.user) : { canManagePharmacy: true, label: 'Usuário' };
  if (!perms.canManagePharmacy) {
    showCustomAlert({
      title: 'Acesso Restrito',
      message: `Seu perfil (<strong>${perms.label}</strong>) não possui autorização para cadastrar ou editar medicamentos no estoque.`,
      type: 'warning'
    });
    return;
  }

  const existingModal = document.getElementById('modal-pharm-add-overlay');
  if (existingModal) existingModal.remove();

  const isEdit = !!itemToEdit;
  const modalHtml = `
    <div id="modal-pharm-add-overlay" style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(10, 10, 20, 0.82); backdrop-filter: blur(8px); display: flex; justify-content: center; align-items: center; z-index: 10000; padding: 16px;">
      <div style="background: #1e1c2e; border: 1px solid rgba(236, 72, 153, 0.3); border-radius: 16px; width: 100%; max-width: 560px; box-shadow: 0 20px 50px rgba(0,0,0,0.6); overflow: hidden; animation: fadeInModal 0.25s ease-out;">
        <div style="background: linear-gradient(135deg, #be185d, #ec4899); padding: 18px 24px; display: flex; justify-content: space-between; align-items: center; color: #fff;">
          <h3 style="margin: 0; font-size: 1.15rem; font-weight: 700; display: flex; align-items: center; gap: 10px;">
            <i class="fa-solid ${isEdit ? 'fa-pen-to-square' : 'fa-pills'}"></i> ${isEdit ? 'Editar Medicamento' : 'Cadastrar Novo Medicamento'}
          </h3>
          <button type="button" id="btn-close-pharm-add-modal" style="background: rgba(255,255,255,0.2); border: none; color: #fff; width: 32px; height: 32px; border-radius: 50%; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 1rem; transition: background 0.2s;">
            <i class="fa-solid fa-xmark"></i>
          </button>
        </div>

        <form id="form-add-pharm-item" style="padding: 24px;">
          <div style="display: grid; grid-template-columns: 1fr; gap: 16px;">

            <!-- ANVISA Search Block -->
            <div style="background: rgba(99,102,241,0.07); border: 1px solid rgba(99,102,241,0.2); border-radius: 12px; padding: 14px 16px;">
              <label style="display: block; font-size: 0.78rem; font-weight: 700; color: #818cf8; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.05em;">
                <i class="fa-solid fa-magnifying-glass-plus" style="margin-right: 6px;"></i>Buscar na Base de Medicamentos (ANVISA / OpenFDA)
              </label>
              <div style="position: relative;">
                <input type="text" id="pharm-anvisa-search" class="form-input" autocomplete="off" placeholder="Ex: Amoxicilina, Dipirona, Metformina..." style="width: 100%; height: 40px; box-sizing: border-box; padding-left: 35px;">
                <i class="fa-solid fa-search" style="position: absolute; left: 12px; top: 12px; color: #818cf8;"></i>
              </div>
              <div id="pharm-anvisa-results" style="margin-top: 6px; display: none; background: #1e1e2d; border: 1px solid var(--border-color); border-radius: 8px; max-height: 250px; overflow-y: auto; box-shadow: 0 4px 12px rgba(0,0,0,0.3); position: relative; z-index: 10;"></div>
            </div>

            <div>
              <label style="display: block; font-size: 0.85rem; font-weight: 600; color: var(--text-secondary); margin-bottom: 6px;">
                Nome do Medicamento *
              </label>
              <div style="display: flex; gap: 8px; align-items: center;">
                <input type="text" id="pharm-input-name" class="form-input" required value="${itemToEdit?.name || ''}" placeholder="Ex: Amoxicilina + Clavulanato" style="flex: 1; box-sizing: border-box;">
                <span id="pharm-anvisa-badge" style="display: none; font-size: 0.72rem; font-weight: 700; padding: 4px 10px; border-radius: 20px; white-space: nowrap;"></span>
              </div>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
              <div>
                <label style="display: block; font-size: 0.85rem; font-weight: 600; color: var(--text-secondary); margin-bottom: 6px;">
                  Dosagem
                </label>
                <input type="text" id="pharm-input-dosage" class="form-input" value="${itemToEdit?.dosage || ''}" placeholder="Ex: 500mg + 125mg" style="width: 100%; box-sizing: border-box;">
              </div>
              <div>
                <label style="display: block; font-size: 0.85rem; font-weight: 600; color: var(--text-secondary); margin-bottom: 6px;">
                  Forma / Apresentação
                </label>
                <input type="text" id="pharm-input-form" class="form-input" value="${itemToEdit?.form || ''}" placeholder="Ex: Comprimido, Ampola" style="width: 100%; box-sizing: border-box;">
              </div>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
              <div>
                <label style="display: block; font-size: 0.85rem; font-weight: 600; color: var(--text-secondary); margin-bottom: 6px;">
                  Qtd Atual em Estoque
                </label>
                <input type="number" id="pharm-input-stock" class="form-input" min="0" value="${itemToEdit ? itemToEdit.stockQuantity : 100}" style="width: 100%; box-sizing: border-box;">
              </div>
              <div>
                <label style="display: block; font-size: 0.85rem; font-weight: 600; color: var(--text-secondary); margin-bottom: 6px;">
                  Estoque Mínimo (Alerta)
                </label>
                <input type="number" id="pharm-input-minstock" class="form-input" min="1" value="${itemToEdit ? itemToEdit.minStock : 10}" style="width: 100%; box-sizing: border-box;">
              </div>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
              <div>
                <label style="display: block; font-size: 0.85rem; font-weight: 600; color: var(--text-secondary); margin-bottom: 6px;">
                  Lote
                </label>
                <input type="text" id="pharm-input-lot" class="form-input" value="${itemToEdit?.lotNumber || ''}" placeholder="Ex: L2026C08" style="width: 100%; box-sizing: border-box;">
              </div>
              <div>
                <label style="display: block; font-size: 0.85rem; font-weight: 600; color: var(--text-secondary); margin-bottom: 6px;">
                  Validade
                </label>
                <input type="date" id="pharm-input-exp" class="form-input" value="${itemToEdit?.expirationDate || ''}" style="width: 100%; box-sizing: border-box;">
              </div>
            </div>

            <div>
              <label style="display: block; font-size: 0.85rem; font-weight: 600; color: var(--text-secondary); margin-bottom: 6px;">
                Preço Unitário (R$)
              </label>
              <input type="number" step="0.01" id="pharm-input-price" class="form-input" min="0" value="${itemToEdit?.unitPrice || 0}" placeholder="0.00" style="width: 100%; box-sizing: border-box;">
            </div>
          </div>

          <div style="display: flex; justify-content: flex-end; gap: 12px; margin-top: 24px;">
            <button type="button" id="btn-cancel-pharm-add" class="btn btn-secondary" style="padding: 10px 18px;">
              Cancelar
            </button>
            <button type="submit" class="btn btn-primary" style="background: linear-gradient(135deg, #ec4899, #be185d); border: none; padding: 10px 20px; font-weight: 600;">
              <i class="fa-solid fa-check" style="margin-right: 6px;"></i> ${isEdit ? 'Salvar Alterações' : 'Salvar Medicamento'}
            </button>
          </div>
        </form>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', modalHtml);

  const overlay = document.getElementById('modal-pharm-add-overlay');
  const closeModal = () => overlay?.remove();

  document.getElementById('btn-close-pharm-add-modal')?.addEventListener('click', closeModal);
  document.getElementById('btn-cancel-pharm-add')?.addEventListener('click', closeModal);

  // ANVISA Lookup Logic
  const anvisaSearch = document.getElementById('pharm-anvisa-search');
  const anvisaResults = document.getElementById('pharm-anvisa-results');
  const anvisaBadge = document.getElementById('pharm-anvisa-badge');
  let anvisaTimeout = null;

  const doAnvisaSearch = async () => {
    const term = anvisaSearch?.value?.trim();
    if (!term || term.length < 2) {
      anvisaResults.style.display = 'none';
      return;
    }
    
    anvisaResults.style.display = 'block';
    anvisaResults.innerHTML = '<div style="padding: 12px; color: var(--text-muted); font-size: 0.82rem; text-align: center;"><i class="fa-solid fa-circle-notch fa-spin"></i> Consultando medicamentos...</div>';

    try {
      const resp = await fetch(`/api/anvisa/buscar?q=${encodeURIComponent(term)}`);
      const data = await resp.json();

      if (!data.success || data.resultados.length === 0) {
        anvisaResults.innerHTML = `<div style="padding: 12px; color: #f59e0b; font-size: 0.82rem; text-align: center;"><i class="fa-solid fa-triangle-exclamation"></i> Nenhum medicamento encontrado para "${term}".</div>`;
      } else {
        anvisaResults.innerHTML = `
          <div style="display: flex; flex-direction: column;">
            ${data.resultados.map((med, i) => `
              <div class="anvisa-result-item" data-idx="${i}" style="padding: 10px 12px; cursor: pointer; transition: background 0.2s; border-bottom: 1px solid rgba(255,255,255,0.05);" onmouseover="this.style.background='rgba(99,102,241,0.15)';" onmouseout="this.style.background='transparent';">
                <div style="font-weight: 700; color: var(--text-primary); font-size: 0.85rem;">${med.nome}</div>
                <div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 2px;">
                  <span style="color: #10b981;">⚗️ ${med.principioAtivo}</span>
                  ${med.formaFarmaceutica !== 'N/D' ? ` · <span>💊 ${med.formaFarmaceutica}</span>` : ''}
                </div>
                ${med.categoria !== 'N/D' ? `<div style="font-size: 0.7rem; color: #818cf8; margin-top: 3px;">📋 ${med.categoria} · 🏭 ${med.fabricante}</div>` : ''}
              </div>
            `).join('')}
          </div>
        `;

        // Click to fill form
        anvisaResults.querySelectorAll('.anvisa-result-item').forEach(el => {
          el.addEventListener('click', () => {
            const med = data.resultados[parseInt(el.dataset.idx)];
            const nameInput = document.getElementById('pharm-input-name');
            const dosageInput = document.getElementById('pharm-input-dosage');
            const formInput = document.getElementById('pharm-input-form');
            if (nameInput) nameInput.value = med.principioAtivo !== 'N/D' ? med.principioAtivo : med.nome;
            if (dosageInput && dosageInput.value === '') dosageInput.value = '';
            if (formInput && med.formaFarmaceutica !== 'N/D') formInput.value = med.formaFarmaceutica;
            
            // Show verified badge
            if (anvisaBadge) {
              anvisaBadge.style.display = 'inline-flex';
              anvisaBadge.style.background = 'rgba(16,185,129,0.15)';
              anvisaBadge.style.color = '#10b981';
              anvisaBadge.style.border = '1px solid rgba(16,185,129,0.4)';
              anvisaBadge.innerHTML = '<i class="fa-solid fa-shield-halved" style="margin-right:4px;"></i> ANVISA Verificado';
            }
            
            anvisaSearch.value = med.nome;
            anvisaResults.style.display = 'none'; // hide dropdown
          });
        });
      }
    } catch (err) {
      anvisaResults.innerHTML = '<div style="padding: 12px; color: #ef4444; font-size: 0.82rem; text-align: center;"><i class="fa-solid fa-xmark-circle"></i> Erro ao consultar.</div>';
    }
  };

  anvisaSearch?.addEventListener('input', () => {
    clearTimeout(anvisaTimeout);
    const term = anvisaSearch.value.trim();
    if (term.length < 2) {
      anvisaResults.style.display = 'none';
      return;
    }
    anvisaTimeout = setTimeout(doAnvisaSearch, 300);
  });
  
  // Close dropdown on outside click
  document.addEventListener('click', (e) => {
    if (anvisaSearch && !anvisaSearch.contains(e.target) && anvisaResults && !anvisaResults.contains(e.target)) {
      anvisaResults.style.display = 'none';
    }
  });
  
  // Prevent form submission on enter in the search field
  anvisaSearch?.addEventListener('keydown', (e) => { 
    if (e.key === 'Enter') { e.preventDefault(); } 
  });

  document.getElementById('form-add-pharm-item')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('pharm-input-name').value.trim();
    const dosage = document.getElementById('pharm-input-dosage').value.trim();
    const form = document.getElementById('pharm-input-form').value.trim();
    const stockQuantity = Number(document.getElementById('pharm-input-stock').value || 0);
    const minStock = Number(document.getElementById('pharm-input-minstock').value || 10);
    const lotNumber = document.getElementById('pharm-input-lot').value.trim() || 'L2026';
    const expirationDate = document.getElementById('pharm-input-exp').value || '2027-12-31';
    const unitPrice = Number(document.getElementById('pharm-input-price').value || 0);

    if (!name) {
      showCustomAlert({ title: 'Aviso', message: 'Informe o nome do medicamento.', type: 'warning' });
      return;
    }

    const url = isEdit ? `/api/pharmacy/${itemToEdit.id}` : '/api/pharmacy';
    const method = isEdit ? 'PUT' : 'POST';

    try {
      const res = await apiFetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, dosage, form, stockQuantity, minStock, lotNumber, expirationDate, unitPrice })
      });

      if (res.ok) {
        closeModal();
        showCustomAlert({ title: 'Sucesso', message: `Medicamento "${name}" ${isEdit ? 'atualizado' : 'cadastrado'} com sucesso!`, type: 'success' });
        await loadPharmacyData();
      } else {
        const errData = await res.json();
        showCustomAlert({ title: 'Erro', message: errData.message || 'Falha ao salvar medicamento.', type: 'danger' });
      }
    } catch (err) {
      showCustomAlert({ title: 'Erro', message: 'Erro ao conectar com o servidor.', type: 'danger' });
    }
  });
}

function openDispenseMedModal() {
  const perms = (typeof getRolePermissions === 'function') ? getRolePermissions(state.user) : { canManagePharmacy: true, label: 'Usuário' };
  if (!perms.canManagePharmacy) {
    showCustomAlert({
      title: 'Acesso Restrito',
      message: `Seu perfil (<strong>${perms.label}</strong>) não possui permissão para realizar dispensação de medicamentos.`,
      type: 'warning'
    });
    return;
  }

  const existingModal = document.getElementById('modal-pharm-dispense-overlay');
  if (existingModal) existingModal.remove();

  const options = currentPharmacyItems.map(item => `
    <option value="${item.id}">${item.name} (${item.dosage || 'Sem dosagem'}) - Disponível: ${item.stockQuantity || 0} unds</option>
  `).join('');

  const modalHtml = `
    <div id="modal-pharm-dispense-overlay" style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(10, 10, 20, 0.82); backdrop-filter: blur(8px); display: flex; justify-content: center; align-items: center; z-index: 10000; padding: 16px;">
      <div style="background: #1e1c2e; border: 1px solid rgba(236, 72, 153, 0.3); border-radius: 16px; width: 100%; max-width: 500px; box-shadow: 0 20px 50px rgba(0,0,0,0.6); overflow: hidden; animation: fadeInModal 0.25s ease-out;">
        <div style="background: linear-gradient(135deg, #ec4899, #be185d); padding: 18px 24px; display: flex; justify-content: space-between; align-items: center; color: #fff;">
          <h3 style="margin: 0; font-size: 1.15rem; font-weight: 700; display: flex; align-items: center; gap: 10px;">
            <i class="fa-solid fa-hand-holding-medical"></i> Dispensação de Medicação
          </h3>
          <button type="button" id="btn-close-pharm-disp-modal" style="background: rgba(255,255,255,0.2); border: none; color: #fff; width: 32px; height: 32px; border-radius: 50%; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 1rem; transition: background 0.2s;">
            <i class="fa-solid fa-xmark"></i>
          </button>
        </div>

        <form id="form-dispense-pharm-item" style="padding: 24px;">
          <div style="display: grid; grid-template-columns: 1fr; gap: 16px;">
            <div>
              <label style="display: block; font-size: 0.85rem; font-weight: 600; color: var(--text-secondary); margin-bottom: 6px;">
                Selecione o Medicamento *
              </label>
              <select id="pharm-disp-item-id" class="form-input" style="width: 100%; box-sizing: border-box;" required>
                ${options.length ? options : '<option value="">Nenhum medicamento disponível</option>'}
              </select>
            </div>

            <div>
              <label style="display: block; font-size: 0.85rem; font-weight: 600; color: var(--text-secondary); margin-bottom: 6px;">
                Quantidade a Dispensar *
              </label>
              <input type="number" id="pharm-disp-qty" class="form-input" min="1" value="1" required style="width: 100%; box-sizing: border-box;">
            </div>
          </div>

          <div style="display: flex; justify-content: flex-end; gap: 12px; margin-top: 24px;">
            <button type="button" id="btn-cancel-pharm-disp" class="btn btn-secondary" style="padding: 10px 18px;">
              Cancelar
            </button>
            <button type="submit" class="btn btn-primary" style="background: linear-gradient(135deg, #ec4899, #be185d); border: none; padding: 10px 20px; font-weight: 600;">
              <i class="fa-solid fa-check" style="margin-right: 6px;"></i> Confirmar Baixa
            </button>
          </div>
        </form>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', modalHtml);

  const overlay = document.getElementById('modal-pharm-dispense-overlay');
  const closeModal = () => overlay?.remove();

  document.getElementById('btn-close-pharm-disp-modal')?.addEventListener('click', closeModal);
  document.getElementById('btn-cancel-pharm-disp')?.addEventListener('click', closeModal);

  document.getElementById('form-dispense-pharm-item')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const itemId = document.getElementById('pharm-disp-item-id').value;
    const quantity = Number(document.getElementById('pharm-disp-qty').value || 1);

    if (!itemId) {
      showCustomAlert({ title: 'Aviso', message: 'Selecione um medicamento válido.', type: 'warning' });
      return;
    }

    try {
      const res = await apiFetch('/api/pharmacy/dispense', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemId, quantity })
      });

      if (res.ok) {
        closeModal();
        showCustomAlert({ title: 'Sucesso', message: 'Dispensação realizada com sucesso!', type: 'success' });
        await loadPharmacyData();
      } else {
        const errData = await res.json();
        showCustomAlert({ title: 'Erro', message: errData.message || 'Falha ao dispensar medicação.', type: 'danger' });
      }
    } catch (err) {
      showCustomAlert({ title: 'Erro', message: 'Erro ao conectar com o servidor.', type: 'danger' });
    }
  });
}


// ============================================================================
// --- 📺 MÓDULO PAINEL DE CHAMADA PARA TV (TV SIGNAGE COM VOZ E MANCHESTER) ---
// ============================================================================

window.renderPharmacyTab = renderPharmacyTab;
window.renderPharmacyTable = renderPharmacyTable;
