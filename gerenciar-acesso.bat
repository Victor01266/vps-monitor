@echo off
title Gerenciar Acesso - VPS Monitor

echo.
echo  =============================================
echo   Gerenciar Acesso ao Monitor VPS
echo  =============================================
echo.
echo  1. Ver meu IP atual
echo  2. Adicionar meu IP ao whitelist da VPS
echo  3. Listar IPs autorizados na VPS
echo  4. Aplicar configuracao nginx na VPS (primeira vez)
echo  0. Sair
echo.
set /p opcao=Escolha: 

if "%opcao%"=="1" goto ver_ip
if "%opcao%"=="2" goto adicionar_ip
if "%opcao%"=="3" goto listar_ips
if "%opcao%"=="4" goto aplicar_nginx
if "%opcao%"=="0" exit /b
goto fim

:ver_ip
echo.
echo  Seu IP publico atual:
curl -s https://api.ipify.org
echo.
echo.
echo  Use este IP na opcao 2 para liberar acesso ao monitor.
echo.
pause
goto fim

:adicionar_ip
echo.
set /p ip=Digite o IP a liberar (ex: 177.10.20.30): 
echo.
echo  Adicionando %ip% ao whitelist...
ssh -p 2222 root@72.60.158.84 "sed -i '/# <- seu IP de casa/a\    allow %ip%;           # adicionado via script' /etc/nginx/sites-available/monitor.diagonalit.com.br && nginx -t && systemctl reload nginx && echo OK"
echo.
echo  IP %ip% adicionado. Teste acessando https://monitor.diagonalit.com.br
echo.
pause
goto fim

:listar_ips
echo.
echo  IPs atualmente autorizados:
ssh -p 2222 root@72.60.158.84 "grep 'allow' /etc/nginx/sites-available/monitor.diagonalit.com.br"
echo.
pause
goto fim

:aplicar_nginx
echo.
echo  Copiando configuracao nginx para a VPS...
scp -P 2222 nginx-monitor.conf root@72.60.158.84:/etc/nginx/sites-available/monitor.diagonalit.com.br
echo.
echo  Testando e recarregando nginx...
ssh -p 2222 root@72.60.158.84 "nginx -t && systemctl reload nginx && echo Nginx recarregado com sucesso"
echo.
pause
goto fim

:fim
