# Regra Global de Desenvolvimento — Health Nexus

Para toda e qualquer alteração realizada no sistema Health Nexus (seja funcionalidade, layout, correção de bug ou melhoria de usabilidade):

1. **Atualizar Documentações & Manuais:**
   - Atualizar `README.md` com a versão e resumo das novidades.
   - Atualizar `MANUAL_DO_USUARIO_HEALTH_NEXUS.md` com o guia passo a passo das telas.
   - Atualizar requisitos em `docs/` caso novas regras clínicas/hospitalares tenham sido criadas.
2. **Recompilar Manuais (HTML e PDF):**
   - Executar `node scripts/build_manual_pdf.mjs`
   - Sincronizar para `public/` (`manual_do_usuario.html`, `Manual_do_Usuario_Health_Nexus.pdf`, `MANUAL_DO_USUARIO_HEALTH_NEXUS.md`) e `src/manual.html`.
3. **Validar Build:**
   - Executar `npm run build` garantindo zero erros.
4. **Versionamento Git:**
   - Executar `git add -A`, criar commit com mensagem semântica e executar `git push origin main`.
5. **Deploy Automático:**
   - Executar `npx vercel --prod --yes` e validar a disponibilidade da URL de produção (`https://health-nexus-beryl.vercel.app`).
