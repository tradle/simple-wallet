var test = require('tape')
var Blockchain = require('@tradle/cb-blockr')
var Wallet = require('../')

test('to/from json', function(t) {
  var wallet = newTestnetWallet()
  var json = wallet.toJSON()
  var recovered = Wallet.fromJSON(json, new Blockchain('testnet'))

  t.equal(recovered.priv.toWIF(), wallet.priv.toWIF())
  t.equal(recovered.pub.toHex(), wallet.pub.toHex())
  t.equal(recovered.addressString, wallet.addressString)
  t.end()
})

function newTestnetWallet() {
  return Wallet.createRandom({
    blockchain: new Blockchain('testnet'),
    networkName: 'testnet'
  })
}
