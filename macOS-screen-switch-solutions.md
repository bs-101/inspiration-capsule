# macOS 切屏问题解决方案

## 问题描述
- macOS 三指切屏后，Supabase 连接状态异常
- 认证状态从 `INITIAL_SESSION` 变为 `SIGNED_IN`
- `supabase.auth.getUser()` 调用会卡死
- 所有数据库操作无法正常进行

## 🔍 重要发现：认证状态的影响
**关键观察**：未登录时切屏不影响数据加载，登录后切屏会导致所有操作卡死

### 原因分析
1. **未登录状态**：
   - 使用 `anon` 角色进行匿名查询
   - 不涉及 JWT token 验证
   - 纯粹的数据库查询，不受 macOS 切屏影响

2. **登录状态**：
   - 使用 `authenticated` 角色
   - 每个 Supabase 请求都会自动附加 JWT token
   - 需要与认证服务器通信验证 token 有效性
   - macOS 切屏会挂起认证相关的网络连接

### 技术细节
```javascript
// 未登录 - 匿名查询（不受影响）
const { data } = await supabase.from("inspirations").select("*")
// ✅ 简单的数据库查询

// 登录后 - 带认证查询（会卡死）
const { data } = await supabase.from("inspirations").select("*") 
// ❌ 自动附加 JWT，需要认证服务器验证
```增删改查操作全部失效
- 只有重新刷新页面才能恢复

## 解决方案对比

### 方案1：直接重新加载页面（当前采用）
**优点：**
- 100% 解决连接问题
- 用户体验一致
- 实现简单可靠

**缺点：**
- 页面会重新加载
- 用户输入的内容可能丢失

### 方案2：重新初始化 Supabase 客户端
```typescript
// 在检测到切屏后重新创建 Supabase 客户端
const newSupabase = createClient(supabaseUrl, supabaseAnonKey)
// 替换全局的 supabase 实例
```

### 方案3：忽略切屏事件
```typescript
// 完全忽略 macOS 切屏导致的 SIGNED_IN 事件
if (event === "SIGNED_IN" && !sessionChanged && hasInitialLoadRef.current) {
  console.log('忽略macOS切屏导致的虚假SIGNED_IN事件')
  return
}
```

## 推荐方案
考虑到 Supabase 连接在 macOS 切屏后 100% 不稳定，**推荐使用方案1（直接重新加载页面）**，这是最可靠的解决方案。