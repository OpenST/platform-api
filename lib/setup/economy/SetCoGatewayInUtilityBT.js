'use strict';

/**
 *  @module lib/setup/economy/SetCoGatewayInUtilityBT
 *
 *  This class helps in setting co-gateway in UBT contract
 */

const rootPrefix = '../../..',
  OSTBase = require('@openstfoundation/openst-base'),
  InstanceComposer = OSTBase.InstanceComposer,
  NonceManager = require(rootPrefix + '/lib/nonce/Manager'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  ChainAddressModel = require(rootPrefix + '/app/models/mysql/ChainAddress'),
  chainAddressConstants = require(rootPrefix + '/lib/globalConstant/chainAddress'),
  ConfigStrategyObject = require(rootPrefix + '/helpers/configStrategy/Object'),
  chainConfigProvider = require(rootPrefix + '/lib/providers/chainConfig'),
  TokenAddressModel = require(rootPrefix + '/app/models/mysql/TokenAddress'),
  TokenAddressConstants = require(rootPrefix + '/lib/globalConstant/tokenAddress'),
  SignerWeb3Provider = require(rootPrefix + '/lib/providers/signerWeb3'),
  responseHelper = require(rootPrefix + '/lib/formatter/response');

const BrandedToken = require('@openstfoundation/branded-token.js'),
  UtilityBrandedTokenHelper = BrandedToken.EconomySetup.UtilityBrandedTokenHelper;

class SetCoGatewayInUtilityBT {
  constructor(params) {
    const oThis = this;

    oThis.web3 = null;
    oThis.chainId = params.chainId;
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
          internal_error_identifier: 't_es_scgubt_1',
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

    await oThis._setCoGatewayInUBT();

    oThis.SignerWeb3Instance.removeAddressKey(oThis.organizationWorker);

    return Promise.resolve(
      responseHelper.successWithData({
        taskDone: 1
      })
    );
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

  /**
   * _setWeb3Instance
   *
   * @return {Promise<void>}
   * @private
   */
  async _setWeb3Instance() {
    const oThis = this;

    let wsProvider = oThis._configStrategyObject.chainWsProvider(oThis.chainId, 'readWrite');

    oThis.SignerWeb3Instance = new SignerWeb3Provider(wsProvider, oThis.organizationWorker);
    oThis.web3Instance = await oThis.SignerWeb3Instance.getInstance();
  }

  /**
   * _setCoGatewayInUBT
   *
   * @return {Promise<void>}
   * @private
   */
  async _setCoGatewayInUBT() {
    const oThis = this;

    let brandedTokenHelper = new UtilityBrandedTokenHelper(oThis.web3Instance),
      nonceRsp = await oThis._fetchNonce();

    let deployParams = {
      from: oThis.organizationWorker,
      gasPrice: '0x0', //As this is done on auxilary chain
      nonce: nonceRsp.data['nonce']
    };
    // txOptions, web3 are default, passed in constructor respectively
    let contractResponse = await brandedTokenHelper.setCoGateway(
      oThis.coGateWayContractAddress,
      deployParams,
      oThis.gatewayContractAddress
    );

    return Promise.resolve(contractResponse);
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
   * _getOrganizationWorker
   *
   * @return {Promise<never>}
   * @private
   */
  async _getOrganizationWorker() {
    const oThis = this;

    let fetchAddrRsp = await new ChainAddressModel().fetchAddress({
      chainId: oThis.chainId,
      kind: chainAddressConstants.workerKind
    });

    if (!fetchAddrRsp.data.addresses) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 't_es_scgubt_2',
          api_error_identifier: 'something_went_wrong'
        })
      );
    }

    oThis.organizationWorker = fetchAddrRsp.data.addresses[0];
  }

  /**
   * _fetchGatewayAddress
   *
   * @return {Promise<never>}
   * @private
   */
  async _fetchGatewayAddress() {
    const oThis = this;

    let fetchAddrRsp = await new ChainAddressModel().fetchAddress({
      chainId: oThis.chainId,
      kind: chainAddressConstants.originGatewayContractKind
    });

    if (!fetchAddrRsp.data.address) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 't_es_scgubt_3',
          api_error_identifier: 'something_went_wrong'
        })
      );
    }

    oThis.gatewayContractAddress = fetchAddrRsp.data.address;
  }

  /**
   * _fetchCoGatewayAddress
   *
   * @return {Promise<never>}
   * @private
   */
  async _fetchCoGatewayAddress() {
    const oThis = this;

    let fetchAddrRsp = await new ChainAddressModel().fetchAddress({
      chainId: oThis.chainId,
      kind: chainAddressConstants.auxCoGatewayContractKind
    });

    if (!fetchAddrRsp.data.address) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 't_es_scgubt_4',
          api_error_identifier: 'something_went_wrong'
        })
      );
    }

    oThis.coGateWayContractAddress = fetchAddrRsp.data.address;
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
      chainId: oThis.chainId
    }).getNonce();
  }
}
InstanceComposer.registerAsShadowableClass(
  SetCoGatewayInUtilityBT,
  coreConstants.icNameSpace,
  'SetCoGatewayInUtilityBT'
);
module.exports = SetCoGatewayInUtilityBT;
