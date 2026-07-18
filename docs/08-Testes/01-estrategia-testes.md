# Health Nexus — Estratégia de Testes

Este documento estabelece a metodologia, ferramentas e padrões exigidos para os ciclos de testes manuais e automatizados do **Health Nexus**.

---

## 1. Pirâmide de Testes e Cobertura

O Health Nexus adota uma estratégia equilibrada de testes estruturada na pirâmide de testes para garantir estabilidade funcional:
*   **Testes Unitários (Base)**: Foco na camada de *Services* (regras de negócio) e utilitários da API. Devem cobrir 100% dos cálculos clínicos, validações de interações de medicamentos e regras de faturamento.
*   **Testes de Integração (Meio)**: Foco nas camadas de *Controllers* e *Repositories*, testando a comunicação de rotas HTTP com o banco de dados (usando transações isoladas que dão rollback pós-teste).
*   **Testes End-to-End (E2E) (Topo)**: Foco nas jornadas críticas do usuário do frontend até a persistência no banco (ex: Admissão de paciente, Classificação de risco e Fechamento de prontuário).

### Meta de Cobertura de Código (Code Coverage)
*   **Geral**: Mínimo de **80%** de cobertura das linhas de código.
*   **Arquivos Críticos (Services/Regras de Saúde)**: Mínimo de **95%** de cobertura de linhas e condições lógicas (`branch coverage`).

---

## 2. Ferramentas e Frameworks

*   **Testes Unitários e de Integração (Backend)**: **Jest** como executor de testes e asserções, acoplado à biblioteca **Supertest** para chamadas HTTP simuladas na API do Express.
*   **Mocking**: Utilização do Jest para criar Mocks de APIs externas (ex: mockar a chamada ViaCEP, SMS ou gateway bancário) para evitar dependência de conexões de internet e custos de API externa durante o build do CI.
*   **Testes E2E (Frontend)**: Utilização de scripts de automação de navegador para simular cliques reais de usuários na interface e testar tempos de transição.

---

## 3. Padrão de Escrita e Execução de Testes

Os arquivos de testes automatizados devem residir no diretório `/tests/` do backend e carregar a extensão `.test.js` ou `.spec.js`.

### Exemplo de Teste Unitário (Jest)
```javascript
// Exemplo: testar se a classificação de risco atribui a cor correta
const triageService = require('../services/triageService');

describe('TriageService - Validação de Manchester', () => {
  it('deve classificar como Amarelo se o paciente tiver febre alta e dor moderada', async () => {
    const triageData = {
      temperatureCelsius: 38.5,
      bloodPressure: '120/80',
      heartRateBpm: 90,
      complaints: 'Paciente relata forte cefaleia'
    };

    const result = await triageService.evaluateManchesterColor(triageData);
    
    expect(result.manchesterColor).toBe('Amarelo');
    expect(result.maxWaitTimeMinutes).toBe(60);
  });
});
```

### Comandos de Execução
Para executar as suítes de testes localmente no ambiente de desenvolvimento:
*   Executar todos os testes: `npm run test`
*   Executar apenas testes unitários: `npm run test:unit`
*   Verificar cobertura de código: `npm run test:coverage`
