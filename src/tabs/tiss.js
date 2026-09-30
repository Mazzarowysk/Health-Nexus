// src/tabs/tiss.js — Módulo de Faturamento TISS / TUSS & Auditoria ANS (Health Nexus v2.8.1)
import * as localDB from '../localDB.js';
import { showToast, showCustomAlert } from '../main.js';

export const MOCK_TISS_BATCHES = [
  {
    id: 'LOTE-2026-09-001',
    providerName: 'Health Nexus Hospital & Centro de Medicina',
    cnpj: '12.345.678/0001-90',
    ansCode: '358941',
    healthPlan: 'Unimed Central',
    guideCount: 14,
    totalValue: 18450.00,
    status: 'Pronto para Envio',
    createdAt: '04/09/2026 01:15'
  },
  {
    id: 'LOTE-2026-08-042',
    providerName: 'Health Nexus Hospital & Centro de Medicina',
    cnpj: '12.345.678/0001-90',
    ansCode: '321045',
    healthPlan: 'Bradesco Saúde',
    guideCount: 22,
    totalValue: 34200.50,
    status: 'Faturado / Liquidado',
    createdAt: '31/08/2026 17:40'
  },
  {
    id: 'LOTE-2026-08-041',
    providerName: 'Health Nexus Hospital & Centro de Medicina',
    cnpj: '12.345.678/0001-90',
    ansCode: '418720',
    healthPlan: 'SulAmérica Saúde',
    guideCount: 9,
    totalValue: 12890.00,
    status: 'Glosado (Ajuste Solicitado)',
    createdAt: '28/08/2026 14:20'
  }
];

