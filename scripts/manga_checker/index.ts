import puppeteer from "puppeteer-core"

const getOnePiece = (page) => {
  
}

const mangaGetter = [getOnePiece]

const init = async () => {
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: process.env.CHROME_LOC
  })

  const response = await Promise.all(mangaGetter.map(async getter => {
    const page = await browser.newPage()
    return getter(page)
  }))

  console.log(response)
}


