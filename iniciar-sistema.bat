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
echo [2/2] Abrindo o navegador do sistema...
echo.
echo ATENCAO: Mantenha esta janela aberta enquanto utilizar o sistema.
echo ===================================================
echo.
start /min cmd /c "timeout /t 5 /nobreak >nul & start http://localhost:5173"
npm run dev


