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

  it('revalidates the page path and the homepage for a page webhook (Task 3: a page can be the Support link)', async () => {
    vi.mocked(parseBody).mockResolvedValue({
      isValidSignature: true,
      body: { type: 'page', slug: 'about' },
    })

    const response = await POST(request())
    const json = await response.json()

    expect(revalidatePath).toHaveBeenCalledWith('/about')
    expect(revalidatePath).toHaveBeenCalledWith('/')
    expect(revalidatePath).toHaveBeenCalledTimes(2)
    expect(json.success).toBe(true)
  })

  it('returns 400 without revalidating when a page webhook is missing a slug', async () => {
    vi.mocked(parseBody).mockResolvedValue({
      isValidSignature: true,
      body: { type: 'page', slug: undefined },
    })

    const response = await POST(request())
    const json = await response.json()

    expect(response.status).toBe(400)
    expect(revalidatePath).not.toHaveBeenCalled()
    expect(json.success).toBe(false)
  })

  it('revalidates the project path, the homepage and /research for a project webhook (Task 3: /research and the maestro project)', async () => {
    vi.mocked(parseBody).mockResolvedValue({
      isValidSignature: true,
      body: { type: 'project', slug: 'my-project' },
    })

    await POST(request())

    expect(revalidatePath).toHaveBeenCalledWith('/projects/my-project')
    expect(revalidatePath).toHaveBeenCalledWith('/')
    expect(revalidatePath).toHaveBeenCalledWith('/research')
    expect(revalidatePath).toHaveBeenCalledTimes(3)
  })

  it('returns 400 without revalidating when a project webhook is missing a slug', async () => {
    vi.mocked(parseBody).mockResolvedValue({
      isValidSignature: true,
      body: { type: 'project', slug: undefined },
    })

    const response = await POST(request())

    expect(response.status).toBe(400)
    expect(revalidatePath).not.toHaveBeenCalled()
  })

  it('revalidates /publications, every /publications/[slug] page and the homepage for a publication webhook, ignoring slug (Task 3: Home renders the 5 most recent publications and the count)', async () => {
    vi.mocked(parseBody).mockResolvedValue({
      isValidSignature: true,
      body: { type: 'publication', slug: undefined },
    })

    await POST(request())

    expect(revalidatePath).toHaveBeenCalledWith('/publications')
    expect(revalidatePath).toHaveBeenCalledWith('/publications/[slug]', 'page')
    expect(revalidatePath).toHaveBeenCalledWith('/')
    expect(revalidatePath).toHaveBeenCalledTimes(3)
  })

  it('revalidates /people and the homepage for a profile webhook, ignoring slug (Task 3: currentMemberCount, the PI panel)', async () => {
    vi.mocked(parseBody).mockResolvedValue({
      isValidSignature: true,
      body: { type: 'profile', slug: undefined },
    })

    await POST(request())

    expect(revalidatePath).toHaveBeenCalledWith('/people')
    expect(revalidatePath).toHaveBeenCalledWith('/')
    expect(revalidatePath).toHaveBeenCalledTimes(2)
  })

  it('revalidates /people and the homepage for a roleGroup webhook, ignoring slug', async () => {
    vi.mocked(parseBody).mockResolvedValue({
      isValidSignature: true,
      body: { type: 'roleGroup', slug: undefined },
    })

    await POST(request())

    expect(revalidatePath).toHaveBeenCalledWith('/people')
    expect(revalidatePath).toHaveBeenCalledWith('/')
    expect(revalidatePath).toHaveBeenCalledTimes(2)
  })

  it('revalidates /resources, the homepage and every /publications/[slug] page for a resource webhook, ignoring slug', async () => {
    vi.mocked(parseBody).mockResolvedValue({
      isValidSignature: true,
      body: { type: 'resource', slug: undefined },
    })

    await POST(request())

    expect(revalidatePath).toHaveBeenCalledWith('/resources')
    expect(revalidatePath).toHaveBeenCalledWith('/')
    expect(revalidatePath).toHaveBeenCalledWith('/publications/[slug]', 'page')
    expect(revalidatePath).toHaveBeenCalledTimes(3)
  })

  it('revalidates the homepage for a siteCopy webhook (Home reads siteCopy for its hero statement and research fallback)', async () => {
    vi.mocked(parseBody).mockResolvedValue({
      isValidSignature: true,
      body: { type: 'siteCopy', slug: undefined },
    })

    const response = await POST(request())
    const json = await response.json()

    expect(revalidatePath).toHaveBeenCalledWith('/')
    expect(revalidatePath).toHaveBeenCalledTimes(1)
    expect(json.success).toBe(true)
  })

  it('revalidates every known path for an unrecognized type', async () => {
    vi.mocked(getAllPaths).mockResolvedValue(['/', '/about', undefined])
    vi.mocked(parseBody).mockResolvedValue({
      isValidSignature: true,
      body: { type: undefined, slug: undefined },
    })

    await POST(request())

    expect(revalidatePath).toHaveBeenCalledWith('/')
    expect(revalidatePath).toHaveBeenCalledWith('/about')
    expect(revalidatePath).toHaveBeenCalledTimes(2)
  })

  it('returns 500 without leaking the error when parseBody throws', async () => {
    vi.mocked(parseBody).mockRejectedValue(new Error('boom'))

    const response = await POST(request())
    const json = await response.json()

    expect(response.status).toBe(500)
    expect(json.success).toBe(false)
  })
})
