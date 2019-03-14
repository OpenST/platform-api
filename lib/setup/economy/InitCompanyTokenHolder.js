'use strict';
/**
 * This initializes company token holder and inserts token holder details into mysql and ddb tables.
 *
 * @module lib/setup/economy/InitCompanyTokenHolder
 */
const OSTBase = require('@ostdotcom/base'),
  InstanceComposer = OSTBase.InstanceComposer;

const rootPrefix = '../../..',
  basicHelper = require(rootPrefix + '/helpers/basic'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  GenerateSessionKnownAddress = require(rootPrefix + '/lib/generateKnownAddress/Session'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  resultType = require(rootPrefix + '/lib/globalConstant/resultType'),
  contractConstants = require(rootPrefix + '/lib/globalConstant/contract'),
  tokenUserConstants = require(rootPrefix + '/lib/globalConstant/tokenUser'),
  workflowStepConstants = require(rootPrefix + '/lib/globalConstant/workflowStep'),
  CommonValidators = require(rootPrefix + '/lib/validators/Common'),
  shardConst = require(rootPrefix + '/lib/globalConstant/shard'),
  sessionConstants = require(rootPrefix + '/lib/globalConstant/session'),
  TokenCompanyUser = require(rootPrefix + '/app/models/mysql/TokenCompanyUser'),
  TokenCache = require(rootPrefix + '/lib/cacheManagement/kitSaas/Token'),
  TokenCompanyUserCache = require(rootPrefix + '/lib/cacheManagement/kitSaas/TokenCompanyUserDetail');

// Following require(s) for registering into instance composer
require(rootPrefix + '/app/models/ddb/sharded/User');
require(rootPrefix + '/lib/cacheManagement/chain/TokenShardNumber');
require(rootPrefix + '/app/services/user/Create');
require(rootPrefix + '/lib/setup/user/AddSessionAddresses');
require(rootPrefix + '/lib/cacheManagement/chain/UserSessionAddress');
require(rootPrefix + '/lib/cacheManagement/chainMulti/SessionsByAddress');

/**
 * Class for company token holder initialization
 *
 * @class
 */
class InitCompanyTokenHolder {
  /**
   * Constructor for company token holder initialization
   *
   * @param {Object} params
   *
   *
   * @constructor
   */
  constructor(params) {
    const oThis = this;

    oThis.tokenId = params.tokenId;
    oThis.clientId = params.clientId;

    oThis.tokenCompanyUserId = null;
    oThis.sessionAddresses = [];
  }

  /**
   * Performer
   *
   * @return {Promise<result>}
   */
  async perform() {
    const oThis = this;

    await oThis._companyUserCreation();

    await oThis._sessionAddressesCreation();

    return Promise.resolve(
      responseHelper.successWithData({
        taskStatus: workflowStepConstants.taskDone,
        taskResponseData: {
          tokenCompanyUserId: oThis.tokenCompanyUserId,
          sessionKeys: oThis.sessionAddresses
        }
      })
    );
  }

  /**
   *
   * check if company uuid already exists, if not create one
   *
   * @return {Promise<never>}
   * @private
   */
  async _companyUserCreation() {
    const oThis = this;

    let tokenCompanyUserCacheRsp = await new TokenCompanyUserCache({ tokenId: oThis.tokenId }).fetch();

    if (tokenCompanyUserCacheRsp.isFailure() || !tokenCompanyUserCacheRsp.data) {
      return Promise.reject(tokenCompanyUserCacheRsp);
    }

    let userUuids = tokenCompanyUserCacheRsp.data['userUuids'];

    if (userUuids.length === 0) {
      // if no token company user found, create new user_id using CreateUser service
      let CreateUser = oThis.ic().getShadowedClassFor(coreConstants.icNameSpace, 'CreateUser'),
        createUserObj = new CreateUser({
          client_id: oThis.clientId,
          token_id: oThis.tokenId,
          kind: tokenUserConstants.companyKind
        }),
        createUserRsp = await createUserObj.perform();

      if (createUserRsp.isFailure()) {
        return Promise.reject(createUserRsp);
      }

      oThis.tokenCompanyUserId = createUserRsp.data[resultType.user].userId;

      //also, create entry in mysql token_company_user table
      await new TokenCompanyUser().insertRecord({
        tokenId: oThis.tokenId,
        userUuid: oThis.tokenCompanyUserId
      });
    } else {
      // select one of company user id
      oThis.tokenCompanyUserId = userUuids[0];
    }

    // status: CREATED to ACTIVATING
    await oThis._updateUserStatusInDdb();
  }

  /**
   *
   * check if sessions already exist in DB. If yes then fail if any one of them has status != INITIALIZING.
   * Else create remaining no. of sessions
   *
   * @private
   */
  async _sessionAddressesCreation() {
    const oThis = this;

    await oThis._fetchExistingSessions();

    let addressesToCreate = contractConstants.companyTokenHolderSessionCount - oThis.sessionAddresses.length;

    if (addressesToCreate <= 0) return;

    let promises = [];

    for (let i = 0; i < addressesToCreate; i++) {
      promises.push(new GenerateSessionKnownAddress({}).perform());
    }

    let promiseResponses = await Promise.all(promises),
      promiseResponse,
      sessionAddressesToInsert = [],
      knownAddressIds = [];

    for (let i = 0; i < promiseResponses.length; i++) {
      promiseResponse = promiseResponses[i];
      if (promiseResponse.isFailure()) {
        return Promise.reject(promiseResponse);
      }
      sessionAddressesToInsert.push(promiseResponse.data.address);
      oThis.sessionAddresses.push(promiseResponse.data.address);
      knownAddressIds.push(promiseResponse.data.knownAddressId);
    }

    let sessionSpendingLimit = await oThis._fetchSessionSpendingLimit(),
      addSessionAddressesParams = {
        tokenId: oThis.tokenId,
        userId: oThis.tokenCompanyUserId,
        sessionAddresses: sessionAddressesToInsert,
        knownAddressIds: knownAddressIds,
        sessionExpiration: contractConstants.companyTokenHolderSessionExpirationHeight,
        sessionSpendingLimit: sessionSpendingLimit
      },
      AddSessionAddresses = oThis.ic().getShadowedClassFor(coreConstants.icNameSpace, 'AddSessionAddresses'),
      addSessionAddressesObj = new AddSessionAddresses(addSessionAddressesParams),
      addSessionAddressesRsp = await addSessionAddressesObj.perform();

    if (addSessionAddressesRsp.isFailure()) {
      return Promise.reject(addSessionAddressesRsp);
    }
  }

  /**
   * fetch existing sessions with INITIALIZING status from db
   * @private
   */
  async _fetchExistingSessions() {
    const oThis = this;

    let UserSessionAddressCache = oThis.ic().getShadowedClassFor(coreConstants.icNameSpace, 'UserSessionAddressCache'),
      userSessionAddressCacheResp = await new UserSessionAddressCache({
        userId: oThis.tokenCompanyUserId,
        tokenId: oThis.tokenId
      }).fetch();

    if (userSessionAddressCacheResp.isSuccess() && userSessionAddressCacheResp.data.addresses.length) {
      let SessionsByAddressCache = oThis.ic().getShadowedClassFor(coreConstants.icNameSpace, 'SessionsByAddressCache'),
        sessionsByAddressCacheResp = await new SessionsByAddressCache({
          userId: oThis.tokenCompanyUserId,
          tokenId: oThis.tokenId,
          addresses: userSessionAddressCacheResp.data.addresses
        }).fetch();

      if (sessionsByAddressCacheResp.isSuccess()) {
        let sessionsData = sessionsByAddressCacheResp.data,
          buffer;

        for (let address in sessionsData) {
          buffer = sessionsData[address];
          if (!CommonValidators.validateObject(buffer)) {
            continue;
          }
          if (buffer.status !== sessionConstants.initializingStatus || !buffer.knownAddressId) {
            return Promise.reject(
              responseHelper.error({
                internal_error_identifier: 't_es_icth_1',
                api_error_identifier: 'something_went_wrong',
                debug_options: { session: buffer }
              })
            );
          } else {
            oThis.sessionAddresses.push(buffer.address);
          }
        }
      }
    }
  }

  /**
   *
   * change status of user from CREATED to ACTIVATING
   *
   * @return {Promise<void>}
   * @private
   */
  async _updateUserStatusInDdb() {
    const oThis = this,
      TokenShardNumbersCache = oThis.ic().getShadowedClassFor(coreConstants.icNameSpace, 'TokenShardNumbersCache'),
      UserModel = oThis.ic().getShadowedClassFor(coreConstants.icNameSpace, 'UserModel');

    let tokenShardNumbersCache = new TokenShardNumbersCache({
      tokenId: oThis.tokenId
    });

    let fetchTokenShardResponse = await tokenShardNumbersCache.fetch();

    if (fetchTokenShardResponse.isFailure() || !fetchTokenShardResponse.data[shardConst.userEntityKind]) {
      return Promise.reject(fetchTokenShardResponse);
    }

    let user = new UserModel({ shardNumber: fetchTokenShardResponse.data[shardConst.userEntityKind] });

    let response = await user.updateStatusFromInitialToFinal(
      oThis.tokenId,
      oThis.tokenCompanyUserId,
      tokenUserConstants.createdStatus,
      tokenUserConstants.activatingStatus
    );

    if (response.isFailure()) {
      return Promise.reject(response);
    }

    return response;
  }

  /**
   * Fetch token details and set session spending limit
   * This calculates session spending limit using conversion factor for given client
   *
   * @returns {Promise<any>}
   *
   * @private
   */
  async _fetchSessionSpendingLimit() {
    const oThis = this;

    let cacheResponse = await new TokenCache({ clientId: oThis.clientId }).fetch();

    if (
      cacheResponse.isFailure() ||
      !cacheResponse.data ||
      CommonValidators.isVarNull(cacheResponse.data.conversionFactor)
    ) {
      return Promise.reject(cacheResponse);
    }

    let BnConversionFactor = basicHelper.convertToBigNumber(cacheResponse.data.conversionFactor),
      BnSpendingLimit = basicHelper.convertToBigNumber(
        contractConstants.companyTokenHolderSessionSpendingLimitInOstWei
      );

    let sessionSpendingLimit = basicHelper.formatWeiToString(BnSpendingLimit.mul(BnConversionFactor));

    return sessionSpendingLimit;
  }
}

InstanceComposer.registerAsShadowableClass(InitCompanyTokenHolder, coreConstants.icNameSpace, 'InitCompanyTokenHolder');

module.exports = {};
