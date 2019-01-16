'use strict';
/**
 * Deploy gateway contract
 *
 * @module tools/economySetup/DeployGateway
 */
const OSTBase = require('@openstfoundation/openst-base'),
  InstanceComposer = OSTBase.InstanceComposer;

const rootPrefix = '../../..',
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  ChainAddressModel = require(rootPrefix + '/app/models/mysql/ChainAddress'),
  ConfigStrategyObject = require(rootPrefix + '/helpers/configStrategy/Object'),
  DeployGatewayHelper = require(rootPrefix + '/lib/setup/common/DeployGateway'),
  tokenAddressConstants = require(rootPrefix + '/lib/globalConstant/tokenAddress'),
  TokenAddressCache = require(rootPrefix + '/lib/cacheManagement/TokenAddress'),
  chainAddressConstants = require(rootPrefix + '/lib/globalConstant/chainAddress'),
  gasPriceCacheKlass = require(rootPrefix + '/lib/sharedCacheManagement/EstimateOriginChainGasPrice');

// Following require(s) for registering into instance composer
require(rootPrefix + '/tools/economySetup/CreateEconomy');
/**
 * Class for deploying gateway contract
 *
 * @class
 */
class TokenDeployGateway {
  /**
   * Constructor for deploying gateway contract
   *
   * @param {Object} params
   * @param {String} params.auxChainId - auxChainId for which origin-gateway needs be deployed.
   * @param {String} params.tokenId
   *
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
   * Perform
   *
   * @return {Promise<result>}
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
   * Async performer for the class.
   *
   * @private
   *
   * @return {Promise<result>}
   */
  async _asyncPerform() {
    const oThis = this;

    await oThis._initializeVars();

    await oThis._setAddresses();

    let anchorAddress = await oThis._getAnchorAddr();

    let params = {
      chainId: oThis.deployChainId,
      signerAddress: oThis.deployerAddress,
      chainEndpoint: oThis._configStrategyObject.chainRpcProvider(oThis.deployChainId, 'readWrite'),
      gasPrice: oThis.gasPrice,
      organizationAddress: oThis.organizationAddress,
      baseTokenAddress: oThis.simpleTokenAddress,
      tokenAddress: oThis.brandedTokenAddress,
      anchorAddress: anchorAddress,
      messageBusLibAddress: oThis.messageBusAddress,
      gatewayLibAddress: oThis.gatewayLibAddress
    };

    let deployHelper = new DeployGatewayHelper(params),
      setupRsp = await deployHelper.perform();

    let tokenGatewayDeployTxHash = setupRsp.data.transactionHash;

    return Promise.resolve(
      responseHelper.successWithData({
        taskDone: 0,
        taskResponseData: params,
        transactionHash: tokenGatewayDeployTxHash
      })
    );
  }

  /***
   *
   * Initialize variables.
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

  /***
   *
   * @private
   */
  async _setAddresses() {
    const oThis = this;

    let originKindToAddressMap = await new ChainAddressModel().fetchAddresses({
      chainId: oThis._configStrategyObject.deployChainId,
      kinds: [
        chainAddressConstants.deployerKind,
        chainAddressConstants.baseContractKind,
        chainAddressConstants.messageBusLibKind,
        chainAddressConstants.gatewayLibKind
      ]
    });

    oThis.simpleTokenAddress = originKindToAddressMap.address[chainAddressConstants.baseContractKind];
    oThis.deployerAddress = originKindToAddressMap.address[chainAddressConstants.deployerKind];
    oThis.messageBusAddress = originKindToAddressMap.address[chainAddressConstants.messageBusLibKind];
    oThis.gatewayLibAddress = originKindToAddressMap.address[chainAddressConstants.gatewayLibKind];

    let getAddrRsp = await new TokenAddressCache({
      tokenId: oThis.tokenId
    }).fetch();

    oThis.organizationAddress = getAddrRsp.data[tokenAddressConstants.originOrganizationContract];
    oThis.brandedTokenAddress = getAddrRsp.data[tokenAddressConstants.brandedTokenContract];

    if (
      !oThis.simpleTokenAddress ||
      !oThis.deployerAddress ||
      !oThis.organizationAddress ||
      !oThis.messageBusAddress ||
      !oThis.gatewayLibAddress ||
      !oThis.brandedTokenAddress
    ) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 't_es_dgt_2',
          api_error_identifier: 'something_went_wrong',
          debug_options: {
            simpleTokenAddress: oThis.simpleTokenAddress,
            deployerAddress: oThis.deployerAddress,
            organizationAddress: oThis.organizationAddress,
            brandedTokenAddress: oThis.brandedTokenAddress,
            messageBusAddress: oThis.messageBusAddress,
            gatewayLibAddress: oThis.gatewayLibAddress
          }
        })
      );
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
      kind: chainAddressConstants.originAnchorContractKind
    });

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

  /**
   * Config strategy
   *
   * @return {Object}
   */
  get _configStrategy() {
    const oThis = this;

    return oThis.ic().configStrategy;
  }

  /**
   * Object of config strategy klass
   *
   * @return {Object}
   */
  get _configStrategyObject() {
    const oThis = this;

    if (oThis.configStrategyObj) return oThis.configStrategyObj;

    oThis.configStrategyObj = new ConfigStrategyObject(oThis._configStrategy);

    return oThis.configStrategyObj;
  }
}

InstanceComposer.registerAsShadowableClass(TokenDeployGateway, coreConstants.icNameSpace, 'TokenDeployGateway');

module.exports = TokenDeployGateway;
