'use strict';

/**
 *  @module lib/setup/economy/DeployGC
 *
 *  This class deploys GC on origin chain
 */

const rootPrefix = '../../..',
  OSTBase = require('@openstfoundation/openst-base'),
  InstanceComposer = OSTBase.InstanceComposer,
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  contractConstants = require(rootPrefix + '/lib/globalConstant/contract'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  ConfigStrategyObject = require(rootPrefix + '/helpers/configStrategy/Object'),
  web3Provider = require(rootPrefix + '/lib/providers/web3'),
  tokenAddressConstants = require(rootPrefix + '/lib/globalConstant/tokenAddress'),
  TokenAddressCache = require(rootPrefix + '/lib/sharedCacheManagement/TokenAddress'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  ChainAddressModel = require(rootPrefix + '/app/models/mysql/ChainAddress'),
  chainAddressConstants = require(rootPrefix + '/lib/globalConstant/chainAddress'),
  SubmitTransaction = require(rootPrefix + '/lib/transactions/SignSubmitTrxOnChain'),
  workflowStepConstants = require(rootPrefix + '/lib/globalConstant/workflowStep'),
  gasPriceCacheKlass = require(rootPrefix + '/lib/sharedCacheManagement/EstimateOriginChainGasPrice');

const BrandedToken = require('@openstfoundation/branded-token.js'),
  GatewayComposerHelper = BrandedToken.EconomySetup.GatewayComposerHelper;

class DeployGatewayComposer {
  constructor(params) {
    const oThis = this;
    oThis.tokenId = params.tokenId;
    oThis.pendingTransactionExtraData = params['pendingTransactionExtraData'];

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
          internal_error_identifier: 't_es_dgc_1',
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

    return Promise.resolve(
      responseHelper.successWithData({
        taskStatus: workflowStepConstants.taskPending,
        transactionHash: submitTxRsp.data['transactionHash'],
        taskResponseData: {
          gasPrice: oThis.gasPrice,
          from: oThis.signerAddress,
          chainEndPoint: oThis.chainEndPoint,
          stakerAddress: oThis.stakerAddress,
          brandedTokenContractAddress: oThis.brandedTokenContractAddress
        }
      })
    );
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
    oThis.chainEndpoint = oThis._configStrategyObject.chainWsProvider(oThis.deployChainId, 'readWrite');
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

    oThis.signerAddress = await oThis._getDeployerAddr();

    let fetchDataRsp = await new ChainAddressModel().fetchAddresses({
      chainId: oThis.deployChainId,
      kinds: [chainAddressConstants.baseContractKind]
    });

    let originKindToAddressMap = fetchDataRsp.data;

    oThis.simpleTokenAddress = originKindToAddressMap.address[chainAddressConstants.baseContractKind];

    let getAddrRsp = await new TokenAddressCache({
      tokenId: oThis.tokenId
    }).fetch();

    oThis.stakerAddress = getAddrRsp.data[tokenAddressConstants.ownerAddressKind];
    oThis.brandedTokenContractAddress = getAddrRsp.data[tokenAddressConstants.brandedTokenContract];

    if (!oThis.stakerAddress || !oThis.brandedTokenContractAddress) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 't_es_sgbt_2',
          api_error_identifier: 'something_went_wrong',
          debug_options: {
            stakerAddress: oThis.stakerAddress,
            brandedTokenContractAddress: oThis.brandedTokenContractAddress
          }
        })
      );
    }
  }

  /***
   *
   * get deplouer addr
   *
   * @private
   *
   * @return {Promise}
   *
   */
  async _getDeployerAddr() {
    const oThis = this;

    let fetchAddrRsp = await new ChainAddressModel().fetchAddress({
      chainId: oThis.deployChainId,
      kind: chainAddressConstants.deployerKind
    });

    if (!fetchAddrRsp.data.address) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 't_es_sgbt_3',
          api_error_identifier: 'something_went_wrong'
        })
      );
    }

    return fetchAddrRsp.data.address;
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
      oThis.simpleTokenAddress,
      oThis.brandedTokenContractAddress,
      txOptions,
      oThis.web3Instance
    );

    txOptions['data'] = txObject.encodeABI();

    let submitTxRsp = await new SubmitTransaction({
      chainId: oThis.deployChainId,
      provider: oThis.chainEndpoint,
      txOptions: txOptions,
      options: oThis.pendingTransactionExtraData
    }).perform();

    return Promise.resolve(submitTxRsp);
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
