import type { Request, Response, NextFunction } from 'express'

export function requireBotAuth(req: Request, res: Response, next: NextFunction) {
  const expected = process.env.BOT_SHARED_SECRET
  const provided = req.header('x-bot-secret') || ''

  if (!expected || provided !== expected) {
    res.status(401).json({ error: 'Unauthorized bot request' })
    return
  }

  next()
}
