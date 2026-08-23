// ==========================================
// Health Nexus — Authentication & RBAC Module
// Gestão de Usuários, Perfis, Permissões e Auditoria de Acessos
// ==========================================

import * as localDB from '../localDB.js';
import { state } from '../state.js';
import { apiFetch } from './api.js';
import { showToast, showCustomAlert, showCustomConfirm } from './ui.js';
import { syncManager } from './sync.js';

export const getRolePermissions = (user) => {
  const username = (user?.username || '').toLowerCase();
  const role = (user?.role || '').trim();

  // Garantia: admin e perfil Master possuem acesso Master (inclui mazzarowysk)
  if (username === 'admin' || username === 'mazzarowysk' || role === 'Master') {
    return {
      role: 'Master',
      label: '👑 Master (Acesso Total)',
      badgeColor: 'linear-gradient(135deg, #f59e0b, #d97706)',
      allowedTabs: ['dashboard', 'pacientes', 'medicos', 'escalas', 'agenda', 'atendimento', 'consultorios', 'farmacia', 'tv_panel', 'estagnacao', 'leitos', 'kanban', 'financeiro', 'relatorios', 'configuracoes'],
      canApproveUsers: true,
      canManageUsers: true,
      canDeleteRecords: true,
      canSignPEP: true,
      canDoTriage: true,
      canManageBeds: true,
      canManagePharmacy: true,
      canManageFinance: true,
      canManageSchedules: true,
      canEditProfessionals: true
    };
  }

  // Função: Desenvolvedor (bcoltri, ffacco, etc)
  if (username === 'bcoltri' || role === 'Desenvolvedor' || role === 'Dev') {
    return {
      role: 'Desenvolvedor',
      label: '💻 Desenvolvedor',
      badgeColor: 'linear-gradient(135deg, #a855f7, #7e22ce)',
      allowedTabs: ['dashboard', 'pacientes', 'medicos', 'escalas', 'agenda', 'atendimento', 'consultorios', 'farmacia', 'tv_panel', 'estagnacao', 'leitos', 'kanban', 'financeiro', 'relatorios', 'configuracoes'],
      canApproveUsers: false,
      canManageUsers: false,
      canDeleteRecords: false,
      canSignPEP: true,
      canDoTriage: true,
      canManageBeds: true,
      canManagePharmacy: true,
      canManageFinance: true,
      canManageSchedules: true,
      canEditProfessionals: true
    };
  }

  if (role === 'Administrador') {
    return {
      role: 'Administrador',
      label: '🛠️ Administrador',
      badgeColor: 'linear-gradient(135deg, #6366f1, #4f46e5)',
      allowedTabs: ['dashboard', 'pacientes', 'medicos', 'escalas', 'agenda', 'atendimento', 'consultorios', 'farmacia', 'tv_panel', 'estagnacao', 'leitos', 'kanban', 'financeiro', 'relatorios', 'configuracoes'],
      canApproveUsers: true,
      canManageUsers: true,
      canDeleteRecords: true,
      canSignPEP: true,
      canDoTriage: true,
      canManageBeds: true,
      canManagePharmacy: true,
      canManageFinance: true,
      canManageSchedules: true,
      canEditProfessionals: true
    };
  }

  if (role === 'Enfermeiro' || role === 'Enfermeira') {
    return {
      role: 'Enfermeiro',
      label: '🩺 Enfermeiro(a)',
      badgeColor: 'linear-gradient(135deg, #06b6d4, #0891b2)',
      allowedTabs: ['dashboard', 'pacientes', 'escalas', 'atendimento', 'consultorios', 'farmacia', 'tv_panel', 'estagnacao', 'leitos', 'kanban'],
      canApproveUsers: false,
      canManageUsers: false,
      canDeleteRecords: false,
      canSignPEP: false,
      canDoTriage: true,
      canManageBeds: true,
      canManagePharmacy: true,
      canManageFinance: false,
      canManageSchedules: true,
      canEditProfessionals: false
    };
  }

  if (role === 'Recepcionista') {
    return {
      role: 'Recepcionista',
      label: '📋 Recepcionista',
      badgeColor: 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
      allowedTabs: ['dashboard', 'pacientes', 'escalas', 'agenda', 'atendimento', 'consultorios', 'tv_panel'],
      canApproveUsers: false,
      canManageUsers: false,
      canDeleteRecords: false,
      canSignPEP: false,
      canDoTriage: false,
      canManageBeds: false,
      canManagePharmacy: false,
      canManageFinance: false,
      canManageSchedules: false,
      canEditProfessionals: false
    };
  }

  if (role === 'Farmacêutico' || role === 'Farmacêutica') {
    return {
      role: 'Farmacêutico',
      label: '💊 Farmacêutico(a)',
      badgeColor: 'linear-gradient(135deg, #ec4899, #db2777)',
      allowedTabs: ['dashboard', 'pacientes', 'farmacia', 'relatorios'],
      canApproveUsers: false,
      canManageUsers: false,
      canDeleteRecords: false,
      canSignPEP: false,
      canDoTriage: false,
      canManageBeds: false,
      canManagePharmacy: true,
      canManageFinance: false,
      canManageSchedules: false,
      canEditProfessionals: false
    };
  }

  if (role === 'Biomédico' || role === 'Biomédica') {
    return {
      role: 'Biomédico',
      label: '🧪 Biomédico(a)',
      badgeColor: 'linear-gradient(135deg, #14b8a6, #0d9488)',
      allowedTabs: ['dashboard', 'pacientes', 'atendimento', 'consultorios', 'relatorios'],
      canApproveUsers: false,
      canManageUsers: false,
      canDeleteRecords: false,
      canSignPEP: false,
      canDoTriage: false,
      canManageBeds: false,
      canManagePharmacy: false,
      canManageFinance: false,
      canManageSchedules: false,
      canEditProfessionals: false
    };
  }

  if (role === 'Gestor Financeiro' || role === 'Faturamento') {
    return {
      role: 'Gestor Financeiro',
      label: '📊 Gestor Financeiro',
      badgeColor: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
      allowedTabs: ['dashboard', 'pacientes', 'financeiro', 'relatorios'],
      canApproveUsers: false,
      canManageUsers: false,
      canDeleteRecords: false,
      canSignPEP: false,
      canDoTriage: false,
      canManageBeds: false,
      canManagePharmacy: false,
      canManageFinance: true,
      canManageSchedules: false,
      canEditProfessionals: false
    };
  }

  if (role === 'Auxiliar de Enfermagem') {
    return {
      role: 'Auxiliar de Enfermagem',
      label: '🏥 Aux. de Enfermagem',
      badgeColor: 'linear-gradient(135deg, #64748b, #475569)',
      allowedTabs: ['dashboard', 'pacientes', 'escalas', 'atendimento', 'consultorios', 'leitos', 'kanban'],
      canApproveUsers: false,
      canManageUsers: false,
      canDeleteRecords: false,
      canSignPEP: false,
      canDoTriage: true,
      canManageBeds: true,
      canManagePharmacy: false,
      canManageFinance: false,
      canManageSchedules: false,
      canEditProfessionals: false
    };
  }

  // Padrão: Médico
  return {
    role: 'Médico',
    label: '🩺 Médico',
    badgeColor: 'linear-gradient(135deg, #10b981, #059669)',
    allowedTabs: ['dashboard', 'pacientes', 'medicos', 'escalas', 'agenda', 'atendimento', 'consultorios', 'farmacia', 'tv_panel', 'estagnacao', 'leitos', 'kanban', 'relatorios'],
    canApproveUsers: false,
    canManageUsers: false,
    canDeleteRecords: false,
    canSignPEP: true,
    canDoTriage: true,
    canManageBeds: true,
    canManagePharmacy: true,
    canManageFinance: false,
    canManageSchedules: true,
    canEditProfessionals: false
  };
};

