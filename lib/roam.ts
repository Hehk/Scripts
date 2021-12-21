import puppeteer from "puppeteer-core"

export type Block = {

}

export class Roam {
  #page: puppeteer.Page
  #browser: puppeteer.Browser
  constructor (page : puppeteer.Page, browser : puppeteer.Browser) {
    this.#page = page
    this.#browser = browser
  }

  close () {
    this.#page.close()
    this.#browser.close()
  }

  query<T> (...query: string[]) : Promise<T> {
    return this.#page.evaluate(
      (query) => window.roamAlphaAPI.q(...query),
      query
    ) as Promise<T>
  }

  async getPage (pageName: string) : Promise<string | undefined> {
    const query = `[:find ?uid
     :in $ ?title
     :where
     [?page :node/title ?title]
     [?page :block/uid ?uid]
    ]`
    type queryResults = [string][]
    const result = await this.#page.evaluate(
      ({ query, pageName }) => window.roamAlphaAPI.q(query, pageName),
        { query, pageName }
    ) as queryResults
    return result[0]?.[0]
  }

  async createBlock (pageId : string, block : Block, order: number) {
    return this.#page.evaluate(
      ({ block, pageId, order }) => window.roamAlphaAPI.createBlock({
        location: {"parent-uid": pageId, order },
        block: block
      }),
      { block, pageId, order }
    )
  }
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
}: SetupRoam): Promise<Roam> {
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
  return new Roam(page, browser)
}

declare global {
  interface Window {
    roamAlphaAPI: {
      q: (...query: string[]) => unknown
      createBlock: (args: unknown) => unknown
    }
  }
}
