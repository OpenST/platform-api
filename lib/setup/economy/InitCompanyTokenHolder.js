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
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  resultType = require(rootPrefix + '/lib/globalConstant/resultType'),
  contractConstants = require(rootPrefix + '/lib/globalConstant/contract'),
  tokenUserConstants = require(rootPrefix + '/lib/globalConstant/tokenUser'),
  TokenCompanyUserCache = require(rootPrefix + '/lib/cacheManagement/kitSaas/TokenCompanyUserDetail');

require(rootPrefix + '/app/services/user/Create');
require(rootPrefix + '/lib/setup/user/AddSessionAddresses');
require(rootPrefix + '/lib/cacheManagement/chainMulti/SessionsByAddress');
require(rootPrefix + '/lib/cacheManagement/chain/SessionAddressesByUserId');

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

    oThis.userUuid = null;
    oThis.sessionAddresses = null;
  }

  /**
   * Performer
   *
   * @return {Promise<result>}
   */
  async perform() {
    const oThis = this;

    await oThis.companyUserCreation();

    await oThis.sessionAddressesCreation();

    return Promise.resolve(
      responseHelper.successWithData({
        tokenCompanyUserUuid: oThis.userUuid,
        sessionKeys: oThis.sessionAddresses
      })
    );
  }

  async companyUserCreation() {
    const oThis = this;

    let tokenCompanyUserCacheRsp = await new TokenCompanyUserCache({ tokenId: oThis.tokenId }).fetch();

    if (tokenCompanyUserCacheRsp.isFailure() || !tokenCompanyUserCacheRsp.data) {
      return Promise.reject(tokenCompanyUserCacheRsp);
    }
    console.log('tokenCompanyUserDetailRsp-------', tokenCompanyUserCacheRsp);

    let userUuids = tokenCompanyUserCacheRsp.data['userUuids'];

    console.log('userUuids---', userUuids);

    if (userUuids.length === 0) {
      let CreateUser = oThis.ic().getShadowedClassFor(coreConstants.icNameSpace, 'CreateUser'),
        createUserObj = new CreateUser({
          client_d: oThis.clientId,
          token_id: oThis.tokenId,
          kind: tokenUserConstants.companyKind
        }),
        createUserRsp = await createUserObj.perform();

      if (createUserRsp.isFailure()) {
        return Promise.reject(createUserRsp);
      }

      console.log('createUserRsp-----', createUserRsp);

      oThis.userUuid = createUserRsp.data[resultType.user].userId;
    }

    oThis.userUuid = userUuids[0];

    console.log('oThis.userUuid--------', oThis.userUuid);
  }

  async sessionAddressesCreation() {
    const oThis = this;

    let SessionAddressesByUserIdCache = oThis
        .ic()
        .getShadowedClassFor(coreConstants.icNameSpace, 'SessionAddressesByUserIdCache'),
      sessionAddressesByUserIdCacheRsp = await new SessionAddressesByUserIdCache({
        userId: oThis.userUuid,
        tokenId: oThis.tokenId
      }).fetch();

    console.log('SessionAddressesByUserIdCache----------', SessionAddressesByUserIdCache);

    oThis.sessionAddresses = sessionAddressesByUserIdCacheRsp.data['addresses'];

    let currentSessionAddrCount = oThis.sessionAddresses.length;

    if (currentSessionAddrCount === contractConstants.companyTokenHolderSessionCount) {
      oThis._getUserSessionsDataFromCache();
    } else {
      // generate known-addresses -> number = (companyTokenHolderSessionCount - currentSessionAddrCount)
    }

    let addSessionAddressesParams = {
        tokenId: oThis.tokenId,
        userId: oThis.userUuid,
        sessionAddresses: oThis.sessionAddresses,
        sessionExpiration: contractConstants, // ?
        sessionSpendingLimit: contractConstants // ?
      },
      AddSessionAddresses = oThis.ic().getShadowedClassFor(coreConstants.icNameSpace, 'AddSessionAddresses'),
      addSessionAddressesObj = new AddSessionAddresses(addSessionAddressesParams),
      addSessionAddressesRsp = await addSessionAddressesObj.perform();

    console.log('addSessionAddressesRsp-------', addSessionAddressesRsp);
  }

  /**
   * Get session details of a user from a multi cache
   *
   * @returns {Promise<*|result>}
   */
  async _getUserSessionsDataFromCache() {
    const oThis = this;

    let SessionsByAddressCache = oThis.ic().getShadowedClassFor(coreConstants.icNameSpace, 'SessionsByAddressCache'),
      sessionsByAddressCache = new SessionsByAddressCache({
        userId: oThis.userUuid,
        tokenId: oThis.tokenId,
        addresses: oThis.sessionAddresses
      }),
      sessionsByAddressResponse = await sessionsByAddressCache.fetch();

    if (sessionsByAddressResponse.isFailure()) {
      return Promise.reject(sessionsByAddressResponse);
    }

    console.log('sessionsByAddressResponse-----', sessionsByAddressResponse);

    // check status, if other than INITIALIZING, end
  }
}

InstanceComposer.registerAsShadowableClass(InitCompanyTokenHolder, coreConstants.icNameSpace, 'InitCompanyTokenHolder');

module.exports = {};
