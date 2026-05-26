# 智撰 PatentWriter

通过对话方式让 AI 辅助编写专利文档，实时引用 Dify 知识库内容，标注来源，保证文档的专业性和可溯源性。

## 项目结构

```
patent-writer/
├── backend/          # 后端 API (FastAPI)
│   ├── app/
│   │   ├── api/     # API 路由
│   │   ├── models/   # 数据模型
│   │   ├── schemas/  # Pydantic 模型
│   │   ├── services/ # 业务逻辑
│   │   ├── clients/  # 外部服务客户端
│   │   └── core/     # 核心工具
│   ├── venv/        # Python 虚拟环境
│   └── requirements.txt
│
├── frontend/         # 前端应用 (React + TypeScript)
│   ├── src/
│   │   ├── components/  # UI 组件
│   │   ├── stores/      # Zustand 状态管理
│   │   ├── services/    # API 服务
│   │   ├── hooks/       # 自定义 Hooks
│   │   ├── types/       # TypeScript 类型
│   │   └── utils/       # 工具函数
│   └── package.json
│
├── .env.example      # 环境变量示例
├── .gitignore
├── docker-compose.yml
├── check_config.py   # 配置检查工具
└── README.md
```

## 快速开始

### 1. 后端

```powershell
cd backend

# 创建虚拟环境
python -m venv venv
.\venv\Scripts\activate

# 安装依赖
pip install -r requirements.txt

# 复制配置
copy .env.example .env
# 编辑 .env 配置数据库和 Dify

# 运行服务
uvicorn app.main:app --reload --port 8000
```

### 2. 前端

```powershell
cd frontend

npm install
npm run dev
```

访问 http://localhost:3000

## 技术栈

| 层级 | 技术选型 |
|------|----------|
| 前端 | React 18 + TypeScript + Tailwind CSS + TipTap + Zustand |
| 后端 | FastAPI + SQLAlchemy 2.0 (async) + PostgreSQL |
| 知识库 | Dify |

## 开发说明

### 前端代理配置

Vite 已配置 `/api` 代理到 `http://localhost:8000`，开发时无需额外配置。

### 数据库

使用腾讯云 PostgreSQL：
- Host: sh-postgres-h3849b66.sql.tencentcdb.com
- Port: 21656
- Database: icoastline
- Schema: patentwriter

### 配置检查

```powershell
python check_config.py
```

## 文档

- [PRD](./PRD_智撰PatentWriter_v0.2.md)
- [技术架构](./PatentWriter_技术架构_v1.1.md)