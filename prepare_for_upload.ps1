# 准备上传包 - 排除不需要的文件
# 使用方法：在PowerShell中执行 .\prepare_for_upload.ps1

$ErrorActionPreference = "Stop"

Write-Output "=== 开始准备上传包 ==="

# 定义要排除的文件/文件夹 - 直接使用字符串，不用数组
$backendExclude = @("venv", "__pycache__")
$frontendExclude = @("node_modules", "dist", ".vite")

# 创建临时目录
$tempDir = "D:\PycharmProject\patent-writer-upload"
if (Test-Path $tempDir) {
    Remove-Item -Recurse -Force $tempDir
}
New-Item -ItemType Directory -Path $tempDir | Out-Null

Write-Output "1. 复制项目文件（排除不需要的文件）..."

# 复制后端文件（排除venv和__pycache__）
$backendSource = "D:\PycharmProject\patent-writer\backend"
$backendTarget = "$tempDir\backend"

New-Item -ItemType Directory -Path $backendTarget | Out-Null

# 复制后端文件，排除venv和__pycache__
Get-ChildItem -Path $backendSource -Exclude "venv", "__pycache__" | Copy-Item -Recurse -Destination $backendTarget -Force

# 复制前端文件（排除node_modules和dist）
$frontendSource = "D:\PycharmProject\patent-writer\frontend"
$frontendTarget = "$tempDir\frontend"

New-Item -ItemType Directory -Path $frontendTarget | Out-Null

# 复制前端文件，排除node_modules和dist
Get-ChildItem -Path $frontendSource -Exclude "node_modules", "dist", ".vite" | Copy-Item -Recurse -Destination $frontendTarget -Force

# 复制根目录文件
Write-Output "2. 复制根目录文件..."
$rootFiles = @(
    "docker-compose.yml",
    ".env",
    "README.md",
    "DEPLOYMENT_GUIDE.md",
    "DEPLOYMENT_SUMMARY.md",
    "PROJECT_CHECKLIST.md",
    "SIMPLE_DEPLOY_GUIDE.md",
    ".dockerignore",
    ".gitignore"
)

foreach ($file in $rootFiles) {
    $sourcePath = "D:\PycharmProject\patent-writer\$file"
    if (Test-Path $sourcePath) {
        Copy-Item -Path $sourcePath -Destination $tempDir -Force
        Write-Output "  已复制: $file"
    }
}

# 复制脚本文件
$scripts = @(
    "quick_deploy.sh",
    "deploy_to_arm_server.sh",
    "upload_and_deploy.ps1"
)

foreach ($script in $scripts) {
    $sourcePath = "D:\PycharmProject\patent-writer\$script"
    if (Test-Path $sourcePath) {
        Copy-Item -Path $sourcePath -Destination $tempDir -Force
        Write-Output "  已复制脚本: $script"
    }
}

# 计算大小
Write-Output "`n3. 计算上传包大小..."
$totalSize = (Get-ChildItem -Path $tempDir -Recurse -File | Measure-Object -Property Length -Sum).Sum
$totalSizeMB = [math]::Round($totalSize / 1MB, 2)

Write-Output "✅ 上传包已准备好："
Write-Output "  位置: $tempDir"
Write-Output "  大小: $totalSizeMB MB"
Write-Output "  文件数: $((Get-ChildItem -Path $tempDir -Recurse -File).Count)"

Write-Output "`n=== 下一步 ==="
Write-Output "方法1: 使用WinSCP上传整个文件夹"
Write-Output "  打开WinSCP，连接到 192.168.2.121"
Write-Output "  上传目录: $tempDir"
Write-Output "  到远程: /home/pgx/patent-writer/"

Write-Output "`n方法2: 使用SCP命令上传"
Write-Output "  scp -r $tempDir\* pgx@192.168.2.121:/home/pgx/patent-writer/"

Write-Output "`n方法3: 打包成tar.gz后上传"
Write-Output "  运行: .\create_upload_package.ps1"
Write-Output "  然后上传生成的 .tar.gz 文件"

Write-Output "`n=== 完成 ==="
