import fs from 'fs';
import path from 'path';
import { marked } from 'marked';
import puppeteer from 'puppeteer';

async function generateReportPDF() {
  const mdPath = path.resolve('docs/RELATORIO_COMPARATIVO_SISTEMA_LEGADO.md');
  const pdfPath = path.resolve('Relatorio_Comparativo_Sistema_Legado_vs_Health_Nexus.pdf');
  const publicPdf = path.resolve('public/Relatorio_Comparativo_Sistema_Legado_vs_Health_Nexus.pdf');
  const mdContent = fs.readFileSync(mdPath, 'utf8');

  let renderedBody = await marked.parse(mdContent);

  const fullHtml = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Relatório Comparativo Técnico — Sistema Legado vs. Health Nexus</title>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Outfit:wght@500;600;700;800&family=JetBrains+Mono:wght@400;600&display=swap" rel="stylesheet">
  <style>
    :root {
      --primary: #4f46e5;
      --secondary: #0ea5e9;
      --bg: #0b0f19;
      --card-bg: #1e293b;
      --text: #f8fafc;
      --text-muted: #94a3b8;
      --border: #334155;
    }
    * { box-sizing: border-box; }
    body {
      font-family: 'Inter', sans-serif;
      background-color: #ffffff;
      color: #1e293b;
      margin: 0;
      padding: 30px;
      line-height: 1.6;
      font-size: 13px;
    }
    h1, h2, h3, h4 {
      font-family: 'Outfit', sans-serif;
      color: #0f172a;
      margin-top: 24px;
      margin-bottom: 12px;
    }
    h1 {
      font-size: 24px;
      color: #312e81;
      border-bottom: 3px solid #6366f1;
      padding-bottom: 8px;
    }
    h2 {
      font-size: 18px;
      color: #1e1b4b;
      border-bottom: 1.5px solid #e2e8f0;
      padding-bottom: 6px;
    }
    h3 {
      font-size: 15px;
      color: #0369a1;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 16px 0;
      font-size: 12px;
    }
    th, td {
      border: 1px solid #cbd5e1;
      padding: 8px 10px;
      text-align: left;
    }
    th {
      background-color: #f1f5f9;
      color: #0f172a;
      font-weight: 700;
    }
    tr:nth-child(even) {
      background-color: #f8fafc;
    }
    blockquote {
      border-left: 4px solid #6366f1;
      background: #f8fafc;
      margin: 16px 0;
      padding: 10px 16px;
      color: #475569;
    }
    hr {
      border: none;
      border-top: 1px solid #e2e8f0;
      margin: 24px 0;
    }
    strong { color: #0f172a; }
    ul, ol { padding-left: 20px; }
    li { margin-bottom: 6px; }
  </style>
</head>
<body>
  ${renderedBody}
</body>
</html>`;

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setContent(fullHtml, { waitUntil: 'networkidle0' });

  await page.pdf({
    path: pdfPath,
    format: 'A4',
    margin: { top: '18mm', right: '15mm', bottom: '18mm', left: '15mm' },
    printBackground: true,
    displayHeaderFooter: true,
    headerTemplate: `
      <div style="font-family: 'Inter', sans-serif; font-size: 8px; color: #64748b; width: 100%; padding: 0 15mm; display: flex; justify-content: space-between; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px;">
        <span>🏥 Health Nexus — Relatório Comparativo Técnico & Operacional</span>
        <span>Auditoria de Requisitos Hospitalares</span>
      </div>`,
    footerTemplate: `
      <div style="font-family: 'Inter', sans-serif; font-size: 8px; color: #64748b; width: 100%; padding: 0 15mm; display: flex; justify-content: space-between; border-top: 1px solid #e2e8f0; padding-top: 4px;">
        <span>Confidencial · Uso Técnico & Estratégico</span>
        <span>Página <span class="pageNumber"></span> de <span class="totalPages"></span></span>
      </div>`
  });

  await browser.close();
  fs.copyFileSync(pdfPath, publicPdf);
  console.log('✓ PDF do Relatório Comparativo gerado com sucesso em:', pdfPath);
  console.log('✓ Cópia sincronizada em:', publicPdf);
}

generateReportPDF().catch(err => {
  console.error('Erro ao gerar PDF do relatório:', err);
  process.exit(1);
});
