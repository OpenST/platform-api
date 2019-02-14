'use strict';
/**
 * Set co-gateway address to OSTPrime contract
 *
 * @module tools/chainSetup/aux/SetCoGatewayInOSTPrime
 */
const rootPrefix = '../../..',
  MosaicJs = require('@openstfoundation/mosaic.js'),
  OSTBase = require('@openstfoundation/openst-base'),
  InstanceComposer = OSTBase.InstanceComposer,
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  ConfigStrategyObject = require(rootPrefix + '/helpers/configStrategy/Object'),
  ChainAddressCache = require(rootPrefix + '/lib/cacheManagement/kitSaas/ChainAddress'),
  chainAddressConstants = require(rootPrefix + '/lib/globalConstant/chainAddress'),
  workflowStepConstants = require(rootPrefix + '/lib/globalConstant/workflowStep'),
  NonceManager = require(rootPrefix + '/lib/nonce/Manager'),
  contractConstants = require(rootPrefix + '/lib/globalConstant/contract'),
  SignerWeb3Provider = require(rootPrefix + '/lib/providers/signerWeb3');

/**
 * Class to set co-gateway address to OSTPrime contract
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
    oThis.adminAddress = null;
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
          internal_error_identifier: 't_cs_a_scgop_1',
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

    await oThis._fetchAuxAddresses();

    await oThis._setWeb3Instance();

    await oThis._setCoGatewayInOSTPrime();

    oThis.SignerWeb3Instance.removeAddressKey(oThis.adminAddress);

    return Promise.resolve(
      responseHelper.successWithData({
        taskStatus: workflowStepConstants.taskDone
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
    oThis.SignerWeb3Instance = new SignerWeb3Provider(wsProvider, oThis.adminAddress);
    oThis.web3Instance = await oThis.SignerWeb3Instance.getInstance();
  }

  /**
   * _setCoGatewayInUBT
   *
   * @return {Promise<void>}
   * @private
   */
  async _setCoGatewayInOSTPrime() {
    const oThis = this;

    let stPrimeSetupHelper = new SetCoGatewayInOSTPrime.STPrimeSetupHelper(oThis.web3Instance),
      nonceRsp = await oThis._fetchNonce();

    let txOptions = {
      gasPrice: contractConstants.zeroGasPrice,
      from: oThis.adminAddress,
      nonce: nonceRsp.data['nonce'],
      chainId: oThis.auxChainId,
      gas: contractConstants.setCoGatewayToStPrimeGas
    };

    let contractResponse = await stPrimeSetupHelper.setCoGateway(
      oThis.coGateWayContractAddress,
      txOptions,
      oThis.stPrimeContractAddress
    );

    logger.debug('txReceipt', contractResponse);

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
   * fetch required aux addresses
   *
   * @private
   *
   * @return {Promise}
   *
   */
  async _fetchAuxAddresses() {
    const oThis = this;

    // Fetch all addresses associated with aux chain id.
    let chainAddressCacheObj = new ChainAddressCache({ associatedAuxChainId: oThis.auxChainId }),
      chainAddressesRsp = await chainAddressCacheObj.fetch();

    if (chainAddressesRsp.isFailure()) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 't_cs_a_scgop_2',
          api_error_identifier: 'something_went_wrong'
        })
      );
    }

    oThis.coGateWayContractAddress = chainAddressesRsp.data[chainAddressConstants.auxCoGatewayContractKind].address;
    oThis.stPrimeContractAddress = chainAddressesRsp.data[chainAddressConstants.stPrimeContractKind].address;
    oThis.adminAddress = chainAddressesRsp.data[chainAddressConstants.stPrimeOrgContractAdminKind].address;
  }

  /**
   * Fetch nonce (calling this method means incrementing nonce in cache, use judiciously)
   *
   * @ignore
   *
   * @return {Promise}
   */
  async _fetchNonce() {
    const oThis = this;
    return new NonceManager({
      address: oThis.adminAddress,
      chainId: oThis.auxChainId
    }).getNonce();
  }

  static get STPrimeSetupHelper() {
    return MosaicJs.ChainSetup.OSTPrimeHelper;
  }
}

InstanceComposer.registerAsShadowableClass(SetCoGatewayInOSTPrime, coreConstants.icNameSpace, 'SetCoGatewayInOSTPrime');

module.exports = SetCoGatewayInOSTPrime;
