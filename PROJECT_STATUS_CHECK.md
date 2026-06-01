# 智撰 PatentWriter — 项目实现状态检查报告

> **检查日期**：2026-05-28 09:30 GMT+8
> **检查目的**：标注已实现和未实现的功能，更新核心功能实现规划

---

## 一、项目当前状态总览

### ✅ 已完成部分

#### 1. **后端基础架构**（100% 完成）
- ✅ FastAPI 应用入口（`app/main.py`）
- ✅ 配置管理（`app/config.py`）
- ✅ 依赖注入（`app/dependencies.py`）
- ✅ 数据库引擎和模型基类（`app/db/engine.py`）
- ✅ CORS 和中间件配置
- ✅ 健康检查接口

#### 2. **数据库模型**（100% 完成）
- ✅ `Conversation` 模型（`app/models/conversation.py`）
- ✅ `Message` 模型
- ✅ `Document` 模型（`app/models/document.py`）
- ✅ `Citation` 模型（`app/models/citation.py`）
- ✅ `KnowledgeConfig` 模型（`app/models/knowledge_config.py`）
- ✅ `KnowledgeFile` 模型（`app/models/knowledge_file.py`）
- ✅ 所有模型关系正确建立
- ✅ 自动创建数据库表（开发环境）

#### 3. **Pydantic Schema**（100% 完成）
- ✅ `Conversation` 相关 Schema（`app/schemas/conversation.py`）
- ✅ `Document` 相关 Schema（`app/schemas/document.py`）
- ✅ `Citation` 相关 Schema（`app/schemas/citation.py`）
- ✅ `Knowledge` 相关 Schema（`app/schemas/knowledge.py`）

#### 4. **API 路由骨架**（90% 完成）
- ✅ 对话管理 API（`app/api/conversations.py`）
  - ✅ 创建对话
  - ✅ 对话列表（分页、搜索、统计）
  - ✅ 获取对话详情
  - ✅ 更新对话标题
  - ✅ 删除对话
  - ✅ 获取消息列表
  - ⚠️ **发送消息（仅有骨架，返回模拟数据）**
  - ⚠️ **SSE 流式接口（仅有骨架，返回模拟数据）**

- ✅ 文档管理 API（`app/api/documents.py`）
  - ✅ 获取文档详情
  - ✅ 更新文档内容
  - ✅ 删除文档
  - ✅ 导出为 Word（骨架）

- ✅ 引用管理 API（`app/api/citations.py`）
  - ✅ 获取文档引用列表
  - ✅ 获取引用详情

- ✅ 知识库配置 API（`app/api/knowledge.py`）
  - ✅ 创建配置
  - ✅ 配置列表
  - ✅ 获取配置详情
  - ✅ 更新配置
  - ✅ 删除配置
  - ✅ 测试连接

- ✅ 知识库文件管理 API（`app/api/knowledge_files.py`）
  - ✅ 上传文件
  - ✅ 获取文件列表
  - ✅ 删除文件

#### 5. **核心业务逻辑**（60% 完成）
- ✅ Dify 客户端实现（`app/clients/dify_client.py`）
  - ✅ `retrieve()` 方法 - 调用 Dify 知识库检索 API
  - ✅ `check_health()` 方法 - 健康检查
  - ✅ `get_dataset_info()` 方法 - 获取知识库信息
  - ✅ 数据结构：`RetrievedChunk`, `RetrieveResult`
  - ⚠️ **缺少缓存机制**
  - ⚠️ **缺少重试机制**

- ⚠️ **降级策略（`app/clients/fallback.py`）** - 仅有文件骨架，未实现
- ⚠️ **引用解析引擎（`app/core/citation_parser.py`）** - 已实现，但需要验证准确性
- ⚠️ **LLM 服务（`app/services/llm_svc.py`）** - 仅有骨架，返回模拟数据
- ✅ Prompt 模板（`app/core/prompt_templates.py`）- 已定义三种文档类型模板

#### 6. **前端基础架构**（100% 完成）
- ✅ React 18 + TypeScript + Vite 配置
- ✅ Tailwind CSS 配置
- ✅ 路由配置（`App.tsx`）
- ✅ 基础组件目录结构
- ✅ 状态管理 Store 目录结构
- ✅ API 服务目录结构

