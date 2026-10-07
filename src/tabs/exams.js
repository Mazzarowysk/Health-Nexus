// src/tabs/exams.js
// Módulo da Aba "Exames & Laboratório" (SADT — Serviço de Apoio Diagnóstico e Terapêutico)
// Health Nexus — Recepção de pedidos, aceite técnico, digitação de laudos, devolução ao PEP e relatórios analíticos.

import { state } from '../state.js';
import { showToast, showCustomAlert } from '../modules/ui.js';
import { getRolePermissions } from '../modules/auth.js';
import { EXAM_CATALOG, EXAM_CATEGORIES, getExamById } from '../modules/examOrders.js';

let activeSubTab = 'queue'; // 'queue' | 'analytics'
let currentFilter = {
  status: 'all',      // 'all' | 'Solicitado' | 'Em Andamento' | 'Concluído'
  category: 'all',    // 'all' | 'lab' | 'img' | 'graf' | 'adv'
  priority: 'all',    // 'all' | 'Emergência' | 'Urgente' | 'Rotina'
  sector: 'all',      // 'all' | setor string
  search: ''
};

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

function getDB() {
  try {
    return (typeof window !== 'undefined' && window.localDB) ? window.localDB.getFullDB() : {};
  } catch (e) {
    return {};
  }
}

/**
 * Retorna todos os pedidos de exames cadastrados no sistema,
 * ordenados por prioridade clínica e data.
 */
function getAllExamRequests() {
  const db = getDB();
  const list = (db.exam_requests || []).slice();
  
  // Ordenação: Emergência primeiro, depois Urgente, depois Rotina; dentro do mesmo grau, mais recente primeiro
  const priWeight = { 'Emergência': 3, 'Urgente': 2, 'Rotina': 1 };
  list.sort((a, b) => {
    const aHasEmerg = (a.items || []).some(i => i.priority === 'Emergência');
    const bHasEmerg = (b.items || []).some(i => i.priority === 'Emergência');
    if (aHasEmerg !== bHasEmerg) return bHasEmerg ? 1 : -1;

    const aHasUrg = (a.items || []).some(i => i.priority === 'Urgente');
    const bHasUrg = (b.items || []).some(i => i.priority === 'Urgente');
    if (aHasUrg !== bHasUrg) return bHasUrg ? 1 : -1;

    return new Date(b.created_at || 0) - new Date(a.created_at || 0);
  });

  return list;
}

/**
 * Atualiza o badge numérico no menu lateral da aba Exames
 */
export function updateExamsNavBadge() {
  try {
    const reqs = getAllExamRequests();
    const pendingCount = reqs.reduce((acc, r) => {
      const pendingItems = (r.items || []).filter(i => (i.status || r.status || 'Solicitado') !== 'Concluído');
      return acc + pendingItems.length;
    }, 0);

    const badge = document.getElementById('exames-nav-badge');
    if (badge) {
      if (pendingCount > 0) {
        badge.textContent = pendingCount;
        badge.style.display = 'inline-block';
        badge.style.background = reqs.some(r => (r.items || []).some(i => i.priority === 'Emergência' && (i.status || r.status) !== 'Concluído'))
          ? '#ef4444'
          : '#0ea5e9';
      } else {
        badge.style.display = 'none';
      }
    }
  } catch (e) {
    console.warn('[ExamsTab] Erro ao atualizar badge do menu:', e);
  }
}

/**
 * Cria pedidos de exemplo na base caso o SADT esteja totalmente vazio
 */
export function seedSampleExamRequests() {
  if (typeof window === 'undefined' || !window.localDB) return;
  const db = getDB();
  const patients = db.patients || [];
  const p1 = patients[0] || { id: 'PAT-001', fullName: 'Marcelo Mazaro' };
  const p2 = patients[1] || { id: 'PAT-002', fullName: 'Ana Paula Rodrigues' };
  const p3 = patients[2] || { id: 'PAT-003', fullName: 'Carlos Eduardo Silva' };

  const samples = [
    {
      id: window.localDB.generateId('EXM'),
      patientId: p1.id,
      patientName: p1.fullName || p1.name,
      encounterId: 'ENC-SAMPLE-01',
      sector: 'Pronto-Socorro / Sala Vermelha',
      doctorName: 'Dr. Roberto Cardoso',
      councilNumber: '142857-SP',
      justification: 'Dor torácica súbita em aperto há 2h com irradiação precordial, sudorese e dispneia.',
      status: 'Solicitado',
      created_at: new Date(Date.now() - 25 * 60000).toISOString(),
      items: [
        { examId: 'troponina', name: 'Troponina ultrassensível (seriada)', cat: 'lab', prep: 'Sem preparo', priority: 'Emergência', status: 'Solicitado', note: '1ª amostra admissional' },
        { examId: 'rxtorax', name: 'Radiografia de tórax (PA e perfil) — Raio-X', cat: 'img', prep: 'Retirar objetos metálicos do tórax', priority: 'Emergência', status: 'Solicitado', note: 'Leito / portátil se instabilidade' },
        { examId: 'ecg', name: 'Eletrocardiograma de 12 derivações', cat: 'graf', prep: 'Sem preparo', priority: 'Emergência', status: 'Concluído', result: 'Ritmo sinusal regular, FC 88 bpm. Supradesnivelamento de segmento ST de 2mm em derivações V2-V4. Sugestivo de IAM anterior.', resultDate: new Date(Date.now() - 15 * 60000).toISOString(), resultProfessional: 'Dr. Roberto Cardoso (CRM 142857-SP)' }
      ]
    },
    {
      id: window.localDB.generateId('EXM'),
      patientId: p2.id,
      patientName: p2.fullName || p2.name,
      encounterId: 'ENC-SAMPLE-02',
      sector: 'Consultório 01 (Ambulatório)',
      doctorName: 'Dra. Camila Duarte',
      councilNumber: '198420-SP',
      justification: 'Suspeita de pielonefrite aguda com disúria, febre de 38.5°C e sinal de Giordano positivo.',
      status: 'Em Andamento',
      created_at: new Date(Date.now() - 75 * 60000).toISOString(),
      accepted_at: new Date(Date.now() - 40 * 60000).toISOString(),
      accepted_by: 'Biomédica Juliana Pires (CRBM 1845)',
      items: [
        { examId: 'hemograma', name: 'Hemograma completo', cat: 'lab', prep: 'Sem jejum', priority: 'Urgente', status: 'Em Andamento', note: 'Coleta realizada às ' + new Date(Date.now() - 35 * 60000).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) },
        { examId: 'eas', name: 'Urina tipo 1 (EAS)', cat: 'lab', prep: 'Jato médio', priority: 'Urgente', status: 'Concluído', result: 'Leucócitos: > 1.000.000/mL (campo repleto). Nitrito positivo. Hemácias: 25.000/mL. Cristais ausentes.', resultDate: new Date(Date.now() - 10 * 60000).toISOString(), resultProfessional: 'Juliana Pires (CRBM 1845)' },
        { examId: 'urocultura', name: 'Urocultura com antibiograma', cat: 'lab', prep: 'Jato médio, higiene prévia', priority: 'Rotina', status: 'Em Andamento', note: 'Amostra semeada, aguardando incubação de 48h' }
      ]
    },
    {
      id: window.localDB.generateId('EXM'),
      patientId: p3.id,
      patientName: p3.fullName || p3.name,
      encounterId: 'ENC-SAMPLE-03',
      sector: 'Observação do PS (Poltrona 02)',
      doctorName: 'Dr. Felipe Albuquerque',
      councilNumber: '165780-SP',
      justification: 'Trauma em membro inferior direito após queda ao nível do solo. Edema e impotência funcional no joelho e tornozelo.',
      status: 'Solicitado',
      created_at: new Date(Date.now() - 45 * 60000).toISOString(),
      items: [
        { examId: 'rxmembros', name: 'Radiografia de membros / extremidades (ossos e articulações) — Raio-X', cat: 'img', prep: 'Sem preparo', priority: 'Urgente', status: 'Solicitado', note: 'Raio-X de Joelho Direito (AP e Perfil) e Tornozelo Direito (AP e Perfil)' }
      ]
    }
  ];

  samples.forEach(s => window.localDB.insert('exam_requests', s));
  updateExamsNavBadge();
}

