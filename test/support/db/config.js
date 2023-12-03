module.exports = {
  endpoint: process.env.SENECA_COSMOS_ENDPOINT || 'https://localhost:8081',
  // see: https://learn.microsoft.com/en-us/azure/cosmos-db/emulator#authentication
  // for default auth key
  key: process.env.SENECA_COSMOS_KEY
}
