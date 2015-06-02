
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

module.exports = Wallet

/**
 * primitive one key common blockchain wallet
 * @param  {CoinKey|privateWif} coinkey
 * @param  {CommonBlockchain impl} common-blockchain api
 * @return {Object} wallet
 */
function Wallet (coinkey, blockchain) {
  if (typeof coinkey === 'string') coinkey = CoinKey.fromWif(coinkey)

  assert(coinkey && blockchain, 'Both coinkey and blockchain are required')

  this.txs = []
  this.coinkey = coinkey
  this.blockchain = blockchain

  coinprops.forEach(function(p) {
    wallet[p] = coinkey[p]
  })
}

Wallet.prototype.send =
Wallet.prototype.transact = function () {
  return new Spender()
    .from(coinkey.privateWif)
}

Wallet.prototype.dumpTo = function (to, cb) {
  var self = this

  this.summary(function(err, summary) {
    if (err) return cb(err)

    self.send(summary.balance)
      .to(to)
      .spend(cb)
  })
}

Wallet.prototype.newTransactions = function(height, cb) {
  var l = txs.length
  this.transactions(height, function(err) {
    if (err) return cb(err)

    cb(null, txs.slice(l))
  })
}

Wallet.prototype.transactions = function(height, cb) {
  var txs = this.txs
  this.blockchain.addresses.transactions([this.coinkey.publicAddress], height, function(err, arr) {
    if (err) return cb(err)

    // merge arr into txs
    mergeTxs(txs, arr)
    cb(null, txs)
  })
}

Wallet.prototype.summary = function(cb) {
  return this.blockchain.addresses.summary([this.coinkey.publicAddress], function(err, arr) {
    cb(err, arr && arr[0])
  })
}

Wallet.prototype.unspents = function(cb) {
  return this.blockchain.addresses.unspents([this.coinkey.publicAddress], cb)
}

Wallet.prototype.balance = function (cb) {
  this.summary(function (err, summary) {
    cb(err, summary && summary.balance)
  })
}

Wallet.prototype.toJSON = function() {
  return {
    privateWif: wallet.privateWif,
    txs: txs
  }
}

Wallet.createRandom = function (blockchain) {
  var network = blockchain.network
  if (network === 'testnet') network = 'bitcoin-test'

  var info = coininfo(network)
  if (!info) throw new Error('unknown network')

  return new Wallet(CoinKey.createRandom(info), blockchain)
}

Wallet.fromJSON = function (json, blockchain) {
  var w = new Wallet(json.privateWif, blockchain)
  if (json.txs) w.txs = json.txs
  return w
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
