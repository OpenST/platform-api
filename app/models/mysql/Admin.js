const rootPrefix = '../../..',
  ModelBase = require(rootPrefix + '/app/models/mysql/Base'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  adminConstants = require(rootPrefix + '/lib/globalConstant/admin');

const dbName = 'kit_saas_' + coreConstants.environment;

/**
 * Class for admin model.
 *
 * @class AdminModel
 */
class AdminModel extends ModelBase {
  /**
   * Constructor for admin model.
   *
   * @augments ModelBase
   *
   * @constructor
   */
  constructor() {
    super({ dbName: dbName });

    const oThis = this;

    oThis.tableName = 'admins';
  }

  /**
   * Format db data.
   *
   * @param {object} dbRow
   * @param {string} dbRow.id
   * @param {string} dbRow.name
   * @param {string} dbRow.email
   * @param {string} dbRow.slack_id
   * @param {number} dbRow.status
   * @param {number} dbRow.created_at
   * @param {number} dbRow.updated_at
   *
   * @returns {object}
   */
  formatDbData(dbRow) {
    const oThis = this;

    return {
      id: dbRow.id,
      name: dbRow.name,
      email: dbRow.email,
      slackId: dbRow.slack_id,
      status: adminConstants.statuses[dbRow.status],
      createdAt: dbRow.created_at,
      updatedAt: dbRow.updated_at
    };
  }

  /**
   * Fetch secure user by id.
   *
   * @param {string/number} id
   *
   * @returns {Promise<object>}
   */
  async fetchById(id) {
    const oThis = this;

    const dbRows = await oThis
      .select('*')
      .where({ id: id })
      .fire();

    if (dbRows.length === 0) {
      return responseHelper.successWithData({});
    }

    return responseHelper.successWithData(oThis.formatDbData(dbRows[0]));
  }

  /**
   * Fetch secure user by ids.
   *
   * @param {string} slackId
   *
   * @returns {Promise<object>}
   */
  async fetchBySlackId(slackId) {
    const oThis = this;

    const dbRows = await oThis
      .select('id')
      .where({
        slack_id: slackId,
        status: adminConstants.invertedStatuses[adminConstants.activeStatus]
      })
      .fire();

    if (dbRows.length === 0) {
      return responseHelper.successWithData({});
    }

    return responseHelper.successWithData(oThis.formatDbData(dbRows[0]));
  }

  /**
   * Flush cache.
   *
   * @param {object} params
   * @param {number} [params.id]
   * @param {number} [params.slackId]
   *
   * @returns {Promise<void>}
   */
  static async flushCache(params) {
    const promisesArray = [];

    if (params.id) {
      const AdminByIdCache = require(rootPrefix + '/lib/cacheManagement/kitSaas/Admin');
      promisesArray.push(new AdminByIdCache({ id: params.id }).clear());
    }
    //
    if (params.slackId) {
      const AdminBySlackIdCache = require(rootPrefix + '/lib/cacheManagement/kitSaas/AdminBySlackId');
      promisesArray.push(new AdminBySlackIdCache({ slackId: params.slackId }).clear());
    }

    await Promise.all(promisesArray);
  }
}

module.exports = AdminModel;
