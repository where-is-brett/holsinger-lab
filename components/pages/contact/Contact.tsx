import Layout from 'components/shared/Layout'
import type { SettingsPayload } from 'types'

import ContactForm from './ContactForm'

const Contact = ({ settings }: { settings?: SettingsPayload }) => {
  return (
    <Layout settings={settings}>
      <ContactForm />
    </Layout>
  )
}

export default Contact