/**
 * Renderizador principal da aba Exames & Laboratório
 */
export function renderExamsTab(contentArea) {
  if (!contentArea) contentArea = document.getElementById('main-content');
  if (!contentArea) return;

  const reqs = getAllExamRequests();

  // Se a base estiver totalmente limpa, inicializa com pedidos de exemplo para demonstrar o fluxo completo
  if (reqs.length === 0) {
    seedSampleExamRequests();
  }

  contentArea.innerHTML = `
    <div class="tab-section active" id="exams-tab-root" style="padding: 6px; max-width: 1600px; margin: 0 auto;">
      <!-- Cabeçalho do Módulo SADT -->
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:18px; flex-wrap:wrap; gap:12px;">
        <div>
          <h2 style="font-family:'Outfit',sans-serif; font-weight:700; font-size:1.45rem; margin:0; color:var(--text-primary); display:flex; align-items:center; gap:10px;">
            <i class="fa-solid fa-microscope" style="color:#0ea5e9;"></i> Central de Exames & Laboratório (SADT)
          </h2>
          <p style="margin:4px 0 0; font-size:0.83rem; color:var(--text-muted);">
            Recepção de pedidos clínicos, aceite técnico, execução, laudos e devolução em tempo real ao prontuário médico.
          </p>
        </div>
        <div style="display:flex; gap:8px; align-items:center; flex-wrap:wrap;">
          <button id="btn-exams-seed" class="btn" style="background:rgba(255,255,255,0.06); border:1px solid var(--border-color); color:#cbd5e1; font-size:0.78rem; padding:7px 12px; border-radius:8px; cursor:pointer;" title="Recarregar pedidos de exemplo hospitalar">
            <i class="fa-solid fa-seedling" style="color:#34d399;"></i> Carregar Exemplos
          </button>
          <button id="btn-exams-refresh" class="btn" style="background:rgba(14,165,233,0.12); border:1px solid rgba(14,165,233,0.3); color:#38bdf8; font-size:0.78rem; padding:7px 14px; border-radius:8px; font-weight:600; cursor:pointer;">
            <i class="fa-solid fa-rotate"></i> Atualizar Fila
          </button>
        </div>
      </div>

      <!-- 4 Cards de Métricas em Tempo Real (KPIs SADT) -->
      <div id="exams-kpi-container" style="display:grid; grid-template-columns:repeat(auto-fit, minmax(220px, 1fr)); gap:12px; margin-bottom:18px;">
        ${renderKPICards()}
      </div>

      <!-- Navegação Secundária: Fila de Trabalho vs Indicadores & Relatórios -->
      <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid var(--border-color); margin-bottom:16px; flex-wrap:wrap; gap:10px;">
        <div style="display:flex; gap:6px;">
          <button type="button" class="btn exams-subtab-btn ${activeSubTab === 'queue' ? 'active' : ''}" data-subtab="queue" style="font-size:0.84rem; padding:8px 16px; border-radius:8px 8px 0 0; border:none; cursor:pointer; font-weight:600; display:flex; align-items:center; gap:8px; background:${activeSubTab === 'queue' ? 'rgba(14,165,233,0.18)' : 'transparent'}; color:${activeSubTab === 'queue' ? '#38bdf8' : '#94a3b8'}; border-bottom:2px solid ${activeSubTab === 'queue' ? '#38bdf8' : 'transparent'};">
            <i class="fa-solid fa-list-check"></i> Fila de Trabalho (Bancada Técnica)
          </button>
          <button type="button" class="btn exams-subtab-btn ${activeSubTab === 'analytics' ? 'active' : ''}" data-subtab="analytics" style="font-size:0.84rem; padding:8px 16px; border-radius:8px 8px 0 0; border:none; cursor:pointer; font-weight:600; display:flex; align-items:center; gap:8px; background:${activeSubTab === 'analytics' ? 'rgba(14,165,233,0.18)' : 'transparent'}; color:${activeSubTab === 'analytics' ? '#38bdf8' : '#94a3b8'}; border-bottom:2px solid ${activeSubTab === 'analytics' ? '#38bdf8' : 'transparent'};">
            <i class="fa-solid fa-chart-pie"></i> Relatórios &amp; Indicadores SADT
          </button>
        </div>
        <div style="font-size:0.74rem; color:var(--text-muted); display:flex; align-items:center; gap:6px;">
          <span style="display:inline-block; width:8px; height:8px; border-radius:50%; background:#10b981; box-shadow:0 0 8px #10b981;"></span> Circuito Fechado PEP ↔ SADT Ativo
        </div>
      </div>

      <!-- Conteúdo da Sub-Aba Ativa -->
      <div id="exams-tab-content">
        ${activeSubTab === 'queue' ? renderQueueView() : renderAnalyticsView()}
      </div>
    </div>
  `;

  bindEvents(contentArea);
  updateExamsNavBadge();
}

/**
 * Monta os 4 Cards de KPI no topo da aba
 */
