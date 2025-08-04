'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

/**
 * 认证回调页面 - 处理邮箱确认后的重定向
 * 这是 Supabase Auth 的标准回调处理模式
 */
export default function AuthCallback() {
  const router = useRouter()
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [message, setMessage] = useState('')

  useEffect(() => {
    // 处理认证回调 - Supabase Auth 标准流程
    const handleAuthCallback = async () => {
      try {
        // 从 URL 获取认证参数 - Supabase Auth 固定模式
        const { data, error } = await supabase.auth.getSession()
        
        if (error) {
          console.error('认证回调错误:', error)
          setStatus('error')
          setMessage('邮箱确认失败，请重试')
          return
        }

        if (data.session) {
          // 认证成功 - 自定义业务逻辑
          console.log('邮箱确认成功，用户已登录:', data.session.user.email)
          setStatus('success')
          setMessage('邮箱确认成功！正在跳转...')
          
          // 延迟跳转到仪表板 - 用户体验优化
          setTimeout(() => {
            router.push('/dashboard')
          }, 2000)
        } else {
          // 处理 URL 中的认证代码 - Supabase Auth 标准方法
          const urlParams = new URLSearchParams(window.location.search)
          const code = urlParams.get('code')
          
          if (code) {
            // 使用授权码交换会话 - Supabase Auth API
            const { data: sessionData, error: sessionError } = await supabase.auth.exchangeCodeForSession(code)
            
            if (sessionError) {
              console.error('会话交换错误:', sessionError)
              setStatus('error')
              setMessage('邮箱确认失败，请重试')
              return
            }
            
            if (sessionData.session) {
              console.log('邮箱确认成功，用户已登录:', sessionData.session.user.email)
              setStatus('success')
              setMessage('邮箱确认成功！正在跳转...')
              
              // 延迟跳转到仪表板 - 用户体验优化
              setTimeout(() => {
                router.push('/dashboard')
              }, 2000)
            }
          } else {
            setStatus('error')
            setMessage('无效的确认链接')
          }
        }
      } catch (error) {
        console.error('认证回调处理错误:', error)
        setStatus('error')
        setMessage('处理确认链接时出错，请重试')
      }
    }

    handleAuthCallback()
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-100">
      <div className="max-w-md w-full mx-auto p-6">
        <div className="bg-white rounded-lg shadow-lg p-8 text-center">
          {status === 'loading' && (
            <>
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
              <h2 className="text-xl font-semibold text-gray-800 mb-2">正在确认邮箱...</h2>
              <p className="text-gray-600">请稍候，我们正在处理您的邮箱确认</p>
            </>
          )}
          
          {status === 'success' && (
            <>
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-gray-800 mb-2">邮箱确认成功！</h2>
              <p className="text-gray-600">{message}</p>
            </>
          )}
          
          {status === 'error' && (
            <>
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-gray-800 mb-2">确认失败</h2>
              <p className="text-gray-600 mb-4">{message}</p>
              <button
                onClick={() => router.push('/')}
                className="bg-purple-600 text-white px-6 py-2 rounded-lg hover:bg-purple-700 transition-colors"
              >
                返回首页
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}