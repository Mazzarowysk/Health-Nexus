import { readFileSync, writeFileSync } from 'fs';

const mainJsPath = 'c:/Health Nexus/src/main.js';
let content = readFileSync(mainJsPath, 'utf8');

// Injetar função global handleAgendaCardClick se não existir
const globalAgendaCardFn = `
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
      const q = document.getElementById('medical-queue');
      if (q) q.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 150);
  } else if (actionType === 'completed') {
    showToast('⚡ Acessando Histórico de Atendimentos Pós-Alta e Relatórios!');
    switchTab('relatorios');
  }
};
`;

if (!content.includes('window.handleAgendaCardClick')) {
  content += globalAgendaCardFn;
}

// Atualizar o bloco HTML de renderização dos cards na Agenda
const oldKpiBlock = `        <div class="interactive-card" id="kpi-agenda-all" title="Clique para exibir todas as consultas" style="background: var(--bg-secondary); border: 1px solid var(--border-color); border-radius: 12px; padding: 16px 20px; display: flex; align-items: center; gap: 16px;">
          <div style="width: 44px; height: 44px; border-radius: 12px; background: rgba(99,102,241,0.12); border: 1px solid rgba(99,102,241,0.25); display: flex; align-items: center; justify-content: center; color: #818cf8;">
            <i class="fa-solid fa-list-check" style="font-size: 1.2rem;"></i>
          </div>
          <div>
            <div style="font-size: 0.75rem; color: var(--text-muted); font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em;">Total de Consultas</div>
            <div style="font-size: 1.4rem; font-weight: 800; color: var(--text-primary);">\${total}</div>
          </div>
        </div>

        <div class="interactive-card" id="kpi-agenda-confirmed" title="Clique para filtrar apenas Confirmados" style="background: var(--bg-secondary); border: 1px solid var(--border-color); border-radius: 12px; padding: 16px 20px; display: flex; align-items: center; gap: 16px;">
          <div style="width: 44px; height: 44px; border-radius: 12px; background: rgba(16,185,129,0.12); border: 1px solid rgba(16,185,129,0.25); display: flex; align-items: center; justify-content: center; color: #34d399;">
            <i class="fa-solid fa-circle-check" style="font-size: 1.2rem;"></i>
          </div>
          <div>
            <div style="font-size: 0.75rem; color: var(--text-muted); font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em;">Confirmados</div>
            <div style="font-size: 1.4rem; font-weight: 800; color: #34d399;">\${confirmados}</div>
          </div>
        </div>

        <div class="interactive-card" id="kpi-agenda-progress" title="Clique para filtrar apenas Em Atendimento" style="background: var(--bg-secondary); border: 1px solid var(--border-color); border-radius: 12px; padding: 16px 20px; display: flex; align-items: center; gap: 16px;">
          <div style="width: 44px; height: 44px; border-radius: 12px; background: rgba(245,158,11,0.12); border: 1px solid rgba(245,158,11,0.25); display: flex; align-items: center; justify-content: center; color: #fbbf24;">
            <i class="fa-solid fa-stethoscope" style="font-size: 1.2rem;"></i>
          </div>
          <div>
            <div style="font-size: 0.75rem; color: var(--text-muted); font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em;">Em Atendimento</div>
            <div style="font-size: 1.4rem; font-weight: 800; color: #fbbf24;">\${emAtendimento}</div>
          </div>
        </div>

        <div class="interactive-card" id="kpi-agenda-completed" title="Clique para filtrar apenas Concluídos" style="background: var(--bg-secondary); border: 1px solid var(--border-color); border-radius: 12px; padding: 16px 20px; display: flex; align-items: center; gap: 16px;">
          <div style="width: 44px; height: 44px; border-radius: 12px; background: rgba(148,163,184,0.12); border: 1px solid rgba(148,163,184,0.2); display: flex; align-items: center; justify-content: center; color: #94a3b8;">
            <i class="fa-solid fa-check-double" style="font-size: 1.2rem;"></i>
          </div>
          <div>
            <div style="font-size: 0.75rem; color: var(--text-muted); font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em;">Concluídos</div>
            <div style="font-size: 1.4rem; font-weight: 800; color: #94a3b8;">\${concluidos}</div>
          </div>
        </div>`;

