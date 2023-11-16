const { CosmosClient } = require('@azure/cosmos')
const config = require('./config')

// for local dev
process.env.NODE_TLS_REJECT_UNAUTHORIZED = 0

module.exports = {
  connect(opts = {}) {
    if (opts.verbose) {
      console.log('Connecting to CosmosDb with config:\n', config)
      console.log()
    }

    return new CosmosClient(config)

  }
}

