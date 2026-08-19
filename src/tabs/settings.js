// ─── MÓDULO DA ABA CONFIGURAÇÕES & ADMINISTRAÇÃO (HEALTH NEXUS v2.7.2) ───────────
import { state } from '../state.js';
import { apiFetch } from '../modules/api.js';
import { showToast, showCustomAlert, showCustomConfirm } from '../modules/ui.js';
import { getRolePermissions, showUserManagementModal } from '../modules/auth.js';
import { syncManager, getSyncStatus, formatSyncDate } from '../modules/sync.js';

export function renderSettingsTab(contentArea) {
  contentArea.innerHTML = `
    <div class="tab-section active">
      <div class="settings-section">
        
        <!-- Accordion de Status -->
        <details class="settings-accordion" open>
          <summary class="settings-accordion-header">
            <i class="fa-solid fa-server"></i> Status do Sistema
          </summary>
          <div class="settings-accordion-body">
            <div style="display: flex; flex-direction: column; gap: 12px;">
              <div style="display: flex; justify-content: space-between; border-bottom: 1px solid var(--border-color); padding-bottom: 8px;">
                <span style="color: var(--text-secondary);">Integração com Turso DB</span>
                <span class="status-badge" id="turso-settings-status-badge">
                  <span class="status-indicator"></span>
                  Verificando...
                </span>
              </div>
              <div style="display: flex; justify-content: space-between; border-bottom: 1px solid var(--border-color); padding-bottom: 8px;">
                <span style="color: var(--text-secondary);">Servidor API Local</span>
                <span style="color: var(--text-primary); font-family: monospace;">http://localhost:3001</span>
              </div>
              <div style="display: flex; justify-content: space-between;">
                <span style="color: var(--text-secondary);">Ambiente Web (Vercel)</span>
                <span style="color: var(--text-primary); font-family: monospace;">health-nexus-beryl.vercel.app</span>
              </div>
            </div>
          </div>
        </details>

        <!-- Accordion de Centro de Documentação & Manuais -->
        <details class="settings-accordion" open>
          <summary class="settings-accordion-header">
            <i class="fa-solid fa-book-medical" style="color: #a5b4fc;"></i> Centro de Documentação &amp; Manuais do Usuário
          </summary>
          <div class="settings-accordion-body">
            <p style="color: var(--text-secondary); margin-bottom: 16px; line-height: 1.6;">
              Acesse a documentação unificada e exaustiva do <strong>Health Nexus v2.7.2</strong>. Disponível em portal web interativo com navegação rápida e em documento PDF corporativo para download ou impressão.
            </p>
            <div style="display: flex; gap: 14px; flex-wrap: wrap; margin-top: 14px;">
              <button id="btn-open-tabbed-manual-modal" class="btn" style="display: inline-flex; align-items: center; gap: 8px; font-weight: 600; padding: 10px 18px; border-radius: 8px; background: linear-gradient(135deg, rgba(99, 102, 241, 0.35), rgba(168, 85, 247, 0.28)); border: 1px solid rgba(168, 85, 247, 0.5); color: #f3e8ff; cursor: pointer; transition: all 0.2s;" onmouseover="this.style.transform='scale(1.02)'" onmouseout="this.style.transform='none'">
                <i class="fa-solid fa-layer-group" style="color: #c084fc;"></i> Abrir Manual Interativo por Abas
              </button>
              <a href="manual_do_usuario.html" target="_blank" class="btn btn-primary" style="display: inline-flex; align-items: center; gap: 8px; text-decoration: none; font-weight: 600; padding: 10px 18px; border-radius: 8px;">
                <i class="fa-solid fa-globe"></i> Portal Web Interativo (HTML)
              </a>
              <a href="Manual_do_Usuario_Health_Nexus.pdf" target="_blank" class="btn" style="display: inline-flex; align-items: center; gap: 8px; text-decoration: none; font-weight: 600; padding: 10px 18px; border-radius: 8px; background: rgba(99, 102, 241, 0.15); border: 1px solid rgba(99, 102, 241, 0.4); color: #a5b4fc;">
                <i class="fa-solid fa-file-pdf"></i> Manual Oficial (PDF)
              </a>
            </div>
          </div>
        </details>

        <!-- Accordion de Sincronização Cloud Turso -->
        <details class="settings-accordion">
          <summary class="settings-accordion-header">
            <i class="fa-solid fa-cloud-arrow-up" style="color: #38bdf8;"></i> Sincronização com Banco Turso Cloud
          </summary>
          <div class="settings-accordion-body">
            <p style="color: var(--text-secondary); margin-bottom: 16px; line-height: 1.6;">
              Gerencie a sincronização bidirecional entre o computador local e a nuvem <strong>Turso Cloud DB</strong>.
            </p>
            
            <div class="sync-info-box" style="margin-bottom: 18px;">
              <div class="sync-info-item">
                <span><i class="fa-solid fa-desktop" style="color: #818cf8;"></i> Último Backup Local:</span>
                <val id="cfg-sync-local-time">Carregando...</val>
              </div>
              <div class="sync-info-divider"></div>
              <div class="sync-info-item">
                <span><i class="fa-solid fa-cloud" style="color: #38bdf8;"></i> Versão no Turso Cloud:</span>
                <val id="cfg-sync-cloud-time">Carregando...</val>
              </div>
            </div>

            <div class="settings-form-group" style="margin-bottom: 16px;">
              <label style="display: block; color: var(--text-secondary); margin-bottom: 6px; font-size: 13px;">URL do Banco de Dados Turso (Ex: libsql://...)</label>
              <input type="text" id="turso-cfg-url" class="form-input" style="width: 100%;" placeholder="libsql://...">
            </div>
            <div class="settings-form-group" style="margin-bottom: 16px;">
              <label style="display: block; color: var(--text-secondary); margin-bottom: 6px; font-size: 13px;">Token de Autenticação (JWT)</label>
              <input type="password" id="turso-cfg-token" class="form-input" style="width: 100%;" placeholder="ey...">
              <small style="color: #64748b; font-size: 12px; margin-top: 4px; display: block;">Deixe em branco para não alterar se já estiver configurado.</small>
            </div>
            ${getRolePermissions(state.user).role === 'Desenvolvedor' ? `
            <div class="settings-form-group" style="margin-bottom: 16px; margin-top: 16px;">
              <label style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
                <input type="checkbox" id="turso-cfg-manual-sync" style="width: 18px; height: 18px; accent-color: #6366f1; cursor: pointer;">
                <span style="color: var(--text-primary); font-size: 14px; font-weight: 500;">Habilitar Sincronização Manual</span>
              </label>
              <small style="color: #64748b; font-size: 12px; margin-top: 4px; display: block; margin-left: 26px;">Desativa a verificação automática e sincroniza apenas pelos botões.</small>
            </div>
            ` : ''}
            <div style="display: flex; gap: 12px; align-items: center; flex-wrap: wrap; margin-top: 16px; padding-top: 16px; border-top: 1px solid var(--border-color);">
              <button id="btn-save-turso-cfg" style="background-color: #6366f1; color: white; border: none; padding: 8px 16px; border-radius: 6px; font-weight: 500; display: flex; align-items: center; gap: 8px; cursor: pointer; transition: opacity 0.2s;" onmouseover="this.style.opacity='0.9'" onmouseout="this.style.opacity='1'">
                <i class="fa-solid fa-save"></i> Salvar Credenciais
              </button>
              <button id="btn-test-turso-cfg" style="background-color: #334155; color: white; border: none; padding: 8px 16px; border-radius: 6px; font-weight: 500; display: flex; align-items: center; gap: 8px; cursor: pointer; transition: opacity 0.2s;" onmouseover="this.style.opacity='0.9'" onmouseout="this.style.opacity='1'">
                <i class="fa-solid fa-arrows-rotate"></i> Testar Conexão
              </button>
              <button id="btn-sync-turso-download" style="background-color: #f59e0b; color: white; border: none; padding: 8px 16px; border-radius: 6px; font-weight: 500; display: flex; align-items: center; gap: 8px; cursor: pointer; transition: opacity 0.2s;" onmouseover="this.style.opacity='0.9'" onmouseout="this.style.opacity='1'">
                <i class="fa-solid fa-cloud-arrow-down"></i> Restaurar do Banco
              </button>
              <button id="btn-sync-turso-now" style="background-color: #10b981; color: white; border: none; padding: 8px 16px; border-radius: 6px; font-weight: 500; display: flex; align-items: center; gap: 8px; cursor: pointer; transition: opacity 0.2s;" onmouseover="this.style.opacity='0.9'" onmouseout="this.style.opacity='1'">
                <i class="fa-solid fa-cloud-arrow-up"></i> Sincronizar Agora
              </button>

              <div id="turso-last-sync-container" style="margin-left: auto; font-size: 12px; color: #94a3b8; display: block;">
                Última sincronização: <span id="turso-last-sync-time" style="color: #10b981;">---</span>
              </div>
            </div>
          </div>
        </details>

        <!-- Accordion de Manutenção -->
        <details class="settings-accordion">
          <summary class="settings-accordion-header">
            <i class="fa-solid fa-database"></i> Gerenciamento de Dados de Teste
            ${(getRolePermissions(state.user).canManageUsers || getRolePermissions(state.user).role === 'Desenvolvedor') ? '' : '<span class="status-badge" style="margin-left:auto; background:rgba(255,0,0,0.1);"><i class="fa-solid fa-lock"></i> BLOQUEADO</span>'}
          </summary>
          <div class="settings-accordion-body">
            ${(getRolePermissions(state.user).canManageUsers || getRolePermissions(state.user).role === 'Desenvolvedor') ? `
            <p style="color: var(--text-secondary); margin-bottom: 16px; line-height: 1.6;">
              Utilize os botões abaixo para simular a carga de dados fictícios para testes rápidos ou zerar o banco de dados completamente.
            </p>
            <div class="settings-actions" style="display: flex; align-items: center; gap: 8px;">
              <select id="seed-amount" class="input" style="width: auto; padding-right: 32px; height: 42px;">
                <option value="5">5 Registros</option>
                <option value="10">10 Registros</option>
                <option value="50">50 Registros</option>
                <option value="100">100 Registros</option>
                <option value="150">150 Registros</option>
                <option value="200">200 Registros</option>
                <option value="250">250 Registros</option>
                <option value="300" selected>300 Registros</option>
              </select>
              <button id="btn-seed-custom" class="btn btn-primary">
                <i class="fa-solid fa-users"></i> Gerar Registros
              </button>
              <button id="btn-reset" class="btn btn-reset-db-action" style="background-color: rgba(255, 50, 80, 0.15); border-color: var(--color-danger); color: var(--color-danger);">
                <i class="fa-solid fa-trash-can"></i> Limpar Banco de Dados
              </button>
            </div>
            ` : `
              <div style="text-align: center; padding: 20px 0; color: var(--color-danger); opacity: 0.8;">
                <i class="fa-solid fa-shield-halved" style="font-size: 2rem; margin-bottom: 12px;"></i>
                <p>Acesso negado. Apenas o usuário master (<strong>mazzarowysk</strong>) e Desenvolvedores possuem acesso a esta seção.</p>
              </div>
            `}
          </div>
        </details>

        <!-- Accordion de Backup e Restauração -->
        <details class="settings-accordion" style="border: 1px solid rgba(129, 140, 248, 0.35);">
          <summary class="settings-accordion-header" style="background: linear-gradient(135deg, rgba(99, 102, 241, 0.15), rgba(219, 39, 119, 0.15)); font-weight: 700;">
            <i class="fa-solid fa-box-archive" style="color: #f472b6;"></i> Backup e Restauração
            <span class="status-badge" style="margin-left: auto; background: rgba(52, 211, 153, 0.15); color: #34d399; border: 1px solid rgba(52, 211, 153, 0.3);">
              <i class="fa-brands fa-google-drive" style="margin-right: 4px;"></i> REDUNDÂNCIA ATIVA
            </span>
          </summary>
          <div class="settings-accordion-body">
            
            <div class="backup-actions-grid">
              <div class="backup-action-card">
                <div>
                  <div class="backup-card-header">
                    <i class="fa-solid fa-download" style="color: #818cf8;"></i> Exportar Backup
                  </div>
                  <p class="backup-card-desc">Exporte todos os dados do sistema para um arquivo .JSON seguro.</p>
                </div>
                <button id="btn-export-json" class="btn" style="background: linear-gradient(135deg, #6366f1, #4f46e5); color: #fff; border: none; font-weight: 600; font-size: 0.85rem; padding: 8px 16px; border-radius: 8px; cursor: pointer;">
                  <i class="fa-solid fa-play"></i> Exportar
                </button>
              </div>

              <div class="backup-action-card">
                <div>
                  <div class="backup-card-header">
                    <i class="fa-solid fa-rotate-right" style="color: #34d399;"></i> Backup Incremental
                  </div>
                  <p class="backup-card-desc">Backup apenas das alterações e movimentações recentes desde o último backup.</p>
                </div>
                <button id="btn-quick-backup" class="btn" style="background: linear-gradient(135deg, #10b981, #059669); color: #fff; border: none; font-weight: 600; font-size: 0.85rem; padding: 8px 16px; border-radius: 8px; cursor: pointer;">
                  <i class="fa-solid fa-bolt"></i> Backup Rápido
                </button>
              </div>

              <div class="backup-action-card">
                <div>
                  <div class="backup-card-header">
                    <i class="fa-solid fa-upload" style="color: #fbbf24;"></i> Importar Backup
                  </div>
                  <p class="backup-card-desc">Restaure os dados do sistema a partir de um arquivo de backup prévio.</p>
                </div>
                <input type="file" id="import-json-file" accept=".json" style="display: none;" />
                <button id="btn-import-json" class="btn" style="background: linear-gradient(135deg, #f59e0b, #d97706); color: #fff; border: none; font-weight: 600; font-size: 0.85rem; padding: 8px 16px; border-radius: 8px; cursor: pointer;">
                  <i class="fa-solid fa-file-import"></i> Importar
                </button>
              </div>

              <div class="backup-action-card">
                <div>
                  <div class="backup-card-header" style="color: #f87171;">
                    <i class="fa-solid fa-triangle-exclamation" style="color: #ef4444;"></i> Limpar Dados
                  </div>
                  <p class="backup-card-desc">Remove todos os dados do sistema (pacientes, atendimentos, histórico).</p>
                </div>
                <button id="btn-reset-card-backup" class="btn btn-reset-db-action" style="background: linear-gradient(135deg, #ef4444, #dc2626); color: #fff; border: none; font-weight: 600; font-size: 0.85rem; padding: 8px 16px; border-radius: 8px; cursor: pointer;">
                  <i class="fa-solid fa-trash-can"></i> Limpar
                </button>
              </div>
            </div>

            <div class="backup-status-banner">
              <i class="fa-solid fa-clock-rotate-left" style="color: #818cf8;"></i>
              <span>Último backup: <strong id="cfg-last-backup-text" style="color: #e2e8f0;">Nenhum backup realizado</strong></span>
            </div>

            <div class="backup-auto-card">
              <div class="backup-auto-header">
                <i class="fa-solid fa-robot" style="color: #6366f1; font-size: 1.25rem;"></i>
                <span>Backup Automático Agendado</span>
              </div>

              <div class="backup-auto-field">
                <label class="backup-auto-label">
                  <input type="checkbox" id="cfg-autobackup-enable" checked style="width: 18px; height: 18px; accent-color: #6366f1; cursor: pointer;">
                  <span>Habilitar backup automático</span>
                </label>

                <div class="backup-auto-select-group">
                  <label>FREQUÊNCIA</label>
                  <select id="cfg-autobackup-freq" class="backup-auto-select">
                    <option value="Diário" selected>Diário</option>
                    <option value="Semanal">Semanal</option>
                    <option value="Mensal">Mensal</option>
                  </select>
                </div>
              </div>

              <div class="backup-auto-field" style="margin-top: 14px;">
                <label class="backup-auto-label">
                  <input type="checkbox" id="cfg-autobackup-download" checked style="width: 18px; height: 18px; accent-color: #6366f1; cursor: pointer;">
                  <span>Baixar automaticamente quando criar backup</span>
                </label>

                <div class="backup-auto-select-group">
                  <label>MANTER HISTÓRICO DE</label>
                  <select id="cfg-autobackup-history" class="backup-auto-select">
                    <option value="5" selected>5 backups</option>
                    <option value="10">10 backups</option>
                    <option value="20">20 backups</option>
                  </select>
                </div>
              </div>

              <div class="gdrive-sync-box">
                <div class="gdrive-sync-header">
                  <i class="fa-brands fa-google-drive" style="font-size: 1.3rem; color: #0284c7;"></i>
                  <span>Google Drive</span>
                </div>

                <label class="gdrive-sync-label">
                  <input type="checkbox" id="cfg-gdrive-sync-enable" checked style="width: 17px; height: 17px; accent-color: #0284c7; cursor: pointer;">
                  <span>Sincronizar backup automaticamente com Google Drive</span>
                </label>

                <div style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap;">
                  <button id="btn-gdrive-connect" class="gdrive-connect-btn" type="button">
                    <i class="fa-brands fa-google-drive"></i>
                    <span id="gdrive-btn-text">Conectar</span>
                  </button>
                  <button id="btn-gdrive-test-sync" type="button" style="background: rgba(16, 185, 129, 0.12); color: #059669; border: 1px solid rgba(16, 185, 129, 0.3); font-size: 0.8rem; font-weight: 600; padding: 7px 14px; border-radius: 8px; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; transition: all 0.2s;">
                    <i class="fa-solid fa-rotate"></i> Testar Sincronização Agora
                  </button>
                  <button id="btn-gdrive-open" type="button" style="background: rgba(2, 132, 199, 0.12); color: #0284c7; border: 1px solid rgba(2, 132, 199, 0.3); font-size: 0.8rem; font-weight: 600; padding: 7px 14px; border-radius: 8px; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; transition: all 0.2s;">
                    <i class="fa-solid fa-arrow-up-right-from-square"></i> Abrir Meu Google Drive
                  </button>
                  <div id="gdrive-status-indicator" class="gdrive-status-indicator">
                    <i class="fa-solid fa-circle-dot" style="font-size: 0.65rem;"></i>
                    <span id="gdrive-status-label">Não conectado</span>
                  </div>
                </div>

                <div style="margin-top: 12px; background: rgba(255,255,255,0.75); padding: 14px 16px; border-radius: 12px; border: 1px solid rgba(2, 132, 199, 0.3); box-shadow: 0 2px 8px rgba(2,132,199,0.06);">
                  <div style="margin-bottom: 10px;">
                    <label style="display: block; font-size: 0.76rem; font-weight: 700; color: #0369a1; text-transform: uppercase; letter-spacing: 0.04em; margin-bottom: 6px;">
                      🔑 Client ID da API do Google Cloud (OAuth 2.0)
                    </label>
                    <input type="text" id="cfg-gdrive-client-id-direct" placeholder="Cole seu Client ID aqui" style="width: 100%; background: #ffffff; border: 1px solid #94a3b8; color: #0f172a; padding: 8px 12px; border-radius: 8px; font-size: 0.82rem; font-family: monospace; outline: none;">
                  </div>
                  <div style="margin-bottom: 12px;">
                    <label style="display: block; font-size: 0.76rem; font-weight: 700; color: #0369a1; text-transform: uppercase; letter-spacing: 0.04em; margin-bottom: 6px;">
                      🔐 Chave Secreta do Cliente (Client Secret)
                    </label>
                    <input type="password" id="cfg-gdrive-client-secret-direct" placeholder="Cole sua Chave Secreta aqui" style="width: 100%; background: #ffffff; border: 1px solid #94a3b8; color: #0f172a; padding: 8px 12px; border-radius: 8px; font-size: 0.82rem; font-family: monospace; outline: none;">
                  </div>
                  <div style="display: flex; justify-content: flex-end;">
                    <button id="btn-save-gdrive-client-id-direct" type="button" style="background: linear-gradient(135deg, #0284c7, #0369a1); color: #ffffff; border: none; padding: 8px 20px; border-radius: 8px; font-size: 0.82rem; font-weight: 700; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; box-shadow: 0 3px 10px rgba(2, 132, 199, 0.3);">
                      <i class="fa-solid fa-floppy-disk"></i> Salvar Credenciais Google Cloud
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div style="display: flex; justify-content: space-between; font-size: 0.78rem; color: #94a3b8; padding: 4px 6px;">
              <span>Redundância de Dados Hospitalares</span>
              <span>Último backup: <strong id="cfg-footer-last-backup-time" style="color: #64748b;">---</strong></span>
            </div>

          </div>
        </details>

        <!-- Accordion de Gerenciamento de Usuários -->
        <details class="settings-accordion">
          <summary class="settings-accordion-header">
            <i class="fa-solid fa-users-gear"></i> Gerenciamento de Usuários
            ${getRolePermissions(state.user).canManageUsers ? '<span class="status-badge" style="margin-left:auto;"><span class="status-indicator success"></span>' + (getRolePermissions(state.user).role || 'MASTER').toUpperCase() + '</span>' : '<span class="status-badge" style="margin-left:auto; background:rgba(255,0,0,0.1);"><i class="fa-solid fa-lock"></i> BLOQUEADO</span>'}
          </summary>
          <div class="settings-accordion-body">
            ${getRolePermissions(state.user).canManageUsers ? `
              <p style="color: var(--text-secondary); margin-bottom: 16px; line-height: 1.6;">
                <strong>Bem-vindo, ${getRolePermissions(state.user).label}.</strong> Aqui você poderá editar perfis, resetar senhas e alterar permissões de outros usuários da clínica.
              </p>
              <div class="settings-actions">
                <button id="btn-edit-permissions" class="btn btn-primary">
                  <i class="fa-solid fa-users-gear"></i> Gerenciar Usuários &amp; Permissões
                </button>
              </div>
            ` : `
              <div style="text-align: center; padding: 20px 0; color: var(--color-danger); opacity: 0.8;">
                <i class="fa-solid fa-shield-halved" style="font-size: 2rem; margin-bottom: 12px;"></i>
                <p>Acesso negado. Apenas o usuário master (<strong>mazzarowysk</strong>) pode alterar as configurações de outros usuários.</p>
              </div>
            `}
          </div>
        </details>

      </div>
    </div>
  `;

  document.getElementById('btn-edit-permissions')?.addEventListener('click', showUserManagementModal);
  document.getElementById('btn-open-tabbed-manual-modal')?.addEventListener('click', () => {
    if (typeof window.showInteractiveManualModal === 'function') window.showInteractiveManualModal('geral');
  });

  (async () => {
    try {
      const statusData = await getSyncStatus();
      if (statusData) {
        const localEl = document.getElementById('cfg-sync-local-time');
        const cloudEl = document.getElementById('cfg-sync-cloud-time');
        if (localEl) localEl.textContent = formatSyncDate(statusData.lastLocalBackup);
        if (cloudEl) cloudEl.textContent = formatSyncDate(statusData.lastCloudBackup);
      }

      const tursoRes = await apiFetch(`/api/settings/turso`);
      if (tursoRes.ok) {
        const tursoData = await tursoRes.json();
        const hasToken = tursoData.hasToken || (tursoData.token && tursoData.token.length > 0 && tursoData.token !== '');
        const cloudConnected = tursoData.cloud_connected !== undefined ? tursoData.cloud_connected : hasToken;

        const urlInput = document.getElementById('turso-cfg-url');
        const tokenInput = document.getElementById('turso-cfg-token');
        if (urlInput) urlInput.value = tursoData.url || 'libsql://health-nexus-mazzarowysk.aws-us-east-1.turso.io';
        if (tokenInput) tokenInput.value = (tursoData.token && tursoData.token !== '') ? tursoData.token : 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3ODYxNDU1NTgsImlkIjoiMDE5Zjc1YmYtMTUwMS03YmMyLTlkYTQtZTA1ZGIxMzdiYjEyIiwia2lkIjoiU0RZWEtINkIzZWg1b3JtRDBPRXpUbmhUaGpFMllXRXJxbjhCNVFnSmVLZyIsInJpZCI6Ijg4YTY2NjM0LTM3YWQtNGEyZC04ZmUxLTFmYjM3ZDAxNGE4YiJ9.teLr9MEIIXvjkOJh_nUWWaGwJuF0vnFwaMdUsyQLQba1kLOP30ziYQJkCWDDbADYl74zhYLujOwdr0Gg5EWoAg';

        const statusBadge = document.getElementById('turso-settings-status-badge');
        if (statusBadge) {
          if (cloudConnected) {
            statusBadge.innerHTML = '<span class="status-indicator success"></span>Conectado (AWS Us-East-1)';
          } else {
            statusBadge.innerHTML = '<span class="status-indicator" style="background: red;"></span>Desconectado';
          }
        }
        const lastSyncEl = document.getElementById('turso-last-sync-time');
        if (lastSyncEl) {
          lastSyncEl.textContent = tursoData.lastSync ? new Date(tursoData.lastSync).toLocaleString('pt-BR') : 'Nenhuma';
        }
      }
    } catch (err) {
      console.warn('Erro ao carregar configuracoes Turso:', err);
    }
  })();

  const manualSyncCheckbox = document.getElementById('turso-cfg-manual-sync');
  if (manualSyncCheckbox) {
    manualSyncCheckbox.checked = localStorage.getItem('turso_manual_sync') === 'true';
    manualSyncCheckbox.addEventListener('change', (e) => {
      localStorage.setItem('turso_manual_sync', e.target.checked);
      if (e.target.checked) {
        if (syncManager.timerInterval) clearInterval(syncManager.timerInterval);
        syncManager.timerCountdownSeconds = 0;
        syncManager.updateTimerUI();
        showToast('Sincronização manual ativada.');
      } else {
        syncManager.startAutoSyncTimer();
        showToast('Sincronização automática ativada.');
      }
    });
  }

  document.getElementById('btn-save-turso-cfg')?.addEventListener('click', async () => {
    const url = document.getElementById('turso-cfg-url')?.value;
    const token = document.getElementById('turso-cfg-token')?.value;
    const btn = document.getElementById('btn-save-turso-cfg');
    if (!btn) return;
    btn.disabled = true;
    const oldHtml = btn.innerHTML;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Salvando...';
    try {
      const res = await apiFetch(`/api/settings/turso`, {
        method: 'POST',
        body: JSON.stringify({ url, token })
      });
      const data = await res.json();
      if (res.ok) {
        showCustomAlert({ title: 'Sucesso', message: data.message, type: 'success' });
      } else {
        showCustomAlert({ title: 'Erro', message: data.message, type: 'error' });
      }
    } catch (e) {
      showCustomAlert({ title: 'Erro', message: 'Falha de rede ao salvar credenciais.', type: 'error' });
    } finally {
      btn.disabled = false;
      btn.innerHTML = oldHtml;
    }
  });

  document.getElementById('btn-test-turso-cfg')?.addEventListener('click', async () => {
    const btn = document.getElementById('btn-test-turso-cfg');
    if (!btn) return;
    btn.disabled = true;
    const oldHtml = btn.innerHTML;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Testando...';
    try {
      const res = await apiFetch(`/api/settings/turso/test`);
      const data = await res.json();
      if (res.ok) {
        showCustomAlert({ title: 'Sucesso', message: data.message, type: 'success' });
      } else {
        showCustomAlert({ title: 'Erro', message: data.message, type: 'error' });
      }
    } catch (e) {
      showCustomAlert({ title: 'Erro', message: 'Falha de rede ao testar conexão.', type: 'error' });
    } finally {
      btn.disabled = false;
      btn.innerHTML = oldHtml;
    }
  });

  document.getElementById('btn-sync-turso-now')?.addEventListener('click', async () => {
    const btn = document.getElementById('btn-sync-turso-now');
    if (!btn) return;
    btn.disabled = true;
    const originalHtml = btn.innerHTML;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Sincronizando...';
    try {
      await syncManager.pushToCloud(true);
      const statusData = await getSyncStatus();
      if (statusData) {
        const tursoLastEl = document.getElementById('turso-last-sync-time');
        if (tursoLastEl) tursoLastEl.textContent = new Date().toLocaleString('pt-BR');
      }
    } finally {
      btn.disabled = false;
      btn.innerHTML = originalHtml;
    }
  });

  document.getElementById('btn-sync-turso-download')?.addEventListener('click', async () => {
    const confirmed = await showCustomConfirm({
      title: 'Baixar Dados do Turso Cloud',
      message: 'Deseja baixar e substituir os dados locais pelos dados armazenados no Turso Cloud?',
      confirmText: 'Sim, Baixar Dados',
      cancelText: 'Cancelar',
      type: 'warning'
    });

    if (confirmed) {
      const btn = document.getElementById('btn-sync-turso-download');
      if (btn) {
        btn.disabled = true;
        const originalHtml = btn.innerHTML;
        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Baixando...';
        try {
          await syncManager.pullFromCloud();
        } finally {
          btn.disabled = false;
          btn.innerHTML = originalHtml;
        }
      }
    }
  });
}
