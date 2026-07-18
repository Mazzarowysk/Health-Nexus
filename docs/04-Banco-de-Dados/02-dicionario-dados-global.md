# Health Nexus — Dicionário de Dados Global

Este documento especifica a estrutura física global das tabelas do banco de dados PostgreSQL do **Health Nexus**, detalhando as colunas de auditoria padronizadas, estratégias de indexação e mapeamento de tipos de dados.

---

## 1. Colunas de Auditoria Padrão (Meta-campos)

Para satisfazer requisitos de rastreabilidade clínica, auditoria e LGPD, 100% das tabelas de transação ou cadastro mestre no banco de dados devem implementar obrigatoriamente os seguintes campos de controle:

| Nome do Campo (snake_case) | Tipo de Dados | Restrição | Descrição |
| :--- | :--- | :--- | :--- |
| `id` | `UUID` | `PRIMARY KEY` | Identificador único universal (gerado via `gen_random_uuid()` no PostgreSQL). Evita sequenciais numéricos previsíveis. |
| `created_at` | `TIMESTAMP WITH TIME ZONE` | `NOT NULL DEFAULT NOW()` | Data e hora exata da inserção do registro, sempre em fuso horário UTC. |
| `updated_at` | `TIMESTAMP WITH TIME ZONE` | `NOT NULL DEFAULT NOW()` | Data e hora da última modificação. Atualizada automaticamente por triggers de banco. |
| `deleted_at` | `TIMESTAMP WITH TIME ZONE` | `NULL` | Data e hora de exclusão lógica (Soft Delete). Se `NULL`, o registro está ativo. |
| `created_by` | `UUID` | `FOREIGN KEY` | Referência ao usuário (`users.id`) que realizou a gravação original. |
| `updated_by` | `UUID` | `FOREIGN KEY` | Referência ao usuário (`users.id`) que realizou a última modificação. |

---

## 2. Estratégia de Indexação e Performance

O banco PostgreSQL deve possuir índices de performance estruturados para otimizar pesquisas frequentes e impedir lentidão na interface:

### Índices B-Tree (Consultas Exatas e Intervalos)
*   `IDX_patients_cpf`: Índice único na tabela `patients(cpf)` para pesquisa demográfica rápida e prevenção de duplicidade.
*   `IDX_encounters_patient_status`: Índice composto na tabela `encounters(patient_id, status)` para otimizar a montagem de históricos no prontuário eletrônico.
*   `IDX_appointments_start_date`: Índice na tabela `appointments(start_date)` para otimização do calendário e grades de horários.

### Índices GIN (Dados Semi-estruturados e Busca Textual)
*   `IDX_patients_search_vector`: Índice de busca textual completa (Full-Text Search) usando `tsvector` sobre a coluna concatenada de nome do paciente e nome da mãe.
*   `IDX_clinical_notes_answers`: Índice GIN sobre colunas do tipo `JSONB` que armazenam respostas estruturadas de checklists e logs clínicos para permitir consultas ágeis de chaves internas.

### Índices Parciais (Soft Delete Optimization)
Para manter consultas rápidas excluindo registros removidos de forma lógica, os índices de chaves exclusivas utilizam cláusulas `WHERE deleted_at IS NULL`:
```sql
CREATE UNIQUE INDEX idx_users_username_active ON users(username) WHERE deleted_at IS NULL;
```

---

## 3. Mapeamento de Tipos de Dados Especiais

*   **Identificadores**: Uso exclusivo de `UUID` (tipo nativo de 128 bits do PostgreSQL) em vez de inteiros autoincrementais (`SERIAL`), impedindo ataques de enumeração na API REST.
*   **Valores Monetários**: Uso exclusivo do tipo `NUMERIC(15, 2)` (precisão exata para faturamento) ou `NUMERIC(15, 4)` para itens unitários de almoxarifado de centavos. O tipo `FLOAT` ou `DOUBLE PRECISION` é proibido para transações financeiras para evitar erros de arredondamento de ponto flutuante.
*   **Textos Longos**: Uso do tipo `TEXT` em campos de anamnese e evolução clínica em vez de `VARCHAR(N)`, uma vez que o PostgreSQL trata internamente o tipo `TEXT` de forma otimizada com TOAST para armazenamento em disco e não impõe limite estrito artificial, permitindo descrições clínicas detalhadas.
*   **Datas**: Todo campo de data/hora que registre atendimentos, eventos clínicos ou ações operacionais deve utilizar `TIMESTAMP WITH TIME ZONE` (`timestamptz`), garantindo que o fuso horário da instituição seja preservado nas auditorias.
*   **Dados Estruturados Dinâmicos**: Uso do tipo `JSONB` (formato binário decomposto) para armazenar propriedades dinâmicas e layouts flexíveis de widgets do usuário ou checklists da OMS.
