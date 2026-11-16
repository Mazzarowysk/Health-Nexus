# Relatório Comparativo Técnico & Diagnóstico Operacional
## Sistema Hospitalar de Referência (Legado SUS) vs. Health Nexus (v2.9.23)

**Data de Emissão:** Outubro de 2026  
**Documento:** Auditoria de Requisitos Assistenciais e Mapeamento de Evolução de Software  
**Elaboração:** Equipe de Arquitetura e Engenharia Clínica Health Nexus  

---

### Sumário Executivo

Este documento consolida a análise detalhada de **12 telas e árvores de navegação** extraídas de um sistema hospitalar legado consolidado no Sistema Único de Saúde (SUS) e rede conveniada (arquitetura padrão desktop Delphi/Visual Basic utilizada em prontos-socorros e hospitais gerais).

O objetivo é confrontar cada tela operacional, campo de formulário e fluxo de trabalho do sistema de referência com os recursos nativos já desenvolvidos no **Health Nexus**, destacando as vantagens tecnológicas da plataforma moderna e estruturando a implementação imediata das funcionalidades complementares de maior impacto clínico.

---

### 1. Mapeamento e Diagnóstico das Telas de Referência

#### 1.1. Admissão e Atendimento de Pronto-Socorro (Imagem 1)
- **Campos Principais:** Número de Atendimento, Agendamento, Guia C.C., Prontuário, Nome do Paciente, Data, Hora, Convênio, Categoria, Idade, Acomodação/Leito, Local de Atendimento, Médico Responsável, Tipo de Atendimento, Vínculo, Origem, Prioridade, Diagnóstico Inicial, Programa, Especialidade, Frequência, Órgão Solicitante, Hipótese Diagnóstica, Acompanhantes (*Não permite / Necessário*), Dados do Segurado e Senha de Painel.
- **Barra Lateral de Ações:** Finalização, Encaminhamento, Cobrança, Guias, Rastreabilidade de Documentos, Pendências, Serviços, Materiais/Medicamentos, Observação, Obstetrícia, Acompanhantes.

#### 1.2. Prontuário e Histórico de Passagens do Paciente (Imagens 2 e 9 - Breno Coltri)
- **Estrutura de Linha do Tempo:** Lista cronológica de passagens com Data, Descrição/CID e Desfecho (*PACIENTE LIBERADO*).
- **Detalhamento da Passagem Selecionada:** Número único de atendimento, Data de Admissão e Data de Alta, Conclusão do Atendimento, Local/Setor (*ex: PRONTO SOCORRO - VL ABARCA ou TOMOGRAFIA - VL ABARCA*), Tipo de Atendimento (*URG/EMERG ou EXAMES*), Convênio (*SUS/UNIFICAD*), Médico Assistente e Procedimentos.
- **Destaque Crucial para SADT (Imagem 9):** Identificação de passagem originada em **"Atendimento a Paciente Externo"**, com Setor **"TOMOGRAFIA"** e Tipo **"EXAMES"**, demonstrando como os pedidos diagnósticos tramitam como atendimentos especializados.

#### 1.3. Árvores de Processos e Menus de Atendimento (Imagens 3, 6 e 7)
- **Árvore de Atendimento:** Agendamento ambulatorial e por exames, Internação, Ambulatório, Externo, Tratamento Continuado, Pronto-Socorro, Transferência de Paciente Internado, Orçamento de Guias, Acesso e Visitação, Pendências, Reimpressão de Etiquetas de Pulseira e de Amostras Laboratoriais, Finalização e Painel de Senhas.
- **Árvore de Internação:** Alerta de Evolução Médica, Acompanhamento de Enfermagem, Atalhos Médicos, Alta, Atestado, Censo Diário, Checagem de Medicamentos, Consulta de Prescrições, Controle de Permanência Autorizada, Formulário de Vagas, Interconsultas (*Especialista / Solicitante*), Prescrição e Solicitação de Internação.
- **Árvore de Acompanhamento Clínico:** Setores assistenciais, Infecção Hospitalar (SCIH), Relatórios e Estatísticas.

