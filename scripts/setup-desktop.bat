@echo off
REM setup-desktop.bat — One-time Desktop setup for CS Reports (Windows)
REM Creates: %USERPROFILE%\Desktop\CS Reports\Intercom\
REM          %USERPROFILE%\Desktop\CS Reports\Onboarding\
REM          %USERPROFILE%\Desktop\CS Reports\Renewals\
REM Also creates a shortcut to the cs-repo folder on your Desktop.
REM
REM Run once after cloning:
REM   Double-click this file, or in Command Prompt:
REM   cd cs-repo && scripts\setup-desktop.bat

setlocal

set "DESKTOP=%USERPROFILE%\Desktop"
set "REPORTS_DIR=%DESKTOP%\CS Reports"
set "REPO_DIR=%~dp0.."

echo Setting up CS Reports folder on your Desktop...

mkdir "%REPORTS_DIR%\Intercom"   2>nul && echo   OK %REPORTS_DIR%\Intercom\
mkdir "%REPORTS_DIR%\Onboarding" 2>nul && echo   OK %REPORTS_DIR%\Onboarding\
mkdir "%REPORTS_DIR%\Renewals"   2>nul && echo   OK %REPORTS_DIR%\Renewals\

REM Create a Desktop shortcut to the repo using PowerShell
set "LINK=%DESKTOP%\cs-repo.lnk"
powershell -NoProfile -Command ^
  "$s = (New-Object -COM WScript.Shell).CreateShortcut('%LINK%'); ^
   $s.TargetPath = '%REPO_DIR%'; ^
   $s.Description = 'CS Repo'; ^
   $s.Save()"

if exist "%LINK%" (
  echo   OK Desktop shortcut created: cs-repo.lnk
) else (
  echo   WARNING: Could not create Desktop shortcut. You can open the repo manually from File Explorer.
)

echo.
echo Done. After running any report command, the latest .docx will auto-copy to:
echo   %REPORTS_DIR%\Intercom\   (Intercom reports)
echo   %REPORTS_DIR%\Onboarding\ (Onboarding reports)
echo   %REPORTS_DIR%\Renewals\   (Renewal invoice reports)
echo.
echo To open Claude Code in this repo, open Command Prompt and type:
echo   cd "%REPO_DIR%"
echo   claude

endlocal
pause
