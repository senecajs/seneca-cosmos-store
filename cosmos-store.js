/* Copyright (c) 2020-2022 Richard Rodger and other contributors, MIT License. */
'use strict'

const { Required, Open } = require('gubu')

module.exports = cosmos_store

module.exports.errors = {}

const intern = (module.exports.intern = make_intern())

module.exports.defaults = {
  test: false,

  // Provide AWS SDK (via function) externally so that it is not dragged into lambdas.
  sdk: Required(Function),

  // preserve undefined fields when saving
  merge: true,

  cosmos: Open({}),

  // See https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/DynamoDB/DocumentClient.html#constructor-property
  dc: Open({
    // Latest version of dynamodb supports empty strings
    convertEmptyValues: false,
  }),

  // entity meta data, by canon string
  entity: {},
  
  dbConfig: Required(Object),
  
  // container default
  conConfig: {
    
    partitionKey: {
      paths: [
        '/id'
      ],
      kind: 'MultiHash',
      version: 2
    }
  
  } 
  
}

function cosmos_store(options) {
  var seneca = this

  // TODO: need a better way to do this
  options = seneca.util.deep(
    {
      // TODO: use seneca.export once it allows for null values
      generate_id: seneca.export('entity/generate_id'),
    },
    options
  )

  const ctx = intern.make_ctx(
    {
      name: 'cosmos-store',
    },
    options
  )

  var store = intern.make_store(ctx)
  var meta = seneca.store.init(seneca, options, store)

  seneca.add({ init: store.name, tag: meta.tag }, function (msg, reply) {
    const COSMOS_SDK = options.sdk()
    
    
    ctx.client = new COSMOS_SDK.CosmosClient({
      endpoint: options.cosmos.endpoint,
      key: options.cosmos.key,
    })
    
    const dbConfig = options.dbConfig
    
    reference_containers()
    
    async function reference_containers() {
      
      intern.database = (await ctx.client.databases.createIfNotExists({
        ...dbConfig
      })).database
      
      reply()
      
    
    }
    
    
    /*
    AWS_SDK.config.update(intern.clean_config(options.aws))
    
    ctx.dc = new AWS_SDK.DynamoDB.DocumentClient(
      intern.clean_config(options.dc)
    )
    */

    
  })

  var plugin_meta = {
    name: store.name,
    tag: meta.tag,
    exports: {
      get_dc: () => {
        return ctx.dc
      },
    },
  }

  return plugin_meta
}


