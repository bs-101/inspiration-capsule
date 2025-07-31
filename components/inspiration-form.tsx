"use client"

import type React from "react"
import { useState } from "react"
import { supabase, isSupabaseConfigured } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Upload, X } from "lucide-react"

interface InspirationFormProps {
  onSuccess: () => void
}

export function InspirationForm({ onSuccess }: InspirationFormProps) {
  const [content, setContent] = useState("")
  const [description, setDescription] = useState("")
  const [tags, setTags] = useState("")
  const [category, setCategory] = useState("")
  const [status, setStatus] = useState("private")
  const [image, setImage] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const categories = ["项目点子", "书籍摘录", "技术学习", "生活感悟"]

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!content.trim() || !category || !isSupabaseConfigured) return

    setLoading(true)

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) throw new Error("用户未登录")

      // 确保用户资料存在 - 自定义业务逻辑
      const { data: existingProfile } = await supabase
        .from("user_profiles")
        .select("id")
        .eq("id", user.id)
        .single()

      // 如果用户资料不存在，创建一个 - 自定义业务逻辑
      if (!existingProfile) {
        const { error: profileError } = await supabase
          .from("user_profiles")
          .insert({
            id: user.id,
            username: user.user_metadata?.username || user.email?.split('@')[0] || '用户',
            full_name: user.user_metadata?.full_name || user.email || '匿名用户',
            avatar_url: user.user_metadata?.avatar_url || ''
          })

        if (profileError) {
          console.error("Failed to create user profile:", profileError)
          // 不阻止灵感创建，只是记录错误
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
      const { error } = await supabase.from("inspirations").insert({
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
      })

      if (error) throw error

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
      console.error("Save failed:", error)
      console.error("Error details:", JSON.stringify(error, null, 2))
      // 显示用户友好的错误信息
      alert(`保存失败: ${error instanceof Error ? error.message : '未知错误'}`)
    } finally {
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
            <Label htmlFor="category">分类</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger>
                <SelectValue placeholder="选择分类" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
