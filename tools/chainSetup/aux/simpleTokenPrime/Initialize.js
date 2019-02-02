'use strict';
/**
 * Deploy simpleToken
 *
 * @module tools/chainSetup/origin/simpleTokenPrime/Deploy
 */
const rootPrefix = '../../../..',
  OSTBase = require('@openstfoundation/openst-base'),
  InstanceComposer = OSTBase.InstanceComposer,
  SetupSTPrimeBase = require(rootPrefix + '/tools/chainSetup/aux/simpleTokenPrime/Base'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  ChainAddressCache = require(rootPrefix + '/lib/cacheManagement/kitSaas/ChainAddress'),
  chainAddressConstants = require(rootPrefix + '/lib/globalConstant/chainAddress'),
  chainSetupConstants = require(rootPrefix + '/lib/globalConstant/chainSetupLogs'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  contractConstants = require(rootPrefix + '/lib/globalConstant/contract'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger');

/**
 *
 * @class
 */
class InitializeSimpleTokenPrime extends SetupSTPrimeBase {
  /**
   * Constructor
   *
   * @param {Object} params
   *
   * @constructor
   */
  constructor(params) {
    super(params);
    const oThis = this;
    oThis.chainId = params.chainId;
  }

  /**
   * asyncPerform
   *
   * @private
   *
   * @return {Promise}
   */
  async _asyncPerform() {
    const oThis = this;

    await oThis._fetchOriginAddresses();
    await oThis._fetchAuxAddresses();

    let chainOwnerKey = await oThis._fetchPrivateKey(oThis.masterInternalFunderAddress);

    oThis._addKeyToWallet(chainOwnerKey);

    let nonceRsp = await oThis._fetchNonce(oThis.masterInternalFunderAddress);

    let txOptions = {
      gasPrice: contractConstants.zeroGasPrice,
      from: oThis.masterInternalFunderAddress,
      nonce: nonceRsp.data['nonce'],
      chainId: oThis.chainId
    };

    let helperObj = new SetupSTPrimeBase.STPrimeSetupHelper(oThis._web3Instance),
      initializeResponse = await helperObj
        .initialize(txOptions, oThis.stPrimeContractAddr)
        .then(function(txReceipt) {
          logger.debug('txReceipt', txReceipt);
          return responseHelper.successWithData({
            transactionReceipt: txReceipt,
            transactionHash: txReceipt.transactionHash
          });
        })
        .catch(function(errorResponse) {
          logger.error(errorResponse);
          return responseHelper.error({
            internal_error_identifier: 't_cs_a_stp_i_1',
            api_error_identifier: 'unhandled_catch_response',
            debug_options: {}
          });
        });

    oThis._removeKeyFromWallet(chainOwnerKey);

    initializeResponse.debugOptions = {
      inputParams: {},
      processedParams: {
        chainId: oThis._auxChainId,
        STPrimeContractAddress: oThis.stPrimeContractAddr
      }
    };

    await oThis._insertIntoChainSetupLogs(chainSetupConstants.initializeBaseContractStepKind, initializeResponse);

    return initializeResponse;
  }

  /**
   * fetch required origin addresses
   *
   * @private
   *
   * @return {Promise}
   *
   */
  async _fetchOriginAddresses() {
    const oThis = this;

    // Fetch all addresses associated with origin chain id.
    let chainAddressCacheObj = new ChainAddressCache({ associatedAuxChainId: 0 }),
      chainAddressesRsp = await chainAddressCacheObj.fetch();

    if (chainAddressesRsp.isFailure()) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 't_cs_a_stp_i_2',
          api_error_identifier: 'something_went_wrong'
        })
      );
    }

    oThis.masterInternalFunderAddress = chainAddressesRsp.data[chainAddressConstants.masterInternalFunderKind].address;
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
    let chainAddressCacheObj = new ChainAddressCache({ associatedAuxChainId: oThis._auxChainId }),
      chainAddressesRsp = await chainAddressCacheObj.fetch();

    if (chainAddressesRsp.isFailure()) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 't_cs_a_stp_i_3',
          api_error_identifier: 'something_went_wrong'
        })
      );
    }

    oThis.stPrimeContractAddr = chainAddressesRsp.data[chainAddressConstants.stPrimeContractKind].address;
  }
}

InstanceComposer.registerAsShadowableClass(
  InitializeSimpleTokenPrime,
  coreConstants.icNameSpace,
  'InitializeSimpleTokenPrime'
);

module.exports = InitializeSimpleTokenPrime;
