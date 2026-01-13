@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

echo 正在初始化环境...

REM 创建Python虚拟环境
if not exist "venv" (
    echo 创建Python虚拟环境...
    python -m venv venv
)

REM 激活虚拟环境
call venv\Scripts\activate.bat

REM 配置pip镜像并安装依赖
echo 安装Python依赖...
pip config set global.index-url https://pypi.tuna.tsinghua.edu.cn/simple
pip install -r backend\requirements.txt

REM 安装npm依赖
echo 安装npm依赖...
call npm install

REM 清理并生成Hexo
echo 生成Hexo静态文件...
call npx hexo clean
call npx hexo generate

REM 启动后端服务（5000端口）
echo 启动后端服务（端口5000）...
start "Backend-5000" cmd /k "venv\Scripts\activate.bat && cd backend && python run.py"

REM 等待后端启动
timeout /t 2 /nobreak >nul

REM 启动前端服务（4000端口）
echo 启动前端服务（端口4000）...
start "Frontend-4000" cmd /k "npx hexo server -p 4000"

echo.
echo 服务已启动！
echo 前端: http://localhost:4000
echo 后端: http://localhost:5000
pause
