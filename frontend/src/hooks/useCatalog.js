import { useEffect, useState } from 'react'
import catalogApi from '@/api/catalogApi'

// Danh mục ít thay đổi: tải một lần, dùng chung cho mọi component
const cache = {}

function useCatalog(key, loader) {
  const [items, setItems] = useState([])

  useEffect(() => {
    let active = true
    cache[key] ??= loader().catch((err) => {
      delete cache[key]
      throw err
    })
    cache[key].then((data) => active && setItems(data)).catch(() => active && setItems([]))
    return () => {
      active = false
    }
  }, [key, loader])

  return items
}

export const useLocations = () => useCatalog('locations', catalogApi.getLocations)
export const useIndustries = () => useCatalog('industries', catalogApi.getIndustries)
