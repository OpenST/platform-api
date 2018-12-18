'use strict';
/**
 * Config formatter
 *
 * @module lib/formatter/config
 */
const rootPrefix = '../..',
  OSTBase = require("@openstfoundation/openst-base"),
  InstanceComposer = OSTBase.InstanceComposer,
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  cacheManagementConstants = require(rootPrefix + '/lib/globalConstant/cacheManagement');

/**
 * Class for config formatter
 *
 * @class
 */
class ConfigFormatter {
  /**
   * Constructor for config formatter
   *
   * @param {Object} configStrategy
   * @param {Object} instanceComposer
   * @constructor
   */
  constructor(configStrategy, instanceComposer) {
    const oThis = this;

    oThis.configStrategy = configStrategy;
  }

  /**
   * Get config for a particular chain id
   *
   * @param {Number} chainId: chain Id to find config for
   * @returns {Object}: config for a particular chain id
   */
  configFor(chainId) {
    const oThis = this;

    return [chainId];
  }

  /**
   * Return Formatted cache config
   *
   * @param configKind
   *
   * @returns {Object}
   */
  formatCacheConfig(configKind) {
    return {"cache": oThis.configStrategy[configKind]};
  }

  /**
   * Return formatted storage config kind
   *
   * @param configKind
   *
   * @returns {{storage: *}}
   */
  formatStorageConfig(configKind) {
    return {"storage": oThis.configStrategy[configKind]}
  }
  /**
   * return extra column config for a given table name
   *
   * @param {Object} tableIdentifier
   *
   * @returns {Object}
   */
  getExtraColumnConfigFor(tableIdentifier) {
    const oThis = this,
      configStrategy = oThis.ic().configStrategy,
      extraStorageColumns = configStrategy['extraStorageColumns'] || {};
    return extraStorageColumns[tableIdentifier] || {};
  }
}

InstanceComposer.registerAsObject(ConfigFormatter, coreConstants.icNameSpace, 'configFormatter', true);

module.exports = ConfigFormatter;
