# simple-wallet

one-key wallet using common-blockchain API

```js
var Blockchain = require('cb-blockr')
var Wallet = require('simple-wallet')
var wifKey = require('./path/to/wifPrivKey')
var networkName = 'testnet'
var wallet = new Wallet({
  priv: wifKey,
  blockchain: new Blockchain(networkName),
  networkName: networkName
})

// get balance
wallet.balance(function(err, satoshis) {
})

// get summary (balance, other fun stuff)
wallet.summary(function(err, summary) {
})

// send money
// see [Spender API](https://github.com/mvayngrib/spender)
wallet.send()
  .to(toAddress, satoshis)
  .data(new Buffer('this goes in OP_RETURN'))
  .change(/* defaults to wallet's own address */)
  .execute(function(err, txId, tx) {
    
  })

// dump wallet balance to another address
wallet.dumpTo(toAddress, function(err, txId, tx) {
})
```
