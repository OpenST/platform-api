/**
 * Deploy Branded Token
 *
 * @module tools/economySetup/DeployBrandedToken
 */

const OSTBase = require('@ostdotcom/base'),
  InstanceComposer = OSTBase.InstanceComposer,
  brandedTokenSetupHelper = require('@openst/brandedtoken.js');

const rootPrefix = '../../../..',
  BrandedTokenBase = require(rootPrefix + '/lib/setup/economy/brandedToken/Base'),
  SubmitTransaction = require(rootPrefix + '/lib/transactions/SignSubmitTrxOnChain'),
  TokenAddressCache = require(rootPrefix + '/lib/cacheManagement/kitSaas/TokenAddress'),
  basicHelper = require(rootPrefix + '/helpers/basic'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  contractConstants = require(rootPrefix + '/lib/globalConstant/contract'),
  tokenAddressConstants = require(rootPrefix + '/lib/globalConstant/tokenAddress'),
  chainAddressConstants = require(rootPrefix + '/lib/globalConstant/chainAddress'),
  pendingTransactionConstants = require(rootPrefix + '/lib/globalConstant/pendingTransaction');

/**
 * Class to deploy branded token.
 *
 * @class DeployOriginBrandedToken
 */
class DeployOriginBrandedToken extends BrandedTokenBase {
  /**
   * Constructor to deploy branded token.
   *
   * @param {object} params
   * @param {number/string} params.originChainId
   * @param {number} params.clientId
   * @param {number} params.chainId
   * @param {object} params.pendingTransactionExtraData
   * @param {string} params.stakeCurrencyContractAddress
   *
   * @augments BrandedTokenBase
   *
   * @constructor
   */
  constructor(params) {
    super(params);

    const oThis = this;

    oThis.originChainId = params.originChainId;
    oThis.deployToChainKind = coreConstants.originChainKind;
    oThis.conversionRateDecimals = coreConstants.STAKE_CURRENCY_TO_BT_CONVERSION_RATE_DECIMALS;

    oThis.stakeCurrencyContractAddress = params.stakeCurrencyContractAddress;
    oThis.organizationAddress = null;
    oThis.deployerAddress = null;
  }

  /**
   * Performer
   *
   * @returns {Promise<>}
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
        internal_error_identifier: 'l_s_e_bt_dbt_1',
        api_error_identifier: 'unhandled_catch_response',
        debug_options: {}
      });
    });
  }

  /**
   * Initialize variables.
   *
   * @returns {Promise<void>}
   */
  async _initializeVars() {
    const oThis = this;

    oThis.deployChainId = oThis._configStrategyObject.originChainId;

    await oThis._fetchAndSetTokenDetails();

    await oThis._setAddresses();

    await oThis._fetchAndSetGasPrice(coreConstants.originChainKind);

    await oThis._setWeb3Instance();
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

    const fetchRsp = await oThis._fetchAddresses(0);

    oThis.originKindToAddressMap = fetchRsp.data;

    oThis.deployerAddress = oThis.originKindToAddressMap[chainAddressConstants.originDeployerKind].address;

    const getAddrRsp = await new TokenAddressCache({
      tokenId: oThis.tokenId
    }).fetch();

    oThis.organizationAddress = getAddrRsp.data[tokenAddressConstants.originOrganizationContract];

    if (!oThis.stakeCurrencyContractAddress || !oThis.deployerAddress || !oThis.organizationAddress) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'l_s_e_bt_dbt_2',
          api_error_identifier: 'something_went_wrong',
          debug_options: {
            stakeCurrencyContractAddress: oThis.stakeCurrencyContractAddress,
            deployerAddress: oThis.deployerAddress,
            organizationAddress: oThis.organizationAddress
          }
        })
      );
    }
  }

  /**
   * Deploy contract
   *
   * @returns {Promise<*>}
   *
   * @private
   */
  async _deployContract() {
    const oThis = this;

    const BrandedTokenHelper = brandedTokenSetupHelper.EconomySetup.BrandedTokenHelper,
      brandedTokenDeploymentHelper = new BrandedTokenHelper();

    const txOptions = {
      from: oThis.deployerAddress,
      gasPrice: oThis.gasPrice,
      gas: contractConstants.deployBTGas,
      value: contractConstants.zeroValue
    };

    oThis._calculateConversionRate();

    const txObject = await brandedTokenDeploymentHelper._deployRawTx(
      oThis.stakeCurrencyContractAddress,
      oThis.tokenSymbol,
      oThis.tokenName,
      oThis.decimal,
      oThis.conversionRateForContract,
      oThis.conversionRateDecimals,
      oThis.organizationAddress,
      txOptions,
      oThis.web3Instance
    );

    txOptions.data = txObject.encodeABI();

    const submitTxRsp = await new SubmitTransaction({
      chainId: oThis.deployChainId,
      tokenId: oThis.tokenId,
      pendingTransactionKind: pendingTransactionConstants.deployBrandedTokenKind,
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
      stakeCurrencyContractAddress: oThis.stakeCurrencyContractAddress,
      tokenSymbol: oThis.tokenSymbol,
      tokenName: oThis.tokenName,
      decimal: oThis.decimal,
      conversionRateForContract: oThis.conversionRateForContract,
      conversionRateDecimals: oThis.conversionRateDecimals,
      organizationAddress: oThis.organizationAddress
    };

    return Promise.resolve(submitTxRsp);
  }

  /**
   * This function calculates the conversion rate which will be sent to branded token contract.
   * This will multiply conversion_factor present in DB with 10^5.
   *
   * @private
   */
  _calculateConversionRate() {
    const oThis = this;
    oThis.conversionRateForContract = basicHelper.computeConversionRateForContract(oThis.conversionFactor);
  }
}

InstanceComposer.registerAsShadowableClass(
  DeployOriginBrandedToken,
  coreConstants.icNameSpace,
  'DeployOriginBrandedToken'
);
module.exports = DeployOriginBrandedToken;
