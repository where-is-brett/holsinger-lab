// import { isValidSignature, SIGNATURE_HEADER_NAME } from '@sanity/webhook'
// import type { NextApiRequest, NextApiResponse } from "next"

// type Data = {
//   success: boolean
//   message: string
// }

// const secret = process.env.SANITY_WEBHOOK_SECRET

// export default async function handler(req: NextApiRequest, res: NextApiResponse<Data>) {
//   if (req.method !== "POST") {
//     console.error("Must be a POST request")
//     return res.status(401).json({ success: false, message: "Must be a POST request" })
//   }

//   const signature = req.headers[SIGNATURE_HEADER_NAME];
//   const isValid = isValidSignature(JSON.stringify(req.body), signature, secret);

//   if (!isValid) {
//     res.status(401).json({ success: false, message: "Invalid signature" })
//     return
//   }

//   try {
//     const {
//       body: { type, slug },
//     } = req

//     switch (type) {
//       case "page":
//         await res.revalidate(`/${slug}`)
//         console.log(`Revalidated "${type}" with slug "${slug}"`)
//         return res.json({ success: true, message: `Revalidated "${type}" with slug "${slug}"` })
//       case "project":
//         await res.revalidate(`/projects/${slug}`)
//         console.log(`Revalidated "${type}" with slug "${slug}"`)
//         return res.json({ success: true, message: `Revalidated "${type}" with slug "${slug}"` })
//       case "publications":
//         await res.revalidate(`/publications`)
//         console.log(`Revalidated "${type}"`)
//         return res.json({ success: true, message: `Revalidated "${type}" with slug "publications"` })
//       case "profile":
//         await res.revalidate(`/people`)
//         console.log(`Revalidated "${type}"`)
//         return res.json({ success: true, message: `Revalidated "${type}" with slug "people"` })
//     }

//     return res.json({ success: false, message: "No managed type" })
//   } catch (err) {
//     return res.status(500).send({ success: false, message: "Error revalidating" })
//   }
// }

// export const config = {
//   api: {
//     bodyParser: false,
//   },
// }


import { isValidSignature, SIGNATURE_HEADER_NAME } from '@sanity/webhook'

const secret = process.env.SANITY_WEBHOOK_SECRET

export default async function handler(req, res) {
  const signature = req.headers[SIGNATURE_HEADER_NAME]
  const body = await readBody(req) // Read the body into a string
  if (!isValidSignature(body, signature, secret)) {
    res.status(401).json({ success: false, message: 'Invalid signature' })
    return
  }

  const jsonBody = JSON.parse(body)
  try {
    const { type, slug } = jsonBody

    switch (type) {
      case "page":
        await res.revalidate(`/${slug}`)
        console.log(`Revalidated "${type}" with slug "${slug}"`)
        return res.json({ success: true, message: `Revalidated "${type}" with slug "${slug}"` })
      case "project":
        await res.revalidate(`/projects/${slug}`)
        console.log(`Revalidated "${type}" with slug "${slug}"`)
        return res.json({ success: true, message: `Revalidated "${type}" with slug "${slug}"` })
      case "publications":
        await res.revalidate(`/publications`)
        console.log(`Revalidated "${type}"`)
        return res.json({ success: true, message: `Revalidated "${type}" with slug "publications"` })
      case "profile":
        await res.revalidate(`/people`)
        console.log(`Revalidated "${type}"`)
        return res.json({ success: true, message: `Revalidated "${type}" with slug "people"` })
    }

    return res.json({ success: false, message: "No managed type" })
  } catch (err) {
    return res.status(500).send({ success: false, message: "Error revalidating" })
  }
}

// Next.js will by default parse the body, which can lead to invalid signatures
export const config = {
  api: {
    bodyParser: false,
  },
}

async function readBody(readable) {
  const chunks = []
  for await (const chunk of readable) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk)
  }
  return Buffer.concat(chunks).toString('utf8')
}