#### 7. **前端核心组件**（40% 完成）
- ✅ `AppLayout.tsx` - 布局容器（已实现但缺少右侧引用列表）
- ✅ `Sidebar.tsx` - 左侧对话列表
- ✅ `TopNav.tsx` - 顶部导航
- ✅ `ChatView.tsx` - 聊天界面（基本实现，缺少流式渲染）
- ✅ `DocumentCard.tsx` - 文档卡片
- ⚠️ **缺少右侧引用列表组件**
- ⚠️ **缺少文档编辑器组件**
- ⚠️ **缺少 TipTap 集成**

---

### ❌ 未完成部分

#### 1. **核心业务逻辑实现**（优先级 P0）
- ❌ **完整的 RAG 流程**
  - ❌ Dify 知识库检索集成（后端）
  - ❌ LLM 调用集成（后端）
  - ❌ 引用解析和持久化（后端）
  - ❌ 流式响应（后端 + 前端）

- ❌ **降级策略实现**
  - ❌ 主 Dify → 备用 Dify 切换逻辑
  - ❌ 本地知识库降级
  - ❌ 无知识库模式提示

#### 2. **Dify 知识库管理**（优先级 P0）
- ❌ **文件上传到 Dify**
  - ❌ 调用 Dify 文件上传 API
  - ❌ 文件解析和索引状态跟踪
  - ❌ 错误处理和重试

#### 3. **文档编辑器**（优先级 P0）
- ❌ **TipTap 编辑器集成**
  - ❌ 自定义引用标注 Mark
  - ❌ 自定义专利文档章节 Node
  - ❌ 引用标注点击跳转功能
  - ❌ 实时引用同步更新

#### 4. **Word 导出**（优先级 P0）
- ❌ **完整的 Word 导出**
  - ❌ HTML → Word 格式转换
  - ❌ 引用标注保留（超链接/脚注）
  - ❌ 引用来源列表作为附录

#### 5. **流式响应处理**（优先级 P0）
- ❌ **SSE 事件解析**
  - ❌ 消息开始事件
  - ❌ 引用事件
  - ❌ 内容增量事件
  - ❌ 引用标注事件
  - ❌ 文档生成完成事件
  - ❌ 完成事件

#### 6. **前端右侧引用列表**（优先级 P0）
- ❌ **引用面板实现**
  - ❌ 引用列表展示
  - ❌ 引用片段预览
  - ❌ 点击跳转到正文
  - ❌ 实时同步更新

#### 7. **Dify Agent 配置**（优先级 P0，明天重点）
- ❌ **知识库配置**
  - ❌ 创建知识库
  - ❌ 上传专利文档
  - ❌ 配置分块策略
  - ❌ 配置检索参数

- ❌ **对话式文档生成 Agent**
  - ❌ 创建对话型应用
  - ❌ 配置 Prompt 模板
  - ❌ 配置上下文变量
  - ❌ 测试对话效果

#### 8. **数据持久化和同步**（优先级 P0）
- ❌ **文档版本控制**
- ❌ **引用关系同步更新**
- ❌ **编辑后引用重新解析**

---

## 二、核心功能实现状态详细分析

### 🎯 核心流程：对话式文档生成 + 引用标注

#### 当前状态：骨架已搭建，核心逻辑未实现

