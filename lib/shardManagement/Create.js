'use strict';

/**
 * This module creates shard table and creates an entry.
 *
 * @module lib/shardManagement/Create.js
 */

// 1. Input entityKind, shardNumber, isAvailableForAllocation
// 2. validate
// 3. create table
// 4. create in db

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
require(rootPrefix + '/app/models/ddb/sharded/User');
require(rootPrefix + '/app/models/ddb/sharded/Device');
require(rootPrefix + '/lib/sharedCacheManagement/AvailableShards');

/**
 * Class for Creating shard table and inserting entry.
 *
 * @class CreateShard
 */
class CreateShard {
  /**
   *
   * @param params
   * @param {String} params.entityKind {'user','device','recoveryAddress','session'}
   * @param {Array} params.shardNumbers
   * @param {Boolean} params.isAvailableForAllocation {true, false}
   */
  constructor(params) {
    const oThis = this;
    oThis.entityKind = params.entityKind;
    oThis.shardNumbers = params.shardNumbers;
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
      logger.error(' In catch block of lib/shardManagement/Create.js');

      return responseHelper.error({
        internal_error_identifier: 'l_sm_c_1',
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

    oThis.validate();

    await oThis.create();

    await oThis.flushCache();
  }

  /**
   * This method creates entity table and its entry in shard.
   *
   * @returns {Promise<*>}
   */
  async create() {
    const oThis = this,
      ShardModel = oThis.ic().getShadowedClassFor(coreConstants.icNameSpace, 'ShardModel'),
      shardModelObj = new ShardModel({});

    switch (oThis.entityKind) {
      case shardConstant.user:
        let UserModel = oThis.ic().getShadowedClassFor(coreConstants.icNameSpace, 'UserModel');

        for (let index = 0; index < oThis.shardNumbers.length; index++) {
          let userModelObj = new UserModel({ shardNumber: oThis.shardNumbers[index] });

          await userModelObj.createTable();

          logger.info('User table with shard number', oThis.shardNumbers[index], ' created');

          await shardModelObj.insertShard({
            entityKind: oThis.entityKind,
            shardNumber: oThis.shardNumbers[index],
            isAvailableForAllocation: oThis.isAvailableForAllocation
          });
          logger.info('Entry created in shards table');
        }

        break;

      case shardConstant.device:
        let Device = oThis.ic().getShadowedClassFor(coreConstants.icNameSpace, 'Device');

        for (let index = 0; index < oThis.shardNumbers.length; index++) {
          let deviceObj = new Device({ shardNumber: oThis.shardNumbers[index] });

          await deviceObj.createTable();
          logger.info('Device table with shard number', oThis.shardNumbers[index], ' created');

          await shardModelObj.insertShard({
            entityKind: oThis.entityKind,
            shardNumber: oThis.shardNumbers[index],
            isAvailableForAllocation: oThis.isAvailableForAllocation
          });
          logger.info('Entry created in shards table');
        }

        break;

      default:
        throw 'Unknown entity Kind';
    }
  }

  /**
   *
   * This method validates input parameters.
   */
  validate() {
    const oThis = this,
      entityKindsMap = shardConstant.invertedEntityKinds;

    if (
      entityKindsMap[oThis.entityKind] &&
      CommonValidator.validateBoolean(
        oThis.isAvailableForAllocation && CommonValidator.validateArray(oThis.shardNumbers)
      )
    ) {
      logger.info('Validations done.');
    } else {
      throw 'Validations failed';
    }
  }

  /**
   * This method clears available shards cache.
   *
   * @returns {Promise<*>}
   */
  async flushCache() {
    const oThis = this,
      AvailableShardsCache = oThis.ic().getShadowedClassFor(coreConstants.icNameSpace, 'AvailableShardsCache'),
      availableShardsCache = new AvailableShardsCache();

    await availableShardsCache.clear();
  }
}

InstanceComposer.registerAsShadowableClass(CreateShard, coreConstants.icNameSpace, 'CreateShard');

module.exports = CreateShard;