function make_intern() {
  return {
    PV: 1, // persistence version, used for data migration
    canon_ref: {},
    database: {},

    // TODO: why is this needed?
    clean_config: function (cfgin) {
      let cfg = { ...cfgin }
      for (let prop in cfg) {
        if (null == cfg[prop]) {
          delete cfg[prop]
        }
      }

      return cfg
    },

    make_msg: function (msg_fn, ctx) {
      return require('./lib/' + msg_fn)(ctx)
    },

    make_ctx: function (initial_ctx, options) {
      return Object.assign(
        {
          options,
          intern,
        },
        initial_ctx
      )
    },

    // TODO: seneca-entity should provide this
    entity_options: function (ent, ctx) {
      let canonkey = ent.canon$()
      
      // NOTE: canonkey in options can omit empty canon parts, and zone
      // so that canonkey can match seneca.entity abbreviated canon
      let entopts =
        intern.canon_ref[canonkey] ||
        ctx.options.entity[canonkey] ||
        ctx.options.entity[canonkey.replace(/^-\//, '')] ||
        ctx.options.entity[canonkey.replace(/^-\/-\//, '')] ||
        ctx.options.entity[canonkey.replace(/^[^/]+\/([^/]+\/[^/]+)$/, '$1')]

      intern.canon_ref[canonkey] = entopts

      return entopts
    },
 /*
    table: function (ent, ctx) {
   
      let table_name = null
      let entopts = intern.entity_options(ent, ctx)
      if (
        null != entopts &&
        null != entopts.table &&
        null != entopts.table.name
      ) {
        table_name = entopts.table.name
      } else {
        let canon = ent.canon$({ object: true })
        table_name = (canon.base ? canon.base + '_' : '') + canon.name
      }
      return table_name
      
    },
    */

    get_container: function (ent, ctx) {
      let entopts = intern.entity_options(ent, ctx)
      // let table = entopts && entopts.table
      
      let container = {}
      
      let canon = ent.canon$({ object: true })
      
      container.name = (canon.base ? canon.base + '_' : '') + canon.name
      
      return container
      
    },
    
    
    load_container: async function (id, ctx) {
      // console.log(ctx.options)
    
      const { container } = await intern.database.containers.createIfNotExists({
        id,
        ...ctx.options.conConfig
      })
      
      return container
    },


    has_error: function (seneca, err, ctx, reply) {
      if (err) {
        seneca.log.error('entity', err, { store: ctx.name })
        reply(err)
      }
      return null != err
    },

    make_store: function (ctx) {
      const opts = ctx.options

      const store = {
        name: ctx.name,

        close: function (msg, reply) {
          reply()
        },

        save: function (msg, reply) {
          var seneca = this
          var ent = msg.ent

          var update = null != ent.id
          const co = intern.get_container(ent, ctx)
          var data = ent.data$(false)
          
          var item = data
          
          let new_id
          
          // console.log('save ent: ', ent, co)
          // console.log('data: ', data)
          var q = msg.q || {}
          
          
          // console.log(ent.id, opts.generate_id(ent))
          if (null == ent.id) {
            if( null == ent.id$) {
              new_id = opts.generate_id(ent)
              ent.id = item.id = new_id
            } else {
              ent.id = item.id = ent.id$
            }
          }
          
          do_upsert(ctx)
          
          
          async function do_upsert(ctx, args) {
            const container = await intern.load_container(co.name, ctx)
            
            if ( null != ent.id ) {
              const { resource } = await container.item(ent.id, ent.id).read()
              if(resource) {
                item = resource
                Object.assign(item, data)
              }
            }
            
            
            
            
            let rs = await container.items.upsert(item)
            // console.log('ent: ', rs.resource, item)
            // rs.resource
            
            return reply(null, ent.make$(rs.resource) )
          
          }
          

/*

          // The merge$ directive has precedence.
          // Explicit `false` value otherwise consider merge `true`.
          var merge =
            null == q.merge$ ? false !== opts.merge : false !== q.merge$

          data = intern.inbound(ctx, ent, data)

          // Create new Item.
          if (!update) {
            let new_id = ent.id$

            if (null == new_id) {
              new_id = opts.generate_id(ent)
            }

            const upsert_fields = is_upsert(msg)
            // console.log('UPF', upsert_fields)

            if (null != upsert_fields) {
              do_upsert(ctx, {
                upsert_fields,
                name: ti.name,
                doc: data,
                new_id,
              })
                .then((ups) => {
                  // Reload to get data as per db
                  //
                  return intern.id_get(ctx, seneca, ent, ti, ups.id, reply)
                })
                .catch((err) => {
                  return intern.has_error(seneca, err, ctx, reply)
                })

              return
            }

            data.id = new_id
          }

          if (!update || !merge) {
            var req = {
              TableName: ti.name,
              ConditionExpression: 'attribute_not_exists(id)',
              Item: data,
            }

            // console.log('PUT', req)

            ctx.dc.put(req, function (err, res) {
              if (intern.has_error(seneca, err, ctx, reply)) return undefined

              // Reload to get data as per db
              let dq = { id: data.id }
              let sortkey = ti.key && ti.key.sort
              if (null != sortkey) {
                dq[sortkey] = data[sortkey]
              }

              // console.log('QQQ', dq)

              return intern.id_get(ctx, seneca, ent, ti, dq, reply)
            })
          }

          // Update existing Item
          else {
            // Build update structure
            // https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/DynamoDB/DocumentClient.html#update-property
            
            let up_req = intern.build_req_key(
              {
                TableName: ti.name,
              },
              ti,
              data
            )
      
            // cannot update sortkey
            let tb_key = ti.key || { partition: 'id' }
            
            var upreq = {
              ...up_req,
              AttributeUpdates: Object.keys(data)
                //.filter(k=> k!='id' && void 0!==data[k] )
                .filter((k) => null == Object.values(tb_key).find(v => v == k) )
                .reduce(
                  (o, k) => ((o[k] = { Action: 'PUT', Value: data[k] }), o),
                  {}
                ),
            }

            // console.log('UPR', upreq)

            ctx.dc.update(upreq, function (uperr, upres) {
              if (intern.has_error(seneca, uperr, ctx, reply)) return

              // Reload to get data as per db
              return intern.id_get(ctx, seneca, ent, ti, data, reply)
            })
          }

          function is_upsert(msg) {
            const { ent } = msg
            const update = null != ent.id

            if (update) {
              return null
            }

            const { q = {} } = msg

            if (!Array.isArray(q.upsert$)) {
              return null
            } else {
              throw new Error('DO NOT USE - UNDER CONSTRUCTION')
            }

            // TODO: fix upsert
            //const upsert_fields = q.upsert$
              //.filter(field => -1 === field.indexOf('$'))

            //const public_entdata = ent.data$(false)

            //const upsert = upsert_fields.length > 0 &&
              //upsert_fields.every((p) => p in public_entdata)

              //return upsert ? upsert_fields : null
            //
          }

          async function do_upsert(ctx, args) {
            const { upsert_fields, table, doc, new_id } = args

            // TODO: redesign - will not work

            const scanned = await ctx.dc
              .scan({
                TableName: table,
                ScanFilter: upsert_fields.reduce((acc, k) => {
                  if (null == doc[k]) {
                    acc[k] = {
                      ComparisonOperator: 'NULL',
                    }
                  } else {
                    acc[k] = {
                      ComparisonOperator: 'EQ',
                      AttributeValueList: Array.isArray(doc[k])
                        ? doc[k]
                        : [doc[k]],
                    }
                  }

                  return acc
                }, {}),
              })
              .promise()

            if (0 === scanned.Items.length) {
              await ctx.dc
                .put({
                  TableName: table,
                  Item: { ...doc, id: new_id },
                })
                .promise()

              return { id: new_id }
            }

            const [item] = scanned.Items

            await ctx.dc
              .update({
                TableName: table,

                Key: { id: item.id },

                AttributeUpdates: Object.keys(doc)
                  .filter((k) => !upsert_fields.includes(k))
                  .reduce((acc, k) => {
                    acc[k] = {
                      Action: 'PUT',
                      Value: doc[k],
                    }

                    return acc
                  }, {}),
              })
              .promise()

            return { id: item.id }
          }
*/
        },

        load: function (msg, reply) {
          var seneca = this
          var qent = msg.qent
          var q = msg.q
          // const ti = intern.get_table(qent, ctx)
          // console.log('TI', ti)
          
	  const {
            base,
            name
          } = qent.canon$({ object: true })
          
          var qid = q.id
          
          const co = intern.get_container(qent, ctx)
          

          if (null == qid) {
            if (0 === Object.keys(seneca.util.clean(q)).length) {
              return reply()
            }

            return intern.listent(
              ctx,
              seneca,
              qent,
              co,
              q,
              function (err, reslist) {
                if (err) return reply(err)

                return reply(reslist ? reslist[0] : null)
              }
            )
          }

          // Load by id
          else {
            return intern.id_get(ctx, seneca, qent, co, q, reply)
          }
          
          
        },

        list: function (msg, reply) {
          var seneca = this
          var qent = msg.qent
          var q = msg.q
          
          const co = intern.get_container(qent, ctx)
          
          intern.listent(ctx, seneca, qent, co, q, reply)
          
        },

        remove: function (msg, reply) {
          var seneca = this
          // console.log('REMOVE MSG', msg)

          var qent = msg.qent
          var q = msg.q
          
          let cq = seneca.util.clean(q)
          
          let co = intern.get_container(qent, ctx)
          
          var all = true === q.all$
          var load = true === q.load$
          
          let qid = q.id
          
          // console.log(cq)
          do_remove()
          
          async function do_remove(args) {
            const container = await intern.load_container(co.name, ctx)
            
            
            if (0 === Object.keys(cq).length && !all) {
              reply(seneca.error('empty-remove-query'))
            }
            
            if (null != q.id) {
              await remove_single_by_id(q, qent)

            } else {
            
              intern.listent(ctx, seneca, qent, co, cq, async function (listerr, list) {
                if(all) {
                
                  for(let item of list) {
                    await container.item(item.id, item.id).delete()
                  }
                  
                  return reply()
                  
		} else {
		  qid = 0 < list.length ? list[0].id : null
                  return remove_single_by_id({ id: qid }, qent)
		}
              })
		
            
            }
            
            async function remove_single_by_id(q, qent) {
              if(q.id || qent.id ) {
                if(load) {
                  return intern.id_get(ctx, seneca, qent, co, q, async (err, res) => {
                    await container.item(q.id || qent.id, q.id || qent.id).delete()
                    reply(res)
                  })
                } else { 
                  await container.item(q.id || qent.id, q.id || qent.id).delete()
                  return reply()
                }
              } else {
                return reply()
              }
              
            }
            
            
            // const { resources } = await container.items
            
          }
          
          /*
          const ti = intern.get_table(qent, ctx)

          var all = true === q.all$
          var load = true === q.load$

          var qid = q.id

          if (null != qid) {
            return remove_single_by_id(q)
          } else {
            let cq = seneca.util.clean(q)
            // console.log('CQ', cq)

            if (0 === Object.keys(cq).length && !all) {
              reply(seneca.error('empty-remove-query'))
            }

            intern.listent(ctx, seneca, qent, ti, cq, function (listerr, list) {
              if (intern.has_error(seneca, listerr, ctx, reply)) return

              // console.log('QQQ', all, ti.name, list)

              if (all) {
                var batchreq = {
                  RequestItems: {},
                }

                batchreq.RequestItems[ti.name] = list.map((item) => ({
                  DeleteRequest: {
                    Key: { id: item.id },
                  },
                }))

                if (0 === batchreq.RequestItems[ti.name].length) {
                  return reply()
                }

                ctx.dc.batchWrite(batchreq, function (batcherr, batchres) {
                  if (intern.has_error(seneca, batcherr, ctx, reply)) return

                  reply()
                })
              } else {
                qid = 0 < list.length ? list[0].id : null
                return remove_single_by_id({ id: qid })
              }
            })
          }

          function remove_single_by_id(q) {
            // console.log('RSID',q)
            if (null != q.id) {
              if (load) {
                intern.id_get(ctx, seneca, qent, ti, q, (err, old) =>
                  dc_delete(q, err, old)
                )
              } else {
                dc_delete(q)
              }
            } else {
              return reply()
            }
          }

          function dc_delete(q, err, old) {
            if (intern.has_error(seneca, err, ctx, reply)) return

            var delreq = intern.build_req_key(
              {
                TableName: ti.name,
              },
              ti,
              q
            )

            ctx.dc.delete(delreq, function (delerr, delres) {
              if (intern.has_error(seneca, delerr, ctx, reply)) return

              reply(old)
            })
          }
          */
          
        },

        native: function (msg, reply) {
          reply({
            dc: ctx.dc,
          })
        },
      }

      return store
    },

    // Tmp converter for table parameter
    tableinfo: (table) => {
      let tableInfo = table
      if ('string' === typeof tableInfo) {
        tableInfo = { name: table }
      }
      return tableInfo
    },

    build_req_key(req, table, q) {
    /*
      req.Key = { id: 'string' === typeof q ? q : q.id }

      let sortkey = table.key && table.key.sort
      if (sortkey) {
        req.Key[sortkey] = q[sortkey]
      }

      return req
     */
    },

    id_get: function (ctx, seneca, ent, co, q, reply) {
    
      do_load()
          
      async function do_load(args) {
        const container = await intern.load_container(co.name, ctx)
            
        try {
          const { resource } = await container.item(q.id, q.id).read()
          reply(null, resource ? ent.make$(resource) : null)
        } catch (err) {
          // console.error(err.message)
          reply(err, null)
        }
      }
          
          
      /*

      let ti = intern.tableinfo(table)

      const getreq = intern.build_req_key(
        {
          TableName: ti.name,
        },
        table,
        q
      )
      
      
      // console.log('GETREQ: ', getreq)
      
      ctx.dc.get(getreq, function (geterr, getres) {
        if (intern.has_error(seneca, geterr, ctx, reply)) return

        var data = null == getres.Item ? null : getres.Item
        data = intern.outbound(ctx, ent, data)
        var out_ent = null == data ? null : ent.make$(data)
        reply(null, out_ent)
      })
      */
      
    },

    build_ops(qv, kname, type) {

      if('object' != typeof qv) { //  && !Array.isArray(qv)) {
        return { cmps: [ { c: '$ne', cmpop: '=', k: kname, v: qv } ] }
      }

      let ops = {
        '$gte': { cmpop: '>' },
        '$gt': { cmpop: '>=' },
        '$lt': { cmpop: '<=' },
        '$lte': { cmpop: '<' },
        '$ne': { cmpop: '=' }
      }

      // console.log('QV: ', typeof qv, qv)

      let cmps = []
      for(let k in qv) {
        let op = ops[k]
        if(op) {
          op.k = kname
          op.v = qv[k]
          op.c = k
          cmps.push(op)
        }
        else if(k.startsWith('$')) {
          throw new Error('Invalid Comparison Operator: ' + k)
        }
      }
      // special case
      if('sort' == type && 1 < cmps.length) {
        throw new Error('Only one condition per sortkey: ' + cmps.length + ' is given.')
      }

      return { cmps, }
    },


    listent: function (ctx, seneca, qent, co, q, reply) {
    
      let listreq = {}
      let listquery = 'SELECT'
      let queryspec = {}
      
      var isarr = Array.isArray
      
      if (isarr(q) || 'object' != typeof q) {
        q = { id: q }
      }

      
      let cq = seneca.util.clean(q)
      let fq = cq
          
      let params = listreq.parameters = []
          
      if (null != q.limit$) {
        listquery += ' TOP ' + '@limit'
        params.push({
          name: '@limit',
          value: q.limit$,
        })
        // delete q.limit$
            
      }
      listquery += ' * from item'
      
      
      if (0 < Object.keys(fq).length) {
        listquery += ' WHERE '

/*
            let cq_k =  isarr(cq[k]) ? cq[k] : [ cq[k] ]
            return '(' +
                cq_k
                  .map((v, i) => {
                    let cq_v = intern.build_ops(v, k)
                    // console.log('cq_v: ', cq_v)
                    return cq_v.cmps.map((c, j) =>
                      ('#' + c.k + ` ${c.cmpop} :` + c.k + i + j + 'n') ).join(' and ')
                   })
                  .join(' or ') +
                ')'
                */
            
        
        listquery += 
          Object.keys(cq).map((k, i) => {
            let cq_k =  isarr(cq[k]) ? cq[k] : [ cq[k] ]   
            

          
            // return 'item.' + k + ' = ' + '@' + ( 'i' + i )
            
            return '(' +
                cq_k
                  .map((v, j) => {
                    params.push({
                      name: '@i'+i+j,
                      value: v,
                    })
            
                    return 'item.' + k + ' = ' + '@' + ( 'i' + i + j )
                   })
                  .join(' OR ') +
                ')'
                
          
          }).join(' AND ')
         
      }
      
      listreq.query = listquery
      
      // console.log('list_req: ', listreq ) // , q, co)
      
      do_list()
      async function do_list(args) {
        const container = await intern.load_container(co.name, ctx)
        let out_list = []
        const { resources } = await container.items.query(listreq).fetchAll()
        
    
        out_list = resources.map(resource => qent.make$(resource) )
    
        reply(null, out_list)
      }
      
    
      /*
      var isarr = Array.isArray
      if (isarr(q) || 'object' != typeof q) {
        q = { id: q }
      }

      let listop = 'scan'
      const sortkey = ti.key && ti.key.sort

      const listreq = {
        TableName: ti.name,
      }

      let cq = seneca.util.clean(q)
      let fq = cq
      
      if(null != fq.$sort) {
        let sort_index = {
          '1': true, // ascending
          '-1': false // descending
        }
        let sort_mode = sort_index[fq.$sort]
        
        null != sort_mode && (listreq.ScanIndexForward = sort_mode)
        delete fq.$sort
          
      }

      // hash and range key must be used together
      if (null != sortkey && null != cq.id && null != cq[sortkey]) {
        listop = 'query'
        listreq.KeyConditionExpression = `id = :hashKey and #${sortkey}n = :rangeKey`
        listreq.ExpressionAttributeValues = {
          ':hashKey': cq.id,
          ':rangeKey': cq[sortkey],
        }
        listreq.ExpressionAttributeNames = {}
        listreq.ExpressionAttributeNames[`#${sortkey}n`] = sortkey
        delete fq.id
        delete fq[sortkey]
      }

      // ignore indexes if using main keys
      else {
        let indexlist = ti.index || []
        for (let indexdef of indexlist) {
          let indexdefkey = indexdef.key || {}
          let pk = indexdefkey.partition
          if (null != pk && null != fq[pk]) {
            listop = 'query'
            listreq.IndexName = indexdef.name
            listreq.KeyConditionExpression = `#${pk}n = :${pk}i`
            listreq.ExpressionAttributeValues = {}
            listreq.ExpressionAttributeValues[`:${pk}i`] = fq[pk]
            listreq.ExpressionAttributeNames = {}
            listreq.ExpressionAttributeNames[`#${pk}n`] = pk

            delete fq[pk]

            let sk = indexdefkey.sort
            if (null != sk && null != fq[sk]) {
              let fq_op = intern.build_ops(fq[sk], sk, 'sort')

              listreq.KeyConditionExpression +=
                ' and ' + fq_op.cmps.map((c, i) => `#${c.k}n ${c.cmpop} :${c.k + i }i`).join(' and ')

              fq_op.cmps.forEach((c, i)=> {
                listreq.ExpressionAttributeValues[`:${c.k + i}i`] = c.v
              })
              listreq.ExpressionAttributeNames[`#${sk}n`] = sk
              delete fq[sk]
            }

            break // first index found wins
          }
        }
      }

      if (0 < Object.keys(fq).length) {
        listreq.FilterExpression = Object.keys(cq)
          .map((k) => {
            let cq_k =  isarr(cq[k]) ? cq[k] : [ cq[k] ]
            return '(' +
                cq_k
                  .map((v, i) => {
                    let cq_v = intern.build_ops(v, k)
                    // console.log('cq_v: ', cq_v)
                    return cq_v.cmps.map((c, j) =>
                      ('#' + c.k + ` ${c.cmpop} :` + c.k + i + j + 'n') ).join(' and ')
                   })
                  .join(' or ') +
                ')'
          })
          .join(' and ')

        listreq.ExpressionAttributeNames = Object.keys(cq).reduce(
          (a, k) => ((a['#' + k] = k), a),
          listreq.ExpressionAttributeNames || {}
        )

        listreq.ExpressionAttributeValues = Object.keys(cq).reduce(
          (a, k) => {
            let cq_k = isarr(cq[k]) ? cq[k] : [ cq[k] ]
            
            cq_k.forEach((v, i) => {
              let cq_v = intern.build_ops(v, k)
              cq_v.cmps.forEach((c, j)=> a[':' + c.k + i + j + 'n'] = c.v )
            })

            return a
          },
          listreq.ExpressionAttributeValues || {}
        )
      }

      if (q.fields$) {
        listreq.ProjectionExpression = q.fields$.map((n) => '#' + n).join(',')
        q.fields$.reduce(
          (a, k) => ((a['#' + k] = k), a),
          (listreq.ExpressionAttributeNames =
            listreq.ExpressionAttributeNames || {})
        )
      }

      // console.log('LISTREQ', q, listop, listreq)

      let out_list = []
      function page(paramExclusiveStartKey) {
        if (null != paramExclusiveStartKey) {
          listreq.ExclusiveStartKey = paramExclusiveStartKey
        }

        ctx.dc[listop](listreq, function (listerr, listres) {
          if (intern.has_error(seneca, listerr, ctx, reply)) return

          if (null != listres.Items) {
            listres.Items.forEach((item) => out_list.push(qent.make$(item)))
          }

          if (listres.LastEvaluatedKey) {
            setImmediate(() => page(listres.LastEvaluatedKey))
          } else {
            return reply(null, out_list)
          }
        })
      }

      page()
      
      */
    },

    inbound: function (ctx, ent, data) {
      if (null == data) return null
      let entity_options = intern.entity_options(ent, ctx)

      if (entity_options) {
        var fields = entity_options.fields || {}
        Object.keys(fields).forEach((fn) => {
          var fs = fields[fn] || {}
          var type = fs.type
          if ('date' === type && data[fn] instanceof Date) {
            data[fn] = data[fn].toISOString()
          }
        })
      }
      return data
    },

    outbound: function (ctx, ent, data) {
      if (null == data) return null
      let entity_options = intern.entity_options(ent, ctx)

      if (entity_options) {
        var fields = entity_options.fields || {}
        Object.keys(fields).forEach((fn) => {
          var fs = fields[fn] || {}
          var type = fs.type
          if ('date' === type && 'string' === typeof data[fn]) {
            data[fn] = new Date(data[fn])
          }
        })
      }
      return data
    },
  }
}