```
用户输入需求
    ↓
[前端] ChatView.tsx - ✅ 已实现输入框和发送逻辑
    ↓
[前端] 调用 sendMessage() - ✅ 已实现，但仅发送模拟数据
    ↓
[后端] POST /api/v1/conversations/{id}/messages - ⚠️ 接口已存在，但返回模拟数据
    │
    ├─1→ [后端] DifyClient.retrieve() - ✅ 方法已实现，但未被调用
    │        │
    │        ├─ 成功 → 返回 reference_chunks[] - ✅ 数据结构已定义
    │        └─ 失败 → FallbackManager.handle() - ❌ 未实现
    │
    ├─2→ [后端] LLMService.generate() - ⚠️ 方法已实现，但返回模拟数据
    │        │
    │        ├─ 构建系统提示词 - ✅ Prompt 模板已定义
    │        ├─ 注入检索结果 - ✅ 数据结构支持
    │        ├─ 流式输出 - ❌ 未实现真正的 LLM 调用
    │        └─ 完成回调 - ❌ 未实现
    │
    ├─3→ [后端] CitationParser.parse() - ✅ 方法已实现，但未在实际流程中调用
    │        │
    │        └─ 解析引用标注，持久化 Citation[] - ❌ 未集成到流程
    │
    └─4→ [后端] 返回响应 - ⚠️ 返回模拟数据，未返回真实生成的文档和引用
           │
           ▼
[前端] 接收响应 - ✅ 状态管理已实现，但接收的是模拟数据
    │
    ├─ 显示 AI 消息 - ⚠️ 仅显示文本，未处理文档和引用
    ├─ 显示文档卡片 - ✅ 组件已实现，但数据是模拟的
    └─ 更新右侧引用列表 - ❌ 引用列表组件未实现
```

#### 关键缺失点：
1. ❌ **后端未调用真正的 Dify API 和 LLM API**
2. ❌ **后端未集成完整的 RAG 流程**
3. ❌ **前端缺少右侧引用列表组件**
4. ❌ **前端缺少流式渲染逻辑**
5. ❌ **缺少 Dify 上的 Agent 配置**

---

## 三、已实现 vs 未实现对比表

| 模块 | 子模块 | 已实现 | 未实现 | 完成度 |
|------|--------|--------|--------|--------|
| **后端架构** | FastAPI 应用 | ✅ | - | 100% |
| | 数据库模型 | ✅ | - | 100% |
| | API 路由 | ✅（骨架） | 真实业务逻辑 | 90% |
| | Pydantic Schema | ✅ | - | 100% |
| **Dify 集成** | 客户端方法 | ✅ | 实际调用 | 80% |
| | 降级策略 | - | ❌ | 0% |
| | 缓存机制 | - | ❌ | 0% |
| **LLM 调用** | 方法骨架 | ✅ | 真实调用 | 50% |
| | Prompt 模板 | ✅ | - | 100% |
| | 流式输出 | - | ❌ | 0% |
| **引用解析** | 解析逻辑 | ✅ | 集成验证 | 70% |
| | 编辑后重解析 | ⚠️ | 优化 | 60% |
| **Word 导出** | 接口骨架 | ✅ | 完整实现 | 30% |
| **前端布局** | 三栏布局 | ⚠️（缺右侧） | 完整三栏 | 70% |
| | 左侧对话列表 | ✅ | - | 100% |
| | 右侧引用列表 | - | ❌ | 0% |
| **前端组件** | 聊天界面 | ✅ | 流式渲染 | 80% |
| | 文档编辑器 | - | ❌ | 0% |
| | TipTap 集成 | - | ❌ | 0% |
| **状态管理** | Store 定义 | ✅ | - | 100% |
| | API 服务 | ✅ | 真实调用 | 80% |
| **Dify Agent** | 知识库配置 | - | ❌ | 0% |
| | 对话 Agent | - | ❌ | 0% |

---

## 四、更新后的核心功能实现规划（去掉联网搜索）

### 🎯 任务组 1：Dify 知识库集成（P0，预计 7-9 小时）

#### 任务 1.1：完善 Dify 客户端（3-4 小时）
- ✅ 已实现：`retrieve()`, `check_health()`, `get_dataset_info()`
- ❌ **待实现**：
  1. 添加缓存机制（相同 query + knowledge_id）
  2. 添加重试机制（超时重试 1 次）
  3. 完善错误处理和日志

#### 任务 1.2：实现降级策略（2-3 小时）
- ❌ **待实现**：
  1. 实现 `FallbackManager` 类
  2. 主 Dify → 备用 Dify 切换逻辑
  3. 本地知识库降级（可选，MVP 可暂不实现）
  4. 无知识库模式提示

#### 任务 1.3：完善知识库文件管理（2-3 小时）
- ⚠️ 已有骨架
- ❌ **待实现**：
  1. 调用 Dify 文件上传 API
  2. 跟踪文件解析和索引状态
  3. 错误处理和重试

---

