const CosmosDb = require('./client')

const codb = CosmosDb.connect({ verbose: true })

delete_container_all('db1', { verbose: true })


async function delete_container_all(dbId, opts = {}) {
  try {
    const db = codb.database(dbId)
    const { resources: containers } = await db.containers.readAll().fetchAll()
    for(const container of containers) {
      db.container(container.id).delete(container.id)
        .then(res => {
          if (opts.verbose) {
            console.log('Container "' + container.id + '" has been deleted successfully.')
          }
        })
        .catch(err => {
          console.error('Error:', err.message)
          return
        })
    }
  } catch(err) {
    console.error(err.message)
  }


  /*
  const { resources: dbs } = await codb.databases.readAll().fetchAll()
  for( const db of dbs ) {
    codb.database(db.id).delete()
      .then(res => {
        if (opts.verbose) {
          console.log('Database "' + db.id + '" has been deleted successfully.')
        }
      })
      .catch(err => {
        console.error('Error:', err.message)
        return
      })
  }
   */
}

