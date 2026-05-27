-- 数据库迁移：为 knowledge_files 表添加 local_path 字段
-- 执行日期：2026-05-27
-- 说明：用于支持本地文件存储，避免依赖 Dify API 下载文件

-- 检查列是否已存在
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'patentwriter' 
        AND table_name = 'knowledge_files' 
        AND column_name = 'local_path'
    ) THEN
        -- 添加 local_path 列
        ALTER TABLE patentwriter.knowledge_files 
        ADD COLUMN local_path VARCHAR(1000);
        
        RAISE NOTICE '成功添加 local_path 列';
    ELSE
        RAISE NOTICE 'local_path 列已存在，跳过';
    END IF;
END $$;
