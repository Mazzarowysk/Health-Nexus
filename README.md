# Health Nexus

**Versão atual:** 1.0.0 (BETA)
**Status do Sistema:** Em desenvolvimento ativo.

## Sincronização & Infraestrutura
O Health Nexus está 100% configurado e sincronizado com os seguintes serviços:
- 🐙 **GitHub:** Controle de versão ativo (branch `main`). Todos os commits acionam deploys automáticos.
- ⏏️ **Vercel:** Plataforma Serverless responsável pela hospedagem do Frontend (Vite) e Backend (Node.js API).
- 🗄️ **Turso (LibSQL):** Banco de dados distribuído edge ativo, responsável por toda a persistência de dados do sistema (Pacientes, Atendimentos, PEP).

## Módulos Implementados (Estado Atual)

### 1. Autenticação e Layout
- Tela de login com design Glassmorphism (Vidro).
- Menu lateral (Sidebar) retrátil e responsivo.
- Identificação de desenvolvedores.

### 2. Dashboard
- Resumo de métricas em tempo real (Total de Pacientes, Atendimentos no Dia, Tempo Médio de Espera).
- Fallback visual em caso de desconexão com o banco (exibe dados zerados com layout contínuo).

### 3. Gestão de Pacientes
- Listagem completa e interativa.
- Formulário de cadastro com validações visuais em tempo real (Mascara inteligente para CPF, sem conflitos com dispositivos móveis - `inputmode="numeric"`).
- Integração ponta-a-ponta com banco Turso.

### 4. Triagem e Fila de Atendimento (Manchester)
- Classificação de risco em 5 cores baseada no Protocolo de Manchester (Emergência a Não Urgente).
- Sistema de admissão do paciente na fila.
- Acompanhamento do status ("Aguardando Triagem", "Aguardando Médico", "Em Atendimento", "Finalizado").

### 5. PEP (Prontuário Eletrônico do Paciente)
- Editor Rich-Text (Estilo Notion) intuitivo.
- Abas de Evolução, Prescrição, Solicitação de Exames e Atestados.
- Autosave implementado.

### 6. Relatórios e Exportação
- Aba dedicada à extração de dados da clínica.
- Exportação nativa da fila e dos pacientes nos seguintes formatos:
  - 📄 **PDF**: Layout zebrado e elegante para impressão (jsPDF + autoTable).
  - 📊 **XLSX**: Exportação crua e rica para o Excel (SheetJS).
  - 📝 **CSV**: Exportação universal delimitada (com cabeçalhos UTF-8 BOM suportando acentos).

### 7. Configurações (Preferências Pessoais)
- Seção com acordeões retráteis (Expandir/Recolher) agrupando lógicas de sistema.
- Controle de Tema (Dark/Light).

## Próximos Passos
Conforme especificado em `docs/`, ainda há áreas a serem implementadas, como Laboratório (`09-laboratorio.md`), Integração de Imagens e Faturamento (TISS).

---
*Desenvolvido por @mazzarowysk & @_coltri_*
