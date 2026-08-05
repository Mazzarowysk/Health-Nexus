import { apiFetch, showToast, abbreviateName, switchTab, setupCustomSelect, anonymizeCPF, exportToPDF, formatSyncDate, showCustomAlert, renderTabContent, cachedApiGet, getRolePermissions } from '../main.js';
import { state, dataCache, dataCacheTimestamps } from '../state.js';

const API_URL = '/api';

async function renderStagnationTab(container) {
  container.innerHTML = `
    <div class="tab-section active">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; flex-wrap: wrap; gap: 12px;">
        <div>
          <h2 style="font-family: Outfit, sans-serif; font-size: 1.4rem; font-weight: 700; color: var(--text-primary); margin: 0; display: flex; align-items: center; gap: 10px;">
            <i class="fa-solid fa-triangle-exclamation" style="color: #f59e0b;"></i> Painel de Alertas & Estagnação
          </h2>
          <div style="font-size: 0.85rem; color: var(--text-secondary); margin-top: 4px;">
            Monitoramento proativo de permissões, permanência e gargalos hospitalares.
          </div>
        </div>
        <button id="btn-refresh-stagnation" class="btn btn-secondary" style="font-size: 0.85rem; padding: 8px 16px;">
          <i class="fa-solid fa-arrows-rotate" style="margin-right: 6px;"></i> Atualizar Alertas
        </button>
      </div>

      <!-- Área de Aprovações de Acesso Master (Exclusivo para Master) -->
      <div id="stagnation-master-approval-area"></div>

      <div id="stagnation-kpi-area" class="kpi-grid" style="grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); margin-bottom: 24px;">
        <div class="kpi-card" id="stag-card-critical" style="border-left: 4px solid #ef4444; cursor: pointer; transition: transform 0.2s, box-shadow 0.2s;" title="Filtrar por Alertas Críticos">
          <div class="kpi-header"><span>Alertas Críticos</span><div class="kpi-icon danger"><i class="fa-solid fa-bell"></i></div></div>
          <div class="kpi-value" id="stag-kpi-critical">0</div>
          <div class="kpi-trend"><span>Risco Clínico / Fila Vermelha</span></div>
        </div>
        <div class="kpi-card" id="stag-card-warning" style="border-left: 4px solid #f59e0b; cursor: pointer; transition: transform 0.2s, box-shadow 0.2s;" title="Filtrar por Alertas de Espera">
          <div class="kpi-header"><span>Alertas de Espera</span><div class="kpi-icon warning"><i class="fa-solid fa-hourglass-half"></i></div></div>
          <div class="kpi-value" id="stag-kpi-warning">0</div>
          <div class="kpi-trend"><span>Estouro de SLA (> 15/30 min)</span></div>
        </div>
        <div class="kpi-card" id="stag-card-total" style="border-left: 4px solid #3b82f6; cursor: pointer; transition: transform 0.2s, box-shadow 0.2s;" title="Mostrar Todos os Pacientes Estagnados">
          <div class="kpi-header"><span>Total Estagnados</span><div class="kpi-icon primary"><i class="fa-solid fa-hospital-user"></i></div></div>
          <div class="kpi-value" id="stag-kpi-total">0</div>
          <div class="kpi-trend"><span>Pacientes Necessitando Ação</span></div>
        </div>
      </div>

      <div class="table-container" style="background: var(--bg-secondary); border: 1px solid var(--border-color); border-radius: 16px; padding: 20px;">
        <div id="stagnation-list-wrapper">
          <div style="text-align: center; color: var(--text-muted); padding: 40px;">
            <i class="fa-solid fa-circle-notch fa-spin" style="font-size: 2rem; color: var(--color-primary); margin-bottom: 12px;"></i>
            <div>Calculando indicadores de estagnação...</div>
          </div>
        </div>
      </div>
    </div>
  `;

  document.getElementById('btn-refresh-stagnation')?.addEventListener('click', () => renderStagnationTab(container));

  window.currentStagnationFilter = 'ALL';
  window.currentStagnationAlerts = [];

  ['critical', 'warning', 'total'].forEach(type => {
    const card = document.getElementById(`stag-card-${type}`);
    if (card) {
      card.addEventListener('click', () => {
        window.currentStagnationFilter = type === 'critical' ? 'CRITICAL' : type === 'warning' ? 'WARNING' : 'ALL';
        
        document.querySelectorAll('.kpi-card').forEach(c => {
          c.style.transform = 'scale(1)';
          c.style.boxShadow = 'none';
        });
        card.style.transform = 'scale(1.02)';
        card.style.boxShadow = '0 8px 24px rgba(0,0,0,0.15)';

        if (window.renderStagnationTable) {
          window.renderStagnationTable();
        }
      });
    }
  });

  await loadAndRenderStagnationData();
}

