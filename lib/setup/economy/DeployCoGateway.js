'use strict';
/**
 * Deploy CoGateway contract
 *
 * @module lib/setup/economy/DeployCoGateway
 */
const OSTBase = require('@openstfoundation/openst-base'),
  InstanceComposer = OSTBase.InstanceComposer;

const rootPrefix = '../../..',
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  contractConstants = require(rootPrefix + '/lib/globalConstant/contract'),
  ChainAddressModel = require(rootPrefix + '/app/models/mysql/ChainAddress'),
  ConfigStrategyObject = require(rootPrefix + '/helpers/configStrategy/Object'),
  workflowStepConstants = require(rootPrefix + '/lib/globalConstant/workflowStep'),
  chainAddressConstants = require(rootPrefix + '/lib/globalConstant/chainAddress'),
  tokenAddressConstants = require(rootPrefix + '/lib/globalConstant/tokenAddress'),
  DeployCoGatewayHelper = require(rootPrefix + '/lib/setup/common/DeployCoGateway'),
  TokenAddressCache = require(rootPrefix + '/lib/sharedCacheManagement/TokenAddress');

/**
 * Class for CoGateway deployment
 *
 * @class
 */
class TokenDeployCoGateway {
  /**
   * Constructor for CoGateway deployment
   *
   * @param {Object} params
   * @param {String} params.auxChainId: auxChainId for which origin-gateway needs be deployed.
   *
   * @constructor
   */
  constructor(params) {
    const oThis = this;

    oThis.auxChainId = params['auxChainId'];
    oThis.pendingTransactionExtraData = params['pendingTransactionExtraData'];
    oThis.tokenId = params.tokenId;

    oThis.deployChainId = null;
    oThis.gasPrice = null;
    oThis.configStrategyObj = null;

    oThis.deployerAddress = null;
    oThis.gatewayLibAddress = null;
    oThis.messageBusAddress = null;
    oThis.brandedTokenAddress = null;
    oThis.utilityBrandedTokenAddress = null;
    oThis.organizationAddress = null;
    oThis.gatewayAddress = null;
  }

  /**
   * Performer
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
          internal_error_identifier: 'l_s_e_dcg_1',
          api_error_identifier: 'unhandled_catch_response',
          debug_options: {}
        });
      }
    });
  }

  /**
   * Async performer
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
      originContractAddress: oThis.brandedTokenAddress,
      auxContractAddress: oThis.utilityBrandedTokenAddress,
      anchorAddress: anchorAddress,
      gatewayAddress: oThis.gatewayAddress,
      messageBusLibAddress: oThis.messageBusAddress,
      gatewayLibAddress: oThis.gatewayLibAddress,
      pendingTransactionExtraData: oThis.pendingTransactionExtraData
    };

    let deployHelper = new DeployCoGatewayHelper(params),
      setupRsp = await deployHelper.perform();

    let tokenCoGatewayDeployTxHash = setupRsp.data.transactionHash;

    return Promise.resolve(
      responseHelper.successWithData({
        taskStatus: workflowStepConstants.taskPending,
        taskResponseData: params,
        transactionHash: tokenCoGatewayDeployTxHash
      })
    );
  }

  /**
   * Initialize variables.
   *
   * @private
   */
  async _initializeVars() {
    const oThis = this;

    oThis.deployChainId = oThis._configStrategyObject.auxChainId;
    oThis.chainKind = coreConstants.auxChainKind;
    oThis.gasPrice = contractConstants.auxChainGasPrice;
  }

  /**
   * Set addresses.
   *
   * @private
   */
  async _setAddresses() {
    const oThis = this;

    let fetchAddrRsp = await new ChainAddressModel().fetchAddresses({
      chainId: oThis.deployChainId,
      kinds: [
        chainAddressConstants.deployerKind,
        chainAddressConstants.messageBusLibKind,
        chainAddressConstants.gatewayLibKind
      ]
    });

    let auxKindToAddressMap = fetchAddrRsp.data;

    oThis.deployerAddress = auxKindToAddressMap.address[chainAddressConstants.deployerKind];
    oThis.messageBusAddress = auxKindToAddressMap.address[chainAddressConstants.messageBusLibKind];
    oThis.gatewayLibAddress = auxKindToAddressMap.address[chainAddressConstants.gatewayLibKind];

    let getAddrRsp = await new TokenAddressCache({
      tokenId: oThis.tokenId
    }).fetch();

    oThis.organizationAddress = getAddrRsp.data[tokenAddressConstants.originOrganizationContract];
    oThis.brandedTokenAddress = getAddrRsp.data[tokenAddressConstants.brandedTokenContract];
    oThis.utilityBrandedTokenAddress = getAddrRsp.data[tokenAddressConstants.utilityBrandedTokenContract];
    oThis.gatewayAddress = getAddrRsp.data[tokenAddressConstants.tokenGatewayContract];

    if (
      !oThis.deployerAddress ||
      !oThis.organizationAddress ||
      !oThis.messageBusAddress ||
      !oThis.gatewayLibAddress ||
      !oThis.brandedTokenAddress
    ) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'l_s_e_dcg_2',
          api_error_identifier: 'something_went_wrong',
          debug_options: {
            deployerAddress: oThis.deployerAddress,
            messageBusAddress: oThis.messageBusAddress,
            gatewayLibAddress: oThis.gatewayLibAddress,
            organizationAddress: oThis.organizationAddress,
            brandedTokenAddress: oThis.brandedTokenAddress,
            utilityBrandedTokenAddress: oThis.utilityBrandedTokenAddress,
            gatewayAddress: oThis.gatewayAddress
          }
        })
      );
    }
  }

  /**
   * Get anchor contract address
   *
   * @private
   *
   * @return {Promise}
   */
  async _getAnchorAddr() {
    const oThis = this;

    let fetchAddrRsp = await new ChainAddressModel().fetchAddress({
      chainId: oThis.deployChainId,
      auxChainId: oThis.auxChainId,
      kind: chainAddressConstants.auxAnchorContractKind
    });

    if (!fetchAddrRsp.data.address) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'l_s_e_dcg_3',
          api_error_identifier: 'something_went_wrong'
        })
      );
    }

    return fetchAddrRsp.data.address;
  }

  /***
   * Config strategy
   *
   * @return {Object}
   */
  get _configStrategy() {
    const oThis = this;

    return oThis.ic().configStrategy;
  }

  /**
   * Object of config strategy class
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

InstanceComposer.registerAsShadowableClass(TokenDeployCoGateway, coreConstants.icNameSpace, 'TokenDeployCoGateway');

module.exports = TokenDeployCoGateway;