function renderKPICards() {
  const reqs = getAllExamRequests();
  let totalPending = 0;
  let totalInProgress = 0;
  let totalCompleted = 0;
  let emergencies = 0;

  reqs.forEach(r => {
    (r.items || []).forEach(i => {
      const st = i.status || r.status || 'Solicitado';
      if (st === 'Concluído') totalCompleted++;
      else if (st === 'Em Andamento') totalInProgress++;
      else {
        totalPending++;
        if (i.priority === 'Emergência') emergencies++;
      }
    });
  });

  return `
    <div style="background:var(--bg-secondary); border:1px solid ${emergencies > 0 ? 'rgba(239,68,68,0.45)' : 'var(--border-color)'}; border-radius:10px; padding:12px 16px; display:flex; justify-content:space-between; align-items:center;">
      <div>
        <div style="font-size:0.72rem; text-transform:uppercase; color:#94a3b8; font-weight:700; letter-spacing:0.5px;">Aguardando Aceite / Coleta</div>
        <div style="font-size:1.55rem; font-weight:800; color:#fff; margin-top:3px; display:flex; align-items:baseline; gap:8px;">
          ${totalPending}
          ${emergencies > 0 ? `<span style="font-size:0.68rem; background:rgba(239,68,68,0.2); color:#f87171; border:1px solid #ef444455; border-radius:12px; padding:2px 8px; font-weight:700;"><i class="fa-solid fa-triangle-exclamation"></i> ${emergencies} Emergência</span>` : ''}
        </div>
      </div>
      <div style="width:44px; height:44px; border-radius:10px; background:rgba(239,68,68,0.12); color:#f87171; display:flex; align-items:center; justify-content:center; font-size:1.2rem;">
        <i class="fa-solid fa-inbox"></i>
      </div>
    </div>

    <div style="background:var(--bg-secondary); border:1px solid var(--border-color); border-radius:10px; padding:12px 16px; display:flex; justify-content:space-between; align-items:center;">
      <div>
        <div style="font-size:0.72rem; text-transform:uppercase; color:#94a3b8; font-weight:700; letter-spacing:0.5px;">Em Execução / Análise</div>
        <div style="font-size:1.55rem; font-weight:800; color:#38bdf8; margin-top:3px;">${totalInProgress}</div>
      </div>
      <div style="width:44px; height:44px; border-radius:10px; background:rgba(14,165,233,0.12); color:#38bdf8; display:flex; align-items:center; justify-content:center; font-size:1.2rem;">
        <i class="fa-solid fa-vial-circle-check"></i>
      </div>
    </div>

    <div style="background:var(--bg-secondary); border:1px solid var(--border-color); border-radius:10px; padding:12px 16px; display:flex; justify-content:space-between; align-items:center;">
      <div>
        <div style="font-size:0.72rem; text-transform:uppercase; color:#94a3b8; font-weight:700; letter-spacing:0.5px;">Laudados &amp; Devolvidos</div>
        <div style="font-size:1.55rem; font-weight:800; color:#34d399; margin-top:3px;">${totalCompleted}</div>
      </div>
      <div style="width:44px; height:44px; border-radius:10px; background:rgba(16,185,129,0.12); color:#34d399; display:flex; align-items:center; justify-content:center; font-size:1.2rem;">
        <i class="fa-solid fa-square-check"></i>
      </div>
    </div>

    <div style="background:var(--bg-secondary); border:1px solid var(--border-color); border-radius:10px; padding:12px 16px; display:flex; justify-content:space-between; align-items:center;">
      <div>
        <div style="font-size:0.72rem; text-transform:uppercase; color:#94a3b8; font-weight:700; letter-spacing:0.5px;">Taxa de Liberação</div>
        <div style="font-size:1.55rem; font-weight:800; color:#c084fc; margin-top:3px;">
          ${(totalPending + totalInProgress + totalCompleted) > 0 ? Math.round((totalCompleted / (totalPending + totalInProgress + totalCompleted)) * 100) : 100}%
        </div>
      </div>
      <div style="width:44px; height:44px; border-radius:10px; background:rgba(192,132,252,0.12); color:#c084fc; display:flex; align-items:center; justify-content:center; font-size:1.2rem;">
        <i class="fa-solid fa-bolt"></i>
      </div>
    </div>
  `;
}

/**
 * Renderiza a visão da Fila de Trabalho (Bancada SADT)
 */
function renderQueueView() {
  const reqs = getAllExamRequests();

  // Obter setores únicos para o filtro
  const sectors = Array.from(new Set(reqs.map(r => r.sector || 'Pronto-Socorro'))).filter(Boolean);

  // Filtragem
  const q = norm(currentFilter.search);
  const filtered = reqs.filter(r => {
    if (currentFilter.status !== 'all') {
      const matchStatus = (r.items || []).some(i => (i.status || r.status || 'Solicitado') === currentFilter.status);
      if (!matchStatus) return false;
    }

    if (currentFilter.priority !== 'all') {
      const matchPri = (r.items || []).some(i => (i.priority || 'Rotina') === currentFilter.priority);
      if (!matchPri) return false;
    }

    if (currentFilter.category !== 'all') {
      const matchCat = (r.items || []).some(i => {
        const examDef = getExamById(i.examId);
        return (examDef?.cat || i.cat) === currentFilter.category;
      });
      if (!matchCat) return false;
    }

    if (currentFilter.sector !== 'all' && (r.sector || '') !== currentFilter.sector) {
      return false;
    }

    if (q) {
      const corpus = norm(`${r.id} ${r.patientName} ${r.doctorName} ${r.sector} ${r.justification} ${(r.items || []).map(i => i.name).join(' ')}`);
      if (!corpus.includes(q)) return false;
    }

    return true;
  });

  return `
    <!-- Barra de Filtros e Busca Rápida -->
    <div style="background:var(--bg-secondary); border:1px solid var(--border-color); border-radius:10px; padding:12px 14px; margin-bottom:16px;">
      <div style="display:grid; grid-template-columns: minmax(200px, 1.4fr) repeat(auto-fit, minmax(140px, 1fr)); gap:10px; align-items:center;">
        <div style="position:relative;">
          <i class="fa-solid fa-magnifying-glass" style="position:absolute; left:10px; top:50%; transform:translateY(-50%); color:#64748b; font-size:0.8rem;"></i>
          <input type="text" id="exams-filter-search" class="form-input" value="${esc(currentFilter.search)}" placeholder="Buscar por paciente, exame, médico ou protocolo (EXM)..." style="width:100%; padding-left:32px; font-size:0.8rem;">
        </div>

        <div>
          <select id="exams-filter-status" class="form-input" style="width:100%; font-size:0.8rem;">
            <option value="all" ${currentFilter.status === 'all' ? 'selected' : ''}>Todos os Status</option>
            <option value="Solicitado" ${currentFilter.status === 'Solicitado' ? 'selected' : ''}>Aguardando Aceite</option>
            <option value="Em Andamento" ${currentFilter.status === 'Em Andamento' ? 'selected' : ''}>Em Execução</option>
            <option value="Concluído" ${currentFilter.status === 'Concluído' ? 'selected' : ''}>Laudado / Concluído</option>
          </select>
        </div>

        <div>
          <select id="exams-filter-priority" class="form-input" style="width:100%; font-size:0.8rem;">
            <option value="all" ${currentFilter.priority === 'all' ? 'selected' : ''}>Todas as Prioridades</option>
            <option value="Emergência" ${currentFilter.priority === 'Emergência' ? 'selected' : ''}>🚨 Emergência</option>
            <option value="Urgente" ${currentFilter.priority === 'Urgente' ? 'selected' : ''}>⚡ Urgente</option>
            <option value="Rotina" ${currentFilter.priority === 'Rotina' ? 'selected' : ''}>🌿 Rotina</option>
          </select>
        </div>

        <div>
          <select id="exams-filter-category" class="form-input" style="width:100%; font-size:0.8rem;">
            <option value="all" ${currentFilter.category === 'all' ? 'selected' : ''}>Todas as Modalidades</option>
            <option value="lab" ${currentFilter.category === 'lab' ? 'selected' : ''}>🔬 Laboratório</option>
            <option value="img" ${currentFilter.category === 'img' ? 'selected' : ''}>🩻 Imagem &amp; Raio-X</option>
            <option value="graf" ${currentFilter.category === 'graf' ? 'selected' : ''}>📈 Métodos Gráficos</option>
            <option value="adv" ${currentFilter.category === 'adv' ? 'selected' : ''}>🧬 Alta Complexidade</option>
          </select>
        </div>

        <div>
          <select id="exams-filter-sector" class="form-input" style="width:100%; font-size:0.8rem;">
            <option value="all" ${currentFilter.sector === 'all' ? 'selected' : ''}>Todos os Setores</option>
            ${sectors.map(s => `<option value="${esc(s)}" ${currentFilter.sector === s ? 'selected' : ''}>${esc(s)}</option>`).join('')}
          </select>
        </div>
      </div>
    </div>

    <!-- Lista de Requisições / Cards de Bancada -->
    <div id="exams-requests-list" style="display:flex; flex-direction:column; gap:14px;">
      ${filtered.length === 0 ? `
        <div style="background:var(--bg-secondary); border:1px dashed var(--border-color); border-radius:10px; padding:48px 20px; text-align:center;">
          <i class="fa-solid fa-clipboard-check" style="font-size:2.4rem; color:#64748b; margin-bottom:12px; display:block;"></i>
          <h4 style="color:#fff; margin:0 0 6px; font-size:1rem;">Nenhum pedido de exame encontrado</h4>
          <p style="font-size:0.82rem; color:var(--text-muted); margin:0;">Ajuste os filtros de busca ou aguarde novas solicitações geradas pelo corpo clínico no PEP.</p>
        </div>
      ` : filtered.map(req => renderRequestCard(req)).join('')}
    </div>
  `;
}

