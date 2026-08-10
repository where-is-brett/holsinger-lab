import { siteUrl } from 'lib/site'
import { NextRequest, NextResponse } from 'next/server'

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

function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) {
    return forwarded.split(',')[0].trim()
  }
  return request.headers.get('x-real-ip') || 'unknown'
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

function isTrustedOrigin(request: NextRequest): boolean {
  const origin = request.headers.get('origin')
  if (!origin) return true // same-origin form posts and non-browser tools may omit Origin
  if (process.env.VERCEL_ENV !== 'production') return true // don't block preview/dev deployments
  const trusted = [
    siteUrl,
    process.env.VERCEL_URL && `https://${process.env.VERCEL_URL}`,
  ].filter(Boolean)
  return trusted.includes(origin)
}

export async function POST(request: NextRequest) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { success: false, message: 'Expected a JSON object.' },
      { status: 400 }
    )
  }

  // Honeypot: bots fill every field, real visitors never see this one.
  if (
    body &&
    typeof body === 'object' &&
    (body as Record<string, unknown>)._gotcha
  ) {
    return NextResponse.json({ success: true, message: 'Thank you.' })
  }

  if (!isTrustedOrigin(request)) {
    return NextResponse.json(
      { success: false, message: 'Forbidden.' },
      { status: 403 }
    )
  }

  const ip = getClientIp(request)
  if (isRateLimited(ip)) {
    return NextResponse.json(
      { success: false, message: 'Too many submissions. Please try again later.' },
      { status: 429 }
    )
  }

  const result = buildPayload(body)
  if ('error' in result) {
    return NextResponse.json(
      { success: false, message: result.error },
      { status: 400 }
    )
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
    return NextResponse.json({ success: true, message: data })
  } catch {
    return NextResponse.json(
      {
        success: false,
        message:
          'Sorry, there was an issue with submitting your message. Please try again later.',
      },
      { status: 500 }
    )
  }
}
