"use client"

import type React from "react"
import { useState, useRef, useEffect } from "react"
import { supabase, isSupabaseConfigured } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Upload, X, Plus, Palette } from "lucide-react"

interface InspirationFormProps {
  onSuccess: () => void
  authReady?: boolean // 新增：从父组件传递认证状态
  user?: any // 新增：从父组件传递用户信息
}

interface UserCategory {
  id: string
  name: string
  color: string
}

export function InspirationForm({ onSuccess, authReady: parentAuthReady, user: parentUser }: InspirationFormProps) {
  const [content, setContent] = useState("")
  const [description, setDescription] = useState("")
  const [tags, setTags] = useState("")
  const [category, setCategory] = useState("")
  const [status, setStatus] = useState("private")
  const [image, setImage] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [authReady, setAuthReady] = useState(parentAuthReady || false) // 使用父组件传递的认证状态

  // 用户自定义分类相关状态
  const [userCategories, setUserCategories] = useState<UserCategory[]>([])
  const [isAddingCategory, setIsAddingCategory] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState('')
  const [newCategoryColor, setNewCategoryColor] = useState('#6366f1')
  const [showAddCategoryDialog, setShowAddCategoryDialog] = useState(false)

  // 预定义颜色选项
  const colorOptions = [
    '#3b82f6', // 蓝色
    '#10b981', // 绿色
    '#f59e0b', // 黄色
    '#ef4444', // 红色
    '#8b5cf6', // 紫色
    '#06b6d4', // 青色
    '#f97316', // 橙色
    '#84cc16', // 青绿色
    '#ec4899', // 粉色
    '#6b7280'  // 灰色
  ]

  // 简化的认证状态监听 - 只在没有父组件传递认证状态时才自己检查
  useEffect(() => {
    if (parentAuthReady !== undefined) {
      // 如果父组件传递了认证状态，直接使用
      console.log("InspirationForm 使用父组件传递的认证状态:", parentAuthReady)
      setAuthReady(parentAuthReady)
      return
    }

    // 只有在父组件没有传递认证状态时才自己检查（保持向后兼容）
    console.log("=== InspirationForm useEffect 初始化（自主认证检查模式）===")
    let previousSessionId: string | null = null
    
    // 初始认证检查 - 添加超时保护
    const checkAuth = async () => {
      try {
        console.log("InspirationForm 开始初始认证检查...")
        
        // 添加超时保护，防止 getSession 卡住
        const sessionPromise = supabase.auth.getSession()
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('初始认证检查超时')), 3000) // 3秒超时
        })
        
        const { data: { session } } = await Promise.race([sessionPromise, timeoutPromise]) as any
        console.log("InspirationForm 初始认证检查:", session?.user?.id ? "已登录" : "未登录")
        console.log("InspirationForm 初始session详情:", session)
        setAuthReady(!!session?.user?.id)
        previousSessionId = session?.access_token || null
        console.log("InspirationForm 初始认证检查完成，authReady设置为:", !!session?.user?.id)
      } catch (error) {
        console.error("InspirationForm 认证检查失败:", error)
        // 如果初始检查失败，尝试从认证状态监听器获取状态
        console.log("InspirationForm 初始认证检查失败，将依赖认证状态监听器")
        setAuthReady(false)
      }
    }
    
    // 监听认证状态变化 - 固定模版（先设置监听器，再做初始检查）
    console.log("InspirationForm 设置认证状态监听器...")
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event: any, session: any) => {
      console.log("InspirationForm 认证状态变化:", event, session?.user?.id ? "已登录" : "未登录")
      console.log("InspirationForm 当前session详情:", session)
      
      const currentSessionId = session?.access_token || null
      const sessionChanged = currentSessionId !== previousSessionId
      
      console.log("InspirationForm Session变化检查:", {
        event,
        currentSessionId: currentSessionId?.substring(0, 20) + "...",
        previousSessionId: previousSessionId?.substring(0, 20) + "...",
        sessionChanged
      })
      
      if (event === 'SIGNED_OUT') {
        // 用户登出时重置表单 - 业务逻辑
        setContent('')
        setDescription('')
        setTags('')
        setCategory('')
        setStatus('private')
        setImage(null)
        setImagePreview(null)
        setAuthReady(false)
        previousSessionId = null
        console.log("InspirationForm authReady 设置为 false (SIGNED_OUT)")
      } else if (event === 'SIGNED_IN') {
        // 只有当session真正变化时才更新状态
        if (sessionChanged) {
          const isAuthenticated = !!(session?.user?.id)
          setAuthReady(isAuthenticated)
          previousSessionId = currentSessionId
          console.log(`InspirationForm authReady 设置为 ${isAuthenticated} (${event} - 真实变化)`)
        } else {
          console.log("InspirationForm Session未变化，忽略重复的 SIGNED_IN 事件")
        }
      } else if (event === 'TOKEN_REFRESHED' || event === 'INITIAL_SESSION') {
        // 对于token刷新和初始session，总是更新状态
        const isAuthenticated = !!(session?.user?.id)
        setAuthReady(isAuthenticated)
        previousSessionId = currentSessionId
        console.log(`InspirationForm authReady 设置为 ${isAuthenticated} (${event})`)
      }
    })
    
    // 延迟执行初始检查，确保监听器先设置好
    setTimeout(() => {
      checkAuth()
    }, 100)
    
    // 清理函数 - 固定模版
    return () => {
      subscription.unsubscribe()
    }
  }, [parentAuthReady, supabase.auth])

  // 当父组件传递的认证状态变化时，更新本地状态
  useEffect(() => {
    if (parentAuthReady !== undefined) {
      setAuthReady(parentAuthReady)
    }
  }, [parentAuthReady])

  // 当认证状态就绪时，加载用户分类
  useEffect(() => {
    if (authReady) {
      loadUserCategories()
    }
  }, [authReady])

  const defaultCategories = ["项目点子", "书籍摘录", "技术学习", "生活感悟"]

  // 加载用户自定义分类
  const loadUserCategories = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data, error } = await supabase
        .from('user_categories')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true })

      if (error) {
        console.error('加载用户分类失败:', error)
        return
      }

      // 去重逻辑：如果有重复的分类名，只保留第一个（最早创建的）
      const uniqueCategories: UserCategory[] = []
      const seenNames = new Set<string>()
      
      for (const category of data || []) {
        if (!seenNames.has(category.name)) {
          seenNames.add(category.name)
          uniqueCategories.push(category)
        } else {
          console.warn(`发现重复分类: ${category.name}，已跳过 ID: ${category.id}`)
        }
      }

      setUserCategories(uniqueCategories)
    } catch (error) {
      console.error('加载用户分类失败:', error)
    }
  }

  // 添加新分类
  const addCategory = async () => {
    if (!newCategoryName.trim()) return

    setIsAddingCategory(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('用户未登录')

      const { data, error } = await supabase
        .from('user_categories')
        .insert({
          user_id: user.id,
          name: newCategoryName.trim(),
          color: newCategoryColor
        })
        .select()
        .single()

      if (error) throw error

      setUserCategories(prev => [...prev, data])
      setNewCategoryName('')
      setNewCategoryColor('#6366f1')
      setShowAddCategoryDialog(false)
      setCategory(data.name) // 自动选择新创建的分类
    } catch (error) {
      console.error('添加分类失败:', error)
      alert('添加分类失败: ' + (error instanceof Error ? error.message : '未知错误'))
    } finally {
      setIsAddingCategory(false)
    }
  }

  // 删除分类
  const deleteCategory = async (categoryId: string) => {
    if (!confirm('确定要删除这个分类吗？')) return

    try {
      const { error } = await supabase
        .from('user_categories')
        .delete()
        .eq('id', categoryId)

      if (error) throw error

      setUserCategories(prev => prev.filter(cat => cat.id !== categoryId))
      // 如果删除的是当前选中的分类，清空选择
      const deletedCategory = userCategories.find(cat => cat.id === categoryId)
      if (deletedCategory && category === deletedCategory.name) {
        setCategory('')
      }
    } catch (error) {
      console.error('删除分类失败:', error)
      alert('删除分类失败: ' + (error instanceof Error ? error.message : '未知错误'))
    }
  }

  // 获取分类的颜色
  const getCategoryColor = (categoryName: string) => {
    const userCategory = userCategories.find(cat => cat.name === categoryName)
    return userCategory?.color || '#6b7280'
  }
  // const checkAuth = async () => {
  //   try {
  //     const { data: { session } } = await supabase.auth.getSession()
  //     console.log("InspirationForm 初始认证检查:", session?.user?.id ? "已登录" : "未登录")
  //     setAuthReady(!!session?.user?.id)
  //   } catch (error) {
  //     console.error("认证检查失败:", error)
  //     setAuthReady(false)
  //   }
  // }
  
  // checkAuth()

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setImage(file)
      const reader = new FileReader()
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const removeImage = () => {
    setImage(null)
    setImagePreview(null)
  }

  // 重试机制函数 - 解决切屏后连接问题的工具函数
  const retryWithBackoff = async (
    operation: () => Promise<any>,
    maxRetries: number = 3,
    baseDelay: number = 1000
  ): Promise<any> => {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`尝试第 ${attempt} 次操作...`)
        return await operation()
      } catch (error) {
        console.log(`第 ${attempt} 次尝试失败:`, error)
        
        if (attempt === maxRetries) {
          throw error
        }
        
        // 指数退避延迟
        const delay = baseDelay * Math.pow(2, attempt - 1)
        console.log(`等待 ${delay}ms 后重试...`)
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }
    throw new Error('重试次数已用完')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    console.log("=== handleSubmit 开始 ===")
    console.log("authReady:", authReady)
    e.preventDefault()
    console.log("preventDefault 完成")
    
    // 动态检查 Supabase 配置状态 - 解决切屏后状态不一致问题
    const checkSupabaseConfig = () => {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
      const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      return !!(supabaseUrl && supabaseKey && supabaseUrl !== 'your-project-url' && supabaseKey !== 'your-anon-key')
    }
    
    console.log("开始检查 Supabase 配置...")
    const currentSupabaseConfigured = checkSupabaseConfig()
    console.log("Supabase 配置检查完成:", currentSupabaseConfigured)
    
    // 实时认证状态检查 - 智能双重保险机制
    let realTimeAuthReady = authReady
    
    // 如果有父组件传递的认证状态，直接使用，跳过实时检查（避免超时问题）
    if (parentAuthReady !== undefined) {
      console.log("使用父组件传递的认证状态，跳过实时认证检查")
      realTimeAuthReady = authReady
    } else {
      // 只有在自主认证模式下才进行实时检查
      try {
        console.log("开始实时认证检查...")
        
        // 使用重试机制获取认证状态
        const { data: { session } } = await retryWithBackoff(async () => {
          const sessionPromise = supabase.auth.getSession()
          const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('getSession 超时')), 5000) // 5秒超时
          })
          return await Promise.race([sessionPromise, timeoutPromise]) as any
        }, 2, 1000) // 最多重试2次，基础延迟1秒
        
        console.log("getSession 调用完成")
        
        realTimeAuthReady = !!(session?.user?.id)
        console.log("实时认证检查结果:", realTimeAuthReady ? "已登录" : "未登录")
        
        // 如果实时检查与authReady状态不一致，更新authReady
        if (realTimeAuthReady !== authReady) {
          console.log(`认证状态不一致！authReady: ${authReady}, 实时检查: ${realTimeAuthReady}，正在同步...`)
          setAuthReady(realTimeAuthReady)
        }
      } catch (error) {
        console.error("实时认证检查失败 - 详细错误信息:")
        console.error("错误对象:", error)
        console.error("错误类型:", typeof error)
        console.error("错误消息:", error instanceof Error ? error.message : String(error))
        console.error("错误堆栈:", error instanceof Error ? error.stack : "无堆栈信息")
        realTimeAuthReady = false
      }
    }
    
    // 添加调试信息 - 开发调试代码
    console.log("=== 表单提交调试信息 ===")
    console.log("content:", content.trim())
    console.log("category:", category)
    console.log("isSupabaseConfigured:", currentSupabaseConfigured)
    console.log("authReady:", authReady)
    console.log("realTimeAuthReady:", realTimeAuthReady)
    console.log("content.trim():", !!content.trim())
    console.log("category:", !!category)
    
    // 检查提交条件 - 业务逻辑验证（使用实时认证状态）
    if (!content.trim() || !category || !currentSupabaseConfigured || !realTimeAuthReady) {
      console.log("提交被阻止，原因:")
      if (!content.trim()) console.log("- 内容为空")
      if (!category) console.log("- 分类未选择")
      if (!currentSupabaseConfigured) console.log("- Supabase 未配置")
      if (!realTimeAuthReady) console.log("- 认证状态未就绪")
      alert("请检查：\n" + 
            (!content.trim() ? "- 请输入内容\n" : "") +
            (!category ? "- 请选择分类\n" : "") +
            (!currentSupabaseConfigured ? "- Supabase 配置有问题\n" : "") +
            (!realTimeAuthReady ? "- 认证状态未就绪，请稍等\n" : ""))
      return
    }

    console.log("开始保存灵感...")
    setLoading(true)

    try {
      console.log("正在获取用户信息...")
      
      // 使用重试机制获取用户信息 - 解决切屏后连接问题
      const {
        data: { user },
      } = await retryWithBackoff(async () => {
        const getUserPromise = supabase.auth.getUser()
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('getUser 超时')), 8000) // 8秒超时
        })
        return await Promise.race([getUserPromise, timeoutPromise]) as any
      }, 3, 1000) // 最多重试3次，基础延迟1秒
      
      console.log("用户信息获取成功:", user ? "已登录" : "未登录")
      if (!user) throw new Error("用户未登录")

      // 确保用户资料存在 - 自定义业务逻辑
      console.log("正在检查用户资料...")
      const { data: existingProfile } = await retryWithBackoff(async () => {
        return await supabase
          .from("user_profiles")
          .select("id")
          .eq("id", user.id)
          .single()
      }, 2, 1000) // 最多重试2次
      
      console.log("用户资料检查完成:", existingProfile ? "存在" : "不存在")

      // 如果用户资料不存在，创建一个 - 自定义业务逻辑
      if (!existingProfile) {
        console.log("正在创建用户资料...")
        const { error: profileError } = await retryWithBackoff(async () => {
          return await supabase
            .from("user_profiles")
            .insert({
              id: user.id,
              username: user.user_metadata?.username || user.email?.split('@')[0] || '用户',
              full_name: user.user_metadata?.full_name || user.email || '匿名用户',
              avatar_url: user.user_metadata?.avatar_url || ''
            })
        }, 2, 1000) // 最多重试2次

        if (profileError) {
          console.error("Failed to create user profile:", profileError)
          // 不阻止灵感创建，只是记录错误
        } else {
          console.log("用户资料创建成功")
        }
      }

      let imageUrl = null

      // 如果有图片，先上传图片 - 文件上传逻辑
      if (image) {
        try {
          const fileExt = image.name.split(".").pop()
          // 使用更简单的文件名格式，避免文件夹结构导致的 RLS 问题
          const fileName = `${Date.now()}_${user.id}.${fileExt}`
          const bucketName = "inspiration-images"

          // 直接尝试上传图片，如果存储桶不存在会返回相应错误
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from(bucketName)
            .upload(fileName, image, {
              cacheControl: '3600',
              upsert: false
            })

          if (uploadError) {
            console.error("Upload error:", uploadError)
            
            // 检查是否是存储桶不存在的错误
            if (uploadError.message.includes('Bucket not found') || uploadError.message.includes('bucket does not exist')) {
              throw new Error(`图片存储空间未配置。请按以下步骤设置：\n\n1. 登录 Supabase 控制台\n2. 进入 Storage 页面\n3. 创建名为 "${bucketName}" 的存储桶\n4. 设置为公开访问\n\n或联系管理员完成配置。`)
            } else if (uploadError.message.includes('row-level security policy') || uploadError.message.includes('violates row-level security')) {
              throw new Error(`存储权限配置问题。请执行以下 SQL 脚本修复：\n\n在 Supabase SQL 编辑器中运行 scripts/setup-storage-bucket.sql\n\n或联系管理员配置存储权限。`)
            } else {
              throw new Error(`图片上传失败: ${uploadError.message}`)
            }
          }

          // 获取公共URL
          const {
            data: { publicUrl },
          } = supabase.storage.from(bucketName).getPublicUrl(fileName)

          imageUrl = publicUrl
        } catch (imageError) {
          console.error("Image upload failed:", imageError)
          // 图片上传失败时，询问用户是否继续保存文本内容
          const continueWithoutImage = confirm(`${imageError instanceof Error ? imageError.message : '图片上传失败'}\n\n是否继续保存文本内容（不包含图片）？`)
          if (!continueWithoutImage) {
            throw imageError
          }
          // 继续保存，但不包含图片
          imageUrl = null
        }
      }

      // 保存灵感数据 - 标准SQL插入操作
      console.log("正在保存灵感数据...")
      const insertData = {
        user_id: user.id,
        content: content.trim(),
        description: description.trim(),
        tags: tags
          .split(",")
          .map((tag) => tag.trim())
          .filter((tag) => tag),
        category,
        status,
        image_url: imageUrl,
      }
      console.log("插入数据:", insertData)

      const { error } = await retryWithBackoff(async () => {
        return await supabase.from("inspirations").insert(insertData)
      }, 3, 1000) // 最多重试3次，基础延迟1秒

      if (error) {
        console.error("数据插入失败:", error)
        throw error
      }

      console.log("灵感保存成功！")

      // 重置表单 - React状态管理
      setContent("")
      setDescription("")
      setTags("")
      setCategory("")
      setStatus("private")
      setImage(null)
      setImagePreview(null)

      onSuccess()
    } catch (error) {
      console.error("=== 保存失败详情 ===")
      console.error("Save failed:", error)
      console.error("Error details:", JSON.stringify(error, null, 2))
      console.error("Error type:", typeof error)
      console.error("Error constructor:", error?.constructor?.name)
      
      // 显示用户友好的错误信息
      let errorMessage = "未知错误"
      if (error instanceof Error) {
        errorMessage = error.message
      } else if (typeof error === 'string') {
        errorMessage = error
      } else if (error && typeof error === 'object' && 'message' in error) {
        errorMessage = String(error.message)
      }
      
      alert(`保存失败: ${errorMessage}`)
    } finally {
      console.log("重置 loading 状态")
      setLoading(false)
    }
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>新增灵感</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="content">内容</Label>
            <div className="flex gap-2">
              <Textarea
                id="content"
                placeholder="输入你的灵感内容或粘贴链接..."
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="flex-1"
                rows={3}
              />
              <div className="flex flex-col gap-2">
                <Label htmlFor="image-upload" className="cursor-pointer">
                  <div className="flex items-center justify-center w-20 h-20 border-2 border-dashed border-gray-300 rounded-lg hover:border-gray-400 transition-colors">
                    <Upload className="w-6 h-6 text-gray-400" />
                  </div>
                </Label>
                <Input id="image-upload" type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
              </div>
            </div>

            {imagePreview && (
              <div className="relative inline-block">
                <img
                  src={imagePreview || "/placeholder.svg"}
                  alt="预览"
                  className="w-32 h-32 object-cover rounded-lg"
                />
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0"
                  onClick={removeImage}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">描述</Label>
            <Input
              id="description"
              placeholder="为这个灵感添加简短描述..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="tags">标签</Label>
            <Input
              id="tags"
              placeholder="用逗号分隔多个标签，如：AI, 设计, 产品"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="category">分类</Label>
              <Dialog open={showAddCategoryDialog} onOpenChange={setShowAddCategoryDialog}>
                <DialogTrigger asChild>
                  <Button type="button" variant="outline" size="sm">
                    <Plus className="w-4 h-4 mr-1" />
                    添加分类
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>添加自定义分类</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="category-name">分类名称</Label>
                      <Input
                        id="category-name"
                        placeholder="输入分类名称"
                        value={newCategoryName}
                        onChange={(e) => setNewCategoryName(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>分类颜色</Label>
                      <div className="flex gap-2 flex-wrap">
                        {colorOptions.map((color) => (
                          <button
                            key={color}
                            type="button"
                            className={`w-8 h-8 rounded-full border-2 ${
                              newCategoryColor === color ? 'border-gray-800' : 'border-gray-300'
                            }`}
                            style={{ backgroundColor: color }}
                            onClick={() => setNewCategoryColor(color)}
                          />
                        ))}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        onClick={addCategory}
                        disabled={!newCategoryName.trim() || isAddingCategory}
                        className="flex-1"
                      >
                        {isAddingCategory ? '添加中...' : '添加'}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setShowAddCategoryDialog(false)}
                      >
                        取消
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger>
                <SelectValue placeholder="选择分类" />
              </SelectTrigger>
              <SelectContent>
                {/* 只显示用户分类（包含默认分类和自定义分类） */}
                {userCategories.map((cat) => (
                  <SelectItem key={`category-${cat.id}`} value={cat.name}>
                    <div className="flex items-center gap-2 w-full">
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: cat.color }}
                      />
                      <span className="flex-1">{cat.name}</span>
                      {/* 只有非默认分类才显示删除按钮 */}
                      {!defaultCategories.includes(cat.name) && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-4 w-4 p-0 hover:bg-red-100"
                          onClick={(e) => {
                            e.stopPropagation()
                            deleteCategory(cat.id)
                          }}
                        >
                          <X className="w-3 h-3 text-red-500" />
                        </Button>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {/* 显示当前选中分类的颜色标识 */}
            {category && (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <div 
                  className="w-3 h-3 rounded-full" 
                  style={{ backgroundColor: getCategoryColor(category) }}
                />
                当前分类：{category}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label>状态</Label>
            <RadioGroup value={status} onValueChange={setStatus}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="private" id="private" />
                <Label htmlFor="private">仅自己可见</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="public" id="public" />
                <Label htmlFor="public">公开</Label>
              </div>
            </RadioGroup>
          </div>

          <Button type="submit" className="w-full" disabled={loading || !content.trim() || !category}>
            {loading ? "保存中..." : "保存灵感"}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
