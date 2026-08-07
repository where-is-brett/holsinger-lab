import { NextApiRequest, NextApiResponse } from 'next'

import { siteUrl } from 'lib/site'

const endpoint = process.env.FORMSPREE_ENDPOINT

const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000
const RATE_LIMIT_MAX_REQUESTS = 5

const requestLog = new Map<string, { count: number; resetAt: number }>()

function getClientIp(req: NextApiRequest): string {
  const forwarded = req.headers['x-forwarded-for']
  if (typeof forwarded === 'string') {
    return forwarded.split(',')[0].trim()
  }
  return req.socket.remoteAddress || 'unknown'
}

function isRateLimited(ip: string): boolean {
  const now = Date.now()
  const entry = requestLog.get(ip)
  if (!entry || now > entry.resetAt) {
    requestLog.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS })
    return false
  }
  entry.count += 1
  return entry.count > RATE_LIMIT_MAX_REQUESTS
}

function isTrustedOrigin(req: NextApiRequest): boolean {
  const origin = req.headers.origin
  if (!origin) return true // same-origin form posts and non-browser tools may omit Origin
  if (process.env.VERCEL_ENV !== 'production') return true // don't block preview/dev deployments
  const trusted = [siteUrl, process.env.VERCEL_URL && `https://${process.env.VERCEL_URL}`].filter(
    Boolean
  )
  return trusted.includes(origin)
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed.' })
  }

  if (!isTrustedOrigin(req)) {
    return res.status(403).json({ success: false, message: 'Forbidden.' })
  }

  const ip = getClientIp(req)
  if (isRateLimited(ip)) {
    return res.status(429).json({
      success: false,
      message: 'Too many submissions. Please try again later.',
    })
  }

  // Honeypot: bots fill every field, real visitors never see this one.
  if (req.body?._gotcha) {
    return res.status(200).json({ success: true, message: 'Thank you.' })
  }

  try {
    const response = await fetch(`https://formspree.io/f/${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(req.body),
    })
    const data = await response.json()
    if (!response.ok) {
      throw new Error('Formspree request failed')
    }
    res.status(200).json({ success: true, message: data })
  } catch (error) {
    res.status(500).json({
      success: false,
      message:
        'Sorry, there was an issue with submitting your message. Please try again later.',
    })
  }
}
