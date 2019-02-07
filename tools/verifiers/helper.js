'use strict';

const BrandedToken = require('@openstfoundation/brandedtoken.js');

const rootPrefix = '../..',
  CoreBins = require(rootPrefix + '/config/CoreBins'),
  chainAddressConstants = require(rootPrefix + '/lib/globalConstant/chainAddress');

class VerifierHelper {
  /**
   * Constructor
   *
   * @param web3Instance
   */
  constructor(web3Instance) {
    const oThis = this;

    oThis.web3Instance = web3Instance;
  }

  /**
   * Check simple token byte code
   *
   * @param STContractAddress
   * @return {Promise<boolean>}
   */
  async validateSimpleTokenContract(STContractAddress) {
    const oThis = this;

    let deployedCode = await oThis.web3Instance.eth.getCode(STContractAddress),
      coreBinCode = CoreBins.simpleToken;

    let chainCode = deployedCode.slice(parseInt(deployedCode.length) - 50, parseInt(deployedCode.length));

    return coreBinCode.indexOf(chainCode) !== -1;
  }

  /**
   * Validate Contract byte code
   *
   * @param contractAddress
   * @param contractName
   *
   * @return {Promise<boolean>}
   */
  async validateContract(contractAddress, contractName) {
    const oThis = this;

    let deployedCode = await oThis.web3Instance.eth.getCode(contractAddress),
      binCode = await oThis._getBIN(contractName);

    deployedCode = deployedCode.slice(2);

    let chainCode = deployedCode.slice(parseInt(deployedCode.length) - 100, parseInt(deployedCode.length));

    return binCode.indexOf(chainCode) !== -1;
  }

  /**
   * Get contract object for queries
   *
   * @param contractName
   * @param contractAddress
   * @return {Promise<oThis.web3Instance.eth.Contract>}
   */
  async getContractObj(contractName, contractAddress) {
    const oThis = this;

    let abiOfOrganization = await oThis._getABI(contractName);

    return new oThis.web3Instance.eth.Contract(abiOfOrganization, contractAddress);
  }

  /**
   * Abi and bin provider for branded-token.js
   * @return {BtAbiBinProvider}
   * @constructor
   */
  static get AbiBinProviderHelper() {
    return BrandedToken.AbiBinProvider;
  }

  /**
   * Get given organization contract abi
   *
   * @param organizationName
   * @return {Promise<void>}
   * @private
   */
  async _getABI(organizationName) {
    const oThis = this;

    return await new VerifierHelper.AbiBinProviderHelper().getABI(organizationName);
  }

  /**
   * Get given contract bin
   *
   * @param contractName
   * @return {Promise<void>}
   * @private
   */
  async _getBIN(contractName) {
    const oThis = this;

    return await new VerifierHelper.AbiBinProviderHelper().getBIN(contractName);
  }

  /**
   * ==========================================
   * Following methods return contract names for know contracts
   * ==========================================
   */

  get getSimpleTokenContractName() {
    return 'SimpleToken';
  }

  get getSimpleTokenPrimeContractName() {
    return 'OSTPrime';
  }

  get getOrganizationContractName() {
    return 'Organization';
  }

  get getAnchorContractName() {
    return 'Anchor';
  }

  get gatewayContractName() {
    return 'EIP20Gateway';
  }

  get getCoGatewayContractName() {
    return 'EIP20CoGateway';
  }

  /**
   * Returns contract name for provided lib kind.
   *
   * @param libKind
   * @return {string}
   */
  getLibNameFromKind(libKind) {
    switch (libKind) {
      case chainAddressConstants.auxMppLibContractKind:
      case chainAddressConstants.originMppLibContractKind:
        return 'MerklePatriciaProof';
      case chainAddressConstants.auxMbLibContractKind:
      case chainAddressConstants.originMbLibContractKind:
        return 'MessageBus';
      case chainAddressConstants.auxGatewayLibContractKind:
      case chainAddressConstants.originGatewayLibContractKind:
        return 'GatewayLib';
    }
  }
}

module.exports = VerifierHelper;
