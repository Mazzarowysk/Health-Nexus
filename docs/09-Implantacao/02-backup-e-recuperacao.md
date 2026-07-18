# Health Nexus — Política de Backup e Recuperação de Desastres

Este documento detalha os processos de salvaguarda de dados (backup), as políticas de retenção histórica e o Plano de Recuperação de Desastres (DRP) do **Health Nexus**.

---

## 1. Estratégia de Backup Automatizado

Para garantir a preservação de dados clínicos de prontuários em caso de falha física de hardware ou ataques virtuais, o sistema adota rotinas de backup em 3 níveis (Regra 3-2-1: 3 cópias, 2 mídias diferentes, 1 cópia fora do site).

### Backup do Banco de Dados (PostgreSQL)
1.  **Backup Diário Completo (pg_dump)**: Executado de forma automática às 02h00 (horário de menor fluxo), gerando um arquivo compactado `.sql.gz` criptografado em repouso.
2.  **Arquivamento Contínuo (WAL - Write-Ahead Logging)**: Configurado para replicação de transações em tempo real para uma segunda instância física de banco de dados (Standby Server / Read Replica), garantindo tolerância a falhas.
3.  **Destino dos Backups**:
    *   *Cópia Local*: Armazenada em um storage NAS separado do servidor de aplicação principal dentro da rede do hospital.
    *   *Cópia em Nuvem*: Enviada imediatamente após a conclusão do dump local para uma nuvem privada e criptografada (ex: AWS S3 com política de ciclo de vida de expiração).

### Backup de Arquivos Físicos (Laudos e PDFs de Exames)
O diretório `/storage/` do backend (que guarda os uploads reais de laudos e exames) é replicado diariamente de forma incremental via rsync para o storage secundário nas nuvens.

---

## 2. Políticas de Retenção de Backups

Os arquivos de backup diários gerados seguem a política de retenção de longo prazo (GFS - Grandfather-Father-Son):
*   **Diários**: Mantidos por 7 dias.
*   **Semanais**: Mantidos por 4 semanas.
*   **Mensais**: Mantidos por 12 meses.
*   **Anuais**: Mantidos permanentemente por 20 anos (atendendo à legislação brasileira para dados clínicos de prontuários).

---

## 3. Plano de Recuperação de Desastres (DRP)

No caso de falha catastrófica no servidor primário do hospital ou data center (incêndio, pane elétrica completa, infecção por Ransomware), o Plano de Recuperação é acionado definindo os seguintes indicadores-chave de performance:

### RPO (Recovery Point Objective - Objetivo de Ponto de Recuperação)
Indica a quantidade máxima tolerada de dados perdidos em termos de tempo decorrido.
*   **Crítico (Prontuário/PEP e Financeiro)**: **5 minutos** (graças ao envio contínuo das logs de transações WAL).
*   **Geral (Estoque e Cadastros Gerais)**: **24 horas** (restaurado a partir do último dump diário).

### RTO (Recovery Time Objective - Objetivo de Tempo de Recuperação)
Indica o tempo máximo necessário para restaurar a infraestrutura e reestabelecer o funcionamento da aplicação após a falha.
*   **Limite Máximo**: **2 horas** para retorno da recepção, triagem e PEP.

---

## 4. Testes de Restauração (Restore Drill)

Backups que não são testados não são backups válidos. O administrador de TI deve rodar um procedimento semestral de restauração de backup em ambiente de testes (sandbox) para auditar a integridade dos dados e o tempo do RTO, registrando as logs do teste em relatório de auditoria do hospital.
