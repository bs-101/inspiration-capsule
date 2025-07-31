-- 修复 Supabase 存储桶 RLS 策略
-- 解决 "new row violates row-level security policy" 错误

-- 1. 确保存储对象表启用了 RLS（Supabase 语法固定）
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- 2. 删除所有可能冲突的旧策略
DROP POLICY IF EXISTS "inspiration_images_public_access" ON storage.objects;
DROP POLICY IF EXISTS "inspiration_images_authenticated_upload" ON storage.objects;
DROP POLICY IF EXISTS "inspiration_images_user_delete" ON storage.objects;
DROP POLICY IF EXISTS "inspiration_images_user_update" ON storage.objects;
DROP POLICY IF EXISTS "Allow public read access" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated uploads" ON storage.objects;

-- 3. 创建新的公开读取策略
CREATE POLICY "inspiration_images_public_read" ON storage.objects 
FOR SELECT 
USING (bucket_id = 'inspiration-images');

-- 4. 创建新的认证用户上传策略
CREATE POLICY "inspiration_images_authenticated_insert" ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'inspiration-images' 
  AND auth.role() = 'authenticated'
);

-- 5. 创建认证用户更新策略（可选，用于文件替换）
CREATE POLICY "inspiration_images_authenticated_update" ON storage.objects 
FOR UPDATE 
USING (
  bucket_id = 'inspiration-images' 
  AND auth.role() = 'authenticated'
)
WITH CHECK (
  bucket_id = 'inspiration-images' 
  AND auth.role() = 'authenticated'
);

-- 6. 创建认证用户删除策略（可选，用于文件删除）
CREATE POLICY "inspiration_images_authenticated_delete" ON storage.objects 
FOR DELETE 
USING (
  bucket_id = 'inspiration-images' 
  AND auth.role() = 'authenticated'
);

-- 7. 确保存储桶存在且配置正确
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'inspiration-images',
  'inspiration-images', 
  true,
  5242880, -- 5MB 限制
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

-- 8. 验证设置
SELECT 
  '=== 存储桶信息 ===' as info,
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types,
  created_at
FROM storage.buckets 
WHERE id = 'inspiration-images'

UNION ALL

SELECT 
  '=== RLS 策略 ===' as info,
  policyname as id,
  cmd as name,
  permissive::text as public,
  null as file_size_limit,
  null as allowed_mime_types,
  null as created_at
FROM pg_policies 
WHERE tablename = 'objects' 
AND policyname LIKE '%inspiration_images%'
ORDER BY info, id;