'use strict';

/**
 * deploy gateway contract
 *
 * @module tools/chainSetup/origin/DeployGateway
 */
const rootPrefix = '../..',
  OSTBase = require('@openstfoundation/openst-base'),
  InstanceComposer = OSTBase.InstanceComposer,
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  TokenAddressModel = require(rootPrefix + '/app/models/mysql/TokenAddress'),
  ChainAddressModel = require(rootPrefix + '/app/models/mysql/ChainAddress'),
  ConfigStrategyObject = require(rootPrefix + '/helpers/configStrategy/Object'),
  ChainSetupLogModel = require(rootPrefix + '/app/models/mysql/ChainSetupLog'),
  DeployGatewayHelper = require(rootPrefix + '/tools/commonSetup/DeployGateway'),
  TokenAddressConstants = require(rootPrefix + '/lib/globalConstant/tokenAddress'),
  chainAddressConstants = require(rootPrefix + '/lib/globalConstant/chainAddress'),
  chainSetupLogsConstants = require(rootPrefix + '/lib/globalConstant/chainSetupLogs'),
  gasPriceCacheKlass = require(rootPrefix + '/lib/sharedCacheManagement/EstimateOriginChainGasPrice');

/**
 *
 * @class
 */
class TokenDeployGateway {
  /**
   * Constructor
   *
   * @param {Object} params
   * @param {String} params.auxChainId - auxChainId for which origin-gateway needs be deployed.
   * @param {String} params.tokenId
   * @constructor
   */
  constructor(params) {
    const oThis = this;

    oThis.auxChainId = params['auxChainId'];
    oThis.tokenId = params.tokenId;
    oThis.tokenAddressKindMap = {};
    oThis.chainAddressKindMap = {};

    oThis.deployChainId = null;
    oThis.gasPrice = null;
    oThis.configStrategyObj = null;
  }

  /**
   *
   * Perform
   *
   * @return {Promise<result>}
   *
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
          internal_error_identifier: 't_cs_o_dg_1',
          api_error_identifier: 'unhandled_catch_response',
          debug_options: {}
        });
      }
    });
  }

  /***
   *
   * @private
   *
   * @return {Promise<result>}
   */
  async _asyncPerform() {
    const oThis = this;

    await oThis._initializeVars();

    await oThis._getTokenAddresses();

    await oThis._getChainAddresses();

    let signerAddress = await oThis._getAddressesForChain(chainAddressConstants.deployerKind),
      organizationAddress = await oThis._getAddressesForTokens(TokenAddressConstants.originOrganizationContract),
      simpleTokenContractAddress = await oThis._getAddressesForChain(chainAddressConstants.baseContractKind),
      btContractAddress = await oThis._getAddressesForTokens(TokenAddressConstants.brandedTokenContract),
      anchorAddress = await oThis._getAnchorAddr(),
      messageBusLibAddress = await oThis._getAddressesForChain(chainAddressConstants.messageBusLibKind),
      gatewayLibAddress = await oThis._getAddressesForChain(chainAddressConstants.gatewayLibKind);

    let params = {
      chainId: oThis.deployChainId,
      signerAddress: signerAddress,
      chainEndpoint: oThis._configStrategyObject.chainRpcProvider(oThis.deployChainId, 'readWrite'),
      gasPrice: oThis.gasPrice,
      organizationAddress: organizationAddress,
      originContractAddress: simpleTokenContractAddress,
      auxContractAddress: btContractAddress,
      anchorAddress: anchorAddress,
      messageBusLibAddress: messageBusLibAddress,
      gatewayLibAddress: gatewayLibAddress
    };

    let deployHelper = new DeployGatewayHelper(params),
      setupRsp = await deployHelper.perform();

    if (setupRsp.isFailure()) return setupRsp;

    setupRsp.debugOptions = {
      inputParams: {},
      processedParams: params
    };

    let tokenGatewayContractAddress = setupRsp.data.contractAddress,
      simpleStakeContractAddress = setupRsp.data.simpleStakeContract,
      tokenGatewayDeployTxHash = setupRsp.data.transactionHash;

    await oThis._insertIntoTokenAddress(tokenGatewayContractAddress, simpleStakeContractAddress);

    let taskResponseData = {
      [TokenAddressConstants.tokenGatewayContract]: tokenGatewayContractAddress,
      [TokenAddressConstants.simpleStakeContract]: simpleStakeContractAddress
    };

    return Promise.resolve(
      responseHelper.successWithData({
        taskDone: 1,
        taskResponseData: taskResponseData,
        transactionHash: tokenGatewayDeployTxHash
      })
    );
  }

