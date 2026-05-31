import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        // SSE 流式输出必须：禁用 http-proxy 缓冲，否则数据会攒到最后一刻才发给 EventSource
        configure: (proxy) => {
          proxy.on('proxyRes', (proxyRes, req, res) => {
            const contentType = proxyRes.headers['content-type'] || ''
            const isSSE = contentType.includes('text/event-stream')

            if (!isSSE) return

            // 关键：关闭 http-proxy 的响应缓冲
            // http-proxy 默认会 buffer 整个响应体再转发，导致 SSE 无法实时推送
            ;(proxyRes as any).preserveHeaderCase = true
            // 通知底层的 IncomingMessage 不要缓冲
            ;(proxyRes as any).buffer = false

            // 强制 no-cache 头，确保中间件不缓存 SSE 内容
            proxyRes.headers['cache-control'] = 'no-cache'
            proxyRes.headers['x-accel-buffering'] = 'no'
            proxyRes.headers['connection'] = 'keep-alive'

            // 尝试立即 flush，让客户端尽早开始接收数据
            try {
              ;(proxyRes as any).flush?.()
            } catch (_) {
              // ignore
            }

            console.log('[Vite Proxy] SSE detected, buffering disabled for:', req.url)
          })

          // http-proxy 选项：禁用写缓冲（write buffering）
          proxy.on('start', (_req, _res, target) => {
            console.log('[Vite Proxy] Proxying to:', target)
          })
        },
      },
    },
  },
})
