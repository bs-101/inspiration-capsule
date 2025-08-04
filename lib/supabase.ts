import { createClient } from "@supabase/supabase-js"

// 提供默认值以避免错误
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co"
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-key"

// 添加调试信息 - 开发调试代码
console.log("=== Supabase 配置调试 ===")
console.log("NEXT_PUBLIC_SUPABASE_URL:", process.env.NEXT_PUBLIC_SUPABASE_URL)
console.log("NEXT_PUBLIC_SUPABASE_ANON_KEY:", process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? "已设置" : "未设置")
console.log("supabaseUrl:", supabaseUrl)
console.log("包含 placeholder:", supabaseUrl.includes("placeholder"))

// 检查是否配置了真实的 Supabase 凭据
export const isSupabaseConfigured =
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
  !process.env.NEXT_PUBLIC_SUPABASE_URL.includes("placeholder")

console.log("isSupabaseConfigured:", isSupabaseConfigured)

// 使用对象包装来确保引用更新 - 自定义设计模式
const supabaseWrapper = {
  client: createClient(supabaseUrl, supabaseAnonKey)
}

// 导出获取当前客户端的函数 - 自定义业务逻辑
export const getSupabaseClient = () => supabaseWrapper.client

// 为了向后兼容，导出 supabase 对象 - 兼容性设计
export const supabase = new Proxy({} as any, {
  get(target, prop) {
    return supabaseWrapper.client[prop as keyof typeof supabaseWrapper.client]
  }
})

// 重新初始化 Supabase 客户端的函数 - 自定义业务逻辑
export const reinitializeSupabaseClient = () => {
  console.log('🔄 重新初始化 Supabase 客户端...')
  
  // 创建新的客户端实例 - Supabase 固定语法
  const newClient = createClient(supabaseUrl, supabaseAnonKey)
  
  // 更新包装器中的客户端实例 - 自定义逻辑
  supabaseWrapper.client = newClient
  
  console.log('✅ Supabase 客户端重新初始化完成')
  return newClient
}

// 用户资料类型定义 - 自定义业务数据结构
export type UserProfile = {
  id: string
  username: string | null
  full_name: string | null
  avatar_url: string | null
  created_at: string
  updated_at: string
}

// 灵感卡片类型定义 - 自定义业务数据结构
export type InspirationCard = {
  id: string
  user_id: string
  content: string
  description: string
  tags: string[]
  category: string
  status: "private" | "public"
  image_url?: string
  created_at: string
  username?: string // 用于显示作者信息
  // 关联的用户资料信息（从 user_profiles 表查询）
  user_profiles?: UserProfile
  // 向后兼容的字段名
  user_profile?: UserProfile
}
