# Health Nexus — Trilha de Auditoria e Logs

Este documento define as especificações e políticas para o registro de logs do sistema e rastreabilidade total (trilha de auditoria) de ações executadas no **Health Nexus**.

---

## 1. Trilha de Auditoria Clínica e de Acesso (Audit Trail)

Todo acesso, visualização ou modificação de dados confidenciais de saúde de um paciente (PEP, exames, internações) deve obrigatoriamente registrar um evento na tabela de auditoria do sistema. A deleção ou alteração física desses registros é proibida pelas configurações do banco de dados (tabela de auditoria configurada como *append-only*).

### Estrutura do Registro de Auditoria
Cada evento de auditoria captura:
*   **Data/Hora**: `TIMESTAMP WITH TIME ZONE` exato do evento.
*   **Usuário**: ID do usuário executor (`users.id`).
*   **Ação**: Tipo de operação (`Acesso_PEP`, `Criar_Prescricao`, `Editar_Triagem`, `Visualizar_Laudo`).
*   **Paciente**: ID do paciente afetado (`patients.id`).
*   **Identificação do Dispositivo**: IP do cliente, endereço MAC (se rede interna) e User Agent do navegador.
*   **Conteúdo Modificado**: Payload contendo o estado anterior e posterior em formato JSONB (apenas para ações de alteração/correção).

### Implementação do Middleware de Rastreamento
Um interceptador global nas rotas clínicas captura leituras sensíveis de prontuários:
```javascript
// Middleware exemplo de auditoria de leitura do PEP
async function auditPepAccess(req, res, next) {
  const { userId } = req.user;
  const { id: patientId } = req.params;

  await db.insert('audit_logs').values({
    userId,
    patientId,
    action: 'Visualizar_PEP',
    clientIp: req.ip,
    userAgent: req.headers['user-agent']
  });

  next();
}

router.get('/patients/:id/medical-records', authMiddleware, auditPepAccess, recordsController.list);
```

---

## 2. Logs de Sistema e Erros (Application Logs)

O backend do Health Nexus adota o **Winston** em conjunto com o **Morgan** para gerenciamento de logs de requisições HTTP e erros de programação.

### Níveis de Log (RFC 5424)
1.  **`error`**: Erros críticos no servidor que interrompem requisições (ex: falha de conexão com PostgreSQL, estouro de memória, erros 500).
2.  **`warn`**: Avisos que indicam comportamento incomum, mas não crítico (ex: falhas de autenticação repetidas de um mesmo IP, tempo de resposta acima de 3 segundos).
3.  **`info`**: Registro padrão de inicialização de serviços, deploys e tarefas completadas na fila.
4.  **`debug`**: Logs detalhados de queries SQL executadas e fluxo de controle de serviços para uso exclusivo em ambiente de desenvolvimento.

---

## 3. Retenção e Rotação de Logs

Para evitar o consumo total do disco rígido dos servidores da aplicação e garantir a retenção mínima exigida por regulamentações legais de prontuários eletrônicos:
*   **Logs de Auditoria (Banco de Dados)**: Retenção obrigatória por no mínimo **20 anos** (exigência do CFM e Lei nº 13.787/2018 para prontuários de pacientes).
*   **Logs de Sistema (Arquivos .log)**: Rotacionados diariamente usando `winston-daily-rotate-file`. Retenção mantida no disco local por 30 dias. Após este período, são compactados em formato `.gz` e exportados de forma segura para armazenamento frio em nuvem privada com tempo de retenção final de 1 ano.
*   **Prevenção de Injeção de Logs**: Os dados enviados pelos usuários que são gravados em arquivos de log são sanitizados e desinfetados para evitar ataques de log injection (onde atacantes injetam quebras de linha `\r\n` e falsos registros no log).
