'use strict';
/**
 * This initializes company token holder and inserts token holder details into mysql and ddb tables.
 *
 * @module lib/setup/economy/InitCompanyTokenHolder
 */
const OSTBase = require('@openstfoundation/openst-base'),
  InstanceComposer = OSTBase.InstanceComposer;

const rootPrefix = '../../..',
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  GenerateSessionKnownAddress = require(rootPrefix + '/lib/generateKnownAddress/Session'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  resultType = require(rootPrefix + '/lib/globalConstant/resultType'),
  contractConstants = require(rootPrefix + '/lib/globalConstant/contract'),
  tokenUserConstants = require(rootPrefix + '/lib/globalConstant/tokenUser'),
  workflowStepConstants = require(rootPrefix + '/lib/globalConstant/workflowStep'),
  CommonValidators = require(rootPrefix + '/lib/validators/Common'),
  sessionConstants = require(rootPrefix + '/lib/globalConstant/session'),
  TokenCompanyUser = require(rootPrefix + '/app/models/mysql/TokenCompanyUser'),
  TokenCompanyUserCache = require(rootPrefix + '/lib/cacheManagement/kitSaas/TokenCompanyUserDetail');

require(rootPrefix + '/app/services/user/Create');
require(rootPrefix + '/lib/setup/user/AddSessionAddresses');
require(rootPrefix + '/app/services/session/list/ByUserId');

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

      await new TokenCompanyUser().insertRecord({
        tokenId: oThis.tokenId,
        userUuid: oThis.tokenCompanyUserId
      });
    } else {
      oThis.tokenCompanyUserId = userUuids[0];
    }
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

    if (addressesToCreate === 0) return;

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

    let addSessionAddressesParams = {
        tokenId: oThis.tokenId,
        userId: oThis.tokenCompanyUserId,
        sessionAddresses: sessionAddressesToInsert,
        knownAddressIds: knownAddressIds,
        sessionExpiration: contractConstants.companyTokenHolderSessionExpirationHeight,
        sessionSpendingLimit: contractConstants.companyTokenHolderSessionSpendingLimit
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

    let SessionListByUserId = oThis.ic().getShadowedClassFor(coreConstants.icNameSpace, 'SessionListByUserId'),
      fetchSessionsRsp = await new SessionListByUserId({
        user_id: oThis.tokenCompanyUserId,
        token_id: oThis.tokenId
      }).perform();

    if (fetchSessionsRsp.isFailure()) {
      return Promise.reject(fetchSessionsRsp);
    }

    let sessionsData = fetchSessionsRsp.data[resultType.sessions],
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

InstanceComposer.registerAsShadowableClass(InitCompanyTokenHolder, coreConstants.icNameSpace, 'InitCompanyTokenHolder');

module.exports = {};
