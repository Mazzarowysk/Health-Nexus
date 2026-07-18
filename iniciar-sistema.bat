@echo off
title Health Nexus - Inicializacao
echo ==========================================
echo   INICIALIZANDO SISTEMA HEALTH NEXUS
echo ==========================================
echo.
echo [1/2] Abrindo o navegador em http://localhost:5173...
start http://localhost:5173
echo.
echo [2/2] Iniciando servidores local (Vite + Express)...
npm run dev
