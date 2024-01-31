/* Copyright (c) 2019-2022 Richard Rodger and other contributors, MIT License */
'use strict'

const COSMOS_SDK = require('@azure/cosmos')

const Code = require('@hapi/code')
const expect = Code.expect

const Lab = require('@hapi/lab')
const lab = (exports.lab = Lab.script())

const Seneca = require('seneca')
const Plugin = require('..')
const PluginValidator = require('seneca-plugin-validator')

const LegacyStoreTest = require('seneca-store-test')

// for local dev
if (process.env.COSMOS_LOCAL_DEV) {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = 0
}

function make_seneca(config) {
  config = Object.assign({ seneca: {}, plugin: {} }, config)
  return Seneca(Object.assign({ legacy: false }, config.seneca))
    .test()
    .use('promisify')
    .use('entity', { mem_store: false })
    .use('doc')
    .use(
      '..',
      Object.assign(
        {
          sdk: () => COSMOS_SDK,
          cosmos: {
            endpoint:
              process.env.SENECA_COSMOS_ENDPOINT || 'https://localhost:8081',
            // see: https://learn.microsoft.com/en-us/azure/cosmos-db/emulator#authentication
            // for default auth key
            key: process.env.SENECA_COSMOS_KEY,
            // container: { create: false },
            database: {
              // create: false,
              config: {
                id: 'db1',
              },
            },
          },
        },
        config.plugin
      )
    )
}

async function generate_entries(si, q_name, entries) {
  for (let entry of entries) {
    await si.entity(q_name).save$(entry)
  }
}

/*
let containerConfig = {

  indexingPolicy: {
    includedPaths: [
      { path: "/*" },  // Index all paths
      // Add more specific paths if needed
    ],
    excludedPaths: [
      // Exclude paths if needed
    ]
  },
  
  partitionKey: {
    paths: [
      '/id',
    ],
    kind: 'MultiHash',
    version: 2
  }
}
*/

lab.test('validate', PluginValidator(Plugin, module))

lab.test('happy', async () => {
  var si = make_seneca()
  await si.ready()
  expect(si.find_plugin('cosmos-store$1')).exists()

  // double load works
  si.use('..')
  await si.ready()
  expect(si.find_plugin('cosmos-store$2')).exists()
})

lab.test('no-dups', async () => {
  var si = make_seneca()
  await si.ready()
  si.quiet()

  let list = await si.entity('uniq01').list$()
  for (let entry of list) {
    await entry.remove$()
  }

  let a0 = await si.entity('uniq01').save$({ id$: 'a0', x: 1, d: Date.now() })
  expect(a0.id).equal('a0')

  try {
    let a0d = await si.entity('uniq01').save$({ id$: 'a0', x: 2 })
    // console.log(a0d)
  } catch (e) {
    // console.log(e)
    expect(e).exist()
  }

  list = await si.entity('uniq01').list$()
  // console.log(list)
  expect(list.length).equal(1)
})

