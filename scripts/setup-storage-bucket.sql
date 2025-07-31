-- Supabase 存储桶设置脚本
-- 适配手动创建的策略和扁平文件名结构

-- 1. 确保存储对象表启用了 RLS（语法固定）
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- 2. 删除可能冲突的旧策略（如果存在）
DROP POLICY IF EXISTS "inspiration_images_user_delete" ON storage.objects;
DROP POLICY IF EXISTS "inspiration_images_user_update" ON storage.objects;

-- 注意：如果你已经在 Supabase 控制台手动创建了以下策略，请跳过步骤 3-4
-- 3. 创建公开读取策略（如果不存在）
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'objects' 
        AND policyname = 'inspiration_images_public_access'
    ) THEN
        CREATE POLICY "inspiration_images_public_access" ON storage.objects 
        FOR SELECT 
        USING (bucket_id = 'inspiration-images');
    END IF;
END $$;

-- 4. 创建认证用户上传策略（如果不存在）
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'objects' 
        AND policyname = 'inspiration_images_authenticated_upload'
    ) THEN
        CREATE POLICY "inspiration_images_authenticated_upload" ON storage.objects 
        FOR INSERT 
        WITH CHECK (
          bucket_id = 'inspiration-images' 
          AND auth.role() = 'authenticated'
        );
    END IF;
END $$;

-- 验证设置
SELECT 
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types,
  created_at
FROM storage.buckets 
WHERE id = 'inspiration-images';