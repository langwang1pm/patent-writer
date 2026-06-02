#!/bin/bash
# ============================================================
# Patent Writer 快速部署脚本（支持 x86 + ARM）
# 使用: ./quick_deploy.sh
# ============================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log_info()  { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn()  { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

echo ""
echo "============================================"
echo "  Patent Writer 快速部署"
echo "  架构: $(uname -m)"
echo "============================================"
echo ""

# ---- 检查工具 ----
log_info "步骤1: 检查依赖工具..."

check_cmd() {
    if ! command -v "$1" &> /dev/null; then
        log_error "$2"
        exit 1
    fi
    log_info "$3"
}

# Docker 优先用插件版 docker compose，否则回退 docker-compose
if command -v docker &> /dev/null; then
    if docker compose version &> /dev/null; then
        COMPOSE_CMD="docker compose"
        log_info "Docker Compose (v2 plugin)"
    elif command -v docker-compose &> /dev/null; then
        COMPOSE_CMD="docker-compose"
        log_info "Docker Compose (standalone)"
    else
        log_error "Docker 已安装但没有 docker compose 命令"
        exit 1
    fi
else
    log_error "Docker 未安装，请先安装 Docker"
    exit 1
fi

check_cmd git "git 未安装" "Git 已安装"
log_info "所有工具检查通过"

# ---- 检查环境变量文件 ----
log_info "步骤2: 检查配置文件..."

if [ ! -f ".env" ]; then
    log_error ".env 文件不存在，请复制 .env.example 并填写配置"
    exit 1
fi
log_info ".env 文件已就绪"

# ---- 前端依赖检查 ----
log_info "步骤3: 检查前端依赖..."

cd frontend

if [ ! -f "package.json" ]; then
    log_error "frontend/package.json 不存在"
    exit 1
fi

log_info "package.json 已就绪（Dockerfile 中 npm install 自动处理依赖）"

cd ..

# ---- 后端依赖检查 ----
log_info "步骤4: 检查后端依赖..."

if [ ! -f "backend/requirements.txt" ]; then
    log_error "backend/requirements.txt 不存在"
    exit 1
fi
log_info "requirements.txt 已就绪"

# ---- 清理旧容器 ----
log_info "步骤5: 清理旧容器和镜像..."

$COMPOSE_CMD down --remove-orphans 2>/dev/null || true

# 清理旧构建缓存（可选，取消注释以强制完整重建）
# docker builder prune -f

# ---- 拉取基础镜像（提前预热，跨架构友好）----
log_info "步骤6: 预热基础镜像..."

docker pull python:3.13-slim || log_warn "预拉取失败，继续构建..."
docker pull node:22-alpine || log_warn "预拉取失败，继续构建..."
docker pull postgres:16-alpine || log_warn "预拉取失败，继续构建..."

# ---- 构建 + 启动 ----
log_info "步骤7: 构建镜像（ARM/x86 自适应）..."

$COMPOSE_CMD build --no-cache

log_info "步骤8: 启动服务..."

$COMPOSE_CMD up -d

# ---- 健康检查 ----
log_info "步骤9: 等待服务就绪（最多 60s）..."

BACKEND_OK=false
FRONTEND_OK=false

for i in $(seq 1 12); do
    sleep 5

    # 检查后端健康
    if [ "$BACKEND_OK" = false ]; then
        if curl -sf http://localhost:8000/health > /dev/null 2>&1; then
            BACKEND_OK=true
            log_info "后端服务已就绪 ✓"
        fi
    fi

    # 检查前端健康
    if [ "$FRONTEND_OK" = false ]; then
        if curl -sf http://localhost:3000 > /dev/null 2>&1; then
            FRONTEND_OK=true
            log_info "前端服务已就绪 ✓"
        fi
    fi

    if [ "$BACKEND_OK" = true ] && [ "$FRONTEND_OK" = true ]; then
        break
    fi

    echo -n "."
done

echo ""

# ---- 最终状态 ----
echo ""
echo "============================================"
echo "  服务状态"
echo "============================================"
$COMPOSE_CMD ps

echo ""
if [ "$BACKEND_OK" = true ] && [ "$FRONTEND_OK" = true ]; then
    log_info "部署成功！"
else
    log_warn "部分服务可能未就绪，请检查日志:"
    echo "  $COMPOSE_CMD logs -f"
fi

echo ""
echo "访问地址:"
echo "  前端: http://localhost:3000"
echo "  后端API: http://localhost:8000"
echo "  API文档: http://localhost:8000/docs"
echo ""
echo "常用命令:"
echo "  查看日志: $COMPOSE_CMD logs -f"
echo "  重启服务: $COMPOSE_CMD restart"
echo "  停止服务: $COMPOSE_CMD down"
echo ""