/**
 * Renderiza um Card de Requisição na Fila Técnica
 */
function renderRequestCard(req) {
  const items = req.items || [];
  const reqDate = new Date(req.created_at || Date.now());
  const elapsedMinutes = Math.floor((Date.now() - reqDate.getTime()) / 60000);
  const timeFormatted = elapsedMinutes < 60 ? `${elapsedMinutes} min atrás` : `${Math.floor(elapsedMinutes / 60)}h ${elapsedMinutes % 60}m atrás`;

  // Checagem de prioridade do pedido
  const hasEmerg = items.some(i => i.priority === 'Emergência');
  const hasUrg = items.some(i => i.priority === 'Urgente');
  const priColor = hasEmerg ? '#ef4444' : (hasUrg ? '#f59e0b' : '#10b981');
  const priLabel = hasEmerg ? 'EMERGÊNCIA' : (hasUrg ? 'URGENTE' : 'ROTINA');

  // Status geral do lote
  const allCompleted = items.length > 0 && items.every(i => (i.status || req.status) === 'Concluído');
  const anyInProgress = items.some(i => (i.status || req.status) === 'Em Andamento');

  let batchBadge = `<span style="font-size:0.7rem; background:rgba(239,68,68,0.15); color:#f87171; border:1px solid rgba(239,68,68,0.3); border-radius:12px; padding:2px 8px; font-weight:700;"><i class="fa-solid fa-clock"></i> Pendente de Aceite</span>`;
  if (allCompleted) {
    batchBadge = `<span style="font-size:0.7rem; background:rgba(16,185,129,0.15); color:#34d399; border:1px solid rgba(16,185,129,0.3); border-radius:12px; padding:2px 8px; font-weight:700;"><i class="fa-solid fa-check-double"></i> 100% Laudado &amp; Devolvido</span>`;
  } else if (anyInProgress) {
    batchBadge = `<span style="font-size:0.7rem; background:rgba(14,165,233,0.15); color:#38bdf8; border:1px solid rgba(14,165,233,0.3); border-radius:12px; padding:2px 8px; font-weight:700;"><i class="fa-solid fa-spinner fa-spin"></i> Em Análise / Coleta</span>`;
  }

  return `
    <div class="exam-request-card" style="background:var(--bg-secondary); border:1px solid ${hasEmerg ? 'rgba(239,68,68,0.45)' : 'var(--border-color)'}; border-left:4px solid ${priColor}; border-radius:10px; padding:14px 18px; box-shadow:0 4px 14px rgba(0,0,0,0.18);">
      <!-- Topo do Card: Identificação, Setor e Protocolo -->
      <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:10px; flex-wrap:wrap; gap:10px;">
        <div>
          <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
            <span style="font-family:monospace; font-weight:700; color:#cbd5e1; font-size:0.78rem; background:rgba(255,255,255,0.06); padding:2px 6px; border-radius:4px;">
              ${esc(req.id)}
            </span>
            <span style="font-size:0.7rem; color:${priColor}; border:1px solid ${priColor}44; background:${priColor}18; border-radius:12px; padding:2px 8px; font-weight:800;">
              ${priLabel}
            </span>
            ${batchBadge}
            <span style="font-size:0.72rem; color:#94a3b8;"><i class="fa-regular fa-clock"></i> ${timeFormatted} (${reqDate.toLocaleTimeString('pt-BR', { hour:'2-digit', minute:'2-digit' })})</span>
          </div>

          <!-- Paciente e Setor -->
          <div style="margin-top:6px; display:flex; align-items:baseline; gap:10px; flex-wrap:wrap;">
            <h3 style="margin:0; font-size:1.05rem; font-weight:700; color:#fff;">
              <i class="fa-solid fa-user-injured" style="color:#38bdf8; margin-right:4px;"></i> ${esc(req.patientName)}
            </h3>
            <span style="font-size:0.76rem; color:#cbd5e1; background:rgba(255,255,255,0.05); padding:2px 8px; border-radius:6px; border:1px solid var(--border-color);">
              <i class="fa-solid fa-location-dot" style="color:#fbbf24;"></i> ${esc(req.sector || 'Pronto-Socorro')}
            </span>
            <span style="font-size:0.76rem; color:#94a3b8;">
              <i class="fa-solid fa-user-doctor"></i> Solicitante: <strong style="color:#e2e8f0;">${esc(req.doctorName || 'Médico Plantonista')}</strong> ${req.councilNumber ? `(CRM ${esc(req.councilNumber)})` : ''}
            </span>
          </div>
        </div>

        <!-- Ações Globais do Pedido -->
        <div style="display:flex; gap:6px; align-items:center;">
          ${!allCompleted ? `
            <button type="button" class="btn btn-sm btn-accept-all" data-req="${esc(req.id)}" style="background:rgba(14,165,233,0.15); border:1px solid rgba(14,165,233,0.35); color:#38bdf8; font-size:0.74rem; padding:5px 11px; border-radius:6px; cursor:pointer;" title="Dar aceite em todos os itens pendentes deste pedido">
              <i class="fa-solid fa-check"></i> Aceitar Todos
            </button>
          ` : ''}
          <button type="button" class="btn btn-sm btn-print-req" data-req="${esc(req.id)}" style="background:rgba(255,255,255,0.06); border:1px solid var(--border-color); color:#cbd5e1; font-size:0.74rem; padding:5px 10px; border-radius:6px; cursor:pointer;" title="Imprimir Requisição / Folha de Sala">
            <i class="fa-solid fa-print"></i> Imprimir
          </button>
        </div>
      </div>

      <!-- Justificativa Clínica -->
      ${req.justification ? `
        <div style="background:rgba(0,0,0,0.16); border-radius:6px; padding:6px 10px; font-size:0.75rem; color:#cbd5e1; margin-bottom:12px; border-left:2px solid #64748b;">
          <strong>Indicação Clínica:</strong> ${esc(req.justification)}
        </div>
      ` : ''}

      <!-- Tabela / Lista de Itens do Pedido -->
      <div style="display:flex; flex-direction:column; gap:6px;">
        ${items.map((item, idx) => {
          const itemStatus = item.status || req.status || 'Solicitado';
          const isDone = itemStatus === 'Concluído';
          const isInProgress = itemStatus === 'Em Andamento';
          const examDef = getExamById(item.examId);
          const cat = EXAM_CATEGORIES.find(c => c.id === (examDef?.cat || item.cat)) || { label: 'Geral', icon: 'fa-vial', color: '#94a3b8' };

          return `
            <div style="display:flex; justify-content:space-between; align-items:center; background:var(--bg-primary); border:1px solid ${isDone ? 'rgba(16,185,129,0.35)' : (isInProgress ? 'rgba(14,165,233,0.35)' : 'var(--border-color)')}; border-radius:8px; padding:8px 12px; gap:10px; flex-wrap:wrap;">
              <div style="min-width:0; flex:1;">
                <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
                  <span style="font-weight:600; color:#fff; font-size:0.83rem;">
                    <i class="fa-solid ${cat.icon}" style="color:${cat.color}; margin-right:4px;"></i> ${esc(item.name)}
                  </span>
                  <span style="font-size:0.66rem; color:${cat.color}; border:1px solid ${cat.color}44; background:${cat.color}14; border-radius:10px; padding:1px 6px;">
                    ${cat.label}
                  </span>
                  <span style="font-size:0.66rem; color:#94a3b8; background:rgba(255,255,255,0.05); padding:1px 6px; border-radius:4px;">
                    ${esc(item.priority || 'Rotina')}
                  </span>
                </div>

                <!-- Detalhes, preparo e notas -->
                <div style="font-size:0.73rem; color:var(--text-muted); margin-top:2px;">
                  ${item.prep ? `<span>Preparo: ${esc(item.prep)}</span>` : ''}
                  ${item.note ? ` · <span style="color:#cbd5e1;">Obs: ${esc(item.note)}</span>` : ''}
                </div>

                <!-- Resultado já liberado (se concluído) -->
                ${isDone && item.result ? `
                  <div style="background:rgba(16,185,129,0.08); border:1px solid rgba(16,185,129,0.25); border-radius:6px; padding:6px 9px; margin-top:6px; font-size:0.75rem; color:#d1fae5;">
                    <div style="font-weight:700; color:#34d399; display:flex; justify-content:space-between; align-items:center; margin-bottom:2px;">
                      <span><i class="fa-solid fa-check"></i> Laudo Liberado:</span>
                      <span style="font-size:0.68rem; color:#a7f3d0;">${item.resultDate ? new Date(item.resultDate).toLocaleString('pt-BR') : ''}</span>
                    </div>
                    <div style="white-space:pre-wrap; line-height:1.35;">${esc(item.result)}</div>
                    ${item.resultProfessional ? `<div style="font-size:0.68rem; color:#94a3b8; margin-top:4px;">Resp. Técnico: ${esc(item.resultProfessional)}</div>` : ''}
                  </div>
                ` : ''}
              </div>

              <!-- Ações por Item -->
              <div style="display:flex; gap:6px; align-items:center; white-space:nowrap;">
                ${!isDone && !isInProgress ? `
                  <button type="button" class="btn btn-sm btn-item-accept" data-req="${esc(req.id)}" data-idx="${idx}" style="background:rgba(14,165,233,0.14); border:1px solid rgba(14,165,233,0.3); color:#38bdf8; font-size:0.72rem; padding:4px 10px; border-radius:6px; cursor:pointer;">
                    <i class="fa-solid fa-hand-holding-hand"></i> Dar Aceite
                  </button>
                ` : ''}

                <button type="button" class="btn btn-sm btn-item-result" data-req="${esc(req.id)}" data-idx="${idx}" style="background:${isDone ? 'rgba(255,255,255,0.06)' : 'linear-gradient(135deg, #10b981, #059669)'}; border:${isDone ? '1px solid var(--border-color)' : 'none'}; color:#fff; font-size:0.72rem; padding:5px 12px; border-radius:6px; font-weight:600; cursor:pointer;">
                  <i class="fa-solid ${isDone ? 'fa-pen-to-square' : 'fa-clipboard-check'}"></i> ${isDone ? 'Editar Laudo' : 'Digitar Laudo'}
                </button>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    </div>
  `;
}

/**
 * Renderiza a Sub-Aba de Relatórios & Indicadores (SADT Analytics)
 */
function renderAnalyticsView() {
  const reqs = getAllExamRequests();

  // 1. Contagem por Modalidade
  const catCounts = { lab: 0, img: 0, graf: 0, adv: 0 };
  // 2. Contagem por Setor
  const sectorCounts = {};
  // 3. Contagem por Médico
  const doctorCounts = {};
  // 4. Ranking de Exames
  const examRanking = {};

  let totalExams = 0;

  reqs.forEach(r => {
    const sec = r.sector || 'Pronto-Socorro';
    sectorCounts[sec] = (sectorCounts[sec] || 0) + (r.items || []).length;

    const doc = r.doctorName || 'Médico Plantonista';
    doctorCounts[doc] = (doctorCounts[doc] || 0) + (r.items || []).length;

    (r.items || []).forEach(i => {
      totalExams++;
      const examDef = getExamById(i.examId);
      const catKey = examDef?.cat || i.cat || 'lab';
      if (catCounts[catKey] !== undefined) catCounts[catKey]++;

      const name = i.name || i.examId;
      examRanking[name] = (examRanking[name] || 0) + 1;
    });
  });

  const topExams = Object.entries(examRanking)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  const topSectors = Object.entries(sectorCounts)
    .sort((a, b) => b[1] - a[1]);

  const topDoctors = Object.entries(doctorCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8);

  return `
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:14px; flex-wrap:wrap; gap:10px;">
      <div>
        <h3 style="margin:0; font-size:1.1rem; color:#fff; font-weight:700;">
          <i class="fa-solid fa-chart-column" style="color:#0ea5e9;"></i> Indicadores de Demanda Diagnóstica (SADT)
        </h3>
        <p style="margin:2px 0 0; font-size:0.78rem; color:var(--text-muted);">
          Total consolidado de <strong>${totalExams} exames</strong> solicitados em <strong>${reqs.length} requisições médicas</strong>.
        </p>
      </div>
      <button type="button" id="btn-exams-print-report" class="btn" style="background:rgba(255,255,255,0.06); border:1px solid var(--border-color); color:#cbd5e1; font-size:0.78rem; padding:7px 14px; border-radius:8px; cursor:pointer;">
        <i class="fa-solid fa-file-pdf" style="color:#f87171;"></i> Exportar Relatório do SADT (PDF)
      </button>
    </div>

    <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(360px, 1fr)); gap:14px;">
      <!-- Bloco 1: Distribuição por Modalidade -->
      <div style="background:var(--bg-secondary); border:1px solid var(--border-color); border-radius:10px; padding:16px;">
        <h4 style="margin:0 0 12px; font-size:0.88rem; color:#fff; font-weight:700; display:flex; align-items:center; gap:8px;">
          <i class="fa-solid fa-cubes-stacked" style="color:#38bdf8;"></i> Volume por Modalidade Diagnóstica
        </h4>
        <div style="display:flex; flex-direction:column; gap:10px;">
          ${EXAM_CATEGORIES.map(c => {
            const count = catCounts[c.id] || 0;
            const pct = totalExams > 0 ? Math.round((count / totalExams) * 100) : 0;
            return `
              <div>
                <div style="display:flex; justify-content:space-between; font-size:0.78rem; margin-bottom:3px;">
                  <span style="color:#cbd5e1;"><i class="fa-solid ${c.icon}" style="color:${c.color};"></i> ${c.label}</span>
                  <span style="font-weight:700; color:#fff;">${count} exames <small style="color:#94a3b8;">(${pct}%)</small></span>
                </div>
                <div style="height:6px; background:rgba(255,255,255,0.06); border-radius:3px; overflow:hidden;">
                  <div style="width:${pct}%; height:100%; background:${c.color}; border-radius:3px;"></div>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>

      <!-- Bloco 2: Volume por Setor Solicitante -->
      <div style="background:var(--bg-secondary); border:1px solid var(--border-color); border-radius:10px; padding:16px;">
        <h4 style="margin:0 0 12px; font-size:0.88rem; color:#fff; font-weight:700; display:flex; align-items:center; gap:8px;">
          <i class="fa-solid fa-hospital" style="color:#fbbf24;"></i> Demanda por Setor Hospitalar
        </h4>
        <div style="display:flex; flex-direction:column; gap:8px;">
          ${topSectors.map(([sec, count]) => {
            const pct = totalExams > 0 ? Math.round((count / totalExams) * 100) : 0;
            return `
              <div>
                <div style="display:flex; justify-content:space-between; font-size:0.78rem; margin-bottom:3px;">
                  <span style="color:#cbd5e1;"><i class="fa-solid fa-location-dot" style="color:#fbbf24; font-size:0.72rem;"></i> ${esc(sec)}</span>
                  <span style="font-weight:700; color:#fff;">${count} exames <small style="color:#94a3b8;">(${pct}%)</small></span>
                </div>
                <div style="height:6px; background:rgba(255,255,255,0.06); border-radius:3px; overflow:hidden;">
                  <div style="width:${pct}%; height:100%; background:linear-gradient(90deg, #f59e0b, #d97706); border-radius:3px;"></div>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>

      <!-- Bloco 3: Top 10 Exames Mais Solicitados -->
      <div style="background:var(--bg-secondary); border:1px solid var(--border-color); border-radius:10px; padding:16px;">
        <h4 style="margin:0 0 12px; font-size:0.88rem; color:#fff; font-weight:700; display:flex; align-items:center; gap:8px;">
          <i class="fa-solid fa-ranking-star" style="color:#34d399;"></i> Top 10 Exames Mais Solicitados
        </h4>
        <div style="display:flex; flex-direction:column; gap:6px;">
          ${topExams.map(([name, count], i) => `
            <div style="display:flex; justify-content:space-between; align-items:center; padding:6px 8px; background:rgba(255,255,255,0.02); border-radius:6px; font-size:0.76rem;">
              <span style="color:#e2e8f0; display:flex; align-items:center; gap:6px;">
                <span style="width:18px; height:18px; border-radius:50%; background:rgba(52,211,153,0.15); color:#34d399; display:inline-flex; align-items:center; justify-content:center; font-size:0.65rem; font-weight:700;">${i+1}</span>
                ${esc(name)}
              </span>
              <span style="font-weight:700; color:#34d399;">${count} pedidos</span>
            </div>
          `).join('')}
        </div>
      </div>

      <!-- Bloco 4: Volume por Profissional Solicitante -->
      <div style="background:var(--bg-secondary); border:1px solid var(--border-color); border-radius:10px; padding:16px;">
        <h4 style="margin:0 0 12px; font-size:0.88rem; color:#fff; font-weight:700; display:flex; align-items:center; gap:8px;">
          <i class="fa-solid fa-user-doctor" style="color:#c084fc;"></i> Volume por Médico Solicitante
        </h4>
        <div style="display:flex; flex-direction:column; gap:6px;">
          ${topDoctors.map(([doc, count]) => `
            <div style="display:flex; justify-content:space-between; align-items:center; padding:6px 8px; background:rgba(255,255,255,0.02); border-radius:6px; font-size:0.76rem;">
              <span style="color:#e2e8f0;"><i class="fa-solid fa-stethoscope" style="color:#c084fc; font-size:0.7rem; margin-right:4px;"></i> ${esc(doc)}</span>
              <span style="font-weight:700; color:#c084fc;">${count} exames</span>
            </div>
          `).join('')}
        </div>
      </div>
    </div>
  `;
}

/**
 * Modal para Digitação de Laudo Técnico e Devolução ao PEP
 */
export function openExamResultModal(reqId, itemIndex) {
  const db = getDB();
  const req = (db.exam_requests || []).find(r => r.id === reqId);
  if (!req || !req.items || !req.items[itemIndex]) {
    showToast('Exame não localizado para lançamento de laudo.');
    return;
  }

  const item = req.items[itemIndex];
  const examDef = getExamById(item.examId);
  const isImageOrXRay = (examDef?.cat === 'img' || /raio|rx|radiografia|tomografia|ressonancia/i.test(item.name));

  const modalId = 'hn-exam-result-modal';
  document.getElementById(modalId)?.remove();

  const currentUser = state.user || {};
  const defaultProf = `${currentUser.name || 'Biomédico(a) / Radiologista'} (${currentUser.role || 'SADT'})`;

  // Sugestão de template padrão para laudo
  const defaultResultTemplate = item.result || (isImageOrXRay
    ? `LAUDO RADIOLÓGICO / DIAGNÓSTICO POR IMAGEM:
TÉCNICA: Incidências habituais com padrão radiográfico adequado.
ANÁLISE:
- Estruturas ósseas íntegras, sem evidência de fraturas ou luxações agudas.
- Partes moles com volume e transparência preservados.
IMPRESSÃO DIAGNÓSTICA:
Exame radiográfico dentro dos limites da normalidade.`
    : `Resultado: Normal\nObservações técnicas: Amostra processada sem intercorrências.`);

  const modalHtml = `
    <div id="${modalId}" style="position:fixed; inset:0; background:rgba(0,0,0,0.78); backdrop-filter:blur(4px); z-index:99999; display:flex; align-items:center; justify-content:center; padding:16px;">
      <div style="background:var(--bg-secondary); border:1px solid var(--border-color); border-radius:12px; width:100%; max-width:680px; max-height:92vh; display:flex; flex-direction:column; box-shadow:0 20px 40px rgba(0,0,0,0.5);">
        <!-- Topo -->
        <div style="display:flex; justify-content:space-between; align-items:center; padding:16px 20px; border-bottom:1px solid var(--border-color);">
          <div>
            <h3 style="margin:0; font-size:1.15rem; color:#fff; font-weight:700; display:flex; align-items:center; gap:8px;">
              <i class="fa-solid fa-clipboard-check" style="color:#10b981;"></i> Lançamento de Laudo Técnico &amp; Devolução
            </h3>
            <span style="font-size:0.75rem; color:var(--text-muted);">${esc(req.id)} · ${esc(req.patientName)}</span>
          </div>
          <button type="button" id="modal-exam-close" style="background:transparent; border:none; color:#94a3b8; font-size:1.2rem; cursor:pointer;">
            <i class="fa-solid fa-xmark"></i>
          </button>
        </div>

        <!-- Corpo do Modal -->
        <div style="padding:16px 20px; overflow-y:auto; flex:1; display:flex; flex-direction:column; gap:12px;">
          <div style="background:rgba(14,165,233,0.08); border:1px solid rgba(14,165,233,0.25); border-radius:8px; padding:10px 14px;">
            <div style="font-size:0.88rem; font-weight:700; color:#fff; display:flex; justify-content:space-between;">
              <span>${esc(item.name)}</span>
              <span style="color:#38bdf8; font-size:0.75rem;">Prioridade: ${esc(item.priority || 'Rotina')}</span>
            </div>
            <div style="font-size:0.74rem; color:#cbd5e1; margin-top:4px;">
              <strong>Indicação Clínica:</strong> ${esc(req.justification || 'Não informada')}
            </div>
            <div style="font-size:0.72rem; color:#94a3b8; margin-top:2px;">
              Solicitado por: ${esc(req.doctorName)} (${esc(req.sector || 'Pronto-Socorro')})
            </div>
          </div>

          <div>
            <label class="form-label" style="font-size:0.78rem; color:#cbd5e1; margin-bottom:4px; display:block;">
              <strong>Texto do Laudo / Resultado Técnico:</strong>
            </label>
            <textarea id="modal-exam-result-text" class="form-input" style="width:100%; min-height:160px; font-family:monospace; font-size:0.82rem; line-height:1.45; resize:vertical;" placeholder="Digite aqui o laudo técnico completo, valores obtidos e conclusões...">${esc(defaultResultTemplate)}</textarea>
          </div>

          <div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px;">
            <div>
              <label class="form-label" style="font-size:0.76rem; color:#cbd5e1; margin-bottom:4px; display:block;">Conclusão Diagnóstica:</label>
              <select id="modal-exam-conclusion" class="form-input" style="width:100%; font-size:0.8rem;">
                <option value="Normal">Normal / Sem achados agudos</option>
                <option value="Alterado">Alterado / Achados patológicos</option>
                <option value="Critico">Crítico / Alerta imediato ao médico</option>
              </select>
            </div>
            <div>
              <label class="form-label" style="font-size:0.76rem; color:#cbd5e1; margin-bottom:4px; display:block;">Responsável Técnico pelo Laudo:</label>
              <input type="text" id="modal-exam-professional" class="form-input" value="${esc(item.resultProfessional || defaultProf)}" style="width:100%; font-size:0.8rem;">
            </div>
          </div>
        </div>

        <!-- Rodapé com Ações -->
        <div style="display:flex; justify-content:space-between; align-items:center; padding:14px 20px; border-top:1px solid var(--border-color); background:rgba(0,0,0,0.15);">
          <div style="font-size:0.72rem; color:var(--text-muted);">
            <i class="fa-solid fa-shield-halved"></i> O laudo é anexado automaticamente ao PEP do paciente.
          </div>
          <div style="display:flex; gap:8px;">
            <button type="button" id="modal-exam-cancel" class="btn" style="background:transparent; border:1px solid var(--border-color); color:#cbd5e1; font-size:0.78rem; padding:6px 14px; border-radius:8px; cursor:pointer;">
              Cancelar
            </button>
            <button type="button" id="modal-exam-save" class="btn" style="background:linear-gradient(135deg, #10b981, #059669); border:none; color:#fff; font-size:0.78rem; padding:6px 16px; border-radius:8px; font-weight:700; cursor:pointer;">
              <i class="fa-solid fa-paper-plane"></i> Finalizar &amp; Devolver ao Prontuário
            </button>
          </div>
        </div>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', modalHtml);

  const modalEl = document.getElementById(modalId);
  const close = () => modalEl?.remove();

  modalEl.querySelector('#modal-exam-close')?.addEventListener('click', close);
  modalEl.querySelector('#modal-exam-cancel')?.addEventListener('click', close);

  modalEl.querySelector('#modal-exam-save')?.addEventListener('click', () => {
    const resultText = (modalEl.querySelector('#modal-exam-result-text')?.value || '').trim();
    const conclusion = modalEl.querySelector('#modal-exam-conclusion')?.value || 'Normal';
    const prof = (modalEl.querySelector('#modal-exam-professional')?.value || '').trim() || defaultProf;

    if (!resultText) {
      showToast('Por favor, informe o conteúdo do laudo ou resultado do exame.');
      return;
    }

    // Atualizar no banco local
    try {
      const fullDB = window.localDB.getFullDB ? window.localDB.getFullDB() : {};
      const currentReq = (fullDB.exam_requests || []).find(r => r.id === reqId);
      if (currentReq && currentReq.items && currentReq.items[itemIndex]) {
        currentReq.items[itemIndex].status = 'Concluído';
        currentReq.items[itemIndex].result = resultText;
        currentReq.items[itemIndex].conclusion = conclusion;
        currentReq.items[itemIndex].resultDate = new Date().toISOString();
        currentReq.items[itemIndex].resultProfessional = prof;

        // Se todos os itens foram concluídos, o pedido todo fica como Concluído
        const allDone = currentReq.items.every(i => i.status === 'Concluído');
        if (allDone) {
          currentReq.status = 'Concluído';
          currentReq.completed_at = new Date().toISOString();
          currentReq.completed_by = prof;
        }

        window.localDB.update('exam_requests', reqId, currentReq);

        // Se todos os exames foram liberados, sinaliza o encontro do paciente
        if (allDone && currentReq.encounterId) {
          const enc = (fullDB.encounters || []).find(e => String(e.id) === String(currentReq.encounterId));
          if (enc && enc.status === 'Aguardando_Exames') {
            window.localDB.update('encounters', enc.id, {
              hasCompletedExams: true,
              lastExamCompletedAt: new Date().toISOString()
            });
          }
        }

        showToast('🧪 Laudo salvo com sucesso e disponibilizado no prontuário do paciente!');
        close();
        renderExamsTab();
      }
    } catch (err) {
      console.error('[ExamsTab] Erro ao salvar laudo:', err);
      showToast('Ocorreu um erro ao salvar o laudo do exame.');
    }
  });
}

/**
 * Vincula listeners de evento na interface
 */
function bindEvents(container) {
  // Troca de sub-abas
  container.querySelectorAll('.exams-subtab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      activeSubTab = btn.dataset.subtab;
      renderExamsTab(container);
    });
  });

  // Botão carregar exemplos
  container.querySelector('#btn-exams-seed')?.addEventListener('click', () => {
    seedSampleExamRequests();
    showToast('🌱 Pedidos de exames adicionais carregados para teste!');
    renderExamsTab(container);
  });

  // Botão atualizar fila
  container.querySelector('#btn-exams-refresh')?.addEventListener('click', () => {
    renderExamsTab(container);
    showToast('Fila de exames sincronizada.');
  });

  // Filtros de busca
  const searchInput = container.querySelector('#exams-filter-search');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      currentFilter.search = e.target.value;
      const contentEl = container.querySelector('#exams-tab-content');
      if (contentEl) contentEl.innerHTML = activeSubTab === 'queue' ? renderQueueView() : renderAnalyticsView();
      bindQueueActions(container);
      const again = container.querySelector('#exams-filter-search');
      if (again) {
        again.focus();
        const len = again.value.length;
        try { again.setSelectionRange(len, len); } catch (err) {}
      }
    });
  }

  container.querySelector('#exams-filter-status')?.addEventListener('change', (e) => {
    currentFilter.status = e.target.value;
    renderExamsTab(container);
  });

  container.querySelector('#exams-filter-priority')?.addEventListener('change', (e) => {
    currentFilter.priority = e.target.value;
    renderExamsTab(container);
  });

  container.querySelector('#exams-filter-category')?.addEventListener('change', (e) => {
    currentFilter.category = e.target.value;
    renderExamsTab(container);
  });

  container.querySelector('#exams-filter-sector')?.addEventListener('change', (e) => {
    currentFilter.sector = e.target.value;
    renderExamsTab(container);
  });

  // Botão Imprimir Relatório SADT
  container.querySelector('#btn-exams-print-report')?.addEventListener('click', () => {
    printSADTReport();
  });

  bindQueueActions(container);
}

