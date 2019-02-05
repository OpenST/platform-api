'use strict';
/**
 * This is model for workflow_setup table.
 *
 * @module app/models/mysql/WorkflowStep
 */
const rootPrefix = '../../..',
  util = require(rootPrefix + '/lib/util'),
  ModelBase = require(rootPrefix + '/app/models/mysql/Base'),
  coreConstants = require(rootPrefix + '/config/coreConstants');

// Declare variables.
const dbName = 'saas_' + coreConstants.subEnvironment + '_' + coreConstants.environment,
  properties = {
    //hasSTPrime, onHold, blocking
  },
  invertedProperties = util.invert(properties);

/**
 * Class for token address model
 *
 * @class
 */
class TokenExtxWorkerProcesses extends ModelBase {
  /**
   * Constructor for token address model
   *
   * @constructor
   */
  constructor() {
    super({ dbName: dbName });

    const oThis = this;

    oThis.tableName = 'token_extx_worker_processes';
  }

  get properties() {
    return properties;
  }

  get invertedProperties() {
    return invertedProperties;
  }
}

module.exports = TokenExtxWorkerProcesses;
