/**
 * Module to get user redemption
 *
 * @module app/services/user/redemption/Get
 */

const OSTBase = require('@ostdotcom/base'),
  InstanceComposer = OSTBase.InstanceComposer;

const rootPrefix = '../../../..',
  ServiceBase = require(rootPrefix + '/app/services/Base'),
  UserRedemptionModel = require(rootPrefix + '/app/models/mysql/UserRedemption'),
  pagination = require(rootPrefix + '/lib/globalConstant/pagination'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  resultType = require(rootPrefix + '/lib/globalConstant/resultType');

// Following require(s) for registering into instance composer.

/**
 * Class to fetch user redemption list
 *
 * @class GetUserRedemption
 */
class GetUserRedemption extends ServiceBase {
  /**
   * Constructor to fetch user redemption list
   *
   * @param {object} params
   * @param {number} params.user_id
   * @param {number} params.redemption_id
   *
   * @constructor
   */
  constructor(params) {
    super(params);
    const oThis = this;
  }
}

InstanceComposer.registerAsShadowableClass(GetUserRedemption, coreConstants.icNameSpace, 'UserRedemptionGet');

module.exports = {};
