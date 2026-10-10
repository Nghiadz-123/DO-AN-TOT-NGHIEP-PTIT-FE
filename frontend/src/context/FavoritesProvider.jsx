import { useCallback, useEffect, useMemo, useState } from 'react'
import favoriteApi from '@/api/favoriteApi'
import useAuth from '@/hooks/useAuth'
import { ROLES } from '@/utils/constants'
import { FavoritesContext } from './FavoritesContext'

// type -> tập id trong state và API thêm / bỏ yêu thích
const TYPES = {
  job: { key: 'jobs', add: favoriteApi.addJob, remove: favoriteApi.removeJob },
  company: { key: 'companies', add: favoriteApi.addCompany, remove: favoriteApi.removeCompany },
}

const emptyState = (owner = null, failed = false) => ({ owner, failed, jobs: new Set(), companies: new Set() })

// Id các việc làm / công ty ứng viên đã yêu thích, dùng chung cho mọi nút ♥ trên các trang
export function FavoritesProvider({ children }) {
  const { user } = useAuth()
  const candidateId = user?.role === ROLES.CANDIDATE ? user.id : null
  // owner: user sở hữu danh sách, để không hiện nhầm danh sách của tài khoản trước khi đổi tài khoản
  const [state, setState] = useState(emptyState)

  useEffect(() => {
    if (!candidateId) return
    let active = true
    favoriteApi
      .getIds()
      .then(
        (data) =>
          active &&
          setState({ owner: candidateId, failed: false, jobs: new Set(data.jobs), companies: new Set(data.companies) }),
      )
      // Không tải được: coi như chưa yêu thích gì, nút ♥ vẫn bấm được (thêm trùng backend vẫn trả 200)
      .catch(() => active && setState(emptyState(candidateId, true)))
    return () => {
      active = false
    }
  }, [candidateId])

  const ready = candidateId !== null && state.owner === candidateId

  const setMember = useCallback(
    (key, id, member) =>
      setState((s) => {
        const next = new Set(s[key])
        if (member) next.add(id)
        else next.delete(id)
        return { ...s, [key]: next }
      }),
    [],
  )

  // Đổi giao diện ngay rồi mới gọi API; lỗi thì hoàn tác và ném lỗi cho nơi gọi hiển thị
  const toggle = useCallback(
    async (type, id) => {
      const { key, add, remove } = TYPES[type]
      const wasFavorite = state[key].has(id)
      setMember(key, id, !wasFavorite)
      try {
        await (wasFavorite ? remove(id) : add(id))
      } catch (err) {
        setMember(key, id, wasFavorite)
        throw err
      }
    },
    [state, setMember],
  )

  const value = useMemo(() => {
    const loaded = ready && !state.failed
    return {
      enabled: candidateId !== null,
      loaded,
      isFavorite: (type, id) => ready && state[TYPES[type].key].has(id),
      count: (type) => (loaded ? state[TYPES[type].key].size : null),
      toggle,
    }
  }, [candidateId, ready, state, toggle])

  return <FavoritesContext.Provider value={value}>{children}</FavoritesContext.Provider>
}
