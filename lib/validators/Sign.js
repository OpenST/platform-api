'use strict';

const Web3EthAccount = require('web3-eth-accounts'),
  EthLibAccount = require('eth-lib/lib/account');

const rootPrefix = '../..',
  responseHelper = require(rootPrefix + '/lib/formatter/response');

class SignValidator {
  /**
   * Validate personal sign
   *
   * @param messageHash
   * @param personalSign
   * @param signer
   * @returns {Promise<*>}
   */
  async validatePersonalSign(messageHash, personalSign, signer) {
    let _signer = new Web3EthAccount('').recover(messageHash, personalSign);

    if (!_signer) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'l_v_s_1',
          api_error_identifier: 'something_went_wrong'
        })
      );
    }

    _signer = _signer.toLowerCase();

    return {
      isValid: signer.toLowerCase() === _signer,
      signer: _signer
    };
  }

  /**
   * Validate signature to be used in EIP712 and EIP1077 signature verification
   *
   * @param messageHash
   * @param signature
   * @param signer
   * @returns {Promise<*>}
   */
  async validateSignature(messageHash, signature, signer) {
    let _signer = EthLibAccount.recover(messageHash, signature);

    if (!_signer) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'l_v_s_2',
          api_error_identifier: 'something_went_wrong'
        })
      );
    }

    _signer = _signer.toLowerCase();

    return {
      isValid: signer.toLowerCase() === _signer,
      signer: _signer
    };
  }
}

module.exports = new SignValidator();
