import { NextFunction, Request, Response } from 'express'
import jwt from 'jsonwebtoken'
import { env } from '../config/env'

export const requireAuth = (req: Request, res: Response, next: NextFunction) => {
    const header = req.headers.authorization
    if (!header?.startsWith('Bearer ')) {
        res.status(401).json({ message: 'Unauthorized' })
        return
    }

    try {
        const payload = jwt.verify(header.slice(7), env.JWT_SECRET)
        req.user = payload as { id: string; email: string }
        next()
    } catch {
        res.status(401).json({ message: 'Invalid token' })
    }
}
