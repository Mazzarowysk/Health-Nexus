import { readFileSync, writeFileSync } from 'fs';

// 1. Atualizar backend/app.js com rotas de Estagnação
const appJsPath = 'c:/Health Nexus/backend/app.js';
let appJsContent = readFileSync(appJsPath, 'utf8');

const stagnationBackendRoutes = `
// ==========================================
// ROTAS DE ALERTAS & ESTAGNAÇÃO (GESTÃO DE GARGALOS E SLA)
// ==========================================
app.get('/api/stagnation/alerts', async (req, res) => {
  try {
    const result = await db.execute(\`
      SELECT 
        e.id, e.patientId, e.type, e.status, e.room, e.admitted_at, e.completed_at,
        p.fullName as patientName, p.cpf as patientCpf, p.phone as patientPhone,
        t.manchesterColor, t.bloodPressure, t.temperatureCelsius, t.complaints, t.triaged_at
      FROM encounters e
      JOIN patients p ON e.patientId = p.id
      LEFT JOIN triages t ON e.id = t.encounterId
      WHERE e.status != 'Finalizado'
      ORDER BY e.admitted_at ASC
    \`);

    const now = new Date();
    const alerts = [];

    (result.rows || []).forEach(e => {
      const startTime = new Date(e.triaged_at || e.admitted_at || now);
      const elapsedMin = Math.max(0, Math.floor((now - startTime) / (60 * 1000)));

      let isAlert = false;
      let severity = 'INFO'; // CRITICAL, WARNING, INFO
      let reason = '';
      let recommendedAction = '';

      if (e.status === 'Aguardando_Triagem' && elapsedMin >= 15) {
        isAlert = true;
        severity = 'WARNING';
        reason = \`Aguardando Triagem há \${elapsedMin} min (SLA: 15 min)\`;
        recommendedAction = 'Realizar Triagem Manchester imediatamente';
      } else if (e.status === 'Aguardando_Atendimento') {
        const color = (e.manchesterColor || '').toUpperCase();
        if ((color === 'VERMELHO' || color === 'LARANJA') && elapsedMin >= 10) {
          isAlert = true;
          severity = 'CRITICAL';
          reason = \`Paciente Emergencial (\${color}) retido há \${elapsedMin} min!\`;
          recommendedAction = 'Encaminhar ao Consultório Médico Prioritário';
        } else if (elapsedMin >= 30) {
          isAlert = true;
          severity = 'WARNING';
          reason = \`Aguardando Consulta Médica há \${elapsedMin} min (SLA: 30 min)\`;
          recommendedAction = 'Chamar para atendimento no Consultório disponível';
        }
      } else if (e.status === 'Em_Atendimento' && elapsedMin >= 45) {
        isAlert = true;
        severity = 'INFO';
        reason = \`Em consulta no \${e.room || 'Consultório 01'} há \${elapsedMin} min\`;
        recommendedAction = 'Verificar andamento do PEP ou lançar conduta/alta';
      }

      if (isAlert) {
        alerts.push({
          ...e,
          elapsedMin,
          severity,
          reason,
          recommendedAction
        });
      }
    });

    // Ordenar alertas: CRITICAL primeiro, depois por tempo estagnado
    alerts.sort((a, b) => {
      if (a.severity === 'CRITICAL' && b.severity !== 'CRITICAL') return -1;
      if (b.severity === 'CRITICAL' && a.severity !== 'CRITICAL') return 1;
      return b.elapsedMin - a.elapsedMin;
    });

    res.status(200).json({
      status: 'success',
      totalAlerts: alerts.length,
      criticalCount: alerts.filter(a => a.severity === 'CRITICAL').length,
      warningCount: alerts.filter(a => a.severity === 'WARNING').length,
      alerts
    });
  } catch (err) {
    console.error('Erro ao buscar alertas de estagnação:', err);
    res.status(500).json({ status: 'error', message: 'Falha ao buscar alertas de estagnação.' });
  }
});

// Reatribuir Consultório / Sala ou Atualizar Status direto do Painel de Estagnação
app.post('/api/stagnation/reassign', async (req, res) => {
  try {
    const { encounterId, room, status } = req.body;
    if (!encounterId) {
      return res.status(400).json({ status: 'error', message: 'ID do atendimento é obrigatório.' });
    }

    if (room && status) {
      await db.execute({
        sql: 'UPDATE encounters SET room = ?, status = ? WHERE id = ?',
        args: [room, status, encounterId]
      });
    } else if (room) {
      await db.execute({
        sql: 'UPDATE encounters SET room = ? WHERE id = ?',
        args: [room, encounterId]
      });
    } else if (status) {
      await db.execute({
        sql: 'UPDATE encounters SET status = ? WHERE id = ?',
        args: [status, encounterId]
      });
    }

    res.status(200).json({ status: 'success', message: 'Atendimento atualizado com sucesso no painel de estagnação!' });
  } catch (err) {
    console.error('Erro ao reatribuir atendimento:', err);
    res.status(500).json({ status: 'error', message: 'Falha ao atualizar atendimento.' });
  }
});
`;

