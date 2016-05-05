#!/usr/bin/env node

'use strict'

var http = require('http')
var path = require('path')
var mkdirp = require('mkdirp')
var Blockchain = require('@tradle/cb-blockr')
var chalk = require('chalk')
var blue = logger('info', chalk.blue.bold)
var green = logger('log', chalk.green.bold)
var red = logger('error', chalk.green.red)
var express = require('express')
// var debug = require('debug')('simple-wallet')
var jsonParser = require('body-parser').json()
var fs = require('fs')
var bitcoin = require('@tradle/bitcoinjs-lib')
var Wallet = require('./')
var networkName = 'testnet'
var network = bitcoin.networks[networkName]

var PORT = process.env.PORT || process.env.PORT || 22230
var privkey = process.env.PRIVKEY

if (!privkey) {
  var WALLET_FILE = process.env.FAUCET_WALLET || path.join(process.env.HOME || process.env.USERPROFILE, '.bitcoin-wallet', 'wallet')

  // initialize wallet
  if (!fs.existsSync(WALLET_FILE)) {
    privkey = bitcoin.ECKey.makeRandom().toWIF()
    mkdirp.sync(path.dirname(WALLET_FILE))
    fs.writeFileSync(WALLET_FILE, privkey, 'utf-8')
  } else {
    privkey = fs.readFileSync(WALLET_FILE, 'utf-8').trim()
  }
}

var key = bitcoin.ECKey.fromWIF(privkey)
var address = key.pub.getAddress(network).toString()

var blockchain = new Blockchain(networkName)
var wallet = new Wallet({
  priv: privkey,
  blockchain: blockchain,
  networkName: networkName
})

var app = express()
app.get('/', function (req, res) {
  var pkg = require('./package')
  res.set('Content-Type', 'text/plain')
  res.end('simple-wallet version: ' + pkg.version + '\n\nPlease send funds back to: ' + address)
})

app.post('/tx', jsonParser, function (req, res) {
  const to = req.body.to
  if (!Array.isArray(to)) {
    return sendErr(res, 422, 'Expected array "to"')
  }

  try {
    to.forEach(function (payment) {
      try {
        payment.address = bitcoin.Address.fromBase58Check(payment.address)
      } catch (err) {
        throw new Error('Invalid address: ' + address)
      }
    })
  } catch (err) {
    return sendErr(res, 422, err.message)
  }

  const spender = wallet.send()
  if ('fee' in req.body) {
    const fee = parseInt(req.body.fee, 10)
    green('  explicit fee: %s', fee)
    spender.fee(fee)
  }

  to.forEach(function (payment) {
    const address = payment.address
    const amount = payment.amount
    green('  sending %s to %s', amount, address)
    spender.to(address, amount)
  })

  spender.build(function (err, tx) {
    if (err) {
      return logErr('failed to build tx', err)
    }

    green('sending tx: %s', tx.getId())
    spender.execute(function (err, tx) {
      if (err) {
        logErr('failed to send tx: %s', err)
        return sendErr(res, 500, err.message)
      }

      const txId = tx.getId()
      green('sent tx: %s', txId)
      res.send({ txId: txId })
    })
  })
})

var server = http.createServer(app)

server.listen(PORT, function (err) {
  if (err) console.error(err)

  console.log('\n')
  blue('simple-wallet listening on port: %s', PORT)
  green('deposit funds to: %s', address)
  wallet.balance(function (err, balance) {
    if (err) {
      red('failed to check balance: %s', err.message)
    } else {
      green('current balance: %s satoshis  /  %s btc', balance, balance / 1e8)
    }
  })
})

function sendErr (res, code, msg) {
  return res
    .status(code)
    .send(msg)
}

function logger (method, style) {
  return function () {
    var args = [].slice.call(arguments, 1).map(function (arg) {
      return style(arg)
    })

    args.unshift('  ' + arguments[0])
    console[method].apply(console, args)
  }
}
