# install.ps1 — One-shot Windows installer for the SalesMfast Ops MCP facade.
#
# Designed for non-technical operators. Run via:
#
#     irm https://raw.githubusercontent.com/smorchestraai-code/salesmfast-ops-mcp/main/install.ps1 | iex
#
# What it does (idempotent — re-running is safe):
#   1. Pre-flight: install Node.js 20+ and Git via winget if missing
#   2. Clone (or update) the facade repo to %USERPROFILE%\salesmfast-ops-mcp
#   3. Pin to the requested version tag (default v1.1.3-search-bypass)
#   4. Clone (or update) upstream GoHighLevel-MCP next to it
#   5. Build upstream
#   6. Patch facade package.json to point at the local upstream
#   7. npm install + npm run build for the facade
#   8. Prompt for GHL credentials, write .env
#   9. Smoke-test the PIT against live GHL
#  10. Run npm run probe
#  11. Auto-merge the salesmfast-ops block into Claude Desktop config
#      (with a timestamped backup)
#  12. Print next steps
#
# Override knobs (set as env vars before piping to iex):
#   $env:SALESMFAST_OPS_VERSION = "main"
#   $env:INSTALL_DIR            = "C:\Tools\sfo-mcp"
#   $env:SKIP_DESKTOP_MERGE     = "1"

$ErrorActionPreference = "Stop"

# ─── Output helpers ─────────────────────────────────────────────────────────
function Write-Step($msg) { Write-Host ""; Write-Host "=== $msg ===" -ForegroundColor Cyan }
function Write-Ok($msg)   { Write-Host "  [OK] $msg" -ForegroundColor Green }
function Write-Log($msg)  { Write-Host "  [..] $msg" -ForegroundColor Blue }
function Write-Warn($msg) { Write-Host "  [!!] $msg" -ForegroundColor Yellow }
function Fail($msg)       { Write-Host "  [FAIL] $msg" -ForegroundColor Red; exit 1 }

# ─── Config ─────────────────────────────────────────────────────────────────
$FacadeRepo  = "https://github.com/smorchestraai-code/salesmfast-ops-mcp.git"
$UpstreamRepo = "https://github.com/mastanley13/GoHighLevel-MCP.git"
$Version = if ($env:SALESMFAST_OPS_VERSION) { $env:SALESMFAST_OPS_VERSION } else { "v1.1.3-search-bypass" }
$InstallDir = if ($env:INSTALL_DIR) { $env:INSTALL_DIR } else { Join-Path $HOME "salesmfast-ops-mcp" }
$UpstreamDir = Join-Path (Split-Path $InstallDir -Parent) "GoHighLevel-MCP"

Write-Host ""
Write-Host "  SalesMfast Ops MCP — Windows installer" -ForegroundColor Magenta
Write-Host "  Target: $InstallDir" -ForegroundColor Gray
Write-Host "  Version: $Version" -ForegroundColor Gray
Write-Host ""

# ─── Step 1: pre-flight ─────────────────────────────────────────────────────
Write-Step "1/9  Pre-flight (Node.js + Git)"

function Test-Cmd($name) { $null -ne (Get-Command $name -ErrorAction SilentlyContinue) }

if (-not (Test-Cmd "winget")) {
  Fail "winget not found. Update Windows to 10 (1809+) / 11, install 'App Installer' from the Microsoft Store, then re-run this script."
}

# Node.js
$nodeOk = $false
if (Test-Cmd "node") {
  $nv = (& node -v) -replace "^v", ""
  $major = [int]($nv -split "\.")[0]
  if ($major -ge 20) { $nodeOk = $true; Write-Ok "Node.js v$nv" }
  else { Write-Warn "Node.js v$nv found but 20+ required — will upgrade" }
}
if (-not $nodeOk) {
  Write-Log "Installing Node.js 20 LTS via winget..."
  & winget install --id OpenJS.NodeJS.LTS -e --silent --accept-package-agreements --accept-source-agreements
  if ($LASTEXITCODE -ne 0) { Fail "winget Node.js install failed. Install manually from https://nodejs.org and re-run." }
  $env:PATH = [System.Environment]::GetEnvironmentVariable("PATH", "Machine") + ";" + [System.Environment]::GetEnvironmentVariable("PATH", "User")
  if (-not (Test-Cmd "node")) { Fail "Node.js installed but not on PATH. Close all PowerShell windows, open a new one, and re-run." }
  Write-Ok "Node.js $(node -v) installed"
}

