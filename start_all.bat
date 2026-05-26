@echo off
chcp 65001 > nul
echo ================================
echo PatentWriter 全套启动
echo ================================
echo.

start "PatentWriter 后端" cmd /k "cd /d %~dp0backend && venv\Scripts\activate && uvicorn app.main:app --reload --host 0.0.0.0 --port 8000"
timeout /t 3 > nul
start "PatentWriter 前端" cmd /k "cd /d %~dp0frontend && npm run dev"

echo.
echo 后端: http://localhost:8000
echo 前端: http://localhost:3000
echo API 文档: http://localhost:8000/docs
echo.
pause
