# PatentWriter Backend

智撰 PatentWriter 后端 API 服务

## 技术栈

- **框架**: Python FastAPI
- **数据库**: PostgreSQL (SQLAlchemy 2.0 async)
- **HTTP 客户端**: httpx (async)
- **Word 导出**: python-docx
- **日志**: structlog

## 项目结构

```
patent-writer-backend/
├── app/
│   ├── api/           # API 路由层
│   ├── models/        # 数据模型 (SQLAlchemy)
│   ├── schemas/       # Pydantic 请求/响应模型
│   ├── services/     # 业务逻辑层
│   ├── clients/       # 外部服务客户端
│   ├── core/         # 核心工具
│   └── db/           # 数据库
├── tests/            # 测试
├── pyproject.toml
└── .env.example
```

## 环境配置

1. 复制 `.env.example` 为 `.env`
2. 修改数据库连接等配置

```bash
cp .env.example .env
```

## 安装依赖

```bash
pip install -e ".[dev]"
```

## 运行

```bash
# 开发模式
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# 生产模式
uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 4
```

## API 文档

启动后访问 http://localhost:8000/docs 查看 Swagger 文档

## 数据库迁移

```bash
# 生成迁移
alembic revision --autogenerate -m "init"

# 执行迁移
alembic upgrade head
```

## API 端点

### 对话管理
- `POST /api/v1/conversations` - 创建对话
- `GET /api/v1/conversations` - 对话列表
- `GET /api/v1/conversations/{id}` - 对话详情
- `PUT /api/v1/conversations/{id}` - 更新对话
- `DELETE /api/v1/conversations/{id}` - 删除对话

### 消息与生成
- `GET /api/v1/conversations/{id}/messages` - 消息列表
- `POST /api/v1/conversations/{id}/messages` - 发送消息
- `GET /api/v1/conversations/{id}/stream` - SSE 流式生成

### 文档管理
- `GET /api/v1/documents/{id}` - 文档详情
- `PUT /api/v1/documents/{id}` - 更新文档
- `POST /api/v1/documents/{id}/export` - 导出 Word

### 引用管理
- `GET /api/v1/documents/{id}/citations` - 引用列表
- `GET /api/v1/citations/{id}` - 引用详情

### 知识库配置
- `GET /api/v1/knowledge/configs` - 配置列表
- `POST /api/v1/knowledge/configs` - 创建配置
- `PUT /api/v1/knowledge/configs/{id}` - 更新配置
- `DELETE /api/v1/knowledge/configs/{id}` - 删除配置
- `POST /api/v1/knowledge/configs/{id}/test` - 测试连接

### 测试github
