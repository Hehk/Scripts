import puppeteer from "puppeteer-core"

type Brand<K, T> = K & { __brand: T }
export type RoamPage = Brand<puppeteer.Page, "RoamPage">

export function run() {
  console.log("FAILED")
}

type SetupRoam = {
  password: string
  email: string
  graph: string
}

const delay = (ms: number) => new Promise((res) => setTimeout(res, ms))

export async function setupRoam({
  password,
  email,
  graph,
}: SetupRoam): Promise<RoamPage> {
  const roamApp = "https://roamresearch.com/#/app"
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: process.env.CHROME_LOC,
    args: ["--no-sandbox"],
  })
  const page = await browser.newPage()
  await page.goto(roamApp)
  await page.waitForSelector(`input[name="email"]`)

  await page.type(`input[name="email"]`, email)
  await page.type(`input[name="password"]`, password)
  await page.click(".bp3-button")

  await page.goto(roamApp + `/${graph}`)

  // It can take a while for roam to load
  // TODO figure out a better way to make this work X.x
  await delay(20_000)
  return page as RoamPage
}

declare global {
  interface Window {
    roamAlphaAPI: {
      q: (...query: string[]) => unknown
    }
  }
}

export async function query(roamPage: RoamPage, ...query: string[]) {
  return await roamPage.evaluate(
    (query) => window.roamAlphaAPI.q(...query),
    query
  )
}
