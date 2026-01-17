# Windows 服务器端部署脚本 (PowerShell)
# 这个脚本需要在你的 Windows 服务器上运行

$ErrorActionPreference = "Stop"  # 遇到错误时退出

Write-Host "========== 开始部署 ==========" -ForegroundColor Green
Write-Host "时间: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" -ForegroundColor Cyan

# 进入博客目录（请根据实际情况修改路径）
$BLOG_DIR = $env:BLOG_DIR
if (-not $BLOG_DIR) {
    $BLOG_DIR = "C:\path\to\your\blog"  # 默认路径，请修改
}

if (-not (Test-Path $BLOG_DIR)) {
    Write-Host "错误: 博客目录不存在: $BLOG_DIR" -ForegroundColor Red
    exit 1
}

Set-Location $BLOG_DIR
Write-Host "当前目录: $(Get-Location)" -ForegroundColor Cyan

# 拉取最新代码
Write-Host "-------- 拉取最新代码 --------" -ForegroundColor Yellow
git pull origin main

# 安装依赖（如果需要）
if (Test-Path "package.json") {
    Write-Host "-------- 安装 npm 依赖 --------" -ForegroundColor Yellow
    npm install
}

# 生成 Hexo 静态文件
Write-Host "-------- 生成静态文件 --------" -ForegroundColor Yellow
npx hexo clean
npx hexo generate

# 部署到 web 服务器目录（请根据实际情况修改）
# 方式1: 复制到 IIS/wwwroot 目录
# Write-Host "-------- 复制文件到 web 目录 --------" -ForegroundColor Yellow
# $WEB_DIR = $env:WEB_DIR
# if (-not $WEB_DIR) {
#     $WEB_DIR = "C:\inetpub\wwwroot\blog"
# }
# if (Test-Path $WEB_DIR) {
#     Remove-Item "$WEB_DIR\*" -Recurse -Force
# }
# Copy-Item -Path "public\*" -Destination $WEB_DIR -Recurse -Force

# 方式2: 如果使用 nginx for Windows
# $NGINX_DIR = "C:\nginx\html\blog"
# if (Test-Path $NGINX_DIR) {
#     Remove-Item "$NGINX_DIR\*" -Recurse -Force
#     Copy-Item -Path "public\*" -Destination $NGINX_DIR -Recurse -Force
# }

# 方式3: 如果使用独立部署脚本
# $DEPLOY_SCRIPT = $env:DEPLOY_SCRIPT
# if (-not $DEPLOY_SCRIPT) {
#     $DEPLOY_SCRIPT = "C:\path\to\deploy-script.bat"
# }
# if (Test-Path $DEPLOY_SCRIPT) {
#     Write-Host "-------- 执行部署脚本 --------" -ForegroundColor Yellow
#     & $DEPLOY_SCRIPT
# }

# 重启相关服务（如果需要）
# Restart-Service -Name "W3SVC"  # IIS
# 或
# & "C:\nginx\nginx.exe" -s reload  # Nginx

Write-Host "========== 部署完成！==========" -ForegroundColor Green
Write-Host "完成时间: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" -ForegroundColor Cyan