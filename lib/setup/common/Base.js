'use strict';
/**
 * Base class for setup tasks that are common across origin & aux chains
 *
 * @module lib/setup/common/Base
 */
const rootPrefix = '../../..',
  web3Provider = require(rootPrefix + '/lib/providers/web3'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger');

/**
 * Class for common setup base
 *
 * @class
 */
class CommonSetupBase {
  /**
   * Constructor for common setup base
   *
   * @param {Object} params
   * @param {Number} params.chainId: chain id on which this is to be performed
   * @param {String} params.signerAddress: address who signs Tx
   * @param {String} params.chainEndpoint: url to connect to chain
   * @param {String} params.gasPrice: gas price to use
   * @param {Object} [params.pendingTransactionExtraData]: pending tx extra data
   * @param {Object} [params.customSubmitTxParams]: custom submit tx params (extra ones to be inserted in tx meta)
   *
   * @constructor
   */
  constructor(params) {
    const oThis = this;

    oThis.chainId = params['chainId'];
    oThis.chainEndpoint = params['chainEndpoint'];
    oThis.signerAddress = params['signerAddress'];
    oThis.gasPrice = params['gasPrice'];
    oThis.pendingTransactionExtraData = params['pendingTransactionExtraData'];
    oThis.customSubmitTxParams = params['customSubmitTxParams'];

    oThis.web3InstanceObj = null;
  }

  /**
   * Perform
   *
   * @return {Promise<result>}
   */
  perform() {
    const oThis = this;

    return oThis._asyncPerform().catch(function(error) {
      if (responseHelper.isCustomResult(error)) {
        return error;
      } else {
        logger.error('lib/setup/common/Base::perform::catch');
        logger.error(error);
        return responseHelper.error({
          internal_error_identifier: 'l_s_c_b_1',
          api_error_identifier: 'unhandled_catch_response',
          debug_options: {}
        });
      }
    });
  }

  /**
   * Get web3instance to interact with chain
   *
   * @return {Object}
   */
  get _web3Instance() {
    const oThis = this;

    if (oThis.web3InstanceObj) return oThis.web3InstanceObj;

    oThis.web3InstanceObj = web3Provider.getInstance(oThis.chainEndpoint).web3WsProvider;

    return oThis.web3InstanceObj;
  }
}

module.exports = CommonSetupBase;
