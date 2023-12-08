
# Setup aws localtest profile:
# $ aws configure --profile localtest
# AWS Access Key ID [None]: none
# AWS Secret Access Key [None]: none
# Default region name [None]: region
# Default output format [None]: 


# Start local dynamodb in local docker
# docker run -d -p 18000:8000 amazon/dynamodb-local

# check local dynamodb is up
# aws dynamodb list-tables --endpoint-url http://localhost:18000 --profile localtest

# open web shell (if required)
# open http://localhost:18000/shell

# create test tables
# node create.js
# node support/db/create-test-tables.js 

# check test tables exist
# aws dynamodb list-tables --endpoint-url http://localhost:18000 --profile localtest


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

