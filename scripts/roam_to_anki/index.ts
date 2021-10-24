import { setupRoam, query } from '../../lib/roam.ts'
const password = process.env.PASSWORD
const email = process.env.EMAIL

setupRoam({ password, email, graph: "Hehk" }).then(roam => {
  return query(roam, '[:find ?p ?title :where [?p :node/title ?title]]')
}).then(console.log)

