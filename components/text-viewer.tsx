"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Copy, Check } from "lucide-react"
import { useState } from "react"

interface TextViewerProps {
  title: string
  content: string
  children: React.ReactNode
}

export function TextViewer({ title, content, children }: TextViewerProps) {
  // 复制状态管理 - React Hooks标准用法
  const [isCopied, setIsCopied] = useState(false)

  // 复制文本到剪贴板 - 自定义业务逻辑
  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(content)
      setIsCopied(true)
      setTimeout(() => setIsCopied(false), 2000) // 2秒后重置状态
    } catch (err) {
      console.error('复制失败:', err)
    }
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="max-w-2xl w-full max-h-[80vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-lg font-semibold text-gray-800">
              {title}
            </DialogTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={copyToClipboard}
              className="h-8 w-8 p-0"
              title="复制内容"
            >
              {isCopied ? (
                <Check className="h-4 w-4 text-green-600" />
              ) : (
                <Copy className="h-4 w-4 text-gray-600" />
              )}
            </Button>
          </div>
        </DialogHeader>
        
        {/* 滚动内容区域 - 使用ScrollArea组件 */}
        <ScrollArea className="flex-1 mt-4">
          <div className="pr-4">
            <p className="text-gray-700 leading-relaxed whitespace-pre-wrap text-sm">
              {content}
            </p>
          </div>
        </ScrollArea>

        {/* 底部信息 - 固定定位 */}
        <div className="flex-shrink-0 mt-4 pt-4 border-t border-gray-200">
          <p className="text-xs text-gray-500 text-center">
            字符数: {content.length} • 点击右上角复制按钮可复制全文
          </p>
        </div>
      </DialogContent>
    </Dialog>
  )
}