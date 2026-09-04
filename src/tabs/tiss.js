// src/tabs/tiss.js — Módulo de Faturamento TISS / TUSS & Auditoria ANS (Health Nexus v2.8.0)

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
          <button id="btn-tiss-new-batch" class="btn" style="background: linear-gradient(135deg, #10b981, #059669); color: #fff; font-weight: 700; border: none; padding: 9px 18px; border-radius: 10px; font-size: 0.85rem; display: flex; align-items: center; gap: 8px; box-shadow: 0 4px 14px rgba(16,185,129,0.35);">
            <i class="fa-solid fa-plus"></i> Gerar Lote TISS XML
          </button>
          <button id="btn-tiss-audit" class="btn" style="background: rgba(99,102,241,0.2); border: 1px solid rgba(99,102,241,0.4); color: #a5b4fc; font-weight: 700; padding: 9px 16px; border-radius: 10px; font-size: 0.85rem; display: flex; align-items: center; gap: 8px;">
            <i class="fa-solid fa-shield-virus"></i> Rodar Auditoria Anti-Glosa
          </button>
        </div>
      </div>

      <!-- KPI Cards do Faturamento -->
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 16px; margin-bottom: 24px;">
        <div style="background: var(--bg-secondary); border: 1px solid var(--border-color); border-radius: 12px; padding: 16px 20px;">
          <div style="font-size: 0.76rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase;">Total Faturado (Mês)</div>
          <div style="font-family: Outfit, sans-serif; font-size: 1.6rem; font-weight: 800; color: #34d399; margin-top: 4px;">R$ 65.540,50</div>
          <div style="font-size: 0.74rem; color: #a7f3d0; margin-top: 4px;"><i class="fa-solid fa-arrow-trend-up"></i> +14.2% em relação ao mês anterior</div>
        </div>

        <div style="background: var(--bg-secondary); border: 1px solid var(--border-color); border-radius: 12px; padding: 16px 20px;">
          <div style="font-size: 0.76rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase;">Guias Processadas</div>
          <div style="font-family: Outfit, sans-serif; font-size: 1.6rem; font-weight: 800; color: #60a5fa; margin-top: 4px;">45 Guias</div>
          <div style="font-size: 0.74rem; color: #93c5fd; margin-top: 4px;">Padrão TISS v4.01.00 (ANS)</div>
        </div>

        <div style="background: var(--bg-secondary); border: 1px solid var(--border-color); border-radius: 12px; padding: 16px 20px;">
          <div style="font-size: 0.76rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase;">Índice de Glosas</div>
          <div style="font-family: Outfit, sans-serif; font-size: 1.6rem; font-weight: 800; color: #f59e0b; margin-top: 4px;">1.8%</div>
          <div style="font-size: 0.74rem; color: #fde68a; margin-top: 4px;">Abaixo do limite de tolerância (3.0%)</div>
        </div>

        <div style="background: var(--bg-secondary); border: 1px solid var(--border-color); border-radius: 12px; padding: 16px 20px;">
          <div style="font-size: 0.76rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase;">Status das Operadoras</div>
          <div style="font-family: Outfit, sans-serif; font-size: 1.6rem; font-weight: 800; color: #a78bfa; margin-top: 4px;">100% Ativas</div>
          <div style="font-size: 0.74rem; color: #c4b5fd; margin-top: 4px;">Unimed, Bradesco, SulAmérica</div>
        </div>
      </div>

      <!-- Tabela de Lotes TISS -->
      <div style="background: var(--bg-secondary); border: 1px solid var(--border-color); border-radius: 14px; overflow: hidden;">
        <div style="padding: 16px 20px; background: rgba(255,255,255,0.02); border-bottom: 1px solid var(--border-color); display: flex; justify-content: space-between; align-items: center;">
          <h3 style="font-size: 1rem; font-weight: 700; color: var(--text-primary); margin: 0;"><i class="fa-solid fa-list-check" style="color: #6366f1; margin-right: 8px;"></i>Lotes de Faturamento Recentes</h3>
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
              ${MOCK_TISS_BATCHES.map(b => `
                <tr style="border-bottom: 1px solid var(--border-color); transition: background 0.15s;" onmouseover="this.style.background='rgba(255,255,255,0.03)'" onmouseout="this.style.background='transparent'">
                  <td style="padding: 14px 18px; font-weight: 700; color: #c4b5fd; font-family: monospace;">${b.id}</td>
                  <td style="padding: 14px 18px; font-weight: 600; color: var(--text-primary);">${b.healthPlan} <span style="font-size:0.72rem; color:var(--text-muted);">(ANS ${b.ansCode})</span></td>
                  <td style="padding: 14px 18px;">${b.guideCount} guias</td>
                  <td style="padding: 14px 18px; font-weight: 700; color: #34d399;">R$ ${b.totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                  <td style="padding: 14px 18px;">
                    <span style="padding: 3px 10px; border-radius: 20px; font-size: 0.74rem; font-weight: 700; background: ${b.status.includes('Pronto') ? 'rgba(16,185,129,0.18)' : b.status.includes('Glosado') ? 'rgba(239,68,68,0.18)' : 'rgba(99,102,241,0.18)'}; color: ${b.status.includes('Pronto') ? '#34d399' : b.status.includes('Glosado') ? '#fca5a5' : '#a5b4fc'}; border: 1px solid ${b.status.includes('Pronto') ? 'rgba(16,185,129,0.4)' : b.status.includes('Glosado') ? 'rgba(239,68,68,0.4)' : 'rgba(99,102,241,0.4)'};">
                      ${b.status}
                    </span>
                  </td>
                  <td style="padding: 14px 18px; color: var(--text-muted); font-size: 0.78rem;">${b.createdAt}</td>
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
  document.getElementById('btn-tiss-new-batch')?.addEventListener('click', () => {
    window.exportTISSBatchXML('LOTE-2026-09-001');
  });

  document.getElementById('btn-tiss-audit')?.addEventListener('click', () => {
    if (typeof showCustomAlert === 'function') {
      showCustomAlert({
        title: 'Auditoria Anti-Glosa Concluída',
        message: '<strong>Auditoria ANS executada em 45 guias:</strong> Nenhuma inconformidade de codificação TUSS ou duplicidade detectada. Taxa de conformidade: <strong>100%</strong>.',
        type: 'success'
      });
    }
  });
}

export function exportTISSBatchXML(batchId) {
  const batch = MOCK_TISS_BATCHES.find(b => b.id === batchId) || MOCK_TISS_BATCHES[0];
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
        <ans:CNPJ>${batch.cnpj.replace(/\D/g, '')}</ans:CNPJ>
      </ans:identificacaoPrestador>
    </ans:origem>
    <ans:destino>
      <ans:registroANS>${batch.ansCode}</ans:registroANS>
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
