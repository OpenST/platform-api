'use strict';

/*
 * This service helps in adding Token User in our System
 */

const rootPrefix = '../../..',
  ServiceBase = require(rootPrefix + '/app/services/Base'),
  OSTBase = require('@openstfoundation/openst-base'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  shardConst = require(rootPrefix + '/lib/globalConstant/shard'),
  TokenCache = require(rootPrefix + '/lib/cacheManagement/kitSaas/Token'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  tokenUserConstants = require(rootPrefix + '/lib/globalConstant/tokenUser');

const uuidv4 = require('uuid/v4'),
  InstanceComposer = OSTBase.InstanceComposer;

require(rootPrefix + '/lib/cacheManagement/chain/TokenShardNumber');
require(rootPrefix + '/app/models/ddb/sharded/User');

class AddUser extends ServiceBase {
  /**
   * @constructor
   *
   * @param params
   * @param params.client_id              {Number} - client Id
   * @param params.kind              {String} - Kind (Company/User)
   */
  constructor(params) {
    super(params);

    const oThis = this;

    oThis.clientId = params.client_id;
    oThis.kind = params.kind || tokenUserConstants.userKind;
  }

  /**
   * perform - perform user creation
   *
   * @return {Promise<void>}
   */
  async _asyncPerform() {
    const oThis = this;

    await oThis._fetchTokenDetails();

    let response = await oThis.createUser();

    if (response.isSuccess()) {
      return Promise.resolve(responseHelper.successWithData({ id: oThis.userId }));
    } else {
      return Promise.resolve(response);
    }
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

    oThis.userId = uuidv4();

    let params = {
      tokenId: oThis.tokenId,
      userId: oThis.userId,
      kind: oThis.kind,
      deviceShardNumber: shardNumbers.data[shardConst.deviceEntityKind],
      sessionShardNumber: shardNumbers.data[shardConst.sessionEntityKind],
      recoveryAddressShardNumber: shardNumbers.data[shardConst.recoveryAddressEntityKind],
      status: tokenUserConstants.createdStatus,
      updateTimestamp: timeInSecs
    };

    if (oThis.tokenHolderAddress) {
      params['tokenHolderAddress'] = oThis.tokenHolderAddress;
    }

    if (oThis.multisigAddress) {
      params['multisigAddress'] = oThis.multisigAddress;
    }

    let User = oThis.ic().getShadowedClassFor(coreConstants.icNameSpace, 'UserModel'),
      user = new User({ shardNumber: shardNumbers.data[shardConst.userEntityKind] });

    return user.insertUser(params);
  }
}

InstanceComposer.registerAsShadowableClass(AddUser, coreConstants.icNameSpace, 'AddUser');

module.exports = {};