### 🎯 任务组 2：对话式文档生成（P0，预计 12-16 小时）

#### 任务 2.1：实现完整的消息发送流程（6-8 小时）
- ⚠️ 接口已存在，但返回模拟数据
- ❌ **待实现**：
  1. 在 `POST /conversations/{id}/messages` 中集成完整的 RAG 流程
  2. 调用 `DifyClient.retrieve()` 获取知识库片段
  3. 调用 `LLMService.generate()` 生成文档内容
  4. 调用 `CitationParser.parse()` 解析引用标注
  5. 持久化 Document 和 Citation 记录
  6. 返回真实数据（包含文档和引用列表）

#### 任务 2.2：实现流式响应（4-6 小时）
- ⚠️ 接口已存在，但返回模拟数据
- ❌ **待实现**：
  1. 在 `GET /conversations/{id}/stream` 中实现真正的流式生成
  2. SSE 事件格式标准化
  3. 前端 SSE 接收和渲染逻辑

#### 任务 2.3：实现 LLM 调用（2-3 小时）
- ⚠️ 方法已存在，但返回模拟数据
- ❌ **待实现**：
  1. 通过 Dify `/chat-messages` API 调用 LLM
  2. 或直连外部 LLM API（OpenAI 兼容协议）
  3. 流式输出处理

---

### 🎯 任务组 3：文档管理与导出（P0，预计 6-8 小时）

#### 任务 3.1：实现完整的 Word 导出（4-5 小时）
- ⚠️ 接口已存在，但未完整实现
- ❌ **待实现**：
  1. 使用 python-docx 生成 .docx 文件
  2. HTML → Word 格式转换
  3. 引用标注保留（超链接或脚注）
  4. 附加引用来源列表作为附录

#### 任务 3.2：实现文档版本控制（2-3 小时）
- ❌ **待实现**：
  1. 记录文档编辑历史
  2. 版本回退功能
  3. 编辑后引用重新解析和同步

---

### 🎯 任务组 4：前端核心功能（P0，预计 18-24 小时）

#### 任务 4.1：实现右侧引用列表组件（4-5 小时）
- ❌ **待实现**：
  1. `CitationPanel.tsx` - 引用面板容器
  2. `CitationList.tsx` - 引用列表
  3. `CitationItem.tsx` - 单条引用
  4. 引用片段预览和展开
  5. 点击跳转到正文对应位置

#### 任务 4.2：实现三栏布局完善（2-3 小时）
- ⚠️ 已有左侧和中间
- ❌ **待实现**：
  1. 修改 `AppLayout.tsx` 添加右侧引用列表区域
  2. 响应式适配（≥1440px 完整三栏，<1440px 右侧收起）

#### 任务 4.3：实现流式消息渲染（4-6 小时）
- ⚠️ 已有基本消息显示
- ❌ **待实现**：
  1. `StreamingMessage.tsx` - 流式消息组件
  2. SSE 事件解析和处理
  3. 实时渲染内容增量
  4. 引用标注实时更新
  5. 文档卡片生成后显示

#### 任务 4.4：实现文档编辑器（6-8 小时）
- ❌ **待实现**：
  1. 集成 TipTap 编辑器
  2. `DocumentEditor.tsx` - 文档编辑视图
  3. `CitationMark.tsx` - 引用标注组件
  4. `TiptapExtensions.ts` - 自定义扩展
  5. 引用标注点击跳转
  6. 编辑后引用同步更新

#### 任务 4.5：实现 SSE 连接和状态管理（2-3 小时）
- ❌ **待实现**：
  1. `useSSE.ts` - SSE 流式接收 Hook
  2. SSE 断线重连机制
  3. 消息去重和顺序保证

---

### 🎯 任务组 5：Dify Agent 配置（P0，预计 6-9 小时）⭐ **明天重点**

#### 任务 5.1：配置 Dify 知识库（2-3 小时）
- ❌ **待配置**：
  1. 登录 Dify 控制台（内网地址）
  2. 创建知识库（Dataset）
  3. 上传专利文档（PDF、Word、TXT 等）
  4. 配置分块策略（建议：段落级或句子级）
  5. 配置 Embedding 模型（Dify 内置或外部模型）
  6. 配置检索参数：
     - Top-K：5
     - 相似度阈值：0.7
     - 重排序：开启
  7. 测试检索效果