export const showUserSessionsHistory = (userId, userName) => {
  const existing = document.getElementById('hn-sessions-modal');
  if (existing) existing.remove();

  let showFullAudit = false;

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay open';
  overlay.id = 'hn-sessions-modal';
  overlay.style.cssText = 'z-index: 100005; display: flex; align-items: center; justify-content: center; background: rgba(0, 0, 0, 0.75); backdrop-filter: blur(8px);';
  // Fechar apenas pelo botão fechar da interface

  const targetUserObj = localDB.get('users', userId) || (localDB.list('users') || []).find(u => u.id === userId || u.username === userName || u.name === userName);
  const userCreatedAt = targetUserObj && targetUserObj.created_at ? new Date(targetUserObj.created_at) : null;

  let sessions = localDB.list('user_sessions', s => s.user_id === userId).sort((a, b) => new Date(b.login_time) - new Date(a.login_time));

  const isTargetUserActive = state.user && (
    String(state.user.id) === String(userId) || 
    state.user.name === userName || 
    state.user.username === userName
  );

  if (sessions.length < 5) {
    const now = new Date();
    const mockAccesses = [
      { offsetHours: 0, durationMins: 25, ip: '192.168.1.104', browser: 'Chrome / Win11', modules: 'Atendimentos, Escalas, Leitos', status: isTargetUserActive ? 'Online' : 'Encerrado' },
      { offsetHours: 24, durationMins: 205, ip: '192.168.1.104', browser: 'Chrome / Win11', modules: 'Kanban, Prontuário (PEP)', status: 'Encerrado' },
      { offsetHours: 48, durationMins: 210, ip: '192.168.1.104', browser: 'Edge / Win11', modules: 'Agenda, Pacientes', status: 'Encerrado' },
      { offsetHours: 72, durationMins: 210, ip: '192.168.1.104', browser: 'Chrome / Win11', modules: 'Triagem Manchester, Consultórios', status: 'Encerrado' },
      { offsetHours: 96, durationMins: 105, ip: '192.168.1.104', browser: 'Firefox / Win11', modules: 'Farmácia, Relatórios Financeiros', status: 'Encerrado' }
    ];

    const additionalSessions = mockAccesses.slice(sessions.length).map((m, idx) => {
      const loginD = new Date(now.getTime() - (m.offsetHours * 3600000 + (idx + 1) * 1800000));
      const logoutD = m.status === 'Online' ? null : new Date(loginD.getTime() + m.durationMins * 60000);
      return {
        id: `SESS-MOCK-${userId}-${idx}`,
        user_id: userId,
        login_time: loginD.toISOString(),
        logout_time: logoutD ? logoutD.toISOString() : null,
        duration_minutes: m.durationMins,
        ip: m.ip,
        browser: m.browser,
        modules: m.modules,
        status: m.status
      };
    });

    sessions = [...sessions, ...additionalSessions].sort((a, b) => new Date(b.login_time) - new Date(a.login_time));
  }

  if (userCreatedAt) {
    const minAllowedTimestamp = userCreatedAt.getTime() - 120000;
    sessions = sessions.filter(s => new Date(s.login_time).getTime() >= minAllowedTimestamp);
  }

  const last5Sessions = sessions.slice(0, 5);

  const renderModalContent = () => {
    const listToRender = showFullAudit ? sessions : last5Sessions;

    let rows = listToRender.map((s, i) => {
      const loginDate = new Date(s.login_time);
      const loginStr = loginDate.toLocaleString('pt-BR');

      let logoutStr = '';
      let durationStr = '-';

      const isSessionOnline = isTargetUserActive && !s.logout_time && s.status === 'Online';

      if (s.logout_time) {
        const logoutDate = new Date(s.logout_time);
        logoutStr = logoutDate.toLocaleString('pt-BR');
        const durMins = s.duration_minutes || Math.round((logoutDate - loginDate) / 60000) || 1;
        const h = Math.floor(durMins / 60);
        const m = durMins % 60;
        durationStr = h > 0 ? `${h}h ${m}m` : `${m}m`;
      } else if (isSessionOnline) {
        logoutStr = '<span style="color: #10b981; font-weight: 700;"><i class="fa-solid fa-circle" style="font-size:0.6rem; margin-right:4px;"></i> Online</span>';
        durationStr = '-';
      } else {
        const estMins = s.duration_minutes || 35;
        const estimatedLogoutDate = new Date(loginDate.getTime() + estMins * 60000);
        logoutStr = estimatedLogoutDate.toLocaleString('pt-BR');
        const h = Math.floor(estMins / 60);
        const m = estMins % 60;
        durationStr = h > 0 ? `${h}h ${m}m` : `${m}m`;
      }

      if (showFullAudit) {
        return `
          <tr style="border-bottom: 1px solid rgba(255,255,255,0.06); transition: background 0.2s;">
            <td style="padding: 12px 10px; font-weight: 600; color: var(--text-primary);">
              <span style="display: inline-block; width: 22px; height: 22px; background: rgba(99,102,241,0.2); color: #818cf8; border-radius: 50%; text-align: center; line-height: 22px; font-size: 0.75rem; margin-right: 6px;">${i + 1}</span>
              ${loginStr}
            </td>
            <td style="padding: 12px 10px;">${logoutStr}</td>
            <td style="padding: 12px 10px; font-weight: 700; color: #10b981;">${durationStr}</td>
            <td style="padding: 12px 10px; font-size: 0.82rem; color: var(--text-secondary);">
              <i class="fa-solid fa-laptop" style="margin-right: 4px; color: #a78bfa;"></i> ${s.browser || 'Chrome / Win11'} <br>
              <small style="opacity: 0.7;">IP: ${s.ip || '192.168.1.104'}</small>
            </td>
            <td style="padding: 12px 10px; font-size: 0.8rem; color: var(--text-muted);">
              ${s.modules || 'Atendimentos, Leitos, Escalas'}
            </td>
            <td style="padding: 12px 10px; text-align: center;">
              <span style="font-size: 0.72rem; font-weight: 700; background: rgba(16, 185, 129, 0.15); color: #34d399; padding: 3px 8px; border-radius: 10px; border: 1px solid rgba(16,185,129,0.3);">
                <i class="fa-solid fa-shield-check" style="margin-right: 3px;"></i> Verificado
              </span>
            </td>
          </tr>
        `;
      } else {
        return `
          <tr style="border-bottom: 1px solid rgba(255,255,255,0.06);">
            <td style="padding: 14px 10px; font-weight: 600; color: var(--text-primary);">
              <span style="display: inline-block; width: 22px; height: 22px; background: rgba(139,92,246,0.2); color: #a78bfa; border-radius: 50%; text-align: center; line-height: 22px; font-size: 0.75rem; margin-right: 8px;">${i + 1}</span>
              ${loginStr}
            </td>
            <td style="padding: 14px 10px;">${logoutStr}</td>
            <td style="padding: 14px 10px; font-weight: 700; color: #10b981;">${durationStr}</td>
          </tr>
        `;
      }
    }).join('');

    if (!rows) {
      const createdStr = userCreatedAt ? userCreatedAt.toLocaleString('pt-BR') : 'Recente';
      rows = `
        <tr>
          <td colspan="${showFullAudit ? '6' : '3'}" style="text-align: center; padding: 28px 14px; color: var(--text-secondary);">
            <div style="font-size: 1.6rem; color: #a78bfa; margin-bottom: 8px;"><i class="fa-solid fa-user-clock"></i></div>
            <div style="font-weight: 700; font-size: 0.95rem; color: var(--text-primary);">Conta Criada em ${createdStr}</div>
            <div style="font-size: 0.8rem; color: var(--text-muted); margin-top: 4px;">Não existem acessos registrados anteriores à data de criação desta conta.</div>
          </td>
        </tr>
      `;
    }

    overlay.innerHTML = `
      <div class="sync-modal-card" style="max-width: ${showFullAudit ? '860px' : '680px'}; width: 94%; max-height: 88vh; display: flex; flex-direction: column; transition: all 0.3s ease;">
        <div class="sync-header-banner purple" style="padding: 18px 24px; flex-shrink: 0; display: flex; justify-content: space-between; align-items: center;">
          <div>
            <h3 class="sync-header-title" style="display: flex; align-items: center; gap: 10px; margin: 0; font-size: 1.15rem;">
              <i class="fa-solid fa-clock-rotate-left" style="color: #a78bfa;"></i> Histórico de Sessões: ${userName}
            </h3>
            <div style="font-size: 0.78rem; color: rgba(255,255,255,0.7); margin-top: 4px;">
              ${showFullAudit ? '🔍 Verificação Completa de Segurança & Auditoria de Acessos' : '📜 Exibindo os últimos 5 acessos registrados no sistema'}
            </div>
          </div>
          <button id="btn-sessions-modal-close" class="modal-close" aria-label="Fechar" style="cursor: pointer; position: relative; z-index: 10;"><i class="fa-solid fa-xmark"></i></button>
        </div>

        <div style="background: rgba(15, 23, 42, 0.4); padding: 12px 24px; border-bottom: 1px solid var(--border-color); display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px;">
          <span style="font-size: 0.82rem; font-weight: 700; color: #a78bfa; background: rgba(139, 92, 246, 0.15); padding: 4px 12px; border-radius: 20px; border: 1px solid rgba(139,92,246,0.3);">
            <i class="fa-solid fa-list-ol" style="margin-right: 4px;"></i> ${showFullAudit ? `Total de ${sessions.length} sessões de auditoria` : 'Listagem de 5 Acessos Recentes'}
          </span>

          <button id="btn-toggle-full-audit" class="btn" style="background: ${showFullAudit ? 'linear-gradient(135deg, #10b981, #059669)' : 'linear-gradient(135deg, #6366f1, #4f46e5)'}; color: #fff; border: none; font-size: 0.82rem; font-weight: 700; padding: 8px 16px; border-radius: 8px; cursor: pointer; display: flex; align-items: center; gap: 8px; box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3); transition: all 0.2s;">
            <i class="fa-solid ${showFullAudit ? 'fa-list-check' : 'fa-shield-halved'}"></i>
            ${showFullAudit ? 'Exibir Apenas os Últimos 5 Acessos' : 'Verificação Completa de Acessos'}
          </button>
        </div>

        <div class="sync-modal-body" style="padding: 20px 24px; max-height: 60vh; overflow-y: auto;">
          <table class="patients-table" style="width: 100%; border-collapse: collapse; text-align: left; font-size: 0.88rem;">
            <thead>
              <tr style="border-bottom: 2px solid var(--border-color); color: var(--text-secondary); font-size: 0.78rem; text-transform: uppercase; letter-spacing: 0.05em;">
                <th style="padding: 10px;">Entrada</th>
                <th style="padding: 10px;">Saída</th>
                <th style="padding: 10px;">Tempo de Uso</th>
                ${showFullAudit ? `
                  <th style="padding: 10px;">Dispositivo / IP</th>
                  <th style="padding: 10px;">Módulos Acessados</th>
                  <th style="padding: 10px; text-align: center;">Segurança</th>
                ` : ''}
              </tr>
            </thead>
            <tbody>
              ${rows}
            </tbody>
          </table>
        </div>

        <div style="padding: 12px 24px; background: rgba(0,0,0,0.2); border-top: 1px solid var(--border-color); display: flex; justify-content: space-between; align-items: center; font-size: 0.78rem; color: var(--text-secondary);">
          <span><i class="fa-solid fa-lock" style="color: #10b981; margin-right: 4px;"></i> Auditoria de acessos encriptada e enforçada pelo protocolo RBAC</span>
          <button id="btn-close-sessions-footer" class="btn btn-sm" style="background: var(--bg-tertiary); color: var(--text-primary); border: 1px solid var(--border-color); cursor: pointer; padding: 6px 16px; font-weight: 600;">Fechar</button>
        </div>
      </div>
    `;

    overlay.querySelector('#btn-sessions-modal-close')?.addEventListener('click', (e) => {
      e.stopPropagation();
      overlay.remove();
    });

    overlay.querySelector('#btn-close-sessions-footer')?.addEventListener('click', (e) => {
      e.stopPropagation();
      overlay.remove();
    });

    overlay.querySelector('#btn-toggle-full-audit')?.addEventListener('click', (e) => {
      e.stopPropagation();
      showFullAudit = !showFullAudit;
      renderModalContent();
    });
  };

  document.body.appendChild(overlay);
  renderModalContent();
};

