# Health Nexus — Arquitetura de APIs

Este documento estabelece os padrões e convenções adotados na construção das APIs REST e conexões via WebSocket do **Health Nexus**.

---

## 1. Padrões REST e Estrutura de Requisição/Resposta

As APIs REST do Health Nexus operam exclusivamente sobre o protocolo HTTPS, utilizando o formato JSON para o tráfego de dados.

### Métodos HTTP Padronizados
*   `GET`: Recuperar informações (recursos individuais ou coleções). Não altera estados.
*   `POST`: Criar novos recursos no banco de dados.
*   `PUT`: Atualizar de forma integral um recurso existente.
*   `PATCH`: Efetuar atualizações parciais (ex: inativar usuário).
*   `DELETE`: Remover de forma lógica (Soft Delete) um recurso.

### Códigos de Retorno HTTP (HTTP Status Codes)
O sistema segue estritamente a especificação semântica dos status HTTP:

*   `200 OK`: Requisição de leitura ou atualização parcial processada com sucesso.
*   `210 Created`: Recurso criado com sucesso (retorna o ID no JSON).
*   `202 Accepted`: Requisição pesada aceita para processamento assíncrono (enfileirada).
*   `400 Bad Request`: Requisição inválida devido a falhas sintáticas ou erros de validação nos dados.
*   `401 Unauthorized`: Usuário não está autenticado (Token JWT inválido ou ausente).
*   `403 Forbidden`: Usuário autenticado, mas não possui permissões suficientes (RBAC) para o recurso.
*   `404 Not Found`: O recurso solicitado não existe no banco de dados.
*   `409 Conflict`: Conflito operacional (ex: overbooking de horários ou duplicidade de CPF).
*   `422 Unprocessable Entity`: Erros de regras de negócio (ex: tentar dispensar lote de medicamento vencido).
*   `500 Internal Server Error`: Erro inesperado de programação ou infraestrutura.

---

## 2. Paginação, Filtragem e Ordenação

Todas as APIs do sistema que retornam coleções de dados (ex: listar pacientes, guias ou movimentações) devem implementar obrigatoriamente mecanismos para evitar sobrecarga de memória:

### Parâmetros de Query Padronizados
*   `page`: Número da página de resultados (iniciando em 1). Padrão = `1`.
*   `limit`: Quantidade de registros por página. Limite máximo permitido de `100`. Padrão = `20`.
*   `sort`: Ordenação do campo (sinal de menos `-` indica ordem decrescente). Ex: `sort=-createdAt`.
*   `search`: String de busca genérica para filtragem simplificada.

### Payload de Resposta Paginado
A resposta de uma listagem deve envelopar os resultados em uma chave `data` e as estatísticas em uma chave `meta`:
```json
{
  "data": [
    {
      "patientId": "e1f1ad7e-bf91-4d1a-a53c-12b23a54b38d",
      "fullName": "Maria de Souza Silva"
    }
  ],
  "meta": {
    "totalRecords": 1420,
    "totalPages": 71,
    "currentPage": 1,
    "limit": 20
  }
}
```

---

## 3. Protocolo WebSocket para Eventos Real-Time

Para processos assistenciais críticos, o Health Nexus utiliza o protocolo WebSocket via `Socket.io` para notificar os clientes em tempo real, eliminando a necessidade de polling de API.

### Fluxo de Autenticação no WebSocket
A conexão WebSocket exige a passagem do token JWT no ato do aperto de mão (handshake):
```javascript
const socket = io('wss://api.healthnexus.com', {
  auth: {
    token: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
  }
});
```

### Principais Canais e Eventos do WebSocket

| Canal / Room | Evento | Descrição |
| :--- | :--- | :--- |
| `triage:queue` | `patient:admitted` | Notifica o painel de enfermagem da UPA quando um novo paciente é cadastrado na recepção e aguarda triagem. |
| `triage:queue` | `patient:triaged` | Disparado quando a triagem é salva. O paciente entra na fila médica correspondente à cor atribuída. |
| `user:userId` | `settings:revoked` | Canal privado por usuário. Dispara o logout automático se o login do usuário for inativado no painel administrativo. |
| `beds:census` | `bed:status_changed` | Atualiza o mapa de censo hospitalar gráfico se houver mudança de leito ou alta. |
