'use strict';

/**
 *  Fetch device details by userId.
 *
 * @module app/services/device/getList/ByUserId
 */
const rootPrefix = '../../../..',
  OSTBase = require('@openstfoundation/openst-base'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  GetListBase = require(rootPrefix + '/app/services/device/getList/Base');

// Following require(s) for registering into instance composer
require(rootPrefix + '/lib/cacheManagement/chain/WalletAddressesByUserId');

const InstanceComposer = OSTBase.InstanceComposer;

/**
 * Class to list devices by userId.
 *
 * @class ListByUserId
 */
class ListByUserId extends GetListBase {
  /**
   * @param params
   * @param {Number} params.userId
   * @param {Integer} params.tokenId
   */
  constructor(params) {
    super(params);
    const oThis = this;
    oThis.walletAddresses = [];
  }

  /**
   * Main performer method.
   *
   * @returns {Promise<void>}
   */
  perform() {
    const oThis = this;

    return oThis.asyncPerform().catch(function(err) {
      logger.error(' In catch block of app/services/device/getList/ByUserId');

      return responseHelper.error({
        internal_error_identifier: 'a_s_d_gl_bui',
        api_error_identifier: 'something_went_wrong',
        debug_options: err,
        error_config: err.toString()
      });
    });
  }

  /**
   * Async performer
   *
   * @returns {Promise<*|result>}
   */
  async asyncPerform() {
    const oThis = this;

    let WalletAddressesByUserId = oThis.ic().getShadowedClassFor(coreConstants.icNameSpace, 'WalletAddressesByUserId'),
      walletAddressesByUserId = new WalletAddressesByUserId({
        userId: oThis.userId,
        tokenId: oThis.tokenId
      }),
      response = await walletAddressesByUserId.fetch();

    oThis.walletAddresses = response.data['walletAddresses'];

    return oThis.getList();
  }
}

InstanceComposer.registerAsShadowableClass(ListByUserId, coreConstants.icNameSpace, 'ListByUserId');

module.exports = {};
