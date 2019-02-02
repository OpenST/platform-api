'use strict';

/**
 * Generate address for Origin and Auxiliary chains
 *
 * @module devops/utils/GenerateAddress
 */
const rootPrefix = '../../..',
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  GenerateChainKnownAddresses = require(rootPrefix + '/tools/helpers/GenerateChainKnownAddresses');

/**
 * Class for Generating addresses for Origin and Auxiliary chains
 *
 * @class
 */
class Base {
  /**
   * Constructor
   *
   * @param configFilePath
   *
   * @constructor
   */
  constructor() {
    const oThis = this;
    oThis.chainId = null;
    oThis.chainKind = null;

    oThis.numberOfFlowsForGas = 5;
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
        logger.error('devops/utils/GenerateAddress.js::perform::catch', error);
        return oThis._getRespError('do_u_ca_b_p1');
      }
    });
  }

  /**
   * Generate addresses required for chain
   *
   * @param addressKinds {Array} - List of address kinds to generate
   *
   * @returns {Promise<*>}
   * @private
   */
  async _generateAddresses(addressKinds) {
    const oThis = this;

    let generateChainKnownAddresses = new GenerateChainKnownAddresses({
      addressKinds: addressKinds,
      chainKind: oThis.chainKind,
      chainId: oThis.chainId
    });

    let generateAddrRsp = await generateChainKnownAddresses.perform();

    if (!generateAddrRsp.isSuccess()) {
      logger.error(`Address generation failed for chain kind: ${oThis.chainKind} -- chain id: ${oThis.chainId}`);
      return oThis._getRespError('do_u_ca_b_ga_1');
    }

    logger.info('Generate Addresses Response: ', generateAddrRsp.toHash());

    let addresses = generateAddrRsp.data['addressKindToValueMap'];

    return responseHelper.successWithData({ addresses: addresses });
  }

  /**
   * Generate Error response
   *
   * @param code {String} - Error internal identifier
   *
   * @returns {Promise<void>}
   * @private
   */
  async _getRespError(code) {
    const oThis = this;

    return responseHelper.error({
      internal_error_identifier: code,
      api_error_identifier: 'something_went_wrong',
      debug_options: {}
    });
  }
}

module.exports = Base;
