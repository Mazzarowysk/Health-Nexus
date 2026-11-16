# Health Nexus — Dicionário de Dados Global (Turso/SQLite)

Este documento especifica a estrutura física global das tabelas do banco de dados Turso (LibSQL/SQLite) do **Health Nexus**, detalhando as colunas de auditoria padronizadas, estratégias de indexação e mapeamento de tipos de dados.

---

## 1. Colunas de Auditoria Padrão (Meta-campos)

Para satisfazer requisitos de rastreabilidade clínica, auditoria e LGPD, 100% das tabelas de transação ou cadastro mestre no banco de dados devem implementar obrigatoriamente os seguintes campos de controle:

| Nome do Campo (snake_case) | Tipo de Dados | Restrição | Descrição |
| :--- | :--- | :--- | :--- |
| `id` | `TEXT` | `PRIMARY KEY` | Identificador único universal (UUID v4 gerado no backend). Evita sequenciais numéricos previsíveis. |
| `created_at` | `TEXT` | `NOT NULL DEFAULT CURRENT_TIMESTAMP` | Data e hora da inserção do registro, formato ISO 8601 string UTC. |
| `updated_at` | `TEXT` | `NOT NULL DEFAULT CURRENT_TIMESTAMP` | Data e hora da última modificação, formato ISO 8601 string UTC. |
| `deleted_at` | `TEXT` | `NULL` | Data e hora de exclusão lógica (Soft Delete). Se `NULL`, o registro está ativo. |
| `created_by` | `TEXT` | `FOREIGN KEY` | Referência ao usuário (`users.id`) que realizou a gravação original. |
| `updated_by` | `TEXT` | `FOREIGN KEY` | Referência ao usuário (`users.id`) que realizou a última modificação. |

---

## 2. Estratégia de Indexação e Performance

O banco Turso (SQLite/LibSQL) utiliza índices para otimizar buscas e consultas no sistema:

### Índices B-Tree (Consultas Exatas e Intervalos)
*   `idx_patients_cpf`: Índice único na tabela `patients(cpf)` para pesquisa demográfica rápida e prevenção de duplicidade.
*   `idx_encounters_patient_status`: Índice composto na tabela `encounters(patient_id, status)` para otimizar a montagem de históricos no prontuário eletrônico.
*   `idx_appointments_start_date`: Índice na tabela `appointments(start_date)` para otimização do calendário e grades de horários.

### Busca Textual Completa (Full-Text Search)
*   Para buscas de homônimos (nome de pacientes), utiliza-se o recurso nativo **FTS5** do SQLite/LibSQL para criar tabelas virtuais de indexação de busca rápida de termos em texto livre.

### Índices Parciais (Soft Delete Optimization)
Para manter consultas rápidas excluindo registros removidos de forma lógica, os índices de chaves exclusivas utilizam cláusulas `WHERE deleted_at IS NULL`:
```sql
CREATE UNIQUE INDEX idx_users_username_active ON users(username) WHERE deleted_at IS NULL;
```

---

## 3. Mapeamento de Tipos de Dados Especiais

*   **Identificadores**: Uso exclusivo do tipo `TEXT` contendo UUIDs gerados no backend, impedindo ataques de enumeração na API REST.
*   **Valores Monetários**: Uso do tipo `REAL` ou `NUMERIC` com tratamento e arredondamento explícito no backend de aplicação (para evitar imprecisão inerente do SQLite na representação de ponto flutuante em consultas muito extensas).
*   **Textos Longos**: Uso do tipo `TEXT` em campos de anamnese e evolução clínica. O SQLite manipula dinamicamente strings sem limites rígidos de tamanho de forma eficiente.
*   **Datas**: Todo campo de data/hora utiliza o formato `TEXT` (ISO 8601 string UTC) para manter a independência de timezone do servidor que hospeda a API.
*   **Dados Estruturados Dinâmicos**: Uso de colunas do tipo `TEXT` contendo strings JSON válidas, validadas via trigger ou pelo backend do aplicativo através do suporte a funções `json()` do LibSQL.
