// ─── MÓDULO DA ABA PACIENTES (HEALTH NEXUS v2.7.2) ──────────────────────────────
import { state, dataCache } from '../state.js';
import { apiFetch, cachedApiGet, removeAccents } from '../modules/api.js';
import { showToast, showCustomAlert, showCustomConfirm } from '../modules/ui.js';
import { syncManager } from '../modules/sync.js';
import { getRolePermissions } from '../modules/auth.js';

export function renderPatientsTab(contentArea) {
  contentArea.innerHTML = `
    <div class="tab-section active">
      <!-- Coluna Única: Lista com Busca Inteligente -->
      <div class="patients-list-container" style="width: 100%;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; flex-wrap: wrap; gap: 10px;">
          <div style="display: flex; align-items: center; gap: 12px;">
            <h3 style="margin: 0; font-family: 'Outfit'; font-weight: 600;">Pacientes Cadastrados</h3>
            <button id="btn-new-patient" class="btn btn-primary" style="padding: 6px 12px; font-size: 0.85rem; font-weight: 600; border-radius: 8px;"><i class="fa-solid fa-plus"></i> Novo Paciente</button>
          </div>
          <button id="patients-trash-btn" class="btn" style="background-color: rgba(239, 68, 68, 0.1); color: var(--danger-color); border: 1px solid rgba(239, 68, 68, 0.3); padding: 6px 12px; font-size: 0.85rem; font-weight: 600; border-radius: 8px; transition: all 0.2s;"><i class="fa-solid fa-trash-can" style="margin-right: 6px;"></i> Lixeira</button>
        </div>
        
        <div class="search-container">
          <div class="search-wrapper">
            <i class="fa-solid fa-magnifying-glass search-icon"></i>
            <input type="text" id="search-input" class="search-input" placeholder="Buscar paciente por nome, CPF, cidade ou ID (ignora caixa e acentos)...">
          </div>
        </div>

        <div id="patients-table-wrapper" style="overflow-x: auto;">
          <div style="text-align: center; color: var(--text-secondary); padding: 40px;">Carregando registros...</div>
        </div>
      </div>
    </div>

    <!-- Modal de Admissão de Paciente -->
    <div id="patient-modal-overlay" style="display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 1000; justify-content: center; align-items: center; backdrop-filter: blur(4px);">
      <div class="patients-form-container" style="background: var(--bg-secondary); width: 95%; max-width: 1000px; max-height: 90vh; display: flex; flex-direction: column; overflow: hidden; border-radius: 12px; padding: 24px; box-shadow: 0 10px 30px rgba(0,0,0,0.3); position: relative; animation: fadeIn 0.3s ease-out;">
        <button type="button" id="btn-close-patient-modal" style="position: absolute; top: 16px; right: 16px; background: transparent; border: none; font-size: 1.2rem; cursor: pointer; color: var(--text-secondary);"><i class="fa-solid fa-xmark"></i></button>
        <h3 id="form-title" style="margin-bottom: 16px; font-family: 'Outfit'; font-weight: 600; display: flex; align-items: center; gap: 8px;">
          <i class="fa-solid fa-id-card" style="color: var(--color-primary);"></i> Admissão de Paciente
        </h3>
        <form id="patient-form" style="display: flex; flex-direction: column; flex: 1; min-height: 0;">
          <input type="hidden" id="editId">
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(400px, 1fr)); gap: 20px; flex: 1; overflow: hidden; align-items: start;">
            <div style="display: flex; flex-direction: column; gap: 16px; overflow-y: auto; padding-right: 8px; max-height: 65vh;" class="custom-scrollbar">

          <!-- SEÇÃO 1: DADOS PESSOAIS & FILIAÇÃO -->
          <div style="background: var(--bg-tertiary); border: 1px solid var(--border-color); border-radius: 10px; padding: 14px; margin-bottom: 16px;">
            <div style="font-size: 0.82rem; font-weight: 700; color: var(--color-primary); text-transform: uppercase; margin-bottom: 12px; display: flex; align-items: center; gap: 6px;">
              <i class="fa-solid fa-user"></i> 1. Dados Pessoais &amp; Filiação
            </div>

            <div class="form-group">
                <label class="form-label" for="fullName">* Nome Completo (Civil):</label>
                <input type="text" id="fullName" class="form-input" required placeholder="Nome completo do paciente">
              </div>
              
              <div class="form-row">
                <div class="form-group">
                  <label class="form-label" for="cpf">* CPF:</label>
                  <input type="text" id="cpf" class="form-input" required placeholder="000.000.000-00" inputmode="numeric">
                </div>
                <div class="form-group">
                  <label class="form-label" for="birthDate">* Data de Nascimento:</label>
                  <input type="date" id="birthDate" class="form-input" required>
                </div>
              </div>

              <div class="form-row">
                <div class="form-group">
                  <label class="form-label" for="motherName">* Nome da Mãe (Obrigatório SUS):</label>
                  <input type="text" id="motherName" class="form-input" placeholder="Nome completo da mãe" required>
                </div>
                <div class="form-group">
                  <label class="form-label" for="fatherName">Nome do Pai:</label>
                  <input type="text" id="fatherName" class="form-input" placeholder="Nome completo do pai (opcional)">
                </div>
              </div>

              <div class="form-row">
                <div class="form-group">
                  <label class="form-label" for="organDonor">Doador de Órgãos:</label>
                  <select id="organDonor" class="form-input">
                    <option value="Não Declarado">Não Declarado</option>
                    <option value="Sim">Sim</option>
                    <option value="Não">Não</option>
                  </select>
                </div>
                <div class="form-group">
                  <label class="form-label" for="race">Raça / Cor (IBGE):</label>
                  <select id="race" class="form-input">
                    <option value="Parda">Parda</option>
                    <option value="Branca">Branca</option>
                    <option value="Preta">Preta</option>
                    <option value="Amarela">Amarela</option>
                    <option value="Indígena">Indígena</option>
                    <option value="Não Informado">Não Informado</option>
                  </select>
                </div>
                <div class="form-group">
                  <label class="form-label" for="religion">Religião / Crença:</label>
                  <input type="text" id="religion" class="form-input" placeholder="Ex: Católica, Evangélica, etc.">
                </div>
              </div>
            </div> <!-- Fim Seção 1 -->
            </div> <!-- Fim coluna 1 -->
            
            <div style="display: flex; flex-direction: column; gap: 16px; overflow-y: auto; padding-right: 8px; max-height: 65vh;" class="custom-scrollbar"> <!-- Início coluna 2 -->
            <!-- SEÇÃO 2: CONVÊNIO & CONTATO -->
            <div style="background: var(--bg-tertiary); border: 1px solid var(--border-color); border-radius: 10px; padding: 14px; margin-bottom: 0px; flex-shrink: 0;">
              <div style="font-size: 0.82rem; font-weight: 700; color: #10b981; text-transform: uppercase; margin-bottom: 12px; display: flex; align-items: center; gap: 6px;">
                <i class="fa-solid fa-hospital-user"></i> 2. Convênio &amp; Contato
              </div>

              <div class="form-row">
                <div class="form-group" style="flex: 1;">
                  <label class="form-label" for="healthPlan">Plano de Saúde / Convênio:</label>
                  <select id="healthPlan" class="form-input">
                    <option value="Particular">Particular</option>
                    <option value="SUS">SUS (Sistema Único de Saúde)</option>
                    <option value="Unimed">Unimed</option>
                    <option value="Bradesco Saúde">Bradesco Saúde</option>
                    <option value="Amil">Amil</option>
                    <option value="SulAmérica">SulAmérica</option>
                    <option value="Outro">Outro Convênio</option>
                  </select>
                </div>
                <div class="form-group" style="flex: 1;">
                  <label class="form-label" for="cardNumber">Nº Carteirinha / Cartão SUS:</label>
                  <input type="text" id="cardNumber" class="form-input" placeholder="000 0000 0000 0000">
                </div>
              </div>

              <div class="form-row">
                <div class="form-group" style="flex: 1;">
                  <label class="form-label" for="cep">CEP (Busca Auto):</label>
                  <div style="position: relative; display: flex; align-items: center;">
                    <input type="text" id="cep" class="form-input" placeholder="00000-000" inputmode="numeric" maxlength="9" style="padding-right: 36px;">
                    <button type="button" id="btn-search-cep" title="Buscar Endereço pelo CEP" style="position: absolute; right: 8px; background: transparent; border: none; color: #818cf8; cursor: pointer; font-size: 1rem; padding: 4px;">
                      <i class="fa-solid fa-magnifying-glass" id="cep-search-icon"></i>
                      <i class="fa-solid fa-spinner fa-spin" id="cep-loading-icon" style="display: none;"></i>
                    </button>
                  </div>
                </div>
                <div class="form-group" style="flex: 2;">
                  <label class="form-label" for="address">Endereço (Rua/Av):</label>
                  <input type="text" id="address" class="form-input" placeholder="Ex: Rua Santa Anita">
                </div>
              </div>
              
              <div class="form-row">
                <div class="form-group" style="flex: 1;">
                  <label class="form-label" for="number">Número / Compl.:</label>
                  <input type="text" id="number" class="form-input" placeholder="Ex: 120 / Ap 42">
                </div>
                <div class="form-group" style="flex: 1;">
                  <label class="form-label" for="neighborhood">Bairro:</label>
                  <input type="text" id="neighborhood" class="form-input" placeholder="Ex: Vila Promissão">
                </div>
                <div class="form-group" style="flex: 1;">
                  <label class="form-label" for="city">Cidade / UF:</label>
                  <input type="text" id="city" class="form-input" placeholder="Ex: Osvaldo Cruz - SP">
                </div>
              </div>
              
              <div class="form-row">
                <div class="form-group">
                  <label class="form-label" for="phone">Telefone Fixo:</label>
                  <input type="text" id="phone" class="form-input" placeholder="(18) 3528-5022">
                </div>
                <div class="form-group">
                  <label class="form-label" for="cellphone">Celular / WhatsApp:</label>
                  <input type="text" id="cellphone" class="form-input" placeholder="(18) 98817-5809">
                </div>
                <div class="form-group">
                  <label class="form-label" for="billingValue">Valor Consulta/Tabela:</label>
                  <input type="text" id="billingValue" class="form-input" placeholder="R$ 0,00">
                </div>
              </div>
            </div>

            <!-- SEÇÃO 3: RESPONSÁVEL LEGAL -->
            <div style="background: var(--bg-tertiary); border: 1px solid var(--border-color); border-radius: 10px; padding: 14px; margin-bottom: 0px; flex-shrink: 0;">
              <div style="font-size: 0.82rem; font-weight: 700; color: #f59e0b; text-transform: uppercase; margin-bottom: 12px; display: flex; align-items: center; gap: 6px;">
                <i class="fa-solid fa-users"></i> 3. Responsável Legal / Acompanhante
              </div>

              <div id="responsible-alert-badge" style="display: none; background: rgba(245, 158, 11, 0.12); border: 1px solid rgba(245, 158, 11, 0.35); color: #fbbf24; border-radius: 8px; padding: 10px 12px; font-size: 0.8rem; margin-bottom: 12px;">
                <i class="fa-solid fa-circle-info"></i> Preenchimento obrigatório para menores de 18 anos ou maiores de 65 anos.
              </div>

              <div class="form-row">
                <div class="form-group" style="flex: 2;">
                  <label class="form-label" for="responsibleName" id="lbl-responsibleName">Nome do Responsável:</label>
                  <input type="text" id="responsibleName" class="form-input" placeholder="Nome completo do responsável legal">
                </div>
                <div class="form-group" style="flex: 1;">
                  <label class="form-label" for="responsibleCpf" id="lbl-responsibleCpf">CPF Responsável:</label>
                  <input type="text" id="responsibleCpf" class="form-input" placeholder="000.000.000-00" inputmode="numeric">
                </div>
              </div>

              <div class="form-row">
                <div class="form-group">
                  <label class="form-label" for="responsiblePhone">Telefone Responsável:</label>
                  <input type="text" id="responsiblePhone" class="form-input" placeholder="(18) 99999-0000">
                </div>
                <div class="form-group">
                  <label class="form-label" for="responsibleRelationship">Grau de Parentesco:</label>
                  <select id="responsibleRelationship" class="form-input">
                    <option value="Pai/Mãe">Pai / Mãe</option>
                    <option value="Cônjuge">Cônjuge / Esposo(a)</option>
                    <option value="Filho(a)">Filho(a)</option>
                    <option value="Tutor(a)">Tutor(a) Legal</option>
                    <option value="Outro">Outro Parentesco</option>
                  </select>
                </div>
              </div>
            </div>
            </div> <!-- Fim coluna 2 -->
          </div> <!-- Fim grid duas colunas -->

            <div style="display: flex; gap: 10px; margin-top: 20px; padding-top: 16px; border-top: 1px solid var(--border-color); flex-wrap: wrap;">
              <button type="submit" id="submit-btn" class="btn btn-primary" style="flex: 1; min-width: 150px;">
                <i class="fa-solid fa-floppy-disk"></i> Salvar Cadastro
              </button>
              <button type="button" id="submit-and-admit-btn" class="btn" style="flex: 1.2; min-width: 190px; background: linear-gradient(135deg, #10b981, #059669); color: #ffffff; border: none; font-weight: 700; cursor: pointer; box-shadow: 0 4px 14px rgba(16, 185, 129, 0.35);">
                <i class="fa-solid fa-truck-medical"></i> Salvar e Admitir no PS
              </button>
              <button type="button" id="cancel-edit-btn" class="btn" style="background-color: var(--bg-tertiary); color: var(--text-primary); flex: 0.6; min-width: 90px;">Cancelar</button>
            </div>
          </form>
        </div>
      </div>
  `;

  if (typeof window.applyInputMasks === 'function') window.applyInputMasks();

  let allPatients = [];

  const renderTableRows = (patientsToRender) => {
    const wrapper = document.getElementById('patients-table-wrapper');
    if (!wrapper) return;
    
    if (patientsToRender.length === 0) {
      wrapper.innerHTML = `<div style="text-align: center; color: var(--text-secondary); padding: 40px;">Nenhum paciente encontrado.</div>`;
      return;
    }

    let tableHtml = `
      <table class="patients-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Nome Completo</th>
            <th>CPF</th>
            <th>Data Nasc.</th>
            <th>Cidade</th>
            <th>Telefones</th>
            <th>Valor</th>
            <th style="text-align: right;">Ações</th>
          </tr>
        </thead>
        <tbody>
    `;

    patientsToRender.forEach(p => {
      let formattedDate = p.birthDate;
      if (p.birthDate && p.birthDate.includes('-')) {
        const [y, m, d] = p.birthDate.split('-');
        formattedDate = `${d}/${m}/${y}`;
      }
      
      const phones = [p.phone, p.cellphone].filter(Boolean).join(' / ');
      
      tableHtml += `
        <tr>
          <td style="font-family: monospace; font-weight: 600; color: var(--color-primary);">${p.id}</td>
          <td style="font-weight: 500;">${p.fullName}<br><small style="color: var(--text-muted); font-size: 0.76rem;">Mãe: ${p.motherName || '-'}</small></td>
          <td style="font-family: monospace; font-size: 0.9rem;">${p.cpf}</td>
          <td>${formattedDate}</td>
          <td>${p.city || '-'}</td>
          <td style="font-size: 0.85rem; color: var(--text-secondary);">${phones || '-'}</td>
          <td style="font-family: monospace; font-weight: 500;">${p.billingValue || 'R$ 0,00'}</td>
          <td>
            <div class="actions-cell">
              <button class="btn-icon btn-icon-admit" onclick="window.admitPatientFromPatientsTab('${p.id}', '${(p.fullName||'').replace(/'/g, "\\'")}', '${p.cpf||''}')" title="Admitir / Atender este Paciente">
                <i class="fa-solid fa-hospital-user"></i>
              </button>
              <button class="btn-icon btn-icon-history" onclick="window.openPatientHistoryModal('${p.id}', '${(p.fullName||'').replace(/'/g, "\\'")}')" title="Ver Prontuário & Histórico Pós-Alta">
                <i class="fa-solid fa-file-medical"></i>
              </button>
              <button class="btn-icon btn-icon-pdf" onclick="window.generatePatientPDF('${p.id}', '${(p.fullName||'').replace(/'/g, "\\'")}')" title="Gerar Prontuário PDF">
                <i class="fa-solid fa-file-pdf"></i>
              </button>
              <button class="btn-icon btn-icon-edit" 
                data-edit-id="${p.id}" 
                data-full-name="${p.fullName || ''}" 
                data-cpf="${p.cpf || ''}" 
                data-birth-date="${p.birthDate || ''}"
                data-mother-name="${p.motherName || ''}"
                data-father-name="${p.fatherName || ''}"
                data-organ-donor="${p.organDonor || 'Não Declarado'}"
                data-race="${p.race || 'Parda'}"
                data-religion="${p.religion || ''}"
                data-health-plan="${p.healthPlan || 'Particular'}"
                data-card-number="${p.cardNumber || ''}"
                data-responsible-name="${p.responsibleName || ''}"
                data-responsible-cpf="${p.responsibleCpf || ''}"
                data-responsible-phone="${p.responsiblePhone || ''}"
                data-responsible-relationship="${p.responsibleRelationship || 'Pai/Mãe'}"
                data-cep="${p.cep || ''}"
                data-address="${p.address || ''}"
                data-number="${p.number || ''}"
                data-neighborhood="${p.neighborhood || ''}"
                data-city="${p.city || ''}"
                data-phone="${p.phone || ''}"
                data-cellphone="${p.cellphone || ''}"
                data-billing-value="${p.billingValue || ''}"
                title="Alterar / Editar Paciente">
                <i class="fa-solid fa-pen-to-square"></i>
              </button>
              <button class="btn-icon btn-icon-delete" data-delete-id="${p.id}" title="Excluir Paciente">
                <i class="fa-solid fa-trash-can"></i>
              </button>
            </div>
          </td>
        </tr>
      `;
    });

    tableHtml += `</tbody></table>`;
    wrapper.innerHTML = tableHtml;

    document.querySelectorAll('.btn-icon-edit').forEach(btn => {
      btn.addEventListener('click', () => {
        document.getElementById('editId').value = btn.getAttribute('data-edit-id');
        document.getElementById('fullName').value = btn.getAttribute('data-full-name');
        document.getElementById('cpf').value = btn.getAttribute('data-cpf');
        document.getElementById('birthDate').value = btn.getAttribute('data-birth-date');
        
        if (document.getElementById('motherName')) document.getElementById('motherName').value = btn.getAttribute('data-mother-name') || '';
        if (document.getElementById('fatherName')) document.getElementById('fatherName').value = btn.getAttribute('data-father-name') || '';
        if (document.getElementById('organDonor')) document.getElementById('organDonor').value = btn.getAttribute('data-organ-donor') || 'Não Declarado';
        if (document.getElementById('race')) document.getElementById('race').value = btn.getAttribute('data-race') || 'Parda';
        if (document.getElementById('religion')) document.getElementById('religion').value = btn.getAttribute('data-religion') || '';
        if (document.getElementById('healthPlan')) document.getElementById('healthPlan').value = btn.getAttribute('data-health-plan') || 'Particular';
        if (document.getElementById('cardNumber')) document.getElementById('cardNumber').value = btn.getAttribute('data-card-number') || '';
        if (document.getElementById('responsibleName')) document.getElementById('responsibleName').value = btn.getAttribute('data-responsible-name') || '';
        if (document.getElementById('responsibleCpf')) document.getElementById('responsibleCpf').value = btn.getAttribute('data-responsible-cpf') || '';
        if (document.getElementById('responsiblePhone')) document.getElementById('responsiblePhone').value = btn.getAttribute('data-responsible-phone') || '';
        if (document.getElementById('responsibleRelationship')) document.getElementById('responsibleRelationship').value = btn.getAttribute('data-responsible-relationship') || 'Pai/Mãe';

        const cepEl = document.getElementById('cep');
        if (cepEl) cepEl.value = btn.getAttribute('data-cep') || '';
        document.getElementById('address').value = btn.getAttribute('data-address');
        const numEl = document.getElementById('number');
        if (numEl) numEl.value = btn.getAttribute('data-number') || '';
        const neighEl = document.getElementById('neighborhood');
        if (neighEl) neighEl.value = btn.getAttribute('data-neighborhood') || '';
        document.getElementById('city').value = btn.getAttribute('data-city');
        document.getElementById('phone').value = btn.getAttribute('data-phone');
        document.getElementById('cellphone').value = btn.getAttribute('data-cellphone');
        document.getElementById('billingValue').value = btn.getAttribute('data-billing-value');

        document.getElementById('form-title').innerHTML = '<i class="fa-solid fa-pen-to-square" style="color: var(--color-primary);"></i> Editar Paciente';
        document.getElementById('submit-btn').textContent = "Salvar Alterações";

        checkAgeValidation();

        const modalOverlay = document.getElementById('patient-modal-overlay');
        if (modalOverlay) modalOverlay.style.display = 'flex';
      });
    });

    document.querySelectorAll('.btn-icon-delete').forEach(btn => {
      btn.addEventListener('click', async () => {
        const perms = getRolePermissions(state.user);
        if (!perms.canDeleteRecords) {
          showCustomAlert({
            title: 'Acesso Restrito',
            message: `Seu perfil (<strong>${perms.label}</strong>) não possui permissão para excluir registros de pacientes. Apenas Administradores e Master podem realizar esta operação.`,
            type: 'warning'
          });
          return;
        }

        const id = btn.getAttribute('data-delete-id');
        const confirmed = await showCustomConfirm({
          title: 'Excluir Paciente',
          message: 'Tem certeza de que deseja excluir este paciente do sistema?',
          confirmText: 'Sim, Excluir',
          cancelText: 'Cancelar',
          type: 'danger'
        });

        if (confirmed) {
          try {
            const deleteRes = await apiFetch(`/api/patients/${id}`, { method: 'DELETE' });
            if (deleteRes.ok) {
              loadAndRenderTable();
              if (document.getElementById('editId').value === id) {
                resetForm();
              }
              state.loading = true;
            } else {
              showCustomAlert({ title: 'Erro', message: 'Erro ao excluir paciente.', type: 'danger' });
            }
          } catch (err) {
            showCustomAlert({ title: 'Erro', message: 'Erro ao conectar-se à API.', type: 'danger' });
          }
        }
      });
    });
  };

  const checkAgeValidation = () => {
    const birthVal = document.getElementById('birthDate')?.value;
    if (!birthVal) return;
    const birth = new Date(birthVal + 'T12:00:00');
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;

    const alertBadge = document.getElementById('responsible-alert-badge');
    const respName = document.getElementById('responsibleName');
    const respCpf = document.getElementById('responsibleCpf');
    const lblName = document.getElementById('lbl-responsibleName');
    const lblCpf = document.getElementById('lbl-responsibleCpf');

    if (age < 18 || age > 65) {
      if (alertBadge) {
        alertBadge.style.display = 'block';
        alertBadge.innerHTML = `<i class="fa-solid fa-triangle-exclamation"></i> <strong>Idade (${age} anos):</strong> Menores de 18 anos ou maiores de 65 anos exigem o preenchimento do Responsável Legal.`;
      }
      if (respName) respName.required = true;
      if (respCpf) respCpf.required = true;
      if (lblName) lblName.textContent = '* Nome do Responsável (Obrigatório):';
      if (lblCpf) lblCpf.textContent = '* CPF Responsável (Obrigatório):';
    } else {
      if (alertBadge) alertBadge.style.display = 'none';
      if (respName) respName.required = false;
      if (respCpf) respCpf.required = false;
      if (lblName) lblName.textContent = 'Nome do Responsável:';
      if (lblCpf) lblCpf.textContent = 'CPF Responsável:';
    }
  };

  const birthInput = document.getElementById('birthDate');
  if (birthInput) {
    birthInput.addEventListener('change', checkAgeValidation);
    birthInput.addEventListener('input', checkAgeValidation);
  }

  const cepInput = document.getElementById('cep');
  const btnSearchCep = document.getElementById('btn-search-cep');
  let lastSearchedCep = '';

  const executeCepLookup = async () => {
    if (!cepInput) return;
    let rawVal = cepInput.value || '';
    let cleanVal = rawVal.replace(/\D/g, '');
    if (cleanVal.length > 8) cleanVal = cleanVal.substring(0, 8);

    if (cleanVal.length > 5) {
      cepInput.value = cleanVal.substring(0, 5) + '-' + cleanVal.substring(5);
    } else {
      cepInput.value = cleanVal;
    }

    if (cleanVal.length !== 8) return;
    if (cleanVal === lastSearchedCep) return;
    lastSearchedCep = cleanVal;

    const searchIcon = document.getElementById('cep-search-icon');
    const loadingIcon = document.getElementById('cep-loading-icon');
    if (searchIcon) searchIcon.style.display = 'none';
    if (loadingIcon) loadingIcon.style.display = 'inline-block';

    try {
      let foundData = null;

      // 1. Tentativa via ViaCEP
      try {
        const r1 = await fetch(`https://viacep.com.br/ws/${cleanVal}/json/`);
        if (r1.ok) {
          const d1 = await r1.json();
          if (!d1.erro && d1.localidade) {
            foundData = {
              street: d1.logradouro || '',
              neighborhood: d1.bairro || '',
              city: `${d1.localidade} - ${d1.uf}`
            };
          }
        }
      } catch (e) {}

      // 2. Fallback via BrasilAPI
      if (!foundData) {
        try {
          const r2 = await fetch(`https://brasilapi.com.br/api/cep/v1/${cleanVal}`);
          if (r2.ok) {
            const d2 = await r2.json();
            if (d2.city) {
              foundData = {
                street: d2.street || '',
                neighborhood: d2.neighborhood || '',
                city: `${d2.city} - ${d2.state}`
              };
            }
          }
        } catch (e) {}
      }

      // 3. Fallback via Backend API
      if (!foundData) {
        try {
          const r3 = await apiFetch(`/api/cep/${cleanVal}`);
          if (r3.ok) {
            const p3 = await r3.json();
            if (p3.status === 'success' && p3.data) {
              foundData = {
                street: p3.data.street || p3.data.address || '',
                neighborhood: p3.data.neighborhood || '',
                city: p3.data.city
              };
            }
          }
        } catch (e) {}
      }

      if (foundData) {
        const addressInput = document.getElementById('address');
        const neighborhoodInput = document.getElementById('neighborhood');
        const cityInput = document.getElementById('city');
        const numberInput = document.getElementById('number');

        if (addressInput && foundData.street) addressInput.value = foundData.street;
        if (neighborhoodInput && foundData.neighborhood) neighborhoodInput.value = foundData.neighborhood;
        if (cityInput && foundData.city) cityInput.value = foundData.city;

        showToast(`Endereço localizado: ${foundData.city}`);
        if (numberInput) numberInput.focus();
      } else {
        showCustomAlert({
          title: 'CEP Não Encontrado',
          message: `Não foi possível localizar o endereço para o CEP <strong>${cepInput.value}</strong>. Por favor, digite o endereço manualmente.`,
          type: 'warning'
        });
      }
    } catch (err) {
      console.error('Erro na busca de CEP:', err);
    } finally {
      if (searchIcon) searchIcon.style.display = 'inline-block';
      if (loadingIcon) loadingIcon.style.display = 'none';
    }
  };

  if (cepInput) {
    cepInput.addEventListener('input', executeCepLookup);
    cepInput.addEventListener('change', executeCepLookup);
    cepInput.addEventListener('blur', executeCepLookup);
  }
  if (btnSearchCep) {
    btnSearchCep.addEventListener('click', () => {
      lastSearchedCep = '';
      executeCepLookup();
    });
  }

  const loadAndRenderTable = async () => {
    try {
      const result = await cachedApiGet(`/api/patients`, 'patients');
      allPatients = Array.isArray(result) ? result : (result.data || []);
      renderTableRows(allPatients);
    } catch (err) {
      console.error('Erro ao carregar pacientes:', err);
      const wrapper = document.getElementById('patients-table-wrapper');
      if (wrapper) wrapper.innerHTML = `<div style="text-align: center; color: var(--text-secondary); padding: 40px;">Erro ao carregar dados do banco de dados.</div>`;
    }
  };

  const resetForm = () => {
    document.getElementById('patient-form').reset();
    document.getElementById('editId').value = "";
    document.getElementById('form-title').innerHTML = '<i class="fa-solid fa-id-card" style="color: var(--color-primary);"></i> Admissão de Paciente';
    document.getElementById('submit-btn').textContent = "Registrar Paciente";
    const alertBadge = document.getElementById('responsible-alert-badge');
    if (alertBadge) alertBadge.style.display = 'none';
    
    const modalOverlay = document.getElementById('patient-modal-overlay');
    if (modalOverlay) modalOverlay.style.display = 'none';
  };

  document.getElementById('cancel-edit-btn')?.addEventListener('click', resetForm);
  document.getElementById('btn-close-patient-modal')?.addEventListener('click', resetForm);
  document.getElementById('btn-new-patient')?.addEventListener('click', () => {
    resetForm();
    const modalOverlay = document.getElementById('patient-modal-overlay');
    if (modalOverlay) modalOverlay.style.display = 'flex';
  });

  document.getElementById('patients-trash-btn')?.addEventListener('click', () => {
    if (typeof window.showTrashModal === 'function') window.showTrashModal('patients');
  });

  document.getElementById('search-input')?.addEventListener('input', (e) => {
    const query = removeAccents(e.target.value.trim());
    const filtered = allPatients.filter(p => {
      return removeAccents(p.fullName).includes(query) ||
             removeAccents(p.cpf).includes(query) ||
             removeAccents(p.city || '').includes(query) ||
             removeAccents(p.id).includes(query);
    });
    renderTableRows(filtered);
  });

  document.getElementById('patient-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const editId = document.getElementById('editId').value;
    const fullName = document.getElementById('fullName').value;
    const cpf = document.getElementById('cpf').value;
    const birthDate = document.getElementById('birthDate').value;
    const motherName = document.getElementById('motherName')?.value || '';
    const fatherName = document.getElementById('fatherName')?.value || '';
    const organDonor = document.getElementById('organDonor')?.value || 'Não Declarado';
    const race = document.getElementById('race')?.value || 'Parda';
    const religion = document.getElementById('religion')?.value || '';
    const healthPlan = document.getElementById('healthPlan')?.value || 'Particular';
    const cardNumber = document.getElementById('cardNumber')?.value || '';
    const responsibleName = document.getElementById('responsibleName')?.value || '';
    const responsibleCpf = document.getElementById('responsibleCpf')?.value || '';
    const responsiblePhone = document.getElementById('responsiblePhone')?.value || '';
    const responsibleRelationship = document.getElementById('responsibleRelationship')?.value || 'Pai/Mãe';
    const cep = document.getElementById('cep')?.value || '';
    const address = document.getElementById('address').value;
    const number = document.getElementById('number')?.value || '';
    const neighborhood = document.getElementById('neighborhood')?.value || '';
    const city = document.getElementById('city').value;
    const phone = document.getElementById('phone').value;
    const cellphone = document.getElementById('cellphone').value;
    const billingValue = document.getElementById('billingValue').value;

    const isEdit = !!editId;
    const url = isEdit ? `/api/patients/${editId}` : `/api/patients`;
    const method = isEdit ? 'PUT' : 'POST';

    const submitButton = document.getElementById('submit-btn');
    const originalSubmitText = submitButton?.textContent || '';
    try {
      if (submitButton) {
        submitButton.disabled = true;
        submitButton.textContent = 'Salvando...';
      }

      const payload = {
        fullName, cpf, birthDate, motherName, fatherName, organDonor, race, religion,
        healthPlan, cardNumber, responsibleName, responsibleCpf, responsiblePhone, responsibleRelationship,
        cep, address, number, neighborhood, city, phone, cellphone, billingValue
      };

      const res = await apiFetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      let data = {};
      try {
        data = await res.json();
      } catch (e) {
        data = {};
      }

      if (res.ok) {
        const savedPatientId = (data.data && data.data.id) || payload.id || editId;

        try {
          resetForm();
        } catch (e) {
          const modalOverlay = document.getElementById('patient-modal-overlay');
          if (modalOverlay) modalOverlay.style.display = 'none';
        }

        try {
          dataCache.delete('patients');
          await loadAndRenderTable();
        } catch (e) {
          console.warn('Erro ao recarregar tabela:', e);
        }

        if (shouldDirectlyAdmit && !isEdit) {
          shouldDirectlyAdmit = false;
          try {
            const encRes = await apiFetch(`/api/encounters`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                patientId: savedPatientId,
                patientName: fullName,
                type: 'Urgencia',
                status: 'Aguardando_Triagem',
                admitted_at: new Date().toISOString()
              })
            });
            if (encRes.ok) {
              showToast(`✅ ${fullName} cadastrado e admitido na Triagem!`);
              if (typeof window.switchTab === 'function') {
                window.switchTab('atendimento');
              }
              if (typeof window.showFlowCompletionNotification === 'function') {
                window.showFlowCompletionNotification({
                  actionTitle: '🏥 Admissão no PS Concluída',
                  message: `O paciente <strong>${fullName}</strong> já está na fila de <strong>Aguardando Triagem</strong>.<br><br><strong>Próximo Passo:</strong> Clique no botão <strong>Realizar Triagem</strong> do card para registrar os sinais vitais e a classificação Manchester.`,
                  targetTab: 'atendimento',
                  targetTabLabel: 'Fila de Triagem Manchester',
                  targetColumn: 'col-triage',
                  targetPatientName: fullName,
                  persistent: true
                });
              }
            }
          } catch (e) {
            console.error('Erro ao auto-admitir:', e);
          }
        } else if (!isEdit) {
          if (typeof window.showFlowCompletionNotification === 'function') {
            window.showFlowCompletionNotification({
              actionTitle: '✅ Cadastro de Paciente Concluído',
              message: `O paciente <strong>${fullName}</strong> foi cadastrado com sucesso no sistema SUS.<br><br><strong>Próximo Passo:</strong> Clique no botão abaixo para abrir a <strong>Central de Atendimentos</strong> com <strong>${fullName}</strong> pré-selecionado para admissão imediata.`,
              targetTab: 'atendimento',
              targetTabLabel: 'Admitir para Triagem',
              targetPatientId: savedPatientId,
              targetPatientName: fullName,
              targetPatientCpf: cpf,
              actionType: 'admit_patient',
              persistent: true
            });
          } else {
            showToast(`✅ Paciente ${isEdit ? 'atualizado' : 'cadastrado'} com sucesso!`);
          }
        } else {
          showToast(`✅ Paciente atualizado com sucesso!`);
        }

        try {
          if (typeof syncManager !== 'undefined' && syncManager && typeof syncManager.pushToCloud === 'function') {
            syncManager.pushToCloud(false).catch(() => null);
          }
        } catch (e) {}

        state.loading = true;
      } else {
        showCustomAlert({ title: 'Erro', message: data.message || 'Falha ao salvar paciente.', type: 'danger' });
      }
    } catch (err) {
      console.error('Erro ao conectar-se à API:', err);
      showCustomAlert({ title: 'Erro', message: 'Erro ao conectar-se à API: ' + (err.message || ''), type: 'danger' });
    } finally {
      shouldDirectlyAdmit = false;
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.textContent = originalSubmitText;
      }
    }
  });

  let shouldDirectlyAdmit = false;
  document.getElementById('submit-and-admit-btn')?.addEventListener('click', () => {
    shouldDirectlyAdmit = true;
    const form = document.getElementById('patient-form');
    if (form && form.reportValidity()) {
      form.dispatchEvent(new Event('submit', { cancelable: true }));
    } else {
      shouldDirectlyAdmit = false;
    }
  });

  loadAndRenderTable();
}
