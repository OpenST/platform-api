'use strict';
/**
 * This service gets processes RMQ message for Execute Tx.
 *
 * @module lib/transactions/ProcessRmqMessage
 */

const OSTBase = require('@openstfoundation/openst-base');

const rootPrefix = '../..',
  InstanceComposer = OSTBase.InstanceComposer,
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  coreConstants = require(rootPrefix + '/config/coreConstants');

class ProcessRmqExecuteTxMessage {
  /**
   *
   * @param params
   * @param {Number} params.tokenAddressId
   * @param {String} params.transactionUuid
   * @param {Object} params.sequentialExecutorResponse
   *
   * @constructor
   */
  constructor(params) {
    const oThis = this;

    oThis.tokenAddressId = params.tokenAddressId;
    oThis.transactionUuid = params.transactionUuid;
    oThis.sequentialExecutorResponse = params.sequentialExecutorResponse;
  }

  /**
   * Performer
   *
   * @return {Promise<>}
   */
  perform() {
    const oThis = this;

    return oThis.asyncPerform().catch(function(error) {
      if (responseHelper.isCustomResult(error)) {
        return error;
      } else {
        logger.error(`${__filename} ::perform::catch`);
        logger.error(error);
        return responseHelper.error({
          internal_error_identifier: 'l_t_prm_1',
          api_error_identifier: 'unhandled_catch_response',
          debug_options: {
            error: error.toString()
          }
        });
      }
    });
  }

  /**
   * asyncPerform
   *
   * @return {Promise<any>}
   */
  async asyncPerform() {
    const oThis = this;

    await oThis._validateParams();

    return responseHelper.successWithData({});
  }

  async _validateParams() {
    const oThis = this;
  }

  async _markSubmissionToGethAsSuccess() {
    const oThis = this;
  }

  async _markSubmissionToGethAsFailure() {
    const oThis = this;
  }
}

InstanceComposer.registerAsShadowableClass(
  ProcessRmqExecuteTxMessage,
  coreConstants.icNameSpace,
  'ProcessRmqExecuteTxMessage'
);

module.exports = {};