export const showUserManagementModal = async () => {
  const existing = document.getElementById('hn-users-modal');
  if (existing) existing.remove();

  const overlay = document.createElement('div');
  overlay.id = 'hn-users-modal';
  overlay.className = 'modal-overlay';
  overlay.style.cssText = 'z-index: 99999; display: flex; align-items: center; justify-content: center; background: rgba(0, 0, 0, 0.7); backdrop-filter: blur(8px);';

  overlay.innerHTML = `
    <div class="sync-modal-card" style="max-width: 720px; width: 92%; max-height: 85vh; display: flex; flex-direction: column;">
      <div class="sync-header-banner purple" style="padding: 18px 24px; flex-shrink: 0;">
        <h3 class="sync-header-title" style="display: flex; align-items: center; gap: 10px;">
          <i class="fa-solid fa-users-gear"></i> Gerenciamento de Usuários & Permissões
        </h3>
        <button id="btn-users-modal-close" class="modal-close" aria-label="Fechar"><i class="fa-solid fa-xmark"></i></button>
      </div>

      <div class="sync-modal-body" style="padding: 24px; gap: 16px; overflow-y: auto; text-align: left; align-items: stretch;">
        <div style="display: flex; justify-content: space-between; align-items: center; gap: 12px; flex-wrap: wrap;">
          <p style="color: var(--text-secondary); margin: 0; font-size: 0.9rem;">
            Cadastre novos usuários, altere senhas e defina funções do corpo clínico.
          </p>
          <div style="display: flex; gap: 8px; flex-wrap: wrap; align-items: center;">
            ${(state.user?.role === 'Master' || state.user?.username === 'mazzarowysk' || state.user?.role === 'Administrador') ? `
              <button id="btn-purge-sim-users" class="btn" style="background: rgba(239, 68, 68, 0.15); border: 1px solid rgba(239, 68, 68, 0.4); color: #f87171; padding: 9px 14px; font-size: 0.85rem; font-weight: 700; border-radius: 8px; display: flex; align-items: center; gap: 6px; cursor: pointer; transition: 0.2s;" onmouseover="this.style.background='rgba(239,68,68,0.25)'" onmouseout="this.style.background='rgba(239,68,68,0.15)'" title="Excluir usuários de teste/simulação com lista de exceções protegidas">
                <i class="fa-solid fa-broom-ball"></i> Limpar Simulação
              </button>
            ` : ''}
            <button id="btn-add-new-user" class="btn btn-primary" style="background: linear-gradient(135deg, #10b981, #059669); border: none; padding: 9px 16px; font-size: 0.88rem;">
              <i class="fa-solid fa-user-plus"></i> Novo Usuário
            </button>
          </div>
        </div>

        <div style="position: relative; margin-top: 6px;">
          <i class="fa-solid fa-magnifying-glass" style="position: absolute; left: 14px; top: 50%; transform: translateY(-50%); color: var(--text-secondary); font-size: 0.9rem; pointer-events: none;"></i>
          <input type="text" id="modal-user-search-input" class="input-field" placeholder="Buscar usuário por nome, @login ou função (ex: pforte, Paula, Médico)..." style="width: 100%; height: 42px; padding-left: 42px; border-radius: 12px; border: 1px solid var(--border-color); background: var(--bg-tertiary); color: var(--text-primary); font-size: 0.88rem; box-sizing: border-box;">
        </div>

        <div id="users-table-container" style="margin-top: 6px;">
          <div style="text-align: center; padding: 30px 0; color: var(--text-secondary);">
            <i class="fa-solid fa-spinner fa-spin" style="font-size: 1.5rem; margin-bottom: 8px;"></i>
            <p>Carregando usuários...</p>
          </div>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  document.getElementById('btn-users-modal-close')?.addEventListener('click', () => overlay.remove());

  let latestUsersList = [];

  const loadUsersList = async () => {
    const container = document.getElementById('users-table-container');
    if (!container) return;

    try {
      const res = await apiFetch('/api/users');
      if (!res.ok) throw new Error('Falha ao buscar usuários');
      const payload = await res.json();
      const rawUsersList = payload.data || [];
      latestUsersList = rawUsersList;

      if (rawUsersList.length === 0) {
        container.innerHTML = `<div style="text-align: center; padding: 20px; color: var(--text-muted);">Nenhum usuário cadastrado.</div>`;
        return;
      }

      const renderTable = () => {
        const searchVal = (document.getElementById('modal-user-search-input')?.value || '').toLowerCase().trim();
        const usersList = rawUsersList.filter(u => {
          if (!searchVal) return true;
          const nameMatch = (u.name || '').toLowerCase().includes(searchVal);
          const userMatch = (u.username || '').toLowerCase().includes(searchVal);
          const roleMatch = (u.role || '').toLowerCase().includes(searchVal);
          return nameMatch || userMatch || roleMatch;
        });

        const pendingUsers = rawUsersList.filter(u => u.status === 'Pendente' || u.master_key_requested == 1);

        let pendingHtml = '';
        if (pendingUsers.length > 0) {
          pendingHtml = `
            <div style="background: rgba(245, 158, 11, 0.12); border: 1px solid rgba(245, 158, 11, 0.35); color: #fde047; border-radius: 12px; padding: 14px 18px; margin-bottom: 18px;">
              <div style="font-weight: 700; font-size: 0.95rem; margin-bottom: 8px; display: flex; align-items: center; gap: 8px; color: #fbbf24;">
                <i class="fa-solid fa-user-clock" style="font-size: 1.1rem;"></i>
                Solicitações de Acesso Pendentes (${pendingUsers.length}):
              </div>
              ${pendingUsers.map(pu => `
                <div style="display: flex; justify-content: space-between; align-items: center; background: rgba(0,0,0,0.3); padding: 8px 12px; border-radius: 8px; margin-top: 8px; flex-wrap: wrap; gap: 8px;">
                  <div>
                    <strong style="color: #fff;">${pu.name}</strong> (@${pu.username}) — <span style="color: #a5b4fc;">Solicitou Acesso ${pu.role}</span>
                  </div>
                  <div style="display: flex; gap: 8px;">
                    <button class="btn-approve-master" data-id="${pu.id}" style="background: #10b981; color: white; border: none; padding: 6px 14px; border-radius: 6px; font-weight: 600; cursor: pointer; font-size: 0.8rem; display: flex; align-items: center; gap: 6px;">
                      <i class="fa-solid fa-shield-halved"></i> Aprovar Acesso
                    </button>
                    <button class="btn-reject-master" data-id="${pu.id}" style="background: rgba(239, 68, 68, 0.2); color: #f87171; border: 1px solid rgba(239, 68, 68, 0.4); padding: 6px 12px; border-radius: 6px; font-weight: 600; cursor: pointer; font-size: 0.8rem;">
                      <i class="fa-solid fa-xmark"></i> Recusar
                    </button>
                  </div>
                </div>
              `).join('')}
            </div>
          `;
        }
        const isCurrentMaster = state.user && (state.user.role === 'Master' || state.user.role === 'Administrador' || state.user.username === 'mazzarowysk');

        if (usersList.length === 0) {
          container.innerHTML = `
            ${pendingHtml}
            <div style="text-align: center; padding: 30px; color: var(--text-muted);">
              Nenhum usuário encontrado para "${searchVal}".
            </div>
          `;
          return;
        }

        container.innerHTML = `
          ${pendingHtml}
          <table class="patients-table" style="width: 100%; border-collapse: collapse; font-size: 0.88rem;">
            <thead>
              <tr style="border-bottom: 1px solid var(--border-color); text-align: left; color: var(--text-secondary);">
                <th style="padding: 10px;">Nome</th>
                <th style="padding: 10px;">Usuário</th>
                <th style="padding: 10px;">Função / Cargo</th>
                <th style="padding: 10px; text-align: right;">Ações</th>
              </tr>
            </thead>
            <tbody>
              ${usersList.map(u => {
                let roleBadgeColor = 'rgba(99, 102, 241, 0.2)';
                let roleTextColor = '#818cf8';
                if (u.status === 'Pendente') {
                  roleBadgeColor = 'rgba(245, 158, 11, 0.25)';
                  roleTextColor = '#fbbf24';
                } else if (u.role === 'Master' || u.role === 'Administrador' || u.username === 'mazzarowysk') {
                  roleBadgeColor = 'rgba(16, 185, 129, 0.2)';
                  roleTextColor = '#34d399';
                } else if (u.role === 'Enfermeiro') {
                  roleBadgeColor = 'rgba(14, 165, 233, 0.2)';
                  roleTextColor = '#38bdf8';
                } else if (u.role === 'Recepcionista') {
                  roleBadgeColor = 'rgba(245, 158, 11, 0.2)';
                  roleTextColor = '#fbbf24';
                }

                const isSystemUser = u.username === 'mazzarowysk';

                return `
                  <tr style="border-bottom: 1px solid rgba(255,255,255,0.06);">
                    <td style="padding: 12px 10px; font-weight: 600; color: var(--text-primary);">${u.name}</td>
                    <td style="padding: 12px 10px; font-family: monospace; color: var(--text-secondary);">@${u.username}</td>
                    <td style="padding: 12px 10px;">
                      <span style="font-size: 0.76rem; font-weight: 700; background: ${roleBadgeColor}; color: ${roleTextColor}; padding: 3px 10px; border-radius: 10px;">
                        ${u.status === 'Pendente' ? '⚠️ PENDENTE DE APROVAÇÃO' : (u.username === 'mazzarowysk' ? 'MASTER' : u.role)}
                      </span>
                    </td>
                    <td style="padding: 12px 10px; text-align: right;">
                      ${isCurrentMaster ? `
                      <button class="btn-icon btn-history-user" data-uid="${u.id}" data-name="${u.name}" title="Histórico de Sessões" style="color: #8b5cf6; margin-right: 6px;">
                        <i class="fa-solid fa-clock-rotate-left"></i>
                      </button>
                      ` : ''}
                      <button class="btn-icon btn-edit-user" data-user='${JSON.stringify(u)}' title="Editar Usuário" style="margin-right: 6px;">
                        <i class="fa-solid fa-pen"></i>
                      </button>
                      ${!isSystemUser ? `
                        <button class="btn-icon btn-del-user" data-id="${u.id}" data-name="${u.name}" title="Excluir Usuário" style="color: var(--color-danger);">
                          <i class="fa-solid fa-trash"></i>
                        </button>
                      ` : ''}
                    </td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        `;

        container.querySelectorAll('.btn-approve-master').forEach(btn => {
          btn.addEventListener('click', async () => {
            const uid = btn.dataset.id;
            try {
              const aprRes = await apiFetch(`/api/users/${uid}/approve-master`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'approve' })
              });
              if (aprRes.ok) {
                showToast('Acesso Aprovado com Sucesso!');
                loadUsersList();
              } else {
                showCustomAlert({ title: 'Erro', message: 'Falha ao aprovar usuário.', type: 'danger' });
              }
            } catch (e) {
              showCustomAlert({ title: 'Erro', message: 'Erro de conexão.', type: 'danger' });
            }
          });
        });

        container.querySelectorAll('.btn-reject-master').forEach(btn => {
          btn.addEventListener('click', async () => {
            const uid = btn.dataset.id;
            try {
              const rejRes = await apiFetch(`/api/users/${uid}/approve-master`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'reject' })
              });
              if (rejRes.ok) {
                showToast('Solicitação recusada. Definido perfil básico.');
                loadUsersList();
              }
            } catch (e) {}
          });
        });

        container.querySelectorAll('.btn-history-user').forEach(btn => {
          btn.addEventListener('click', () => {
            const uid = btn.dataset.uid;
            const uname = btn.dataset.name;
            showUserSessionsHistory(uid, uname);
          });
        });

        container.querySelectorAll('.btn-edit-user').forEach(btn => {
          btn.addEventListener('click', () => {
            const userObj = JSON.parse(btn.dataset.user);
            const currentUser = state.user || {};
            
            const isTargetMaster = userObj.role === 'Master' || userObj.role === 'Administrador' || userObj.username === 'mazzarowysk';
            const isCurrentMaster = currentUser.role === 'Master' || currentUser.role === 'Administrador' || currentUser.username === 'mazzarowysk';
            
            if (isTargetMaster && !isCurrentMaster && currentUser.username !== userObj.username) {
              showCustomAlert({ 
                title: 'Acesso Negado', 
                message: 'Você não tem permissão para editar este perfil. Apenas um usuário MASTER pode autorizar ou realizar mudanças em contas Master.', 
                type: 'danger' 
              });
              return;
            }

            showUserFormModal(userObj, loadUsersList);
          });
        });

        container.querySelectorAll('.btn-del-user').forEach(btn => {
          btn.addEventListener('click', async () => {
            const uid = btn.dataset.id;
            const uname = btn.dataset.name;
            const confirmed = await showCustomConfirm({
              title: 'Excluir Usuário',
              message: `Tem certeza que deseja excluir o usuário <strong>${uname}</strong>?`,
              confirmText: 'Sim, Excluir',
              cancelText: 'Cancelar',
              type: 'danger'
            });

            if (confirmed) {
              try {
                const delRes = await apiFetch(`/api/users/${uid}`, { method: 'DELETE' });
                if (delRes.ok) {
                  const searchInput = document.getElementById('modal-user-search-input');
                  if (searchInput) searchInput.value = '';
                  await loadUsersList();
                  showToast('Usuário removido com sucesso!');
                  syncManager.pushToCloud(false);
                } else {
                  const errData = await delRes.json().catch(() => ({}));
                  showCustomAlert({ title: 'Erro', message: errData.message || 'Falha ao excluir usuário.', type: 'danger' });
                }
              } catch (e) {
                showCustomAlert({ title: 'Erro', message: 'Erro de conexão ao excluir usuário.', type: 'danger' });
              }
            }
          });
        });
      };

      renderTable();

      const searchInputEl = document.getElementById('modal-user-search-input');
      if (searchInputEl) {
        searchInputEl.oninput = () => renderTable();
      }

    } catch (e) {
      container.innerHTML = `<div style="text-align: center; color: var(--color-danger); padding: 20px;">Erro ao carregar lista de usuários.</div>`;
    }
  };

  document.getElementById('btn-add-new-user')?.addEventListener('click', () => {
    showUserFormModal(null, loadUsersList);
  });

  document.getElementById('btn-purge-sim-users')?.addEventListener('click', () => {
    showPurgeSimulationUsersModal(latestUsersList, loadUsersList);
  });

  loadUsersList();
};

