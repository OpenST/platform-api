/**
 * This class helps in deployment of utility branded token on auxiliary chain.
 *
 * @module lib/setup/economy/brandedToken/DeployUBT
 */

const OSTBase = require('@ostdotcom/base'),
  InstanceComposer = OSTBase.InstanceComposer,
  brandedTokenSetupHelper = require('@openst/brandedtoken.js');

const rootPrefix = '../../../..',
  BrandedTokenBase = require(rootPrefix + '/lib/setup/economy/brandedToken/Base'),
  SubmitTransaction = require(rootPrefix + '/lib/transactions/SignSubmitTrxOnChain'),
  TokenAddressCache = require(rootPrefix + '/lib/cacheManagement/kitSaas/TokenAddress'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  contractConstants = require(rootPrefix + '/lib/globalConstant/contract'),
  chainAddressConstants = require(rootPrefix + '/lib/globalConstant/chainAddress'),
  tokenAddressConstants = require(rootPrefix + '/lib/globalConstant/tokenAddress'),
  pendingTransactionConstants = require(rootPrefix + '/lib/globalConstant/pendingTransaction');

/**
 * Class to deploy utility branded token.
 *
 * @class DeployUtilityBrandedToken
 */
class DeployUtilityBrandedToken extends BrandedTokenBase {
  /**
   * Constructor to deploy utility branded token.
   *
   * @param {object} params
   * @param {number} params.clientId
   * @param {number} params.chainId
   * @param {object} params.pendingTransactionExtraData
   *
   * @augments BrandedTokenBase
   *
   * @constructor
   */
  constructor(params) {
    super(params);

    const oThis = this;

    oThis.web3Instance = null;
    oThis.deployerAddress = null;
    oThis.brandedTokenContractAddress = null;
    oThis.organizationAddress = null;
    oThis.deployToChainKind = coreConstants.auxChainKind;
  }

  /**
   * Perform
   *
   * @return {Promise|*|Promise<T>}
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
        internal_error_identifier: 't_es_dubt_1',
        api_error_identifier: 'unhandled_catch_response',
        debug_options: {}
      });
    });
  }

  /**
   * Initialize vars
   *
   * @returns {Promise<void>}
   */
  async _initializeVars() {
    const oThis = this;

    oThis.deployChainId = oThis.auxChainId;

    await oThis._fetchAndSetTokenDetails();

    await oThis._setAddresses();

    await oThis._fetchAndSetGasPrice(coreConstants.auxChainKind);

    await oThis._setWeb3Instance();
  }

  /**
   * Set addresses.
   *
   * @return Promise<void>
   * @private
   */
  async _setAddresses() {
    const oThis = this;

    oThis.auxKindToAddressMap = await oThis._fetchAddresses(oThis.deployChainId);

    oThis.deployerAddress = oThis.auxKindToAddressMap.data[chainAddressConstants.auxDeployerKind].address;

    const getAddrRsp = await new TokenAddressCache({
      tokenId: oThis.tokenId
    }).fetch();

    oThis.organizationAddress = getAddrRsp.data[tokenAddressConstants.auxOrganizationContract];
    oThis.brandedTokenContractAddress = getAddrRsp.data[tokenAddressConstants.brandedTokenContract];

    if (!oThis.brandedTokenContractAddress || !oThis.deployerAddress || !oThis.organizationAddress) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 't_es_dubt_2',
          api_error_identifier: 'something_went_wrong',
          debug_options: {
            brandedTokenContractAddress: oThis.brandedTokenContractAddress,
            deployerAddress: oThis.deployerAddress,
            organizationAddress: oThis.organizationAddress
          }
        })
      );
    }
  }

  /**
   * Deploy Utility Branded Token.
   *
   * @return {Promise<void>}
   * @private
   */
  async _deployContract() {
    const oThis = this;

    const BrandedTokenHelper = brandedTokenSetupHelper.EconomySetup.UtilityBrandedTokenHelper,
      brandedTokenDeploymentHelper = new BrandedTokenHelper();

    const txOptions = {
      from: oThis.deployerAddress,
      gasPrice: oThis.gasPrice,
      gas: contractConstants.deployUBTGas,
      value: contractConstants.zeroValue
    };

    const txObject = await brandedTokenDeploymentHelper._deployRawTx(
      oThis.brandedTokenContractAddress,
      oThis.tokenSymbol,
      oThis.tokenName,
      oThis.decimal,
      oThis.organizationAddress,
      txOptions,
      oThis.web3Instance
    );

    txOptions.data = txObject.encodeABI();

    const submitTxRsp = await new SubmitTransaction({
      chainId: oThis.deployChainId,
      tokenId: oThis.tokenId,
      pendingTransactionKind: pendingTransactionConstants.deployUtilityBrandedTokenKind,
      provider: oThis.chainEndpoint,
      txOptions: txOptions,
      options: oThis.pendingTransactionExtraData
    }).perform();

    if (submitTxRsp && submitTxRsp.isFailure()) {
      return Promise.reject(submitTxRsp);
    }

    oThis.debugParams = {
      from: oThis.deployerAddress,
      gasPrice: oThis.gasPrice,
      brandedTokenContractAddress: oThis.brandedTokenContractAddress,
      tokenSymbol: oThis.tokenSymbol,
      tokenName: oThis.tokenName,
      decimal: oThis.decimal,
      organizationAddress: oThis.organizationAddress
    };

    return Promise.resolve(submitTxRsp);
  }
}

InstanceComposer.registerAsShadowableClass(
  DeployUtilityBrandedToken,
  coreConstants.icNameSpace,
  'DeployUtilityBrandedToken'
);

module.exports = DeployUtilityBrandedToken;
