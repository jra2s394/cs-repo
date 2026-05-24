#!/usr/bin/env python3
"""Desktop notification when Claude needs input.

Sends a macOS notification so you know when Claude has stopped and is
waiting for your response — useful when Claude is running long tasks in
the background and you've switched to another window.

A terminal bell (\\a) is always sent as an instant fallback.

SETUP (~/.claude/settings.json):
  {
    "hooks": {
      "Notification": [
        { "matcher": "", "hooks": [{ "type": "command", "command": "python3 /path/to/notify.py" }] }
      ]
    }
  }
"""
import subprocess
import sys

# Always send terminal bell as instant fallback
print("\a", end="", file=sys.stderr)

# ── macOS (default) ────────────────────────────────────────────────────────────
try:
    subprocess.Popen(
        [
            "osascript", "-e",
            'display notification "Claude Code needs your attention" '
            'with title "Claude Code" sound name "Ping"',
        ],
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )
except FileNotFoundError:
    pass
except Exception:
    pass

# ── ALTERNATIVE: native Linux ──────────────────────────────────────────────────
# Requires: libnotify-bin  (sudo apt install libnotify-bin)
#
# try:
#     subprocess.Popen(
#         ["notify-send", "Claude Code", "Claude Code needs your attention",
#          "--icon=dialog-information", "--expire-time=5000"],
#         stdout=subprocess.DEVNULL,
#         stderr=subprocess.DEVNULL,
#     )
# except FileNotFoundError:
#     pass
# except Exception:
#     pass

# ── ALTERNATIVE: WSL / Windows ─────────────────────────────────────────────────
#
# ps_script = r"""
# Add-Type -AssemblyName System.Windows.Forms
# $notify = New-Object System.Windows.Forms.NotifyIcon
# $notify.Icon = [System.Drawing.SystemIcons]::Information
# $notify.Visible = $true
# $notify.ShowBalloonTip(5000, 'Claude Code', 'Claude Code needs your attention', 'Info')
# Start-Sleep -Seconds 6
# $notify.Dispose()
# """
# try:
#     subprocess.Popen(
#         ["powershell.exe", "-NoProfile", "-Command", ps_script],
#         stdout=subprocess.DEVNULL,
#         stderr=subprocess.DEVNULL,
#     )
# except FileNotFoundError:
#     pass
# except Exception:
#     pass

sys.exit(0)
