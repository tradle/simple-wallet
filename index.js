
var assert = require('assert')
var Spender = require('spender')
var CoinKey = require('coinkey')
var coininfo = require('coininfo')
var equal = require('deep-equal')
var typeforce = require('typeforce')

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
 * @param  {Object} options
 * @param  {CoinKey|privateWif} options.coinkey
 * @param  {CommonBlockchain impl} options.blockchain common-blockchain api
 */
function Wallet (options) {
  if (typeof options.coinkey === 'string') coinkey = CoinKey.fromWif(coinkey)

  typeforce('Object', options.coinkey)
  typeforce({
    blockchain: 'Object',
    network: 'String'
  }, options)

  this.txs = []
  this.coinkey = options.coinkey
  this.blockchain = options.blockchain
  this.networkName = options.network

  coinprops.forEach(function(p) {
    this[p] = this.coinkey[p]
  }, this)
}

/**
 * @return {Spender} https://github.com/mvayngrib/spender
 */
Wallet.prototype.send =
Wallet.prototype.transact = function () {
  return new Spender()
    .from(coinkey.privateWif)
}

/**
 * dump entire balance to another address
 */
Wallet.prototype.dumpTo = function (to, cb) {
  var self = this

  this.summary(function(err, summary) {
    if (err) return cb(err)

    self.send(summary.balance)
      .to(to)
      .spend(cb)
  })
}

/**
 * get new transactions (ones not in wallet.txs)
 */
Wallet.prototype.newTransactions = function(height, cb) {
  var l = txs.length
  this.transactions(height, function(err) {
    if (err) return cb(err)

    cb(null, txs.slice(l))
  })
}

/**
 * call wallet.blockchain and get transactions for this wallet's address
 */
Wallet.prototype.transactions = function(height, cb) {
  var txs = this.txs
  this.blockchain.addresses.transactions([this.coinkey.publicAddress], height, function(err, arr) {
    if (err) return cb(err)

    // merge arr into txs
    mergeTxs(txs, arr)
    cb(null, txs)
  })
}

/**
 * see common-blockchain addresses.summary
 */
Wallet.prototype.summary = function(cb) {
  return this.blockchain.addresses.summary([this.coinkey.publicAddress], function(err, arr) {
    cb(err, arr && arr[0])
  })
}

/**
 * see common-blockchain addresses.unspents
 */
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

Wallet.createRandom = function (options) {
  typeforce({
    network: 'String',
    blockchain: 'Object'
  }, options)

  var network = options.network
  // coininfo has a different naming scheme
  var cnetwork
  if (network === 'testnet') cnetwork = 'bitcoin-test'
  else cnetwork = network

  var info = coininfo(cnetwork)
  if (!info) throw new Error('unknown network')

  return new Wallet({
    coinkey: CoinKey.createRandom(info),
    blockchain: options.blockchain,
    network: network
  })
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
