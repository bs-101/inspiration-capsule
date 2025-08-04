"use client"

import { useState } from "react"
import { supabase, isSupabaseConfigured } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertTriangle, Eye, EyeOff } from "lucide-react"

interface AuthModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
}

export function AuthModal({ isOpen, onClose, onSuccess }: AuthModalProps) {
  // 登录表单状态 - 自定义业务逻辑
  const [loginEmail, setLoginEmail] = useState("")
  const [loginPassword, setLoginPassword] = useState("")
  
  // 注册表单状态 - 自定义业务逻辑
  const [registerEmail, setRegisterEmail] = useState("")
  const [registerPassword, setRegisterPassword] = useState("")
  const [registerConfirmPassword, setRegisterConfirmPassword] = useState("")
  const [username, setUsername] = useState("")
  
  // UI状态管理 - 自定义业务逻辑
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  // 重置表单 - 自定义业务逻辑
  const resetForm = () => {
    setLoginEmail("")
    setLoginPassword("")
    setRegisterEmail("")
    setRegisterPassword("")
    setRegisterConfirmPassword("")
    setUsername("")
    setError("")
    setShowPassword(false)
    setShowConfirmPassword(false)
  }

  // 处理登录 - Supabase Auth API标准调用
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault() // React标准事件处理
    if (!isSupabaseConfigured) {
      setError("请先配置 Supabase 环境变量")
      return
    }

    setLoading(true)
    setError("")

    try {
      // Supabase Auth API标准登录方法
      const { data, error } = await supabase.auth.signInWithPassword({
        email: loginEmail,
        password: loginPassword,
      })

      if (error) throw error

      // 登录成功处理 - 自定义业务逻辑
      resetForm()
      onClose()
      onSuccess?.()
    } catch (error: any) {
      console.error("Login failed:", error)
      setError(error.message || "登录失败，请检查邮箱和密码")
    } finally {
      setLoading(false)
    }
  }

  // 处理注册 - Supabase Auth API标准调用
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault() // React标准事件处理
    if (!isSupabaseConfigured) {
      setError("请先配置 Supabase 环境变量")
      return
    }

    // 表单验证 - 自定义业务逻辑
    if (registerPassword !== registerConfirmPassword) {
      setError("两次输入的密码不一致")
      return
    }

    if (registerPassword.length < 6) {
      setError("密码长度至少6位")
      return
    }

    setLoading(true)
    setError("")

    try {
      // 获取重定向域名 - 自定义业务逻辑（优先使用环境变量配置的生产域名）
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL
      const currentOrigin = siteUrl || (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000')
      
      // Supabase Auth API标准注册方法（带重定向配置）
      const { data, error } = await supabase.auth.signUp({
        email: registerEmail,
        password: registerPassword,
        options: {
          data: {
            username: username, // 自定义用户元数据
            full_name: username,
          },
          // 邮箱确认重定向URL - Supabase Auth 配置
          emailRedirectTo: `${currentOrigin}/auth/callback`,
        },
      })

      if (error) throw error

      // 注册成功处理 - 自定义业务逻辑
      if (data.user && !data.user.email_confirmed_at) {
        setError("注册成功！请检查邮箱并点击确认链接完成注册。")
      } else {
        resetForm()
        onClose()
        onSuccess?.()
      }
    } catch (error: any) {
      console.error("Registration failed:", error)
      setError(error.message || "注册失败，请重试")
    } finally {
      setLoading(false)
    }
  }

  // 关闭模态框时重置表单 - 自定义业务逻辑
  const handleClose = () => {
    resetForm()
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>登录 / 注册</DialogTitle>
        </DialogHeader>

        {!isSupabaseConfigured && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              需要配置 Supabase 环境变量才能使用登录功能
            </AlertDescription>
          </Alert>
        )}

        <Tabs defaultValue="login" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="login">登录</TabsTrigger>
            <TabsTrigger value="register">注册</TabsTrigger>
          </TabsList>

          {/* 登录表单 */}
          <TabsContent value="login">
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="login-email">邮箱</Label>
                <Input
                  id="login-email"
                  type="email"
                  placeholder="输入邮箱地址"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  required
                  disabled={!isSupabaseConfigured}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="login-password">密码</Label>
                <div className="relative">
                  <Input
                    id="login-password"
                    type={showPassword ? "text" : "password"}
                    placeholder="输入密码"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    required
                    disabled={!isSupabaseConfigured}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={!isSupabaseConfigured}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <Button 
                type="submit" 
                className="w-full" 
                disabled={loading || !isSupabaseConfigured || !loginEmail || !loginPassword}
              >
                {loading ? "登录中..." : "登录"}
              </Button>
            </form>
          </TabsContent>

          {/* 注册表单 */}
          <TabsContent value="register">
            <form onSubmit={handleRegister} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username">用户名</Label>
                <Input
                  id="username"
                  type="text"
                  placeholder="输入用户名"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  disabled={!isSupabaseConfigured}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="register-email">邮箱</Label>
                <Input
                  id="register-email"
                  type="email"
                  placeholder="输入邮箱地址"
                  value={registerEmail}
                  onChange={(e) => setRegisterEmail(e.target.value)}
                  required
                  disabled={!isSupabaseConfigured}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="register-password">密码</Label>
                <div className="relative">
                  <Input
                    id="register-password"
                    type={showPassword ? "text" : "password"}
                    placeholder="输入密码（至少6位）"
                    value={registerPassword}
                    onChange={(e) => setRegisterPassword(e.target.value)}
                    required
                    disabled={!isSupabaseConfigured}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={!isSupabaseConfigured}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirm-password">确认密码</Label>
                <div className="relative">
                  <Input
                    id="confirm-password"
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="再次输入密码"
                    value={registerConfirmPassword}
                    onChange={(e) => setRegisterConfirmPassword(e.target.value)}
                    required
                    disabled={!isSupabaseConfigured}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    disabled={!isSupabaseConfigured}
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <Button 
                type="submit" 
                className="w-full" 
                disabled={loading || !isSupabaseConfigured || !registerEmail || !registerPassword || !registerConfirmPassword || !username}
              >
                {loading ? "注册中..." : "注册"}
              </Button>
            </form>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}