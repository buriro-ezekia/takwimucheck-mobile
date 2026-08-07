# Verifies the Redmi USB development path, repairs ADB reverse mappings, starts Metro reliably, and launches TakwimuCheck.

[CmdletBinding()]
param()

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$RepoRoot = Split-Path -Parent $PSScriptRoot
$PackageName = "com.buriroezekia.takwimucheck"
$AppScheme = "takwimucheck"
$BackendPort = 8000
$MetroPort = 8081
$BackendUrl = "http://127.0.0.1:$BackendPort"
$MetroUrl = "http://127.0.0.1:$MetroPort"
$ExpectedApiLine = "EXPO_PUBLIC_API_BASE_URL=$BackendUrl"
$RuntimeLogRoot = Join-Path $env:TEMP "takwimucheck-batch09"
$MetroStdoutLog = Join-Path $RuntimeLogRoot "metro.stdout.log"
$MetroStderrLog = Join-Path $RuntimeLogRoot "metro.stderr.log"

function Get-SingleAndroidDevice {
    $lines = @(adb devices)
    if ($LASTEXITCODE -ne 0) {
        throw "ADB could not list devices."
    }

    $authorised = @(
        $lines |
            Select-String '^\S+\s+device$' |
            ForEach-Object { ($_ -split '\s+')[0] }
    )
    $unauthorised = @(
        $lines |
            Select-String '^\S+\s+unauthorized$'
    )

    if ($unauthorised.Count -gt 0) {
        throw "The Android device is connected but unauthorised. Unlock it and accept the USB debugging prompt."
    }
    if ($authorised.Count -eq 0) {
        throw "No authorised Android device is connected. Keep the Redmi unlocked, reconnect USB and ensure USB debugging is enabled."
    }
    if ($authorised.Count -gt 1) {
        throw "More than one authorised Android device is connected. Leave only the Redmi connected."
    }

    return [string]$authorised[0]
}

function Assert-AppInstalled {
    param([Parameter(Mandatory = $true)][string]$Serial)

    $result = @(adb -s $Serial shell pm path $PackageName)
    if ($LASTEXITCODE -ne 0 -or -not ($result -match '^package:')) {
        throw "The TakwimuCheck development build is not installed on device $Serial."
    }
}

function Set-UsbReverseMappings {
    param([Parameter(Mandatory = $true)][string]$Serial)

    adb -s $Serial reverse --remove-all | Out-Null
    if ($LASTEXITCODE -ne 0) {
        throw "Could not clear old ADB reverse mappings."
    }

    adb -s $Serial reverse "tcp:$BackendPort" "tcp:$BackendPort" | Out-Null
    if ($LASTEXITCODE -ne 0) {
        throw "Could not reverse backend port $BackendPort."
    }

    adb -s $Serial reverse "tcp:$MetroPort" "tcp:$MetroPort" | Out-Null
    if ($LASTEXITCODE -ne 0) {
        throw "Could not reverse Metro port $MetroPort."
    }

    $mappings = @(adb -s $Serial reverse --list)
    if (-not ($mappings -match "tcp:$BackendPort")) {
        throw "Backend reverse mapping tcp:$BackendPort was not created."
    }
    if (-not ($mappings -match "tcp:$MetroPort")) {
        throw "Metro reverse mapping tcp:$MetroPort was not created."
    }

    Write-Host "ADB reverse ${BackendPort}: passed" -ForegroundColor Green
    Write-Host "ADB reverse ${MetroPort}: passed" -ForegroundColor Green
}

