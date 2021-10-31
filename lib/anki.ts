import fetch from "node-fetch"
// Docs: https://foosoft.net/projects/anki-connect/#deck-actions

async function invoke(action: string, params: unknown) {
  const url = process.env.ANKI_URI
  if (!url) throw new Error("Never set ANKI_URI")

  try {
    const response = await fetch(url, {
      method: "POST",
      body: JSON.stringify({
        action,
        params,
        version: 6,
      }),
    })
    const json: any = await response.json()
    if (json.error) throw json.error

    return json.result
  } catch (e) {
    throw e
  }
}

export function deckNames(): Promise<{
  result: string[]
  error: null | string
}> {
  return invoke("deckNames", {})
}

type AddNote = {
  deckName: string
  modelName: "Basic" | "Basic (and reversed card)"
  fields: {
    // IDK why but these fields are randomly uppercase...
    Front: string
    Back: string
  }
  options: {
    allowDuplicate?: boolean
    duplicateScope?: string
  }
  tags: string[]
}
export function addNote(params: AddNote): Promise<unknown> {
  return invoke("addNote", { note: params })
}
