# PatentWriter Frontend

智撰 PatentWriter 前端应用

## 技术栈

- **框架**: React 18 + TypeScript
- **构建**: Vite
- **样式**: Tailwind CSS
- **富文本编辑器**: TipTap (基于 ProseMirror)
- **状态管理**: Zustand
- **HTTP 客户端**: ky
- **路由**: React Router v6
- **图标**: Lucide React

## 项目结构

```
patent-writer-frontend/
├── src/
│   ├── components/
│   │   ├── ui/           # 基础 UI 组件
│   │   ├── layout/       # 布局组件
│   │   ├── chat/         # 对话相关组件
│   │   ├── editor/       # 文档编辑器组件
│   │   ├── citation/     # 引用相关组件
│   │   └── settings/     # 设置相关组件
│   ├── stores/           # Zustand 状态管理
│   ├── services/         # API 服务
│   ├── hooks/            # 自定义 Hooks
│   ├── types/            # TypeScript 类型定义
│   └── utils/            # 工具函数
├── package.json
├── vite.config.ts
├── tailwind.config.js
└── tsconfig.json
```

## 开发

### 前置条件

- Node.js >= 18
- pnpm / npm / yarn

### 安装依赖

```bash
npm install
# 或
pnpm install
```

### 开发模式

```bash
npm run dev
```

访问 http://localhost:3000

### 构建

```bash
npm run build
```

### 类型检查

```bash
npm run type-check
```

## 主要功能

- **三栏式布局**: 左侧对话列表、中间聊天/文档区、右侧引用来源
- **对话式文档编写**: 通过对话生成专利文档内容
- **引用标注**: 自动标注知识库来源
- **在线文档编辑**: TipTap 富文本编辑器
- **Word 导出**: 下载为 .docx 格式

## 组件说明

### 布局组件

- `AppLayout` - 主布局容器
- `TopNav` - 顶部导航栏
- `Sidebar` - 左侧对话列表
- `CitationPanel` - 右侧引用来源面板

### 聊天组件

- `ChatView` - 对话主视图
- `MessageBubble` - 消息气泡
- `DocumentCard` - 文档卡片
- `ChatInput` - 输入框

### 编辑器组件

- `DocumentView` - 文档阅读/编辑视图
- `DocumentEditor` - TipTap 编辑器
- `CitationMark` - 引用标注组件
