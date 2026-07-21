@echo off
title Health Nexus - Servidor Ativo (NAO FECHE ESTA JANELA)
color 0A
echo ===================================================
echo    HEALTH NEXUS - SISTEMA DE GESTAO HOSPITALAR
echo ===================================================
echo.
echo [1/2] Abrindo a aplicacao no navegador (http://localhost:5173)...
start http://localhost:5173
echo.
echo [2/2] Servidor rodando localmente (Vite + Express)...
echo.
echo ATENCAO: Mantenha esta janela aberta enquanto utilizar o sistema.
echo.
echo ===================================================
echo.
npm run dev
