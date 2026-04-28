@echo off
title BO Self Serve Dashboard
echo.
echo  Starting BO Self Serve Dashboard...
echo  Your browser will open automatically.
echo.
powershell -ExecutionPolicy Bypass -File "%~dp0serve.ps1"
pause
