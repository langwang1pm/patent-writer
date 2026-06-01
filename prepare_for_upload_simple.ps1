# 准备上传包 - 简化版
# 使用方法：在PowerShell中执行 .\prepare_for_upload_simple.ps1

$ErrorActionPreference = "Stop"

Write-Output "=== 开始准备上传包（简化版）==="

# 创建临时目录
$tempDir = "D:\PycharmProject\patent-writer-upload"
if (Test-Path $tempDir) {
    Remove-Item -Recurse -Force $tempDir
}
New-Item -ItemType Directory -Path $tempDir | Out-Null

Write-Output "1. 创建目录结构..."
New-Item -ItemType Directory -Path "$tempDir\backend" | Out-Null
New-Item -ItemType Directory -Path "$tempDir\frontend" | Out-Null

Write-Output "2. 复制后端文件（排除venv和__pycache__）..."
# 复制后端app目录
if (Test-Path "D:\PycharmProject\patent-writer\backend\app") {
    Copy-Item -Recurse -Path "D:\PycharmProject\patent-writer\backend\app" -Destination "$tempDir\backend\" -Force
}
# 复制后端其他文件
$backendFiles = @("requirements.txt", "Dockerfile", ".env", "main.py", "alembic.ini")
foreach ($file in $backendFiles) {
    if (Test-Path "D:\PycharmProject\patent-writer\backend\$file") {
        Copy-Item -Path "D:\PycharmProject\patent-writer\backend\$file" -Destination "$tempDir\backend\" -Force
        Write-Output "  已复制: backend\$file"
    }
}

Write-Output "3. 复制前端文件（排除node_modules和dist）..."
# 复制前端src目录
if (Test-Path "D:\PycharmProject\patent-writer\frontend\src") {
    Copy-Item -Recurse -Path "D:\PycharmProject\patent-writer\frontend\src" -Destination "$tempDir\frontend\" -Force
}
# 复制前端其他文件
$frontendFiles = @("package.json", "package-lock.json", "vite.config.ts", "tsconfig.json", "index.html", "Dockerfile")
foreach ($file in $frontendFiles) {
    if (Test-Path "D:\PycharmProject\patent-writer\frontend\$file") {
        Copy-Item -Path "D:\PycharmProject\patent-writer\frontend\$file" -Destination "$tempDir\frontend\" -Force
        Write-Output "  已复制: frontend\$file"
    }
}

Write-Output "4. 复制根目录文件..."
$rootFiles = @("docker-compose.yml", ".env", ".dockerignore")
foreach ($file in $rootFiles) {
    if (Test-Path "D:\PycharmProject\patent-writer\$file") {
        Copy-Item -Path "D:\PycharmProject\patent-writer\$file" -Destination $tempDir -Force
        Write-Output "  已复制: $file"
    }
}

Write-Output "5. 复制部署脚本..."
$scripts = @("quick_deploy.sh", "deploy_to_arm_server.sh")
foreach ($script in $scripts) {
    if (Test-Path "D:\PycharmProject\patent-writer\$script") {
        Copy-Item -Path "D:\PycharmProject\patent-writer\$script" -Destination $tempDir -Force
        Write-Output "  已复制脚本: $script"
    }
}

# 计算大小
Write-Output "`n6. 计算上传包大小..."
$totalSize = (Get-ChildItem -Path $tempDir -Recurse -File -ErrorAction SilentlyContinue | Measure-Object -Property Length -Sum).Sum
if ($totalSize -eq $null) { $totalSize = 0 }
$totalSizeMB = [math]::Round($totalSize / 1MB, 2)
$fileCount = (Get-ChildItem -Path $tempDir -Recurse -File -ErrorAction SilentlyContinue | Measure-Object).Count

Write-Output "`n✅ 上传包已准备好："
Write-Output "  位置: $tempDir"
Write-Output "  大小: $totalSizeMB MB"
Write-Output "  文件数: $fileCount"

Write-Output "`n=== 下一步：上传到服务器 ==="
Write-Output "服务器IP: 192.168.2.121"
Write-Output "用户名: pgx"
Write-Output "密码: 123456"
Write-Output "`n方法1: 使用WinSCP（推荐）"
Write-Output "  1. 打开WinSCP"
Write-Output "  2. 连接到 192.168.2.121"
Write-Output "  3. 上传整个文件夹: $tempDir"
Write-Output "  4. 到远程目录: /home/pgx/patent-writer/"

Write-Output "`n方法2: 使用SCP命令"
Write-Output "  打开PowerShell，执行："
Write-Output "  scp -r $tempDir\* pgx@192.168.2.121:/home/pgx/patent-writer/"

Write-Output "`n=== 完成 ==="
