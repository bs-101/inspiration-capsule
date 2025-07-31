"use client"

import { useState } from "react"
import { PixelAvatar } from "pixel-avatar-lib" // 第三方库导入 - 固定语法
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Palette } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { useToast } from "@/hooks/use-toast"

interface PixelAvatarGeneratorProps {
  onSave?: () => void // 保存成功后的回调函数 - 自定义业务逻辑
  currentDna?: string // 当前用户的DNA字符串 - 自定义业务逻辑
}

export function PixelAvatarGenerator({ onSave, currentDna }: PixelAvatarGeneratorProps) {
  // React状态管理 - 固定语法模式
  const [dna, setDna] = useState(currentDna || "0-1-2-3-4-5") // DNA字符串状态
  const [customDna, setCustomDna] = useState("") // 自定义DNA输入状态
  const [isOpen, setIsOpen] = useState(false) // 弹窗开关状态
  const [isSaving, setIsSaving] = useState(false) // 保存状态
  const { toast } = useToast() // Toast通知钩子 - 固定语法

  // 随机生成DNA字符串 - 自定义业务逻辑
  const generateRandomDna = () => {
    const randomNumbers = Array.from({ length: 6 }, () => Math.floor(Math.random() * 10))
    const newDna = randomNumbers.join("-")
    setDna(newDna)
  }

  // 应用自定义DNA - 自定义业务逻辑
  const applyCustomDna = () => {
    if (customDna.trim()) {
      setDna(customDna.trim())
      setCustomDna("")
    }
  }

  // 测试网络连接 - 自定义业务逻辑，帮助用户诊断问题
  const testConnection = async () => {
    try {
      console.log('开始测试网络连接...')
      toast({
        title: "测试中",
        description: "正在测试网络连接...",
      })
      
      // 测试 Supabase 连接 - Supabase API调用
      const { data, error } = await Promise.race([
        supabase.auth.getSession(),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('连接超时')), 3000)
        )
      ]) as any
      
      if (error) {
        throw error
      }
      
      toast({
        title: "连接正常",
        description: "网络连接和Supabase服务正常",
      })
      
    } catch (error: any) {
      console.error('网络连接测试失败:', error)
      toast({
        title: "连接异常",
        description: `网络连接测试失败: ${error.message}`,
        variant: "destructive",
      })
    }
  }
  const getUserWithRetry = async (maxRetries = 3) => {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`第 ${attempt} 次尝试获取用户信息...`)
        
        // 优先使用 getUser，它更直接可靠 - Supabase认证API调用
        console.log('尝试 getUser...')
        const { data: { user }, error: userError } = await Promise.race([
          supabase.auth.getUser(),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('getUser 调用超时')), 8000) // 增加到8秒
          )
        ]) as any
        
        if (!userError && user) {
          console.log('通过 getUser 获取用户信息成功:', user.id)
          return user
        }
        
        // 如果 getUser 失败，尝试 getSession - Supabase认证API调用
        console.log('getUser 失败，尝试 getSession...')
        const { data: { session }, error: sessionError } = await Promise.race([
          supabase.auth.getSession(),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('getSession 调用超时')), 8000) // 增加到8秒
          )
        ]) as any
        
        if (!sessionError && session?.user) {
          console.log('通过 getSession 获取用户信息成功:', session.user.id)
          return session.user
        }
        
        throw new Error(`认证失败: ${userError?.message || sessionError?.message || '未知错误'}`)
        
      } catch (error) {
        console.error(`第 ${attempt} 次尝试失败:`, error)
        
        if (attempt === maxRetries) {
          throw error
        }
        
        // 等待递增时间后重试 - 网络重试策略
        const waitTime = attempt * 1500 // 1.5秒, 3秒, 4.5秒
        console.log(`等待 ${waitTime/1000} 秒后重试...`)
        await new Promise(resolve => setTimeout(resolve, waitTime))
      }
    }
  }

  // 保存头像到数据库 - 自定义业务逻辑
  const saveAvatar = async () => {
    try {
      setIsSaving(true)
      console.log('开始保存头像流程...')
      
      // 显示加载提示 - 用户体验优化
      toast({
        title: "正在保存",
        description: "正在保存您的头像，请稍候...",
      })
      
      // 获取用户信息，带重试机制 - 自定义业务逻辑
      const user = await getUserWithRetry()
      
      if (!user) {
        throw new Error('无法获取用户信息')
      }
      
      console.log('用户信息获取成功:', user.id)
      
      // 构建头像URL - 自定义业务逻辑，使用pixel前缀标识像素头像
      const avatarUrl = `pixel:${dna}`
      console.log('准备更新数据库，avatarUrl:', avatarUrl)
      
      // 更新数据库 - Supabase数据库API调用
      const { error } = await supabase
        .from('user_profiles')
        .update({ avatar_url: avatarUrl })
        .eq('id', user.id)
      
      console.log('数据库更新结果，error:', error)
      
      if (error) {
        console.error('保存头像失败:', error)
        toast({
          title: "错误",
          description: `保存头像失败: ${error.message}`,
          variant: "destructive",
        })
      } else {
        console.log('头像保存成功')
        toast({
          title: "成功",
          description: "头像保存成功！",
        })
        setIsOpen(false)
        onSave?.() // 回调函数，通知父组件更新
      }
    } catch (error: any) {
      console.error('保存头像时发生错误:', error)
      
      // 根据错误类型提供不同的用户提示 - 用户体验优化
      let errorMessage = "保存头像时发生错误，请重试"
      if (error.message.includes('超时')) {
        errorMessage = "网络连接超时，请检查网络后重试"
      } else if (error.message.includes('认证')) {
        errorMessage = "登录状态已过期，请重新登录"
      }
      
      toast({
        title: "错误",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
      console.log('保存流程结束，重置 isSaving 状态')
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      {/* 触发按钮 - UI组件固定语法 */}
      <DialogTrigger asChild>
        <div className="flex items-center w-full px-2 py-1.5 text-sm cursor-pointer hover:bg-accent rounded-sm">
          <Palette className="mr-2 h-4 w-4" />
          自定义像素头像
        </div>
      </DialogTrigger>
      
      {/* 弹窗内容 - UI组件固定语法 */}
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>自定义像素头像</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* 当前头像预览 - 使用第三方库组件 */}
          <div className="text-center">
            <h3 className="text-lg font-semibold mb-3">当前头像</h3>
            <div className="flex justify-center">
              <div className="p-4 border rounded-lg bg-gray-50">
                <PixelAvatar 
                  dna={dna} 
                  size={120}
                  className="rounded-lg"
                />
              </div>
            </div>
            
            {/* DNA显示 - 自定义业务逻辑 */}
            <div className="mt-3">
              <p className="text-sm text-gray-600">DNA代码</p>
              <p className="font-mono text-lg">{dna}</p>
            </div>
          </div>

          {/* 示例头像展示区域 - 自定义业务逻辑 */}
          <div>
            <h3 className="text-lg font-semibold mb-3">头像画廊</h3>
            <div className="grid grid-cols-4 gap-3">
              {/* 预设示例头像 - 固定的DNA组合 */}
              {[
                { dna: "0-1-2-3-4-5", name: "基础头像" },
                { dna: "1-3-5-7-9-2", name: "金发微笑" },
                { dna: "2-4-6-8-1-3", name: "深色皮肤" },
                { dna: "9-8-7-6-5-4", name: "红帽+盾牌" },
                { dna: "3-6-9-2-5-8", name: "绿色莫霍克+法杖" },
                { dna: "5-2-8-4-7-1", name: "黑发西装+剑" },
                { dna: "7-1-4-9-3-6", name: "彩虹组合" },
                { dna: "8-5-2-7-4-9", name: "终极风格" }
              ].map((example, index) => (
                <div 
                  key={index}
                  className="text-center cursor-pointer group"
                  onClick={() => setDna(example.dna)}
                >
                  <div className="p-2 border rounded-lg bg-gray-50 hover:bg-blue-50 transition-colors group-hover:border-blue-300">
                    <PixelAvatar 
                      dna={example.dna} 
                      size={60}
                      className="rounded-lg mx-auto"
                    />
                  </div>
                  <p className="text-xs mt-1 text-gray-600 group-hover:text-blue-600 transition-colors">
                    {example.name}
                  </p>
                  <p className="text-xs text-gray-400 font-mono">
                    {example.dna}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* 关于工具说明 - 自定义业务逻辑 */}
          {/* <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-4 border border-blue-100">
            <h4 className="font-semibold text-gray-800 mb-2">关于此工具</h4>
            <p className="text-sm text-gray-600 leading-relaxed">
              我们的像素头像生成器让您创建令人惊叹的8位风格NFT角色，非常适合区块链项目、游戏开发或数字艺术收藏。
              每个角色由6个可自定义部分组成，每个部分有10种变化，为您提供无限的创意可能性。
            </p>
          </div> */}
          
          {/* 操作按钮区域 - 自定义业务逻辑 */}
          <div className="space-y-4">
            {/* 随机生成按钮 */}
            <Button 
              onClick={generateRandomDna} 
              className="w-full"
              variant="outline"
            >
              随机生成
            </Button>
            
            {/* 自定义DNA输入 */}
            <div className="flex gap-2">
              <Input
                placeholder="自定义DNA (如: 1-2-3-4-5-6)"
                value={customDna}
                onChange={(e) => setCustomDna(e.target.value)}
                className="flex-1"
              />
              <Button onClick={applyCustomDna} size="sm">
                应用
              </Button>
            </div>
            
            {/* 保存按钮 */}
            <Button 
              onClick={saveAvatar} 
              className="w-full"
              disabled={isSaving}
            >
              {isSaving ? "保存中..." : "保存头像"}
            </Button>
            
            {/* 网络测试按钮 - 用户体验优化，帮助诊断连接问题 */}
            <Button 
              onClick={testConnection} 
              className="w-full"
              variant="ghost"
              size="sm"
            >
              测试网络连接
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}