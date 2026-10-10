import { useContext } from 'react'
import { FavoritesContext } from '@/context/FavoritesContext'

// { enabled, loaded, isFavorite(type, id), count(type), toggle(type, id) } - type: 'job' | 'company'
export default function useFavorites() {
  return useContext(FavoritesContext)
}