if (!appJsContent.includes('/api/stagnation/alerts')) {
  appJsContent = appJsContent.replace('export default app;', stagnationBackendRoutes + '\nexport default app;');
  writeFileSync(appJsPath, appJsContent, 'utf8');
  console.log('✅ Endpoints de estagnação adicionados em backend/app.js!');
}

// 2. Atualizar src/main.js com a aba de Estagnação
const mainJsPath = 'c:/Health Nexus/src/main.js';
let mainJsContent = readFileSync(mainJsPath, 'utf8');

// Injetar item no menu lateral em renderAppStructure
const oldNavAtendimento = `<li>
              <a class="nav-item \${state.activeTab === 'atendimento' ? 'active' : ''}" data-tab="atendimento">
                <i class="fa-solid fa-stethoscope"></i>
                <span>Atendimentos</span>
              </a>
            </li>`;

const newNavAtendimento = `<li>
              <a class="nav-item \${state.activeTab === 'atendimento' ? 'active' : ''}" data-tab="atendimento">
                <i class="fa-solid fa-stethoscope"></i>
                <span>Atendimentos</span>
              </a>
            </li>
            <li>
              <a class="nav-item \${state.activeTab === 'estagnacao' ? 'active' : ''}" data-tab="estagnacao" style="position: relative;">
                <i class="fa-solid fa-triangle-exclamation" style="color: #f59e0b;"></i>
                <span>Alertas & Estagnação</span>
                <span id="stagnation-nav-badge" class="badge-count" style="display:none; margin-left: auto; background: #ef4444; color: #fff; border-radius: 10px; font-size: 0.7rem; padding: 2px 7px; font-weight: 700;">0</span>
              </a>
            </li>`;

if (mainJsContent.includes(oldNavAtendimento)) {
  mainJsContent = mainJsContent.replace(oldNavAtendimento, newNavAtendimento);
}

// Adicionar rótulo da aba em tabLabels
mainJsContent = mainJsContent.replace(
  "atendimento:   'Atendimentos',",
  "atendimento:   'Atendimentos',\n    estagnacao:    'Alertas & Estagnação',"
);

// Adicionar tratamento do renderTabContent para estagnacao
const renderStagnationTabCode = `
  } else if (state.activeTab === 'estagnacao') {
    renderStagnationTab(contentArea);
`;

mainJsContent = mainJsContent.replace(
  "} else if (state.activeTab === 'leitos') {",
  renderStagnationTabCode + "  } else if (state.activeTab === 'leitos') {"
);

