import dotenv from 'dotenv'
import { setupRoam, query } from '../../lib/roam.ts'
dotenv.config()

const parseTerm = s => {
  const [_, page, definition] = s.match(/\[\[(.*?)\]\](.*)/)  
  const termAndDomain = page.split('/')
  const term = termAndDomain.slice(termAndDomain.length - 1)[0]
  const domains = termAndDomain.slice(0, termAndDomain.length - 1)

  return {
    term,
    domains,
    definition: definition.trim()
  }
}

setupRoam({ password : process.env.ROAM_PASSWORD, email : process.env.ROAM_EMAIL, graph: "Hehk" })
.then(async roam => {
  const termResult = await query(roam, `[
    :find (pull ?referencingBlock [:block/string])
    :in $ ?pagetitle
    :where 
      [?referencingBlock :block/refs ?referencedPage]
      [?referencedPage :node/title ?pagetitle]
  ]`, "Term")
  const terms = termResult.map(t => t[0].string).map(parseTerm)
  console.log(terms)

  return roam
}).then(roam => {
  roam.close()
  process.exit()
})

