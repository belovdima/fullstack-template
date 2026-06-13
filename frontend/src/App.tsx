import { AuthProvider } from '@/context/AuthContext'
import { AppRouter } from '@/router'

export const App = () => (
    <AuthProvider>
        <AppRouter />
    </AuthProvider>
)
