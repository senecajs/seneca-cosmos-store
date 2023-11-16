
const COSMOS = require('@azure/cosmos')


// for local dev
process.env.NODE_TLS_REJECT_UNAUTHORIZED = 0

var db = new COSMOS.CosmosClient({
  endpoint: "https://localhost:8081",
  key: 'C2y6yDjf5/R+ob0N8A7Cgv30VRDJIWEHLM+4QDU5DE2nQ9nDuVTqobD4b8mGGyPMbIZnqyMsEcaGQy67XIw/Jw==',
})
var dc = db.database('db1')
var con = dc.container('container1')


db.databases
  .readAll()
  .fetchAll()
  .then(({resources}) => {
    console.log(resources)
  })
  .catch(err => {
    console.log('err: ', err.message)
    process.exit(1)
  })


// console.log(con)

con.items.upsert({
  id: 'a0',
  foo: 'f-a0',
}).then(({resource}) => console.log(resource))
  .catch(console.error)

/*
dc.put({
  TableName: 'table01',
  Item: {
    id: 'a0',
    foo: 'f-a0'
  }
}, console.log)
*/
