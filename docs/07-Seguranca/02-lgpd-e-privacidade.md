# Health Nexus — LGPD e Privacidade de Dados

Este documento estabelece o mapeamento de conformidade com a **Lei Geral de Proteção de Dados (LGPD - Lei 13.709/2018)** no tratamento de dados de saúde no **Health Nexus**.

---

## 1. Classificação dos Dados de Saúde

No ecossistema do Health Nexus, os dados são classificados e tratados conforme sua sensibilidade jurídica:
*   **Dados Pessoais Comuns**: Nome, e-mail, telefone, CEP, endereço residencial. (Tratados sob a base legal de execução de contrato ou legítimo interesse).
*   **Dados Pessoais Sensíveis (Saúde)**: Registros médicos, anamnese, exames de diagnóstico, prescrição de drogas, classificação de risco Manchester, orientação sexual biológica, dados genéticos. (Tratados sob a base legal de tutela da saúde por profissionais ou obrigação legal).

---

## 2. Criptografia e Proteção de Dados

### Criptografia em Trânsito (Data in Transit)
Todo o tráfego de dados entre o navegador do usuário (frontend) e a API (backend) deve trafegar obrigatoriamente sob criptografia de canal **TLS 1.3** (HTTPS e WSS), utilizando suítes de cifra modernas e rejeitando conexões HTTP não seguras na porta 80.

### Criptografia em Repouso (Data at Rest)
*   **Banco de Dados**: O PostgreSQL é configurado para utilizar criptografia em disco (TDE - Transparent Data Encryption) ou criptografia de arquivos do sistema operacional usando **AES-256**.
*   **Dados Altamente Confidenciais**: Campos como anotações clínicas íntimas ou diagnósticos específicos podem ser criptografados a nível de aplicação antes da persistência física na base.

---

## 3. Direitos do Titular (Paciente)

O Health Nexus disponibiliza ferramentas para que a instituição atenda às solicitações de direitos dos pacientes:

### Direito ao Acesso e Portabilidade
O sistema permite exportar o histórico clínico consolidado do paciente em formato portátil padrão (FHIR JSON ou PDF assinado) com um clique, facilitando a transferência de informações para outros estabelecimentos de saúde.

### Direito à Correção
Qualquer incorreção cadastral de dados pessoais comuns (nome, CPF, endereço) pode ser alterada imediatamente no cadastro geral de pacientes. Correções em registros de diagnósticos e condutas médicas assinadas, contudo, só podem ocorrer via **Termo de Retificação**, preservando a rastreabilidade original (obrigação médico-legal superior ao direito de eliminação de dados de saúde).

### Direito de Revogação de Consentimento
O paciente possui o direito de revogar sua autorização de envio de comunicações de conveniência (como lembretes de consulta por WhatsApp ou e-mails estatísticos), o que inativa imediatamente as filas automáticas de envio de mensagens do módulo de Comunicação para aquele ID de paciente.

---

## 4. Termo de Consentimento e Registro de Opções (Opt-in)

No ato da primeira admissão física do paciente, a recepção deve colher a assinatura física ou digital do paciente no "Termo de Consentimento para Tratamento de Dados de Saúde". O sistema registra eletronicamente a data e hora do aceite, o ID do atendente testemunha e anexa a cópia digitalizada do termo ao prontuário eletrônico.