// Implementação completa de renderStagnationTab
const stagnationTabImplementation = `

// ==========================================
// ABA DE ALERTAS & ESTAGNAÇÃO (GESTÃO DE GARGALOS E SLA)
// ==========================================
async function renderStagnationTab(container) {
  container.innerHTML = \`
    <div class="tab-section active">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; flex-wrap: wrap; gap: 12px;">
        <div>
          <h2 style="font-family: Outfit, sans-serif; font-size: 1.4rem; font-weight: 700; color: var(--text-primary); margin: 0; display: flex; align-items: center; gap: 10px;">
            <i class="fa-solid fa-triangle-exclamation" style="color: #f59e0b;"></i> Painel de Estagnação & SLA Hospitalar
          </h2>
          <div style="font-size: 0.85rem; color: var(--text-secondary); margin-top: 4px;">
            Monitoramento proativo de permanência por departamento para direcionamento de condutas.
          </div>
        </div>
        <button id="btn-refresh-stagnation" class="btn btn-secondary" style="font-size: 0.85rem; padding: 8px 16px;">
          <i class="fa-solid fa-arrows-rotate" style="margin-right: 6px;"></i> Atualizar Alertas
        </button>
      </div>

      <div id="stagnation-kpi-area" class="kpi-grid" style="grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); margin-bottom: 24px;">
        <div class="kpi-card" style="border-left: 4px solid #ef4444;">
          <div class="kpi-header"><span>Alertas Críticos</span><div class="kpi-icon danger"><i class="fa-solid fa-bell"></i></div></div>
          <div class="kpi-value" id="stag-kpi-critical">0</div>
          <div class="kpi-trend"><span>Risco Clínico / Fila Vermelha</span></div>
        </div>
        <div class="kpi-card" style="border-left: 4px solid #f59e0b;">
          <div class="kpi-header"><span>Alertas de Espera</span><div class="kpi-icon warning"><i class="fa-solid fa-hourglass-half"></i></div></div>
          <div class="kpi-value" id="stag-kpi-warning">0</div>
          <div class="kpi-trend"><span>Estouro de SLA (> 15/30 min)</span></div>
        </div>
        <div class="kpi-card" style="border-left: 4px solid #3b82f6;">
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
  \`;

  document.getElementById('btn-refresh-stagnation')?.addEventListener('click', () => renderStagnationTab(container));
  await loadAndRenderStagnationData();
}

async function loadAndRenderStagnationData() {
  try {
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

    // Atualizar badge do menu lateral
    const navBadge = document.getElementById('stagnation-nav-badge');
    if (navBadge) {
      if (alerts.length > 0) {
        navBadge.textContent = alerts.length;
        navBadge.style.display = 'inline-block';
      } else {
        navBadge.style.display = 'none';
      }
    }

    const wrapper = document.getElementById('stagnation-list-wrapper');
    if (!wrapper) return;

    if (alerts.length === 0) {
      wrapper.innerHTML = \`
        <div style="text-align: center; color: var(--text-muted); padding: 40px 20px;">
          <i class="fa-solid fa-circle-check" style="font-size: 3rem; color: #10b981; margin-bottom: 14px; opacity: 0.8;"></i>
          <h3 style="color: var(--text-primary); font-weight: 700; margin-bottom: 6px;">Nenhum Paciente Estagnado</h3>
          <p style="font-size: 0.85rem; max-width: 480px; margin: 0 auto;">Todos os atendimentos estão dentro do tempo limite recomendado (SLA). Excelente fluxo hospitalar!</p>
        </div>
      \`;
      return;
    }

    let html = \`
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
    \`;

    alerts.forEach(item => {
      const isCritical = item.severity === 'CRITICAL';
      const isWarning = item.severity === 'WARNING';
      
      const badgeBg = isCritical ? 'rgba(239, 68, 68, 0.15)' : (isWarning ? 'rgba(245, 158, 11, 0.15)' : 'rgba(59, 130, 246, 0.15)');
      const badgeColor = isCritical ? '#f87171' : (isWarning ? '#fbbf24' : '#60a5fa');
      const badgeBorder = isCritical ? 'rgba(239, 68, 68, 0.3)' : (isWarning ? 'rgba(245, 158, 11, 0.3)' : 'rgba(59, 130, 246, 0.3)');

      html += \`
        <tr style="\${isCritical ? 'background: rgba(239,68,68,0.03);' : ''}">
          <td>
            <div style="font-weight: 700; color: var(--text-primary);">\${item.patientName}</div>
            <div style="font-size: 0.78rem; color: var(--text-muted); font-family: monospace;">CPF: \${item.patientCpf || 'Não informado'}</div>
          </td>
          <td>
            <span style="display: inline-block; padding: 4px 10px; border-radius: 12px; font-size: 0.75rem; font-weight: 700; background: \${badgeBg}; color: \${badgeColor}; border: 1px solid \${badgeBorder};">
              \${item.status}
            </span>
          </td>
          <td>
            <span style="font-weight: 600; color: #34d399;"><i class="fa-solid fa-door-open" style="margin-right: 4px;"></i>\${item.room || 'Consultório 01'}</span>
          </td>
          <td style="font-family: monospace; font-weight: 700; color: \${isCritical ? '#f87171' : '#fbbf24'};">
            <i class="fa-solid fa-clock" style="margin-right: 4px;"></i>\${item.elapsedMin} min
          </td>
          <td style="font-size: 0.82rem; color: var(--text-secondary);">
            <strong>\${item.reason}</strong>
            <div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 2px;">\${item.recommendedAction}</div>
          </td>
          <td style="text-align: right;">
            <div class="actions-cell" style="justify-content: flex-end;">
              <button class="btn btn-primary" onclick="openReassignModal('\${item.id}', '\${(item.patientName||'').replace(/'/g, "\\\\'")}', '\${item.room||'Consultório 01'}', '\${item.status}')" style="font-size: 0.78rem; padding: 6px 12px; background: linear-gradient(135deg, #2563eb, #1d4ed8);" title="Redirecionar de Consultório/Ala ou Avançar Status">
                <i class="fa-solid fa-right-left" style="margin-right: 4px;"></i> Direcionar
              </button>
            </div>
          </td>
        </tr>
      \`;
    });

    html += \`</tbody></table>\`;
    wrapper.innerHTML = html;

  } catch (e) {
    console.error('Erro ao carregar dados de estagnação:', e);
  }
}

window.openReassignModal = function(encounterId, patientName, currentRoom, currentStatus) {
  const existing = document.getElementById('reassign-modal');
  if (existing) existing.remove();

  const modal = document.createElement('div');
  modal.id = 'reassign-modal';
  modal.className = 'modal-overlay';
  modal.style.display = 'flex';
  modal.style.zIndex = '99999';

  modal.innerHTML = \`
    <div class="modal-content" style="max-width: 480px; width: 90%; background: var(--bg-secondary); border: 1px solid var(--border-color); border-radius: 16px; box-shadow: 0 20px 50px rgba(0,0,0,0.6); padding: 24px;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
        <h3 style="margin: 0; font-family: Outfit, sans-serif; font-size: 1.15rem; font-weight: 700; color: var(--text-primary);">
          <i class="fa-solid fa-right-left" style="color: var(--color-primary); margin-right: 8px;"></i> Direcionar Atendimento
        </h3>
        <button id="close-reassign-modal" style="background: none; border: none; color: var(--text-muted); cursor: pointer; font-size: 1.2rem;"><i class="fa-solid fa-xmark"></i></button>
      </div>

      <div style="font-size: 0.88rem; color: var(--text-secondary); margin-bottom: 20px; background: var(--bg-tertiary); padding: 12px; border-radius: 10px;">
        Paciente: <strong style="color: var(--text-primary);">\${patientName}</strong>
      </div>

      <form id="reassign-form" style="display: flex; flex-direction: column; gap: 14px;">
        <div>
          <label class="form-label" style="font-weight: 600; color: var(--text-primary); margin-bottom: 6px; display: block;">Novo Consultório / Ala:</label>
          <select id="reassign-room" class="form-input" style="width: 100%;">
            <option value="Consultório 01 (Dr. João)" \${currentRoom.includes('01') ? 'selected' : ''}>Consultório 01 (Dr. João - Clinica)</option>
            <option value="Consultório 02 (Dra. Maria)" \${currentRoom.includes('02') ? 'selected' : ''}>Consultório 02 (Dra. Maria - Pediatria)</option>
            <option value="Consultório 03 (Dr. Carlos)" \${currentRoom.includes('03') ? 'selected' : ''}>Consultório 03 (Dr. Carlos - Ortopedia)</option>
            <option value="Ala de Emergência - PS" \${currentRoom.includes('PS') ? 'selected' : ''}>Ala de Emergência - PS</option>
            <option value="Sala de Sutura / Curativos">Sala de Sutura / Curativos</option>
          </select>
        </div>

        <div>
          <label class="form-label" style="font-weight: 600; color: var(--text-primary); margin-bottom: 6px; display: block;">Novo Status do Atendimento:</label>
          <select id="reassign-status" class="form-input" style="width: 100%;">
            <option value="Aguardando_Triagem" \${currentStatus === 'Aguardando_Triagem' ? 'selected' : ''}>Aguardando Triagem</option>
            <option value="Aguardando_Atendimento" \${currentStatus === 'Aguardando_Atendimento' ? 'selected' : ''}>Aguardando Atendimento Médico</option>
            <option value="Em_Atendimento" \${currentStatus === 'Em_Atendimento' ? 'selected' : ''}>Em Atendimento (No Consultório)</option>
            <option value="Finalizado" \${currentStatus === 'Finalizado' ? 'selected' : ''}>Finalizar / Alta Médica</option>
          </select>
        </div>

        <div style="display: flex; justify-content: flex-end; gap: 10px; margin-top: 10px;">
          <button type="button" id="btn-cancel-reassign" class="btn btn-secondary">Cancelar</button>
          <button type="submit" class="btn btn-primary">Confirmar Direcionamento</button>
        </div>
      </form>
    </div>
  \`;

  document.body.appendChild(modal);

  const closeModal = () => modal.remove();
  document.getElementById('close-reassign-modal').addEventListener('click', closeModal);
  document.getElementById('btn-cancel-reassign').addEventListener('click', closeModal);

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
};
`;

mainJsContent += stagnationTabImplementation;
writeFileSync(mainJsPath, mainJsContent, 'utf8');
console.log('✅ apply_stagnation_feature.mjs executado com sucesso em src/main.js!');
