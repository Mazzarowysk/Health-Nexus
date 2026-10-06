// ─── MÓDULO DE CONSULTA DINÂMICA DE ATENDIMENTOS (HEALTH NEXUS v2.9.24) ──────
// Inspirado nos padrões de pesquisa hospitalar multi-modalidade (Pronto Socorro 66, Internação 35, Ambulatório e SADT)

import { state } from '../state.js';
import { showToast } from './ui.js';

function getLocalDB() {
  try {
    return (typeof window !== 'undefined' && window.localDB) ? window.localDB.getFullDB() : {};
  } catch (e) {
    return {};
  }
}

/**
 * Normaliza os encontros, internações, agendamentos e exames em uma coleção única de atendimentos
 */
function compileAllPassages() {
  const db = getLocalDB();
  const list = [];

  // 1. Encontros Clínicos (Pronto Socorro e Ambulatório)
  (db.encounters || []).forEach(e => {
    const isObs = e.status === 'Em_Observacao' || (e.room && e.room.toLowerCase().includes('observ'));
    const isIntern = e.status === 'Internado' || (e.sector && e.sector.toLowerCase().includes('intern'));
    let modCode = '66';
    let modLabel = 'P. Socorro';
    if (isIntern) {
      modCode = '35';
      modLabel = 'Internação';
    } else if (e.type && e.type.toLowerCase().includes('ambulat')) {
      modCode = 'ambulatorio';
      modLabel = 'Ambulatório';
    }

    const yr = e.created_at ? new Date(e.created_at).getFullYear().toString().slice(-2) : '26';
    const num = e.passageNumber || `${yr}.${modCode === '35' ? '5' : '6'}.00.${String(Math.abs((e.id || '').toString().split('').reduce((a,b)=>a+b.charCodeAt(0),0) * 47) % 9000000 + 1000000).padStart(7, '0')}-0`;

    list.push({
      id: e.id,
      patientId: e.patientId,
      patientName: e.patientName || 'Paciente',
      date: e.created_at || new Date().toISOString(),
      modCode,
      modLabel,
      sector: e.sector || e.room || (modCode === '66' ? 'PRONTO SOCORRO - VL ABARCA' : 'CONSULTÓRIO'),
      doctor: e.doctorName || 'Corpo Clínico',
      plan: e.healthPlan || e.convenio || 'SUS / UNIFICAD',
      status: e.status === 'Finalizado' ? 'LIBERADO' : (e.status === 'Aguardando_Exames' ? 'AGUARDANDO EXAMES' : (e.status || 'EM ANDAMENTO')),
      type: 'encounter',
      cid: e.cid || e.diagnosis || '',
      rawData: e
    });
  });

  // 2. Internações Hospitalares
  (db.hospitalizations || []).forEach(h => {
    const yr = h.admitted_at ? new Date(h.admitted_at).getFullYear().toString().slice(-2) : '26';
    const num = h.passageNumber || `${yr}.5.00.${String(Math.abs((h.id || '').toString().split('').reduce((a,b)=>a+b.charCodeAt(0),0) * 83) % 9000000 + 1000000).padStart(7, '0')}-8`;
    list.push({
      id: h.id,
      patientId: h.patientId,
      patientName: h.patientName || 'Paciente',
      date: h.admitted_at || new Date().toISOString(),
      modCode: '35',
      modLabel: 'Internação',
      sector: h.current_sector || h.ward || 'ALA CIRURGICA SUS',
      doctor: h.doctor_name || h.attendingDoctor || 'Médico Hospitalista',
      plan: h.healthPlan || 'SUS / UNIFICAD',
      status: h.status === 'Alta' ? 'ALTA HOSPITALAR' : 'INTERNADO EM LEITO',
      type: 'hospitalization',
      cid: h.diagnosis || '',
      rawData: h
    });
  });

  // 3. Exames / SADT (Atendimento a Paciente Externo)
  (db.exam_requests || []).forEach(r => {
    const yr = r.created_at ? new Date(r.created_at).getFullYear().toString().slice(-2) : '26';
    const num = r.id || `${yr}.0.00.${String(Math.abs((r.id || '').toString().split('').reduce((a,b)=>a+b.charCodeAt(0),0) * 19) % 9000000 + 1000000).padStart(7, '0')}-7`;
    const examNames = (r.items || []).map(i => i.name).join(', ');
    const isImage = (r.items || []).some(i => i.cat === 'img');

    list.push({
      id: r.id,
      patientId: r.patientId,
      patientName: r.patientName || 'Paciente',
      date: r.created_at || new Date().toISOString(),
      modCode: 'sadt',
      modLabel: 'Exames (SADT)',
      sector: isImage ? 'TOMOGRAFIA - VL ABARCA' : 'LABORATÓRIO CLÍNICO',
      doctor: r.doctorName || 'Médico Solicitante',
      plan: 'SUS / UNIFICAD',
      status: r.status || 'SOLICITADO / AGUARDANDO LAUDO',
      type: 'exam_request',
      cid: r.justification || examNames,
      rawData: r
    });
  });

  // 4. Consultas Agendadas Ambulatoriais
  (db.appointments || []).forEach(a => {
    const yr = a.date ? a.date.slice(2, 4) : '26';
    const num = `${yr}.1.00.${String(Math.abs((a.id || '').toString().split('').reduce((a,b)=>a+b.charCodeAt(0),0) * 23) % 9000000 + 1000000).padStart(7, '0')}-4`;
    list.push({
      id: a.id,
      patientId: a.patientId,
      patientName: a.patientName || 'Paciente',
      date: a.date ? `${a.date}T${a.time || '08:00'}:00` : new Date().toISOString(),
      modCode: 'ambulatorio',
      modLabel: 'Ambulatório',
      sector: a.roomName || 'AMBULATÓRIO DE ESPECIALIDADES',
      doctor: a.doctorName || 'Especialista',
      plan: 'SUS / UNIFICAD',
      status: a.status || 'AGENDADO',
      type: 'appointment',
      cid: a.specialty || a.notes || '',
      rawData: a
    });
  });

  // Ordenar cronologicamente decrescente (mais recente no topo)
  return list.sort((a, b) => new Date(b.date) - new Date(a.date));
}

/**
 * Abre o Modal Completo de Consulta Dinâmica (Localizador de Passagens)
 */
