-- ============================================================
-- 迁移脚本：修正已有数据的时区问题
-- 问题：now_cst() 之前返回的是 naive datetime（北京时间但无 tzinfo），
--       SQLAlchemy/asyncpg 将其当作 UTC 写入 PostgreSQL，
--       导致数据库中所有时间字段比实际北京时间少 8 小时。
-- 修复：将所有时间字段 +8 小时，并保留原错误的备份。
-- ============================================================

-- 1. 备份（可选，建议先在测试库验证）
-- CREATE TABLE patentwriter.conversations_backup AS SELECT * FROM patentwriter.conversations;
-- CREATE TABLE patentwriter.messages_backup        AS SELECT * FROM patentwriter.messages;
-- CREATE TABLE patentwriter.documents_backup      AS SELECT * FROM patentwriter.documents;
-- CREATE TABLE patentwriter.citations_backup      AS SELECT * FROM patentwriter.citations;
-- CREATE TABLE patentwriter.knowledge_configs_backup AS SELECT * FROM patentwriter.knowledge_configs;
-- CREATE TABLE patentwriter.knowledge_files_backup  AS SELECT * FROM patentwriter.knowledge_files;

-- 2. 修正 conversations
UPDATE patentwriter.conversations
SET
  created_at = created_at + INTERVAL '8 hours',
  updated_at = updated_at + INTERVAL '8 hours'
WHERE created_at IS NOT NULL;

-- 3. 修正 messages
UPDATE patentwriter.messages
SET created_at = created_at + INTERVAL '8 hours'
WHERE created_at IS NOT NULL;

-- 4. 修正 documents
UPDATE patentwriter.documents
SET
  created_at = created_at + INTERVAL '8 hours',
  updated_at = updated_at + INTERVAL '8 hours'
WHERE created_at IS NOT NULL;

-- 5. 修正 citations
UPDATE patentwriter.citations
SET created_at = created_at + INTERVAL '8 hours'
WHERE created_at IS NOT NULL;

-- 6. 修正 knowledge_configs
UPDATE patentwriter.knowledge_configs
SET
  created_at = created_at + INTERVAL '8 hours',
  updated_at = updated_at + INTERVAL '8 hours'
WHERE created_at IS NOT NULL;

-- 7. 修正 knowledge_files
UPDATE patentwriter.knowledge_files
SET
  created_at = created_at + INTERVAL '8 hours',
  updated_at = updated_at + INTERVAL '8 hours'
WHERE created_at IS NOT NULL;

-- ============================================================
-- 验证：执行后检查几条数据是否符合预期
-- SELECT id, title, created_at, updated_at FROM patentwriter.conversations ORDER BY created_at DESC LIMIT 5;
-- ============================================================
