'use strict'

const bitcoin = require('@tradle/bitcoinjs-lib')
const Wallet = require('./')

// wallet => transactor API (tradle/transactor)
module.exports = function transactorClient (opts) {
  const wallet = opts.wallet || new Wallet(opts)
  return {
    send: function (opts, cb) {
      const spender = wallet.send()
      opts.to.forEach(function (to) {
        let address = to.address
        if (!address) {
          address = bitcoin.ECPubKey.fromHex(to.pubKey)
            .getAddress(wallet.networkName)
            .toString()
        }

        spender.to(address, to.amount)
      })

      spender.execute(cb)
    }
  }
}
