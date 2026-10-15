import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from '@/context/AuthProvider'
import { FavoritesProvider } from '@/context/FavoritesProvider'
import { InboxProvider } from '@/context/InboxProvider'
import AppRoutes from '@/routes/AppRoutes'

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <FavoritesProvider>
          <InboxProvider>
            <AppRoutes />
          </InboxProvider>
        </FavoritesProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}
