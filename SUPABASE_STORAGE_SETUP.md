# Supabase 存储桶设置指南

## 问题描述
当上传图片时可能遇到以下错误：
1. "图片上传失败：无法创建图片存储空间，请联系管理员"
2. "保存失败: 图片上传失败: new row violates row-level security policy"

这些错误是因为 Supabase 存储桶和行级安全策略尚未正确配置。

## 当前代码配置说明

**重要：** 当前代码使用**扁平文件名结构**（`时间戳_用户ID.扩展名`），适配**方法一**的手动配置方式。

## 解决方案

### 方法一：通过 Supabase 控制台手动创建（推荐，适配当前代码）

1. **登录 Supabase 控制台**
   - 访问 [https://supabase.com/dashboard](https://supabase.com/dashboard)
   - 登录你的账户
   - 选择你的项目

2. **进入 Storage 页面**
   - 在左侧导航栏中点击 "Storage"
   - 点击 "Buckets" 标签页

3. **创建新存储桶**
   - 点击 "New bucket" 按钮
   - 存储桶名称：`inspiration-images`
   - 设置为 **Public bucket**（公开访问）
   - 点击 "Save" 保存

4. **配置存储桶策略**
   - 点击刚创建的 `inspiration-images` 存储桶
   - 进入 "Policies" 标签页
   - 点击 "New Policy" 创建以下两个策略：

   **策略1：公开读取策略**
   - Policy name: `inspiration_images_public_access`
   - Allowed operation: `SELECT`
   - Target roles: `public`
   - USING expression: `bucket_id = 'inspiration-images'`

   **策略2：认证用户上传策略**
   - Policy name: `inspiration_images_authenticated_upload`
   - Allowed operation: `INSERT`
   - Target roles: `authenticated`
   - WITH CHECK expression: `bucket_id = 'inspiration-images' AND auth.role() = 'authenticated'`

### 方法二：通过控制台手动修复策略（推荐用于解决权限和 RLS 错误）

**如果遇到 "new row violates row-level security policy" 或 "must be owner of table objects" 错误：**

#### 步骤 1：删除冲突的策略

1. **进入 Storage 策略页面**
   - 登录 Supabase 控制台
   - 点击左侧的 "Storage"
   - 点击 "Policies" 标签页

2. **删除现有策略**
   - 查找并删除所有与 `inspiration-images` 相关的策略
   - 删除任何名称包含 "inspiration_images" 的策略

#### 步骤 2：创建正确的策略

点击 "New Policy" 按钮，创建以下两个策略：

**策略 1：公开读取策略**
- Policy name: `inspiration_images_public_read`
- Allowed operation: `SELECT`
- Target roles: `public`
- USING expression: `bucket_id = 'inspiration-images'`

**策略 2：认证用户上传策略**
- Policy name: `inspiration_images_authenticated_insert`
- Allowed operation: `INSERT`
- Target roles: `authenticated`
- WITH CHECK expression: `bucket_id = 'inspiration-images'`

#### 步骤 3：验证存储桶配置

1. **检查存储桶**
   - 在 Storage > Buckets 中确认 `inspiration-images` 存在
   - 确保设置为 **Public bucket** ✅

2. **如果存储桶不存在，创建新的：**
   - 点击 "New bucket"
   - 名称：`inspiration-images`
   - 公开访问：✅ 启用
   - 文件大小限制：5MB (可选)

#### 步骤 4：验证配置

在 SQL Editor 中运行验证脚本 `scripts/verify-storage-config.sql` 来检查配置是否正确。

## 常见错误及解决方案

### 错误 1: "Bucket not found"
**解决方案：** 按照上述步骤创建 `inspiration-images` 存储桶

### 错误 2: "new row violates row-level security policy"
**原因：** 存储对象的行级安全策略配置不正确
**解决方案：** 使用方法二通过控制台手动创建正确的策略

### 错误 3: "must be owner of table objects"
**原因：** 没有足够权限通过 SQL 修改存储策略
**解决方案：** 使用方法二通过 Supabase 控制台的图形界面创建策略

### 错误 4: 文件上传成功但无法访问
**原因：** 缺少公开读取策略
**解决方案：** 确保创建了公开读取策略

## 验证设置

设置完成后，你可以：

1. **检查存储桶：**
   ```sql
   SELECT id, name, public, file_size_limit, allowed_mime_types, created_at
   FROM storage.buckets 
   WHERE id = 'inspiration-images';
   ```

2. **检查策略：**
   ```sql
   SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
   FROM pg_policies 
   WHERE tablename = 'objects' AND policyname LIKE '%inspiration_images%';
   ```

3. **测试上传：** 重新尝试上传图片

## 注意事项

- 存储桶名称必须是 `inspiration-images`（与代码中的配置一致）
- 必须设置为公开访问，否则图片无法在前端显示
- 建议设置文件大小限制（如 5MB）和允许的文件类型
- 确保用户已登录并有适当权限
- RLS 策略名称使用前缀 `inspiration_images_` 避免与其他策略冲突

## 故障排除

如果仍然遇到问题：

1. 检查 Supabase 项目的 URL 和 API 密钥是否正确配置
2. 确认用户已登录并有适当权限
3. 查看浏览器控制台的详细错误信息
4. 检查 Supabase 项目的配额是否已用完
5. 在 Supabase 控制台的 Logs 页面查看详细错误日志