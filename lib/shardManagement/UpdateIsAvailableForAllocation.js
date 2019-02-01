'use strict';

/**
 * This module updates isAvailableForAllocation in shards table.
 *
 * @module lib/shardManagement/UpdateIsAvailableForAllocation
 */
// 1. Input entityKind, shardNumber, isAvailableForAllocation
// 2. validate
// 3. update in db

const rootPrefix = '../..',
  OSTBase = require('@openstfoundation/openst-base'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  CommonValidator = require(rootPrefix + '/lib/validators/Common'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  shardConstant = require(rootPrefix + '/lib/globalConstant/shard');

const InstanceComposer = OSTBase.InstanceComposer;

// Following require(s) for registering into instance composer
require(rootPrefix + '/app/models/ddb/shared/Shard');
require(rootPrefix + '/lib/sharedCacheManagement/AvailableShards');

class UpdateIsAvailableForAllocation {
  /**
   *
   * @param params
   * @param {String} params.entityKind {'user','device','recoveryAddress','session'}
   * @param {Number} params.shardNumber
   * @param {Boolean} params.isAvailableForAllocation {true, false}
   */
  constructor(params) {
    const oThis = this;
    oThis.entityKind = params.entityKind;
    oThis.shardNumber = params.shardNumber;
    oThis.isAvailableForAllocation = params.isAvailableForAllocation;
  }

  /**
   * Perform
   *
   * @returns {Promise<*>}
   */
  perform() {
    const oThis = this;
    return oThis.asyncPerform().catch(function(err) {
      logger.error(' In catch block of lib/shardManagement/UpdateIsAvailableForAllocation.js');

      return responseHelper.error({
        internal_error_identifier: 'l_sm_uiafa_1',
        api_error_identifier: 'something_went_wrong',
        debug_options: err,
        error_config: {}
      });
    });
  }

  /**
   * Async perform
   *
   * @returns {Promise<*>}
   */
  async asyncPerform() {
    const oThis = this;

    await oThis._validate();

    await oThis._updateAllocation();

    await oThis._flushCache();
  }

  /**
   * This method validates input parameters.
   *
   * @private
   *
   */
  _validate() {
    const oThis = this,
      entityKindsMap = shardConstant.invertedEntityKinds;

    if (
      entityKindsMap[oThis.entityKind] &&
      CommonValidator.validateBoolean(oThis.isAvailableForAllocation) &&
      CommonValidator.validateInteger(oThis.shardNumber)
    ) {
      logger.info('Validations done');
    } else {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'l_sm_uiafa_2',
          api_error_identifier: 'something_went_wrong',
          debug_options: {
            entityKind: oThis.entityKind,
            isAvailableForAllocation: oThis.isAvailableForAllocation,
            shardNumber: oThis.shardNumber
          },
          error_config: {}
        })
      );
    }
  }

  /**
   * This method updates isAvailableForAllocation.
   *
   * @returns {Promise<*>}
   * @private
   */
  async _updateAllocation() {
    const oThis = this,
      ShardModel = oThis.ic().getShadowedClassFor(coreConstants.icNameSpace, 'ShardModel'),
      shardModelObj = new ShardModel({});

    await shardModelObj.updateAllocationStatus({
      entityKind: oThis.entityKind,
      shardNumber: oThis.shardNumber,
      isAvailableForAllocation: oThis.isAvailableForAllocation
    });

    logger.info('UpdateIsAvailableForAllocation Done.');
  }

  /**
   * This method clears available shards cache.
   *
   * @returns {Promise<*>}
   * @private
   */
  async _flushCache() {
    const oThis = this,
      AvailableShardsCache = oThis.ic().getShadowedClassFor(coreConstants.icNameSpace, 'AvailableShardsCache'),
      availableShardsCache = new AvailableShardsCache();

    await availableShardsCache.clear();
  }
}

InstanceComposer.registerAsShadowableClass(
  UpdateIsAvailableForAllocation,
  coreConstants.icNameSpace,
  'UpdateIsAvailableForAllocation'
);

module.exports = UpdateIsAvailableForAllocation;
