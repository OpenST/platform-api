'use strict';
/**
 * This service helps in fetching user salt from our system.
 *
 * @module app/services/user/UserSalt
 */
const OSTBase = require('@ostdotcom/base'),
  InstanceComposer = OSTBase.InstanceComposer;

const rootPrefix = '../../..',
  ServiceBase = require(rootPrefix + '/app/services/Base'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  CommonValidators = require(rootPrefix + '/lib/validators/Common'),
  resultType = require(rootPrefix + '/lib/globalConstant/resultType');

/**
 * Class to get user salt.
 *
 * @class
 */
class GetUserSalt extends ServiceBase {
  /**
   * Constructor for getting user
   *
   * @param params
   * @param {Number} params.client_id: client Id
   * @param {String} params.user_id: user Id
   *
   * @constructor
   */
  constructor(params) {
    super(params);

    const oThis = this;

    oThis.clientId = params.client_id;
    oThis.userId = params.user_id;
  }

  /**
   * Main performer for the class.
   *
   * @return {Promise<void>}
   */
  async _asyncPerform() {
    const oThis = this,
      scryptSalt = oThis.userId
        .split('')
        .reverse()
        .join('');

    const responseData = {
      scryptSalt: scryptSalt,
      updatedTimestamp: Math.floor(new Date() / 1000)
    };

    return Promise.resolve(responseHelper.successWithData({ [resultType.salt]: responseData }));
  }
}

InstanceComposer.registerAsShadowableClass(GetUserSalt, coreConstants.icNameSpace, 'GetUserSalt');

module.exports = {};
