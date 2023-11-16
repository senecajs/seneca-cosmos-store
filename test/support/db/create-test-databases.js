const CosmosDb = require('./client')

const codb = CosmosDb.connect({ verbose: true })


const dbs = [

  {
    id: 'db1',
    throughput: 400,
    container: {
      id: 'container1',
      partitionKey: {
        paths: [
          '/id'
        ],
        kind: 'MultiHash',
        version: 2
      }
    }
  }

]

for (const db of dbs) {
  create_db(db, codb, { verbose: true })
}


async function create_db(db, codb, opts = {}) {
  let co = db.container
  delete db.container

  try {
    const { database } = await codb.databases.createIfNotExists(db)
    try {
      const { container } = await database.containers.createIfNotExists(co)
    } catch (err) {
      console.error('Error creating container "' + co.id + '":', err.message)
      return
    }
  } catch (err) {
      console.error('Error creating database "' + db.id + '":', err.message)
      return
  }


  db.container = co

  if (opts.verbose) {
    console.log(`Database "${db.id}" with container "${co.id}" has been created successfully.`)
  }

  return

  /*
  return ddb.createTable(table_desc, (err) => {
    if (err) {
      const table = table_desc.TableName || 'undefined'
      console.error('Error creating table "' + table + '":', err.message)
    }

    if (opts.verbose) {
      const table = table_desc.TableName
      console.log('Table "' + table + '" has been created successfully.')
    }

    return
  })
  */

}