lab.test('special-query', async () => {
  var si = make_seneca({})
  await si.ready()
  // si.quiet()

  // console.log('FIRST',await si.entity('query01').load$({id:'q0',sk0:'a'}))

  let list = await si.entity('query01').list$({})
  // console.log('EXISTING', list)

  for (let entry of list) {
    // console.log('REMOVE', list)
    await entry.remove$({ id: entry.id, sk0: entry.sk0 })
  }

  await si
    .entity('query01')
    .save$({ id$: 'q0', sk0: 'a', ip0: 'A', ip1: 'AA', is1: 0, d: 10 })

  await si
    .entity('query01')
    .save$({ id$: 'q1', sk0: 'a', ip0: 'B', ip1: 'AA', is1: 0, d: 10 })
  await si
    .entity('query01')
    .save$({ id$: 'q2', sk0: 'b', ip0: 'B', ip1: 'AA', is1: 0, d: 10 })
  await si
    .entity('query01')
    .save$({ id$: 'q3', sk0: 'c', ip0: 'C', ip1: 'AA', is1: 1, d: 10 })
  await si
    .entity('query01')
    .save$({ id$: 'q4', sk0: 'c', ip0: 'C', ip1: 'AA', is1: 2, d: 10 })
  await si
    .entity('query01')
    .save$({ id$: 'q5', sk0: 'c', ip0: 'C', ip1: 'BB', is1: 0, d: 10 })

  list = await si.entity('query01').list$()
  // console.log('ALL', list)
  expect(list.map((ent) => ent.id).sort()).equal([
    'q0',
    'q1',
    'q2',
    'q3',
    'q4',
    'q5',
  ])

  let q = { id: 'q0', sk0: 'a' }
  list = await si.entity('query01').list$(q)
  // console.log('Q', q, list)
  expect(list.map((ent) => ent.id).sort()).equal(['q0'])

  q = { id: 'q0', sk0: 'a', d: 10 }
  list = await si.entity('query01').list$(q)
  // console.log('Q', q, list)
  expect(list.map((ent) => ent.id).sort()).equal(['q0'])

  q = { sk0: 'a' }
  list = await si.entity('query01').list$(q)
  // console.log('Q', q, list)
  expect(list.map((ent) => ent.id).sort()).equal(['q0', 'q1'])

  q = { sk0: 'a', d: 10 }
  list = await si.entity('query01').list$(q)
  // console.log('Q', q, list)
  expect(list.map((ent) => ent.id).sort()).equal(['q0', 'q1'])

  q = { ip0: 'A' }
  list = await si.entity('query01').list$(q)
  // console.log('Q', q, list)
  expect(list.map((ent) => ent.id).sort()).equal(['q0'])

  q = { ip0: 'A', d: 10 }
  list = await si.entity('query01').list$(q)
  // console.log('Q', q, list)
  expect(list.map((ent) => ent.id).sort()).equal(['q0'])

  q = { ip1: 'AA' }
  list = await si.entity('query01').list$(q)
  // console.log('Q', q, list)
  expect(list.map((ent) => ent.id).sort()).equal(['q0', 'q1', 'q2', 'q3', 'q4'])

  q = { ip1: 'AA', d: 10 }
  list = await si.entity('query01').list$(q)
  // console.log('Q', q, list)
  expect(list.map((ent) => ent.id).sort()).equal(['q0', 'q1', 'q2', 'q3', 'q4'])

  q = { ip1: 'AA', is1: 0 }
  list = await si.entity('query01').list$(q)
  // console.log('Q', q, list)
  expect(list.map((ent) => ent.id).sort()).equal(['q0', 'q1', 'q2'])

  q = { ip1: 'AA', is1: 0, d: 10 }
  list = await si.entity('query01').list$(q)
  // console.log('Q', q, list)
  expect(list.map((ent) => ent.id).sort()).equal(['q0', 'q1', 'q2'])
  
  let foo0 = await si.entity('foo')
  await foo0.save$({ d:12 })
  expect(foo0.id, 'entity id exists').exists()
  

  // console.log('END')
})

lab.describe('simple-sort-query-test', () => {
  const plugin = {}

  const si = make_seneca({ plugin })

  lab.before(() => si.ready())

  let q = {}
  let list = []

  lab.test('generate_entries', async () => {
    await generate_entries(si, 'query02', [
      { id$: 'q3', sk1: 'c', ip2: 'C', ip3: 'AA', is2: 1, d: 10, when: 0 },
      { id$: 'q0', sk1: 'a', ip2: 'A', ip3: 'AA', is2: 4, d: 10, when: 1 },
      { id$: 'q1', sk1: 'a', ip2: 'B', ip3: 'AA', is2: 9, d: 10, when: 2 },
      { id$: 'q2', sk1: 'b', ip2: 'B', ip3: 'AA', is2: 8, d: 10, when: 3 },
      { id$: 'q4', sk1: 'c', ip2: 'C', ip3: 'AA', is2: 7, d: 10, when: 4 },
      { id$: 'q5', sk1: 'c', ip2: 'C', ip3: 'BB', is2: 6, d: 10, when: 5 },
      { id$: 'q7', sk1: 'c', ip2: 'C', ip3: 'BB', is2: 3, d: 12, when: 6 },
      { id$: 'q6', sk1: 'c', ip2: 'C', ip3: 'BB', is2: 2, d: 11, when: 7 },
      { id$: 'q8', sk1: 'c', ip2: 'C', ip3: 'BB', is2: 5, d: 13, when: 8 },
    ])
  })

  lab.test('ASC sort$: 1', async () => {
    q = { sort$: { is2: 1 } }
    list = await si.entity('query02').list$(q)

    expect(list.map((e) => e.is2)).equal(
      Array(9)
        .fill()
        .map((v, i) => i + 1)
    )
  })

  lab.test('reserved keyword as field name', async () => {
    q = { sort$: { when: 1 } }
    list = await si.entity('query02').list$({ sort$: { when: 1 } })

    expect(list.map((e) => e.when)).equal(
      Array(9)
        .fill()
        .map((v, i) => i)
    )
  })

  lab.test('DESC sort$: -1', async () => {
    q = { sort$: { is2: -1 } }
    list = await si.entity('query02').list$(q)

    expect(list.map((e) => e.is2)).equal(
      Array(9)
        .fill()
        .map((v, i) => 9 - i)
    )
  })

  lab.test('combine sort$, limit$', async () => {
    list = await si
      .entity('query02')
      .list$({ sort$: { is2: 1 }, limit$: 2, ip3: 'AA' })
    expect(list.map((e) => e.is2)).equal([1, 4])
  })

  lab.test('clear', async () => {
    await si.entity('query02').remove$({ all$: true })
  })
})

