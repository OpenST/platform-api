'use strict';

/**
 * This service recovers the account that signed the message and
 * checks if it matches with the account provided in the argument.
 *
 *
 * @module app/services/signer/Signer
 */

const rootPrefix = '../../..',
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  basicHelper = require(rootPrefix + '/helpers/basic'),
  Web3EthAccount = require('web3-eth-accounts');

class ECRecover {
  /**
   *
   *
   * @param params
   */
  constructor(params) {
    const oThis = this;

    oThis.signer = params.signer.toLowerCase();
    oThis.personalSign = params.personal_sign;
    oThis.messageToSign = params.message_to_sign;
  }

  /**
   *
   * @return {Promise<>}
   */
  perform() {
    const oThis = this;

    return oThis.asyncPerform().catch(function(error) {
      if (responseHelper.isCustomResult(error)) {
        return error;
      } else {
        logger.error('app/services/verifySigner/ECRecover::perform::catch');
        logger.error(error);
        return responseHelper.error({
          internal_error_identifier: 'a_s_vs_ecr_1',
          api_error_identifier: 'unhandled_catch_response',
          debug_options: {}
        });
      }
    });
  }

  /**
   *
   *
   * @return {Promise<any>}
   */
  async asyncPerform() {
    const oThis = this;

    oThis._validateParameters();

    let accountAddress = new Web3EthAccount('').recover(oThis.messageToSign, oThis.personalSign);

    if (!accountAddress) {
      return Promise.resolve(
        responseHelper.error({
          internal_error_identifier: 'a_s_vs_ecr_2',
          api_error_identifier: 'invalid_address'
        })
      );
    }

    accountAddress = accountAddress.toLowerCase();

    if (oThis.signer !== accountAddress) {
      logger.error('Input owner address does not matches recovered address');
      return Promise.resolve(
        responseHelper.error({
          internal_error_identifier: 'a_s_vs_ecr_3',
          api_error_identifier: 'invalid_address'
        })
      );
    }

    logger.log('Input owner address matches with recovered address');
    return Promise.resolve(responseHelper.successWithData({ signer: accountAddress }));
  }

  /**
   * Validate Input parameters
   *
   * @return {*}
   * @private
   */
  _validateParameters() {
    const oThis = this;

    if (!oThis.signer || oThis.signer === undefined || !basicHelper.isAddressValid(oThis.signer)) {
      logger.error('Owner address is not passed or wrong in input parameters.');
      return responseHelper.error({
        internal_error_identifier: 'a_s_vs_ecr_4',
        api_error_identifier: 'unhandled_catch_response',
        debug_options: {}
      });
    }

    if (
      !oThis.messageToSign ||
      !oThis.personalSign ||
      oThis.messageToSign === undefined ||
      oThis.personalSign === undefined
    ) {
      logger.error('input parameter validation failed');
      return responseHelper.error({
        internal_error_identifier: 'a_s_vs_ecr_5',
        api_error_identifier: 'unhandled_catch_response',
        debug_options: {}
      });
    }
  }
}

module.exports = ECRecover;
