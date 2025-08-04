"use client"

import { useEffect, useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { supabase, isSupabaseConfigured, type InspirationCard } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Navbar } from "@/components/navbar"
import { InspirationForm } from "@/components/inspiration-form"
import { InspirationCard as InspirationCardComponent } from "@/components/inspiration-card"
import { AlertTriangle, Plus, Sparkles, RefreshCw, Filter } from "lucide-react"
import type { User, AuthChangeEvent, Session } from "@supabase/supabase-js"


export default function DashboardPage() {
  // 状态管理 - React Hooks标准用法
  const [user, setUser] = useState<User | null>(null)
  const [userInspirations, setUserInspirations] = useState<InspirationCard[]>([])
  const [filteredInspirations, setFilteredInspirations] = useState<InspirationCard[]>([])
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [availableCategories, setAvailableCategories] = useState<string[]>([])
  const [isLoadingContent, setIsLoadingContent] = useState(true) // 内容加载状态 - 用户体验优化
  const [showForm, setShowForm] = useState(false)
  const [authChecked, setAuthChecked] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isInitializing, setIsInitializing] = useState(true) // 初始化状态，用于显示骨架屏
  
  // 切屏检测相关的 ref - React useRef 固定语法，用于记录状态
  const previousSessionRef = useRef<string | null>(null) // 记录上一次的session ID - 防止重复加载
  const hasInitialLoadRef = useRef(false) // 记录是否已完成初始加载 - 防止重复加载
  
  const router = useRouter()

  // 页面初始化和用户认证检查 - React useEffect 固定模式
  useEffect(() => {
    const checkAuthAndInitialize = async () => {
      console.log('Dashboard页面初始化，检查认证状态...')
      console.log(isSupabaseConfigured)
      
      if (!isSupabaseConfigured) {
        setAuthChecked(true)
        setIsLoadingContent(false)
        setIsInitializing(false)
        return
      }

      try {
        const { data: { user }, error } = await supabase.auth.getUser()
        
        if (error) {
          console.error("Authentication error:", error)
          setAuthChecked(true)
          setIsLoadingContent(false)
          setIsInitializing(false)
          router.push("/")
          return
        }

        if (user) {
          setUser(user)
          setAuthChecked(true)
          setIsInitializing(false) // 页面可以显示了
          previousSessionRef.current = user?.id || null // 初始化session记录
          
          // 异步加载用户灵感，不阻塞页面显示 - 用户体验优化
          loadUserInspirations(user.id)
          hasInitialLoadRef.current = true
        } else {
          // 未登录用户处理 - 安全控制
          setAuthChecked(true)
          setIsLoadingContent(false)
          setIsInitializing(false)
          hasInitialLoadRef.current = true
          router.push("/")
        }
      } catch (error) {
        console.error("Authentication check failed:", error)
        setAuthChecked(true)
        setIsLoadingContent(false)
        setIsInitializing(false)
        hasInitialLoadRef.current = true
        router.push("/")
      }
    }

    checkAuthAndInitialize()

    // 监听认证状态变化 - Supabase Auth 智能模式（同步公开灵感墙页面）
    if (isSupabaseConfigured) {
      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange((event: AuthChangeEvent, session: Session | null) => {
        console.log('Dashboard认证状态变化:', event, '用户:', session?.user?.email)
        console.log('页面可见性状态:', document.visibilityState)
        
        const currentSessionId = session?.user?.id || null
        const previousSessionId = previousSessionRef.current
        
        // 检查session是否真正发生了变化 - 智能判断逻辑
        const sessionChanged = currentSessionId !== previousSessionId
        
        console.log('Dashboard Session变化检查:', {
          event,
          currentSessionId,
          previousSessionId, 
          sessionChanged,
          hasInitialLoad: hasInitialLoadRef.current,
          visibilityState: document.visibilityState
        })
        
        // 更新用户状态 - React状态管理
        if (session?.user) {
          setUser(session.user)
        } else {
          setUser(null)
          router.push("/")
          return
        }
        
        // 特殊处理：macOS切屏导致的SIGNED_IN事件 - 智能检测和修复
        if (event === "SIGNED_IN" && !sessionChanged && hasInitialLoadRef.current) {
          console.warn('⚠️ Dashboard检测到macOS切屏导致的虚假SIGNED_IN事件')
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
            console.log('🔄 Dashboard强制重新加载页面以重建稳定的认证环境和网络连接')
            window.location.reload()
          }, 500)
          
          return // 提前返回，避免执行后续逻辑
        }
        
        // 正常的认证状态变化处理
        if (hasInitialLoadRef.current && sessionChanged) {
          if (event === "SIGNED_IN") {
            console.log('Dashboard检测到真正的用户登录，重新加载用户灵感')
            if (session?.user) {
              loadUserInspirations(session.user.id)
            }
          } else if (event === "SIGNED_OUT") {
            console.log('Dashboard检测到用户登出，跳转到首页')
            router.push("/")
          }
        } else if (hasInitialLoadRef.current && !sessionChanged) {
          console.log('Dashboard Session未变化，跳过重新加载')
          
          // 处理INITIAL_SESSION事件 - 这是正常的稳定状态
          if (event === "INITIAL_SESSION") {
            console.log('✅ Dashboard INITIAL_SESSION - 连接状态稳定')
          }
        }
        
        // 更新记录的session ID - 状态同步
        previousSessionRef.current = currentSessionId
        
        // 忽略其他事件如 TOKEN_REFRESHED 等，避免不必要的重新加载
      })

      return () => subscription.unsubscribe()
    }
  }, [router])

  // 分类筛选逻辑 - 业务逻辑：根据选中分类过滤灵感
  useEffect(() => {
    if (selectedCategory === 'all') {
      setFilteredInspirations(userInspirations)
    } else {
      setFilteredInspirations(userInspirations.filter(inspiration => inspiration.category === selectedCategory))
    }
  }, [userInspirations, selectedCategory])

  // 分类筛选处理函数 - 业务逻辑：更新选中的分类
  const handleCategoryFilter = (category: string) => {
    setSelectedCategory(category)
  }

  // macOS 切屏检测 - 简单重新加载方案
  useEffect(() => {
    let lastVisibilityChange = Date.now()

    const handleVisibilityChange = () => {
      const now = Date.now()
      
      if (document.visibilityState === 'visible') {
        const timeSinceLastChange = now - lastVisibilityChange
        
        // 检测到可能的 macOS 切屏（超过2秒的不可见时间）
        if (timeSinceLastChange > 2000) {
          console.log('检测到可能的 macOS 切屏，重新加载页面以重建认证连接')
          window.location.reload()
        }
      }
      
      lastVisibilityChange = now
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, []) // 不需要依赖项，因为只是简单的页面重新加载

  // 加载用户灵感数据 - 自定义业务逻辑
  const loadUserInspirations = async (userId: string) => {
    if (!isSupabaseConfigured) {
      // 演示数据 - 当Supabase未配置时显示
      setUserInspirations([
        {
          id: "demo-user-1",
          user_id: userId,
          content: "我的第一个灵感：开发一个AI驱动的代码审查工具",
          description: "结合静态分析和机器学习，提供智能代码建议",
          tags: ["AI", "代码审查", "开发工具"],
          category: "技术学习",
          status: "private",
          created_at: new Date().toISOString(),
        },
        {
          id: "demo-user-2",
          user_id: userId,
          content: "产品想法：极简主义的时间管理应用",
          description: "只关注最重要的三件事，避免功能过载",
          tags: ["产品设计", "时间管理", "极简"],
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
      setError(null) // 清除之前的错误

      // 创建一个超时Promise，防止请求卡住
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('请求超时')), 10000) // 10秒超时
      })

      // Supabase查询用户灵感 - 分步查询，先获取灵感，再获取用户信息
      const inspirationsPromise = supabase
        .from("inspirations")
        .select("*")
        .eq("user_id", userId) // 只查询当前用户的灵感
        .order("created_at", { ascending: false })

      // 使用Promise.race来实现超时控制
      const { data: inspirationsData, error } = await Promise.race([
        inspirationsPromise,
        timeoutPromise
      ]) as any

      if (error) {
        console.error("Failed to load user inspirations:", error)
        setError("加载灵感失败")
        setIsLoadingContent(false)
        return
      }

      // 如果有灵感数据，获取用户信息
      if (inspirationsData && inspirationsData.length > 0) {
        const userProfilePromise = supabase
          .from("user_profiles")
          .select("username, full_name, avatar_url")
          .eq("id", userId)
          .single()

        const { data: userProfile } = await Promise.race([
          userProfilePromise,
          timeoutPromise
        ]) as any

        // 将用户信息附加到每个灵感上
        const inspirationsWithUser = inspirationsData.map((inspiration: any) => ({
          ...inspiration,
          user_profiles: userProfile
        }))

        setUserInspirations(inspirationsWithUser)
      } else {
        setUserInspirations(inspirationsData || [])
      }
      
      // 提取所有可用的分类 - 业务逻辑：从用户灵感中提取分类
        const categories = [...new Set((inspirationsData || []).map((item: any) => item.category).filter(Boolean))] as string[]
      setAvailableCategories(categories)
      
    } catch (error: any) {
      console.error("Error loading user inspirations:", error)
      if (error?.message === '请求超时') {
        setError("加载超时，请检查网络连接")
      } else {
        setError("加载灵感时出错")
      }
    } finally {
      setIsLoadingContent(false) // 内容加载完成
    }
  }

  // 处理新增灵感成功 - 自定义业务逻辑
  const handleInspirationAdded = () => {
    setShowForm(false)
    if (user) {
      loadUserInspirations(user.id)
    }
  }

  // 处理删除灵感 - 优化版本：前端直接移除，无需重新加载
  const handleDeleteInspiration = async (id: string) => {
    if (!isSupabaseConfigured || !user) return

    try {
      // 先在前端乐观更新：立即移除卡片 - 用户体验优化
      const originalInspirations = [...userInspirations] // 备份原始数据，用于错误回滚
      setUserInspirations(prev => prev.filter(inspiration => inspiration.id !== id))

      // 后端删除操作 - Supabase 标准删除 API
      const { error } = await supabase
        .from("inspirations")
        .delete()
        .eq("id", id)
        .eq("user_id", user.id) // 确保只能删除自己的灵感 - 安全控制

      if (error) {
        // 删除失败，回滚前端状态 - 错误处理
        console.error("Failed to delete inspiration:", error)
        setUserInspirations(originalInspirations) // 恢复原始数据
        alert("删除失败: " + error.message)
        return
      }

      console.log("灵感删除成功，已从前端列表移除")
      // 删除成功，前端状态已经更新，无需额外操作
    } catch (error) {
      // 网络错误或其他异常，回滚前端状态 - 错误处理
      console.error("Error deleting inspiration:", error)
      setUserInspirations(prev => [...userInspirations]) // 恢复原始数据
      alert("删除时出错")
    }
  }

  // 初始化检查中显示骨架屏 - 更好的用户体验
  if (isInitializing || !authChecked) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-100">
        {/* 导航栏 - 复用组件 */}
        <Navbar />
        
        <div className="container mx-auto px-4 py-8 max-w-6xl">
          {/* 骨架屏头部 */}
          <div className="flex items-center justify-between mb-12 animate-pulse">
            <div>
              <div className="flex items-center mb-3">
                <div className="w-8 h-8 bg-gray-300 rounded-full mr-3"></div>
                <div className="h-10 bg-gray-300 rounded w-64"></div>
              </div>
              <div className="h-6 bg-gray-200 rounded w-96 mb-2"></div>
              <div className="h-5 bg-gray-200 rounded w-48"></div>
            </div>
            <div className="h-12 bg-gray-300 rounded-lg w-32"></div>
          </div>
          
          {/* 骨架屏内容区域 */}
          <div className="space-y-8">
            <div className="flex items-center justify-between">
              <div className="h-8 bg-gray-300 rounded w-48"></div>
              <div className="h-8 bg-gray-200 rounded w-20"></div>
            </div>
            
            {/* 骨架屏卡片网格 */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="animate-pulse">
                  <div className="bg-white/80 rounded-xl shadow-lg p-6 space-y-4">
                    <div className="h-4 bg-gray-300 rounded w-3/4"></div>
                    <div className="h-20 bg-gray-200 rounded"></div>
                    <div className="flex gap-2">
                      <div className="h-6 bg-gray-200 rounded-full w-16"></div>
                      <div className="h-6 bg-gray-200 rounded-full w-20"></div>
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

  // 未登录用户不应该看到此页面（会被重定向）
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">正在重定向...</div>
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
      <Navbar />

      <div className="container mx-auto px-4 py-8 max-w-6xl relative z-10">
        {/* 配置提醒 - 条件渲染 */}
        {!isSupabaseConfigured && (
          <Alert className="mb-6 border-0 shadow-xl bg-white/80 backdrop-blur-sm">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              当前为演示模式。要启用完整功能，请配置 Supabase 环境变量：
              <br />• NEXT_PUBLIC_SUPABASE_URL
              <br />• NEXT_PUBLIC_SUPABASE_ANON_KEY
            </AlertDescription>
          </Alert>
        )}

        {/* 错误信息显示 - 错误处理 */}
        {error && (
          <Alert className="mb-6 border-0 shadow-xl bg-red-50/80 backdrop-blur-sm border-red-200">
            <AlertTriangle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-700">
              {error}
              <Button 
                variant="outline" 
                size="sm" 
                className="ml-4 text-red-600 border-red-300 hover:bg-red-100"
                onClick={() => {
                  setError(null)
                  if (user) {
                    loadUserInspirations(user.id)
                  }
                }}
              >
                重试
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {/* 页面头部 - 现代化设计 */}
        <div className="flex items-center justify-between mb-12 animate-fade-in">
          <div>
            <div className="flex items-center mb-3">
              <div className="relative">
                <Sparkles className="w-8 h-8 text-purple-600 mr-3 animate-pulse" />
                <div className="absolute inset-0 w-8 h-8 bg-purple-400 rounded-full filter blur-xl opacity-30 animate-ping"></div>
              </div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 via-blue-600 to-indigo-600 bg-clip-text text-transparent">
                我的灵感墙
              </h1>
            </div>
            <p className="text-lg text-gray-600 leading-relaxed">
              欢迎回来，{user.user_metadata?.full_name || user.email || "用户"}！
              <br />
              <span className="text-gray-500">让想法变成现实 ✨</span>
            </p>
          </div>
          
          {/* 添加灵感按钮 - 现代化设计 */}
          <Button 
            onClick={() => setShowForm(true)}
            size="lg"
            className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
          >
            <Plus className="w-5 h-5 mr-2" />
            新增灵感
          </Button>
        </div>

        {/* 灵感表单 - 现代化设计 */}
        {showForm && (
          <div className="mb-12">
            <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-sm">
              <CardContent className="p-8">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full flex items-center justify-center">
                      <Plus className="w-4 h-4 text-white" />
                    </div>
                    <h2 className="text-2xl font-semibold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">
                      添加新灵感
                    </h2>
                  </div>
                  <Button 
                    variant="outline" 
                    onClick={() => setShowForm(false)}
                    className="hover:bg-white/80 backdrop-blur-sm border-gray-200 hover:border-gray-300 transition-all duration-200"
                  >
                    取消
                  </Button>
                </div>
                <InspirationForm 
                  onSuccess={handleInspirationAdded} 
                  authReady={authChecked && !!user}
                  user={user}
                />
              </CardContent>
            </Card>
          </div>
        )}

        {/* 灵感列表 - 现代化布局 */}
        <div className="space-y-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h2 className="text-3xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">
                我的灵感收藏
              </h2>
              <div className="px-3 py-1 bg-gradient-to-r from-purple-100 to-blue-100 rounded-full">
                 <span className="text-sm font-medium text-purple-700">
                   {filteredInspirations.length} 个灵感
                 </span>
               </div>
             </div>
             
             {/* 手动刷新按钮 - 用户主动控制 */}
             <Button
               variant="outline"
               size="sm"
               onClick={() => {
                 if (user) {
                   loadUserInspirations(user.id)
                 }
               }}
               disabled={isLoadingContent}
               className="flex items-center gap-2 hover:bg-white/80 backdrop-blur-sm border-gray-200 hover:border-gray-300 transition-all duration-200"
             >
               <RefreshCw className={`w-4 h-4 ${isLoadingContent ? 'animate-spin' : ''}`} />
               刷新
             </Button>
           </div>

           {/* 分类筛选器 - 业务功能：分类筛选 */}
           {availableCategories.length > 0 && (
             <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
               <CardContent className="p-6">
                 <div className="flex items-center gap-4 flex-wrap">
                   <div className="flex items-center gap-2">
                     <Filter className="w-5 h-5 text-gray-600" />
                     <span className="text-gray-700 font-medium">按分类筛选：</span>
                   </div>
                   <div className="flex gap-2 flex-wrap">
                     <Badge
                       variant={selectedCategory === 'all' ? 'default' : 'secondary'}
                       className={`cursor-pointer transition-all duration-200 hover:scale-105 ${
                         selectedCategory === 'all' 
                           ? 'bg-gradient-to-r from-purple-500 to-blue-500 text-white shadow-md' 
                           : 'hover:bg-gray-200'
                       }`}
                       onClick={() => handleCategoryFilter('all')}
                     >
                       全部 ({userInspirations.length})
                     </Badge>
                     {availableCategories.map((category, index) => (
                       <Badge
                         key={`dashboard-category-${index}-${category}`}
                         variant={selectedCategory === category ? 'default' : 'secondary'}
                         className={`cursor-pointer transition-all duration-200 hover:scale-105 ${
                           selectedCategory === category 
                             ? 'bg-gradient-to-r from-purple-500 to-blue-500 text-white shadow-md' 
                             : 'hover:bg-gray-200'
                         }`}
                         onClick={() => handleCategoryFilter(category)}
                       >
                         {category} ({userInspirations.filter(item => item.category === category).length})
                       </Badge>
                     ))}
                   </div>
                 </div>
               </CardContent>
             </Card>
           )}

           {isLoadingContent ? (
            // 内容加载状态 - 现代化设计
            <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-sm">
              <CardContent className="p-16 text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto mb-4"></div>
                <p className="text-gray-600">正在加载你的灵感...</p>
              </CardContent>
            </Card>
          ) : filteredInspirations.length === 0 ? (
            // 空状态显示 - 现代化设计
            <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-sm">
              <CardContent className="p-16 text-center">
                {userInspirations.length === 0 ? (
                  // 完全没有数据
                  <>
                    <div className="relative mb-6">
                      <Sparkles className="w-20 h-20 text-gray-400 mx-auto animate-bounce" />
                      <div className="absolute inset-0 w-20 h-20 bg-purple-200 rounded-full filter blur-xl opacity-50 mx-auto animate-pulse"></div>
                    </div>
                    <h3 className="text-2xl font-semibold text-gray-700 mb-3">还没有创建任何灵感</h3>
                    <p className="text-gray-500 mb-6 text-lg">开始记录你的第一个创意想法吧！</p>
                    <Button 
                      onClick={() => setShowForm(true)}
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
                        onClick={() => setShowForm(true)}
                        className="bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white px-6 py-3 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        创建灵感
                      </Button>
                    </div>
                  </>
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
                  <InspirationCardComponent 
                    inspiration={inspiration} 
                    showActions={true}
                    currentUserId={user?.id} // 传递当前用户ID用于权限检查 - 安全控制
                    onDelete={() => handleDeleteInspiration(inspiration.id)}
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 统计信息 - 现代化设计 */}
        {userInspirations.length > 0 && (
          <div className="mt-16">
            <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-sm">
              <CardContent className="p-8">
                <h3 className="text-2xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent mb-6 text-center">
                  灵感统计
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="text-center p-6 bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl">
                    <div className="w-12 h-12 bg-purple-500 rounded-full flex items-center justify-center mx-auto mb-3">
                      <Sparkles className="w-6 h-6 text-white" />
                    </div>
                    <div className="text-3xl font-bold text-purple-700 mb-1">
                      {userInspirations.length}
                    </div>
                    <div className="text-purple-600">总灵感数</div>
                  </div>
                  <div className="text-center p-6 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl">
                    <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-3">
                      <Sparkles className="w-6 h-6 text-white" />
                    </div>
                    <div className="text-3xl font-bold text-blue-700 mb-1">
                      {userInspirations.filter(i => i.status === "public").length}
                    </div>
                    <div className="text-blue-600">公开分享</div>
                  </div>
                  <div className="text-center p-6 bg-gradient-to-br from-green-50 to-green-100 rounded-xl">
                    <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-3">
                      <Sparkles className="w-6 h-6 text-white" />
                    </div>
                    <div className="text-3xl font-bold text-green-700 mb-1">
                      {userInspirations.filter(i => i.status === "private").length}
                    </div>
                    <div className="text-green-600">私人收藏</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}