/**
 * Vincula ações da fila de trabalho (aceite, laudo, impressão)
 */
function bindQueueActions(container) {
  // Aceite em lote
  container.querySelectorAll('.btn-accept-all').forEach(btn => {
    btn.addEventListener('click', () => {
      const reqId = btn.dataset.req;
      acceptRequest(reqId);
    });
  });

  // Aceite por item
  container.querySelectorAll('.btn-item-accept').forEach(btn => {
    btn.addEventListener('click', () => {
      const reqId = btn.dataset.req;
      const idx = parseInt(btn.dataset.idx, 10);
      acceptItem(reqId, idx);
    });
  });

  // Digitar laudo
  container.querySelectorAll('.btn-item-result').forEach(btn => {
    btn.addEventListener('click', () => {
      const reqId = btn.dataset.req;
      const idx = parseInt(btn.dataset.idx, 10);
      openExamResultModal(reqId, idx);
    });
  });

  // Imprimir requisição / folha de sala
  container.querySelectorAll('.btn-print-req').forEach(btn => {
    btn.addEventListener('click', () => {
      const reqId = btn.dataset.req;
      const db = getDB();
      const req = (db.exam_requests || []).find(r => r.id === reqId);
      if (req && typeof window.printExamRequisition === 'function') {
        window.printExamRequisition(req);
      } else {
        showToast('Impressão indisponível.');
      }
    });
  });
}

