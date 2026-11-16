# Health Nexus — Glossário de Termos e Siglas

Este documento reúne e define as principais siglas, termos técnicos e conceitos de saúde (clínicos e administrativos) utilizados no ecossistema do **Health Nexus**.

## 1. Siglas e Conceitos Clínicos

*   **PEP (Prontuário Eletrônico do Paciente)**: Registro digital de todas as informações clínicas do paciente (anamnese, histórico familiar, prescrições, evolução, exames, alergias) acumuladas ao longo do tempo.
*   **Triagem Manchester**: Protocolo internacional de classificação de risco utilizado em prontos-socorros para categorizar a gravidade do estado do paciente por cores (Vermelho = Emergência, Laranja = Muito Urgente, Amarelo = Urgente, Verde = Pouco Urgente, Azul = Não Urgente).
*   **CID-10 / CID-11 (Classificação Estatística Internacional de Doenças e Problemas Relacionados com a Saúde)**: Catálogo oficial mantido pela OMS (Organização Mundial da Saúde) para classificar e codificar doenças, sintomas, queixas e causas externas de lesões ou doenças.
*   **Anamnese**: Entrevista inicial realizada pelo profissional de saúde com o paciente para levantar o histórico clínico, sintomas atuais, hábitos de vida e antecedentes de saúde.
*   **Evolução Clínica**: Registro diário elaborado pelo médico, enfermeiro ou equipe multidisciplinar que detalha a evolução do estado de saúde de um paciente internado ou em atendimento prolongado.
*   **Prescrição Médica**: Documento contendo as orientações terapêuticas (medicamentos, dosagens, horários, dieta, repouso) prescritas pelo médico para o paciente.
*   **Checagem à Beira do Leito**: Processo de validação da administração de medicamentos, onde a enfermagem valida a identidade do paciente (ex: via código de barras na pulseira) e o medicamento logo antes de administrá-lo.

## 2. Siglas e Conceitos de Interoperabilidade e Integração

*   **FHIR (Fast Healthcare Interoperability Resources)**: Padrão internacional desenvolvido pelo HL7 para intercâmbio eletrônico de informações de saúde através de uma API REST baseada em recursos (ex: `Patient`, `Observation`, `Encounter`).
*   **HL7 (Health Level Seven)**: Conjunto de padrões internacionais para transferência de dados clínicos e administrativos entre sistemas de software de saúde.
*   **LIS (Laboratory Information System)**: Sistema de Informação Laboratorial especializado no fluxo de trabalho de análises clínicas (cadastro de amostras, interfaceamento de aparelhos, laudos e controle de qualidade).
*   **PACS (Picture Archiving and Communication System)**: Sistema de Arquivamento e Comunicação de Imagens médicas (Radiografia, Tomografia, Ressonância) no formato DICOM.
*   **DICOM (Digital Imaging and Communications in Medicine)**: Conjunto de padrões para manipulação, armazenamento e transmissão de imagens médicas.

## 3. Siglas e Conceitos Administrativos e de Faturamento

*   **CNES (Cadastro Nacional de Estabelecimentos de Saúde)**: Banco de dados oficial do Ministério da Saúde que cadastra todos os estabelecimentos prestadores de serviços de saúde no Brasil.
*   **SIGTAP (Sistema de Gerenciamento da Tabela de Procedimentos, Medicamentos e OPM do SUS)**: Tabela oficial unificada que define as regras e valores de faturamento de serviços de saúde prestados ao Sistema Único de Saúde (SUS).
*   **TUSS (Terminologia Unificada da Saúde Suplementar)**: Conjunto estruturado de termos padronizados pela ANS (Agência Nacional de Saúde Suplementar) para identificar os procedimentos médicos e hospitalares nas trocas de informações com convênios privados.
*   **TISS (Troca de Informação de Saúde Suplementar)**: Padrão obrigatório estabelecido pela ANS para a troca eletrônica de dados entre prestadores de serviços de saúde e operadoras de planos de saúde (utiliza o formato XML TISS).
*   **Guia de Consulta / Guia de SP/SADT**: Formulários padrão do modelo TISS usados para solicitar e autorizar consultas, exames ou procedimentos.

## 4. Siglas e Conceitos Técnicos e de Segurança

*   **RBAC (Role-Based Access Control)**: Controle de acesso baseado em perfis/papéis. As permissões são concedidas a funções (ex: Médico, Recepcionista) e não aos usuários finais diretamente.
*   **JWT (JSON Web Token)**: Padrão aberto da indústria para criação de tokens de acesso compactos e seguros para autenticação de requisições em APIs REST.
*   **LGPD (Lei Geral de Proteção de Dados - Lei 13.709/2018)**: Legislação brasileira que regula as atividades de tratamento de dados pessoais, contendo regras estritas para dados pessoais sensíveis (como registros médicos e de saúde).
*   **Trilha de Auditoria (Audit Trail)**: Registro detalhado, cronológico e imutável que documenta quem acessou ou alterou um recurso de informação (ex: alteração de prescrição ou visualização de prontuário).
