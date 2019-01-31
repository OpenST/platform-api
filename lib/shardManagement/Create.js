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
  shardConstant = require(rootPrefix + '/lib/globalConstant/shard'),
  ConfigStrategyHelper = require(rootPrefix + '/helpers/configStrategy/ByChainId');

const InstanceComposer = OSTBase.InstanceComposer;

// Following require(s) for registering into instance composer
require(rootPrefix + '/app/models/ddb/shared/Shard');

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

    let configStrategyHelper = new ConfigStrategyHelper(0, 0),
      configRsp = await configStrategyHelper.getComplete(),
      ic = new InstanceComposer(configRsp.data),
      ShardModel = ic.getShadowedClassFor(coreConstants.icNameSpace, 'ShardModel'),
      shardModelObj = new ShardModel({ consistentRead: 0 });

    await shardModelObj.createTable();

    logger.info('Shards table created');

    await shardModelObj.insertShard({
      entityKind: oThis.entityKind,
      shardNumber: oThis.shardNumber,
      isAvailableForAllocation: oThis.isAvailableForAllocation
    });

    logger.info('Entry created in shards table');
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
      CommonValidator.validateBoolean(oThis.isAvailableForAllocation) &&
      CommonValidator.validateInteger(oThis.shardNumber)
    ) {
      logger.info('Validations done');
    } else {
      throw 'Validations failed';
    }
  }
}

InstanceComposer.registerAsShadowableClass(CreateShard, coreConstants.icNameSpace, 'CreateShard');

module.exports = CreateShard;
