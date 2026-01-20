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

function Test-IsSshSession {
    # Windows OpenSSH/CI 环境下，SSH 会把当前会话启动的子进程绑进 job object，断开连接时可能一起被杀掉。
    # 因此在 SSH 会话里用“计划任务”启动后台服务，确保 workflow 结束后服务仍常驻。
    return (
        -not [string]::IsNullOrWhiteSpace($env:SSH_CONNECTION) -or
        -not [string]::IsNullOrWhiteSpace($env:SSH_CLIENT) -or
        -not [string]::IsNullOrWhiteSpace($env:SSH_TTY)
    )
}

function Ensure-ScheduledTask {
    param(
        [Parameter(Mandatory = $true)]
        [string]$TaskName,

        [Parameter(Mandatory = $true)]
        [string]$CommandLine
    )

    # /RU SYSTEM 不需要密码（前提：当前用户有管理员权限）
    & schtasks "/Create" "/TN" $TaskName "/TR" $CommandLine "/SC" "ONSTART" "/RL" "HIGHEST" "/RU" "SYSTEM" "/F" | Out-Null
    if ($LASTEXITCODE -ne 0) {
        throw "创建/更新计划任务失败：$TaskName"
    }
}

function Run-ScheduledTask {
    param([Parameter(Mandatory = $true)][string]$TaskName)
    & schtasks "/Run" "/TN" $TaskName | Out-Null
    if ($LASTEXITCODE -ne 0) {
        throw "启动计划任务失败：$TaskName"
    }
}

function End-ScheduledTaskIfExists {
    param([Parameter(Mandatory = $true)][string]$TaskName)
    try {
        & schtasks "/End" "/TN" $TaskName | Out-Null
    } catch {
        # ignore
    }
}

function Invoke-External([string]$Title, [scriptblock]$Block) {
    Write-Step $Title
    & $Block
    if ($LASTEXITCODE -ne 0) {
        throw "Command failed (exit=$LASTEXITCODE): $Title"
    }
}

