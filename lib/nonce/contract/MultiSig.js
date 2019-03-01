'use strict';

/**
 * Module to fetch nonce of multi sig contract.
 *
 * @module lib/nonce/contract/MultiSig
 */

const OSTBase = require('@ostdotcom/base'),
  InstanceComposer = OSTBase.InstanceComposer;

const rootPrefix = '../../..',
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  ContractNonceBase = require(rootPrefix + '/lib/nonce/contract/Base'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  CoreAbi = require(rootPrefix + '/config/CoreAbis');

/**
 * Class to fetch nonce of session address from token holder contract
 *
 * @class
 */
class MultiSigNonce extends ContractNonceBase {
  /**
   * Constructor
   *
   * @param params {Object}
   *
   */
  constructor(params) {
    super(params);
  }

  /**
   * Initialize Contract Obj
   *
   * @private
   */
  _initContract() {
    const oThis = this;

    let multiSigAbi = CoreAbi.GnosisSafe,
      multiSigAddress = oThis.userData.multisigAddress;

    return new oThis.web3Instance.eth.Contract(multiSigAbi, multiSigAddress);
  }

  /**
   * Fetch nonce from contract.
   *
   * @private
   */
  async _fetchNonceFromContract() {
    const oThis = this;

    let contractResponse = await oThis.contractObj.methods.nonce().call();

    if (!contractResponse) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'l_n_c_ms_1',
          api_error_identifier: 'resource_not_found',
          debug_options: {}
        })
      );
    }

    return contractResponse;
  }
}

InstanceComposer.registerAsShadowableClass(MultiSigNonce, coreConstants.icNameSpace, 'MultiSigNonce');

module.exports = {};
