'use strict';
/**
 * This service helps in adding Token User in our System
 *
 * Note:- if token id is provided in parameter,
 */

const uuidV4 = require('uuid/v4'),
  OSTBase = require('@ostdotcom/base'),
  InstanceComposer = OSTBase.InstanceComposer;

const rootPrefix = '../../..',
  basicHelper = require(rootPrefix + '/helpers/basic'),
  ServiceBase = require(rootPrefix + '/app/services/Base'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  localCipher = require(rootPrefix + '/lib/encryptors/localCipher'),
  shardConstants = require(rootPrefix + '/lib/globalConstant/shard'),
  resultType = require(rootPrefix + '/lib/globalConstant/resultType'),
  tokenUserConstants = require(rootPrefix + '/lib/globalConstant/tokenUser'),
  ConfigStrategyObject = require(rootPrefix + '/helpers/configStrategy/Object'),
  AddressesEncryptor = require(rootPrefix + '/lib/encryptors/AddressesEncryptor');

require(rootPrefix + '/app/models/ddb/sharded/User');
require(rootPrefix + '/lib/cacheManagement/shared/AvailableShard');
require(rootPrefix + '/lib/cacheManagement/chain/TokenShardNumber');
require(rootPrefix + '/lib/cacheManagement/chain/UserSaltEncryptorKey');

class Create extends ServiceBase {
  /**
   * @param {Object} params
   * @param {Number} params.client_id: client Id
   * @param {String} params.kind: Kind (Company/User)
   * @param {Number} [params.token_id]: token Id
   *
   * @constructor
   */
  constructor(params) {
    super(params);

    const oThis = this;

    oThis.clientId = params.client_id;
    oThis.tokenId = params.token_id;
    oThis.kind = params.kind;

    oThis.shardNumbersMap = {};
    oThis.userSaltEncrypted = null;
    oThis.configStrategyObj = null;
    oThis.userShardNumber = null;
  }

  /**
   * perform - perform user creation
   *
   * @return {Promise<void>}
   */
  async _asyncPerform() {
    const oThis = this;

    await oThis._validateTokenStatus();

    oThis.userId = uuidV4();

    await oThis._fetchTokenUserShard();

    await oThis._allocateShards();

    await oThis._generateUserSalt();

    return oThis.createUser();
  }

  /**
   * Fetch shard to create user entry.
   *
   * @returns {Promise<Void>}
   * @private
   */
  async _fetchTokenUserShard() {
    const oThis = this,
      TokenShardNumbers = oThis.ic().getShadowedClassFor(coreConstants.icNameSpace, 'TokenShardNumbersCache'),
      tokenShardNumbers = new TokenShardNumbers({ tokenId: oThis.tokenId });

    let shardNumbers = await tokenShardNumbers.fetch();

    if (!shardNumbers || !shardNumbers.data[shardConstants.userEntityKind]) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 's_u_c_1',
          api_error_identifier: 'token_not_setup',
          debug_options: {}
        })
      );
    }

    oThis.userShardNumber = shardNumbers.data[shardConstants.userEntityKind];
  }

  /**
   * Allocate shards
   *
   * @private
   */
  async _allocateShards() {
    const oThis = this;

    let AvailableShardCache = oThis.ic().getShadowedClassFor(coreConstants.icNameSpace, 'AvailableShardsCache'),
      availableShardCache = new AvailableShardCache();

    let response = await availableShardCache.fetch(),
      allAvailableShards = response.data,
      availableShardsForChain = allAvailableShards[oThis._configStrategyObject.auxChainId];

    let r1 = basicHelper.getRandomNumber(0, availableShardsForChain[shardConstants.deviceEntityKind].length - 1),
      r2 = basicHelper.getRandomNumber(0, availableShardsForChain[shardConstants.sessionEntityKind].length - 1),
      r3 = basicHelper.getRandomNumber(
        0,
        availableShardsForChain[shardConstants.recoveryOwnerAddressEntityKind].length - 1
      );

    oThis.shardNumbersMap[shardConstants.deviceEntityKind] =
      availableShardsForChain[shardConstants.deviceEntityKind][r1];
    oThis.shardNumbersMap[shardConstants.sessionEntityKind] =
      availableShardsForChain[shardConstants.sessionEntityKind][r2];
    oThis.shardNumbersMap[shardConstants.recoveryOwnerAddressEntityKind] =
      availableShardsForChain[shardConstants.recoveryOwnerAddressEntityKind][r3];
  }

  /**
   * Generate salt for user
   *
   * @returns {Promise<void>}
   *
   * @private
   */
  async _generateUserSalt() {
    const oThis = this;

    let UserSaltEncryptorKeyCache = oThis
        .ic()
        .getShadowedClassFor(coreConstants.icNameSpace, 'UserSaltEncryptorKeyCache'),
      encryptionSaltResp = await new UserSaltEncryptorKeyCache({ tokenId: oThis.tokenId }).fetchDecryptedData();

    let encryptionSalt = encryptionSaltResp.data.encryption_salt_d,
      userSalt = localCipher.generateRandomSalt();

    oThis.userSaltEncrypted = await new AddressesEncryptor({ encryptionSaltD: encryptionSalt }).encrypt(userSalt);
  }

  /**
   * createUser - Creates new user
   *
   * @return {Promise<string>}
   */
  async createUser() {
    const oThis = this;

    let timeInSecs = Math.floor(Date.now() / 1000);

    let params = {
      tokenId: oThis.tokenId,
      userId: oThis.userId,
      kind: oThis.kind,
      salt: oThis.userSaltEncrypted,
      deviceShardNumber: oThis.shardNumbersMap[shardConstants.deviceEntityKind],
      sessionShardNumber: oThis.shardNumbersMap[shardConstants.sessionEntityKind],
      recoveryOwnerShardNumber: oThis.shardNumbersMap[shardConstants.recoveryOwnerAddressEntityKind],
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
      user = new User({ shardNumber: oThis.userShardNumber });

    let insertRsp = await user.insertUser(params);

    if (insertRsp.isFailure()) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 's_u_c_2',
          api_error_identifier: 'error_in_user_creation'
        })
      );
    }

    // NOTE: As base library change the params values, reverse sanitize the data
    return responseHelper.successWithData({ [resultType.user]: user._sanitizeRowFromDynamo(params) });
  }

  /**
   * Object of config strategy class
   *
   * @return {Object}
   */
  get _configStrategyObject() {
    const oThis = this;

    if (oThis.configStrategyObj) return oThis.configStrategyObj;

    oThis.configStrategyObj = new ConfigStrategyObject(oThis.ic().configStrategy);

    return oThis.configStrategyObj;
  }
}

InstanceComposer.registerAsShadowableClass(Create, coreConstants.icNameSpace, 'CreateUser');

module.exports = {};
