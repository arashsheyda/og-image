import type { Buffer } from 'node:buffer'
import type { Browser, PageScreenshotOptions } from 'playwright-core'
import { joinURL, withQuery } from 'ufo'
import type { OgImageRenderEventContext } from '../../../types'
import { useNitroOrigin } from '#imports'

export async function createScreenshot({ basePath, e, options, extension }: OgImageRenderEventContext, browser: Browser): Promise<Buffer> {
  const path = options.component === 'PageScreenshot' ? basePath : joinURL('/__og-image__/image', basePath, `og.html`)
  // TODO add screenshotOptions
  const page = await browser.newPage({
    colorScheme: options.colorScheme,
    baseURL: useNitroOrigin(e),
  })
  if (import.meta.prerender && !options.html) {
    // we need to do a nitro fetch for the HTML instead of rendering with playwright
    options.html = await e.$fetch(path)
  }
  try {
    await page.setViewportSize({
      width: options.width || 1200,
      height: options.height || 630,
    })

    if (options.html) {
      const html = options.html
      await page.evaluate((html) => {
        document.open('text/html')
        document.write(html)
        document.close()
      }, html)
      await page.waitForLoadState('networkidle')
    }
    else {
      // avoid another fetch to the base path to resolve options
      await page.goto(withQuery(path, options.props), {
        timeout: 10000,
        waitUntil: 'networkidle',
      })
    }

    const screenshotOptions: PageScreenshotOptions = {
      timeout: 10000,
      animations: 'disabled',
      type: extension === 'png' ? 'png' : 'jpeg',
    }

    // if (options.delay)
    //   await page.waitForTimeout(options.delay)

    if (options.mask) {
      await page.evaluate((mask) => {
        for (const el of document.querySelectorAll(mask) as any as HTMLElement[])
          el.style.display = 'none'
      }, options.mask)
    }
    if (options.selector)
      return await page.locator(options.selector).screenshot(screenshotOptions)

    return await page.screenshot(screenshotOptions)
  }
  finally {
    await page.close()
  }
}
