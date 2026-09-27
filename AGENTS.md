# Diretrizes e Regras Globais do Projeto — Health Nexus

Este repositório possui regras estritas de desenvolvimento, humanização e ciclo de entrega que devem ser seguidas por todos os agentes e desenvolvedores:

---

## 1. ✍️ Humanização e Redação Natural (Obrigatória em Todo o Sistema)
Consulte e aplique integralmente as regras em [`.agents/rules/humanizacao.md`](file:///.agents/rules/humanizacao.md) e na skill [`humanizer`](file:///.agents/skills/humanizer/SKILL.md):
- **Proibido texto robótico de IA:** Elimine introduções burocráticas (*"No cenário atual..."*, *"Vale ressaltar..."*), termos empolados (*"alavancar"*, *"robusto"*, *"destarte"*, *"revolucionário"*) e adjetivações vazias.
- **Linguagem Assistencial Humana (pt-BR):** Textos diretos, empáticos, em voz ativa e focados na agilidade da equipe médica, assistencial e recepção.
- **Interface e Modais:** Botões e avisos devem ser intuitivos, claros e acolhedores (ex: `📋 Listagem de PEPs Existentes`, `➕ Incluir Novo PEP`, `← Voltar para Lista de PEPs`).
- **Documentações & Manuais:** Redação fluida, prática e amigável para usuários reais.

---

## 2. 🔄 Ciclo Obrigatório de Documentação, Build e Deploy
Consulte e aplique integralmente a regra em [`.agents/rules/sync-docs-commit-deploy.md`](file:///.agents/rules/sync-docs-commit-deploy.md):
Para toda e qualquer alteração funcional, de interface ou de fluxo:
1. **Atualizar Documentações & Manuais:**
   - Atualizar `README.md` e `MANUAL_DO_USUARIO_HEALTH_NEXUS.md`.
2. **Recompilar Manuais (HTML e PDF):**
   - Executar `node scripts/build_manual_pdf.mjs` para sincronizar os PDFs e HTMLs em `public/` e `src/manual.html`.
3. **Validar Build:**
   - Executar `npm run build` garantindo zero erros.
4. **Versionamento Git:**
   - Executar `git add -A`, commit semântico e `git push origin main`.
5. **Deploy Automático:**
   - Executar deploy na Vercel e verificar disponibilidade na URL de produção.