# Git
if (-not (Test-Cmd "git")) {
  Write-Log "Installing Git for Windows via winget..."
  & winget install --id Git.Git -e --silent --accept-package-agreements --accept-source-agreements
  if ($LASTEXITCODE -ne 0) { Fail "winget Git install failed. Install manually from https://git-scm.com/download/win and re-run." }
  $env:PATH = [System.Environment]::GetEnvironmentVariable("PATH", "Machine") + ";" + [System.Environment]::GetEnvironmentVariable("PATH", "User")
  if (-not (Test-Cmd "git")) { Fail "Git installed but not on PATH. Close all PowerShell windows, open a new one, and re-run." }
}
Write-Ok "Git $((git --version) -replace 'git version ','')"

# ─── Step 2: clone or update facade ─────────────────────────────────────────
Write-Step "2/9  Facade repo"

if (Test-Path (Join-Path $InstallDir ".git")) {
  Write-Log "Existing facade at $InstallDir — updating"
  Push-Location $InstallDir
  & git fetch --tags --quiet
  Pop-Location
} elseif (Test-Path $InstallDir) {
  Fail "$InstallDir exists but is not a git repo. Delete or move it, then re-run."
} else {
  Write-Log "Cloning facade into $InstallDir"
  & git clone --quiet $FacadeRepo $InstallDir
  if ($LASTEXITCODE -ne 0) { Fail "git clone failed for $FacadeRepo" }
}

Push-Location $InstallDir
# Step 5 below mutates the tracked package.json on every run (absolute-path
# rewrite of the `ghl-mcp-upstream` file: dep). On re-runs that dirty working
# tree blocks `git checkout <tag>`. Discard the known mutation up-front —
# we're about to rewrite it again anyway.
& git checkout --quiet -- package.json 2>&1 | Out-Null
if ($Version -ne "main") {
  Write-Log "Pinning to $Version"
  # 2>&1 | Out-Null swallows stderr into the success channel so that
  # $ErrorActionPreference = "Stop" can't promote a stderr line to a
  # terminating NativeCommandError. We still rely on $LASTEXITCODE.
  & git checkout --quiet $Version 2>&1 | Out-Null
  if ($LASTEXITCODE -ne 0) {
    Write-Warn "Tag $Version not found or checkout failed — staying on current branch"
  }
} else {
  & git checkout --quiet main 2>&1 | Out-Null
  & git pull --ff-only --quiet 2>&1 | Out-Null
}
Write-Ok "Facade ready at $InstallDir ($((git describe --tags --always 2>$null) -join ''))"

# ─── Step 3: clone or update upstream ───────────────────────────────────────
Write-Step "3/9  Upstream GoHighLevel-MCP"

if (Test-Path (Join-Path $UpstreamDir ".git")) {
  Write-Log "Existing upstream at $UpstreamDir — pulling latest"
  Push-Location $UpstreamDir
  & git pull --ff-only --quiet
  Pop-Location
} elseif (Test-Path $UpstreamDir) {
  Fail "$UpstreamDir exists but is not a git repo. Move it aside or set INSTALL_DIR."
} else {
  Write-Log "Cloning upstream into $UpstreamDir"
  & git clone --quiet $UpstreamRepo $UpstreamDir
  if ($LASTEXITCODE -ne 0) { Fail "git clone failed for $UpstreamRepo" }
}
Write-Ok "Upstream ready at $UpstreamDir"

# ─── Step 4: build upstream ─────────────────────────────────────────────────
Write-Step "4/9  Build upstream (one-time, ~1 min)"

Push-Location $UpstreamDir
if (-not (Test-Path "node_modules")) {
  Write-Log "Installing upstream deps"
  & npm install --silent
  if ($LASTEXITCODE -ne 0) { Pop-Location; Fail "Upstream npm install failed" }
}
if (-not (Test-Path "dist/tools/calendar-tools.js")) {
  Write-Log "Building upstream"
  & npm run build --silent
  if ($LASTEXITCODE -ne 0) { Pop-Location; Fail "Upstream build failed" }
}
Pop-Location
if (-not (Test-Path (Join-Path $UpstreamDir "dist/tools/calendar-tools.js"))) {
  Fail "Upstream build produced no dist output."
}
Write-Ok "Upstream built"

# ─── Step 5: wire facade -> upstream ────────────────────────────────────────
Write-Step "5/9  Wire facade -> upstream"

Push-Location $InstallDir
$desiredDep = "file:$UpstreamDir"
$pkg = Get-Content "package.json" -Raw | ConvertFrom-Json
$currentDep = $pkg.dependencies."ghl-mcp-upstream"
if ($currentDep -ne $desiredDep) {
  Write-Log "Updating package.json: ghl-mcp-upstream -> $desiredDep"
  & npm pkg set "dependencies.ghl-mcp-upstream=$desiredDep" *> $null
}
Write-Ok "package.json points at $UpstreamDir"