lab.test('double sort', async () => {
  const plugin = {}

  const si = make_seneca({ plugin })

  lab.before(() => si.ready())

  await generate_entries(si, 'query03', [
    { id$: 'q0', firstName: 'John', lastName: 'Doe', age: 30 },
    { id$: 'q1', firstName: 'Alice', lastName: 'Smith', age: 25 },
    { id$: 'q2', firstName: 'Bob', lastName: 'Johnson', age: 35 },
    { id$: 'q3', firstName: 'John', lastName: 'Smith', age: 28 },
    { id$: 'q4', firstName: 'Alice', lastName: 'Doe', age: 32 },
    { id$: 'q5', firstName: 'Bob', lastName: 'Doe', age: 22 },
  ])

  let list = await si
    .entity('query03')
    .list$({ sort$: { firstName: 1, lastName: -1 } })

  expect(
    list.map((e) => ({ firstName: e.firstName, lastName: e.lastName }))
  ).equal([
    {
      firstName: 'Alice',
      lastName: 'Smith',
    },
    {
      firstName: 'Alice',
      lastName: 'Doe',
    },
    {
      firstName: 'Bob',
      lastName: 'Johnson',
    },
    {
      firstName: 'Bob',
      lastName: 'Doe',
    },
    {
      firstName: 'John',
      lastName: 'Smith',
    },
    {
      firstName: 'John',
      lastName: 'Doe',
    },
  ])

  // clear
  await si.entity('query03').remove$({ all$: true })
})

lab.describe('comparison-query-test', () => {
  const plugin = {}

  const si = make_seneca({ plugin })

  lab.before(() => si.ready())

  let q = {}
  let list = []

  lab.test('generate_entries', async () => {
    q = {}
    list = await si.entity('query02').list$(q)

    for (let entry of list) {
      // console.log('REMOVE', list)
      await entry.remove$({ id: entry.id, sk1: entry.sk1 })
    }

    // generate entries for cmpops test
    await generate_entries(si, 'query02', [
      { id$: 'q3', sk1: 'c', ip2: 'C', ip3: 'AA', is2: 1, d: 10 },
      { id$: 'q0', sk1: 'a', ip2: 'A', ip3: 'AA', is2: 0, d: 10 },
      { id$: 'q1', sk1: 'a', ip2: 'B', ip3: 'AA', is2: 0, d: 10 },
      { id$: 'q2', sk1: 'b', ip2: 'B', ip3: 'AA', is2: 0, d: 10 },
      { id$: 'q4', sk1: 'c', ip2: 'C', ip3: 'AA', is2: 2, d: 10 },
      { id$: 'q5', sk1: 'c', ip2: 'C', ip3: 'BB', is2: 0, d: 10 },
      { id$: 'q7', sk1: 'c', ip2: 'C', ip3: 'BB', is2: 3, d: 12 },
      { id$: 'q6', sk1: 'c', ip2: 'C', ip3: 'BB', is2: 2, d: 11 },
      { id$: 'q8', sk1: 'c', ip2: 'C', ip3: 'BB', is2: 1, d: 13 },
    ])
  })

  lab.test('lt$', async () => {
    q = { ip3: 'AA', is2: { lt$: 1 } }
    list = await si.entity('query02').list$(q)
    expect(list.map((ent) => ent.is2)).equal([0, 0, 0])
  })

  lab.test('eq$', async () => {
    q = { d: { eq$: 10 } }
    list = await si.entity('query02').list$(q)
    expect(list.length).equal(6)
  })

  lab.test('combine gt$, eq$, gte$', async () => {
    q = { d: { gt$: 10 }, ip3: 'BB', is2: { gte$: 0 } }
    list = await si.entity('query02').list$(q)
    expect(list.length).equal(3)
  })

  lab.test('DESC combine with sort$: -1', async () => {
    q = { d: { gte$: 10 }, ip3: 'BB', is2: { gte$: 0 }, sort$: { is2: -1 } }
    list = await si.entity('query02').list$(q)
    expect(list.map((ent) => ent.is2)).equal([3, 2, 1, 0])
  })

  lab.test('ASC combine with sort$: 1', async () => {
    q = { d: { gte$: 10 }, ip3: 'BB', is2: { lte$: 3 }, sort$: { is2: 1 } }
    list = await si.entity('query02').list$(q)
    expect(list.map((ent) => ent.is2)).equal([0, 1, 2, 3])
  })

  lab.test('more complicated tests', async () => {
    q = { d: { eq$: 10 }, sk1: { eq$: 'c' }, ip3: 'AA', is2: { lt$: 3 } }
    list = await si.entity('query02').list$(q)
    expect(list.length).equal(2)

    q = {
      d: { gt$: 10, lt$: 13 },
      ip3: 'BB',
      is2: { lte$: 3 },
      sort$: { d: 1 },
    }
    list = await si.entity('query02').list$(q)
    expect(list.map((ent) => ent.d)).equal([11, 12])

    q = { sk1: { gt$: 'a', lt$: 'c' } }
    list = await si.entity('query02').list$(q)
    expect(list.map((ent) => ent.sk1)).equal(['b'])

    q = { d: [{ lt$: 11, gt$: 9 }, { eq$: 11 }], sort$: { id: 1 } }
    list = await si.entity('query02').list$(q)
    expect(list.length).equal(7)

    q = { d: { ne$: 10 }, sort$: { d: 1 } }
    list = await si.entity('query02').list$(q)
    expect(list.map((ent) => ent.d)).equal([11, 12, 13])
  })

  lab.test('clear', async () => {
    await si.entity('query02').remove$({ all$: true })
  })
})

