import { parseBody } from 'next-sanity/webhook'
export { config } from 'next-sanity/webhook'


export default async function handler(req, res) {

  try {
    const { isValidSignature, body } = await parseBody(req, process.env.SANITY_WEBHOOK_SECRET)
    const { type, slug } = body

    if (!isValidSignature) {
      const message = 'Invalid signature'
      console.warn(message)
      res.status(401).json({ message })
      return
    }

    switch (type) {
      case 'home':
        await res.revalidate(`/`)
        return res.status(200).json({
          success: true,
          message: `Revalidated "${type}"`,
        })
      case 'page':
        await res.revalidate(`/${slug}`)
        return res.status(200).json({
          success: true,
          message: `Revalidated homepage`,
        })
      case 'project':
        await res.revalidate(`/projects/${slug}`)
        await res.revalidate(`/`)
        return res.status(200).json({
          success: true,
          message: `Revalidated "${type}" with slug "projects/${slug}. Revalidated homepage."`,
        })
      case 'publication':
        await res.revalidate(`/publications`)
        return res.status(200).json({
          success: true,
          message: `Revalidated "${type}" with slug "publications"`,
        })
      case 'profile':
        await res.revalidate(`/people`)
        return res.status(200).json({
          success: true,
          message: `Revalidated "${type}" with slug "people"`,
        })
    }
    
    return res.json({ success: false, message: 'No managed type' })

  } catch (err) {
    console.error(err)
    return res.status(500).json({ success: false, message: 'Error revalidating' })
  }
}