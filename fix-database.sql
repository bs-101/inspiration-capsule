-- 修复数据库表结构
-- 1. 删除 title 字段（如果存在）
ALTER TABLE inspirations DROP COLUMN IF EXISTS title;

-- 2. 确保所有必要字段存在
ALTER TABLE inspirations 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS content TEXT NOT NULL DEFAULT '',
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS category TEXT NOT NULL DEFAULT 'general',
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'private' CHECK (status IN ('private', 'public')),
ADD COLUMN IF NOT EXISTS image_url TEXT,
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS username TEXT; -- 新增用户名字段

-- 3. 创建用户资料表（如果不存在）
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  username TEXT UNIQUE,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. 启用 RLS
ALTER TABLE inspirations ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- 5. 删除现有策略（如果存在）
DROP POLICY IF EXISTS "Users can view their own inspirations" ON inspirations;
DROP POLICY IF EXISTS "Users can insert their own inspirations" ON inspirations;
DROP POLICY IF EXISTS "Users can update their own inspirations" ON inspirations;
DROP POLICY IF EXISTS "Users can delete their own inspirations" ON inspirations;
DROP POLICY IF EXISTS "Anyone can view public inspirations" ON inspirations;

-- 6. 创建新的 RLS 策略
-- 用户可以查看自己的灵感
CREATE POLICY "Users can view their own inspirations" ON inspirations
  FOR SELECT USING (auth.uid() = user_id);

-- 任何人都可以查看公开的灵感
CREATE POLICY "Anyone can view public inspirations" ON inspirations
  FOR SELECT USING (status = 'public');

-- 用户可以插入自己的灵感
CREATE POLICY "Users can insert their own inspirations" ON inspirations
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 用户可以更新自己的灵感
CREATE POLICY "Users can update their own inspirations" ON inspirations
  FOR UPDATE USING (auth.uid() = user_id);

-- 用户可以删除自己的灵感
CREATE POLICY "Users can delete their own inspirations" ON inspirations
  FOR DELETE USING (auth.uid() = user_id);

-- 7. 用户资料表的 RLS 策略
-- 用户可以查看和编辑自己的资料
CREATE POLICY "Users can view their own profile" ON user_profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile" ON user_profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON user_profiles
  FOR UPDATE USING (auth.uid() = id);

-- 任何人都可以查看其他用户的基本资料（用于显示灵感作者）
CREATE POLICY "Anyone can view basic user profiles" ON user_profiles
  FOR SELECT USING (true);

-- 8. 创建触发器函数，自动更新 updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 9. 创建触发器
DROP TRIGGER IF EXISTS update_user_profiles_updated_at ON user_profiles;
CREATE TRIGGER update_user_profiles_updated_at
    BEFORE UPDATE ON user_profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 10. 创建函数，自动创建用户资料
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (id, username, full_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', NEW.email),
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 11. 创建触发器，当新用户注册时自动创建资料
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();