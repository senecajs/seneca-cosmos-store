const { CosmosClient } = require('@azure/cosmos')
const config = require('./config')

// for local dev
if (process.env.COSMOS_LOCAL_DEV) {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = 0
}

module.exports = {
  connect(opts = {}) {
    if (opts.verbose) {
      // The config holds the account key, so only the endpoint is printed.
      console.log('Connecting to CosmosDb at', config.endpoint)
      console.log()
    }

    return new CosmosClient(config)

  }
}

