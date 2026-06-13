import { Router } from 'express'
import { requireAuth } from '../middlewares/requireAuth'

export const authRouter = Router()

// TODO: validate body with zod, hash password with bcryptjs, save to DB via prisma, return JWT
authRouter.post('/register', async (_req, res) => {
    res.status(501).json({ message: 'Not implemented' })
})

// TODO: validate credentials, compare hash, return JWT
authRouter.post('/login', async (_req, res) => {
    res.status(501).json({ message: 'Not implemented' })
})

authRouter.get('/me', requireAuth, (req, res) => {
    res.json(req.user)
})
