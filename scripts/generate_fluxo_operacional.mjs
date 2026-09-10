import fs from 'fs';
import path from 'path';
import { marked } from 'marked';
import puppeteer from 'puppeteer';

marked.setOptions({
  gfm: true,
  breaks: false
});

/**
 * Converte caminhos de screenshots em Data URIs Base64
 */
function embedScreenshotsAsBase64(html) {
  return html.replace(/(?:<p>\s*)?<img\s+([^>]*?)src="([^"]+)"([^>]*?)>(?:\s*<\/p>)?/gi, (match, before, src, after) => {
    const altMatch = (before + after).match(/alt="([^"]*)"/i);
    const alt = altMatch ? altMatch[1] : '';

    let localPath = null;
    if (src.includes('screenshots/')) {
      const filename = path.basename(src);
      const candidates = [
        path.resolve('public/docs/screenshots', filename),
        path.resolve('docs/screenshots', filename)
      ];
      for (const cand of candidates) {
        if (fs.existsSync(cand)) {
          localPath = cand;
          break;
        }
      }
    }

    if (localPath) {
      try {
        const fileBuffer = fs.readFileSync(localPath);
        const b64 = fileBuffer.toString('base64');
        const mime = localPath.endsWith('.png') ? 'image/png' : 'image/jpeg';
        const dataUri = `data:${mime};base64,${b64}`;
        return `
        <figure class="screenshot-figure">
          <img src="${dataUri}" alt="${alt}" class="manual-screenshot" />
          ${alt ? `<figcaption><i class="fa-solid fa-camera"></i> ${alt}</figcaption>` : ''}
        </figure>`;
      } catch (err) {
        console.warn('Falha ao embutir screenshot:', localPath, err.message);
      }
    }
    return match;
  });
}

/**
 * Formata o conteúdo para o motor PDF do Chromium no Windows:
 * Substitui emojis de 4-bytes por badges CSS vetoriais e tags semânticas,
 * prevenindo 100% da corrupção de subset de fontes (causa de tabelas vazias).
 */
function formatContentForPdf(html) {
  let res = html;

  // 1. Converter círculos de status para badges CSS vetoriais
  res = res.replace(/🟢\s*`?([^`<]+)`?/g, '<span class="status-badge status-green">$1</span>');
  res = res.replace(/🔴\s*`?([^`<]+)`?/g, '<span class="status-badge status-red">$1</span>');
  res = res.replace(/🟠\s*`?([^`<]+)`?/g, '<span class="status-badge status-orange">$1</span>');
  res = res.replace(/🟡\s*`?([^`<]+)`?/g, '<span class="status-badge status-yellow">$1</span>');
  res = res.replace(/🔵\s*`?([^`<]+)`?/g, '<span class="status-badge status-blue">$1</span>');
  res = res.replace(/⚪\s*`?([^`<]+)`?/g, '<span class="status-badge status-gray">$1</span>');

  // 2. Pontos avulsos
  res = res.replace(/🟢/g, '<span class="status-dot dot-green"></span>');
  res = res.replace(/🔴/g, '<span class="status-dot dot-red"></span>');
  res = res.replace(/🟠/g, '<span class="status-dot dot-orange"></span>');
  res = res.replace(/🟡/g, '<span class="status-dot dot-yellow"></span>');
  res = res.replace(/🔵/g, '<span class="status-dot dot-blue"></span>');
  res = res.replace(/⚪/g, '<span class="status-dot dot-gray"></span>');

  // 3. Emojis de ação substituídos por rótulos seguros
  const iconReplacements = {
    '📢': '[TV]',
    '🩺': '[PEP]',
    '🔄': '[Retorno]',
    '💉': '[Medicação]',
    '🏃': '[Evasão]',
    '📜': '[Prescrição]',
    '⏱️': '[Tempo]',
    '🛏️': '[Leito]',
    '✅': '[OK]',
    '🚨': '[Urgência]',
    '✨': '[Limpeza]',
    '🛡️': '[Segurança]',
    '🚪': '[Alta]',
    '📋': '[Lista]',
    '🔍': '[Buscar]',
    '✏️': '[Editar]',
    '🗑️': '[Lixeira]',
    '♻️': '[Restaurar]',
    '📦': '[XML TISS]',
    '📄': '[Guia]',
    '🧾': '[Recibo]',
    '⚠️': '[Atenção]',
    '☀️': '[Contraste]',
    '📏': '[Régua]',
    '🔔': '[Aviso]',
    '⌨️': '[Atalho]',
    '❓': '[FAQ]',
    '🚀': '',
    '👑': '[Master]',
    '💻': '[Dev]',
    '🛠️': '[Admin]',
    '👨‍⚕️': '[Médico]',
    '💊': '[Farmácia]',
    '💰': '[Financeiro]',
    '📊': '[Relatório]',
    '📈': '[Analytics]',
    '📺': '[TV]',
    '⏳': '[Espera]',
    '🗺️': '',
    '📌': '',
    '🔒': '',
    '📅': '',
    '🎛️': '',
    '☁️': '',
    '📝': '',
    '🩻': '',
    '🏥': ''
  };

  for (const [emoji, text] of Object.entries(iconReplacements)) {
    res = res.replaceAll(emoji, text);
  }

  // 4. Limpeza de quaisquer outros emojis residuais
  const remainingEmojis = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1FA00}-\u{1FAFF}\u{FE00}-\u{FE0F}\u{1F000}-\u{1F02F}\u{1F0A0}-\u{1F0FF}\u{1F100}-\u{1F64F}\u{1F680}-\u{1F6FF}]/gu;
  res = res.replace(remainingEmojis, '');

  return res;
}

/**
 * Constrói o texto do Manual de Fluxo Operacional & Jornada Assistencial
 */
