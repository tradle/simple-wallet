# simple-wallet

Basically coinkey + your choice of common-blockchain API for a simple one key wallet

```js
var Blockchain = require('cb-blockr')
var coininfo = require('coininfo')
var CoinKey = require('coinkey')
var Wallet = require('simple-wallet')
var key = CoinKey.createRandom(coininfo('bitcoin-test'))
var wallet = Wallet.forKey(key, new Blockchain('testnet'))
// alt: wallet = walletForKey(privateWif, new Blockchain('testnet'))

wallet.publicAddress // coinkey.publicAddress
wallet.privateWif    // coinkey.privateWif
wallet.coinkey       // coinkey

// get balance
wallet.balance(function(err, satoshis) {
})

// get summary (balance, other fun stuff)
wallet.summary(function(err, summary) {
})

// send money
wallet.send(satoshis, toAddress, function(err, txId, tx) {
})

// dump wallet balance to another address
wallet.dumpTo(toAddress, function(err, txId, tx) {
})
```
