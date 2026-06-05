1. 优化：知识库列表页面查询，支持分页空间，默认每页10条数据
2. 优化：chat页面上，历史会话记录，默认加载10条，支持滚动加载，每次加载10条，有滚动条
3. 优化：chat页面上，历史会话记录，搜索功能搜索时，搜索的范围应该是全部的会话记录

4. 文档的正文内容，不是流式输出的
5. 没有实现引用列表


备忘：
后端（端口 8002）
cd D:\PycharmProject\patent-writer\backend
venv\Scripts\activate
uvicorn app.main:app --reload --host 0.0.0.0 --port 8002


前端（端口 3000）
cd D:\PycharmProject\patent-writer\frontend
npm run dev