@echo off
setlocal EnableExtensions
if not exist "%~dp0server.mjs" goto incompleteArchive
if not exist "%~dp0public\index.html" goto incompleteArchive
if not exist "%~dp0server\cms.mjs" goto incompleteArchive
if not exist "%~dp0data\seed-content.json" goto incompleteArchive
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js 22.13 or newer is required.
  echo Install Node.js, reopen this file, and see README.txt for help.
  pause
  exit /b 1
)
node "%~dp0server.mjs" %*
set "portfolioExit=%errorlevel%"
if not "%portfolioExit%"=="0" (
  echo.
  echo The local server could not start. See the message above and README.txt.
  pause
)
endlocal & exit /b %portfolioExit%

:incompleteArchive
echo.
echo The complete portfolio folder was not found beside this launcher.
echo Do not run Start-Portfolio.cmd from inside a ZIP file.
echo Windows ZIP preview may copy only the launcher to a temporary folder.
echo.
echo 1. Close this window and return to the downloaded ZIP file.
echo 2. Right-click the ZIP and choose "Extract All...".
echo 3. Open the extracted KirinSounds-webapp folder.
echo 4. Check that server.mjs and public\index.html are present.
echo 5. Double-click Start-Portfolio.cmd in that extracted folder.
echo.
echo Example: Documents\KirinSounds-webapp\Start-Portfolio.cmd
echo See README.txt for complete instructions. Nothing was extracted or deleted.
pause
endlocal & exit /b 2
