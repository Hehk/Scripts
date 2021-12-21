import dotenv from "dotenv"
import * as Anki from "../../lib/anki"
import { setupRoam, Roam } from "../../lib/roam"
dotenv.config()

type Term = {
  term: string
  domains: string[]
  definition: string
}

const exists = <T>(x: T | undefined): x is T => !!x

const parseTerm = (s: string): Term | undefined => {
  const match = s.match(/\[\[(.*?)\]\](.*)/)
  if (!match) return

  const [_, page, definition] = match
  const termAndDomain = page.split("/")
  const term = termAndDomain.slice(termAndDomain.length - 1)[0]
  const domains = termAndDomain.slice(0, termAndDomain.length - 1)

  return {
    term,
    domains,
    definition: definition.trim(),
  }
}

const password = process.env.ROAM_PASSWORD
const email = process.env.ROAM_EMAIL
if (!password || !email) {
  console.error("ROAM_PASSWORD or ROAM_EMAIL are not set")
  process.exit(1)
}

setupRoam({
  password,
  email,
  graph: "Hehk",
})
  .then(async (roam: Roam) => {
    // Right now, it is a pain in the ass to type this result...
    const termResult: any = await roam.query(
      `[
    :find (pull ?referencingBlock [:block/string])
    :in $ ?pagetitle
    :where 
      [?referencingBlock :block/refs ?referencedPage]
      [?referencedPage :node/title ?pagetitle]
  ]`,
      "Term"
    )
    const terms = termResult
      .map((t: any) => t[0].string)
      .map(parseTerm)
      .filter(exists)

    for (const term of terms) {
      try {
        await Anki.addNote({
          deckName: "General Knowledge",
          modelName: "Basic",
          fields: {
            Front: term.term,
            Back: term.definition,
          },
          options: {
            allowDuplicate: false,
          },
          tags: term.domains,
        })
      } catch (e) {
        if (e === "cannot create note because it is a duplicate") {
          console.log(`Duplicate: ${term.term}`)
        } else {
          console.error(e)
        }
      }
    }

    return roam
  })
  .then(async (roam: Roam) => {
    const nlResults: any = await roam.query(
      `[:find (pull ?referencingBlock [:block/string])
        :in $ ?nederlands
        :where
          [?referencingBlock :block/refs ?referencedPage]
          [?referencedPage :node/title ?nederlands]]`,
      "Nederlands"
    )
    type Word = {
      word: string
      translation: string
    }
    const words: Word[] = nlResults
      .map((t: any) => t[0].string)
      .map((line: string) => {
        const [word, translation] = line.replace("#Nederlands", "").split(":")
        return { word: word.trim(), translation: translation.trim() }
      })

    for (const word of words) {
      try {
        await Anki.addNote({
          deckName: "Dutch::Dutch random words",
          modelName: "Basic (and reversed card)",
          fields: {
            Front: word.word,
            Back: word.translation,
          },
          options: {
            allowDuplicate: false,
          },
          tags: [],
        })
        console.log(`Added: ${word.word}`)
      } catch (e) {
        if (e !== "cannot create note because it is a duplicate") {
          console.error(e)
        }
      }
    }

    return roam
  })
  .then(async (roam: Roam) => {
    const jargon : [string, string, string][] = await roam.query(`[
      :find ?title ?domain ?definition
      :where [?domainRef :node/title "Domain"]
             [?a :block/refs ?domainRef]
             [?a :block/page ?page]
             [?defRef :node/title "Definition"]
             [?b :block/refs ?defRef]
             [?b :block/page ?page]

             [?page :node/title ?title]
             [?b :block/string ?definition]
             [?a :block/string ?domain]
      ]`)
    const formattedJargon = jargon.map(([term, domain, definition]) => {
      if (term === 'Jargon' || term === 'Templates') return
      const domains = domain.match(/(#\S+)|(#?\[\[.+?\]\])/g)?.map(d => d.replaceAll(/#|\[|\]/g, '')) || []

      return {
        term,
        domains,
        definition: definition.replace('Definition::', '').trim()
      }
    }).filter(exists)

    for (const jargon of formattedJargon) {
      try {
        await Anki.addNote({
          deckName: "General Knowledge",
          modelName: "Basic",
          fields: {
            Front: jargon.term,
            Back: jargon.definition,
          },
          options: {
            allowDuplicate: false,
          },
          tags: jargon.domains,
        })
        console.log(`Added: ${jargon.term}`)
      } catch (e) {
        if (e !== "cannot create note because it is a duplicate") {
          console.error(e)
        }
      }
    }
     
    return roam
  })
  .then(async (roam: Roam) => {
    type node = {
      children: {
        string: string
      }[]
    }
    type response = [string, node]
    const resp : response[] = await roam.query<response[]>(`[
      :find ?question (pull ?questionRef [{:block/children [:block/string]}])
      :where
          [?link :node/title "Review Question"]
          [?questionRef :block/refs ?link]
          [?questionRef :block/string ?question]
      ]`)
    const questions = resp.map(([question, node]) => {
      question = question.replace('#[[Review Question]]', '').trim()
      // I am still bad at pull X.x
      const children = node.children.map(x => x.string)
      const answer = (children.find((c : any) => c.startsWith('Answer:')) || '').trim()
      if (!answer || !question) return

      const tags = (children.find((c : string) => c.startsWith('Tags:')) || '').trim().match(/(#\S+)|(#?\[\[.+?\]\])/g)?.map((d:string) => d.replaceAll(/#|\[|\]/g, '')) || []

      console.log(question, answer)
      return { question, answer, tags }
    }).filter(exists)

    for (const q of questions) {
      try {
        await Anki.addNote({
          deckName: "General Knowledge",
          modelName: "Basic",
          fields: {
            Front: q.question,
            Back: q.answer,
          },
          options: {
            allowDuplicate: false,
          },
          tags: q.tags,
        })
        console.log(`Added: ${q.question}`)
      } catch (e) {
        if (e !== "cannot create note because it is a duplicate") {
          console.error(e)
        }
      }
    }

    return roam
  })
  .then((roam: Roam) => {
    roam.close()
    process.exit()
  })
  .catch(e => {
    console.error(e)
    process.exit(1)
  })
