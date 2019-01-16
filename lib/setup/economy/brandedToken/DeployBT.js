'use strict';
/**
 * Deploy Branded Token
 *
 * @module tools/economySetup/DeployBrandedToken
 */
const brandedTokenSetupHelper = require('@openstfoundation/branded-token.js'),
  OSTBase = require('@openstfoundation/openst-base'),
  BigNumber = require('bignumber.js');

const rootPrefix = '../../../..',
  InstanceComposer = OSTBase.InstanceComposer,
  TokenAddressCache = require(rootPrefix + '/lib/sharedCacheManagement/TokenAddress'),
  tokenAddressConstants = require(rootPrefix + '/lib/globalConstant/tokenAddress'),
  BrandedTokenBase = require(rootPrefix + '/lib/setup/economy/brandedToken/Base'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  contractConstants = require(rootPrefix + '/lib/globalConstant/contract'),
  SubmitTransaction = require(rootPrefix + '/lib/transactions/SignSubmitTrxOnChain'),
  chainAddressConstants = require(rootPrefix + '/lib/globalConstant/chainAddress'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger');

class DeployOriginBrandedToken extends BrandedTokenBase {
  constructor(params) {
    super(params);
    const oThis = this;
    oThis.originChainId = params.originChainId;
    oThis.deployToChainKind = coreConstants.originChainKind;
    oThis.conversionRateDecimals = coreConstants.CONVERSION_RATE_DECIMALS;

    oThis.organizationAddress = null;
  }

  /**
   *
   * performer
   * @returns {Promise<>}
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
          internal_error_identifier: 't_es_dbt_1',
          api_error_identifier: 'unhandled_catch_response',
          debug_options: {}
        });
      }
    });
  }

  /**
   * Initialize vars
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

  /***
   *
   * @private
   */
  async _setAddresses() {
    const oThis = this;

    let fetchRsp = await oThis._fetchAddresses(oThis.deployChainId, [
      chainAddressConstants.deployerKind,
      chainAddressConstants.baseContractKind
    ]);

    oThis.originKindToAddressMap = fetchRsp.data;

    oThis.simpleTokenAddress = oThis.originKindToAddressMap.address[chainAddressConstants.baseContractKind];
    oThis.deployerAddress = oThis.originKindToAddressMap.address[chainAddressConstants.deployerKind];

    let getAddrRsp = await new TokenAddressCache({
      tokenId: oThis.tokenId
    }).fetch();

    oThis.organizationAddress = getAddrRsp.data[tokenAddressConstants.originOrganizationContract];

    if (!oThis.simpleTokenAddress || !oThis.deployerAddress || !oThis.organizationAddress) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 't_es_dbt_2',
          api_error_identifier: 'something_went_wrong',
          debug_options: {
            simpleTokenAddress: oThis.simpleTokenAddress,
            deployerAddress: oThis.deployerAddress,
            organizationAddress: oThis.organizationAddress
          }
        })
      );
    }
  }

  /**
   *
   * @returns {Promise<void>}
   */
  async _deployContract() {
    const oThis = this;

    let BrandedTokenHelper = brandedTokenSetupHelper.EconomySetup.BrandedTokenHelper,
      brandedTokenDeploymentHelper = new BrandedTokenHelper();

    let txOptions = {
      from: oThis.deployerAddress,
      gasPrice: oThis.gasPrice,
      gas: contractConstants.deployBTGas,
      value: contractConstants.zeroValue
    };

    oThis._calculateConversionRate();

    let txObject = await brandedTokenDeploymentHelper._deployRawTx(
      oThis.simpleTokenAddress,
      oThis.tokenSymbol,
      oThis.tokenName,
      oThis.decimal,
      oThis.conversionRateForContract,
      oThis.conversionRateDecimals,
      oThis.organizationAddress,
      txOptions,
      oThis.web3Instance
    );

    txOptions['data'] = txObject.encodeABI();

    let submitTxRsp = await new SubmitTransaction({
      chainId: oThis.deployChainId,
      provider: oThis._configStrategyObject.chainRpcProvider(oThis.deployChainId, 'readWrite'),
      txOptions: txOptions,
      options: oThis.pendingTransactionExtraData
    }).perform();

    if (submitTxRsp && submitTxRsp.isFailure()) {
      return Promise.reject(submitTxRsp);
    }

    return Promise.resolve(submitTxRsp);
  }

  /**
   * This function calculates the conversion rate which will be sent to branded token contract.
   * This will multiply conversion_factor present in DB with 10^5
   */
  _calculateConversionRate() {
    const oThis = this;
    let conversionFactorFromDB = new BigNumber(oThis.conversionFactor),
      conversionMultiplier = new BigNumber(coreConstants.CONVERSION_RATE_MULTIPLIER);

    let conversionRateForContractBigNumber = conversionFactorFromDB.mul(conversionMultiplier);

    oThis.conversionRateForContract = conversionRateForContractBigNumber.toString();
  }
}

InstanceComposer.registerAsShadowableClass(
  DeployOriginBrandedToken,
  coreConstants.icNameSpace,
  'DeployOriginBrandedToken'
);
module.exports = DeployOriginBrandedToken;
