
var assert = require('assert')
var spend = require('spend')
var CoinKey = require('coinkey')

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
  forKey: walletForKey
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

  var wallet = {
    coinkey: coinkey,

    send: function (satoshis, to, cb) {
      spend.blockchain = blockchain
      spend(coinkey.privateWif, to, satoshis, cb)
    },

    dumpTo: function (to, cb) {
      wallet.summary(function(err, summary) {
        if (err) return cb(err)

        wallet.send(summary.balance, to, cb)
      })
    },

    balance: function (cb) {
      wallet.summary(function (err, summary) {
        cb(err, summary && summary.balance)
      })
    },

    summary: function (cb) {
      blockchain.addresses.summary([coinkey.publicAddress], function (err, arr) {
        if (err) return cb(err)
        if (!arr.length) return cb(new Error('address not found'))

        cb(null, arr[0])
      })
    }
  }

  coinprops.forEach(function(p) {
    wallet[p] = coinkey[p]
  })

  return wallet
}
