$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

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

Write-Step "准备目录"
if ([string]::IsNullOrWhiteSpace($BlogDir)) { $BlogDir = $PSScriptRoot }
if (-not (Test-Path $BlogDir)) { throw "BLOG_DIR 不存在：$BlogDir" }
Set-Location $BlogDir

$logsDir = Join-Path $BlogDir "logs"
Ensure-Dir $logsDir

Write-Step "终止旧进程（后端/前端/反向代理）"
if ([string]::IsNullOrWhiteSpace($NginxExe)) {
    $candidate = "C:\nginx\nginx.exe"
    if (Test-Path $candidate) { $NginxExe = $candidate }
}
if (-not [string]::IsNullOrWhiteSpace($NginxExe) -and (Test-Path $NginxExe)) {
    try { & $NginxExe -s stop | Out-Null } catch { }
}
Start-Sleep -Seconds 1
Stop-ListeningPort 443
Stop-ListeningPort 80
Stop-ListeningPort $BackendPort
Stop-ListeningPort $HexoPort

Write-Step "安装 Node 依赖 + 生成前端静态文件（Hexo public/）"
$node = Resolve-Exe $NodeExe "node" "node.exe"
if (-not $node) { throw "未找到 node。请把 node 加入 PATH，或设置环境变量 NODE_EXE 指向 node.exe" }

$npm = Resolve-Exe "" "npm" "npm"
if (-not $npm) { throw "未找到 npm（通常随 Node 一起安装）" }

if (Test-Path (Join-Path $BlogDir "package-lock.json")) {
    & npm ci --no-audit --no-fund
} else {
    & npm install
}

& npx hexo clean
& npx hexo generate

Write-Step "安装 Python 依赖（backend\\.venv）"
$python = Resolve-Exe $PythonExe "python" "python.exe"
if (-not $python) { throw "未找到 python。请把 python 加入 PATH，或设置环境变量 PYTHON_EXE 指向 python.exe" }

$venvDir = Join-Path $BlogDir "backend\\.venv"
$venvPy = Join-Path $venvDir "Scripts\\python.exe"
if (-not (Test-Path $venvPy)) {
    & $python -m venv $venvDir
}
& $venvPy -m pip install -U pip --disable-pip-version-check
& $venvPy -m pip install -r (Join-Path $BlogDir "backend\\requirements.txt") --disable-pip-version-check

Write-Step "启动后端（Flask via waitress, 127.0.0.1:$BackendPort）"
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
    throw "后端未在端口 $BackendPort 正常监听。请检查 $backendErr"
}

Write-Step "启动前端（可选：Hexo server）"
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

Write-Step "启动反向代理（Nginx）"
if ([string]::IsNullOrWhiteSpace($NginxExe) -or -not (Test-Path $NginxExe)) {
    throw "未找到 nginx.exe。请安装 Nginx，或设置环境变量 NGINX_EXE/NGINX_PATH 指向 nginx.exe"
}
if ([string]::IsNullOrWhiteSpace($NginxConf)) { $NginxConf = Join-Path $BlogDir "nginx.conf" }
if (-not (Test-Path $NginxConf)) { throw "nginx.conf 未找到：$NginxConf" }

$prefix = ($BlogDir -replace "\\", "/")
$conf = ($NginxConf -replace "\\", "/")

& $NginxExe -t -p $prefix -c $conf
& $NginxExe -p $prefix -c $conf

Write-Step "完成"
Write-Host ("后端: http://127.0.0.1:{0}/api/  |  Nginx: 80/443  |  public/: {1}" -f $BackendPort, (Join-Path $BlogDir "public")) -ForegroundColor Green
