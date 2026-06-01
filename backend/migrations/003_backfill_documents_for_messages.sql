-- ============================================================
-- 迁移脚本：为已有 AI 回复消息创建 Document 实体并关联
-- 日期：2026-05-31
-- 问题：AI 回复的附件（docx_url）在页面刷新后丢失，
--       因为 Message 没有关联 Document 实体，docx_url 仅存在前端内存。
-- 修复：为每个没有 document_id 的 assistant 消息创建对应的 Document 记录，
--       并回填 messages.document_id。
-- 注意：本 SQL 使用 uuid_generate_v4()，需要 uuid-ossp 扩展。
--       如果扩展不可用，请使用 Python 版脚本：
--       python migrations/run_003_backfill.py
-- ============================================================

-- 确保 uuid-ossp 扩展可用
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. 为每个没有 document_id 的 assistant 消息创建 Document
INSERT INTO patentwriter.documents (id, conversation_id, title, content_html, content_markdown, version, created_at, updated_at)
SELECT
    uuid_generate_v4(),
    m.conversation_id,
    COALESCE(
        LEFT(REPLACE(m.content, chr(10), ' '), 30),
        'AI 回复'
    ) AS title,
    m.content AS content_html,
    m.content AS content_markdown,
    1 AS version,
    m.created_at,
    m.created_at AS updated_at
FROM patentwriter.messages m
WHERE m.role = 'assistant'
  AND m.document_id IS NULL;

-- 2. 回填 messages.document_id（匹配 conversation_id + created_at）
UPDATE patentwriter.messages m
SET document_id = d.id
FROM patentwriter.documents d
WHERE m.role = 'assistant'
  AND m.document_id IS NULL
  AND d.conversation_id = m.conversation_id
  AND d.created_at = m.created_at;

-- ============================================================
-- 验证：
-- SELECT m.id, m.document_id, d.title
-- FROM patentwriter.messages m
-- LEFT JOIN patentwriter.documents d ON d.id = m.document_id
-- WHERE m.role = 'assistant'
-- ORDER BY m.created_at DESC
-- LIMIT 10;
-- ============================================================
