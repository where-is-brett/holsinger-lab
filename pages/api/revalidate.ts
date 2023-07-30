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
        console.log(`Revalidated "${type}"`)
        return res.status(200).json({
          success: true,
          message: `Revalidated "${type}"`,
        })
      case 'page':
        await res.revalidate(`/${slug}`)
        console.log(`Revalidated "${type}" with slug "${slug}"`)
        return res.status(200).json({
          success: true,
          message: `Revalidated "${type}" with slug "${slug}"`,
        })
      case 'project':
        await res.revalidate(`/projects/${slug}`)
        console.log(`Revalidated "${type}" with slug "${slug}"`)
        return res.status(200).json({
          success: true,
          message: `Revalidated "${type}" with slug "${slug}"`,
        })
      case 'publications':
        await res.revalidate(`/publications/`)
        console.log(`Revalidated "${type}"`)
        return res.status(200).json({
          success: true,
          message: `Revalidated "${type}" with slug "publications"`,
        })
      case 'profile':
        await res.revalidate(`/people/`)
        console.log(`Revalidated "${type}"`)
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