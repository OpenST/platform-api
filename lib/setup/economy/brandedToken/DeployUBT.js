'use strict';

/*
 *  tools/economySetup/DeployUtilityBrandedToken.js
 *
 *  This class helps in deployment of utility branded token on auxiliary chain
 */

const rootPrefix = '../../../..',
  OSTBase = require('@openstfoundation/openst-base'),
  InstanceComposer = OSTBase.InstanceComposer,
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  contractConstants = require(rootPrefix + '/lib/globalConstant/contract'),
  SubmitTransaction = require(rootPrefix + '/lib/transactions/SignSubmitTrxOnChain'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  Base = require(rootPrefix + '/lib/setup/economy/brandedToken/Base'),
  chainAddressConstants = require(rootPrefix + '/lib/globalConstant/chainAddress'),
  TokenAddressCache = require(rootPrefix + '/lib/cacheManagement/TokenAddress'),
  tokenAddressConstants = require(rootPrefix + '/lib/globalConstant/tokenAddress'),
  responseHelper = require(rootPrefix + '/lib/formatter/response');

const brandedTokenSetupHelper = require('@openstfoundation/branded-token.js');

class DeployUtilityBrandedToken extends Base {
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
          internal_error_identifier: 't_es_dubt_1',
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

    oThis.deployChainId = oThis.auxChainId;

    await oThis._fetchAndSetTokenDetails();

    await oThis._setAddresses();

    await oThis._fetchAndSetGasPrice(coreConstants.auxChainKind);

    await oThis._setWeb3Instance();
  }

  /***
   *
   * @private
   */
  async _setAddresses() {
    const oThis = this;

    oThis.auxKindToAddressMap = await oThis._fetchAddresses(oThis.deployChainId, [chainAddressConstants.deployerKind]);

    oThis.deployerAddress = oThis.originKindToAddressMap.address[chainAddressConstants.deployerKind];

    let getAddrRsp = await new TokenAddressCache({
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
   * _deployUtilityBrandedToken
   *
   * @return {Promise<void>}
   * @private
   */
  async _deployContract() {
    const oThis = this;

    let BrandedTokenHelper = brandedTokenSetupHelper.EconomySetup.UtilityBrandedTokenHelper,
      brandedTokenDeploymentHelper = new BrandedTokenHelper();

    let txOptions = {
      from: oThis.deployerAddress,
      gasPrice: oThis.gasPrice,
      gas: contractConstants.deployUBTGas,
      value: contractConstants.zeroValue
    };

    let txObject = await brandedTokenDeploymentHelper._deployRawTx(
      oThis.brandedTokenContractAddress,
      oThis.tokenSymbol,
      oThis.tokenName,
      oThis.decimal,
      oThis.organizationAddress,
      txOptions,
      oThis.web3Instance
    );

    txOptions['data'] = txObject.encodeABI();

    let submitTxRsp = await new SubmitTransaction({
      chainId: oThis.chainId,
      provider: oThis.chainEndpoint,
      txOptions: txOptions,
      options: oThis.pendingTransactionExtraData
    }).perform();

    if (submitTxRsp && submitTxRsp.isFailure()) {
      return Promise.reject(submitTxRsp);
    }

    return Promise.resolve(submitTxRsp);
  }
}

InstanceComposer.registerAsShadowableClass(
  DeployUtilityBrandedToken,
  coreConstants.icNameSpace,
  'DeployUtilityBrandedToken'
);

module.exports = DeployUtilityBrandedToken;
