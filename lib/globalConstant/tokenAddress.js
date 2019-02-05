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

  get activeStatus() {
    return 'active';
  }

  get inActiveStatus() {
    return 'inActive';
  }

  get ownerAddressKind() {
    return 'owner';
  }

  get auxAdminAddressKind() {
    return 'auxAdmin';
  }

  get originAdminAddressKind() {
    return 'originAdmin';
  }

  get originWorkerAddressKind() {
    return 'originWorker';
  }

  get auxWorkerAddressKind() {
    return 'auxWorker';
  }

  get auxFunderAddressKind() {
    return 'auxFunder';
  }

  get whiteListedAddressKind() {
    return 'whiteListed';
  }

  get txWorkerAddressKind() {
    return 'txWorkerAddress';
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
      oThis.originAdminAddressKind,
      oThis.auxAdminAddressKind,
      oThis.originOrganizationContract,
      oThis.auxOrganizationContract,
      oThis.brandedTokenContract,
      oThis.utilityBrandedTokenContract,
      oThis.tokenGatewayContract,
      oThis.tokenCoGatewayContract,
      oThis.simpleStakeContract,
      oThis.auxFunderAddressKind
    ];
  }
}

module.exports = new TokenAddressConstants();
