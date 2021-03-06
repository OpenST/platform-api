'use strict';
/**
 * Deploy Proxy Factory contract
 *
 * @module lib/setup/economy/DeployProxyFactory
 */
const OSTBase = require('@ostdotcom/base'),
  InstanceComposer = OSTBase.InstanceComposer;

const rootPrefix = '../../..',
  web3Provider = require(rootPrefix + '/lib/providers/web3'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  contractConstants = require(rootPrefix + '/lib/globalConstant/contract'),
  ConfigStrategyObject = require(rootPrefix + '/helpers/configStrategy/Object'),
  workflowStepConstants = require(rootPrefix + '/lib/globalConstant/workflowStep'),
  chainAddressConstants = require(rootPrefix + '/lib/globalConstant/chainAddress'),
  pendingTransactionConstants = require(rootPrefix + '/lib/globalConstant/pendingTransaction'),
  SubmitTransaction = require(rootPrefix + '/lib/transactions/SignSubmitTrxOnChain'),
  ChainAddressCache = require(rootPrefix + '/lib/cacheManagement/kitSaas/ChainAddress');

const OpenSTJs = require('@openst/openst.js');

/**
 * Class for Proxy Factory deployment
 *
 * @class
 */
class DeployProxyFactory {
  /**
   * Constructor
   *
   * @param {Object} params
   * @param {Number} params.tokenId: token id
   * @param {String} params.auxChainId: auxChainId for which token rules needs be deployed.
   * @param {String} params.pendingTransactionExtraData: extraData for pending transaction.
   *
   * @constructor
   */
  constructor(params) {
    const oThis = this;

    oThis.tokenId = params.tokenId;
    oThis.auxChainId = params.auxChainId;
    oThis.pendingTransactionExtraData = params.pendingTransactionExtraData;

    oThis.gasPrice = null;
    oThis.chainEndpoint = null;
    oThis.auxWeb3Instance = null;
    oThis.configStrategyObj = null;

    oThis.auxDeployerAddress = null;
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
          internal_error_identifier: 'l_s_e_dpf_1',
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

    await oThis._setWeb3Instance();

    let submitTxRsp = await oThis._deployContract();

    return Promise.resolve(
      responseHelper.successWithData({
        taskStatus: workflowStepConstants.taskPending,
        transactionHash: submitTxRsp.data['transactionHash'],
        debugParams: {
          auxDeployerAddress: oThis.auxDeployerAddress
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
    oThis.chainEndpoint = oThis._configStrategyObject.chainRpcProvider(oThis.auxChainId, 'readWrite');
    oThis.gasPrice = contractConstants.auxChainGasPrice;
  }

  /**
   * Get addresses
   *
   * @private
   *
   * @return {Promise}
   */
  async _setAddresses() {
    const oThis = this;

    // Fetch all addresses associated with given aux chain id.
    let chainAddressCache = new ChainAddressCache({ associatedAuxChainId: oThis.auxChainId }),
      chainAddressCacheRsp = await chainAddressCache.fetch();

    if (chainAddressCacheRsp.isFailure() || !chainAddressCacheRsp.data) {
      return Promise.reject(chainAddressCacheRsp);
    }

    oThis.auxDeployerAddress = chainAddressCacheRsp.data[chainAddressConstants.auxDeployerKind].address;

    if (!oThis.auxDeployerAddress) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'l_s_e_dpf_2',
          api_error_identifier: 'something_went_wrong',
          debug_options: {
            auxDeployerAddress: oThis.auxDeployerAddress
          }
        })
      );
    }
  }

  /**
   * set Web3 Instance
   *
   * @return {Promise<void>}
   */
  async _setWeb3Instance() {
    const oThis = this;
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

    let OpenSTJsUserSetup = OpenSTJs.Setup.User,
      openSTJsRulesSetup = new OpenSTJsUserSetup(oThis.auxWeb3Instance);

    let txOptions = {
      from: oThis.auxDeployerAddress,
      gasPrice: oThis.gasPrice,
      gas: contractConstants.deployProxyFactoryGas,
      value: contractConstants.zeroValue
    };

    let txObject = await openSTJsRulesSetup._deployProxyFactoryRawTx();

    txOptions['data'] = txObject.encodeABI();

    let submitTxRsp = await new SubmitTransaction({
      chainId: oThis.auxChainId,
      tokenId: oThis.tokenId,
      pendingTransactionKind: pendingTransactionConstants.deployProxyFactoryKind,
      provider: oThis.chainEndpoint,
      txOptions: txOptions,
      options: oThis.pendingTransactionExtraData
    }).perform();

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

InstanceComposer.registerAsShadowableClass(DeployProxyFactory, coreConstants.icNameSpace, 'DeployProxyFactory');

module.exports = {};
