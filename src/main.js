async function exportToPDF(columns, rows, title, filename, financialSummary) {
    const dateNow = new Date().toLocaleString('pt-BR');
    const fmt = v => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);

    // ---- Bloco de Resumo Financeiro (opcional) ----
    const summaryBlock = financialSummary ? `
      <div style="margin-bottom: 22px;">
        <div style="font-size: 11pt; font-weight: 700; color: #1e1b4b; border-bottom: 2px solid #6366f1; padding-bottom: 6px; margin-bottom: 12px; display: flex; align-items: center; gap: 6px;">
          📊 Resumo Executivo do Filtro
        </div>

        <!-- KPI CARDS em 3 colunas -->
        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-bottom: 14px; -webkit-print-color-adjust: exact; print-color-adjust: exact;">
          <div style="background: #f0fdf4; border: 1.5px solid #86efac; border-radius: 8px; padding: 10px 12px;">
            <div style="font-size: 7.5pt; color: #15803d; font-weight: 700; text-transform: uppercase; margin-bottom: 2px;">✅ Pagas</div>
            <div style="font-size: 13pt; font-weight: 800; color: #16a34a;">${fmt(financialSummary.pagasVal)}</div>
            <div style="font-size: 7.5pt; color: #4b5563;">${financialSummary.pagasC} parcela(s)</div>
          </div>
          <div style="background: #eff6ff; border: 1.5px solid #93c5fd; border-radius: 8px; padding: 10px 12px;">
            <div style="font-size: 7.5pt; color: #1d4ed8; font-weight: 700; text-transform: uppercase; margin-bottom: 2px;">🕐 A Vencer</div>
            <div style="font-size: 13pt; font-weight: 800; color: #2563eb;">${fmt(financialSummary.aVencerVal)}</div>
            <div style="font-size: 7.5pt; color: #4b5563;">${financialSummary.aVencerC} parcela(s)</div>
          </div>
          <div style="background: #fff1f2; border: 1.5px solid #fda4af; border-radius: 8px; padding: 10px 12px;">
            <div style="font-size: 7.5pt; color: #be123c; font-weight: 700; text-transform: uppercase; margin-bottom: 2px;">❗ Vencidas</div>
            <div style="font-size: 13pt; font-weight: 800; color: #e11d48;">${fmt(financialSummary.vencidasVal)}</div>
            <div style="font-size: 7.5pt; color: #4b5563;">${financialSummary.vencidasC} parcela(s)</div>
          </div>
          <div style="background: #f5f3ff; border: 1.5px solid #c4b5fd; border-radius: 8px; padding: 10px 12px;">
            <div style="font-size: 7.5pt; color: #7c3aed; font-weight: 700; text-transform: uppercase; margin-bottom: 2px;">⚖️ Saldo Líquido</div>
            <div style="font-size: 13pt; font-weight: 800; color: ${financialSummary.saldo >= 0 ? '#16a34a' : '#e11d48'};">${fmt(financialSummary.saldo)}</div>
            <div style="font-size: 7.5pt; color: #4b5563;">Receitas − Despesas</div>
          </div>
          <div style="background: #fffbeb; border: 1.5px solid #fcd34d; border-radius: 8px; padding: 10px 12px;">
            <div style="font-size: 7.5pt; color: #b45309; font-weight: 700; text-transform: uppercase; margin-bottom: 2px;">🏆 Bonificadas</div>
            <div style="font-size: 13pt; font-weight: 800; color: #d97706;">${fmt(financialSummary.bonificadasVal)}</div>
            <div style="font-size: 7.5pt; color: #4b5563;">${financialSummary.bonificadasC} parcela(s)</div>
          </div>
          <div style="background: #fef2f2; border: 1.5px solid #fca5a5; border-radius: 8px; padding: 10px 12px;">
            <div style="font-size: 7.5pt; color: #dc2626; font-weight: 700; text-transform: uppercase; margin-bottom: 2px;">🚫 Outras</div>
            <div style="font-size: 13pt; font-weight: 800; color: #dc2626;">${fmt((financialSummary.suspensasVal||0)+(financialSummary.canceladasVal||0)+(financialSummary.excluidasVal||0))}</div>
            <div style="font-size: 7.5pt; color: #4b5563;">Suspensas / Canceladas / Excluídas</div>
          </div>
        </div>

        <!-- GRÁFICOS como imagens base64 -->
        ${(financialSummary.donutImg || financialSummary.barImg) ? `
        <div style="display: grid; grid-template-columns: 1fr 1.6fr; gap: 12px; margin-bottom: 8px;">
          ${financialSummary.donutImg ? `
          <div style="border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px; text-align: center;">
            <div style="font-size: 8pt; font-weight: 700; color: #475569; margin-bottom: 6px;">📈 Distribuição por Status</div>
            <img src="${financialSummary.donutImg}" style="max-width: 100%; max-height: 160px; object-fit: contain;" />
          </div>` : ''}
          ${financialSummary.barImg ? `
          <div style="border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px; text-align: center;">
            <div style="font-size: 8pt; font-weight: 700; color: #475569; margin-bottom: 6px;">📊 Volume por Forma de Pagamento (R$)</div>
            <img src="${financialSummary.barImg}" style="max-width: 100%; max-height: 160px; object-fit: contain;" />
          </div>` : ''}
        </div>` : ''}
      </div>
    ` : '';

    const htmlContent = `
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="UTF-8">
        <title>${title} — Health Nexus</title>
        <style>
          @page { size: A4 portrait; margin: 15mm; }
          body { font-family: 'Segoe UI', Arial, sans-serif; color: #0f172a; margin: 0; padding: 15px; font-size: 10pt; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #6366f1; padding-bottom: 12px; margin-bottom: 18px; }
          .logo { font-size: 18pt; font-weight: bold; color: #4f46e5; }
          .sublogo { font-size: 8.5pt; color: #64748b; }
          .meta { text-align: right; font-size: 8.5pt; color: #64748b; }
          h1 { font-size: 15pt; color: #0f172a; margin-top: 0; margin-bottom: 12px; }
          table { width: 100%; border-collapse: collapse; margin-top: 12px; }
          th { background-color: #4f46e5; color: #ffffff; text-align: left; padding: 7px 9px; font-size: 8.5pt; text-transform: uppercase; letter-spacing: 0.5px; }
          td { padding: 7px 9px; border-bottom: 1px solid #e2e8f0; font-size: 9pt; }
          tr:nth-child(even) td { background-color: #f8fafc; }
          .footer { margin-top: 25px; border-top: 1px solid #cbd5e1; padding-top: 8px; font-size: 8pt; color: #94a3b8; text-align: center; }
          .badge { display: inline-block; padding: 2px 7px; border-radius: 4px; font-weight: bold; font-size: 8pt; }
          .badge-vencidas { background: #ffe4e6; color: #e11d48; }
          .badge-pagas { background: #d1fae5; color: #059669; }
          .badge-avencer { background: #e0f2fe; color: #0284c7; }
          .badge-bonificadas { background: #fef3c7; color: #d97706; }
          .badge-suspensas { background: #f3f4f6; color: #374151; }
          .badge-canceladas { background: #fee2e2; color: #dc2626; }
          .badge-excluídas { background: #fee2e2; color: #7f1d1d; }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <div class="logo">🏥 HEALTH NEXUS</div>
            <div class="sublogo">Gestão Hospitalar & Inteligência Médica</div>
          </div>
          <div class="meta">
            <div>Data de Emissão: <strong>${dateNow}</strong></div>
            <div>Documento Autenticado do Sistema</div>
          </div>
        </div>

        <h1>${title}</h1>
        <p style="font-size: 8.5pt; color: #64748b; margin-top: -6px;">Total de registros impressos: <strong>${rows.length}</strong></p>

        ${summaryBlock}

        <table>
          <thead>
            <tr>
              ${columns.map(col => `<th>${col}</th>`).join('')}
            </tr>
          </thead>
          <tbody>
            ${rows.map(row => `
              <tr>
                ${row.map((cell, idx) => {
                  if (columns[idx] === 'Status') {
                    const s = String(cell).toLowerCase().replace(/\s+/g, '');
                    return `<td><span class="badge badge-${s}">${cell}</span></td>`;
                  }
                  return `<td>${cell}</td>`;
                }).join('')}
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div class="footer">
          Health Nexus © 2026 — Sistema Integrado de Saúde Hospitalar • Documento impresso digitalmente.
        </div>
        <script>
          window.onload = function() { window.print(); };
        <\/script>
      </body>
      </html>
    `;

    // Download direto do arquivo HTML (usuário abre no navegador e usa Ctrl+P para PDF)
    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${filename}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    if (typeof showToast === 'function') showToast(`Relatório HTML '${filename}.html' baixado! Abra no navegador e use Ctrl+P para salvar como PDF.`);
  }

  function openPayInstallmentModal(installment, onComplete) {