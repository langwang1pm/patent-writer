@echo off
chcp 65001 > nul
echo ================================
echo PatentWriter 后端启动脚本（测试环境）
echo ================================
echo.

cd /d "%~dp0"

REM 加载测试环境变量
if exist ".env.development" (
    echo [0/4] 加载测试环境配置...
    for /f "usebackq tokens=* delims=" %%a in (".env.development") do set "%%a"
)

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
echo 启动后端服务 (端口 %BACKEND_PORT%)...
uvicorn app.main:app --reload --host 0.0.0.0 --port %BACKEND_PORT%

REM 注意：如果使用 PowerShell，可以使用以下命令加载环境变量：
REM Get-Content .env.prod | ForEach-Object { $name, $value = $_ -split '=', 2; [System.Environment]::SetEnvironmentVariable($name, $value, 'Process') }
