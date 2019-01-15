'use strict';
/**
 * Token address constants
 *
 * @module lib/globalConstant/tokenAddress
 */

/**
 * Class for token address constants
 *
 * @class
 */
class TokenAddressConstants {
  /**
   * Constructor for token address constants
   *
   * @constructor
   */
  constructor() {}

  get ownerAddressKind() {
    return 'owner';
  }

  get adminAddressKind() {
    return 'admin';
  }

  get workerAddressKind() {
    return 'worker';
  }

  // contract kinds

  get originOrganizationContract() {
    return 'originOrganizationContract';
  }

  get auxOrganizationContract() {
    return 'auxOrganizationContract';
  }

  get brandedTokenContract() {
    return 'brandedTokenContract';
  }

  get utilityBrandedTokenContract() {
    return 'utilityBrandedTokenContract';
  }

  get tokenGatewayContract() {
    return 'tokenGatewayContract';
  }

  get tokenCoGatewayContract() {
    return 'tokenCoGatewayContract';
  }

  get simpleStakeContract() {
    return 'simpleStakeContract';
  }

  get uniqueKinds() {
    const oThis = this;
    return [
      oThis.ownerAddressKind,
      oThis.adminAddressKind,
      oThis.originOrganizationContract,
      oThis.auxOrganizationContract,
      oThis.brandedTokenContract,
      oThis.utilityBrandedTokenContract,
      oThis.tokenGatewayContract,
      oThis.tokenCoGatewayContract,
      oThis.simpleStakeContract
    ];
  }
}

module.exports = new TokenAddressConstants();
