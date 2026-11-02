@echo off
setlocal
set "FORMA_SERVER=%~dp0serve.py"
if not exist "%FORMA_SERVER%" set "FORMA_SERVER=%~dp0scripts\release-serve.py"
if not exist "%FORMA_SERVER%" goto missing_files
py -3 -c "import sys; sys.exit(sys.version_info < (3, 8))" >nul 2>nul
if not errorlevel 1 goto use_py
python3 -c "import sys; sys.exit(sys.version_info < (3, 8))" >nul 2>nul
if not errorlevel 1 goto use_python3
python -c "import sys; sys.exit(sys.version_info < (3, 8))" >nul 2>nul
if not errorlevel 1 goto use_python
echo Python 3.8 or newer is required to start Forma.
echo Install Python 3, then run Start-Forma.cmd again.
goto failed
:use_py
py -3 "%FORMA_SERVER%" %*
goto finished
:use_python3
python3 "%FORMA_SERVER%" %*
goto finished
:use_python
python "%FORMA_SERVER%" %*
goto finished
:missing_files
echo The Forma launcher files are missing. Extract the complete ZIP first.
:failed
pause
exit /b 1
:finished
set "FORMA_EXIT=%ERRORLEVEL%"
if not "%FORMA_EXIT%"=="0" pause
exit /b %FORMA_EXIT%