function Assert-MobileEnvironment {
    $envPath = Join-Path $RepoRoot ".env.local"
    if (-not (Test-Path $envPath)) {
        throw ".env.local was not found in the mobile repository."
    }

    $apiLine = @(
        Get-Content -Path $envPath |
            Where-Object { $_ -match '^EXPO_PUBLIC_API_BASE_URL=' }
    ) | Select-Object -First 1

    if ([string]$apiLine -ne $ExpectedApiLine) {
        throw "Expected '$ExpectedApiLine' in .env.local. Found '$apiLine'."
    }

    Write-Host "Mobile API base URL: passed" -ForegroundColor Green

    $legacyIdentity = @(
        Get-Content -Path $envPath |
            Where-Object { $_ -match '^EXPO_PUBLIC_REVENUECAT_APP_USER_ID=' }
    ) | Select-Object -First 1

    if ($legacyIdentity) {
        Write-Host "Warning: stale EXPO_PUBLIC_REVENUECAT_APP_USER_ID remains in .env.local; Batch 9 does not use it and it should be removed before RevenueCat acceptance." -ForegroundColor Yellow
    }
}

function Test-Backend {
    try {
        $health = Invoke-RestMethod -Uri "$BackendUrl/health" -Method Get -TimeoutSec 5
    }
    catch {
        throw "The backend is not reachable at $BackendUrl. Keep the Batch 9 backend server running."
    }

    if ($health.status -ne "ok") {
        throw "Backend health returned an unexpected response."
    }

    Write-Host "Backend health: passed" -ForegroundColor Green
}

function Test-Metro {
    try {
        $response = Invoke-WebRequest -UseBasicParsing -Uri "$MetroUrl/status" -TimeoutSec 2
        return ($response.StatusCode -eq 200 -and $response.Content.Trim() -eq "packager-status:running")
    }
    catch {
        return $false
    }
}

function Stop-StaleMetroListeners {
    $listeners = @(
        Get-NetTCPConnection -LocalPort $MetroPort -State Listen -ErrorAction SilentlyContinue
    )

    foreach ($listener in $listeners) {
        $process = Get-Process -Id $listener.OwningProcess -ErrorAction SilentlyContinue
        if ($null -eq $process) {
            continue
        }

        if ($process.ProcessName -notmatch '^(node|npm|npx)$') {
            throw "Port $MetroPort is occupied by process '$($process.ProcessName)' (PID $($process.Id)), not Metro. Stop that process manually before continuing."
        }

        Write-Host "Stopping stale Metro/Node process PID $($process.Id) on port $MetroPort" -ForegroundColor Yellow
        Stop-Process -Id $process.Id -Force
        Start-Sleep -Milliseconds 750
    }
}

function Get-MetroLogTail {
    $lines = @()

    if (Test-Path $MetroStdoutLog) {
        $lines += "--- Metro stdout ---"
        $lines += @(Get-Content -Path $MetroStdoutLog -Tail 40 -ErrorAction SilentlyContinue)
    }

    if (Test-Path $MetroStderrLog) {
        $lines += "--- Metro stderr ---"
        $lines += @(Get-Content -Path $MetroStderrLog -Tail 40 -ErrorAction SilentlyContinue)
    }

    return @($lines)
}

