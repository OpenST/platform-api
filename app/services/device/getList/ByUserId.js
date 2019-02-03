'use strict';

/**
 *  Fetch device details by userId.
 *
 * @module app/services/device/getList/ByUserId
 */
const rootPrefix = '../../../..',
  OSTBase = require('@openstfoundation/openst-base'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
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
   * @param {Integer} params.client_id
   * @param {String} params.user_id - uuid
   * @param {Integer} [params.token_id]
   */
  constructor(params) {
    super(params);
  }

  /**
   * @private
   */
  async _setWalletAddresses() {
    const oThis = this;

    let WalletAddressesByUserId = oThis.ic().getShadowedClassFor(coreConstants.icNameSpace, 'WalletAddressesByUserId'),
      walletAddressesByUserId = new WalletAddressesByUserId({
        userId: oThis.userId,
        tokenId: oThis.tokenId
      }),
      response = await walletAddressesByUserId.fetch();

    oThis.walletAddresses = response.data['walletAddresses'];
  }
}

InstanceComposer.registerAsShadowableClass(ListByUserId, coreConstants.icNameSpace, 'DeviceListByUserId');

module.exports = {};
