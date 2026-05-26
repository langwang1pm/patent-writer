import { useEffect, useState, useCallback, useRef } from 'react'

interface SSEMessage {
  type: string
  data: any
}

interface UseSSEOptions {
  onMessage?: (message: SSEMessage) => void
  onError?: (error: Event) => void
  onOpen?: () => void
  enabled?: boolean
}

export function useSSE(url: string | null, options: UseSSEOptions = {}) {
  const { onMessage, onError, onOpen, enabled = true } = options
  const [isConnected, setIsConnected] = useState(false)
  const [lastMessage, setLastMessage] = useState<SSEMessage | null>(null)
  const eventSourceRef = useRef<EventSource | null>(null)

  const connect = useCallback(() => {
    if (!url || !enabled) return

    // 关闭现有连接
    if (eventSourceRef.current) {
      eventSourceRef.current.close()
    }

    const eventSource = new EventSource(url)
    eventSourceRef.current = eventSource

    eventSource.onopen = () => {
      setIsConnected(true)
      onOpen?.()
    }

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        const message: SSEMessage = {
          type: event.type || 'message',
          data,
        }
        setLastMessage(message)
        onMessage?.(message)
      } catch (e) {
        console.error('SSE 消息解析失败:', e)
      }
    }

    eventSource.onerror = (error) => {
      setIsConnected(false)
      onError?.(error)
    }

    // 处理不同类型的消息
    eventSource.addEventListener('message_start', (event) => {
      onMessage?.({ type: 'message_start', data: JSON.parse(event.data) })
    })

    eventSource.addEventListener('citation', (event) => {
      onMessage?.({ type: 'citation', data: JSON.parse(event.data) })
    })

    eventSource.addEventListener('content_delta', (event) => {
      onMessage?.({ type: 'content_delta', data: JSON.parse(event.data) })
    })

    eventSource.addEventListener('citation_ref', (event) => {
      onMessage?.({ type: 'citation_ref', data: JSON.parse(event.data) })
    })

    eventSource.addEventListener('document_generated', (event) => {
      onMessage?.({ type: 'document_generated', data: JSON.parse(event.data) })
    })

    eventSource.addEventListener('done', (event) => {
      onMessage?.({ type: 'done', data: JSON.parse(event.data) })
      setIsConnected(false)
    })
  }, [url, enabled, onMessage, onError, onOpen])

  const disconnect = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close()
      eventSourceRef.current = null
      setIsConnected(false)
    }
  }, [])

  useEffect(() => {
    connect()
    return () => disconnect()
  }, [connect, disconnect])

  return {
    isConnected,
    lastMessage,
    connect,
    disconnect,
  }
}
