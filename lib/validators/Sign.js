'use strict';

const EthLibAccount = require('eth-lib/lib/account'),
  EthUtil = require('ethereumjs-util');

const rootPrefix = '../..',
  responseHelper = require(rootPrefix + '/lib/formatter/response');

class SignValidator {
  /**
   * Validate personal sign
   *
   * @param message
   * @param personalSign
   * @param signer
   * @returns {Promise<*>}
   */
  async validatePersonalSign(message, personalSign, signer) {
    let signParams = EthLibAccount.decodeSignature(personalSign),
      msgBuff = EthUtil.toBuffer(message),
      msgHash = EthUtil.hashPersonalMessage(msgBuff),
      signerPublicKey = EthUtil.ecrecover(msgHash, Number(signParams[0]), signParams[1], signParams[2]),
      _signer = EthUtil.bufferToHex(EthUtil.publicToAddress(signerPublicKey));

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
   * @param message
   * @param signature
   * @param signer
   * @returns {Promise<*>}
   */
  async validateSignature(message, signature, signer) {
    let signParams = EthLibAccount.decodeSignature(signature),
      msgHash = EthUtil.toBuffer(message),
      signerPublicKey = EthUtil.ecrecover(msgHash, Number(signParams[0]), signParams[1], signParams[2]),
      _signer = EthUtil.bufferToHex(EthUtil.publicToAddress(signerPublicKey));

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
