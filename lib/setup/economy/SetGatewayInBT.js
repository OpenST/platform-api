'use strict';

/**
 *  @module lib/setup/economy/SetGatewayInBT
 *
 *  This class helps in setting gateway in BT contract
 */

const rootPrefix = '../../..',
  OSTBase = require('@openstfoundation/openst-base'),
  InstanceComposer = OSTBase.InstanceComposer,
  NonceManager = require(rootPrefix + '/lib/nonce/Manager'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  ChainAddressModel = require(rootPrefix + '/app/models/mysql/ChainAddress'),
  chainAddressConstants = require(rootPrefix + '/lib/globalConstant/chainAddress'),
  TokenAddressModel = require(rootPrefix + '/app/models/mysql/TokenAddress'),
  TokenAddressConstants = require(rootPrefix + '/lib/globalConstant/tokenAddress'),
  ConfigStrategyObject = require(rootPrefix + '/helpers/configStrategy/Object'),
  chainConfigProvider = require(rootPrefix + '/lib/providers/chainConfig'),
  SignerWeb3Provider = require(rootPrefix + '/lib/providers/signerWeb3'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  transferAmount = require(rootPrefix + '/tools/helpers/TransferAmountOnChain'),
  gasPriceCacheKlass = require(rootPrefix + '/lib/sharedCacheManagement/EstimateOriginChainGasPrice');

const BrandedToken = require('@openstfoundation/branded-token.js'),
  brandedTokenHelper = BrandedToken.EconomySetup.BrandedTokenHelper;

class SetGatewayInBT {
  constructor(params) {
    const oThis = this;

    oThis.originChainId = oThis._configStrategyObject.originChainId;
    oThis.brandedTokenContractAddress = params.btCntrctAddr;
    oThis.tokenId = params.tokenId;

    oThis.addressKindMap = {};
  }

  /**
   * perform
   *
   * @return {Promise|*|Promise<T>}
   */
  perform() {
    const oThis = this;

    return oThis._asyncPerform().catch(function(error) {
      if (responseHelper.isCustomResult(error)) {
        return error;
      } else {
        logger.error(`${__filename}::perform::catch`);
        logger.error(error);
        return responseHelper.error({
          internal_error_identifier: 't_es_sgbt_1',
          api_error_identifier: 'unhandled_catch_response',
          debug_options: {}
        });
      }
    });
  }

  /**
   * _asyncPerform
   *
   * @return {Promise<void>}
   * @private
   */
  async _asyncPerform() {
    const oThis = this;

    await oThis._fetchAndSetAddresses();

    await oThis._setWeb3Instance();

    await oThis._fundAddress(oThis.organizationWorker);

    await oThis._fetchAndSetGasPrice();

    await oThis._setGatewayInBT();

    oThis.SignerWeb3Instance.removeAddressKey(oThis.organizationWorker);

    return Promise.resolve(
      responseHelper.successWithData({
        taskDone: 1
      })
    );
  }

  /**
   * This functions fetches and sets the gas price according to the chain kind passed to it.
   * @param chainKind
   * @returns {Promise<void>}
   * @private
   */
  async _fetchAndSetGasPrice() {
    const oThis = this;

    let gasPriceCacheObj = new gasPriceCacheKlass(),
      gasPriceRsp = await gasPriceCacheObj.fetch();

    oThis.gasPrice = gasPriceRsp.data;
  }

  /**
   * Get address of various kinds.
   *
   * @returns {Promise<>}
   * @private
   * @sets addressKindMap
   */
  async _fetchAndSetAddresses() {
    const oThis = this;
    let addresses = await new TokenAddressModel()
      .select('*')
      .where([
        'token_id = ? AND kind in (?)',
        oThis.tokenId,
        [
          new TokenAddressModel().invertedKinds[TokenAddressConstants.tokenCoGatewayContract],
          new TokenAddressModel().invertedKinds[TokenAddressConstants.tokenGatewayContract],
          new TokenAddressModel().invertedKinds[TokenAddressConstants.workerAddressKind]
        ]
      ])
      .order_by('created_at DESC')
      .fire();

    for (let i = 0; i < addresses.length; i++) {
      let addressData = addresses[i],
        addressKind = new TokenAddressModel().kinds[addressData.kind];
      oThis.addressKindMap[addressKind] = oThis.addressKindMap[addressKind] || [];
      oThis.addressKindMap[addressKind].push(addressData.address);
    }

    oThis.organizationWorker = oThis.addressKindMap[TokenAddressConstants.workerAddressKind][0];
    oThis.gatewayContractAddress = oThis.addressKindMap[TokenAddressConstants.tokenGatewayContract][0];
    oThis.coGateWayContractAddress = oThis.addressKindMap[TokenAddressConstants.tokenCoGatewayContract][0];
  }

  async _fundAddress(address) {
    const oThis = this;

    let amountInWei = '100000000000000000000';
    await transferAmount._fundAddressWithEth(address, oThis.originChainId, oThis.web3Instance, amountInWei);

    logger.info('Gas transferred to Organization worker address: ', address);
  }
  /**
   * _setWeb3Instance
   *
   * @return {Promise<void>}
   * @private
   */
  async _setWeb3Instance() {
    const oThis = this;

    let wsProvider = oThis._configStrategyObject.chainWsProvider(oThis.originChainId, 'readWrite');

    oThis.SignerWeb3Instance = new SignerWeb3Provider(wsProvider, oThis.organizationWorker);
    oThis.web3Instance = await oThis.SignerWeb3Instance.getInstance();
  }

  /**
   * _setGatewayInBT
   *
   * @return {Promise<void>}
   * @private
   */
  async _setGatewayInBT() {
    const oThis = this;

    let brandedTokenHelperObj = new brandedTokenHelper(oThis.web3Instance, oThis.brandedTokenContractAddress),
      nonceRsp = await oThis._fetchNonce();

    let txOptions = {
      nonce: nonceRsp.data['nonce']
    };

    // txOptions, web3 are default, passed in constructor respectively
    await brandedTokenHelperObj.setGateway(oThis.gatewayContractAddress, oThis.organizationWorker, txOptions);
  }

  /***
   *
   * config strategy
   *
   * @return {object}
   */
  get _configStrategy() {
    const oThis = this;
    return oThis.ic().configStrategy;
  }

  /***
   *
   * object of config strategy klass
   *
   * @return {object}
   */
  get _configStrategyObject() {
    const oThis = this;
    if (oThis.configStrategyObj) return oThis.configStrategyObj;
    oThis.configStrategyObj = new ConfigStrategyObject(oThis._configStrategy);
    return oThis.configStrategyObj;
  }

  /**
   * fetch nonce (calling this method means incrementing nonce in cache, use judiciously)
   *
   * @ignore
   *
   * @return {Promise}
   */
  async _fetchNonce() {
    const oThis = this;
    return new NonceManager({
      address: oThis.organizationWorker,
      chainId: oThis.originChainId
    }).getNonce();
  }
}
InstanceComposer.registerAsShadowableClass(SetGatewayInBT, coreConstants.icNameSpace, 'SetGatewayInBT');
module.exports = SetGatewayInBT;