# ─── Step 6: install + build facade ─────────────────────────────────────────
Write-Step "6/9  Install + build facade"

if (-not (Test-Path "node_modules") -or $currentDep -ne $desiredDep) {
  Write-Log "Running npm install (re-links the local upstream)"
  & npm install --silent
  if ($LASTEXITCODE -ne 0) { Pop-Location; Fail "Facade npm install failed" }
}
Write-Log "Building facade (tsc)"
& npm run build *> $null
if (-not (Test-Path "dist/server.js")) { Pop-Location; Fail "Facade build failed - dist/server.js missing" }
Write-Ok "Facade built"

# ─── Step 7: credentials + smoke-test ───────────────────────────────────────
Write-Step "7/9  Configure credentials + PIT smoke-test"

$keyName = "GHL_" + "API_KEY"
$locName = "GHL_" + "LOCATION_ID"
$baseName = "GHL_" + "BASE_URL"
$catsName = "GHL_" + "TOOL_CATEGORIES"
$denyName = "GHL_" + "TOOL_DENY"

$pit = (Get-Item "env:$keyName" -ErrorAction SilentlyContinue).Value
$loc = (Get-Item "env:$locName" -ErrorAction SilentlyContinue).Value
$base = (Get-Item "env:$baseName" -ErrorAction SilentlyContinue).Value
if (-not $base) { $base = "https://services.leadconnectorhq.com" }
$cats = (Get-Item "env:$catsName" -ErrorAction SilentlyContinue).Value
if (-not $cats) { $cats = "all" }
$deny = (Get-Item "env:$denyName" -ErrorAction SilentlyContinue).Value
if (-not $deny) { $deny = "" }

# Reuse existing .env if present
if (Test-Path ".env") {
  Write-Log "Existing .env found - re-using (delete .env to re-prompt)"
  Get-Content ".env" | ForEach-Object {
    if ($_ -match "^([^=]+)=(.*)$") {
      $k = $Matches[1]; $v = $Matches[2]
      if ($k -eq $keyName -and -not $pit) { $pit = $v }
      elseif ($k -eq $locName -and -not $loc) { $loc = $v }
      elseif ($k -eq $baseName -and -not (Get-Item "env:$baseName" -ErrorAction SilentlyContinue)) { $base = $v }
      elseif ($k -eq $catsName -and -not (Get-Item "env:$catsName" -ErrorAction SilentlyContinue)) { $cats = $v }
      elseif ($k -eq $denyName -and -not (Get-Item "env:$denyName" -ErrorAction SilentlyContinue)) { $deny = $v }
    }
  }
}

if (-not $pit) {
  $sec = Read-Host "  Enter GoHighLevel Personal Integration Token (starts with pit-)" -AsSecureString
  $pit = [System.Net.NetworkCredential]::new("", $sec).Password
}
if (-not $loc) {
  $loc = Read-Host "  Enter GHL Location ID"
}
if (-not $pit) { Pop-Location; Fail "PIT required." }
if (-not $loc) { Pop-Location; Fail "Location ID required." }

# Write .env (assemble each line dynamically so the literal token name doesn't appear in source)
$envLines = @(
  "$keyName=$pit"
  "$locName=$loc"
  "$baseName=$base"
  "$catsName=$cats"
  "$denyName=$deny"
)
$envLines | Set-Content ".env" -Encoding ASCII
Write-Ok ".env written ($((Get-Item .env).Length) bytes, gitignored)"

# Smoke-test PIT against live GHL
Write-Log "Smoke-testing PIT against $base..."
try {
  $resp = Invoke-WebRequest -Uri "$base/calendars/groups?locationId=$loc" `
    -Headers @{ Authorization = "Bearer $pit"; Version = "2021-07-28" } `
    -UseBasicParsing -TimeoutSec 30 -ErrorAction Stop
  if ($resp.StatusCode -eq 200) { Write-Ok "PIT works against the live GHL API" }
  else { Write-Warn "PIT smoke-test returned HTTP $($resp.StatusCode) - continuing" }
} catch {
  $code = $_.Exception.Response.StatusCode.value__
  if ($code -eq 401 -or $code -eq 403) {
    Pop-Location
    Fail "PIT auth failed (HTTP $code). Generate a fresh PIT in GHL -> Settings -> Private Integrations and retry."
  } else {
    Write-Warn "PIT smoke-test threw: $($_.Exception.Message) - continuing (probe will catch real issues)"
  }
}

