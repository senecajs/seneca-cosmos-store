
# 1. START THE DOCKER CONTINER
# sudo docker run     --cpuset-cpus=0-3 -p 8081:8081     -p 10250-10255:10250-10255     --interactive     --tty     mcr.microsoft.com/cosmosdb/linux/azure-cosmos-emulator:latest

# 2. CREATE THE SAMPLE DB TABLES
# npm run test-create-db

# 3. EXPORT AS ENV VAR, FROM https://learn.microsoft.com/en-us/azure/cosmos-db/emulator#authentication
# export SENECA_COSMOS_KEY="..."
#
# 4. CREATE THE local-env.js file
# module.exports = {
#  'cosmos-account-endpoint': 'https://localhost:8081',
  #'cosmos-account-key': '...',
#}
#
# 5. > export COSMOS_LOCAL_DEV=1
# 6. > npm run test


# pull the latest Docker emulator to the local docker host:
docker pull mcr.microsoft.com/cosmosdb/linux/azure-cosmos-emulator:latest

# Check to make sure that the emulator image has been pulled to your local Docker host.

docker images


docker run \
    -p 8081:8081 \
    -p 10250-10255:10250-10255 \
    --interactive \
    --tty \
    mcr.microsoft.com/cosmosdb/linux/azure-cosmos-emulator:latest


