const rootPrefix = '../../..',
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  stakerWhitelistedAddressConstants = require(rootPrefix + '/lib/globalConstant/stakerWhitelistedAddress'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  ModelBase = require(rootPrefix + '/app/models/mysql/Base');

const dbName = 'kit_saas_' + coreConstants.subEnvironment + '_' + coreConstants.environment;

class StakerWhitelistedAddress extends ModelBase {
  constructor() {
    super({ dbName: dbName });

    const oThis = this;

    oThis.tableName = 'staker_whitelisted_addresses';
  }

  /**
   * Fetch address
   *
   * @param {Object} params - external passed parameters
   * @param {Number/String} params.tokenId - tokenId
   *
   * @return {Promise}
   */
  async fetchAddress(params) {
    const oThis = this;

    const existingRows = await oThis
      .select('*')
      .where(oThis._activeTokenAddressesWhereClause(params))
      .fire();

    if (existingRows.length === 0) {
      return responseHelper.successWithData({});
    } else if (existingRows.length > 1) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'm_m_swa_1',
          api_error_identifier: 'something_went_wrong',
          debug_options: {}
        })
      );
    }

    return responseHelper.successWithData({
      stakerAddress: existingRows[0].staker_address,
      gatewayComposerAddress: existingRows[0].gateway_composer_address
    });
  }

  /**
   * Check if active address already exists. if yes then inactivates all of them before inserting fresh record
   *
   * @param {object} params - external passed parameters
   * @param {Integer} params.tokenId - tokenId
   * @param {Integer} params.clientId - clientId
   * @param {Integer} params.status
   * @param {string} params.stakerAddress - staker address
   * @param {string} params.gatewayComposerAddress - gateway composer address
   *
   * @return {Promise}
   */
  async insertAddress(params) {
    const oThis = this;

    await oThis._inactivateExistingEntries(params);

    const insertRsp = await new StakerWhitelistedAddress()
      .insert({
        token_id: params.tokenId,
        status: params.status,
        staker_address: params.stakerAddress.toLowerCase(),
        gateway_composer_address: params.gatewayComposerAddress.toLowerCase()
      })
      .fire();

    await StakerWhitelistedAddress.flushCache(params);

    return responseHelper.successWithData(insertRsp);
  }

  /**
   * Check if active entries exist, yes then inactivate them
   *
   * @private
   */
  async _inactivateExistingEntries(params) {
    const oThis = this;

    const existingRows = await new StakerWhitelistedAddress()
      .select('id')
      .where(oThis._activeEntriesWhereClause(params))
      .fire();

    if (existingRows.length === 0) {
      return responseHelper.successWithData({});
    }

    const idsToInactivate = [];

    for (let index = 0; index < existingRows.length; index++) {
      idsToInactivate.push(existingRows[index].id);
    }

    return oThis
      .update({
        status: stakerWhitelistedAddressConstants.invertedStatuses[stakerWhitelistedAddressConstants.inActiveStatus]
      })
      .where(['id IN (?)', idsToInactivate])
      .fire();
  }

  /**
   *
   * @param params
   * @return {array}
   * @private
   */
  _activeEntriesWhereClause(params) {
    return [
      'token_id = ? AND staker_address = ? AND status = ?',
      params.tokenId,
      params.stakerAddress,
      stakerWhitelistedAddressConstants.invertedStatuses[stakerWhitelistedAddressConstants.activeStatus]
    ];
  }

  /**
   * Returns where clause for all active token addresses.
   *
   * @param {Object} params
   * @param {String/Number} params.tokenId
   *
   * @return {*[]}
   *
   * @private
   */
  _activeTokenAddressesWhereClause(params) {
    return [
      'token_id = ? AND status = ?',
      params.tokenId,
      stakerWhitelistedAddressConstants.invertedStatuses[stakerWhitelistedAddressConstants.activeStatus]
    ];
  }

  /**
   *
   * Flush cache
   *
   * @param {Object} params - external passed parameters
   * @param {Number/String} params.tokenId - tokenId
   *
   * @returns {Promise<*>}
   */
  static async flushCache(params) {
    const StakerWhitelistedAddressCache = require(rootPrefix + '/lib/cacheManagement/kitSaas/StakerWhitelistedAddress');

    return new StakerWhitelistedAddressCache({
      tokenId: params.tokenId
    }).clear();
  }
}

module.exports = StakerWhitelistedAddress;