lab.test('invalid-operators', async () => {
  const plugin = {}

  const si = make_seneca({ plugin })

  lab.before(() => si.ready(), si.quiet())

  let list = []
  let q = {}
  let err

  err = null
  q = { d: { notAValidOp$: 123 } }
  try {
    list = await si.entity('query01').list$(q)
  } catch (e) {
    err = e
  }
  expect(err).not.equal(null)
})

lab.test('injection-fails', async () => {
  const plugin = {}

  const si = make_seneca({ plugin })

  lab.before(() => si.ready(), si.quiet())

  let q = {}
  let list = []

  let q_no_results = [
    { ip1: '*', is1: 1 },
    // '*' is actually a String
  ]

  let q_validation_error = [
    { 'd or 1': { $ne: 10 } }, // inject into Params
    { ip1: 'BB', 'is1 or 1': 1 }, // Syntax error
    { d: { $ne: '10 or 1 = 1' } },
    // { is1: '1 = 1' }, // will treat it as an actual String
  ]
  // await si.entity('query01').data$({id$: '_my', is1: '1 = 1'}).save$()

  // Try: string injection via container
  // Treated as query01 due to seneca-entity
  list = await si.entity("query01 query01.sk0 == 'a'").list$()
  expect(list.length).equal(6)

  for (let q of q_validation_error) {
    let err = null
    try {
      list = await si.entity('query01').list$(q)
    } catch (e) {
      err = e
      list = null
    }

    expect(err).not.equal(null)
  }

  for (let q of q_no_results) {
    list = await si.entity('query01').list$(q)
    expect(list.length).equal(0)
  }
})

lab.test('export', async () => {
  var si = make_seneca()
  await si.ready()

  var get_client = si.export('cosmos-store$1/get_client')
  expect(get_client()).exists()
})

lab.describe('legacy-store-test', () => {
  const plugin = {}

  const si = make_seneca({ plugin })

  lab.before(() => si.ready())

  const si_merge = make_seneca({
    plugin: Object.assign({ merge: false }, plugin),
  })

  lab.before(() => si_merge.ready())

  LegacyStoreTest.test.keyvalue(lab, {
    seneca: si,
    senecaMerge: si_merge,
    script: lab,
    ent0: 'ENT0',
  })

  LegacyStoreTest.basictest({
    seneca: si,
    senecaMerge: si_merge,
    script: lab,
  })

  // TODO: fix implmentation
  // LegacyStoreTest.upserttest({
  //   seneca: si,
  //   script: lab
  // })
})

