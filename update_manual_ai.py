import re

with open('c:/Health Nexus/MANUAL_DO_USUARIO_HEALTH_NEXUS.md', 'r', encoding='utf-8', errors='ignore') as f:
    text = f.read()

idx = text.rfind('<h2 id="sec-22">22.')
if idx != -1:
    idx2 = text.rfind('---', 0, idx)
    if idx2 != -1:
        text = text[:idx2]

append_text = """---

<h2 id="sec-22">22. 🆕 Atualizações Recentes (Agosto/2026)</h2>

O Health Nexus recebeu uma série de melhorias para otimizar o fluxo de trabalho e garantir a segurança das informações operacionais:

### 22.1. Controle de Acesso e Permissões (Roles)
A aba de **Configurações Globais** agora conta com um controle de acesso rigoroso:
- **MASTER:** Possui acesso integral a todos os painéis, incluindo "Gerenciamento de Usuários", "Simulação de Dados" e demais configurações avançadas (identificadas em vermelho).
- **Desenvolvedor:** Recebe acesso apenas aos agrupamentos técnicos essenciais (destacados em vermelho), permitindo realizar sincronização de banco de dados (Turso) e operações técnicas, mantendo restrições de gerenciamento de equipe.
- **Demais perfis:** Acesso bloqueado à aba de Configurações para garantir a segurança dos dados.

### 22.2. Botões de Limpeza de Filtros ("Limpar Filtros")
Visando aumentar a agilidade operacional, foram incluídos botões dedicados com o ícone <i class="fa-solid fa-filter-circle-xmark"></i> (Limpar Filtros) em **todas as abas principais**:
- **Pacientes, Médicos, Agenda, Farmácia e Relatórios.**
- Um único clique zera instantaneamente todas as buscas de texto e recoloca os *checkboxes* de filtro em seus estados padrão, permitindo buscas fluídas.

### 22.3. Busca de Pacientes Aprimorada (Nome e CPF)
O componente unificado de busca de pacientes (Dropdown dinâmico utilizado em modais de admissão, prescrição e financeiro) foi reescrito. Agora:
- A pesquisa procura não apenas pelo Nome do Paciente, mas também verifica ocorrências do **CPF**.
- O **CPF** é exibido diretamente na lista de opções (formato reduzido), facilitando a identificação de homônimos na hora do atendimento.

### 22.4. Ícones Visuais de Forma de Pagamento 💵💳
A interface da seção de Relatórios Financeiros foi enriquecida com representações gráficas (Emojis):
- Pix (💠)
- Dinheiro (💵)
- Cartão de Crédito (💳)
- Cartão de Débito (💳)
- Boleto (📄)
Isso reduz o tempo de reconhecimento visual do atendente durante o fechamento de caixa.

### 22.5. Validação Estrita de Senhas no Login 🔒
A tela de autenticação foi atualizada para exigir a validação exata da senha cadastrada de cada usuário:
- Tentativas com senhas incorretas são imediatamente rejeitadas (HTTP 401).
- Garantia de que contas individuais (ex: `ljordao`, `bcoltri`, `admin`) só possuem acesso liberado mediante a apresentação da senha cadastrada correspondente.

### 22.6. IA Copilot no Manual Interativo com RBAC 🤖
O sistema de pesquisa do **Manual Interativo** foi integrado ao motor de Inteligência Artificial **Copilot**.
- **Pesquisa em Tempo Real:** A pesquisa agora é processada instantaneamente sem a necessidade de múltiplos cliques.
- **Consciência de Acesso (RBAC):** O assistente virtual compreende as permissões do usuário logado e exibe botões de ação contextuais apenas para funções que o usuário tem autorização. Respostas e ações para áreas restritas exibirão mensagens de bloqueio, garantindo máxima segurança.
"""

text = text.rstrip() + "\n\n" + append_text

with open('c:/Health Nexus/MANUAL_DO_USUARIO_HEALTH_NEXUS.md', 'w', encoding='utf-8') as f:
    f.write(text)
