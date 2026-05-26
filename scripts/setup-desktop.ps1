# setup-desktop.ps1 — One-time Desktop setup for CS Reports (Windows)
# Creates: $HOME\Desktop\CS Reports\Intercom\
#          $HOME\Desktop\CS Reports\Onboarding\
#          $HOME\Desktop\CS Reports\Renewals\
#          $HOME\Desktop\CS Reports\QBR\
#          $HOME\Desktop\CS Reports\Health Reports\
#          $HOME\Desktop\CS Reports\Executive Summaries\
#          $HOME\Desktop\CS Reports\Standups\
# Also creates a shortcut to the cs-repo folder on your Desktop.
#
# Run once after cloning. In PowerShell:
#   cd cs-repo
#   PowerShell -ExecutionPolicy Bypass -File scripts\setup-desktop.ps1
#
# If you see a permissions error, right-click PowerShell -> "Run as administrator"
# and run the command again.

$repoDir = (Resolve-Path "$PSScriptRoot\..").Path
$desktop = [Environment]::GetFolderPath("Desktop")
$reports = Join-Path $desktop "CS Reports"

Write-Host "Setting up CS Reports folder on your Desktop..."

# Create report subfolders
foreach ($sub in "Intercom", "Onboarding", "Renewals", "QBR", "Health Reports", "Executive Summaries", "Standups") {
    $dir = Join-Path $reports $sub
    try {
        if (-not (Test-Path $dir)) {
            New-Item -ItemType Directory -Path $dir | Out-Null
        }
        Write-Host "  OK $dir"
    } catch {
        Write-Warning "Could not create folder: $dir"
        Write-Host "  Try right-clicking PowerShell and selecting 'Run as administrator', then run this script again."
        exit 1
    }
}

# Create a Desktop shortcut to the repo
$linkPath = Join-Path $desktop "cs-repo.lnk"
try {
    $shell    = New-Object -ComObject WScript.Shell
    $shortcut = $shell.CreateShortcut($linkPath)
    $shortcut.TargetPath  = $repoDir
    $shortcut.Description = "CS Repo"
    $shortcut.Save()
    Write-Host "  OK Desktop shortcut: cs-repo.lnk"
} catch {
    Write-Warning "Could not create Desktop shortcut: $_"
    Write-Host "  You can open the repo manually from File Explorer."
}

Write-Host ""
Write-Host "Done. After running any report command, the latest .docx will auto-copy to:"
Write-Host "  $reports\Intercom\             (Intercom reports)"
Write-Host "  $reports\Onboarding\           (Onboarding reports)"
Write-Host "  $reports\Renewals\             (Renewal invoice reports)"
Write-Host "  $reports\QBR\                  (QBR prep briefs)"
Write-Host "  $reports\Health Reports\       (Portfolio health scorecards)"
Write-Host "  $reports\Executive Summaries\  (Executive summary reports)"
Write-Host "  $reports\Standups\             (Daily/Midweek/EOW/Week-start .md files)"
Write-Host ""
Write-Host "To open Claude Code in this repo, open PowerShell and type:"
Write-Host "  cd `"$repoDir`""
Write-Host "  claude"
