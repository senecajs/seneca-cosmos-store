
const Seneca = require('seneca')
const AzureCosmos = require('@azure/cosmos')


process.env.NODE_TLS_REJECT_UNAUTHORIZED = 0

var dbConfig = {
  id: 'db2',
  // throughput: 400
}

var conConfig = {
  /*
  partitionKey: {
    paths: [
      '/id'
    ],
    kind: 'MultiHash',
    version: 2
  }
  */
}


var s0 = Seneca({ legacy: false })
  .test()
  .ignore_plugin('mem-store')
  .use('promisify')
  .use('entity')
  .use('doc')
  .use('..', {
    sdk: () => AzureCosmos,
    dbConfig,
    conConfig,
    cosmos: {
      endpoint: 'https://localhost:8081',
      key: process.env.SENECA_COSMOS_KEY,
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

  var list = await t01.list$({ limit$: 2 })
  console.log('list: ', list.length)

  console.log('t01o load: ', await s0.entity('db1/container1').load$('t6wq1o') )

  await s0.entity('db1/container1').remove$('t6wq1o')

  console.log('t01o load: ', await s0.entity('db1/container1').load$('t6wq1o') )

 // t03o = await t03o.remove$()
  
  t03o.foo78 = 'adfsd101'
  t03o.p = 'adfsd102'
  await t03o.save$()

  await s0.entity('db1/container1').save$({ id: 'y8bx03', aa: 'aa' })


  t03o = await s0.entity('db1/container1').load$('y8bx03')

  console.log(t03o)



  console.log (
    await s0.entity('db1/container1').remove$({ all$: true })
  )
  /*
  // console.log(
    //await s0.entity('db1/container1').list$()
 // )

  let f1 = await s0.entity('db1/container1').make$().data$({
    foo: 'a1',
  }).save$()
  console.log('f1: ', f1._ts)
  setTimeout(async ()=>{
    f1 = await f1.data$({foo1: 'a2'}).save$()
    console.log('updated: ', f1._ts)

    console.log( (await s0.entity('db1/container1').load$(f1.id))._ts )
  }, 3000)
  console.log(await s0.entity('db1/container1').list$() )
  */

}
