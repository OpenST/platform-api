'use strict';
/**
 * Set co-gateway address to OSTPrime contract
 *
 * @module tools/chainSetup/aux/SetCoGatewayInOSTPrime
 */
const rootPrefix = '../../..',
  MosaicTbd = require('@openstfoundation/mosaic-tbd'),
  OSTBase = require('@openstfoundation/openst-base'),
  InstanceComposer = OSTBase.InstanceComposer,
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  ConfigStrategyObject = require(rootPrefix + '/helpers/configStrategy/Object'),
  ChainAddressModel = require(rootPrefix + '/app/models/mysql/ChainAddress'),
  chainAddressConstants = require(rootPrefix + '/lib/globalConstant/chainAddress'),
  web3Provider = require(rootPrefix + '/lib/providers/web3');

/**
 * Class for CoGateway deployment
 *
 * @class
 */
class SetCoGatewayInOSTPrime {
  /**
   * Constructor for CoGateway deployment
   *
   * @param {Object} params
   * @param {String} params.auxChainId - auxChainId
   *
   * @constructor
   */
  constructor(params) {
    const oThis = this;

    oThis.auxChainId = params['auxChainId'];

    oThis.coGateWayContractAddress = null;
    oThis.stPrimeContractAddress = null;
    oThis.web3Instance = null;
    oThis.configStrategyObj = null;
  }

  /**
   *
   * Perform
   *
   * @return {Promise<result>}
   *
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
          internal_error_identifier: 't_cs_o_dcg_1',
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

    await oThis._setWeb3Instance();

    await oThis._getCoGatewayAddress();

    await oThis._getSTPrimeContractAddr();

    await oThis._setCoGatewayInOSTPrime();

    oThis.SignerWeb3Instance.removeAddressKey(oThis.organizationWorker);

    return Promise.resolve(
      responseHelper.successWithData({
        taskDone: 1
      })
    );
  }

  /**
   * _setWeb3Instance
   *
   * @return {Promise<void>}
   * @private
   */
  async _setWeb3Instance() {
    const oThis = this;

    let wsProvider = oThis._configStrategyObject.chainWsProvider(oThis.auxChainId, 'readWrite');

    oThis.web3Instance = await web3Provider.getInstance(wsProvider).web3WsProvider;
  }

  /**
   * _setCoGatewayInUBT
   *
   * @return {Promise<void>}
   * @private
   */
  async _setCoGatewayInOSTPrime() {
    const oThis = this;

    let stPrimeSetupHelper = new SetCoGatewayInOSTPrime.STPrimeSetupHelper(oThis.web3Instance);

    let txOptions = {
      from: oThis.stPrimeContractAddress,
      gas: '60000',
      gasPrice: '0x0'
    };

    let contractResponse = await stPrimeSetupHelper.setCoGateway(
      oThis.coGateWayContractAddress,
      txOptions,
      oThis.stPrimeContractAddress
    );

    console.log('contractResponse------', contractResponse);

    return Promise.resolve(contractResponse);
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

  /**
   * _getCoGatewayAddress
   *
   * @return {Promise<never>}
   * @private
   */
  async _getCoGatewayAddress() {
    const oThis = this;

    let fetchAddrRsp = await new ChainAddressModel().fetchAddress({
      chainId: oThis.auxChainId,
      auxChainId: oThis.auxChainId,
      kind: chainAddressConstants.auxCoGatewayContractKind
    });

    if (!fetchAddrRsp.data.address) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 't_es_scgubt_4',
          api_error_identifier: 'something_went_wrong'
        })
      );
    }

    oThis.coGateWayContractAddress = fetchAddrRsp.data.address;
  }

  /***
   *
   * Get simple token prime contract addr
   *
   * @private
   *
   * @return {Promise}
   *
   */
  async _getSTPrimeContractAddr() {
    const oThis = this;

    let fetchAddrRsp = await new ChainAddressModel().fetchAddress({
      chainId: oThis.auxChainId,
      kind: chainAddressConstants.baseContractKind
    });

    if (!fetchAddrRsp.data.address) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 't_cs_o_dcg_5',
          api_error_identifier: 'something_went_wrong'
        })
      );
    }

    oThis.stPrimeContractAddress = fetchAddrRsp.data.address;
  }

  static get STPrimeSetupHelper() {
    return MosaicTbd.ChainSetup.OSTPrimeHelper;
  }
}

InstanceComposer.registerAsShadowableClass(SetCoGatewayInOSTPrime, coreConstants.icNameSpace, 'SetCoGatewayInOSTPrime');

module.exports = SetCoGatewayInOSTPrime;
