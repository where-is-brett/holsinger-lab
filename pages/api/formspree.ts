import axios from 'axios'
import { NextApiRequest, NextApiResponse } from 'next'

const endpoint = process.env.FORMSPREE_ENDPOINT

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === 'POST') {
    try {
      // Make the Axios POST request to Formspree
      const response = await axios.post(
        `https://formspree.io/f/${endpoint}`,
        req.body
      )
      res.status(200).json({ success: true, message: response.data })
    } catch (error) {
      res.status(500).json({
        success: false,
        message:
          'Sorry, there was an issue with submitting your message. Please try again later.',
      })
    }
  } else {
    res.status(405).json({ success: false, message: 'Method not allowed.' })
  }
}
