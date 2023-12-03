
const COSMOS = require('@azure/cosmos')


// for local dev
process.env.NODE_TLS_REJECT_UNAUTHORIZED = 0

var db = new COSMOS.CosmosClient({
  endpoint: 'https://localhost:8081',
  key: process.env.SENECA_COSMOS_KEY,
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
