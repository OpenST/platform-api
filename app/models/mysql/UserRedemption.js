const rootPrefix = '../../..',
  ModelBase = require(rootPrefix + '/app/models/mysql/Base'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  userRedemptionConstants = require(rootPrefix + '/lib/globalConstant/userRedemption');

// Declare variables.
const dbName = 'kit_saas_redemption_' + coreConstants.subEnvironment + '_' + coreConstants.environment;

/**
 * Class for user redemption model.
 *
 * @class UserRedemptionModel
 */
class UserRedemptionModel extends ModelBase {
  /**
   * Constructor for user redemption model.
   *
   * @augments ModelBase
   *
   * @constructor
   */
  constructor() {
    super({ dbName: dbName });

    const oThis = this;

    oThis.tableName = 'user_redemptions';
  }

  /**
   * Format Db data.
   *
   * @param {object} dbRow
   * @param {number} dbRow.id
   * @param {string} dbRow.uuid
   * @param {string} dbRow.user_uuid
   * @param {number} dbRow.token_redemption_product_id
   * @param {string} dbRow.transaction_uuid
   * @param {string} dbRow.amount
   * @param {string} dbRow.currency
   * @param {number} dbRow.status
   * @param {string} dbRow.email_address
   *
   * @returns {{}}
   */
  formatDbData(dbRow) {
    return {
      id: dbRow.id,
      uuid: dbRow.uuid,
      userUuid: dbRow.user_uuid,
      tokenRedemptionProductId: dbRow.token_redemption_product_id,
      transactionUuid: dbRow.transaction_uuid,
      amount: dbRow.amount,
      currency: dbRow.currency,
      status: userRedemptionConstants.statuses[dbRow.status],
      emailAddress: dbRow.email_address
    };
  }

  /**
   * Fetch redemption uuids.
   *
   * @param {object} params
   * @param {number} params.userId
   * @param {number} params.page
   * @param {number} params.limit
   *
   * @returns {Promise<result>}
   */
  async fetchUuidsByUserId(params) {
    const oThis = this;

    const limit = params.limit,
      offset = (params.page - 1) * limit;

    const dbRows = await oThis
      .select('uuid')
      .where({
        user_uuid: params.userId
      })
      .limit(limit)
      .offset(offset)
      .fire();

    const redemptionUuids = [];

    for (let ind = 0; ind < dbRows.length; ind++) {
      redemptionUuids.push(dbRows[ind].uuid);
    }

    return responseHelper.successWithData({ uuids: redemptionUuids });
  }

  /**
   * Fetch redemptions.
   *
   * @param {array<string>} uuids
   *
   * @returns {Promise<void>}
   */
  async fetchByUuids(uuids) {
    const oThis = this;

    const Rows = await oThis
      .select('*')
      .where({
        uuid: uuids
      })
      .fire();

    const redemptions = {};

    for (let ind = 0; ind < Rows.length; ind++) {
      const formattedRow = oThis.formatDbData(Rows[ind]);
      redemptions[formattedRow.uuid] = formattedRow;
    }

    return responseHelper.successWithData(redemptions);
  }

  /**
   * Insert redemption request of user
   *
   * @param params
   * @returns {Promise<*|result>}
   */
  async insertRedemptionRequest(params) {
    const oThis = this;

    const insertRsp = await oThis
      .insert({
        uuid: params.uuid,
        user_uuid: params.userId,
        token_redemption_product_id: params.redemptionProductId,
        transaction_uuid: params.transactionUuid,
        amount: params.amount,
        currency: params.currency,
        status: userRedemptionConstants.invertedStatuses[params.status],
        email_address: params.emailAddressEncrypted
      })
      .fire();

    return responseHelper.successWithData(insertRsp);
  }
}

module.exports = UserRedemptionModel;
