@echo off
set "PATH=%PATH%;C:\Program Files\nodejs"
cd /d "%~dp0"
title Health Nexus - Servidor Ativo (NAO FECHE ESTA JANELA)
color 0A
echo ===================================================
echo    HEALTH NEXUS - SISTEMA DE GESTAO HOSPITALAR
echo ===================================================
echo.
if not exist "node_modules\vite\bin\vite.js" (
    echo [PREPARACAO] Instalando pacotes do sistema pela primeira vez...
    echo Aguarde alguns instantes...
    call npm install --no-audit
    echo.
)
echo [INFO] Encerrando processos Node anteriores (se houver)...
taskkill /f /im node.exe >nul 2>&1
timeout /t 1 /nobreak >nul
echo.
echo [1/2] Iniciando Backend (porta 3001) + Frontend (porta 5173)...
echo [2/2] O navegador abrira automaticamente assim que o servidor iniciar...
echo.
echo ATENCAO: Mantenha esta janela aberta enquanto utilizar o sistema.
echo ===================================================
echo.
call npm run dev
if errorlevel 1 (
    echo.
    echo [ERRO] O servidor encontrou um problema ao iniciar.
    pause
)




