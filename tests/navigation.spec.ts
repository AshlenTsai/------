import { expect, test } from '@playwright/test'

test('章节跳转、目录高亮与返回顶部保持一致', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('figure')).toHaveCount(9)
  const navigation = page.getByRole('navigation', { name: '文章目录' })

  for (const id of ['opinion', 'incidents', 'conclusion', 'policy', 'companies', 'introduction']) {
    const link = navigation.locator(`a[href="#${id}"]`)
    await link.click()
    await expect(page).toHaveURL(new RegExp(`#${id}$`))
    await expect(link).toHaveClass('active')
    await expect.poll(async () => page.locator(`#${id}`).evaluate((heading) => Math.round(heading.getBoundingClientRect().top))).toBe(96)
  }

  await navigation.locator('a[href="#conclusion"]').click()
  await expect(navigation.locator('a[href="#conclusion"]')).toHaveClass('active')
  await page.getByRole('button', { name: '返回顶部' }).click()
  await expect.poll(() => page.evaluate(() => Math.round(window.scrollY))).toBe(0)
  await expect(navigation.locator('a[href="#introduction"]')).toHaveClass('active')
})

test('带章节链接加载图表后仍正确定位，前进后退与手动滚动同步高亮', async ({ page }) => {
  let releaseData!: () => void
  const dataReady = new Promise<void>((resolve) => { releaseData = resolve })
  await page.route('**/data/*.json', async (route) => {
    await dataReady
    await route.continue()
  })
  await page.goto('/#policy')
  await expect(page.locator('#policy')).toBeVisible()
  releaseData()
  await expect(page.locator('figure')).toHaveCount(9)
  const navigation = page.getByRole('navigation', { name: '文章目录' })
  const expectChapter = async (id: string) => {
    await expect.poll(() => page.locator(`#${id}`).evaluate((heading) => Math.round(heading.getBoundingClientRect().top))).toBe(96)
    await expect(navigation.locator(`a[href="#${id}"]`)).toHaveAttribute('aria-current', 'location')
  }
  await expectChapter('policy')
  await navigation.locator('a[href="#opinion"]').click()
  await expectChapter('opinion')
  await page.goBack()
  await expectChapter('policy')
  await page.goForward()
  await expectChapter('opinion')
  await page.mouse.move(900, 300)
  await page.mouse.wheel(0, -250)
  await expect(navigation.locator('a[href="#companies"]')).toHaveAttribute('aria-current', 'location')
})
