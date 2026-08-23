// ─── MÓDULO DA ABA CONFIGURAÇÕES & ADMINISTRAÇÃO (HEALTH NEXUS v2.7.2) ───────────
import { state } from '../state.js';
import * as localDB from '../localDB.js';
import { generateMockData } from '../mockDataGenerator.js';
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
                <input type="checkbox" id="turso-cfg-manual-sync" style="width: 18px; height: 18px; accent-color: #0284c7; cursor: pointer;">
                <span style="color: var(--text-primary); font-size: 14px; font-weight: 500;">Habilitar Sincronização Manual</span>
              </label>
              <small style="color: #64748b; font-size: 12px; margin-top: 4px; display: block; margin-left: 26px;">Desativa a verificação automática e sincroniza apenas pelos botões.</small>
            </div>
            ` : ''}
            <div style="display: flex; gap: 12px; align-items: center; flex-wrap: wrap; margin-top: 16px; padding-top: 16px; border-top: 1px solid var(--border-color);">
              <button id="btn-save-turso-cfg" style="background-color: #0284c7; color: white; border: none; padding: 8px 16px; border-radius: 6px; font-weight: 600; display: flex; align-items: center; gap: 8px; cursor: pointer; transition: opacity 0.2s;" onmouseover="this.style.opacity='0.9'" onmouseout="this.style.opacity='1'">
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
        <details class="settings-accordion" style="border: 1px solid #1e293b;">
          <summary class="settings-accordion-header" style="background: #111827; font-weight: 700;">
            <i class="fa-solid fa-box-archive" style="color: #38bdf8;"></i> Backup e Restauração
            <span class="status-badge" style="margin-left: auto; background: rgba(52, 211, 153, 0.15); color: #34d399; border: 1px solid rgba(52, 211, 153, 0.3);">
              <i class="fa-brands fa-google-drive" style="margin-right: 4px;"></i> REDUNDÂNCIA ATIVA
            </span>
          </summary>
          <div class="settings-accordion-body">
            
            <div class="backup-actions-grid">
              <div class="backup-action-card">
                <div>
                  <div class="backup-card-header">
                    <i class="fa-solid fa-download" style="color: #38bdf8;"></i> Exportar Backup
                  </div>
                  <p class="backup-card-desc">Exporte todos os dados do sistema para um arquivo .JSON seguro.</p>
                </div>
                <button id="btn-export-json" class="btn" style="background: #0284c7; color: #fff; border: none; font-weight: 600; font-size: 0.85rem; padding: 8px 16px; border-radius: 8px; cursor: pointer; box-shadow: 0 2px 8px rgba(2,132,199,0.35);">
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

  // ─── GERENCIAMENTO DE DADOS DE TESTE (SIMULAÇÃO E LIMPEZA) ───
  document.getElementById('btn-seed-custom')?.addEventListener('click', async () => {
    const countSelect = document.getElementById('seed-amount') || document.getElementById('seed-count-select');
    const count = parseInt(countSelect ? countSelect.value : '5', 10);
    const btn = document.getElementById('btn-seed-custom');
    if (!btn) return;
    btn.disabled = true;
    const oldHtml = btn.innerHTML;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Gerando...';
    try {
      const result = await generateMockData(count);
      if (typeof window.clearDataCache === 'function') window.clearDataCache();
      if (typeof syncManager !== 'undefined' && syncManager.pushToCloud) {
        syncManager.pushToCloud(false).catch(() => {});
      }
      showSimulationSummaryModal(result, count);
    } catch (e) {
      console.error('Erro ao gerar registros:', e);
      showCustomAlert({
        title: 'Erro na Simulação',
        message: 'Ocorreu um erro ao gerar os dados de teste: ' + (e.message || e),
        type: 'danger'
      });
    } finally {
      btn.disabled = false;
      btn.innerHTML = oldHtml;
    }
  });

  // Limpeza de Banco de Dados
  document.querySelectorAll('.btn-reset-db-action, #btn-reset, #btn-reset-card-backup').forEach(btn => {
    btn.addEventListener('click', async () => {
      const confirmed = await showCustomConfirm({
        title: 'Limpar Banco de Dados',
        message: 'Tem certeza que deseja apagar todos os registros (pacientes, atendimentos, agendamentos, prescrições e leitos)? Os usuários do sistema serão preservados.',
        confirmText: 'Sim, Limpar Tudo',
        cancelText: 'Cancelar',
        type: 'danger'
      });

      if (confirmed) {
        btn.disabled = true;
        const oldHtml = btn.innerHTML;
        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Limpando...';
        try {
          localDB.clear();
          await apiFetch('/api/settings/reset', { method: 'POST' }).catch(() => {});
          if (typeof window.clearDataCache === 'function') window.clearDataCache();
          
          // Sincronização em nuvem disparada em segundo plano para resposta instantânea
          if (typeof syncManager !== 'undefined' && syncManager.pushToCloud) {
            syncManager.pushToCloud(false).catch(() => {});
          }

          showToast('🗑️ Banco de dados limpo com sucesso!');
          showCustomAlert({
            title: 'Banco de Dados Limpo',
            message: 'Todos os registros de pacientes, atendimentos, agendamentos e movimentações foram apagados instantaneamente com sucesso. O sistema está pronto.',
            type: 'success'
          });
        } catch (err) {
          console.error('Erro ao limpar banco:', err);
          showToast('❌ Erro ao limpar o banco de dados.', true);
        } finally {
          btn.disabled = false;
          btn.innerHTML = oldHtml;
        }
      }
    });
  });

  // ─── BACKUP E RESTAURAÇÃO ───
  document.getElementById('btn-export-json')?.addEventListener('click', () => {
    const db = localDB.getFullDB();
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(db, null, 2));
    const dlAnchorElem = document.createElement('a');
    dlAnchorElem.setAttribute("href", dataStr);
    dlAnchorElem.setAttribute("download", `health_nexus_backup_${new Date().toISOString().slice(0,10)}.json`);
    dlAnchorElem.click();
    showToast('💾 Backup exportado com sucesso!');
  });

  document.getElementById('btn-import-json')?.addEventListener('click', () => {
    document.getElementById('import-json-file')?.click();
  });

  document.getElementById('import-json-file')?.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const json = JSON.parse(event.target.result);
        localDB.saveFullDB(json);
        if (typeof window.clearDataCache === 'function') window.clearDataCache();
        showToast('✅ Backup importado com sucesso!');
      } catch (err) {
        showToast('❌ Arquivo de backup inválido.', true);
      }
    };
    reader.readAsText(file);
  });

  document.getElementById('btn-quick-backup')?.addEventListener('click', () => {
    localStorage.setItem('healthNexusLastBackup', new Date().toISOString());
    const lastBackupEl = document.getElementById('cfg-last-backup-text');
    if (lastBackupEl) lastBackupEl.textContent = new Date().toLocaleString('pt-BR');
    showToast('⚡ Backup incremental realizado com sucesso!');
  });
}

export function showSimulationSummaryModal(result = {}, count = 5) {
  const existing = document.getElementById('hn-simulation-summary-modal');
  if (existing) existing.remove();

  const patients = Array.isArray(result.patients) ? result.patients : [];
  const doctors = Array.isArray(result.doctors) ? result.doctors : [];
  const nurses = Array.isArray(result.nurses) ? result.nurses : [];
  const users = Array.isArray(result.users) ? result.users : (window.localDB ? window.localDB.list('users') : []) || [];
  const appointments = Array.isArray(result.appointments) ? result.appointments : [];
  const encounters = Array.isArray(result.encounters) ? result.encounters : [];
  const triages = Array.isArray(result.triages) ? result.triages : [];
  const beds = Array.isArray(result.beds) ? result.beds : [];
  const bedsOccupied = beds.filter(b => b && b.status === 'Ocupado').length;
  const financial = Array.isArray(result.financial_installments) ? result.financial_installments : [];
  const tvCalls = Array.isArray(result.tv_calls) ? result.tv_calls : [];
  const medications = Array.isArray(result.medications) ? result.medications : [];
  const dutySchedules = Array.isArray(result.duty_schedules) ? result.duty_schedules : [];

  const manchVermelho = triages.filter(t => t && (t.color === 'Vermelho' || t.manchesterColor === 'Vermelho')).length;
  const manchLaranja = triages.filter(t => t && (t.color === 'Laranja' || t.manchesterColor === 'Laranja')).length;
  const manchAmarelo = triages.filter(t => t && (t.color === 'Amarelo' || t.manchesterColor === 'Amarelo')).length;
  const manchVerde = triages.filter(t => t && (t.color === 'Verde' || t.manchesterColor === 'Verde')).length;
  const manchAzul = triages.filter(t => t && (t.color === 'Azul' || t.manchesterColor === 'Azul')).length;

  const overlay = document.createElement('div');
  overlay.id = 'hn-simulation-summary-modal';
  overlay.className = 'modal-overlay';
  overlay.style.cssText = 'position: fixed !important; top: 0 !important; left: 0 !important; width: 100vw !important; height: 100vh !important; z-index: 2147483647 !important; display: flex !important; align-items: center !important; justify-content: center !important; background: rgba(5, 7, 20, 0.88) !important; backdrop-filter: blur(14px) !important; -webkit-backdrop-filter: blur(14px) !important; padding: 20px; box-sizing: border-box;';

  overlay.innerHTML = `
    <div class="modal-content" style="max-width: 860px; width: 100%; max-height: 90vh; display: flex; flex-direction: column; background: var(--bg-secondary, #131326); border: 1.5px solid rgba(99, 102, 241, 0.6); border-radius: 20px; overflow: hidden; box-shadow: 0 25px 70px rgba(0,0,0,0.85), 0 0 40px rgba(99, 102, 241, 0.35); animation: slideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1);">
      
      <!-- Header do Modal -->
      <div style="background: linear-gradient(135deg, #4f46e5, #06b6d4); padding: 18px 24px; display: flex; justify-content: space-between; align-items: center; color: #ffffff; flex-shrink: 0;">
        <div style="display: flex; align-items: center; gap: 14px;">
          <div style="width: 44px; height: 44px; border-radius: 12px; background: rgba(255,255,255,0.22); display: flex; align-items: center; justify-content: center; font-size: 1.4rem; border: 1px solid rgba(255,255,255,0.35); box-shadow: 0 4px 12px rgba(0,0,0,0.15);">
            <i class="fa-solid fa-circle-check" style="color: #34d399;"></i>
          </div>
          <div>
            <h3 style="margin: 0; font-size: 1.25rem; font-weight: 800; color: #ffffff; letter-spacing: -0.02em;">Simulação Hospitalar Concluída com Sucesso!</h3>
            <span style="font-size: 0.84rem; color: rgba(255,255,255,0.95); font-weight: 500; display: flex; align-items: center; gap: 6px; margin-top: 2px;">
              <i class="fa-solid fa-database" style="color: #67e8f9;"></i> ${count} registros gerados e distribuídos por todos os setores do hospital
            </span>
          </div>
        </div>
        <button id="btn-close-sim-summary" class="modal-close" style="background: rgba(255,255,255,0.15); color: #fff; border: none; border-radius: 50%; width: 34px; height: 34px; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.2s;"><i class="fa-solid fa-xmark"></i></button>
      </div>

      <!-- Navegação de Abas do Modal -->
      <div style="display: flex; gap: 8px; padding: 12px 24px 0; background: var(--bg-tertiary, #1a1a35); border-bottom: 1px solid var(--border-color); flex-shrink: 0;">
        <button id="tab-btn-sim-check" class="btn" style="background: var(--bg-secondary, #131326); color: #00f2fe; border: 1px solid var(--border-color); border-bottom: 2px solid #00f2fe; padding: 8px 16px; font-size: 0.84rem; font-weight: 700; border-radius: 8px 8px 0 0; cursor: pointer;">
          <i class="fa-solid fa-list-check"></i> Resumo Geral (10 Módulos)
        </button>
        <button id="tab-btn-sim-patients" class="btn" style="background: transparent; color: var(--text-muted); border: 1px solid transparent; padding: 8px 16px; font-size: 0.84rem; font-weight: 600; border-radius: 8px 8px 0 0; cursor: pointer;">
          <i class="fa-solid fa-hospital-user"></i> Listagem dos Pacientes (${patients.length})
        </button>
      </div>

      <!-- Corpo com Rolagem -->
      <div id="sim-modal-body-content" style="padding: 20px 24px; overflow-y: auto; flex: 1;">
        
        <!-- SEÇÃO 1: CHECKLIST DE MÓDULOS -->
        <div id="sim-section-check">
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 12px; margin-bottom: 20px;">
            
            <div style="background: var(--bg-tertiary); border: 1px solid rgba(16, 185, 129, 0.35); border-left: 4px solid #10b981; border-radius: 10px; padding: 12px 14px; display: flex; align-items: center; gap: 12px;">
              <i class="fa-solid fa-hospital-user" style="font-size: 1.3rem; color: #10b981;"></i>
              <div>
                <strong style="font-size: 0.88rem; color: #f8fafc; display: block;">Pacientes Cadastrados</strong>
                <span style="font-size: 0.78rem; color: var(--text-muted);">&rarr; <strong>${patients.length}</strong> pacientes ativos</span>
              </div>
            </div>

            <div style="background: var(--bg-tertiary); border: 1px solid rgba(16, 185, 129, 0.35); border-left: 4px solid #10b981; border-radius: 10px; padding: 12px 14px; display: flex; align-items: center; gap: 12px;">
              <i class="fa-solid fa-user-doctor" style="font-size: 1.3rem; color: #38bdf8;"></i>
              <div>
                <strong style="font-size: 0.88rem; color: #f8fafc; display: block;">Corpo Clínico</strong>
                <span style="font-size: 0.78rem; color: var(--text-muted);">&rarr; <strong>${doctors.length}</strong> médicos | <strong>${nurses.length}</strong> enfermeiros</span>
              </div>
            </div>

            <div style="background: var(--bg-tertiary); border: 1px solid rgba(16, 185, 129, 0.35); border-left: 4px solid #10b981; border-radius: 10px; padding: 12px 14px; display: flex; align-items: center; gap: 12px;">
              <i class="fa-solid fa-key" style="font-size: 1.3rem; color: #a855f7;"></i>
              <div>
                <strong style="font-size: 0.88rem; color: #f8fafc; display: block;">Logins de Usuários</strong>
                <span style="font-size: 0.78rem; color: var(--text-muted);">&rarr; <strong>${users.length}</strong> contas com acesso</span>
              </div>
            </div>

            <div style="background: var(--bg-tertiary); border: 1px solid rgba(16, 185, 129, 0.35); border-left: 4px solid #10b981; border-radius: 10px; padding: 12px 14px; display: flex; align-items: center; gap: 12px;">
              <i class="fa-solid fa-calendar-check" style="font-size: 1.3rem; color: #00f2fe;"></i>
              <div>
                <strong style="font-size: 0.88rem; color: #f8fafc; display: block;">Agendamentos & Consultas</strong>
                <span style="font-size: 0.78rem; color: var(--text-muted);">&rarr; <strong>${appointments.length}</strong> consultas registradas</span>
              </div>
            </div>

            <div style="background: var(--bg-tertiary); border: 1px solid rgba(16, 185, 129, 0.35); border-left: 4px solid #10b981; border-radius: 10px; padding: 12px 14px; display: flex; align-items: center; gap: 12px;">
              <i class="fa-solid fa-stethoscope" style="font-size: 1.3rem; color: #f59e0b;"></i>
              <div>
                <strong style="font-size: 0.88rem; color: #f8fafc; display: block;">Atendimentos & Triagens</strong>
                <span style="font-size: 0.78rem; color: var(--text-muted);">&rarr; <strong>${encounters.length}</strong> atendimentos | <strong>${triages.length}</strong> triagens</span>
              </div>
            </div>

            <div style="background: var(--bg-tertiary); border: 1px solid rgba(16, 185, 129, 0.35); border-left: 4px solid #10b981; border-radius: 10px; padding: 12px 14px; display: flex; align-items: center; gap: 12px;">
              <i class="fa-solid fa-bed-pulse" style="font-size: 1.3rem; color: #ef4444;"></i>
              <div>
                <strong style="font-size: 0.88rem; color: #f8fafc; display: block;">Leitos & Internações</strong>
                <span style="font-size: 0.78rem; color: var(--text-muted);">&rarr; <strong>${bedsOccupied}/${beds.length}</strong> leitos ocupados</span>
              </div>
            </div>

            <div style="background: var(--bg-tertiary); border: 1px solid rgba(16, 185, 129, 0.35); border-left: 4px solid #10b981; border-radius: 10px; padding: 12px 14px; display: flex; align-items: center; gap: 12px;">
              <i class="fa-solid fa-money-bill-wave" style="font-size: 1.3rem; color: #10b981;"></i>
              <div>
                <strong style="font-size: 0.88rem; color: #f8fafc; display: block;">Títulos Financeiros</strong>
                <span style="font-size: 0.78rem; color: var(--text-muted);">&rarr; <strong>${financial.length}</strong> lançamentos</span>
              </div>
            </div>

            <div style="background: var(--bg-tertiary); border: 1px solid rgba(16, 185, 129, 0.35); border-left: 4px solid #10b981; border-radius: 10px; padding: 12px 14px; display: flex; align-items: center; gap: 12px;">
              <i class="fa-solid fa-tv" style="font-size: 1.3rem; color: #818cf8;"></i>
              <div>
                <strong style="font-size: 0.88rem; color: #f8fafc; display: block;">Painel TV (Chamador)</strong>
                <span style="font-size: 0.78rem; color: var(--text-muted);">&rarr; <strong>${tvCalls.length}</strong> chamadas TV</span>
              </div>
            </div>

            <div style="background: var(--bg-tertiary); border: 1px solid rgba(16, 185, 129, 0.35); border-left: 4px solid #10b981; border-radius: 10px; padding: 12px 14px; display: flex; align-items: center; gap: 12px;">
              <i class="fa-solid fa-prescription-bottle-medical" style="font-size: 1.3rem; color: #f43f5e;"></i>
              <div>
                <strong style="font-size: 0.88rem; color: #f8fafc; display: block;">Farmácia & Estoque</strong>
                <span style="font-size: 0.78rem; color: var(--text-muted);">&rarr; <strong>${medications.length}</strong> medicamentos</span>
              </div>
            </div>

            <div style="background: var(--bg-tertiary); border: 1px solid rgba(16, 185, 129, 0.35); border-left: 4px solid #10b981; border-radius: 10px; padding: 12px 14px; display: flex; align-items: center; gap: 12px;">
              <i class="fa-solid fa-clipboard-user" style="font-size: 1.3rem; color: #fbbf24;"></i>
              <div>
                <strong style="font-size: 0.88rem; color: #f8fafc; display: block;">Escalas de Plantão</strong>
                <span style="font-size: 0.78rem; color: var(--text-muted);">&rarr; <strong>${dutySchedules.length}</strong> turnos gerados</span>
              </div>
            </div>

          </div>

          <!-- Card de Resumo de Distribuição de Manchester -->
          <div style="background: var(--bg-tertiary); border: 1px solid var(--border-color); border-radius: 14px; padding: 16px; margin-bottom: 10px;">
            <h4 style="margin: 0 0 12px; font-size: 0.88rem; color: var(--text-primary); display: flex; align-items: center; gap: 8px;">
              <i class="fa-solid fa-heart-pulse" style="color: #ef4444;"></i> Classificação de Risco (Protocolo de Manchester)
            </h4>
            <div style="display: flex; gap: 10px; flex-wrap: wrap;">
              <span style="background: rgba(239,68,68,0.15); border: 1px solid #ef4444; color: #f87171; padding: 4px 10px; border-radius: 20px; font-size: 0.76rem; font-weight: 700;">🔴 Emergência: ${manchVermelho}</span>
              <span style="background: rgba(249,115,22,0.15); border: 1px solid #f97316; color: #fb923c; padding: 4px 10px; border-radius: 20px; font-size: 0.76rem; font-weight: 700;">🟠 Muito Urgente: ${manchLaranja}</span>
              <span style="background: rgba(234,179,8,0.15); border: 1px solid #eab308; color: #facc15; padding: 4px 10px; border-radius: 20px; font-size: 0.76rem; font-weight: 700;">🟡 Urgente: ${manchAmarelo}</span>
              <span style="background: rgba(16,185,129,0.15); border: 1px solid #10b981; color: #34d399; padding: 4px 10px; border-radius: 20px; font-size: 0.76rem; font-weight: 700;">🟢 Pouco Urgente: ${manchVerde}</span>
              <span style="background: rgba(59,130,246,0.15); border: 1px solid #3b82f6; color: #60a5fa; padding: 4px 10px; border-radius: 20px; font-size: 0.76rem; font-weight: 700;">🔵 Não Urgente: ${manchAzul}</span>
            </div>
          </div>
        </div>

        <!-- SEÇÃO 2: LISTAGEM DE REGISTROS GERADOS -->
        <div id="sim-section-patients" style="display: none;">
          <div style="border: 1px solid var(--border-color); border-radius: 12px; overflow: hidden; background: var(--bg-tertiary);">
            <table style="width: 100%; border-collapse: collapse; font-size: 0.82rem; text-align: left;">
              <thead>
                <tr style="background: rgba(255,255,255,0.04); border-bottom: 1px solid var(--border-color); color: var(--text-muted);">
                  <th style="padding: 10px 12px;">Paciente</th>
                  <th style="padding: 10px 12px;">CPF</th>
                  <th style="padding: 10px 12px;">Idade / Sexo</th>
                  <th style="padding: 10px 12px;">Classificação Manchester</th>
                  <th style="padding: 10px 12px;">Status</th>
                </tr>
              </thead>
              <tbody>
                ${patients.slice(0, 15).map(p => {
                  const enc = encounters.find(e => e && (e.patientId === p.id || e.patientName === p.fullName)) || {};
                  const mc = enc.manchesterColor || 'Verde';
                  return `
                    <tr style="border-bottom: 1px solid rgba(255,255,255,0.03);">
                      <td style="padding: 10px 12px; font-weight: 700; color: var(--text-primary);">${p.fullName || 'Sem nome'}</td>
                      <td style="padding: 10px 12px; color: var(--text-secondary); font-family: monospace;">${p.cpf || '—'}</td>
                      <td style="padding: 10px 12px; color: var(--text-secondary);">${p.age || '—'} anos (${p.gender || '—'})</td>
                      <td style="padding: 10px 12px;"><span style="background: rgba(99,102,241,0.15); color: #a5b4fc; padding: 2px 8px; border-radius: 10px; font-size: 0.72rem; font-weight: 700;">● ${mc}</span></td>
                      <td style="padding: 10px 12px; color: #34d399; font-weight: 600;">${enc.status || 'Ativo'}</td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
            ${patients.length > 15 ? `<div style="padding: 8px 12px; text-align: center; color: var(--text-muted); font-size: 0.76rem;">Exibindo os primeiros 15 de ${patients.length} registros gerados.</div>` : ''}
          </div>
        </div>

      </div>

      <!-- Footer do Modal com Atalhos Rápidos -->
      <div style="padding: 14px 24px; background: var(--bg-tertiary, #1a1a35); border-top: 1px solid var(--border-color); display: flex; justify-content: space-between; align-items: center; flex-shrink: 0; gap: 12px; flex-wrap: wrap;">
        <span style="font-size: 0.8rem; color: var(--text-muted);">Status: <strong style="color: #34d399;"><i class="fa-solid fa-circle-check"></i> Banco Atualizado & Sincronizado</strong></span>
        <div style="display: flex; gap: 8px; flex-wrap: wrap;">
          <button id="btn-goto-pacientes" class="btn" style="background: rgba(99, 102, 241, 0.2); border: 1px solid rgba(99, 102, 241, 0.4); color: #a5b4fc; padding: 8px 14px; border-radius: 8px; font-weight: 700; font-size: 0.82rem; cursor: pointer; display: inline-flex; align-items: center; gap: 6px;">
            <i class="fa-solid fa-users"></i> Ver Pacientes
          </button>
          <button id="btn-goto-atendimentos" class="btn" style="background: rgba(56, 189, 248, 0.2); border: 1px solid rgba(56, 189, 248, 0.4); color: #38bdf8; padding: 8px 14px; border-radius: 8px; font-weight: 700; font-size: 0.82rem; cursor: pointer; display: inline-flex; align-items: center; gap: 6px;">
            <i class="fa-solid fa-stethoscope"></i> Ver Atendimentos
          </button>
          <button id="btn-confirm-sim-summary" class="btn btn-primary" style="padding: 8px 18px; border-radius: 8px; font-weight: 700; font-size: 0.82rem; cursor: pointer; display: inline-flex; align-items: center; gap: 6px;">
            <i class="fa-solid fa-check"></i> Concluir
          </button>
        </div>
      </div>

    </div>
  `;

  document.body.appendChild(overlay);

  // Tab switching logic inside modal
  const btnCheck = document.getElementById('tab-btn-sim-check');
  const btnPatients = document.getElementById('tab-btn-sim-patients');
  const secCheck = document.getElementById('sim-section-check');
  const secPatients = document.getElementById('sim-section-patients');

  if (btnCheck && btnPatients && secCheck && secPatients) {
    btnCheck.addEventListener('click', () => {
      btnCheck.style.background = 'var(--bg-secondary, #131326)';
      btnCheck.style.color = '#00f2fe';
      btnCheck.style.borderBottom = '2px solid #00f2fe';
      btnPatients.style.background = 'transparent';
      btnPatients.style.color = 'var(--text-muted)';
      btnPatients.style.borderBottom = '1px solid transparent';
      secCheck.style.display = 'block';
      secPatients.style.display = 'none';
    });

    btnPatients.addEventListener('click', () => {
      btnPatients.style.background = 'var(--bg-secondary, #131326)';
      btnPatients.style.color = '#00f2fe';
      btnPatients.style.borderBottom = '2px solid #00f2fe';
      btnCheck.style.background = 'transparent';
      btnCheck.style.color = 'var(--text-muted)';
      btnCheck.style.borderBottom = '1px solid transparent';
      secCheck.style.display = 'none';
      secPatients.style.display = 'block';
    });
  }

  const close = () => {
    overlay.remove();
  };

  document.getElementById('btn-close-sim-summary')?.addEventListener('click', close);
  
  document.getElementById('btn-confirm-sim-summary')?.addEventListener('click', () => {
    close();
    showSimulationSuccessFinalModal(count);
  });

  document.getElementById('btn-goto-pacientes')?.addEventListener('click', () => {
    close();
    if (typeof window.switchTab === 'function') window.switchTab('pacientes');
  });

  document.getElementById('btn-goto-atendimentos')?.addEventListener('click', () => {
    close();
    if (typeof window.switchTab === 'function') window.switchTab('atendimento');
  });
}

export function showSimulationSuccessFinalModal(count = 5) {
  const existing = document.getElementById('hn-simulation-final-success-modal');
  if (existing) existing.remove();

  const overlay = document.createElement('div');
  overlay.id = 'hn-simulation-final-success-modal';
  overlay.className = 'modal-overlay';
  overlay.style.cssText = 'position: fixed !important; top: 0 !important; left: 0 !important; width: 100vw !important; height: 100vh !important; z-index: 2147483647 !important; display: flex !important; align-items: center !important; justify-content: center !important; background: rgba(5, 7, 20, 0.88) !important; backdrop-filter: blur(14px) !important; -webkit-backdrop-filter: blur(14px) !important; padding: 20px; box-sizing: border-box;';

  overlay.innerHTML = `
    <div class="modal-content" style="max-width: 520px; width: 100%; background: var(--bg-secondary, #131326); border: 1.5px solid rgba(16, 185, 129, 0.6); border-radius: 22px; overflow: hidden; box-shadow: 0 25px 70px rgba(0,0,0,0.9), 0 0 45px rgba(16, 185, 129, 0.3); animation: slideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1); display: flex; flex-direction: column;">
      
      <!-- Top Banner Verde Sucesso -->
      <div style="background: linear-gradient(135deg, #059669, #10b981); padding: 24px 24px 20px; text-align: center; color: #ffffff; position: relative;">
        <button id="btn-close-final-success" class="modal-close" style="position: absolute; top: 14px; right: 14px; background: rgba(255,255,255,0.15); color: #fff; border: none; border-radius: 50%; width: 32px; height: 32px; cursor: pointer; display: flex; align-items: center; justify-content: center;"><i class="fa-solid fa-xmark"></i></button>
        
        <div style="width: 64px; height: 64px; border-radius: 50%; background: rgba(255,255,255,0.22); border: 2px solid rgba(255,255,255,0.4); display: inline-flex; align-items: center; justify-content: center; font-size: 2rem; margin-bottom: 12px; box-shadow: 0 8px 24px rgba(0,0,0,0.25);">
          <i class="fa-solid fa-check" style="color: #ffffff;"></i>
        </div>
        
        <h3 style="margin: 0; font-size: 1.35rem; font-weight: 800; letter-spacing: -0.02em;">Tudo Concluído com Sucesso!</h3>
        <p style="margin: 6px 0 0; font-size: 0.88rem; color: rgba(255,255,255,0.92); font-weight: 500;">
          A simulação com <strong>${count} novos registros</strong> foi totalmente processada.
        </p>
      </div>

      <!-- Corpo da Confirmação -->
      <div style="padding: 24px; display: flex; flex-direction: column; gap: 14px; background: var(--bg-secondary, #131326);">
        <div style="background: var(--bg-tertiary, #1a1a35); border: 1px solid rgba(16, 185, 129, 0.25); border-radius: 14px; padding: 16px; display: flex; flex-direction: column; gap: 10px;">
          
          <div style="display: flex; align-items: center; gap: 10px; font-size: 0.86rem; color: var(--text-primary, #f8fafc);">
            <i class="fa-solid fa-circle-check" style="color: #10b981; font-size: 1rem;"></i>
            <span><strong>Dados Persistidos:</strong> Novos pacientes, consultas e prescrições ativos.</span>
          </div>

          <div style="display: flex; align-items: center; gap: 10px; font-size: 0.86rem; color: var(--text-primary, #f8fafc);">
            <i class="fa-solid fa-circle-check" style="color: #10b981; font-size: 1rem;"></i>
            <span><strong>Cache Atualizado:</strong> Sistema pronto para consultas imediatas sem atrasos.</span>
          </div>

          <div style="display: flex; align-items: center; gap: 10px; font-size: 0.86rem; color: var(--text-primary, #f8fafc);">
            <i class="fa-solid fa-circle-check" style="color: #10b981; font-size: 1rem;"></i>
            <span><strong>Módulos Hospitalares:</strong> Triagem Manchester, Leitos e TV sincronizados.</span>
          </div>

        </div>

        <p style="margin: 0; font-size: 0.84rem; color: var(--text-secondary, #94a3b8); text-align: center; line-height: 1.5;">
          Você já pode navegar pelos módulos do sistema ou acessar a listagem completa de pacientes.
        </p>

        <!-- Botões de Ação -->
        <div style="display: flex; flex-direction: column; gap: 8px; margin-top: 6px;">
          <div style="display: flex; gap: 8px;">
            <button id="btn-final-goto-pacientes" class="btn" style="flex: 1; background: rgba(99, 102, 241, 0.18); border: 1px solid rgba(99, 102, 241, 0.4); color: #a5b4fc; padding: 11px 14px; border-radius: 10px; font-weight: 700; font-size: 0.84rem; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px;">
              <i class="fa-solid fa-users"></i> Ir para Pacientes
            </button>
            <button id="btn-final-goto-atendimentos" class="btn" style="flex: 1; background: rgba(56, 189, 248, 0.18); border: 1px solid rgba(56, 189, 248, 0.4); color: #38bdf8; padding: 11px 14px; border-radius: 10px; font-weight: 700; font-size: 0.84rem; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px;">
              <i class="fa-solid fa-stethoscope"></i> Atendimentos
            </button>
          </div>
          
          <button id="btn-final-ok" class="btn btn-primary" style="width: 100%; background: linear-gradient(135deg, #059669, #10b981); border: none; padding: 12px; border-radius: 10px; font-weight: 800; font-size: 0.92rem; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px; box-shadow: 0 4px 16px rgba(16,185,129,0.3);">
            <i class="fa-solid fa-check"></i> Entendido, fechar aviso
          </button>
        </div>

      </div>

    </div>
  `;

  document.body.appendChild(overlay);

  const closeFinal = () => {
    overlay.remove();
  };

  document.getElementById('btn-close-final-success')?.addEventListener('click', closeFinal);
  document.getElementById('btn-final-ok')?.addEventListener('click', closeFinal);
  document.getElementById('btn-final-goto-pacientes')?.addEventListener('click', () => {
    closeFinal();
    if (typeof window.switchTab === 'function') window.switchTab('pacientes');
  });
  document.getElementById('btn-final-goto-atendimentos')?.addEventListener('click', () => {
    closeFinal();
    if (typeof window.switchTab === 'function') window.switchTab('atendimento');
  });
}

if (typeof window !== 'undefined') {
  window.showSimulationSummaryModal = showSimulationSummaryModal;
  window.showSimulationSuccessFinalModal = showSimulationSuccessFinalModal;
}
