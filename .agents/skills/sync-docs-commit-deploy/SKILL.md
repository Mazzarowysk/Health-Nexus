---
name: sync-docs-commit-deploy
description: "Protocolo obrigatório para o Health Nexus: após qualquer alteração no sistema ou novas funcionalidades, atualizar todas as documentações técnicas e manuais (Markdown, HTML e PDF), compilar com sucesso, realizar commit semântico, enviar para o GitHub (push origin main) e efetuar o deploy em produção na Vercel."
---

# 🚀 Skill: Sincronização Documental, Compilação, Commit & Deploy Automático

## 🎯 Objetivo
Garantir que toda e qualquer alteração de código, melhoria de interface, correção de bug ou nova funcionalidade no **Health Nexus** seja imediatamente refletida nas documentações técnicas, manuais de usuário, repositório Git e deploy de produção na Vercel.

---

## 📋 Checklist de Execução Obrigatório

Sempre que concluir alterações de código ou regras de negócio no Health Nexus, execute rigorosamente os 5 passos a seguir:

### 1. 📚 Atualização Documental & Manuais
1. **README do Projeto (`README.md`):**
   - Atualizar a versão do sistema (ex: `v2.7.3`).
   - Documentar novas funcionalidades, fluxos e telas implementadas.
2. **Manual do Usuário Markdown (`MANUAL_DO_USUARIO_HEALTH_NEXUS.md`):**
   - Atualizar seções operacionais relevantes com o passo a passo ilustrado e regras de uso.
3. **Documentação Técnica em `docs/`:**
   - Se houver alteração de requisitos funcionais ou regras clínicas, atualizar os arquivos correspondentes em `docs/03-Requisitos/` ou `docs/04-Arquitetura/`.

---

### 2. ⚙️ Recompilação dos Manuais HTML e PDF & Sincronização
Execute o script de compilação dos manuais:
```bash
node scripts/build_manual_pdf.mjs
```
Em seguida, sincronize os arquivos gerados para a pasta pública e assets do sistema:
```powershell
Copy-Item -Path "manual_do_usuario.html" -Destination "public\manual_do_usuario.html" -Force
Copy-Item -Path "Manual_do_Usuario_Health_Nexus.pdf" -Destination "public\Manual_do_Usuario_Health_Nexus.pdf" -Force
Copy-Item -Path "MANUAL_DO_USUARIO_HEALTH_NEXUS.md" -Destination "public\MANUAL_DO_USUARIO_HEALTH_NEXUS.md" -Force
Copy-Item -Path "manual_do_usuario.html" -Destination "src\manual.html" -Force
```

---

### 3. 🏗️ Validação de Build
Execute a compilação do bundle para garantir ausência de erros de sintaxe ou empacotamento:
```bash
npm run build
```
Certifique-se de que a compilação retorne status de sucesso (`✓ built in ...`).

---

### 4. 📦 Git Commit & Push
Faça o versionamento atômico e semântico de todos os arquivos:
```bash
git add -A
git commit -m "<tipo>(<escopo>): <descrição clara da alteração>"
git push origin main
```
*Exemplos de tipos semânticos:* `feat`, `fix`, `docs`, `refactor`, `style`.

---

### 5. 🌐 Deploy em Produção na Vercel
Promova a versão imediatamente para o ambiente produtivo:
```bash
npx vercel --prod --yes
```
Aguarde a finalização e confirme a disponibilidade na URL oficial:
👉 **Produção Oficial:** `https://health-nexus-beryl.vercel.app`
