import { createContext, useContext, useEffect, useState } from 'react'
import { api } from '@/lib/api'
import type { AuthResponse, LoginPayload, RegisterPayload, User } from '@/types/auth'

interface AuthContextValue {
    user: User | null
    isAuthenticated: boolean
    isLoading: boolean
    login: (payload: LoginPayload) => Promise<void>
    register: (payload: RegisterPayload) => Promise<void>
    logout: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const [user, setUser] = useState<User | null>(null)
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        const token = localStorage.getItem('token')
        if (!token) {
            setIsLoading(false)
            return
        }
        api.get<User>('/api/auth/me')
            .then(setUser)
            .catch(() => localStorage.removeItem('token'))
            .finally(() => setIsLoading(false))
    }, [])

    const login = async (payload: LoginPayload) => {
        const { token, user } = await api.post<AuthResponse>('/api/auth/login', payload)
        localStorage.setItem('token', token)
        setUser(user)
    }

    const register = async (payload: RegisterPayload) => {
        const { token, user } = await api.post<AuthResponse>('/api/auth/register', payload)
        localStorage.setItem('token', token)
        setUser(user)
    }

    const logout = () => {
        localStorage.removeItem('token')
        setUser(null)
    }

    return (
        <AuthContext.Provider value={{ user, isAuthenticated: !!user, isLoading, login, register, logout }}>
            {children}
        </AuthContext.Provider>
    )
}

export const useAuthContext = () => {
    const ctx = useContext(AuthContext)
    if (!ctx) throw new Error('useAuthContext must be used within AuthProvider')
    return ctx
}
