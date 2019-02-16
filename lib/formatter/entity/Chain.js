/**
 * Formatter for chain entity to convert keys to snake case.
 *
 * @module lib/formatter/entity/Chain
 */
const rootPrefix = '../../..',
  responseHelper = require(rootPrefix + '/lib/formatter/response');

/**
 * Class for chain formatter.
 *
 * @class
 */
class ChainFormatter {
  /**
   * Constructor for chain formatter.
   *
   * @param {Object} params
   * @param {String/Number} params.id
   * @param {String} params.blockHeight
   * @param {String} params.updatedTimestamp
   *
   * @constructor
   */
  constructor(params) {
    const oThis = this;

    oThis.params = params;
  }

  /**
   * Perform
   *
   * @return {{}}
   */
  perform() {
    const oThis = this;

    let formattedChainData = {};

    if (
      !oThis.params.hasOwnProperty('id') ||
      !oThis.params.hasOwnProperty('blockHeight') ||
      !oThis.params.hasOwnProperty('updatedTimestamp')
    ) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'l_f_e_c_1',
          api_error_identifier: 'entity_formatting_failed',
          debug_options: { chainParams: oThis.params }
        })
      );
    }

    formattedChainData.id = Number(oThis.params.id);
    formattedChainData.block_height = Number(oThis.params.blockHeight);
    formattedChainData.updated_timestamp = Number(oThis.params.updatedTimestamp);

    return responseHelper.successWithData(formattedChainData);
  }
}

module.exports = ChainFormatter;
