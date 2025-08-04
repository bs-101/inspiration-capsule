-- 添加用户自定义分类功能
-- 创建用户分类表

-- 1. 创建用户分类表
CREATE TABLE IF NOT EXISTS user_categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT DEFAULT '#6366f1', -- 分类颜色，默认为紫色
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, name) -- 确保同一用户不能创建重复分类名
);

-- 2. 启用 RLS
ALTER TABLE user_categories ENABLE ROW LEVEL SECURITY;

-- 3. 创建 RLS 策略
-- 用户可以查看自己的分类
CREATE POLICY "Users can view their own categories" ON user_categories
  FOR SELECT USING (auth.uid() = user_id);

-- 用户可以插入自己的分类
CREATE POLICY "Users can insert their own categories" ON user_categories
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 用户可以更新自己的分类
CREATE POLICY "Users can update their own categories" ON user_categories
  FOR UPDATE USING (auth.uid() = user_id);

-- 用户可以删除自己的分类
CREATE POLICY "Users can delete their own categories" ON user_categories
  FOR DELETE USING (auth.uid() = user_id);

-- 4. 创建触发器，自动更新 updated_at
CREATE OR REPLACE FUNCTION update_user_categories_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_user_categories_updated_at
    BEFORE UPDATE ON user_categories
    FOR EACH ROW
    EXECUTE FUNCTION update_user_categories_updated_at();

-- 5. 为每个现有用户插入默认分类（如果还没有的话）
INSERT INTO user_categories (user_id, name, color)
SELECT 
    u.id,
    category_name,
    category_color
FROM auth.users u
CROSS JOIN (
    VALUES 
        ('项目点子', '#3b82f6'),
        ('书籍摘录', '#10b981'),
        ('技术学习', '#f59e0b'),
        ('生活感悟', '#ef4444')
) AS default_categories(category_name, category_color)
WHERE NOT EXISTS (
    SELECT 1 FROM user_categories uc 
    WHERE uc.user_id = u.id AND uc.name = category_name
);

-- 6. 创建函数，为新注册用户自动创建默认分类
CREATE OR REPLACE FUNCTION create_default_categories_for_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO user_categories (user_id, name, color) VALUES
        (NEW.id, '项目点子', '#3b82f6'),
        (NEW.id, '书籍摘录', '#10b981'),
        (NEW.id, '技术学习', '#f59e0b'),
        (NEW.id, '生活感悟', '#ef4444');
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 7. 创建触发器，在用户注册时自动创建默认分类
CREATE TRIGGER create_default_categories_trigger
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION create_default_categories_for_new_user();