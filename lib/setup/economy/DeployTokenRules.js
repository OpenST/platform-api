'use strict';
/**
 * Deploy Token Rules contract
 *
 * @module lib/setup/economy/DeployTokenRules
 */
const OSTBase = require('@ostdotcom/base'),
  InstanceComposer = OSTBase.InstanceComposer;

const rootPrefix = '../../..',
  web3Provider = require(rootPrefix + '/lib/providers/web3'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  contractConstants = require(rootPrefix + '/lib/globalConstant/contract'),
  ConfigStrategyObject = require(rootPrefix + '/helpers/configStrategy/Object'),
  workflowStepConstants = require(rootPrefix + '/lib/globalConstant/workflowStep'),
  chainAddressConstants = require(rootPrefix + '/lib/globalConstant/chainAddress'),
  tokenAddressConstants = require(rootPrefix + '/lib/globalConstant/tokenAddress'),
  pendingTransactionConstants = require(rootPrefix + '/lib/globalConstant/pendingTransaction'),
  SubmitTransaction = require(rootPrefix + '/lib/transactions/SignSubmitTrxOnChain'),
  TokenAddressCache = require(rootPrefix + '/lib/cacheManagement/kitSaas/TokenAddress'),
  ChainAddressCache = require(rootPrefix + '/lib/cacheManagement/kitSaas/ChainAddress');

const OpenSTJs = require('@openstfoundation/openst.js');

/**
 * Class for Token Rules deployment
 *
 * @class
 */
class DeployTokenRules {
  /**
   * Constructor for Token Rule deployment
   *
   * @param {Object} params
   * @param {String} params.auxChainId: auxChainId for which token rules needs be deployed.
   * @param {String} params.tokenId: tokenId for which token rules needs be deployed.
   * @param {String} params.pendingTransactionExtraData: extraData for pending transaction.
   *
   * @constructor
   */
  constructor(params) {
    const oThis = this;

    oThis.auxChainId = params['auxChainId'];
    oThis.tokenId = params['tokenId'];
    oThis.pendingTransactionExtraData = params['pendingTransactionExtraData'];

    oThis.gasPrice = null;
    oThis.deployChainId = null;
    oThis.chainEndpoint = null;
    oThis.auxWeb3Instance = null;
    oThis.configStrategyObj = null;

    oThis.auxDeployerAddress = null;
    oThis.auxTokenOrganizationAddr = null;
    oThis.utilityBrandedTokenAddr = null;
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
          internal_error_identifier: 'l_s_e_dtr_1',
          api_error_identifier: 'unhandled_catch_response',
          debug_options: { error: error.toString() }
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

    await oThis._getAuxDeployerAddr();

    await oThis._setWeb3Instance();

    let submitTxRsp = await oThis._deployContract();

    return Promise.resolve(
      responseHelper.successWithData({
        taskStatus: workflowStepConstants.taskPending,
        transactionHash: submitTxRsp.data['transactionHash'],
        debugParams: {
          gasPrice: oThis.gasPrice,
          deployerAddress: oThis.auxDeployerAddress,
          auxTokenOrganizationAddr: oThis.auxTokenOrganizationAddr,
          utilityBrandedTokenAddress: oThis.utilityBrandedTokenAddr
        }
      })
    );
  }

  /**
   * Initialize required variables.
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
   * Set addresses required for deployment of token rules.
   *
   * @private
   */
  async _setAddresses() {
    const oThis = this;

    let tokenAddressesCacheRsp = await new TokenAddressCache({
      tokenId: oThis.tokenId
    }).fetch();

    if (tokenAddressesCacheRsp.isFailure() || !tokenAddressesCacheRsp.data) {
      return Promise.reject(tokenAddressesCacheRsp);
    }

    oThis.auxTokenOrganizationAddr = tokenAddressesCacheRsp.data[tokenAddressConstants.auxOrganizationContract];
    oThis.utilityBrandedTokenAddr = tokenAddressesCacheRsp.data[tokenAddressConstants.utilityBrandedTokenContract];

    if (!oThis.auxTokenOrganizationAddr || !oThis.utilityBrandedTokenAddr) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'l_s_e_dtr_2',
          api_error_identifier: 'something_went_wrong',
          debug_options: {
            auxTokenOrganizationAddr: oThis.auxTokenOrganizationAddr,
            utilityBrandedTokenAddress: oThis.utilityBrandedTokenAddr
          }
        })
      );
    }
  }

  /**
   * Get Aux Deployer address from chain_addresses cache
   *
   * @private
   *
   * @return {Promise}
   */
  async _getAuxDeployerAddr() {
    const oThis = this;

    // Fetch all addresses associated with given aux chain id.
    let chainAddressCache = new ChainAddressCache({ associatedAuxChainId: oThis.auxChainId }),
      chainAddressCacheRsp = await chainAddressCache.fetch();

    if (chainAddressCacheRsp.isFailure() || !chainAddressCacheRsp.data) {
      return Promise.reject(chainAddressCacheRsp);
    }

    oThis.auxDeployerAddress = chainAddressCacheRsp.data[chainAddressConstants.auxDeployerKind].address;
  }

  /**
   * set Web3 Instance
   *
   * @return {Promise<void>}
   */
  async _setWeb3Instance() {
    const oThis = this;

    oThis.chainEndpoint = oThis._configStrategyObject.chainRpcProvider(oThis.deployChainId, 'readWrite');

    oThis.auxWeb3Instance = web3Provider.getInstance(oThis.chainEndpoint).web3WsProvider;
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

    let TokenRulesSetup = OpenSTJs.Setup.TokenRules,
      tokenRulesSetupHelper = new TokenRulesSetup(oThis.auxWeb3Instance); // web3 instance

    let txOptions = {
      from: oThis.auxDeployerAddress,
      gasPrice: oThis.gasPrice,
      gas: contractConstants.deployTokenRulesGas,
      value: contractConstants.zeroValue
    };

    let txObject = await tokenRulesSetupHelper._deployRawTx(
      oThis.auxTokenOrganizationAddr, // aux token organization address
      oThis.utilityBrandedTokenAddr, // utility branded token contract address
      txOptions
    );

    txOptions['data'] = txObject.encodeABI();

    let submitTxRsp = await new SubmitTransaction({
      chainId: oThis.deployChainId,
      tokenId: oThis.tokenId,
      pendingTransactionKind: pendingTransactionConstants.deployTokenRuleKind,
      provider: oThis.chainEndpoint,
      txOptions: txOptions,
      options: oThis.pendingTransactionExtraData
    }).perform(); // do we need to wait for receipt or not?

    if (submitTxRsp && submitTxRsp.isFailure()) {
      return Promise.reject(submitTxRsp);
    }

    return Promise.resolve(submitTxRsp);
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

InstanceComposer.registerAsShadowableClass(DeployTokenRules, coreConstants.icNameSpace, 'DeployTokenRules');

module.exports = {};
