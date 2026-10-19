import { expect, test } from '@playwright/test'
import { readFileSync } from 'node:fs'

test('完整稿件、十组图表与主要交互', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (error) => { errors.push(error.message); console.error(error.stack) })
  await page.goto('/')
  await expect(page.locator('figure')).toHaveCount(10)
  await expect(page.locator('figure').filter({ has: page.locator('canvas') })).toHaveCount(10)
  await expect(page.locator('.reference-list li')).toHaveCount(29)
  const manuscript = readFileSync('原始稿件/综述稿.md', 'utf8').replace(/\r/g, '').split('\n# 资料来源')[0]
  const paragraphCount = manuscript.split(/^## /m).slice(1).flatMap((section) => section.slice(section.indexOf('\n')).trim().split(/\n\s*\n/)).length
  await expect(page.locator('.body-paragraph')).toHaveCount(paragraphCount)
  await expect(page.locator('.figure-tools, .data-table, #chart-index, .source-search, .data-downloads, blockquote, .section-deck, .reading-mode, .expand-text')).toHaveCount(0)
  await expect(page.locator('#sources h2')).toHaveText('参考文献')
  await expect(page.getByRole('button', { name: /CSV|PNG|^数据$/ })).toHaveCount(0)
  await page.screenshot({ path: 'artifacts/desktop.png' })

  const pace = page.locator('#figure-05')
  await pace.locator('select').selectOption('18—34岁')
  await expect(pace.locator('.chart-takeaway strong')).toHaveText('85%')

  const opinion = page.locator('#figure-06')
  await opinion.getByRole('button', { name: '跨国监管信任' }).click()
  await opinion.getByLabel('全部 30 国').check()
  await expect(opinion.locator('canvas')).toBeVisible()
  await expect(opinion.locator('.figure-note')).toContainText('原报告未覆盖中国')

  const policy = page.locator('#figure-07')
  await policy.locator('select').selectOption('美国')
  await policy.getByRole('button', { name: /S.5576/ }).click()
  await expect(policy.locator('.detail-tag')).toHaveText('提案')
  await expect(policy.locator('.evidence-detail')).toContainText('不能标成已生效')

  const companies = page.locator('#figure-03')
  await companies.locator('select').selectOption('13')
  await expect(companies.locator('.detail-tag')).toHaveText('资料不足')
  const defense = page.locator('#figure-10')
  await defense.getByRole('button', { name: '外部治理' }).click()
  await expect(defense.locator('.evidence-detail h4')).toHaveText('谁来监督并承担责任？')

  await page.locator('.citation').first().click()
  await expect(page).toHaveURL(/#ref-1$/)
  await page.locator('#sources').screenshot({ path: 'artifacts/references.png' })
  await expect(page.locator('.body-paragraph')).toHaveCount(paragraphCount)
  await expect(page.locator('figure')).toHaveCount(10)
  await page.locator('#figure-01').scrollIntoViewIfNeeded()
  await page.locator('#figure-01').screenshot({ path: 'artifacts/chart.png' })
  for (const number of ['03', '07', '08', '10']) {
    await page.locator(`#figure-${number}`).screenshot({ path: `artifacts/figure-${number}.png` })
  }
  expect(errors).toEqual([])
})
