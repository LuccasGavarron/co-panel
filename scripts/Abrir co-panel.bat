@echo off
REM co-panel - clique 2x pra abrir. Na primeira vez ele se prepara sozinho.
cd /d "%~dp0.."

if not exist "node_modules" goto prepare
if not exist ".next" goto prepare
goto run

:prepare
echo Preparando o co-panel (so na primeira vez)...
call npm install --no-audit --no-fund
if errorlevel 1 goto fail
call npm run build
if errorlevel 1 goto fail

:run
echo Subindo o co-panel em http://localhost:4571 ...
start "" cmd /c "npm run start"
timeout /t 5 /nobreak >nul
start "" "http://localhost:4571"
echo co-panel rodando. Feche a janela do servidor para encerrar.
goto end

:fail
echo Nao consegui preparar. Confira se o Node esta instalado (nodejs.org).
pause

:end
