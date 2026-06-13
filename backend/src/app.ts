import cors from 'cors'
import express from 'express'
import { env } from './config/env'
import { errorHandler } from './middlewares/errorHandler'
import { router } from './routes'

export const app = express()

app.use(cors({ origin: env.CORS_ORIGIN, credentials: true }))
app.use(express.json())

app.use('/api', router)

app.use(errorHandler)
