const CosmosDb = require('./client')

const codb = CosmosDb.connect({ verbose: true })



const partitionKey = {
  paths: [
    '/id'
  ],
  kind: 'MultiHash',
  version: 2
}

const dbs = [

  {
    id: 'db1',
    throughput: 400,
    container: [
      {
        id: 'container1',
        partitionKey,
      },
      {
        id: 'test_foo',
        partitionKey,
      },
      {
        id: 'moon_bar',
        partitionKey,
      },
      {
        id: 'racers',
        partitionKey,
      },

      {
        id: 'foo',
        partitionKey,
      },
      {
        id: 'players',
        partitionKey,
      },

      {
        id: 'users',
        partitionKey,
      },

      {
        id: 'products',
        partitionKey,
      },

      {
        id: 'custom01',
        partitionKey,
      },

      {
        id: 'customers',
        partitionKey,
      },

      {
        id: 'ENT0',
        partitionKey,
      },

      {
        id: 'uniq01',
        partitionKey,
      }

    ]

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
    for(let conConfig of co) {
      try {
        const {
          container
        } = await database.containers.createIfNotExists(conConfig)
        if (opts.verbose) {
          console.log(`Database "${db.id}" with container "${container.id}" has been created successfully.`)
        }
      } catch (err) {
        console.error('Error creating container "' + conConfig.id + '":', err.message)
        return
      }
    }
  } catch (err) {
      console.error('Error creating database "' + db.id + '":', err.message)
      return
  }


  db.container = co


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