#### 任务 5.2：配置对话式文档生成 Agent（3-4 小时）
- ❌ **待配置**：
  1. 创建对话型应用（Chat App）
  2. 配置 Prompt 模板（见下方示例）
  3. 配置上下文变量：
     - `user_message`：用户消息
     - `references`：知识库检索结果
     - `history`：对话历史
     - `existing_document`：已有文档内容（可选）
  4. 配置模型：
     - 使用 Dify 内置模型或外部模型（Claude/GPT/国产模型）
  5. 测试对话效果
  6. 记录 API 端点和 API Key

#### 任务 5.3：测试 Agent API（1-2 小时）
- ❌ **待测试**：
  1. 测试知识库检索 API：`POST /v1/datasets/{dataset_id}/retrieve`
  2. 测试对话 API：`POST /v1/chat-messages`
  3. 测试流式响应：`response_mode: streaming`
  4. 验证引用溯源数据结构

---

### 📋 Dify Prompt 模板示例

#### Agent 1：技术交底书生成

```
你是一位专业的专利工程师，擅长撰写高质量的技术交底书。

任务：根据用户需求，生成专利技术交底书。

要求：
1. 严格按照专利格式撰写，包括技术领域、背景技术、发明内容、具体实施方式等章节
2. 结合参考知识库内容，确保技术描述的准确性
3. 引用知识库内容时使用 [①][②][③] 格式标注来源
4. 发明的技术方案应当具体、可实施
5. 语言严谨、专业，避免模糊表述

参考知识库内容：
{references}

用户需求：
{user_message}

请生成技术交底书：
```

#### Agent 2：权利要求书生成

```
你是一位专业的专利工程师，擅长撰写权利要求书。

任务：根据技术交底书内容，撰写专利权利要求书。

要求：
1. 独立权利要求应当概括发明的核心技术方案
2. 从属权利要求应当对独立权利要求进行进一步限定
3. 引用知识库内容时使用 [①][②][③] 格式标注来源
4. 权利要求应当清楚、简洁
5. 应当得到说明书的支持

参考知识库内容：
{references}

技术交底书内容：
{user_message}

请生成权利要求书：
```

#### Agent 3：说明书生成

```
你是一位专业的专利工程师，擅长撰写专利说明书。

任务：根据权利要求书和技术交底书，撰写完整的专利说明书。

要求：
1. 详细描述发明的技术方案，使本领域技术人员能够实现
2. 结合参考知识库内容，确保描述的准确性
3. 引用知识库内容时使用 [①][②][③] 格式标注来源
4. 应当包含技术领域、背景技术、发明内容、附图说明、具体实施方式等章节

参考知识库内容：
{references}

用户需求：
{user_message}

请生成说明书：
```

---

## 五、明天（2026-05-28）重点工作调整

### 上午（9:00-12:00）：

#### 1. ✅ 在 Dify 上配置知识库（2-3 小时）
- 登录 Dify 控制台
- 创建知识库
- 上传专利文档  
- 配置分块策略和检索参数
- 测试检索效果

#### 2. ✅ 在 Dify 上配置对话式文档生成 Agent（3-4 小时）
- 创建对话型应用
- 配置 Prompt 模板
- 配置上下文变量
- 测试对话效果
- 记录 API 端点和 API Key

---

### 下午（14:00-18:00）：

#### 3. ✅ 实现后端完整的消息发送流程（任务 2.1，6-8 小时）
- 修改 `POST /conversations/{id}/messages` 接口
- 集成 `DifyClient.retrieve()`
- 集成 `LLMService.generate()`
- 集成 `CitationParser.parse()`
- 持久化 Document 和 Citation
- 测试完整流程

#### 4. ✅ 实现前端右侧引用列表组件（任务 4.1，开始）
- 创建 `CitationPanel.tsx`
- 创建 `CitationList.tsx`
- 创建 `CitationItem.tsx`

---

### 晚上（可选，如果进度快）：

#### 5. ✅ 实现流式响应（任务 2.2，开始）
- 修改 `GET /conversations/{id}/stream` 接口
- SSE 事件格式标准化
- 前端 SSE 接收逻辑（开始）

