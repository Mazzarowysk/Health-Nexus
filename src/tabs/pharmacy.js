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
        <div class="kpi-card" style="background: var(--bg-secondary); border: 1px solid var(--border-color); padding: 18px; border-radius: 12px;">
          <div style="display: flex; justify-content: space-between; align-items: center; color: var(--text-secondary); font-size: 0.85rem;">
            <span>TOTAL DE ITENS</span>
            <i class="fa-solid fa-boxes-stacked" style="color: var(--color-primary);"></i>
          </div>
          <div id="kpi-pharm-total" style="font-size: 1.8rem; font-weight: 700; color: var(--text-primary); margin-top: 8px;">--</div>
        </div>

        <div class="kpi-card" style="background: var(--bg-secondary); border: 1px solid var(--border-color); padding: 18px; border-radius: 12px;">
          <div style="display: flex; justify-content: space-between; align-items: center; color: var(--text-secondary); font-size: 0.85rem;">
            <span>ESTOQUE CRÍTICO</span>
            <i class="fa-solid fa-triangle-exclamation" style="color: #ef4444;"></i>
          </div>
          <div id="kpi-pharm-critical" style="font-size: 1.8rem; font-weight: 700; color: #ef4444; margin-top: 8px;">--</div>
        </div>

        <div class="kpi-card" style="background: var(--bg-secondary); border: 1px solid var(--border-color); padding: 18px; border-radius: 12px;">
          <div style="display: flex; justify-content: space-between; align-items: center; color: var(--text-secondary); font-size: 0.85rem;">
            <span>UNIDADES EM ESTOQUE</span>
            <i class="fa-solid fa-capsules" style="color: #10b981;"></i>
          </div>
          <div id="kpi-pharm-units" style="font-size: 1.8rem; font-weight: 700; color: #10b981; margin-top: 8px;">--</div>
        </div>

        <div class="kpi-card" style="background: var(--bg-secondary); border: 1px solid var(--border-color); padding: 18px; border-radius: 12px;">
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
          <input type="text" id="pharm-search-input" class="form-input" placeholder="Buscar medicamento ou lote..." style="max-width: 280px;">
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
}

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

  tbody.innerHTML = items.map(item => {
    const qty = Number(item.stockQuantity || 0);
    const min = Number(item.minStock || 10);
    const price = Number(item.unitPrice || 0);
    const isCritical = qty <= min;

    totalUnits += qty;
    totalValue += (qty * price);
    if (isCritical) criticalCount++;

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

  document.getElementById('kpi-pharm-total').textContent = totalItems;
  document.getElementById('kpi-pharm-critical').textContent = criticalCount;
  document.getElementById('kpi-pharm-units').textContent = totalUnits;
  document.getElementById('kpi-pharm-value').textContent = `R$ ${totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;

  // Eventos de Editar e Excluir
  document.querySelectorAll('.btn-edit-pharm').forEach(btn => {
    btn.addEventListener('click', () => {
      const item = currentPharmacyItems.find(i => i.id === btn.dataset.id);
      if (item) openAddPharmModal(item);
    });
  });

  document.querySelectorAll('.btn-del-pharm').forEach(btn => {
    btn.addEventListener('click', async () => {
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
            <div>
              <label style="display: block; font-size: 0.85rem; font-weight: 600; color: var(--text-secondary); margin-bottom: 6px;">
                Nome do Medicamento *
              </label>
              <input type="text" id="pharm-input-name" class="form-input" required value="${itemToEdit?.name || ''}" placeholder="Ex: Amoxicilina + Clavulanato" style="width: 100%; box-sizing: border-box;">
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