/**
 * Dá aceite técnico no pedido completo
 */
function acceptRequest(reqId) {
  try {
    const fullDB = window.localDB.getFullDB ? window.localDB.getFullDB() : {};
    const req = (fullDB.exam_requests || []).find(r => r.id === reqId);
    if (!req) return;

    const user = state.user || {};
    const profName = user.name || 'Biomédico(a) / Técnico de SADT';

    req.status = 'Em Andamento';
    req.accepted_at = new Date().toISOString();
    req.accepted_by = profName;

    (req.items || []).forEach(i => {
      if (i.status !== 'Concluído') {
        i.status = 'Em Andamento';
      }
    });

    window.localDB.update('exam_requests', reqId, req);
    showToast(`✓ Aceite confirmado no pedido ${reqId} por ${profName}.`);
    renderExamsTab();
  } catch (e) {
    console.error('[ExamsTab] Erro ao aceitar pedido:', e);
  }
}

/**
 * Dá aceite técnico em um item específico do pedido
 */
function acceptItem(reqId, idx) {
  try {
    const fullDB = window.localDB.getFullDB ? window.localDB.getFullDB() : {};
    const req = (fullDB.exam_requests || []).find(r => r.id === reqId);
    if (!req || !req.items || !req.items[idx]) return;

    const user = state.user || {};
    const profName = user.name || 'Biomédico(a) / Técnico de SADT';

    req.items[idx].status = 'Em Andamento';
    req.items[idx].accepted_at = new Date().toISOString();
    req.items[idx].accepted_by = profName;

    if (req.status === 'Solicitado') {
      req.status = 'Em Andamento';
    }

    window.localDB.update('exam_requests', reqId, req);
    showToast(`✓ Exame "${req.items[idx].name}" aceito para execução.`);
    renderExamsTab();
  } catch (e) {
    console.error('[ExamsTab] Erro ao aceitar item:', e);
  }
}

