-- 修复 inspirations 表的 RLS 策略
-- 解决 "new row violates row-level security policy" 错误

-- 1. 删除可能冲突的旧策略
DROP POLICY IF EXISTS "Users can view their own inspirations" ON inspirations;
DROP POLICY IF EXISTS "Users can insert their own inspirations" ON inspirations;
DROP POLICY IF EXISTS "Users can update their own inspirations" ON inspirations;
DROP POLICY IF EXISTS "Users can delete their own inspirations" ON inspirations;
DROP POLICY IF EXISTS "Public can view public inspirations" ON inspirations;

-- 2. 重新创建基础策略：所有用户可查看公共卡片
CREATE POLICY "Public can view public inspirations" ON inspirations
  FOR SELECT 
  USING (status = 'public');

-- 3. 认证用户可查看自己的所有卡片（包括私有）
CREATE POLICY "Users can view own inspirations" ON inspirations
  FOR SELECT 
  USING (auth.uid() = user_id);

-- 4. 认证用户可插入自己的卡片
CREATE POLICY "Users can insert own inspirations" ON inspirations
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

-- 5. 认证用户可更新自己的卡片
CREATE POLICY "Users can update own inspirations" ON inspirations
  FOR UPDATE 
  USING (auth.uid() = user_id);

-- 6. 认证用户可删除自己的卡片
CREATE POLICY "Users can delete own inspirations" ON inspirations
  FOR DELETE 
  USING (auth.uid() = user_id);

-- 7. 验证策略是否正确创建
SELECT 
  '=== 表信息 ===' as info,
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables 
WHERE tablename = 'inspirations'

UNION ALL

SELECT 
  '=== RLS 策略 ===' as info,
  policyname as schemaname,
  cmd as tablename,
  null as rowsecurity
FROM pg_policies 
WHERE tablename = 'inspirations'
ORDER BY info, schemaname;