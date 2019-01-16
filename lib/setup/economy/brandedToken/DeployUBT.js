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
  responseHelper = require(rootPrefix + '/lib/formatter/response');

const brandedTokenSetupHelper = require('@openstfoundation/branded-token.js');

class DeployUtilityBrandedToken extends Base {
  constructor(params) {
    super(params);

    const oThis = this;

    oThis.web3Instance = null;
    oThis.deployerAddress = null;
    oThis.brandedTokenContractAddress = params.btCntrctAddr;
    oThis.organization = params.tokenAuxOrgCntrctAddr;
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
    await oThis._fetchAndSetDeployerAddress();
    await oThis._fetchAndSetGasPrice(coreConstants.auxChainKind);
    await oThis._setWeb3Instance();
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
      oThis.organization,
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