async function loadAndRenderStagnationData() {
  try {
    const perms = getRolePermissions(state.user);
    const isMaster = perms.canApproveUsers;
    let pendingUsers = [];

    if (isMaster) {
      try {
        const resUsers = await apiFetch('/api/users');
        if (resUsers.ok) {
          const payloadUsers = await resUsers.json();
          const uList = payloadUsers.data || [];
          pendingUsers = uList.filter(u => u.status === 'Pendente' || u.master_key_requested == 1);
        }
      } catch (e) {
        console.error('Erro ao buscar usuários pendentes:', e);
      }
    }

    const masterArea = document.getElementById('stagnation-master-approval-area');
    if (masterArea) {
      if (isMaster && pendingUsers.length > 0) {
        masterArea.innerHTML = `
          <div style="background: linear-gradient(135deg, rgba(245,158,11,0.12), rgba(217,119,6,0.08)); border: 1px solid rgba(245,158,11,0.4); border-radius: 16px; padding: 20px; margin-bottom: 24px; box-shadow: 0 10px 30px rgba(245,158,11,0.1);">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px; flex-wrap: wrap; gap: 10px;">
              <div style="display: flex; align-items: center; gap: 12px;">
                <div style="width: 44px; height: 44px; border-radius: 12px; background: rgba(245,158,11,0.25); border: 1px solid rgba(245,158,11,0.4); display: flex; align-items: center; justify-content: center; color: #fbbf24;">
                  <i class="fa-solid fa-user-shield" style="font-size: 1.3rem;"></i>
                </div>
                <div>
                  <h3 style="margin: 0; font-size: 1.15rem; font-weight: 700; color: #fbbf24; display: flex; align-items: center; gap: 8px;">
                    Solicitações de Acesso Total (Master) Pendentes
                  </h3>
                  <div style="font-size: 0.82rem; color: var(--text-secondary); margin-top: 2px;">
                    Somente você como Administrador Master pode aprovar ou recusar estas solicitações de acesso.
                  </div>
                </div>
              </div>
              <span style="background: #f59e0b; color: #000; font-weight: 800; font-size: 0.8rem; padding: 4px 14px; border-radius: 20px; box-shadow: 0 0 10px rgba(245,158,11,0.4);">
                ${pendingUsers.length} Solicitação(ões)
              </span>
            </div>

            <div style="display: flex; flex-direction: column; gap: 10px;">
              ${pendingUsers.map(u => `
                <div style="display: flex; align-items: center; justify-content: space-between; background: var(--bg-tertiary); border: 1px solid var(--border-color); border-radius: 12px; padding: 14px 20px; flex-wrap: wrap; gap: 12px;">
                  <div>
                    <div style="font-weight: 700; color: var(--text-primary); font-size: 1rem; display: flex; align-items: center; gap: 8px;">
                      ${u.name} <span style="font-size: 0.82rem; color: #818cf8; font-weight: 600;">(@${u.username})</span>
                    </div>
                    <div style="font-size: 0.8rem; color: var(--text-muted); margin-top: 4px;">
                      Função Solicitada: <strong style="color: #fbbf24;">${u.role || 'Master'}</strong> · Status: <span style="color: #f59e0b; font-weight: 600;">Pendente de Liberação</span>
                    </div>
                  </div>
                  <div style="display: flex; gap: 10px;">
                    <button class="btn btn-stag-approve" data-id="${u.id}" data-name="${u.name}" style="background: linear-gradient(135deg, #10b981, #059669); color: #fff; border: none; font-size: 0.82rem; font-weight: 700; padding: 9px 18px; border-radius: 999px; cursor: pointer; display: flex; align-items: center; gap: 8px; box-shadow: 0 4px 12px rgba(16,185,129,0.3);">
                      <i class="fa-solid fa-shield-check"></i> Aprovar Acesso Total
                    </button>
                    <button class="btn btn-stag-reject" data-id="${u.id}" data-name="${u.name}" style="background: rgba(239,68,68,0.15); color: #f87171; border: 1px solid rgba(239,68,68,0.3); font-size: 0.82rem; font-weight: 600; padding: 9px 16px; border-radius: 999px; cursor: pointer; display: flex; align-items: center; gap: 6px;">
                      <i class="fa-solid fa-xmark"></i> Recusar
                    </button>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
        `;

        masterArea.querySelectorAll('.btn-stag-approve').forEach(btn => {
          btn.addEventListener('click', async () => {
            const uid = btn.dataset.id;
            const uname = btn.dataset.name;
            btn.disabled = true;
            btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Aprovando...';
            try {
              const r = await apiFetch(`/api/users/${uid}/approve-master`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'approve', role: 'Master' })
              });
              if (r.ok) {
                showToast(`✅ Acesso Total aprovado para ${uname}!`);
                loadAndRenderStagnationData();
              } else {
                showCustomAlert({ title: 'Atenção', message: 'Erro ao aprovar usuário.', type: 'warning' });
              }
            } catch (e) {
              showCustomAlert({ title: 'Erro', message: 'Falha de conexão com o servidor.', type: 'danger' });
            }
          });
        });

        masterArea.querySelectorAll('.btn-stag-reject').forEach(btn => {
          btn.addEventListener('click', async () => {
            const uid = btn.dataset.id;
            const uname = btn.dataset.name;
            btn.disabled = true;
            btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Recusando...';
            try {
              const r = await apiFetch(`/api/users/${uid}/approve-master`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'reject', role: 'Médico' })
              });
              if (r.ok) {
                showToast(`Solicitação de ${uname} recusada.`);
                loadAndRenderStagnationData();
              } else {
                showCustomAlert({ title: 'Atenção', message: 'Erro ao recusar usuário.', type: 'warning' });
              }
            } catch (e) {
              showCustomAlert({ title: 'Erro', message: 'Falha de conexão com o servidor.', type: 'danger' });
            }
          });
        });

      } else if (isMaster) {
        masterArea.innerHTML = `
          <div style="background: rgba(255,255,255,0.03); border: 1px dashed rgba(255,255,255,0.1); border-radius: 16px; padding: 20px; margin-bottom: 24px; text-align: center;">
            <i class="fa-solid fa-user-check" style="font-size: 2rem; color: var(--text-muted); margin-bottom: 10px;"></i>
            <h3 style="margin: 0; font-size: 1rem; color: var(--text-secondary);">Nenhuma solicitação pendente</h3>
            <div style="font-size: 0.85rem; color: var(--text-muted); margin-top: 4px;">Não há novos usuários aguardando aprovação no momento.</div>
          </div>
        `;
      } else {
        masterArea.innerHTML = '';
      }
    }

    const res = await apiFetch('/api/stagnation/alerts');
    const result = await res.json();

    const alerts = result.alerts || [];
    const criticalCount = result.criticalCount || 0;
    const warningCount = result.warningCount || 0;

    const critEl = document.getElementById('stag-kpi-critical');
    const warnEl = document.getElementById('stag-kpi-warning');
    const totEl = document.getElementById('stag-kpi-total');

    if (critEl) critEl.textContent = criticalCount;
    if (warnEl) warnEl.textContent = warningCount;
    if (totEl) totEl.textContent = alerts.length;

    // Atualizar badge do menu lateral acumulando alertas + aprovações pendentes
    const totalNavBadge = alerts.length + (isMaster ? pendingUsers.length : 0);
    const navBadge = document.getElementById('stagnation-nav-badge');
    if (navBadge) {
      if (totalNavBadge > 0) {
        navBadge.textContent = totalNavBadge;
        navBadge.style.display = 'inline-block';
        navBadge.style.background = (isMaster && pendingUsers.length > 0) ? '#f59e0b' : '#ef4444';
      } else {
        navBadge.style.display = 'none';
      }
    }

    const wrapper = document.getElementById('stagnation-list-wrapper');
    if (!wrapper) return;

    window.currentStagnationAlerts = alerts;

    if (!window.renderStagnationTable) {
      window.renderStagnationTable = function() {
        const wrap = document.getElementById('stagnation-list-wrapper');
        if (!wrap) return;

        const currentAlerts = window.currentStagnationFilter === 'ALL' 
          ? window.currentStagnationAlerts 
          : window.currentStagnationAlerts.filter(a => a.severity === window.currentStagnationFilter);

        if (currentAlerts.length === 0) {
          const isFilterEmpty = window.currentStagnationAlerts.length > 0;
          wrap.innerHTML = `
            <div style="text-align: center; color: var(--text-muted); padding: 40px 20px;">
              <i class="fa-solid ${isFilterEmpty ? 'fa-filter' : 'fa-circle-check'}" style="font-size: 3rem; color: ${isFilterEmpty ? 'var(--text-muted)' : '#10b981'}; margin-bottom: 14px; opacity: 0.8;"></i>
              <h3 style="color: var(--text-primary); font-weight: 700; margin-bottom: 6px;">${isFilterEmpty ? 'Nenhum paciente neste filtro' : 'Nenhum Paciente Estagnado'}</h3>
              <p style="font-size: 0.85rem; max-width: 480px; margin: 0 auto;">${isFilterEmpty ? 'Tente selecionar outro filtro nos cards acima.' : 'Todos os atendimentos estão dentro do tempo limite recomendado (SLA). Excelente fluxo hospitalar!'}</p>
            </div>
          `;
          return;
        }

        let html = `
          <table class="data-table" style="width: 100%;">
            <thead>
              <tr>
                <th>PACIENTE</th>
                <th>STATUS ATUAL</th>
                <th>SALA / CONSULTÓRIO</th>
                <th>TEMPO PARADO</th>
                <th>DIAGNOSTICO DE ESTAGNAÇÃO</th>
                <th style="text-align: right;">AÇÕES RÁPIDAS</th>
              </tr>
            </thead>
            <tbody>
        `;

        currentAlerts.forEach(item => {
          const isCritical = item.severity === 'CRITICAL';
          const isWarning = item.severity === 'WARNING';
          
          const badgeBg = isCritical ? 'rgba(239, 68, 68, 0.15)' : (isWarning ? 'rgba(245, 158, 11, 0.15)' : 'rgba(59, 130, 246, 0.15)');
          const badgeColor = isCritical ? '#f87171' : (isWarning ? '#fbbf24' : '#60a5fa');
          const badgeBorder = isCritical ? 'rgba(239, 68, 68, 0.3)' : (isWarning ? 'rgba(245, 158, 11, 0.3)' : 'rgba(59, 130, 246, 0.3)');

          html += `
            <tr style="${isCritical ? 'background: rgba(239,68,68,0.03);' : ''}">
              <td>
                <div style="font-weight: 700; color: var(--text-primary);">${item.patientName}</div>
                <div style="font-size: 0.78rem; color: var(--text-muted); font-family: monospace;">CPF: ${item.patientCpf || 'Não informado'}</div>
              </td>
              <td>
                <span style="display: inline-block; padding: 4px 10px; border-radius: 12px; font-size: 0.75rem; font-weight: 700; background: ${badgeBg}; color: ${badgeColor}; border: 1px solid ${badgeBorder};">
                  ${item.status}
                </span>
              </td>
              <td>
                <span style="font-weight: 600; color: #34d399;"><i class="fa-solid fa-door-open" style="margin-right: 4px;"></i>${item.room || 'Consultório 01'}</span>
              </td>
              <td style="font-family: monospace; font-weight: 700; color: ${isCritical ? '#f87171' : '#fbbf24'};">
                <i class="fa-solid fa-clock" style="margin-right: 4px;"></i>${item.elapsedMin} min
              </td>
              <td style="font-size: 0.82rem; color: var(--text-secondary);">
                <strong>${item.reason}</strong>
                <div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 2px;">${item.recommendedAction}</div>
              </td>
              <td style="text-align: right;">
                <div class="actions-cell" style="justify-content: flex-end;">
                  <button class="btn btn-primary" onclick="openReassignModal('${item.id}', '${(item.patientName||'').replace(/'/g, "\\'")}', '${item.room||'Consultório 01'}', '${item.status}')" style="font-size: 0.78rem; padding: 6px 12px; background: linear-gradient(135deg, #2563eb, #1d4ed8);" title="Redirecionar de Consultório/Ala ou Avançar Status">
                    <i class="fa-solid fa-right-left" style="margin-right: 4px;"></i> Direcionar
                  </button>
                </div>
              </td>
            </tr>
          `;
        });

        html += `</tbody></table>`;
        wrap.innerHTML = html;
      };
    }

    window.renderStagnationTable();

  } catch (e) {
    console.error('Erro ao carregar dados de estagnação:', e);
  }
}

window.openReassignModal = async function(encounterId, patientName, currentRoom, currentStatus) {
  try {
    console.log('Abrindo modal para:', patientName);
    const existing = document.getElementById('reassign-modal');
    if (existing) existing.remove();

    const modal = document.createElement('div');
    modal.id = 'reassign-modal';
    modal.className = 'modal-overlay';
    modal.style.display = 'flex';
    modal.style.zIndex = '99999';

    // Append modal IMMEDIATELY so the user sees action
    document.body.appendChild(modal);

    modal.innerHTML = `
      <div class="modal-content" style="max-width: 480px; width: 90%; background: var(--bg-secondary); border: 1px solid var(--border-color); border-radius: 16px; box-shadow: 0 20px 50px rgba(0,0,0,0.6); padding: 24px; text-align: center;">
        <i class="fa-solid fa-circle-notch fa-spin" style="font-size: 2rem; color: var(--color-primary); margin-bottom: 12px;"></i>
        <p>Carregando informações...</p>
      </div>
    `;

    // Fetch consulting rooms dynamically
    let roomOptionsHtml = '<option value="">Carregando...</option>';
    try {
      const res = await apiFetch('/api/consulting-rooms');
      const result = await res.json();
      if (result.status === 'success' && result.data && result.data.length > 0) {
        roomOptionsHtml = result.data.map(r => {
          const roomValue = `${r.name} ${r.currentDoctor ? `(${r.currentDoctor})` : ''}`.trim();
          const selected = currentRoom && currentRoom.includes(r.name) ? 'selected' : '';
          return `<option value="${roomValue}" ${selected}>${r.name} ${r.specialty ? ` - ${r.specialty}` : ''}</option>`;
        }).join('');
      } else {
        roomOptionsHtml = '<option value="">Nenhum consultório encontrado</option>';
      }
    } catch (err) {
      console.error('Erro ao carregar consultórios no modal:', err);
      roomOptionsHtml = '<option value="">Erro ao carregar</option>';
    }

    modal.innerHTML = `
      <div class="modal-content" style="max-width: 480px; width: 90%; background: var(--bg-secondary); border: 1px solid var(--border-color); border-radius: 16px; box-shadow: 0 20px 50px rgba(0,0,0,0.6); padding: 24px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
          <h3 style="margin: 0; font-family: Outfit, sans-serif; font-size: 1.15rem; font-weight: 700; color: var(--text-primary);">
            <i class="fa-solid fa-right-left" style="color: var(--color-primary); margin-right: 8px;"></i> Direcionar Atendimento
          </h3>
          <button id="close-reassign-modal" style="background: none; border: none; color: var(--text-muted); cursor: pointer; font-size: 1.2rem;"><i class="fa-solid fa-xmark"></i></button>
        </div>

        <div style="font-size: 0.88rem; color: var(--text-secondary); margin-bottom: 20px; background: var(--bg-tertiary); padding: 12px; border-radius: 10px;">
          Paciente: <strong style="color: var(--text-primary);">${patientName}</strong>
        </div>

        <form id="reassign-form" style="display: flex; flex-direction: column; gap: 14px;">
          <div>
            <label class="form-label" style="font-weight: 600; color: var(--text-primary); margin-bottom: 6px; display: block;">Novo Consultório / Ala:</label>
            <select id="reassign-room" class="form-input" style="width: 100%;">
              ${roomOptionsHtml}
            </select>
          </div>

          <div>
            <label class="form-label" style="font-weight: 600; color: var(--text-primary); margin-bottom: 6px; display: block;">Novo Status do Atendimento:</label>
            <select id="reassign-status" class="form-input" style="width: 100%;">
              <option value="Aguardando_Triagem" ${currentStatus === 'Aguardando_Triagem' ? 'selected' : ''}>Aguardando Triagem</option>
              <option value="Aguardando_Atendimento" ${currentStatus === 'Aguardando_Atendimento' ? 'selected' : ''}>Aguardando Atendimento Médico</option>
              <option value="Em_Atendimento" ${currentStatus === 'Em_Atendimento' ? 'selected' : ''}>Em Atendimento (No Consultório)</option>
              <option value="Finalizado" ${currentStatus === 'Finalizado' ? 'selected' : ''}>Finalizar / Alta Médica</option>
            </select>
          </div>

          <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 10px;">
            <div>
              <button type="button" id="btn-internacao" class="btn" style="background: var(--danger); color: white; border: none;"><i class="fa-solid fa-bed-pulse"></i> Solicitar Internação</button>
            </div>
            <div style="display: flex; gap: 10px;">
              <button type="button" id="btn-cancel-reassign" class="btn btn-secondary">Cancelar</button>
              <button type="submit" class="btn btn-primary">Confirmar Direcionamento</button>
            </div>
          </div>
        </form>
      </div>
    `;

    const closeModal = () => modal.remove();
    document.getElementById('close-reassign-modal').addEventListener('click', closeModal);
    document.getElementById('btn-cancel-reassign').addEventListener('click', closeModal);
    
    const btnInternacao = document.getElementById('btn-internacao');
    if (btnInternacao) {
      btnInternacao.addEventListener('click', async () => {
        document.getElementById('reassign-room').value = 'UTI/Internação';
        document.getElementById('reassign-status').value = 'Aguardando_Leito';
        
        const confirmed = await showCustomConfirm({
          title: 'Solicitar Internação',
          message: 'Deseja realmente solicitar internação para este paciente?',
          confirmText: 'Sim, Solicitar Internação',
          type: 'danger'
        });
        
        if (confirmed) {
          document.getElementById('reassign-form').dispatchEvent(new Event('submit', { cancelable: true }));
        }
      });
    }

    document.getElementById('reassign-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const room = document.getElementById('reassign-room').value;
      const status = document.getElementById('reassign-status').value;

      try {
        const res = await apiFetch('/api/stagnation/reassign', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ encounterId, room, status })
        });

        if (res.ok) {
          showToast('⚡ Atendimento direcionado com sucesso!');
          closeModal();
          if (state.activeTab === 'estagnacao') {
            renderStagnationTab(document.getElementById('main-content'));
          }
        } else {
          alert('Erro ao atualizar atendimento.');
        }
      } catch (err) {
        alert('Erro de conexão com o servidor.');
      }
    });
  } catch (err) {
    console.error('Erro na função openReassignModal:', err);
    alert('Erro ao tentar abrir o modal. Verifique o console.');
  }
};

// ==========================================
// REDIRECIONAMENTO INTELIGENTE DOS CARDS DA AGENDA
// ==========================================
window.handleAgendaCardClick = function(actionType) {
  if (actionType === 'all') {
    showToast('⚡ Exibindo todas as consultas agendadas!');
    document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
    document.querySelector('.filter-chip[data-status="all"]')?.classList.add('active');
    if (typeof loadAgenda === 'function') loadAgenda();
  } else if (actionType === 'confirmed') {
    showToast('⚡ Direcionando consultas Confirmadas para a Fila de Atendimento!');
    switchTab('atendimento');
  } else if (actionType === 'progress') {
    showToast('⚡ Direcionando para a Fila de Consulta Médica (PEP / Prontuário)!');
    switchTab('atendimento');
    setTimeout(() => {
      const q = document.getElementById('medical-queue') || document.querySelector('.kanban-board');
      if (q) q.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  } else if (actionType === 'completed') {
    showToast('⚡ Acessando Histórico de Atendimentos Pós-Alta e Relatórios!');
    switchTab('relatorios');
  }
};

// Event Delegation global para garantir resposta ao clique nos cards da Agenda
document.addEventListener('click', (e) => {
  const cardAll = e.target.closest('#kpi-agenda-all');
  if (cardAll) {
    e.preventDefault();
    window.handleAgendaCardClick('all');
    return;
  }
  const cardConfirmed = e.target.closest('#kpi-agenda-confirmed');
  if (cardConfirmed) {
    e.preventDefault();
    window.handleAgendaCardClick('confirmed');
    return;
  }
  const cardProgress = e.target.closest('#kpi-agenda-progress');
  if (cardProgress) {
    e.preventDefault();
    window.handleAgendaCardClick('progress');
    return;
  }
  const cardCompleted = e.target.closest('#kpi-agenda-completed');
  if (cardCompleted) {
    e.preventDefault();
    window.handleAgendaCardClick('completed');
    return;
  }
});

// ============================================================================
// --- 💊 MÓDULO DE FARMÁCIA HOSPITALAR & CONTROLE DE ESTOQUE ---
// ============================================================================

window.renderStagnationTab = renderStagnationTab;
