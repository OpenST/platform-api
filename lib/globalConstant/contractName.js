'use strict';
/**
 * Contract names
 *
 * @module lib/globalConstant/contractName
 */

class ContractName {
  /**
   * Constructor for Contract names
   *
   * @constructor
   */
  constructor() {}

  get tokenHolderContractName() {
    return 'TokenHolder';
  }
  get tokenRulesContractName() {
    return 'TokenRules';
  }
  get userWalletFactoryContractName() {
    return 'UserWalletFactory';
  }
  get proxyFactoryContractName() {
    return 'ProxyFactory';
  }
  get gnosisSafeContractName() {
    return 'GnosisSafe';
  }
  get utilityBrandedTokenContractName() {
    return 'UtilityBrandedToken';
  }
  get brandedTokenContractName() {
    return 'BrandedToken';
  }
  get gatewayComposerContractName() {
    return 'GatewayComposer';
  }
  get organizationContractName() {
    return 'Organization';
  }
  get eip20GatewayContractName() {
    return 'EIP20Gateway';
  }
  get eip20CoGatewayContractName() {
    return 'EIP20CoGateway';
  }
  get gatewayLibContractName() {
    return 'GatewayLib';
  }
  get messageBusContractName() {
    return 'MessageBus';
  }
  get merklePatriciaProofContractName() {
    return 'MerklePatriciaProof';
  }
  get OSTPrimeContractName() {
    return 'OSTPrime';
  }
  get AnchorContractName() {
    return 'Anchor';
  }
}

module.exports = new ContractName();