lab.test('store-core', async () => {
  const plugin = {}
  var si = make_seneca({ plugin })
  await testrun.store_core({ seneca: si, expect, xlog: console.log })
})

lab.test('store-load', async () => {
  const plugin = {}
  var si = make_seneca({ plugin })
  await testrun.store_load({ seneca: si, expect, xlog: console.log })
})

lab.test('store-save', async () => {
  var plugin = {
    entity: {
      'test/foo': {
        // for special handling
        fields: {
          d1: {
            type: 'date',
          },
        },
      },
    },
  }

  var si = make_seneca({ plugin })
  await testrun.store_save({ seneca: si, expect, xlog: console.log })
})

lab.test('custom-table', async () => {
  const plugin = {}
  var si = make_seneca({ plugin })
  let c0 = await si
    .entity('test/custom')
    .data$({ w: Date.now(), x: 1, y: 'a' })
    .save$()

  let c0o = await si.entity('test/custom').load$(c0.id)
  expect(c0o.w).equal(c0.w)

  let c0s = await si
    .entity('test/custom')
    .list$({ fields$: ['x'], x: 1, y: 'a' })
  // console.log(c0s)
  expect(c0s.length).above(0)
  expect(c0s[0].w).not.exist()

  let c0sA = await si.entity('test/custom').list$()
  // console.log(c0sA)
  expect(c0sA.length).above(0)

  let c0oA = await si.entity('test/custom').load$({ w: c0.w })
  // console.log(c0oA)
  // console.log(c0)
  expect(c0oA.id).equal(c0.id)

  let cl0 = await si.entity('test/custom').list$({ x: 1, y: 'a' })
  expect(cl0.length).above(0)

  let cl1 = await si.entity('test/custom').list$({ x: [1], y: 'a' })
  expect(cl1.length).above(0)
})

