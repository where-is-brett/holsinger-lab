import type { JSHandle, Page } from '@playwright/test'
import { test } from '@playwright/test'

// A live handle to `document.activeElement`, not a serialised fingerprint:
// comparing handles by reference (`===`, evaluated in-page) is the only way
// to tell "focus moved to a *different* element" apart from "focus moved to
// an element that looks the same" -- e.g. the mobile menu panel's nav links
// share a tag name and carry no id or aria-label, so two different links
// are otherwise indistinguishable from outside the page.
async function activeElementHandle(page: Page): Promise<JSHandle<Element | null>> {
  return page.evaluateHandle(() => document.activeElement)
}

async function isSameElement(page: Page, a: JSHandle<Element | null>, b: JSHandle<Element | null>): Promise<boolean> {
  return page.evaluate(([x, y]) => x === y, [a, b])
}

async function isBodyOrNull(page: Page, handle: JSHandle<Element | null>): Promise<boolean> {
  return page.evaluate((el) => el === null || el === document.body, handle)
}

async function movedFocus(page: Page, before: JSHandle<Element | null>, after: JSHandle<Element | null>): Promise<boolean> {
  return !(await isSameElement(page, before, after)) && !(await isBodyOrNull(page, after))
}

/**
 * Returns a `pressTabStep()` function that moves keyboard focus by one
 * step for the rest of this `page`'s current test, picking Tab or Alt+Tab
 * (WebKit's own Option-Tab "highlight each item on a webpage" convention)
 * at runtime rather than assuming either from the project name or OS --
 * Option-Tab is a macOS WebKit convention, unproven on CI's Linux WebKit
 * build, where the plain-Tab policy may differ again.
 *
 * The choice is made once, on the first call, and reused for every
 * subsequent call -- not reprobed on every press. Measured: on WebKit,
 * pressing a plain Tab that does *not* move focus still resets Option-Tab's
 * own internal "highlight" cycle back to its first item, so interleaving a
 * probing Tab before every Alt+Tab (rather than deciding once) makes
 * Alt+Tab loop on the same element forever instead of ever progressing.
 * Each call is its own named `test.step`, so a report/trace shows which
 * key is in use. Throws -- failing the test, never skipping it -- if
 * neither key moves focus off `document.body` on the first call.
 */
export function createTabStepper(page: Page): () => Promise<void> {
  let resolvedKey: 'Tab' | 'Alt+Tab' | null = null

  return async function pressTabStep(): Promise<void> {
    if (resolvedKey !== null) {
      await test.step(resolvedKey, async () => {
        await page.keyboard.press(resolvedKey!)
      })
      return
    }

    const before = await activeElementHandle(page)

    await test.step('Tab', async () => {
      await page.keyboard.press('Tab')
    })
    let after = await activeElementHandle(page)
    if (await movedFocus(page, before, after)) {
      resolvedKey = 'Tab'
      return
    }

    await test.step('Alt+Tab (Tab did not move focus)', async () => {
      await page.keyboard.press('Alt+Tab')
    })
    after = await activeElementHandle(page)
    if (!(await movedFocus(page, before, after))) {
      throw new Error('Neither Tab nor Alt+Tab moved keyboard focus off document.body')
    }
    resolvedKey = 'Alt+Tab'
  }
}