  /***
   *
   * init vars
   *
   * @private
   */
  async _initializeVars() {
    const oThis = this;
    oThis.deployChainId = oThis._configStrategyObject.originChainId;
    oThis.chainKind = coreConstants.originChainKind;

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
  async _getTokenAddresses() {
    const oThis = this;
    console.log('oThis.tokenId', oThis.tokenId);
    let addresses = await new TokenAddressModel()
      .select('*')
      .where([
        'token_id = ? AND kind in (?)',
        oThis.tokenId,
        [
          new TokenAddressModel().invertedKinds[TokenAddressConstants.originOrganizationContract],
          new TokenAddressModel().invertedKinds[TokenAddressConstants.brandedTokenContract]
        ]
      ])
      .order_by('id DESC')
      .fire();

    for (let i = 0; i < addresses.length; i++) {
      let addressData = addresses[i],
        addressKind = new TokenAddressModel().kinds[addressData.kind];
      oThis.tokenAddressKindMap[addressKind] = oThis.tokenAddressKindMap[addressKind] || [];
      oThis.tokenAddressKindMap[addressKind].push(addressData.address);
    }
  }

  /**
   * Get address of various kinds.
   *
   * @returns {Promise<>}
   * @private
   * @sets addressKindMap
   */
  async _getChainAddresses() {
    const oThis = this;
    let addresses = await new ChainAddressModel()
      .select('*')
      .where([
        'chain_id = ? AND kind in (?)',
        oThis.deployChainId,
        [
          chainAddressConstants.invertedKinds[chainAddressConstants.deployerKind],
          chainAddressConstants.invertedKinds[chainAddressConstants.baseContractKind],
          chainAddressConstants.invertedKinds[chainAddressConstants.messageBusLibKind],
          chainAddressConstants.invertedKinds[chainAddressConstants.gatewayLibKind]
        ]
      ])
      .order_by('id DESC')
      .fire();

    for (let i = 0; i < addresses.length; i++) {
      let addressData = addresses[i],
        addressKind = chainAddressConstants.kinds[addressData.kind];
      oThis.chainAddressKindMap[addressKind] = oThis.chainAddressKindMap[addressKind] || [];
      oThis.chainAddressKindMap[addressKind].push(addressData.address);
    }
  }

  /**
   *
   * @param addressKind {string} address got given kind
   *
   * @returns {string} one address for uniq kinds, and array for multiple possible kinds.
   * @private
   */
  _getAddressesForTokens(addressKind) {
    const oThis = this;

    if (TokenAddressConstants.uniqueKinds.indexOf(addressKind) > -1) {
      return oThis.tokenAddressKindMap[addressKind][0];
    } else {
      return oThis.tokenAddressKindMap[addressKind];
    }
  }

  /**
   *
   * @param addressKind {string} address got given kind
   *
   * @returns {string} one address for uniq kinds, and array for multiple possible kinds.
   * @private
   */
  _getAddressesForChain(addressKind) {
    const oThis = this;

    if (chainAddressConstants.uniqueKinds.indexOf(addressKind) > -1) {
      return oThis.chainAddressKindMap[addressKind][0];
    } else {
      return oThis.chainAddressKindMap[addressKind];
    }
  }

  /***
   *
   * get anchor contract addr
   *
   * @private
   *
   * @return {Promise}
   *
   */
  async _getAnchorAddr() {
    const oThis = this;

    let fetchAddrRsp = await new ChainAddressModel().fetchAddress({
      chainId: oThis.deployChainId,
      auxChainId: oThis.auxChainId,
      kind: chainAddressConstants.originAnchorContractKind,
      chainKind: oThis.chainKind
    });

    console.log(fetchAddrRsp);
    if (!fetchAddrRsp.data.address) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 't_es_dg_6',
          api_error_identifier: 'something_went_wrong'
        })
      );
    }

    return fetchAddrRsp.data.address;
  }

  /***
   *
   * insert token gateway contract address into token address
   *
   * @param {String} gatewayAddress
   * @param {String} simpleStakeContract
   *
   * @return {Promise}
   *
   * @private
   */
  async _insertIntoTokenAddress(gatewayAddress, simpleStakeContract) {
    const oThis = this;

    await new TokenAddressModel()
      .insert({
        token_id: oThis.tokenId,
        kind: new TokenAddressModel().invertedKinds[TokenAddressConstants.tokenGatewayContract],
        address: gatewayAddress
      })
      .fire();

    await new TokenAddressModel()
      .insert({
        token_id: oThis.tokenId,
        kind: new TokenAddressModel().invertedKinds[TokenAddressConstants.simpleStakeContract],
        address: simpleStakeContract
      })
      .fire();
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
}

InstanceComposer.registerAsShadowableClass(TokenDeployGateway, coreConstants.icNameSpace, 'tokenDeployGateway');

module.exports = TokenDeployGateway;
