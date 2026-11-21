# seneca-cosmos-store
Seneca entity data storage plugin for CosmosDB

Requires Seneca 4, `@seneca/entity` 29 and Node.js 24 or later:

```sh
npm install seneca@^4 @seneca/entity @seneca/cosmos-store @azure/cosmos
```

## Test

The tests need a Cosmos DB account or the Cosmos DB emulator. Set
`SENECA_COSMOS_KEY` to the account key (for the emulator, its well-known
key from the emulator documentation) and `SENECA_COSMOS_ENDPOINT` to the
endpoint (default `https://localhost:8081`), or write `test/local-env.js`
as `test/setup.sh` describes. The Linux emulator (vNext preview) serves
plain HTTP:

```sh
docker run -p 8081:8081 mcr.microsoft.com/cosmosdb/linux/azure-cosmos-emulator:vnext-preview
export SENECA_COSMOS_ENDPOINT=http://127.0.0.1:8081
export SENECA_COSMOS_KEY='<emulator key>'
npm test
```

Without a key or `test/local-env.js`, only the plugin validation test runs.
