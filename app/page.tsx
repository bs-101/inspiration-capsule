"use client"

import { useEffect, useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { supabase, isSupabaseConfigured, type InspirationCard } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Navbar } from "@/components/navbar"
import { InspirationCard as InspirationCardComponent } from "@/components/inspiration-card"
import { AuthModal } from "@/components/auth-modal"
import { AlertTriangle, Plus, Sparkles, Filter } from "lucide-react"
import type { User, AuthChangeEvent, Session } from "@supabase/supabase-js"

export default function HomePage() {
  // 状态管理 - React Hooks标准用法
  const [user, setUser] = useState<User | null>(null)
  const [publicInspirations, setPublicInspirations] = useState<InspirationCard[]>([])
  const [filteredInspirations, setFilteredInspirations] = useState<InspirationCard[]>([]) // 筛选后的灵感 - 分类功能
  const [isLoadingContent, setIsLoadingContent] = useState(true) // 内容加载状态 - 用户体验优化
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false) // 手动刷新状态 - 用户反馈
  const [isInitializing, setIsInitializing] = useState(true) // 初始化状态，用于显示骨架屏
  const previousSessionRef = useRef<string | null>(null) // 记录上一次的session ID - 防止重复加载
  const hasInitialLoadRef = useRef(false) // 记录是否已完成初始加载 - 防止重复加载
  
  // 分类筛选相关状态 - 自定义业务逻辑
  const [selectedCategory, setSelectedCategory] = useState<string>('all') // 当前选中的分类
  const [availableCategories, setAvailableCategories] = useState<string[]>([]) // 可用的分类列表
  
  const router = useRouter()

  // 页面初始化和认证监听 - React useEffect 固定模式
  useEffect(() => {
    const initializePage = async () => {
      try {
        if (!isSupabaseConfigured) {
          // 演示模式 - 立即显示页面和演示数据
          setIsLoadingContent(false)
          setIsInitializing(false)
          hasInitialLoadRef.current = true
          return
        }

        // 获取当前用户状态 - Supabase Auth 标准方法
        const {
          data: { user },
        } = await supabase.auth.getUser()
        
        setUser(user)
        setIsInitializing(false) // 页面可以显示了
        previousSessionRef.current = user?.id || null // 初始化session记录
        
        // 异步加载内容，不阻塞页面显示 - 用户体验优化
        console.log("初始化页面，开始加载公开灵感")
        await loadPublicInspirations()
        hasInitialLoadRef.current = true
      } catch (error) {
        console.error("Page initialization failed:", error)
        setIsInitializing(false) // 即使出错也要显示页面结构
        setIsLoadingContent(false)
        hasInitialLoadRef.current = true
      }
    }

    initializePage()

    // 监听用户认证状态变化 - Supabase Auth 固定模式（智能版本）
    if (isSupabaseConfigured) {
      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange((event: AuthChangeEvent, session: Session | null) => {
        console.log('认证状态变化:', event, '用户:', session?.user?.email)
        console.log('页面可见性状态:', document.visibilityState)
        
        const currentSessionId = session?.user?.id || null
        const previousSessionId = previousSessionRef.current
        
        // 检查session是否真正发生了变化 - 智能判断逻辑
        const sessionChanged = currentSessionId !== previousSessionId
        
        console.log('Session变化检查:', {
          event,
          currentSessionId,
          previousSessionId, 
          sessionChanged,
          hasInitialLoad: hasInitialLoadRef.current,
          visibilityState: document.visibilityState
        })
        
        // 更新用户状态 - React状态管理
        setUser(session?.user || null)
        
        // 特殊处理：macOS切屏导致的SIGNED_IN事件 - 智能检测和修复
        if (event === "SIGNED_IN" && !sessionChanged && hasInitialLoadRef.current) {
          console.warn('⚠️ 检测到macOS切屏导致的虚假SIGNED_IN事件')
          console.log('🔍 分析：macOS切屏会挂起认证相关的网络连接，但不影响匿名数据库查询')
          console.log('💡 原理：登录后每个Supabase请求都会自动附加JWT token并验证认证状态')
          console.log('🔄 解决：重新加载页面以重建完整的认证环境和网络连接')
          
          // 显示用户友好的提示信息
          const reloadMessage = '检测到系统切屏，正在重新建立连接...'
          
          // 创建临时提示元素 - DOM操作固定语法
          const notification = document.createElement('div')
          notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #3b82f6;
            color: white;
            padding: 12px 20px;
            border-radius: 8px;
            font-size: 14px;
            z-index: 9999;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
          `
          notification.textContent = reloadMessage
          document.body.appendChild(notification)
          
          // 延迟500ms后重新加载，给用户看到提示的时间 - 自定义业务逻辑
          setTimeout(() => {
            console.log('🔄 强制重新加载页面以重建稳定的认证环境和网络连接')
            window.location.reload()
          }, 500)
          
          return // 提前返回，避免执行后续逻辑
        }
        
        // 正常的认证状态变化处理
        if (hasInitialLoadRef.current && sessionChanged) {
          if (event === "SIGNED_IN") {
            console.log('检测到真正的用户登录，重新加载公开灵感')
            loadPublicInspirations()
          } else if (event === "SIGNED_OUT") {
            console.log('检测到用户登出，重新加载公开灵感')
            loadPublicInspirations()
          }
        } else if (hasInitialLoadRef.current && !sessionChanged) {
          console.log('Session未变化，跳过重新加载')
          
          // 处理INITIAL_SESSION事件 - 这是正常的稳定状态
          if (event === "INITIAL_SESSION") {
            console.log('✅ INITIAL_SESSION - 连接状态稳定')
          }
        }
        
        // 更新记录的session ID - 状态同步
        previousSessionRef.current = currentSessionId
        
        // 忽略其他事件如 TOKEN_REFRESHED 等，避免不必要的重新加载
      })

      // 已关闭页面可见性监听器 - macOS三指切屏验证已禁用
      // 如需重新启用，请取消注释以下代码：
      /*
      const handleVisibilityChange = () => {
        if (document.visibilityState === 'visible' && isSupabaseConfigured) {
          console.log('页面重新可见，检查Supabase连接')
          setTimeout(() => {
            loadPublicInspirations()
          }, 300)
        }
      }
      document.addEventListener('visibilitychange', handleVisibilityChange)
      */

      return () => {
        subscription.unsubscribe()
        // document.removeEventListener('visibilitychange', handleVisibilityChange)
      }
    }
  }, [])

  // 分类筛选逻辑 - 当灵感数据或选中分类变化时更新筛选结果
  useEffect(() => {
    if (selectedCategory === 'all') {
      setFilteredInspirations(publicInspirations)
    } else {
      const filtered = publicInspirations.filter(inspiration => inspiration.category === selectedCategory)
      setFilteredInspirations(filtered)
    }
  }, [publicInspirations, selectedCategory])

  // 处理分类筛选 - 自定义事件处理函数
  const handleCategoryFilter = (category: string) => {
    setSelectedCategory(category)
  }

  // 加载公开灵感卡片 - 自定义业务逻辑
  const loadPublicInspirations = async () => {
    if (!isSupabaseConfigured) {
      // 演示数据 - 当Supabase未配置时显示
      setPublicInspirations([
        {
          id: "demo-1",
          user_id: "demo-user",
          content: "这是一个演示灵感：使用AI来自动生成代码注释，提高开发效率",
          description: "AI辅助开发工具的想法",
          tags: ["AI", "开发工具", "效率"],
          category: "技术学习",
          status: "public",
          created_at: new Date().toISOString(),
        },
        {
          id: "demo-2", 
          user_id: "demo-user",
          content: "设计一个极简的任务管理应用，只有三个状态：待办、进行中、完成",
          description: "简化任务管理的产品思路",
          tags: ["产品设计", "极简", "效率"],
          category: "项目点子",
          status: "public",
          created_at: new Date().toISOString(),
        }
      ])
      setIsLoadingContent(false)
      return
    }

    try {
      setIsLoadingContent(true) // 开始加载内容
      console.log('开始获取公开灵感数据...')
      
      // 已关闭Supabase连接健康检查 - 切屏验证已禁用
      // 如需重新启用连接验证，请取消注释以下代码：
      /*
      try {
        const { data: healthCheck, error: healthError } = await supabase.auth.getUser()
        if (healthError) {
          console.warn('Supabase连接验证失败:', healthError)
          console.log('尝试重新建立Supabase连接...')
        }
      } catch (healthError) {
        console.warn('Supabase连接检查异常:', healthError)
      }
      */
      
      // Supabase查询公开灵感 - 分步查询，先获取灵感，再获取用户信息
      const { data: inspirationsData, error } = await supabase
        .from("inspirations")
        .select("*")
        .eq("status", "public") // 只查询公开状态的灵感
        .order("created_at", { ascending: false })
        .limit(20) // 限制返回数量

      if (error) {
         console.error("Failed to load public inspirations:", error)
         console.error("Error details:", {
           message: error.message,
           details: error.details,
           hint: error.hint,
           code: error.code
         })
         
         // 如果是网络连接问题，尝试重新加载
         if (error.code === 'PGRST001' || error.message.includes('connection')) {
           console.log('检测到网络连接问题，尝试重新加载...')
           setTimeout(() => {
             loadPublicInspirations()
           }, 1000)
         }
         
         setIsLoadingContent(false)
         return
       }

      console.log(`获取到 ${inspirationsData?.length || 0} 条灵感数据`)

      // 如果有灵感数据，获取所有相关用户的信息
      if (inspirationsData && inspirationsData.length > 0) {
        // 获取所有唯一的用户ID
        const userIds = [...new Set(inspirationsData.map((inspiration: any) => inspiration.user_id))]
        console.log('需要获取用户信息的ID:', userIds)
        
        // 批量获取用户信息 - 强制获取最新数据，不使用缓存
        const { data: userProfiles, error: profileError } = await supabase
          .from("user_profiles")
          .select("id, username, full_name, avatar_url")
          .in("id", userIds)

        if (profileError) {
          console.error("获取用户信息失败:", profileError)
          // 如果用户信息获取失败，仍然显示灵感数据，只是不显示用户信息
        } else {
          console.log('获取到用户信息:', userProfiles)
        }

        // 创建用户信息映射
        const userProfilesMap = new Map()
        userProfiles?.forEach((profile: any) => {
          userProfilesMap.set(profile.id, profile)
          console.log(`用户 ${profile.id} 的头像URL:`, profile.avatar_url)
        })

        // 将用户信息附加到每个灵感上
        const inspirationsWithUser = inspirationsData.map((inspiration: any) => ({
          ...inspiration,
          user_profiles: userProfilesMap.get(inspiration.user_id)
        }))

        console.log('最终的灵感数据（包含用户信息）:', inspirationsWithUser)
        setPublicInspirations(inspirationsWithUser)
        
        // 提取所有可用的分类 - 自定义业务逻辑
        const categories = [...new Set(inspirationsWithUser.map((inspiration: any) => inspiration.category).filter(Boolean))] as string[]
        setAvailableCategories(categories)
      } else {
        setPublicInspirations(inspirationsData || [])
        setAvailableCategories([])
      }
     } catch (error) {
       console.error("Error loading public inspirations:", error)
       
       // 网络错误或其他异常处理
       if (error instanceof Error) {
         if (error.message.includes('Network') || error.message.includes('fetch')) {
           console.log('检测到网络错误，建议用户检查网络连接')
         }
       }
    } finally {
      setIsLoadingContent(false) // 内容加载完成
    }
  }

  // 处理创建灵感按钮点击 - 自定义业务逻辑
  const handleCreateInspiration = () => {
    if (user) {
      // 已登录用户直接跳转到仪表板
      router.push("/dashboard")
    } else {
      // 未登录用户显示登录模态框
      setShowAuthModal(true)
    }
  }

  // 登录成功回调 - 自定义业务逻辑
  const handleAuthSuccess = () => {
    router.push("/dashboard")
  }

  // 刷新灵感列表 - 自定义事件处理函数
  const handleRefreshInspirations = async () => {
    setIsRefreshing(true) // 设置刷新状态 - 用户反馈
    try {
      // 重新加载数据 - 业务逻辑
      console.log('刷新灵感列表')
      await loadPublicInspirations()
    } catch (error) {
      console.error("Failed to refresh inspirations:", error)
    } finally {
      setIsRefreshing(false) // 重置刷新状态 - 状态管理
    }
  }

  if (isInitializing) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-100 relative overflow-hidden">
        {/* 背景装饰元素 - 现代化设计 */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-300 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob"></div>
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-300 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-2000"></div>
          <div className="absolute top-40 left-40 w-80 h-80 bg-indigo-300 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-4000"></div>
        </div>

        {/* 导航栏骨架 */}
        <div className="border-b bg-white/80 backdrop-blur-sm">
          <div className="container mx-auto px-4 py-4 flex justify-between items-center">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gray-200 rounded-full animate-pulse"></div>
              <div className="w-24 h-6 bg-gray-200 rounded animate-pulse"></div>
            </div>
            <div className="w-20 h-8 bg-gray-200 rounded animate-pulse"></div>
          </div>
        </div>

        <div className="container mx-auto px-4 py-8 max-w-6xl relative z-10">
          {/* 页面头部骨架 */}
          <div className="text-center mb-12">
            <div className="flex items-center justify-center mb-6">
              <div className="w-12 h-12 bg-gray-200 rounded-full animate-pulse mr-3"></div>
              <div className="w-48 h-12 bg-gray-200 rounded animate-pulse"></div>
            </div>
            <div className="space-y-3 mb-8">
              <div className="w-96 h-6 bg-gray-200 rounded animate-pulse mx-auto"></div>
              <div className="w-64 h-5 bg-gray-200 rounded animate-pulse mx-auto"></div>
            </div>
            <div className="w-40 h-12 bg-gray-200 rounded-full animate-pulse mx-auto"></div>
          </div>

          {/* 内容区域骨架 */}
          <div className="space-y-8">
            <div className="flex items-center justify-between">
              <div className="w-32 h-8 bg-gray-200 rounded animate-pulse"></div>
              <div className="w-16 h-8 bg-gray-200 rounded animate-pulse"></div>
            </div>

            {/* 卡片网格骨架 */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="bg-white/80 backdrop-blur-sm rounded-xl p-6 shadow-lg">
                  <div className="space-y-4">
                    <div className="w-full h-4 bg-gray-200 rounded animate-pulse"></div>
                    <div className="w-3/4 h-4 bg-gray-200 rounded animate-pulse"></div>
                    <div className="w-1/2 h-4 bg-gray-200 rounded animate-pulse"></div>
                    <div className="flex justify-between items-center mt-6">
                      <div className="w-16 h-6 bg-gray-200 rounded animate-pulse"></div>
                      <div className="w-20 h-6 bg-gray-200 rounded animate-pulse"></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-100 relative overflow-hidden">
      {/* 背景装饰元素 - 现代化设计 */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-300 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-300 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-2000"></div>
        <div className="absolute top-40 left-40 w-80 h-80 bg-indigo-300 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-4000"></div>
      </div>

      {/* 导航栏 - 复用组件 */}
      <Navbar onAuthSuccess={handleRefreshInspirations} />

      <div className="container mx-auto px-4 py-8 max-w-6xl relative z-10">
        {/* 配置提醒 - 条件渲染 */}
        {!isSupabaseConfigured && (
          <Alert className="mb-6 border-amber-200 bg-amber-50/80 backdrop-blur-sm">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <AlertDescription className="text-amber-800">
              当前为演示模式。要启用完整功能，请配置 Supabase 环境变量：
              <br />• NEXT_PUBLIC_SUPABASE_URL
              <br />• NEXT_PUBLIC_SUPABASE_ANON_KEY
            </AlertDescription>
          </Alert>
        )}

        {/* 页面头部 - 现代化设计 */}
        <div className="text-center mb-12 animate-fade-in">
          <div className="flex items-center justify-center mb-6">
            <div className="relative">
              <Sparkles className="w-12 h-12 text-purple-600 mr-3 animate-pulse" />
              <div className="absolute inset-0 w-12 h-12 bg-purple-400 rounded-full filter blur-xl opacity-30 animate-ping"></div>
            </div>
            <h1 className="text-5xl font-bold bg-gradient-to-r from-purple-600 via-blue-600 to-indigo-600 bg-clip-text text-transparent">
              灵感胶囊
            </h1>
          </div>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto leading-relaxed">
            在这里收集、分享和发现创意灵感
            <br />
            <span className="text-lg text-gray-500">让每一个想法都闪闪发光 ✨</span>
          </p>
          
          {/* 创建灵感按钮 - 现代化设计 */}
          <Button 
            onClick={handleCreateInspiration}
            size="lg"
            className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white px-8 py-4 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 group"
          >
            <Plus className="w-5 h-5 mr-2 group-hover:rotate-90 transition-transform duration-300" />
            {user ? "创建我的灵感" : "登录后创建灵感"}
          </Button>
        </div>

        {/* 公开灵感展示区域 - 现代化布局 */}
        <div className="space-y-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h2 className="text-3xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">
                公开灵感墙
              </h2>
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
            </div>
            <Button 
              variant="outline" 
              onClick={handleRefreshInspirations}
              disabled={!isSupabaseConfigured || isRefreshing}
              className="hover:bg-white/80 backdrop-blur-sm border-gray-200 hover:border-gray-300 transition-all duration-200 flex items-center gap-2"
            >
              {isRefreshing ? (
                <>
                  <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
                  刷新中...
                </>
              ) : (
                "刷新"
              )}
            </Button>
          </div>

          {/* 分类筛选器 - 现代化设计 */}
          {availableCategories.length > 0 && (
            <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
              <CardContent className="p-6">
                <div className="flex items-center gap-4 flex-wrap">
                  <div className="flex items-center gap-2">
                    <Filter className="w-5 h-5 text-gray-600" />
                    <span className="text-sm font-medium text-gray-700">按分类筛选：</span>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    <Badge
                      variant={selectedCategory === 'all' ? 'default' : 'outline'}
                      className={`cursor-pointer transition-all duration-200 hover:scale-105 ${
                        selectedCategory === 'all' 
                          ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white' 
                          : 'hover:bg-gray-100'
                      }`}
                      onClick={() => handleCategoryFilter('all')}
                    >
                      全部 ({publicInspirations.length})
                    </Badge>
                    {availableCategories.map((category, index) => {
                      const count = publicInspirations.filter(inspiration => inspiration.category === category).length
                      return (
                        <Badge
                          key={`public-category-${index}-${category}`}
                          variant={selectedCategory === category ? 'default' : 'outline'}
                          className={`cursor-pointer transition-all duration-200 hover:scale-105 ${
                            selectedCategory === category 
                              ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white' 
                              : 'hover:bg-gray-100'
                          }`}
                          onClick={() => handleCategoryFilter(category)}
                        >
                          {category} ({count})
                        </Badge>
                      )
                    })}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {isLoadingContent ? (
            // 内容加载状态 - 用户体验优化
            <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-sm">
              <CardContent className="p-16 text-center">
                <div className="relative mb-6">
                  <div className="w-20 h-20 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin mx-auto"></div>
                </div>
                <h3 className="text-2xl font-semibold text-gray-700 mb-3">正在加载灵感内容...</h3>
                <p className="text-gray-500 text-lg">获取最新的灵感内容</p>
              </CardContent>
            </Card>
          ) : filteredInspirations.length === 0 ? (
            // 空状态显示 - 现代化设计
            <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-sm">
              <CardContent className="p-16 text-center">
                {isRefreshing ? (
                  // 刷新中状态 - 用户体验优化
                  <>
                    <div className="relative mb-6">
                      <div className="w-20 h-20 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin mx-auto"></div>
                    </div>
                    <h3 className="text-2xl font-semibold text-gray-700 mb-3">正在刷新灵感墙...</h3>
                    <p className="text-gray-500 text-lg">获取最新的灵感内容</p>
                  </>
                ) : (
                  // 真正的空状态 - 固定UI模版
                  publicInspirations.length === 0 ? (
                    // 完全没有数据
                    <>
                      <div className="relative mb-6">
                        <Sparkles className="w-20 h-20 text-gray-400 mx-auto animate-bounce" />
                        <div className="absolute inset-0 w-20 h-20 bg-purple-200 rounded-full filter blur-xl opacity-50 mx-auto animate-pulse"></div>
                      </div>
                      <h3 className="text-2xl font-semibold text-gray-700 mb-3">还没有公开的灵感</h3>
                      <p className="text-gray-500 mb-6 text-lg">成为第一个分享灵感的人吧！</p>
                      <Button 
                        onClick={handleCreateInspiration}
                        className="bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white px-6 py-3 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        创建第一个灵感
                      </Button>
                    </>
                  ) : (
                    // 筛选后无结果
                    <>
                      <div className="relative mb-6">
                        <Filter className="w-20 h-20 text-gray-400 mx-auto" />
                        <div className="absolute inset-0 w-20 h-20 bg-gray-200 rounded-full filter blur-xl opacity-50 mx-auto animate-pulse"></div>
                      </div>
                      <h3 className="text-2xl font-semibold text-gray-700 mb-3">该分类下暂无灵感</h3>
                      <p className="text-gray-500 mb-6 text-lg">试试其他分类，或者创建一个新的灵感吧！</p>
                      <div className="flex gap-3 justify-center">
                        <Button 
                          variant="outline"
                          onClick={() => handleCategoryFilter('all')}
                          className="hover:bg-white/80 backdrop-blur-sm border-gray-200 hover:border-gray-300"
                        >
                          查看全部
                        </Button>
                        <Button 
                          onClick={handleCreateInspiration}
                          className="bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white px-6 py-3 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
                        >
                          <Plus className="w-4 h-4 mr-2" />
                          创建灵感
                        </Button>
                      </div>
                    </>
                  )
                )}
              </CardContent>
            </Card>
          ) : (
            // 灵感卡片网格布局 - 响应式网格，优化间距
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
              {filteredInspirations.map((inspiration, index) => (
                <div 
                  key={inspiration.id} 
                  className="animate-fade-in-up"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <InspirationCardComponent inspiration={inspiration} />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 功能介绍区域 - 固定内容 */}
        {filteredInspirations.length > 0 && (
          <div className="mt-16 text-center">
            <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-sm">
              <CardContent className="p-8">
                <h3 className="text-2xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent mb-4">开始收集你的灵感</h3>
                <p className="text-gray-600 mb-6">
                  记录想法、保存链接、整理思路，让每一个灵感都不被遗忘
                </p>
                <Button 
                  onClick={handleCreateInspiration}
                  size="lg"
                  variant="outline"
                  className="hover:bg-white/80 backdrop-blur-sm border-gray-200 hover:border-gray-300 transition-all duration-200"
                >
                  {user ? "进入我的灵感墙" : "注册开始使用"}
                </Button>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* 登录注册模态框 - 自定义组件 */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onSuccess={handleAuthSuccess}
      />
    </div>
  )
}
