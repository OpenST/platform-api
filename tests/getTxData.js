'use strict';

const abiDecoder = require('abi-decoder'),
  MosaicJs = require('@openstfoundation/mosaic.js'),
  mosaicTbdAbiBinProvider = new MosaicJs.AbiBinProvider(),
  BrandedToken = require('@openstfoundation/brandedtoken.js'),
  brandedTokenAbiBinProvider = new BrandedToken.AbiBinProvider(),
  web3 = require('web3');

const EIP20GatewayAbi = mosaicTbdAbiBinProvider.getABI('EIP20Gateway'),
  EIP20CoGatewayAbi = mosaicTbdAbiBinProvider.getABI('EIP20CoGateway'),
  AnchorAbi = mosaicTbdAbiBinProvider.getABI('Anchor'),
  GatewayComposerAbi = brandedTokenAbiBinProvider.getABI('GatewayComposer'),
  BrandedTokenAbi = brandedTokenAbiBinProvider.getABI('BrandedToken'),
  UtilityBrandedTokenAbi = brandedTokenAbiBinProvider.getABI('UtilityBrandedToken');

abiDecoder.addABI(EIP20GatewayAbi);
abiDecoder.addABI(EIP20CoGatewayAbi);
abiDecoder.addABI(AnchorAbi);

abiDecoder.addABI(GatewayComposerAbi);
abiDecoder.addABI(BrandedTokenAbi);
abiDecoder.addABI(UtilityBrandedTokenAbi);

class GetTxData {
  constructor(params) {
    const oThis = this;
    oThis.txHash = params.txHash;
    oThis.web3Instance = params.web3Instance;
  }

  async getDecodedInputParams() {
    const oThis = this;
    let web3Provider = new web3(oThis.web3Instance);
    let txData = await web3Provider.eth.getTransaction(oThis.txHash);
    console.log('-txData---->', JSON.stringify(txData));

    let decodedData = abiDecoder.decodeMethod(txData.input);
    console.log('-decodedInputData---->', JSON.stringify(decodedData));
    return decodedData;
  }

  async getDecodedEvents() {
    const oThis = this;
    const web3Provider = new web3(oThis.web3Instance);
    const receipt = await web3Provider.eth.getTransactionReceipt(oThis.txHash);
    console.log('-receipt---->', JSON.stringify(receipt));

    let decodedEvents = abiDecoder.decodeLogs(receipt.logs);
    console.log('-decodedEvents---->', JSON.stringify(decodedEvents));
    return decodedEvents;
  }
}

module.exports = GetTxData;

/*

txD = require('./tests/getTxData')
txO = new txD({
  txHash: '0x76a1c0ce738bc61993e7cd49791290afe668f83acde5bff70389eb0f6b60f51f',
  web3Instance: 'ws://127.0.0.1:8546'
})

txO.getDecodedInputParams().then(console.log)
txO.getDecodedEvents().then(console.log)

*/
