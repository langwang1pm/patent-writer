@echo off
chcp 65001 > nul
echo ================================
echo PatentWriter 后端启动脚本
echo ================================
echo.

cd /d "%~dp0backend"

if not exist "venv\" (
    echo [1/3] 创建虚拟环境...
    python -m venv venv
)

echo [2/3] 安装依赖...
call venv\Scripts\activate
pip install -e .

if not exist ".env" (
    echo [3/3] 创建 .env 文件...
    copy .env.example .env
    echo 请编辑 backend\.env 配置数据库密码
)

echo.
echo 启动后端服务 (端口 8000)...
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
