-- 验证 Supabase 存储桶配置
-- 此脚本只查询，不修改任何设置

-- 1. 检查存储桶配置
SELECT 
  '=== 存储桶信息 ===' as section,
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types,
  created_at
FROM storage.buckets 
WHERE id = 'inspiration-images';

-- 2. 检查 RLS 策略
SELECT 
  '=== RLS 策略 ===' as section,
  policyname as policy_name,
  cmd as operation,
  permissive,
  roles,
  qual as using_expression,
  with_check as with_check_expression
FROM pg_policies 
WHERE tablename = 'objects' 
AND (policyname LIKE '%inspiration_images%' OR policyname LIKE '%inspiration-images%')
ORDER BY section, policy_name;

-- 3. 检查存储对象表的 RLS 状态
SELECT 
  '=== RLS 状态 ===' as section,
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'storage' AND tablename = 'objects';