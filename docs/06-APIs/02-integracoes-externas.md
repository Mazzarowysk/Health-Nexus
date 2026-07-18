# Health Nexus — Integrações Externas

Este documento detalha o funcionamento técnico, barramentos e APIs externas que se conectam ao **Health Nexus**.

---

## 1. APIs Governamentais e de Referência Nacional

### ViaCEP (Consulta de Endereço)
*   **Finalidade**: Autopreenchimento de campos de endereço na tela de cadastro de pacientes pelo CEP.
*   **Protocolo**: HTTP GET externo.
*   **Endpoint**: `https://viacep.com.br/ws/{cep}/json/`
*   **Comportamento**: Em caso de falha de conexão com a API ViaCEP, o frontend habilita a digitação manual de todos os campos sem interromper o cadastro.

### IBGE (Códigos de Município)
*   **Finalidade**: Mapear os códigos oficiais de 7 dígitos do IBGE para cidades brasileiras, exigidos no faturamento das guias de internação e atendimentos do SUS.
*   **Estratégia**: Para evitar requisições de rede lentas durante o faturamento, a tabela de municípios do IBGE é importada diretamente no PostgreSQL e cacheada em memória no Redis.

### CNES (Cadastro Nacional de Estabelecimentos de Saúde)
*   **Finalidade**: Importar e validar dados cadastrais de profissionais de saúde (CBO, número do conselho, especialidade) e da instituição de saúde para manter conformidade com as regras do Ministério da Saúde.
*   **Protocolo**: Integração XML ou leitura da base oficial do CNES/DataSUS disponibilizada periodicamente via SFTP.

### SIGTAP (Procedimentos e Valores do SUS)
*   **Finalidade**: Atualizar a tabela de procedimentos do SUS faturados em AIH e Boletins de Produção Ambulatorial (BPA).
*   **Estratégia**: O sistema roda uma tarefa programada mensal para importar os arquivos oficiais do SIGTAP (tabelas de regras, OPMs e valores) fornecidos pelo DataSUS, atualizando a base local do PostgreSQL.

---

## 2. Padrões de Saúde e Interoperabilidade

### CID-10 / CID-11 (Código Internacional de Doenças)
*   **Finalidade**: Fornecer busca inteligente e validação do diagnóstico médico no prontuário eletrônico.
*   **Estratégia**: Base completa de CIDs importada no banco local e indexada por *full-text search* no PostgreSQL com cache Redis para buscas instantâneas na digitação do médico.

### TUSS (Terminologia Unificada da Saúde Suplementar)
*   **Finalidade**: Identificar procedimentos, taxas e diárias nas guias de convênio enviadas à ANS.
*   **Estratégia**: A base da TUSS é dividida em tabelas locais no banco (`procedimentos`, `materiais`, `medicamentos`), atualizadas anualmente de acordo com as resoluções normativas da ANS.

### FHIR (Fast Healthcare Interoperability Resources)
*   **Finalidade**: Disponibilizar um barramento REST padronizado para troca de dados clínicos (PEP) com redes externas de saúde ou o barramento nacional (RNDS - Rede Nacional de Dados em Saúde).
*   **Estratégia**: O Health Nexus expõe adaptadores FHIR que traduzem registros relacionais PostgreSQL nos recursos FHIR JSON oficiais (ex: `Patient` e `DocumentReference` para prontuários).

---

## 3. APIs de IA e Comunicação Comercial

### OpenAI API
*   **Finalidade**: Sumarizar históricos médicos extensos de pacientes de UTI ou transferidos, e sugerir codificações CID baseadas em anotações de evolução por texto livre do médico.
*   **Protocolo**: POST seguro à API oficial com isolamento de dados de identificação (anonimização prévia de nomes e CPFs para proteção de dados).
*   **Endpoint**: `https://api.openai.com/v1/chat/completions`

### WhatsApp Business API
*   **Finalidade**: Disparar confirmações automáticas de agendamento de consultas e lembretes de preparo de exames.
*   **Protocolo**: Integração via Webhooks (Meta Cloud API). O sistema monitora o status de entrega (`sent`, `delivered`, `read`) e lê respostas diretas dos pacientes para confirmação automática na agenda.

### SMTP (Envio de Emails)
*   **Finalidade**: Envio de relatórios consolidados, convites de telemedicina e redefinição de senhas.
*   **Protocolo**: Conexão segura TLS via Nodemailer no backend Node.js.

### Google Calendar (Agenda Médica)
*   **Finalidade**: Exportar eventos de consultas da agenda do hospital para a conta Google pessoal dos médicos associados.
*   **Protocolo**: Integração OAuth2 Google API com token de consentimento por profissional de saúde.