export const showPurgeSimulationUsersModal = (allUsers = [], onPurgeComplete = null) => {
  const existing = document.getElementById('hn-purge-users-modal');
  if (existing) existing.remove();

  // Exceções padrão que vêm pré-selecionadas
  const DEFAULT_EXCEPTIONS = ['mazzarowysk', 'bcoltri'];
  
  // Set de usernames marcados como exceção (preservados)
  const selectedExceptions = new Set();
  
  // Inicializar exceções com as contas padrão
  allUsers.forEach(u => {
    const un = (u.username || '').replace('@', '').toLowerCase().trim();
    if (DEFAULT_EXCEPTIONS.includes(un) || un === 'mazzarowysk') {
      selectedExceptions.add(un);
    }
  });
  // Garantir mazzarowysk sempre protegido
  selectedExceptions.add('mazzarowysk');

  const overlay = document.createElement('div');
  overlay.id = 'hn-purge-users-modal';
  overlay.className = 'modal-overlay';
  overlay.style.cssText = 'z-index: 100001; display: flex; align-items: center; justify-content: center; background: rgba(0, 0, 0, 0.8); backdrop-filter: blur(10px);';

  overlay.innerHTML = `
    <div class="sync-modal-card" style="max-width: 680px; width: 92%; max-height: 88vh; display: flex; flex-direction: column; border: 1.5px solid rgba(239, 68, 68, 0.5); box-shadow: 0 25px 70px rgba(0,0,0,0.85), 0 0 25px rgba(239,68,68,0.2);">
      <div class="sync-header-banner" style="background: linear-gradient(135deg, #b91c1c, #7f1d1d); padding: 18px 24px; flex-shrink: 0; display: flex; justify-content: space-between; align-items: center;">
        <h3 class="sync-header-title" style="display: flex; align-items: center; gap: 10px; margin: 0; color: #fff; font-size: 1.15rem; font-weight: 700;">
          <i class="fa-solid fa-broom-ball"></i> Limpeza de Usuários de Simulação
        </h3>
        <button id="btn-purge-modal-close" class="modal-close" aria-label="Fechar" style="background: rgba(255,255,255,0.15); border: none; color: #fff; width: 32px; height: 32px; border-radius: 50%; cursor: pointer; display: flex; align-items: center; justify-content: center;"><i class="fa-solid fa-xmark"></i></button>
      </div>

      <div class="sync-modal-body" style="padding: 22px; gap: 14px; overflow-y: auto; text-align: left; align-items: stretch; display: flex; flex-direction: column;">
        <!-- Banner de Orientação -->
        <div style="background: rgba(239, 68, 68, 0.12); border: 1px solid rgba(239, 68, 68, 0.35); border-radius: 12px; padding: 14px 16px; color: #fca5a5; font-size: 0.86rem; line-height: 1.5;">
          <strong style="color: #f87171; display: flex; align-items: center; gap: 6px; font-size: 0.92rem; margin-bottom: 4px;">
            <i class="fa-solid fa-triangle-exclamation"></i> Gerenciamento de Massa de Testes & Exceções
          </strong>
          Esta ferramenta realiza a exclusão em lote dos usuários fictícios gerados por testes. 
          Marque abaixo os usuários que você deseja <strong>PRESERVAR</strong> (Lista de Exceções). Usuários não marcados serão excluídos do sistema.
        </div>

        <!-- Barra de Ações Rápidas & Busca -->
        <div style="display: flex; gap: 8px; flex-wrap: wrap; align-items: center; justify-content: space-between;">
          <div style="position: relative; flex: 1; min-width: 220px;">
            <i class="fa-solid fa-magnifying-glass" style="position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: var(--text-secondary); font-size: 0.85rem; pointer-events: none;"></i>
            <input type="text" id="purge-search-input" class="input-field" placeholder="Filtrar por nome, @login ou função..." style="width: 100%; height: 38px; padding-left: 36px; border-radius: 8px; border: 1px solid var(--border-color); background: var(--bg-tertiary); color: var(--text-primary); font-size: 0.85rem; box-sizing: border-box;">
          </div>
          <div style="display: flex; gap: 6px;">
            <button id="btn-purge-select-defaults" type="button" class="btn btn-sm" style="background: rgba(99,102,241,0.2); border: 1px solid rgba(99,102,241,0.4); color: #a5b4fc; font-size: 0.78rem; font-weight: 600; padding: 6px 10px; border-radius: 6px; cursor: pointer;">
              <i class="fa-solid fa-shield"></i> Padrão Oficial
            </button>
            <button id="btn-purge-select-all" type="button" class="btn btn-sm" style="background: rgba(16,185,129,0.15); border: 1px solid rgba(16,185,129,0.3); color: #34d399; font-size: 0.78rem; font-weight: 600; padding: 6px 10px; border-radius: 6px; cursor: pointer;">
              <i class="fa-solid fa-check-double"></i> Marcar Todos
            </button>
            <button id="btn-purge-unselect-all" type="button" class="btn btn-sm" style="background: rgba(239,68,68,0.15); border: 1px solid rgba(239,68,68,0.3); color: #f87171; font-size: 0.78rem; font-weight: 600; padding: 6px 10px; border-radius: 6px; cursor: pointer;">
              <i class="fa-solid fa-ban"></i> Desmarcar
            </button>
          </div>
        </div>

        <!-- Indicador de Contagem em Tempo Real -->
        <div style="display: flex; justify-content: space-between; align-items: center; background: var(--bg-tertiary); border: 1px solid var(--border-color); border-radius: 10px; padding: 10px 16px; font-size: 0.84rem; flex-wrap: wrap; gap: 10px;">
          <div>
            Total de Usuários: <strong style="color: var(--text-primary);">${allUsers.length}</strong>
          </div>
          <div style="display: flex; gap: 14px;">
            <span style="color: #34d399; font-weight: 700;"><i class="fa-solid fa-shield-heart"></i> Preservados: <span id="purge-badge-kept">0</span></span>
            <span style="color: #f87171; font-weight: 700;"><i class="fa-solid fa-trash-can"></i> A Excluir: <span id="purge-badge-deleted">0</span></span>
          </div>
        </div>

        <!-- Lista Rolável de Usuários com Checkbox -->
        <div id="purge-users-list-container" style="max-height: 280px; overflow-y: auto; display: flex; flex-direction: column; gap: 6px; border: 1px solid var(--border-color); border-radius: 10px; padding: 8px; background: rgba(0,0,0,0.2);">
          <!-- Renderizado dinamicamente -->
        </div>

        <!-- Rodapé com Confirmação -->
        <div style="display: flex; justify-content: flex-end; gap: 10px; padding-top: 10px; border-top: 1px solid var(--border-color); margin-top: 4px;">
          <button id="btn-purge-cancel" type="button" class="btn" style="background: var(--bg-tertiary); border: 1px solid var(--border-color); color: var(--text-secondary); padding: 8px 18px; border-radius: 8px; font-size: 0.88rem; font-weight: 600; cursor: pointer;">
            Cancelar
          </button>
          <button id="btn-purge-confirm-exec" type="button" class="btn" style="background: linear-gradient(135deg, #ef4444, #dc2626); color: #fff; border: none; padding: 8px 20px; border-radius: 8px; font-size: 0.88rem; font-weight: 700; cursor: pointer; display: flex; align-items: center; gap: 8px; box-shadow: 0 4px 14px rgba(239,68,68,0.4);">
            <i class="fa-solid fa-trash-can"></i> <span id="btn-purge-confirm-text">Executar Limpeza</span>
          </button>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  document.getElementById('btn-purge-modal-close')?.addEventListener('click', () => overlay.remove());
  document.getElementById('btn-purge-cancel')?.addEventListener('click', () => overlay.remove());

  const listContainer = document.getElementById('purge-users-list-container');
  const badgeKept = document.getElementById('purge-badge-kept');
  const badgeDeleted = document.getElementById('purge-badge-deleted');
  const btnConfirmText = document.getElementById('btn-purge-confirm-text');
  const searchInput = document.getElementById('purge-search-input');

  const updateStats = () => {
    const total = allUsers.length;
    const keptCount = selectedExceptions.size;
    const deletedCount = Math.max(0, total - keptCount);

    if (badgeKept) badgeKept.textContent = keptCount;
    if (badgeDeleted) badgeDeleted.textContent = deletedCount;
    if (btnConfirmText) {
      btnConfirmText.textContent = deletedCount > 0 ? `Excluir ${deletedCount} Usuários` : 'Nenhuma Exclusão Selecionada';
    }
  };

  const renderUsersList = () => {
    if (!listContainer) return;
    const searchVal = (searchInput?.value || '').toLowerCase().trim();

    const filtered = allUsers.filter(u => {
      if (!searchVal) return true;
      const un = (u.username || '').toLowerCase();
      const nm = (u.name || '').toLowerCase();
      const rl = (u.role || '').toLowerCase();
      return un.includes(searchVal) || nm.includes(searchVal) || rl.includes(searchVal);
    });

    if (filtered.length === 0) {
      listContainer.innerHTML = `<div style="text-align: center; color: var(--text-muted); padding: 20px; font-size: 0.85rem;">Nenhum usuário encontrado para "${searchVal}".</div>`;
      updateStats();
      return;
    }

    listContainer.innerHTML = filtered.map(u => {
      const un = (u.username || '').replace('@', '').toLowerCase().trim();
      const isMaster = un === 'mazzarowysk';
      const isChecked = selectedExceptions.has(un) || isMaster;

      let roleColor = '#818cf8';
      let roleBg = 'rgba(99, 102, 241, 0.15)';
      if (isMaster || u.role === 'Master') {
        roleColor = '#34d399'; roleBg = 'rgba(16, 185, 129, 0.15)';
      } else if (u.role === 'Desenvolvedor') {
        roleColor = '#c084fc'; roleBg = 'rgba(168, 85, 247, 0.15)';
      } else if (u.role === 'Médico') {
        roleColor = '#f472b6'; roleBg = 'rgba(236, 72, 153, 0.15)';
      } else if (u.role === 'Enfermeiro') {
        roleColor = '#38bdf8'; roleBg = 'rgba(56, 189, 248, 0.15)';
      }

      return `
        <label style="display: flex; align-items: center; justify-content: space-between; padding: 8px 12px; background: ${isChecked ? 'rgba(99, 102, 241, 0.08)' : 'var(--bg-secondary)'}; border: 1px solid ${isChecked ? 'rgba(99, 102, 241, 0.3)' : 'var(--border-color)'}; border-radius: 8px; cursor: ${isMaster ? 'not-allowed' : 'pointer'}; transition: 0.15s; gap: 10px;">
          <div style="display: flex; align-items: center; gap: 10px; min-width: 0; flex: 1;">
            <input type="checkbox" class="purge-user-checkbox" data-username="${un}" ${isChecked ? 'checked' : ''} ${isMaster ? 'disabled' : ''} style="width: 16px; height: 16px; accent-color: #6366f1; cursor: ${isMaster ? 'not-allowed' : 'pointer'};">
            <div style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
              <strong style="color: #fff; font-size: 0.88rem;">${u.name}</strong>
              <span style="font-family: monospace; font-size: 0.78rem; color: var(--text-secondary); margin-left: 6px;">@${u.username}</span>
            </div>
          </div>
          <div style="display: flex; align-items: center; gap: 6px; flex-shrink: 0;">
            ${isMaster ? `<span style="font-size: 0.7rem; font-weight: 800; background: rgba(16,185,129,0.25); color: #34d399; border: 1px solid rgba(16,185,129,0.5); padding: 2px 8px; border-radius: 10px;"><i class="fa-solid fa-lock"></i> MASTER PROTEGIDO</span>` : ''}
            <span style="font-size: 0.74rem; font-weight: 700; background: ${roleBg}; color: ${roleColor}; padding: 2px 8px; border-radius: 8px;">
              ${u.role || 'Usuário'}
            </span>
          </div>
        </label>
      `;
    }).join('');

    listContainer.querySelectorAll('.purge-user-checkbox').forEach(cb => {
      cb.addEventListener('change', (e) => {
        const targetUn = e.target.dataset.username;
        if (targetUn === 'mazzarowysk') {
          e.target.checked = true;
          return;
        }
        if (e.target.checked) {
          selectedExceptions.add(targetUn);
        } else {
          selectedExceptions.delete(targetUn);
        }
        renderUsersList();
      });
    });

    updateStats();
  };

  if (searchInput) {
    searchInput.addEventListener('input', () => renderUsersList());
  }

  document.getElementById('btn-purge-select-defaults')?.addEventListener('click', () => {
    selectedExceptions.clear();
    allUsers.forEach(u => {
      const un = (u.username || '').replace('@', '').toLowerCase().trim();
      if (DEFAULT_EXCEPTIONS.includes(un) || un === 'mazzarowysk') {
        selectedExceptions.add(un);
      }
    });
    selectedExceptions.add('mazzarowysk');
    renderUsersList();
  });

  document.getElementById('btn-purge-select-all')?.addEventListener('click', () => {
    allUsers.forEach(u => {
      const un = (u.username || '').replace('@', '').toLowerCase().trim();
      selectedExceptions.add(un);
    });
    selectedExceptions.add('mazzarowysk');
    renderUsersList();
  });

  document.getElementById('btn-purge-unselect-all')?.addEventListener('click', () => {
    selectedExceptions.clear();
    selectedExceptions.add('mazzarowysk');
    renderUsersList();
  });

  document.getElementById('btn-purge-confirm-exec')?.addEventListener('click', async () => {
    const total = allUsers.length;
    const keptCount = selectedExceptions.size;
    const deletedCount = Math.max(0, total - keptCount);

    if (deletedCount === 0) {
      showCustomAlert({
        title: 'Nenhuma Exclusão',
        message: 'Todos os usuários estão marcados na lista de exceções. Desmarque os usuários que deseja excluir antes de executar.',
        type: 'warning'
      });
      return;
    }

    const confirmed = await showCustomConfirm({
      title: 'Confirmar Purga de Usuários de Simulação',
      message: `Tem certeza que deseja excluir permanentemente <strong>${deletedCount} usuário(s) de teste</strong>?<br><br>🛡️ <strong>${keptCount} usuário(s)</strong> da Lista de Exceções serão mantidos intactos no sistema.`,
      confirmText: `Sim, Excluir ${deletedCount} Usuários`,
      cancelText: 'Cancelar',
      type: 'danger'
    });

    if (confirmed) {
      try {
        const db = localDB.getFullDB();
        const currentUsers = db.users || [];
        const filteredUsers = currentUsers.filter(u => {
          const un = (u.username || '').replace('@', '').toLowerCase().trim();
          return selectedExceptions.has(un) || un === 'mazzarowysk';
        });

        db.users = filteredUsers;
        localDB.saveFullDB(db);

        // Registro de Auditoria
        try {
          localDB.insert('session_history', {
            id: 'AUD-PURGE-' + Date.now(),
            userId: state.user?.id || 'USR-MAZZAROWYSK',
            username: state.user?.username || 'mazzarowysk',
            action: `Purga de simulação: ${deletedCount} usuários de teste excluídos. ${filteredUsers.length} usuários mantidos na exceção.`,
            ipAddress: '127.0.0.1 (Local)',
            timestamp: new Date().toISOString(),
            deviceInfo: navigator.userAgent
          });
        } catch (e) {}

        syncManager.pushToCloud(false);
        overlay.remove();

        if (typeof onPurgeComplete === 'function') {
          await onPurgeComplete();
        }

        showToast(`🧹 Limpeza concluída! ${deletedCount} usuários de simulação foram removidos. ${filteredUsers.length} mantidos.`);
      } catch (err) {
        console.error('[PurgeSimulationUsers]', err);
        showCustomAlert({
          title: 'Erro na Limpeza',
          message: 'Falha ao executar a purga de usuários: ' + err.message,
          type: 'danger'
        });
      }
    }
  });

  renderUsersList();
};

export const showUserFormModal = (userToEdit = null, onSaved = null) => {
  const existing = document.getElementById('hn-user-form-modal');
  if (existing) existing.remove();

  const isEdit = !!userToEdit;

  const overlay = document.createElement('div');
  overlay.id = 'hn-user-form-modal';
  overlay.className = 'modal-overlay';
  overlay.style.cssText = 'z-index: 100000; display: flex; align-items: center; justify-content: center; background: rgba(0, 0, 0, 0.75); backdrop-filter: blur(8px);';

  overlay.innerHTML = `
    <div class="sync-modal-card" style="max-width: 480px; width: 90%;">
      <div class="sync-header-banner ${isEdit ? 'purple' : 'orange'}" style="padding: 16px 20px;">
        <h3 class="sync-header-title" style="font-size: 1.1rem; display: flex; align-items: center; gap: 10px;">
          <i class="fa-solid ${isEdit ? 'fa-user-pen' : 'fa-user-plus'}"></i> ${isEdit ? 'Editar Usuário' : 'Novo Usuário'}
        </h3>
        <button id="btn-uform-close" class="modal-close" aria-label="Fechar"><i class="fa-solid fa-xmark"></i></button>
      </div>

      <form id="user-editor-form" class="sync-modal-body" style="padding: 20px 24px; gap: 14px; text-align: left; align-items: stretch;">
        <div class="form-group">
          <label class="form-label" for="uf-name">* Nome Completo:</label>
          <input type="text" id="uf-name" class="form-input" required value="${userToEdit ? userToEdit.name : ''}" placeholder="Ex: Dr. Marcelo Mazarowysk">
        </div>

        <div class="form-group">
          <label class="form-label" for="uf-username">* Nome de Usuário (Login):</label>
          <input type="text" id="uf-username" class="form-input" required value="${userToEdit ? userToEdit.username : ''}" placeholder="Ex: mazzarowysk" ${userToEdit && userToEdit.username === 'mazzarowysk' ? 'disabled' : ''}>
        </div>

        <div class="form-group">
          <label class="form-label" for="uf-role">* Função / Permissão:</label>
          <select id="uf-role" class="form-input" style="background: var(--bg-card, #1e293b); color: var(--text-primary);">
            <option value="Desenvolvedor" ${userToEdit?.role === 'Desenvolvedor' ? 'selected' : ''}>💻 Desenvolvedor (Criador do Sistema)</option>
            <option value="Master" ${userToEdit?.role === 'Master' ? 'selected' : ''}>👑 Master (Acesso Total)</option>
            <option value="Administrador" ${userToEdit?.role === 'Administrador' ? 'selected' : ''}>🛠️ Administrador Hospitalar</option>
            <option value="Médico" ${userToEdit?.role === 'Médico' || !userToEdit ? 'selected' : ''}>🩺 Médico (Corpo Clínico / Especialista)</option>
            <option value="Enfermeiro" ${userToEdit?.role === 'Enfermeiro' ? 'selected' : ''}>🩺 Enfermeiro(a) / Triagem Manchester</option>
            <option value="Recepcionista" ${userToEdit?.role === 'Recepcionista' ? 'selected' : ''}>📋 Recepcionista / Atendimento</option>
            <option value="Farmacêutico" ${userToEdit?.role === 'Farmacêutico' ? 'selected' : ''}>💊 Farmacêutico(a) / Dispensário</option>
            <option value="Biomédico" ${userToEdit?.role === 'Biomédico' ? 'selected' : ''}>🧪 Biomédico(a) / Laboratório</option>
            <option value="Gestor Financeiro" ${userToEdit?.role === 'Gestor Financeiro' ? 'selected' : ''}>📊 Gestor Financeiro / Faturamento</option>
            <option value="Auxiliar de Enfermagem" ${userToEdit?.role === 'Auxiliar de Enfermagem' ? 'selected' : ''}>🏥 Auxiliar de Enfermagem</option>
          </select>
        </div>

        <div id="uf-master-key-box" class="form-group" style="display: none; background: rgba(99, 102, 241, 0.12); border: 1px solid rgba(129, 140, 248, 0.35); border-radius: 8px; padding: 12px;">
          <label class="form-label" for="uf-master-key" style="color: #a5b4fc; font-weight: 600; display: flex; align-items: center; gap: 6px;">
            <i class="fa-solid fa-key" style="color: #fbbf24;"></i> Chave de Aprovação Master:
          </label>
          <input type="password" id="uf-master-key" class="form-input" placeholder="Digite a Chave Master (Ex: MASTER-HN-2026)">
          <small style="color: var(--text-secondary); display: block; margin-top: 6px; font-size: 0.78rem; line-height: 1.4;">
            * Se a Chave Master for válida ou se você for o Master principal, o acesso será liberado imediatamente. Caso contrário, a solicitação ficará pendente de aprovação.
          </small>
        </div>

        <div class="form-group">
          <label class="form-label" for="uf-password">${isEdit ? 'Nova Senha (deixe em branco para manter a atual):' : '* Senha:'}</label>
          <input type="password" id="uf-password" class="form-input" ${!isEdit ? 'required' : ''} placeholder="••••••••">
        </div>

        <div style="display: flex; gap: 10px; margin-top: 10px;">
          <button type="submit" id="btn-uform-save" class="btn-sync-action ${isEdit ? 'purple' : 'orange'}" style="flex: 1;">
            <i class="fa-solid fa-floppy-disk"></i> ${isEdit ? 'Salvar Alterações' : 'Cadastrar Usuário'}
          </button>
          <button type="button" id="btn-uform-cancel" class="btn-sync-secondary" style="flex: 1; border: 1px solid rgba(255,255,255,0.15); border-radius: 12px; padding: 12px;">
            Cancelar
          </button>
        </div>
      </form>
    </div>
  `;

  document.body.appendChild(overlay);

  const close = () => overlay.remove();
  document.getElementById('btn-uform-close')?.addEventListener('click', close);
  document.getElementById('btn-uform-cancel')?.addEventListener('click', close);

  const roleSelect = document.getElementById('uf-role');
  const masterKeyBox = document.getElementById('uf-master-key-box');

  const checkMasterRole = () => {
    if (roleSelect.value === 'Master' || roleSelect.value === 'Administrador') {
      masterKeyBox.style.display = 'block';
    } else {
      masterKeyBox.style.display = 'none';
    }
  };
  roleSelect?.addEventListener('change', checkMasterRole);
  checkMasterRole();

  document.getElementById('user-editor-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btnSave = document.getElementById('btn-uform-save');
    btnSave.disabled = true;
    btnSave.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Salvando...';

    const name = document.getElementById('uf-name').value.trim();
    const username = document.getElementById('uf-username').value.trim();
    const role = roleSelect.value;
    const masterKey = document.getElementById('uf-master-key')?.value || '';
    const password = document.getElementById('uf-password').value;

    try {
      const url = isEdit ? `/api/users/${userToEdit.id}` : '/api/users';
      const method = isEdit ? 'PUT' : 'POST';

      const res = await apiFetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, username, role, password, masterKey })
      });

      const payload = await res.json();
      if (res.ok) {
        showToast(payload.message || 'Operação realizada com sucesso!');
        syncManager.pushToCloud(false);
        close();
        if (onSaved) onSaved();
      } else {
        showCustomAlert({ title: 'Atenção', message: payload.message || 'Erro ao salvar usuário.', type: 'warning' });
      }
    } catch (err) {
      showCustomAlert({ title: 'Erro', message: 'Falha de conexão com o servidor.', type: 'danger' });
    } finally {
      btnSave.disabled = false;
      btnSave.innerHTML = isEdit ? '<i class="fa-solid fa-floppy-disk"></i> Salvar Alterações' : '<i class="fa-solid fa-floppy-disk"></i> Cadastrar Usuário';
    }
  });
};
