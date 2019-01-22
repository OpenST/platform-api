'use strict';

const OSTBase = require('@openstfoundation/openst-base'),
  InstanceComposer = OSTBase.InstanceComposer;

const rootPrefix = '../../..',
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  stakerWhitelistedAddressConstants = require(rootPrefix + '/lib/globalConstant/StakerWhitelistedAddress'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  Token = require(rootPrefix + '/app/models/mysql/Token'),
  ConfigStrategyHelper = require(rootPrefix + '/helpers/configStrategy/ByClientId'),
  ModelBase = require(rootPrefix + '/app/models/mysql/Base');

const dbName = 'kit_saas_' + coreConstants.subEnvironment + '_' + coreConstants.environment;

class StakerWhitelistedAddress extends ModelBase {
  constructor() {
    super({ dbName: dbName });
    const oThis = this;
    oThis.tableName = 'staker_whitelisted_addresses';
  }

  /**
   * fetch address
   *
   * @param {object} params - external passed parameters
   * @param {Integer} params.tokenId - tokenId
   * @param {string} params.stakerAddress - staker address
   *
   * @return {Promise}
   */
  async fetchAddress(params) {
    const oThis = this;

    let existingRows = await oThis
      .select('*')
      .where(oThis._activeEntriesWhereClause(params))
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
    } else {
      return responseHelper.successWithData({
        gatewayComposerAddress: existingRows[0].gateway_composer_address
      });
    }
  }

  /**
   * check if active address already exists. if yes then inactivates all of them before inserting fresh record
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

    let insertRsp = await new StakerWhitelistedAddress()
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

  /***
   *
   * check if active entries exist, yes then inactivate them
   *
   * @private
   */
  async _inactivateExistingEntries(params) {
    const oThis = this;

    let existingRows = await new StakerWhitelistedAddress()
      .select('id')
      .where(oThis._activeEntriesWhereClause(params))
      .fire();

    if (existingRows.length === 0) {
      return responseHelper.successWithData({});
    }

    let idsToInactivate = [];

    for (let i = 0; i < existingRows.length; i++) {
      idsToInactivate.push(existingRows[i].id);
    }

    return await oThis
      .update({
        status: stakerWhitelistedAddressConstants.invertedStatuses[stakerWhitelistedAddressConstants.inActiveStatus]
      })
      .where(['id IN (?)', idsToInactivate])
      .fire();
  }

  /***
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

  /***
   *
   * flush cache
   *
   * @param {object} params - external passed parameters
   * @param {Integer} params.tokenId - tokenId
   * @param {Integer} params.clientId - clientId
   * @param {string} params.stakerAddress - staker address
   *
   * @returns {Promise<*>}
   */

  static async flushCache(params) {
    let configStrategyHelper = new ConfigStrategyHelper(params.clientId),
      configStrategyRsp = await configStrategyHelper.get();

    let ic = new InstanceComposer(configStrategyRsp.data);

    require(rootPrefix + '/lib/cacheManagement/StakerWhitelistedAddress');

    const StakerWhitelistedAddressCache = ic.getShadowedClassFor(
      coreConstants.icNameSpace,
      'StakerWhitelistedAddressCache'
    );

    return new StakerWhitelistedAddressCache({
      tokenId: params.tokenId,
      address: params.stakerAddress
    }).clear();
  }
}

module.exports = StakerWhitelistedAddress;
