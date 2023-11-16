const CosmosDb = require('./client')

const codb = CosmosDb.connect({ verbose: true })


/*
delete_table_if_not_exists('test_foo', ddb, { verbose: true })
delete_table_if_not_exists('foo', ddb, { verbose: true })
delete_table_if_not_exists('moon_bar', ddb, { verbose: true })
delete_table_if_not_exists('players', ddb, { verbose: true })
delete_table_if_not_exists('racers', ddb, { verbose: true })
delete_table_if_not_exists('users', ddb, { verbose: true })
delete_table_if_not_exists('customers', ddb, { verbose: true })
*/
delete_database_if_not_exists('db1', codb, { verbose: true })


function delete_database_if_not_exists(db, codb, opts = {}) {
  codb.database(db).delete(db)
    .then(res => {
      if (opts.verbose) {
        console.log('Database "' + db + '" has been deleted successfully.')
      }

    })
    .catch(err => {
      console.error('Error:', err.message)
      return
    })

}

