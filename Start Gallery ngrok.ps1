param(
  [int]$Port = 3080
)

$ErrorActionPreference = "Stop"
$NgrokAuthToken = "3C9oUUzjpPNM0qgPb2REdzzCuAY_WRtGGew2kkKCvQ1VWuoQ"

function Write-Info($message) {
  Write-Host "[gallery-ngrok] $message"
}

function Find-Ngrok {
  $command = Get-Command ngrok -ErrorAction SilentlyContinue
  if ($command -and $command.Source) {
    return $command.Source
  }

  $candidates = @(
    "C:\Program Files\ngrok\ngrok.exe",
    "C:\ngrok\ngrok.exe",
    (Join-Path $env:USERPROFILE "Downloads\ngrok.exe")
  )

  foreach ($candidate in $candidates) {
    if ($candidate -and (Test-Path -LiteralPath $candidate)) {
      return $candidate
    }
  }

  return $null
}

function Test-LocalPort([int]$TargetPort) {
  try {
    $client = New-Object System.Net.Sockets.TcpClient
    $async = $client.BeginConnect("127.0.0.1", $TargetPort, $null, $null)
    $connected = $async.AsyncWaitHandle.WaitOne(500)
    if (-not $connected) {
      $client.Close()
      return $false
    }
    $client.EndConnect($async)
    $client.Close()
    return $true
  } catch {
    return $false
  }
}

function Wait-ForPort([int]$TargetPort, [int]$TimeoutSeconds = 20) {
  $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
  while ((Get-Date) -lt $deadline) {
    if (Test-LocalPort -TargetPort $TargetPort) {
      return $true
    }
    Start-Sleep -Milliseconds 500
  }
  return $false
}

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$serverScript = Join-Path $scriptDir "server.js"
$ngrokPath = Find-Ngrok

if (-not (Test-Path -LiteralPath $serverScript)) {
  throw "server.js was not found in $scriptDir"
}

if (-not $ngrokPath) {
  Write-Host ""
  Write-Host "ngrok.exe was not found." -ForegroundColor Yellow
  Write-Host "Install ngrok first, then run this again." -ForegroundColor Yellow
  Write-Host "Official download page: https://ngrok.com/downloads/windows" -ForegroundColor Yellow
  Write-Host ""
  Read-Host "Press Enter to exit"
  exit 1
}

Write-Info "Using ngrok: $ngrokPath"
Write-Info "Configuring ngrok auth token"
& $ngrokPath config add-authtoken $NgrokAuthToken | Out-Null

if (-not (Test-LocalPort -TargetPort $Port)) {
  Write-Info "Starting gallery server on http://localhost:$Port"
  $command = "Set-Location -LiteralPath '$scriptDir'; node server.js"
  Start-Process powershell -ArgumentList @("-NoExit", "-Command", $command) | Out-Null

  if (-not (Wait-ForPort -TargetPort $Port -TimeoutSeconds 20)) {
    Write-Host ""
    Write-Host "The gallery server did not start on port $Port." -ForegroundColor Yellow
    Write-Host "Check the server PowerShell window for errors, then run this script again." -ForegroundColor Yellow
    Write-Host ""
    Read-Host "Press Enter to exit"
    exit 1
  }
} else {
  Write-Info "Gallery server already running on http://localhost:$Port"
}

Write-Host ""
Write-Info "Starting ngrok tunnel..."
Write-Info "Press Ctrl+C in this window to stop ngrok."
Write-Host ""

& $ngrokPath http $Port
