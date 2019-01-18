'use strict';

const rootPrefix = '../..',
  CoreAbis = require(rootPrefix + '/config/CoreAbis'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  ChainAddressModel = require(rootPrefix + '/app/models/mysql/ChainAddress'),
  web3Provider = require(rootPrefix + '/lib/providers/web3'),
  SignerWeb3Provider = require(rootPrefix + '/lib/providers/signerWeb3'),
  chainAddressConstants = require(rootPrefix + '/lib/globalConstant/chainAddress');

class TransferAmountOnChain {
  constructor() {}

  async _fundAddressWithEth(toAddress, chainId, provider, amountInWei) {
    const oThis = this;

    let chainOwnerAddressRsp = await new ChainAddressModel().fetchAddress({
        chainId: chainId,
        kind: chainAddressConstants.chainOwnerKind
      }),
      chainOwnerAddress = chainOwnerAddressRsp.data.address;

    let signerWeb3Object = new SignerWeb3Provider(provider, chainOwnerAddress),
      web3Instance = await signerWeb3Object.getInstance();

    let txParams = {
      from: chainOwnerAddress,
      gas: 60000,
      to: toAddress,
      value: amountInWei //transfer amt in wei
    };

    await web3Instance.eth
      .sendTransaction(txParams)
      .then(function(response) {
        logger.log('** ETH successfully funded to address -> ', response.to);
        Promise.resolve();
      })
      .catch(function(error) {
        logger.error(error);
        Promise.reject();
      });

    await signerWeb3Object.removeAddressKey(chainOwnerAddress);
  }

  async _fundAddressWithOst(toAddress, privateKey, chainId, provider, amountInWei) {
    const oThis = this;

    let web3Instance = await web3Provider.getInstance(provider).web3WsProvider;

    let simpleTokenContractAddressRsp = await new ChainAddressModel().fetchAddress({
        chainId: chainId,
        kind: chainAddressConstants.baseContractKind
      }),
      simpleTokenContractAddress = simpleTokenContractAddressRsp.data.address;

    await web3Instance.eth.accounts.wallet.add(privateKey);

    let senderAddress = web3Instance.eth.accounts.privateKeyToAccount(privateKey).address;

    logger.debug('Fetched Address from private key-----', senderAddress);

    let simpleTokenAbi = CoreAbis.simpleToken,
      simpleTokenContractObj = new web3Instance.eth.Contract(simpleTokenAbi, simpleTokenContractAddress);

    let encodedABI = simpleTokenContractObj.methods.transfer(toAddress, amountInWei.toString(10)).encodeABI(),
      ostTransferParams = {
        from: senderAddress,
        to: toAddress,
        data: encodedABI,
        gas: 60000
      };

    await web3Instance.eth
      .sendTransaction(ostTransferParams)
      .then(function(response) {
        logger.log('** OST successfully funded to address -> ', response.to);
        Promise.resolve();
      })
      .catch(function(error) {
        logger.error(error);
        Promise.reject();
      });

    await web3Instance.eth.accounts.wallet.remove(privateKey);
  }

  async _fundAddressWithOSTPrime(toAddress, chainId, chainEndpoint, amountInWei) {
    const oThis = this;

    let chainOwnerAddressRsp = await new ChainAddressModel().fetchAddress({
        chainId: chainId,
        kind: chainAddressConstants.chainOwnerKind
      }),
      chainOwnerAddress = chainOwnerAddressRsp.data.address;

    logger.debug('Fetched Chain Owner Address from database-----', chainOwnerAddress);

    let signerWeb3Object = new SignerWeb3Provider(chainEndpoint, chainOwnerAddress),
      web3Instance = await signerWeb3Object.getInstance();

    let txParams = {
      from: chainOwnerAddress,
      gas: 60000,
      to: toAddress,
      value: amountInWei //transfer amt in wei
    };

    await web3Instance.eth
      .sendTransaction(txParams)
      .then(function(response) {
        logger.log('** OSTPrime successfully funded to address -> ', response.to);
        Promise.resolve();
      })
      .catch(function(error) {
        logger.error(error);
        Promise.reject();
      });

    await signerWeb3Object.removeAddressKey(chainOwnerAddress);
  }
}

module.exports = new TransferAmountOnChain();
