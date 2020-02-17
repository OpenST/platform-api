'use strict';

const rootPrefix = '../../..',
  ModelBase = require(rootPrefix + '/app/models/mysql/Base'),
  userRedemptionConstants = require(rootPrefix + '/lib/globalConstant/userRedemption'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  responseHelper = require(rootPrefix + '/lib/formatter/response');

const dbName = 'saas_big_' + coreConstants.subEnvironment + '_' + coreConstants.environment;

class UserRedemptionModel extends ModelBase {
  constructor() {
    super({ dbName: dbName });
    const oThis = this;

    oThis.tableName = 'user_redemptions';
  }

  /**
   * Format db data
   * @param dbRow
   */
  formatDbData(dbRow) {
    const oThis = this;

    const formattedRow = {
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

    return formattedRow;
  }

  /**
   * Fetch redemption uuids
   *
   * @param params
   * @param params.userId
   * @param params.page
   * @param params.status
   * @param params.limit
   *
   * @returns {Promise<void>}
   */
  async fetchUuidsByUserId(params) {
    const oThis = this;

    const limit = params.limit,
      offset = (params.page - 1) * limit;

    const query = oThis
      .select('id, uuid')
      .where({
        user_id: oThis.userId
      })
      .limit(limit)
      .offset(offset);

    if (params.status) {
      query.where({
        status: params.status
      });
    }

    const Rows = await query.fire();

    const redemptionUuids = [];

    for (let ind = 0; ind < Rows.length; ind++) {
      const formattedRow = oThis.formatDbData(Rows[ind]);
      redemptionUuids.push(formattedRow.uuid);
    }

    return responseHelper.successWithData({ uuids: redemptionUuids });
  }

  /**
   * Fetch redemptions
   *
   * @param params
   * @param params.uuids
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
      let formattedRow = oThis.formatDbData(Rows[ind]);
      redemptions[formattedRow.uuid] = formattedRow;
    }

    return responseHelper.successWithData(redemptions);
  }
}

module.exports = UserRedemptionModel;
