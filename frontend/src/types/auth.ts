export interface User {
    id: string
    email: string
}

export interface LoginPayload {
    email: string
    password: string
}

export interface RegisterPayload {
    email: string
    password: string
}

export interface AuthResponse {
    token: string
    user: User
}
