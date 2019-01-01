'use strict';

/**
 * Deploy simpleToken
 *
 * @module tools/chainSetup/origin/simpleToken/Deploy
 */
const rootPrefix = '../../../..',
  OSTBase = require('@openstfoundation/openst-base'),
  InstanceComposer = OSTBase.InstanceComposer,
  SetupSTPrimeBase = require(rootPrefix + '/tools/chainSetup/aux/simpleTokenPrime/Base'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  ChainAddressModel = require(rootPrefix + '/app/models/mysql/ChainAddress'),
  chainAddressConstants = require(rootPrefix + '/lib/globalConstant/chainAddress'),
  chainSetupConstants = require(rootPrefix + '/lib/globalConstant/chainSetupLogs'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
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

    let chainOwnerAddr = await oThis._getChainOwnerAddr(),
      stPrimeContractAddr = await oThis._getSTPrimeContractAddr(),
      chainOwnerKey = await oThis._fetchPrivateKey(chainOwnerAddr);

    oThis._addKeyToWallet(chainOwnerKey);

    let nonceRsp = await oThis._fetchNonce(chainOwnerAddr);

    let txOptions = {
      gasPrice: '0x0',
      from: chainOwnerAddr,
      nonce: nonceRsp.data['nonce']
    };

    let helperObj = new SetupSTPrimeBase.STPrimeSetupHelper(oThis._web3Instance),
      initializeResponse = await helperObj
        .initialize(txOptions, stPrimeContractAddr)
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
            internal_error_identifier: 't_cs_o_stp_i_3',
            api_error_identifier: 'unhandled_catch_response',
            debug_options: {}
          });
        });

    oThis._removeKeyFromWallet(chainOwnerKey);

    initializeResponse.debugOptions = {
      inputParams: {},
      transactionParams: {
        chainId: oThis._auxChainId,
        STPrimeContractAddress: stPrimeContractAddr
      }
    };

    await oThis._insertIntoChainSetupLogs(chainSetupConstants.initializeBaseContractStepKind, initializeResponse);

    return initializeResponse;
  }

  /***
   *
   * get chain owner addr
   *
   * @private
   *
   * @return {Promise}
   *
   */
  async _getChainOwnerAddr() {
    const oThis = this;

    let fetchAddrRsp = await new ChainAddressModel().fetchAddress({
      chainId: oThis._auxChainId,
      kind: chainAddressConstants.chainOwnerKind,
      chainKind: chainAddressConstants.auxChainKind
    });

    if (!fetchAddrRsp.data.address) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 't_cs_o_stp_i_1',
          api_error_identifier: 'something_went_wrong'
        })
      );
    }

    return fetchAddrRsp.data.address;
  }

  /***
   *
   * get simple token contract addr
   *
   * @private
   *
   * @return {Promise}
   *
   */
  async _getSTPrimeContractAddr() {
    const oThis = this;

    let fetchAddrRsp = await new ChainAddressModel().fetchAddress({
      chainId: oThis._auxChainId,
      kind: chainAddressConstants.baseContractKind,
      chainKind: chainAddressConstants.auxChainKind
    });

    if (!fetchAddrRsp.data.address) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 't_cs_o_stp_i_2',
          api_error_identifier: 'something_went_wrong'
        })
      );
    }

    return fetchAddrRsp.data.address;
  }
}

InstanceComposer.registerAsShadowableClass(
  InitializeSimpleTokenPrime,
  coreConstants.icNameSpace,
  'InitializeSimpleTokenPrime'
);

module.exports = InitializeSimpleTokenPrime;
