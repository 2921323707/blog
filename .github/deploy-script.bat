@echo off
REM Windows 服务器端部署脚本 (批处理)
REM 这个脚本需要在你的 Windows 服务器上运行

chcp 65001 >nul
setlocal enabledelayedexpansion

echo ========== 开始部署 ==========
echo 时间: %date% %time%

REM 进入博客目录（请根据实际情况修改路径）
set "BLOG_DIR=%BLOG_DIR%"
if "%BLOG_DIR%"=="" set "BLOG_DIR=C:\path\to\your\blog"

if not exist "%BLOG_DIR%" (
    echo 错误: 博客目录不存在: %BLOG_DIR%
    exit /b 1
)

cd /d "%BLOG_DIR%"
echo 当前目录: %CD%

REM 拉取最新代码
echo -------- 拉取最新代码 --------
git pull origin main

REM 安装依赖（如果需要）
if exist "package.json" (
    echo -------- 安装 npm 依赖 --------
    call npm install
)

REM 生成 Hexo 静态文件
echo -------- 生成静态文件 --------
call npx hexo clean
call npx hexo generate

REM 部署到 web 服务器目录（请根据实际情况修改）
REM 方式1: 复制到 IIS/wwwroot 目录
REM echo -------- 复制文件到 web 目录 --------
REM set "WEB_DIR=%WEB_DIR%"
REM if "%WEB_DIR%"=="" set "WEB_DIR=C:\inetpub\wwwroot\blog"
REM if exist "%WEB_DIR%" (
REM     rmdir /s /q "%WEB_DIR%\*"
REM     xcopy /E /I /Y "public\*" "%WEB_DIR%\"
REM )

REM 方式2: 如果使用 nginx for Windows
REM set "NGINX_DIR=C:\nginx\html\blog"
REM if exist "%NGINX_DIR%" (
REM     rmdir /s /q "%NGINX_DIR%\*"
REM     xcopy /E /I /Y "public\*" "%NGINX_DIR%\"
REM )

REM 重启相关服务（如果需要）
REM net stop W3SVC
REM net start W3SVC

echo ========== 部署完成！==========
echo 完成时间: %date% %time%