#### 1.4. Prontuário Único / Cadastro Geral SUS (Imagem 8)
- **Dados Cadastrais Unificados:** Número de Prontuário, Nome Social, Nome de Registro, Situação Cadastral (*Ativo com indicador verde*), Último Atendimento, RG com dígito e órgão emissor, CNS (Cartão Nacional de Saúde), Nacionalidade, Naturalidade, Sexo, Nascimento, Estado Civil, Raça/Cor, Religião, Documento/CPF, Número da Pasta de Arquivo Físico, Filiação (*Nome do Pai e Nome da Mãe*), Região/UBS, Endereço completo com CEP de Tupã-SP, telefones, e-mail, Termo LGPD, Convênio e identificador de integração com o sistema **CROSS** (Central de Regulação de Ofertas de Serviços de Saúde).

#### 1.5. Consulta Dinâmica de Atendimentos Multi-Modalidade (Imagens 10 e 11)
- **Módulo Central de Busca e Auditoria:**
  - Seletor de Modalidade do Atendimento: `35 - Internação`, `66 - Pronto Socorro`, `Ambulatório`, `Exames`.
  - Filtros avançados por Nome do Paciente, Setor, Data Inicial/Final, Médico Assistente, Convênio e Guia Operadora / AIH.
  - Grade operacional detalhada com Número Único da Passagem (`26.5.00...`), Nome, Data/Hora, Convênio, Médico, Setor e Modalidade.

---

### 2. Matriz Comparativa: O Que o Health Nexus Já Possui vs. Sistema Legado

| Dimensão Operacional | Sistema Legado de Referência | Health Nexus (v2.9.23) | Status Técnico |
|:---|:---|:---|:---:|
| **Classificação de Risco** | Campo textual simples de "Prioridade" | Protocolo Manchester com 5 cores dinâmicas, temporizadores e cálculo automatizado de escore MEWS e sepse | **Superado** ⭐ |
| **Painel de Chamadas TV** | Módulo de senha simples em terminal | Painel TV Full-Screen com chamada por voz sintetizada em português (pt-BR), aviso sonoro e tela de espera | **Superado** ⭐ |
| **Prontuário Médico (PEP)** | Formulários desacoplados e lentos | PEP SOAPE moderno com IA Copilot 2.0 (resumo em 3 linhas), ditado por voz, validação de interações graves e autocomplete CID-10 | **Superado** ⭐ |
| **Solicitação de Exames** | Telas separadas sem auxílio clínico | Módulo CPOE multicomplexidade, motor preditivo de exames baseado no histórico, bloqueio de duplicidades e inclusão automática no PDF | **Superado** ⭐ |
| **Gestão de Leitos** | Listagem de texto e formulário de vagas | Censo Hospitalar visual tricolor, Kanban de Internação por 5 alas, gestão de SLAs e higienização pós-alta | **Superado** ⭐ |
| **Faturamento e Glosas** | Telas de digitação manual de guias | Emissão de guias TISS v4.01, motor de validação anti-glosa e geração de lotes XML | **Superado** ⭐ |
| **Histórico do Paciente** | Grid tabular simples com detalhes laterais | Modal com 3 abas interativas, linha do tempo gráfica, aba de evoluções e aba exclusiva de exames solicitados | **Equivalente** ✅ |

---

### 3. Recomendações de Implementação Prioritária

Com base nas melhores práticas observadas nas telas, as seguintes funcionalidades foram aprovadas para desenvolvimento imediato:

1. **Consulta Dinâmica de Atendimentos (Localizador Geral):**  
   Painel de pesquisa e auditoria rápida permitindo filtrar todas as passagens do hospital por Modalidade (`Pronto Socorro`, `Internação`, `Ambulatório`, `Exames / SADT`), período de datas, médico, convênio e setor, com botões de acesso direto ao prontuário e exportação.

2. **Campos Complementares do Prontuário Único SUS:**  
   Adição no cadastro de pacientes dos campos: *Nome do Pai*, *Naturalidade (Cidade/UF)*, *Número da Pasta / Prontuário Físico* e *ID Paciente CROSS / Regulação*.

3. **Rastreabilidade Explícita de Paciente Externo / SADT:**  
   Registro e visualização das requisições de exames na linha do tempo como atendimentos de apoio diagnóstico externos, identificando o setor realizador (ex: *Tomografia, Análises Clínicas*).

4. **Impressão Térmica de Etiquetas Hospitalares:**  
   Módulo de geração de etiquetas térmicas de identificação (pulseira do paciente com dados vitais e código de barras, e etiquetas de amostras para tubos de laboratório).

---
*Health Nexus — Tecnologia Avançada, Segurança Clínica e Cuidado Humanizado.*
