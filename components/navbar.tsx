"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { AuthModal } from "@/components/auth-modal"
import { PixelAvatarGenerator } from "@/components/pixel-avatar-generator"
import { PixelAvatar } from "pixel-avatar-lib" // 第三方像素头像库 - 固定导入语法
import type { User } from "@supabase/supabase-js"
import { isSupabaseConfigured } from "@/lib/supabase"
import { LogIn, User as UserIcon, Home, Palette } from "lucide-react"

interface NavbarProps {
  onAuthSuccess?: () => void
}

export function Navbar({ onAuthSuccess }: NavbarProps) {
  // 用户状态管理 - React Hooks标准用法
  const [user, setUser] = useState<User | null>(null)
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [userProfile, setUserProfile] = useState<any>(null)
  const router = useRouter()

  // 用户认证状态监听 - Supabase Auth标准模式
  useEffect(() => {
    if (!isSupabaseConfigured) return

    const getUser = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser()
        setUser(user)
        
        // 如果用户已登录，获取用户资料信息
        if (user) {
          const { data: profile } = await supabase
            .from("user_profiles")
            .select("*")
            .eq("id", user.id)
            .single()
          setUserProfile(profile)
        }
      } catch (error) {
        console.error("Failed to get user info:", error)
      }
    }

    getUser()

    // Supabase Auth状态变化监听 - 固定API用法
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      setUser(session?.user ?? null)
      
      // 当用户状态变化时，重新获取用户资料
      if (session?.user) {
        const { data: profile } = await supabase
          .from("user_profiles")
          .select("*")
          .eq("id", session.user.id)
          .single()
        setUserProfile(profile)
      } else {
        setUserProfile(null)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  // 退出登录处理 - Supabase Auth标准方法
  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push("/")
  }

  // 登录成功回调 - 自定义业务逻辑
  const handleAuthSuccess = () => {
    onAuthSuccess?.()
  }

  // 头像保存成功回调 - 自定义业务逻辑
  const handleAvatarSave = async () => {
    // 重新获取用户资料以更新头像显示
    if (user) {
      const { data: profile } = await supabase
        .from("user_profiles")
        .select("*")
        .eq("id", user.id)
        .single()
      setUserProfile(profile)
    }
  }

  // 获取头像URL - 自定义业务逻辑
  const getAvatarUrl = () => {
    // 如果是像素头像，返回null让组件使用像素头像
    if (userProfile?.avatar_url?.startsWith('pixel:')) {
      return null
    }
    // 否则返回传统头像URL
    return userProfile?.avatar_url || user?.user_metadata?.avatar_url || "/placeholder.svg"
  }

  // 获取像素头像DNA - 自定义业务逻辑
  const getPixelAvatarDna = () => {
    if (userProfile?.avatar_url?.startsWith('pixel:')) {
      return userProfile.avatar_url.replace('pixel:', '')
    }
    return null
  }

  // 获取用户显示名称 - 自定义业务逻辑
  const getUserDisplayName = () => {
    return user?.user_metadata?.username || 
           user?.user_metadata?.full_name || 
           user?.email?.split('@')[0] || 
           '用户'
  }

  // 获取用户头像字母 - 自定义业务逻辑
  const getUserInitial = () => {
    const displayName = getUserDisplayName()
    return displayName.charAt(0).toUpperCase()
  }

  return (
    <>
      {/* 导航栏 - 标准布局结构 */}
      <nav className="sticky top-0 z-50 w-full border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          {/* 左侧品牌区域 - 固定布局 */}
          <div className="flex items-center space-x-6">
            <h1 className="text-xl font-bold text-gray-900">灵感胶囊</h1>
            
            {/* 导航链接 - 自定义业务逻辑 */}
            <div className="hidden md:flex items-center space-x-4">
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => router.push("/")}
                className="text-gray-600 hover:text-gray-900 hover:bg-gray-100"
              >
                <Home className="mr-2 h-4 w-4" />
                公共灵感墙
              </Button>
              {user && (
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => router.push("/dashboard")}
                  className="text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                >
                  <UserIcon className="mr-2 h-4 w-4" />
                  我的灵感墙
                </Button>
              )}
            </div>
          </div>

          {/* 右侧用户区域 - 条件渲染逻辑 */}
          <div className="flex items-center space-x-4">
            {user ? (
              // 已登录用户下拉菜单 - Radix UI标准组件
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                    <Avatar className="h-10 w-10">
                      {getPixelAvatarDna() ? (
                        // 显示像素头像 - 使用第三方库组件
                        <PixelAvatar 
                          dna={getPixelAvatarDna()!} 
                          size={40}
                          className="w-full h-full rounded-full"
                        />
                      ) : (
                        // 显示传统头像 - 标准Avatar组件
                        <>
                          <AvatarImage
                            src={getAvatarUrl()!}
                            alt={getUserDisplayName()}
                          />
                          <AvatarFallback className="bg-blue-500 text-white">
                            {getUserInitial()}
                          </AvatarFallback>
                        </>
                      )}
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
                  <div className="flex flex-col space-y-1 p-2">
                    <p className="text-sm font-medium leading-none">{getUserDisplayName()}</p>
                    <p className="text-xs leading-none text-muted-foreground">{user.email}</p>
                  </div>
                  <DropdownMenuItem onClick={() => router.push("/")}>
                    <Home className="mr-2 h-4 w-4" />
                    公共灵感墙
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => router.push("/dashboard")}>
                    <UserIcon className="mr-2 h-4 w-4" />
                    我的灵感墙
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <PixelAvatarGenerator 
                      onSave={handleAvatarSave}
                      currentDna={getPixelAvatarDna() || undefined}
                    />
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleSignOut}>
                    <LogIn className="mr-2 h-4 w-4" />
                    退出登录
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              // 未登录用户登录按钮 - 自定义UI逻辑
              <Button 
                onClick={() => setShowAuthModal(true)}
                variant="outline"
                size="sm"
                disabled={!isSupabaseConfigured}
              >
                <LogIn className="mr-2 h-4 w-4" />
                登录 / 注册
              </Button>
            )}
          </div>
        </div>
      </nav>

      {/* 登录注册模态框 - 自定义组件 */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onSuccess={handleAuthSuccess}
      />
    </>
  )
}
