/**
 * Model for stake currencies table.
 *
 * @module app/models/mysql/StakeCurrencies
 */

const rootPrefix = '../../..',
  ModelBase = require(rootPrefix + '/app/models/mysql/Base'),
  coreConstants = require(rootPrefix + '/config/coreConstants');

// Declare variables.
const dbName = 'kit_saas_' + coreConstants.subEnvironment + '_' + coreConstants.environment;

/**
 * Class for stake currencies model.
 *
 * @class StakeCurrencies
 */
class StakeCurrencies extends ModelBase {
  /**
   * Constructor for stake currencies model.
   *
   * @augments ModelBase
   *
   * @constructor
   */
  constructor() {
    super({ dbName: dbName });

    const oThis = this;

    oThis.tableName = 'stake_currencies';
  }
}

module.exports = StakeCurrencies;
