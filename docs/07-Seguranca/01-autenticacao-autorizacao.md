# Health Nexus — Autenticação e Autorização (Segurança)

Este documento detalha os mecanismos de controle de acesso, processos de login, políticas de senha e a matriz de autorização baseada em perfis (RBAC) do **Health Nexus**.

---

## 1. Fluxo de Autenticação Segura (JWT + MFA)

A autenticação é stateless, realizada por meio de tokens JSON Web Tokens (JWT) trafegados de forma segura nos cabeçalhos HTTP (`Authorization: Bearer <token>`).

### Login de Usuário
1.  **Entrada**: Usuário submete credenciais (usuário e senha criptografada).
2.  **Criptografia**: As senhas são gravadas utilizando algoritmo de hashing **bcrypt** com fator de custo (*work factor*) igual a 12. O sistema nunca salva senhas em texto puro.
3.  **Segundo Fator (MFA - Opcional/Recomendado)**: Se ativado nas configurações ou exigido pelo perfil, o backend retorna um token temporário com status `MFA_PENDING`. O usuário deve digitar um código de 6 dígitos gerado por aplicativo autenticador (ex: Google Authenticator - TOTP).
4.  **Emissão**: O backend emite o token JWT assinado digitalmente com chave secreta forte (armazenada em variável de ambiente do servidor) e tempo de expiração fixado em 12 horas.

---

## 2. Política de Complexidade de Senhas

Para mitigar ataques de força bruta, o sistema implementa políticas de senhas obrigatórias:
*   Mínimo de 8 caracteres.
*   Pelo menos 1 caractere em letra maiúscula.
*   Pelo menos 1 caractere em letra minúscula.
*   Pelo menos 1 caractere numérico.
*   Pelo menos 1 caractere especial (ex: `@`, `#`, `$`, `&`).
*   **Expiração Periódica**: Senhas administrativas expiram a cada 90 dias, forçando a alteração pelo usuário.
*   **Prevenção de Reuso**: O sistema armazena os hashes das últimas 3 senhas utilizadas pelo usuário, impedindo o reuso delas.

---

## 3. Matriz de Autorização baseada em Perfis (RBAC)

O sistema gerencia acessos por meio de perfis específicos, garantindo que profissionais acessem apenas dados pertinentes à sua atuação.

| Módulo / Recurso | Diretor | Médico | Enfermeiro | Recepcionista | Farmacêutico | Financeiro |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **Abertura de Atendimento** | Sim | Sim | Sim | Sim | Não | Não |
| **Triagem Manchester** | Não | Sim | Sim | Não | Não | Não |
| **Prontuário Médico (Anamnese)**| Sim | Sim | Leitura | Não | Não | Não |
| **Prescrição de Medicamentos** | Não | Sim | Não | Não | Não | Não |
| **Dispensação de Receitas** | Não | Não | Não | Não | Sim | Não |
| **Movimentações de Estoque** | Sim | Não | Não | Não | Sim | Não |
| **Faturamento TISS (XML)** | Sim | Não | Não | Não | Não | Sim |
| **Conciliação Financeira** | Sim | Não | Não | Não | Não | Sim |
| **Configuração de Perfis (RBAC)**| Sim | Não | Não | Não | Não | Não |

### Implementação do Middleware de RBAC no Node.js/Express
O controle de permissão é checado a nível de rota no Express:
```javascript
function checkPermission(requiredPermission) {
  return async (req, res, next) => {
    const { user } = req;
    
    // Busca as permissões vinculadas ao role do usuário logado
    const hasPermission = await checkUserPermissionInDB(user.id, requiredPermission);
    
    if (!hasPermission) {
      return res.status(403).json({
        status: 'error',
        message: 'Acesso negado: Você não possui a permissão requerida.'
      });
    }
    
    next();
  };
}

// Exemplo de aplicação na rota de fechar prontuário
router.post('/encounters/:id/sign', authMiddleware, checkPermission('PEP_ASSINAR'), notesController.sign);
```
