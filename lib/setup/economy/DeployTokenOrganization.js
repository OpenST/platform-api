'use strict';

/**
 * setup organization for anchor contract
 *
 * @module lib/setup/economy/DeployTokenOrganization
 */
const rootPrefix = '../../..',
  OSTBase = require('@openstfoundation/openst-base'),
  InstanceComposer = OSTBase.InstanceComposer,
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  ConfigStrategyObject = require(rootPrefix + '/helpers/configStrategy/Object'),
  ChainAddressModel = require(rootPrefix + '/app/models/mysql/ChainAddress'),
  chainAddressConstants = require(rootPrefix + '/lib/globalConstant/chainAddress'),
  tokenAddressConstants = require(rootPrefix + '/lib/globalConstant/tokenAddress'),
  TokenAddressCache = require(rootPrefix + '/lib/sharedCacheManagement/TokenAddress'),
  SetupOrganizationHelper = require(rootPrefix + '/lib/setup/common/SetupOrganization'),
  contractConstants = require(rootPrefix + '/lib/globalConstant/contract'),
  gasPriceCacheKlass = require(rootPrefix + '/lib/sharedCacheManagement/EstimateOriginChainGasPrice');

/**
 *
 * @class
 */
class DeployTokenOrganization {
  /**
   * Constructor
   *
   * @param {Object} params
   * @param {Integer} params.tokenId - token id for which this i to be deployed
   * @param {Integer} params.clientId - clientId
   * @param {Integer} params.chainId - chainId
   * @param {Object} params.pendingTransactionExtraData - pending tx extra data
   *
   * @constructor
   */
  constructor(params) {
    const oThis = this;

    oThis.tokenId = params['tokenId'];
    oThis.clientId = params['clientId'];
    oThis.chainId = params['chainId'];
    oThis.deployToChainKind = params['deployToChainKind'];
    oThis.pendingTransactionExtraData = params['pendingTransactionExtraData'];

    oThis.ownerAddress = null;
    oThis.adminAddress = null;
    oThis.workerAddresses = null;
    oThis.deployChainId = null;
    oThis.gasPrice = null;
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
          internal_error_identifier: 't_cs_sao_1',
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

    await oThis._setAddresses();

    let signerAddress = await oThis._getDeployerAddr();

    let params = {
      chainId: oThis.deployChainId,
      signerAddress: signerAddress,
      chainEndpoint: oThis._configStrategyObject.chainWsProvider(oThis.deployChainId, 'readWrite'),
      gasPrice: oThis.gasPrice,
      ownerAddress: oThis.ownerAddress,
      adminAddress: oThis.adminAddress,
      workerAddresses: oThis.workerAddresses,
      pendingTransactionExtraData: oThis.pendingTransactionExtraData
    };

    let setupOrganizationHelper = new SetupOrganizationHelper(params);
    let setupRsp = await setupOrganizationHelper.perform();

    if (setupRsp && setupRsp.isFailure()) {
      return Promise.reject(setupRsp);
    }

    return Promise.resolve(
      responseHelper.successWithData({
        taskDone: 0,
        transactionHash: setupRsp.data['transactionHash'],
        taskResponseData: params
      })
    );
  }

  /***
   *
   * @private
   */
  async _setAddresses() {
    const oThis = this;

    let getAddrRsp = await new TokenAddressCache({
      tokenId: oThis.tokenId
    }).fetch();

    oThis.ownerAddress = getAddrRsp.data[tokenAddressConstants.ownerAddressKind];
    oThis.adminAddress = getAddrRsp.data[tokenAddressConstants.adminAddressKind];
    oThis.workerAddresses = getAddrRsp.data[tokenAddressConstants.workerAddressKind];

    if (!oThis.ownerAddress || !oThis.adminAddress || !oThis.workerAddresses) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 't_es_dgt_2',
          api_error_identifier: 'something_went_wrong',
          debug_options: {
            ownerAddress: oThis.ownerAddress,
            workerAddresses: oThis.workerAddresses,
            adminAddress: oThis.adminAddress
          }
        })
      );
    }
  }

  /**
   * Set Basic parameters.
   *
   * @returns {Promise<>}
   *
   * @private
   *
   */
  async _initializeVars() {
    const oThis = this;

    switch (oThis.deployToChainKind) {
      case coreConstants.originChainKind:
        oThis.deployChainId = oThis._configStrategyObject.originChainId;

        let gasPriceCacheObj = new gasPriceCacheKlass(),
          gasPriceRsp = await gasPriceCacheObj.fetch();
        oThis.gasPrice = gasPriceRsp.data;
        break;
      case coreConstants.auxChainKind:
        oThis.deployChainId = oThis.chainId;
        oThis.gasPrice = contractConstants.auxChainGasPrice;
        break;
      default:
        throw `unsupported deployToChainKind: ${oThis.deployToChainKind}`;
    }
  }

  /***
   *
   * get deplouer addr
   *
   * @private
   *
   * @return {Promise}
   *
   */
  async _getDeployerAddr() {
    const oThis = this;

    let fetchAddrRsp = await new ChainAddressModel().fetchAddress({
      chainId: oThis.deployChainId,
      kind: chainAddressConstants.deployerKind,
      chainKind: coreConstants.auxChainKind
    });

    if (!fetchAddrRsp.data.address) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 't_cs_a_stp_do_2',
          api_error_identifier: 'something_went_wrong'
        })
      );
    }

    return fetchAddrRsp.data.address;
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

InstanceComposer.registerAsShadowableClass(
  DeployTokenOrganization,
  coreConstants.icNameSpace,
  'DeployTokenOrganization'
);

module.exports = DeployTokenOrganization;
