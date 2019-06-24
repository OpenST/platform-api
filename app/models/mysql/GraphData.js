/**
 * Model for graph data table.
 *
 * @module app/models/mysql/GraphData
 */

const rootPrefix = '../../..',
  ModelBase = require(rootPrefix + '/app/models/mysql/Base'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  graphConstants = require(rootPrefix + '/lib/globalConstant/graphConstants'),
  basicHelper = require(rootPrefix + '/helpers/basic'),
  responseHelper = require(rootPrefix + '/lib/formatter/response');

// Declare variables.
const dbName = 'kit_saas_' + coreConstants.subEnvironment + '_' + coreConstants.environment;

/**
 * Class for graph data model.
 *
 * @class GraphData
 */
class GraphData extends ModelBase {
  /**
   * Constructor for graph data model.
   *
   * @augments ModelBase
   *
   * @constructor
   */
  constructor() {
    super({ dbName: dbName });

    const oThis = this;

    oThis.tableName = 'graph_data';
  }

  /**
   * Format Db data.
   *
   * @param {object} dbRow
   * @param {Number} dbRow.id
   * @param {Number} dbRow.token_id
   * @param {Number} dbRow.graph_type
   * @param {Number} dbRow.duration_type
   * @param {String} dbRow.data
   *
   * @return {object}
   * @private
   */
  static _formatDbData(dbRow) {
    return {
      id: dbRow.id,
      tokenId: dbRow.token_id,
      graphType: graphConstants.graphTypes[dbRow.graph_type],
      durationType: graphConstants.durationTypes[dbRow.duration_type],
      data: JSON.parse(dbRow.data)
    };
  }
}

module.exports = GraphData;
