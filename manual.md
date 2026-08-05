# Manual do Usuário - Health Nexus

Bem-vindo ao Health Nexus! Este manual foi desenhado em formato de **fluxograma** para guiar você pelas etapas clínicas, da recepção até a alta do paciente.

---

## ?? Fluxo Principal (Jornada do Paciente)

O atendimento de um paciente segue uma jornada linear entre os profissionais da clínica/hospital.

\\\mermaid
flowchart TD
    A[1. Recepção] -->|Cadastra Paciente| B(2. Fila de Triagem)
    B -->|Chama Paciente| C{3. Triagem/Enfermagem}
    C -->|Classificação de Risco| D(4. Fila de Atendimento)
    D -->|Chama Paciente| E[5. Médico]
    E -->|Prescrição/Prontuário| F{6. Decisão Médica}
    F -->|Alta| G((Fim do Atendimento))
    F -->|Medicação| H[7. Sala de Medicação/Enfermagem]
    F -->|Internação| I[8. Gestão de Leitos]
    H --> G
    I --> G
\\\

---

## ?? Etapa 1: Recepção e Cadastro (Aba: Pacientes)
**Ator Principal:** Recepcionista

Quando um paciente chega à clínica, o primeiro passo é registrá-lo no sistema.
1. Acesse a aba **Pacientes** no menu lateral.
2. Clique no botão azul **[+ Novo Paciente]**.
3. Preencha os dados obrigatórios (Nome, CPF, Data de Nascimento).
4. Clique em **Salvar**.
5. *Próximo Passo:* O paciente já está cadastrado. Agora, ele deve ser enviado para a Fila de Triagem (ou diretamente para atendimento, dependendo do caso).
   - Localize o paciente na lista e clique em **[Abrir Atendimento]**.
   - Selecione a especialidade desejada e confirme. O status dele mudará para "Aguardando Triagem".

---

## ?? Etapa 2: Triagem (Aba: Atendimentos)
**Ator Principal:** Enfermeiro(a)

O enfermeiro visualiza quem está aguardando na recepção.
1. Acesse a aba **Atendimentos** no menu lateral.
2. Na coluna **Aguardando Triagem**, localize o paciente.
3. Clique no botão **[Iniciar Triagem]** no card do paciente.
4. Preencha os Sinais Vitais (Pressão, Temperatura, Batimentos) e faça breves anotações sobre as queixas.
5. Selecione a **Classificação de Risco** (Azul, Verde, Amarelo, Vermelho).
6. Clique em **Concluir Triagem**.
7. *Próximo Passo:* O card do paciente se moverá automaticamente para a coluna **Aguardando Médico**.

---

## ?? Etapa 3: Consulta Médica (Aba: Atendimentos / Prontuário)
**Ator Principal:** Médico(a)

O médico chama o paciente para o consultório.
1. Acesse a aba **Atendimentos**.
2. Na coluna **Aguardando Médico**, localize o paciente.
3. Clique em **[Atender]**.
4. O Prontuário Eletrônico do Paciente (PEP) será aberto.
   - **Histórico:** Veja as anotações da triagem.
   - **Evolução:** Digite a evolução clínica, sintomas e diagnóstico.
   - **Prescrição:** Na aba "Prescrições", adicione medicamentos (ex: "Dipirona 1g, Via Oral, Agora").
5. Após finalizar, o médico pode tomar duas decisões:
   - **Dar Alta:** O atendimento é encerrado.
   - **Internação:** Clique em **[Internar]** e selecione um leito disponível (veja Etapa 4).

---

## ?? Etapa 4: Internação (Aba: Leitos)
**Atores Principais:** Médico(a) e Enfermeiro(a)

Se o paciente precisar ficar em observação ou internado:
1. Acesse a aba **Leitos**.
2. Visualize o mapa de leitos disponíveis (cards verdes).
3. Clique em um leito livre e selecione **[Ocupar Leito]**.
4. Selecione o paciente na lista.
5. O leito ficará **Ocupado** (card vermelho).
6. A equipe de enfermagem continuará aplicando as medicações prescritas diretamente pela aba do paciente.
7. Quando o paciente melhorar, o médico registra a alta no prontuário, e o leito deve ser marcado como **[Liberar Leito / Em Limpeza]**.

---

## ?? Etapa 5: Gestão Financeira e Estoque
Estas são abas de apoio para manter o funcionamento do hospital.

### ?? Financeiro (Aba: Faturamento)
**Ator:** Administrador / Financeiro
- Aqui caem automaticamente guias de exames, cobranças de consultas particulares e fechamento de convênios.
- Ao receber o pagamento, clique em **[Dar Baixa]**.

### ?? Estoque (Aba: Estoque)
**Ator:** Farmacêutico / Administrador
- Registre a entrada e saída de medicamentos.
- Quando a enfermagem ministra um remédio ao paciente, o estoque deve ser atualizado. No Health Nexus, configure alertas de baixo estoque.

---

## ?? Dica de Ouro: Sincronização na Nuvem
Sempre que você realizar uma etapa importante (salvar paciente, finalizar triagem, prescrever medicamento), o Health Nexus mostrará uma notificação: **"Deseja enviar para a nuvem agora?"**
- Clique em **[Enviar Agora]** para garantir que as informações fiquem salvas online e possam ser vistas por outros computadores do hospital.
- Se você for cadastrar várias coisas rápido, pode clicar em **[Mais tarde]** e enviar tudo de uma vez no final do processo!