export function buildFluxoOperacionalMarkdown() {
  return `# Manual de Fluxo Operacional & Jornada Assistencial do Paciente
## Arquitetura de Processos Clínicos, Triagem Manchester, Chamadas com Voz, CDSS e Regulação Hospitalar
### Health Nexus v2.8.0 — Documentação Oficial de Engenharia Hospitalar & Gestão Clínica

---

## 1. RESUMO EXECUTIVO & ESCOPO OPERACIONAL

O **Health Nexus** é uma plataforma hospitalar e ambulatorial de alta performance projetada para garantir segurança do paciente (alinhada às Metas Internacionais de Segurança do Paciente da OMS/ONA), conformidade com a LGPD (Lei nº 13.709/2018), interoperabilidade com o padrão ANS TISS 4.01 e integração assistencial contínua.

Este manual descreve o **ciclo completo de fluxo operacional** — desde a primeira abordagem do paciente na recepção hospitalar até o desfecho final, que pode ser a desospitalização com sumário de alta e prescrição com QR Code autenticável pelo Conselho Federal de Medicina (CFM), ou o encaminhamento regulado para leitos de internação e terapia intensiva (UTI).

### Princípios Norteadores do Fluxo Operacional:
1. **Atendimento Prioritário Baseado em Risco:** Nenhuma fila no Health Nexus é meramente cronológica; a prioridade assistencial é determinada rigorosamente pelo **Protocolo de Manchester** e pelo escore preditivo de deterioração clínica **MEWS** (Modified Early Warning Score).
2. **Prevenção Ativa de Erros Farmacológicos:** O motor de apoio à decisão clínica (**CDSS - Clinical Decision Support System**) intercepta prescrições com interações medicamentosas graves e reações alérgicas antes que a medicação seja dispensada pela farmácia.
3. **Visibilidade Operacional em Tempo Real:** Painéis dinâmicos de chamada por síntese de voz (Web Speech API), censo visual de leitos hospitalares e telemetria de estagnação garantem que a equipe multidisciplinar identifique gargalos instantaneamente.
4. **Rastreabilidade e Não Repúdio:** Todas as transações, prescrições, mudanças de status e registros no prontuário eletrônico (PEP) são carimbadas com identificador do profissional, timestamp auditável e assinatura digital.

<div class="page-break"></div>

## 2. ARQUITETURA GERAL DA JORNADA DO PACIENTE

O fluxo hospitalar no Health Nexus é organizado em **três macrofases sequenciais** e integradas:

1. **Porta de Entrada & Classificação de Risco (Etapas 01 a 03):** Recepção com validação de CPF e preenchimento de endereço via ViaCEP, Triagem de Enfermagem pelo Protocolo de Manchester e chamada sonora na sala de espera via Painel TV (Web Speech API pt-BR).
2. **Assistência Clínica, Farmácia & Telemetria (Etapas 04 a 07):** Atendimento no consultório com prontuário estruturado SOAPE, Prescrição Eletrônica protegida por CDSS (alertas de alergias e interações medicamentosas), dispensação rastreável na Farmácia Hospitalar e monitoramento do tempo de permanência no Pronto-Socorro.
3. **Regulação, Internação & Alta Hospitalar (Etapas 08 a 10):** Regulação de leitos pelo NIR com mapa do censo hospitalar (UTI e Enfermarias), acompanhamento multidisciplinar no Kanban de Internação por especialidade e encerramento com Alta Segura, receita com QR Code autenticável pelo CFM e geração de guias TISS 4.01 (ANS).

\`\`\`mermaid
flowchart TD
    subgraph S1["1. Entrada e Triagem"]
        A["01. Recepção e Acolhimento"] --> B["02. Triagem Manchester"]
        B --> C["03. Fila e Painel TV"]
    end
    subgraph S2["2. Assistência e Farmácia"]
        C --> D["04. Consultório PEP SOAPE"]
        D --> E["05. Prescrição CDSS"]
        E --> F["06. Farmácia Hospitalar"]
    end
    subgraph S3["3. Internação e Desfecho"]
        D --> G["07. Estagnação no PS"]
        D --> H["08. Regulação e Censo Leitos"]
        H --> I["09. Kanban de Internação"]
        I --> J["10. Alta Segura e QR Code CFM"]
    end
\`\`\`

| Macrofase Operacional | Etapas do Sistema | Perfis Envolvidos | Meta Assistencial e Governança |
| :--- | :--- | :--- | :--- |
| **1. Porta de Entrada & Risco** | 01. Recepção · 02. Triagem · 03. TV | Recepção & Enfermagem | Admissão rápida (< 5 min) e priorização imediata por risco vital |
| **2. Assistência & Farmácia** | 04. Consultório · 05. Prescrição · 06. Farmácia · 07. Estagnação | Médicos & Farmacêuticos | Registro SOAPE completo e bloqueio de interações graves |
| **3. Governança & Desfecho** | 08. Regulação · 09. Kanban · 10. Alta e TISS | NIR, Assistenciais e Faturamento | Otimização do giro de leitos, alta com QR Code e faturamento ANS |

<div class="page-break"></div>

## 3. DETALHAMENTO DAS ETAPAS OPERACIONAIS COM PRINTS EXCLUSIVOS

### ETAPA 01: ACOLHIMENTO, ADMISSÃO E PREVENÇÃO DE DUPLICIDADES (RECEPÇÃO)

A recepção é a porta de entrada física e digital do paciente no complexo de saúde. O objetivo operacional é registrar a admissão com agilidade máxima (< 5 minutos por ficha), eliminando homônimos e prontuários duplicados.

#### Rotina Operacional da Recepção:
1. **Identificação Documental:** Coleta do CPF ou número do Cartão Nacional de Saúde (CNS).
2. **Validação Automática de Integridade:**
   - O sistema efetua a verificação de algoritmo do CPF (dígitos verificadores).
   - O campo CEP realiza consulta assíncrona ao *ViaCEP* para preenchimento imediato de logradouro, bairro, município e UF.
3. **Mecanismo Antiduplicidade (HTTP 409 Conflict):**
   - Caso um operador tente cadastrar um paciente cujo CPF ou Nome Completo (case-insensitive e normalizado sem acentos) já conste na base ativa, o sistema emite alerta imediato e oferece a reutilização da ficha cadastral mestre, preservando o histórico preexistente.
4. **Abertura da Ficha de Atendimento:**
   - O atendente vincula o convênio (Particular, Unimed, Bradesco Saúde, SUS, etc.) e o motivo geral da procura.
   - O paciente recebe a pulseira hospitalar e sua ficha é despachada automaticamente para o status **Aguardando_Triagem**.

![Tela de Pacientes e Recepção Hospitalar](screenshots/02-pacientes.png)

---

### ETAPA 02: TRIAGEM DE ENFERMAGEM & PROTOCOLO DE MANCHESTER

Ao ser chamado pelo nome ou número da senha, o paciente entra no consultório de triagem, conduzido por profissional de enfermagem capacitado.

#### Parâmetros Coletados e Registrados:
- **Pressão Arterial (PA):** Sistólica e Diastólica (mmHg).
- **Frequência Cardíaca (FC):** Batimentos por minuto (bpm).
- **Frequência Respiratória (FR):** Incursões por minuto (irpm).
- **Temperatura Axilar (°C):** Termometria digital.
- **Saturação Periférica de Oxigênio (SpO2 %):** Oximetria de pulso.
- **Glicemia Capilar (mg/dL):** Em casos suspeitos ou diabéticos.
- **Escala Visual Analógica de Dor (EVA 0 a 10):** Mensuração de desconforto álgico.

#### Classificação Internacional de Manchester & SLA:

| Classificação | Cor de Risco | Gravidade Clínica | SLA Tempo Máximo de Espera | Conduta Operacional Imediata |
| :--- | :--- | :--- | :--- | :--- |
| **Emergência** | 🔴 Vermelho | Risco iminente de morte | **0 minutos (Imediato)** | Encaminhamento imediato para Sala Vermelha / Ressuscitação |
| **Muito Urgente** | 🟠 Laranja | Risco crítico de deterioração | **10 minutos** | Monitorização contínua e acionamento do médico plantonista |
| **Urgente** | 🟡 Amarelo | Condição estável com gravidade moderada | **60 minutos** | Encaminhamento para leito de observação ou sala de espera medicada |
| **Pouco Urgente** | 🟢 Verde | Condição crônica agudizada sem risco vital | **120 minutos** | Aguardo na sala de espera para consulta médica |
| **Não Urgente** | 🔵 Azul | Queixas leves e de baixa complexidade | **240 minutos** | Atendimento eletivo ou orientação para UBS de referência |

#### Escore MEWS (Modified Early Warning Score):
O sistema calcula automaticamente o índice MEWS com base na combinação dos sinais vitais. Índices MEWS >= 4 disparam um card pulsante na cor vermelha no topo da fila médica, alertando toda a equipe sobre risco iminente de colapso hemodinâmico.

![Central de Atendimento e Triagem Manchester](screenshots/03-triagem-kanban.png)

---

### ETAPA 03: PAINEL TV DE CHAMADAS EM SALA DE ESPERA COM SÍNTESE DE VOZ

O módulo de TV substitui as tradicionais senhas impressas por um painel audiovisual dinâmico para salas de espera e recepções hospitalares, compatível com smart TVs, monitores verticais e navegadores modernos.

#### Recursos do Painel TV do Health Nexus:
1. **Síntese de Voz Nativa em Português (Web Speech API):**
   - Ao ser acionado o botão "Chamar para Consulta", a TV reproduz mensagem falada clara: *"Atenção: Paciente [Nome do Paciente], favor dirigir-se ao [Consultório 01]"*.
2. **Identificação Visual em Alto Contraste:**
   - O card da chamada atual é exibido em tamanho ampliado com piscar luminoso, facilitando a visualização por idosos e pessoas com baixa acuidade visual.
3. **Histórico dos Últimos Chamados:**
   - Exibição lateral em rolagem com os últimos 5 pacientes convocados, reduzindo pedidos de repetição na recepção.
4. **Sincronização em Tempo Real (Polling 3s / WebSocket):**
   - A TV escuta alterações da fila em tempo real, sem necessidade de recarregar a página manualmente pelo operador.

![Painel TV de Chamadas Hospitalares](screenshots/09-painel-tv.png)

---

### ETAPA 04: ATENDIMENTO MÉDICO NO CONSULTÓRIO & PRONTUÁRIO ELETRÔNICO (PEP SOAPE)

O médico acessa a lista de consultórios e visualiza a fila ordenada estritamente pela prioridade Manchester e pelo tempo de espera decorrido.

#### Estrutura do Prontuário Clínico SOAPE:
- **S (Subjetivo):** Anamnese relatada pelo paciente ou acompanhante, queixa principal e tempo de evolução dos sintomas.
- **O (Objetivo):** Exame físico detalhado, inspeção, ausculta cardiopulmonar, palpação abdominal e conferência dos sinais vitais aferidos na triagem.
- **A (Avaliação):** Hipótese diagnóstica estruturada com busca rápida de código **CID-10** (Classificação Internacional de Doenças) e estratificação de gravidade.
- **P (Plano Terapêutico):** Solicitação de exames laboratoriais/imagem, conduta medicamentosa e orientações gerais.
- **E (Evolução Assistencial):** Desfecho do atendimento: Alta com Receita, Observação no PS ou Solicitação de Internação Hospitalar.

![Módulo de Consultórios e Fila Médica](screenshots/04-consultorios.png)

![Modal de Prontuário Eletrônico SOAPE](screenshots/11-prontuario-pep.png)

---

### ETAPA 05: PRESCRIÇÃO ELETRÔNICA & CDSS (INTERAÇÕES E ALERGIAS)

Integrado ao Prontuário Eletrônico, o módulo de prescrição do Health Nexus conta com inteligência de suporte à decisão clínica (**CDSS**):

#### Regras de Segurança Farmacológica:
1. **Checagem Ativa de Alergias:**
   - Se o paciente possui alergia declarada a Dipirona, Penicilinas ou AINEs e o médico tenta prescrever um desses compostos, o sistema bloqueia a emissão e emite alerta com borda vermelha pulsante.
2. **Interações Medicamentosas de Grau Grave:**
   - O motor analisa a combinação de medicamentos e detecta riscos de toxicidade, arritmias (prolongamento do intervalo QT) ou sinergismo nocivo (ex.: Varfarina com Ácido Acetilsalicílico ou Levofloxacino com Amiodarona).
3. **Assinatura Digital & Carimbo do Conselho:**
   - A prescrição é assinada com o CRM e UF do médico responsável, gerando código de validação criptográfico para conferência pela farmácia e pelo paciente.

---

### ETAPA 06: FARMÁCIA HOSPITALAR, APRAZAMENTO E DISPENSAÇÃO RASTREÁVEL

A farmácia hospitalar recebe instantaneamente as prescrições médicas salvas no sistema, dispensando papel e telefonemas intermediários.

#### Ciclo da Dispensação:
1. **Fila de Prescrições Pendentes:** Ordenadas por urgência do setor (Pronto-Socorro, UTI, Enfermaria).
2. **Checagem de Estoque em Tempo Real:** Verificação de saldo de frascos, ampolas e comprimidos por lote e validade.
3. **Aprazamento pela Enfermagem:** Definição de horários de administração (ex.: 6/6h, 8/8h, 12/12h).
4. **Baixa Rastreável:** Leitura de código de barras na separação do kit unitário com baixa automática no Kardex de estoque hospitalar.

![Farmácia Hospitalar e Controle de Dispensação](screenshots/07-farmacia.png)

---

### ETAPA 07: TELEMETRIA DE ESTAGNAÇÃO NO PRONTO-SOCORRO (PS)

O módulo de **Estagnação PS** é uma ferramenta de governança clínica desenhada para combater a superlotação e a permanência indevida de pacientes em macas de pronto-atendimento.

#### Níveis de Alerta de Permanência:
- **Faixa Verde (0 a 2 horas):** Paciente em tempo regulamentar de triagem, consulta e coleta de exames iniciais.
- **Faixa Amarela (2 a 4 horas):** Paciente aguardando laudo de exames ou reavaliação médica. Requer acompanhamento da chefia de enfermagem.
- **Faixa Vermelha (> 4 a 6 horas):** Risco de desassistência e estagnação de fluxo. O sistema emite notificação para a coordenação do PS para decisão rápida: Alta hospitalar ou pedido formal de internação.

![Painel de Estagnação no Pronto-Socorro](screenshots/10-estagnacao.png)

---

### ETAPA 08: REGULAÇÃO DE LEITOS, CENSO HOSPITALAR E HIGIENIZAÇÃO

Quando o médico assistente define pela necessidade de internação, o paciente é transferido para o fluxo do **NIR (Núcleo Interno de Regulação)**.

#### Ciclo de Vida do Leito Hospitalar:
1. **Vago (Verde):** Leito limpo, revisado e disponível para admissão imediata.
2. **Ocupado (Vermelho):** Leito com paciente alocado fisicamente e equipe médica atribuída.
3. **Aguardando Higienização (Amarelo):** Paciente recebeu alta ou foi transferido; a equipe de hotelaria/limpeza é acionada para desinfecção terminal.
4. **Em Manutenção (Cinza):** Bloqueio técnico para reparos de infraestrutura, gases medicinais ou isolamento epidemiológico.

#### Inovações e Sincronização em Tempo Real (v2.8.1):
- **Destaque Visual Spotlight Pulsante:** Ao alocar um paciente (admissão direta ou transferência via prontuário PEP), o sistema sincroniza e invalida o cache de leitos e atendimentos de forma imediata. O card correspondente passa a pulsar visualmente (\`patient-pulse-selected patient-spotlight-glow\`), recebe o selo \`⚡ Paciente em Foco\` e o mapa de leitos realiza auto-scroll centralizado para fácil localização.
- **Proteção Automática de Filtros:** Se o filtro de setor da tela de leitos estiver em uma ala divergente (ex: focado em *Pediatria* para um leito de *Observação*), o sistema automaticamente restaura a exibição para *Todos os Setores*, evitando que o leito ocupado fique invisível.
- **Foco Assistencial no Guia de Fluxo (Smart Flow Guide):** Na Etapa 6 de 6 (Leitos), o card do fluxo mantém o foco na internação ativa: o botão primário abre a **Evolução Médica no PEP** e oferece ações secundárias para **Conceder Alta**, **Focar no Leito** e **Ver no Kanban**, garantindo que o faturamento só seja sugerido após a efetiva alta hospitalar.

![Censo de Leitos e Mapa de Ocupação Hospitalar](screenshots/05-censo-leitos.png)

---

### ETAPA 09: KANBAN DE INTERNAÇÃO E GESTÃO POR ESPECIALIDADE

O Kanban de Internação oferece visão visual integrada de todos os leitos ativos divididos por clínicas e especialidades:
- **Clínica Médica**
- **Cirurgia Geral & Especialidades Cirúrgicas**
- **Unidade de Terapia Intensiva (UTI Adulto / Coronariana)**
- **Maternidade & Pediatria**

#### Funcionalidades do Kanban:
- Visualização de diagnósticos principais, dias de internação (LOS - Length of Stay) e riscos assistenciais.
- Cards com indicação de isolamento respiratório ou de contato.
- Movimentação entre leitos com registro no censo hospitalar.

![Kanban de Internação por Especialidade](screenshots/06-kanban-internacao.png)

---

### ETAPA 10: DESOSPITALIZAÇÃO, ALTA SEGURA, FATURAMENTO TISS & QR CODE

A conclusão do ciclo assistencial encerra tanto o prontuário clínico quanto o lote de faturamento hospitalar.

#### Procedimentos da Alta:
1. **Sumário de Alta:** Diagnósticos tratados, exames relevantes realizados, procedimentos cirúrgicos executados e plano de cuidados domiciliares.
2. **Prescrição de Alta com QR Code (CFM):** Receita médica emitida com QR Code escaneável por celular para conferência de autenticidade no validador do Conselho Federal de Medicina.
3. **Faturamento TISS 4.01 (ANS):**
   - Agrupamento de diárias, taxas, medicamentos, materiais e honorários médicos.
   - Geração de Guia de SP/SADT e Guia de Resumo de Internação compatíveis com XML TISS da Agência Nacional de Saúde Suplementar (ANS).

![Faturamento Hospitalar e Padrão TISS 4.01](screenshots/08-faturamento-tiss.png)

---

## 4. MATRIZ DE RESPONSABILIDADES OPERACIONAIS (RACI MATRIX)

A tabela abaixo define os papéis funcionais de cada membro da equipe hospitalar ao longo do fluxo:

| Etapa do Fluxo Assistencial | Recepção | Enfermagem | Médico Emergencista | Médico Hospitalista | Farmacêutico | Núcleo de Regulação (NIR) | Faturamento & Auditoria |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **01. Admissão e Busca CEP** | [Responsável] | [Informado] | [Não Envolvido] | [Não Envolvido] | [Não Envolvido] | [Não Envolvido] | [Consultado] |
| **02. Triagem Manchester & MEWS** | [Informado] | [Responsável] | [Consultado] | [Não Envolvido] | [Não Envolvido] | [Não Envolvido] | [Não Envolvido] |
| **03. Chamada no Painel TV** | [Apoio] | [Operador] | [Responsável] | [Não Envolvido] | [Não Envolvido] | [Não Envolvido] | [Não Envolvido] |
| **04. Atendimento PEP SOAPE** | [Não Envolvido] | [Apoio] | [Responsável] | [Responsável] | [Não Envolvido] | [Não Envolvido] | [Não Envolvido] |
| **05. Prescrição & Alertas CDSS**| [Não Envolvido] | [Consultado] | [Responsável] | [Responsável] | [Aprovador] | [Não Envolvido] | [Consultado] |
| **06. Separação e Dispensação** | [Não Envolvido] | [Administrador]| [Não Envolvido] | [Não Envolvido] | [Responsável] | [Não Envolvido] | [Auditor] |
| **07. Telemetria Estagnação PS** | [Informado] | [Monitor] | [Responsável] | [Não Envolvido] | [Não Envolvido] | [Gestor] | [Não Envolvido] |
| **08. Regulação e Censo Leitos**| [Informado] | [Consultado] | [Solicitante] | [Solicitante] | [Não Envolvido] | [Responsável] | [Não Envolvido] |
| **09. Evolução no Kanban** | [Não Envolvido] | [Anotador] | [Não Envolvido] | [Responsável] | [Consultado] | [Monitor] | [Não Envolvido] |
| **10. Alta Segura e Guia TISS** | [Recepção Pós] | [Orientador] | [Responsável] | [Responsável] | [Informado] | [Liberador] | [Responsável] |

---

## 5. MATRIZ DE SLAs ASSISTENCIAIS E METAS TEMPORAIS

| Marco Assistencial | Meta Operacional | Ação de Contingência se Estourar | Responsável pelo Desbloqueio |
| :--- | :--- | :--- | :--- |
| **Acolhimento na Recepção** | <= 5 minutos | Abertura de guichê de contingência na recepção | Supervisão de Recepção |
| **Espera para Triagem Manchester** | <= 10 minutos | Alocação de segundo enfermeiro triador | Coordenação de Enfermagem |
| **Manchester Vermelho (Emergência)**| **0 minutos (Imediato)**| Acionamento de Código Vermelho na Sala de Parada | Médico Plantonista e Equipe |
| **Manchester Laranja (Muito Urgente)**| <= 10 minutos | Interrupção de consultas eletivas para atendimento | Chefe de Plantão Médico |
| **Manchester Amarelo (Urgente)** | <= 60 minutos | Reavaliação de sinais vitais e escore MEWS | Enfermeiro de Sala de Espera |
| **Tempo de Permanência no PS** | <= 4 horas | Desfecho clínico compulsório: Alta ou Pedido de Leito | Gestor de Pronto-Socorro |
| **Higienização de Leito Hospitalar** | <= 45 minutos | Notificação de prioridade para equipe de Hotelaria | Gestão de Leitos / Hotelaria |
| **Dispensação de Medicação Urgente** | <= 15 minutos | Fármaco retirado no satélite de emergência da farmácia| Farmacêutico Plantonista |
| **Fechamento de Conta e Guia TISS** | <= 24 horas pós-alta | Auditoria concorrente de prontuário e faturamento | Auditoria de Contas Médicas |

---

## 6. PROTOCOLOS DE CONTINGÊNCIA & DEGRADAÇÃO CONTROLADA

1. **Indisponibilidade Temporária de Conexão Externa:**
   - O Health Nexus mantém cache de sessão local via IndexedDB e sessionStorage, permitindo que a triagem e o atendimento médico continuem operando sem interrupção súbita.
   - Assim que a conectividade for restabelecida, o mecanismo de sincronização enfileirada efetua a persistência no banco de dados central.
2. **Superlotação de Leitos de UTI:**
   - O Núcleo Interno de Regulação (NIR) aciona o protocolo de leito extra de retaguarda ou transferência regulada via central de regulação municipal/estadual (CROSS / Central de Vagas), mantendo o paciente sob monitoramento MEWS no PS.
3. **Queda de Energia no Complexo Hospitalar:**
   - O sistema é hospedado em infraestrutura redundante e as estações de trabalho de áreas críticas (Triagem, Sala Vermelha, Farmácia e UTI) são conectadas a circuitos ininterruptos de no-break e geradores automáticos com chave de transferência em menos de 8 segundos.

---

## 7. CONFORMIDADE REGULATÓRIA, AUDITORIA & LGPD

- **LGPD (Lei Geral de Proteção de Dados - Lei 13.709/2018):**
  - Dados sensíveis de saúde são protegidos por controle de acesso baseado em papéis (RBAC - Role-Based Access Control).
  - Logs detalhados registram visualizações e alterações de prontuários com hash e IP de origem.
- **Resolução CFM nº 1.821/2007:**
  - Nível de Garantia de Segurança 2 (NGS2) para prontuários eletrônicos sem papel.
  - Guarda e preservação documental com assinatura digital e carimbo de tempo.
- **Padrão ANS TISS 4.01:**
  - Validação estrita de tabelas de domínio (TUSS, CID-10, CBHPM) na geração de lotes XML de faturamento.

---

*Manual de Fluxo Operacional e Jornada Assistencial do Paciente — Health Nexus v2.8.0*  
*Documento aprovado pela Diretoria Técnica Médica e Gerência de Engenharia Hospitalar.*
`;
}

