const CosmosDb = require('./client')

const codb = CosmosDb.connect({ verbose: true })


codb.databases
  .readAll()
  .fetchAll()
  .then(({resources}) => {
    console.log(resources)
  })
  .catch(err => {
    console.error('Error:', err.message)
    process.exit(1)
  })

/*
ddb.listTables({}, (err, result) => {
  if (err) {
    console.error('Error:', err.message)
    return process.exit(1)
  }

  console.log(result)
})
*/
