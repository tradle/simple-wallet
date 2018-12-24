
var assert = require('assert')
var Spender = require('@tradle/spender')
var bitcoin = require('@tradle/bitcoinjs-lib')
var equal = require('deep-equal')
var typeforce = require('typeforce')
var noop = function() {}

module.exports = Wallet
module.exports.transactor = require('./transactor')

/**
 * primitive one key common blockchain wallet
 * @param  {Object} options
 * @param  {String|ECKey} options.priv
 * @param  {CommonBlockchain impl} options.blockchain common-blockchain api
 */
function Wallet (options) {
  this.priv = typeof options.priv === 'string' ?
    bitcoin.ECKey.fromWIF(options.priv) :
    options.priv

  typeforce(typeforce.Object, this.priv)
  typeforce({
    blockchain: typeforce.Object,
    networkName: typeforce.String
  }, options)

  assert(options.networkName in bitcoin.networks, 'unknown network: ' + options.networkName)

  this.txs = []
  this.pub = this.priv.pub
  this.networkName = options.networkName
  this.address = this.pub.getAddress(bitcoin.networks[this.networkName])
  this.addressString = this.address.toString()
  this.blockchain = options.blockchain
}

/**
 * @return {Spender} https://github.com/mvayngrib/spender
 */
Wallet.prototype.send =
Wallet.prototype.transact = function () {
  return new Spender(this.networkName)
    .from(this.priv)
    .blockchain(this.blockchain)
}

Wallet.prototype.sendTx = function(tx, cb) {
  cb = cb || noop
  var hex = tx.toHex ? tx.toHex() : tx

  assert(typeof hex === 'string', 'invalid transaction')
  return this.blockchain.transactions.propagate(hex, function(err) {
    cb(err, tx)
  })
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
      .execute(cb)
  })
}

/**
 * get new transactions (ones not in wallet.txs)
 */
Wallet.prototype.newTransactions = function(height, cb) {
  var l = this.txs.length
  this.transactions(height, function(err, txs) {
    if (err) return cb(err)

    cb(null, txs.slice(l))
  })
}

/**
 * call wallet.blockchain and get transactions for this wallet's address
 */
Wallet.prototype.transactions = function(height, cb) {
  if (typeof height === 'function') {
    cb = height
    height = undefined
  }

  var txs = this.txs
  this.blockchain.addresses.transactions([this.addressString], height, function(err, arr) {
    if (err) return cb(err)

    // merge arr into txs
    mergeTxs(txs, arr)
    cb(null, txs)
  })
}

Wallet.prototype.txById = function(id) {
  var match
  this.txs.some(function(tx) {
    if (tx.getId() === id) {
      match = tx
      return true
    }
  })

  return match
}

/**
 * see common-blockchain addresses.summary
 */
Wallet.prototype.summary = function(cb) {
  return this.blockchain.addresses.summary([this.addressString], function(err, arr) {
    cb(err, arr && arr[0])
  })
}

/**
 * see common-blockchain addresses.unspents
 */
Wallet.prototype.unspents = function(cb) {
  return this.blockchain.addresses.unspents([this.addressString], cb)
}

Wallet.prototype.balance = function (cb) {
  this.summary(function (err, summary) {
    cb(err, summary && summary.balance)
  })
}

Wallet.prototype.toJSON = function() {
  return {
    priv: this.priv.toWIF(this.networkName),
    networkName: this.networkName,
    txs: this.txs
  }
}

Wallet.createRandom = function (options) {
  return new Wallet({
    priv: bitcoin.ECKey.makeRandom(true),
    blockchain: options.blockchain,
    networkName: options.networkName
  })
}

Wallet.fromJSON = function (json, blockchain) {
  var w = new Wallet({
    priv: json.priv,
    networkName: json.networkName,
    blockchain: blockchain
  })

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