/**
 * Função principal para gerar toda a cadeia do Manual de Fluxo Operacional
 */
export async function buildFluxoOperacionalManual() {
  console.log('--- INICIANDO COMPILAÇÃO DO MANUAL DE FLUXO OPERACIONAL (FASE 2: GERAÇÃO DE PDF ESTRUTURADO) ---');

  // 1. Gerar Markdown
  const mdContent = buildFluxoOperacionalMarkdown();

  const mdTargets = [
    path.resolve('MANUAL_FLUXO_OPERACIONAL.md'),
    path.resolve('public/MANUAL_FLUXO_OPERACIONAL.md'),
    path.resolve('docs/10-Manuais/03-manual-fluxo-operacional.md')
  ];

  for (const t of mdTargets) {
    fs.mkdirSync(path.dirname(t), { recursive: true });
    fs.writeFileSync(t, mdContent, 'utf8');
    console.log(`✓ Salvo: ${path.relative('.', t)}`);
  }

  // 2. Gerar versão HTML rica para visualização no navegador
  let rawHtml = await marked.parse(mdContent);
  rawHtml = rawHtml.replace(/<pre><code class="language-mermaid">([\s\S]*?)<\/code><\/pre>/g, (match, p1) => {
    const decoded = p1
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&amp;/g, '&');
    return `<div class="mermaid">\n${decoded}\n</div>`;
  });
  rawHtml = embedScreenshotsAsBase64(rawHtml);

  const interactiveWebHtml = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Manual de Fluxo Operacional & Jornada Assistencial — Health Nexus v2.8.0</title>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Outfit:wght@500;600;700;800&family=JetBrains+Mono:wght@400;600&display=swap" rel="stylesheet">
  <script src="https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js"></script>
  <style>
    :root {
      --primary: #0284c7;
      --bg: #0b0f19;
      --card-bg: #1e293b;
      --border: #334155;
      --text: #f8fafc;
      --text-muted: #94a3b8;
    }
    * { box-sizing: border-box; }
    body {
      font-family: 'Inter', sans-serif;
      background-color: var(--bg);
      color: #e2e8f0;
      margin: 0;
      padding: 0;
      line-height: 1.7;
    }
    .cover-banner {
      background: linear-gradient(135deg, #0c4a6e 0%, #0369a1 50%, #1e1b4b 100%);
      padding: 60px 30px;
      text-align: center;
      border-bottom: 4px solid #38bdf8;
    }
    .cover-badge {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 6px 16px;
      background: rgba(255, 255, 255, 0.15);
      border-radius: 999px;
      font-size: 13px;
      font-weight: 600;
      color: #e0f2fe;
      margin-bottom: 16px;
      border: 1px solid rgba(255, 255, 255, 0.25);
    }
    .cover-banner h1 {
      font-family: 'Outfit', sans-serif;
      font-size: 34px;
      color: #ffffff;
      margin: 0 0 12px 0;
    }
    .cover-banner p {
      font-size: 16px;
      color: #bae6fd;
      max-width: 800px;
      margin: 0 auto;
    }
    .container {
      max-width: 1200px;
      margin: 0 auto;
      padding: 40px 24px;
    }
    .content-box {
      background: #111827;
      border: 1px solid var(--border);
      border-radius: 16px;
      padding: 40px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.5);
    }
    h2 {
      font-family: 'Outfit', sans-serif;
      font-size: 24px;
      color: #38bdf8;
      border-bottom: 2px solid #1e293b;
      padding-bottom: 10px;
      margin-top: 40px;
    }
    h3 {
      font-size: 19px;
      color: #7dd3fc;
      margin-top: 28px;
    }
    h4 {
      font-size: 16px;
      color: #cbd5e1;
      margin-top: 20px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 24px 0;
      font-size: 14px;
      border: 1px solid var(--border);
      border-radius: 8px;
      overflow: hidden;
    }
    th {
      background: #0f172a;
      color: #38bdf8;
      padding: 12px 16px;
      text-align: left;
      border: 1px solid var(--border);
      font-weight: 600;
    }
    td {
      padding: 12px 16px;
      border: 1px solid var(--border);
      background: rgba(30, 41, 59, 0.4);
    }
    tr:nth-child(even) td {
      background: rgba(15, 23, 42, 0.6);
    }
    .screenshot-figure {
      margin: 32px 0;
      padding: 16px;
      background: #0f172a;
      border: 1px solid var(--border);
      border-radius: 12px;
      text-align: center;
    }
    .manual-screenshot {
      max-width: 100%;
      max-height: 540px;
      border-radius: 8px;
      border: 1px solid #334155;
    }
    .screenshot-figure figcaption {
      margin-top: 10px;
      font-size: 13px;
      color: #94a3b8;
      font-style: italic;
    }
    .mermaid {
      background: #0f172a;
      padding: 20px;
      border-radius: 12px;
      border: 1px solid var(--border);
      margin: 24px 0;
      text-align: center;
    }
    .btn-download-pdf {
      display: inline-flex;
      align-items: center;
      gap: 10px;
      background: #0284c7;
      color: #fff;
      padding: 12px 24px;
      border-radius: 8px;
      text-decoration: none;
      font-weight: 600;
      margin-top: 20px;
      transition: all 0.2s ease;
    }
    .btn-download-pdf:hover {
      background: #0369a1;
      transform: translateY(-2px);
    }
  </style>
