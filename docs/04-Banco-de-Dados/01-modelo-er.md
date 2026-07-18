# Health Nexus — Modelo Entidade-Relacionamento (ERD)

Este documento apresenta o modelo lógico-relacional consolidado do banco de dados PostgreSQL do **Health Nexus**.

---

## 1. Diagrama de Entidade-Relacionamento Global

O diagrama abaixo especifica os principais relacionamentos entre as entidades do sistema, garantindo a integridade dos dados clínicos e transações financeiras.

```mermaid
erDiagram
    %% Core & Segurança
    users ||--o{ roles : "possui"
    role_permissions }|--|| roles : "vincula"
    role_permissions }|--|| permissions : "vincula"

    %% Clinico
    patients ||--o{ encounters : "realiza"
    encounters ||--|| triages : "possui"
    encounters ||--o{ clinical_notes : "possui"
    clinical_notes ||--o{ prescriptions : "contem"
    clinical_notes ||--o{ lab_orders : "solicita"
    clinical_notes ||--o{ surgeries : "solicita"

    %% Internacao
    admissions ||--|| encounters : "vincula"
    admissions ||--o{ bed_movements : "registra"
    beds ||--o{ bed_movements : "aloca"
    beds }|--|| rooms : "contem"
    rooms }|--|| wards : "contem"

    %% Farmacia & Estoque
    medications ||--o{ inventory_batches : "contem"
    inventory_batches ||--o{ stock_movements : "registra"
    prescriptions ||--o{ dispensing_requests : "solicita"
    dispensing_requests ||--o{ dispensing_items : "contem"
    inventory_batches ||--o{ dispensing_items : "atende"
    warehouses ||--o{ inventory_batches : "armazena"

    %% Laboratorio
    lab_orders ||--o{ lab_samples : "contem"
    lab_samples ||--o{ lab_results : "gera"
    lab_exams ||--o{ lab_results : "parametrizacao"

    %% Faturamento & Financeiro
    encounters ||--o{ billing_guides : "gera"
    billing_batches ||--o{ billing_guides : "agrupa"
    billing_guides ||--o{ billing_guide_items : "contem"
    billing_guide_items }|--|| medical_tariffs : "precifica"
    billing_accounts ||--o{ bills_receivable : "financeiro"
    bills_receivable ||--o{ financial_transactions : "liquida"
    bills_payable ||--o{ financial_transactions : "liquida"
    bank_accounts ||--o{ financial_transactions : "recebe"

    %% Relacoes Especificas
    users {
        uuid id PK
        string username
        string password_hash
        uuid role_id FK
        boolean is_active
    }
    patients {
        uuid id PK
        string full_name
        string cpf UK
        date birth_date
    }
    encounters {
        uuid id PK
        uuid patient_id FK
        string status
        timestamp admitted_at
    }
    admissions {
        uuid id PK
        uuid encounter_id FK
        string aih_number
    }
```

---

## 2. Padrões de Integridade Referencial

1.  **Deleções Lógicas (Soft Delete)**: Entidades principais (como `patients`, `users`, `medications`) não sofrem deleções físicas (`DELETE FROM ...`) sob nenhuma hipótese clínica. O banco utiliza uma coluna `deleted_at` com indexação condicional para manter registros excluídos acessíveis para fins de auditoria médica e legal.
2.  **Cascateamento Restrito (Restrict/No Action)**: Não é utilizado o cascateamento automático de deleção (`ON DELETE CASCADE`) para registros clínicos ou financeiros vinculados.
    *   *Exemplo*: Se houver tentativa de excluir um registro na tabela `patients` que possui registros vinculados na tabela `encounters`, o banco de dados gera um erro de violação de chave estrangeira (`foreign key constraint error`), impedindo a quebra da integridade histórica.
3.  **Locks de Transação (Concurrency Control)**: Para operações financeiras e de alocação de leitos/estoques, utiliza-se controle de concorrência pessimista por meio de comandos SQL `SELECT FOR UPDATE` para evitar condições de corrida (Race Conditions) em acessos simultâneos nas APIs.
