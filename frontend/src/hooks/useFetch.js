import { useCallback, useEffect, useState } from 'react'
import { getErrorMessage } from '@/utils/formatters'

// Gọi API khi mount hoặc khi deps thay đổi; trả về { data, loading, error, reload, setData }
export default function useFetch(fetcher, deps = []) {
  const [state, setState] = useState({ data: null, loading: true, error: null })
  const [version, setVersion] = useState(0)

  useEffect(() => {
    let active = true
    setState((s) => ({ ...s, loading: true, error: null }))
    fetcher()
      .then((data) => active && setState({ data, loading: false, error: null }))
      .catch((err) => active && setState({ data: null, loading: false, error: getErrorMessage(err) }))
    return () => {
      active = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, version])

  const setData = useCallback(
    (updater) => setState((s) => ({ ...s, data: typeof updater === 'function' ? updater(s.data) : updater })),
    [],
  )
  const reload = useCallback(() => setVersion((v) => v + 1), [])

  return { ...state, setData, reload }
}
