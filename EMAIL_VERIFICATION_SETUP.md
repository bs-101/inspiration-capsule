# 邮箱验证重定向配置指南

## 问题描述
新用户注册时，Supabase 发送的邮箱验证链接跳转到 `localhost:3000` 而不是生产域名。

## 解决方案

### 1. 代码层面的修复（已完成）

#### ✅ 添加了重定向 URL 配置
在 `components/auth-modal.tsx` 中的注册函数添加了 `emailRedirectTo` 参数：

```typescript
const { data, error } = await supabase.auth.signUp({
  email: registerEmail,
  password: registerPassword,
  options: {
    data: {
      username: username,
      full_name: username,
    },
    // 邮箱确认重定向URL - 自动使用当前域名或环境变量配置的域名
    emailRedirectTo: `${currentOrigin}/auth/callback`,
  },
})
```

#### ✅ 创建了认证回调页面
新建了 `app/auth/callback/page.tsx` 来处理邮箱确认后的重定向。

#### ✅ 支持环境变量配置
可以通过 `NEXT_PUBLIC_SITE_URL` 环境变量指定生产域名。

### 2. 环境变量配置

#### 方法一：使用环境变量（推荐）
创建 `.env.local` 文件并添加：

```bash
# Supabase 配置
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# 生产域名配置（确保邮箱验证链接使用正确域名）
NEXT_PUBLIC_SITE_URL=https://your-production-domain.com
```

#### 方法二：自动检测（默认行为）
如果不设置 `NEXT_PUBLIC_SITE_URL`，系统会自动使用当前访问的域名。

### 3. Supabase 控制台配置

#### 必须配置的重定向 URL
在 Supabase 项目控制台中，需要添加以下重定向 URL：

1. 进入 Supabase 项目控制台
2. 导航到 **Authentication** > **URL Configuration**
3. 在 **Redirect URLs** 中添加：
   ```
   https://your-production-domain.com/auth/callback
   http://localhost:3000/auth/callback  (开发环境)
   ```

#### Site URL 配置
在 **Site URL** 字段中设置：
```
https://your-production-domain.com
```

### 4. 验证配置

#### 测试步骤
1. 在生产环境注册新用户
2. 检查收到的邮箱验证邮件
3. 点击验证链接，应该跳转到：
   ```
   https://your-production-domain.com/auth/callback
   ```
4. 验证成功后自动跳转到 `/dashboard`

#### 预期行为
- ✅ 邮箱验证链接使用生产域名
- ✅ 点击链接后正确跳转到认证回调页面
- ✅ 验证成功后自动登录并跳转到仪表板
- ✅ 验证失败时显示友好的错误信息

### 5. 故障排除

#### 问题：仍然跳转到 localhost
**原因**：Supabase 控制台的 Site URL 配置错误
**解决**：确保 Supabase 控制台中的 Site URL 设置为生产域名

#### 问题：验证链接无效
**原因**：重定向 URL 未在 Supabase 控制台中配置
**解决**：在 Supabase 控制台添加 `https://your-domain.com/auth/callback`

#### 问题：验证后无法登录
**原因**：认证回调页面处理逻辑错误
**解决**：检查浏览器控制台错误信息，确保 Supabase 配置正确

### 6. 安全注意事项

- 只在 Supabase 控制台中添加信任的域名
- 生产环境不要包含 `localhost` 重定向 URL
- 定期检查和更新重定向 URL 配置
- 确保 HTTPS 在生产环境中正确配置

## 总结

通过以上配置，邮箱验证链接将：
1. 自动使用正确的生产域名
2. 跳转到专门的认证回调页面
3. 提供良好的用户体验和错误处理
4. 支持开发和生产环境的无缝切换