---

## 六、重要说明

### ❌ 已去掉的功能
- **联网搜索功能**：由于项目将单机部署，不会连接互联网，因此去掉所有联网搜索相关的规划和代码

### ✅ 核心保留功能
- **知识库检索**（Dify）
- **对话式文档生成**（Dify + LLM）
- **引用标注**（后端解析）
- **文档编辑器**（TipTap）
- **Word 导出**

### 🔧 技术栈确认
- **后端**：Python FastAPI + PostgreSQL
- **前端**：React 18 + TypeScript + Tailwind CSS + TipTap
- **知识库**：Dify（内网部署）
- **LLM**：通过 Dify 调用或直连

---

## 七、下一步行动清单

### ✅ 今天（2026-05-28）完成：
- [ ] 在 Dify 上配置知识库
- [ ] 在 Dify 上配置对话式文档生成 Agent
- [ ] 实现后端完整的消息发送流程
- [ ] 开始实现前端右侧引用列表组件

### ✅ 本周（2026-05-29 - 2026-05-30）完成：
- [ ] 实现流式响应
- [ ] 完善前端三栏布局和核心交互
- [ ] 实现文档编辑器（TipTap 集成）
- [ ] 实现 Word 导出
- [ ] 集成测试

---

**检查完成时间**：2026-05-28 09:30 GMT+8  
**下一步**：开始执行 Dify Agent 配置和后端核心流程实现

---

## 附录：项目文件结构（已实现部分）

### 后端已实现文件
```
backend/app/
├── main.py                          ✅
├── config.py                        ✅
├── dependencies.py                  ✅
├── api/
│   ├── conversations.py             ✅（骨架 + 模拟数据）
│   ├── documents.py                 ✅（骨架）
│   ├── citations.py                 ✅（骨架）
│   ├── knowledge.py                 ✅（骨架）
│   └── knowledge_files.py           ✅（骨架）
├── models/
│   ├── conversation.py              ✅
│   ├── document.py                  ✅
│   ├── citation.py                  ✅
│   ├── knowledge_config.py          ✅
│   └── knowledge_file.py            ✅
├── schemas/
│   ├── conversation.py              ✅
│   ├── document.py                  ✅
│   ├── citation.py                  ✅
│   └── knowledge.py                 ✅
├── clients/
│   ├── dify_client.py               ✅（方法完整，缺少缓存和重试）
│   └── fallback.py                  ❌（仅文件，未实现）
├── core/
│   ├── citation_parser.py           ✅（已实现，需验证）
│   └── prompt_templates.py          ✅
├── services/
│   ├── conversation_svc.py          ✅（基本实现）
│   ├── document_svc.py              ✅（基本实现）
│   ├── citation_svc.py              ✅（基本实现）
│   ├── llm_svc.py                   ⚠️（骨架 + 模拟数据）
│   └── export_svc.py                ❌（仅文件，未实现）
└── db/
    └── engine.py                    ✅
```

### 前端已实现文件
```
frontend/src/
├── App.tsx                          ✅
├── components/
│   ├── layout/
│   │   ├── AppLayout.tsx           ✅（缺右侧引用列表）
│   │   ├── Sidebar.tsx             ✅
│   │   └── TopNav.tsx               ✅
│   ├── chat/
│   │   ├── ChatView.tsx            ✅（基本实现，缺流式渲染）
│   │   └── DocumentCard.tsx        ✅
│   ├── editor/
│   │   └── DocumentView.tsx        ❌（未实现）
│   ├── citation/
│   │   └── CitationPanel.tsx       ❌（未实现）
│   └── knowledge/
│       └── KnowledgePage.tsx       ✅（基本实现）
├── stores/
│   ├── conversationStore.ts        ✅
│   ├── documentStore.ts            ✅
│   ├── citationStore.ts            ✅
│   └── knowledgeStore.ts            ✅
└── services/
    ├── conversationApi.ts          ✅
    ├── documentApi.ts              ✅
    ├── citationApi.ts              ✅
    └── knowledgeApi.ts             ✅
```

---

**报告完成时间**：2026-05-28 09:30 GMT+8