function Pip-InstallWithFallback {
    param(
        [Parameter(Mandatory = $true)]
        [string]$PythonExePath,

        # 不要叫 Args（会和 PowerShell 自动变量 $Args 冲突，导致实参丢失）
        [Parameter(Mandatory = $true)]
        [string[]]$PipInstallArgs
    )
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
        & $PythonExePath -m pip install @PipInstallArgs -i $idx `
            --trusted-host pypi.org `
            --trusted-host files.pythonhosted.org `
            --trusted-host mirrors.aliyun.com `
            --trusted-host pypi.tuna.tsinghua.edu.cn
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
                    $procId = [int]$Matches[3]
                    if ($p -eq $Port -and $procId -gt 0) { $pids += $procId }
                }
            }
            $pids = $pids | Select-Object -Unique
        } catch {
            $pids = @()
        }
    }

    # 注意：不要用 $pid（会和 PowerShell 只读变量 $PID 冲突）
    foreach ($procId in ($pids | Select-Object -Unique)) {
        try {
            Write-Host ("停止端口 {0} 的进程 PID={1}" -f $Port, $procId) -ForegroundColor Yellow
            Stop-Process -Id $procId -Force -ErrorAction Stop
        } catch {
            Write-Host ("警告：停止 PID={0} 失败：{1}" -f $procId, $_.Exception.Message) -ForegroundColor Yellow
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
$isSsh = Test-IsSshSession
if ($isSsh) {
    # 先停掉上一次部署创建的计划任务实例（否则端口可能占用）
    End-ScheduledTaskIfExists -TaskName "blog-backend"
    End-ScheduledTaskIfExists -TaskName "blog-nginx"
    End-ScheduledTaskIfExists -TaskName "blog-hexo"
}

$candidatePaths = @(
    $NginxExe,
    $env:NGINX_EXE,
    $env:NGINX_PATH,
    "C:\nginx\nginx.exe",
    (Join-Path $env:USERPROFILE "nginx_config\nginx.exe"),
    "C:\Users\Administrator\nginx_config\nginx.exe"
) | Where-Object { -not [string]::IsNullOrWhiteSpace($_) -and (Test-Path $_) }

if ([string]::IsNullOrWhiteSpace($NginxExe) -and $candidatePaths.Count -gt 0) {
    $NginxExe = $candidatePaths[0]
}
if (-not [string]::IsNullOrWhiteSpace($NginxExe) -and (Test-Path $NginxExe)) {
    # -s stop 会读取配置；若不指定 -p/-c，会默认找 conf/nginx.conf（你当前目录下没有 conf/ 就会报错）
    if ([string]::IsNullOrWhiteSpace($NginxConf)) { $NginxConf = Join-Path $BlogDir "nginx.conf" }
    if (Test-Path $NginxConf) {
        $prefixStop = ($BlogDir -replace "\\", "/")
        $confStop = ($NginxConf -replace "\\", "/")
        try { & $NginxExe -p $prefixStop -c $confStop -s stop | Out-Null } catch { }
    } else {
        try { & $NginxExe -s stop | Out-Null } catch { }
    }
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
Pip-InstallWithFallback -PythonExePath $venvPy -PipInstallArgs @("--disable-pip-version-check", "-r", $req)

# 兜底：确保 waitress 在 Windows 一定存在（避免上一步失败导致后端起不来）
Pip-InstallWithFallback -PythonExePath $venvPy -PipInstallArgs @("--disable-pip-version-check", "waitress==2.1.2")

Write-Step "Start backend (waitress, 127.0.0.1:$BackendPort)"
$backendOut = Join-Path $logsDir "backend.out.log"
$backendErr = Join-Path $logsDir "backend.err.log"
$backendWd = (Join-Path $BlogDir "backend")
if ($isSsh) {
    # 计划任务常驻：避免 SSH 断开后子进程被一并结束
    # 注意：这里不做输出重定向（schtasks 的 /TR 里再做重定向在不同系统上容易踩 quoting 坑）
    $backendCmd = "cmd.exe /c `"cd /d `"$backendWd`" && `"$venvPy`" -m waitress --host=127.0.0.1 --port=$BackendPort app:app`""
    Ensure-ScheduledTask -TaskName "blog-backend" -CommandLine $backendCmd
    Run-ScheduledTask -TaskName "blog-backend"
    Write-Host "Scheduled task started: blog-backend (waitress)" -ForegroundColor Green
} else {
    Start-Process `
        -FilePath $venvPy `
        -WorkingDirectory $backendWd `
        -ArgumentList @("-m", "waitress", "--host=127.0.0.1", "--port=$BackendPort", "app:app") `
        -WindowStyle Hidden `
        -RedirectStandardOutput $backendOut `
        -RedirectStandardError $backendErr | Out-Null
}

if (-not (Wait-ListeningPort -Port $BackendPort -TimeoutSeconds 25)) {
    throw "Backend did not listen on port $BackendPort. Check: $backendErr"
}

Write-Step "Reindex RAG vector store (Chroma)"
# 说明：每次 push 部署后全量重建向量库（会调用 Embedding API，耗时取决于文章数量/网络）
# 可选：如需临时关闭，可在服务器环境变量里设置 RAG_REINDEX_ON_DEPLOY=0
$reindexOnDeploy = ($env:RAG_REINDEX_ON_DEPLOY)
if ([string]::IsNullOrWhiteSpace($reindexOnDeploy)) { $reindexOnDeploy = "1" }
if ($reindexOnDeploy.Trim().ToLower() -in @("0", "false", "no", "n", "off")) {
    Write-Host "Skip RAG reindex (RAG_REINDEX_ON_DEPLOY=0)" -ForegroundColor Yellow
} else {
    $reindexUrl = "http://127.0.0.1:$BackendPort/api/ai/mascot/reindex"
    try {
        # PS 5.1/7 都支持 TimeoutSec；给大一些，避免文章多时超时
        $resp = Invoke-RestMethod -Method Post -Uri $reindexUrl -ContentType "application/json" -Body "{}" -TimeoutSec 3600
        if ($null -eq $resp) { throw "Empty response" }
        if ($resp.errno -ne 0) { throw ("API errno={0}, errmsg={1}" -f $resp.errno, $resp.errmsg) }
        $posts = $resp.data.posts
        $chunks = $resp.data.chunks
        Write-Host ("RAG reindex OK. posts={0}, chunks={1}" -f $posts, $chunks) -ForegroundColor Green
    } catch {
        throw ("RAG reindex failed: {0}. Check backend logs: {1}" -f $_.Exception.Message, $backendErr)
    }
}

Write-Step "Start frontend (optional: hexo server)"
if ($StartHexoServer -and ($StartHexoServer.Trim().ToLower() -in @("1", "true", "yes", "y", "on"))) {
    $frontOut = Join-Path $logsDir "hexo.out.log"
    $frontErr = Join-Path $logsDir "hexo.err.log"
    if ($isSsh) {
        $hexoCmd = "cmd.exe /c `"cd /d `"$BlogDir`" && npx hexo server -i 127.0.0.1 -p $HexoPort`""
        Ensure-ScheduledTask -TaskName "blog-hexo" -CommandLine $hexoCmd
        Run-ScheduledTask -TaskName "blog-hexo"
        Write-Host "Scheduled task started: blog-hexo (hexo server)" -ForegroundColor Green
    } else {
        Start-Process `
            -FilePath "cmd.exe" `
            -WorkingDirectory $BlogDir `
            -ArgumentList @("/c", "npx hexo server -i 127.0.0.1 -p $HexoPort") `
            -WindowStyle Hidden `
            -RedirectStandardOutput $frontOut `
            -RedirectStandardError $frontErr | Out-Null
    }
}

Write-Step "Start reverse proxy (nginx)"
if ([string]::IsNullOrWhiteSpace($NginxExe) -or -not (Test-Path $NginxExe)) {
    throw "nginx.exe not found. Set NGINX_EXE/NGINX_PATH to the full path (e.g. C:\Users\Administrator\nginx_config\nginx.exe)."
}
if ([string]::IsNullOrWhiteSpace($NginxConf)) { $NginxConf = Join-Path $BlogDir "nginx.conf" }
if (-not (Test-Path $NginxConf)) { throw "nginx.conf 未找到：$NginxConf" }

$nginxTempDirs = @("client_body_temp", "proxy_temp", "fastcgi_temp", "scgi_temp", "uwsgi_temp")
# 你的 nginx.conf 使用 temp/* 路径，这里提前创建，避免 CreateDirectory() 报错
Ensure-Dir (Join-Path $BlogDir "temp")
foreach ($d in $nginxTempDirs) {
    Ensure-Dir (Join-Path $BlogDir ("temp\\" + $d))
}

$prefix = ($BlogDir -replace "\\", "/")
$conf = ($NginxConf -replace "\\", "/")

& $NginxExe -t -p $prefix -c $conf
if ($isSsh) {
    # 计划任务常驻：避免 SSH 断开后 nginx 被一并结束
    $nginxCmd = "`"$NginxExe`" -p `"$prefix`" -c `"$conf`""
    Ensure-ScheduledTask -TaskName "blog-nginx" -CommandLine $nginxCmd
    Run-ScheduledTask -TaskName "blog-nginx"
    Write-Host "Scheduled task started: blog-nginx (nginx)" -ForegroundColor Green
} else {
    # 本地/交互环境：后台启动，确保 deploy.ps1 能正常退出
    Start-Process `
        -FilePath $NginxExe `
        -ArgumentList @("-p", $prefix, "-c", $conf) `
        -WindowStyle Hidden | Out-Null
}

# 给 nginx 一点启动时间，并做轻量健康检查
Start-Sleep -Seconds 1
if (-not (Wait-ListeningPort -Port 80 -TimeoutSeconds 10)) {
    throw "Nginx did not listen on port 80. Check nginx logs: $(Join-Path $BlogDir 'logs\error.log')"
}
if (-not (Wait-ListeningPort -Port 443 -TimeoutSeconds 10)) {
    throw "Nginx did not listen on port 443. Check nginx logs: $(Join-Path $BlogDir 'logs\error.log')"
}

Write-Step "Done"
Write-Host ("后端: http://127.0.0.1:{0}/api/  |  Nginx: 80/443  |  public/: {1}" -f $BackendPort, (Join-Path $BlogDir "public")) -ForegroundColor Green