const testrun = {
  store_core: async function (opts) {
    var seneca = opts.seneca
    var expect = opts.expect
    var log = opts.log

    // S00010: Clear test/foo
    await seneca.entity('test/foo').remove$({ all$: true })
    var foolist = await seneca.entity('test/foo').list$()

    log && log('S00010', foolist)
    expect(foolist.length).equal(0)

    // S00100: Load non-existent returns null.
    var foo0n = await seneca.entity('test/foo').load$('not-an-id')

    log && log('S00100', foo0n)
    expect(foo0n).equal(null)

    // S00200: Create unsaved entity
    var m0 = (Math.random() + '').substring(2)
    var foo0p = seneca.entity('test/foo').make$({
      m: m0,
      s: 's0',
      i: 0,
      b: true,
      o: { x: 1, y: null },
      a: [2, null],
      oc: { y: 3, z: { q: 4, u: ['a', 'b'], v: [{ w: 5 }] } },
      ac: [{ x: 6, y: 7 }, { x: 8, z: 9 }, { u: [{ a: 1 }] }],
    })

    log && log('S00200', foo0p)
    expect(foo0p).exists()
    expect(foo0p.id).not.exists()
    expect(foo0p.data$(false)).equals({
      m: m0,
      s: 's0',
      i: 0,
      b: true,
      o: { x: 1, y: null },
      a: [2, null],
      oc: { y: 3, z: { q: 4, u: ['a', 'b'], v: [{ w: 5 }] } },
      ac: [{ x: 6, y: 7 }, { x: 8, z: 9 }, { u: [{ a: 1 }] }],
    })

    // S00300: Save entity; generates id
    var foo0 = await foo0p.save$()

    log && log('S00300', foo0)
    expect(foo0).exists()
    expect(foo0p != foo0).true()
    expect(foo0.id).string().not.equal('')
    expect(foo0.data$()).includes({
      entity$: {
        base: 'test',
        name: 'foo',
        zone: undefined,
      },
      i: 0,
      m: m0,
      s: 's0',
      b: true,
      o: { x: 1, y: null },
      a: [2, null],
      oc: { y: 3, z: { q: 4, u: ['a', 'b'], v: [{ w: 5 }] } },
      ac: [{ x: 6, y: 7 }, { x: 8, z: 9 }, { u: [{ a: 1 }] }],
    })

    expect(Object.keys(foo0.data$(false)).sort()).equals([
      'a',
      'ac',
      'b',
      'i',
      'id',
      'm',
      'o',
      'oc',
      's',
    ])

    // S00400: Load existing by id returns entity.
    var foo0o = await seneca.entity('test/foo').load$(foo0.id)

    log && log('S00400', foo0.id, foo0o)
    expect(foo0o).exists()
    expect(foo0o != foo0).true()
    expect(foo0o.data$()).equals(foo0.data$())

    // S00500: List by query
    var foolist0 = await seneca.entity('test/foo').list$({ m: m0 })

    log && log('S00500', m0, foolist0)
    expect(foolist0.length).equals(1)
    expect(foolist0[0].data$()).equals(foo0o.data$())

    // S00600: Remove by id
    var foo0ro = await seneca.entity('test/foo').remove$(foo0.id)

    log && log('S00600', foo0.id, foo0ro)
    expect(foo0ro).equal(null)

    // S00700: Load by removed id
    var foo0r = await seneca.entity('test/foo').load$(foo0.id)

    log && log('S00700', foo0.id, foo0r)
    expect(foo0r).equal(null)

    // S00800: List removed by query returns []
    var foolist0r = await seneca.entity('test/foo').list$({ m: m0 })

    log && log('S00800', m0, foolist0r)
    expect(foolist0r.length).equals(0)
  },

  store_load: async function (opts) {
    var seneca = opts.seneca
    var expect = opts.expect
    var log = opts.log

    // S01000: Load by field
    var m1 = (Math.random() + '').substring(2)
    var foo1 = await seneca
      .entity('test/foo')
      .make$({ m: m1, s: 's1', i: 1, b: true })
      .save$()
    var foo1o = await seneca.entity('test/foo').load$({ m: m1 })

    log && log('S01000', foo1, foo1o)
    expect(foo1).exists()
    expect(foo1o).exists()
    expect(foo1.data$()).equal(foo1o.data$())

    // S01100: Load by two fields
    var foo1om = await seneca.entity('test/foo').load$({ m: m1, s: 's1' })

    log && log('S01100', foo1om)
    expect(foo1om).exists()
    expect(foo1.data$()).equal(foo1om.data$())

    // S01200: Load with no fields finds nothing
    var foo1n = await seneca.entity('test/foo').load$({})

    log && log('S01200', foo1n)
    expect(foo1n).equal(null)
  },

  store_save: async function (opts) {
    var seneca = opts.seneca
    var expect = opts.expect
    var log = opts.log

    // S10000: new entity: null saved, undefined ignored
    var m0 = (Math.random() + '').substring(2)
    var foo0 = await seneca
      .entity('test/foo')
      .make$({
        m: m0,
        s1: null,
        s2: undefined,
        b: true,
      })
      .save$()

    var foo0o = await seneca.entity('test/foo').load$(foo0.id)

    log && log('S10000', foo0, foo0o)
    expect(foo0o.data$(false)).equal({
      id: foo0o.id,
      m: m0,
      s1: null,
      b: true,
    })

    // S10100: existing entity: null saved, undefined ignored
    var m1 = (Math.random() + '').substring(2)
    var foo1 = await seneca
      .entity('test/foo')
      .make$({
        m: m1,
        s1: 's1~' + m1,
        s2: 's2~' + m1,
      })
      .save$()
    var foo1o = await seneca.entity('test/foo').load$(foo1.id)
    foo1o.s1 = null
    foo1o.s2 = undefined
    var foo1o2 = await foo1o.save$()

    log && log('S10100', foo1, foo1o, foo1o2)
    expect(foo1o2.data$(false)).equal({
      id: foo1o.id,
      m: m1,
      s1: null,
      s2: 's2~' + m1,
    })

    // S10200: new item, edge cases: empty string, Date
    var m2 = (Math.random() + '').substring(2)
    var d1 = new Date()
    var foo2 = await seneca
      .entity('test/foo')
      .make$({
        m: m2,
        s1: '',
        d1: d1,
      })
      .save$()

    log && log('S10200', foo2)
    expect(foo2.data$(false)).includes({
      id: foo2.id,
      m: m2,
      s1: '',
    })

    expect(foo2.d1.toISOString()).equals(d1.toISOString())
    expect(foo2.fields$()).equals(['m', 's1', 'd1', 'id'])

    // S10205: existing item, edge cases: empty string, Date
    var d1a = new Date()
    foo2.d1 = d1a
    var foo2o = await foo2.save$()

    log && log('S10205', foo2)
    expect(foo2o.data$(false)).includes({
      id: foo2.id,
      m: m2,
      s1: '',
    })
    expect(foo2o.d1.toISOString()).equals(d1a.toISOString())
    expect(foo2o.fields$()).equals(['m', 's1', 'd1', 'id'])
  },
}
