'use strict';

/*
 * This service helps in adding Token User in our System
 *
 * Note:- if token id is provided in parameter,
 */

const rootPrefix = '../../..',
  ServiceBase = require(rootPrefix + '/app/services/Base'),
  OSTBase = require('@openstfoundation/openst-base'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  shardConst = require(rootPrefix + '/lib/globalConstant/shard'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  shardConstant = require(rootPrefix + '/lib/globalConstant/shard'),
  basicHelper = require(rootPrefix + '/helpers/basic'),
  resultType = require(rootPrefix + '/lib/globalConstant/resultType'),
  tokenUserConstants = require(rootPrefix + '/lib/globalConstant/tokenUser');

const uuidV4 = require('uuid/v4'),
  InstanceComposer = OSTBase.InstanceComposer;

require(rootPrefix + '/lib/cacheManagement/shared/AvailableShard');
require(rootPrefix + '/lib/cacheManagement/chain/TokenShardNumber');
require(rootPrefix + '/app/models/ddb/sharded/User');

class Create extends ServiceBase {
  /**
   * @constructor
   *
   * @param params
   * @param {Number} params.client_id - client Id
   * @param {Number} [params.token_id] - token Id
   * @param {String} params.kind - Kind (Company/User)
   */
  constructor(params) {
    super(params);

    const oThis = this;

    oThis.clientId = params.client_id;
    oThis.tokenId = params.token_id;
    oThis.kind = params.kind || tokenUserConstants.userKind;

    oThis.shardNumbersMap = {};
  }

  /**
   * perform - perform user creation
   *
   * @return {Promise<void>}
   */
  async _asyncPerform() {
    const oThis = this;

    if (!oThis.tokenId) {
      await oThis._fetchTokenDetails();
    }

    oThis.userId = uuidV4();

    await oThis._allocateShards();

    return oThis.createUser();
  }

  /**
   * _allocateShards - allocate shards
   *
   * @private
   */
  async _allocateShards() {
    const oThis = this;

    let AvailableShardCache = oThis.ic().getShadowedClassFor(coreConstants.icNameSpace, 'AvailableShardsCache'),
      availableShardCache = new AvailableShardCache();

    let response = await availableShardCache.fetch(),
      availableShards = response.data;

    let r1 = basicHelper.getRandomNumber(0, availableShards[shardConstant.deviceEntityKind].length - 1),
      r2 = basicHelper.getRandomNumber(0, availableShards[shardConstant.sessionEntityKind].length - 1);
    // let r3 = basicHelper.getRandomNumber(0, availableShards[shardConstant.recoveryAddressEntityKind].length - 1);

    oThis.shardNumbersMap[shardConstant.deviceEntityKind] = availableShards[shardConstant.deviceEntityKind][r1];
    oThis.shardNumbersMap[shardConstant.sessionEntityKind] = availableShards[shardConstant.sessionEntityKind][r2];
    // oThis.shardNumbersMap[shardConstant.recoveryAddressEntityKind] = availableShards[shardConstant.recoveryAddressEntityKind][r3];
  }

  /**
   * createUser - Creates new user
   *
   * @return {Promise<string>}
   */
  async createUser() {
    const oThis = this,
      TokenShardNumbers = oThis.ic().getShadowedClassFor(coreConstants.icNameSpace, 'TokenShardNumbersCache'),
      tokenShardNumbers = new TokenShardNumbers({ tokenId: oThis.tokenId });

    let shardNumbers = await tokenShardNumbers.fetch();

    let timeInSecs = Math.floor(Date.now() / 1000);

    let params = {
      tokenId: oThis.tokenId,
      userId: oThis.userId,
      kind: oThis.kind,
      deviceShardNumber: oThis.shardNumbersMap[shardConst.deviceEntityKind],
      sessionShardNumber: oThis.shardNumbersMap[shardConst.sessionEntityKind],
      // recoveryAddressShardNumber: oThis.shardNumbersMap[shardConst.recoveryAddressEntityKind],
      status: tokenUserConstants.createdStatus,
      updatedTimestamp: timeInSecs
    };

    if (oThis.tokenHolderAddress) {
      params['tokenHolderAddress'] = oThis.tokenHolderAddress;
    }

    if (oThis.multisigAddress) {
      params['multisigAddress'] = oThis.multisigAddress;
    }

    let User = oThis.ic().getShadowedClassFor(coreConstants.icNameSpace, 'UserModel'),
      user = new User({ shardNumber: shardNumbers.data[shardConst.userEntityKind] });

    let insertRsp = user.insertUser(params);

    return responseHelper.successWithData({ [resultType.user]: params });
  }
}

InstanceComposer.registerAsShadowableClass(Create, coreConstants.icNameSpace, 'CreateUser');

module.exports = {};
