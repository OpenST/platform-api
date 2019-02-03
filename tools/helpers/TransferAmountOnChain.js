'use strict';

const rootPrefix = '../..',
  CoreAbis = require(rootPrefix + '/config/CoreAbis'),
  NonceManager = require(rootPrefix + '/lib/nonce/Manager'),
  web3Provider = require(rootPrefix + '/lib/providers/web3'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  SignerWeb3Provider = require(rootPrefix + '/lib/providers/signerWeb3'),
  ChainAddressCache = require(rootPrefix + '/lib/cacheManagement/kitSaas/ChainAddress'),
  chainAddressConstants = require(rootPrefix + '/lib/globalConstant/chainAddress');

class TransferAmountOnChain {
  constructor() {}

  async _fundAddressWithEth(toAddress, chainId, provider, amountInWei) {
    const oThis = this;

    const originAddresses = await oThis._fetchOriginAddress(),
      chainOwnerAddress = originAddresses.data[chainAddressConstants.masterInternalFunderKind].address;

    let signerWeb3Object = new SignerWeb3Provider(provider, chainOwnerAddress),
      web3Instance = await signerWeb3Object.getInstance();

    let nonce = await oThis._fetchNonce(chainOwnerAddress, chainId);

    let txParams = {
      from: chainOwnerAddress,
      gas: 60000,
      to: toAddress,
      nonce: nonce,
      value: amountInWei //transfer amt in wei
    };

    logger.debug('Eth transfer transaction params: ', txParams);

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

  // TODO:: This is a temp method, which will be replaced with libs - by Kedar
  async _fundAddressWithEthUsingPk(toAddress, privateKey, chainId, provider, amountInWei) {
    const oThis = this;

    let web3Instance = await web3Provider.getInstance(provider).web3WsProvider;

    await web3Instance.eth.accounts.wallet.add(privateKey);

    let senderAddress = web3Instance.eth.accounts.privateKeyToAccount(privateKey).address;

    let nonce = await oThis._fetchNonce(senderAddress, chainId);

    let txParams = {
      from: senderAddress,
      gas: 60000,
      to: toAddress,
      nonce: nonce,
      value: amountInWei //transfer amt in wei
    };

    logger.debug('Eth transfer using private key transaction params: ', txParams);

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

    await web3Instance.eth.accounts.wallet.remove(privateKey);
  }

  async _fundAddressWithOst(toAddress, privateKey, chainId, provider, amountInWei) {
    const oThis = this;

    let web3Instance = await web3Provider.getInstance(provider).web3WsProvider;

    const originAddresses = await oThis._fetchOriginAddress(),
      simpleTokenContractAddress = originAddresses.data[chainAddressConstants.stContractKind].address;

    await web3Instance.eth.accounts.wallet.add(privateKey);

    let senderAddress = web3Instance.eth.accounts.privateKeyToAccount(privateKey).address;

    logger.debug('Fetched Address from private key-----', senderAddress);

    let simpleTokenAbi = CoreAbis.simpleToken,
      simpleTokenContractObj = new web3Instance.eth.Contract(simpleTokenAbi, simpleTokenContractAddress);

    let nonce = await oThis._fetchNonce(senderAddress, chainId);

    let encodedABI = simpleTokenContractObj.methods.transfer(toAddress, amountInWei.toString(10)).encodeABI(),
      ostTransferParams = {
        from: senderAddress,
        to: simpleTokenContractAddress,
        data: encodedABI,
        nonce: nonce,
        gas: 60000
      };

    logger.debug('OST transfer transaction params: ', ostTransferParams);

    await web3Instance.eth
      .sendTransaction(ostTransferParams)
      .then(function(response) {
        logger.log('** OST successfully funded to address -> ', toAddress);
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

    const originAddresses = await oThis._fetchOriginAddress(),
      chainOwnerAddress = originAddresses.data[chainAddressConstants.masterInternalFunderKind].address;

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

  /**
   * Fetch origin addresses.
   *
   * @return {Promise<*>}
   *
   * @private
   */
  async _fetchOriginAddress() {
    const oThis = this;

    // Fetch all addresses associated with origin chain id.
    let chainAddressCacheObj = new ChainAddressCache({ associatedAuxChainId: 0 }),
      chainAddressesRsp = await chainAddressCacheObj.fetch();

    if (chainAddressesRsp.isFailure()) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 't_h_taoc_1',
          api_error_identifier: 'something_went_wrong'
        })
      );
    }

    return chainAddressesRsp;
  }

  /**
   * Fetch Nonce of organization owner
   *
   * @return {Object}
   */
  async _fetchNonce(address, chainId) {
    const oThis = this;
    let resp = await new NonceManager({
      address: address,
      chainId: chainId
    }).getNonce();

    if (resp.isSuccess()) {
      return resp.data.nonce;
    }
  }
}

module.exports = new TransferAmountOnChain();
