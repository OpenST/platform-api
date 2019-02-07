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
  ConfigStrategyObject = require(rootPrefix + '/helpers/configStrategy/Object'),
  workflowStepConstants = require(rootPrefix + '/lib/globalConstant/workflowStep'),
  chainAddressConstants = require(rootPrefix + '/lib/globalConstant/chainAddress'),
  tokenAddressConstants = require(rootPrefix + '/lib/globalConstant/tokenAddress'),
  DeployCoGatewayHelper = require(rootPrefix + '/lib/setup/common/DeployCoGateway'),
  TokenAddressCache = require(rootPrefix + '/lib/cacheManagement/kitSaas/TokenAddress'),
  ChainAddressCache = require(rootPrefix + '/lib/cacheManagement/kitSaas/ChainAddress');

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
   *
   * @constructor
   */
  constructor(params) {
    const oThis = this;

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

    let params = {
      chainId: oThis.deployChainId,
      signerAddress: oThis.deployerAddress,
      chainEndpoint: oThis._configStrategyObject.chainRpcProvider(oThis.deployChainId, 'readWrite'),
      gasPrice: oThis.gasPrice,
      organizationAddress: oThis.organizationAddress,
      originContractAddress: oThis.brandedTokenAddress,
      auxContractAddress: oThis.utilityBrandedTokenAddress,
      anchorAddress: oThis.auxAnchorContractAddress,
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

    // Fetch all addresses associated with aux chain id.
    let chainAddressCacheObj = new ChainAddressCache({ associatedAuxChainId: oThis.deployChainId }),
      chainAddressesRsp = await chainAddressCacheObj.fetch();

    if (chainAddressesRsp.isFailure()) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'l_s_e_dcg_4',
          api_error_identifier: 'something_went_wrong'
        })
      );
    }

    oThis.deployerAddress = chainAddressesRsp.data[chainAddressConstants.auxDeployerKind].address;
    oThis.messageBusAddress = chainAddressesRsp.data[chainAddressConstants.auxMbLibContractKind].address;
    oThis.gatewayLibAddress = chainAddressesRsp.data[chainAddressConstants.auxGatewayLibContractKind].address;
    oThis.auxAnchorContractAddress = chainAddressesRsp.data[chainAddressConstants.auxAnchorContractKind].address;

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
