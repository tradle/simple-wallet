
var assert = require('assert')
var Spender = require('spender')
var CoinKey = require('coinkey')
var coininfo = require('coininfo')
var equal = require('deep-equal')

var coinprops = [
  'privateWif',
  'publicAddress',
  'privateKey',
  'publicKey',
  'publicHash',
  'pubKeyHash',
  'publicPoint',
  'compressed'
]

module.exports = {
  forKey: walletForKey,
  fromJSON: fromJSON,
  createRandom: createRandom
}

/**
 * primitive one key common blockchain wallet
 * @param  {CoinKey|privateWif} coinkey
 * @param  {CommonBlockchain impl} common-blockchain api
 * @return {Object} wallet
 */
function walletForKey (coinkey, blockchain) {
  if (typeof coinkey === 'string') coinkey = CoinKey.fromWif(coinkey)

  assert(coinkey && blockchain, 'Both coinkey and blockchain are required')

  var txs = []
  var wallet = {
    txs: txs,
    coinkey: coinkey,

    send: function (amount) {
      return new Spender()
        .from(coinkey.privateWif)
        .satoshis(amount)
    },

    dumpTo: function (to, cb) {
      wallet.summary(function(err, summary) {
        if (err) return cb(err)

        wallet.send(summary.balance)
          .to(to)
          .spend(cb)
      })
    },

    transactions: function(height, cb) {
      blockchain.addresses.transactions([coinkey.publicAddress], height, function(err, arr) {
        if (err) return cb(err)

        // merge arr into txs
        mergeTxs(txs, arr)
        cb(null, txs)
      })
    },

    summary: function(cb) {
      return blockchain.addresses.summary([coinkey.publicAddress], function(err, arr) {
        cb(err, arr && arr[0])
      })
    },

    unspents: function(cb) {
      return blockchain.addresses.unspents([coinkey.publicAddress], cb)
    },

    balance: function (cb) {
      wallet.summary(function (err, summary) {
        cb(err, summary && summary.balance)
      })
    },

    toJSON: function() {
      return {
        privateWif: wallet.privateWif,
        txs: txs
      }
    }
  }

  coinprops.forEach(function(p) {
    wallet[p] = coinkey[p]
  })

  return wallet
}

function createRandom (blockchain) {
  var network = blockchain.network
  if (network === 'testnet') network = 'bitcoin-test'

  var info = coininfo(network)
  if (!info) throw new Error('unknown network')

  return walletForKey(CoinKey.createRandom(info), blockchain)
}

// TODO: optimize
function mergeTxs(into, from) {
  from.forEach(function(b) {
    var merged = into.some(function(a) {
      if (a.txId === b.txId) {
        if (!equal(a, b)) {
          for (var p in b) {
            a[p] = b[p]
          }
        }

        return true
      }
    })

    if (!merged) into.push(b)
  })
}

function fromJSON(json, blockchain) {
  var w = walletForKey(json.privateWif, blockchain)
  w.txs = json.txs
  return w
}
