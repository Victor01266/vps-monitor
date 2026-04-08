@echo off
title VPS Monitor

echo.
echo  =============================================
echo   VPS Monitor - Diagonal TI
echo  =============================================
echo.

REM Verifica se o .env existe
if not exist "apps\monitor-api\.env" (
    echo  [ERRO] apps\monitor-api\.env nao encontrado.
    echo         Copie .env.example e preencha as credenciais SSH.
    echo.
    pause
    exit /b 1
)

REM Verifica se o node_modules existe
if not exist "apps\monitor-dashboard\node_modules" (
    echo  [INFO] Instalando dependencias do dashboard...
    cd apps\monitor-dashboard
    call npm install
    cd ..\..
    echo.
)

REM Verifica se o Python e as dependencias existem
pip show fastapi >nul 2>&1
if errorlevel 1 (
    echo  [INFO] Instalando dependencias Python...
    pip install -r apps\monitor-api\requirements.txt
    echo.
)

echo  [1/2] Iniciando API (FastAPI + SSH para VPS)...
start "Monitor API" cmd /k "cd apps\monitor-api && python -m uvicorn app.main:app --host 127.0.0.1 --port 8001 --reload"

timeout /t 3 /nobreak >nul

echo  [2/2] Iniciando Dashboard (Next.js)...
start "Monitor Dashboard" cmd /k "cd apps\monitor-dashboard && npm run dev"

timeout /t 5 /nobreak >nul

echo.
echo  =============================================
echo   Dashboard: http://localhost:3000
echo   API:       http://localhost:8001/docs
echo  =============================================
echo.
echo  Para acessar remotamente do seu PC pessoal:
echo.
echo    ssh -L 3000:localhost:3000 USUARIO@IP-DA-EMPRESA -N
echo.
echo  Depois abra: http://localhost:3000
echo  =============================================
echo.

start "" "http://localhost:3000"
