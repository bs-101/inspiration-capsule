"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"
import { Globe, Lock, ExternalLink, ChevronDown, ChevronUp, Trash2, User, Copy, Check, Expand, Eye } from "lucide-react"
import { PixelAvatar } from "pixel-avatar-lib" // 添加像素头像库导入 - 固定语法
import { ImageViewer } from "@/components/image-viewer" // 图片查看器组件 - 自定义组件
import { TextViewer } from "@/components/text-viewer" // 文本查看器组件 - 自定义组件
import type { InspirationCard } from "@/lib/supabase"

interface InspirationCardProps {
  inspiration: InspirationCard
  onDelete?: (id: string) => void
  showActions?: boolean
  currentUserId?: string // 添加当前用户ID用于权限检查 - 安全控制
}

export function InspirationCardComponent({ inspiration, onDelete, showActions = false, currentUserId }: InspirationCardProps) {
  // 所有 Hooks 必须在组件顶部定义 - React Hooks 规则
  // 展开状态管理 - React Hooks标准用法
  const [isExpanded, setIsExpanded] = useState(false)
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false)
  const [isCopied, setIsCopied] = useState(false) // 复制状态管理

  // 复制卡片内容到剪贴板 - 自定义业务逻辑
  const copyToClipboard = async () => {
    try {
      const content = `${inspiration.description ? inspiration.description + '\n\n' : ''}${inspiration.content}\n\n标签: ${inspiration.tags.join(', ')}\n分类: ${inspiration.category}`
      await navigator.clipboard.writeText(content)
      setIsCopied(true)
      setTimeout(() => setIsCopied(false), 2000) // 2秒后重置状态
    } catch (err) {
      console.error('复制失败:', err)
    }
  }

  // 文本截断逻辑 - 自定义业务逻辑
  const truncateText = (text: string, maxLength: number) => {
    if (text.length <= maxLength) return text
    return text.slice(0, maxLength) + "..."
  }

  // 判断内容是否过长 - 自定义业务逻辑
  const isLongContent = inspiration.content.length > 150
  const isLongDescription = inspiration.description && inspiration.description.length > 100

  // 检查是否为链接 - 自定义业务逻辑
  const isLink = inspiration.content.startsWith("http://") || inspiration.content.startsWith("https://")

  // 检查删除权限 - 安全控制逻辑
  const canDelete = currentUserId && inspiration.user_id === currentUserId

  // 格式化日期 - 自定义业务逻辑
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60))
    
    if (diffInHours < 1) return "刚刚"
    if (diffInHours < 24) return `${diffInHours}小时前`
    if (diffInHours < 24 * 7) return `${Math.floor(diffInHours / 24)}天前`
    return date.toLocaleDateString('zh-CN')
  }

  // 获取用户显示名称 - 自定义业务逻辑
  const getUserDisplayName = () => {
    return inspiration.user_profiles?.username || 
           inspiration.user_profiles?.full_name || 
           inspiration.user_profile?.username || 
           inspiration.user_profile?.full_name || 
           inspiration.username ||
           "匿名用户"
  }

  // 获取用户头像字母 - 自定义业务逻辑
  const getUserInitial = () => {
    const displayName = getUserDisplayName()
    return displayName.charAt(0).toUpperCase()
  }

  // 获取用户头像URL - 自定义业务逻辑
  const getUserAvatarUrl = (): string => {
    const avatarUrl = inspiration.user_profiles?.avatar_url || inspiration.user_profile?.avatar_url
    // 如果是像素头像，返回占位符
    if (avatarUrl?.startsWith('pixel:')) {
      return "/placeholder.svg"
    }
    // 否则返回传统头像URL
    return avatarUrl || "/placeholder.svg"
  }

  // 获取像素头像DNA - 自定义业务逻辑
  const getPixelAvatarDna = () => {
    const avatarUrl = inspiration.user_profiles?.avatar_url || inspiration.user_profile?.avatar_url
    if (avatarUrl?.startsWith('pixel:')) {
      return avatarUrl.replace('pixel:', '')
    }
    return null
  }

  // 渲染内容区域 - 自定义业务逻辑
  const renderContent = () => {
    if (inspiration.image_url) {
      return (
        <div className="space-y-2">
          <div className="relative overflow-hidden rounded-lg group/image">
            <ImageViewer 
              src={inspiration.image_url || "/placeholder.svg"} 
              alt="灵感图片"
            >
              <div className="relative cursor-pointer">
                <img
                  src={inspiration.image_url || "/placeholder.svg"}
                  alt="灵感图片"
                  className="w-full h-32 object-cover transition-transform duration-300 hover:scale-105"
                />
                {/* 放大图标覆盖层 - 悬浮时显示 */}
                <div className="absolute inset-0 bg-black/0 group-hover/image:bg-black/20 transition-all duration-200 flex items-center justify-center">
                  <div className="opacity-0 group-hover/image:opacity-100 transition-opacity duration-200">
                    <div className="bg-white/90 rounded-full p-2">
                      <Expand className="h-4 w-4 text-gray-700" />
                    </div>
                  </div>
                </div>
              </div>
            </ImageViewer>
          </div>
          {inspiration.content && (
            <div className="space-y-1">
              <p className="text-sm text-gray-700 leading-relaxed">
                {isLongContent && !isExpanded 
                  ? truncateText(inspiration.content, 60)
                  : inspiration.content
                }
              </p>
              {isLongContent && (
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="h-auto p-0 text-blue-600 hover:text-blue-800 text-xs"
                  >
                    {isExpanded ? (
                      <>收起 <ChevronUp className="w-3 h-3 ml-1" /></>
                    ) : (
                      <>展开 <ChevronDown className="w-3 h-3 ml-1" /></>
                    )}
                  </Button>
                  <TextViewer title="完整内容" content={inspiration.content}>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-auto p-0 text-purple-600 hover:text-purple-800 text-xs"
                    >
                      <Eye className="w-3 h-3 mr-1" />
                      弹窗查看
                    </Button>
                  </TextViewer>
                </div>
              )}
            </div>
          )}
        </div>
      )
    }

    if (isLink) {
      return (
        <div>
          <a
            href={inspiration.content}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 p-2 bg-blue-50 hover:bg-blue-100 rounded-lg border border-blue-200 transition-colors duration-200"
          >
            <ExternalLink className="w-3 h-3 text-blue-600 flex-shrink-0" />
            <span className="text-blue-700 hover:text-blue-900 text-sm break-all line-clamp-2">
              {truncateText(inspiration.content, 60)}
            </span>
          </a>
        </div>
      )
    }

    return (
      <div className="space-y-1">
        <p className="text-gray-800 leading-relaxed text-sm whitespace-pre-wrap">
          {isLongContent && !isExpanded 
            ? truncateText(inspiration.content, 100)
            : inspiration.content
          }
        </p>
        {isLongContent && (
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
              className="h-auto p-0 text-blue-600 hover:text-blue-800 text-xs"
            >
              {isExpanded ? (
                <>收起 <ChevronUp className="w-3 h-3 ml-1" /></>
              ) : (
                <>展开 <ChevronDown className="w-3 h-3 ml-1" /></>
              )}
            </Button>
            <TextViewer title="完整内容" content={inspiration.content}>
              <Button
                variant="ghost"
                size="sm"
                className="h-auto p-0 text-purple-600 hover:text-purple-800 text-xs"
              >
                <Eye className="w-3 h-3 mr-1" />
                弹窗查看
              </Button>
            </TextViewer>
          </div>
        )}
      </div>
    )
  }

  return (
    <Card className="group relative overflow-hidden border-0 shadow-lg hover:shadow-2xl transition-all duration-300 bg-white/90 backdrop-blur-sm card-hover h-96 flex flex-col">
      {/* 操作按钮区域 - 悬浮时显示 */}
      <div className="absolute top-3 right-3 z-10 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
        {/* 复制按钮 */}
        <Button
          variant="outline"
          size="sm"
          className="h-8 w-8 p-0 bg-white/90 hover:bg-white border-gray-200"
          onClick={copyToClipboard}
          title="复制内容"
        >
          {isCopied ? (
            <Check className="h-4 w-4 text-green-600" />
          ) : (
            <Copy className="h-4 w-4 text-gray-600" />
          )}
        </Button>
        
        {/* 删除按钮 - 带二次确认和权限检查 */}
        {showActions && canDelete && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="destructive"
                size="sm"
                className="h-8 w-8 p-0"
                title="删除灵感"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="bg-white/95 backdrop-blur-sm border-0 shadow-2xl">
              <AlertDialogHeader>
                <AlertDialogTitle className="text-xl font-semibold text-gray-800 flex items-center gap-2">
                  <Trash2 className="h-5 w-5 text-red-500" />
                  确认删除灵感
                </AlertDialogTitle>
                <AlertDialogDescription className="text-gray-600 leading-relaxed">
                  你确定要删除这个灵感吗？此操作无法撤销。
                </AlertDialogDescription>
                <div className="mt-3 p-3 bg-gray-50 rounded-lg border-l-4 border-red-400">
                  <div className="text-sm text-gray-700 font-medium">即将删除的内容：</div>
                  <div className="text-sm text-gray-600 mt-1 line-clamp-2">
                    {inspiration.description || inspiration.content}
                  </div>
                </div>
              </AlertDialogHeader>
              <AlertDialogFooter className="gap-3">
                <AlertDialogCancel className="bg-gray-100 hover:bg-gray-200 text-gray-700 border-0">
                  取消
                </AlertDialogCancel>
                <AlertDialogAction 
                  onClick={() => onDelete?.(inspiration.id)}
                  className="bg-red-500 hover:bg-red-600 text-white border-0"
                >
                  确认删除
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>

      <CardContent className="p-4 flex flex-col h-full">
        {/* 用户信息区域 - 固定高度 */}
        <div className="flex items-center space-x-3 flex-shrink-0 mb-3">
          <Avatar className="h-8 w-8">
            {getPixelAvatarDna() ? (
              // 显示像素头像 - 使用第三方库组件
              <PixelAvatar 
                dna={getPixelAvatarDna()!} 
                size={32}
                className="w-full h-full rounded-full"
              />
            ) : (
              // 显示传统头像 - 标准Avatar组件
              <>
                <AvatarImage
                  src={getUserAvatarUrl()}
                  alt={getUserDisplayName()}
                />
                <AvatarFallback className="bg-blue-500 text-white text-sm">
                  {getUserInitial()}
                </AvatarFallback>
              </>
            )}
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-700 truncate">
              {getUserDisplayName()}
            </p>
            <p className="text-xs text-gray-500">
              {formatDate(inspiration.created_at)}
            </p>
          </div>
          <div className="flex items-center">
            {inspiration.status === "public" ? (
              <Globe className="h-4 w-4 text-green-500" />
            ) : (
              <Lock className="h-4 w-4 text-gray-400" />
            )}
          </div>
        </div>

        {/* 描述信息 - 固定区域 */}
        {inspiration.description && (
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-3 border border-blue-100 flex-shrink-0 mb-3">
            <p className="text-sm font-medium text-gray-800 leading-relaxed">
              {isLongDescription && !isDescriptionExpanded
                ? truncateText(inspiration.description, 60)
                : inspiration.description}
            </p>
            {isLongDescription && (
              <div className="flex gap-2 mt-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsDescriptionExpanded(!isDescriptionExpanded)}
                  className="h-auto p-0 text-blue-600 hover:text-blue-800 text-xs"
                >
                  {isDescriptionExpanded ? (
                    <>收起 <ChevronUp className="w-3 h-3 ml-1" /></>
                  ) : (
                    <>展开 <ChevronDown className="w-3 h-3 ml-1" /></>
                  )}
                </Button>
                <TextViewer title="完整描述" content={inspiration.description}>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-auto p-0 text-purple-600 hover:text-purple-800 text-xs"
                  >
                    <Eye className="w-3 h-3 mr-1" />
                    弹窗查看
                  </Button>
                </TextViewer>
              </div>
            )}
          </div>
        )}

        {/* 主要内容区域 - 可滚动的弹性区域 */}
        <div className="flex-1 overflow-hidden">
          <div className="h-full overflow-y-auto">
            {renderContent()}
          </div>
        </div>

        {/* 底部固定区域 - 标签和分类 */}
        <div className="pt-3 border-t border-gray-100 flex-shrink-0 mt-3">
          <div className="flex flex-wrap gap-2">
            {inspiration.tags.slice(0, 3).map((tag, index) => (
              <Badge
                key={index}
                variant="secondary"
                className="text-xs px-2 py-1 bg-blue-100 text-blue-700 hover:bg-blue-200 transition-colors"
              >
                {tag}
              </Badge>
            ))}
            {inspiration.tags.length > 3 && (
              <Badge variant="outline" className="text-xs px-2 py-1">
                +{inspiration.tags.length - 3}
              </Badge>
            )}
            <Badge
              variant="outline"
              className="text-xs px-2 py-1 bg-purple-100 text-purple-700 border-purple-200"
            >
              {inspiration.category}
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// 默认导出和命名导出 - TypeScript/React 标准导出模式
export default InspirationCardComponent
export { InspirationCardComponent as InspirationCard }
