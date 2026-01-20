param(
    [string]$BlogDir = $env:BLOG_DIR,
    [string]$NodeExe = $env:NODE_EXE,
    [string]$PythonExe = $env:PYTHON_EXE,
    [string]$NginxExe = $(if ($env:NGINX_EXE) { $env:NGINX_EXE } elseif ($env:NGINX_PATH) { $env:NGINX_PATH } else { "" }),
    [string]$NginxConf = $env:NGINX_CONF,
    [int]$BackendPort = 5000,
    [int]$HexoPort = 4000,
    [string]$StartHexoServer = $env:START_HEXO_SERVER
)

$ErrorActionPreference = "Stop"
# 注意：PowerShell 5.1 + Server Core 环境下 StrictMode(Latest) 容易引发“变量未设置”的误报
Set-StrictMode -Off

# 尽量避免 SSH/控制台中文乱码（外部程序输出也更一致）
try { [Console]::OutputEncoding = [System.Text.Encoding]::UTF8 } catch {}
try { $OutputEncoding = [System.Text.Encoding]::UTF8 } catch {}

function Invoke-External([string]$Title, [scriptblock]$Block) {
    Write-Step $Title
    & $Block
    if ($LASTEXITCODE -ne 0) {
        throw "Command failed (exit=$LASTEXITCODE): $Title"
    }
}

function Pip-InstallWithFallback([string]$PythonExePath, [string[]]$Args) {
    $fallbacks = @()
    if (-not [string]::IsNullOrWhiteSpace($env:PIP_INDEX_URL)) { $fallbacks += $env:PIP_INDEX_URL }
    $fallbacks += @(
        "https://pypi.org/simple",
        "https://mirrors.aliyun.com/pypi/simple",
        "https://pypi.tuna.tsinghua.edu.cn/simple"
    )
    $fallbacks = $fallbacks | Select-Object -Unique

    foreach ($idx in $fallbacks) {
        Write-Host ("pip install via index: {0}" -f $idx) -ForegroundColor Yellow
        & $PythonExePath -m pip install @Args -i $idx --trusted-host pypi.org --trusted-host files.pythonhosted.org
        if ($LASTEXITCODE -eq 0) { return }
    }
    throw "pip install failed on all indexes. Check network/proxy and try setting PIP_INDEX_URL."
}

function Write-Step([string]$Message) {
    Write-Host ""
    Write-Host ("========== {0} ==========" -f $Message) -ForegroundColor Cyan
}

function Ensure-Dir([string]$Path) {
    if (-not (Test-Path $Path)) {
        New-Item -ItemType Directory -Path $Path | Out-Null
    }
}

function Add-ToPath([string]$Dir) {
    if ([string]::IsNullOrWhiteSpace($Dir)) { return }
    $env:Path = "$Dir;$env:Path"
}

function Resolve-Exe([string]$ExplicitExe, [string]$CommandName, [string]$HelpfulName) {
    if (-not [string]::IsNullOrWhiteSpace($ExplicitExe)) {
        if (-not (Test-Path $ExplicitExe)) {
            throw "$HelpfulName 未找到：$ExplicitExe"
        }
        Add-ToPath (Split-Path -Parent $ExplicitExe)
        return $ExplicitExe
    }
    $cmd = Get-Command $CommandName -ErrorAction SilentlyContinue
    if (-not $cmd) {
        return $null
    }
    return $cmd.Path
}

function Stop-ListeningPort([int]$Port) {
    $pids = @()
    try {
        $conns = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
        if ($conns) {
            $pids = $conns | Select-Object -ExpandProperty OwningProcess -Unique
        }
    } catch {
        # fallback: netstat（某些精简系统可能没有 Get-NetTCPConnection）
        try {
            $lines = (netstat -ano -p tcp) | Select-String -Pattern "LISTENING"
            foreach ($m in $lines) {
                $line = ($m.Line -replace "\s+", " ").Trim()
                # TCP 0.0.0.0:5000 0.0.0.0:0 LISTENING 1234
                if ($line -match "TCP\s+(\S+):(\d+)\s+\S+:\S+\s+LISTENING\s+(\d+)") {
                    $p = [int]$Matches[2]
                    $pid = [int]$Matches[3]
                    if ($p -eq $Port -and $pid -gt 0) { $pids += $pid }
                }
            }
            $pids = $pids | Select-Object -Unique
        } catch {
            $pids = @()
        }
    }

    foreach ($pid in ($pids | Select-Object -Unique)) {
        try {
            Write-Host ("停止端口 {0} 的进程 PID={1}" -f $Port, $pid) -ForegroundColor Yellow
            Stop-Process -Id $pid -Force -ErrorAction Stop
        } catch {
            Write-Host ("警告：停止 PID={0} 失败：{1}" -f $pid, $_.Exception.Message) -ForegroundColor Yellow
        }
    }
}

function Wait-ListeningPort([int]$Port, [int]$TimeoutSeconds = 20) {
    $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
    while ((Get-Date) -lt $deadline) {
        try {
            $ok = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
            if ($ok) { return $true }
        } catch {
            # 如果没有 Get-NetTCPConnection，就不做严格检查
            return $true
        }
        Start-Sleep -Seconds 1
    }
    return $false
}

