import type { BrowserContext, Page } from '@playwright/test'

/**
 * Grants clipboard-read/write on every engine except WebKit.
 * `context.grantPermissions(['clipboard-write'])` throws under WebKit
 * ("Unknown permission: clipboard-write") -- measured directly that
 * `navigator.clipboard.writeText()` still resolves there with no grant at
 * all, for a click, a tap and a keyboard Enter/Space alike, so WebKit needs
 * no grant for the write itself to succeed. `readText()` has no WebKit
 * permission path either way (no Permissions API entry for it), so a
 * caller that needs the readback assertion still has to skip that part on
 * `webkit` itself -- this only centralises the grant-or-skip.
 */
export async function grantClipboardOrSkipWebkit(context: BrowserContext, browserName: string): Promise<void> {
  if (browserName === 'webkit') return
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])
}

/**
 * Wraps `navigator.clipboard.writeText` so the real write still happens
 * (needed on WebKit, where it succeeds without a permission grant) while
 * recording each call's argument, readable back via `lastClipboardWrite`.
 * Must be added with `page.addInitScript` before `page.goto`, since it
 * needs to run before the app's own first read of `navigator.clipboard`.
 */
export async function spyOnClipboardWrite(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const w = window as unknown as { __clipboardWrites: string[] }
    w.__clipboardWrites = []
    const nativeWriteText = navigator.clipboard.writeText.bind(navigator.clipboard)
    navigator.clipboard.writeText = async (text: string) => {
      w.__clipboardWrites.push(text)
      return nativeWriteText(text)
    }
  })
}

/** The most recent string passed to a spied `writeText`, if any. */
export async function lastClipboardWrite(page: Page): Promise<string | undefined> {
  return page.evaluate(() => (window as unknown as { __clipboardWrites?: string[] }).__clipboardWrites?.at(-1))
}

/**
 * Stubs `navigator.clipboard.writeText` to always reject, so a test can
 * deliberately force the failure path on an engine where the write would
 * otherwise succeed (WebKit, per `grantClipboardOrSkipWebkit`'s comment).
 * Must be added with `page.addInitScript` before `page.goto`.
 */
export async function stubClipboardWriteToReject(page: Page): Promise<void> {
  await page.addInitScript(() => {
    navigator.clipboard.writeText = () => Promise.reject(new Error('stubbed for e2e: forcing the fallback path'))
  })
}
