@echo off
chcp 65001 > nul
echo ================================
echo PatentWriter 前端启动脚本
echo ================================
echo.

cd /d "%~dp0frontend"

if not exist "node_modules\" (
    echo [1/2] 安装前端依赖...
    call npm install
)

echo [2/2] 启动前端服务 (端口 3000)...
call npm run dev
