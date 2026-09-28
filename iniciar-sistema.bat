@echo off
cd /d "%~dp0"
title Health Nexus - Servidor Ativo (NAO FECHE ESTA JANELA)
color 0A
echo ===================================================
echo    HEALTH NEXUS - SISTEMA DE GESTAO HOSPITALAR
echo ===================================================
echo.
echo [INFO] Encerrando processos Node anteriores (se houver)...
taskkill /f /im node.exe >nul 2>&1
timeout /t 1 /nobreak >nul
echo.
echo [1/2] Iniciando Backend (porta 3001) + Frontend (porta 5173)...
echo [2/2] O navegador abrira automaticamente assim que o sistema estiver pronto...
echo.
echo ATENCAO: Mantenha esta janela aberta enquanto utilizar o sistema.
echo ===================================================
echo.
start /min node scripts/wait_and_open.mjs
npm run dev

