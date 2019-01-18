'use strict';

/**
 *  @module lib/setup/economy/SetCoGatewayInUtilityBT
 *
 *  This class helps in setting co-gateway in UBT contract
 */

const rootPrefix = '../../..',
  OSTBase = require('@openstfoundation/openst-base'),
  InstanceComposer = OSTBase.InstanceComposer,
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  ConfigStrategyObject = require(rootPrefix + '/helpers/configStrategy/Object'),
  web3Provider = require(rootPrefix + '/lib/providers/web3'),
  tokenAddressConstants = require(rootPrefix + '/lib/globalConstant/tokenAddress'),
  contractConstants = require(rootPrefix + '/lib/globalConstant/contract'),
  TokenAddressCache = require(rootPrefix + '/lib/sharedCacheManagement/TokenAddress'),
  SubmitTransaction = require(rootPrefix + '/lib/transactions/SignSubmitTrxOnChain'),
  responseHelper = require(rootPrefix + '/lib/formatter/response');

const BrandedToken = require('@openstfoundation/branded-token.js'),
  UtilityBrandedTokenHelper = BrandedToken.EconomySetup.UtilityBrandedTokenHelper;

class SetCoGatewayInUtilityBT {
  constructor(params) {
    const oThis = this;

    oThis.chainId = params.chainId;
    oThis.tokenId = params.tokenId;
    oThis.pendingTransactionExtraData = params['pendingTransactionExtraData'];
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
          internal_error_identifier: 't_es_scgubt_1',
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

    await oThis._setAddresses();

    await oThis._setWeb3Instance();

    let submitTxRsp = await oThis._setCoGatewayInUBT();

    return Promise.resolve(
      responseHelper.successWithData({
        taskDone: 0,
        transactionHash: submitTxRsp.data['transactionHash'],
        taskResponseData: {
          gasPrice: contractConstants.auxChainGasPrice,
          from: oThis.adminAddress,
          chainEndPoint: oThis.chainEndPoint,
          tokenCoGatewayAddresses: oThis.tokenCoGatewayAddresses,
          utilityBTContractAddress: oThis.utilityBTContractAddress
        }
      })
    );
  }

  /***
   *
   * @private
   */
  async _setAddresses() {
    const oThis = this;

    let getAddrRsp = await new TokenAddressCache({
      tokenId: oThis.tokenId
    }).fetch();

    oThis.adminAddress = getAddrRsp.data[tokenAddressConstants.adminAddressKind];
    oThis.tokenCoGatewayAddresses = getAddrRsp.data[tokenAddressConstants.tokenCoGatewayContract];
    oThis.utilityBTContractAddress = getAddrRsp.data[tokenAddressConstants.utilityBrandedTokenContract];

    if (!oThis.adminAddress || !oThis.tokenCoGatewayAddresses || !oThis.utilityBTContractAddress) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 't_es_sgbt_2',
          api_error_identifier: 'something_went_wrong',
          debug_options: {
            adminAddress: oThis.adminAddress,
            tokenCoGatewayAddresses: oThis.tokenCoGatewayAddresses,
            utilityBTContractAddress: oThis.utilityBTContractAddress
          }
        })
      );
    }
  }

  /**
   * _setWeb3Instance
   *
   * @return {Promise<void>}
   * @private
   */
  async _setWeb3Instance() {
    const oThis = this;
    oThis.chainEndpoint = oThis._configStrategyObject.chainWsProvider(oThis.chainId, 'readWrite');
    oThis.web3Instance = web3Provider.getInstance(oThis.chainEndpoint).web3WsProvider;
  }

  /**
   * _setCoGatewayInUBT
   *
   * @return {Promise<void>}
   * @private
   */
  async _setCoGatewayInUBT() {
    const oThis = this;

    let brandedTokenHelper = new UtilityBrandedTokenHelper();

    let txOptions = {
      from: oThis.adminAddress,
      to: oThis.utilityBTContractAddress,
      gasPrice: contractConstants.auxChainGasPrice,
      gas: contractConstants.setCoGatewayInUBTGas,
      value: contractConstants.zeroValue
    };

    let txObject = brandedTokenHelper._setCoGatewayRawTx(
      oThis.tokenCoGatewayAddresses,
      txOptions,
      oThis.utilityBTContractAddress,
      oThis.web3Instance
    );

    txOptions['data'] = txObject.encodeABI();

    let submitTxRsp = await new SubmitTransaction({
      chainId: oThis.chainId,
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
InstanceComposer.registerAsShadowableClass(
  SetCoGatewayInUtilityBT,
  coreConstants.icNameSpace,
  'SetCoGatewayInUtilityBT'
);
module.exports = SetCoGatewayInUtilityBT;