/**
 * Imprime Relatório Gerencial do SADT (PDF)
 */
function printSADTReport() {
  const reqs = getAllExamRequests();
  const w = window.open('', '_blank', 'width=900,height=1000');
  if (!w) {
    showToast('Libere os pop-ups para imprimir o relatório.');
    return;
  }

  const date = new Date().toLocaleString('pt-BR');
  const totalItens = reqs.reduce((acc, r) => acc + (r.items?.length || 0), 0);

  w.document.write(`<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><title>Relatório Gerencial SADT — Health Nexus</title>
  <style>
    body{font-family:Arial,Helvetica,sans-serif;color:#0f172a;margin:32px;font-size:12px}
    h1{font-size:18px;margin:0 0 4px;color:#0369a1}
    .head{display:flex;justify-content:space-between;border-bottom:2px solid #0369a1;padding-bottom:10px;margin-bottom:16px}
    table{width:100%;border-collapse:collapse;margin-top:10px}
    th,td{border:1px solid #cbd5e1;padding:6px 8px;text-align:left}
    th{background:#f0f9ff;font-size:11px;color:#0369a1}
    @media print{button{display:none}}
  </style></head><body>
  <div class="head">
    <div>
      <h1>Health Nexus — Relatório Gerencial de Apoio Diagnóstico (SADT)</h1>
      <div>Serviço de Laboratório Clínico &amp; Diagnóstico por Imagem</div>
    </div>
    <div style="text-align:right">Emissão: ${esc(date)}<br><strong>${reqs.length} pedidos (${totalItens} exames)</strong></div>
  </div>
  <table>
    <thead>
      <tr>
        <th>Protocolo</th>
        <th>Data/Hora</th>
        <th>Paciente</th>
        <th>Setor</th>
        <th>Médico Solicitante</th>
        <th>Exames Solicitados</th>
        <th>Status</th>
      </tr>
    </thead>
    <tbody>
      ${reqs.map(r => `
        <tr>
          <td><strong>${esc(r.id)}</strong></td>
          <td>${new Date(r.created_at || Date.now()).toLocaleString('pt-BR')}</td>
          <td>${esc(r.patientName)}</td>
          <td>${esc(r.sector || 'Pronto-Socorro')}</td>
          <td>${esc(r.doctorName || 'Plantonista')}</td>
          <td>${(r.items || []).map(i => `${esc(i.name)} (${esc(i.status || r.status || 'Solicitado')})`).join('<br>')}</td>
          <td>${esc(r.status || 'Solicitado')}</td>
        </tr>
      `).join('')}
    </tbody>
  </table>
  <p style="text-align:center;margin-top:24px"><button onclick="window.print()" style="padding:8px 18px;font-size:13px;cursor:pointer">Imprimir Relatório</button></p>
  </body></html>`);

  w.document.close();
  setTimeout(() => { try { w.focus(); w.print(); } catch (e) {} }, 400);
}
