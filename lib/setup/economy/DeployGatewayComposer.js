'use strict';

/**
 *  @module lib/setup/economy/DeployGC
 *
 *  This class deploys GC on origin chain
 */

const rootPrefix = '../../..',
  OSTBase = require('@ostdotcom/base'),
  InstanceComposer = OSTBase.InstanceComposer,
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  contractConstants = require(rootPrefix + '/lib/globalConstant/contract'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  ConfigStrategyObject = require(rootPrefix + '/helpers/configStrategy/Object'),
  web3Provider = require(rootPrefix + '/lib/providers/web3'),
  tokenAddressConstants = require(rootPrefix + '/lib/globalConstant/tokenAddress'),
  TokenAddressCache = require(rootPrefix + '/lib/cacheManagement/kitSaas/TokenAddress'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  chainAddressConstants = require(rootPrefix + '/lib/globalConstant/chainAddress'),
  pendingTransactionConstants = require(rootPrefix + '/lib/globalConstant/pendingTransaction'),
  SubmitTransaction = require(rootPrefix + '/lib/transactions/SignSubmitTrxOnChain'),
  workflowStepConstants = require(rootPrefix + '/lib/globalConstant/workflowStep'),
  gasPriceCacheKlass = require(rootPrefix + '/lib/cacheManagement/shared/EstimateOriginChainGasPrice'),
  ChainAddressCache = require(rootPrefix + '/lib/cacheManagement/kitSaas/ChainAddress');

const BrandedToken = require('@openst/brandedtoken.js'),
  GatewayComposerHelper = BrandedToken.EconomySetup.GatewayComposerHelper;

class DeployGatewayComposer {
  /**
   * Constructor
   *
   * @param {Object} params
   * @param {String} params.tokenId: tokenId
   * @param {String} params.stakeCurrencyContractAddress: stakeCurrencyContractAddress
   * @param {String} params.pendingTransactionExtraData: extraData for pending transaction.
   *
   * @constructor
   */
  constructor(params) {
    const oThis = this;
    oThis.tokenId = params.tokenId;
    oThis.pendingTransactionExtraData = params['pendingTransactionExtraData'];
    oThis.stakeCurrencyContractAddress = params.stakeCurrencyContractAddress;

    oThis.chainEndPoint = null;
    oThis.brandedTokenContractAddress = null;
    oThis.stakerAddress = null;
    oThis.signerAddress = null;
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
          internal_error_identifier: 'l_s_e_dgc_1',
          api_error_identifier: 'unhandled_catch_response',
          debug_options: {}
        });
      }
    });
  }

  /**
   * _asyncPerform
   *
   * @return {Promise<void>}
   * @private
   */
  async _asyncPerform() {
    const oThis = this;

    await oThis._initializeVars();

    await oThis._setAddresses();

    let submitTxRsp = await oThis._deployGatewayComposer();

    return responseHelper.successWithData({
      taskStatus: workflowStepConstants.taskPending,
      transactionHash: submitTxRsp.data['transactionHash'],
      debugParams: {
        gasPrice: oThis.gasPrice,
        from: oThis.signerAddress,
        chainEndPoint: oThis.chainEndPoint,
        stakerAddress: oThis.stakerAddress,
        brandedTokenContractAddress: oThis.brandedTokenContractAddress
      }
    });
  }

  /***
   *
   * init vars
   *
   * @private
   */
  async _initializeVars() {
    const oThis = this;
    oThis.deployChainId = oThis._configStrategyObject.originChainId;
    oThis.chainEndpoint = oThis._configStrategyObject.chainRpcProvider(oThis.deployChainId, 'readWrite');
    let gasPriceCacheObj = new gasPriceCacheKlass(),
      gasPriceRsp = await gasPriceCacheObj.fetch();
    oThis.gasPrice = gasPriceRsp.data;
    oThis.web3Instance = await web3Provider.getInstance(oThis.chainEndpoint).web3WsProvider;
  }

  /***
   *
   * @private
   */
  async _setAddresses() {
    const oThis = this;

    // Fetch all addresses associated with origin chain id.
    let chainAddressCacheObj = new ChainAddressCache({ associatedAuxChainId: 0 }),
      chainAddressesRsp = await chainAddressCacheObj.fetch();

    if (chainAddressesRsp.isFailure()) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'l_s_e_dgc_2',
          api_error_identifier: 'something_went_wrong'
        })
      );
    }

    oThis.signerAddress = chainAddressesRsp.data[chainAddressConstants.originDeployerKind].address;

    let getAddrRsp = await new TokenAddressCache({
      tokenId: oThis.tokenId
    }).fetch();

    oThis.stakerAddress = getAddrRsp.data[tokenAddressConstants.ownerAddressKind];
    oThis.brandedTokenContractAddress = getAddrRsp.data[tokenAddressConstants.brandedTokenContract];

    if (!oThis.stakerAddress || !oThis.brandedTokenContractAddress) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'l_s_e_dgc_3',
          api_error_identifier: 'something_went_wrong',
          debug_options: {
            stakerAddress: oThis.stakerAddress,
            brandedTokenContractAddress: oThis.brandedTokenContractAddress
          }
        })
      );
    }
  }

  /**
   * deploy GC
   *
   * @return {Promise<void>}
   * @private
   */
  async _deployGatewayComposer() {
    const oThis = this;

    let gatewayComposerHelper = new GatewayComposerHelper();

    let txOptions = {
      gasPrice: oThis.gasPrice,
      from: oThis.signerAddress,
      gas: contractConstants.deployGatewayComposerGas,
      value: contractConstants.zeroValue
    };

    let txObject = gatewayComposerHelper._deployRawTx(
      oThis.stakerAddress,
      oThis.stakeCurrencyContractAddress,
      oThis.brandedTokenContractAddress,
      txOptions,
      oThis.web3Instance
    );

    txOptions['data'] = txObject.encodeABI();

    return new SubmitTransaction({
      chainId: oThis.deployChainId,
      tokenId: oThis.tokenId,
      pendingTransactionKind: pendingTransactionConstants.deployGatewayComposerKind,
      provider: oThis.chainEndpoint,
      txOptions: txOptions,
      options: oThis.pendingTransactionExtraData
    }).perform();
  }

  /***
   *
   * config strategy
   *
   * @return {object}
   */
  get _configStrategy() {
    const oThis = this;
    return oThis.ic().configStrategy;
  }

  /***
   *
   * object of config strategy klass
   *
   * @return {object}
   */
  get _configStrategyObject() {
    const oThis = this;
    if (oThis.configStrategyObj) return oThis.configStrategyObj;
    oThis.configStrategyObj = new ConfigStrategyObject(oThis._configStrategy);
    return oThis.configStrategyObj;
  }
}

InstanceComposer.registerAsShadowableClass(DeployGatewayComposer, coreConstants.icNameSpace, 'DeployGatewayComposer');

module.exports = DeployGatewayComposer;
