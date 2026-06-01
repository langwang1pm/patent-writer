#!/bin/bash
set -e

echo "=== Patent Writer 快速部署 ==="
echo ""

echo "步骤1: 检查Docker..."
if ! command -v docker &> /dev/null; then
    echo "❌ Docker未安装，请先安装Docker"
    exit 1
fi
echo "✅ Docker已安装"

echo ""
echo "步骤2: 检查Docker Compose..."
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose未安装，请先安装"
    exit 1
fi
echo "✅ Docker Compose已安装"

echo ""
echo "步骤3: 构建并启动服务..."
docker-compose down || true
docker-compose build --no-cache
docker-compose up -d

echo ""
echo "步骤4: 检查服务状态..."
docker-compose ps

echo ""
echo "✅ 部署完成！"
echo ""
echo "访问地址:"
echo "  前端: http://$(hostname -I | awk '{print $1}'):3000"
echo "  后端API: http://$(hostname -I | awk '{print $1}'):8000"
echo ""
echo "查看日志: docker-compose logs -f"
