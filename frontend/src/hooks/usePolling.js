import { useEffect, useRef } from 'react'

// Gọi `callback` mỗi `delay` ms (bỏ qua khi tab đang ẩn). Luôn gọi bản callback mới nhất, không cần khai báo deps
export default function usePolling(callback, delay) {
  const saved = useRef(callback)

  useEffect(() => {
    saved.current = callback
  })

  useEffect(() => {
    const timer = setInterval(() => !document.hidden && saved.current(), delay)
    return () => clearInterval(timer)
  }, [delay])
}
