@echo off
REM Mangusu IS CSC Form 48 DTR Portal - Automatic Publish Script for Windows
REM Automatically stages all files, creates a commit, and pushes to origin main.

setlocal enabledelayedexpansion

set MSG=%*
if "%MSG%"=="" set MSG=Update Mangusu IS CSC Form 48 DTR Portal

echo ==========================================
echo [1/3] Staging changes...
echo ==========================================
git add -A

echo [2/3] Committing changes...
git commit -m "%MSG%" --allow-empty

echo [3/3] Pushing to origin main...
git push -u origin main

echo.
echo [DONE] Successfully pushed to origin main!
echo GitHub Actions will now automatically build and deploy to GitHub Pages.
pause
