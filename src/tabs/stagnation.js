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
        <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 16px; flex-wrap: wrap;">
          <div style="position: relative; flex: 1; min-width: 200px; max-width: 340px;">
            <i class="fa-solid fa-magnifying-glass" style="position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: var(--text-muted); font-size: 0.85rem;"></i>
            <input type="text" id="stag-search-input" class="form-input" placeholder="Buscar paciente ou alerta..." style="width: 100%; padding-left: 36px; height: 40px;">
          </div>
          <button type="button" id="btn-clear-stag-filter" style="background: var(--bg-tertiary, var(--bg-secondary)); border: 1px solid var(--border-color); color: var(--text-primary); padding: 0 16px; border-radius: 8px; cursor: pointer; display: flex; align-items: center; gap: 6px; font-size: 0.82rem; font-weight: 600; height: 40px; transition: all 0.2s ease; white-space: nowrap;" title="Limpar Filtros" onmouseover="this.style.background='rgba(99,102,241,0.15)'" onmouseout="this.style.background='var(--bg-tertiary, var(--bg-secondary))'">
            <i class="fa-solid fa-filter-circle-xmark"></i> Limpar Filtros
          </button>
          <span id="stag-result-count" style="font-size: 0.8rem; color: var(--text-muted); margin-left: auto;"></span>
        </div>
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
      
      if (pendingUsers.length > 0 && !sessionStorage.getItem('hn_notified_pending')) {
        showToast(`⚠️ Atenção: Você possui ${pendingUsers.length} solicitação(ões) de acesso pendente(s). Verifique a aba de Alertas e Estagnação.`);
        sessionStorage.setItem('hn_notified_pending', 'true');
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
                    Solicitações de Acesso Pendentes
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
                      <i class="fa-solid fa-shield-check"></i> Aprovar Acesso
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
                if (typeof window.showFlowCompletionNotification === 'function') {
                  window.showFlowCompletionNotification({
                    actionTitle: 'Acesso Master Liberado',
                    message: `O usuário <strong>${uname}</strong> foi aprovado com privilégios de Administrador Master.<br><br><strong>Próximo Passo:</strong> O usuário já pode efetuar login completo ou gerenciar permissões no sistema.`,
                    targetTab: 'configuracoes',
                    targetTabLabel: 'Configurações & Usuários',
                    actionType: 'switchTab'
                  });
                }
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
          <table class="data-table" style="width: 100%; border-collapse: collapse;">
            <thead>
              <tr>
                <th style="padding: 14px 16px; font-size: 0.78rem; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: var(--text-muted); border-bottom: 2px solid var(--border-color);">PACIENTE</th>
                <th style="padding: 14px 16px; font-size: 0.78rem; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: var(--text-muted); border-bottom: 2px solid var(--border-color);">STATUS ATUAL</th>
                <th style="padding: 14px 16px; font-size: 0.78rem; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: var(--text-muted); border-bottom: 2px solid var(--border-color);">SALA / CONSULTÓRIO</th>
                <th style="padding: 14px 16px; font-size: 0.78rem; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: var(--text-muted); border-bottom: 2px solid var(--border-color);">TEMPO PARADO</th>
                <th style="padding: 14px 16px; font-size: 0.78rem; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: var(--text-muted); border-bottom: 2px solid var(--border-color);">DIAGNÓSTICO DE ESTAGNAÇÃO</th>
                <th style="padding: 14px 16px; font-size: 0.78rem; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: var(--text-muted); border-bottom: 2px solid var(--border-color); text-align: right;">AÇÕES RÁPIDAS</th>
              </tr>
            </thead>
            <tbody>
        `;

        currentAlerts.forEach(item => {
          const isCritical = item.severity === 'CRITICAL';
          const isWarning = item.severity === 'WARNING';
          
          const badgeBg = isCritical ? 'rgba(239, 68, 68, 0.15)' : (isWarning ? 'rgba(245, 158, 11, 0.15)' : 'rgba(59, 130, 246, 0.15)');
          const badgeColor = isCritical ? '#f87171' : (isWarning ? '#fbbf24' : '#60a5fa');
          const badgeBorder = isCritical ? 'rgba(239, 68, 68, 0.35)' : (isWarning ? 'rgba(245, 158, 11, 0.35)' : 'rgba(59, 130, 246, 0.35)');
          const cleanStatus = (item.status || '').replace(/_/g, ' ');

          html += `
            <tr class="stag-alert-row" style="border-bottom: 1px solid var(--border-color); ${isCritical ? 'background: rgba(239,68,68,0.03);' : ''} transition: background 0.2s ease;">
              <td style="padding: 18px 16px; vertical-align: middle;">
                <div style="font-weight: 700; color: var(--text-primary); font-size: 0.98rem; margin-bottom: 4px; letter-spacing: -0.01em;">${item.patientName}</div>
                <div style="font-size: 0.8rem; color: var(--text-muted); font-family: 'JetBrains Mono', monospace; display: flex; align-items: center; gap: 4px; opacity: 0.85;">
                  <i class="fa-solid fa-id-card" style="font-size: 0.72rem; color: #818cf8;"></i> CPF: ${item.patientCpf || 'Não informado'}
                </div>
              </td>
              <td style="padding: 18px 16px; vertical-align: middle;">
                <span style="display: inline-flex; align-items: center; gap: 6px; padding: 6px 14px; border-radius: 20px; font-size: 0.8rem; font-weight: 700; background: ${badgeBg}; color: ${badgeColor}; border: 1px solid ${badgeBorder}; letter-spacing: 0.02em;">
                  <span style="width: 7px; height: 7px; border-radius: 50%; background: ${badgeColor}; display: inline-block;"></span>
                  ${cleanStatus}
                </span>
              </td>
              <td style="padding: 18px 16px; vertical-align: middle;">
                <div style="display: inline-flex; align-items: center; gap: 8px; padding: 6px 12px; border-radius: 10px; background: rgba(16,185,129,0.08); border: 1px solid rgba(16,185,129,0.25); color: #34d399; font-size: 0.85rem; font-weight: 600;">
                  <i class="fa-solid fa-door-open"></i> ${item.room || 'Consultório 01'}
                </div>
              </td>
              <td style="padding: 18px 16px; vertical-align: middle;">
                <div style="display: inline-flex; align-items: center; gap: 6px; font-family: 'JetBrains Mono', monospace; font-weight: 700; font-size: 0.9rem; color: ${isCritical ? '#f87171' : '#fbbf24'}; background: ${isCritical ? 'rgba(239,68,68,0.1)' : 'rgba(245,158,11,0.1)'}; padding: 6px 12px; border-radius: 10px; border: 1px solid ${isCritical ? 'rgba(239,68,68,0.25)' : 'rgba(245,158,11,0.25)'};">
                  <i class="fa-solid fa-clock"></i> ${item.elapsedMin} min
                </div>
              </td>
              <td style="padding: 18px 16px; vertical-align: middle; max-width: 380px;">
                <div style="display: flex; flex-direction: column; gap: 6px;">
                  <div style="font-size: 0.88rem; font-weight: 600; color: var(--text-primary); line-height: 1.4;">
                    ${item.reason}
                  </div>
                  <div style="font-size: 0.8rem; color: #94a3b8; line-height: 1.4; display: flex; align-items: flex-start; gap: 6px; background: rgba(255,255,255,0.03); padding: 6px 10px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.05);">
                    <i class="fa-solid fa-lightbulb" style="color: #f59e0b; margin-top: 2px; flex-shrink: 0;"></i>
                    <span>${item.recommendedAction}</span>
                  </div>
                </div>
              </td>
              <td style="padding: 18px 16px; vertical-align: middle; text-align: right;">
                <div class="actions-cell" style="justify-content: flex-end;">
                  <button class="btn btn-primary" onclick="openReassignModal('${item.id}', '${(item.patientName||'').replace(/'/g, "\\'")}', '${item.room||'Consultório 01'}', '${item.status}')" style="font-size: 0.82rem; font-weight: 700; padding: 8px 16px; border-radius: 12px; background: #0284c7; border: none; box-shadow: 0 2px 8px rgba(2,132,199,0.35); display: inline-flex; align-items: center; gap: 8px; cursor: pointer; transition: all 0.2s; color: #ffffff;" title="Redirecionar de Consultório/Ala ou Avançar Status">
                    <i class="fa-solid fa-right-left"></i> Direcionar
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

  // Search input live filter
  const stagSearch = document.getElementById('stag-search-input');
  const clearStagBtn = document.getElementById('btn-clear-stag-filter');

  if (stagSearch) {
    stagSearch.addEventListener('input', () => {
      const removeAccents = (str) => {
        return (str || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
      };
      const term = removeAccents(stagSearch.value.trim());
      const wrap = document.getElementById('stagnation-list-wrapper');
      if (!wrap) return;
      const rows = wrap.querySelectorAll('.stag-alert-row, tr[data-patient-name]');
      let visible = 0;
      rows.forEach(row => {
        const text = removeAccents(row.textContent);
        const show = !term || text.includes(term);
        row.style.display = show ? '' : 'none';
        if (show) visible++;
      });
      const countEl = document.getElementById('stag-result-count');
      if (countEl) countEl.textContent = term ? visible + ' resultado(s) encontrado(s)' : '';
    });
  }

  if (clearStagBtn) {
    clearStagBtn.addEventListener('click', () => {
      // Reset text filter
      const inp = document.getElementById('stag-search-input');
      if (inp) { inp.value = ''; inp.dispatchEvent(new Event('input')); }
      // Reset KPI filter
      window.currentStagnationFilter = 'ALL';
      document.querySelectorAll('.kpi-card').forEach(c => {
        c.style.transform = 'scale(1)';
        c.style.boxShadow = 'none';
      });
      window.renderStagnationTable();
      const countEl = document.getElementById('stag-result-count');
      if (countEl) countEl.textContent = '';
    });
  }

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

    // Fetch consulting rooms dynamically with robust fallbacks
    let roomOptionsHtml = '';
    try {
      const res = await apiFetch('/api/consulting-rooms');
      const result = await res.json();
      const roomsList = Array.isArray(result) ? result : (result.data || result.consultorios || []);

      if (roomsList && roomsList.length > 0) {
        roomOptionsHtml = roomsList.map(r => {
          const roomName = r.name || r.nome || r.room || 'Consultório';
          const spec = r.specialty || r.especialidade || r.ala || '';
          const doctor = r.currentDoctor || r.medico || '';
          const roomValue = `${roomName}${doctor ? ` (${doctor})` : ''}`.trim();
          const selected = currentRoom && currentRoom.includes(roomName) ? 'selected' : '';
          return `<option value="${roomValue}" ${selected}>${roomName}${spec ? ` - ${spec}` : ''}</option>`;
        }).join('');
      }
    } catch (err) {
      console.error('Erro ao carregar consultórios no modal:', err);
    }

    // Default hospital room fallbacks if database table is empty
    if (!roomOptionsHtml || roomOptionsHtml.trim() === '') {
      const defaultRooms = [
        { name: 'Consultório 01', spec: 'Clínica Geral' },
        { name: 'Consultório 02', spec: 'Pediatria' },
        { name: 'Consultório 03', spec: 'Ortopedia' },
        { name: 'Consultório 04', spec: 'Cardiologia' },
        { name: 'Sala de Emergência', spec: 'Urgência / PS' },
        { name: 'Sala de Procedimentos', spec: 'Enfermagem' },
        { name: 'UTI / Internação', spec: 'Unidade Crítica' }
      ];
      roomOptionsHtml = defaultRooms.map(r => {
        const selected = currentRoom && currentRoom.includes(r.name) ? 'selected' : '';
        return `<option value="${r.name}" ${selected}>${r.name} - ${r.spec}</option>`;
      }).join('');
    }

    modal.innerHTML = `
      <div class="modal-content" style="max-width: 520px; width: 92%; background: linear-gradient(145deg, #1e293b 0%, #0f172a 100%); border: 1px solid rgba(99, 102, 241, 0.3); border-radius: 20px; box-shadow: 0 25px 60px rgba(0,0,0,0.7); padding: 28px; position: relative;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
          <div style="display: flex; align-items: center; gap: 12px;">
            <div style="width: 42px; height: 42px; border-radius: 12px; background: linear-gradient(135deg, rgba(99,102,241,0.25), rgba(14,165,233,0.25)); border: 1px solid rgba(99,102,241,0.4); display: flex; align-items: center; justify-content: center; color: #818cf8; font-size: 1.2rem;">
              <i class="fa-solid fa-right-left"></i>
            </div>
            <div>
              <h3 style="margin: 0; font-family: Outfit, sans-serif; font-size: 1.2rem; font-weight: 800; color: #ffffff; letter-spacing: -0.01em;">
                Direcionar Atendimento
              </h3>
              <div style="font-size: 0.8rem; color: #94a3b8; margin-top: 2px;">Remaneje consultório ou altere a fila do paciente</div>
            </div>
          </div>
          <button id="close-reassign-modal" style="background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); color: #94a3b8; cursor: pointer; width: 34px; height: 34px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 1rem; transition: all 0.2s;" onmouseover="this.style.background='rgba(255,255,255,0.15)'" onmouseout="this.style.background='rgba(255,255,255,0.05)'"><i class="fa-solid fa-xmark"></i></button>
        </div>

        <!-- Patient Header Card -->
        <div style="background: rgba(99, 102, 241, 0.08); border: 1px solid rgba(99, 102, 241, 0.2); border-radius: 14px; padding: 14px 18px; display: flex; align-items: center; justify-content: space-between; margin-bottom: 22px;">
          <div style="display: flex; align-items: center; gap: 12px;">
            <div style="width: 38px; height: 38px; border-radius: 10px; background: rgba(99, 102, 241, 0.2); color: #a5b4fc; display: flex; align-items: center; justify-content: center; font-size: 1.1rem;">
              <i class="fa-solid fa-user-injured"></i>
            </div>
            <div>
              <div style="font-size: 0.72rem; text-transform: uppercase; letter-spacing: 0.06em; color: #94a3b8; font-weight: 700;">PACIENTE SELECIONADO</div>
              <div style="font-size: 1.05rem; font-weight: 800; color: #ffffff;">${patientName}</div>
            </div>
          </div>
          <div style="text-align: right;">
            <div style="font-size: 0.72rem; text-transform: uppercase; letter-spacing: 0.06em; color: #94a3b8; font-weight: 700;">LOCAL ATUAL</div>
            <span style="font-size: 0.8rem; font-weight: 700; color: #34d399; background: rgba(16,185,129,0.12); border: 1px solid rgba(16,185,129,0.3); padding: 3px 10px; border-radius: 20px; display: inline-block; margin-top: 2px;">
              ${currentRoom || 'Consultório 01'}
            </span>
          </div>
        </div>

        <form id="reassign-form" style="display: flex; flex-direction: column; gap: 18px;">
          <div>
            <label class="form-label" style="font-weight: 600; color: #e2e8f0; margin-bottom: 8px; display: flex; align-items: center; gap: 8px; font-size: 0.88rem;">
              <i class="fa-solid fa-door-open" style="color: #38bdf8;"></i> Novo Consultório / Ala:
            </label>
            <select id="reassign-room" class="form-input" style="width: 100%; height: 44px; background: #0f172a; border: 1px solid #334155; border-radius: 10px; color: #f8fafc; font-size: 0.9rem; padding: 0 14px; outline: none; transition: border-color 0.2s;" onfocus="this.style.borderColor='#0284c7'" onblur="this.style.borderColor='#334155'">
              ${roomOptionsHtml}
            </select>
          </div>

          <div>
            <label class="form-label" style="font-weight: 600; color: #e2e8f0; margin-bottom: 8px; display: flex; align-items: center; gap: 8px; font-size: 0.88rem;">
              <i class="fa-solid fa-arrows-spin" style="color: #a5b4fc;"></i> Novo Status do Atendimento:
            </label>
            <select id="reassign-status" class="form-input" style="width: 100%; height: 44px; background: #0f172a; border: 1px solid #334155; border-radius: 10px; color: #f8fafc; font-size: 0.9rem; padding: 0 14px; outline: none; transition: border-color 0.2s;" onfocus="this.style.borderColor='#0284c7'" onblur="this.style.borderColor='#334155'">
              <option value="Aguardando_Triagem" ${currentStatus === 'Aguardando_Triagem' ? 'selected' : ''}>Aguardando Triagem</option>
              <option value="Aguardando_Atendimento" ${currentStatus === 'Aguardando_Atendimento' ? 'selected' : ''}>Aguardando Atendimento Médico</option>
              <option value="Em_Atendimento" ${currentStatus === 'Em_Atendimento' ? 'selected' : ''}>Em Atendimento (No Consultório)</option>
              <option value="Aguardando_Leito" ${currentStatus === 'Aguardando_Leito' ? 'selected' : ''}>Solicitar Internação / Aguardando Leito</option>
              <option value="Finalizado" ${currentStatus === 'Finalizado' ? 'selected' : ''}>Finalizar / Alta Médica</option>
            </select>
          </div>

          <!-- Action Banner: Solicitar Internação -->
          <div style="background: linear-gradient(135deg, rgba(239,68,68,0.12), rgba(220,38,38,0.06)); border: 1px dashed rgba(239,68,68,0.35); border-radius: 14px; padding: 14px 16px; display: flex; align-items: center; justify-content: space-between; gap: 12px;">
            <div style="display: flex; align-items: center; gap: 12px;">
              <div style="width: 36px; height: 36px; border-radius: 10px; background: rgba(239,68,68,0.2); color: #f87171; display: flex; align-items: center; justify-content: center; font-size: 1.1rem;">
                <i class="fa-solid fa-bed-pulse"></i>
              </div>
              <div>
                <div style="font-weight: 700; color: #f87171; font-size: 0.88rem;">Solicitar Internação Hospitalar</div>
                <div style="font-size: 0.78rem; color: #94a3b8; margin-top: 1px;">Encaminha para vaga em UTI / Enfermaria</div>
              </div>
            </div>
            <button type="button" id="btn-internacao" style="background: linear-gradient(135deg, #ef4444, #dc2626); color: #ffffff; border: none; font-weight: 700; font-size: 0.82rem; padding: 9px 16px; border-radius: 10px; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; box-shadow: 0 4px 14px rgba(239,68,68,0.35); flex-shrink: 0; transition: transform 0.2s;" onmouseover="this.style.transform='translateY(-1px)'" onmouseout="this.style.transform='translateY(0)'" title="Solicitar vaga imediata na UTI / Leito de Enfermaria">
              <i class="fa-solid fa-bed-pulse"></i> Encaminhar
            </button>
          </div>

          <!-- Main Form Buttons -->
          <div style="display: flex; justify-content: flex-end; align-items: center; gap: 12px; margin-top: 10px; padding-top: 16px; border-top: 1px solid var(--border-color);">
            <button type="button" id="btn-cancel-reassign" class="btn btn-secondary" style="padding: 10px 18px; border-radius: 10px; font-weight: 600; font-size: 0.88rem; background: #1e293b; color: #cbd5e1; border: 1px solid #334155; cursor: pointer;">
              Cancelar
            </button>
            <button type="submit" class="btn btn-primary" style="padding: 10px 22px; border-radius: 10px; font-weight: 700; font-size: 0.88rem; background: #0284c7; color: #ffffff; border: none; box-shadow: 0 2px 10px rgba(2,132,199,0.4); cursor: pointer; display: inline-flex; align-items: center; gap: 8px;">
              <i class="fa-solid fa-check"></i> Confirmar Direcionamento
            </button>
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
        btnInternacao.disabled = true;
        btnInternacao.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Solicitando...';
        
        try {
          const res = await apiFetch('/api/stagnation/reassign', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              encounterId,
              room: 'UTI / Internação',
              status: 'Aguardando_Leito'
            })
          });

          if (res.ok) {
            showToast(`🛏️ Internação em UTI/Leito solicitada com sucesso para ${patientName}!`);
            closeModal();

            if (typeof window.showFlowCompletionNotification === 'function') {
              window.showFlowCompletionNotification({
                actionTitle: 'Solicitação de Internação Registrada',
                message: `A solicitação de vaga em leito/UTI para <strong>${patientName}</strong> foi enviada com prioridade à Central de Leitos.<br><br><strong>Próximo Passo:</strong> Acesse a <strong>Gestão de Leitos & Internação</strong> para alocar o paciente em um leito vago (UTI / Enfermaria).`,
                targetTab: 'leitos',
                targetTabLabel: 'Gestão de Leitos & Internação',
                actionType: 'switchTab'
              });
            }

            const mainContent = document.getElementById('main-content');
            if (mainContent) {
              loadAndRenderStagnationData();
            }
          } else {
            showCustomAlert({ title: 'Atenção', message: 'Erro ao solicitar internação.', type: 'warning' });
            btnInternacao.disabled = false;
            btnInternacao.innerHTML = '<i class="fa-solid fa-bed-pulse"></i> Solicitar Internação';
          }
        } catch (err) {
          showCustomAlert({ title: 'Erro', message: 'Falha de conexão ao solicitar internação.', type: 'danger' });
          btnInternacao.disabled = false;
          btnInternacao.innerHTML = '<i class="fa-solid fa-bed-pulse"></i> Solicitar Internação';
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
          closeModal();

          if (status === 'Aguardando_Leito') {
            showToast(`🛏️ Internação em UTI/Leito solicitada com sucesso para ${patientName}!`);
            if (typeof window.showFlowCompletionNotification === 'function') {
              window.showFlowCompletionNotification({
                actionTitle: 'Solicitação de Internação Registrada',
                message: `O paciente <strong>${patientName}</strong> foi encaminhado para internação.<br><br><strong>Próximo Passo:</strong> Acesse a aba <strong>Gestão de Leitos & Internação</strong> para alocar ou reservar um leito vago.`,
                targetTab: 'leitos',
                targetTabLabel: 'Gestão de Leitos & Internação',
                actionType: 'switchTab'
              });
            }
          } else if (status === 'Aguardando_Atendimento') {
            showToast(`⚡ Atendimento de ${patientName} direcionado para ${room}!`);
            if (typeof window.showFlowCompletionNotification === 'function') {
              window.showFlowCompletionNotification({
                actionTitle: 'Paciente Direcionado de Consultório',
                message: `O paciente <strong>${patientName}</strong> foi transferido para a fila de espera do <strong>${room}</strong>.<br><br><strong>Próximo Passo:</strong> O médico responsável pode chamá-lo para consulta na aba <strong>Salas & Consultórios</strong> ou na <strong>Central de Atendimentos</strong>.`,
                targetTab: 'consultorios',
                targetTabLabel: 'Salas & Consultórios',
                actionType: 'switchTab'
              });
            }
          } else if (status === 'Aguardando_Triagem') {
            showToast(`⚡ Paciente ${patientName} redirecionado para Triagem!`);
            if (typeof window.showFlowCompletionNotification === 'function') {
              window.showFlowCompletionNotification({
                actionTitle: 'Direcionado para Triagem',
                message: `O paciente <strong>${patientName}</strong> foi encaminhado para a fila de <strong>Aguardando Triagem</strong>.<br><br><strong>Próximo Passo:</strong> A equipe de enfermagem deve aferir os sinais vitais e definir a classificação de risco Manchester.`,
                targetTab: 'atendimento',
                targetTabLabel: 'Central de Atendimentos',
                actionType: 'switchTab'
              });
            }
          } else if (status === 'Em_Atendimento') {
            showToast(`⚡ Atendimento de ${patientName} iniciado em ${room}!`);
            if (typeof window.showFlowCompletionNotification === 'function') {
              window.showFlowCompletionNotification({
                actionTitle: 'Atendimento Médico em Andamento',
                message: `O paciente <strong>${patientName}</strong> está em consulta no <strong>${room}</strong>.<br><br><strong>Próximo Passo:</strong> Acesse o <strong>Prontuário Eletrônico (PEP)</strong> para evolução clínica e prescrição.`,
                targetTab: 'medicos',
                targetTabLabel: 'Corpo Clínico & Médicos',
                actionType: 'switchTab'
              });
            }
          } else {
            showToast(`⚡ Atendimento de ${patientName} finalizado!`);
            if (typeof window.showFlowCompletionNotification === 'function') {
              window.showFlowCompletionNotification({
                actionTitle: 'Atendimento Finalizado',
                message: `O atendimento de <strong>${patientName}</strong> foi concluído com sucesso no sistema.`,
                targetTab: 'atendimento',
                targetTabLabel: 'Central de Atendimentos',
                actionType: 'switchTab'
              });
            }
          }

          const mainContent = document.getElementById('main-content');
          if (mainContent) {
            loadAndRenderStagnationData();
          }
        } else {
          showCustomAlert({ title: 'Atenção', message: 'Erro ao atualizar atendimento.', type: 'warning' });
        }
      } catch (err) {
        showCustomAlert({ title: 'Erro', message: 'Falha de conexão com o servidor.', type: 'danger' });
      }
    });
  } catch (err) {
    console.error('Erro na função openReassignModal:', err);
    alert('Erro ao tentar abrir o modal. Verifique o console.');
  }
};

window.renderStagnationTab = renderStagnationTab;
