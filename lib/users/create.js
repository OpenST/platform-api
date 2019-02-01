'use strict';

/*
 * This file helps in creating new user
 */

const rootPrefix = '../..',
  OSTBase = require('@openstfoundation/openst-base'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  shardConst = require(rootPrefix + '/lib/globalConstant/shard'),
  TokenCache = require(rootPrefix + '/lib/kitSaasSharedCacheManagement/Token'),
  userStatusConst = require(rootPrefix + '/lib/globalConstant/userStatus');

const uuidv4 = require('uuid/v4'),
  InstanceComposer = OSTBase.InstanceComposer;

require(rootPrefix + '/lib/cacheManagement/TokenShardNumbers');
require(rootPrefix + '/app/models/ddb/sharded/User');

class CreateUser {
  /**
   * @constructor
   *
   * @param params
   * @param params.clientId              {Number} - clientId
   * @param params.kind                  {String} - company/user
   * @param params.tokenHolderAddress    {String} - token holder address
   * @param params.multisigAddress       {String} - multisig address
   * @param params.shardNumber           {String} - shard number
   */
  constructor(params) {
    const oThis = this;

    oThis.clientId = params.clientId;
    oThis.kind = params.kind;
    oThis.tokenHolderAddress = params.tokenHolderAddress;
    oThis.multisigAddress = params.multisigAddress;
    oThis.shardNumber = params.shardNumber;
  }

  /**
   * perform - perform user creation
   *
   * @return {Promise<void>}
   */
  async perform() {
    const oThis = this;

    await oThis._fetchTokenDetails();

    return oThis.createUser();
  }

  /**
   * _fetchTokenDetails - fetch token details from cache
   *
   * @return {Promise<void>}
   * @private
   */
  async _fetchTokenDetails() {
    const oThis = this;

    let tokenCache = new TokenCache({
      clientId: oThis.clientId
    });

    let response = await tokenCache.fetch();

    oThis.tokenId = response.data.id;
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
      userId: uuidv4(),
      kind: oThis.kind,
      deviceShardNumber: shardNumbers.data[shardConst.deviceEntityKind],
      sessionShardNumber: shardNumbers.data[shardConst.sessionEntityKind],
      recoveryAddressShardNumber: shardNumbers.data[shardConst.recoveryAddressEntityKind],
      status: userStatusConst.invertedStatuses[userStatusConst.created],
      updateTimestamp: timeInSecs
    };

    if (oThis.tokenHolderAddress) {
      params['tokenHolderAddress'] = oThis.tokenHolderAddress;
    }

    if (oThis.multisigAddress) {
      params['multisigAddress'] = oThis.multisigAddress;
    }

    let User = oThis.ic().getShadowedClassFor(coreConstants.icNameSpace, 'UserModel'),
      user = new User({ shardNumber: oThis.shardNumber });

    return user.insertUser(params);
  }
}

InstanceComposer.registerAsShadowableClass(CreateUser, coreConstants.icNameSpace, 'CreateUser');

module.exports = CreateUser;
