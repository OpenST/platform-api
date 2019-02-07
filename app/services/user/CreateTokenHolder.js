'use strict';
/**
 * This service helps in adding Token holders in our System.
 *
 * @module app/services/user/CreateTokenHolder
 */
const OSTBase = require('@openstfoundation/openst-base'),
  InstanceComposer = OSTBase.InstanceComposer;

const rootPrefix = '../../..',
  ServiceBase = require(rootPrefix + '/app/services/Base'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  resultType = require(rootPrefix + '/lib/globalConstant/resultType'),
  tokenUserConstants = require(rootPrefix + '/lib/globalConstant/tokenUser');

/**
 * Class for creating token holder for user.
 *
 * @class
 */
class CreateTokenHolder extends ServiceBase {
  /**
   * Constructor for creating token holder for user.
   *
   * @param params
   * @param {String} params.user_id: user Id
   * @param {Number} params.client_id: client Id
   * @param {String} params.kind: Kind (Company/User)
   *
   * @constructor
   */
  constructor(params) {
    super(params);

    const oThis = this;

    oThis.userId = params.user_id;

    oThis.clientId = params.client_id;

    oThis.shardNumbersMap = {};
  }

  /**
   * Perform: perform token holder creation
   *
   * @return {Promise<void>}
   */
  async _asyncPerform() {
    const oThis = this;

    await oThis._fetchTokenDetails();

    await oThis.updateUserStatus();

    return Promise.resolve(
      responseHelper.successWithData({
        [resultType.user]: {
          userId: 'test123',
          tokenId: 'test123',
          tokenHolderAddress: 'test123',
          multisigAddress: 'test123',
          kind: '1',
          updatedTimestamp: 'test123',
          status: '2'
        }
      })
    );
  }

  /**
   * Update user status from created to activating after performing certain validations.
   *
   * @return {Promise<void>}
   */
  async updateUserStatus() {
    const oThis = this;
  }

  /**
   * Subclass to return its own class here
   *
   * @returns {object}
   */
  get subClass() {
    return CreateTokenHolder;
  }
}

InstanceComposer.registerAsShadowableClass(CreateTokenHolder, coreConstants.icNameSpace, 'CreateTokenHolder');

module.exports = {};
