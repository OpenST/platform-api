'use strict';
/**
 * This is model for Token table.
 *
 * @module app/models/mysql/Token
 */
const rootPrefix = '../..',
  util = require(rootPrefix + '/lib/util'),
  ModelBase = require(rootPrefix + '/app/models/mysql/Base'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  tokenConstants = require(rootPrefix + '/lib/globalConstant/token');

// Declare variables.
const dbName = 'kit_saas_' + coreConstants.subEnvironment + '_' + coreConstants.environment,
  statuses = {
    '1': tokenConstants.notDeployed,
    '2': tokenConstants.deploymentStarted,
    '3': tokenConstants.deploymentCompleted,
    '4': tokenConstants.deploymentFailed
  },
  invertedStatuses = util.invert(statuses);

/**
 * Class for token model
 *
 * @class
 */
class Token extends ModelBase {
  /**
   * Constructor for token model
   *
   * @constructor
   */
  constructor() {
    super({ dbName: dbName });

    const oThis = this;

    oThis.tableName = 'chain_addresses';
  }
}

module.exports = Token;
