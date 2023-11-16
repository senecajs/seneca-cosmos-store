

var AWS = require("aws-sdk")

AWS.config.update({
  region: "region",
  endpoint: "http://localhost:18000",
})

var db = new AWS.DynamoDB()
var dc = new AWS.DynamoDB.DocumentClient()


db.listTables({}, console.log)

dc.put({
  TableName: 'table01',
  Item: {
    id: 'a0',
    foo: 'f-a0'
  }
}, console.log)