const newKpiBlock = `        <div class="interactive-card" id="kpi-agenda-all" onclick="handleAgendaCardClick('all')" title="Clique para exibir todas as consultas da data" style="background: var(--bg-secondary); border: 1px solid var(--border-color); border-radius: 12px; padding: 16px 20px; display: flex; align-items: center; gap: 16px; cursor: pointer;">
          <div style="width: 44px; height: 44px; border-radius: 12px; background: rgba(99,102,241,0.12); border: 1px solid rgba(99,102,241,0.25); display: flex; align-items: center; justify-content: center; color: #818cf8;">
            <i class="fa-solid fa-list-check" style="font-size: 1.2rem;"></i>
          </div>
          <div>
            <div style="font-size: 0.75rem; color: var(--text-muted); font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; display: flex; align-items: center; gap: 6px;">
              Total de Consultas <span style="font-size: 0.65rem; background: rgba(99,102,241,0.2); color: #818cf8; padding: 1px 6px; border-radius: 6px;">ATALHO ↗</span>
            </div>
            <div style="font-size: 1.4rem; font-weight: 800; color: var(--text-primary);">\${total}</div>
          </div>
        </div>

        <div class="interactive-card" id="kpi-agenda-confirmed" onclick="handleAgendaCardClick('confirmed')" title="Clique para encaminhar Confirmados para Fila de Atendimento" style="background: var(--bg-secondary); border: 1px solid var(--border-color); border-radius: 12px; padding: 16px 20px; display: flex; align-items: center; gap: 16px; cursor: pointer;">
          <div style="width: 44px; height: 44px; border-radius: 12px; background: rgba(16,185,129,0.12); border: 1px solid rgba(16,185,129,0.25); display: flex; align-items: center; justify-content: center; color: #34d399;">
            <i class="fa-solid fa-circle-check" style="font-size: 1.2rem;"></i>
          </div>
          <div>
            <div style="font-size: 0.75rem; color: var(--text-muted); font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; display: flex; align-items: center; gap: 6px;">
              Confirmados <span style="font-size: 0.65rem; background: rgba(16,185,129,0.2); color: #34d399; padding: 1px 6px; border-radius: 6px;">ATALHO ↗</span>
            </div>
            <div style="font-size: 1.4rem; font-weight: 800; color: #34d399;">\${confirmados}</div>
          </div>
        </div>

        <div class="interactive-card" id="kpi-agenda-progress" onclick="handleAgendaCardClick('progress')" title="Clique para direcionar para Fila Médica / PEP" style="background: var(--bg-secondary); border: 1px solid var(--border-color); border-radius: 12px; padding: 16px 20px; display: flex; align-items: center; gap: 16px; cursor: pointer;">
          <div style="width: 44px; height: 44px; border-radius: 12px; background: rgba(245,158,11,0.12); border: 1px solid rgba(245,158,11,0.25); display: flex; align-items: center; justify-content: center; color: #fbbf24;">
            <i class="fa-solid fa-stethoscope" style="font-size: 1.2rem;"></i>
          </div>
          <div>
            <div style="font-size: 0.75rem; color: var(--text-muted); font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; display: flex; align-items: center; gap: 6px;">
              Em Atendimento <span style="font-size: 0.65rem; background: rgba(245,158,11,0.2); color: #fbbf24; padding: 1px 6px; border-radius: 6px;">ATALHO ↗</span>
            </div>
            <div style="font-size: 1.4rem; font-weight: 800; color: #fbbf24;">\${emAtendimento}</div>
          </div>
        </div>

        <div class="interactive-card" id="kpi-agenda-completed" onclick="handleAgendaCardClick('completed')" title="Clique para abrir Histórico Pós-Alta / Relatórios" style="background: var(--bg-secondary); border: 1px solid var(--border-color); border-radius: 12px; padding: 16px 20px; display: flex; align-items: center; gap: 16px; cursor: pointer;">
          <div style="width: 44px; height: 44px; border-radius: 12px; background: rgba(148,163,184,0.12); border: 1px solid rgba(148,163,184,0.2); display: flex; align-items: center; justify-content: center; color: #94a3b8;">
            <i class="fa-solid fa-check-double" style="font-size: 1.2rem;"></i>
          </div>
          <div>
            <div style="font-size: 0.75rem; color: var(--text-muted); font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; display: flex; align-items: center; gap: 6px;">
              Concluídos <span style="font-size: 0.65rem; background: rgba(148,163,184,0.2); color: #94a3b8; padding: 1px 6px; border-radius: 6px;">ATALHO ↗</span>
            </div>
            <div style="font-size: 1.4rem; font-weight: 800; color: #94a3b8;">\${concluidos}</div>
          </div>
        </div>`;

content = content.replace(oldKpiBlock, newKpiBlock);

writeFileSync(mainJsPath, content, 'utf8');
console.log('✅ Redirecionamento inteligente dos cards da Agenda configurado com sucesso em src/main.js!');