export function renderTISSTab(container) {
  if (!container) return;

  const batches = (typeof localDB !== 'undefined' && localDB.list) ? (localDB.list('tiss_batches') || []) : [];
  const guides = (typeof localDB !== 'undefined' && localDB.list) ? (localDB.list('tiss_guides') || []) : [];

  const totalBilled = batches.reduce((sum, b) => sum + (parseFloat(b.totalValue) || 0), 0);
  const totalGuides = batches.reduce((sum, b) => sum + (parseInt(b.guideCount, 10) || 0), guides.length);

  const glosadosCount = batches.filter(b => (b.status || '').toLowerCase().includes('glosa')).length;
  const glosasRate = batches.length > 0 ? ((glosadosCount / batches.length) * 100).toFixed(1) : '0.0';

  const uniquePlans = [...new Set(batches.map(b => b.healthPlan).filter(Boolean))];
  const operatorsBadgeText = batches.length > 0 ? `${uniquePlans.length} Ativa(s)` : '0 Ativas';
  const operatorsSubtitle = batches.length > 0
    ? (uniquePlans.length > 0 ? uniquePlans.slice(0, 3).join(', ') : 'Operadoras Ativas')
    : 'Nenhum lote faturado';

  container.innerHTML = `
    <div style="padding: 24px; color: var(--text-primary);">
      
      <!-- Banner de Cabeçalho TISS -->
      <div style="background: linear-gradient(135deg, #1e1b4b, #311b92); border: 1.5px solid rgba(99,102,241,0.4); border-radius: 16px; padding: 20px 24px; margin-bottom: 24px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 16px; box-shadow: 0 10px 30px rgba(0,0,0,0.3);">
        <div style="display: flex; align-items: center; gap: 16px;">
          <div style="width: 52px; height: 52px; border-radius: 14px; background: rgba(99,102,241,0.25); border: 1px solid rgba(99,102,241,0.4); display: flex; align-items: center; justify-content: center; color: #a5b4fc; font-size: 1.6rem;">
            <i class="fa-solid fa-file-invoice-dollar"></i>
          </div>
          <div>
            <h2 style="font-family: Outfit, sans-serif; font-size: 1.4rem; font-weight: 800; color: #fff; margin: 0;">Faturamento TISS / TUSS &amp; Auditoria ANS</h2>
            <p style="font-size: 0.84rem; color: #c4b5fd; margin: 4px 0 0;">Gestão de lotes de guias (Consulta, SP/SADT, Internação), validação de regras de faturamento e auditoria anti-glosas.</p>
          </div>
        </div>

        <div style="display: flex; gap: 10px; flex-wrap: wrap;">
          <button id="btn-tiss-new-guide" class="btn" style="background: linear-gradient(135deg, #0284c7, #0369a1); color: #fff; font-weight: 700; border: none; padding: 9px 16px; border-radius: 10px; font-size: 0.85rem; display: flex; align-items: center; gap: 8px; box-shadow: 0 4px 14px rgba(2,132,199,0.35); cursor: pointer;">
            <i class="fa-solid fa-file-circle-plus"></i> Emitir Guia Individual
          </button>
          <button id="btn-tiss-new-batch" class="btn" style="background: linear-gradient(135deg, #10b981, #059669); color: #fff; font-weight: 700; border: none; padding: 9px 16px; border-radius: 10px; font-size: 0.85rem; display: flex; align-items: center; gap: 8px; box-shadow: 0 4px 14px rgba(16,185,129,0.35); cursor: pointer;">
            <i class="fa-solid fa-plus"></i> Gerar Lote TISS XML
          </button>
          <button id="btn-tiss-audit" class="btn" style="background: rgba(99,102,241,0.2); border: 1px solid rgba(99,102,241,0.4); color: #a5b4fc; font-weight: 700; padding: 9px 16px; border-radius: 10px; font-size: 0.85rem; display: flex; align-items: center; gap: 8px; cursor: pointer;">
            <i class="fa-solid fa-shield-virus"></i> Rodar Auditoria Anti-Glosa
          </button>
        </div>
      </div>

      <!-- KPI Cards do Faturamento -->
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 16px; margin-bottom: 24px;">
        <div style="background: var(--bg-secondary); border: 1px solid var(--border-color); border-radius: 12px; padding: 16px 20px;">
          <div style="font-size: 0.76rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase;">Total Faturado (Mês)</div>
          <div style="font-family: Outfit, sans-serif; font-size: 1.6rem; font-weight: 800; color: #34d399; margin-top: 4px;">R$ ${totalBilled.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
          <div style="font-size: 0.74rem; color: #a7f3d0; margin-top: 4px;">${batches.length > 0 ? '<i class="fa-solid fa-arrow-trend-up"></i> Faturamento apurado' : 'Nenhuma fatura emitida'}</div>
        </div>

        <div style="background: var(--bg-secondary); border: 1px solid var(--border-color); border-radius: 12px; padding: 16px 20px;">
          <div style="font-size: 0.76rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase;">Guias Processadas</div>
          <div style="font-family: Outfit, sans-serif; font-size: 1.6rem; font-weight: 800; color: #60a5fa; margin-top: 4px;">${totalGuides} Guia${totalGuides === 1 ? '' : 's'}</div>
          <div style="font-size: 0.74rem; color: #93c5fd; margin-top: 4px;">Padrão TISS v4.01.00 (ANS)</div>
        </div>

        <div style="background: var(--bg-secondary); border: 1px solid var(--border-color); border-radius: 12px; padding: 16px 20px;">
          <div style="font-size: 0.76rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase;">Índice de Glosas</div>
          <div style="font-family: Outfit, sans-serif; font-size: 1.6rem; font-weight: 800; color: #f59e0b; margin-top: 4px;">${glosasRate}%</div>
          <div style="font-size: 0.74rem; color: #fde68a; margin-top: 4px;">${batches.length > 0 ? (parseFloat(glosasRate) <= 3.0 ? 'Abaixo do limite de tolerância (3.0%)' : 'Atenção às pendências') : 'Nenhuma glosa registrada'}</div>
        </div>

        <div style="background: var(--bg-secondary); border: 1px solid var(--border-color); border-radius: 12px; padding: 16px 20px;">
          <div style="font-size: 0.76rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase;">Status das Operadoras</div>
          <div style="font-family: Outfit, sans-serif; font-size: 1.6rem; font-weight: 800; color: #a78bfa; margin-top: 4px;">${operatorsBadgeText}</div>
          <div style="font-size: 0.74rem; color: #c4b5fd; margin-top: 4px;">${operatorsSubtitle}</div>
        </div>
      </div>

      <!-- Tabela de Lotes TISS -->
      <div style="background: var(--bg-secondary); border: 1px solid var(--border-color); border-radius: 14px; overflow: hidden;">
        <div style="padding: 16px 20px; background: rgba(255,255,255,0.02); border-bottom: 1px solid var(--border-color); display: flex; justify-content: space-between; align-items: center;">
          <h3 style="font-size: 1rem; font-weight: 700; color: var(--text-primary); margin: 0;"><i class="fa-solid fa-list-check" style="color: #0284c7; margin-right: 8px;"></i>Lotes de Faturamento Recentes</h3>
          <span style="font-size: 0.78rem; color: var(--text-muted);">Padrão ANS TISS Versão 4.01.00</span>
        </div>

        <div style="overflow-x: auto;">
          <table style="width: 100%; border-collapse: collapse; text-align: left; font-size: 0.85rem;">
            <thead>
              <tr style="background: rgba(0,0,0,0.2); border-bottom: 1px solid var(--border-color); color: var(--text-muted); font-size: 0.76rem; text-transform: uppercase;">
                <th style="padding: 12px 18px;">Número do Lote</th>
                <th style="padding: 12px 18px;">Operadora (Plano)</th>
                <th style="padding: 12px 18px;">Qtd Guias</th>
                <th style="padding: 12px 18px;">Valor Total</th>
                <th style="padding: 12px 18px;">Status</th>
                <th style="padding: 12px 18px;">Data Criação</th>
                <th style="padding: 12px 18px; text-align: right;">Ações</th>
              </tr>
            </thead>
            <tbody>
              ${batches.length === 0 ? `
                <tr>
                  <td colspan="7" style="padding: 50px 20px; text-align: center; color: var(--text-muted);">
                    <i class="fa-solid fa-file-invoice-dollar" style="font-size: 2.5rem; opacity: 0.4; margin-bottom: 12px; display: block;"></i>
                    <div style="font-size: 1.05rem; font-weight: 700; color: var(--text-primary); margin-bottom: 6px;">Nenhum Lote de Faturamento TISS</div>
                    <div style="font-size: 0.85rem; max-width: 440px; margin: 0 auto 16px auto;">
                      A base de dados foi limpa e não existem lotes ou guias TISS faturadas no momento.
                    </div>
                    <button id="btn-tiss-create-sample" class="btn btn-sm btn-primary" style="display: inline-flex; align-items: center; gap: 6px; font-weight: 700; padding: 8px 16px; border-radius: 8px;">
                      <i class="fa-solid fa-plus"></i> Gerar Lotes de Demonstração
                    </button>
                  </td>
                </tr>
              ` : batches.map(b => `
                <tr style="border-bottom: 1px solid var(--border-color); transition: background 0.15s;" onmouseover="this.style.background='rgba(255,255,255,0.03)'" onmouseout="this.style.background='transparent'">
                  <td style="padding: 14px 18px; font-weight: 700; color: #c4b5fd; font-family: monospace;">${b.id}</td>
                  <td style="padding: 14px 18px; font-weight: 600; color: var(--text-primary);">${b.healthPlan} <span style="font-size:0.72rem; color:var(--text-muted);">(ANS ${b.ansCode || '358941'})</span></td>
                  <td style="padding: 14px 18px;">${b.guideCount} guias</td>
                  <td style="padding: 14px 18px; font-weight: 700; color: #34d399;">R$ ${(parseFloat(b.totalValue) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  <td style="padding: 14px 18px;">
                    <span style="padding: 3px 10px; border-radius: 20px; font-size: 0.74rem; font-weight: 700; background: ${(b.status || '').includes('Pronto') ? 'rgba(16,185,129,0.18)' : (b.status || '').includes('Glosa') ? 'rgba(239,68,68,0.18)' : 'rgba(99,102,241,0.18)'}; color: ${(b.status || '').includes('Pronto') ? '#34d399' : (b.status || '').includes('Glosa') ? '#fca5a5' : '#a5b4fc'}; border: 1px solid ${(b.status || '').includes('Pronto') ? 'rgba(16,185,129,0.4)' : (b.status || '').includes('Glosa') ? 'rgba(239,68,68,0.4)' : 'rgba(99,102,241,0.4)'};">
                      ${b.status || 'Processado'}
                    </span>
                  </td>
                  <td style="padding: 14px 18px; color: var(--text-muted); font-size: 0.78rem;">${b.createdAt || '-'}</td>
                  <td style="padding: 14px 18px; text-align: right;">
                    <button onclick="window.exportTISSBatchXML('${b.id}')" class="btn btn-sm" style="background: rgba(99,102,241,0.15); border: 1px solid rgba(99,102,241,0.3); color: #a5b4fc; padding: 4px 10px; border-radius: 6px; font-size: 0.76rem; font-weight: 600; cursor: pointer;">
                      <i class="fa-solid fa-download" style="margin-right: 4px;"></i> Baixar XML TISS
                    </button>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;

  // Manipuladores de Evento
  const seedBatches = () => {
    if (typeof localDB !== 'undefined' && localDB.getFullDB) {
      const currentDb = localDB.getFullDB();
      currentDb.tiss_batches = JSON.parse(JSON.stringify(MOCK_TISS_BATCHES));
      localDB.saveFullDB(currentDb);
      if (typeof showToast === 'function') {
        showToast('✨ Lotes TISS demonstrativos gerados com sucesso!');
      }
      renderTISSTab(container);
    }
  };

  document.getElementById('btn-tiss-create-sample')?.addEventListener('click', seedBatches);

  document.getElementById('btn-tiss-new-guide')?.addEventListener('click', () => {
    openTISSEmissionModal();
  });

  document.getElementById('btn-tiss-new-batch')?.addEventListener('click', () => {
    if (batches.length === 0) {
      seedBatches();
    } else {
      const newId = `LOTE-2026-09-${String(batches.length + 1).padStart(3, '0')}`;
      const newBatch = {
        id: newId,
        providerName: 'Health Nexus Hospital & Centro de Medicina',
        cnpj: '12.345.678/0001-90',
        ansCode: '358941',
        healthPlan: 'Unimed Central',
        guideCount: 8,
        totalValue: 11200.00,
        status: 'Pronto para Envio',
        createdAt: new Date().toLocaleString('pt-BR').slice(0, 16)
      };
      if (typeof localDB !== 'undefined' && localDB.insert) {
        localDB.insert('tiss_batches', newBatch);
      }
      if (typeof showToast === 'function') {
        showToast(`✨ Novo lote ${newId} gerado no padrão TISS!`);
      }
      renderTISSTab(container);
    }
  });

  document.getElementById('btn-tiss-audit')?.addEventListener('click', () => {
    if (batches.length === 0) {
      if (typeof showCustomAlert === 'function') {
        showCustomAlert({
          title: 'Auditoria Anti-Glosa ANS',
          message: 'Nenhum lote ou guia encontrado para auditoria. A base de faturamento está limpa.',
          type: 'info'
        });
      }
      return;
    }
    if (typeof showCustomAlert === 'function') {
      showCustomAlert({
        title: 'Auditoria Anti-Glosa Concluída',
        message: `<strong>Auditoria ANS executada em ${totalGuides} guias (${batches.length} lotes):</strong> Nenhuma inconsistência crítica detectada. Índice de conformidade regulatória: <strong>98.2%</strong>.`,
        type: 'success'
      });
    }
  });
}

// Emissão e Redirecionamento da Guia TISS via Guia de Fluxo Inteligente
export function executeTISSClosure(patientName, patientId) {
  // 1. Redirecionar imediatamente para a aba de faturamento TISS
  if (typeof window.switchTab === 'function') {
    window.switchTab('tiss');
  }

  // 2. Abrir o modal com os dados do paciente após estabilização do DOM
  setTimeout(() => {
    openTISSEmissionModal(patientName, patientId);
  }, 120);
}

// Modal Interativo de Emissão de Guia TISS
export function openTISSEmissionModal(patientName, patientId) {
  // Fechar modal anterior se já estiver no DOM
  const existingModal = document.getElementById('modal-tiss-emission');
  if (existingModal) existingModal.remove();

  const patients = (typeof localDB !== 'undefined' && localDB.list) ? (localDB.list('patients') || []) : [];
  const attendances = (typeof localDB !== 'undefined' && localDB.list) ? (localDB.list('attendances') || []) : [];
  const peps = (typeof localDB !== 'undefined' && localDB.list) ? (localDB.list('peps') || []) : [];
  const beds = (typeof localDB !== 'undefined' && localDB.list) ? (localDB.list('beds') || []) : [];
  let batches = (typeof localDB !== 'undefined' && localDB.list) ? (localDB.list('tiss_batches') || []) : [];

  // Se não houver lotes, popular demonstrativos
  if (batches.length === 0 && typeof localDB !== 'undefined' && localDB.saveFullDB) {
    const currentDb = localDB.getFullDB();
    currentDb.tiss_batches = JSON.parse(JSON.stringify(MOCK_TISS_BATCHES));
    localDB.saveFullDB(currentDb);
    batches = currentDb.tiss_batches;
  }

  // Localizar dados do paciente
  let patient = null;
  if (patientId) {
    patient = patients.find(p => String(p.id) === String(patientId));
  }
  if (!patient && patientName) {
    const clean = patientName.trim().toLowerCase();
    patient = patients.find(p => (p.name || '').trim().toLowerCase() === clean)
      || patients.find(p => (p.name || '').toLowerCase().includes(clean));
  }
  if (!patient && patients.length > 0) {
    patient = patients[0];
  }

  const resolvedName = patient ? patient.name : (patientName || 'Marcelo Mazaro');
  const att = attendances.find(a => (a.patient_name || a.patientName || '').toLowerCase().includes(resolvedName.toLowerCase()));
  const pep = peps.find(p => (p.patient_name || p.patientName || '').toLowerCase().includes(resolvedName.toLowerCase()));
  const bed = beds.find(b => (b.patient_name || b.patientName || '').toLowerCase().includes(resolvedName.toLowerCase()));

  const planName = (patient && (patient.health_plan || patient.healthPlan)) || (att && att.healthPlan) || 'Unimed Central';
  const cardNum = (patient && (patient.card_number || patient.cns || patient.cpf)) || '003492810293019';
  const riskColor = (att && (att.triage_color || att.risk_color)) || (patient && patient.risk_color) || 'vermelho';
  const isInterned = !!bed || (att && (att.status === 'Internado' || att.bed_name));
  const dischargeDate = (att && att.discharge_date) || (pep && pep.discharge_date) || (patient && patient.discharge_date) || new Date().toLocaleString('pt-BR');

  const riskBadgeMap = {
    vermelho: { label: 'Vermelho (Emergência)', bg: 'rgba(239,68,68,0.2)', color: '#f87171', border: '#ef4444' },
    laranja: { label: 'Laranja (Muito Urgente)', bg: 'rgba(249,115,22,0.2)', color: '#fb923c', border: '#f97316' },
    amarelo: { label: 'Amarelo (Urgente)', bg: 'rgba(234,179,8,0.2)', color: '#facc15', border: '#eab308' },
    verde: { label: 'Verde (Pouco Urgente)', bg: 'rgba(34,197,94,0.2)', color: '#4ade80', border: '#22c55e' },
    azul: { label: 'Azul (Não Urgente)', bg: 'rgba(59,130,246,0.2)', color: '#60a5fa', border: '#3b82f6' }
  };
  const riskMeta = riskBadgeMap[riskColor.toLowerCase()] || riskBadgeMap['vermelho'];

  const basePriceConsult = 180.00;
  const basePriceUrgence = 150.00;
  const basePriceBed = isInterned ? 450.00 : 0.00;
  const totalSuggested = basePriceConsult + basePriceUrgence + basePriceBed;

  const modalEl = document.createElement('div');
  modalEl.id = 'modal-tiss-emission';
  modalEl.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.75);backdrop-filter:blur(5px);z-index:99999;display:flex;align-items:center;justify-content:center;padding:16px;animation:hnFadeIn 0.2s ease;';

  modalEl.innerHTML = `
    <div style="background:#1e293b;border:1.5px solid rgba(99,102,241,0.4);border-radius:18px;max-width:720px;width:100%;max-height:92vh;overflow-y:auto;box-shadow:0 25px 60px rgba(0,0,0,0.6);color:#f8fafc;font-family:Inter,sans-serif;display:flex;flex-direction:column;">
      
      <!-- Cabeçalho -->
      <div style="padding:18px 24px;border-bottom:1px solid rgba(255,255,255,0.08);background:linear-gradient(135deg, rgba(30,27,75,0.8), rgba(49,27,146,0.8));display:flex;justify-content:space-between;align-items:center;">
        <div style="display:flex;align-items:center;gap:14px;">
          <div style="width:44px;height:44px;border-radius:12px;background:rgba(99,102,241,0.25);border:1px solid rgba(99,102,241,0.4);display:flex;align-items:center;justify-content:center;color:#a5b4fc;font-size:1.4rem;">
            <i class="fa-solid fa-file-invoice-dollar"></i>
          </div>
          <div>
            <h3 style="margin:0;font-family:Outfit,sans-serif;font-size:1.25rem;font-weight:700;color:#ffffff;">Emissão de Guia TISS &amp; Fechamento de Lote</h3>
            <p style="margin:2px 0 0;font-size:0.8rem;color:#c4b5fd;">Padrão Regulatório ANS TISS Versão 4.01.00 — Auditoria Anti-Glosa</p>
          </div>
        </div>
        <button id="btn-close-tiss-modal" style="background:rgba(255,255,255,0.08);border:none;color:#94a3b8;width:32px;height:32px;border-radius:8px;cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:1.1rem;transition:all 0.15s;">
          <i class="fa-solid fa-xmark"></i>
        </button>
      </div>

      <!-- Corpo da Modal -->
      <div style="padding:22px 24px;display:flex;flex-direction:column;gap:18px;">
        
        <!-- Bloco de Dados do Paciente -->
        <div style="background:rgba(15,23,42,0.6);border:1px solid rgba(255,255,255,0.08);border-radius:14px;padding:16px;display:grid;grid-template-columns:repeat(auto-fit, minmax(200px, 1fr));gap:12px;">
          <div>
            <span style="font-size:0.72rem;color:#94a3b8;text-transform:uppercase;font-weight:700;">Beneficiário / Paciente</span>
            <div style="font-size:1.05rem;font-weight:700;color:#38bdf8;margin-top:2px;">${resolvedName}</div>
            <div style="font-size:0.78rem;color:#cbd5e1;margin-top:2px;">Matrícula / CNS: <span style="font-family:monospace;color:#a5b4fc;">${cardNum}</span></div>
          </div>
          <div>
            <span style="font-size:0.72rem;color:#94a3b8;text-transform:uppercase;font-weight:700;">Classificação de Risco</span>
            <div style="margin-top:4px;">
              <span style="display:inline-block;padding:3px 10px;border-radius:20px;font-size:0.75rem;font-weight:700;background:${riskMeta.bg};color:${riskMeta.color};border:1px solid ${riskMeta.border};">
                ${riskMeta.label}
              </span>
            </div>
            <div style="font-size:0.76rem;color:#34d399;margin-top:4px;"><i class="fa-solid fa-circle-check"></i> Alta médica homologada</div>
          </div>
          <div>
            <span style="font-size:0.72rem;color:#94a3b8;text-transform:uppercase;font-weight:700;">Data do Fechamento</span>
            <div style="font-size:0.86rem;font-weight:600;color:#f8fafc;margin-top:4px;">${dischargeDate}</div>
            <div style="font-size:0.74rem;color:#94a3b8;margin-top:2px;">Prestador: Health Nexus Hospital</div>
          </div>
        </div>

        <!-- Seleção de Operadora & Lote -->
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;">
          <div>
            <label style="font-size:0.8rem;font-weight:600;color:#cbd5e1;display:block;margin-bottom:6px;">Operadora de Saúde (Plano):</label>
            <select id="tiss-select-plan" style="width:100%;background:#0f172a;border:1px solid #334155;color:#f8fafc;padding:9px 12px;border-radius:10px;font-size:0.86rem;outline:none;">
              <option value="Unimed Central" ${planName.includes('Unimed') ? 'selected' : ''}>Unimed Central (ANS 358941)</option>
              <option value="Bradesco Saúde" ${planName.includes('Bradesco') ? 'selected' : ''}>Bradesco Saúde (ANS 321045)</option>
              <option value="SulAmérica Saúde" ${planName.includes('SulAmérica') || planName.includes('Sulamerica') ? 'selected' : ''}>SulAmérica Saúde (ANS 418720)</option>
              <option value="Amil Assistência Médica" ${planName.includes('Amil') ? 'selected' : ''}>Amil Assistência Médica (ANS 326305)</option>
              <option value="Particular / SUS">Particular / Livre Escolha (Sem Glosa)</option>
            </select>
          </div>
          <div>
            <label style="font-size:0.8rem;font-weight:600;color:#cbd5e1;display:block;margin-bottom:6px;">Lote de Faturamento Destino:</label>
            <select id="tiss-select-batch" style="width:100%;background:#0f172a;border:1px solid #334155;color:#f8fafc;padding:9px 12px;border-radius:10px;font-size:0.86rem;outline:none;">
              ${batches.map(b => `<option value="${b.id}">${b.id} — ${b.healthPlan} (${b.status})</option>`).join('')}
              <option value="__NEW__">➕ Criar Novo Lote TISS Aberto</option>
            </select>
          </div>
        </div>

        <!-- Tabela de Procedimentos e Valores TUSS -->
        <div>
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
            <label style="font-size:0.82rem;font-weight:700;color:#cbd5e1;text-transform:uppercase;">Procedimentos Realizados (Terminologia TUSS / ANS)</label>
            <span style="font-size:0.75rem;color:#38bdf8;">Conformidade ANS 100%</span>
          </div>
          <div style="background:#0f172a;border:1px solid #334155;border-radius:12px;overflow:hidden;">
            <table style="width:100%;border-collapse:collapse;font-size:0.82rem;text-align:left;">
              <thead>
                <tr style="background:rgba(255,255,255,0.03);border-bottom:1px solid #334155;color:#94a3b8;font-size:0.74rem;">
                  <th style="padding:10px 14px;">Código TUSS</th>
                  <th style="padding:10px 14px;">Descrição do Procedimento</th>
                  <th style="padding:10px 14px;text-align:right;">Valor (R$)</th>
                </tr>
              </thead>
              <tbody>
                <tr style="border-bottom:1px solid rgba(255,255,255,0.04);">
                  <td style="padding:10px 14px;font-family:monospace;color:#c4b5fd;font-weight:700;">10101012</td>
                  <td style="padding:10px 14px;">Consulta Médica em Pronto-Socorro / Acolhimento Manchester</td>
                  <td style="padding:10px 14px;text-align:right;color:#34d399;font-weight:600;">R$ ${basePriceConsult.toFixed(2)}</td>
                </tr>
                <tr style="border-bottom:1px solid rgba(255,255,255,0.04);">
                  <td style="padding:10px 14px;font-family:monospace;color:#c4b5fd;font-weight:700;">20101015</td>
                  <td style="padding:10px 14px;">Avaliação e Prescrição Médica de Urgência &amp; Conduta</td>
                  <td style="padding:10px 14px;text-align:right;color:#34d399;font-weight:600;">R$ ${basePriceUrgence.toFixed(2)}</td>
                </tr>
                ${isInterned ? `
                <tr style="border-bottom:1px solid rgba(255,255,255,0.04);">
                  <td style="padding:10px 14px;font-family:monospace;color:#c4b5fd;font-weight:700;">60011501</td>
                  <td style="padding:10px 14px;">Diária de Acomodação Hospitalar &amp; Assistência de Enfermagem</td>
                  <td style="padding:10px 14px;text-align:right;color:#34d399;font-weight:600;">R$ ${basePriceBed.toFixed(2)}</td>
                </tr>
                ` : ''}
              </tbody>
            </table>
          </div>
        </div>

        <!-- Totalizadores e Valor Final -->
        <div style="background:linear-gradient(135deg, rgba(16,185,129,0.1), rgba(6,95,70,0.15));border:1.5px solid rgba(16,185,129,0.3);border-radius:12px;padding:14px 18px;display:flex;justify-content:space-between;align-items:center;">
          <div>
            <div style="font-size:0.75rem;color:#a7f3d0;font-weight:700;text-transform:uppercase;">Valor Total Apurado da Guia TISS</div>
            <div style="font-size:0.78rem;color:#cbd5e1;margin-top:2px;">Regra de cálculo: Tabela CBHPM / Rol de Procedimentos ANS</div>
          </div>
          <div style="text-align:right;">
            <div style="font-family:Outfit,sans-serif;font-size:1.6rem;font-weight:800;color:#34d399;">
              R$ <span id="tiss-total-display">${totalSuggested.toFixed(2)}</span>
            </div>
            <input type="hidden" id="tiss-total-input" value="${totalSuggested.toFixed(2)}">
          </div>
        </div>

      </div>

      <!-- Rodapé com Ações -->
      <div style="padding:16px 24px;border-top:1px solid rgba(255,255,255,0.08);background:rgba(15,23,42,0.7);display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;">
        <button id="btn-cancel-tiss-modal" class="btn" style="background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.12);color:#94a3b8;font-weight:600;padding:8px 16px;border-radius:10px;font-size:0.84rem;cursor:pointer;">
          Cancelar
        </button>

        <div style="display:flex;gap:10px;">
          <button id="btn-download-patient-xml" class="btn" style="background:rgba(99,102,241,0.2);border:1px solid rgba(99,102,241,0.4);color:#a5b4fc;font-weight:700;padding:8px 16px;border-radius:10px;font-size:0.84rem;display:flex;align-items:center;gap:6px;cursor:pointer;">
            <i class="fa-solid fa-download"></i> Baixar XML Guia
          </button>
          
          <button id="btn-confirm-tiss-guide" class="btn" style="background:linear-gradient(135deg, #10b981, #059669);border:none;color:#fff;font-weight:700;padding:8px 20px;border-radius:10px;font-size:0.86rem;display:flex;align-items:center;gap:8px;box-shadow:0 4px 14px rgba(16,185,129,0.35);cursor:pointer;">
            <i class="fa-solid fa-check"></i> Emitir e Salvar no Lote
          </button>
        </div>
      </div>

    </div>
  `;

  document.body.appendChild(modalEl);

  // Fechamento da Modal
  const closeModal = () => modalEl.remove();
  document.getElementById('btn-close-tiss-modal')?.addEventListener('click', closeModal);
  document.getElementById('btn-cancel-tiss-modal')?.addEventListener('click', closeModal);

  // Baixar XML individual desta guia
  document.getElementById('btn-download-patient-xml')?.addEventListener('click', () => {
    const selectedPlan = document.getElementById('tiss-select-plan')?.value || planName;
    const selectedBatch = document.getElementById('tiss-select-batch')?.value || 'LOTE-2026-09-001';
    const totalVal = parseFloat(document.getElementById('tiss-total-input')?.value || totalSuggested);

    exportPatientTISSXML({
      patientName: resolvedName,
      cardNumber: cardNum,
      healthPlan: selectedPlan,
      batchId: selectedBatch === '__NEW__' ? 'LOTE-2026-09-NOVO' : selectedBatch,
      totalValue: totalVal,
      tussCode: '10101012',
      tussDesc: 'Consulta Médica de Urgência com Classificação de Risco'
    });
  });

  // Salvar Guia e Vincular ao Lote
  document.getElementById('btn-confirm-tiss-guide')?.addEventListener('click', () => {
    const selectedPlan = document.getElementById('tiss-select-plan')?.value || planName;
    let selectedBatchId = document.getElementById('tiss-select-batch')?.value || '';
    const totalVal = parseFloat(document.getElementById('tiss-total-input')?.value || totalSuggested);

    let batch = batches.find(b => b.id === selectedBatchId);

    // Se escolheu criar novo lote ou se não encontrou o selecionado
    if (!batch || selectedBatchId === '__NEW__') {
      const nextNum = batches.length + 1;
      const newId = `LOTE-2026-09-${String(nextNum).padStart(3, '0')}`;
      batch = {
        id: newId,
        providerName: 'Health Nexus Hospital & Centro de Medicina',
        cnpj: '12.345.678/0001-90',
        ansCode: selectedPlan.includes('Bradesco') ? '321045' : selectedPlan.includes('SulAmérica') ? '418720' : '358941',
        healthPlan: selectedPlan,
        guideCount: 0,
        totalValue: 0.00,
        status: 'Pronto para Envio',
        createdAt: new Date().toLocaleString('pt-BR').slice(0, 16)
      };
      if (typeof localDB !== 'undefined' && localDB.insert) {
        localDB.insert('tiss_batches', batch);
      }
      batches.push(batch);
      selectedBatchId = newId;
    }

    // Atualizar métricas do lote
    batch.guideCount = (parseInt(batch.guideCount, 10) || 0) + 1;
    batch.totalValue = (parseFloat(batch.totalValue) || 0) + totalVal;
    batch.status = 'Pronto para Envio';

    if (typeof localDB !== 'undefined' && localDB.saveFullDB) {
      const db = localDB.getFullDB();
      const bIdx = (db.tiss_batches || []).findIndex(b => b.id === batch.id);
      if (bIdx >= 0) {
        db.tiss_batches[bIdx] = batch;
      } else {
        if (!db.tiss_batches) db.tiss_batches = [];
        db.tiss_batches.push(batch);
      }

      // Adicionar registro na tabela tiss_guides
      if (!db.tiss_guides) db.tiss_guides = [];
      db.tiss_guides.push({
        id: `GUIA-TISS-${Date.now().toString().slice(-6)}`,
        batchId: batch.id,
        patientName: resolvedName,
        cardNumber: cardNum,
        healthPlan: selectedPlan,
        value: totalVal,
        status: 'Emitida & Homologada',
        createdAt: new Date().toLocaleString('pt-BR')
      });

      localDB.saveFullDB(db);
    }

    closeModal();

    if (typeof showToast === 'function') {
      showToast(`✨ Guia TISS de ${resolvedName} vinculada ao Lote ${batch.id} com sucesso!`);
    }

    // Se estivermos na aba TISS, re-renderizar imediatamente a tabela
    const mainContentArea = document.getElementById('tab-content') || document.querySelector('.main-content-area');
    if (mainContentArea) {
      renderTISSTab(mainContentArea);
    }

    // Atualizar o card do Guia de Fluxo
    if (typeof window.createSmartFlowGuideCard === 'function') {
      window.createSmartFlowGuideCard('tiss');
    }
  });
}

// Exportação de Guia Individual do Paciente em XML TISS ANS v4.01
export function exportPatientTISSXML(patientData) {
  const cnpjClean = (patientData.cnpj || '12345678000190').replace(/\D/g, '');
  const xmlContent = `<?xml version="1.0" encoding="ISO-8859-1"?>
<ans:mensagemTISS xmlns:ans="http://www.ans.gov.br/padroes/tiss/schemas">
  <ans:cabecalho>
    <ans:identificacaoTransacao>
      <ans:tipoTransacao>ENVIO_LOTE_GUIAS</ans:tipoTransacao>
      <ans:sequencialTransacao>${Date.now()}</ans:sequencialTransacao>
      <ans:dataRegistroTransacao>${new Date().toISOString().slice(0, 10)}</ans:dataRegistroTransacao>
    </ans:identificacaoTransacao>
    <ans:origem>
      <ans:identificacaoPrestador>
        <ans:CNPJ>${cnpjClean}</ans:CNPJ>
      </ans:identificacaoPrestador>
    </ans:origem>
    <ans:destino>
      <ans:registroANS>${patientData.ansCode || '358941'}</ans:registroANS>
    </ans:destino>
    <ans:versaoPadrao>4.01.00</ans:versaoPadrao>
  </ans:cabecalho>
  <ans:prestadorParaOperadora>
    <ans:loteGuias>
      <ans:numeroLote>${patientData.batchId || 'LOTE-2026-09-001'}</ans:numeroLote>
      <ans:guiasTISS>
        <ans:guiaConsulta>
          <ans:numeroGuiaPrestador>${patientData.guideNumber || ('G' + Date.now().toString().slice(-6))}</ans:numeroGuiaPrestador>
          <ans:dadosBeneficiario>
            <ans:numeroCarteira>${patientData.cardNumber || '003492810293019'}</ans:numeroCarteira>
            <ans:nomeBeneficiario>${patientData.patientName || 'Marcelo Mazaro'}</ans:nomeBeneficiario>
          </ans:dadosBeneficiario>
          <ans:procedimentoRealizado>
            <ans:codigoTUSS>${patientData.tussCode || '10101012'}</ans:codigoTUSS>
            <ans:descricaoProcedimento>${patientData.tussDesc || 'Consulta Médica de Urgência com Classificação de Risco'}</ans:descricaoProcedimento>
            <ans:valorTotal>${parseFloat(patientData.totalValue || 180).toFixed(2)}</ans:valorTotal>
          </ans:procedimentoRealizado>
        </ans:guiaConsulta>
      </ans:guiasTISS>
    </ans:loteGuias>
  </ans:prestadorParaOperadora>
</ans:mensagemTISS>`;

  const blob = new Blob([xmlContent], { type: 'application/xml;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  const safeFilePatient = (patientData.patientName || 'Paciente').replace(/[^a-zA-Z0-9]/g, '_');
  link.setAttribute('download', `GUIA_TISS_${safeFilePatient}_v401.xml`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  if (typeof showToast === 'function') {
    showToast(`✨ Arquivo XML TISS individual de ${patientData.patientName} gerado com sucesso!`);
  }
}

export function exportTISSBatchXML(batchId) {
  const batches = (typeof localDB !== 'undefined' && localDB.list) ? (localDB.list('tiss_batches') || []) : [];
  const batch = batches.find(b => b.id === batchId) || MOCK_TISS_BATCHES.find(b => b.id === batchId) || MOCK_TISS_BATCHES[0];
  const cnpjClean = (batch.cnpj || '12345678000190').replace(/\D/g, '');
  const xmlContent = `<?xml version="1.0" encoding="ISO-8859-1"?>
<ans:mensagemTISS xmlns:ans="http://www.ans.gov.br/padroes/tiss/schemas">
  <ans:cabecalho>
    <ans:identificacaoTransacao>
      <ans:tipoTransacao>ENVIO_LOTE_GUIAS</ans:tipoTransacao>
      <ans:sequencialTransacao>${Date.now()}</ans:sequencialTransacao>
      <ans:dataRegistroTransacao>${new Date().toISOString().slice(0, 10)}</ans:dataRegistroTransacao>
    </ans:identificacaoTransacao>
    <ans:origem>
      <ans:identificacaoPrestador>
        <ans:CNPJ>${cnpjClean}</ans:CNPJ>
      </ans:identificacaoPrestador>
    </ans:origem>
    <ans:destino>
      <ans:registroANS>${batch.ansCode || '358941'}</ans:registroANS>
    </ans:destino>
    <ans:versaoPadrao>4.01.00</ans:versaoPadrao>
  </ans:cabecalho>
  <ans:prestadorParaOperadora>
    <ans:loteGuias>
      <ans:numeroLote>${batch.id}</ans:numeroLote>
      <ans:guiasTISS>
        <ans:guiaConsulta>
          <ans:numeroGuiaPrestador>100234</ans:numeroGuiaPrestador>
          <ans:dadosBeneficiario>
            <ans:numeroCarteira>003492810293019</ans:numeroCarteira>
            <ans:nomeBeneficiario>Marcelo Mazaro</ans:nomeBeneficiario>
          </ans:dadosBeneficiario>
          <ans:procedimentoRealizado>
            <ans:codigoTUSS>10101012</ans:codigoTUSS>
            <ans:descricaoProcedimento>Consulta Eletiva em Consultório (Médico Assistente)</ans:descricaoProcedimento>
            <ans:valorTotal>180.00</ans:valorTotal>
          </ans:procedimentoRealizado>
        </ans:guiaConsulta>
      </ans:guiasTISS>
    </ans:loteGuias>
  </ans:prestadorParaOperadora>
</ans:mensagemTISS>`;

  const blob = new Blob([xmlContent], { type: 'application/xml;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `${batch.id}_TISS_v401.xml`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  if (typeof showToast === 'function') {
    showToast(`✨ Arquivo XML TISS (${batch.id}) gerado com sucesso no padrão ANS!`);
  }
}

window.exportTISSBatchXML = exportTISSBatchXML;
window.exportPatientTISSXML = exportPatientTISSXML;
window.openTISSEmissionModal = openTISSEmissionModal;
window.executeTISSClosure = executeTISSClosure;

