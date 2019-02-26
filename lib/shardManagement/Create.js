'use strict';

/**
 * This module creates shard table and creates an entry.
 *
 * @module lib/shardManagement/Create
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
require(rootPrefix + '/app/models/ddb/sharded/Session');
require(rootPrefix + '/app/models/ddb/sharded/RecoveryOwner');
require(rootPrefix + '/app/models/ddb/sharded/Balance');

/**
 * Class for Creating shard table and inserting entry.
 *
 * @class CreateShard
 */
class CreateShard {
  /**
   *
   * @param params
   * @param {Number} params.chainId: chainId
   * @param {String} params.entityKind {'user','device','recoveryAddress','session'}
   * @param {Array} params.shardNumbers
   * @param {Boolean} params.isAvailableForAllocation {true, false}
   */
  constructor(params) {
    const oThis = this;
    oThis.chainId = params.chainId;
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
      logger.error(` In catch block of ${__filename}`);

      return responseHelper.error({
        internal_error_identifier: 'l_sm_c_1',
        api_error_identifier: 'something_went_wrong',
        debug_options: err
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

    oThis._validate();

    await oThis._create();
  }

  /**
   * This method creates entity table and its entry in shard.
   *
   * @returns {Promise<*>}
   */
  async _create() {
    const oThis = this,
      ShardModel = oThis.ic().getShadowedClassFor(coreConstants.icNameSpace, 'ShardModel'),
      shardModelObj = new ShardModel({});

    let Model;

    switch (oThis.entityKind) {
      case shardConstant.userEntityKind:
        Model = oThis.ic().getShadowedClassFor(coreConstants.icNameSpace, 'UserModel');
        break;
      case shardConstant.deviceEntityKind:
        Model = oThis.ic().getShadowedClassFor(coreConstants.icNameSpace, 'DeviceModel');
        break;
      case shardConstant.sessionEntityKind:
        Model = oThis.ic().getShadowedClassFor(coreConstants.icNameSpace, 'SessionModel');
        break;
      case shardConstant.recoveryOwnerAddressEntityKind:
        Model = oThis.ic().getShadowedClassFor(coreConstants.icNameSpace, 'RecoveryOwner');
        break;
      case shardConstant.balanceEntityKind:
        Model = oThis.ic().getShadowedClassFor(coreConstants.icNameSpace, 'BalanceModel');
        break;
      default:
        throw `Unknown entity Kind ${oThis.entityKind}`;
    }

    for (let index = 0; index < oThis.shardNumbers.length; index++) {
      let modelObj = new Model({ chainId: oThis.chainId, shardNumber: oThis.shardNumbers[index] });

      let createTableRsp = await modelObj.createTable();
      if (createTableRsp.isFailure()) {
        return Promise.reject(createTableRsp);
      }

      logger.info(`${oThis.entityKind} table with shard number ${oThis.shardNumbers[index]} created`);

      let insertShardRsp = await shardModelObj.insertShard({
        entityKind: oThis.entityKind,
        shardNumber: ShardModel.generateShardNoStr(oThis.chainId, oThis.shardNumbers[index]),
        isAvailableForAllocation: oThis.isAvailableForAllocation
      });
      if (insertShardRsp.isFailure()) {
        return Promise.reject(insertShardRsp);
      }

      logger.info('Entry created in shards table');
    }
  }

  /**
   * This method validates input parameters.
   */
  _validate() {
    const oThis = this,
      entityKindsMap = shardConstant.invertedEntityKinds;

    if (
      entityKindsMap[oThis.entityKind] &&
      CommonValidator.validateBoolean(
        oThis.isAvailableForAllocation && CommonValidator.validateIntegerArray(oThis.shardNumbers)
      )
    ) {
      logger.info('Validations done.');
    } else {
      throw 'Validations failed';
    }
  }
}

InstanceComposer.registerAsShadowableClass(CreateShard, coreConstants.icNameSpace, 'CreateShard');
