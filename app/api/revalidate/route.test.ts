import { NextRequest } from 'next/server'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('next-sanity/webhook', () => ({ parseBody: vi.fn() }))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('lib/paths', () => ({ getAllPaths: vi.fn() }))

import { getAllPaths } from 'lib/paths'
import { revalidatePath } from 'next/cache'
import { parseBody } from 'next-sanity/webhook'

import { POST } from './route'

const request = () =>
  new NextRequest('http://localhost/api/revalidate', { method: 'POST' })

beforeEach(() => {
  vi.spyOn(console, 'warn').mockImplementation(() => {})
  vi.spyOn(console, 'log').mockImplementation(() => {})
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

afterEach(() => {
  vi.clearAllMocks()
  vi.restoreAllMocks()
})

describe('POST /api/revalidate', () => {
  it('returns 401 without revalidating when the signature is invalid', async () => {
    vi.mocked(parseBody).mockResolvedValue({
      isValidSignature: false,
      body: { type: 'page', slug: 'about' },
    })

    const response = await POST(request())

    expect(response.status).toBe(401)
    expect(revalidatePath).not.toHaveBeenCalled()
  })

  it('returns 401 when the signature resolves to null (secret unset — fails closed)', async () => {
    vi.mocked(parseBody).mockResolvedValue({
      isValidSignature: null,
      body: { type: 'page', slug: 'about' },
    })

    const response = await POST(request())

    expect(response.status).toBe(401)
    expect(revalidatePath).not.toHaveBeenCalled()
  })

  it('revalidates every Wix route regardless of webhook type', async () => {
    vi.mocked(getAllPaths).mockResolvedValue(['/', '/research', '/news', '/publications', '/team', '/media', '/contact'])
    vi.mocked(parseBody).mockResolvedValue({
      isValidSignature: true,
      body: { type: 'page', slug: 'about' },
    })

    const response = await POST(request())
    const json = await response.json()

    expect(revalidatePath).toHaveBeenCalledWith('/')
    expect(revalidatePath).toHaveBeenCalledWith('/research')
    expect(revalidatePath).toHaveBeenCalledWith('/news')
    expect(revalidatePath).toHaveBeenCalledWith('/publications')
    expect(revalidatePath).toHaveBeenCalledWith('/team')
    expect(revalidatePath).toHaveBeenCalledWith('/media')
    expect(revalidatePath).toHaveBeenCalledWith('/contact')
    expect(revalidatePath).toHaveBeenCalledTimes(7)
    expect(json.success).toBe(true)
    expect(json.message).toBe('Revalidated 7 pages (type "page").')
  })

  it('revalidates every known path for an unrecognized type', async () => {
    vi.mocked(getAllPaths).mockResolvedValue(['/', '/about'])
    vi.mocked(parseBody).mockResolvedValue({
      isValidSignature: true,
      body: { type: undefined, slug: undefined },
    })

    const response = await POST(request())
    const json = await response.json()

    expect(revalidatePath).toHaveBeenCalledWith('/')
    expect(revalidatePath).toHaveBeenCalledWith('/about')
    expect(revalidatePath).toHaveBeenCalledTimes(2)
    expect(json.message).toBe('Revalidated 2 pages (type "undefined").')
  })

  it('returns 500 without leaking the error when parseBody throws', async () => {
    vi.mocked(parseBody).mockRejectedValue(new Error('boom'))

    const response = await POST(request())
    const json = await response.json()

    expect(response.status).toBe(500)
    expect(json.success).toBe(false)
  })
})
