
const Seneca = require('seneca')
const AzureCosmos = require('@azure/cosmos')


process.env.NODE_TLS_REJECT_UNAUTHORIZED = 0

var s0 = Seneca({ legacy: false }).test()
.ignore_plugin('mem-store')
    .use('promisify')
    .use('entity')
    .use('doc')
    .use('..', {
      sdk: () => AzureCosmos,
      cosmos: {
        endpoint: 'https://localhost:8081',
        key: 'C2y6yDjf5/R+ob0N8A7Cgv30VRDJIWEHLM+4QDU5DE2nQ9nDuVTqobD4b8mGGyPMbIZnqyMsEcaGQy67XIw/Jw==',
      }

    })

run()

async function run() {
  var t01 = s0.entity('db1/container1').make$().data$({
    id: 't6wq1o',
    //bar: 'b1',
    foo: 'a2',
  })
  console.log('A', t01)
  
  var t01o = await t01.save$()
  console.log('B', t01o)
  let t02o = await s0.entity('db1/container1').save$({id: 'a7wq2o', foo: 'a3'})
  console.log('C', t02o)

  let t03o = await s0.entity('db1/container1').save$({id: 'y8bx03', foo: 'a445'})

  var list = await t01.list$()

  console.log('t01o list: ', list)

  console.log('t01o load: ', await s0.entity('db1/container1').load$('t6wq1o') )

  await s0.entity('db1/container1').remove$('t6wq1o')

  console.log('t01o load: ', await s0.entity('db1/container1').load$('t6wq1o') )

}
