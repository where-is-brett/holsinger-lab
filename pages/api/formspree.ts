import { siteUrl } from 'lib/site'
import { NextApiRequest, NextApiResponse } from 'next'

const endpoint = process.env.FORMSPREE_ENDPOINT

const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000
const RATE_LIMIT_MAX_REQUESTS = 5

const requestLog = new Map<string, { count: number; resetAt: number }>()

/**
 * Only these fields reach Formspree. Everything else in the request body is
 * dropped — this endpoint accepts contact-form submissions, not arbitrary JSON
 * forwarded on the lab's Formspree account.
 *
 * NOTE: if the contact form gains a field, add it here too or it will be
 * silently discarded. `email` is deliberately kept: Formspree reads the field
 * named `email` to set the notification's Reply-To address.
 */
const FIELD_MAX_LENGTH = {
  name: 200,
  email: 320, // RFC 5321 maximum address length
  message: 5000,
} as const

type AllowedField = keyof typeof FIELD_MAX_LENGTH

const ALLOWED_FIELDS = Object.keys(FIELD_MAX_LENGTH) as AllowedField[]

/**
 * Returns the trimmed, allowlisted payload, or a reason string if the body
 * isn't a usable contact-form submission.
 */
function buildPayload(
  body: unknown
): { payload: Record<AllowedField, string> } | { error: string } {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    return { error: 'Expected a JSON object.' }
  }

  const source = body as Record<string, unknown>
  const payload = {} as Record<AllowedField, string>

  for (const field of ALLOWED_FIELDS) {
    const value = source[field]
    if (typeof value !== 'string' || value.trim() === '') {
      return { error: `Missing required field: ${field}.` }
    }
    if (value.length > FIELD_MAX_LENGTH[field]) {
      return { error: `Field too long: ${field}.` }
    }
    payload[field] = value.trim()
  }

  return { payload }
}

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

  // Honeypot: bots fill every field, real visitors never see this one.
  // Checked first so bot traffic never consumes the rate-limit budget
  // meant for real submissions sharing an IP (e.g. an office NAT).
  if (req.body?._gotcha) {
    return res.status(200).json({ success: true, message: 'Thank you.' })
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

  const result = buildPayload(req.body)
  if ('error' in result) {
    return res.status(400).json({ success: false, message: result.error })
  }

  try {
    const response = await fetch(`https://formspree.io/f/${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(result.payload),
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
