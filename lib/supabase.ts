import { createClient } from "@supabase/supabase-js"

// 提供默认值以避免错误
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co"
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-key"

// 检查是否配置了真实的 Supabase 凭据
export const isSupabaseConfigured =
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
  !process.env.NEXT_PUBLIC_SUPABASE_URL.includes("placeholder")

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

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
