'use strict';

const rootPrefix = '../..',
  basicHelper = require(rootPrefix + '/helpers/basic'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  apiVersions = require(rootPrefix + '/lib/globalConstant/apiVersions'),
  configStrategyConstants = require(rootPrefix + '/lib/globalConstant/configStrategy');

const errorConfig = basicHelper.fetchErrorConfig(apiVersions.general);

class ConfigStrategyValidator {
  /**
   * validate group id and chain id
   *
   * @param chainId {number} - chain id
   * @param groupId {number} - group id
   *
   * @returns {Promise<never>}
   */
  async validateGroupIdAndChainId(chainId, groupId) {
    const oThis = this;

    if (chainId == 0 && groupId !=0) {
      return oThis._customError('l_v_cs_1', 'if chain id is 0, group id should be 0.');
    }
  }

  /**
   * Validate chain id and kind combination
   *
   * @param kind {string} - kind
   * @param chainId {number} - chain id
   *
   * @returns {Promise<never>}
   */
  async validateChainIdKindCombination(kind, chainId) {
    const oThis = this;

    let chainIdNotNeeded = configStrategyConstants.kindsWithoutChainIdMap[kind];

    if (chainIdNotNeeded && chainId) {
      return oThis._customError('l_v_cs_2', 'chain id is not expected for kind: ' + kind);
    }

    if (!chainIdNotNeeded && !chainId) {
      return oThis._customError('l_v_cs_3', 'chain id is expected for kind: ' + kind);
    }
  }

  /**
   * Validate kind and return strategy kind int value
   *
   * @param kind {string} - kind string
   *
   * @returns {Promise<*>}
   */
  async getStrategyKindInt(kind) {
    const oThis = this;

    let strategyKindIntValue = configStrategyConstants.invertedKinds[kind];

    if (strategyKindIntValue === undefined) {
      return oThis._customError('l_v_cs_4', 'Improper Kind parameter');
    } else {
      return strategyKindIntValue;
    }
  }

  /**
   * Custom error
   *
   * @param errCode
   * @param errMsg
   * @returns {Promise<never>}
   * @private
   */
  _customError(errCode, errMsg) {
    logger.error(errMsg);
    return Promise.reject(
      responseHelper.error({
        internal_error_identifier: errCode,
        api_error_identifier: 'something_went_wrong',
        debug_options: {errMsg: errMsg},
        error_config: errorConfig
      })
    );
  }

}

module.exports = new ConfigStrategyValidator();