Write-Step "Prepare directories"
if ([string]::IsNullOrWhiteSpace($BlogDir)) { $BlogDir = $PSScriptRoot }
if (-not (Test-Path $BlogDir)) { throw "BLOG_DIR 不存在：$BlogDir" }
Set-Location $BlogDir

$logsDir = Join-Path $BlogDir "logs"
Ensure-Dir $logsDir

Write-Step "Stop existing processes (backend/frontend/nginx)"
$candidate = "C:\nginx\nginx.exe"
if ([string]::IsNullOrWhiteSpace($NginxExe) -and (Test-Path $candidate)) {
    $NginxExe = $candidate
}
if (-not [string]::IsNullOrWhiteSpace($NginxExe) -and (Test-Path $NginxExe)) {
    try { & $NginxExe -s stop | Out-Null } catch { }
}
Start-Sleep -Seconds 1
Stop-ListeningPort 443
Stop-ListeningPort 80
Stop-ListeningPort $BackendPort
Stop-ListeningPort $HexoPort

$LASTEXITCODE = 0
Write-Step "Build frontend static files (Hexo public/)"
$node = Resolve-Exe $NodeExe "node" "node.exe"
if (-not $node) { throw "未找到 node。请把 node 加入 PATH，或设置环境变量 NODE_EXE 指向 node.exe" }

$npm = Resolve-Exe "" "npm" "npm"
if (-not $npm) { throw "未找到 npm（通常随 Node 一起安装）" }

if (Test-Path (Join-Path $BlogDir "package-lock.json")) {
    Invoke-External "npm ci" { npm ci --no-audit --no-fund }
} else {
    Invoke-External "npm install" { npm install }
}

Invoke-External "hexo clean" { npx hexo clean }
Invoke-External "hexo generate" { npx hexo generate }

Write-Step "Install backend dependencies (backend\\.venv)"
$python = Resolve-Exe $PythonExe "python" "python.exe"
if (-not $python) { throw "未找到 python。请把 python 加入 PATH，或设置环境变量 PYTHON_EXE 指向 python.exe" }

$venvDir = Join-Path $BlogDir "backend\\.venv"
$venvPy = Join-Path $venvDir "Scripts\\python.exe"
if (-not (Test-Path $venvPy)) {
    & $python -m venv $venvDir
}
Invoke-External "pip upgrade" { & $venvPy -m pip install -U pip --disable-pip-version-check }

$req = (Join-Path $BlogDir "backend\\requirements.txt")
Pip-InstallWithFallback $venvPy @("--disable-pip-version-check","-r",$req)

# 兜底：确保 waitress 在 Windows 一定存在（避免上一步失败导致后端起不来）
Pip-InstallWithFallback $venvPy @("--disable-pip-version-check","waitress")

Write-Step "Start backend (waitress, 127.0.0.1:$BackendPort)"
$backendOut = Join-Path $logsDir "backend.out.log"
$backendErr = Join-Path $logsDir "backend.err.log"
Start-Process `
    -FilePath $venvPy `
    -WorkingDirectory (Join-Path $BlogDir "backend") `
    -ArgumentList @("-m", "waitress", "--host=127.0.0.1", "--port=$BackendPort", "app:app") `
    -WindowStyle Hidden `
    -RedirectStandardOutput $backendOut `
    -RedirectStandardError $backendErr | Out-Null

if (-not (Wait-ListeningPort -Port $BackendPort -TimeoutSeconds 25)) {
    throw "Backend did not listen on port $BackendPort. Check: $backendErr"
}

Write-Step "Start frontend (optional: hexo server)"
if ($StartHexoServer -and ($StartHexoServer.Trim().ToLower() -in @("1", "true", "yes", "y", "on"))) {
    $frontOut = Join-Path $logsDir "hexo.out.log"
    $frontErr = Join-Path $logsDir "hexo.err.log"
    Start-Process `
        -FilePath "cmd.exe" `
        -WorkingDirectory $BlogDir `
        -ArgumentList @("/c", "npx hexo server -i 127.0.0.1 -p $HexoPort") `
        -WindowStyle Hidden `
        -RedirectStandardOutput $frontOut `
        -RedirectStandardError $frontErr | Out-Null
}

Write-Step "Start reverse proxy (nginx)"
if ([string]::IsNullOrWhiteSpace($NginxExe) -or -not (Test-Path $NginxExe)) {
    throw "未找到 nginx.exe。请安装 Nginx，或设置环境变量 NGINX_EXE/NGINX_PATH 指向 nginx.exe"
}
if ([string]::IsNullOrWhiteSpace($NginxConf)) { $NginxConf = Join-Path $BlogDir "nginx.conf" }
if (-not (Test-Path $NginxConf)) { throw "nginx.conf 未找到：$NginxConf" }

$prefix = ($BlogDir -replace "\\", "/")
$conf = ($NginxConf -replace "\\", "/")

& $NginxExe -t -p $prefix -c $conf
& $NginxExe -p $prefix -c $conf

Write-Step "Done"
Write-Host ("后端: http://127.0.0.1:{0}/api/  |  Nginx: 80/443  |  public/: {1}" -f $BackendPort, (Join-Path $BlogDir "public")) -ForegroundColor Green
