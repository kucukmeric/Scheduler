@echo off
title Bilkent STARS Data Scraper
echo =======================================================
echo   Bilkent STARS - Full Course and Section Scraper
echo =======================================================
echo.
echo This process will take several minutes as it iterates
echo through every department, course, and section.
echo Please do not close this window.
echo.

powershell -NoProfile -ExecutionPolicy Bypass -File ".\scraper.ps1"

echo.
echo Operation finished. See details above.
pause