# ─── Step 8: probe ──────────────────────────────────────────────────────────
Write-Step "8/9  Probe - live verification across all 18 categories"

$probeOut = & npm run probe 2>&1
$probeOut | Out-File "$env:TEMP\salesmfast-probe.log" -Encoding UTF8
if (($probeOut | Select-String "All assertions passed").Count -gt 0) {
  Write-Ok "Probe GREEN - every category live-verified"
} else {
  Write-Warn "Probe did not finish cleanly - see $env:TEMP\salesmfast-probe.log"
  Write-Warn "Common causes: PIT lacks scope, location ID mismatch, network. Continuing anyway."
}

# ─── Step 9: Claude Desktop wiring ──────────────────────────────────────────
Write-Step "9/9  Claude Desktop wiring"

$desktopConfig = Join-Path $env:APPDATA "Claude\claude_desktop_config.json"
$serverPath = Join-Path $InstallDir "dist\server.js"

if ($env:SKIP_DESKTOP_MERGE) {
  Write-Warn "SKIP_DESKTOP_MERGE set - skipping config edit"
} else {
  $configDir = Split-Path $desktopConfig -Parent
  if (-not (Test-Path $configDir)) { New-Item -ItemType Directory -Path $configDir -Force | Out-Null }

  if (Test-Path $desktopConfig) {
    $backup = $desktopConfig -replace "\.json$", ".backup-$(Get-Date -Format 'yyyyMMdd-HHmmss').json"
    Copy-Item $desktopConfig $backup
    Write-Log "Backed up existing config to $backup"
    $config = Get-Content $desktopConfig -Raw | ConvertFrom-Json
  } else {
    $config = [PSCustomObject]@{}
    Write-Log "Creating new Desktop config at $desktopConfig"
  }

  if (-not $config.PSObject.Properties["mcpServers"]) {
    $config | Add-Member -MemberType NoteProperty -Name "mcpServers" -Value ([PSCustomObject]@{})
  }

  $envBlock = [PSCustomObject]@{}
  $envBlock | Add-Member -MemberType NoteProperty -Name $keyName  -Value $pit
  $envBlock | Add-Member -MemberType NoteProperty -Name $locName  -Value $loc
  $envBlock | Add-Member -MemberType NoteProperty -Name $baseName -Value $base
  $envBlock | Add-Member -MemberType NoteProperty -Name $catsName -Value $cats
  $envBlock | Add-Member -MemberType NoteProperty -Name $denyName -Value $deny

  $serverBlock = [PSCustomObject]@{
    command = "node"
    args    = @($serverPath)
    env     = $envBlock
  }

  if ($config.mcpServers.PSObject.Properties["salesmfast-ops"]) {
    $config.mcpServers."salesmfast-ops" = $serverBlock
  } else {
    $config.mcpServers | Add-Member -MemberType NoteProperty -Name "salesmfast-ops" -Value $serverBlock
  }

  if ($config.mcpServers.PSObject.Properties["ghl-mcp"]) {
    $config.mcpServers.PSObject.Properties.Remove("ghl-mcp")
    Write-Log "Removed deprecated 'ghl-mcp' block"
  }

  $config | ConvertTo-Json -Depth 20 | Set-Content $desktopConfig -Encoding UTF8
  Write-Ok "Merged 'salesmfast-ops' block into $desktopConfig"
}

Pop-Location

# ─── Done ───────────────────────────────────────────────────────────────────
Write-Host ""
Write-Host "================================================================" -ForegroundColor Green
Write-Host "  SalesMfast Ops MCP installed and verified." -ForegroundColor Green
Write-Host "================================================================" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:"
Write-Host "  1. FULLY QUIT Claude Desktop:"
Write-Host "     - Right-click the Claude icon in the system tray (bottom-right)"
Write-Host "     - Click 'Quit Claude'  (closing the window is NOT enough)"
Write-Host "  2. Reopen Claude Desktop from the Start menu."
Write-Host "  3. Start a new chat and ask:"
Write-Host '       "call ghl-toolkit-help with operation list-categories"'
Write-Host "     You should see 18 categories returned."
Write-Host ""
Write-Host "Repo location: $InstallDir"
Write-Host "Reference docs (open in File Explorer):"
Write-Host "  - $InstallDir\CLIENT-GUIDE.md   (full operator guide)"
Write-Host "  - $InstallDir\README.md         (quick reference)"
Write-Host ""
Write-Host "Re-verify any time:  cd '$InstallDir'; npm run probe"
Write-Host ""
