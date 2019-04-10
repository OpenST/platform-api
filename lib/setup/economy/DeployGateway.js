/**
 * Deploy gateway contract
 *
 * @module tools/economySetup/DeployGateway
 */

const OSTBase = require('@ostdotcom/base'),
  InstanceComposer = OSTBase.InstanceComposer;

const rootPrefix = '../../..',
  ConfigStrategyObject = require(rootPrefix + '/helpers/configStrategy/Object'),
  DeployGatewayHelper = require(rootPrefix + '/lib/setup/common/DeployGateway'),
  TokenAddressCache = require(rootPrefix + '/lib/cacheManagement/kitSaas/TokenAddress'),
  ChainAddressCache = require(rootPrefix + '/lib/cacheManagement/kitSaas/ChainAddress'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  workflowStepConstants = require(rootPrefix + '/lib/globalConstant/workflowStep'),
  tokenAddressConstants = require(rootPrefix + '/lib/globalConstant/tokenAddress'),
  chainAddressConstants = require(rootPrefix + '/lib/globalConstant/chainAddress'),
  pendingTransactionConstants = require(rootPrefix + '/lib/globalConstant/pendingTransaction'),
  gasPriceCacheKlass = require(rootPrefix + '/lib/cacheManagement/shared/EstimateOriginChainGasPrice');

/**
 * Class for deploying gateway contract
 *
 * @class TokenDeployGateway
 */
class TokenDeployGateway {
  /**
   * Constructor for deploying gateway contract
   *
   * @param {Object} params
   * @param {String} params.auxChainId: auxChainId for which origin-gateway needs be deployed.
   * @param {String} params.tokenId
   *
   * @constructor
   */
  constructor(params) {
    const oThis = this;

    oThis.auxChainId = params.auxChainId;
    oThis.tokenId = params.tokenId;
    oThis.pendingTransactionExtraData = params.pendingTransactionExtraData;

    oThis.deployChainId = null;
    oThis.gasPrice = null;
    oThis.configStrategyObj = null;
    oThis.deployerAddress = null;
    oThis.gatewayLibAddress = null;
    oThis.messageBusAddress = null;
    oThis.brandedTokenAddress = null;
    oThis.simpleTokenAddress = null;
    oThis.organizationAddress = null;
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
      }
      logger.error(`${__filename}::perform::catch`);
      logger.error(error);

      return responseHelper.error({
        internal_error_identifier: 'l_s_e_dg_1',
        api_error_identifier: 'unhandled_catch_response',
        debug_options: {}
      });
    });
  }

  /**
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

    const anchorAddress = await oThis._getAnchorAddr();

    const params = {
      chainId: oThis.deployChainId,
      signerAddress: oThis.deployerAddress,
      chainEndpoint: oThis._configStrategyObject.chainRpcProvider(oThis.deployChainId, 'readWrite'),
      gasPrice: oThis.gasPrice,
      organizationAddress: oThis.organizationAddress,
      baseTokenAddress: oThis.simpleTokenAddress,
      tokenAddress: oThis.brandedTokenAddress,
      anchorAddress: anchorAddress,
      messageBusLibAddress: oThis.messageBusAddress,
      gatewayLibAddress: oThis.gatewayLibAddress,
      pendingTransactionExtraData: oThis.pendingTransactionExtraData,
      customSubmitTxParams: {
        tokenId: oThis.tokenId,
        pendingTransactionKind: pendingTransactionConstants.deployTokenGatewayKind
      }
    };

    const deployHelper = new DeployGatewayHelper(params),
      setupRsp = await deployHelper.perform();

    if (!setupRsp.isSuccess()) {
      return Promise.reject(setupRsp);
    }
    const tokenGatewayDeployTxHash = setupRsp.data.transactionHash;

    return Promise.resolve(
      responseHelper.successWithData({
        taskStatus: workflowStepConstants.taskPending,
        debugParams: params,
        transactionHash: tokenGatewayDeployTxHash
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
    oThis.deployChainId = oThis._configStrategyObject.originChainId;
    oThis.chainKind = coreConstants.originChainKind;

    const gasPriceCacheObj = new gasPriceCacheKlass(),
      gasPriceRsp = await gasPriceCacheObj.fetch();

    oThis.gasPrice = gasPriceRsp.data;
  }

  /**
   * Set addresses
   *
   * @returns Promise<any>
   *
   * @private
   */
  async _setAddresses() {
    const oThis = this;

    // Fetch all addresses associated with origin chain id.
    const chainAddressCacheObj = new ChainAddressCache({ associatedAuxChainId: 0 }),
      chainAddressesRsp = await chainAddressCacheObj.fetch();

    if (chainAddressesRsp.isFailure()) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'l_s_e_dg_2',
          api_error_identifier: 'something_went_wrong'
        })
      );
    }

    oThis.simpleTokenAddress = chainAddressesRsp.data[chainAddressConstants.stContractKind].address;
    oThis.deployerAddress = chainAddressesRsp.data[chainAddressConstants.originDeployerKind].address;
    oThis.messageBusAddress = chainAddressesRsp.data[chainAddressConstants.originMbLibContractKind].address;
    oThis.gatewayLibAddress = chainAddressesRsp.data[chainAddressConstants.originGatewayLibContractKind].address;

    const getAddrRsp = await new TokenAddressCache({
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
          internal_error_identifier: 'l_s_e_dg_3',
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

  /**
   * Get anchor contract addr
   *
   * @private
   *
   * @return {Promise}
   *
   */
  async _getAnchorAddr() {
    const oThis = this;

    // Fetch all addresses associated with aux chain id.
    const chainAddressCacheObj = new ChainAddressCache({ associatedAuxChainId: oThis.auxChainId }),
      chainAddressesRsp = await chainAddressCacheObj.fetch();

    if (chainAddressesRsp.isFailure()) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'l_s_e_dg_4',
          api_error_identifier: 'something_went_wrong'
        })
      );
    }

    return chainAddressesRsp.data[chainAddressConstants.originAnchorContractKind].address;
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

    if (oThis.configStrategyObj) {
      return oThis.configStrategyObj;
    }

    oThis.configStrategyObj = new ConfigStrategyObject(oThis._configStrategy);

    return oThis.configStrategyObj;
  }
}

InstanceComposer.registerAsShadowableClass(TokenDeployGateway, coreConstants.icNameSpace, 'TokenDeployGateway');

module.exports = TokenDeployGateway;
