import { isValidRequest } from "@sanity/webhook"
import type { NextApiRequest, NextApiResponse } from "next"

type Data = {
  message: string
}

const secret = process.env.SANITY_WEBHOOK_SECRET

export default async function handler(req: NextApiRequest, res: NextApiResponse<Data>) {
  if (req.method !== "POST") {
    console.error("Must be a POST request")
    return res.status(401).json({ message: "Must be a POST request" })
  }

  if (!isValidRequest(req, secret)) {
    res.status(401).json({ message: "Invalid signature" })
    return
  }

  try {
    const {
      body: { type, slug },
    } = req

    switch (type) {
      case "page":
        await res.revalidate(`/${slug}`)
        return res.json({ message: `Revalidated "${type}" with slug "${slug}"` })
      case "project":
        await res.revalidate(`/projects/${slug}`)
        return res.json({ message: `Revalidated "${type}" with slug "${slug}"` })
      case "publications":
        await res.revalidate(`/publications`)
        return res.json({ message: `Revalidated "${type}" with slug "publications"`})
      case "profile":
        await res.revalidate(`/people`)
        return res.json({ message: `Revalidated "${type}" with slug "people"`})
    }

    return res.json({ message: "No managed type" })
  } catch (err) {
    return res.status(500).send({ message: "Error revalidating" })
  }
}