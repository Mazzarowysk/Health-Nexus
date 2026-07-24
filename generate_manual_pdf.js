import fs from 'fs';
import { execSync } from 'child_process';
import path from 'path';

const htmlContent = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<title>Manual do Usuário - Health Nexus</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap');
  
  @page {
    size: A4;
    margin: 15mm;
  }

  * {
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
    box-sizing: border-box;
  }

  body {
    font-family: 'Plus Jakarta Sans', sans-serif;
    color: #0f172a;
    background: #ffffff;
    line-height: 1.6;
    font-size: 13px;
    margin: 0;
    padding: 0;
  }

  /* Capa */
  .cover {
    height: 900px;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    text-align: center;
    background: linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #311b92 100%) !important;
    color: #ffffff !important;
    padding: 40px;
    box-sizing: border-box;
    page-break-after: always;
    border-radius: 16px;
  }

  .cover-badge {
    background: rgba(99, 102, 241, 0.3) !important;
    border: 1px solid #818cf8 !important;
    color: #ffffff !important;
    padding: 8px 20px;
    border-radius: 20px;
    font-weight: 700;
    font-size: 13px;
    letter-spacing: 1.5px;
    text-transform: uppercase;
    margin-bottom: 30px;
  }

  .cover h1 {
    font-size: 46px;
    font-weight: 800;
    margin: 0 0 16px 0;
    letter-spacing: -1px;
    line-height: 1.1;
    color: #ffffff !important;
  }

  .cover h2 {
    font-size: 18px;
    font-weight: 400;
    color: #cbd5e1 !important;
    max-width: 600px;
    margin: 0 0 40px 0;
    line-height: 1.5;
  }

  .cover-footer {
    margin-top: auto;
    border-top: 1px solid rgba(255, 255, 255, 0.2);
    padding-top: 20px;
    width: 100%;
  }

  /* Conteúdo Principal */
  .section {
    margin-bottom: 24px;
    page-break-inside: avoid !important;
    break-inside: avoid !important;
  }

  .page-break {
    page-break-after: always;
  }

  h1.section-title {
    font-size: 19px;
    font-weight: 800;
    color: #0f172a !important;
    border-bottom: 2.5px solid #6366f1;
    padding-bottom: 6px;
    margin-top: 0;
    margin-bottom: 14px;
    display: flex;
    align-items: center;
    gap: 8px;
  }

  h2.subsection-title {
    font-size: 14.5px;
    color: #1e293b !important;
    margin-top: 16px;
    margin-bottom: 8px;
    font-weight: 700;
  }

  p {
    margin-bottom: 10px;
    color: #334155 !important;
    text-align: justify;
  }

  ul, ol {
    margin-top: 6px;
    margin-bottom: 12px;
    padding-left: 22px;
    color: #0f172a !important;
  }

  li {
    margin-bottom: 5px;
    color: #0f172a !important;
    line-height: 1.5;
  }

  /* Cards e Modais */
  .card {
    background-color: #f1f5f9 !important;
    border: 1.5px solid #cbd5e1 !important;
    border-left: 5px solid #4f46e5 !important;
    border-radius: 8px !important;
    padding: 14px 18px !important;
    margin: 14px 0 !important;
    page-break-inside: avoid !important;
    break-inside: avoid !important;
    position: relative !important;
  }

  .card-title {
    font-weight: 800 !important;
    color: #0f172a !important;
    margin-bottom: 8px !important;
    font-size: 13.5px !important;
  }

  .card ol, .card ul, .card li, .card p, .card div {
    color: #0f172a !important;
    font-size: 12.5px !important;
    font-weight: 500 !important;
  }

  .tip-box {
    background-color: #f0fdf4 !important;
    border: 1.5px solid #86efac !important;
    border-left: 5px solid #16a34a !important;
    color: #14532d !important;
    border-radius: 8px !important;
    padding: 14px 18px !important;
    margin: 14px 0 !important;
    page-break-inside: avoid !important;
    break-inside: avoid !important;
  }

  .tip-box * {
    color: #14532d !important;
  }

  .warning-box {
    background-color: #fffbeb !important;
    border: 1.5px solid #fde047 !important;
    border-left: 5px solid #d97706 !important;
    color: #713f12 !important;
    border-radius: 8px !important;
    padding: 14px 18px !important;
    margin: 14px 0 !important;
    page-break-inside: avoid !important;
    break-inside: avoid !important;
  }

  .warning-box * {
    color: #713f12 !important;
  }

  /* Tabelas */
  table {
    width: 100%;
    border-collapse: collapse;
    margin: 14px 0;
    font-size: 12px;
    page-break-inside: avoid !important;
    break-inside: avoid !important;
  }

  th, td {
    border: 1.5px solid #94a3b8 !important;
    padding: 8px 12px;
    text-align: left;
  }

  th {
    background-color: #312e81 !important;
    color: #ffffff !important;
    font-weight: 700;
  }

  tr:nth-child(even) {
    background-color: #f8fafc !important;
  }

  /* Badges de Triagem */
  .badge-red { background: #dc2626 !important; color: white !important; padding: 3px 8px; border-radius: 4px; font-weight: bold; }
  .badge-orange { background: #ea580c !important; color: white !important; padding: 3px 8px; border-radius: 4px; font-weight: bold; }
  .badge-yellow { background: #ca8a04 !important; color: white !important; padding: 3px 8px; border-radius: 4px; font-weight: bold; }
  .badge-green { background: #16a34a !important; color: white !important; padding: 3px 8px; border-radius: 4px; font-weight: bold; }
  .badge-blue { background: #0284c7 !important; color: white !important; padding: 3px 8px; border-radius: 4px; font-weight: bold; }

  code {
    background: #e2e8f0 !important;
    padding: 2px 6px;
    border-radius: 4px;
    font-family: monospace;
    font-size: 11.5px;
    color: #0f172a !important;
    font-weight: 700;
  }
</style>
</head>
<body>

<!-- CAPA -->
<div class="cover">
  <div class="cover-badge">Manual Operacional de Engenharia &amp; Clínica</div>
  <h1>HEALTH NEXUS</h1>
  <h2>Guia Oficial do Usuário: Gestão Hospitalar, Painel TV com Voz, Triagem Manchester, Prontuário Eletrônico e Nuvem Turso</h2>
  
  <div class="cover-footer">
    <p style="text-align: center; margin: 0; color: #cbd5e1; font-weight: 600;">Versão do Sistema: 1.0.1 | Data de Emissão: Julho / 2026</p>
    <p style="text-align: center; margin-top: 6px; color: #94a3b8; font-size: 11px;">Desenvolvido por @mazzarowysk &amp; @coltr1. Todos os direitos reservados.</p>
  </div>
</div>

<!-- SUMÁRIO -->
<div class="section">
  <h1 class="section-title">📌 Sumário Geral</h1>
  <ol>
    <li><b>Visão Geral e Arquitetura do Sistema Health Nexus</b></li>
    <li><b>Acesso, Autenticação e Perfis de Usuário (RBAC)</b></li>
    <li><b>Admissão, Busca de CEP e Prevenção Estrita de Duplicidades</b></li>
    <li><b>Central de Atendimentos (Kanban) e Triagem Manchester</b></li>
    <li><b>Painel TV (Chamador Eletrônico com Anúncio Sonoro por Voz)</b></li>
    <li><b>Agenda de Consultas e Mapa de Leitos Hospitalares</b></li>
    <li><b>Prontuário Eletrônico do Paciente (PEP SOAPE) &amp; Prescrições</b></li>
    <li><b>Sincronização Nuvem (Turso Cloud), Status Badge e Encerramento Seguro</b></li>
    <li><b>Resolução de Dúvidas Frequentes (FAQ)</b></li>
  </ol>
</div>

<!-- MÓDULO 1 -->
<div class="section">
  <h1 class="section-title">🔐 1. Acesso, Autenticação e Perfis de Usuário</h1>
  <p>O <b>Health Nexus</b> possui um sistema rigoroso de Controle de Acesso Baseado em Perfis (RBAC), garantindo que cada profissional acesse apenas as telas pertinentes à sua função clínica ou administrativa.</p>
  
  <h2 class="subsection-title">1.1 Níveis de Permissão e Cargos</h2>
  <table>
    <thead>
      <tr>
        <th>Cargo / Perfil</th>
        <th>Descrição das Permissões</th>
        <th>Nível de Acesso</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><b>👑 Master</b></td>
        <td>Acesso irrestrito a todo o sistema, auditorias, nuvem e gerenciador de usuários.</td>
        <td>Total / Super-admin</td>
      </tr>
      <tr>
        <td><b>🛠️ Administrador</b></td>
        <td>Gestão de leitos, tabelas de sistema, sincronização Turso e cadastros gerais.</td>
        <td>Administrativo Geral</td>
      </tr>
      <tr>
        <td><b>🩺 Médico</b></td>
        <td>Acesso ao Prontuário (PEP), evolução SOAPE, prescrição médica e consultas.</td>
        <td>Clínico Geral / Especialista</td>
      </tr>
      <tr>
        <td><b>🩺 Enfermeiro</b></td>
        <td>Classificação de risco Manchester, triagem, mapa de leitos e sinais vitais.</td>
        <td>Assistencial / Triagem</td>
      </tr>
      <tr>
        <td><b>📋 Recepcionista</b></td>
        <td>Admissão de pacientes, busca de CEP, agendamento de consultas e chamadas de TV.</td>
        <td>Recepção / Atendimento</td>
      </tr>
    </tbody>
  </table>

  <div class="tip-box">
    <b>Dica de Segurança:</b> Senhas são armazenadas com criptografia forte via <code>bcryptjs</code>. Para redefinir uma senha esquecida, um usuário com perfil <b>Master</b> ou <b>Administrador</b> pode acessar o menu <b>Usuários</b> na aba Configurações.
  </div>
</div>

<div class="page-break"></div>

<!-- MÓDULO 2 -->
<div class="section">
  <h1 class="section-title">🏥 2. Admissão, Busca de CEP e Prevenção de Duplicidades</h1>
  <p>Na aba <b>Pacientes</b>, o sistema gerencia o cadastro mestre demográfico dos pacientes com travamento rigoroso contra homônimos e duplicidades.</p>
  
  <h2 class="subsection-title">2.1 Formulário de Admissão Completo</h2>
  <ul>
    <li><b>Nome Completo*:</b> Preenchimento obrigatório. Validação estrita contra nomes duplicados.</li>
    <li><b>CPF*:</b> Validação automática contra duplicidades no banco de dados.</li>
    <li><b>Data de Nascimento*:</b> O sistema calcula automaticamente a idade do paciente.</li>
    <li><b>CEP (Busca Auto):</b> Campo inteligente integrado às APIs nacionais de endereço.</li>
    <li><b>Endereço (Rua/Av):</b> Preenchido automaticamente via CEP ou digitado manualmente.</li>
    <li><b>Número / Compl.:</b> Campo dedicado para número residencial e complemento (Ex: <code>120 / Ap 42</code>).</li>
    <li><b>Bairro:</b> Preenchido automaticamente pelo CEP ou informado manualmente.</li>
    <li><b>Cidade / UF:</b> Localidade e Estado do paciente (Ex: <code>São Paulo - SP</code>).</li>
    <li><b>Telefones (Fixo e Celular):</b> Para contato e envio de avisos.</li>
    <li><b>Valor da Consulta / Mensalidade:</b> Campo financeiro para controle de convênio ou particular.</li>
  </ul>

  <div class="card">
    <div class="card-title">🔍 Como Funciona a Busca Automática por CEP (Tripla Redundância)</div>
    <ol>
      <li>Ao digitar os 8 números do CEP (Ex: <code>17702-342</code>), o sistema consulta a <b>ViaCEP</b> diretamente.</li>
      <li>Se houver indisponibilidade, o sistema aciona automaticamente a <b>BrasilAPI</b>.</li>
      <li>Caso ambas falhem, o servidor backend consulta o serviço local de contingência.</li>
      <li>Você também pode clicar no botão com ícone de <b>Lupa (🔍)</b> a qualquer momento para forçar a busca.</li>
      <li>Assim que o endereço é localizado, o cursor pula automaticamente para o campo <b>Número / Compl.</b>.</li>
    </ol>
  </div>

  <div class="warning-box">
    <b>🛡️ Trava de Segurança Antiduplicidade:</b> Tentar cadastrar um paciente com um <b>Nome Completo</b> ou <b>CPF</b> já existente na base gera um bloqueio imediato com aviso na tela e erro <code>HTTP 409 Conflict</code>. Nas admissões de emergência, o sistema reutiliza o cadastro existente em vez de criar duplicatas.
  </div>
</div>

<!-- MÓDULO 3 -->
<div class="section">
  <h1 class="section-title">📺 3. Painel TV de Chamadas com Voz &amp; Central de Atendimentos</h1>
  
  <h2 class="subsection-title">3.1 Painel TV Eletrônico (Sala de Espera)</h2>
  <p>O <b>Painel TV</b> é exibido em tela cheia na sala de espera hospitalar para orientação sonora e visual dos pacientes:</p>
  <ul>
    <li><b>Síntese de Voz Audível:</b> Anúncio automático em português (<i>Web Speech API</i>) informando o nome do paciente e o consultório/sala de destino.</li>
    <li><b>Modal Dinâmico de Chamada:</b> Permite selecionar qualquer paciente presente na fila de atendimento ou digitar o nome manualmente, definindo o consultório e a cor de triagem Manchester.</li>
    <li><b>Sincronização Automática (Polling 3s):</b> A tela da TV atualiza seus dados a cada 3 segundos em tempo real sempre que um médico ou recepcionista aciona uma chamada.</li>
  </ul>

  <h2 class="subsection-title">3.2 Central de Atendimentos (Kanban Clínico)</h2>
  <p>Na aba <b>Atendimento</b>, a recepção e o corpo médico gerenciam o fluxo hospitalar através de um painel Kanban dividido em três etapas:</p>
  <ol>
    <li><b>Aguardando Triagem:</b> Pacientes recém-admitidos que aguardam avaliação de enfermagem.</li>
    <li><b>Aguardando Médico:</b> Pacientes triados ordenados por prioridade Manchester. Ao clicar em <b>"Chamar para Consulta"</b>, o sistema dispara a chamada sonora na TV e altera o status para <i>Em Atendimento</i>.</li>
    <li><b>Em Atendimento:</b> Pacientes em consulta ativa no consultório, com acesso direto ao Prontuário (PEP).</li>
  </ol>
</div>

<div class="page-break"></div>

<!-- MÓDULO 4 -->
<div class="section">
  <h1 class="section-title">🚑 4. Triagem Manchester, Agenda e Prontuário Eletrônico (PEP)</h1>
  
  <h2 class="subsection-title">4.1 Classificação de Risco (Protocolo Manchester)</h2>
  <p>A triagem atribui cores e prioridades de atendimento com base na gravidade do paciente:</p>
  <table>
    <thead>
      <tr>
        <th>Nível / Cor</th>
        <th>Classificação</th>
        <th>Tempo Máximo Alvo</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><span class="badge-red">Vermelho</span></td>
        <td><b>Emergência</b> (Risco iminente de morte)</td>
        <td>Atendimento Imediato (0 min)</td>
      </tr>
      <tr>
        <td><span class="badge-orange">Laranja</span></td>
        <td><b>Muito Urgente</b> (Risco alto)</td>
        <td>Até 10 minutos</td>
      </tr>
      <tr>
        <td><span class="badge-yellow">Amarelo</span></td>
        <td><b>Urgente</b> (Gravidade moderada)</td>
        <td>Até 60 minutos</td>
      </tr>
      <tr>
        <td><span class="badge-green">Verde</span></td>
        <td><b>Pouco Urgente</b> (Baixa gravidade)</td>
        <td>Até 120 minutos</td>
      </tr>
      <tr>
        <td><span class="badge-blue">Azul</span></td>
        <td><b>Não Urgente</b> (Eletivo)</td>
        <td>Até 240 minutos</td>
      </tr>
    </tbody>
  </table>

  <h2 class="subsection-title">4.2 Prontuário Eletrônico (PEP) e Modelo SOAPE</h2>
  <p>No atendimento médico, o profissional registra as impressões clínicas organizadas no padrão recomendado pelo CFM:</p>
  <ul>
    <li><b>S (Subjetivo):</b> Relato do paciente e queixas principais.</li>
    <li><b>O (Objetivo):</b> Exame físico, dados vitais (pressão, temperatura, saturação).</li>
    <li><b>A (Avaliação):</b> Hipótese diagnóstica ou CID-10.</li>
    <li><b>P (Plano):</b> Conduta médica, exames solicitados e orientações.</li>
    <li><b>E (Evolução / Prescrição):</b> Medicamentos receitados e dosagem.</li>
  </ul>
</div>

<!-- MÓDULO 5 -->
<div class="section">
  <h1 class="section-title">☁️ 5. Sincronização Turso Cloud e Encerramento Seguro</h1>
  
  <h2 class="subsection-title">5.1 Sincronização em Nuvem (Turso Cloud) &amp; Status Badge</h2>
  <p>O Health Nexus possui um mecanismo de banco de dados híbrido: opera super rápido localmente com <b>SQLite</b> e espelha os dados na nuvem <b>Turso Cloud</b>.</p>
  
  <div class="card">
    <div class="card-title">🔄 Recursos de Sincronização</div>
    <ul>
      <li><b>Badge de Status (Cabeçalho):</b> Exibe dinamicamente no topo o estado da conexão ("Conectado ao Turso", "Sincronizado" ou "Modo Local"). É clicável para abrir o comparativo.</li>
      <li><b>Modal Comparativo ao Logar:</b> Mostra tabela por tabela a quantidade de registros e a data/hora da alteração mais recente.</li>
      <li><b>Sincronização Pós-Escrita:</b> Modal pergunta ao usuário após cadastros se deseja sincronizar com a nuvem instantaneamente.</li>
    </ul>
  </div>

  <h2 class="subsection-title">5.2 Auto-Shutdown Inteligente ao Fechar o Navegador</h2>
  <div class="warning-box">
    <b>Encerramento do Servidor Local:</b> Ao fechar todas as abas do navegador, o servidor Node.js é encerrado automaticamente para economizar memória do computador. O sistema possui uma margem de tolerância de <b>1.5 segundos</b> para permitir reloads rápidos (F5) sem desligar a aplicação.
  </div>
</div>

</body>
</html>`;

fs.writeFileSync('manual_do_usuario.html', htmlContent, 'utf8');
console.log('HTML gerado com sucesso em:', path.resolve('manual_do_usuario.html'));

const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const htmlPath = path.resolve('manual_do_usuario.html');
const pdfPath = path.resolve('Manual_do_Usuario_Health_Nexus.pdf');

console.log('Executando conversão para PDF...');
try {
  const cmd = `"${edgePath}" --headless --disable-gpu --no-pdf-header-footer --print-to-pdf="${pdfPath}" "file:///${htmlPath.replace(/\\/g, '/')}"`;
  execSync(cmd);
  console.log('PDF gerado com sucesso em:', pdfPath);
} catch (err) {
  console.error('Erro ao gerar PDF via Edge:', err.message);
}
