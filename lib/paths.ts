export const WIX_ROUTES = ['/', '/research', '/news', '/publications', '/team', '/media', '/contact'] as const

export const getAllPaths = async (): Promise<string[]> => [...WIX_ROUTES]