export function openDynamicEncounterQueryModal() {
  const existing = document.getElementById('dynamic-query-modal');
  if (existing) existing.remove();

  const allPassages = compileAllPassages();

  const modal = document.createElement('div');
  modal.id = 'dynamic-query-modal';
  modal.className = 'modal-overlay';
  modal.style.display = 'flex';
  modal.style.background = 'rgba(5, 7, 20, 0.88)';
  modal.style.backdropFilter = 'blur(10px)';
  modal.style.zIndex = '100000';

  modal.innerHTML = `
    <div class="modal-content dyn-query-modal-content" style="max-width: min(1260px, calc(100% - 32px)); width: 96%; max-height: 94vh; display: flex; flex-direction: column; overflow: hidden; background: #0f172a; border: 1.5px solid rgba(56, 189, 248, 0.4); border-radius: 18px; box-shadow: 0 25px 70px rgba(0,0,0,0.85), 0 0 30px rgba(2, 132, 199, 0.2); margin: auto;">
      
      <!-- Cabeçalho Estilizado -->
      <div class="modal-header" style="position: relative; padding: 16px 20px; background: linear-gradient(135deg, #0c4a6e, #1e293b); border-bottom: 1px solid rgba(56, 189, 248, 0.25); display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px;">
        <div style="display: flex; align-items: center; gap: 12px;">
          <div style="width: 42px; height: 42px; border-radius: 12px; background: rgba(56, 189, 248, 0.2); border: 1px solid rgba(56, 189, 248, 0.4); display: flex; align-items: center; justify-content: center; color: #38bdf8; flex-shrink: 0;">
            <i class="fa-solid fa-magnifying-glass-chart" style="font-size: 1.25rem;"></i>
          </div>
          <div>
            <h3 style="font-family: Outfit, sans-serif; font-size: 1.2rem; font-weight: 700; color: #fff; margin: 0;">Atendimento: Consulta Dinâmica (Localizador Geral)</h3>
            <div style="font-size: 0.78rem; color: #bae6fd;">Pesquisa, auditoria e rastreabilidade de passagens hospitalares por modalidade</div>
          </div>
        </div>

        <button type="button" id="close-dynamic-query-modal" class="modal-close" style="background: rgba(255,255,255,0.12); border: 1px solid rgba(255,255,255,0.25); color: #fff; width: 34px; height: 34px; border-radius: 50%; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: 0.2s;" title="Fechar Consulta">
          <i class="fa-solid fa-xmark"></i>
        </button>
      </div>

      <!-- Barra de Filtros Avançados (Inspirada no Padrão das Telas Legadas) -->
      <div style="background: #1e293b; padding: 14px 20px; border-bottom: 1px solid rgba(255,255,255,0.08);">
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(175px, 1fr)); gap: 10px; align-items: end;">
          
          <div>
            <label style="font-size: 0.72rem; font-weight: 700; color: #94a3b8; text-transform: uppercase; margin-bottom: 4px; display: block;">Modalidade do Atendimento:</label>
            <select id="dyn-filter-modality" class="form-input" style="width: 100%; font-size: 0.8rem; padding: 7px 10px; background: #0f172a; border-color: #334155; color: #fff; border-radius: 8px;">
              <option value="all">Todas as Modalidades</option>
              <option value="66">66 - Pronto Socorro</option>
              <option value="35">35 - Internação</option>
              <option value="ambulatorio">Ambulatório / Eletivo</option>
              <option value="sadt">Exames / SADT (Paciente Externo)</option>
            </select>
          </div>

          <div>
            <label style="font-size: 0.72rem; font-weight: 700; color: #94a3b8; text-transform: uppercase; margin-bottom: 4px; display: block;">Nome do Paciente:</label>
            <input type="text" id="dyn-filter-name" class="form-input" placeholder="Buscar por nome ou CPF..." style="width: 100%; font-size: 0.8rem; padding: 7px 10px; background: #0f172a; border-color: #334155; color: #fff; border-radius: 8px;">
          </div>

          <div>
            <label style="font-size: 0.72rem; font-weight: 700; color: #94a3b8; text-transform: uppercase; margin-bottom: 4px; display: block;">Setor / Ala Hospitalar:</label>
            <input type="text" id="dyn-filter-sector" class="form-input" placeholder="Ex: Pronto Socorro, Tomografia..." style="width: 100%; font-size: 0.8rem; padding: 7px 10px; background: #0f172a; border-color: #334155; color: #fff; border-radius: 8px;">
          </div>

          <div>
            <label style="font-size: 0.72rem; font-weight: 700; color: #94a3b8; text-transform: uppercase; margin-bottom: 4px; display: block;">Médico Responsável:</label>
            <input type="text" id="dyn-filter-doctor" class="form-input" placeholder="Nome do médico..." style="width: 100%; font-size: 0.8rem; padding: 7px 10px; background: #0f172a; border-color: #334155; color: #fff; border-radius: 8px;">
          </div>

          <div>
            <label style="font-size: 0.72rem; font-weight: 700; color: #94a3b8; text-transform: uppercase; margin-bottom: 4px; display: block;">Convênio:</label>
            <select id="dyn-filter-plan" class="form-input" style="width: 100%; font-size: 0.8rem; padding: 7px 10px; background: #0f172a; border-color: #334155; color: #fff; border-radius: 8px;">
              <option value="all">Todos os Convênios</option>
              <option value="SUS">SUS / UNIFICAD</option>
              <option value="Unimed">Unimed</option>
              <option value="Bradesco">Bradesco Saúde</option>
              <option value="Amil">Amil</option>
              <option value="Particular">Particular</option>
            </select>
          </div>

          <div style="display: flex; gap: 8px;">
            <button type="button" id="btn-dyn-clear-filters" class="btn" style="flex: 1; font-size: 0.78rem; padding: 7px 10px; background: rgba(255,255,255,0.06); border: 1px solid #334155; color: #cbd5e1; border-radius: 8px; cursor: pointer;">
              <i class="fa-solid fa-eraser"></i> Limpar
            </button>
            <button type="button" id="btn-dyn-export-pdf" class="btn" style="flex: 1; font-size: 0.78rem; padding: 7px 10px; background: rgba(99,102,241,0.2); border: 1px solid rgba(99,102,241,0.4); color: #c7d2fe; border-radius: 8px; cursor: pointer; font-weight: 700;">
              <i class="fa-solid fa-file-pdf"></i> PDF
            </button>
          </div>

        </div>
      </div>

      <!-- Contador de Registros -->
      <div style="padding: 9px 20px; background: rgba(15,23,42,0.95); display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid rgba(255,255,255,0.06); flex-wrap: wrap; gap: 8px;">
        <div style="font-size: 0.78rem; color: #94a3b8;">
          Exibindo <strong id="dyn-count-filtered" style="color: #38bdf8;">${allPassages.length}</strong> de <span id="dyn-count-total">${allPassages.length}</span> atendimentos localizados
        </div>
        <div style="font-size: 0.75rem; color: #64748b;">
          Ordenação: <strong style="color: #e2e8f0;">Cronológica Decrescente (Mais Recente no Topo)</strong>
        </div>
      </div>

      <!-- Grade / Tabela de Resultados com Scroll Horizontal Seguro -->
      <div style="flex: 1; overflow-y: auto; overflow-x: auto; padding: 0 20px 16px; -webkit-overflow-scrolling: touch; min-width: 0;">
        <table class="table" style="width: 100%; min-width: 980px; border-collapse: collapse; margin-top: 8px; font-size: 0.82rem;">
          <thead style="position: sticky; top: 0; background: #0f172a; z-index: 5;">
            <tr style="border-bottom: 2px solid #334155; text-align: left; color: #94a3b8; font-size: 0.76rem; text-transform: uppercase;">
              <th style="padding: 10px 8px;">Número</th>
              <th style="padding: 10px 8px;">Nome do Paciente</th>
              <th style="padding: 10px 8px;">Data / Hora</th>
              <th style="padding: 10px 8px;">Convênio</th>
              <th style="padding: 10px 8px;">Médico</th>
              <th style="padding: 10px 8px;">Setor</th>
              <th style="padding: 10px 8px;">Modalidade</th>
              <th style="padding: 10px 8px;">Conclusão</th>
              <th style="padding: 10px 8px; text-align: right;">Ações Rápidas</th>
            </tr>
          </thead>
          <tbody id="dyn-query-tbody">
            <!-- Linhas renderizadas via JS -->
          </tbody>
        </table>
      </div>

      <!-- Rodapé com Fechar -->
      <div style="padding: 10px 20px; background: #0c1322; border-top: 1px solid #1e293b; display: flex; justify-content: flex-end;">
        <button type="button" id="btn-dyn-close-footer" class="btn" style="background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.2); color: #fff; padding: 7px 16px; border-radius: 8px; cursor: pointer; font-size: 0.82rem;">
          Fechar Consulta
        </button>
      </div>

    </div>
  `;

  document.body.appendChild(modal);

  // Função interna de renderização da tabela
  function renderTable(items) {
    const tbody = document.getElementById('dyn-query-tbody');
    const countEl = document.getElementById('dyn-count-filtered');
    if (!tbody) return;

    if (countEl) countEl.textContent = items.length;

    if (items.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="9" style="text-align: center; padding: 40px; color: var(--text-muted);">
            <i class="fa-solid fa-magnifying-glass" style="font-size: 2rem; margin-bottom: 10px; color: #64748b; display: block;"></i>
            Nenhum atendimento localizado com os filtros selecionados.
          </td>
        </tr>`;
      return;
    }

    tbody.innerHTML = items.map(p => {
      const dateFormatted = p.date ? new Date(p.date).toLocaleString('pt-BR') : '—';
      const modColor = p.modCode === '66' ? '#ef4444' : (p.modCode === '35' ? '#3b82f6' : (p.modCode === 'sadt' ? '#38bdf8' : '#10b981'));
      const statusColor = p.status.includes('LIBERADO') || p.status.includes('ALTA') ? '#34d399' : (p.status.includes('AGUARDANDO') ? '#38bdf8' : '#fbbf24');

      return `
        <tr style="border-bottom: 1px solid rgba(255,255,255,0.06); transition: 0.15s;" onmouseover="this.style.background='rgba(255,255,255,0.04)'" onmouseout="this.style.background='transparent'">
          <td style="padding: 10px 8px; font-family: monospace; font-size: 0.78rem; color: #a5b4fc; font-weight: 700;">
            ${p.num || p.id}
          </td>
          <td style="padding: 10px 8px; font-weight: 600; color: #fff;">
            ${p.patientName}
          </td>
          <td style="padding: 10px 8px; color: #cbd5e1; font-size: 0.78rem;">
            ${dateFormatted}
          </td>
          <td style="padding: 10px 8px; color: #94a3b8; font-size: 0.78rem;">
            <span style="background: rgba(255,255,255,0.06); padding: 2px 7px; border-radius: 4px; border: 1px solid rgba(255,255,255,0.1);">${p.plan}</span>
          </td>
          <td style="padding: 10px 8px; color: #e2e8f0; font-size: 0.78rem;">
            ${p.doctor}
          </td>
          <td style="padding: 10px 8px; color: #cbd5e1; font-size: 0.78rem;">
            ${p.sector}
          </td>
          <td style="padding: 10px 8px;">
            <span style="background: ${modColor}20; color: ${modColor}; border: 1px solid ${modColor}50; padding: 2px 8px; border-radius: 12px; font-size: 0.72rem; font-weight: 700;">
              ${p.modLabel}
            </span>
          </td>
          <td style="padding: 10px 8px;">
            <span style="color: ${statusColor}; font-weight: 700; font-size: 0.74rem;">
              ● ${p.status}
            </span>
          </td>
          <td style="padding: 10px 8px; text-align: right; white-space: nowrap;">
            <button type="button" class="btn btn-sm dyn-action-pep" data-patid="${p.patientId || p.id}" data-patname="${p.patientName}" style="padding: 4px 8px; font-size: 0.72rem; border-radius: 6px; background: rgba(2,132,199,0.2); color: #38bdf8; border: 1px solid rgba(2,132,199,0.4); cursor: pointer; margin-right: 4px;" title="Abrir Prontuário Eletrônico">
              <i class="fa-solid fa-stethoscope"></i> PEP
            </button>
            <button type="button" class="btn btn-sm dyn-action-hist" data-patid="${p.patientId || p.id}" data-patname="${p.patientName}" style="padding: 4px 8px; font-size: 0.72rem; border-radius: 6px; background: rgba(139,92,246,0.2); color: #c4b5fd; border: 1px solid rgba(139,92,246,0.4); cursor: pointer; margin-right: 4px;" title="Ver Histórico Completo">
              <i class="fa-solid fa-clock-rotate-left"></i> Histórico
            </button>
            <button type="button" class="btn btn-sm dyn-action-pdf" data-patid="${p.patientId || p.id}" data-patname="${p.patientName}" style="padding: 4px 8px; font-size: 0.72rem; border-radius: 6px; background: rgba(239,68,68,0.2); color: #fca5a5; border: 1px solid rgba(239,68,68,0.4); cursor: pointer; margin-right: 4px;" title="Exportar Prontuário em PDF com Exames">
              <i class="fa-solid fa-file-pdf"></i>
            </button>
            <button type="button" class="btn btn-sm dyn-action-label" data-patid="${p.patientId || p.id}" data-patname="${p.patientName}" data-num="${p.num || p.id}" data-sector="${p.sector}" style="padding: 4px 8px; font-size: 0.72rem; border-radius: 6px; background: rgba(245,158,11,0.2); color: #fbbf24; border: 1px solid rgba(245,158,11,0.4); cursor: pointer;" title="Imprimir Etiqueta de Pulseira / Amostra">
              <i class="fa-solid fa-tag"></i>
            </button>
          </td>
        </tr>`;
    }).join('');

    // Listeners de ações
    tbody.querySelectorAll('.dyn-action-pep').forEach(btn => {
      btn.addEventListener('click', () => {
        const pat = btn.dataset.patid || btn.dataset.patname;
        modal.remove();
        if (typeof window.openPEPModal === 'function') window.openPEPModal(pat, 'soap');
      });
    });

    tbody.querySelectorAll('.dyn-action-hist').forEach(btn => {
      btn.addEventListener('click', () => {
        const patId = btn.dataset.patid;
        const patName = btn.dataset.patname;
        modal.remove();
        if (typeof window.openPatientHistoryModal === 'function') window.openPatientHistoryModal(patId, patName);
      });
    });

    tbody.querySelectorAll('.dyn-action-pdf').forEach(btn => {
      btn.addEventListener('click', () => {
        const patId = btn.dataset.patid;
        const patName = btn.dataset.patname;
        if (typeof window.generatePatientPDF === 'function') {
          window.generatePatientPDF(patId, patName);
        }
      });
    });

    tbody.querySelectorAll('.dyn-action-label').forEach(btn => {
      btn.addEventListener('click', () => {
        openThermalLabelModal({
          patientName: btn.dataset.patname,
          patientId: btn.dataset.patid,
          number: btn.dataset.num,
          sector: btn.dataset.sector
        });
      });
    });
  }

  // Filtragem ativa
  function applyFilters() {
    const mod = document.getElementById('dyn-filter-modality')?.value || 'all';
    const nameTerm = (document.getElementById('dyn-filter-name')?.value || '').toLowerCase().trim();
    const sectorTerm = (document.getElementById('dyn-filter-sector')?.value || '').toLowerCase().trim();
    const docTerm = (document.getElementById('dyn-filter-doctor')?.value || '').toLowerCase().trim();
    const plan = document.getElementById('dyn-filter-plan')?.value || 'all';

    const filtered = allPassages.filter(p => {
      if (mod !== 'all' && p.modCode !== mod) return false;
      if (nameTerm && !p.patientName.toLowerCase().includes(nameTerm)) return false;
      if (sectorTerm && !p.sector.toLowerCase().includes(sectorTerm)) return false;
      if (docTerm && !p.doctor.toLowerCase().includes(docTerm)) return false;
      if (plan !== 'all' && !p.plan.toLowerCase().includes(plan.toLowerCase())) return false;
      return true;
    });

    renderTable(filtered);
  }

  // Event listeners
  document.getElementById('dyn-filter-modality')?.addEventListener('change', applyFilters);
  document.getElementById('dyn-filter-name')?.addEventListener('input', applyFilters);
  document.getElementById('dyn-filter-sector')?.addEventListener('input', applyFilters);
  document.getElementById('dyn-filter-doctor')?.addEventListener('input', applyFilters);
  document.getElementById('dyn-filter-plan')?.addEventListener('change', applyFilters);

  document.getElementById('btn-dyn-clear-filters')?.addEventListener('click', () => {
    document.getElementById('dyn-filter-modality').value = 'all';
    document.getElementById('dyn-filter-name').value = '';
    document.getElementById('dyn-filter-sector').value = '';
    document.getElementById('dyn-filter-doctor').value = '';
    document.getElementById('dyn-filter-plan').value = 'all';
    applyFilters();
  });

  document.getElementById('btn-dyn-export-pdf')?.addEventListener('click', () => {
    if (typeof window.exportToPDF === 'function') {
      const headers = ['Número', 'Paciente', 'Data/Hora', 'Convênio', 'Médico', 'Setor', 'Modalidade', 'Status'];
      const rows = allPassages.slice(0, 50).map(p => [
        p.num || p.id,
        p.patientName,
        new Date(p.date).toLocaleString('pt-BR'),
        p.plan,
        p.doctor,
        p.sector,
        p.modLabel,
        p.status
      ]);
      window.exportToPDF(headers, rows, 'Relatório Geral de Atendimentos — Consulta Dinâmica', 'atendimentos_dinamica.pdf');
    } else {
      if (typeof showToast === 'function') showToast('Exportação PDF iniciada.');
    }
  });

  const closeModal = () => modal.remove();
  document.getElementById('close-dynamic-query-modal')?.addEventListener('click', closeModal);
  document.getElementById('btn-dyn-close-footer')?.addEventListener('click', closeModal);

  // Render inicial
  renderTable(allPassages);
}

/**
 * Modal de Impressão de Etiquetas Térmicas Hospitalares (Pulseira e Amostra de Laboratório)
 */
export function openThermalLabelModal({ patientName, patientId, number, sector }) {
  const existing = document.getElementById('thermal-label-modal');
  if (existing) existing.remove();

  const modal = document.createElement('div');
  modal.id = 'thermal-label-modal';
  modal.className = 'modal-overlay';
  modal.style.display = 'flex';
  modal.style.background = 'rgba(5, 7, 20, 0.85)';
  modal.style.backdropFilter = 'blur(8px)';
  modal.style.zIndex = '100050';

  const now = new Date();
  const dateStr = now.toLocaleDateString('pt-BR');
  const timeStr = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  modal.innerHTML = `
    <div class="modal-content" style="max-width: 550px; width: 92%; background: #0f172a; border: 1.5px solid rgba(245,158,11,0.4); border-radius: 16px; padding: 20px; box-shadow: 0 25px 60px rgba(0,0,0,0.85);">
      
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; border-bottom: 1px solid #334155; padding-bottom: 10px;">
        <div style="display: flex; align-items: center; gap: 10px;">
          <div style="width: 36px; height: 36px; border-radius: 10px; background: rgba(245,158,11,0.2); border: 1px solid rgba(245,158,11,0.4); display: flex; align-items: center; justify-content: center; color: #fbbf24;">
            <i class="fa-solid fa-tag"></i>
          </div>
          <h3 style="font-family: Outfit, sans-serif; font-size: 1.15rem; color: #fff; margin: 0;">Emissão de Etiquetas Térmicas</h3>
        </div>
        <button type="button" id="close-thermal-label-modal" style="background: transparent; border: none; color: #94a3b8; font-size: 1.1rem; cursor: pointer;">
          <i class="fa-solid fa-xmark"></i>
        </button>
      </div>

      <!-- Preview da Etiqueta de Pulseira (100x30mm) -->
      <div style="margin-bottom: 18px;">
        <label style="font-size: 0.76rem; font-weight: 700; color: #94a3b8; text-transform: uppercase; margin-bottom: 6px; display: block;">1. Etiqueta da Pulseira do Paciente (Padrão Hospitalar 100x30mm):</label>
        <div id="label-wristband-preview" style="background: #ffffff; color: #000; padding: 12px 16px; border-radius: 6px; font-family: monospace; border: 2px dashed #64748b; display: flex; justify-content: space-between; align-items: center;">
          <div>
            <div style="font-size: 0.72rem; font-weight: bold; letter-spacing: 0.5px;">HEALTH NEXUS HOSPITAL</div>
            <div style="font-size: 0.95rem; font-weight: 900; margin: 2px 0;">${patientName}</div>
            <div style="font-size: 0.75rem;">ATEND: <strong>#${number || '26.6.0001'}</strong> | SETOR: <strong>${sector || 'PRONTO SOCORRO'}</strong></div>
            <div style="font-size: 0.7rem; color: #333;">EMISSÃO: ${dateStr} às ${timeStr}</div>
          </div>
          <div style="text-align: center; border-left: 1px solid #ccc; padding-left: 12px;">
            <i class="fa-solid fa-qrcode" style="font-size: 2.2rem; color: #000;"></i>
            <div style="font-size: 0.6rem; margin-top: 2px;">CFM/SUS</div>
          </div>
        </div>
      </div>

      <!-- Preview da Etiqueta de Amostras de Laboratório (50x30mm) -->
      <div style="margin-bottom: 20px;">
        <label style="font-size: 0.76rem; font-weight: 700; color: #94a3b8; text-transform: uppercase; margin-bottom: 6px; display: block;">2. Etiqueta para Tubos e Frascos de Amostra (50x30mm):</label>
        <div id="label-tube-preview" style="background: #ffffff; color: #000; padding: 10px 14px; border-radius: 6px; font-family: monospace; border: 2px dashed #64748b; display: flex; justify-content: space-between; align-items: center; width: 85%;">
          <div>
            <div style="font-size: 0.8rem; font-weight: 900;">${patientName}</div>
            <div style="font-size: 0.7rem;">REG: #${patientId ? patientId.toString().slice(0, 8) : '001'} · ${dateStr}</div>
            <div style="font-size: 0.65rem; color: #333;"><i class="fa-solid fa-barcode"></i> ||||||||||||||||||||||||</div>
          </div>
          <div>
            <span style="font-size: 0.68rem; font-weight: 700; border: 1px solid #000; padding: 1px 4px;">SADT</span>
          </div>
        </div>
      </div>

      <!-- Botões de Ação -->
      <div style="display: flex; gap: 10px; justify-content: flex-end;">
        <button type="button" id="btn-print-thermal-wristband" class="btn" style="background: linear-gradient(135deg, #0284c7, #0369a1); color: #fff; font-size: 0.82rem; font-weight: 700; padding: 8px 14px; border-radius: 8px; border: none; cursor: pointer; display: inline-flex; align-items: center; gap: 6px;">
          <i class="fa-solid fa-print"></i> Imprimir Pulseira
        </button>
        <button type="button" id="btn-print-thermal-tube" class="btn" style="background: linear-gradient(135deg, #f59e0b, #d97706); color: #fff; font-size: 0.82rem; font-weight: 700; padding: 8px 14px; border-radius: 8px; border: none; cursor: pointer; display: inline-flex; align-items: center; gap: 6px;">
          <i class="fa-solid fa-vial"></i> Imprimir Amostras
        </button>
      </div>

    </div>
  `;

  document.body.appendChild(modal);

  const printLabel = (elementId, title) => {
    const el = document.getElementById(elementId);
    if (!el) return;
    const printWin = window.open('', '_blank', 'width=450,height=300');
    if (!printWin) return;
    printWin.document.write(`
      <html>
        <head>
          <title>${title}</title>
          <style>
            body { font-family: monospace; margin: 0; padding: 8px; display: flex; justify-content: center; align-items: center; }
            @page { margin: 0; }
          </style>
        </head>
        <body>
          ${el.outerHTML}
          <script>window.onload = function() { window.print(); window.close(); };</script>
        </body>
      </html>
    `);
    printWin.document.close();
  };

  document.getElementById('btn-print-thermal-wristband')?.addEventListener('click', () => {
    printLabel('label-wristband-preview', 'Etiqueta de Pulseira');
  });

  document.getElementById('btn-print-thermal-tube')?.addEventListener('click', () => {
    printLabel('label-tube-preview', 'Etiqueta de Tubos e Frascos');
  });

  document.getElementById('close-thermal-label-modal')?.addEventListener('click', () => {
    modal.remove();
  });
}

/**
 * Renderiza a Aba Exclusiva de Consulta Dinâmica no container principal da aplicação (#main-content)
 */
export function renderDynamicQueryTab(container) {
  if (!container) container = document.getElementById('main-content');
  if (!container) return;

  const allPassages = compileAllPassages();
  
  // Contagens por modalidade
  const count66 = allPassages.filter(p => p.modCode === '66').length;
  const count35 = allPassages.filter(p => p.modCode === '35').length;
  const countAmb = allPassages.filter(p => p.modCode === 'ambulatorio').length;
  const countSadt = allPassages.filter(p => p.modCode === 'sadt').length;

  container.innerHTML = `
    <div class="content-wrapper" style="padding: 24px; max-width: 1600px; margin: 0 auto; width: 100%;">
      
      <!-- Cabeçalho da Aba -->
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; flex-wrap: wrap; gap: 16px;">
        <div style="display: flex; align-items: center; gap: 16px;">
          <div style="width: 52px; height: 52px; border-radius: 14px; background: rgba(56, 189, 248, 0.15); border: 1.5px solid rgba(56, 189, 248, 0.4); display: flex; align-items: center; justify-content: center; color: #38bdf8; font-size: 1.5rem; box-shadow: 0 4px 20px rgba(56,189,248,0.2);">
            <i class="fa-solid fa-magnifying-glass-chart"></i>
          </div>
          <div>
            <h2 style="font-family: Outfit, sans-serif; font-size: 1.5rem; font-weight: 700; color: #fff; margin: 0; display: flex; align-items: center; gap: 10px;">
              Consulta Dinâmica de Atendimentos
              <span style="font-size: 0.72rem; font-weight: 700; background: rgba(56,189,248,0.2); color: #38bdf8; border: 1px solid rgba(56,189,248,0.4); padding: 3px 10px; border-radius: 20px; text-transform: uppercase;">Localizador Geral</span>
            </h2>
            <div style="font-size: 0.85rem; color: var(--text-secondary); margin-top: 4px;">
              Pesquisa, auditoria e rastreabilidade unificada de passagens hospitalares (PS, Internação, Ambulatório e SADT)
            </div>
          </div>
        </div>

        <div style="display: flex; gap: 10px; align-items: center; flex-wrap: wrap;">
          <button type="button" id="tab-dyn-btn-refresh" class="btn" style="background: var(--bg-tertiary); border: 1px solid var(--border-color); color: var(--text-primary); padding: 9px 16px; border-radius: 10px; font-size: 0.84rem; cursor: pointer; display: inline-flex; align-items: center; gap: 8px;">
            <i class="fa-solid fa-rotate"></i> Atualizar Dados
          </button>
          <button type="button" id="tab-dyn-btn-export-pdf" class="btn" style="background: linear-gradient(135deg, #0284c7, #0369a1); border: none; color: #fff; padding: 9px 18px; border-radius: 10px; font-size: 0.84rem; font-weight: 700; cursor: pointer; display: inline-flex; align-items: center; gap: 8px; box-shadow: 0 4px 15px rgba(2,132,199,0.35);">
            <i class="fa-solid fa-file-pdf"></i> Exportar Relatório PDF
          </button>
        </div>
      </div>

      <!-- Cards de Métricas Rápidas por Modalidade (Clicáveis para Filtrar) -->
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 14px; margin-bottom: 20px;">
        <div class="metric-card dyn-stat-pill" data-mod="all" style="background: var(--bg-card); border: 1px solid rgba(255,255,255,0.08); border-radius: 14px; padding: 16px; cursor: pointer; transition: 0.2s;" onmouseover="this.style.borderColor='#38bdf8'" onmouseout="this.style.borderColor='rgba(255,255,255,0.08)'">
          <div style="font-size: 0.74rem; font-weight: 700; color: #94a3b8; text-transform: uppercase;">Total Geral</div>
          <div style="font-size: 1.6rem; font-weight: 800; color: #fff; margin-top: 4px;">${allPassages.length}</div>
          <div style="font-size: 0.72rem; color: #38bdf8; margin-top: 4px;">Todas as passagens</div>
        </div>

        <div class="metric-card dyn-stat-pill" data-mod="66" style="background: var(--bg-card); border: 1px solid rgba(239,68,68,0.25); border-radius: 14px; padding: 16px; cursor: pointer; transition: 0.2s;" onmouseover="this.style.borderColor='#ef4444'" onmouseout="this.style.borderColor='rgba(239,68,68,0.25)'">
          <div style="font-size: 0.74rem; font-weight: 700; color: #fca5a5; text-transform: uppercase;">66 - Pronto Socorro</div>
          <div style="font-size: 1.6rem; font-weight: 800; color: #ef4444; margin-top: 4px;">${count66}</div>
          <div style="font-size: 0.72rem; color: #f87171; margin-top: 4px;">Urgência &amp; Emergência</div>
        </div>

        <div class="metric-card dyn-stat-pill" data-mod="35" style="background: var(--bg-card); border: 1px solid rgba(59,130,246,0.25); border-radius: 14px; padding: 16px; cursor: pointer; transition: 0.2s;" onmouseover="this.style.borderColor='#3b82f6'" onmouseout="this.style.borderColor='rgba(59,130,246,0.25)'">
          <div style="font-size: 0.74rem; font-weight: 700; color: #93c5fd; text-transform: uppercase;">35 - Internações</div>
          <div style="font-size: 1.6rem; font-weight: 800; color: #3b82f6; margin-top: 4px;">${count35}</div>
          <div style="font-size: 0.72rem; color: #60a5fa; margin-top: 4px;">Enfermaria &amp; UTI</div>
        </div>

        <div class="metric-card dyn-stat-pill" data-mod="ambulatorio" style="background: var(--bg-card); border: 1px solid rgba(16,185,129,0.25); border-radius: 14px; padding: 16px; cursor: pointer; transition: 0.2s;" onmouseover="this.style.borderColor='#10b981'" onmouseout="this.style.borderColor='rgba(16,185,129,0.25)'">
          <div style="font-size: 0.74rem; font-weight: 700; color: #86efac; text-transform: uppercase;">Ambulatório</div>
          <div style="font-size: 1.6rem; font-weight: 800; color: #10b981; margin-top: 4px;">${countAmb}</div>
          <div style="font-size: 0.72rem; color: #34d399; margin-top: 4px;">Consultas Eletivas</div>
        </div>

        <div class="metric-card dyn-stat-pill" data-mod="sadt" style="background: var(--bg-card); border: 1px solid rgba(56,189,248,0.25); border-radius: 14px; padding: 16px; cursor: pointer; transition: 0.2s;" onmouseover="this.style.borderColor='#38bdf8'" onmouseout="this.style.borderColor='rgba(56,189,248,0.25)'">
          <div style="font-size: 0.74rem; font-weight: 700; color: #7dd3fc; text-transform: uppercase;">SADT (Externo)</div>
          <div style="font-size: 1.6rem; font-weight: 800; color: #38bdf8; margin-top: 4px;">${countSadt}</div>
          <div style="font-size: 0.72rem; color: #38bdf8; margin-top: 4px;">Exames &amp; Apoio Diagnóstico</div>
        </div>
      </div>

      <!-- Card de Filtros Avançados -->
      <div style="background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 16px; padding: 18px 22px; margin-bottom: 20px; box-shadow: var(--shadow-sm);">
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 14px; align-items: end;">
          
          <div>
            <label style="font-size: 0.74rem; font-weight: 700; color: #94a3b8; text-transform: uppercase; margin-bottom: 5px; display: block;">Modalidade:</label>
            <select id="tab-dyn-filter-modality" class="form-input" style="width: 100%; font-size: 0.82rem; padding: 8px 12px; background: var(--bg-tertiary); border-color: var(--border-color); color: #fff; border-radius: 8px;">
              <option value="all">Todas as Modalidades</option>
              <option value="66">66 - Pronto Socorro</option>
              <option value="35">35 - Internação</option>
              <option value="ambulatorio">Ambulatório / Eletivo</option>
              <option value="sadt">Exames / SADT (Paciente Externo)</option>
            </select>
          </div>

          <div>
            <label style="font-size: 0.74rem; font-weight: 700; color: #94a3b8; text-transform: uppercase; margin-bottom: 5px; display: block;">Nome do Paciente / CPF:</label>
            <input type="text" id="tab-dyn-filter-name" class="form-input" placeholder="Buscar por paciente ou documento..." style="width: 100%; font-size: 0.82rem; padding: 8px 12px; background: var(--bg-tertiary); border-color: var(--border-color); color: #fff; border-radius: 8px;">
          </div>

          <div>
            <label style="font-size: 0.74rem; font-weight: 700; color: #94a3b8; text-transform: uppercase; margin-bottom: 5px; display: block;">Setor / Ala Hospitalar:</label>
            <input type="text" id="tab-dyn-filter-sector" class="form-input" placeholder="Ex: Pronto Socorro, Tomografia, UTI..." style="width: 100%; font-size: 0.82rem; padding: 8px 12px; background: var(--bg-tertiary); border-color: var(--border-color); color: #fff; border-radius: 8px;">
          </div>

          <div>
            <label style="font-size: 0.74rem; font-weight: 700; color: #94a3b8; text-transform: uppercase; margin-bottom: 5px; display: block;">Médico Responsável:</label>
            <input type="text" id="tab-dyn-filter-doctor" class="form-input" placeholder="Nome do profissional..." style="width: 100%; font-size: 0.82rem; padding: 8px 12px; background: var(--bg-tertiary); border-color: var(--border-color); color: #fff; border-radius: 8px;">
          </div>

          <div>
            <label style="font-size: 0.74rem; font-weight: 700; color: #94a3b8; text-transform: uppercase; margin-bottom: 5px; display: block;">Convênio:</label>
            <select id="tab-dyn-filter-plan" class="form-input" style="width: 100%; font-size: 0.82rem; padding: 8px 12px; background: var(--bg-tertiary); border-color: var(--border-color); color: #fff; border-radius: 8px;">
              <option value="all">Todos os Convênios</option>
              <option value="SUS">SUS / UNIFICAD</option>
              <option value="Unimed">Unimed</option>
              <option value="Bradesco">Bradesco Saúde</option>
              <option value="Amil">Amil</option>
              <option value="Particular">Particular</option>
            </select>
          </div>

          <div>
            <button type="button" id="tab-dyn-btn-clear" class="btn" style="width: 100%; font-size: 0.82rem; padding: 8px 14px; background: rgba(255,255,255,0.06); border: 1px solid var(--border-color); color: #cbd5e1; border-radius: 8px; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px;">
              <i class="fa-solid fa-eraser"></i> Limpar Filtros
            </button>
          </div>

        </div>
      </div>

      <!-- Barra de Controle de Registros & Tabela -->
      <div style="background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 16px; overflow: hidden; box-shadow: var(--shadow-sm);">
        <div style="padding: 12px 22px; background: rgba(255,255,255,0.02); display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border-color); flex-wrap: wrap; gap: 10px;">
          <div style="font-size: 0.84rem; color: #94a3b8;">
            Exibindo <strong id="tab-dyn-count-filtered" style="color: #38bdf8;">${allPassages.length}</strong> de <span>${allPassages.length}</span> atendimentos localizados
          </div>
          <div style="font-size: 0.78rem; color: #64748b;">
            Ordenação: <strong style="color: #e2e8f0;">Cronológica Decrescente (Mais Recente no Topo)</strong>
          </div>
        </div>

        <div style="overflow-x: auto; padding: 0 10px 10px; -webkit-overflow-scrolling: touch;">
          <table class="table" style="width: 100%; min-width: 1000px; border-collapse: collapse; margin-top: 4px; font-size: 0.83rem;">
            <thead>
              <tr style="border-bottom: 2px solid var(--border-color); text-align: left; color: #94a3b8; font-size: 0.76rem; text-transform: uppercase;">
                <th style="padding: 12px 10px;">Número</th>
                <th style="padding: 12px 10px;">Nome do Paciente</th>
                <th style="padding: 12px 10px;">Data / Hora</th>
                <th style="padding: 12px 10px;">Convênio</th>
                <th style="padding: 12px 10px;">Médico</th>
                <th style="padding: 12px 10px;">Setor</th>
                <th style="padding: 12px 10px;">Modalidade</th>
                <th style="padding: 12px 10px;">Conclusão</th>
                <th style="padding: 12px 10px; text-align: right;">Ações Rápidas</th>
              </tr>
            </thead>
            <tbody id="tab-dyn-tbody">
              <!-- Renderizado via JS -->
            </tbody>
          </table>
        </div>
      </div>

    </div>
  `;

  // Função de renderização das linhas na aba
  function renderTabRows(items) {
    const tbody = document.getElementById('tab-dyn-tbody');
    const countEl = document.getElementById('tab-dyn-count-filtered');
    if (!tbody) return;

    if (countEl) countEl.textContent = items.length;

    if (items.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="9" style="text-align: center; padding: 50px 20px; color: var(--text-muted);">
            <i class="fa-solid fa-magnifying-glass" style="font-size: 2.2rem; margin-bottom: 12px; color: #64748b; display: block;"></i>
            Nenhum atendimento localizado com os filtros selecionados.
          </td>
        </tr>`;
      return;
    }

    tbody.innerHTML = items.map(p => {
      const dateFormatted = p.date ? new Date(p.date).toLocaleString('pt-BR') : '—';
      const modColor = p.modCode === '66' ? '#ef4444' : (p.modCode === '35' ? '#3b82f6' : (p.modCode === 'sadt' ? '#38bdf8' : '#10b981'));
      const statusColor = p.status.includes('LIBERADO') || p.status.includes('ALTA') ? '#34d399' : (p.status.includes('AGUARDANDO') ? '#38bdf8' : '#fbbf24');

      return `
        <tr style="border-bottom: 1px solid rgba(255,255,255,0.05); transition: 0.15s;" onmouseover="this.style.background='rgba(255,255,255,0.03)'" onmouseout="this.style.background='transparent'">
          <td style="padding: 12px 10px; font-family: monospace; font-size: 0.78rem; color: #a5b4fc; font-weight: 700;">
            ${p.num || p.id}
          </td>
          <td style="padding: 12px 10px; font-weight: 600; color: #fff;">
            ${p.patientName}
          </td>
          <td style="padding: 12px 10px; color: #cbd5e1; font-size: 0.8rem;">
            ${dateFormatted}
          </td>
          <td style="padding: 12px 10px; color: #94a3b8; font-size: 0.78rem;">
            <span style="background: rgba(255,255,255,0.06); padding: 2px 7px; border-radius: 4px; border: 1px solid rgba(255,255,255,0.1);">${p.plan}</span>
          </td>
          <td style="padding: 12px 10px; color: #e2e8f0; font-size: 0.8rem;">
            ${p.doctor}
          </td>
          <td style="padding: 12px 10px; color: #cbd5e1; font-size: 0.8rem;">
            ${p.sector}
          </td>
          <td style="padding: 12px 10px;">
            <span style="background: ${modColor}20; color: ${modColor}; border: 1px solid ${modColor}50; padding: 3px 9px; border-radius: 12px; font-size: 0.72rem; font-weight: 700;">
              ${p.modLabel}
            </span>
          </td>
          <td style="padding: 12px 10px;">
            <span style="color: ${statusColor}; font-weight: 700; font-size: 0.74rem;">
              ● ${p.status}
            </span>
          </td>
          <td style="padding: 12px 10px; text-align: right; white-space: nowrap;">
            <button type="button" class="btn btn-sm tab-dyn-action-pep" data-patid="${p.patientId || p.id}" data-patname="${p.patientName}" style="padding: 5px 9px; font-size: 0.74rem; border-radius: 6px; background: rgba(2,132,199,0.2); color: #38bdf8; border: 1px solid rgba(2,132,199,0.4); cursor: pointer; margin-right: 4px;" title="Abrir Prontuário Eletrônico">
              <i class="fa-solid fa-stethoscope"></i> PEP
            </button>
            <button type="button" class="btn btn-sm tab-dyn-action-hist" data-patid="${p.patientId || p.id}" data-patname="${p.patientName}" style="padding: 5px 9px; font-size: 0.74rem; border-radius: 6px; background: rgba(139,92,246,0.2); color: #c4b5fd; border: 1px solid rgba(139,92,246,0.4); cursor: pointer; margin-right: 4px;" title="Ver Histórico Completo">
              <i class="fa-solid fa-clock-rotate-left"></i> Histórico
            </button>
            <button type="button" class="btn btn-sm tab-dyn-action-pdf" data-patid="${p.patientId || p.id}" data-patname="${p.patientName}" style="padding: 5px 9px; font-size: 0.74rem; border-radius: 6px; background: rgba(239,68,68,0.2); color: #fca5a5; border: 1px solid rgba(239,68,68,0.4); cursor: pointer; margin-right: 4px;" title="Exportar Prontuário em PDF com Exames">
              <i class="fa-solid fa-file-pdf"></i>
            </button>
            <button type="button" class="btn btn-sm tab-dyn-action-label" data-patid="${p.patientId || p.id}" data-patname="${p.patientName}" data-num="${p.num || p.id}" data-sector="${p.sector}" style="padding: 5px 9px; font-size: 0.74rem; border-radius: 6px; background: rgba(245,158,11,0.2); color: #fbbf24; border: 1px solid rgba(245,158,11,0.4); cursor: pointer;" title="Imprimir Etiqueta de Pulseira / Amostra">
              <i class="fa-solid fa-tag"></i>
            </button>
          </td>
        </tr>`;
    }).join('');

    tbody.querySelectorAll('.tab-dyn-action-pep').forEach(btn => {
      btn.addEventListener('click', () => {
        const pat = btn.dataset.patid || btn.dataset.patname;
        if (typeof window.openPEPModal === 'function') window.openPEPModal(pat, 'soap');
      });
    });

    tbody.querySelectorAll('.tab-dyn-action-hist').forEach(btn => {
      btn.addEventListener('click', () => {
        const patId = btn.dataset.patid;
        const patName = btn.dataset.patname;
        if (typeof window.openPatientHistoryModal === 'function') window.openPatientHistoryModal(patId, patName);
      });
    });

    tbody.querySelectorAll('.tab-dyn-action-pdf').forEach(btn => {
      btn.addEventListener('click', () => {
        const patId = btn.dataset.patid;
        const patName = btn.dataset.patname;
        if (typeof window.generatePatientPDF === 'function') {
          window.generatePatientPDF(patId, patName);
        }
      });
    });

    tbody.querySelectorAll('.tab-dyn-action-label').forEach(btn => {
      btn.addEventListener('click', () => {
        openThermalLabelModal({
          patientName: btn.dataset.patname,
          patientId: btn.dataset.patid,
          number: btn.dataset.num,
          sector: btn.dataset.sector
        });
      });
    });
  }

  // Filtragem dinâmica na aba
  function applyTabFilters() {
    const mod = document.getElementById('tab-dyn-filter-modality')?.value || 'all';
    const name = (document.getElementById('tab-dyn-filter-name')?.value || '').toLowerCase().trim();
    const sector = (document.getElementById('tab-dyn-filter-sector')?.value || '').toLowerCase().trim();
    const doctor = (document.getElementById('tab-dyn-filter-doctor')?.value || '').toLowerCase().trim();
    const plan = document.getElementById('tab-dyn-filter-plan')?.value || 'all';

    const filtered = allPassages.filter(p => {
      if (mod !== 'all' && p.modCode !== mod) return false;
      if (name && !p.patientName.toLowerCase().includes(name)) return false;
      if (sector && !p.sector.toLowerCase().includes(sector)) return false;
      if (doctor && !p.doctor.toLowerCase().includes(doctor)) return false;
      if (plan !== 'all' && !p.plan.toLowerCase().includes(plan.toLowerCase())) return false;
      return true;
    });

    renderTabRows(filtered);
  }

  // Event Listeners dos filtros
  ['tab-dyn-filter-modality', 'tab-dyn-filter-plan'].forEach(id => {
    document.getElementById(id)?.addEventListener('change', applyTabFilters);
  });
  ['tab-dyn-filter-name', 'tab-dyn-filter-sector', 'tab-dyn-filter-doctor'].forEach(id => {
    document.getElementById(id)?.addEventListener('input', applyTabFilters);
  });

  // Limpar filtros
  document.getElementById('tab-dyn-btn-clear')?.addEventListener('click', () => {
    if (document.getElementById('tab-dyn-filter-modality')) document.getElementById('tab-dyn-filter-modality').value = 'all';
    if (document.getElementById('tab-dyn-filter-name')) document.getElementById('tab-dyn-filter-name').value = '';
    if (document.getElementById('tab-dyn-filter-sector')) document.getElementById('tab-dyn-filter-sector').value = '';
    if (document.getElementById('tab-dyn-filter-doctor')) document.getElementById('tab-dyn-filter-doctor').value = '';
    if (document.getElementById('tab-dyn-filter-plan')) document.getElementById('tab-dyn-filter-plan').value = 'all';
    renderTabRows(allPassages);
  });

  // Atualizar
  document.getElementById('tab-dyn-btn-refresh')?.addEventListener('click', () => {
    renderDynamicQueryTab(container);
  });

  // Exportar PDF
  document.getElementById('tab-dyn-btn-export-pdf')?.addEventListener('click', () => {
    if (typeof window.exportToPDF === 'function') {
      const headers = ['Número', 'Paciente', 'Data/Hora', 'Convênio', 'Médico', 'Setor', 'Modalidade', 'Status'];
      const rows = allPassages.slice(0, 50).map(p => [
        p.num || p.id,
        p.patientName,
        new Date(p.date).toLocaleString('pt-BR'),
        p.plan,
        p.doctor,
        p.sector,
        p.modLabel,
        p.status
      ]);
      window.exportToPDF(headers, rows, 'Relatório Geral de Atendimentos — Consulta Dinâmica', 'atendimentos_dinamica.pdf');
    } else {
      if (typeof showToast === 'function') showToast('Exportação PDF iniciada.');
    }
  });

  // Clicar nos cards de modalidade filtra automaticamente
  container.querySelectorAll('.dyn-stat-pill').forEach(pill => {
    pill.addEventListener('click', () => {
      const mod = pill.dataset.mod;
      const select = document.getElementById('tab-dyn-filter-modality');
      if (select) {
        select.value = mod;
        applyTabFilters();
      }
    });
  });

  // Render inicial
  renderTabRows(allPassages);
}

// Expor globalmente
if (typeof window !== 'undefined') {
  window.openDynamicEncounterQueryModal = openDynamicEncounterQueryModal;
  window.openThermalLabelModal = openThermalLabelModal;
  window.renderDynamicQueryTab = renderDynamicQueryTab;
}

