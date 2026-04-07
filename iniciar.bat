@echo off
title VPS Monitor

echo.
echo  ============================================
echo   VPS Monitor - Iniciando...
echo  ============================================
echo.

REM ── 1. Túnel SSH (VPS porta 8001 → localhost:8001) ──────────────
echo  [1/3] Abrindo túnel SSH para a VPS...
start "SSH Tunnel" /min ssh -o StrictHostKeyChecking=no -o ServerAliveInterval=30 -N -L 8001:127.0.0.1:8001 -p 2222 root@72.60.158.84

REM Aguarda o túnel estabilizar
timeout /t 3 /nobreak >nul

REM ── 2. Dashboard Next.js ────────────────────────────────────────
echo  [2/3] Iniciando dashboard...
start "VPS Monitor Dashboard" /min cmd /c "cd /d %~dp0apps\monitor-dashboard && npm run dev"

REM Aguarda o servidor subir
timeout /t 6 /nobreak >nul

REM ── 3. Abre o navegador ─────────────────────────────────────────
echo  [3/3] Abrindo painel no navegador...
start "" "http://localhost:3000"

echo.
echo  ✓  Painel disponível em http://localhost:3000
echo  ✓  Túnel SSH ativo (VPS API em localhost:8001)
echo.
echo  Para encerrar, feche as janelas SSH Tunnel e Dashboard
echo  ou pressione qualquer tecla para fechar esta janela.
echo.
pause >nul
