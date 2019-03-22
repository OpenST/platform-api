'use strict';

/**
 * Module to fetch nonce of multi sig contract.
 *
 * @module lib/nonce/contract/MultiSig
 */

const OSTBase = require('@ostdotcom/base'),
  InstanceComposer = OSTBase.InstanceComposer;

const rootPrefix = '../../..',
  CoreAbi = require(rootPrefix + '/config/CoreAbis'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  ContractNonceBase = require(rootPrefix + '/lib/nonce/contract/Base'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  contractNameConstants = require(rootPrefix + '/lib/globalConstant/contractName');

/**
 * Class to fetch nonce of multi-sig contract
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
   * Get nonce
   *
   * fetch GnosisSafe contract abi and multi-sig Address contract address
   *
   * @private
   */
  async _getNonce() {
    const oThis = this;

    let multiSigAbi = CoreAbi.getAbi(contractNameConstants.gnosisSafeContractName),
      multiSigAddress = oThis.userData.multisigAddress;

    return oThis._fetchMaxNonce(multiSigAbi, multiSigAddress);
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