</head>
<body>
  <div class="cover-banner">
    <div class="cover-badge"><i class="fa-solid fa-hospital"></i> Health Nexus v2.8.0</div>
    <h1>Manual de Fluxo Operacional & Jornada do Paciente</h1>
    <p>Arquitetura de Processos Clínicos, Triagem Manchester, Chamadas de TV com Voz, CDSS e Regulação Hospitalar</p>
    <div>
      <a href="Manual_Fluxo_Operacional_Health_Nexus.pdf" class="btn-download-pdf" download>
        <i class="fa-solid fa-file-pdf"></i> Baixar Manual em PDF Oficial
      </a>
    </div>
  </div>

  <div class="container">
    <div class="content-box">
      ${rawHtml}
    </div>
  </div>

  <script>
    document.addEventListener('DOMContentLoaded', () => {
      if (window.mermaid) {
        mermaid.initialize({
          startOnLoad: true,
          theme: 'dark',
          themeVariables: {
            fontFamily: 'Inter, sans-serif',
            fontSize: '14px'
          }
        });
      }
    });
  </script>
</body>
</html>`;

  fs.writeFileSync(path.resolve('public/manual_fluxo_operacional.html'), interactiveWebHtml, 'utf8');
  console.log('✓ Salvo: public/manual_fluxo_operacional.html');

  // 3. Preparar HTML para compilação PDF estritamente formatado
  const formattedForPdf = formatContentForPdf(rawHtml);

  const pdfPrintHtml = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Manual de Fluxo Operacional — Health Nexus v2.8.0</title>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
  <script src="https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js"></script>
  <style>
    @page {
      size: A4;
      margin: 16mm 12mm 16mm 12mm;
    }
    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    body {
      font-family: 'Segoe UI', Arial, sans-serif !important;
      color: #0f172a;
      background: #ffffff;
      font-size: 11pt;
      line-height: 1.55;
      margin: 0;
      padding: 0;
    }
    .page-break {
      page-break-before: always !important;
      break-before: page !important;
    }
    .pdf-cover {
      background: linear-gradient(135deg, #0c4a6e 0%, #0369a1 60%, #1e1b4b 100%) !important;
      color: #ffffff !important;
      padding: 22px 20px !important;
      border-radius: 10px !important;
      text-align: center !important;
      margin-bottom: 12px !important;
      page-break-after: avoid !important;
    }
    .pdf-cover .badge {
      display: inline-block;
      padding: 3px 12px;
      background: rgba(255, 255, 255, 0.2) !important;
      border-radius: 999px;
      font-size: 8.5pt;
      font-weight: bold;
      margin-bottom: 8px;
      color: #f0fdf4 !important;
    }
    .pdf-cover h1 {
      font-size: 20pt;
      font-weight: 800;
      margin: 0 0 6px 0;
      color: #ffffff !important;
      line-height: 1.2;
    }
    .pdf-cover h2 {
      font-size: 11pt;
      font-weight: 600;
      margin: 0 0 8px 0;
      color: #bae6fd !important;
      border-bottom: none !important;
      padding-bottom: 0 !important;
    }
    .pdf-cover p {
      font-size: 9pt;
      color: #e0f2fe !important;
      max-width: 90%;
      margin: 0 auto 10px auto;
    }
    .pdf-cover .meta-box {
      display: flex;
      justify-content: center;
      gap: 16px;
      font-size: 8pt;
      color: #ffffff !important;
      background: rgba(0, 0, 0, 0.25) !important;
      padding: 5px 12px;
      border-radius: 6px;
    }
    h1 {
      font-size: 18pt;
      color: #0369a1;
      border-bottom: 2px solid #0284c7;
      padding-bottom: 6px;
      margin-top: 24px;
      margin-bottom: 14px;
      page-break-after: avoid;
    }
    h2 {
      font-size: 14pt;
      color: #0284c7;
      border-bottom: 1.5px solid #e2e8f0;
      padding-bottom: 4px;
      margin-top: 20px;
      margin-bottom: 10px;
      page-break-after: avoid;
    }
    h3 {
      font-size: 12pt;
      color: #0f172a;
      margin-top: 16px;
      margin-bottom: 8px;
      page-break-after: avoid;
    }
    h4 {
      font-size: 11pt;
      color: #334155;
      margin-top: 14px;
      margin-bottom: 6px;
      page-break-after: avoid;
    }
    p, li {
      font-size: 10.5pt;
      line-height: 1.55;
      color: #1e293b;
      margin-bottom: 6px;
    }
    ul, ol {
      margin-top: 4px;
      margin-bottom: 10px;
      padding-left: 24px;
    }
    table {
      width: 100% !important;
      border-collapse: collapse !important;
      margin: 14px 0 20px 0 !important;
      font-size: 9pt !important;
      page-break-inside: avoid !important;
      break-inside: avoid !important;
      background: #ffffff !important;
    }
    th {
      background: #0f172a !important;
      color: #ffffff !important;
      padding: 7px 10px !important;
      text-align: left !important;
      font-weight: 700 !important;
      border: 1px solid #334155 !important;
    }
    td {
      padding: 6px 10px !important;
      border: 1px solid #cbd5e1 !important;
      vertical-align: top !important;
      color: #0f172a !important;
    }
    tr:nth-child(even) td {
      background: #f8fafc !important;
    }
    code {
      font-family: Consolas, 'Courier New', monospace !important;
      background: #f1f5f9 !important;
      color: #0369a1 !important;
      padding: 1px 4px !important;
      border-radius: 3px !important;
      font-size: 9pt !important;
    }
    .screenshot-figure {
      margin: 14px 0 20px 0 !important;
      padding: 6px !important;
      background: #f8fafc !important;
      border: 1px solid #cbd5e1 !important;
      border-radius: 8px !important;
      text-align: center !important;
      page-break-inside: avoid !important;
      break-inside: avoid !important;
    }
    .manual-screenshot {
      max-width: 100% !important;
      max-height: 380px !important;
      height: auto !important;
      border-radius: 6px !important;
      border: 1px solid #cbd5e1 !important;
      display: block !important;
      margin: 0 auto !important;
    }
    .screenshot-figure figcaption {
      margin-top: 6px !important;
      font-size: 8.5pt !important;
      color: #475569 !important;
      font-style: italic !important;
    }
    .status-badge {
      display: inline-block !important;
      padding: 2px 7px !important;
      border-radius: 4px !important;
      font-weight: 700 !important;
      font-size: 8.5pt !important;
    }
    .status-green { background: #dcfce7 !important; color: #166534 !important; border: 1px solid #86efac !important; }
    .status-red { background: #fee2e2 !important; color: #991b1b !important; border: 1px solid #fca5a5 !important; }
    .status-orange { background: #ffedd5 !important; color: #c2410c !important; border: 1px solid #fdba74 !important; }
    .status-yellow { background: #fef9c3 !important; color: #854d0e !important; border: 1px solid #fde047 !important; }
    .status-blue { background: #e0f2fe !important; color: #075985 !important; border: 1px solid #7dd3fc !important; }
    .status-gray { background: #f1f5f9 !important; color: #334155 !important; border: 1px solid #cbd5e1 !important; }
    .status-dot {
      display: inline-block;
      width: 7px;
      height: 7px;
      border-radius: 50%;
      margin-right: 4px;
      vertical-align: middle;
    }
    .dot-green { background: #16a34a !important; }
    .dot-red { background: #dc2626 !important; }
    .dot-orange { background: #ea580c !important; }
    .dot-yellow { background: #ca8a04 !important; }
    .dot-blue { background: #0284c7 !important; }
    .dot-gray { background: #64748b !important; }
    .mermaid {
      background: #f8fafc !important;
      border: 1px solid #cbd5e1 !important;
      padding: 6px !important;
      border-radius: 8px !important;
      margin: 8px auto !important;
      text-align: center !important;
      page-break-inside: avoid !important;
      break-inside: avoid !important;
      max-height: 380px !important;
    }
    .mermaid svg {
      max-width: 100% !important;
      max-height: 350px !important;
      height: auto !important;
      margin: 0 auto !important;
      display: block !important;
    }
  </style>
</head>
<body>
  <div class="pdf-cover">
    <div class="badge">
      <i class="fa-solid fa-hospital-user"></i> Health Nexus v2.8.0
    </div>
    <h1>Manual de Fluxo Operacional & Jornada Assistencial</h1>
    <h2>Processos Clínicos, Triagem Manchester, Chamadas de TV com Voz e Regulação de Leitos</h2>
    <p>Guia técnico e operacional passo a passo da jornada do paciente dentro do ecossistema hospitalar.</p>
    <div class="meta-box">
      <span><b>Edição:</b> Oficial 2026</span>
      <span><b>Protocolo:</b> Manchester & MEWS</span>
      <span><b>Faturamento:</b> ANS TISS 4.01</span>
      <span><b>Certificação:</b> CFM QR Code</span>
    </div>
  </div>

  ${formattedForPdf.replace(/<h1[^>]*>[\s\S]*?<\/h1>/i, '').replace(/<h2[^>]*>[\s\S]*?<\/h2>/i, '').replace(/<h3[^>]*>[\s\S]*?<\/h3>/i, '').replace(/<hr\s*\/?>/i, '')}

  <script>
    document.addEventListener('DOMContentLoaded', () => {
      if (window.mermaid) {
        mermaid.initialize({
          startOnLoad: true,
          theme: 'neutral',
          themeVariables: {
            fontSize: '13px',
            fontFamily: 'Segoe UI, sans-serif'
          },
          securityLevel: 'loose'
        });
      }
    });
  </script>
</body>
</html>`;

  console.log('Iniciando Puppeteer para compilar Manual_Fluxo_Operacional_Health_Nexus.pdf...');
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  page.setDefaultTimeout(120000);
  page.setDefaultNavigationTimeout(120000);

  await page.setContent(pdfPrintHtml, { waitUntil: 'load', timeout: 120000 });

  await page.evaluate(async () => {
    if (document.fonts && document.fonts.ready) {
      await document.fonts.ready;
    }
    if (window.mermaid) await window.mermaid.run();
  });

  await new Promise(resolve => setTimeout(resolve, 2500));

  const pdfOut = path.resolve('Manual_Fluxo_Operacional_Health_Nexus.pdf');
  const publicPdfOut = path.resolve('public/Manual_Fluxo_Operacional_Health_Nexus.pdf');

  await page.pdf({
    path: pdfOut,
    format: 'A4',
    margin: { top: '16mm', right: '12mm', bottom: '16mm', left: '12mm' },
    printBackground: true,
    displayHeaderFooter: true,
    headerTemplate: `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; font-size: 8px; color: #64748b; width: 100%; padding: 0 12mm; display: flex; justify-content: space-between; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px;">
        <span>Health Nexus — Manual de Fluxo Operacional & Jornada Assistencial</span>
        <span>v2.8.0 Oficial</span>
      </div>`,
    footerTemplate: `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; font-size: 8px; color: #64748b; width: 100%; padding: 0 12mm; display: flex; justify-content: space-between; border-top: 1px solid #e2e8f0; padding-top: 4px;">
        <span>Confidencial · Protocolo Hospitalar & Processos Clínicos</span>
        <span>Página <span class="pageNumber"></span> de <span class="totalPages"></span></span>
      </div>`
  });

  await browser.close();
  fs.copyFileSync(pdfOut, publicPdfOut);

  console.log(`✓ Manual_Fluxo_Operacional_Health_Nexus.pdf compilado com sucesso!`);
  console.log(`✓ Cópia sincronizada em public/Manual_Fluxo_Operacional_Health_Nexus.pdf`);
}

if (process.argv[1] && process.argv[1].endsWith('generate_fluxo_operacional.mjs')) {
  buildFluxoOperacionalManual().catch(console.error);
}
