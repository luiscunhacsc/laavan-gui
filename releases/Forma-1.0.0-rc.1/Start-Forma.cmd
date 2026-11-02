@echo off
cd /d "%~dp0"
where py >nul 2>nul
if errorlevel 1 goto use_python
py -3 "%~dp0serve.py"
goto done
:use_python
where python >nul 2>nul
if errorlevel 1 goto missing
python "%~dp0serve.py"
goto done
:missing
echo Python 3 is required to start this local static server.
echo Install Python 3, then run Start-Forma.cmd again.
:done
pause