function Start-Metro {
    if (Test-Metro) {
        Write-Host "Metro status: already healthy" -ForegroundColor Green
        return
    }

    Stop-StaleMetroListeners

    New-Item -ItemType Directory -Path $RuntimeLogRoot -Force | Out-Null
    Remove-Item -Path $MetroStdoutLog -Force -ErrorAction SilentlyContinue
    Remove-Item -Path $MetroStderrLog -Force -ErrorAction SilentlyContinue

    $nodeCommand = Get-Command node.exe -ErrorAction Stop
    $nodeExe = [string]$nodeCommand.Source
    $expoCli = Join-Path $RepoRoot "node_modules\expo\bin\cli"

    if (-not (Test-Path $expoCli)) {
        throw "The local Expo CLI was not found at '$expoCli'. Run npm install in the mobile repository before continuing."
    }

    Write-Host "Starting Metro directly with the local Expo CLI..." -ForegroundColor Cyan

    # Windows PowerShell Start-Process joins ArgumentList into one command line.
    # Quote the Expo CLI path explicitly because the repository path contains spaces.
    $metroArguments = @(
        ('"{0}"' -f $expoCli),
        "start",
        "--dev-client",
        "--clear",
        "--localhost",
        "--port",
        [string]$MetroPort
    ) -join " "

    $metroProcess = Start-Process `
        -FilePath $nodeExe `
        -ArgumentList $metroArguments `
        -WorkingDirectory $RepoRoot `
        -RedirectStandardOutput $MetroStdoutLog `
        -RedirectStandardError $MetroStderrLog `
        -WindowStyle Hidden `
        -PassThru

    $deadline = (Get-Date).AddSeconds(90)

    do {
        Start-Sleep -Seconds 2

        if (Test-Metro) {
            Write-Host "Metro status: packager-status:running" -ForegroundColor Green
            Write-Host "Metro PID: $($metroProcess.Id)" -ForegroundColor Green
            Write-Host "Metro logs: $RuntimeLogRoot" -ForegroundColor DarkGray
            return
        }

        if ($metroProcess.HasExited) {
            $metroProcess.Refresh()
            $exitCode = if ($null -ne $metroProcess.ExitCode) { [string]$metroProcess.ExitCode } else { "unknown" }
            $logTail = Get-MetroLogTail
            if ($logTail.Count -gt 0) {
                Write-Host ""
                $logTail | ForEach-Object { Write-Host $_ }
                Write-Host ""
            }
            throw "Metro exited before becoming healthy. Exit code: $exitCode. The first actionable Metro error is shown above."
        }
    } while ((Get-Date) -lt $deadline)

    $logTail = Get-MetroLogTail
    if ($logTail.Count -gt 0) {
        Write-Host ""
        $logTail | ForEach-Object { Write-Host $_ }
        Write-Host ""
    }

    if (-not $metroProcess.HasExited) {
        Stop-Process -Id $metroProcess.Id -Force -ErrorAction SilentlyContinue
    }

    throw "Metro did not become healthy on $MetroUrl within 90 seconds. The captured Metro output is shown above."
}

function Launch-DevelopmentClient {
    param([Parameter(Mandatory = $true)][string]$Serial)

    # Re-assert reverse mappings after Metro startup in case ADB restarted.
    Set-UsbReverseMappings -Serial $Serial

    adb -s $Serial shell am force-stop $PackageName | Out-Null
    Start-Sleep -Seconds 1

    $encodedMetro = [System.Uri]::EscapeDataString($MetroUrl)
    $launchUrl = "${AppScheme}://expo-development-client/?url=$encodedMetro"

    $result = @(adb -s $Serial shell am start -W -a android.intent.action.VIEW -d $launchUrl $PackageName)
    if ($LASTEXITCODE -ne 0) {
        throw "Android could not launch the TakwimuCheck development-client URL."
    }

    if ($result -match 'Error:') {
        throw "Android rejected the development-client deep link: $($result -join ' ')"
    }

    Write-Host "Development client launch: requested" -ForegroundColor Green
}

Set-Location $RepoRoot

Write-Host "=== TakwimuCheck Batch 9 Android USB development ===" -ForegroundColor Cyan

$serial = Get-SingleAndroidDevice
Write-Host "Android device: $serial" -ForegroundColor Green

Assert-AppInstalled -Serial $serial
Write-Host "TakwimuCheck development build: installed" -ForegroundColor Green

Assert-MobileEnvironment
Test-Backend
Set-UsbReverseMappings -Serial $serial
Start-Metro
Launch-DevelopmentClient -Serial $serial

Write-Host ""
Write-Host "============================================" -ForegroundColor Green
Write-Host "ANDROID USB DEVELOPMENT PATH: PASSED" -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Green
Write-Host "Backend: $BackendUrl"
Write-Host "Metro:   $MetroUrl"
Write-Host "Device:  $serial"
Write-Host "Metro logs: $RuntimeLogRoot"
Write-Host ""
Write-Host "The Redmi should now load TakwimuCheck directly. Sign in with the Administrator account and verify POST /auth/login and GET /auth/me return 200 in Uvicorn."
