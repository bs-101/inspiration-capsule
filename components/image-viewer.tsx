"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { X, ZoomIn, ZoomOut, RotateCw, Download } from "lucide-react"

interface ImageViewerProps {
  src: string
  alt: string
  children: React.ReactNode
}

export function ImageViewer({ src, alt, children }: ImageViewerProps) {
  // 图片查看器状态管理 - React Hooks标准用法
  const [isOpen, setIsOpen] = useState(false)
  const [scale, setScale] = useState(1) // 缩放比例
  const [rotation, setRotation] = useState(0) // 旋转角度

  // 重置图片状态 - 自定义业务逻辑
  const resetImage = () => {
    setScale(1)
    setRotation(0)
  }

  // 放大图片 - 自定义业务逻辑
  const zoomIn = () => {
    setScale(prev => Math.min(prev + 0.25, 3))
  }

  // 缩小图片 - 自定义业务逻辑
  const zoomOut = () => {
    setScale(prev => Math.max(prev - 0.25, 0.25))
  }

  // 旋转图片 - 自定义业务逻辑
  const rotate = () => {
    setRotation(prev => (prev + 90) % 360)
  }

  // 下载图片 - 自定义业务逻辑
  const downloadImage = async () => {
    try {
      const response = await fetch(src)
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = alt || 'image'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error('下载失败:', error)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      setIsOpen(open)
      if (!open) resetImage() // 关闭时重置状态
    }}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="max-w-4xl w-full h-[90vh] p-0 bg-black/95">
        {/* 无障碍访问标题 - 对屏幕阅读器可见，但视觉上隐藏 */}
        <DialogHeader className="sr-only">
          <DialogTitle>{alt || '图片查看器'}</DialogTitle>
        </DialogHeader>

        {/* 工具栏 - 固定定位 */}
        <div className="absolute top-4 right-4 z-50 flex gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={zoomOut}
            className="bg-white/20 hover:bg-white/30 text-white border-white/20"
            title="缩小"
          >
            <ZoomOut className="h-4 w-4" />
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={zoomIn}
            className="bg-white/20 hover:bg-white/30 text-white border-white/20"
            title="放大"
          >
            <ZoomIn className="h-4 w-4" />
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={rotate}
            className="bg-white/20 hover:bg-white/30 text-white border-white/20"
            title="旋转"
          >
            <RotateCw className="h-4 w-4" />
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={downloadImage}
            className="bg-white/20 hover:bg-white/30 text-white border-white/20"
            title="下载图片"
          >
            <Download className="h-4 w-4" />
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setIsOpen(false)}
            className="bg-white/20 hover:bg-white/30 text-white border-white/20"
            title="关闭"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* 缩放比例显示 - 固定定位 */}
        <div className="absolute top-4 left-4 z-50">
          <div className="bg-white/20 text-white px-3 py-1 rounded-lg text-sm">
            {Math.round(scale * 100)}%
          </div>
        </div>

        {/* 图片容器 - 居中显示 */}
        <div className="w-full h-full flex items-center justify-center overflow-hidden">
          <img
            src={src}
            alt={alt}
            className="max-w-none transition-transform duration-200 ease-out cursor-move"
            style={{
              transform: `scale(${scale}) rotate(${rotation}deg)`,
              maxHeight: scale <= 1 ? '90%' : 'none',
              maxWidth: scale <= 1 ? '90%' : 'none'
            }}
            draggable={false}
          />
        </div>

        {/* 操作提示 - 固定定位 */}
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-50">
          <div className="bg-white/20 text-white px-4 py-2 rounded-lg text-sm text-center">
            滚轮缩放 • 拖拽移动 • ESC 关闭
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}