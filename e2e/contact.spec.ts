import { expect, test } from '@playwright/test'
import { contactDetails, telHref, UNIVERSITY_NAME, UNIVERSITY_URL } from 'components/redesign/contactModel'

import { e2eClient } from './support/sanity'

type LiveSettings = {
  showContactForm: boolean | null
  contact: { email: string | null; phone: string | null; address: string | null } | null
}

async function fetchSettings(): Promise<LiveSettings> {
  const settings = await e2eClient.fetch<LiveSettings | null>(
    `*[_type == "settings"][0]{ showContactForm, contact{ email, phone, address } }`
  )
  return settings ?? { showContactForm: null, contact: null }
}

const VISITOR = { name: 'Test Visitor', email: 'visitor@example.org', message: 'Hello from the e2e suite.' }

test.describe('/contact', () => {
  test('404s exactly when showContactForm is false', async ({ page }) => {
    const settings = await fetchSettings()
    const response = await page.goto('/contact')
    expect(response?.status()).toBe(settings.showContactForm === false ? 404 : 200)
  })

  test('shows exactly the contact details on file, plus the University link', async ({ page }) => {
    const settings = await fetchSettings()
    test.skip(settings.showContactForm === false, 'contact page is switched off')
    const d = contactDetails(settings.contact)

    await page.goto('/contact')
    const email = page.getByTestId('contact-email')
    if (d.email) {
      await expect(email.getByRole('link')).toHaveAttribute('href', `mailto:${d.email}`)
      await expect(email.getByRole('link')).toHaveText(d.email)
    } else {
      await expect(email).toHaveCount(0)
    }
    const phone = page.getByTestId('contact-phone')
    if (d.phone) {
      await expect(phone.getByRole('link')).toHaveAttribute('href', telHref(d.phone))
      await expect(phone.getByRole('link')).toHaveText(d.phone)
    } else {
      await expect(phone).toHaveCount(0)
    }
    const address = page.getByTestId('contact-address')
    if (d.address) {
      await expect(address.locator('dd')).toHaveText(d.address)
    } else {
      await expect(address).toHaveCount(0)
    }
    const university = page.getByTestId('contact-university').getByRole('link', { name: UNIVERSITY_NAME })
    await expect(university).toHaveAttribute('href', UNIVERSITY_URL)
  })

  test('the form posts name, email, message and the honeypot to /api/formspree, then thanks the visitor', async ({
    page,
  }) => {
    const settings = await fetchSettings()
    test.skip(settings.showContactForm === false, 'contact page is switched off')
    let posted: unknown = null
    await page.route('**/api/formspree', async (route) => {
      posted = route.request().postDataJSON()
      await route.fulfill({ status: 200, json: { success: true, message: {} } })
    })

    await page.goto('/contact')
    await page.getByLabel('Name', { exact: true }).fill(VISITOR.name)
    await page.getByLabel('Email', { exact: true }).fill(VISITOR.email)
    await page.getByLabel('Message', { exact: true }).fill(VISITOR.message)
    await page.getByRole('button', { name: 'Submit' }).click()

    await expect(page.getByTestId('contact-success')).toHaveText(
      'Thank you for reaching out to us! Your message has been successfully submitted.'
    )
    expect(posted).toEqual({ ...VISITOR, _gotcha: '' })
  })

  test('a failed submission opens the error dialog, keeps the typed values, and re-enables Submit on close', async ({
    page,
  }) => {
    const settings = await fetchSettings()
    test.skip(settings.showContactForm === false, 'contact page is switched off')
    await page.route('**/api/formspree', (route) => route.fulfill({ status: 500, json: { success: false } }))

    await page.goto('/contact')
    await page.getByLabel('Name', { exact: true }).fill(VISITOR.name)
    await page.getByLabel('Email', { exact: true }).fill(VISITOR.email)
    await page.getByLabel('Message', { exact: true }).fill(VISITOR.message)
    await page.getByRole('button', { name: 'Submit' }).click()

    const dialog = page.getByRole('dialog', { name: 'Submission failed' })
    await expect(dialog).toBeVisible()
    await expect(dialog).toContainText('Sorry, there was an issue with submitting your message.')
    await dialog.getByRole('button', { name: 'Close' }).click()
    await expect(dialog).toHaveCount(0)
    await expect(page.getByLabel('Name', { exact: true })).toHaveValue(VISITOR.name)
    await expect(page.getByRole('button', { name: 'Submit' })).toBeEnabled()
  })

  test('details sit left of the form from lg, and above it below lg', async ({ page }) => {
    const settings = await fetchSettings()
    test.skip(settings.showContactForm === false, 'contact page is switched off')
    for (const width of [1280, 375]) {
      await page.setViewportSize({ width, height: 900 })
      await page.goto('/contact')
      const details = (await page.getByTestId('contact-details').boundingBox())!
      const form = (await page.getByTestId('contact-form').boundingBox())!
      if (width >= 1024) {
        expect(details.x + details.width).toBeLessThanOrEqual(form.x)
        expect(Math.abs(details.y - form.y)).toBeLessThanOrEqual(4)
      } else {
        expect(details.y + details.height).toBeLessThanOrEqual(form.y)
      }
    }
  })

  test('no horizontal overflow from 320 to 1440px', async ({ page }) => {
    const settings = await fetchSettings()
    test.skip(settings.showContactForm === false, 'contact page is switched off')
    for (const width of [320, 375, 768, 1024, 1280, 1440]) {
      await page.setViewportSize({ width, height: 900 })
      await page.goto('/contact')
      const fits = await page.evaluate(
        () => document.documentElement.scrollWidth <= document.documentElement.clientWidth
      )
      expect(fits, `${width}px`).toBe(true)
    }
  })
})
